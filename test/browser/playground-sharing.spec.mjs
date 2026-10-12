import { test, expect } from '@playwright/test';
import { readSourceLink, createSourceLink } from '../../.vitepress/playground/source-link.mjs';

// Hold native stream completion while exercising the real codec and renderer.
async function delayCompression(page) {
  await page.addInitScript(() => {
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    window.releaseCompression = release;
    window.compressionStarted = false;
    for (const name of ['CompressionStream', 'DecompressionStream']) {
      const NativeStream = window[name];
      window[name] = class extends NativeStream {
        constructor(format) {
          super(format);
          const output = this.readable.pipeThrough(new TransformStream({
            async transform(chunk, controller) {
              window.compressionStarted = true;
              await gate;
              controller.enqueue(chunk);
            },
          }));
          Object.defineProperty(this, 'readable', { value: output });
        }
      };
    }
  });
  return {
    releaseCompression: () => page.evaluate(() => window.releaseCompression()),
    compressionStarted: () => page.waitForFunction(() => window.compressionStarted),
  };
}

test('a shared link restores the exact source before rendering', async ({ page }) => {
  const source = '  client -> api : HTTPS\n\nclient: Browser + 100% #1 & "quoted"\napi: 服务 café 🚀\n';
  const link = new URL(await createSourceLink('https://textgraph.dev/playground', source));
  await page.goto(link.pathname + link.search);
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
    await expect.poll(() => readSourceLink(page.url())).toBe(source);
    expect(new URL(page.url()).searchParams.get('from')).toBe('share');
    expect(new URL(page.url()).searchParams.get('d')).toMatch(/^[01][.][A-Za-z0-9_-]*$/);
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
  expect(await readSourceLink(page.url())).toBe(source);
  await expect(editor).toHaveValue(source);
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

for (const [version, source] of [['0', 'A -> B'], ['1', 'A -> B\n'.repeat(30)]]) {
  test('version ' + version + ' query restores before rendering and survives edits and reload', async ({ page }) => {
    const link = new URL(await createSourceLink('https://textgraph.dev/playground', source));
    expect(link.searchParams.get('d')).toMatch(new RegExp('^' + version + '[.]'));
    await page.goto(link.pathname + link.search);
    const editor = page.getByRole('textbox', { name: 'TextGraph source' });
    await expect(editor).toHaveValue(source);
    await expect(page.getByRole('status', { name: 'Render status' })).toHaveText('Preview up to date');
    const edited = source + '\nB -> C';
    await editor.fill(edited);
    await expect.poll(() => readSourceLink(page.url())).toBe(edited);
    await page.reload();
    await expect(editor).toHaveValue(edited);
  });
}

test('slow native decompression never restores old text over a newer edit', async ({ page }) => {
  const { releaseCompression, compressionStarted } = await delayCompression(page);
  const link = new URL(await createSourceLink('https://textgraph.dev/playground', 'A -> B\n'.repeat(30)));
  await page.goto(link.pathname + link.search, { waitUntil: 'domcontentloaded' });
  try {
    await compressionStarted();
    const editor = page.getByRole('textbox', { name: 'TextGraph source' });
    await editor.fill('latest -> edit');
    await releaseCompression();
    await expect.poll(() => readSourceLink(page.url())).toBe('latest -> edit');
    await expect(editor).toHaveValue('latest -> edit');
    await expect(page.getByRole('status', { name: 'Render status' })).toHaveText('Preview up to date');
  } finally { await releaseCompression(); }
});

test('query navigation and Back restore the correct source in the mounted playground', async ({ page }) => {
  await page.goto('/playground?d=0.QQ');
  const editor = page.getByRole('textbox', { name: 'TextGraph source' });
  await expect(editor).toHaveValue('A');
  await page.evaluate(() => {
    const link = document.createElement('a');
    link.href = '?d=0.Qg';
    link.textContent = 'Open another source';
    document.body.append(link);
  });
  await page.getByRole('link', { name: 'Open another source' }).click();
  await expect(editor).toHaveValue('B');
  await page.goBack();
  await expect(editor).toHaveValue('A');
});

test('Share waits for initial compressed source restoration', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const { releaseCompression, compressionStarted } = await delayCompression(page);
  const source = 'A -> B\n'.repeat(30);
  const link = new URL(await createSourceLink('https://textgraph.dev/playground', source));
  await page.goto(link.pathname + link.search, { waitUntil: 'domcontentloaded' });
  try {
    await compressionStarted();
    const share = page.getByRole('button', { name: 'Share', exact: true });
    await expect(share).toBeDisabled();
    await releaseCompression();
    await expect(page.getByRole('textbox', { name: 'TextGraph source' })).toHaveValue(source);
    await share.click();
    await expect(page.getByRole('status', { name: 'Share status' })).toHaveText('Link copied.');
    expect(await readSourceLink(await page.evaluate(() => navigator.clipboard.readText()))).toBe(source);
  } finally { await releaseCompression(); }
});

test('navigation flushes edits made while native compression delays departure', async ({ page }) => {
  const { releaseCompression, compressionStarted } = await delayCompression(page);
  await page.goto('/playground?d=0.QQ');
  const editor = page.getByRole('textbox', { name: 'TextGraph source' });
  try {
    await editor.fill('first -> edit');
    await page.getByRole('link', { name: 'Syntax reference', exact: true }).click();
    await compressionStarted();
    await editor.fill('latest -> edit');
    await releaseCompression();
    await expect(editor).toHaveCount(0);
    await page.goBack();
    await expect(editor).toHaveValue('latest -> edit');
  } finally { await releaseCompression(); }
});

test('Share starts the real clipboard write before waiting for native compression', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.addInitScript(() => {
    const write = navigator.clipboard.write.bind(navigator.clipboard);
    navigator.clipboard.write = items => { window.clipboardStarted = true; return write(items); };
  });
  const { releaseCompression, compressionStarted } = await delayCompression(page);
  await page.goto('/playground?d=0.QQ');
  try {
    await page.getByRole('button', { name: 'Share', exact: true }).click();
    await compressionStarted();
    expect(await page.evaluate(() => window.clipboardStarted)).toBe(true);
    await releaseCompression();
    await expect(page.getByRole('status', { name: 'Share status' })).toHaveText('Link copied.');
    expect(await readSourceLink(await page.evaluate(() => navigator.clipboard.readText()))).toBe('A');
  } finally { await releaseCompression(); }
});

