<script setup>
import { withBase } from 'vitepress'
import { examplesById as examples } from '../home/examples.mjs'
import links from '../home/generated/links.json'
import images from '../home/generated/images.mjs'
import HomeExample from './HomeExample.vue'
import './home.css'

const syntax = [
  { id: 'relationships', title: 'Connect.', detail: 'Names and arrows. That is a diagram.' },
  { id: 'release-process', title: 'Express.', detail: 'Decisions, labels and styles in a few lines.' },
  { id: 'service-boundary', title: 'Organize.', detail: 'Group related nodes. Let the layout follow.' },
]
const sdkSource = "const graph = await initializeTextGraph();\nconst image = await graph.renderSvg('web -> api -> db');"
const dockerSource = 'docker run --rm -p 8080:8080 \\\n  ghcr.io/drawmotive/textgraph-renderer:0.3.0'
const markdownSource = String.fromCharCode(96).repeat(3) + 'textgraph\n' + examples.dependencies.source + '\n' + String.fromCharCode(96).repeat(3)
</script>

<template>
  <main class="textgraph-home">
    <section class="home-hero home-wrap" aria-labelledby="home-title" data-analytics-placement="hero">
      <div class="hero-copy">
        <div class="hero-meta">
          <p class="eyebrow"><span class="status-dot" /> TextGraph + DrawMotive</p>
          <a class="license-badge" href="#license">Free · MIT License</a>
        </div>
        <h1 id="home-title">Turn relationships<br class="desktop-break"> into <span>diagrams.</span></h1>
        <p class="hero-description">A little text. Automatic layout. A canvas for your finishing touches.</p>
        <div class="home-actions">
          <a class="home-button primary" :href="withBase(links['request-flow'])" data-analytics-example="request-flow">Try this example <span aria-hidden="true">↗</span></a>
          <a class="text-link" :href="withBase('/examples/editor/')" target="_self">Try the visual editor <span aria-hidden="true">↗</span></a>
        </div>
        <p class="hero-note">No account. Runs in your browser.</p>
      </div>
      <HomeExample :example="examples['request-flow']" eager action="Open in playground" />
    </section>

    <nav class="story-nav home-wrap" aria-label="Explore the product">
      <a href="#syntax"><span>01</span> Write a little</a>
      <a href="#visual-editing"><span>02</span> Make it yours</a>
      <a href="#workflow"><span>03</span> Put it to work</a>
      <a href="#build"><span>04</span> Build with it</a>
      <a href="#license"><span>MIT</span> Use it freely</a>
    </nav>

    <section id="syntax" class="home-section home-wrap" aria-labelledby="syntax-title">
      <div class="section-intro">
        <div><p class="eyebrow">Small syntax. Serious diagrams.</p><h2 id="syntax-title">Less to write.<br>More to show.</h2></div>
        <a class="text-link" :href="withBase('/diagrams/flowcharts')">Learn the syntax <span aria-hidden="true">→</span></a>
      </div>
      <div class="syntax-gallery">
        <article v-for="item in syntax" :key="item.id">
          <h3>{{ item.title }}</h3><p>{{ item.detail }}</p>
          <HomeExample :example="examples[item.id]" compact />
        </article>
      </div>
      <div class="capability-line">
        <span>Automatic layout &amp; routing</span><span>Nested groups</span><span>Shapes &amp; styles</span><span>PNG &amp; SVG</span>
        <a href="https://github.com/drawmotive/textgraph/tree/main/language-packs#language-coverage">Chinese, Japanese &amp; emoji <span aria-hidden="true">↗</span></a>
      </div>
    </section>

    <section id="visual-editing" class="visual-section" aria-labelledby="visual-title">
      <div class="home-wrap">
        <div class="section-intro">
          <div><p class="eyebrow">From generated to yours</p><h2 id="visual-title">Start with text.<br>Finish with your own touch.</h2></div>
          <div class="section-copy">
            <p>Write it yourself or draft it with AI. Generate a diagram, then move shapes, edit labels and draw connections in DrawMotive.</p>
            <div class="home-actions">
              <a class="home-button primary" :href="withBase('/examples/editor/')" target="_self">Open the editor demo <span aria-hidden="true">↗</span></a>
              <a class="text-link" :href="withBase('/integrations/ai-agents')">Draft with AI <span aria-hidden="true">→</span></a>
            </div>
          </div>
        </div>
        <figure class="product-capture editor-capture">
          <a :href="withBase('/examples/editor/')" target="_self" aria-label="Try the DrawMotive canvas shown in this screenshot">
            <img :src="withBase('/guide-images/drawmotive-editor.png')" alt="Real DrawMotive browser editor: TextGraph source on the left, an editable grouped order flow on the canvas, drawing tools, and document save and open controls." width="1600" height="1200" loading="lazy">
          </a>
          <figcaption><span>TextGraph → editable document → PNG / SVG</span><a :href="withBase('/editor/')">Embed this editor <span aria-hidden="true">→</span></a></figcaption>
        </figure>
        <p class="document-note">Save the document or an editable PNG to keep canvas changes. Generating again replaces the drawing; canvas edits do not rewrite TextGraph.</p>
      </div>
    </section>

    <section id="workflow" class="home-section home-wrap" aria-labelledby="workflow-title">
      <div class="section-intro">
        <div><p class="eyebrow">Where you already work</p><h2 id="workflow-title">From your editor<br>to your documentation.</h2></div>
        <a class="text-link" :href="withBase('/integrations/overview')">Choose your workflow <span aria-hidden="true">→</span></a>
      </div>
      <div class="workflow-grid">
        <article>
          <figure class="product-capture vscode-capture">
            <a :href="withBase('/integrations/vscode')" aria-label="Explore the TextGraph preview in VS Code">
              <img :src="withBase('/home-images/vscode-preview.png')" alt="Real VS Code window showing TextGraph in a Markdown file beside its rendered order-flow diagram in the built-in preview." width="1599" height="1399" loading="lazy">
            </a>
          </figure>
          <h3>Write. Preview. Stay in VS Code.</h3>
          <p>Preview TextGraph in Markdown, or edit a drawing in the visual editor.</p>
          <div class="home-actions">
            <a class="text-link" href="https://marketplace.visualstudio.com/items?itemName=drawmotive.textgraph-markdown">Install Markdown Preview <span aria-hidden="true">↗</span></a>
            <a class="text-link" href="https://marketplace.visualstudio.com/items?itemName=drawmotive.vscode-drawmotive">Install DrawMotive <span aria-hidden="true">↗</span></a>
          </div>
        </article>
        <article>
          <div class="markdown-preview">
            <header class="panel-label">README.md · Markdown &amp; VitePress</header>
            <div class="markdown-source"><span class="panel-label">A fenced block</span><pre><code>{{ markdownSource }}</code></pre></div>
            <a :href="withBase(links.dependencies)" data-analytics-example="dependencies" aria-label="Try the shared client library diagram">
              <img :src="images.dependencies.src" :alt="examples.dependencies.alt" :width="images.dependencies.width" :height="images.dependencies.height" loading="lazy">
            </a>
          </div>
          <h3>Ship the diagram with the docs.</h3>
          <p>Keep readable source in Git. Build real images into your documentation site.</p>
          <a class="text-link" :href="withBase('/integrations/markdown')">Add to Markdown &amp; VitePress <span aria-hidden="true">→</span></a>
        </article>
      </div>
    </section>

    <section id="build" class="build-section" aria-labelledby="build-title">
      <div class="home-wrap">
        <div class="section-intro">
          <div><p class="eyebrow">One engine. Your choice of delivery.</p><h2 id="build-title">In your app.<br>On your infrastructure.</h2></div>
          <p>Render locally with the SDK, embed the visual editor, or serve PNG and SVG from your own Docker container.</p>
        </div>
        <div class="build-grid">
          <article class="build-option">
            <img class="integration-visual" :src="withBase('/home-images/sdk.svg')" alt="SDK integration: a browser, Worker, Node.js or React application calls TextGraph; the renderer returns PNG or SVG, and the Editor provides a visual canvas. React renders PNG." width="640" height="280" loading="lazy">
            <div class="build-copy"><p class="eyebrow">npm · JavaScript / TypeScript</p><h3>A renderer. An editor. Your product.</h3><pre><code>{{ sdkSource }}</code></pre>
              <div class="home-actions"><a class="text-link" :href="withBase('/integrations/javascript')">Explore the SDK <span aria-hidden="true">→</span></a><a class="text-link" :href="withBase('/editor/')">Embed the editor <span aria-hidden="true">→</span></a></div>
            </div>
          </article>
          <article class="build-option">
            <img class="integration-visual" :src="withBase('/home-images/docker.svg')" alt="Self-hosted Docker integration: your application sends TextGraph in an HTTP POST to the renderer container and receives a PNG or SVG image." width="640" height="280" loading="lazy">
            <div class="build-copy"><p class="eyebrow">Docker · HTTP API</p><h3>Text in. PNG or SVG out.</h3><pre><code>{{ dockerSource }}</code></pre>
              <div class="home-actions"><a class="text-link" :href="withBase('/integrations/docker')">Run with Docker <span aria-hidden="true">→</span></a><a class="text-link" href="https://github.com/drawmotive/textgraph-renderer">View the service <span aria-hidden="true">↗</span></a></div>
            </div>
          </article>
        </div>
        <a class="render-example" :href="withBase(links['cache-flow'])" data-analytics-example="cache-flow">
          <span>Same TextGraph. Same rendering engine.<strong>Try a complete architecture example <span aria-hidden="true">↗</span></strong></span>
          <img :src="images['cache-flow'].src" :alt="examples['cache-flow'].alt" :width="images['cache-flow'].width" :height="images['cache-flow'].height" loading="lazy">
        </a>
      </div>
    </section>

    <section id="license" class="license-section home-wrap" aria-labelledby="license-title">
      <a class="license-mark" href="https://github.com/drawmotive/textgraph/blob/main/LICENSE" aria-label="MIT license">MIT<span>LICENSE</span></a>
      <div><p class="eyebrow">Yours to use. Yours to build on.</p><h2 id="license-title">Free under the MIT License.</h2>
        <p>Personal projects, company work, commercial products and resale. MIT allows all of them, with no license fee. Keep the copyright and license notice.</p>
        <a class="text-link" href="https://github.com/drawmotive/textgraph/blob/main/LICENSE">Read the MIT license <span aria-hidden="true">↗</span></a>
        <p class="license-detail">Site documentation is CC BY 4.0. Bundled fonts and dependencies retain their own licenses.</p>
      </div>
    </section>

    <section class="closing-section home-wrap" aria-labelledby="closing-title" data-analytics-placement="footer">
      <h2 id="closing-title">One connection is all it takes.</h2><p>Open an example. Change a line. Make it yours.</p>
      <div class="home-actions"><a class="home-button primary" :href="withBase(links['request-flow'])" data-analytics-example="request-flow">Create your diagram <span aria-hidden="true">↗</span></a><a class="text-link" :href="withBase('/examples/textgraph/')" target="_self">Try the renderer SDK <span aria-hidden="true">↗</span></a></div>
      <details class="ai-detail"><summary>Can I use plain English or AI?</summary><p>TextGraph uses a small, structured syntax. Ask an AI assistant to draft it, then review the source and render it. <a :href="withBase('/integrations/ai-agents')">Get the prompt and language references.</a></p></details>
    </section>
  </main>
</template>
