<script setup>
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import { useRouter, withBase } from 'vitepress'
import { createPlaygroundRenderer } from '../playground/renderer.mjs'
import { createSourceLink, readSourceLink } from '../playground/source-link.mjs'
import { getAnalytics } from '../analytics-browser.mjs'
import { createPlaygroundAnalytics } from '../analytics.mjs'
import PreviewImage from './PreviewImage.vue'

const source = ref(`client -> api : HTTPS
api -> db : Query

client: Browser
api(fill primary): API Gateway
db: Database
`)
const editor = ref(null)
const defaultSource = source.value
const analytics = getAnalytics()
const diagramAnalytics = createPlaygroundAnalytics(analytics)
diagramAnalytics.restore(defaultSource)
const shareFeedback = ref('')
const copying = ref(false)
const restoringSource = ref(true)
const router = useRouter()
let sourceLinkRevision = 0
let sourceLinkPending = false
let disposed = false
let sourceLinkTimer
let sourcePath
let lastSourceHref
let previousAfterRouteChange
let previousBeforeRouteChange
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
  diagramAnalytics.render(next)
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
  sourceLinkRevision += 1
  restoringSource.value = false
  source.value = event.target.value
  diagramAnalytics.edit(source.value, { composing: event.isComposing })
  shareFeedback.value = ''
  // Coalesce typing to avoid browser history API rate limits. Sharing flushes
  // this timer so a click always copies the current text, even during rendering.
  clearTimeout(sourceLinkTimer)
  sourceLinkTimer = setTimeout(updateSourceLink, 250)
  // Composition text is incomplete until the IME commits it.
  if (!event.isComposing) renderer?.update(source.value)
}

async function updateSourceLink() {
  clearTimeout(sourceLinkTimer)
  sourceLinkTimer = undefined
  if (!isSourcePage()) return null
  const revision = ++sourceLinkRevision
  const originalHref = window.location.href
  sourceLinkPending = true
  try {
    const href = await createSourceLink(originalHref, source.value)
    // Codec startup can finish after an edit, navigation, or unmount. Only the
    // still-current source may replace the history entry it was captured from.
    if (revision !== sourceLinkRevision || !isSourcePage() || window.location.href !== originalHref) return null
    // Preserve the router's scroll state and replace this edit's history entry.
    if (href !== window.location.href) window.history.replaceState(window.history.state, '', href)
    lastSourceHref = href
    return href
  } catch {
    if (revision === sourceLinkRevision && !disposed) shareFeedback.value = 'Could not update the link. Try Share again.'
    return null
  } finally {
    if (revision === sourceLinkRevision) sourceLinkPending = false
  }
}

function isSourcePage() {
  return !disposed && window.location.pathname.replace(/\.html$/, '') === sourcePath
}

// VitePress pushes the destination URL before loading its component. Flush
// while the editor still owns the current history entry, so Back retains edits.
async function beforeRouteChange(...args) {
  // Edits can arrive while codec startup delays departure. Flush again only
  // when a newer edit invalidated the awaited write, before surrendering history.
  while (isSourcePage() && (sourceLinkTimer !== undefined || sourceLinkPending)) await updateSourceLink()
  return previousBeforeRouteChange?.(...args)
}

async function afterRouteChange(...args) {
  await previousAfterRouteChange?.(...args)
  await restoreSourceLink()
}

