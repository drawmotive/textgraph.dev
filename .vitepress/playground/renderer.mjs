/** Own scheduling at the editor boundary: debounce edits, allow one active render,
 * and accept output only for the current source revision. Native work cannot be
 * cancelled mid-render, so obsolete edits never enter the worker's runtime queue. */
export function createPlaygroundRenderer({ createWorker, onState, debounceMs = 350, logger = console }) {
  let worker;
  let ready = false;
  let disposed = false;
  let revision = 0;
  let pending;
  let active;
  let timer;
  let state = { status: 'empty', result: null, diagnostics: [], stale: false };

  function publish(changes) {
    state = { ...state, ...changes };
    onState(state);
  }

  // Log at result acceptance, not state publication: pending states retain the
  // previous diagnostics, and obsolete worker results have no current meaning.
  function logDiagnostics(diagnostics) {
    for (const diagnostic of diagnostics) {
      const method = diagnostic.severity === 'error' ? 'error' : 'warn';
      logger[method](
        `[TextGraph] ${diagnostic.code} (${diagnostic.stage}): ${diagnostic.message}`,
        diagnostic,
      );
    }
  }

  function stopWorker() {
    if (worker) {
      worker.onmessage = worker.onerror = worker.onmessageerror = null;
      worker.terminate();
    }
    worker = undefined;
    ready = false;
    active = undefined;
  }

  function fail(message) {
    clearTimeout(timer);
    timer = undefined;
    pending = undefined;
    stopWorker();
    const diagnostics = [
      { severity: 'error', stage: 'render', code: 'RENDERER_FAILED', message },
    ];
    logDiagnostics(diagnostics);
    publish({ status: 'error', stale: Boolean(state.result), diagnostics });
  }

  function dispatch() {
    if (disposed || !ready || active || !pending || timer !== undefined) return;
    active = pending;
    pending = undefined;
    publish({ status: 'rendering' });
    try { worker.postMessage({ type: 'render', ...active }); }
    catch (error) { fail(error.message || 'Could not send the diagram to the renderer.'); }
  }

  function startWorker() {
    try {
      worker = createWorker();
      worker.onmessage = ({ data }) => {
        if (disposed) return;
        if (data.type === 'fatal') {
          fail(data.message);
          return;
        }
        if (data.type === 'ready') {
          ready = true;
          if (pending) publish({ status: 'waiting' });
          dispatch();
          return;
        }
        if (data.type !== 'result' || data.id !== active?.id) return;
        active = undefined;
        if (data.id === revision) {
          const { result } = data;
          const diagnostics = result.diagnostics.length || result.success ? result.diagnostics : [
            { severity: 'error', code: 'RENDER_FAILED', stage: 'render', message: 'The diagram could not be rendered.' },
          ];
          logDiagnostics(diagnostics);
          publish({
            status: result.success ? 'ready' : 'error',
            result: result.success ? result : state.result,
            stale: !result.success && Boolean(state.result),
            diagnostics,
          });
        }
        dispatch();
      };
      worker.onerror = event => {
        event.preventDefault();
        fail(event.message || 'The renderer stopped unexpectedly. Try rendering again.');
      };
      worker.onmessageerror = () => fail('Could not read the rendered diagram. Try rendering again.');
    } catch (error) {
      fail(error.message || 'Could not start the renderer. Try rendering again.');
    }
  }

  return {
    update(source, { immediate = false } = {}) {
      if (disposed) return;
      revision += 1;
      clearTimeout(timer);
      timer = undefined;
      pending = undefined;
      if (!source.trim()) {
        publish({ status: 'empty', result: null, diagnostics: [], stale: false });
        return;
      }
      pending = { id: revision, source };
      // Pending input has no diagnostic result yet. Keep the displayed result
      // together until its replacement arrives, preserving the renderer state API.
      publish({ status: ready ? 'waiting' : 'loading', stale: Boolean(state.result) });
      if (!immediate) timer = setTimeout(() => { timer = undefined; dispatch(); }, debounceMs);
      if (!worker) startWorker();
      dispatch();
    },
    dispose() {
      disposed = true;
      clearTimeout(timer);
      pending = undefined;
      stopWorker();
    },
  };
}
