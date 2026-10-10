import assert from 'node:assert/strict';
import test from 'node:test';
import { brotliCompressSync, brotliDecompressSync, constants } from 'node:zlib';
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
  assert.equal(await readSourceLink('https://textgraph.dev/playground#source='), null);
  assert.equal(await readSourceLink('https://textgraph.dev/playground?d=0.'), '');
});

test('every input uses the shorter final encoding at Brotli quality 6, with raw winning ties', async () => {
  const sources = ['', 'A', 'a'.repeat(17), 'a'.repeat(18), 'A -> B\n'.repeat(30),
    '服务 -> 数据库\n'.repeat(50), Array.from({ length: 1000 }, (_, i) => String.fromCharCode(32 + (i * i % 95))).join('')];
  const selected = new Set();
  for (const source of sources) {
    const bytes = Buffer.from(source);
    const raw = '0.' + bytes.toString('base64url');
    const compressed = '1.' + brotliCompressSync(bytes, { params: { [constants.BROTLI_PARAM_QUALITY]: 6 } }).toString('base64url');
    const payload = new URL(await createSourceLink('https://textgraph.dev/playground', source)).searchParams.get('d');
    assert.equal(payload, compressed.length < raw.length ? compressed : raw);
    selected.add(payload[0]);
  }
  assert.deepEqual(selected, new Set(['0', '1']));
});

test('both protocol versions decode independently supplied links', async () => {
  assert.equal(await readSourceLink('https://textgraph.dev/playground?d=0.QSAtPiBCCg'), 'A -> B\n');
  // Brotli frame produced independently with node:zlib at quality 6.
  assert.equal(await readSourceLink('https://textgraph.dev/playground?d=1.G9EAAAQccn6hgwTaVjFbJAsz9QA'), 'A -> B\n'.repeat(30));
  assert.equal(await readSourceLink('https://textgraph.dev/playground?d=0.'), '');
  for (const source of ['\uFEFFA -> B\r\n', '\uFEFF服务 -> 数据库\n'.repeat(30)]) {
    assert.equal(await readSourceLink(await createSourceLink('https://textgraph.dev/playground', source)), source);
  }
});

test('updates replace duplicate data and clear fragments', async () => {
  assert.equal(await readSourceLink('https://textgraph.dev/playground?d=0.QQ#source-panel'), 'A');
  const updated = new URL(await createSourceLink('https://textgraph.dev/playground?from=docs&d=0.Qg&d=0.Qw#source-panel', 'A'));
  assert.equal(updated.searchParams.get('from'), 'docs');
  assert.deepEqual(updated.searchParams.getAll('d'), ['0.QQ']);
  assert.equal(updated.hash, '');
});

test('damaged encodings and unsupported versions are ignored without throwing', async () => {
  for (const suffix of ['?d=', '?d=2.QQ', '?d=0.A', '?d=0.QQ==', '?d=0.Q+',
    '?d=0._w', '?d=0.QR', '?d=1.', '?d=1.QQ', '?d=1.G9EAAAQccn6hgwTaVjFbJAsz9Q']) {
    assert.equal(await readSourceLink('https://textgraph.dev/playground' + suffix), null, suffix);
  }
});

test('compressed links are readable by an independent Brotli decoder', async () => {
  const source = '服务 -> 数据库\n'.repeat(50);
  const payload = new URL(await createSourceLink('https://textgraph.dev/playground', source)).searchParams.get('d');
  assert.equal(payload[0], '1');
  assert.equal(brotliDecompressSync(Buffer.from(payload.slice(2), 'base64url')).toString('utf8'), source);
});
