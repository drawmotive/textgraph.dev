<script setup lang="ts">
import { textgraphIssuesUrl } from '../support'
</script>

<template>
  <aside class="issue-banner" aria-label="TextGraph issues and feedback">
    <a :href="textgraphIssuesUrl">Report all TextGraph issues on GitHub →</a>
    <p>Bugs, feature requests, docs, playground, SDK, fonts, Markdown, and VS Code — one shared issue tracker.</p>
  </aside>
</template>

<style scoped>
.issue-banner {
  box-sizing: border-box;
  width: calc(100% - 48px);
  max-width: 1152px;
  margin: 24px auto;
  padding: 16px 20px;
  border: 1px solid var(--vp-c-brand-1);
  border-left-width: 4px;
  border-radius: 8px;
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-text-1);
  font-size: 14px;
  line-height: 1.6;
}

.issue-banner a {
  color: var(--vp-c-brand-1);
  font-size: 16px;
  font-weight: 700;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.issue-banner a:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 4px;
}

.issue-banner p {
  margin: 6px 0 0;
}
</style>
