import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { createMarkdownRenderer, disposeMdItInstance, resolveConfig } from 'vitepress';
import { initializeTextGraph } from '@drawmotive/textgraph/node';

test('every published TextGraph fence validates and renders with the selected runtime', async t => {
  const root = path.resolve(import.meta.dirname, '..');
  const config = await resolveConfig(root, 'build', 'production');
  const md = await createMarkdownRenderer(root);
  const runtime = await initializeTextGraph();
  try {
    let examples = 0;
    const publicPrefix = path.relative(root, config.publicDir).split(path.sep).join('/') + '/';
    for (const document of config.pages.filter(page => !page.startsWith(publicPrefix)).toSorted()) {
      const content = await readFile(path.join(root, document), 'utf8');
      for (const token of md.parse(content, {})) {
        if (token.type !== 'fence' || token.info.trim().split(/\s+/, 1)[0] !== 'textgraph') continue;
        examples++;
        await t.test(document + ':' + (token.map[0] + 1), async () => {
          const validation = await runtime.validate(token.content);
          assert.equal(validation.valid, true, JSON.stringify(validation.diagnostics));
          const result = await runtime.renderPng(token.content);
          assert.equal(result.success, true, JSON.stringify(result.diagnostics));
          assert.deepEqual(Array.from(result.png.slice(0, 8)), [137, 80, 78, 71, 13, 10, 26, 10]);
          assert.ok(result.width > 0 && result.height > 0);
        });
      }
    }
    assert.ok(examples > 0, 'Published pages must contain executable examples');
  } finally {
    await runtime.dispose();
    await disposeMdItInstance();
  }
});
