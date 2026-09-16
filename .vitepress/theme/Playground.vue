<script setup>
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import { withBase } from 'vitepress'
import { createPlaygroundRenderer } from '../playground/renderer.mjs'
import PreviewImage from './PreviewImage.vue'

const source = ref(`client -> api : HTTPS
api -> db : Query

client: Browser
api(fill primary): API Gateway
db: Database
`)
const editor = ref(null)
const workspace = ref(null)
const editorPercent = ref(45)
const dragging = ref(false)
let dragPointer
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

// The split is a proportion of the space excluding the handle. Pointer capture
// keeps dragging reliable outside the handle; limits keep both panes usable.
function setSplit(percent) {
  editorPercent.value = Math.max(20, Math.min(80, percent))
}

function startResize(event) {
  if (event.button !== 0 || !event.isPrimary) return
  event.preventDefault()
  event.currentTarget.focus()
  event.currentTarget.setPointerCapture(event.pointerId)
  dragPointer = event.pointerId
  dragging.value = true
}

function resize(event) {
  if (event.pointerId !== dragPointer) return
  const bounds = workspace.value.getBoundingClientRect()
  const handleWidth = event.currentTarget.getBoundingClientRect().width
  const available = workspace.value.clientWidth - handleWidth
  if (available <= 0) return
  setSplit((event.clientX - bounds.left - workspace.value.clientLeft - handleWidth / 2) / available * 100)
}

function stopResize(event) {
  if (event.pointerId !== dragPointer) return
  dragPointer = undefined
  dragging.value = false
  if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
}

