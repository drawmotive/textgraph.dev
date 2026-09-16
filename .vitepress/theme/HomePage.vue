<script setup>
import { withBase } from 'vitepress'
import { examplesById as examples, playgroundLink } from '../home/examples.mjs'
import HomeExample from './HomeExample.vue'
import './home.css'

const steps = [
  { id: 'relationships', number: '01', title: 'Start with the relationships.', description: 'Name the pieces and connect them with arrows. TextGraph turns the connections into a diagram and handles the layout.' },
  { id: 'labels', number: '02', title: 'Make the meaning clear.', description: 'Give each piece a readable label. The relationships stay easy to scan, and the diagram becomes easier to explain.' },
  { id: 'service-boundary', number: '03', title: 'Keep related things together.', description: 'Put the API and database inside a backend group. The boundary becomes part of the picture.' },
]
const gallery = [
  { id: 'release-process', category: 'Explain a process', description: 'Make the steps from a commit to a release easy to follow.' },
  { id: 'service-boundary', category: 'Describe a system', description: 'Show how services connect and where a boundary belongs.' },
  { id: 'dependencies', category: 'Map dependencies', description: 'See which parts share a dependency before making a change.' },
]
</script>

<template>
  <main class="textgraph-home">
    <section class="home-hero home-wrap" aria-labelledby="home-title" data-analytics-placement="hero">
      <div class="hero-copy">
        <p class="eyebrow"><span class="status-dot" /> Diagrams, written down.</p>
        <h1 id="home-title">Turn relationships<br class="desktop-break"> into <span>diagrams.</span></h1>
        <p class="hero-description">A few lines of readable text. A diagram that explains your idea. TextGraph handles the layout so you can focus on what connects.</p>
        <div class="home-actions">
          <a class="home-button primary" :href="withBase(playgroundLink(examples['request-flow']))" data-analytics-example="request-flow">Try this example <span aria-hidden="true">↗</span></a>
          <a class="text-link" href="#how-it-works">See how it works <span aria-hidden="true">↓</span></a>
        </div>
        <p class="hero-note">No account. No installation. Runs in your browser.</p>
      </div>
      <HomeExample :example="examples['request-flow']" eager action="Open in playground" />
    </section>

    <div class="home-facts home-wrap" aria-label="Available today">
      <p><span>Make</span> Flowcharts &amp; directed graphs</p>
      <p><span>Keep</span> Editable text alongside your docs</p>
      <p><span>Use</span> PNG exports, Markdown &amp; VS Code</p>
    </div>

    <section id="how-it-works" class="home-section home-wrap" aria-labelledby="approach-title">
      <div class="section-intro">
        <p class="eyebrow">A small language. Room to grow.</p>
        <h2 id="approach-title">From a connection<br>to a shared understanding.</h2>
        <p>Follow one request from browser to database. Add detail only when it helps tell the story.</p>
      </div>
      <article v-for="step in steps" :key="step.id" class="story-step">
        <div class="step-copy">
          <span class="step-number">{{ step.number }}</span>
          <h3>{{ step.title }}</h3>
          <p>{{ step.description }}</p>
          <a class="text-link" :href="withBase(playgroundLink(examples[step.id]))" :data-analytics-example="step.id">Try this step <span aria-hidden="true">↗</span></a>
        </div>
        <HomeExample :example="examples[step.id]" />
      </article>
    </section>

    <section class="payoff-section" aria-labelledby="payoff-title">
      <div class="home-wrap payoff-grid">
        <div class="payoff-copy">
          <p class="eyebrow">The idea changed. Change the text.</p>
          <h2 id="payoff-title">An extra connection.<br>A new picture.</h2>
          <p>The API now uses a cache. Add the connection and its label, and render the updated diagram.</p>
          <div class="source-addition"><span class="panel-label">Add to the first example</span><pre><code>api -&gt; cache
