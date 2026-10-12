import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import peggy from 'peggy';
import { homeExamples } from '../.vitepress/home/examples.mjs';

const grammar = await readFile(new URL('../reference/grammar.peg', import.meta.url), 'utf8');
const parser = peggy.generate(grammar);
const parse = source => parser.parse(source).lines.filter(line => line.type !== 'blank');

test('the published grammar is the executable canonical grammar', async () => {
  // Git may check these source documents out with CRLF on Windows. Their
  // grammar content must agree independently of checkout line endings.
  const page = (await readFile(new URL('../reference/grammar.md', import.meta.url), 'utf8')).replace(/\r\n/g, '\n');
  const published = page.split('```peg\n')[1].split('\n```')[0];
  assert.equal(published, grammar.replace(/\r\n/g, '\n').trimEnd());
});

test('inline empty groups and compact nested membership are structural endpoints', () => {
  const [empty] = parse('A->{}');
  assert.equal(empty.type, 'connection');
  assert.equal(empty.rest[0].target.id, null);
  assert.deepEqual(empty.rest[0].target.body, []);

  const [chain] = parse('A->{B{C}}->D');
  assert.equal(chain.rest.length, 2);
  assert.equal(chain.rest[0].target.body[0].id, 'B');
  assert.equal(chain.rest[0].target.body[0].body[0].id, 'C');
  assert.deepEqual(chain.rest[1].target.ref.path, ['D']);
});

test('groups support source, named target, nesting and multiline membership', () => {
  const [connection] = parse('{B}->D{C}->{}');
  assert.equal(connection.head.type, 'scope');
  assert.equal(connection.rest[0].target.id, 'D');
  assert.equal(connection.rest[0].target.body[0].id, 'C');
  assert.equal(connection.rest[1].target.id, null);

  const [multiline] = parse('A -> {\n  B\n  C { D }\n} -> E\n');
  assert.equal(multiline.rest[0].target.body.length, 2);
  assert.equal(multiline.rest[0].target.body[1].id, 'C');
});

test('class binding distinguishes arrows, named groups and anonymous groups', () => {
  const [connection] = parse('(horizontal){B}->(bold)D(vertical){C}->{}(dashed)');
  assert.deepEqual(connection.head.classes, ['horizontal']);
  assert.deepEqual(connection.rest[0].classes, ['bold']);
  assert.deepEqual(connection.rest[0].target.classes, ['vertical']);
  assert.deepEqual(connection.rest[1].target.classes, ['dashed']);

  const [anonymous] = parse('A->(bold){B}');
  assert.deepEqual(anonymous.rest[0].classes, ['bold']);
  assert.equal(anonymous.rest[0].target.classes, null);
});

test('root decorations preserve literal braces and edge labels stay outside groups', () => {
  const [connection, label] = parse('A->{B}->C: outer\nB: {{value}}');
  assert.equal(connection.edgeLabel, 'outer');
  assert.equal(label.label, '{{value}}');
});

test('every arrow operator separates compact identifiers and group endpoints', () => {
  for (const [operator, arrow] of [['->', 'forward'], ['<-', 'backward'], ['<->', 'bidi'], ['--', 'undirected']]) {
    const [connection] = parse('A' + operator + '{B}');
    assert.deepEqual(connection.head.ref.path, ['A']);
    assert.equal(connection.rest[0].arrow, arrow);
    assert.equal(connection.rest[0].target.body[0].id, 'B');
  }
  const [chain] = parse('A->{}->{}');
  assert.equal(chain.rest.length, 2);
  assert.notEqual(chain.rest[0].target, chain.rest[1].target);
});

test('group bodies reject separate node decorations, shared styles and free text', () => {
  for (const statement of ['B: Bee', 'B(ellipse)', 'B, C(fill primary)', '(horizontal)', '[Bee]', 'plain text']) {
    for (const source of ['G {\n' + statement + '\n}', 'G(info): Group {\n' + statement + '\n}', 'A -> {\n' + statement + '\n}']) {
      assert.throws(() => parse(source), parser.SyntaxError, source);
    }
  }
});

test('missing endpoints and unmatched group braces cannot fall back to free text', () => {
  for (const source of ['A->{B', 'A->{B{C}', 'A->{}}', '{B}->']) {
    assert.throws(() => parse(source), parser.SyntaxError, source);
  }
});

test('named groups, root references and anonymous node literals remain valid', () => {
  const [group, title, connection] = parse('D { B }\nD: Services\nD->B->[Label](dashed)\n');
  assert.equal(group.id, 'D');
  assert.equal(title.label, 'Services');
  assert.deepEqual(connection.rest[0].target.ref.path, ['B']);
  assert.equal(connection.rest[1].target.ref.label, 'Label');
  assert.deepEqual(connection.rest[1].target.classes, ['dashed']);
  const [header] = parse('D(horizontal): Services {\nB\n}');
  assert.equal(header.label, 'Services');
  assert.equal(header.body[0].id, 'B');
  const [literal] = parse('D: Services { literal text }');
  assert.equal(literal.label, 'Services { literal text }');
});

