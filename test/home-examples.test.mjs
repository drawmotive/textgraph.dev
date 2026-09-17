import assert from 'node:assert/strict';
import test from 'node:test';
import { initializeTextGraph } from '@drawmotive/textgraph/node';
import { homeExamples, playgroundLink } from '../.vitepress/home/examples.mjs';
import { readSourceLink } from '../.vitepress/playground/source-link.mjs';

test('homepage sources render real PNGs and travel unchanged through playground links', async () => {
  const runtime = await initializeTextGraph();
  try {
    assert.ok(homeExamples.length >= 6);
    assert.equal(new Set(homeExamples.map(example => example.id)).size, homeExamples.length);
    for (const example of homeExamples) {
      const href = await playgroundLink(example);
      assert.equal(await readSourceLink('https://textgraph.dev' + href), example.source);
      assert.equal(new URL(href, 'https://textgraph.dev').pathname, '/playground');
      assert.ok(example.alt.length > 20, example.id + ' needs a useful diagram description');
      const result = await runtime.renderPng(example.source, { scale: 2, padding: 24 });
      assert.equal(result.success, true, example.id + ': ' + JSON.stringify(result.diagnostics));
      // The SDK reports successful group planning as warnings. These two
      // diagnostics describe applied layout decisions, not unsupported syntax.
      const layoutNotes = new Set(['v7.group-layout-bounds-qp', 'v7.cross-scope-edge']);
      assert.ok(result.diagnostics.every(d => d.severity === 'warning' && layoutNotes.has(d.code)),
        example.id + ': ' + JSON.stringify(result.diagnostics));
      assert.deepEqual(Array.from(result.png.slice(0, 8)), [137, 80, 78, 71, 13, 10, 26, 10]);
      assert.ok(result.width > 0 && result.height > 0);
    }
  } finally { await runtime.dispose(); }
});
