import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "TextGraph",
  description: "A natural-language DSL that turns text descriptions into beautiful, professional diagrams and slides — built for the AI era.",
  themeConfig: {
    logo: '/logo.svg',
    nav: [
      { text: 'Docs', link: '/intro/what-is-textgraph' },
      { text: 'Playground', link: 'https://textgraph.drawmotive.com/' },
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
      message: 'the native graph language for AI',
      copyright: 'Copyright © 2023-present drawmotive'
    },

    search: {
      provider: 'local'
    },

    outline: {
      level: [2, 3]
    }
  }
})
