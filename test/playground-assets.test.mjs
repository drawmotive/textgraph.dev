import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { abiManifest, initializeTextGraph } from '@drawmotive/textgraph/worker';
import { playgroundAssets } from '../.vitepress/playground/assets.mjs';
import { siteAssets, verifySiteRenderer } from '../.vitepress/site-assets.mjs';

for (const base of ['/', '/docs/']) {
  test(`playground serves runtime and optional fonts from site base ${base}`, () => {
    const assets = playgroundAssets(base, 'https://textgraph.dev');
    assert.equal(assets.resolveAsset({ path: 'wasm/dotnet.js' }).href,
      `https://textgraph.dev${base}textgraph/wasm/dotnet.js`);
    assert.equal(assets.fontAssets.catalog.href,
      `https://textgraph.dev${base}textgraph/fonts/font-catalog.json`);
    assert.equal(assets.fontAssets.fallback, false);
  });
}

test('the installed package requests every playground WASM before any download completes', async () => {
  const gate = Promise.withResolvers();
  const requested = [];
  const starting = initializeTextGraph({
    ...playgroundAssets('/', 'https://textgraph.dev'),
    fetch: async url => {
      requested.push(new URL(url).pathname);
      await gate.promise;
      return new Response(new Uint8Array([0]));
    },
  });
  const rejected = assert.rejects(starting, { code: 'ASSET_INTEGRITY_MISMATCH' });
  try {
    await Promise.resolve();
    const wasm = abiManifest.assets.filter(asset => asset.path.endsWith('.wasm'));
    assert.ok(wasm.length > 1);
    assert.deepEqual(requested.filter(url => url.endsWith('.wasm')).toSorted(),
      wasm.map(asset => '/textgraph/' + asset.path).toSorted());
  } finally {
    gate.resolve();
    await rejected;
  }
});

test('site asset preparation rejects a stale installed renderer before generating artifacts', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'textgraph-site-version-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const installed = path.join(root, 'node_modules/@drawmotive/textgraph');
  await mkdir(installed, { recursive: true });
  await writeFile(path.join(root, 'package.json'), JSON.stringify({
    devDependencies: { '@drawmotive/textgraph': abiManifest.packageVersion },
  }));
  await writeFile(path.join(installed, 'package.json'), JSON.stringify({
    name: '@drawmotive/textgraph', version: '0.2.1',
    exports: { './worker': './src/platform/worker.js' },
  }));
  await mkdir(path.join(installed, 'src/platform'), { recursive: true });
  await writeFile(path.join(installed, 'src/platform/worker.js'), 'export {};');
  assert.throws(() => siteAssets(root).config(), error => {
    assert.ok(error.message.includes(`TextGraph 0.2.1 does not match ${abiManifest.packageVersion}`));
    assert.match(error.message, /npm ci/);
    return true;
  });
  assert.doesNotThrow(() => verifySiteRenderer(root, installed));
  assert.throws(() => verifySiteRenderer(root, root), /selected local TextGraph SDK/);
});
