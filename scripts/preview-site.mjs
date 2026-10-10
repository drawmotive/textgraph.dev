import path from 'node:path';
import { resolveConfig } from 'vitepress';
import { previewSite } from './site-brotli.mjs';

const siteRoot = path.resolve(import.meta.dirname, '..');
const options = {};
for (let i = 2; i < process.argv.length; i++) {
  const flag = process.argv[i], value = process.argv[++i];
  if (!['--host', '--port', '--base'].includes(flag) || !value) throw new Error('Usage: npm run preview -- [--host HOST] [--port PORT] [--base /path/]');
  options[flag.slice(2)] = flag === '--port' ? Number(value) : value;
}
const config = await resolveConfig(siteRoot, 'serve', 'production');
const site = await previewSite({ directory: config.outDir, base: config.site.base, ...options });
console.log('Built site served at ' + site.url);
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, async () => { await site.close(); });
