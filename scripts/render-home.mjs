import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { initializeTextGraph } from '@drawmotive/textgraph/node';
import { homeExamples, playgroundLink } from '../.vitepress/home/examples.mjs';

// Generate actual product output before Vite resolves homepage image imports.
// No renderer or runtime assets enter the homepage's browser dependency graph.
const directory = new URL('../.vitepress/home/generated/', import.meta.url);
await mkdir(directory, { recursive: true });
const runtime = await initializeTextGraph();
try {
  const imports = [];
  const links = {};
  const entries = [];
  for (const [index, example] of homeExamples.entries()) {
    links[example.id] = await playgroundLink(example);
    const result = await runtime.renderPng(example.source, { scale: 2, padding: 24 });
    if (!result.success) throw new Error('Homepage example failed: ' + example.id + ': ' + JSON.stringify(result.diagnostics));
    await writeFile(new URL(example.id + '.png', directory), result.png);
    imports.push('import image' + index + ' from "./' + example.id + '.png";');
    entries.push(JSON.stringify(example.id) + ': { src: image' + index + ', width: ' + result.width + ', height: ' + result.height + ' }');
  }
  await writeFile(new URL('images.mjs', directory), imports.join('\n') + '\nexport default {\n' + entries.join(',\n') + '\n};\n');
  await writeFile(new URL('links.json', directory), JSON.stringify(links, null, 2) + '\n');
  console.log('Rendered ' + homeExamples.length + ' homepage examples to ' + fileURLToPath(directory));
} finally { await runtime.dispose(); }
