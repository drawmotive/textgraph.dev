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
  await expect(page.getByRole('region', { name: 'Errors and warnings' })).toHaveCount(0);
  await expect(preview).toBeVisible();
  await expect.poll(() => preview.evaluate(image => image.naturalWidth)).toBeGreaterThan(0);
  const editorBounds = await editor.boundingBox();
  const previewBounds = await page.getByRole('region', { name: 'Diagram preview' }).boundingBox();
  expect(previewBounds.x).toBeGreaterThan(editorBounds.x + editorBounds.width);

  const initialImage = await preview.getAttribute('src');
  await editor.fill('client -> api -> db\nclient: Browser\napi: Server\ndb(cylinder): Database');
  await expect(status).toHaveText('Preview up to date');
  await expect(preview).not.toHaveAttribute('src', initialImage);
  await expect(page.getByRole('region', { name: 'Errors and warnings' })).toContainText(/warning/i);
  const validImage = await preview.getAttribute('src');
  await editor.fill('group {\n  A ->\n}');
  await expect(status).toHaveText('Check the errors below');
  const diagnostics = page.getByRole('region', { name: 'Errors and warnings' });
  await expect(diagnostics.getByRole('listitem').first()).toContainText(/error/i);
  await expect(preview).toHaveAttribute('src', validImage);
  await expect(preview).toHaveAttribute('title', 'Preview from the last successful render');
  const diagnosticsBounds = await diagnostics.boundingBox();
  expect(diagnosticsBounds.y).toBeGreaterThan(previewBounds.y);
  expect(diagnosticsBounds.y + diagnosticsBounds.height).toBeLessThanOrEqual(1000);
  expect(diagnosticsBounds.y + diagnosticsBounds.height).toBeLessThanOrEqual((await preview.boundingBox()).y);
  await diagnostics.getByRole('button', { name: 'Line 2, column 7' }).click();
  await expect(editor).toBeFocused();
  expect(await editor.evaluate(element => element.selectionStart)).toBe(14);

  await editor.fill('A -> B');
  await expect(status).toHaveText('Preview up to date');
  await expect(diagnostics).toHaveCount(0);
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
  await expect(page.getByRole('separator', { name: 'Resize editor and preview' })).toBeHidden();
  await page.getByRole('link', { name: 'Syntax reference', exact: true }).click();
  await expect(page).toHaveURL(/\/reference\/syntax(?:\.html)?$/);
  await page.goto('/playground');
  await expect(status).toHaveText('Preview up to date');
  expect(failures).toEqual([]);
});

test('splitter adjusts panes with pointer and keyboard while tall previews stay contained', async ({ page }) => {
  await page.goto('/playground');
  const status = page.getByRole('status', { name: 'Render status' });
  await expect(status).toHaveText('Preview up to date');
  const splitter = page.getByRole('separator', { name: 'Resize editor and preview' });
  await expect(splitter).toBeVisible();
  const editor = page.getByRole('textbox', { name: 'TextGraph source' });
  const preview = page.getByRole('img', { name: 'Rendered TextGraph diagram' });
  const originalWidth = (await editor.boundingBox()).width;
  const handle = await splitter.boundingBox();
  await page.mouse.move(handle.x + handle.width / 2, handle.y + 100);
  await page.mouse.down();
  await page.mouse.move(handle.x + 200, handle.y + 100, { steps: 8 });
  await page.mouse.up();
  expect((await editor.boundingBox()).width).toBeGreaterThan(originalWidth + 150);
  const releasedWidth = (await editor.boundingBox()).width;
  await page.mouse.move(100, handle.y + 100);
  expect((await editor.boundingBox()).width).toBe(releasedWidth);

  await splitter.focus();
  await page.keyboard.press('Home');
  await expect(splitter).toHaveAttribute('aria-valuenow', '20');
  await page.keyboard.press('ArrowRight');
  await expect(splitter).toHaveAttribute('aria-valuenow', '22');
  await page.keyboard.press('ArrowLeft');
  await expect(splitter).toHaveAttribute('aria-valuenow', '20');
  await page.keyboard.press('End');
  await page.keyboard.press('ArrowRight');
  await expect(splitter).toHaveAttribute('aria-valuenow', '80');

  const previousImage = await preview.getAttribute('src');
  await editor.fill('A -> B -> C -> D -> E -> F -> G -> H');
  await expect(status).toHaveText('Preview up to date');
  await expect(preview).not.toHaveAttribute('src', previousImage);
  await preview.evaluate(image => image.decode());
  const assertFits = async () => {
    const sizes = await preview.evaluate(image => {
      const canvas = image.closest('.preview-canvas');
      const imageBounds = image.getBoundingClientRect();
      const canvasBounds = canvas.getBoundingClientRect();
      return {
        scrollHeight: canvas.scrollHeight, height: canvas.clientHeight,
        scrollWidth: canvas.scrollWidth, width: canvas.clientWidth,
        contained: imageBounds.top >= canvasBounds.top && imageBounds.bottom <= canvasBounds.bottom
          && imageBounds.left >= canvasBounds.left && imageBounds.right <= canvasBounds.right,
        naturalHeight: image.naturalHeight,
      };
    });
    expect(sizes.naturalHeight).toBeGreaterThan(sizes.height);
    expect(sizes.scrollHeight).toBeLessThanOrEqual(sizes.height);
    expect(sizes.scrollWidth).toBeLessThanOrEqual(sizes.width);
    expect(sizes.contained).toBe(true);
  };
  await assertFits();
  await editor.fill('group {\n  A ->\n}');
  await expect(status).toHaveText('Check the errors below');
  await assertFits();
  await page.setViewportSize({ width: 900, height: 750 });
  await assertFits();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(splitter).toBeHidden();
  await assertFits();
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

test('refresh keeps the preview geometry stable, including with warnings and narrow panes', async ({ page }) => {
  await page.goto('/playground');
  const status = page.getByRole('status', { name: 'Render status' });
  const editor = page.getByRole('textbox', { name: 'TextGraph source' });
  const preview = page.getByRole('img', { name: 'Rendered TextGraph diagram' });
  const diagnostics = page.getByRole('region', { name: 'Errors and warnings' });
  await expect(status).toHaveText('Preview up to date');

  const checkRefresh = async () => {
    await preview.evaluate(image => image.decode());
    const before = await preview.boundingBox();
    const previousUrl = await preview.getAttribute('src');
    const previousDiagnostics = await diagnostics.allTextContents();
    // Hold the debounce so the layout is observed with the existing result and
    // new source. The renderer has not produced any new geometry at this point.
    await page.clock.pauseAt(new Date());
    await editor.fill((await editor.inputValue()) + ' ');
    await expect(status).toHaveText('Waiting for edits…');
    expect(await preview.boundingBox()).toEqual(before);
    await expect(preview).toHaveAttribute('src', previousUrl);
    expect(await diagnostics.allTextContents()).toEqual(previousDiagnostics);
    await page.clock.resume();
    await expect(preview).not.toHaveAttribute('src', previousUrl);
    await expect(status).toHaveText('Preview up to date');
    await preview.evaluate(image => image.decode());
    expect(await preview.boundingBox()).toEqual(before);
  };

  await checkRefresh();
  await editor.fill('A -> B\nB(cylinder): Database');
  await expect(diagnostics).toContainText(/warning/i);
  await expect(status).toHaveText('Preview up to date');
  await checkRefresh();
  await page.setViewportSize({ width: 1080, height: 900 });
  await page.getByRole('separator', { name: 'Resize editor and preview' }).focus();
  await page.keyboard.press('End');
  await checkRefresh();
});
