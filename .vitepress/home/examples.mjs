import { createSourceLink } from '../playground/source-link.mjs';

// One source owns the visible code, generated output, playground link, and
// analytics identity. Keep examples runnable with the currently shipped SDK.
const relationships = 'browser -> api -> database';
const labels = relationships + '\n\nbrowser: Browser\napi: API Gateway\ndatabase: Database';
const request = 'browser -> api -> database\n\nbrowser: Browser\napi(fill primary): API Gateway\ndatabase: Database';

export const homeExamples = [
  { id: 'request-flow', title: 'A request, made visible', source: request,
    alt: 'Browser connects to an API Gateway, which connects to a Database.' },
  { id: 'relationships', title: 'Connect the pieces', source: relationships,
    alt: 'Three connected nodes: browser to api to database.' },
  { id: 'labels', title: 'Give them meaning', source: labels,
    alt: 'The same three nodes labeled Browser, API Gateway, and Database.' },
  { id: 'service-boundary', title: 'Show what belongs together',
    source: 'browser -> backend.api\n\nbrowser: Browser\nbackend {\n  api -> database\n  api: API Gateway\n  database: Database\n}',
    alt: 'Browser connects to an API Gateway inside a backend group containing the gateway and database.' },
  { id: 'cache-flow', title: 'Make room for a cache',
    source: request + '\napi -> cache\ncache: Cache',
    alt: 'Browser connects to the API Gateway, which now branches to a Database and a Cache.' },
  { id: 'release-process', title: 'A release process',
    source: 'commit -> tests -> release\n\ncommit: Commit\ntests: Run tests\nrelease(fill primary): Release',
    alt: 'A release process progresses from Commit through Run tests to Release.' },
  { id: 'dependencies', title: 'A dependency map',
    source: 'web -> core\nworker -> core\ncore -> storage\n\nweb: Web app\nworker: Worker\ncore(fill primary): Shared core\nstorage: Storage',
    alt: 'Web app and Worker both depend on Shared core, which depends on Storage.' },
];

export const examplesById = Object.fromEntries(homeExamples.map(example => [example.id, example]));

// The shared fragment encoder preserves exactly what visitors saw, including
// line breaks, rather than relying on a separate playground template.
export function playgroundLink(example) {
  const url = new URL(createSourceLink('https://textgraph.dev/playground', example.source));
  return url.pathname + url.hash;
}
