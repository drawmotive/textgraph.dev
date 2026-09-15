import assert from 'node:assert/strict';
import test from 'node:test';
import { createPlaygroundRenderer } from '../.vitepress/playground/renderer.mjs';

function setup(t) {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const workers = [];
  let state;
  const renderer = createPlaygroundRenderer({
    createWorker() {
      const worker = {
        requests: [],
        postMessage(message) { this.requests.push(message); },
        terminate() { this.terminated = true; },
        receive(data) { this.onmessage?.({ data }); },
      };
      workers.push(worker);
      return worker;
    },
    onState(next) { state = next; },
    debounceMs: 350,
  });
  t.after(() => renderer.dispose());
  return { renderer, workers, get state() { return state; } };
}

const png = { success: true, png: new Uint8Array([137, 80, 78, 71]), width: 80, height: 40, diagnostics: [] };
const invalid = { success: false, diagnostics: [{ code: 'TG001', severity: 'error', stage: 'parse', message: 'Expected a node', location: { line: 1, column: 3 } }] };

function finish(worker, result = png) {
  worker.receive({ type: 'result', id: worker.requests.at(-1).id, result });
}

test('rapid edits render only the latest source after both debounce and startup', t => {
  const app = setup(t);
  app.renderer.update('A -> B');
  const worker = app.workers[0];
  t.mock.timers.tick(200);
  app.renderer.update('A -> C');
  worker.receive({ type: 'ready' });
  t.mock.timers.tick(349);
  assert.equal(worker.requests.length, 0);
  t.mock.timers.tick(1);
  assert.equal(worker.requests.length, 1);
  assert.equal(worker.requests[0].source, 'A -> C');
  finish(worker);
  assert.equal(app.state.status, 'ready');
  assert.deepEqual(app.state.result, png);
});

test('slow startup retains only the most recent edit', t => {
  const app = setup(t);
  app.renderer.update('A -> B');
  t.mock.timers.tick(350);
  app.renderer.update('A -> C');
  t.mock.timers.tick(350);
  const worker = app.workers[0];
  assert.equal(worker.requests.length, 0);
  worker.receive({ type: 'ready' });
  assert.equal(worker.requests.length, 1);
  assert.equal(worker.requests[0].source, 'A -> C');
});

test('render now bypasses a pending debounce without rendering twice', t => {
  const app = setup(t);
  app.renderer.update('A -> B');
  const worker = app.workers[0];
  worker.receive({ type: 'ready' });
  t.mock.timers.tick(100);
  app.renderer.update('A -> B', { immediate: true });
  assert.equal(worker.requests.length, 1);
  finish(worker);
  t.mock.timers.tick(1000);
  assert.equal(worker.requests.length, 1);
  assert.equal(app.state.status, 'ready');
});

test('one active render plus the latest pending edit prevents a queue and stale errors', t => {
  const app = setup(t);
  app.renderer.update('A -> B', { immediate: true });
  const worker = app.workers[0];
  worker.receive({ type: 'ready' });
  app.renderer.update('A -> C');
  t.mock.timers.tick(350);
  app.renderer.update('A -> D');
  t.mock.timers.tick(350);
  assert.equal(worker.requests.length, 1);
  finish(worker, invalid);
  assert.equal(app.state.diagnostics.length, 0);
  assert.equal(worker.requests.length, 2);
  assert.equal(worker.requests[1].source, 'A -> D');
  finish(worker);
  assert.equal(app.state.status, 'ready');
});

test('an old success cannot replace the preview while a newer edit is debouncing', t => {
  const app = setup(t);
  app.renderer.update('A -> B', { immediate: true });
  const worker = app.workers[0];
  worker.receive({ type: 'ready' });
  app.renderer.update('A -> C');
  finish(worker);
  assert.equal(app.state.result, null);
  assert.equal(worker.requests.length, 1);
  t.mock.timers.tick(350);
  finish(worker);
  assert.equal(app.state.status, 'ready');
});

test('diagnostics retain the previous preview and successful warnings are visible', t => {
  const app = setup(t);
  app.renderer.update('A -> B', { immediate: true });
  const worker = app.workers[0];
  worker.receive({ type: 'ready' });
  finish(worker);
  app.renderer.update('A ->', { immediate: true });
  finish(worker, invalid);
  assert.equal(app.state.status, 'error');
  assert.equal(app.state.result, png);
  assert.equal(app.state.stale, true);
  assert.deepEqual(app.state.diagnostics, invalid.diagnostics);
  const warnings = [{ severity: 'warning', code: 'FONT', stage: 'font', message: 'Missing glyph' }];
  app.renderer.update('A -> B', { immediate: true });
  finish(worker, { ...png, diagnostics: warnings });
  assert.equal(app.state.stale, false);
  assert.deepEqual(app.state.diagnostics, warnings);
});

test('empty input clears output and discards in-flight results', t => {
  const app = setup(t);
  app.renderer.update('A -> B', { immediate: true });
  const worker = app.workers[0];
  worker.receive({ type: 'ready' });
  finish(worker);
  app.renderer.update('A -> C', { immediate: true });
  app.renderer.update('  \n');
  finish(worker);
  t.mock.timers.tick(1000);
  assert.equal(app.state.status, 'empty');
  assert.equal(app.state.result, null);
  assert.deepEqual(app.state.diagnostics, []);
  assert.equal(worker.requests.length, 2);
});

test('startup failures appear as diagnostics and a manual render starts a fresh worker', t => {
  const app = setup(t);
  app.renderer.update('A -> B', { immediate: true });
  app.workers[0].receive({ type: 'fatal', message: 'Could not load renderer' });
  assert.equal(app.state.status, 'error');
  assert.match(app.state.diagnostics[0].message, /Could not load renderer/);
  assert.equal(app.workers[0].terminated, true);
  app.renderer.update('A -> B', { immediate: true });
  assert.equal(app.workers.length, 2);
  app.workers[1].receive({ type: 'ready' });
  finish(app.workers[1]);
  assert.equal(app.state.status, 'ready');
});

test('worker crashes stop busy state and disposal ignores late messages and timers', t => {
  const app = setup(t);
  app.renderer.update('A -> B');
  const worker = app.workers[0];
  worker.onerror({ message: 'Worker crashed', preventDefault() {} });
  assert.equal(app.state.status, 'error');
  app.renderer.update('A -> C');
  const current = app.workers[1];
  app.renderer.dispose();
  const state = app.state;
  current.receive({ type: 'ready' });
  t.mock.timers.tick(1000);
  assert.equal(current.terminated, true);
  assert.equal(current.requests.length, 0);
  assert.equal(app.state, state);
});
