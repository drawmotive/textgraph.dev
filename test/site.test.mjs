import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const siteRoot = path.resolve(import.meta.dirname, '..');

test('site has standalone public repository metadata', async () => {
  const packageJson = JSON.parse(await readFile(path.join(siteRoot, 'package.json'), 'utf8'));

  assert.equal(packageJson.name, '@drawmotive/textgraph.dev');
  assert.equal(packageJson.private, true);
  assert.equal(packageJson.type, 'module');
  assert.equal(packageJson.engines.node, '>=22');
  assert.equal(packageJson.scripts.test, 'node --test test/*.test.mjs');
  assert.equal(packageJson.repository.url, 'https://github.com/drawmotive/textgraph.dev.git');
});

test('site declares separate code and documentation licenses', async () => {
  await access(path.join(siteRoot, 'LICENSE-CODE'));
  await access(path.join(siteRoot, 'LICENSE-DOCS'));
  const readme = await readFile(path.join(siteRoot, 'README.md'), 'utf8');

  assert.match(readme, /MIT/);
  assert.match(readme, /CC BY 4\.0/);
});

test('site is npm-only', async () => {
  await access(path.join(siteRoot, 'package-lock.json'));
  await assert.rejects(access(path.join(siteRoot, 'pnpm-lock.yaml')), { code: 'ENOENT' });
});

test('published routes and navigation expose usable documentation only', async () => {
  const { resolveConfig } = await import('vitepress');
  const config = await resolveConfig(siteRoot, 'build', 'production');
  const drafts = /^(?:slides\/|diagrams\/(?:sequence|mindmaps)\.md$|integrations\/(?:cli|rest-api|ai-agents)\.md$|reference\/(?:config|grammar|themes)\.md$|docs\/|design\/|README\.md$|CLAUDE\.md$)/;
  assert.ok(config.pages.includes('reference/syntax.md'));
  assert.ok(config.pages.includes('diagrams/flowcharts.md'));
  assert.deepEqual(config.pages.filter(page => drafts.test(page)), []);

  function checkLinks(items) {
    for (const item of items) {
      if (item.items) checkLinks(item.items);
      if (!item.link?.startsWith('/') || item.link.startsWith('/examples/')) continue;
      const route = item.link.slice(1);
      assert.ok(config.pages.includes(route.endsWith('/') ? route + 'index.md' : route + '.md'), item.link);
    }
  }
  checkLinks(config.site.themeConfig.nav);
  checkLinks(config.site.themeConfig.sidebar);
  for (const page of config.pages) {
    const content = await readFile(path.join(siteRoot, page), 'utf8');
    assert.doesNotMatch(content, /not implemented|CONTENT TO ADD|@textgraph|@slide|\(notes\)|mindmaps?|sequence diagrams?|speaker notes/i, page);
  }
});
