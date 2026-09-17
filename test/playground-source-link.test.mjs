import assert from 'node:assert/strict';
import test from 'node:test';
import { Zstd } from '@hpcc-js/wasm-zstd';
import { readSourceLink, createSourceLink } from '../.vitepress/playground/source-link.mjs';

test('source links preserve whitespace, Unicode, and URL delimiters exactly', async () => {
  const sources = ['', ' \t\n\n', 'group {\n  A ->\n}', 'A: 服务 café 🚀 + 100% & # ? = / :~: "quoted"\n'];
  for (const source of sources) {
    const link = await createSourceLink('https://textgraph.dev/base/playground?from=docs#old', source);
    assert.equal(await readSourceLink(link), source);
    assert.equal(new URL(link).pathname, '/base/playground');
    assert.equal(new URL(link).searchParams.get('from'), 'docs');
    assert.match(new URL(link).searchParams.get('d'), /^[01]\.[A-Za-z0-9_-]*$/);
  }
  assert.equal(await createSourceLink('https://textgraph.dev/playground', 'A -> B\n'),
    'https://textgraph.dev/playground?d=0.QSAtPiBCCg');
});

test('an absent source differs from an explicitly empty diagram', async () => {
  assert.equal(await readSourceLink('https://textgraph.dev/playground'), null);
  assert.equal(await readSourceLink('https://textgraph.dev/playground#source-panel'), null);
  assert.equal(await readSourceLink('https://textgraph.dev/playground#source='), '');
});

test('source links decode once and reject damaged encoding without throwing', async () => {
  assert.equal(await readSourceLink('https://textgraph.dev/playground#source=A%3A%20%2520%20%2B'), 'A: %20 +');
  assert.equal(await readSourceLink('https://textgraph.dev/playground#source=%E0%A4'), null);
});

test('every input uses the shorter final encoding at the default Zstd level, with raw winning ties', async () => {
  const zstd = await Zstd.load();
  const sources = ['', 'A', 'a'.repeat(17), 'a'.repeat(18), 'A -> B\n'.repeat(30),
    '服务 -> 数据库\n'.repeat(50), Array.from({ length: 1000 }, (_, i) => String.fromCharCode(32 + (i * i % 95))).join('')];
  const selected = new Set();
  for (const source of sources) {
    const bytes = Buffer.from(source);
    const raw = '0.' + bytes.toString('base64url');
    const compressed = '1.' + Buffer.from(zstd.compress(bytes)).toString('base64url');
    const payload = new URL(await createSourceLink('https://textgraph.dev/playground', source)).searchParams.get('d');
    assert.equal(payload, compressed.length < raw.length ? compressed : raw);
    selected.add(payload[0]);
  }
  assert.deepEqual(selected, new Set(['0', '1']));
});

test('both protocol versions decode independently supplied links', async () => {
  assert.equal(await readSourceLink('https://textgraph.dev/playground?d=0.QSAtPiBCCg'), 'A -> B\n');
  // Zstd frame produced independently with node:zlib, using its default level.
  assert.equal(await readSourceLink('https://textgraph.dev/playground?d=1.KLUv_SDSdQAAOEEgLT4gQgoBAEhRxQg'), 'A -> B\n'.repeat(30));
  assert.equal(await readSourceLink('https://textgraph.dev/playground?d=0.'), '');
  for (const source of ['\uFEFFA -> B\r\n', '\uFEFF服务 -> 数据库\n'.repeat(30)]) {
    assert.equal(await readSourceLink(await createSourceLink('https://textgraph.dev/playground', source)), source);
  }
});

test('new data takes precedence and updates remove stale legacy fragments and duplicate data', async () => {
  assert.equal(await readSourceLink('https://textgraph.dev/playground?d=0.QQ#source=B'), 'A');
  const updated = new URL(await createSourceLink('https://textgraph.dev/playground?from=docs&d=0.Qg&d=0.Qw#source=B', 'A'));
  assert.equal(updated.searchParams.get('from'), 'docs');
  assert.deepEqual(updated.searchParams.getAll('d'), ['0.QQ']);
  assert.equal(updated.hash, '');
});

test('damaged encodings and unsupported versions are ignored without throwing', async () => {
  for (const suffix of ['#source=%E0%A4', '?d=', '?d=2.QQ', '?d=0.A', '?d=0.QQ==', '?d=0.Q+',
    '?d=0._w', '?d=0.QR', '?d=1.', '?d=1.QQ', '?d=1.KLUv_SDSdQAAOEEgLT4gQgoBAEhR']) {
    assert.equal(await readSourceLink('https://textgraph.dev/playground' + suffix), null, suffix);
  }
});
