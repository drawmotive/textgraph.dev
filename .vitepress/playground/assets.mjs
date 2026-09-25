/** The deployed package is the font authority. Resolve from the site base so
 * subpath hosting works, and expose broken deployments instead of using a CDN. */
export function playgroundAssets(baseUrl, origin) {
  const base = new URL(baseUrl, origin);
  return {
    resolveAsset: asset => new URL(
      `textgraph/${asset.path}`,
      base,
    ),
    fontAssets: {
      catalog: new URL('textgraph/fonts/font-catalog.json', base),
      fallback: false,
    },
  };
}