cache: Cache</code></pre></div>
          <p class="payoff-note">The source is still text you can keep in a repository, review in a diff, or change again tomorrow.</p>
          <a class="home-button primary" :href="withBase(playgroundLink(examples['cache-flow']))" data-analytics-example="cache-flow">Make it your own <span aria-hidden="true">↗</span></a>
        </div>
        <HomeExample :example="examples['cache-flow']" action="Edit the updated diagram" />
      </div>
    </section>

    <section id="examples" class="home-section home-wrap" aria-labelledby="examples-title">
      <div class="section-intro gallery-intro">
        <div><p class="eyebrow">A starting point for your next explanation</p><h2 id="examples-title">What will you make clear?</h2></div>
        <p>Real diagrams, with the text that makes them. Open one and adapt it to your own work.</p>
      </div>
      <div class="example-gallery">
        <article v-for="item in gallery" :key="item.id" class="gallery-item">
          <p class="eyebrow">{{ item.category }}</p>
          <h3>{{ examples[item.id].title }}</h3>
          <p>{{ item.description }}</p>
          <HomeExample :example="examples[item.id]" compact />
        </article>
      </div>
    </section>

    <section id="workflow" class="workflow-section home-wrap" aria-labelledby="workflow-title">
      <div class="section-intro">
        <p class="eyebrow">Where your ideas already live</p>
        <h2 id="workflow-title">Keep the diagram<br>close to the explanation.</h2>
        <p>Write the source with your documentation. Preview it in your editor, publish it in your site, or export a PNG from the playground.</p>
      </div>
      <div class="workflow-options">
        <a class="workflow-link" :href="withBase('/integrations/markdown')"><span class="workflow-mark" aria-hidden="true">M↓</span><span><strong>Markdown &amp; VitePress</strong><span>Turn a TextGraph code block into a diagram when your documentation builds.</span></span><span aria-hidden="true">↗</span></a>
        <a class="workflow-link" :href="withBase('/integrations/vscode')"><span class="workflow-mark" aria-hidden="true">&lt;/&gt;</span><span><strong>VS Code</strong><span>See the diagram update in Markdown preview as you edit its source.</span></span><span aria-hidden="true">↗</span></a>
        <a class="text-link sdk-link" href="https://github.com/drawmotive/textgraph#readme">Building an app? Explore the JavaScript SDK <span aria-hidden="true">↗</span></a>
      </div>
    </section>

    <section class="home-section home-wrap questions-section" aria-labelledby="questions-title">
      <div><p class="eyebrow">Before you begin</p><h2 id="questions-title">A few useful details.</h2></div>
      <div class="home-questions">
        <details><summary>What can I make today?</summary><p>Flowcharts and directed graphs, including process, service, and dependency diagrams. Mind maps, sequence diagrams, and slides are planned and are not available yet. <a :href="withBase('/reference/changelog')">See the changelog.</a></p></details>
        <details><summary>Can I use plain English or AI?</summary><p>TextGraph uses a small, structured syntax. You can write it yourself or ask an AI assistant to draft it, then review and render the source. The playground is a diagram editor; it does not include an AI chat.</p></details>
        <details><summary>Where is my diagram rendered?</summary><p>The playground renders in your browser. Diagram source stays there while you edit. A share link contains the source, so anyone you send that link to can open it.</p></details>
        <details><summary>How do I take the result with me?</summary><p>Download a PNG, copy the image, or copy a link to the editable source from the playground. For documentation, use the Markdown plugin or VS Code extension.</p></details>
      </div>
    </section>

    <section class="closing-section home-wrap" aria-labelledby="closing-title" data-analytics-placement="footer">
      <p class="eyebrow">Your next diagram starts with a connection.</p>
      <h2 id="closing-title">Give your idea a shape.</h2>
      <p>Start with a working example. Change one thing. See where it leads.</p>
      <div class="home-actions">
        <a class="home-button primary" :href="withBase(playgroundLink(examples['request-flow']))" data-analytics-example="request-flow">Create your diagram <span aria-hidden="true">↗</span></a>
        <a class="text-link" :href="withBase('/diagrams/flowcharts')">Read the syntax guide <span aria-hidden="true">→</span></a>
      </div>
    </section>
  </main>
</template>
