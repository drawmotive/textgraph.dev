import { createHash } from 'node:crypto';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { x as extract } from 'tar';

const siteRoot = fileURLToPath(new URL('../', import.meta.url));

/** Host the exact reviewed package on this site's origin. HTML iframe runtimes
 * cannot rely on npm CDNs serving executable HTML. The optional local tarball
 * uses the same integrity check as the registry download before first release. */
export async function prepareEditor(root = siteRoot) {
  const release = JSON.parse(await readFile(path.join(root, '.vitepress/editor-release.json'), 'utf8'));
  const cache = path.join(root, 'node_modules/.cache/editor-release');
  await mkdir(cache, { recursive: true });
  const archive = path.join(cache, 'editor-' + release.version + '.tgz');
  let bytes;
  if (process.env.DRAWMOTIVE_EDITOR_TARBALL) bytes = await readFile(process.env.DRAWMOTIVE_EDITOR_TARBALL);
  else {
    try { bytes = await readFile(archive); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (!bytes) {
      const response = await fetch(release.url);
      if (!response.ok) throw new Error('Editor package ' + release.version + ' is not available (HTTP ' + response.status + '). Publish the verified package first; for local review set DRAWMOTIVE_EDITOR_TARBALL.');
      bytes = Buffer.from(await response.arrayBuffer());
    }
  }
  if ('sha512-' + createHash('sha512').update(bytes).digest('base64') !== release.integrity) {
    throw new Error('Editor archive integrity mismatch; use the reviewed release artifact');
  }
  await writeFile(archive, bytes);
  const temporary = await mkdtemp(path.join(cache, 'extract-'));
  try {
    await extract({
      file: archive, cwd: temporary, strict: true,
      filter(name, entry) {
        if (name.split('/').some(part => part === '..' || part === '.') || !name.startsWith('package/')) throw new Error('Unsafe editor archive path');
        if (!['File', 'Directory'].includes(entry.type)) throw new Error('Editor archive must not contain links');
        return name === 'package/package.json' || name === 'package/LICENSE' || name.startsWith('package/licenses/') || name.startsWith('package/src/') || name.startsWith('package/generated/') || name.startsWith('package/examples/browser/');
      },
    });
    const pkg = path.join(temporary, 'package');
    const identity = JSON.parse(await readFile(path.join(pkg, 'package.json'), 'utf8'));
    const manifest = JSON.parse(await readFile(path.join(pkg, 'generated/editor-manifest.json'), 'utf8'));
    if (identity.name !== '@drawmotive/editor' || identity.version !== release.version || manifest.packageVersion !== release.version || manifest.protocolVersion !== 1) throw new Error('Editor release identity mismatch');
    const destination = path.join(root, 'public/examples/editor');
    await rm(destination, { recursive: true, force: true });
    await mkdir(destination, { recursive: true });
    for (const asset of manifest.assets) {
      if (!asset.path.startsWith('editor/') || asset.path.split('/').some(part => !part || part === '.' || part === '..')) throw new Error('Unsafe editor manifest path');
      const content = await readFile(path.join(pkg, 'generated', asset.path));
      if (content.length !== asset.bytes || createHash('sha256').update(content).digest('hex') !== asset.sha256) throw new Error('Editor runtime integrity mismatch: ' + asset.path);
      const target = path.join(destination, 'runtime', asset.path.slice('editor/'.length));
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, content);
    }
    await cp(path.join(pkg, 'src'), path.join(destination, 'sdk'), { recursive: true });
    await cp(path.join(pkg, 'examples/browser'), destination, { recursive: true });
    await cp(path.join(pkg, 'LICENSE'), path.join(destination, 'LICENSE'));
    await cp(path.join(pkg, 'licenses'), path.join(destination, 'licenses'), { recursive: true });
    const index = path.join(destination, 'index.html');
    const html = await readFile(index, 'utf8');
    if (!html.includes('../../src/index.js')) throw new Error('Unknown editor sample import map');
    await writeFile(index, html.replace('../../src/index.js', './sdk/index.js'));
    const main = path.join(destination, 'main.js');
    const script = await readFile(main, 'utf8');
    if (!script.includes('../../generated/editor/')) throw new Error('Unknown editor sample runtime URL');
    await writeFile(main, script.replace('../../generated/editor/', './runtime/'));
  } finally { await rm(temporary, { recursive: true, force: true }); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await prepareEditor();
