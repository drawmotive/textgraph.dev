import { test, expect } from '@playwright/test';

test('editor documentation opens a working standalone visual editor', async ({ page, baseURL }, testInfo) => {
  const errors = [];
  const external = [];
  const workers = [];
  page.on('pageerror', error => errors.push(error.message));
  // Blazor reports native renderer failures through the browser console.
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('worker', worker => workers.push(worker.url()));
  page.on('request', request => { if (!request.url().startsWith(baseURL) && !request.url().startsWith('data:') && !request.url().startsWith('blob:')) external.push(request.url()); });
  await page.goto('/editor/');
  await page.getByRole('link', { name: 'Run the visual editor SDK demo' }).click();
  await expect(page).toHaveURL(/examples[/]editor[/]$/);
  await expect(page.locator('#status')).toHaveText('Ready to edit');
  await expect(page.locator('#editor [data-testid="dcanvas"]')).toBeVisible();
  expect(workers).toContain(baseURL + '/examples/editor/sdk/dist/workers/resource.worker.js');
  // Memory mode needs only the resource Worker; persistent hosts also load the document Worker.
  for (const worker of ['resource', 'document']) {
    const response = await page.request.get('/examples/editor/sdk/dist/workers/' + worker + '.worker.js');
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toMatch(/javascript/);
  }
  await page.locator('#source').fill('Draft -> Review -> Approved');
  await page.getByRole('button', { name: 'Generate diagram' }).click();
  await expect(page.locator('#status')).toHaveText('Ready to edit');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PNG' }).click();
  expect((await download).suggestedFilename()).toBe('diagram.png');
  await expect(page.locator('#status')).toHaveText('PNG downloaded');
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('editor-example.png'), fullPage: true });
});

test('editor example works on mobile without horizontal page overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/examples/editor/');
  await expect(page.locator('#status')).toHaveText('Ready to edit');
  await expect(page.getByRole('button', { name: 'Generate diagram' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
