import { createServer } from 'node:http';
import { createServer as createSecureServer } from 'node:https';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { brotliCompress, constants } from 'node:zlib';
import { compressFont, fontCompression, fontHash, readFontBrotliManifest, readStoredFont } from './font-brotli.mjs';

const compress = promisify(brotliCompress);
const marker = '# DrawMotive site Brotli';
const binaryTypes = { '.wasm': 'application/wasm', '.dll': 'application/octet-stream', '.ttf': 'font/ttf', '.otf': 'font/otf' };
const textTypes = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.txt': 'text/plain' };

async function filesIn(current) {
  const files = [];
  for (const entry of (await readdir(current, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    const file = path.join(current, entry.name);
    if (entry.isDirectory()) files.push(...await filesIn(file));
    else if (entry.isFile()) files.push(file);
    else throw new Error('Site output must contain regular files: ' + file);
  }
  return files;
}

/** Encode only final website output. SDK files and their decoded-byte manifests
 * remain untouched; browser HTTP decoding preserves those integrity checks. */
export async function prepareSiteBrotli(directory, { fontsDirectory, cacheDirectory } = {}) {
  directory = path.resolve(directory);
  const headersFile = path.join(directory, '_headers');
  let headers = '';
  try { headers = await readFile(headersFile, 'utf8'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (headers.includes(marker)) throw new Error('Site is already Brotli encoded; rebuild fresh output before preparing it again.');
  const stored = fontsDirectory ? await readFontBrotliManifest(fontsDirectory) : undefined;
  if (fontsDirectory && !stored) throw new Error('Stored font Brotli files are missing; run npm run static:manifest.');
  let cache;
  try { cache = cacheDirectory ? await readFontBrotliManifest(cacheDirectory) : undefined; }
  catch (error) { if (!/metadata/.test(error.message)) throw error; }
  cache ??= { schemaVersion: 1, compression: fontCompression, fonts: {} };
  const fontBytes = new Map();
  let cacheChanged = false;
  let count = 0, rawBytes = 0, compressedBytes = 0, reusedFonts = 0;
  for (const file of await filesIn(directory)) {
    if (!binaryTypes[path.extname(file)]) continue;
    const raw = await readFile(file);
    let encoded;
    if (path.extname(file) === '.ttf') {
      const name = path.basename(file), hash = fontHash(raw);
      const source = stored?.fonts[name];
      if (stored && !source) {
        try { await readFile(path.join(fontsDirectory, name)); throw new Error('Stored font metadata is missing: ' + name + '; run npm run static:manifest.'); }
        catch (error) { if (error.code !== 'ENOENT') throw error; }
      }
      if (source) {
        if (source.bytes !== raw.length || source.sha256 !== hash) throw new Error('Stored font source changed: ' + name + '; run npm run static:manifest.');
        encoded = await readStoredFont(fontsDirectory, name, source);
        reusedFonts++;
      } else if (fontBytes.has(hash)) {
        encoded = fontBytes.get(hash);
        reusedFonts++;
      } else {
        const cachedName = hash + '.ttf', entry = cache.fonts[cachedName];
        if (cacheDirectory && entry) {
          try { encoded = await readStoredFont(cacheDirectory, cachedName, entry); reusedFonts++; }
          catch (error) { if (error.code !== 'ENOENT' && !/integrity mismatch/.test(error.message)) throw error; }
        }
        if (!encoded) {
          encoded = await compressFont(raw);
          if (cacheDirectory) {
            await mkdir(cacheDirectory, { recursive: true });
            await writeFile(path.join(cacheDirectory, cachedName + '.br'), encoded);
            cache.fonts[cachedName] = { sha256: hash, bytes: raw.length, compressedSha256: fontHash(encoded), compressedBytes: encoded.length };
            cacheChanged = true;
          }
        }
        fontBytes.set(hash, encoded);
      }
    } else encoded = await compress(raw, { params: { [constants.BROTLI_PARAM_QUALITY]: 6 } });
    await writeFile(file, encoded);
    count++; rawBytes += raw.length; compressedBytes += encoded.length;
    // The site loads original URLs. Remove superseded build sidecars so the
    // deployed binary has one representation. SDK input is untouched.
    for (const suffix of ['.br', '.gz']) await rm(file + suffix, { force: true });
  }
  if (cacheChanged) await writeFile(path.join(cacheDirectory, 'files.brotli.json'), JSON.stringify(cache, null, 2) + '\n');
  // Cloudflare Pages reads one deployment-root _headers file. Original URLs
  // carry br representations; SDK consumers never need .br URLs or host rules.
  // Stable SDK asset names require revalidation rather than immutable caching.
  const rules = Object.entries(binaryTypes).map(([extension, type]) =>
    `/*${extension}\n  Content-Type: ${type}\n  Content-Encoding: br\n  Cache-Control: public, max-age=0, must-revalidate, no-transform\n`).join('\n');
  await writeFile(headersFile, headers.trimEnd() + '\n\n' + marker + '\n' + rules);
  return { count, rawBytes, compressedBytes, quality: 6, fontQuality: 11, reusedFonts };
}

/** Preview the same encoded disk bytes and HTTP headers used by Cloudflare.
 * VitePress preview ignores _headers, which would expose compressed bytes to
 * WASM/TTF consumers. No package or public source directory is transformed. */
export async function previewSite({ directory, host = '127.0.0.1', port = 4173, base = '/', tls, spa = false, cors = false }) {
  directory = path.resolve(directory);
  let encoded = false;
  try { encoded = (await readFile(path.join(directory, '_headers'), 'utf8')).includes(marker); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const basePath = '/' + base.replace(/^\/+|\/+$/g, '');
  const prefix = basePath === '/' ? '/' : basePath + '/';
  const handler = async (request, response) => {
    try {
      let pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      if (!pathname.startsWith(prefix)) { response.writeHead(404); response.end(); return; }
      pathname = pathname.slice(prefix.length);
      const target = path.resolve(directory, pathname);
      if (target !== directory && !target.startsWith(directory + path.sep)) throw new Error('Invalid site path');
      const candidates = pathname.endsWith('/') || !pathname ? [path.join(target, 'index.html')]
        : path.extname(target) ? [target] : [target + '.html', path.join(target, 'index.html')];
      if (spa && !path.extname(target)) candidates.push(path.join(directory, 'index.html'));
      let bytes, file;
      for (const candidate of candidates) {
        try { bytes = await readFile(candidate); file = candidate; break; }
        catch (error) { if (!['ENOENT', 'EISDIR', 'ENOTDIR'].includes(error.code)) throw error; }
      }
      if (!file) { response.writeHead(404); response.end(); return; }
      const extension = path.extname(file);
      response.setHeader('Content-Type', binaryTypes[extension] ?? textTypes[extension] ?? 'application/octet-stream');
      response.setHeader('Cache-Control', 'no-cache, no-transform');
      if (cors) response.setHeader('Access-Control-Allow-Origin', '*');
      if (encoded && binaryTypes[extension]) response.setHeader('Content-Encoding', 'br');
      response.writeHead(200);
      response.end(request.method === 'HEAD' ? undefined : bytes);
    } catch { response.writeHead(500); response.end('Site resource unavailable'); }
  };
  const server = tls ? createSecureServer(tls, handler) : createServer(handler);
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, host, resolve); });
  return { url: `${tls ? 'https' : 'http'}://${host}:${server.address().port}${prefix}`, close: () => new Promise(resolve => server.close(resolve)) };
}
