# Dependency refresh — 2026-10-06

Third-party direct dependencies use the current stable npm releases:
Playwright 1.63.0, Peggy 5.1.0 and tar 7.5.22. The share-link codec has since
been replaced with native browser deflate streams. No share codec package is required. The lockfile
also refreshes transitive dependencies within their owners' compatible ranges.

VitePress deliberately remains `2.0.0-alpha.19`; its stable npm `latest` tag
is `1.6.4`, which would downgrade the existing host. Exact `@drawmotive`
versions and the integrity-pinned Editor archive retain their coordinated
release identities and native bytes. The published Markdown plugin keeps
its supported Markdown 14 peer rather than forcing an incompatible major
through the site's transitive dependencies.

Verification uses the standalone repository's `npm ci`, `npm test`,
`npm run build` and `npm run test:browser` commands on Node 22.23.2.
All passed on Linux x64: 62 unit tests, the full VitePress build and 49
Chromium checks covering the real local renderer, editor example, source
sharing, repair review, exports, fonts, navigation and mobile viewports.
The refreshed lockfile installs cleanly and `npm audit` reports zero
vulnerabilities, including the optional dependency entries.
