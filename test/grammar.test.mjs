import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import peggy from 'peggy';

const grammar = await readFile(new URL('../reference/grammar.peg', import.meta.url), 'utf8');
const parser = peggy.generate(grammar);
const parse = source => parser.parse(source).lines.filter(line => line.type !== 'blank');

test('the published grammar is the executable canonical grammar', async () => {
  const page = await readFile(new URL('../reference/grammar.md', import.meta.url), 'utf8');
  const published = page.split('```peg\n')[1].split('\n```')[0];
  assert.equal(published, grammar.trimEnd());
});

test('inline empty groups and compact nested chains are structural endpoints', () => {
  const [empty] = parse('A->{}');
  assert.equal(empty.type, 'connection');
  assert.equal(empty.rest[0].target.type, 'scope');
  assert.equal(empty.rest[0].target.id, null);
  assert.deepEqual(empty.rest[0].target.body, []);

  const [chain] = parse('A->{B->{C->D}}->E');
  assert.equal(chain.rest.length, 2);
  const group = chain.rest[0].target;
  assert.equal(group.body[0].type, 'connection');
  assert.equal(group.body[0].head.ref.path[0], 'B');
  assert.equal(group.body[0].rest[0].target.body[0].head.ref.path[0], 'C');
  assert.equal(chain.rest[1].target.ref.path[0], 'E');
});

test('groups support source, named target, nesting and multiline body positions', () => {
  const [connection] = parse('{B->C}->D{E->F}->{}');
  assert.equal(connection.head.type, 'scope');
  assert.equal(connection.rest[0].target.id, 'D');
  assert.equal(connection.rest[1].target.id, null);
  assert.equal(connection.rest[0].target.body[0].rest[0].target.ref.path[0], 'F');

  const [multiline] = parse('A -> {\n  B -> C\n  D { E -> F }\n} -> G\n');
  assert.equal(multiline.rest[0].target.body.length, 2);
  assert.equal(multiline.rest[0].target.body[1].id, 'D');
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

test('scope labels stop at their closing brace and outer edge labels stay outside', () => {
  const [connection] = parse('A->{B: Bee}->C: outer');
  assert.equal(connection.rest[0].target.body[0].label, 'Bee');
  assert.equal(connection.edgeLabel, 'outer');
  const [nested] = parse('A->{B->C: inner}->D: outer');
  assert.equal(nested.rest[0].target.body[0].edgeLabel, 'inner');
  assert.equal(nested.edgeLabel, 'outer');
  const [literal] = parse('A: {{value}}');
  assert.equal(literal.label, '{{value}}');
  const [containedLiteral] = parse('{B: {{value}}}->A');
  assert.equal(containedLiteral.head.body[0].label, '{{value}}');
});

test('every arrow operator separates compact identifiers and group endpoints', () => {
  for (const [operator, arrow] of [['->', 'forward'], ['<-', 'backward'], ['<->', 'bidi'], ['--', 'undirected']]) {
    const [connection] = parse(`A${operator}{B${operator}C}`);
    assert.equal(connection.type, 'connection');
    assert.equal(connection.head.ref.path[0], 'A');
    assert.equal(connection.rest[0].arrow, arrow);
    assert.equal(connection.rest[0].target.body[0].rest[0].arrow, arrow);
  }
  const [chain] = parse('A->{}->{}');
  assert.equal(chain.rest.length, 2);
  assert.notEqual(chain.rest[0].target, chain.rest[1].target);
});

test('missing endpoints and unmatched group braces cannot fall back to free text', () => {
  for (const source of ['A->{B->}', 'A->{B->{}', 'A->{}}', 'A->{B->C', '{B->C}->']) {
    assert.throws(() => parse(source), parser.SyntaxError, source);
  }
});

test('existing named groups, references and anonymous node literals remain valid', () => {
  const [scope, title, connection] = parse('D { B->C }\nD: Services\nD->team.api->[Label](dashed)\n');
  assert.equal(scope.id, 'D');
  assert.equal(title.label, 'Services');
  assert.deepEqual(connection.rest[0].target.ref.path, ['team', 'api']);
  assert.equal(connection.rest[1].target.ref.label, 'Label');
  assert.deepEqual(connection.rest[1].target.classes, ['dashed']);
  const [header] = parse('D(horizontal): Services { B->C }');
  assert.equal(header.label, 'Services');
});
