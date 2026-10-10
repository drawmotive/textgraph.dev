import { test, expect } from '@playwright/test';

test('site HTTP Brotli transparently decodes SDK WASM and fonts while preserving manifest integrity', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const { default: manifest } = await import('/textgraph/sdk/generated/wasm-manifest.js');
    const fontCatalog = await (await fetch('/textgraph/fonts/font-catalog.json')).json();
    const wasm = manifest.assets.find(asset => asset.path === manifest.runtimeWasm);
    const font = fontCatalog.fonts.find(font => font.languages.includes('zh'));
    const assets = [{ url: '/textgraph/' + wasm.path, expected: wasm }, { url: '/textgraph/fonts/' + font.path, expected: font }];
    return Promise.all(assets.map(async ({ url, expected }) => {
      const digest = Uint8Array.from(expected.sha256.match(/../g), hex => parseInt(hex, 16));
      const response = await fetch(url, { integrity: 'sha256-' + btoa(String.fromCharCode(...digest)) });
      const cache = await caches.open('site-brotli-integrity-test');
      await cache.put(url, response.clone());
      const cachedBytes = await (await cache.match(url)).arrayBuffer();
      const bytes = await response.arrayBuffer();
      const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), byte => byte.toString(16).padStart(2, '0')).join('');
      const cachedHash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', cachedBytes)), byte => byte.toString(16).padStart(2, '0')).join('');
      return { encoding: response.headers.get('Content-Encoding'), bytes: bytes.byteLength, expectedBytes: expected.bytes, hash, cachedHash, expectedHash: expected.sha256 };
    }));
  });
  for (const asset of result) {
    expect(asset.encoding).toBe('br');
    expect(asset.bytes).toBe(asset.expectedBytes);
    expect(asset.hash).toBe(asset.expectedHash);
    expect(asset.cachedHash).toBe(asset.expectedHash);
  }
});
