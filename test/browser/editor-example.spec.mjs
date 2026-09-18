import { test, expect } from '@playwright/test';

test('editor documentation opens a working standalone visual editor', async ({ page, baseURL }) => {
  const errors = [];
  const external = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (!request.url().startsWith(baseURL) && !request.url().startsWith('data:') && !request.url().startsWith('blob:')) external.push(request.url()); });
  await page.goto('/editor/');
  await page.getByRole('link', { name: 'Open the runnable editor example' }).click();
  await expect(page).toHaveURL(/examples[/]editor[/]$/);
  await expect(page.locator('#status')).toHaveText('Ready to edit');
  await expect(page.frameLocator('iframe').locator('[data-testid="dcanvas"]')).toBeVisible();
  await page.locator('#source').fill('Draft -> Review -> Approved');
  await page.getByRole('button', { name: 'Generate diagram' }).click();
  await expect(page.locator('#status')).toHaveText('Ready to edit');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PNG' }).click();
  expect((await download).suggestedFilename()).toBe('diagram.png');
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});

test('editor example works on mobile without horizontal page overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/examples/editor/');
  await expect(page.locator('#status')).toHaveText('Ready to edit');
  await expect(page.getByRole('button', { name: 'Generate diagram' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
