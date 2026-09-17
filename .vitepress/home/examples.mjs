import { createSourceLink } from '../playground/source-link.mjs';

// One source owns the visible code, generated output, playground link, and
// analytics identity. Keep examples runnable with the currently shipped SDK.
const relationships = 'browser -> api -> database';
const details = 'api(fill primary): API Gateway';
const labels = relationships + '\n\n' + details;
const request = relationships + '\napi -> queue -> worker\n\n' + details;

export const homeExamples = [
  { id: 'request-flow', title: 'A request, with background work', source: request,
    alt: 'A browser connects to an API Gateway, which writes to a database and queues background work for a worker.' },
  { id: 'relationships', title: 'Connect the pieces', source: relationships,
    alt: 'Three connected nodes: browser to api to database.' },
  { id: 'labels', title: 'Add useful detail', source: labels,
    alt: 'A browser connects to a highlighted API Gateway, which connects to a database.' },
  { id: 'service-boundary', title: 'Show what belongs together',
    source: 'browser -> api\n\nbackend {\n  api -> db\n  api(fill primary): API Gateway\n  db: PostgreSQL\n}',
    alt: 'A browser connects to an API Gateway inside a backend group containing the gateway and its PostgreSQL database.' },
  { id: 'cache-flow', title: 'Make room for a cache',
    source: request + '\napi -> cache',
    alt: 'The API Gateway now also connects to a cache, alongside its database and queue leading to a background worker.' },
  { id: 'release-process', title: 'A release process',
    source: 'commit -> tests -> release\ncommit -> review -> release\n\ntests: Run tests\nreview: Code review\nrelease(fill primary): Publish package',
    alt: 'A commit branches into Run tests and Code review, which both lead to Publish package.' },
  { id: 'dependencies', title: 'A dependency map',
    source: 'web -> core -> storage\nworker -> core\n\nweb: Web app\ncore(fill primary): Shared core',
    alt: 'A Web app and a worker both depend on Shared core, which depends on storage.' },
];

export const examplesById = Object.fromEntries(homeExamples.map(example => [example.id, example]));

// The shared fragment encoder preserves exactly what visitors saw, including
// line breaks, rather than relying on a separate playground template.
export function playgroundLink(example) {
  const url = new URL(createSourceLink('https://textgraph.dev/playground', example.source));
  return url.pathname + url.hash;
}
