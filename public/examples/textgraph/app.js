import { initializeTextGraph } from '../../textgraph/sdk/src/platform/browser.js';

const source = document.querySelector('#source');
const renderButton = document.querySelector('#render');
const status = document.querySelector('#status');
const diagnostics = document.querySelector('#diagnostics');
const diagram = document.querySelector('#diagram');
const download = document.querySelector('#download');
const placeholder = document.querySelector('#placeholder');
let runtime;
let rendering = false;
let previewUrl;
let renderedSource;

function showDiagnostics(messages) {
  diagnostics.textContent = messages.join('\n');
  diagnostics.hidden = !messages.length;
}

function reflectEdits() {
  if (rendering) return;
  const current = source.value === renderedSource;
  status.textContent = current ? 'Diagram ready. Download the PNG or edit the source.' : 'Source changed. Select Render diagram to update the preview.';
  // An old preview remains useful, but it must not look like current output.
  download.hidden = !current || !previewUrl;
}

// Reuse one runtime, serialize renders, and only publish the submitted source.
// Editing stays available during initialization and rendering.
async function render() {
  if (rendering) return;
  if (!source.value.trim()) {
    status.textContent = 'Add some TextGraph source to render.';
    download.hidden = true;
    return;
  }
  rendering = true;
  renderButton.disabled = true;
  download.hidden = true;
  const submittedSource = source.value;
  showDiagnostics([]);
  try {
    if (!runtime) {
      status.textContent = 'Loading the renderer…';
      runtime = await initializeTextGraph({
        resolveAsset: asset => new URL(`../../textgraph/${asset.path}`, import.meta.url),
      });
    }
    status.textContent = 'Rendering diagram…';
    const result = await runtime.renderPng(submittedSource, { scale: 2, maxWidth: 1600 });
    showDiagnostics(result.diagnostics.map(diagnostic => `${diagnostic.severity}: ${diagnostic.message}`));
    if (!result.success) {
      status.textContent = 'Could not render. Check the source and try again.';
      if (previewUrl) diagram.title = 'Preview from the last successful render';
      return;
    }
    const previousUrl = previewUrl;
    previewUrl = URL.createObjectURL(new Blob([result.png], { type: 'image/png' }));
    diagram.src = previewUrl;
    diagram.hidden = false;
    diagram.title = 'Rendered TextGraph diagram';
    placeholder.hidden = true;
    download.href = previewUrl;
    renderedSource = submittedSource;
    if (previousUrl) URL.revokeObjectURL(previousUrl);
    status.textContent = source.value === submittedSource
      ? 'Diagram ready. Download the PNG or edit the source.'
      : 'Source changed. Select Render diagram to update the preview.';
    download.hidden = source.value !== submittedSource;
  } catch (error) {
    status.textContent = 'Could not load or render the diagram. Select Render diagram to retry.';
    showDiagnostics([error.message || String(error)]);
  } finally {
    rendering = false;
    renderButton.disabled = false;
  }
}

renderButton.addEventListener('click', render);
source.addEventListener('input', reflectEdits);
source.addEventListener('keydown', event => {
  if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
    event.preventDefault();
    render();
  }
});
// Do not dispose a page placed in the back/forward cache: it can be restored.
window.addEventListener('pagehide', event => {
  if (!event.persisted) {
    runtime?.dispose();
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }
});
render();
