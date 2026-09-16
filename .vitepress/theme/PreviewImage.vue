<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'

// This view owns inspection transforms and export actions. Its input is the
// complete successful PNG; zoom and pan never alter rendering or export bytes.
const props = defineProps({
  imageUrl: { type: String, default: '' },
  result: { type: Object, default: null },
  busy: Boolean,
  stale: Boolean,
  status: { type: String, required: true },
  statusText: { type: String, required: true },
})
const zoom = ref(1)
const offset = ref({ x: 0, y: 0 })
const panning = ref(false)
const copying = ref(false)
const feedback = ref('')
const zoomLabel = computed(() => `${Math.round(zoom.value * 100)}%`)
let panStart
let feedbackTimer
let disposed = false

function resetView() {
  zoom.value = 1
  offset.value = { x: 0, y: 0 }
}

// Zoom around the viewport center, preserving the inspected point there.
function changeZoom(factor) {
  if (!props.imageUrl) return
  const next = Math.max(0.25, Math.min(8, zoom.value * factor))
  const ratio = next / zoom.value
  offset.value = { x: offset.value.x * ratio, y: offset.value.y * ratio }
  zoom.value = next
}

function startPan(event) {
  if (!props.imageUrl || event.button !== 0 || !event.isPrimary) return
  event.preventDefault()
  event.currentTarget.focus({ preventScroll: true })
  event.currentTarget.setPointerCapture(event.pointerId)
  panStart = { id: event.pointerId, x: event.clientX, y: event.clientY, offset: { ...offset.value } }
  panning.value = true
}

function pan(event) {
  if (event.pointerId !== panStart?.id) return
  offset.value = {
    x: panStart.offset.x + event.clientX - panStart.x,
    y: panStart.offset.y + event.clientY - panStart.y,
  }
}

function stopPan(event) {
  if (event.pointerId !== panStart?.id) return
  panStart = undefined
  panning.value = false
  if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
}

function keyboardView(event) {
  if (!props.imageUrl || event.ctrlKey || event.metaKey || event.altKey) return
  const moves = { ArrowLeft: [-30, 0], ArrowRight: [30, 0], ArrowUp: [0, -30], ArrowDown: [0, 30] }
  if (moves[event.key]) {
    event.preventDefault()
    const [x, y] = moves[event.key]
    offset.value = { x: offset.value.x + x, y: offset.value.y + y }
  } else if (['+', '=', '-', '0'].includes(event.key)) {
    event.preventDefault()
    if (event.key === '0') resetView()
    else changeZoom(event.key === '-' ? 1 / 1.25 : 1.25)
  }
}

function notify(message) {
  if (disposed) return
  clearTimeout(feedbackTimer)
  feedback.value = message
  feedbackTimer = setTimeout(() => { feedback.value = '' }, 5000)
}

function download() {
  if (!props.imageUrl) return
  const link = document.createElement('a')
  link.href = props.imageUrl
  link.download = 'textgraph.png'
  link.click()
}

async function copyImage() {
  if (!props.result || copying.value) return
  if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') {
    notify('Image copying is unavailable in this browser. Download the PNG instead.')
    return
  }
  copying.value = true
  try {
    // Start the clipboard write inside the click's user activation. Reading
    // from the rendered bytes avoids an intervening fetch losing that activation.
    const png = new Blob([props.result.png], { type: 'image/png' })
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })])
    notify('Image copied')
  } catch {
    notify('Could not copy the image. Download the PNG instead.')
  } finally {
    copying.value = false
  }
}

// Refreshes retain the user's inspection position. Only clearing the document
// resets it automatically; a new successful render must not jump back to fit.
watch(() => props.imageUrl, url => {
  if (!url) {
    resetView()
    panStart = undefined
    panning.value = false
  }
})
onBeforeUnmount(() => { disposed = true; clearTimeout(feedbackTimer) })
</script>

