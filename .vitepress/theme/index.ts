import DefaultTheme from 'vitepress/theme'
import './navigation.css'
import './textgraph-examples.css'
import { installAnalytics } from '../analytics-browser.mjs'

export default {
  extends: DefaultTheme,
  enhanceApp({ router }) {
    if (typeof window !== 'undefined') installAnalytics(router)
  },
}
