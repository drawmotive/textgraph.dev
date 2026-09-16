import assert from 'node:assert/strict';
import test from 'node:test';
import { createAnalytics, createPlaygroundAnalytics, safePageUrl, configureGoogleTag } from '../.vitepress/analytics.mjs';
import { homeExamples } from '../.vitepress/home/examples.mjs';

function harness() {
  const events = [];
  const values = new Map();
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  let time = 1000;
  const options = { send: (name, properties) => events.push({ name, properties }), storage, now: () => time };
  return { events, options, analytics: createAnalytics(options), advance: ms => { time += ms; } };
}
const ready = { status: 'ready', stale: false, result: { success: true }, diagnostics: [] };

test('all published homepage examples keep their identity without sending DSL', () => {
  for (const example of homeExamples) {
    const { analytics, events } = harness();
    analytics.page('https://textgraph.dev/');
    analytics.openPlayground({ placement: 'hero', example: example.id });
    analytics.page('https://textgraph.dev/playground');
    assert.equal(events.at(-1).properties.example_id, example.id);
    assert.doesNotMatch(JSON.stringify(events), /source=| -> /);
  }
});

test('page reporting removes source fragments and queries and ignores edit history', () => {
  const { analytics, events } = harness();
  analytics.page('https://textgraph.dev/?secret=private#source=private', 'https://example.com/article?q=private#private');
  analytics.page('https://textgraph.dev/#source=other');
  analytics.page('https://textgraph.dev/playground.html?from=home#source=private');
  analytics.page('https://textgraph.dev/playground#source=edited');
  assert.deepEqual(events.map(e => e.name), ['page_view', 'homepage_viewed', 'page_view', 'playground_opened']);
  assert.equal(events[0].properties.page_location, 'https://textgraph.dev/');
  assert.equal(events[0].properties.page_referrer, 'https://example.com/article');
  assert.equal(events[2].properties.page_referrer, 'https://textgraph.dev/');
  assert.equal(events[3].properties.entry_point, 'direct');
  assert.doesNotMatch(JSON.stringify(events), /private|edited|source=|from=/);
  assert.equal(safePageUrl('not a URL'), '');
});

test('homepage attribution comes from an actual click, never from a shared query', () => {
  const { analytics, events, options } = harness();
  analytics.page('https://textgraph.dev/');
  analytics.openPlayground({ placement: 'hero', example: 'request-flow' });
  createAnalytics(options).page('https://textgraph.dev/playground#source=A');
  assert.equal(events.at(-1).properties.entry_point, 'home_hero');
  assert.equal(events.at(-1).properties.example_id, 'request-flow');
  createAnalytics(options).page('https://textgraph.dev/playground#source=B');
  assert.equal(events.at(-1).properties.entry_point, 'home_hero');
  const other = harness();
  other.analytics.page('https://textgraph.dev/playground?from=home#source=A');
  assert.equal(other.events.at(-1).properties.entry_point, 'direct');
  assert.equal(other.events.at(-1).properties.homepage_seen, false);
});

test('composition input suspends activation until a committed edit renders', () => {
  const { analytics, events } = harness();
  const diagram = createPlaygroundAnalytics(analytics);
  diagram.restore('A -> B');
  diagram.edit('A -> C', { composing: true });
  diagram.render(ready);
  assert.equal(events.filter(e => e.name === 'diagram_created').length, 0);
  diagram.edit('A -> C');
  diagram.render(ready);
  assert.equal(events.filter(e => e.name === 'diagram_created').length, 1);
});

test('renderer exceptions are runtime failures, not source syntax errors', () => {
  for (const code of ['RENDERER_FAILED', 'RUNTIME_FAILED', 'INVALID_RESPONSE', 'RENDER_FAILED']) {
    const { analytics, events } = harness();
    createPlaygroundAnalytics(analytics).render({ status: 'error', diagnostics: [{ code }] });
    assert.equal(events[0].properties.error_category, 'runtime');
  }
});

test('a runtime failure after a source error is still reported before recovery', () => {
  const { analytics, events } = harness();
  const diagram = createPlaygroundAnalytics(analytics);
  diagram.render({ status: 'error', diagnostics: [{ code: 'SYNTAX_ERROR' }] });
  diagram.render({ status: 'error', diagnostics: [{ code: 'RUNTIME_FAILED' }] });
  diagram.render({ status: 'error', diagnostics: [{ code: 'RUNTIME_FAILED' }] });
  assert.deepEqual(events.map(event => event.properties.error_category), ['source', 'runtime']);
});

