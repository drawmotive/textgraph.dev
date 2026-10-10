import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { copyLocalRuntime } from '../.vitepress/local-runtime.mjs';

// Resolve installed packages directly: local development links packages without
// npm-generated .bin shims, while standalone release installs use the same CLIs.
const sdk = new URL('../../scripts/copy-assets.mjs', import.meta.resolve('@drawmotive/textgraph/worker'));
const fonts = new URL('./scripts/copy-fonts.mjs', import.meta.resolve('@drawmotive/textgraph-fonts'));
if (process.env.DRAWMOTIVE_TEXTGRAPH_RUNTIME)
  await copyLocalRuntime(process.env.DRAWMOTIVE_TEXTGRAPH_RUNTIME, 'public/textgraph/wasm');
else execFileSync(process.execPath, [fileURLToPath(sdk), 'public/textgraph/wasm'], { stdio: 'inherit' });
for (const [script, destination] of [[fonts, 'public/textgraph/fonts']]) {
  execFileSync(process.execPath, [fileURLToPath(script), destination], { stdio: 'inherit' });
}
