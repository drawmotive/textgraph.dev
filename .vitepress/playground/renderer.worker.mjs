import { initializeTextGraph } from '@drawmotive/textgraph/worker';
import { playgroundAssets } from './assets.mjs';

// Keep the reusable WASM runtime off the editor's main thread. The complete
// package assets are served locally, including their fonts and license files.
try {
  const runtime = await initializeTextGraph(playgroundAssets(import.meta.env.BASE_URL, self.location.origin));

  // .NET inspects onmessage during bootstrap; install our handler afterwards.
  self.onmessage = async ({ data }) => {
    if (data.type !== 'render') return;
    try {
      const result = await runtime.renderPng(data.source, { scale: 2, maxWidth: 2400 });
      self.postMessage({ type: 'result', id: data.id, result }, result.success ? [result.png.buffer] : []);
    } catch (error) {
      self.postMessage({ type: 'result', id: data.id, result: {
        success: false,
        diagnostics: [{
          severity: 'error', stage: 'render', code: error.code || 'RENDER_FAILED',
          message: error.message || 'The diagram could not be rendered.',
        }],
      } });
    }
  };
  self.postMessage({ type: 'ready' });
} catch (error) {
  self.postMessage({ type: 'fatal', message: error.message || 'Could not load the renderer. Try rendering again.' });
}
