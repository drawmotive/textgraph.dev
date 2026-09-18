let codec;

// Load once on demand: raw decoding needs no WASM, and the homepage
// receives precomputed links so compression never blocks its hydration.
function loadCodec() {
  return codec ??= import('@hpcc-js/wasm-zstd').then(({ Zstd }) => Zstd.load()).catch(error => {
    codec = undefined;
    throw error;
  });
}

function toBase64Url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function fromBase64Url(payload) {
  if (!/^[A-Za-z0-9_-]*$/.test(payload) || payload.length % 4 === 1) throw new Error('Invalid Base64URL');
  const padded = payload.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(payload.length / 4) * 4, '=');
  const bytes = Uint8Array.from(atob(padded), character => character.charCodeAt(0));
  // Reject nonzero unused bits instead of accepting several encodings of a value.
  if (toBase64Url(bytes) !== payload) throw new Error('Noncanonical Base64URL');
  return bytes;
}

/** Own the share protocol: compare both complete URL-safe candidates for every
 * source, with no size threshold. Equal lengths prefer raw to avoid decoding work. */
export async function createSourceLink(href, source) {
  const bytes = new TextEncoder().encode(source);
  const raw = '0.' + toBase64Url(bytes);
  const zstd = await loadCodec();
  // Omit the level argument to use Zstandard's default compression level.
  const compressed = '1.' + toBase64Url(zstd.compress(bytes));
  const url = new URL(href);
  url.searchParams.set('d', compressed.length < raw.length ? compressed : raw);
  url.hash = '';
  return url.href;
}

/** Read only the versioned query protocol. Null means no usable source; an empty
 * string means a shared blank editor. Corrupt data never produces lossy text. */
export async function readSourceLink(href) {
  try {
    const data = new URL(href).searchParams.get('d');
    if (data === null || !/^[01][.]/.test(data)) return null;
    let bytes = fromBase64Url(data.slice(2));
    if (data[0] === '1') {
      if (!bytes.length) return null;
      bytes = (await loadCodec()).decompress(bytes);
    }
    // Preserve a literal leading BOM along with all other source characters.
    return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
  } catch {
    return null;
  }
}
