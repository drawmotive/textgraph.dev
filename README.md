# textgraph.dev

TextGraph DSL 的规范、教程、API 文档、Playground、示例和迁移指南。

## 本地开发

```console
npm ci
npm test
npm run build
```

## 许可证

- 网站代码和代码示例使用 MIT 许可证，见 `LICENSE-CODE`。
- 文档内容使用 Creative Commons Attribution 4.0 International（CC BY 4.0），见 `LICENSE-DOCS`。
# Markdown plugin development

The current Markdown integration depends on the sibling `integrations/markdown-textgraph` package in the DrawMotive development checkout until its first npm publication. Run `npm ci` from that checkout root, then `npm run build --workspace=@drawmotive/textgraph.dev`. The plugin renders with the published TextGraph SDK.