async function shareSource() {
  if (copying.value || restoringSource.value) return
  copying.value = true
  const sharedSource = source.value
  // Clipboard completion can arrive after another edit or render. Describe
  // the source being copied, not whichever preview exists when it resolves.
  const currentPreview = state.value.status === 'ready' && !state.value.stale
  const link = updateSourceLink()
  try {
    if (navigator.clipboard?.write && typeof ClipboardItem !== 'undefined') {
      // Start within the click's user activation, before lazy codec loading.
      // The clipboard consumes the text promise once compression finishes.
      const text = link.then(href => {
        if (!href) throw new Error('Source changed before sharing')
        return new Blob([href], { type: 'text/plain' })
      })
      const item = new ClipboardItem({ 'text/plain': text })
      await Promise.all([navigator.clipboard.write([item]), text])
    } else {
      const href = await link
      if (!href) return
      await navigator.clipboard.writeText(href)
    }
    analytics.action('copy_link', currentPreview)
    if (source.value === sharedSource) shareFeedback.value = 'Link copied.'
  } catch {
    // A denied write may settle before compression; finish updating the address
    // bar before suggesting it as the fallback.
    const href = await link
    if (href && source.value === sharedSource) shareFeedback.value = 'Could not copy the link. Copy it from the address bar.'
  } finally {
    copying.value = false
  }
}

// Query or fragment navigation can reuse this component. Read the raw URL because the
// router's hash is already decoded; decoding it again would corrupt literal % text.
async function restoreSourceLink() {
  if (!isSourcePage()) return
  const href = window.location.href
  // Initial mounting, router hooks, and popstate can report the same URL.
  if (href === lastSourceHref) return
  clearTimeout(sourceLinkTimer)
  sourceLinkTimer = undefined
  shareFeedback.value = ''
  lastSourceHref = href
  const revision = ++sourceLinkRevision
  restoringSource.value = true
  sourceLinkPending = false
  const restored = await readSourceLink(href) ?? defaultSource
  if (revision !== sourceLinkRevision || !isSourcePage() || window.location.href !== href) return
  restoringSource.value = false
  diagramAnalytics.restore(restored)
  if (restored === source.value) return
  source.value = restored
  renderNow()
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

onMounted(async () => {
  analytics.page(window.location.href, document.referrer)
  sourcePath = window.location.pathname.replace(/\.html$/, '')
  previousBeforeRouteChange = router.onBeforeRouteChange
  router.onBeforeRouteChange = beforeRouteChange
  previousAfterRouteChange = router.onAfterRouteChange
  router.onAfterRouteChange = afterRouteChange
  window.addEventListener('hashchange', restoreSourceLink)
  window.addEventListener('popstate', restoreSourceLink)
  await restoreSourceLink()
  if (disposed) return
  renderer = createPlaygroundRenderer({
    createWorker: () => new Worker(new URL('../playground/renderer.worker.mjs', import.meta.url), { type: 'module' }),
    onState: acceptState,
  })
  renderNow()
})

onBeforeUnmount(() => {
  disposed = true
  sourceLinkRevision += 1
  clearTimeout(sourceLinkTimer)
  if (router.onBeforeRouteChange === beforeRouteChange) router.onBeforeRouteChange = previousBeforeRouteChange
  if (router.onAfterRouteChange === afterRouteChange) router.onAfterRouteChange = previousAfterRouteChange
  window.removeEventListener('hashchange', restoreSourceLink)
  window.removeEventListener('popstate', restoreSourceLink)
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
          <div class="source-actions">
            <button type="button" class="share-button" :disabled="copying || restoringSource" title="Copy a link to this source" @click="shareSource">Share</button>
            <button type="button" class="render-button" :disabled="['loading', 'rendering'].includes(state.status) || !source.trim()" @click="renderNow">Render now</button>
          </div>
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
        <div class="editor-help">
          <p id="editor-help">Auto-renders and updates the link after a short pause. Ctrl / ⌘ + Enter to render now.</p>
          <p role="status" aria-label="Share status">{{ shareFeedback }}</p>
        </div>
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
.source-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.share-button, .render-button { padding: 5px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; }
.share-button { background: var(--vp-c-default-3); color: var(--vp-c-text-1); }
.share-button:hover:enabled { background: var(--vp-c-default-2); }
.render-button { background: var(--vp-c-brand-3); color: var(--vp-c-white); }
.render-button:hover:enabled { background: var(--vp-c-brand-2); }
.share-button:disabled, .render-button:disabled { opacity: 0.5; cursor: default; }
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