function resizeWithKeyboard(event) {
  const values = { ArrowLeft: editorPercent.value - 2, ArrowRight: editorPercent.value + 2, Home: 20, End: 80 }
  if (!(event.key in values)) return
  event.preventDefault()
  setSplit(values[event.key])
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
    <div ref="workspace" class="playground-workspace" :class="{ dragging }" :style="{ '--editor-share': `${editorPercent}fr`, '--preview-share': `${100 - editorPercent}fr` }">
      <section id="source-panel" class="source-panel" aria-label="Diagram source">
        <header class="panel-heading">
          <div class="source-heading">
            <label for="textgraph-source">TextGraph source</label>
            <a :href="withBase('/reference/syntax')" aria-label="Syntax reference" title="Syntax reference">Syntax ↗</a>
          </div>
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

      <div
        class="pane-splitter"
        role="separator"
        tabindex="0"
        aria-label="Resize editor and preview"
        aria-orientation="vertical"
        aria-controls="source-panel"
        aria-valuemin="20"
        aria-valuemax="80"
        :aria-valuenow="Math.round(editorPercent)"
        :aria-valuetext="`Editor ${Math.round(editorPercent)}%, preview ${100 - Math.round(editorPercent)}%`"
        @pointerdown="startResize"
        @pointermove="resize"
        @pointerup="stopResize"
        @pointercancel="stopResize"
        @lostpointercapture="stopResize"
        @keydown="resizeWithKeyboard"
      />

      <PreviewImage :image-url="imageUrl" :result="state.result" :busy="busy" :stale="state.stale" :status="state.status" :status-text="statusText">
        <section v-if="state.diagnostics.length" class="diagnostics" aria-label="Errors and warnings" aria-live="polite">
          <h3>Errors &amp; warnings ({{ state.diagnostics.length }})</h3>
          <ul>
            <li v-for="(diagnostic, index) in state.diagnostics" :key="index" :class="diagnostic.severity">
              <span class="diagnostic-severity">{{ diagnostic.severity }}</span>
              <button v-if="diagnostic.location" class="diagnostic-location" type="button" :disabled="busy" @click="goToDiagnostic(diagnostic)">
                Line {{ diagnostic.location.line + 1 }}, column {{ diagnostic.location.column + 1 }}
              </button>
              <p>{{ diagnostic.message }}</p>
            </li>
          </ul>
        </section>
      </PreviewImage>
    </div>
  </div>
</template>

<style scoped>
.playground { margin: 0 auto; padding: 12px 16px 16px; }
.playground-workspace { display: grid; grid-template-columns: minmax(0, var(--editor-share)) 10px minmax(0, var(--preview-share)); border: 1px solid var(--vp-c-divider); border-radius: 12px; overflow: hidden; min-height: 480px; height: calc(100dvh - 92px); }
.source-panel { display: flex; flex-direction: column; min-width: 0; min-height: 0; }
.source-heading { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
.source-heading a { color: var(--vp-c-brand-1); font-size: 12px; }
.source-panel { background: var(--vp-code-block-bg); }
.pane-splitter { display: flex; align-items: center; justify-content: center; background: var(--vp-c-bg-soft); border-inline: 1px solid var(--vp-c-divider); cursor: col-resize; touch-action: none; }
.pane-splitter::after { content: ''; width: 3px; height: 36px; border-radius: 2px; background: var(--vp-c-text-3); }
.pane-splitter:hover, .pane-splitter:focus-visible, .dragging .pane-splitter { background: var(--vp-c-brand-soft); }
.pane-splitter:focus-visible { outline: 2px solid var(--vp-c-brand-1); outline-offset: -2px; }
.dragging { cursor: col-resize; user-select: none; }
.panel-heading { display: flex; flex-shrink: 0; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; min-height: 62px; padding: 14px 20px; border-bottom: 1px solid var(--vp-c-divider); background: var(--vp-c-bg); }
.panel-heading label { font-size: 14px; font-weight: 600; }
.render-button { background: var(--vp-c-brand-3); color: var(--vp-c-white); padding: 5px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; }
.render-button:hover:enabled { background: var(--vp-c-brand-2); }
.render-button:disabled { opacity: 0.5; cursor: default; }
textarea { display: block; flex: 1; width: 100%; min-height: 300px; resize: none; padding: 24px; border: 0; background: transparent; color: var(--vp-c-text-1); font: 14px/1.8 var(--vp-font-family-mono); tab-size: 2; }
textarea:focus { outline: 2px solid var(--vp-c-brand-1); outline-offset: -2px; }
button:focus-visible, a:focus-visible { outline: 2px solid var(--vp-c-brand-1); outline-offset: 3px; }
.editor-help { padding: 12px 20px; border-top: 1px solid var(--vp-c-divider); font-size: 12px; line-height: 1.6; color: var(--vp-c-text-2); }
.diagnostics { flex-shrink: 0; min-height: 0; max-height: 35%; overflow-y: auto; padding: 16px 20px; border-bottom: 1px solid var(--vp-c-divider); background: var(--vp-c-bg); overflow-wrap: anywhere; }
.diagnostics h3 { font-size: 12px; font-weight: 600; margin-bottom: 8px; }
.diagnostics ul { list-style: none; margin: 0; padding: 0; }
.diagnostics li + li { margin-top: 14px; }
.diagnostics li p { margin-top: 4px; font-size: 13px; white-space: pre-wrap; }
.diagnostic-severity { font-size: 11px; font-weight: 600; text-transform: uppercase; margin-right: 10px; }
.error .diagnostic-severity { color: var(--vp-c-danger-1); }
.warning .diagnostic-severity { color: var(--vp-c-warning-1); }
.diagnostic-location { color: var(--vp-c-brand-1); font-size: 12px; text-decoration: underline; cursor: pointer; }
.diagnostic-location:disabled { cursor: default; opacity: 0.6; }
@media (max-width: 767px) {
  .playground { padding: 12px; }
  .playground-workspace { grid-template-columns: minmax(0, 1fr); height: auto; max-height: none; }
  .source-panel { border-right: 0; border-bottom: 1px solid var(--vp-c-divider); }
  .pane-splitter { display: none; }
  textarea { min-height: 320px; font-size: 16px; padding: 16px; }
  .panel-heading { padding: 12px 16px; }
}
</style>
