export const MAX_SOURCE_BYTES = 16 * 1024;
export const DEFAULT_FIX_API_URL = 'https://staging.drawmotive.com/api/textgraph/fix';

const messages = {
  INVALID_SOURCE: 'Send a TextGraph diagram to repair.',
  SOURCE_TOO_LARGE: 'Fix It supports diagrams up to 16 KiB. Shorten the source and try again.',
  VERSION_MISMATCH: 'The repair service uses a different renderer version. Refresh this page and try again.',
  NOT_REPAIRABLE: 'This source cannot be repaired automatically. Check the syntax reference.',
  NO_FIX: 'No repair was found. Edit the source and try again.',
  INVALID_FIX: 'The suggested repair was not valid. Edit the source and try again.',
  RATE_LIMITED: 'Fix It is busy. Wait a minute before trying again.',
  UNAVAILABLE: 'Fix It is temporarily unavailable. Try again later.',
  UPSTREAM_FAILED: 'The repair service could not complete the request. Try again later.',
  TIMEOUT: 'The repair timed out. Try again.',
};

export function canRepair(state) {
  const errors = state.diagnostics.filter(item => item.severity === 'error');
  return state.status === 'error' && errors.length > 0
    && errors.every(item => ['parse', 'semantic'].includes(item.stage));
}

function failure(code) { return new Error(messages[code] || messages.UPSTREAM_FAILED); }

// This is a DSL-only, anonymous request. Never forward the source-bearing page
// URL, credentials, renderer diagnostics, or any instruction supplied by the UI.
export async function requestRepair(source, { endpoint = DEFAULT_FIX_API_URL, rendererVersion, signal, fetchImpl = fetch, timeoutMs = 65_000 } = {}) {
  if (new TextEncoder().encode(source).length > MAX_SOURCE_BYTES) throw failure('SOURCE_TOO_LARGE');
  const deadline = new AbortController();
  const timer = setTimeout(() => deadline.abort(), timeoutMs);
  try {
    const response = await fetchImpl(endpoint, {
      method: 'POST', credentials: 'omit', referrerPolicy: 'no-referrer', redirect: 'error',
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-TextGraph-Renderer-Version': rendererVersion },
      body: source, signal: signal ? AbortSignal.any([signal, deadline.signal]) : deadline.signal,
    });
    // JSON escaping can expand a valid source. Bound the transport before JSON
    // parsing as well as the returned DSL before handing it to the renderer.
    const reader = response.body.getReader();
    const chunks = [];
    let bytes = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.length;
      if (bytes > MAX_SOURCE_BYTES * 6 + 1024) {
        await reader.cancel();
        throw failure('INVALID_FIX');
      }
      chunks.push(value);
    }
    const joined = new Uint8Array(bytes);
    let offset = 0;
    for (const chunk of chunks) { joined.set(chunk, offset); offset += chunk.length; }
    let body;
    try { body = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(joined)); }
    catch { throw failure('UPSTREAM_FAILED'); }
    if (!response.ok) throw failure(body?.code);
    if (typeof body?.source !== 'string' || !body.source.trim() || new TextEncoder().encode(body.source).length > MAX_SOURCE_BYTES) throw failure('INVALID_FIX');
    return body.source;
  } catch (error) {
    if (signal?.aborted) throw error;
    if (deadline.signal.aborted) throw failure('TIMEOUT');
    // Only locally owned messages reach the UI, never raw HTTP/provider errors.
    if (Object.values(messages).includes(error.message)) throw error;
    throw failure('UPSTREAM_FAILED');
  } finally { clearTimeout(timer); }
}

// A candidate is isolated from the draft renderer and source history. Revision
// ownership lasts through HTTP, local rendering, and PNG decoding; any edit or
// navigation invalidates all three, even if cancellation is ignored upstream.
export function createRepairSession({ request, createRenderer, validateResult, onState, renderTimeoutMs = 30_000 }) {
  let revision = 0;
  let controller;
  let renderer;
  let timer;
  let disposed = false;
  let state = { status: 'idle' };
  const publish = next => { state = next; onState(next); };
  function stop() {
    controller?.abort();
    controller = undefined;
    renderer?.dispose();
    renderer = undefined;
    clearTimeout(timer);
  }
  function invalidate() {
    revision += 1;
    stop();
    if (!disposed) publish({ status: 'idle' });
  }
  return {
    invalidate,
    async start(source) {
      if (disposed || ['requesting', 'rendering'].includes(state.status)) return;
      invalidate();
      const current = revision;
      controller = new AbortController();
      const signal = controller.signal;
      const isCurrent = () => !disposed && current === revision;
      const fail = message => { if (isCurrent()) { stop(); publish({ status: 'error', message }); } };
      publish({ status: 'requesting' });
      try {
        const candidate = await request(source, signal);
        if (!isCurrent()) return;
        if (candidate === source) { fail(messages.NO_FIX); return; }
        publish({ status: 'rendering' });
        timer = setTimeout(() => fail('The repaired diagram took too long to render. Your source is unchanged.'), renderTimeoutMs);
        renderer = createRenderer(async next => {
          if (!isCurrent() || state.status !== 'rendering') return;
          if (next.status === 'error') { fail('The repaired diagram could not be rendered. Your source is unchanged.'); return; }
          if (next.status !== 'ready') return;
          try {
            await validateResult(next.result);
            if (!isCurrent() || state.status !== 'rendering') return;
            stop();
            publish({ status: 'review', source: candidate, original: source, result: next.result });
          } catch { fail('The repaired PNG could not be displayed. Your source is unchanged.'); }
        });
        renderer.update(candidate, { immediate: true });
      } catch (error) { if (isCurrent()) fail(error.message); }
    },
    dispose() { disposed = true; invalidate(); },
  };
}
