import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createMarkdownRenderer, disposeMdItInstance } from 'vitepress';
import { withTextGraph } from '@drawmotive/markdown-it-textgraph/vitepress';
import { initializeTextGraph } from '@drawmotive/textgraph/node';
import MarkdownIt from 'markdown-it';

test('example fences retain escaped, copyable DSL alongside the rendered PNG', async () => {
  const { textgraphExamples } = await import('../.vitepress/textgraph-examples.mjs');
  const config = withTextGraph({ markdown: { config: textgraphExamples } });
  const md = await createMarkdownRenderer(process.cwd(), config.markdown);
  try {
    const source = 'api: <script>alert(1)</script> {{label}}\napi -> db\n';
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

test('the published grouped shopping example accepts trailing decorations and unique short names', async () => {
  const document = await readFile(new URL('../reference/textgraph-spec.md', import.meta.url), 'utf8');
  // Markdown owns fence and line-ending normalization on every checkout.
  const parser = new MarkdownIt();
  const example = input => parser.parse(input, {}).find(token => token.type === 'fence' && token.info.trim() === 'textgraph example')?.content;
  const source = example(document);
  assert.equal(example(document.replace(/\r?\n/g, '\n')), example(document.replace(/\r?\n/g, '\r\n')), 'LF and CRLF checkouts must select the same DSL input');
  assert.ok(source?.includes('checkout -> payment'));
  assert.ok(source.includes('saved -> pack'));
  assert.ok(source.indexOf('checkout: Place an order') > source.indexOf('saved -> pack'));
  const runtime = await initializeTextGraph();
  try {
    assert.equal((await runtime.validate(source)).valid, true);
    const result = await runtime.renderPng(source);
    assert.equal(result.success, true, JSON.stringify(result.diagnostics));
    assert.deepEqual(Array.from(result.png.slice(0, 8)), [137, 80, 78, 71, 13, 10, 26, 10]);
    const grouped = await runtime.validate('Backend { payment -> saved : stored }\ncheckout -> payment');
    assert.equal(grouped.valid, true);
    const namedGroupEndpoint = await runtime.validate('One { worker -> Two }\nTwo { payment }');
    assert.equal(namedGroupEndpoint.valid, true);
    const reordered = source.split('\n\n');
    assert.equal((await runtime.validate([...reordered.slice(3), ...reordered.slice(0, 3)].join('\n\n'))).valid, true);
    assert.equal((await runtime.validate(source + '\nBackend.payment -> checkout')).valid, true);
    for (const invalid of ['Backend { payment: Take payment }',
      'Backend { payment(ellipse) }']) {
      assert.equal((await runtime.validate(invalid)).valid, false, invalid);
    }
  } finally { await runtime.dispose(); }
});

test('adjacent scope styles render like separate statements and preserve anonymous group ownership', async () => {
  const runtime = await initializeTextGraph();
  try {
    for (const classes of ['horizontal', 'vertical primary dashed']) {
      const adjacent = `(${classes}){\nA->B\n}->C`;
      const separate = `(${classes})\n{\nA->B\n}->C`;
      const validation = await runtime.validate(adjacent);
      assert.equal(validation.valid, true, JSON.stringify(validation.diagnostics));
      const expected = await runtime.renderPng(separate);
      const actual = await runtime.renderPng(adjacent);
      assert.equal(expected.success, true, JSON.stringify(expected.diagnostics));
      assert.equal(actual.success, true, JSON.stringify(actual.diagnostics));
      assert.equal(createHash('sha256').update(actual.png).digest('hex'),
        createHash('sha256').update(expected.png).digest('hex'));
    }
  } finally { await runtime.dispose(); }
});

test('duplicated member names use prefixes while unique root references remain short', async () => {
  const runtime = await initializeTextGraph();
  try {
    const groups = ['One { payment -> saved }', 'Two { payment -> receipt }'];
    const references = 'One.payment -> Two.payment\nsaved -> receipt\nOne.payment: Card payment\nTwo.payment(fill success): Cash payment';
    for (const order of [groups, groups.toReversed()]) {
      const definitions = order.join('\n');
      for (const source of [definitions, definitions + '\n' + references, references + '\n' + definitions]) {
        const validation = await runtime.validate(source);
        assert.equal(validation.valid, true, source + '\n' + JSON.stringify(validation.diagnostics));
      }
      for (const reference of ['payment -> saved', 'payment: Take payment', 'payment(ellipse)',
        'payment, saved(fill success)']) {
        const ambiguous = await runtime.validate(definitions + '\n' + reference);
        assert.equal(ambiguous.valid, false, reference);
        assert.ok(ambiguous.diagnostics.some(diagnostic => diagnostic.severity === 'error'
          && /ambiguous/i.test(diagnostic.message)));
      }
    }
    const rendered = await runtime.renderPng(groups.join('\n') + '\n' + references);
    assert.equal(rendered.success, true, JSON.stringify(rendered.diagnostics));
    const qualifiedUnique = await runtime.validate('Backend { payment }\nBackend.payment -> checkout\npayment: Take payment');
    assert.equal(qualifiedUnique.valid, true);
    const groupedReference = await runtime.validate('One { worker -> Two.payment }\nTwo { payment }');
    assert.equal(groupedReference.valid, true);
    const unknown = await runtime.validate('Backend { payment }\nBackend.missing -> checkout');
    assert.equal(unknown.valid, false);
  } finally { await runtime.dispose(); }
});

test('nested member and group references accept the shortest unique trailing path', async () => {
  const runtime = await initializeTextGraph();
  try {
    for (const source of [
      'Platform {\nFrontend { api }\nBackend { api }\n}\nFrontend.api -> Backend.api\nPlatform.Frontend.api: Browser API',
      'One { services { api } }\nTwo { services { api } }\nOne.services -> Two.services\nOne.services.api -> Two.services.api',
    ]) {
      const validation = await runtime.validate(source);
      assert.equal(validation.valid, true, source + '\n' + JSON.stringify(validation.diagnostics));
    }
    for (const reference of ['services -> finish', 'services.api -> finish']) {
      const validation = await runtime.validate('One { services { api } }\nTwo { services { api } }\n' + reference);
      assert.equal(validation.valid, false, reference);
    }
  } finally { await runtime.dispose(); }
});

test('complete qualified paths take precedence while duplicated short names remain ambiguous', async () => {
  const runtime = await initializeTextGraph();
  try {
    const groups = ['Left { A }', 'Outer { Left { A } }'];
    const references = 'Left.A -> Outer.Left.A\nLeft.A: Top-level member\nOuter.Left.A: Nested member';
    for (const order of [groups, groups.toReversed()]) {
      const definitions = order.join('\n');
      for (const source of [definitions + '\n' + references, references + '\n' + definitions]) {
        const validation = await runtime.validate(source);
        assert.equal(validation.valid, true, source + '\n' + JSON.stringify(validation.diagnostics));
      }
      for (const reference of ['A -> finish', 'Left -> finish']) {
        const validation = await runtime.validate(definitions + '\n' + reference);
        assert.equal(validation.valid, false, reference);
        assert.ok(validation.diagnostics.some(diagnostic => diagnostic.severity === 'error'
          && /ambiguous/i.test(diagnostic.message)));
      }
    }
  } finally { await runtime.dispose(); }
});
