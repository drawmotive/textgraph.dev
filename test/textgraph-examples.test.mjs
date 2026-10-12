import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { createMarkdownRenderer, disposeMdItInstance } from 'vitepress';
import { withTextGraph } from '@drawmotive/markdown-it-textgraph/vitepress';
import { initializeTextGraph } from '@drawmotive/textgraph/node';

test('example fences retain escaped, copyable DSL alongside the rendered PNG', async () => {
  const { textgraphExamples } = await import('../.vitepress/textgraph-examples.mjs');
  const config = withTextGraph({ markdown: { config: textgraphExamples } });
  const md = await createMarkdownRenderer(process.cwd(), config.markdown);
  try {
    const source = 'api: {{ label }} <script>alert(1)</script>\napi -> db\n';
    const html = (await md.renderAsync('~~~~textgraph example\n' + source + '~~~~', {}))
      .replace(/base64,[^"]+/g, 'base64,PNG');
    assert.equal((html.match(/class="textgraph-example"/g) ?? []).length, 1);
    assert.match(html, /TextGraph source/);
    assert.match(html, /Rendered diagram/);
    assert.match(html, /class="copy"/);
    assert.match(html, /v-pre/);
    assert.match(html, /(?:&lt;|&#x3C;)script/);
    assert.doesNotMatch(html, /<script>alert/);
    assert.match(html, /api -(?:&gt;|>) db/);
    assert.match(html, /<img[^>]+src="(?:data:image\/png;base64,|\/assets\/textgraph-[a-f0-9]{20}\.png")/);
    assert.ok(html.indexOf('class="copy"') < html.indexOf('<img'));

    const ordinary = await md.renderAsync('~~~text\napi -> db\n~~~', {});
    assert.doesNotMatch(ordinary, /textgraph-example|<img/);
    const diagramOnly = await md.renderAsync('~~~textgraph\napi -> db\n~~~', {});
    assert.match(diagramOnly, /<img/);
    assert.doesNotMatch(diagramOnly, /textgraph-example|class="copy"/);

    const markdown = await md.renderAsync('~~~textgraph example markdown\napi -> db\n~~~', {});
    assert.match(markdown, /Markdown source/);
    assert.match(markdown, /language-markdown/);
    assert.match(markdown, /```textgraph/);
    assert.match(markdown, /api -(?:&gt;|>) db/);
    assert.equal((markdown.match(/<img /g) ?? []).length, 1);
    assert.doesNotMatch(markdown, /textgraph-error/);

    const invalid = await md.renderAsync('~~~textgraph example\nA ->\n~~~', {});
    assert.match(invalid, /textgraph-error/);
    assert.match(invalid, /Preview unavailable in the current renderer/);
    assert.match(await md.renderAsync('~~~textgraph example\nA -> B\n~~~', {}), /<img/);
  } finally {
    await config.buildEnd({});
    await disposeMdItInstance();
  }
});

test('the published Connection Types example renders all mixed edge operators', async () => {
  const { textgraphExamples } = await import('../.vitepress/textgraph-examples.mjs');
  const document = (await readFile(new URL('../diagrams/flowcharts.md', import.meta.url), 'utf8')).replace(/\r\n/g, '\n');
  const section = document.split('## Connection Types\n')[1]?.split('\n## ')[0];
  assert.ok(section, 'Connection Types documentation must exist');
  const config = withTextGraph({ markdown: { config: textgraphExamples } }, { errorMode: 'throw' });
  const md = await createMarkdownRenderer(process.cwd(), config.markdown);
  try {
    const fences = md.parse(section, {}).filter(token => token.type === 'fence' && token.info.trim().startsWith('textgraph'));
    assert.equal(fences.length, 1);
    for (const operator of ['->', '<-', '<->', '--']) assert.ok(fences[0].content.includes(operator));
    const html = await md.renderAsync(section, {});
    assert.equal((html.match(/<img /g) ?? []).length, 1);
    assert.doesNotMatch(html, /textgraph-error/);
  } finally {
    await config.buildEnd({});
    await disposeMdItInstance();
  }
});

test('the published grouped shopping example accepts trailing decorations and global names', async () => {
  const document = await readFile(new URL('../reference/textgraph-spec.md', import.meta.url), 'utf8');
  const source = document.split('```textgraph example\n')[1]?.split('\n```')[0];
  assert.ok(source?.includes('checkout -> payment'));
  assert.ok(source.includes('saved -> pack'));
  assert.ok(source.indexOf('checkout: Place an order') > source.indexOf('saved -> pack'));
  const runtime = await initializeTextGraph();
  try {
    assert.equal((await runtime.validate(source)).valid, true);
    const result = await runtime.renderPng(source);
    assert.equal(result.success, true, JSON.stringify(result.diagnostics));
    assert.deepEqual(Array.from(result.png.slice(0, 8)), [137, 80, 78, 71, 13, 10, 26, 10]);
    for (const groups of ['One { payment }\nTwo { payment }', 'Two { payment }\nOne { payment }']) {
      const conflict = await runtime.validate(groups + '\npayment: Take payment');
      assert.equal(conflict.valid, false);
      assert.ok(conflict.diagnostics.some(diagnostic => diagnostic.severity === 'error'));
    }
    const reordered = source.split('\n\n');
    assert.equal((await runtime.validate([...reordered.slice(3), ...reordered.slice(0, 3)].join('\n\n'))).valid, true);
    for (const invalid of ['Backend.payment -> checkout', 'Backend { payment: Take payment }',
      'Backend { payment -> saved }', 'Backend { payment(ellipse) }']) {
      assert.equal((await runtime.validate(invalid)).valid, false, invalid);
    }
  } finally { await runtime.dispose(); }
});
