---
aside: false
---

# DrawMotive editor

`@drawmotive/editor` embeds a visual diagram editor in your web application. Start with TextGraph, move shapes and edit labels on the canvas, then save an editable document or download a PNG. The editor runs in the browser without an account or rendering service.

<figure class="guide-figure">
  <a href="/guide-images/drawmotive-editor.png"><img src="/guide-images/drawmotive-editor.png" alt="DrawMotive editor demo: TextGraph source and document controls on the left, with the generated User, Application and Database shapes on the editable canvas on the right." width="1376" height="771"></a>
  <figcaption>The running editor demo: generate from text, edit on the canvas, then save a document or export a PNG. Select the image to see it at full size.</figcaption>
</figure>

<a href="/examples/editor/" target="_self">Run the visual editor SDK demo →</a>

## From TextGraph to visual editing

The [Playground](/playground) updates an image as you edit text. DrawMotive takes the next step: generate a starting diagram, then work directly with its shapes, labels and connections. Save the editable document to reopen your canvas changes; export a PNG to share the result. Visual edits do not update the original TextGraph.

If your application only needs to produce images, use the [JavaScript renderer](/integrations/javascript). Choose the editor when people need a canvas:

| What you need | Package |
| --- | --- |
| Render TextGraph to a PNG in a browser, Node.js, React or a Worker | `@drawmotive/textgraph` |
| Let people edit diagrams visually in a web page | `@drawmotive/editor` |

## Install and mount

```bash
npm install @drawmotive/editor
npx drawmotive-copy-assets public/editor
```

Deploy the copied directory with your application. Copy the assets again after upgrading the package; in Vite, add the copy command to `predev` and `prebuild`.

```html
<div id="editor" style="height: 600px"></div>
```

```javascript
import { initializeEditor } from '@drawmotive/editor';

const editor = await initializeEditor({
  container: document.querySelector('#editor'),
  assetBaseUrl: '/editor/',
  source: 'User -> Application -> Database',
});
```

The promise resolves after the initial diagram is ready. Omit `source` for a blank canvas. Each editor lives in an iframe that isolates the canvas, styles and runtime from your page. The frame fills its container, so an explicit height is required.

## Save, reopen and export

```javascript
const { raw, png, width, height } = await editor.exportDocument();

// Save raw in your application's storage, then reopen it later.
await editor.importDocument(raw);

// Or start a new editor with an existing document.
const reopened = await initializeEditor({
  container: document.querySelector('#another-editor'),
  assetBaseUrl: '/editor/',
  document: raw,
});
```

`raw` is the opaque base64 editable document. `png` is the base64 image; use `data:image/png;base64,` followed by `png` in an image's `src`, or turn it into a Blob for download. A PNG is for viewing and sharing. Preserve `raw` to keep editing.

Your application owns saving. The editor uses temporary browser storage during a session; it is not durable document storage. The browser example demonstrates both document save/open and PNG download.

## Replace a diagram

```javascript
try {
  await editor.importTextGraph('Draft -> Review -> Approved');
} catch (error) {
  document.querySelector('#status').textContent = error.message;
}
```

Imports replace the current diagram. Save any edits first. Invalid input rejects the promise and preserves the previous diagram. `importTextGraph('')` starts a blank canvas. The editor does not turn visual edits back into TextGraph source.

## Lifecycle and frameworks

Create the editor after your framework mounts the container. Dispose it when the component unmounts:

```javascript
const controller = new AbortController();
const pending = initializeEditor({
  container,
  assetBaseUrl: '/editor/',
  signal: controller.signal,
});

// Abort cancels startup. After startup, use dispose().
const editor = await pending;
await editor.dispose();
```

The module is safe to import during server rendering, but mounting requires a browser. Each instance owns a separate runtime, so avoid mounting unused instances. `dispose()` is idempotent and rejects pending operations.

## API

| Option | Meaning |
| --- | --- |
| `container` | Required HTML element with an explicit height |
| `assetBaseUrl` | Directory containing the copied `embed.html` and runtime files |
| `source` | Initial TextGraph source; omit for a blank diagram |
| `document` | Initial exported `raw` document; mutually exclusive with `source` |
| `signal` | AbortSignal for initialization, including initial import |
| `title` | Accessible iframe title; defaults to “DrawMotive diagram editor” |
| `timeoutMs` | Initialization and request deadline; defaults to 120000 |

The returned instance exposes `importTextGraph(source)`, `importDocument(raw)`, `exportDocument()`, `dispose()` and `state`. Methods are asynchronous.

## Hosting

Use HTTPS or localhost, serve `.wasm` files as `application/wasm`, and deploy all copied files. When hosting below a path prefix, include it in `assetBaseUrl`, such as `/my-app/editor/`. Bundled applications should always set this option. Without it, a plain JavaScript module import resolves the runtime relative to the package.

For restrictive Content Security Policy configurations, allow the runtime frame from its asset origin. Its scripts require WebAssembly execution (`wasm-unsafe-eval`), its own static resources and inline styles. Do not remove or rewrite runtime files: their hashes are verified during startup.

This browser API covers local visual editing and document export/import. Account login, server synchronization and toolbar customization are outside its initial public API.
