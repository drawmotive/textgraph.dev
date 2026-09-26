<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import { useRouter, withBase } from 'vitepress'
import { createPlaygroundRenderer } from '../playground/renderer.mjs'
import { createSourceLink, readSourceLink } from '../playground/source-link.mjs'
import { canRepair, createRepairSession, requestRepair } from '../playground/repair.mjs'
import { createSourceHistory, sourceDiff } from '../playground/history.mjs'
import packageInfo from '../../package.json'
import { getAnalytics } from '../analytics-browser.mjs'
import { createPlaygroundAnalytics } from '../analytics.mjs'
import PreviewImage from './PreviewImage.vue'

const source = ref(`client -> api : HTTPS
api -> db : Query

client: Browser
api(fill primary): API Gateway
db: Database
`)
const defaultSource = source.value
const textarea = ref(null)
const history = createSourceHistory(source.value)
const undoAvailable = ref(false)
const redoAvailable = ref(false)
const composing = ref(false)
const repair = shallowRef({ status: 'idle' })
const candidateImageUrl = ref('')
let repairSession
const reviewing = computed(() => repair.value.status === 'review')
const fixing = computed(() => ['requesting', 'rendering'].includes(repair.value.status))
const repairable = computed(() => canRepair(state.value))
const diagnostics = computed(() => state.value.status === 'error' ? state.value.diagnostics.filter(item => item.severity === 'error') : [])
const diff = computed(() => reviewing.value ? sourceDiff(repair.value.original, repair.value.source) : [])
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
  error: 'Could not render the diagram',
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
  if (composing.value) return
  renderer?.update(source.value, { immediate: true })
}

function refreshHistory() {
  undoAvailable.value = history.canUndo
  redoAvailable.value = history.canRedo
}

function captureSelection() {
  if (textarea.value) history.capture(textarea.value.selectionStart, textarea.value.selectionEnd)
}

function beforeInput(event) {
  if (['historyUndo', 'historyRedo'].includes(event.inputType) && !composing.value) {
    event.preventDefault()
    restoreHistory(event.inputType === 'historyUndo' ? 'undo' : 'redo')
  } else if (!composing.value) captureSelection()
}

function startComposition() {
  captureSelection()
  history.breakGroup()
  composing.value = true
}

function finishComposition(event) {
  composing.value = false
  edit(event)
}

// All source mutations invalidate review before rendering or sharing. A pending
// request cannot resurrect a candidate after even an edit-and-undo sequence.
function changeSource(value, { isComposing = false, immediate = false } = {}) {
  repairSession?.invalidate()
  sourceLinkRevision += 1
  restoringSource.value = false
  source.value = value
  diagramAnalytics.edit(source.value, { composing: isComposing })
  shareFeedback.value = ''
  // Coalesce typing to avoid browser history API rate limits. Sharing flushes
  // this timer so a click always copies the current text, even during rendering.
  clearTimeout(sourceLinkTimer)
  sourceLinkTimer = setTimeout(updateSourceLink, 250)
  // Composition text is incomplete until the IME commits it.
  if (!isComposing) renderer?.update(source.value, { immediate })
}

function edit(event) {
  const isComposing = composing.value || event.isComposing
  if (!isComposing) {
    const group = ['insertText', 'deleteContentBackward', 'deleteContentForward'].includes(event.inputType) ? event.inputType : undefined
    history.record(event.target.value, event.target.selectionStart, event.target.selectionEnd, { group })
    refreshHistory()
  }
  changeSource(event.target.value, { isComposing })
}

async function restoreHistory(action) {
  if (composing.value) return
  captureSelection()
  const entry = history[action]()
  refreshHistory()
  changeSource(entry.source)
  await nextTick()
  textarea.value?.focus()
  textarea.value?.setSelectionRange(entry.start, entry.end)
}

function editorKeydown(event) {
  if (composing.value || event.isComposing || !(event.ctrlKey || event.metaKey) || event.altKey) return
  const key = event.key.toLowerCase()
  if (key === 'z' || key === 'y') {
    event.preventDefault()
    restoreHistory(key === 'y' || event.shiftKey ? 'redo' : 'undo')
  }
}

function fixSource() {
  if (repairable.value && !composing.value && !restoringSource.value) repairSession?.start(source.value)
}

async function applyRepair() {
  if (!reviewing.value || repair.value.original !== source.value || composing.value) return
  const repaired = repair.value.source
  captureSelection()
  history.record(repaired, 0, 0)
  refreshHistory()
  changeSource(repaired, { immediate: true })
  await nextTick()
  textarea.value?.focus()
  textarea.value?.setSelectionRange(0, 0)
}