test('standalone and nested groups share endpoint postfix style syntax and comments', () => {
  const [anonymous, named, nested] = parse('{B}(horizontal)\nD{C}(vertical)\n{\n<!-- members -->\n{E}(dashed)\n}');
  assert.deepEqual(anonymous.classes, ['horizontal']);
  assert.equal(named.id, 'D');
  assert.deepEqual(named.classes, ['vertical']);
  assert.equal(nested.body[0].type, 'comment');
  assert.deepEqual(nested.body[1].classes, ['dashed']);
});

test('external decorations use the same simple names as root connections', () => {
  const [group, connection, label, style, shared] = parse(
    'Backend { payment }\ncheckout -> payment\npayment: Take payment\npayment(ellipse)\npayment, checkout(fill success)');
  assert.equal(group.body[0].id, 'payment');
  assert.deepEqual(connection.rest[0].target.ref.path, ['payment']);
  assert.equal(label.id, 'payment');
  assert.equal(label.label, 'Take payment');
  assert.equal(style.id, 'payment');
  assert.deepEqual(style.classes, ['ellipse']);
  assert.deepEqual(shared.ids, ['payment', 'checkout']);
});

test('qualified source references are rejected for every graph statement', () => {
  for (const source of ['Backend.payment', 'checkout -> Backend.payment', 'Backend.payment -> checkout',
    'Backend.payment: Take payment', 'Backend.payment(ellipse)', 'payment, Backend.saved(fill success)',
    'Backend.payment, saved(fill success)', 'Backend { Backend.payment }']) {
    assert.throws(() => parse(source), parser.SyntaxError, source);
  }
});

test('published diagrams and homepage inputs conform to the global-name grammar', async () => {
  const documents = ['intro/getting-started.md', 'intro/what-is-textgraph.md', 'diagrams/flowcharts.md',
    'reference/textgraph-spec.md', 'integrations/markdown.md', 'integrations/vscode.md', 'integrations/javascript.md',
    'integrations/ai-agents.md'];
  for (const document of documents) {
    const content = await readFile(new URL('../' + document, import.meta.url), 'utf8');
    for (const [, source] of content.matchAll(/```textgraph(?: example)?\r?\n([\s\S]*?)\r?\n```/g)) {
      assert.doesNotThrow(() => parse(source), document + ': ' + source);
    }
  }
  for (const example of homeExamples) {
    assert.doesNotThrow(() => parse(example.source), example.id);
  }
});

test('grouped connections introduce members without bare predeclarations', () => {
  const [left] = parse('Left(vertical) {\nA -> B : approval label\nC -> D : rejection label\n}');
  assert.equal(left.body.length, 2);
  assert.deepEqual(left.body[0].head.ref.path, ['A']);
  assert.deepEqual(left.body[0].rest[0].target.ref.path, ['B']);
  assert.equal(left.body[0].edgeLabel, 'approval label');
  assert.equal(left.body[1].edgeLabel, 'rejection label');
  for (const operator of ['->', '<-', '<->', '--']) {
    const [group] = parse('G { A' + operator + 'B }');
    assert.equal(group.body[0].type, 'connection');
  }
});

test('grouped connections support inline styles, anonymous nodes and nested endpoints', () => {
  const [group] = parse('G {\nA(ellipse) ->(bold) [New](dashed) -> H { B -> C }\n}');
  const connection = group.body[0];
  assert.deepEqual(connection.head.classes, ['ellipse']);
  assert.deepEqual(connection.rest[0].classes, ['bold']);
  assert.equal(connection.rest[0].target.ref.label, 'New');
  assert.deepEqual(connection.rest[0].target.classes, ['dashed']);
  assert.equal(connection.rest[1].target.id, 'H');
  assert.equal(connection.rest[1].target.body[0].type, 'connection');
});

test('compact grouped edge labels terminate at the owning brace', () => {
  const [outer, decoration] = parse('A -> { B -> C : inner {{value}} } -> D : outer\nB: Bee');
  assert.equal(outer.edgeLabel, 'outer');
  assert.equal(outer.rest[0].target.body[0].edgeLabel, 'inner {{value}}');
  assert.equal(decoration.label, 'Bee');
  for (const source of ['G { B -> }', 'G { B -> C', 'G { B -> team.C }']) {
    assert.throws(() => parse(source), parser.SyntaxError, source);
  }
});
