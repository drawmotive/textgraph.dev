# Markdown and VitePress

TextGraph diagrams can be rendered when Markdown is built, so readers receive a static image. This page uses the Markdown plugin and the public TextGraph SDK.

```textgraph
A -> B
```

Write the diagram in a fenced block:

````markdown
```textgraph
A -> B
```
````

The `@drawmotive/markdown-it-textgraph` plugin is being prepared for its first public release. Its SDK dependency, `@drawmotive/textgraph@0.1.0-alpha.1`, is already available from npm. Until the plugin is published, the example below can be used with its local package tarball.

## VitePress

Use Node.js 22.12.0 or later and VitePress 2.0.0-alpha.19.

```typescript
import { defineConfig } from 'vitepress'
import { withTextGraph } from '@drawmotive/markdown-it-textgraph/vitepress'

export default defineConfig(withTextGraph({
  title: 'Documentation',
}))
```

Development displays syntax errors next to the source. Production builds fail on invalid diagrams. Images are embedded as PNG data URLs and remain visible without JavaScript; a custom content security policy must allow `img-src data:`.

## markdown-it

```javascript
import MarkdownIt from 'markdown-it'
import { createTextGraphMarkdown } from '@drawmotive/markdown-it-textgraph'

const md = new MarkdownIt()
const diagrams = createTextGraphMarkdown()
md.use(diagrams.markdownIt)
try {
  const html = await diagrams.render(md, '```textgraph\nA -> B\n```')
  console.log(html)
} finally {
  await diagrams.dispose()
}
```

Use the asynchronous entry to generate diagrams. A direct synchronous `md.render()` call preserves the original code block.
