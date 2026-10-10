import { test, expect } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createSourceLink, readSourceLink } from '../../.vitepress/playground/source-link.mjs';
const sitePackage = JSON.parse(await readFile(new URL('../../package.json', import.meta.url), 'utf8'));

const invalid = 'group {\n  A ->\n}';
const repaired = 'group {\n  A -> B\n}';
const api = '**/api/textgraph/fix';
const editor = page => page.getByRole('textbox', { name: 'TextGraph source' });
const preview = page => page.getByRole('img', { name: 'Rendered TextGraph diagram' });
const review = page => page.getByRole('region', { name: 'Repair review' });
const errors = page => page.getByRole('region', { name: 'Diagram errors' });

async function openInvalid(page) {
  const link = new URL(await createSourceLink('https://textgraph.dev/playground', invalid));
  await page.goto(link.pathname + link.search);
  await expect(errors(page)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Fix It', exact: true })).toBeEnabled();
}

async function mockRepair(page, source = repaired) {
  await page.route(api, route => route.fulfill({ json: { source }, headers: { 'Access-Control-Allow-Origin': '*' } }));
}

test('error overlay covers the empty image viewport and repaired PNG requires review before replacing DSL', async ({ page }) => {
  let request;
  let diagnostic;
  page.on('console', async message => {
    if (message.text().startsWith('[TextGraph]') && message.type() === 'error') diagnostic = await message.args()[1].jsonValue();
  });
  await page.route(api, route => { request = route.request(); return route.fulfill({ json: { source: repaired } }); });
  await openInvalid(page);
  await expect(preview(page)).toHaveCount(0);
  const canvas = await page.getByRole('region', { name: 'Image canvas', exact: true }).boundingBox();
  const overlay = await errors(page).boundingBox();
  expect(overlay).toEqual(canvas);
  await expect(errors(page)).toContainText('powered by gpt-6-luna');
  await expect(errors(page)).toContainText('sends this DSL to Azure AI');
  await expect.poll(() => diagnostic?.location).toBeTruthy();
  await expect(errors(page)).toContainText(`Line ${diagnostic.location.line + 1}, column ${diagnostic.location.column + 1}`);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await expect(page.getByRole('button', { name: 'Fix It', exact: true })).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 1000 });
  const originalLink = page.url();
  await page.getByRole('button', { name: 'Fix It', exact: true }).click();
  await expect(review(page)).toBeVisible();
  await expect(preview(page)).toBeVisible();
  await expect.poll(() => preview(page).evaluate(image => image.naturalWidth)).toBeGreaterThan(0);
  expect(request.postData()).toBe(invalid);
  expect(request.headers()['content-type']).toBe('text/plain; charset=utf-8');
  expect(request.headers()['x-textgraph-renderer-version']).toBe(sitePackage.devDependencies['@drawmotive/textgraph']);
  expect(request.headers().referer).toBeUndefined();
  await expect(editor(page)).toHaveValue(invalid);
  expect(page.url()).toBe(originalLink);
  await page.getByText('Review source changes', { exact: true }).click();
  await expect(page.getByLabel('Source changes')).toContainText('−   A ->');
  await expect(page.getByLabel('Source changes')).toContainText('+   A -> B');
  await page.getByRole('button', { name: 'Replace original DSL' }).click();
  await expect(editor(page)).toHaveValue(repaired);
  await expect(review(page)).toHaveCount(0);
  await expect.poll(() => readSourceLink(page.url())).toBe(repaired);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(editor(page)).toHaveValue(invalid);
  await expect.poll(() => readSourceLink(page.url())).toBe(invalid);
  await editor(page).press('Control+Shift+z');
  await expect(editor(page)).toHaveValue(repaired);
  await editor(page).press('Control+z');
  await expect(editor(page)).toHaveValue(invalid);
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await expect(editor(page)).toHaveValue(repaired);
});

