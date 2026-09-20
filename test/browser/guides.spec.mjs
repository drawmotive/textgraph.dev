import { test, expect } from '@playwright/test';

const guides = [
  '/intro/what-is-textgraph.html',
  '/intro/getting-started.html',
  '/diagrams/flowcharts.html',
  '/integrations/overview.html',
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
  expect(paths.slice(0, 9)).toEqual([
    ...guides.slice(0, 4), '/playground.html', guides[4], guides[5], guides[6], guides[7],
  ]);
  expect(paths.some(path => path.startsWith('/examples/'))).toBe(false);
  await sidebar.getByRole('link', { name: 'DrawMotive editor', exact: true }).click();
  await expect(page.getByRole('heading', { name: /^DrawMotive editor/, level: 1 })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Run the visual editor SDK demo' })).toHaveAttribute('href', '/examples/editor/');
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
