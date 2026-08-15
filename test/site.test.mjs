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
