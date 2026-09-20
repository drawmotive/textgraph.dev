import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const guides = [
  '/intro/what-is-textgraph.html',
  '/intro/getting-started.html',
  '/diagrams/flowcharts.html',
  '/integrations/overview.html',
  '/integrations/ai-agents.html',
  '/integrations/markdown.html',
  '/integrations/vscode.html',
  '/integrations/javascript.html',
  '/editor/',
];

test('sidebar leads from the language to tools and application development', async ({ page }) => {
  await page.goto(guides[0]);
  const sidebar = page.locator('.VPSidebar');
  await expect(sidebar.locator('.group > .VPSidebarItem > .item .text')).toHaveText([
    'Learn TextGraph', 'Use TextGraph', 'Build applications', 'Reference',
  ]);
  const links = sidebar.locator('a');
  const paths = await links.evaluateAll(elements => elements.map(element => new URL(element.href).pathname));
  expect(paths.slice(0, guides.length)).toEqual(guides);
  await expect(sidebar.getByRole('link', { name: 'Playground', exact: true })).toHaveCount(0);
  await expect(page.locator('.VPNavBar').getByRole('link', { name: 'Playground', exact: true })).toBeVisible();
  expect(paths.some(path => path.startsWith('/examples/'))).toBe(false);
  await sidebar.getByRole('link', { name: 'DrawMotive editor', exact: true }).click();
  await expect(page.getByRole('heading', { name: /^DrawMotive editor/, level: 1 })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Run the visual editor SDK demo' })).toHaveAttribute('href', '/examples/editor/');
});

test('AI guide downloads canonical Markdown instead of documentation HTML', async ({ page, request }) => {
  await page.goto('/integrations/ai-agents.html');
  for (const [file, name] of [
    ['textgraph-spec.md', 'Language Specification Markdown'],
    ['classes.md', 'Style Classes Markdown'],
  ]) {
    const link = page.getByRole('link', { name, exact: true });
    await expect(link).toHaveAttribute('href', '/reference/' + file);
    const response = await request.get(await link.getAttribute('href'));
    expect(response.ok()).toBe(true);
    expect(await response.body()).toEqual(await readFile(new URL('../../reference/' + file, import.meta.url)));
    const download = page.waitForEvent('download');
    await link.click();
    const artifact = await download;
    expect(artifact.suggestedFilename()).toBe(file);
    expect(await readFile(await artifact.path())).toEqual(await response.body());
  }
});

test('every non-reference guide has static, accessible images that fit desktop and mobile', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  try {
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const route of guides) {
        await page.goto(baseURL + route);
        const images = page.locator('.vp-doc img');
        expect(await images.count(), route).toBeGreaterThan(0);
        for (const image of await images.all()) {
          await image.scrollIntoViewIfNeeded();
          await expect.poll(() => image.evaluate(img => img.complete && img.naturalWidth > 0), { message: route }).toBe(true);
          await expect(image).toHaveAttribute('alt', /\S+/);
          const bounds = await image.boundingBox();
          expect(bounds.x, route).toBeGreaterThanOrEqual(0);
          expect(bounds.x + bounds.width, route).toBeLessThanOrEqual(width);
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth), route).toBeLessThanOrEqual(width);
      }
    }
  } finally { await context.close(); }
});
