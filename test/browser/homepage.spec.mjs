import { test, expect } from '@playwright/test';
import { homeExamples } from '../../.vitepress/home/examples.mjs';

test('example titles share an aligned header and stay distinct from the source', async ({ page }) => {
  for (const colorScheme of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme });
    for (const width of [390, 640, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto('/');
      for (const example of await page.locator('.home-example').all()) {
        const source = example.locator('.example-source');
        const result = example.locator('.example-result');
        const sourceTitle = source.getByText('TextGraph source', { exact: true });
        const resultTitle = result.getByText('The diagram', { exact: true });
        const titleStyle = title => title.evaluate(element => {
          const style = getComputedStyle(element);
          return { font: style.font, color: style.color, background: style.backgroundColor,
            spacing: style.letterSpacing, padding: style.padding, border: style.borderBottom };
        });
        expect(await titleStyle(sourceTitle)).toEqual(await titleStyle(resultTitle));
        const contentOrigin = pane => pane.evaluate(element => {
          const bounds = element.getBoundingClientRect();
          return { x: bounds.x + element.clientLeft, y: bounds.y + element.clientTop };
        });
        const sourceBounds = await contentOrigin(source);
        const resultBounds = await contentOrigin(result);
        const first = await sourceTitle.boundingBox();
        const second = await resultTitle.boundingBox();
        expect(first.y - sourceBounds.y).toBeCloseTo(second.y - resultBounds.y, 0);
        expect(first.x - sourceBounds.x).toBeCloseTo(second.x - resultBounds.x, 0);
        expect(first.height).toBeCloseTo(second.height, 0);
        expect(await sourceTitle.evaluate(element => getComputedStyle(element).borderBottomStyle)).toBe('solid');
        expect(await sourceTitle.evaluate(element => parseFloat(getComputedStyle(element).borderBottomWidth))).toBeGreaterThan(0);
        const code = await source.locator('code').boundingBox();
        expect(code.y).toBeGreaterThan(first.y + first.height);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    }
  }
});

test('homepage demonstrates the product without loading a renderer and each example opens its exact source', async ({ page }) => {
  const requests = [];
  page.on('request', request => requests.push(request.url()));
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Turn relationships into diagrams');
  const hero = page.getByRole('region', { name: 'Turn relationships into diagrams.' });
  await expect(hero.getByRole('img')).toBeVisible();
  await expect(hero.getByRole('link', { name: 'Try this example' })).toBeVisible();
  await expect(page.locator('.VPSidebar')).toHaveCount(0);
  for (const image of await page.locator('main img').all()) {
    await image.scrollIntoViewIfNeeded();
    await expect.poll(() => image.evaluate(image => image.naturalWidth)).toBeGreaterThan(0);
  }
  expect(requests.filter(url => /\.wasm|\/textgraph\/wasm\/|renderer.worker/.test(url))).toEqual([]);
  for (const example of homeExamples) {
    await page.goto('/');
    const link = page.locator('main a[data-analytics-example="' + example.id + '"]').first();
    await link.click();
    await expect(page.getByRole('textbox', { name: 'TextGraph source' })).toHaveValue(example.source);
    await expect(page.getByRole('status', { name: 'Render status' })).toHaveText('Preview up to date');
  }
});

test('homepage remains readable on narrow screens and in dark mode', async ({ page }) => {
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Try this example', exact: true })).toBeVisible();
  }
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await page.reload();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await expect(page.getByRole('region', { name: 'Turn relationships into diagrams.' }).getByRole('img')).toBeVisible();
});

test('source, diagrams, and example links are available before JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:4175/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.locator('.home-hero pre')).toHaveText(homeExamples.find(example => example.id === 'request-flow').source);
    await expect(page.locator('.home-hero img')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Try this example' })).toHaveAttribute('href', /[?]d=[01][.]/);
    await page.getByText('Can I use plain English or AI?').click();
    await expect(page.getByText('TextGraph uses a small, structured syntax.')).toBeVisible();
  } finally { await context.close(); }
});
