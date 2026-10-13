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
  const [connection] = parse('{\n(horizontal)\nB\n}->(bold)D(vertical){C}->{}(dashed)');
  assert.deepEqual(connection.head.body[0].classes, ['horizontal']);
  assert.deepEqual(connection.rest[0].classes, ['bold']);
  assert.deepEqual(connection.rest[0].target.classes, ['vertical']);
  assert.deepEqual(connection.rest[1].target.classes, ['dashed']);

  const [anonymous] = parse('A->(bold){B}');
  assert.deepEqual(anonymous.rest[0].classes, ['bold']);
  assert.equal(anonymous.rest[0].target.classes, null);
});

test('root decorations and edge labels without braces retain their meaning', () => {
  const [connection, label] = parse('A->{B}->C: outer\nB: Bee');
  assert.equal(connection.edgeLabel, 'outer');
  assert.equal(label.label, 'Bee');
});

test('group headers outrank labels in standalone statements and connection endpoints', () => {
  for (const source of ['X:{A->B}', 'X: { A -> B }', 'X:{\nA->B\n}']) {
    const [group] = parse(source);
    assert.equal(group.type, 'scope');
    assert.equal(group.id, 'X');
    assert.equal(group.label, '');
    assert.equal(group.body[0].type, 'connection');
  }
  for (const source of ['A->{B}->C:{value}', 'A->{\nB\n}->C:{\nvalue\n}']) {
    const [chain] = parse(source);
    assert.equal(chain.rest[0].target.type, 'scope');
    assert.equal(chain.rest[1].target.id, 'C');
    assert.equal(chain.rest[1].target.body[0].id, 'value');
    assert.equal(chain.edgeLabel, null);
  }
  const [titled] = parse('A->C(horizontal): Services {value}(primary): contains');
  assert.equal(titled.rest[0].target.label, 'Services');
  assert.deepEqual(titled.rest[0].target.classes, ['horizontal', 'primary']);
  assert.equal(titled.edgeLabel, 'contains');
});

test('double braces always define nested groups instead of literal label templates', () => {
  const [group] = parse('X:{{value}}');
  assert.equal(group.id, 'X');
  assert.equal(group.body[0].type, 'scope');
  assert.equal(group.body[0].body[0].id, 'value');
  const [connection] = parse('A->C:{{value}}');
  assert.equal(connection.rest[0].target.id, 'C');
  assert.equal(connection.rest[0].target.body[0].body[0].id, 'value');
  assert.equal(connection.edgeLabel, null);
});

