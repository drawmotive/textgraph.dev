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
  { id: 'request-flow', title: 'One line. A complete diagram.', source: 'web -> api -> database',
    alt: 'A web application connects to an API, which connects to a database. Three nodes and two arrows, generated from one line of TextGraph.' },
  { id: 'relationships', title: 'Connect the pieces', source: relationships,
    alt: 'A browser connects to lb, which routes requests to app1 or app2; both application replicas access the same database.' },
  { id: 'service-boundary', title: 'Group the application tier',
    source: 'backend(fill info) { api -> worker }\nweb -> backend.api\nbackend.worker -> database',
    alt: 'An API and Worker are grouped in a highlighted backend boundary. The web application connects to the API, and the Worker connects to an external database.' },
  { id: 'cache-flow', title: 'Make room for a cache',
    source: request + '\n\napp1 -> cache\napp2 -> cache',
    alt: 'A load balancer routes requests to two application replicas. Both replicas access the shared database and a shared cache.' },
  { id: 'release-process', title: 'A decision and a feedback loop',
    source: 'draft -> review\nreview -> publish : Yes\nreview -> draft : No\n\nreview(diamond fill primary): Approved?',
    alt: 'A draft goes to a diamond-shaped approval decision. Yes leads to publish, while No loops back to the draft.' },
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
