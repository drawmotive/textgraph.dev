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

## Playground

`/playground` runs inside this site. The left pane edits TextGraph; the right pane shows a PNG preview. Drag the divider to adjust the pane ratio, or focus it and use the arrow keys (Home/End select the limits). The image fits the available width and height. Errors and warnings appear above the image only when present. Edits render after a 350 ms pause. Render now (or Ctrl/⌘+Enter) renders immediately. Invalid edits keep the last successful preview visible; diagnostic locations focus the corresponding source.

The public `@drawmotive/textgraph@0.2.1` SDK renders in a module Worker, so source stays in the browser and layout work does not block typing. Only one render runs at a time, intermediate edits are coalesced, and stale results are ignored. No rendering API or sibling repository is required.

While refreshing, the existing image and diagnostics stay in place until new results arrive. Status updates use the preview header without changing the canvas size; the image tooltip identifies a previous successful render. Diagnostic source links are temporarily disabled while their replacements are being checked.

`npm run dev` and `npm run build` copy the SDK runtime, fonts, themes, and licenses into `public/textgraph/wasm` automatically. These generated files are ignored by Git and included in the static build. Serve over HTTPS or localhost for Web Crypto. The renderer loads only when the playground opens.

Run `npm test` for unit tests. For a browser check with the real renderer, run `npx playwright install chromium`, `npm run build`, then `npm run test:browser`. This covers preview updates, diagnostics, error recovery, navigation, and mobile layout. Within the parent DrawMotive workspace, install with `npm ci --workspaces=false` to use the site's locked public dependencies.
