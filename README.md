# textgraph.dev

TextGraph DSL 的规范、教程、API 文档、Playground、示例和迁移指南。

> **[所有 TextGraph 问题统一提交到 GitHub Issues →](https://github.com/drawmotive/textgraph/issues)**
> 包括缺陷、功能建议、文档、Playground、SDK、字体、Markdown 和 VS Code 集成问题。

## 本地开发

```console
npm ci
npm test
npm run build
```

## 许可证

- 网站代码和代码示例使用 MIT 许可证，见 `LICENSE-CODE`。
- 文档内容使用 Creative Commons Attribution 4.0 International（CC BY 4.0），见 `LICENSE-DOCS`。
## Markdown rendering and deployment

The site installs `@drawmotive/markdown-it-textgraph@0.2.1` from npm, which renders diagrams with the public TextGraph SDK 0.2.1. A standalone checkout needs no sibling repositories.

Use a fenced block with language `textgraph` and metadata `example` to pair copyable source with its static diagram. The site expands the single source block into both panels; ordinary `textgraph` fences still show only the diagram. Examples stack on narrow screens. Published examples must render successfully; rendering failures stop the site build.

Run `npm run build:release` to validate the coordinated version and installed registry dependencies before building. Cloudflare Pages project `textgraph-dev` deploys this repository's `main` branch to https://textgraph.dev; its output directory is `.vitepress/dist`.

Cloudflare's direct `npx vitepress build` command is also supported. Required
homepage images and playground runtime assets are prepared by the Vite configuration
before bundling. Preparation cannot rely on npm `prebuild`/`predev` hooks: direct
VitePress commands skip them, leaving Git-ignored assets absent in a clean checkout.

## Published documentation

The navigation and `srcExclude` list in `.vitepress/config.mts` define the public documentation. Pages for unfinished features and internal design documents stay in the repository but are excluded from generated routes and local search. Add them back only when their features work and their examples have been verified with the published SDK. Earlier design material from mixed reference pages remains in Git history.

Markdown integrations use fenced `textgraph` code blocks. The unpublished PEG grammar is historical design material, not the current renderer contract; the public syntax and language references describe current usage.

## Homepage

The homepage demonstrates source and real rendered output, then links each example
into the playground with its exact DSL. The catalog in .vitepress/home/examples.mjs
owns the code panels, PNGs, links, and analytics IDs.

Development and build commands generate previews with the installed public SDK.
After changing example source during development, run npm run home:render again.
Generated images are ignored by Git and bundled as static assets; visiting the
homepage does not load the WASM renderer. Examples remain visible without JavaScript.
Homepage events carry version diagram-story-v1.

## Analytics

Production uses Google Analytics 4 to measure homepage exploration, successful
diagram creation, and export/share actions. See [analytics setup and metrics](docs/analytics.md)
for required property settings, event definitions, and verification. Shared DSL
source, query strings, and error text are excluded from the site's event payloads.

## Playground

The editor supports self-contained links such as `/playground?d=0.QSAtPiBC`. Every link generation compares two unpadded Base64URL encodings of the UTF-8 source: `0.<raw>` and `1.<zstd>`. Zstd uses its default compression level (currently 3), with no size threshold or dictionary. The shorter final value wins; ties use `0`. Both alphabets are URL-safe, so neither candidate needs percent-encoding. Homepage example links use the same selection during the site build.

Opening a link restores its source before the first render. Edits update the address bar after a 250 ms pause without adding history entries; **Share** flushes the pending edit and copies its link. Whitespace, Unicode, invalid DSL, and an empty editor are preserved. Unsupported versions and malformed data fall back to the default example. If clipboard access is unavailable, copy the updated address bar instead. The query parameter is included in requests to the site server; it contains encoded source, not encrypted data. Links can still exceed browser or messaging-service limits for large diagrams.

`/playground` runs inside this site. The left pane edits TextGraph; the right pane shows a PNG preview. Drag the divider to adjust the pane ratio, or focus it and use the arrow keys (Home/End select the limits). The image fits the available width and height. Errors and warnings appear above the image only when present. Edits render after a 350 ms pause. Render now (or Ctrl/⌘+Enter) renders immediately. Invalid edits keep the last successful preview visible; diagnostic locations focus the corresponding source.

The public `@drawmotive/textgraph@0.2.1` SDK renders in a module Worker, so source stays in the browser and layout work does not block typing. Only one render runs at a time, intermediate edits are coalesced, and stale results are ignored. No rendering API or sibling repository is required.

The preview toolbar provides zoom in/out, reset to fit, PNG download, and image copy to clipboard. Drag the image to pan; when the canvas is focused, use +/− to zoom, arrow keys to pan, and 0 to reset. Zoom and pan survive render updates. Download and copy always use the full PNG, independent of the current view. Clipboard permission or browser limitations are reported beside the image, with download available as a fallback.

While refreshing, the existing image and diagnostics stay in place until new results arrive. Render status remains accessible to screen readers and on the preview title tooltip; the image tooltip identifies a previous successful render. Diagnostic source links are temporarily disabled while their replacements are being checked. Syntax help lives beside the source title, leaving the main page space for editing and previewing.

`npm run dev` and `npm run build` copy the SDK runtime, fonts, themes, and licenses into `public/textgraph/wasm` automatically. These generated files are ignored by Git and included in the static build. Serve over HTTPS or localhost for Web Crypto. The renderer loads only when the playground opens.

Run `npm test` for unit tests. For a browser check with the real renderer, run `npx playwright install chromium`, `npm run build`, then `npm run test:browser`. This covers preview updates, diagnostics, error recovery, navigation, and mobile layout. Within the parent DrawMotive workspace, install with `npm ci --workspaces=false` to use the site's locked public dependencies.

## Standalone browser example

`/examples/textgraph/` is a plain HTML and JavaScript page with editable source,
initial live rendering, PNG download, and visible SDK integration code. The
JavaScript integration guide and Examples navigation link to it. VitePress links
to this static page use `target="_self"` to bypass the documentation SPA router.

The existing asset preparation boundary also copies the installed npm SDK
modules, manifest, and license to `public/textgraph/sdk/`. The example loads those
modules and the shared local WASM runtime without a CDN or sibling checkout.
Its source lives in `public/examples/textgraph/`; generated SDK files stay ignored.

The browser suite covers rendering, edits, diagnostics, retry, PNG download,
mobile layout, and navigation from the documentation.

## Editor documentation and runnable example

`/editor/` documents `@drawmotive/editor`; `/examples/editor/` is a standalone page with a real visual editor, TextGraph generation, PNG export and document save/open. The page and its runtime are copied from the exact npm release recorded in `.vitepress/editor-release.json`. All browser requests remain on this site’s origin.

`npm run build` prepares the editor automatically. The first build downloads the pinned tarball from npm and verifies its SHA-512; subsequent builds use the verified cache. Deploy only after that package version exists on npm. Before first publication, review the same archive locally:

```bash
DRAWMOTIVE_EDITOR_TARBALL=/absolute/path/drawmotive-editor-0.2.1.tgz npm run build
npm run preview -- --host 127.0.0.1
```

The local override must match the committed archive integrity. When upgrading, publish the tested archive unchanged, update version/URL/integrity together, and run the site unit tests, build and browser tests. Never replace only runtime files or point the frame at an npm CDN: the host is an HTML page and needs correct HTML/WASM serving.
