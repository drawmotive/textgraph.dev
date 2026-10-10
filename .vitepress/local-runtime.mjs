import { createHash } from 'node:crypto';
import { cp, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';

/** Validate the exact runtime selected by local development before serving any of its bytes. */
export async function copyLocalRuntime(generated, destination) {
  const manifest = JSON.parse(await readFile(path.join(generated, 'wasm-manifest.json'), 'utf8'));
  const projection = await readFile(path.join(generated, 'wasm-manifest.js'), 'utf8');
  if (projection !== `export default ${JSON.stringify(manifest, null, 2)};
`) throw new Error('Local runtime manifest projection mismatch.');
  if (!manifest.assets?.length) throw new Error('Local runtime has no assets.');
  const paths = new Set();
  for (const asset of manifest.assets) {
    if (!/^wasm[/][A-Za-z0-9_-][A-Za-z0-9._-]*$/.test(asset.path) || paths.has(asset.path)) throw new Error('Invalid local runtime asset path.');
    paths.add(asset.path);
    const bytes = await readFile(path.join(generated, asset.path));
    if (bytes.length !== asset.bytes || createHash('sha256').update(bytes).digest('hex') !== asset.sha256) throw new Error(`Local runtime integrity mismatch: ${asset.path}`);
  }
  await mkdir(destination, { recursive: true });
  await cp(path.join(generated, 'wasm'), destination, { recursive: true, force: true });
}

/** Main and Worker bundles must embed the manifest paired with the selected local assets. */
export function localRuntimeManifestPlugin(sdk, generated) {
  return {
    name: 'textgraph-site-local-runtime', enforce: 'pre',
    resolveId(id, importer) {
      if (!importer || !id.endsWith('generated/wasm-manifest.js')) return;
      const packaged = path.join(sdk, 'generated/wasm-manifest.js');
      if (path.resolve(path.dirname(importer.split('?', 1)[0]), id) === packaged) return path.join(generated, 'wasm-manifest.js');
    },
  };
}
