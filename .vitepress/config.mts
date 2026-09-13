import { defineConfig } from 'vitepress'
import { withTextGraph } from '@drawmotive/markdown-it-textgraph/vitepress'
import { textgraphIssuesUrl } from './support.ts'

export default defineConfig(withTextGraph({
  title: "TextGraph",
  description: "A natural-language DSL that turns text descriptions into beautiful, professional diagrams and slides — built for the AI era.",
  themeConfig: {
    logo: '/logo.svg',
    nav: [
      { text: 'Docs', link: '/intro/what-is-textgraph' },
      { text: 'Playground', link: 'https://textgraph.drawmotive.com/' },
      { text: 'Report an issue', link: textgraphIssuesUrl },
    ],

    sidebar: [
      {
        text: 'Introduction',
        items: [
          { text: 'What is TextGraph?', link: '/intro/what-is-textgraph' },
          { text: 'Getting Started', link: '/intro/getting-started' },
        ]
      },
      {
        text: 'Diagram Types',
        items: [
          { text: 'Flowcharts', link: '/diagrams/flowcharts' },
          { text: 'Sequence Diagrams', link: '/diagrams/sequence' },
          { text: 'Mind Maps', link: '/diagrams/mindmaps' },
        ]
      },
      {
        text: 'Slides',
        items: [
          { text: 'Authoring Slides', link: '/slides/authoring' },
          { text: 'Layouts & Grids', link: '/slides/layouts' },
          { text: 'Speaker Notes', link: '/slides/speaker-notes' },
          { text: 'Exporting', link: '/slides/exporting' },
        ]
      },
      {
        text: 'Integrations',
        items: [
          { text: 'Overview', link: '/integrations/overview' },
          { text: 'Markdown & VitePress', link: '/integrations/markdown' },
          { text: 'VS Code Extension', link: '/integrations/vscode' },
          { text: 'CLI', link: '/integrations/cli' },
          { text: 'JavaScript / Node.js', link: '/integrations/javascript' },
          { text: 'REST API', link: '/integrations/rest-api' },
          { text: 'AI Agents & LLMs', link: '/integrations/ai-agents' },
        ]
      },
      {
        text: 'Reference',
        items: [
          { text: 'Language Specification', link: '/reference/textgraph-spec' },
          { text: 'Style Classes', link: '/reference/classes' },
          { text: 'Syntax Reference', link: '/reference/syntax' },
          { text: 'Formal Grammar', link: '/reference/grammar' },
          { text: 'Built-in Themes', link: '/reference/themes' },
          { text: 'Configuration Options', link: '/reference/config' },
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
}))