test('reserved label braces and unclosed group headers cannot fall back to text', () => {
  for (const source of ['A->{B}: {value}', 'A->{B}: {{value}}', 'A->[{value}]',
    'X: label }', 'A->C: label }', 'X:{A->B', 'A->C: Title {value']) {
    assert.throws(() => parse(source), parser.SyntaxError, source);
  }
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

test('standalone styles remain in their immediate scope including before anonymous groups', () => {
  const [root, outer, sibling] = parse(
    '(vertical)\nOuter(primary) {\n(horizontal)\nA->B\n(fill primary)\nInner {\n(vertical dashed)\nC->D\n}\n(horizontal)\n{E->F}\n}\nSibling {G->H}');
  assert.equal(root.type, 'scope-style');
  assert.deepEqual(root.classes, ['vertical']);
  assert.deepEqual(outer.body[0].classes, ['horizontal']);
  assert.equal(outer.body[0].type, 'scope-style');
  assert.deepEqual(outer.body[2].classes, ['fill', 'primary']);
  assert.deepEqual(outer.body[3].body[0].classes, ['vertical', 'dashed']);
  assert.equal(outer.body[4].type, 'scope-style');
  assert.deepEqual(outer.body[4].classes, ['horizontal']);
  assert.equal(outer.body[5].type, 'scope');
  assert.equal(outer.body[5].classes, null);
  assert.equal(sibling.body.length, 1);

  const [compact] = parse('A->{B->C\n(horizontal)}->D');
  assert.equal(compact.rest[0].target.body[1].type, 'scope-style');
  assert.deepEqual(compact.rest[1].target.ref.path, ['D']);
});

test('scope styles before anonymous groups keep their owner regardless of whitespace', () => {
  for (const separator of ['', ' ', '\t', '\n', '\r\n', '\n\n<!-- Child group -->\n']) {
    const lines = parse('(horizontal)' + separator + '{A->B}');
    assert.equal(lines[0].type, 'scope-style');
    assert.equal(lines.at(-1).type, 'scope');
    assert.equal(lines.at(-1).classes, null);
    const [outer] = parse('Outer {\n(horizontal)' + separator + '{A->B}\n}');
    assert.equal(outer.body[0].type, 'scope-style');
    assert.equal(outer.body.at(-1).type, 'scope');
    assert.equal(outer.body.at(-1).classes, null);
  }
  const [style, connection, label] = parse('(horizontal){A->B}->C\nC: Final');
  assert.equal(style.type, 'scope-style');
  assert.equal(connection.type, 'connection');
  assert.equal(connection.head.classes, null);
  assert.deepEqual(connection.rest[0].target.ref.path, ['C']);
  assert.equal(label.label, 'Final');
  const [labeledStyle, group] = parse('(horizontal): Services {A->B}');
  assert.equal(labeledStyle.label, 'Services');
  assert.equal(group.label, null);
});

test('group bodies reject separate node decorations, shared styles and free text', () => {
  for (const statement of ['B: Bee', 'B(ellipse)', 'B, C(fill primary)', '[Bee]', 'plain text']) {
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
  const [compact] = parse('D:Services{member}');
  assert.equal(compact.label, 'Services');
  assert.equal(compact.body[0].id, 'member');
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

test('qualified references preserve their paths in connections and root decorations', () => {
  const [connection, label, style, shared, nested] = parse(
    'Frontend.api->Backend.api\nBackend.api: Service API\nBackend.api(ellipse)\nFrontend.api, Backend.api(fill success)\nPlatform { worker -> Other.services.api }');
  assert.deepEqual(connection.head.ref.path, ['Frontend', 'api']);
  assert.deepEqual(connection.rest[0].target.ref.path, ['Backend', 'api']);
  assert.equal(label.id, 'Backend.api');
  assert.equal(label.label, 'Service API');
  assert.equal(style.id, 'Backend.api');
  assert.deepEqual(style.classes, ['ellipse']);
  assert.deepEqual(shared.ids, ['Frontend.api', 'Backend.api']);
  assert.deepEqual(nested.body[0].rest[0].target.ref.path, ['Other', 'services', 'api']);
});

test('group definitions use local names while qualified endpoint references remain valid', () => {
  for (const source of ['Backend { Backend.payment }', 'Platform.Backend { payment }',
    'Platform.Backend(primary): Services {\npayment\n}', 'Backend..payment -> checkout',
    'Backend. -> checkout', '.payment -> checkout']) {
    assert.throws(() => parse(source), parser.SyntaxError, source);
  }
  const [first, second, connection] = parse('One { api -> worker }\nTwo { api -> database }\nOne.api -> Two.api');
  assert.deepEqual(first.body[0].head.ref.path, ['api']);
  assert.deepEqual(second.body[0].head.ref.path, ['api']);
  assert.deepEqual(connection.head.ref.path, ['One', 'api']);
});

test('complete and trailing group paths preserve distinct qualified references', () => {
  const [left, outer, connection] = parse('Left { A }\nOuter { Left { A } }\nLeft.A -> Outer.Left.A');
  assert.equal(left.id, 'Left');
  assert.equal(outer.body[0].id, 'Left');
  assert.deepEqual(connection.head.ref.path, ['Left', 'A']);
  assert.deepEqual(connection.rest[0].target.ref.path, ['Outer', 'Left', 'A']);
});

test('published diagrams and homepage inputs conform to the scoped-name grammar', async () => {
  const documents = ['intro/getting-started.md', 'intro/what-is-textgraph.md', 'diagrams/flowcharts.md',
    'reference/textgraph-spec.md', 'reference/syntax-cases.md', 'integrations/markdown.md', 'integrations/vscode.md', 'integrations/javascript.md',
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

test('compact nested group titles and edge labels terminate at their owning brace', () => {
  const [outer, decoration] = parse('A -> { B -> C : inner {{value}} } -> D : outer\nB: Bee');
  assert.equal(outer.edgeLabel, 'outer');
  const child = outer.rest[0].target.body[0];
  assert.equal(child.edgeLabel, null);
  assert.equal(child.rest[0].target.label, 'inner');
  assert.equal(child.rest[0].target.body[0].body[0].id, 'value');
  assert.equal(decoration.label, 'Bee');
  for (const source of ['G { B -> }', 'G { B -> C', 'G { B -> team..C }']) {
    assert.throws(() => parse(source), parser.SyntaxError, source);
  }
});
