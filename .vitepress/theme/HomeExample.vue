<script setup>
import { withBase } from 'vitepress'
import links from '../home/generated/links.json'
import images from '../home/generated/images.mjs'

// Output and editor destination derive from one catalog item. Native links and
// static images keep the demonstration useful before hydration.
defineProps({ example: { type: Object, required: true }, compact: Boolean, eager: Boolean, action: { type: String, default: 'Edit this example' } })
</script>

<template>
  <figure class="home-example" :class="{ compact }">
    <div class="example-panes">
      <div class="example-source">
        <span class="panel-label">TextGraph source</span>
        <pre><code>{{ example.source }}</code></pre>
      </div>
      <div class="example-result">
        <span class="panel-label">The diagram</span>
        <img :src="images[example.id].src" :alt="example.alt"
          :width="images[example.id].width" :height="images[example.id].height"
          :loading="eager ? 'eager' : 'lazy'" :fetchpriority="eager ? 'high' : 'auto'">
      </div>
    </div>
    <figcaption>
      <span>{{ example.title }}</span>
      <a :href="withBase(links[example.id])" :data-analytics-example="example.id">{{ action }} <span aria-hidden="true">↗</span></a>
    </figcaption>
  </figure>
</template>
