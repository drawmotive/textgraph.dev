/** Expand teaching examples before rendering so the source and PNG share one DSL input.
 * VitePress owns source escaping/copy controls; withTextGraph owns diagram rendering.
 */
export function textgraphExamples(md) {
  md.core.ruler.push('textgraph_examples', state => {
    const html = content => Object.assign(new state.Token('html_block', '', 0), { content });
    state.tokens = state.tokens.flatMap(token => {
      const [language, ...metadata] = token.info.trim().split(/\s+/);
      if (token.type !== 'fence' || language !== 'textgraph' || !metadata.includes('example')) {
        return [token];
      }
      const source = Object.assign(new state.Token('fence', 'code', 0), token, { info: 'text' });
      return [
        html('<div class="textgraph-example">\n<div class="textgraph-example-source">\n<p class="textgraph-example-label">TextGraph source</p>\n'),
        source,
        html('</div>\n<div class="textgraph-example-preview">\n<p class="textgraph-example-label">Rendered diagram</p>\n'),
        token,
        html('<p class="textgraph-example-unavailable">Preview unavailable in the current renderer. The source remains available to copy.</p>\n</div>\n</div>\n'),
      ];
    });
  });
}
