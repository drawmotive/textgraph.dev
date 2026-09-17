import { test, expect } from '@playwright/test';
import { homeExamples } from '../../.vitepress/home/examples.mjs';

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