<template>
  <section class="preview-panel" aria-label="Diagram preview">
    <header class="preview-heading">
      <h2 :title="statusText">Preview</h2>
      <span class="sr-only" role="status" aria-label="Render status">{{ statusText }}</span>
      <div class="preview-tools" role="group" aria-label="Image controls">
        <button type="button" aria-label="Zoom out" title="Zoom out" :disabled="!imageUrl || zoom <= 0.25" @click="changeZoom(1 / 1.25)">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="10" r="6" /><path d="m15 15 5 5M7 10h6" /></svg>
        </button>
        <button type="button" aria-label="Zoom in" title="Zoom in" :disabled="!imageUrl || zoom >= 8" @click="changeZoom(1.25)">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="10" r="6" /><path d="m15 15 5 5M7 10h6M10 7v6" /></svg>
        </button>
        <button type="button" aria-label="Reset view" :title="`Reset to fit (${zoomLabel})`" :disabled="!imageUrl" @click="resetView">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4H4v4m12-4h4v4M4 16v4h4m12-4v4h-4M9 9h6v6H9z" /></svg>
        </button>
        <button type="button" aria-label="Download PNG" title="Download full PNG" :disabled="!imageUrl" @click="download">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m-4-4 4 4 4-4M4 16v5h16v-5" /></svg>
        </button>
        <button type="button" aria-label="Copy image" title="Copy image to clipboard" :disabled="!imageUrl || copying" @click="copyImage">
          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V4H4v12h4" /></svg>
        </button>
      </div>
    </header>
    <slot />
    <div
      class="preview-canvas" :class="{ pannable: imageUrl, panning }"
      role="region" aria-label="Image canvas" aria-describedby="preview-help" tabindex="0" :aria-busy="busy"
      @pointerdown="startPan" @pointermove="pan" @pointerup="stopPan" @pointercancel="stopPan" @lostpointercapture="stopPan"
      @keydown="keyboardView"
    >
      <p id="preview-help" class="sr-only">Drag to pan. Use plus and minus to zoom, arrow keys to pan, and zero to reset to fit.</p>
      <div class="preview-image">
        <img
          v-if="imageUrl" :src="imageUrl" alt="Rendered TextGraph diagram" draggable="false"
          :title="stale ? 'Preview from the last successful render' : undefined"
          :width="result.displayWidth ?? result.width / 2" :height="result.displayHeight ?? result.height / 2"
          :style="{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})` }"
        >
        <p v-else class="preview-placeholder">{{ status === 'error' ? 'Fix the errors above to see your diagram.' : status === 'empty' ? 'Your diagram will appear here.' : 'Preparing your preview…' }}</p>
      </div>
      <p v-show="feedback" class="image-feedback" role="status" aria-label="Image actions">{{ feedback }}</p>
    </div>
  </section>
</template>

<style scoped>
.preview-panel { display: flex; flex-direction: column; min-width: 0; min-height: 0; container-type: inline-size; }
.preview-heading { display: flex; flex-shrink: 0; align-items: center; justify-content: space-between; gap: 4px; height: 62px; padding: 10px 12px 10px 20px; border-bottom: 1px solid var(--vp-c-divider); background: var(--vp-c-bg); }
h2 { min-width: 0; overflow: hidden; font-size: 14px; font-weight: 600; white-space: nowrap; }
.preview-tools { display: flex; flex-shrink: 0; align-items: center; gap: 2px; }
button { display: grid; place-items: center; width: 30px; height: 32px; border-radius: 5px; color: var(--vp-c-text-1); cursor: pointer; }
button:hover:enabled { background: var(--vp-c-default-soft); color: var(--vp-c-brand-1); }
button:disabled { opacity: 0.4; cursor: default; }
button:focus-visible, .preview-canvas:focus-visible { outline: 2px solid var(--vp-c-brand-1); outline-offset: -2px; }
svg { width: 19px; height: 19px; fill: none; stroke: currentColor; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
/* Transforms operate inside a clipped viewport, never through scrolling or
   layout. Refresh status and action feedback cannot change its dimensions. */
.preview-canvas { position: relative; display: flex; flex-direction: column; flex: 1; min-height: 0; overflow: clip; background: var(--vp-c-bg-soft); }
.pannable { cursor: grab; touch-action: none; }
.panning { cursor: grabbing; user-select: none; }
.preview-image { position: relative; display: flex; align-items: center; justify-content: center; flex: 1; min-height: 0; margin: 28px; }
.preview-image img { position: absolute; inset: 0; display: block; width: 100%; height: 100%; object-fit: contain; user-select: none; }
.preview-placeholder { color: var(--vp-c-text-2); font-size: 14px; text-align: center; }
.image-feedback { position: absolute; top: 10px; left: 12px; right: 12px; z-index: 1; width: fit-content; max-width: calc(100% - 24px); margin: 0 auto; padding: 8px 12px; border: 1px solid var(--vp-c-divider); border-radius: 6px; background: var(--vp-c-bg); color: var(--vp-c-text-1); font-size: 12px; pointer-events: none; }
@container (max-width: 260px) {
  .preview-heading { justify-content: center; padding-inline: 2px; }
  h2 { position: absolute; width: 1px; height: 1px; clip-path: inset(50%); }
  .preview-tools { gap: 0; }
  button { width: 26px; }
}
@media (max-width: 767px) {
  .preview-panel { height: clamp(360px, 65dvh, 600px); }
  .preview-heading { padding-inline: 16px; }
  .preview-image { margin: 20px; }
}
</style>
