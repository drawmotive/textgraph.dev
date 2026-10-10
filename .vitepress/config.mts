import { defineConfig } from 'vitepress'
import { withTextGraph } from '@drawmotive/markdown-it-textgraph/vitepress'
import { textgraphIssuesUrl } from './support.ts'
import { textgraphExamples } from './textgraph-examples.mjs'
import { siteAssets } from './site-assets.mjs'
import { localRuntimeManifestPlugin } from './local-runtime.mjs'
import { prepareSiteBrotli } from '../scripts/site-brotli.mjs'

const localRuntime = () => process.env.DRAWMOTIVE_TEXTGRAPH_RUNTIME && process.env.DRAWMOTIVE_TEXTGRAPH_SDK
  ? localRuntimeManifestPlugin(process.env.DRAWMOTIVE_TEXTGRAPH_SDK, process.env.DRAWMOTIVE_TEXTGRAPH_RUNTIME) : null

export default defineConfig(withTextGraph({
  title: "TextGraph",
  description: "Turn relationships into diagrams with readable text. Explore flowcharts, automatic layout, and a browser playground, with Markdown and VS Code integrations.",
  // Drafts stay in source until their features work. Exclude them from both
  // generated routes and local search, including internal project documents.
  srcExclude: [
    'README.md', 'CLAUDE.md', 'docs/**', 'design/**',
    'CHANGELOG.md', 'CONTRIBUTING.md', 'SECURITY.md',
    'diagrams/sequence.md', 'diagrams/mindmaps.md', 'slides/**',
    'integrations/cli.md', 'integrations/rest-api.md',
    'reference/config.md', 'reference/grammar.md', 'reference/themes.md',
  ],
  markdown: { config: textgraphExamples },
  vite: { plugins: [siteAssets(), localRuntime()], worker: { format: 'es', plugins: () => [localRuntime()] } },
  // Encode only the finished website; installed SDKs and copied public inputs
  // remain original bytes. Fetch supplies decoded bytes to their consumers.
  buildEnd: async site => { await prepareSiteBrotli(site.outDir) },
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
          { text: 'AI tools', link: '/integrations/ai-agents' },
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
