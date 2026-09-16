import { test, expect } from '@playwright/test';

test('a shared link restores the exact source before rendering', async ({ page }) => {
  const source = '  client -> api : HTTPS\n\nclient: Browser + 100% #1 & "quoted"\napi: 服务 café 🚀\n';
  await page.goto('/playground#source=' + encodeURIComponent(source));
  await expect(page.getByRole('textbox', { name: 'TextGraph source' })).toHaveValue(source);
  await expect(page.getByRole('status', { name: 'Render status' })).toHaveText('Preview up to date');
  await expect(page.getByRole('img', { name: 'Rendered TextGraph diagram' })).toBeVisible();
});

test('edits update the link without adding history, including invalid and empty source', async ({ page }) => {
  await page.goto('/playground?from=share');
  const editor = page.getByRole('textbox', { name: 'TextGraph source' });
  await expect(editor).toBeVisible();
  const historyLength = await page.evaluate(() => history.length);
  for (const source of ['group {\n  A ->\n}', '  A -> B\n\n', '']) {
    await editor.fill(source);
    await expect.poll(() => new URLSearchParams(new URL(page.url()).hash.slice(1)).get('source')).toBe(source);
    expect(new URL(page.url()).search).toBe('?from=share');
    expect(await page.evaluate(() => history.length)).toBe(historyLength);
    await page.reload();
    await expect(editor).toHaveValue(source);
  }
  await expect(page.getByRole('status', { name: 'Render status' })).toHaveText('Add some TextGraph to begin');
});

test('Share copies the latest edit immediately and opens it in another browser context', async ({ page, context, browser }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/playground');
  const editor = page.getByRole('textbox', { name: 'TextGraph source' });
  await expect(editor).toBeVisible();
  await page.clock.pauseAt(new Date());
  const source = 'api -> db\napi: 服务 + 100% & # <tag>\n\n';
  await editor.fill(source);
  await page.getByRole('button', { name: 'Share', exact: true }).click();
  await expect(page.getByRole('status', { name: 'Share status' })).toContainText('Link copied');
  const shared = await page.evaluate(() => navigator.clipboard.readText());
  expect(shared).toBe(page.url());
  const recipient = await browser.newContext();
  try {
    const other = await recipient.newPage();
    await other.goto(shared);
    await expect(other.getByRole('textbox', { name: 'TextGraph source' })).toHaveValue(source);
  } finally {
    await recipient.close();
  }
});

test('clipboard denial leaves a current link available in the address bar', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { value: {
      writeText: async () => { throw new DOMException('Denied', 'NotAllowedError'); },
    } });
  });
  await page.goto('/playground');
  const editor = page.getByRole('textbox', { name: 'TextGraph source' });
  await expect(editor).toBeVisible();
  const source = await editor.inputValue();
  await page.getByRole('button', { name: 'Share', exact: true }).click();
  await expect(page.getByRole('status', { name: 'Share status' })).toContainText('address bar');
  expect(new URLSearchParams(new URL(page.url()).hash.slice(1)).get('source')).toBe(source);
  await expect(editor).toHaveValue(source);
});

test('hash navigation and browser back restore source while the playground stays mounted', async ({ page }) => {
  await page.goto('/playground#source=A%20-%3E%20B');
  const editor = page.getByRole('textbox', { name: 'TextGraph source' });
  await expect(editor).toHaveValue('A -> B');
  await page.evaluate(() => { location.hash = 'source=A%20-%3E%20C'; });
  await expect(editor).toHaveValue('A -> C');
  await page.goBack();
  await expect(editor).toHaveValue('A -> B');
});

test('leaving immediately after editing preserves source for Back without changing the destination link', async ({ page }) => {
  let releaseModule;
  const moduleGate = new Promise(resolve => { releaseModule = resolve; });
  await page.route('**/assets/reference_syntax.md.*.js', async route => {
    await moduleGate;
    await route.continue();
  });
  await page.goto('/playground');
  const editor = page.getByRole('textbox', { name: 'TextGraph source' });
  await expect(editor).toBeVisible();
  await page.clock.pauseAt(new Date());
  await editor.fill('A -> C\n');
  await page.getByRole('link', { name: 'Syntax reference', exact: true }).click();
  await expect(page).toHaveURL(/\/reference\/syntax(?:\.html)?$/);
  await page.clock.runFor(300);
  try {
    expect(new URL(page.url()).hash).toBe('');
  } finally {
    releaseModule();
  }
  await expect(editor).toHaveCount(0);
  await page.goBack();
  await expect(editor).toHaveValue('A -> C\n');
});
