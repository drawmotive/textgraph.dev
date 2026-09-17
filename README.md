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

Use a fenced block with language `textgraph` and metadata `example` to pair copyable source with its static diagram. The site expands the single source block into both panels; ordinary `textgraph` fences still show only the diagram. Examples stack on narrow screens. Known renderer limitations show an availability message beside the source, using the adapter's inline error mode.

Run `npm run build:release` to validate the coordinated version and installed registry dependencies before building. Cloudflare Pages project `textgraph-dev` deploys this repository's `main` branch to https://textgraph.dev; its output directory is `.vitepress/dist`.

Cloudflare's direct `npx vitepress build` command is also supported. Required
homepage images and playground runtime assets are prepared by the Vite configuration
before bundling. Preparation cannot rely on npm `prebuild`/`predev` hooks: direct
VitePress commands skip them, leaving Git-ignored assets absent in a clean checkout.

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

Opening a link restores its source before the first render. Edits update the address bar after a 250 ms pause without adding history entries; **Share** flushes the pending edit and copies its link. Whitespace, Unicode, invalid DSL, and an empty editor are preserved. Existing `#source=<percent-encoded text>` links still open; new `d` data takes precedence if both are present. Unsupported versions and malformed data fall back to the default example. If clipboard access is unavailable, copy the updated address bar instead. Unlike the legacy fragment, the new query parameter is included in requests to the site server; it contains encoded source, not encrypted data. Links can still exceed browser or messaging-service limits for large diagrams.

`/playground` runs inside this site. The left pane edits TextGraph; the right pane shows a PNG preview. Drag the divider to adjust the pane ratio, or focus it and use the arrow keys (Home/End select the limits). The image fits the available width and height. Errors and warnings appear above the image only when present. Edits render after a 350 ms pause. Render now (or Ctrl/⌘+Enter) renders immediately. Invalid edits keep the last successful preview visible; diagnostic locations focus the corresponding source.

The public `@drawmotive/textgraph@0.2.1` SDK renders in a module Worker, so source stays in the browser and layout work does not block typing. Only one render runs at a time, intermediate edits are coalesced, and stale results are ignored. No rendering API or sibling repository is required.

The preview toolbar provides zoom in/out, reset to fit, PNG download, and image copy to clipboard. Drag the image to pan; when the canvas is focused, use +/− to zoom, arrow keys to pan, and 0 to reset. Zoom and pan survive render updates. Download and copy always use the full PNG, independent of the current view. Clipboard permission or browser limitations are reported beside the image, with download available as a fallback.

While refreshing, the existing image and diagnostics stay in place until new results arrive. Render status remains accessible to screen readers and on the preview title tooltip; the image tooltip identifies a previous successful render. Diagnostic source links are temporarily disabled while their replacements are being checked. Syntax help lives beside the source title, leaving the main page space for editing and previewing.

`npm run dev` and `npm run build` copy the SDK runtime, fonts, themes, and licenses into `public/textgraph/wasm` automatically. These generated files are ignored by Git and included in the static build. Serve over HTTPS or localhost for Web Crypto. The renderer loads only when the playground opens.

Run `npm test` for unit tests. For a browser check with the real renderer, run `npx playwright install chromium`, `npm run build`, then `npm run test:browser`. This covers preview updates, diagnostics, error recovery, navigation, and mobile layout. Within the parent DrawMotive workspace, install with `npm ci --workspaces=false` to use the site's locked public dependencies.
