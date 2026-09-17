import { createSourceLink } from '../playground/source-link.mjs';

// One source owns the visible code, generated output, playground link, and
// analytics identity. Keep examples runnable with the currently shipped SDK.
// Architecture arrows show request direction, with responses omitted. The
// balancer chooses one replica per request; both replicas access shared storage.
const relationships = 'browser -> lb\nlb -> app1 -> database\nlb -> app2 -> database';
const balancer = 'lb(fill primary): Load balancer';
const replicas = 'app1: App server 1\napp2: App server 2';
const request = relationships + '\n\n' + balancer + '\n' + replicas;

export const homeExamples = [
  { id: 'request-flow', title: 'A load-balanced web app', source: request,
    alt: 'A browser sends requests to a load balancer, which routes each request to one of two application replicas sharing a database. Responses are omitted.' },
  { id: 'relationships', title: 'Connect the pieces', source: relationships,
    alt: 'A browser connects to lb, which routes requests to app1 or app2; both application replicas access the same database.' },
  { id: 'labels', title: 'Add useful detail', source: request,
    alt: 'The load balancer is highlighted and the two application replicas are labeled App server 1 and App server 2. Both access a shared database.' },
  { id: 'service-boundary', title: 'Group the application tier',
    source: relationships + '\n\n' + balancer + '\nservers {\n  app1: App server 1\n  app2: App server 2\n}',
    alt: 'Two application replicas are grouped inside a servers boundary, between an external load balancer and a shared database. Arrows show request direction.' },
  { id: 'cache-flow', title: 'Make room for a cache',
    source: request + '\n\napp1 -> cache\napp2 -> cache',
    alt: 'A load balancer routes requests to two application replicas. Both replicas access the shared database and a shared cache.' },
  { id: 'release-process', title: 'From commit to release',
    source: 'commit -> tests -> release\ncommit -> review -> release\n\ntests: Run tests\nreview: Code review\nrelease(fill primary): Publish package',
    alt: 'A commit starts automated tests and code review. Publishing the package requires passing tests and an approved review. Arrows show prerequisites.' },
  { id: 'dependencies', title: 'A shared client library',
    source: 'web -> client -> transport\ncli -> client\n\nweb: Web app\ncli: Admin CLI\nclient(fill primary): API client\ntransport: HTTP transport',
    alt: 'A Web app and an Admin CLI both depend on an API client library, which depends on an HTTP transport. Arrows point from each consumer to its dependency.' },
];

export const examplesById = Object.fromEntries(homeExamples.map(example => [example.id, example]));

// The shared URL encoder preserves exactly what visitors saw, including
// line breaks, rather than relying on a separate playground template.
export async function playgroundLink(example) {
  const url = new URL(await createSourceLink('https://textgraph.dev/playground', example.source));
  return url.pathname + url.search;
}
