import assert from 'node:assert/strict';
import test from 'node:test';
import { createMarkdownRenderer, disposeMdItInstance } from 'vitepress';
import { withTextGraph } from '@drawmotive/markdown-it-textgraph/vitepress';

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
