import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { copyLocalRuntime, localRuntimeManifestPlugin } from '../.vitepress/local-runtime.mjs';

test('local site copies verified selected bytes and resolves the same manifest in main and Worker bundles', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'textgraph-site-runtime-'));
  try {
    const generated = path.join(root, 'generated');
    const sdk = path.join(root, 'sdk');
    const destination = path.join(root, 'public/wasm');
    const bytes = Buffer.from('selected local WASM');
    await mkdir(path.join(generated, 'wasm'), { recursive: true });
    await writeFile(path.join(generated, 'wasm/Graphics.Core.wasm'), bytes);
    const manifest = { assets: [{path:'wasm/Graphics.Core.wasm',bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')}] };
    await writeFile(path.join(generated, 'wasm-manifest.json'), JSON.stringify(manifest));
    await writeFile(path.join(generated, 'wasm-manifest.js'), `export default ${JSON.stringify(manifest,null,2)};
`);
    await copyLocalRuntime(generated, destination);
    assert.deepEqual(await readFile(path.join(destination, 'Graphics.Core.wasm')), bytes);
    const plugin = localRuntimeManifestPlugin(sdk, generated);
    assert.equal(plugin.resolveId('../generated/wasm-manifest.js', path.join(sdk,'src/index.js')), path.join(generated,'wasm-manifest.js'));
    assert.equal(plugin.resolveId('../generated/wasm-manifest.js', path.join(root,'other/index.js')), undefined);
    await writeFile(path.join(generated, 'wasm/Graphics.Core.wasm'), 'stale');
    await assert.rejects(copyLocalRuntime(generated,destination), /integrity mismatch/);
    assert.deepEqual(await readFile(path.join(destination,'Graphics.Core.wasm')), bytes);
  } finally { await rm(root,{recursive:true,force:true}); }
});
