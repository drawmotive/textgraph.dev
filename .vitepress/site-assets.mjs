import { execFileSync } from 'node:child_process';
import { readFileSync, realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

/** A registry build must match its declaration; local development instead
 * requires the exact SDK selected by the repository's dependency session. */
export function verifySiteRenderer(cwd, localSdk = process.env.DRAWMOTIVE_TEXTGRAPH_SDK) {
  const readJson = file => JSON.parse(readFileSync(file, 'utf8'));
  const expected = readJson(path.join(cwd, 'package.json')).devDependencies['@drawmotive/textgraph'];
  const entry = createRequire(path.join(cwd, 'package.json')).resolve('@drawmotive/textgraph/worker');
  const sdk = path.resolve(path.dirname(entry), '../..');
  if (localSdk) {
    if (realpathSync(sdk) !== realpathSync(localSdk)) throw new Error('The site must resolve the selected local TextGraph SDK.');
    return;
  }
  const installed = readJson(path.join(sdk, 'package.json')).version;
  if (installed !== expected) {
    throw new Error(`Installed TextGraph ${installed} does not match ${expected}; run npm ci before building the site.`);
  }
}

/** Prepare required files at the Vite boundary, including direct CLI builds
 * that bypass npm lifecycle hooks. Complete before imports/public files are read. */
export function siteAssets(cwd = fileURLToPath(new URL('../', import.meta.url))) {
  let prepared = false;
  return {
    name: 'textgraph-site-assets',
    config() {
      // VitePress configures client and SSR bundles separately. They share the
      // same inputs, so render/copy once per site invocation, not per bundle.
      if (prepared) return;
      // The Worker bundle and copied runtime must use the declared SDK. An old
      // node_modules tree can otherwise silently restore serial WASM loading.
      verifySiteRenderer(cwd);
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