function acceptRepair(next) {
  const previous = candidateImageUrl.value
  candidateImageUrl.value = next.status === 'review' ? URL.createObjectURL(new Blob([next.result.png], { type: 'image/png' })) : ''
  if (previous) URL.revokeObjectURL(previous)
  repair.value = next
}

// Decode before offering Apply: a successful SDK flag alone cannot prove that
// the browser can display the candidate bytes being reviewed.
async function validateCandidate(result) {
  const url = URL.createObjectURL(new Blob([result.png], { type: 'image/png' }))
  try {
    const image = new Image()
    image.src = url
    await image.decode()
    if (!image.naturalWidth || !image.naturalHeight) throw new Error('Empty PNG')
  } finally { URL.revokeObjectURL(url) }
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
  repairSession?.invalidate()
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

// Query navigation can reuse this component. Read the current URL so router
// navigation and browser history restore the same versioned source data.
async function restoreSourceLink() {
  if (!isSourcePage()) return
  const href = window.location.href
  // Initial mounting, router hooks, and popstate can report the same URL.
  if (href === lastSourceHref) return
  repairSession?.invalidate()
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
  history.reset(restored)
  refreshHistory()
  if (restored === source.value) return
  source.value = restored
  renderNow()
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
  window.addEventListener('popstate', restoreSourceLink)
  await restoreSourceLink()
  if (disposed) return
  renderer = createPlaygroundRenderer({
    createWorker: () => new Worker(new URL('../playground/renderer.worker.mjs', import.meta.url), { type: 'module' }),
    onState: acceptState,
  })
  repairSession = createRepairSession({
    request: (value, signal) => requestRepair(value, {
      endpoint: import.meta.env.VITE_TEXTGRAPH_FIX_API_URL || undefined,
      rendererVersion: packageInfo.devDependencies['@drawmotive/textgraph'],
      signal,
    }),
    createRenderer: onState => createPlaygroundRenderer({
      createWorker: () => new Worker(new URL('../playground/renderer.worker.mjs', import.meta.url), { type: 'module' }),
      onState,
    }),
    validateResult: validateCandidate,
    onState: acceptRepair,
  })
  renderNow()
})

