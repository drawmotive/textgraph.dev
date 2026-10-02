import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

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
      for (const script of ['assets', 'editor:prepare', 'home:render']) {
        // npm.cmd cannot be executed directly without a shell on Windows.
        // Invoke its JS CLI through Node and preserve literal arguments.
        const args = ['run', script, '--workspaces=false'];
        const executable = process.platform === 'win32' ? process.execPath : 'npm';
        if (process.platform === 'win32') args.unshift(process.env.npm_execpath ?? path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js'));
        execFileSync(executable, args, {
          cwd,
          stdio: 'inherit',
          shell: false,
        });
      }
      prepared = true;
    },
  };
}