test('activation requires a user edit with a current successful render, not a retained preview', () => {
  const { analytics, events } = harness();
  analytics.page('https://textgraph.dev/');
  analytics.page('https://textgraph.dev/playground');
  const diagram = createPlaygroundAnalytics(analytics);
  diagram.restore('A -> B');
  diagram.render(ready);
  diagram.edit('  A -> B\n');
  diagram.render(ready);
  diagram.edit('A ->');
  diagram.render({ ...ready, status: 'error', stale: true });
  diagram.render({ ...ready, status: 'rendering', stale: true });
  assert.equal(events.filter(e => e.name === 'diagram_created').length, 0);
  diagram.edit('A -> C');
  diagram.render(ready);
  diagram.render(ready);
  assert.equal(events.filter(e => e.name === 'preview_ready').length, 1);
  assert.equal(events.filter(e => e.name === 'diagram_created').length, 1);
  assert.equal(events.filter(e => e.name === 'homepage_activated').length, 1);
  assert.doesNotMatch(JSON.stringify(events), /A ->/);
});

test('restoring source is not editing and activation stays deduplicated across reloads', () => {
  const { analytics, events, options } = harness();
  analytics.page('https://textgraph.dev/playground');
  const diagram = createPlaygroundAnalytics(analytics);
  diagram.restore('A -> B');
  diagram.edit('A -> C');
  diagram.restore('X -> Y');
  diagram.render(ready);
  assert.equal(events.filter(e => e.name === 'diagram_created').length, 0);
  diagram.edit('X -> Z');
  diagram.render(ready);
  const reloaded = createPlaygroundAnalytics(createAnalytics(options));
  reloaded.restore('X -> Z');
  reloaded.edit('X -> W');
  reloaded.render(ready);
  assert.equal(events.filter(e => e.name === 'diagram_created').length, 1);
  assert.equal(events.filter(e => e.name === 'homepage_activated').length, 0);
});

test('inactivity expires attribution and blocked storage or analytics cannot break editing', () => {
  const { analytics, events, advance } = harness();
  analytics.page('https://textgraph.dev/');
  advance(31 * 60 * 1000);
  analytics.created();
  assert.equal(events.at(-1).name, 'diagram_created');
  assert.equal(events.at(-1).properties.homepage_seen, false);
  const unavailable = createAnalytics({ storage: { getItem() { throw Error(); }, setItem() { throw Error(); } }, send() { throw Error(); } });
  assert.doesNotThrow(() => { unavailable.page('https://textgraph.dev/'); unavailable.created(); unavailable.action('copy_link', false); });
});

test('ongoing successful edits preserve the active journey across a later reload', () => {
  const { analytics, options, events, advance } = harness();
  analytics.page('https://textgraph.dev/');
  analytics.openPlayground({ placement: 'hero' });
  analytics.page('https://textgraph.dev/playground');
  analytics.created();
  for (let minute = 0; minute < 31; minute++) { advance(60_000); analytics.created(); }
  const reloaded = createAnalytics(options);
  reloaded.page('https://textgraph.dev/playground');
  reloaded.created();
  assert.equal(events.filter(e => e.name === 'diagram_created').length, 1);
  assert.equal(events.at(-1).properties.entry_point, 'home_hero');
});

test('event allowlists exclude source text and error details', () => {
  const { analytics, events } = harness();
  analytics.page('https://textgraph.dev/');
  analytics.openPlayground({ placement: 'secret source', example: 'private data', source: 'A -> B' });
  analytics.action('copy_link', false);
  analytics.action('private data', true);
  analytics.failure('runtime', 'private error');
  assert.doesNotMatch(JSON.stringify(events), /private|secret|A -> B/);
  assert.equal(events.find(e => e.name === 'diagram_action').properties.current_preview, false);
});

test('Google tag sets sanitized defaults before config and disables automatic initial pageviews', () => {
  const commands = [];
  configureGoogleTag((...args) => commands.push(args), 'https://textgraph.dev/playground?q=private#source=private', 'https://example.com/?q=private');
  const config = commands.find(args => args[0] === 'config');
  assert.equal(config[1], 'G-F3QNCLEDBC');
  assert.equal(config[2].send_page_view, false);
  assert.equal(config[2].allow_google_signals, false);
  assert.equal(commands.find(args => args[0] === 'set')[1].page_location, 'https://textgraph.dev/playground');
  assert.doesNotMatch(JSON.stringify(commands), /private|source=/);
});
