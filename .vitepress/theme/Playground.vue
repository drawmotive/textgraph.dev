<script setup>
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import { withBase } from 'vitepress'
import { createPlaygroundRenderer } from '../playground/renderer.mjs'

const source = ref(`client -> api : HTTPS
api -> db : Query

client: Browser
api(fill primary): API Gateway
db: Database
`)
const editor = ref(null)
const imageUrl = ref('')
const state = shallowRef({ status: 'loading', result: null, diagnostics: [], stale: false })
let renderer
let imageResult
const busy = computed(() => ['loading', 'waiting', 'rendering'].includes(state.value.status))
const statusText = computed(() => ({
  loading: 'Loading renderer…',
  waiting: 'Waiting for edits…',
  rendering: 'Rendering…',
  ready: 'Preview up to date',
  error: 'Check the errors below',
  empty: 'Add some TextGraph to begin',
}[state.value.status]))

// URLs belong to this view, never to the worker. Retain the last successful
// image through invalid edits and release its bytes on replacement or navigation.
function acceptState(next) {
  if (next.result !== imageResult) {
    const previous = imageUrl.value
    imageUrl.value = next.result ? URL.createObjectURL(new Blob([next.result.png], { type: 'image/png' })) : ''
    imageResult = next.result
    if (previous) URL.revokeObjectURL(previous)
  }
  state.value = next
}

function renderNow() {
  renderer?.update(source.value, { immediate: true })
}

function edit(event) {
  source.value = event.target.value
  // Composition text is incomplete until the IME commits it.
  if (!event.isComposing) renderer?.update(source.value)
}

function goToDiagnostic(diagnostic) {
  const { line, column } = diagnostic.location
  const lines = source.value.split('\n')
  const before = lines.slice(0, line).reduce((offset, text) => offset + text.length + 1, 0)
  const start = Math.min(source.value.length, before + column)
  editor.value.focus()
  editor.value.setSelectionRange(start, Math.min(source.value.length, start + 1))
}

onMounted(() => {
  renderer = createPlaygroundRenderer({
    createWorker: () => new Worker(new URL('../playground/renderer.worker.mjs', import.meta.url), { type: 'module' }),
    onState: acceptState,
  })
  renderNow()
})

onBeforeUnmount(() => {
  renderer?.dispose()
  if (imageUrl.value) URL.revokeObjectURL(imageUrl.value)
})
</script>

<template>
  <div class="playground">
    <header class="playground-heading">
      <div>
        <h1>TextGraph Playground</h1>
        <p>Write a diagram. See it take shape.</p>
      </div>
      <a :href="withBase('/reference/syntax')">Syntax reference <span aria-hidden="true">↗</span></a>
    </header>

    <div class="playground-workspace">
      <section class="source-panel" aria-label="Diagram source">
        <header class="panel-heading">
          <label for="textgraph-source">TextGraph source</label>
          <button type="button" class="render-button" :disabled="['loading', 'rendering'].includes(state.status) || !source.trim()" @click="renderNow">Render now</button>
        </header>
        <textarea
          id="textgraph-source"
          ref="editor"
          :value="source"
          spellcheck="false"
          autocapitalize="off"
          autocomplete="off"
          autocorrect="off"
          aria-describedby="editor-help"
          placeholder="client -> api -> database"
          @input="edit"
          @compositionend="edit"
          @keydown.ctrl.enter.prevent="renderNow"
          @keydown.meta.enter.prevent="renderNow"
        />
        <p id="editor-help" class="editor-help">Auto-renders after a short pause. Ctrl / ⌘ + Enter to render now.</p>
      </section>

      <section class="preview-panel" aria-label="Diagram preview">
        <header class="panel-heading">
          <h2>Preview</h2>
          <span class="render-status" role="status" aria-label="Render status" :data-status="state.status">{{ statusText }}</span>
        </header>
        <div class="preview-canvas" :aria-busy="busy">
          <p v-if="state.stale" class="stale-notice">Showing the last successful preview</p>
          <div class="preview-image">
            <img
              v-if="imageUrl"
              :src="imageUrl"
              alt="Rendered TextGraph diagram"
              :width="state.result.displayWidth ?? state.result.width / 2"
              :height="state.result.displayHeight ?? state.result.height / 2"
            >
            <p v-else class="preview-placeholder">
              {{ state.status === 'error' ? 'Fix the errors below to see your diagram.' : state.status === 'empty' ? 'Your diagram will appear here.' : 'Preparing your preview…' }}
            </p>
          </div>
        </div>
        <section class="diagnostics" aria-label="Errors and warnings" aria-live="polite">
          <h3>Errors &amp; warnings <span v-if="state.diagnostics.length">({{ state.diagnostics.length }})</span></h3>
          <ul v-if="state.diagnostics.length">
            <li v-for="(diagnostic, index) in state.diagnostics" :key="index" :class="diagnostic.severity">
              <span class="diagnostic-severity">{{ diagnostic.severity }}</span>
              <button v-if="diagnostic.location" class="diagnostic-location" type="button" @click="goToDiagnostic(diagnostic)">
                Line {{ diagnostic.location.line + 1 }}, column {{ diagnostic.location.column + 1 }}
              </button>
              <p>{{ diagnostic.message }}</p>
            </li>
          </ul>
          <p v-else>{{ busy ? 'Checking your diagram…' : state.status === 'empty' ? 'Add some source to check your diagram.' : 'No errors or warnings' }}</p>
        </section>
      </section>
    </div>
    <p class="playground-note">Rendered in your browser. Your diagram stays on this device.</p>
  </div>
