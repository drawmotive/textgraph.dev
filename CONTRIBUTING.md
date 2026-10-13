# Contributing to textgraph.dev

Use the [shared issue tracker](https://github.com/drawmotive/textgraph/issues)
for documentation, playground and website issues. Include the affected URL,
browser/OS, expected behavior and a small TextGraph example when relevant.
Site documentation and design notes are maintained in English.

Use Node.js 22.12+ on the 22 line, with npm 10 or 11 on Linux,
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

For syntax and documentation changes, run `npm run test:grammar` to check the executable PEG and published diagram inputs. Run `npm run test:dsl` to also check runtime semantics, PNG rendering of every published TextGraph fence, homepage examples, source links, and analytics. Validation success alone does not prove that a diagram can be laid out and rendered.

In the DrawMotive workspace, run the root `npm run test:dsl` to check both current local C# WASM and the site's locked registry release, serially. Use `npm run test:dsl -- local` or `npm run test:dsl -- release` to select one. Local mode builds the native runtime and restores dependency links when finished. Release mode copies current site edits into an isolated snapshot, installs the committed package lock, and clears local runtime overrides. It includes uncommitted and new files, so run it before committing. A local pass with a release failure means the site is not ready for its pinned public packages. Publish compatible runtime packages and update the site's exact pins and lock before integrating documentation that depends on new behavior.

Group bodies contain connections, bare local member names, nested groups, standalone scope styles, and comments. Separate node decorations and cross-group connections belong at the root. Short node names inside a group are local; root references use unique short names or group-qualified paths when names are duplicated. Declare a named group once within its parent.

Keep pull requests focused and report checks actually run. Verify new examples
with the pinned SDK; invalid published diagrams fail the build. Update
navigation and exclusions deliberately and review links in changed pages.

Code/examples use [MIT](LICENSE-CODE); documentation uses
[CC BY 4.0](LICENSE-DOCS), requiring attribution and an indication of changes.
Preserve copied asset licenses and notices indexed in [NOTICE](NOTICE).
