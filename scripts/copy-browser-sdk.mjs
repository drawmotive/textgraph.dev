import { cp, mkdir } from 'node:fs/promises';

// The standalone example uses the installed public SDK as native ES modules.
// Keep its relative import layout and manifest together; WASM assets are copied
// separately by the package's supported textgraph-copy-assets command.
const entry = new URL(import.meta.resolve('@drawmotive/textgraph/browser'));
const packageRoot = new URL('../../', entry);
const destination = new URL('../public/textgraph/sdk/', import.meta.url);
await mkdir(new URL('generated/', destination), { recursive: true });
for (const file of ['src', 'generated/wasm-manifest.js', 'LICENSE']) {
  await cp(new URL(file, packageRoot), new URL(file, destination), { recursive: true });
}