test('compressed sharing uses native streams without downloading a codec WASM', async ({ page }) => {
  const wasmRequests = [];
  page.on('request', request => {
    const pathname = new URL(request.url()).pathname;
    if (pathname.endsWith('.wasm')) wasmRequests.push(pathname);
  });
  await page.goto('/playground?d=0.QQ');
  const editor = page.getByRole('textbox', { name: 'TextGraph source' });
  const source = 'A -> B\n'.repeat(30);
  await editor.fill(source);
  await expect.poll(() => readSourceLink(page.url())).toBe(source);
  expect(new URL(page.url()).searchParams.get('d')).toMatch(/^1\./);
  await page.reload();
  await expect(editor).toHaveValue(source);
  expect(wasmRequests.length).toBeGreaterThan(0);
  expect(wasmRequests.every(pathname => pathname.startsWith('/textgraph/wasm/'))).toBe(true);
});

test('browsers without native streams can edit, share raw source, and reopen it', async ({ page }) => {
  await page.addInitScript(() => {
    window.CompressionStream = undefined;
    window.DecompressionStream = undefined;
  });
  await page.goto('/playground?d=0.QQ');
  const editor = page.getByRole('textbox', { name: 'TextGraph source' });
  const source = 'A -> B\n'.repeat(30);
  await editor.fill(source);
  await expect.poll(() => readSourceLink(page.url())).toBe(source);
  expect(new URL(page.url()).searchParams.get('d')).toMatch(/^0\./);
  await page.reload();
  await expect(editor).toHaveValue(source);
});
