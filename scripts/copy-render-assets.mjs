import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Resolve installed packages directly: local development links packages without
// npm-generated .bin shims, while standalone release installs use the same CLIs.
const sdk = new URL('../../scripts/copy-assets.mjs', import.meta.resolve('@drawmotive/textgraph/worker'));
const fonts = new URL('./scripts/copy-fonts.mjs', import.meta.resolve('@drawmotive/textgraph-fonts'));
for (const [script, destination] of [[sdk, 'public/textgraph/wasm'], [fonts, 'public/textgraph/fonts']]) {
  execFileSync(process.execPath, [fileURLToPath(script), destination], { stdio: 'inherit' });
}
