import assert from 'node:assert/strict';
import test from 'node:test';
import { playgroundAssets } from '../.vitepress/playground/assets.mjs';

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
