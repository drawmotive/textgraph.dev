# Choose your workflow

Learn TextGraph once, then use its source wherever you work. Start with the Playground, bring diagrams into your documentation, or build rendering and visual editing into an application.

<figure class="guide-figure">
  <a href="/guide-images/textgraph-workflows.svg"><img src="/guide-images/textgraph-workflows.svg" alt="TextGraph source branches into three workflows: try it in the Playground, publish with Markdown or preview in VS Code, and build applications with the PNG renderer or DrawMotive visual editor." width="720" height="640"></a>
  <figcaption>One language, different destinations. Choose by what you want to do with the diagram.</figcaption>
</figure>

## Try and share a diagram

The [Playground](/playground) is the place to write TextGraph and see a live preview. Zoom, download the PNG, or share a link containing the source. There is nothing to install.

## Write documentation

Put a fenced `textgraph` block in a Markdown file. The [VS Code extension](/integrations/vscode) previews it while you write; the [Markdown & VitePress plugin](/integrations/markdown) renders it into a static image when you publish. Both use the same diagram source.

## Build an application

| What people need to do | Use | What you keep |
| --- | --- | --- |
| Render diagrams from text in a browser, worker, React app or Node.js | [JavaScript SDK](/integrations/javascript), `@drawmotive/textgraph` | TextGraph source and PNG output |
| Move shapes, edit labels and draw on a canvas | [DrawMotive editor](/editor/), `@drawmotive/editor` | An editable document and optional PNG export |

The editor extends the workflow from text to visual editing. Save its document to keep canvas changes; those changes do not turn back into TextGraph source.

## Where the SDK demos fit

The <a href="/examples/textgraph/" target="_self">renderer demo</a> is a small, runnable implementation of the JavaScript guide. The <a href="/examples/editor/" target="_self">visual editor demo</a> demonstrates embedding the editor and saving a document. They are companion code examples for application developers. For everyday text editing and sharing, use the [Playground](/playground).
