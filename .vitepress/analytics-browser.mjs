import { configureGoogleTag, createAnalytics, measurementId, safePageUrl } from './analytics.mjs';

let analytics;

// Only the public production host collects metrics. Local builds, previews and
// automated tests on localhost must not generate traffic in the GA property.
export function getAnalytics() {
  if (analytics) return analytics;
  if (typeof window === 'undefined') return createAnalytics();
  const enabled = import.meta.env.PROD && window.location.hostname === 'textgraph.dev';
  let storage;
  try { storage = window.sessionStorage; } catch { /* Fall back to in-memory attribution. */ }
  if (enabled) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    configureGoogleTag(window.gtag, window.location.href, document.referrer);
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + measurementId;
    document.head.appendChild(script);
  }
  analytics = createAnalytics({ storage, send(name, properties) {
    if (!enabled) return;
    const { page_location, page_referrer, page_title } = properties;
    window.gtag('set', { page_location, page_referrer, page_title });
    window.gtag('event', name, properties);
  } });
  return analytics;
}

// VitePress navigation is client-side. Observe resolved routes, not history
// writes: editor sharing updates the hash frequently without visiting a page.
export function installAnalytics(router) {
  const tracker = getAnalytics();
  const page = () => tracker.page(window.location.href, document.referrer);
  const previous = router.onAfterRouteChange;
  router.onAfterRouteChange = async (...args) => { await previous?.(...args); page(); };
  page();
  document.addEventListener('click', event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target?.closest?.('a[href]');
    if (!link || link.target === '_blank') return;
    const destination = new URL(link.href, window.location.href);
    if (destination.origin !== window.location.origin) return;
    const path = new URL(safePageUrl(destination.href)).pathname;
    // The router's window capture listener can push the destination before
    // this document listener runs. Attribution uses the last displayed page.
    if (path === '/playground') {
      const placement = link.closest('.VPHero') ? 'hero' : link.closest('header') ? 'navigation' : link.closest('footer') ? 'footer' : 'content';
      tracker.openPlayground({ placement, example: link.dataset.analyticsExample });
    }
    tracker.integration(path);
  }, { capture: true });
}
