import { test, expect } from '@playwright/test';

test('local playground renders, reports errors, recovers, and fits a phone', async ({ page }) => {
  const failures = [];
  page.on('pageerror', error => failures.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Open Playground', exact: true })).toHaveAttribute('href', /\/playground(?:\.html)?$/);
  await page.getByRole('link', { name: 'Open Playground', exact: true }).click();
  await expect(page).toHaveURL(/\/playground(?:\.html)?$/);
  const editor = page.getByRole('textbox', { name: 'TextGraph source' });
  const preview = page.getByRole('img', { name: 'Rendered TextGraph diagram' });
  const status = page.getByRole('status', { name: 'Render status' });
  await expect(editor).toBeVisible();
  await expect(status).toHaveText('Preview up to date');
  await expect(page.getByRole('region', { name: 'Errors and warnings' })).toContainText('No errors or warnings');
  await expect(preview).toBeVisible();
  await expect.poll(() => preview.evaluate(image => image.naturalWidth)).toBeGreaterThan(0);
  const editorBounds = await editor.boundingBox();
  const previewBounds = await page.getByRole('region', { name: 'Diagram preview' }).boundingBox();
  expect(previewBounds.x).toBeGreaterThan(editorBounds.x + editorBounds.width);

  const initialImage = await preview.getAttribute('src');
  await editor.fill('client -> api -> db\nclient: Browser\napi: Server\ndb(cylinder): Database');
  await expect(status).toHaveText('Preview up to date');
  await expect(preview).not.toHaveAttribute('src', initialImage);
  const validImage = await preview.getAttribute('src');
  await editor.fill('group {\n  A ->\n}');
  await expect(status).toHaveText('Check the errors below');
  const diagnostics = page.getByRole('region', { name: 'Errors and warnings' });
  await expect(diagnostics.getByRole('listitem').first()).toContainText(/error/i);
  await expect(preview).toHaveAttribute('src', validImage);
  await expect(page.getByText('Showing the last successful preview')).toBeVisible();
  const diagnosticsBounds = await diagnostics.boundingBox();
  expect(diagnosticsBounds.y).toBeGreaterThan(previewBounds.y);
  expect(diagnosticsBounds.y + diagnosticsBounds.height).toBeLessThanOrEqual(1000);
  await diagnostics.getByRole('button', { name: 'Line 2, column 7' }).click();
  await expect(editor).toBeFocused();
  expect(await editor.evaluate(element => element.selectionStart)).toBe(14);

  await editor.fill('A -> B');
  await expect(status).toHaveText('Preview up to date');
  await expect(diagnostics).toContainText('No errors or warnings');
  await editor.fill('');
  await expect(preview).toHaveCount(0);
  await expect(status).toHaveText('Add some TextGraph to begin');
  await editor.fill('A -> C');
  await expect(status).toHaveText('Preview up to date');

  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  const mobileEditor = await editor.boundingBox();
  const mobilePreview = await page.getByRole('region', { name: 'Diagram preview' }).boundingBox();
  expect(mobilePreview.y).toBeGreaterThan(mobileEditor.y + mobileEditor.height);
  await page.getByRole('link', { name: 'Syntax reference', exact: true }).click();
  await expect(page).toHaveURL(/\/reference\/syntax(?:\.html)?$/);
  await page.goto('/playground');
  await expect(status).toHaveText('Preview up to date');
  expect(failures).toEqual([]);
});

test('a runtime download failure is visible and can be retried', async ({ page }) => {
  await page.route('**/textgraph/wasm/**', route => route.abort());
  await page.goto('/playground');
  const status = page.getByRole('status', { name: 'Render status' });
  await expect(status).toHaveText('Check the errors below');
  await expect(page.getByRole('region', { name: 'Errors and warnings' })).toContainText(/Could not load/);
  await page.unroute('**/textgraph/wasm/**');
  await page.getByRole('button', { name: 'Render now' }).click();
  await expect(status).toHaveText('Preview up to date');
  await expect(page.getByRole('img', { name: 'Rendered TextGraph diagram' })).toBeVisible();
});
