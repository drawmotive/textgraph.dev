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
          { text: 'Hello World', link: '/intro/hello-world' },
        ]
      },
      {
        text: 'Language Tour',
        items: [
          { text: 'Basics', link: '/tour/basics' },
          { text: 'Nodes & Connections', link: '/tour/nodes-connections' },
          { text: 'Shapes & Styles', link: '/tour/shapes-styles' },
          { text: 'Labels & Text', link: '/tour/labels-text' },
          { text: 'Groups & Containers', link: '/tour/groups-containers' },
          { text: 'Layouts', link: '/tour/layouts' },
          { text: 'Themes', link: '/tour/themes' },
        ]
      },
      {
        text: 'Diagram Types',
        items: [
          { text: 'Flowcharts', link: '/diagrams/flowcharts' },
          { text: 'Sequence Diagrams', link: '/diagrams/sequence' },
          { text: 'Mind Maps', link: '/diagrams/mindmaps' },
          { text: 'Entity Relationship', link: '/diagrams/er' },
          { text: 'Network / Infrastructure', link: '/diagrams/network' },
          { text: 'Org Charts', link: '/diagrams/orgcharts' },
          { text: 'Timelines', link: '/diagrams/timelines' },
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
          { text: 'Syntax Reference', link: '/reference/syntax' },
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
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2024-present DrawMotive'
    },

    search: {
      provider: 'local'
    }
  }
})
