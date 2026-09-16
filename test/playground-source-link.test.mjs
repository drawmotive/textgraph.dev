import assert from 'node:assert/strict';
import test from 'node:test';
import { readSourceLink, createSourceLink } from '../.vitepress/playground/source-link.mjs';

test('source links preserve whitespace, Unicode, and URL delimiters exactly', () => {
  const sources = ['', ' \t\n\n', 'group {\n  A ->\n}', 'A: 服务 café 🚀 + 100% & # ? = / :~: "quoted"\n'];
  for (const source of sources) {
    const link = createSourceLink('https://textgraph.dev/base/playground?from=docs#old', source);
    assert.equal(readSourceLink(link), source);
    assert.equal(new URL(link).pathname, '/base/playground');
    assert.equal(new URL(link).search, '?from=docs');
  }
  assert.equal(createSourceLink('https://textgraph.dev/playground', 'A -> B\n'),
    'https://textgraph.dev/playground#source=A%20-%3E%20B%0A');
});

test('an absent source differs from an explicitly empty diagram', () => {
  assert.equal(readSourceLink('https://textgraph.dev/playground'), null);
  assert.equal(readSourceLink('https://textgraph.dev/playground#source-panel'), null);
  assert.equal(readSourceLink('https://textgraph.dev/playground#source='), '');
});

test('source links decode once and reject damaged encoding without throwing', () => {
  assert.equal(readSourceLink('https://textgraph.dev/playground#source=A%3A%20%2520%20%2B'), 'A: %20 +');
  assert.equal(readSourceLink('https://textgraph.dev/playground#source=%E0%A4'), null);
});
