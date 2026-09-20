import { defineConfig } from 'vitepress'
import { withTextGraph } from '@drawmotive/markdown-it-textgraph/vitepress'
import { textgraphIssuesUrl } from './support.ts'
import { textgraphExamples } from './textgraph-examples.mjs'
import { siteAssets } from './site-assets.mjs'

export default defineConfig(withTextGraph({
  title: "TextGraph",
  description: "Turn relationships into diagrams with readable text. Explore flowcharts, automatic layout, and a browser playground, with Markdown and VS Code integrations.",
  // Drafts stay in source until their features work. Exclude them from both
  // generated routes and local search, including internal project documents.
  srcExclude: [
    'README.md', 'CLAUDE.md', 'docs/**', 'design/**',
    'diagrams/sequence.md', 'diagrams/mindmaps.md', 'slides/**',
    'integrations/cli.md', 'integrations/rest-api.md', 'integrations/ai-agents.md',
    'reference/config.md', 'reference/grammar.md', 'reference/themes.md',
  ],
  markdown: { config: textgraphExamples },
  vite: { plugins: [siteAssets()], worker: { format: 'es' } },
  themeConfig: {
    nav: [
      { text: 'Docs', link: '/intro/what-is-textgraph' },
      { text: 'Playground', link: '/playground' },
      { text: 'SDK demos', items: [
        { text: 'TextGraph renderer', link: '/examples/textgraph/', target: '_self' },
        { text: 'DrawMotive editor', link: '/examples/editor/', target: '_self' },
      ] },
      { text: 'Report an issue', link: textgraphIssuesUrl },
    ],

    // Teach the language, then its workflows, then application APIs. Runnable
    // SDK samples belong to their guides and the demos menu, not the chapter order.
    sidebar: [
      {
        text: 'Learn TextGraph',
        items: [
          { text: 'What is TextGraph?', link: '/intro/what-is-textgraph' },
          { text: 'Getting Started', link: '/intro/getting-started' },
          { text: 'Flowcharts', link: '/diagrams/flowcharts' },
        ]
      },
      {
        text: 'Use TextGraph',
        items: [
          { text: 'Choose your workflow', link: '/integrations/overview' },
          { text: 'Playground', link: '/playground' },
          { text: 'Markdown & VitePress', link: '/integrations/markdown' },
          { text: 'VS Code Extension', link: '/integrations/vscode' },
        ]
      },
      {
        text: 'Build applications',
        items: [
          { text: 'JavaScript / Node.js', link: '/integrations/javascript' },
          { text: 'DrawMotive editor', link: '/editor/' },
        ]
      },
      {
        text: 'Reference',
        items: [
          { text: 'Language Specification', link: '/reference/textgraph-spec' },
          { text: 'Style Classes', link: '/reference/classes' },
          { text: 'Syntax Reference', link: '/reference/syntax' },
          { text: 'Changelog', link: '/reference/changelog' },
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/drawmotive/textgraph' }
    ],

    footer: {
      message: `All TextGraph issues: <a href="${textgraphIssuesUrl}">report bugs, request features, or give feedback on GitHub</a>.`,
      copyright: 'Copyright © 2023-present drawmotive'
    },

    search: {
      provider: 'local'
    },

    outline: {
      level: [2, 3]
    }
  }
}, {
  // Published examples must render successfully.
  errorMode: 'throw',
}))
