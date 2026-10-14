import { createServer } from 'node:http';
import { once } from 'node:events';
import { test, expect } from '@playwright/test';
import { productionSite } from './support/production-site.mjs';

test('production-origin proxy closes each local connection from the first request', async ({ page }) => {
  const requests = [];
  const server = createServer((request, response) => {
    requests.push({ connection: request.headers.connection, socket: request.socket, url: request.url });
    response.setHeader('content-type', 'text/html');
    response.end('<h1>Local production origin</h1>');
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    await productionSite(page, { origin: 'http://127.0.0.1:' + server.address().port });
    await page.goto('https://textgraph.dev/first?source=private');
    await expect(page.getByRole('heading')).toHaveText('Local production origin');
    const first = requests.find(request => request.url.startsWith('/first'));
    expect(first.connection).toBe('close');
    if (!first.socket.destroyed) await once(first.socket, 'close');
    await page.goto('https://textgraph.dev/second');
    await expect(page.getByRole('heading')).toHaveText('Local production origin');
    const second = requests.find(request => request.url === '/second');
    expect(second.connection).toBe('close');
    expect(second.socket).not.toBe(first.socket);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
