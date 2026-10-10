# textgraph.dev

Specifications, tutorials, API documentation, a playground, examples, and migration guides for the TextGraph DSL.

> **[Report all TextGraph issues on GitHub →](https://github.com/drawmotive/textgraph/issues)**
> This includes bugs, feature requests, documentation, the playground, SDKs, fonts, and Markdown and VS Code integrations.

All site documentation, including this README and internal design notes, is maintained in English.

## Local development

```console
npm ci
npm test
npm run build
```

## Supported environments

| Layer | Supported environment | Verification boundary |
| --- | --- | --- |
| Site development and build | Node.js 22.12+ in the 22 line; npm 10 or 11 | VitePress/Vite requires the 22.12 minimum; Node 22 is the current verification target |
| Desktop build systems | Linux, Windows, macOS | CI targets all three systems with Node 22 |
| Site, playground and editor example | Current Chromium is covered by the site browser suite | The SDK has separate Chromium/Firefox/WebKit tests; the embedded editor is currently verified only in Chromium |
| Deployment | Static `.vitepress/dist` output | HTTPS or localhost is required for interactive WASM/Web Crypto; this private package is not published to npm |

The standalone audit on 2026-10-01 executed Linux x64 with Node 22.23.2 and
npm 10.9.8. Declared support and CI targets do not claim Windows, macOS,
Node 24, Firefox, WebKit or real mobile-device verification in that audit.
The browser suite includes mobile viewport checks in Chromium.

For contribution and browser-check commands, see [Contributing](CONTRIBUTING.md).
Changes are recorded in [Changelog](CHANGELOG.md).
Vulnerability reports follow [Security reporting](SECURITY.md).

## Licenses

- Site code and code examples use the MIT license; see [LICENSE-CODE](LICENSE-CODE).
- Documentation uses Creative Commons Attribution 4.0 International (CC BY 4.0); see [LICENSE-DOCS](LICENSE-DOCS).
- Copied dependencies and fonts retain their own licenses; see [NOTICE](NOTICE).

## Markdown rendering and deployment

The site installs `@drawmotive/markdown-it-textgraph@0.2.2-alpha.2` from npm, which renders diagrams with the public TextGraph SDK 0.2.2-alpha.2. A standalone checkout needs no sibling repositories.

Use a fenced block with language `textgraph` and metadata `example` to pair copyable source with its static diagram. The site expands the single source block into both panels; ordinary `textgraph` fences still show only the diagram. Examples stack on narrow screens. Published examples must render successfully; rendering failures stop the site build.

Add `markdown` after `example` to show the enclosing Markdown fence in the source panel. Both panels still come from one diagram source.

Run `npm run build:release` to validate the coordinated version and installed registry dependencies before building. Cloudflare Pages project `textgraph-dev` deploys this repository's `main` branch to https://textgraph.dev; its output directory is `.vitepress/dist`.

Cloudflare's direct `npx vitepress build` command is also supported. Required
homepage images and playground runtime assets are prepared by the Vite configuration
before bundling. Preparation cannot rely on npm `prebuild`/`predev` hooks: direct
VitePress commands skip them, leaving Git-ignored assets absent in a clean checkout.

The final build precompresses WASM, DLL and OTF files with Brotli quality 6,
and TTF fonts with quality 11, font mode and the maximum standard window 24,
at their original URLs. `.vitepress/dist/_headers` supplies `Content-Encoding: br`
and the original MIME types for Cloudflare Pages. Browser HTTP decoding preserves
the SDK manifests' original byte lengths and SHA-256 hashes. This output requires
an HTTPS host that sends those headers and a browser with HTTP Brotli support; it
contains one encoded representation, without an uncompressed fallback. Other
static hosts must apply equivalent headers.

Use `npm run preview` to check the built output locally; its server supplies the
same encoding headers. VitePress's default preview ignores `_headers`. Development
and installed SDK/public source files remain uncompressed. SDK consumers can use
their own hosting and compression policy; no `.br` files or special host headers
are required by the packages. Stable runtime/font filenames revalidate their
cache instead of using immutable caching.

Monorepo builds reuse stored `.ttf.br` files generated alongside the editor's
`static/files.json` by `npm run static:manifest`. Standalone builds cache encoded
registry fonts by source hash under `.vitepress/cache/font-brotli`; fresh builds
reuse those bytes unless the font or compression policy changes. Cache files
are website build artifacts and never enter SDK distributions.

## Published documentation

The navigation and `srcExclude` list in `.vitepress/config.mts` define the public documentation. Pages for unfinished features and internal design documents stay in the repository but are excluded from generated routes and local search. Add them back only when their features work and their examples have been verified with the published SDK. Earlier design material from mixed reference pages remains in Git history.

Markdown integrations use fenced `textgraph` code blocks. The unpublished PEG grammar is historical design material, not the current renderer contract; the public syntax and language references describe current usage.

The sidebar follows **Learn TextGraph → Use TextGraph → Build applications → Reference**. The editor extends the language into visual editing after the renderer SDK. Runnable demos belong to their integration guides and the **SDK demos** menu, rather than independent sidebar chapters; the Playground is the everyday text authoring tool. This keeps learning topics, authoring tools and implementation samples from competing at the same level. Existing routes remain stable.

Every published guide outside Reference includes real rendered examples or a relevant static illustration. Home, Playground and the SDK demos already show rendered diagrams. `public/guide-images/textgraph-workflows.svg` is the editable workflow illustration. `drawmotive-editor.png` is a screenshot of the editor 0.2.2-alpha.1 demo, captured at 1440 × 1100 after “Ready to edit”, cropped to `.workspace`. Refresh it against the pinned release when the editor changes. Images link to their full-size assets where detail benefits from enlargement. Browser checks verify guide images without JavaScript and at mobile widths.

**AI tools** under **Use TextGraph** provides a copyable prompt; the Playground remains in the top navigation. Asset preparation copies the canonical specification and style catalog unchanged to `/reference/textgraph-spec.md` and `/reference/classes.md`. These downloadable Markdown files retain their license notices and are generated, not separately maintained. Use HTML anchors with `download` for them so VitePress does not rewrite the links into documentation routes. The specification covers syntax; the separate class catalog is needed for styling, while the syntax summary is redundant.

## Homepage

The homepage demonstrates source and real rendered output, then links each example
into the playground with its exact DSL. The catalog in .vitepress/home/examples.mjs
owns the code panels, PNGs, links, and analytics IDs.

Development and build commands generate previews with the installed public SDK.
After changing example source during development, run npm run home:render again.
Generated images are ignored by Git and bundled as static assets; visiting the
homepage does not load the WASM renderer. Examples remain visible without JavaScript.
Homepage events carry version diagram-story-v1.

Source and diagram panes share a header style, spacing, and divider. The source
body has a contrasting background so its title stays distinct from the DSL.
Both headers use the same block layout: mixing an inline source label with a
flex-item diagram label previously introduced different line-box offsets.

## Analytics

Production uses Google Analytics 4 to measure homepage exploration, successful
diagram creation, and export/share actions. See [analytics setup and metrics](docs/analytics.md)
for required property settings, event definitions, and verification. Shared DSL
source, query strings, and error text are excluded from the site's event payloads.

## Playground

The editor supports self-contained links such as `/playground?d=0.QSAtPiBC`. Every link generation compares two unpadded Base64URL encodings of the UTF-8 source: `0.<raw>` and `1.<deflate>`. The compressed format is zlib-wrapped DEFLATE, produced and decoded by the native `CompressionStream` and `DecompressionStream` APIs with no JS/WASM codec dependency. The shorter final value wins; ties use `0`. Both alphabets are URL-safe, so neither candidate needs percent-encoding. Homepage example links use the same selection during the Node site build. Browsers without native streams create raw links and can read raw links; they cannot read compressed links. Old Brotli and Zstd compressed links must be regenerated.

Opening a link restores its source before the first render. Edits update the address bar after a 250 ms pause without adding history entries; **Share** flushes the pending edit and copies its link. Whitespace, Unicode, invalid DSL, and an empty editor are preserved. Unsupported versions and malformed data fall back to the default example. If clipboard access is unavailable, copy the updated address bar instead. The query parameter is included in requests to the site server; it contains encoded source, not encrypted data. Links can still exceed browser or messaging-service limits for large diagrams.

`/playground` runs inside this site. The left pane edits TextGraph; the right pane shows a PNG preview. Drag the divider to adjust the pane ratio, or focus it and use the arrow keys (Home/End select the limits). The image fits the available width and height. Errors cover the image viewport with a translucent overlay, including when no PNG exists yet. Errors and warnings are also written to the browser console with their code, stage, message, and source location. Only accepted results for the current source are logged, once per result. Edits render after a 350 ms pause. Render now (or Ctrl/⌘+Enter) renders immediately. Invalid edits show a short failure status and keep the last successful preview visible.

The public `@drawmotive/textgraph@0.2.2-alpha.2` SDK renders in a module Worker, so normal rendering stays in the browser and layout work does not block typing. Only one render runs at a time, intermediate edits are coalesced, and stale results are ignored. No rendering API or sibling repository is required.

The preview toolbar provides zoom in/out, reset to fit, PNG download, and image copy to clipboard. Drag the image to pan; when the canvas is focused, use +/− to zoom, arrow keys to pan, and 0 to reset. Zoom and pan survive render updates. Download and copy always use the full PNG, independent of the current view. Clipboard permission or browser limitations are reported beside the image, with download available as a fallback.

While refreshing, the existing image stays in place until new results arrive. Diagnostics remain available in the renderer state and SDK result without being repeated in the console during pending states. Render status remains accessible to screen readers and on the preview title tooltip; the image tooltip identifies a previous successful render. Syntax help lives beside the source title, leaving the main page space for editing and previewing.

`npm run dev` and `npm run build` copy the SDK runtime, base fonts, themes, and licenses into `public/textgraph/wasm` automatically. The same asset step uses `textgraph-copy-fonts` from the exact `@drawmotive/textgraph-fonts@0.2.2-alpha.2` build dependency to copy the optional fonts, font catalog, hash manifest, and licenses into `public/textgraph/fonts`. These generated files are ignored by Git and included in the static build. Missing font packages fail the asset step. Serve over HTTPS or localhost for Web Crypto. The renderer loads only when the playground opens.

### Fix It and source history

Parse and semantic errors offer **Fix It**, powered by gpt-6-luna. The disclosure beside the button explains that clicking sends the current DSL to Azure AI; normal rendering never calls the repair service. Font, layout, and renderer failures show retry advice without offering source repair. Warnings do not obscure a successful diagram.

The anonymous endpoint defaults to `https://staging.drawmotive.com/api/textgraph/fix`. Set `VITE_TEXTGRAPH_FIX_API_URL` at build time for another environment. The request is `POST` with a UTF-8 `text/plain` body containing only DSL and `X-TextGraph-Renderer-Version` set from the exact installed SDK dependency. Cookies and the source-bearing referrer URL are omitted. The service must allow the site origin and both request headers through CORS. No API key belongs in the site or a `VITE_` variable. Input and returned source are limited to 16 KiB UTF-8; requests time out after 65 seconds without automatic retries.

A returned `{ "source": "..." }` is rendered by an isolated worker with the same pinned browser SDK, then its PNG is decoded before review. Candidate rendering skips the unused provisional font preview. Rendering and decoding share a 30-second deadline; exceeding it explicitly reports that rendering timed out after 30 seconds. Cancel remains available throughout rendering and decoding. A valid candidate replaces only the displayed preview; the draft, last successful draft PNG, and share link remain unchanged. **Review source changes** expands a literal-text diff. **Replace original DSL** applies one undo transaction; **Discard** restores the draft preview. Edits, navigation, Cancel, and unmount invalidate the request and candidate, including late results. Invalid repairs or PNG failures cannot be applied. API errors use local messages selected by the documented error code, never raw provider messages.

The textarea has Undo/Redo buttons and supports Ctrl/⌘+Z, Ctrl/⌘+Shift+Z, and Ctrl+Y. Adjacent typing is grouped; pasted source, committed IME composition, and applied repairs are separate transactions. Undo/redo update the draft renderer and share link like other edits. History is in memory, bounded to 100 snapshots, and resets when navigating to another shared source.

### Font loading and cache

Playground declares its same-origin `textgraph/fonts/font-catalog.json` with `fontAssets` and disables remote fallback. Both font and runtime addresses respect the VitePress base path. Additional fonts are fetched only when displayed text needs them, before measurement; English input does not download the Chinese, Japanese, or emoji fonts. `files.json` records deployed files and hashes; it is not a preload list. A declared package with missing or damaged assets reports an error rather than silently changing to another source.

The Worker keeps one SDK instance for the open Playground. That instance retains installed fonts and decoded typefaces across edits and coalesces repeated font requests. Loading a new language adds fonts to that catalog. Leaving the Playground disposes the Worker and releases its in-memory cache. Reloading uses the browser's existing HTTP cache and server revalidation policy; there is no new IndexedDB database, Service Worker, or Cache Storage layer. Failed downloads can be retried.

Deploy the copied catalog, manifests, and font bytes together. Keep metadata revalidated when replacing the unversioned directory; do not mark mutable URLs immutable or add random cache-busting query strings. The catalog's hashes identify the font bytes and the SDK verifies them, preventing a stale or mixed deployment from silently installing a different file. An offline distribution must include the complete copied font directory and serve it locally. A browser that loses its connection before using a language cannot fetch that language's uncached file from the server.

Other SDK hosts may omit `fontAssets` to use the SDK's lazy `https://staging.drawmotive.com/` fallback, or explicitly disable fallback for offline operation. Playground always supplies its deployed package. Publish the font package and SDK before refreshing this standalone site's registry lockfile and releasing the site; local workspace links and tarballs are development inputs only.

Standalone release installs resolve the exact published 0.2.2-alpha.2 SDK, Markdown and font archives through package-lock.json. Local workspace links remain development inputs only.

Run `npm test` for unit tests. For a browser check with the real renderer, run `npx playwright install chromium`, `npm run build`, then `npm run test:browser`. This covers preview updates, diagnostics, error recovery, navigation, and mobile layout. Within the parent DrawMotive workspace, install with `npm ci --workspaces=false` to use the site's locked public dependencies.

Parent-workspace local builds use `DRAWMOTIVE_TEXTGRAPH_RUNTIME` and
`DRAWMOTIVE_TEXTGRAPH_SDK` to pair the selected native assets with the same
manifest in both main and Worker bundles. The Chinese diamond repair deadline
regression is enabled when testing that selected local runtime. Standalone
browser checks skip it until the pinned public SDK includes the native fix;
the explicit 30-second timeout and source-preservation checks always run.

## Standalone browser example

`/examples/textgraph/` is a plain HTML and JavaScript page with editable source,
initial live rendering, PNG download, and visible SDK integration code. The
JavaScript integration guide and SDK demos navigation link to it. VitePress links
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
DRAWMOTIVE_EDITOR_TARBALL=/absolute/path/drawmotive-editor-0.2.2-alpha.2.tgz npm run build
npm run preview -- --host 127.0.0.1
```

The local override must match the committed archive integrity. When upgrading, publish the tested archive unchanged, update version/URL/integrity together, and run the site unit tests, build and browser tests. Never replace only runtime files or point the frame at an npm CDN: the host is an HTML page and needs correct HTML/WASM serving.