onBeforeUnmount(() => {
  disposed = true
  sourceLinkRevision += 1
  clearTimeout(sourceLinkTimer)
  if (router.onBeforeRouteChange === beforeRouteChange) router.onBeforeRouteChange = previousBeforeRouteChange
  if (router.onAfterRouteChange === afterRouteChange) router.onAfterRouteChange = previousAfterRouteChange
  window.removeEventListener('popstate', restoreSourceLink)
  renderer?.dispose()
  repairSession?.dispose()
  if (imageUrl.value) URL.revokeObjectURL(imageUrl.value)
  if (candidateImageUrl.value) URL.revokeObjectURL(candidateImageUrl.value)
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
            <button type="button" class="share-button" :disabled="!undoAvailable || composing" title="Undo (Ctrl / ⌘ + Z)" @click="restoreHistory('undo')">Undo</button>
            <button type="button" class="share-button" :disabled="!redoAvailable || composing" title="Redo (Ctrl / ⌘ + Shift + Z)" @click="restoreHistory('redo')">Redo</button>
            <button type="button" class="share-button" :disabled="copying || restoringSource" title="Copy a link to this source" @click="shareSource">Share</button>
            <button type="button" class="render-button" :disabled="['loading', 'rendering'].includes(state.status) || !source.trim()" @click="renderNow">Render now</button>
          </div>
        </header>
        <textarea
          ref="textarea"
          id="textgraph-source"
          :value="source"
          spellcheck="false"
          autocapitalize="off"
          autocomplete="off"
          autocorrect="off"
          aria-describedby="editor-help"
          placeholder="client -> api -> database"
          @input="edit"
          @beforeinput="beforeInput"
          @compositionstart="startComposition"
          @compositionend="finishComposition"
          @keydown="editorKeydown"
          @pointerdown="history.breakGroup()"
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

      <PreviewImage
        :image-url="reviewing ? candidateImageUrl : imageUrl" :result="reviewing ? repair.result : state.result"
        :busy="busy || fixing" :stale="!reviewing && state.stale" :status="reviewing ? 'review' : state.status"
        :status-text="reviewing ? 'Review the repaired diagram before replacing your source' : statusText"
      >
        <div v-if="reviewing" class="repair-review" aria-label="Repair review" role="region">
          <p><strong>Review the repaired diagram</strong></p>
          <p>Your source is unchanged. Check the diagram and source changes before applying.</p>
          <div class="repair-actions">
            <button class="render-button" type="button" @click="applyRepair">Replace original DSL</button>
            <button class="share-button" type="button" @click="repairSession.invalidate()">Discard</button>
          </div>
          <details>
            <summary>Review source changes</summary>
            <pre class="source-diff" aria-label="Source changes"><code><span v-for="(line, index) in diff" :key="index" :class="line.kind">{{ ({ same: '  ', added: '+ ', removed: '− ' })[line.kind] }}{{ line.text }}</span></code></pre>
          </details>
        </div>
        <template #overlay>
          <section v-if="diagnostics.length && !reviewing" class="error-overlay" data-preview-overlay aria-label="Diagram errors">
            <div class="error-heading">
              <h3>Could not render the diagram</h3>
              <div v-if="repairable" class="fix-action">
                <button class="render-button" type="button" :disabled="fixing || composing || restoringSource" @click="fixSource">{{ fixing ? 'Fixing…' : 'Fix It' }}</button>
                <small>powered by gpt-6-luna</small>
              </div>
            </div>
            <ul class="diagnostic-list">
              <li v-for="(diagnostic, index) in diagnostics" :key="index">
                <strong>{{ diagnostic.code }}</strong>
                <span v-if="diagnostic.location"> · Line {{ diagnostic.location.line + 1 }}, column {{ diagnostic.location.column + 1 }}</span>
                <p>{{ diagnostic.message }}</p>
              </li>
            </ul>
            <p v-if="repairable" class="repair-disclosure">Fix It sends this DSL to Azure AI to suggest a repair. Do not include sensitive information. Review the suggestion before applying it.</p>
            <p v-else>Check your connection and try Render now again. Fix It cannot repair renderer, font, or layout failures.</p>
            <p v-if="fixing || repair.status === 'error'" role="status" aria-label="Fix status">{{ repair.status === 'requesting' ? 'Requesting a repair…' : repair.status === 'rendering' ? 'Rendering the suggested repair…' : repair.message }}</p>
            <button v-if="fixing" type="button" class="share-button" @click="repairSession.invalidate()">Cancel</button>
          </section>
        </template>
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
.error-overlay { position: absolute; inset: 0; z-index: 2; padding: 20px; overflow: auto; background: color-mix(in srgb, var(--vp-c-bg) 88%, transparent); color: var(--vp-c-text-1); backdrop-filter: blur(2px); cursor: auto; touch-action: auto; font-size: 13px; line-height: 1.6; overflow-wrap: anywhere; }
.error-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.error-heading h3 { font-size: 15px; font-weight: 600; }
.fix-action { display: flex; flex-shrink: 0; flex-direction: column; align-items: flex-end; gap: 4px; }
.fix-action small { color: var(--vp-c-text-2); font-size: 10px; }
.diagnostic-list { padding-left: 20px; margin: 20px 0; list-style: disc; }
.diagnostic-list li + li { margin-top: 12px; }
.diagnostic-list strong { color: var(--vp-c-danger-1); }
.repair-disclosure { color: var(--vp-c-text-2); }
.error-overlay [role="status"] { margin: 12px 0; }
.repair-review { padding: 12px 20px; background: var(--vp-c-bg-soft); border-bottom: 1px solid var(--vp-c-divider); font-size: 12px; line-height: 1.6; max-height: 48%; overflow: auto; flex-shrink: 0; }
.repair-actions { display: flex; flex-wrap: wrap; gap: 8px; margin: 8px 0; }
.repair-review summary { cursor: pointer; color: var(--vp-c-brand-1); }
.source-diff { margin-top: 8px; white-space: pre-wrap; overflow-wrap: anywhere; font: 12px/1.6 var(--vp-font-family-mono); }
.source-diff span { display: block; }
.source-diff .added { background: var(--vp-c-tip-soft); }
.source-diff .removed { background: var(--vp-c-danger-soft); }
@media (max-width: 767px) {
  .playground { padding: 12px; }
  .playground-workspace { grid-template-columns: minmax(0, 1fr); height: auto; max-height: none; }
  .source-panel { border-right: 0; border-bottom: 1px solid var(--vp-c-divider); }
  .pane-splitter { display: none; }
  textarea { min-height: 320px; font-size: 16px; padding: 16px; }
  .panel-heading { padding: 12px 16px; }
}
</style>
