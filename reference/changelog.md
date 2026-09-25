# Changelog

## 0.2.2-alpha.2

- Fix the Connection Types example by including the SDK correction for backward connections mixed with relation edges.
- Update the SDK, Markdown plugin, optional fonts and embedded editor to 0.2.2-alpha.2.
- Keep language fonts on demand and diagnostics in the console; Marketplace publication remains excluded.

## 0.2.2-alpha.1

- Preview SDK, Markdown plugin and optional font package share the exact version 0.2.2-alpha.1.
- Playground loads Chinese, Japanese and emoji fonts on demand and logs diagnostics in the browser console.
- Existing stable npm tags and Marketplace extensions remain at 0.2.1.

## 0.2.1

- React, Markdown, and VitePress PNG rendering now defaults to scale 1. Explicit higher scales remain supported.
- VitePress emits content-addressed PNG assets and preserves logical display dimensions when raster size is limited.
- The SDK, Markdown plugin, and Markdown VS Code extension use coordinated version 0.2.1.

## 0.2.0

- TextGraph SDK 0.2.0 renders empty and anonymous group endpoints and reports syntax errors without preventing later renders.
- The first public Markdown plugin renders diagrams as static PNG images in markdown-it and VitePress.
- The Markdown extension uses SDK 0.2.0 in VS Code's built-in preview, with installed-host verification on VS Code 1.101 and stable.
- This documentation site builds its diagrams with the published Markdown plugin and SDK.

Install the [SDK](https://www.npmjs.com/package/@drawmotive/textgraph), [Markdown plugin](https://www.npmjs.com/package/@drawmotive/markdown-it-textgraph), or [VS Code Markdown extension](https://marketplace.visualstudio.com/items?itemName=drawmotive.textgraph-markdown).
