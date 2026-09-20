import { readFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';

test('standalone browser example renders, edits, downloads, and fits a phone', async ({ page }) => {
  const failures = [];
  const externalRequests = [];
  page.on('pageerror', error => failures.push(error.message));
  page.on('request', request => {
    if (!request.url().startsWith('http://127.0.0.1:4175/') && !request.url().startsWith('blob:')) externalRequests.push(request.url());
  });
  await page.goto('/examples/textgraph/');
  const status = page.getByRole('status');
  const editor = page.getByRole('textbox', { name: 'TextGraph source' });
  const preview = page.getByRole('img', { name: 'Rendered TextGraph diagram' });
  const render = page.getByRole('button', { name: 'Render diagram' });
  const download = page.getByRole('link', { name: 'Download PNG' });
  await expect(status).toContainText('Diagram ready');
  await expect(preview).toBeVisible();
  await expect.poll(() => preview.evaluate(image => image.naturalWidth)).toBeGreaterThan(0);
  await expect(page.getByRole('alert')).toBeHidden();
  await expect(page.getByRole('heading', { name: 'A small API. A real diagram.' })).toBeInViewport();
  await expect(page.locator('pre').nth(1)).toContainText('initializeTextGraph');
  expect((await preview.boundingBox()).x).toBeGreaterThan((await editor.boundingBox()).x);

  const initial = await preview.getAttribute('src');
  await editor.fill('start -> review -> publish\npublish(fill primary): Publish package');
  await expect(status).toContainText('Source changed');
  await expect(download).toBeHidden();
  await render.click();
  await expect(status).toContainText('Diagram ready');
  await expect(preview).not.toHaveAttribute('src', initial);
  const valid = await preview.getAttribute('src');
  const [file] = await Promise.all([page.waitForEvent('download'), download.click()]);
  expect(file.suggestedFilename()).toBe('textgraph.png');
  const bytes = await readFile(await file.path());
  expect([...bytes.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  const previewBytes = await preview.evaluate(async image => Array.from(new Uint8Array(await (await fetch(image.src)).arrayBuffer())));
  expect([...bytes]).toEqual(previewBytes);

  await editor.fill('group {\n  A ->\n}');
  await render.click();
  await expect(status).toContainText('Could not render');
  await expect(page.getByRole('alert')).toContainText('error:');
  await expect(download).toBeHidden();
  await expect(preview).toHaveAttribute('src', valid);
  await expect(preview).toHaveAttribute('title', 'Preview from the last successful render');
  await editor.fill('');
  await render.click();
  await expect(status).toContainText('Add some TextGraph');
  await editor.fill('A -> B');
  await editor.press('Control+Enter');
  await expect(status).toContainText('Diagram ready');

  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  const sourceBounds = await editor.boundingBox();
  expect((await preview.boundingBox()).y).toBeGreaterThan(sourceBounds.y + sourceBounds.height);
  await editor.fill('mobile -> browser');
  await render.click();
  await expect(status).toContainText('Diagram ready');
  expect(failures).toEqual([]);
  expect(externalRequests).toEqual([]);
});

test('standalone browser example reports missing assets and retries', async ({ page }) => {
  await page.route('**/textgraph/wasm/**', route => route.abort());
  await page.goto('/examples/textgraph/');
  await expect(page.getByRole('status')).toContainText('retry');
  await expect(page.getByRole('alert')).toContainText('Could not load');
  await page.unroute('**/textgraph/wasm/**');
  await page.getByRole('button', { name: 'Render diagram' }).click();
  await expect(page.getByRole('status')).toContainText('Diagram ready');
});

test('JavaScript documentation and site navigation open the runnable example', async ({ page }) => {
  await page.goto('/integrations/javascript');
  await page.getByRole('link', { name: 'Run the renderer SDK demo' }).click();
  await expect(page).toHaveURL(/\/examples\/textgraph\/$/);
  await expect(page.getByRole('status')).toContainText('Diagram ready');
  await page.goto('/');
  await page.locator('.VPNavBar').getByRole('button', { name: 'SDK demos' }).hover();
  await page.getByRole('link', { name: 'TextGraph renderer', exact: true }).click();
  await expect(page).toHaveURL(/\/examples\/textgraph\/$/);
  await expect(page.getByRole('status')).toContainText('Diagram ready');
});
