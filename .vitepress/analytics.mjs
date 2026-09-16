export const measurementId = 'G-F3QNCLEDBC';
const storageKey = 'textgraph.analytics.session';
const sessionTimeout = 30 * 60 * 1000;
const homepageVersion = 'original';
const placements = ['hero', 'navigation', 'content', 'footer'];
const examples = ['default', 'request-flow'];

// Source links and arbitrary query values are never analytics dimensions.
export function safePageUrl(href) {
  try {
    const url = new URL(href);
    if (!['https:', 'http:'].includes(url.protocol)) return '';
    return url.origin + (url.pathname.replace(/\.html$/, '').replace(/\/$/, '') || '/');
  } catch { return ''; }
}

function pageContext(href, referrer = '') {
  return { page_location: safePageUrl(href), page_referrer: safePageUrl(referrer), page_title: 'TextGraph' };
}

// Set defaults before config so automatic engagement events also inherit safe
// page metadata. Config-scoped page fields would override subsequent SPA sets.
export function configureGoogleTag(gtag, href, referrer) {
  gtag('js', new Date());
  gtag('set', pageContext(href, referrer));
  gtag('config', measurementId, {
    send_page_view: false,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  });
}

// A tab-local, inactivity-bounded journey preserves attribution across reloads.
// GA's own session dimension remains the authority for cross-tab session counts.
// Only categorical state is persisted; source comparisons remain in memory.
export function createAnalytics({ send = () => {}, storage, now = Date.now } = {}) {
  let session;
  let context = pageContext('');
  function activeSession() {
    if (!session) {
      try { session = JSON.parse(storage?.getItem(storageKey) ?? 'null'); } catch { /* Storage may be blocked. */ }
    }
    if (!session || !Number.isFinite(session.last) || now() - session.last >= sessionTimeout) session = {};
    session.last = now();
    return session;
  }
  function save() {
    try { storage?.setItem(storageKey, JSON.stringify(session)); } catch { /* Analytics must remain optional. */ }
  }
  function emit(name, properties = {}) {
    const current = activeSession();
    const entry = ['direct', ...placements.map(value => 'home_' + value)].includes(current.entry) ? current.entry : 'direct';
    const example = examples.includes(current.example) ? current.example : 'default';
    try {
      send(name, { ...context, homepage_version: homepageVersion, homepage_seen: current.home === true,
        entry_point: entry, example_id: example, ...properties });
    } catch { /* A blocked analytics service must never interrupt the editor. */ }
    save();
  }
  function once(key, name) {
    const current = activeSession();
    if (current[key]) { save(); return; }
    current[key] = true;
    emit(name);
  }
  return {
    page(href, referrer) {
      const location = safePageUrl(href);
      if (!location || location === context.page_location) return;
      context = pageContext(location, context.page_location || referrer);
      const current = activeSession();
      const pathname = new URL(location).pathname;
      if (pathname === '/') current.home = true;
      if (pathname === '/playground') {
        current.entry = current.pendingEntry ?? current.entry ?? 'direct';
        current.example = current.pendingExample ?? current.example ?? 'default';
        delete current.pendingEntry;
        delete current.pendingExample;
      } else {
        delete current.pendingEntry;
        delete current.pendingExample;
      }
      emit('page_view');
      if (pathname === '/') once('homeReported', 'homepage_viewed');
      if (pathname === '/playground') emit('playground_opened');
    },
    openPlayground({ placement = 'content', example = 'default' } = {}) {
      if (!context.page_location || new URL(context.page_location).pathname !== '/') return;
      const current = activeSession();
      const safePlacement = placements.includes(placement) ? placement : 'content';
      const safeExample = examples.includes(example) ? example : 'default';
      current.pendingEntry = 'home_' + safePlacement;
      current.pendingExample = safeExample;
      emit('example_opened', { cta_location: safePlacement, example_id: safeExample });
    },
    preview() { emit('preview_ready'); },
    created() {
      once('created', 'diagram_created');
      if (activeSession().home) once('homeActivated', 'homepage_activated');
    },
    action(action, currentPreview) {
      if (!['copy_link', 'copy_image', 'download_png'].includes(action)) return;
      emit('diagram_action', { action_type: action, current_preview: currentPreview === true });
    },
    integration(path) {
      const integration = path.replace(/\.html$/, '').match(/^\/integrations\/(markdown|vscode|javascript|cli|rest-api|ai-agents|overview)$/)?.[1];
      if (integration) emit('integration_opened', { integration });
    },
    failure(category) {
      if (['runtime', 'source'].includes(category)) emit('render_failed', { error_category: category });
    },
  };
}

// The renderer publishes success only for its current revision. Restores (URL,
// Back, initial example) establish a baseline; only editor input can activate it.
export function createPlaygroundAnalytics(analytics) {
  let baseline = '';
  let edited = false;
  let previewReported = false;
  let reportedFailure;
  return {
    restore(source) { baseline = source.trim(); edited = false; },
    edit(source, { composing = false } = {}) {
      // Composition does not enter the renderer until committed. An older
      // in-flight result must not activate the unrendered composition text.
      edited = !composing && Boolean(source.trim()) && source.trim() !== baseline;
    },
    render(state) {
      if (state.status === 'error') {
        const category = state.diagnostics?.some(d =>
          ['RENDERER_FAILED', 'RUNTIME_FAILED', 'INVALID_RESPONSE', 'RENDER_FAILED'].includes(d.code)) ? 'runtime' : 'source';
        if (reportedFailure !== category) analytics.failure(category);
        reportedFailure = category;
        return;
      }
      if (state.status !== 'ready' || state.stale || !state.result?.success) return;
      reportedFailure = undefined;
      if (!previewReported) { analytics.preview(); previewReported = true; }
      if (edited) analytics.created();
    },
  };
}
