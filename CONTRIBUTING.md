# Contributing to textgraph.dev

Use the [shared issue tracker](https://github.com/drawmotive/textgraph/issues)
for documentation, playground and website issues. Include the affected URL,
browser/OS, expected behavior and a small TextGraph example when relevant.
Site documentation and design notes are maintained in English.

Use Node.js 22.12+ on the 22 line or Node.js 24, with npm 10 or 11 on Linux,
Windows or macOS. See the [support matrix](README.md#supported-environments)
for browser and platform verification limits.

From a standalone public checkout:

```bash
npm ci
npm test
npm run build
```

The build generates `.vitepress/dist` for static hosting. This private npm
project is not published as an npm product; `npm pack` is not a delivery check.
Assets come from exact public registry dependencies and the integrity-pinned
Editor archive. No sibling checkout, private C# build or credentials are
required. Preparation is part of the Vite configuration, including direct
VitePress builds.

For changes to pages, playground behavior or embedded examples:

```bash
npx playwright install chromium
npm run test:browser
```

Run the browser suite after the site build; it serves the built static output.
It covers Chromium, including mobile viewports, without certifying mobile
devices, Firefox or WebKit. `npm run dev` provides local authoring and
`npm run preview` serves the production build.

Use `npm ci` with the committed registry lock. Change dependencies intentionally
with `npm install` and commit the matching lock. Keep the Editor archive
version, URL and integrity together; do not use developer-local packages as
public release inputs. Run `npm run build:release` for coordinated version
and installed-dependency validation before a release build.

Keep pull requests focused and report checks actually run. Verify new examples
with the pinned SDK; invalid published diagrams fail the build. Update
navigation and exclusions deliberately and review links in changed pages.

Code/examples use [MIT](LICENSE-CODE); documentation uses
[CC BY 4.0](LICENSE-DOCS), requiring attribution and an indication of changes.
Preserve copied asset licenses and notices indexed in [NOTICE](NOTICE).
