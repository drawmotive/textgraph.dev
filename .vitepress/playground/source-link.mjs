// The fragment carries editor text verbatim, including empty or invalid DSL.
// It stays client-side and does not change the site's path or query parameters.
export function createSourceLink(href, source) {
  const url = new URL(href);
  url.hash = 'source=' + encodeURIComponent(source);
  return url.href;
}

// Null means no usable source was supplied; an empty string is a shared blank editor.
export function readSourceLink(href) {
  const hash = new URL(href).hash;
  if (!hash.startsWith('#source=')) return null;
  try {
    return decodeURIComponent(hash.slice('#source='.length));
  } catch {
    return null;
  }
}
