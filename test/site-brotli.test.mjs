import assert from 'node:assert/strict';
import { access, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { brotliCompressSync, brotliDecompressSync, constants } from 'node:zlib';
import { prepareSiteBrotli, previewSite } from '../scripts/site-brotli.mjs';

test('only final site binaries are Brotli 6 encoded; original SDK assets and manifests remain intact', async t => {
  const root = await mkdtemp(path.join(tmpdir(), 'site-brotli-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const original = Buffer.from('Original SDK font and WASM bytes '.repeat(100));
  const sdk = path.join(root, 'sdk');
  const dist = path.join(root, 'dist');
  await mkdir(sdk);
  await mkdir(path.join(dist, 'textgraph/wasm'), { recursive: true });
  await mkdir(path.join(dist, 'textgraph/fonts'), { recursive: true });
  await writeFile(path.join(sdk, 'font.ttf'), original);
  await writeFile(path.join(dist, 'textgraph/wasm/runtime.wasm'), original);
  await writeFile(path.join(dist, 'textgraph/fonts/font.ttf'), original);
  await writeFile(path.join(dist, 'textgraph/fonts/font.ttf.br'), 'Old build sidecar');
  await writeFile(path.join(dist, 'textgraph/fonts/font.ttf.gz'), 'Old build sidecar');
  const manifest = JSON.stringify({ bytes: original.length });
  await writeFile(path.join(dist, 'textgraph/wasm/manifest.json'), manifest);
  await writeFile(path.join(dist, '_headers'), '/*\n  Access-Control-Allow-Origin: *\n');
  const summary = await prepareSiteBrotli(dist);
  assert.equal(summary.count, 2);
  assert.equal(summary.quality, 6);
  for (const suffix of ['.br', '.gz']) await assert.rejects(access(path.join(dist, 'textgraph/fonts/font.ttf' + suffix)), { code: 'ENOENT' });
  assert.deepEqual(await readFile(path.join(sdk, 'font.ttf')), original);
  assert.equal(await readFile(path.join(dist, 'textgraph/wasm/manifest.json'), 'utf8'), manifest);
  const expected = brotliCompressSync(original, { params: { [constants.BROTLI_PARAM_QUALITY]: 6 } });
  for (const file of ['textgraph/wasm/runtime.wasm', 'textgraph/fonts/font.ttf']) {
    const encoded = await readFile(path.join(dist, file));
    assert.deepEqual(encoded, expected);
    assert.deepEqual(brotliDecompressSync(encoded), original);
  }
  const headers = await readFile(path.join(dist, '_headers'), 'utf8');
  assert.match(headers, /Access-Control-Allow-Origin: \*/);
  assert.ok(headers.includes('/*.wasm\n  Content-Type: application/wasm\n  Content-Encoding: br'));
  assert.ok(headers.includes('/*.ttf\n  Content-Type: font/ttf\n  Content-Encoding: br'));
  await assert.rejects(prepareSiteBrotli(dist), /already Brotli/);
  assert.deepEqual(await readFile(path.join(dist, 'textgraph/fonts/font.ttf')), expected);
});

test('preview returns HTTP-decoded binaries at original URLs, including site base and query hashes', async t => {
  const root = await mkdtemp(path.join(tmpdir(), 'site-brotli-preview-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const original = Buffer.from([0, 97, 115, 109, 1, 0, 0, 0]);
  await writeFile(path.join(root, 'runtime.wasm'), original);
  await writeFile(path.join(root, 'playground.html'), 'Uncompressed page');
  await writeFile(path.join(root, '_headers'), '');
  await prepareSiteBrotli(root);
  const host = await previewSite({ directory: root, port: 0, base: '/docs/' });
  t.after(() => host.close());
  const response = await fetch(host.url + 'runtime.wasm?v=hash');
  assert.equal(response.headers.get('Content-Encoding'), 'br');
  assert.equal(response.headers.get('Content-Type'), 'application/wasm');
  const decoded = await response.arrayBuffer();
  assert.deepEqual(Buffer.from(decoded), original);
  await WebAssembly.instantiate(decoded);
  assert.equal(await (await fetch(host.url + 'playground')).text(), 'Uncompressed page');
  assert.equal((await fetch(new URL('/runtime.wasm', host.url))).status, 404);
});

test('raw development output is served without encoding headers and Blazor preview supports navigation', async t => {
  const root = await mkdtemp(path.join(tmpdir(), 'site-raw-preview-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(path.join(root, 'font.ttf'), 'Original font');
  await writeFile(path.join(root, 'index.html'), 'Blazor entry');
  const host = await previewSite({ directory: root, port: 0, spa: true, cors: true });
  t.after(() => host.close());
  const response = await fetch(host.url + 'font.ttf');
  assert.equal(response.headers.get('Content-Encoding'), null);
  assert.equal(await response.text(), 'Original font');
  const route = await fetch(host.url + 'login');
  assert.equal(await route.text(), 'Blazor entry');
  assert.equal(route.headers.get('Access-Control-Allow-Origin'), '*');
  assert.equal((await fetch(host.url + 'missing.wasm')).status, 404);
});