</template>

<style scoped>
.playground { max-width: 1600px; margin: 0 auto; padding: 24px 32px 40px; }
.playground-heading { display: flex; align-items: center; justify-content: space-between; gap: 20px; margin-bottom: 24px; }
h1 { font-size: clamp(24px, 3vw, 32px); font-weight: 700; line-height: 1.3; letter-spacing: -0.5px; }
.playground-heading p { margin-top: 8px; color: var(--vp-c-text-2); }
.playground-heading a { flex-shrink: 0; color: var(--vp-c-brand-1); font-size: 14px; }
.playground-workspace { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr); border: 1px solid var(--vp-c-divider); border-radius: 12px; overflow: hidden; min-height: 480px; height: calc(100dvh - 390px); max-height: 900px; }
.source-panel, .preview-panel { display: flex; flex-direction: column; min-width: 0; min-height: 0; }
.source-panel { border-right: 1px solid var(--vp-c-divider); background: var(--vp-code-block-bg); }
.panel-heading { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; min-height: 62px; padding: 14px 20px; border-bottom: 1px solid var(--vp-c-divider); background: var(--vp-c-bg); }
.panel-heading h2, .panel-heading label { font-size: 14px; font-weight: 600; }
.render-button { background: var(--vp-c-brand-3); color: var(--vp-c-white); padding: 5px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; }
.render-button:hover:enabled { background: var(--vp-c-brand-2); }
.render-button:disabled { opacity: 0.5; cursor: default; }
textarea { display: block; flex: 1; width: 100%; min-height: 300px; resize: none; padding: 24px; border: 0; background: transparent; color: var(--vp-c-text-1); font: 14px/1.8 var(--vp-font-family-mono); tab-size: 2; }
textarea:focus { outline: 2px solid var(--vp-c-brand-1); outline-offset: -2px; }
button:focus-visible, a:focus-visible { outline: 2px solid var(--vp-c-brand-1); outline-offset: 3px; }
.editor-help { padding: 12px 20px; border-top: 1px solid var(--vp-c-divider); font-size: 12px; line-height: 1.6; color: var(--vp-c-text-2); }
.render-status { color: var(--vp-c-text-2); font-size: 12px; }
.render-status[data-status='error'] { color: var(--vp-c-danger-1); }
.render-status[data-status='ready'] { color: var(--vp-c-success-1); }
.preview-canvas { display: flex; flex-direction: column; flex: 1; min-height: 200px; overflow: auto; background: var(--vp-c-bg-soft); }
.preview-image { display: flex; align-items: center; justify-content: center; flex: 1; padding: 28px; }
.preview-image img { display: block; max-width: 100%; height: auto; flex-shrink: 0; background: white; border-radius: 6px; box-shadow: var(--vp-shadow-1); }
.preview-placeholder { color: var(--vp-c-text-2); font-size: 14px; text-align: center; }
.stale-notice { padding: 10px 16px 0; font-size: 12px; color: var(--vp-c-text-2); text-align: center; }
.diagnostics { flex-shrink: 0; min-height: 110px; max-height: 35%; overflow-y: auto; padding: 16px 20px; border-top: 1px solid var(--vp-c-divider); background: var(--vp-c-bg); overflow-wrap: anywhere; }
.diagnostics h3 { font-size: 12px; font-weight: 600; margin-bottom: 8px; }
.diagnostics > p { font-size: 13px; color: var(--vp-c-text-2); }
.diagnostics ul { list-style: none; margin: 0; padding: 0; }
.diagnostics li + li { margin-top: 14px; }
.diagnostics li p { margin-top: 4px; font-size: 13px; white-space: pre-wrap; }
.diagnostic-severity { font-size: 11px; font-weight: 600; text-transform: uppercase; margin-right: 10px; }
.error .diagnostic-severity { color: var(--vp-c-danger-1); }
.warning .diagnostic-severity { color: var(--vp-c-warning-1); }
.diagnostic-location { color: var(--vp-c-brand-1); font-size: 12px; text-decoration: underline; cursor: pointer; }
.playground-note { margin-top: 14px; color: var(--vp-c-text-2); font-size: 12px; }
@media (max-width: 767px) {
  .playground { padding: 16px 16px 32px; }
  .playground-heading { align-items: flex-start; flex-direction: column; gap: 12px; }
  .playground-workspace { grid-template-columns: minmax(0, 1fr); height: auto; max-height: none; }
  .source-panel { border-right: 0; border-bottom: 1px solid var(--vp-c-divider); }
  textarea { min-height: 320px; font-size: 16px; padding: 16px; }
  .panel-heading { padding: 12px 16px; }
  .preview-canvas { min-height: 300px; max-height: 600px; }
  .preview-image { padding: 20px; }
  .diagnostics { max-height: 240px; }
}
</style>