test('discard restores last draft PNG; edits invalidate a reviewed candidate', async ({ page }) => {
  await mockRepair(page);
  await page.goto('/playground');
  await expect(page.getByRole('status', { name: 'Render status' })).toHaveText('Preview up to date');
  const originalImage = await preview(page).getAttribute('src');
  await editor(page).fill(invalid);
  await expect(errors(page)).toBeVisible();
  await expect(preview(page)).toHaveAttribute('src', originalImage);
  await page.getByRole('button', { name: 'Fix It', exact: true }).click();
  await expect(review(page)).toBeVisible();
  await expect(preview(page)).not.toHaveAttribute('src', originalImage);
  await page.getByRole('button', { name: 'Discard', exact: true }).click();
  await expect(preview(page)).toHaveAttribute('src', originalImage);
  await expect(editor(page)).toHaveValue(invalid);
  await page.getByRole('button', { name: 'Fix It', exact: true }).click();
  await expect(review(page)).toBeVisible();
  await editor(page).fill('A -> C');
  await expect(review(page)).toHaveCount(0);
  await expect(editor(page)).toHaveValue('A -> C');
});

test('late HTTP response after edit cannot replace source or preview or offer review', async ({ page }) => {
  let release;
  let started;
  const gate = new Promise(resolve => { release = resolve; });
  const requested = new Promise(resolve => { started = resolve; });
  await page.route(api, async route => { started(); await gate; await route.fulfill({ json: { source: repaired } }).catch(() => {}); });
  await openInvalid(page);
  await page.getByRole('button', { name: 'Fix It', exact: true }).click();
  await requested;
  await editor(page).fill('latest -> source');
  release();
  await expect(page.getByRole('status', { name: 'Render status' })).toHaveText('Preview up to date');
  await expect(editor(page)).toHaveValue('latest -> source');
  await expect(review(page)).toHaveCount(0);
  await expect(errors(page)).toHaveCount(0);
});

test('invalid repaired DSL never replaces the original preview or offers Apply', async ({ page }) => {
  await mockRepair(page, 'other { -> }');
  await openInvalid(page);
  await page.getByRole('button', { name: 'Fix It', exact: true }).click();
  await expect(page.getByRole('status', { name: 'Fix status' })).toContainText('could not be rendered');
  await expect(editor(page)).toHaveValue(invalid);
  await expect(review(page)).toHaveCount(0);
  await expect(preview(page)).toHaveCount(0);
});

test('rate limit displays safe retry advice without leaking provider text', async ({ page }) => {
  await page.route(api, route => route.fulfill({ status: 429, json: { code: 'RATE_LIMITED', message: 'provider secret' } }));
  await openInvalid(page);
  await page.getByRole('button', { name: 'Fix It', exact: true }).click();
  await expect(page.getByRole('status', { name: 'Fix status' })).toContainText('Wait a minute');
  await expect(page.locator('body')).not.toContainText('provider secret');
  await expect(editor(page)).toHaveValue(invalid);
});

test('renderer startup errors show retry guidance without Fix It', async ({ page }) => {
  await page.route('**/textgraph/wasm/**', route => route.abort());
  await page.goto('/playground');
  await expect(errors(page)).toBeVisible();
  await expect(errors(page)).toContainText('try Render now again');
  await expect(page.getByRole('button', { name: 'Fix It', exact: true })).toHaveCount(0);
});

test('warnings do not cover a valid PNG or offer repair', async ({ page }) => {
  await page.goto('/playground');
  await editor(page).fill('client -> api -> db\nclient: Browser\napi: Server\ndb(cylinder): Database');
  await expect(page.getByRole('status', { name: 'Render status' })).toHaveText('Preview up to date');
  await expect(errors(page)).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Fix It', exact: true })).toHaveCount(0);
});

test('IME commits form one undo transaction and intermediate composition cannot render or undo', async ({ page }) => {
  await page.goto('/playground?d=0.QQ');
  await expect(editor(page)).toHaveValue('A');
  await editor(page).evaluate(input => {
    input.setSelectionRange(1, 1);
    input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    input.value = 'A服务';
    input.dispatchEvent(new InputEvent('input', { bubbles: true, isComposing: true, inputType: 'insertCompositionText' }));
  });
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled();
  await editor(page).dispatchEvent('compositionend', { data: '服务' });
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeEnabled();
  await editor(page).press('Control+z');
  await expect(editor(page)).toHaveValue('A');
  await editor(page).press('Control+y');
  await expect(editor(page)).toHaveValue('A服务');
});

test('a PNG decode failure prevents Apply even after a successful local render', async ({ page }) => {
  await mockRepair(page);
  await openInvalid(page);
  await page.evaluate(() => { HTMLImageElement.prototype.decode = async () => { throw new Error('Damaged PNG'); }; });
  await page.getByRole('button', { name: 'Fix It', exact: true }).click();
  await expect(page.getByRole('status', { name: 'Fix status' })).toContainText('PNG could not be displayed');
  await expect(review(page)).toHaveCount(0);
  await expect(editor(page)).toHaveValue(invalid);
});

