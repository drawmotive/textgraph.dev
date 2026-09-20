import { copyFile, mkdir } from 'node:fs/promises';

// Publish the canonical sources unchanged for AI tools and downloads. Copy at
// the existing asset boundary so direct VitePress builds cannot ship stale text.
const source = new URL('../reference/', import.meta.url);
const destination = new URL('../public/reference/', import.meta.url);
await mkdir(destination, { recursive: true });
for (const file of ['textgraph-spec.md', 'classes.md']) {
  await copyFile(new URL(file, source), new URL(file, destination));
}
