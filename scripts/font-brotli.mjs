import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { brotliCompress, constants } from 'node:zlib';

const compress = promisify(brotliCompress);
export const fontCompression = Object.freeze({ quality: 11, mode: 'font', window: 24 });
export const fontHash = bytes => createHash('sha256').update(bytes).digest('hex');

/** Font bytes change rarely. Use the maximum standard window and quality at
 * the asset-generation boundary, never in the browser's download path. */
export function compressFont(bytes) {
  return compress(bytes, { params: {
    [constants.BROTLI_PARAM_QUALITY]: fontCompression.quality,
    [constants.BROTLI_PARAM_MODE]: constants.BROTLI_MODE_FONT,
    [constants.BROTLI_PARAM_LGWIN]: fontCompression.window,
  } });
}

/** Stored metadata binds the original font and encoded representation. A
 * changed codec policy invalidates the cache even when source bytes match. */
export async function readFontBrotliManifest(directory) {
  let manifest;
  try { manifest = JSON.parse(await readFile(path.join(directory, 'files.brotli.json'), 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return; throw error; }
  if (manifest.schemaVersion !== 1 || !Object.entries(fontCompression).every(([key, value]) => manifest.compression?.[key] === value) || !manifest.fonts || typeof manifest.fonts !== 'object')
    throw new Error('Font Brotli metadata is outdated; run npm run static:manifest.');
  for (const [name, entry] of Object.entries(manifest.fonts)) {
    if (path.basename(name) !== name || !name.toLowerCase().endsWith('.ttf') || !entry || !/^[a-f0-9]{64}$/.test(entry.sha256) || !/^[a-f0-9]{64}$/.test(entry.compressedSha256))
      throw new Error('Invalid font Brotli metadata: ' + name);
  }
  return manifest;
}

/** Verify before copying cached bytes into a site's original font URL. */
export async function readStoredFont(directory, name, entry) {
  const bytes = await readFile(path.join(directory, name + '.br'));
  if (bytes.length !== entry.compressedBytes || fontHash(bytes) !== entry.compressedSha256)
    throw new Error('Font Brotli integrity mismatch: ' + name + '; run npm run static:manifest.');
  return bytes;
}
