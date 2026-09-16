import { test, expect } from '@playwright/test';

// Serve the built site under its production hostname, but keep all Google
// traffic intercepted so verification never pollutes the real property.
async function productionSite(page) {
  await page.route('https://textgraph.dev/**', async route => {
    const url = new URL(route.request().url());
    const response = await route.fetch({ url: 'http://127.0.0.1:4175' + url.pathname + url.search });
    await route.fulfill({ response });
  });
  await page.route(/https:\/\/[^/]*(google|doubleclick)[^/]*\//, route => route.fulfill({
    contentType: 'text/javascript', body: '',
  }));
}
async function events(page, name) {
  return page.evaluate(name => (window.dataLayer ?? []).map(args => Array.from(args))
    .filter(args => args[0] === 'event' && (!name || args[1] === name)), name);
}

test('homepage journey tracks successful edits and actions without leaking source or duplicating pageviews', async ({ page, context }) => {
  await productionSite(page);
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('https://textgraph.dev/?private=secret');
  await expect.poll(() => events(page, 'homepage_viewed').then(value => value.length)).toBe(1);
  await page.getByRole('link', { name: 'Open Playground', exact: true }).click();
  const status = page.getByRole('status', { name: 'Render status' });
  await expect(status).toHaveText('Preview up to date');
  expect((await events(page, 'playground_opened'))[0][2].entry_point).toBe('home_hero');
  expect(await events(page, 'diagram_created')).toHaveLength(0);
  const editor = page.getByRole('textbox', { name: 'TextGraph source' });
  const initial = await editor.inputValue();
  await editor.fill(initial + '  ');
  await expect(status).toHaveText('Preview up to date');
  expect(await events(page, 'diagram_created')).toHaveLength(0);
  await editor.fill('A -> B\nA: secret_diagram_label');
  await expect.poll(() => events(page, 'homepage_activated').then(value => value.length)).toBe(1);
  await editor.fill('A -> C\nA: secret_diagram_label');
  await expect(status).toHaveText('Preview up to date');
  await page.getByRole('button', { name: 'Share', exact: true }).click();
  await expect.poll(() => events(page, 'diagram_action').then(value => value.length)).toBe(1);
  expect((await events(page, 'diagram_action'))[0][2].action_type).toBe('copy_link');
  expect(await events(page, 'diagram_created')).toHaveLength(1);
  expect(await events(page, 'page_view')).toHaveLength(2);
  expect(JSON.stringify(await events(page))).not.toMatch(/secret|source=|A ->/);
  await page.reload();
  await expect(status).toHaveText('Preview up to date');
  await editor.fill('A -> D');
  await expect(status).toHaveText('Preview up to date');
  expect(await events(page, 'diagram_created')).toHaveLength(0);
});

test('shared URLs cannot claim homepage attribution and clipboard denial is not a successful action', async ({ page }) => {
  await productionSite(page);
  await page.addInitScript(() => Object.defineProperty(navigator, 'clipboard', { value: {
    writeText: async () => { throw new DOMException('Denied', 'NotAllowedError'); },
  } }));
  await page.goto('https://textgraph.dev/playground?from=home#source=A%20-%3E%20B');
  await expect(page.getByRole('status', { name: 'Render status' })).toHaveText('Preview up to date');
  const opened = await events(page, 'playground_opened');
  expect(opened[0][2].entry_point).toBe('direct');
  expect(opened[0][2].homepage_seen).toBe(false);
  await page.getByRole('button', { name: 'Share', exact: true }).click();
  await expect(page.getByRole('status', { name: 'Share status' })).toContainText('address bar');
  expect(await events(page, 'diagram_action')).toHaveLength(0);
  await page.getByRole('textbox', { name: 'TextGraph source' }).fill('A -> C');
  await expect.poll(() => events(page, 'diagram_created').then(value => value.length)).toBe(1);
  expect(await events(page, 'homepage_activated')).toHaveLength(0);
});

test('local previews never load Google Analytics', async ({ page }) => {
  const google = [];
  page.on('request', request => { if (/google|doubleclick/.test(request.url())) google.push(request.url()); });
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Open Playground', exact: true })).toBeVisible();
  expect(google).toEqual([]);
  expect(await page.evaluate(() => window.dataLayer)).toBeUndefined();
});

test('copy success describes the copied preview, even if rendering finishes while clipboard waits', async ({ page }) => {
  await productionSite(page);
  await page.addInitScript(() => Object.defineProperty(navigator, 'clipboard', { value: {
    write: () => new Promise(resolve => { window.completeImageCopy = resolve; }),
  } }));
  await page.goto('https://textgraph.dev/playground');
  const status = page.getByRole('status', { name: 'Render status' });
  await expect(status).toHaveText('Preview up to date');
  await page.clock.pauseAt(new Date());
  await page.getByRole('textbox', { name: 'TextGraph source' }).fill('A -> changed');
  await page.getByRole('button', { name: 'Copy image' }).click();
  expect(await events(page, 'diagram_action')).toHaveLength(0);
  await page.clock.runFor(400);
  await expect(status).toHaveText('Preview up to date');
  await page.evaluate(() => window.completeImageCopy());
  await expect.poll(() => events(page, 'diagram_action').then(value => value.length)).toBe(1);
  expect((await events(page, 'diagram_action'))[0][2].current_preview).toBe(false);
});
