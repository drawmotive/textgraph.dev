# VS Code Extension

Install [TextGraph Markdown](https://marketplace.visualstudio.com/items?itemName=drawmotive.textgraph-markdown) in VS Code 1.101 or later. Version 0.2.1 bundles TextGraph SDK 0.2.1. The 0.2.2-alpha.2 preview is currently available through npm and this playground; no extension preview is published for this release.

Open a Markdown file containing a `textgraph` fenced block, then run **Markdown: Open Preview to the Side**. Diagrams render locally in the built-in preview and refresh as the source changes.

## Write on the left, preview on the right

The example below pairs a Markdown block with its real rendered output. In VS Code, the built-in Markdown preview displays the diagram beside your file.

```textgraph example markdown
write -> preview -> revise
preview(fill primary): See the diagram
```

Change a label or add an arrow in the file; the preview refreshes. This is a preview of the text, so changes are made in the Markdown file. For editing shapes directly, use the [DrawMotive editor](/editor/).

In Restricted Mode, diagrams remain source code until the workspace is trusted. Invalid syntax appears as an error next to the source; correcting it lets rendering resume.

When the file is ready to publish, use the [Markdown & VitePress plugin](/integrations/markdown) to render the same fenced blocks on your site.
