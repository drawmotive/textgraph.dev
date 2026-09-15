# textgraph.dev

TextGraph DSL 的规范、教程、API 文档、Playground、示例和迁移指南。

> **[所有 TextGraph 问题统一提交到 GitHub Issues →](https://github.com/drawmotive/textgraph/issues)**
> 包括缺陷、功能建议、文档、Playground、SDK、字体、Markdown 和 VS Code 集成问题。

## 本地开发

```console
npm ci
npm test
npm run build
```

## 许可证

- 网站代码和代码示例使用 MIT 许可证，见 `LICENSE-CODE`。
- 文档内容使用 Creative Commons Attribution 4.0 International（CC BY 4.0），见 `LICENSE-DOCS`。
## Markdown rendering and deployment

The site installs `@drawmotive/markdown-it-textgraph@0.2.1` from npm, which renders diagrams with the public TextGraph SDK 0.2.1. A standalone checkout needs no sibling repositories.

Use a fenced block with language `textgraph` and metadata `example` to pair copyable source with its static diagram. The site expands the single source block into both panels; ordinary `textgraph` fences still show only the diagram. Examples stack on narrow screens. Known renderer limitations show an availability message beside the source, using the adapter's inline error mode.

Run `npm run build:release` to validate the coordinated version and installed registry dependencies before building. Cloudflare Pages project `textgraph-dev` deploys this repository's `main` branch to https://textgraph.dev; its output directory is `.vitepress/dist`.
