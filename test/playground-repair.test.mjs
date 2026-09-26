import assert from 'node:assert/strict';
import test from 'node:test';
import { canRepair, createRepairSession, MAX_SOURCE_BYTES, requestRepair } from '../.vitepress/playground/repair.mjs';

const errorState = stages => ({ status: 'error', diagnostics: stages.map(stage => ({ severity: 'error', stage })) });

test('only current parse/semantic failures offer repair, not warnings or infrastructure failures', () => {
  assert.equal(canRepair(errorState(['parse', 'semantic'])), true);
  for (const stage of ['font', 'layout', 'render', 'unknown']) assert.equal(canRepair(errorState(['parse', stage])), false);
  assert.equal(canRepair({ ...errorState(['parse']), status: 'waiting' }), false);
  assert.equal(canRepair({ status: 'ready', diagnostics: [{ severity: 'warning', stage: 'semantic' }] }), false);
  assert.equal(canRepair(errorState([])), false);
});

test('repair sends only DSL with pinned version, no credentials or source URL, and no retry', async () => {
  const calls = [];
  const source = 'A ->\nA: café 服务';
  const fixed = await requestRepair(source, { rendererVersion: '0.2.2-alpha.2', fetchImpl: async (...args) => {
    calls.push(args); return Response.json({ source: 'A -> B' });
  } });
  assert.equal(fixed, 'A -> B');
  assert.equal(calls.length, 1);
  assert.equal(calls[0][1].body, source);
  assert.deepEqual(calls[0][1].headers, { 'Content-Type': 'text/plain; charset=utf-8', 'X-TextGraph-Renderer-Version': '0.2.2-alpha.2' });
  assert.equal(calls[0][1].credentials, 'omit');
  assert.equal(calls[0][1].referrerPolicy, 'no-referrer');
  assert.equal(calls[0][1].redirect, 'error');
});

test('UTF-8 bounds input and output and untrusted error messages never reach UI', async () => {
  let calls = 0;
  await assert.rejects(requestRepair('界'.repeat(MAX_SOURCE_BYTES / 2), { fetchImpl: () => { calls += 1; } }), /16 KiB/);
  assert.equal(calls, 0);
  for (const body of [{ source: ' ' }, { source: '界'.repeat(MAX_SOURCE_BYTES / 2) }, { source: 12 }]) {
    await assert.rejects(requestRepair('A ->', { fetchImpl: async () => Response.json(body) }), /not valid/);
  }
  await assert.rejects(requestRepair('A ->', { fetchImpl: async () => Response.json({ code: 'RATE_LIMITED', message: 'secret provider detail' }, { status: 429 }) }), /Wait a minute/);
  await assert.rejects(requestRepair('A ->', { fetchImpl: async () => Response.json({ code: 'EVIL', message: 'secret provider detail' }, { status: 502 }) }), /could not complete/);
  await assert.rejects(requestRepair('A ->', { fetchImpl: async () => new Response('<html>provider error</html>') }), /could not complete/);
  await assert.rejects(requestRepair('A ->', { fetchImpl: async () => new Response('x'.repeat(MAX_SOURCE_BYTES * 7)) }), /not valid/);
});

test('timeout aborts once without retry; caller cancellation stays distinct', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const fetchImpl = async (_, { signal }) => new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(signal.reason), { once: true }));
  const timeout = requestRepair('A ->', { fetchImpl, timeoutMs: 10 });
  t.mock.timers.tick(10);
  await assert.rejects(timeout, /timed out/);
  const controller = new AbortController();
  const cancelled = requestRepair('A ->', { fetchImpl, signal: controller.signal });
  controller.abort();
  await assert.rejects(cancelled, { name: 'AbortError' });
});

function deferred() { let resolve; let reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; }
function setup(t, options = {}) {
  let state;
  const requests = [];
  const renderers = [];
  const app = createRepairSession({
    request(source, signal) { const item = { ...deferred(), source, signal }; requests.push(item); return item.promise; },
    createRenderer(onState) {
      const worker = { emit: onState, update(source) { this.source = source; }, dispose() { this.disposed = true; } };
      renderers.push(worker); return worker;
    },
    validateResult: async () => {},
    onState(next) { state = next; },
    ...options,
  });
  t.after(() => app.dispose());
  return { app, requests, renderers, get state() { return state; } };
}

test('edits invalidate late HTTP results even when the transport ignores cancellation', async t => {
  const h = setup(t);
  const pending = h.app.start('A ->');
  await h.app.start('A ->');
  assert.equal(h.requests.length, 1);
  h.app.invalidate();
  assert.equal(h.requests[0].signal.aborted, true);
  h.requests[0].resolve('A -> B');
  await pending;
  assert.equal(h.state.status, 'idle');
  assert.equal(h.renderers.length, 0);
});

test('candidate enters review only after rendering and PNG decoding; edit invalidates decode', async t => {
  const decode = deferred();
  const h = setup(t, { validateResult: () => decode.promise });
  const pending = h.app.start('A ->');
  h.requests[0].resolve('A -> B');
  await pending;
  assert.equal(h.state.status, 'rendering');
  const accepted = h.renderers[0].emit({ status: 'ready', result: { png: [1] } });
  assert.equal(h.state.status, 'rendering');
  h.app.invalidate();
  decode.resolve();
  await accepted;
  assert.equal(h.state.status, 'idle');
  assert.equal(h.renderers[0].disposed, true);
});

test('review keeps original separate and is removed by subsequent edits', async t => {
  const h = setup(t);
  const pending = h.app.start('A ->');
  h.requests[0].resolve('A -> B');
  await pending;
  await h.renderers[0].emit({ status: 'ready', result: { png: [1] } });
  assert.deepEqual(h.state, { status: 'review', source: 'A -> B', original: 'A ->', result: { png: [1] } });
  assert.equal(h.renderers[0].disposed, true);
  h.app.invalidate();
  assert.equal(h.state.status, 'idle');
});

test('candidate render failure, bad PNG, unchanged source and timeout never offer review', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  for (const kind of ['render', 'png', 'unchanged', 'timeout']) {
    const h = setup(t, { validateResult: async () => { if (kind === 'png') throw Error('bad PNG'); }, renderTimeoutMs: 10 });
    const pending = h.app.start('A ->');
    h.requests[0].resolve(kind === 'unchanged' ? 'A ->' : 'A -> B');
    await pending;
    if (kind === 'timeout') t.mock.timers.tick(10);
    else if (kind !== 'unchanged') await h.renderers[0].emit({ status: kind === 'render' ? 'error' : 'ready', result: { png: [] } });
    assert.equal(h.state.status, 'error', kind);
    assert.equal(h.state.source, undefined);
  }
});
