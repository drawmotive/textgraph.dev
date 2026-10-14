/** Analytics owns a production origin backed by the local preview server. Close
 * each proxy connection from the first request so idle server socket expiry
 * cannot invalidate the next navigation in a long browser journey. */
export async function productionSite(page, { origin = "http://127.0.0.1:4175" } = {}) {
  await page.route("https://textgraph.dev/**", async route => {
    const url = new URL(route.request().url());
    const response = await route.fetch({ url: origin + url.pathname + url.search, headers: { ...route.request().headers(), connection: "close" } });
    await route.fulfill({ response });
  });
  // Intercept Google traffic so verification never changes the real property.
  await page.route(/https:\/\/[^/]*(google|doubleclick)[^/]*\//, route => route.fulfill({
    contentType: "text/javascript", body: "",
  }));
}