test('cancel aborts a pending repair and ignores late completion', async ({ page }) => {
  let release;
  let started;
  let requests = 0;
  const gate = new Promise(resolve => { release = resolve; });
  const requested = new Promise(resolve => { started = resolve; });
  await page.route(api, async route => { requests += 1; started(); await gate; await route.fulfill({ json: { source: repaired } }).catch(() => {}); });
  await openInvalid(page);
  await page.getByRole('button', { name: 'Fix It', exact: true }).click();
  await requested;
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  release();
  await expect(page.getByRole('button', { name: 'Fix It', exact: true })).toBeEnabled();
  await expect(review(page)).toHaveCount(0);
  await expect(editor(page)).toHaveValue(invalid);
  expect(requests).toBe(1);
});

for (const language of ['Chinese', 'English']) test(`repaired ${language} branch and merge reaches review within the candidate deadline`, async ({ page, browser, request }, testInfo) => {
  test.skip(!process.env.DRAWMOTIVE_TEXTGRAPH_RUNTIME, 'The native performance regression requires the selected local runtime; the pinned registry SDK predates this fix.');
  let source = String.raw`(vertical)

start(stadium fill primary): 切换IM-NP功能
step1(rect fill): IM-NP/VLA\n轨迹控车靠边
step2(rect fill): nearly检查判断\n是否需开启泊车感知
step3(rect fill): 泊车感知开启，\n进行寻库
decision(diamond fill warning): 满足泊车条件？
note(fill secondary): 条件详情：IM-NP无法靠边，且nearly曾找到好车位
end_node(stadium fill success): 停车，IM-NP内部\n开启泊车功能

start -> step1
step1 -> decision
step1 -> step2
step2 -> step3
step3 -> decision
note -.->(dotted) decision
decision -> end_node`;
  if (language === 'English') {
    const translations = [
      ['切换IM-NP功能', 'Switch IM-NP mode'],
      ['轨迹控车靠边', 'Pull over using trajectory control'],
      ['nearly检查判断', 'Check nearly result'],
      ['是否需开启泊车感知', 'Enable parking perception?'],
      ['泊车感知开启，', 'Enable parking perception,'],
      ['进行寻库', 'search for a parking space'],
      ['满足泊车条件？', 'Parking conditions met?'],
      ['条件详情：IM-NP无法靠边，且nearly曾找到好车位', 'Conditions: IM-NP cannot pull over and nearly found a good space'],
      ['停车，IM-NP内部', 'Stop and enable parking'],
      ['开启泊车功能', 'inside IM-NP'],
    ];
    for (const [before, after] of translations) source = source.replace(before, after);
  }
  const candidate = source.replace('note -.->', 'note ->');
  const manifest = JSON.parse(await readFile(process.env.DRAWMOTIVE_TEXTGRAPH_RUNTIME + '/wasm-manifest.json', 'utf8'));
  expect(manifest.privateSource.development).toBe(true);
  // Verify real served bytes, not just the environment flag enabling this case.
  for (const asset of manifest.assets) {
    const response = await request.get('/textgraph/' + asset.path);
    expect(response.ok()).toBe(true);
    expect(createHash('sha256').update(await response.body()).digest('hex')).toBe(asset.sha256);
  }

  await page.addInitScript(() => {
    const NativeWorker = window.Worker;
    window.renderRequests = [];
    window.previewMessages = 0;
    window.repairTiming = {};
    document.addEventListener('click', event => {
      if (event.target.closest('button')?.textContent.trim() === 'Fix It') {
        window.repairTiming = { click: performance.now() };
        const observer = new MutationObserver(() => {
          if (document.querySelector('[aria-label="Repair review"]')) {
            window.repairTiming.review = performance.now();
            observer.disconnect();
          }
        });
        observer.observe(document.documentElement, { childList: true, subtree: true });
      }
    }, true);
    const decode = HTMLImageElement.prototype.decode;
    HTMLImageElement.prototype.decode = async function () {
      const timing = window.repairTiming;
      if (timing.result) timing.decodeStart = performance.now();
      await decode.call(this);
      if (timing.result) timing.decodeEnd = performance.now();
    };

    window.Worker = class extends NativeWorker {
      constructor(...args) {
        super(...args);
        const timing = window.repairTiming;
        if (timing.click) { timing.worker = performance.now(); timing.workerUrl = String(args[0]); }
        this.addEventListener('message', ({ data }) => {
          if (timing.click && data.type === 'ready') timing.ready = performance.now();
          if (timing.click && data.type === 'result') timing.result = performance.now();

          if (data.type === 'preview') window.previewMessages += 1;
        });
      }
      postMessage(message, ...rest) {
        if (message.type === 'render') window.renderRequests.push(message);
        if (message.type === 'render' && message.preview === false) window.repairTiming.render = performance.now();

        return super.postMessage(message, ...rest);
      }
    };
  });
  await mockRepair(page, candidate);
  const link = new URL(await createSourceLink('https://textgraph.dev/playground', source));
  await page.goto(link.pathname + link.search);
  await expect(errors(page)).toBeVisible();
  const originalLink = page.url();
  let tracing;
  if (process.env.DRAWMOTIVE_REPAIR_TRACE) {
    tracing = await browser.newBrowserCDPSession();
    await tracing.send('Tracing.start', { categories: 'devtools.timeline,v8.execute,disabled-by-default-v8.cpu_profiler,blink.user_timing', transferMode: 'ReturnAsStream' });
  }

  await page.getByRole('button', { name: 'Fix It', exact: true }).click();
  let reviewError;
  try { await expect(review(page)).toBeVisible({ timeout: 35_000 }); } catch (error) { reviewError = error; }
  const timing = await page.evaluate(() => window.repairTiming);
  const durations = { language, fingerprint: manifest.privateSource.fingerprint,
    mockRequestMs: timing.worker - timing.click, workerStartupMs: timing.ready - timing.worker,
    renderMs: timing.result - timing.render, pngDecodeMs: timing.decodeEnd - timing.decodeStart,
    candidateMs: timing.review - timing.worker, totalMs: timing.review - timing.click, timing };
  console.log('Repair timing: ' + JSON.stringify(durations));
  await testInfo.attach('repair-timing', { body: JSON.stringify(durations, null, 2), contentType: 'application/json' });
  const workerBundle = await (await request.get(timing.workerUrl)).text();
  expect(workerBundle).toContain(manifest.privateSource.fingerprint);
  if (tracing) {
    const completed = new Promise(resolve => tracing.once('Tracing.tracingComplete', resolve));
    await tracing.send('Tracing.end');
    const { stream } = await completed;
    let trace = '';
    for (;;) {
      const chunk = await tracing.send('IO.read', { handle: stream });
      trace += chunk.base64Encoded ? Buffer.from(chunk.data, 'base64').toString() : chunk.data;
      if (chunk.eof) break;
    }
    await tracing.send('IO.close', { handle: stream });
    await writeFile(testInfo.outputPath('chromium-trace.json'), trace);
    await tracing.detach();
  }

  if (reviewError) throw reviewError;
  await expect.poll(() => preview(page).evaluate(image => image.naturalWidth)).toBeGreaterThan(0);
  await expect(editor(page)).toHaveValue(source);
  expect(page.url()).toBe(originalLink);
  expect(await page.evaluate(() => window.renderRequests.at(-1).preview)).toBe(false);
  expect(await page.evaluate(() => window.previewMessages)).toBe(0);
  await expect(page.getByRole('status', { name: 'Fix status' })).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('repaired.png'), fullPage: true });
});

test('candidate timeout reports the 30 second cause and preserves the source', async ({ page }) => {
  await page.addInitScript(() => {
    const NativeWorker = window.Worker;
    window.Worker = class extends NativeWorker {
      postMessage(message, ...rest) {
        if (message.type === 'render' && message.preview === false) return;
        return super.postMessage(message, ...rest);
      }
    };
  });
  await mockRepair(page, repaired);
  await openInvalid(page);
  const originalLink = page.url();
  await page.getByRole('button', { name: 'Fix It', exact: true }).click();
  await expect(page.getByRole('status', { name: 'Fix status' })).toContainText(
    'The repaired diagram rendering timed out after 30 seconds. Your source is unchanged.', { timeout: 35_000 });
  await expect(review(page)).toHaveCount(0);
  await expect(editor(page)).toHaveValue(invalid);
  expect(page.url()).toBe(originalLink);
});
