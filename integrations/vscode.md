# VS Code Extension

Install [TextGraph Markdown](https://marketplace.visualstudio.com/items?itemName=drawmotive.textgraph-markdown) in VS Code 1.101 or later. Version 0.2.0 bundles TextGraph SDK 0.2.0.

Open a Markdown file containing a `textgraph` fenced block, then run **Markdown: Open Preview to the Side**. Diagrams render locally in the built-in preview and refresh as the source changes.

````markdown
```textgraph
A -> B
```
````

In Restricted Mode, diagrams remain source code until the workspace is trusted. Invalid syntax appears as an error next to the source; correcting it lets rendering resume.
