import { readFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';

test('preview controls zoom, pan, reset, and preserve the view across refreshes', async ({ page }) => {
  await page.goto('/playground');
  const status = page.getByRole('status', { name: 'Render status' });
  await expect(status).toHaveText('Preview up to date');
  const preview = page.getByRole('img', { name: 'Rendered TextGraph diagram' });
  const canvas = page.getByRole('region', { name: 'Image canvas', exact: true });
  const zoomIn = page.getByRole('button', { name: 'Zoom in', exact: true });
  const zoomOut = page.getByRole('button', { name: 'Zoom out', exact: true });
  const reset = page.getByRole('button', { name: 'Reset view', exact: true });
  await expect(zoomIn).toBeVisible();
  await expect(page.getByRole('heading', { name: 'TextGraph Playground' })).toHaveCount(0);
  const sourcePanel = page.getByRole('region', { name: 'Diagram source' });
  await expect(sourcePanel.getByRole('link', { name: 'Syntax reference', exact: true })).toBeVisible();
  expect((await sourcePanel.boundingBox()).y).toBeLessThan(100);
  await preview.evaluate(image => image.decode());
  const original = await preview.boundingBox();
  await zoomIn.click();
  expect((await preview.boundingBox()).width).toBeGreaterThan(original.width);
  await zoomOut.click();
  expect(await preview.boundingBox()).toEqual(original);
  await zoomIn.click();
  const zoomed = await preview.boundingBox();
  const bounds = await canvas.boundingBox();
  const x = bounds.x + bounds.width / 2;
  const y = bounds.y + bounds.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 60, y + 35, { steps: 4 });
  await page.mouse.up();
  const panned = await preview.boundingBox();
  expect(panned.x - zoomed.x).toBeCloseTo(60, 1);
  expect(panned.y - zoomed.y).toBeCloseTo(35, 1);
  await page.mouse.move(x - 50, y);
  expect(await preview.boundingBox()).toEqual(panned);

  const editor = page.getByRole('textbox', { name: 'TextGraph source' });
  const previousUrl = await preview.getAttribute('src');
  await editor.fill((await editor.inputValue()) + ' ');
  await expect(preview).not.toHaveAttribute('src', previousUrl);
  await expect(status).toHaveText('Preview up to date');
  expect(await preview.boundingBox()).toEqual(panned);
  await reset.click();
  expect(await preview.boundingBox()).toEqual(original);
  await canvas.focus();
  await page.keyboard.press('+');
  expect((await preview.boundingBox()).width).toBeGreaterThan(original.width);
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('0');
  expect(await preview.boundingBox()).toEqual(original);

  await page.getByRole('separator', { name: 'Resize editor and preview' }).focus();
  await page.keyboard.press('End');
  for (const button of [zoomIn, zoomOut, reset, page.getByRole('button', { name: 'Download PNG' }), page.getByRole('button', { name: 'Copy image' })]) {
    await expect(button).toBeVisible();
    const box = await button.boundingBox();
    expect(box.x + box.width).toBeLessThanOrEqual(1440);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await expect(zoomIn).toBeVisible();
  await editor.fill('');
  for (const button of [zoomIn, zoomOut, reset, page.getByRole('button', { name: 'Download PNG' }), page.getByRole('button', { name: 'Copy image' })]) {
    await expect(button).toBeDisabled();
  }
});

test('download and clipboard export the complete PNG independently of zoom and pan', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/playground');
  await expect(page.getByRole('status', { name: 'Render status' })).toHaveText('Preview up to date');
  const preview = page.getByRole('img', { name: 'Rendered TextGraph diagram' });
  const originalBytes = await preview.evaluate(async image => Array.from(new Uint8Array(await (await fetch(image.src)).arrayBuffer())));
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PNG' }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toBe('textgraph.png');
  expect(Array.from(await readFile(await download.path()))).toEqual(originalBytes);

  await page.getByRole('button', { name: 'Copy image' }).click();
  await expect(page.getByRole('status', { name: 'Image actions' })).toHaveText('Image copied');
  const samePixels = await preview.evaluate(async image => {
    const items = await navigator.clipboard.read();
    const copied = await items.find(item => item.types.includes('image/png')).getType('image/png');
    const original = await (await fetch(image.src)).blob();
    const pixels = async blob => {
      const bitmap = await createImageBitmap(blob);
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(bitmap, 0, 0);
      bitmap.close();
      const digest = await crypto.subtle.digest('SHA-256', ctx.getImageData(0, 0, canvas.width, canvas.height).data);
      return { width: canvas.width, height: canvas.height, digest: Array.from(new Uint8Array(digest)) };
    };
    return [await pixels(original), await pixels(copied)];
  });
  expect(samePixels[1]).toEqual(samePixels[0]);
});

test('clipboard rejection provides feedback without changing the image layout', async ({ page }) => {
  await page.goto('/playground');
  await expect(page.getByRole('status', { name: 'Render status' })).toHaveText('Preview up to date');
  const preview = page.getByRole('img', { name: 'Rendered TextGraph diagram' });
  const before = await preview.boundingBox();
  // Only replace the permission-sensitive system boundary. Rendering and UI stay real.
  await page.evaluate(() => {
    navigator.clipboard.write = async () => { throw new DOMException('Denied', 'NotAllowedError'); };
  });
  await page.getByRole('button', { name: 'Copy image' }).click();
  await expect(page.getByRole('status', { name: 'Image actions' })).toContainText('Download the PNG instead');
  expect(await preview.boundingBox()).toEqual(before);
  await expect(page.getByRole('button', { name: 'Download PNG' })).toBeEnabled();
});
