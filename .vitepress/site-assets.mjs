import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

/** Prepare required files at the Vite boundary, including direct CLI builds
 * that bypass npm lifecycle hooks. Complete before imports/public files are read. */
export function siteAssets() {
  let prepared = false;
  const cwd = fileURLToPath(new URL('../', import.meta.url));
  return {
    name: 'textgraph-site-assets',
    config() {
      // VitePress configures client and SSR bundles separately. They share the
      // same inputs, so render/copy once per site invocation, not per bundle.
      if (prepared) return;
      for (const script of ['assets', 'home:render']) {
        execFileSync('npm', ['run', script, '--workspaces=false'], {
          cwd,
          stdio: 'inherit',
          shell: process.platform === 'win32',
        });
      }
      prepared = true;
    },
  };
}
