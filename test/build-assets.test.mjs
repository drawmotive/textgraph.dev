import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, rm, symlink } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { resolveConfig } from 'vite';
import { resolveUserConfig } from 'vitepress';
import { homeExamples } from '../.vitepress/home/examples.mjs';

const siteRoot = path.resolve(import.meta.dirname, '..');

test('direct VitePress configuration prepares assets in a clean checkout without npm hooks', async () => {
  // Cloudflare calls VitePress directly, bypassing prebuild. Both imported
  // homepage PNGs and public playground runtime files must exist before bundling.
  const verification = path.join(siteRoot, 'node_modules/.cache/site-build');
  await mkdir(verification, { recursive: true });
  const root = await mkdtemp(path.join(verification, 'build-assets-'));
  try {
    await cp(path.join(siteRoot, '.vitepress'), path.join(root, '.vitepress'), {
      recursive: true,
      filter: source => !['verification', 'generated', 'cache', 'dist'].includes(path.basename(source)),
    });
    await cp(path.join(siteRoot, 'scripts'), path.join(root, 'scripts'), { recursive: true });
    await cp(path.join(siteRoot, 'package.json'), path.join(root, 'package.json'));
    await symlink(path.join(siteRoot, 'node_modules'), path.join(root, 'node_modules'), 'junction');

    const [config, configPath] = await resolveUserConfig(root, 'build', 'production');
    assert.equal(configPath, path.join(root, '.vitepress/config.mts'));
    await resolveConfig({ ...config.vite, root, configFile: false }, 'build');

    const generated = path.join(root, '.vitepress/home/generated');
    const images = await readFile(path.join(generated, 'images.mjs'), 'utf8');
    for (const example of homeExamples) {
      assert.ok(images.includes('./' + example.id + '.png'), example.id);
      const png = await readFile(path.join(generated, example.id + '.png'));
      assert.deepEqual(Array.from(png.subarray(0, 8)), [137, 80, 78, 71, 13, 10, 26, 10]);
    }

    const runtimeRoot = path.join(siteRoot, 'node_modules/@drawmotive/textgraph/generated');
    const manifest = JSON.parse(await readFile(path.join(runtimeRoot, 'wasm-manifest.json'), 'utf8'));
    for (const asset of manifest.assets) {
      assert.deepEqual(
        await readFile(path.join(root, 'public/textgraph', asset.path)),
        await readFile(path.join(runtimeRoot, asset.path)),
        asset.path,
      );
    }
    for (const file of ['src/platform/browser.js', 'src/index.js', 'generated/wasm-manifest.js', 'LICENSE']) {
      assert.deepEqual(
        await readFile(path.join(root, 'public/textgraph/sdk', file)),
        await readFile(path.join(siteRoot, 'node_modules/@drawmotive/textgraph', file)),
        file,
      );
    }
  } finally { await rm(root, { recursive: true, force: true }); }
});
