import assert from 'node:assert/strict';
import test from 'node:test';
import { createSourceHistory, sourceDiff } from '../.vitepress/playground/history.mjs';

test('applying a fix is one undo transaction with original selection and redo', () => {
  const history = createSourceHistory('A ->');
  history.capture(2, 4);
  history.record('A -> B\nB -> C', 0, 0);
  assert.equal(history.canUndo, true);
  assert.deepEqual(history.undo(), { source: 'A ->', start: 2, end: 4 });
  assert.equal(history.canRedo, true);
  assert.equal(history.redo().source, 'A -> B\nB -> C');
  history.undo();
  history.record('A -> D', 6, 6);
  assert.equal(history.canRedo, false);
});

test('typing coalesces but replacement and composition commits remain distinct', () => {
  const history = createSourceHistory('');
  history.record('A', 1, 1, { group: 'insertText', now: 1 });
  history.record('AB', 2, 2, { group: 'insertText', now: 2 });
  history.breakGroup();
  history.record('AB服务', 4, 4);
  assert.equal(history.undo().source, 'AB');
  assert.equal(history.undo().source, '');
  assert.equal(history.canUndo, false);
});

test('reset clears navigation history and bounded history drops oldest source', () => {
  const history = createSourceHistory('A', { limit: 2 });
  history.record('B', 1, 1);
  history.record('C', 1, 1);
  assert.equal(history.undo().source, 'B');
  assert.equal(history.undo().source, 'B');
  history.reset('D');
  assert.equal(history.canRedo, false);
  assert.equal(history.canUndo, false);
});

test('source diff preserves markup as literal text and highlights changed span', () => {
  assert.deepEqual(sourceDiff('A ->\nA: <tag>', 'A -> B\nA: <tag>'), [
    { kind: 'removed', text: 'A ->' }, { kind: 'added', text: 'A -> B' }, { kind: 'same', text: 'A: <tag>' },
  ]);
});
