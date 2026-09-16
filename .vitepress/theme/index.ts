import { h } from 'vue'
import DefaultTheme from 'vitepress/theme'
import { useData } from 'vitepress'
import IssueBanner from './IssueBanner.vue'
import './textgraph-examples.css'

// Documentation keeps the issue banner; the playground uses the navigation's
// report link so its editor and image can occupy the available page space.
export default {
  extends: DefaultTheme,
  Layout: () => h(DefaultTheme.Layout, null, {
    'home-hero-before': () => h(IssueBanner),
    'doc-before': () => h(IssueBanner),
    'page-top': () => useData().frontmatter.value.playground ? null : h(IssueBanner),
  }),
}
