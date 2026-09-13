import { h } from 'vue'
import DefaultTheme from 'vitepress/theme'
import IssueBanner from './IssueBanner.vue'

// Keep reporting visible above page content, including when mobile navigation is collapsed.
export default {
  extends: DefaultTheme,
  Layout: () => h(DefaultTheme.Layout, null, {
    'home-hero-before': () => h(IssueBanner),
    'doc-before': () => h(IssueBanner),
    'page-top': () => h(IssueBanner),
  }),
}
