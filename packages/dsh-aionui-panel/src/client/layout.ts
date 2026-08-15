/**
 * The DOM layout controller: extends the web shell's three-column frame (the
 * AppFrame grid) with ONE trailing grid track — the right panel column — that
 * splits into two stacked regions: the explorer (file tree) on top and the
 * preview/editor below. The shell's own inline grid-template-columns string is
 * mirrored and re-appended on every shell update (MutationObserver, same frame
 * before paint). Also owns the vertical width handle, the horizontal
 * preview-height handle, the floating expand button, and the
 * collapse-as-width-0 keep-mounted behavior.
 *
 * NOTE (rc.6): the shell's AppFrame carries no `data-dsh-frame` attribute in
 * this build (the family repo's `[data-dsh-frame]` selectors target master),
 * so the frame is located structurally via its stable `[data-shell-overlay]`
 * child, with an inline-grid scan as fallback. On attach the frame is marked
 * with `data-aionui-frame` so the drag machinery and the CSS instant rule can
 * target it without the missing attribute.
 *
 * The shell's inline style is the source of truth for the sidebar and details
 * tracks; this controller never guesses their widths. Handles are out-of-flow
 * (absolute), so appending tracks never disturbs the shell's own children.
 *
 * AionUi Layout architecture (Apache-2.0, re-implemented): the panel column
 * collapses to width 0 while staying mounted; the preview region collapses to
 * height 0 while staying mounted.
 * @module dsh-aionui-panel/client/layout
 */

import {
  DEFAULT_WORKSPACE_PANEL_PX,
  MAX_WORKSPACE_PANEL_PX,
  MIN_WORKSPACE_PANEL_PX,
  KEY_EXPLORER_WIDTH,
  clampExplorerWidth,
} from './store.ts'
import { readStoredNumber, writeStoredNumber } from './persist.ts'
import type { LayoutStore } from './store.ts'

/** The frame grid element (portals target it). */
let frameElement: HTMLElement | null = null

/**
 * Locate the shell's AppFrame grid. rc.6 exposes no stable attribute for it:
 * the overlay layer div is a direct child carrying `data-shell-overlay`, so
 * its parent is the frame. Fallback: the first element whose inline
 * grid-template-columns matches the shell's 3-track layout.
 */
function findFrame(): HTMLElement | null {
  const overlay = document.querySelector<HTMLElement>('[data-shell-overlay]')
  if (overlay !== null && overlay.parentElement !== null) return overlay.parentElement
  const candidates = document.querySelectorAll<HTMLElement>('div')
  for (const el of candidates) {
    const inline = el.style.gridTemplateColumns
    if (inline !== '' && /minmax\(0,\s*1fr\)/.test(inline) && /px/.test(inline)) return el
  }
  return null
}

/** Read the current frame element (undefined while the shell is not mounted). */
export function getFrameElement(): HTMLElement | null {
  return frameElement
}

/**
 * Parse an inline grid-template-columns string into its tracks. Handles
 * "minmax(0, 1fr)" (spaces inside parens must not split). Empty on failure.
 */
export function parseGridTracks(input: string): string[] {
  const tracks: string[] = []
  let depth = 0
  let current = ''
  for (const char of input) {
    if (char === '(') depth += 1
    if (char === ')') depth = Math.max(0, depth - 1)
    if (char === ' ' && depth === 0) {
      if (current !== '') {
        tracks.push(current)
        current = ''
      }
      continue
    }
    current += char
  }
  if (current !== '') tracks.push(current)
  return tracks
}

/** Extract a px width from one track (0 for fr/minmax/non-px tracks). */
export function trackPx(track: string): number {
  const match = /^(-?[\d.]+)px$/.exec(track.trim())
  return match === null ? 0 : Number(match[1])
}

/** One drag handle's geometry (hit zone + visual line) — pure CSS in the module. */
export const EXPLORER_HANDLE_WIDTH = 12
/** The horizontal preview-height handle's hit zone. */
export const PREVIEW_HEIGHT_HANDLE_PX = 8

/** Preview region height bounds (px). */
const MIN_PREVIEW_HEIGHT = 120
const MAX_PREVIEW_HEIGHT = 800
const DEFAULT_PREVIEW_HEIGHT = 320
const KEY_PREVIEW_HEIGHT = 'aionui-preview-height-px'

/** The layout controller: frame sync, handles, floating button, width math. */
export class PanelLayoutController {
  private frame: HTMLElement | null = null
  private panelCol: HTMLDivElement | null = null
  private explorerCol: HTMLDivElement | null = null
  private previewCol: HTMLDivElement | null = null
  private widthHandle: HTMLDivElement | null = null
  private heightHandle: HTMLDivElement | null = null
  private floatingButton: HTMLButtonElement | null = null
  private styleObserver: MutationObserver | null = null
  private sizeObserver: ResizeObserver | null = null
  private waitObserver: MutationObserver | null = null
  private frameWidth = 0
  /** The shell's own 3 tracks (sidebar, center, details) — mirror of its inline style. */
  private shellTracks: string[] = []
  private previewHeight = readStoredNumber(KEY_PREVIEW_HEIGHT, MIN_PREVIEW_HEIGHT, MAX_PREVIEW_HEIGHT, DEFAULT_PREVIEW_HEIGHT)
  private instantTimer: ReturnType<typeof setTimeout> | undefined
  private disposers: Array<() => void> = []

  constructor(private readonly layout: LayoutStore) {}

  /** Start watching for the frame and attach once it appears. */
  mount(): void {
    const tryAttach = (): void => {
      if (this.frame !== null) return
      const frame = findFrame()
      if (frame === null) return
      this.attach(frame)
    }
    this.waitObserver = new MutationObserver(() => { tryAttach() })
    this.waitObserver.observe(document.body, { childList: true, subtree: true })
    tryAttach()
  }

  /** Attach to the frame: the panel column, handles, observers, store subscription. */
  private attach(frame: HTMLElement): void {
    this.frame = frame
    frameElement = frame
    // Mark the frame for the drag machinery and the CSS instant rule (rc.6
    // AppFrame has no `data-dsh-frame` attribute to target).
    frame.dataset.aionuiFrame = ''

    // ONE trailing grid item (track 4): the right panel column, split into the
    // explorer region (top) and the preview/editor region (bottom).
    const panelCol = document.createElement('div')
    panelCol.dataset.aionuiPanelCol = ''
    panelCol.className = 'aionui-panel-col'
    panelCol.style.minWidth = '0'
    panelCol.style.minHeight = '0'
    panelCol.style.overflow = 'hidden'
    panelCol.style.display = 'flex'
    panelCol.style.flexDirection = 'column'
    panelCol.style.borderLeft = '1px solid var(--aion-bg-3, #e5e6eb)'

    const explorerCol = document.createElement('div')
    explorerCol.dataset.aionuiExplorerCol = ''
    explorerCol.className = 'aionui-explorer-col'
    explorerCol.style.minWidth = '0'
    explorerCol.style.minHeight = '0'
    explorerCol.style.flex = '1 1 0'
    explorerCol.style.overflow = 'hidden'
    explorerCol.style.display = 'flex'
    explorerCol.style.flexDirection = 'column'

    const heightHandle = document.createElement('div')
    heightHandle.className = 'aionui-preview-height-handle'
    heightHandle.style.flex = '0 0 auto'
    heightHandle.style.height = `${PREVIEW_HEIGHT_HANDLE_PX}px`
    heightHandle.style.cursor = 'row-resize'
    heightHandle.style.zIndex = '20'
    heightHandle.addEventListener('pointerdown', (event: PointerEvent) => this.startHeightDrag(event))

    const previewCol = document.createElement('div')
    previewCol.dataset.aionuiPreviewCol = ''
    previewCol.className = 'aionui-preview-col'
    previewCol.style.minWidth = '0'
    previewCol.style.minHeight = '0'
    previewCol.style.flex = '0 0 auto'
    previewCol.style.overflow = 'hidden'
    previewCol.style.display = 'flex'
    previewCol.style.flexDirection = 'column'
    previewCol.style.borderTop = '1px solid var(--aion-bg-3, #e5e6eb)'

    panelCol.appendChild(explorerCol)
    panelCol.appendChild(heightHandle)
    panelCol.appendChild(previewCol)
    frame.appendChild(panelCol)
    this.panelCol = panelCol
    this.explorerCol = explorerCol
    this.previewCol = previewCol

    // The vertical width handle (out of the grid flow), on the column's left
    // edge: dragging left widens (reverse).
    this.widthHandle = document.createElement('div')
    this.widthHandle.className = 'aionui-explorer-handle'
    this.widthHandle.style.position = 'absolute'
    this.widthHandle.style.top = '0'
    this.widthHandle.style.bottom = '0'
    this.widthHandle.style.zIndex = '30'
    this.widthHandle.style.cursor = 'col-resize'
    this.widthHandle.style.width = `${EXPLORER_HANDLE_WIDTH}px`
    this.widthHandle.style.marginLeft = `${-EXPLORER_HANDLE_WIDTH / 2}px`
    frame.appendChild(this.widthHandle)
    this.widthHandle.addEventListener('pointerdown', (event: PointerEvent) => this.startWidthDrag(event))
    this.widthHandle.addEventListener('dblclick', () => {
      this.instant(() => {
        this.layout.update((prev) => ({ ...prev, explorerWidth: DEFAULT_WORKSPACE_PANEL_PX }))
        writeStoredNumber(KEY_EXPLORER_WIDTH, DEFAULT_WORKSPACE_PANEL_PX)
        this.applyGrid()
      })
    })

    // The floating expand button (fixed, right edge) — DOM-level, no React.
    this.floatingButton = document.createElement('button')
    this.floatingButton.type = 'button'
    this.floatingButton.className = 'aionui-floating-expand'
    this.floatingButton.setAttribute('aria-label', 'Expand explorer')
    this.floatingButton.innerHTML = '<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3l5 5-5 5"/></svg>'
    this.floatingButton.addEventListener('click', () => { this.toggleExplorer() })
    document.body.appendChild(this.floatingButton)

    // Sync the shell's inline grid: any shell write re-appends our track.
    const syncGrid = (): void => {
      const el = this.frame
      if (el === null) return
      const inline = el.style.gridTemplateColumns
      if (inline === '') return
      const tracks = parseGridTracks(inline)
      if (tracks.length >= 2 && tracks.length <= 3) {
        // The shell's own write (3 tracks) — remember it and re-append ours.
        this.shellTracks = tracks
        this.applyGrid()
        return
      }
      if (tracks.length === 4 && this.shellTracks.length === 3) {
        // Our own write — keep it (the shell tracks are already mirrored).
        return
      }
      if (tracks.length >= 5) {
        // A stale write from the previous two-column layout (preview +
        // explorer beside each other) may survive on the frame: the first
        // three tracks are still the shell's, so mirror them and rewrite
        // into the new stacked single-column layout.
        this.shellTracks = tracks.slice(0, 3)
        this.applyGrid()
      }
    }
    this.styleObserver = new MutationObserver(syncGrid)
    this.styleObserver.observe(frame, { attributes: true, attributeFilter: ['style'] })

    // Measure the row width: frame minus the shell's sidebar + details tracks.
    const measure = (): void => {
      if (this.frame === null) return
      this.frameWidth = this.frame.getBoundingClientRect().width
      const sidebar = this.shellTracks.length >= 1 ? trackPx(this.shellTracks[0]) : 0
      const details = this.shellTracks.length >= 3 ? trackPx(this.shellTracks[2]) : 0
      const available = Math.max(0, this.frameWidth - sidebar - details)
      const state = this.layout.getSnapshot()
      if (Math.abs(state.availableWidth - available) > 0.5) {
        this.layout.update((prev) => ({ ...prev, availableWidth: available }))
      }
      this.layout.shrinkToFit(this.layout.getSnapshot())
    }
    this.sizeObserver = new ResizeObserver(() => {
      measure()
      this.applyGrid()
    })
    this.sizeObserver.observe(frame)

    // Store -> DOM: grid, handles, floating button.
    this.disposers.push(this.layout.subscribe(() => this.applyGrid()))

    // Initial sync: read the shell's inline style (it is already applied).
    const initial = frame.style.gridTemplateColumns
    if (initial !== '') {
      const tracks = parseGridTracks(initial)
      if (tracks.length >= 2 && tracks.length <= 3) {
        this.shellTracks = tracks
      } else if (tracks.length >= 4) {
        // Either our own previous write (4 tracks, hot reload) or a stale
        // two-column write (5 tracks): the first three are always the shell's.
        this.shellTracks = tracks.slice(0, 3)
      }
    }
    measure()
    this.applyGrid()
  }

  /** Pointer drag on the width handle: the panel column width follows. */
  private startWidthDrag(event: PointerEvent): void {
    event.preventDefault()
    const startX = event.clientX
    const startWidth = this.layout.getSnapshot().explorerWidth
    const onMove = (moveEvent: PointerEvent): void => {
      const delta = moveEvent.clientX - startX
      const width = Math.min(MAX_WORKSPACE_PANEL_PX, Math.max(MIN_WORKSPACE_PANEL_PX, startWidth - delta))
      this.layout.update((prev) => ({ ...prev, explorerWidth: width }))
    }
    const onUp = (): void => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      writeStoredNumber(KEY_EXPLORER_WIDTH, this.layout.getSnapshot().explorerWidth)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  /** Pointer drag on the height handle: the preview region height follows. */
  private startHeightDrag(event: PointerEvent): void {
    event.preventDefault()
    const startY = event.clientY
    const startHeight = this.previewHeight
    const onMove = (moveEvent: PointerEvent): void => {
      const delta = moveEvent.clientY - startY
      this.previewHeight = Math.min(MAX_PREVIEW_HEIGHT, Math.max(MIN_PREVIEW_HEIGHT, startHeight - delta))
      this.applyGrid()
    }
    const onUp = (): void => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      writeStoredNumber(KEY_PREVIEW_HEIGHT, this.previewHeight)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  /** Toggle explorer collapse (width 0, kept mounted; no transition). */
  toggleExplorer(): void {
    const state = this.layout.getSnapshot()
    const next = !state.explorerCollapsed
    this.instant(() => {
      this.layout.update((prev) => ({ ...prev, explorerCollapsed: next }))
      try {
        localStorage.setItem(`project-panel-collapse:${state.root}`, next ? 'collapsed' : 'expanded')
      } catch {
        // best-effort
      }
      this.applyGrid()
    })
  }

  /** Toggle the preview region (open = tabs exist; close keeps tabs). */
  setPreviewOpen(open: boolean): void {
    this.instant(() => {
      this.layout.update((prev) => ({ ...prev, previewOpen: open }))
      this.applyGrid()
    })
  }

  /** Apply one store update with transitions disabled for exactly one frame. */
  private instant(fn: () => void): void {
    const frame = this.frame
    if (frame === null) {
      fn()
      return
    }
    frame.setAttribute('data-aionui-instant', '')
    if (this.instantTimer !== undefined) clearTimeout(this.instantTimer)
    this.instantTimer = setTimeout(() => {
      this.instantTimer = undefined
      frame.removeAttribute('data-aionui-instant')
    }, 0)
    fn()
  }

  /** Re-write the frame grid and reposition handles + floating button. */
  private applyGrid(): void {
    const frame = this.frame
    if (frame === null) return
    // Never guess the shell tracks: without a mirrored shell write, the old
    // fallback zeroed the sidebar track (the bug where the left sidebar
    // vanished after a hot reload). Skip the write until syncGrid observes
    // the shell's own 3-track grid.
    if (this.shellTracks.length !== 3) return
    const state = this.layout.getSnapshot()
    const panel = this.layout.explorerWidthPx(state)
    const previewOpen = state.previewOpen
    const mode = state.previewMode
    const side = mode === 'side'
    const floating = mode === 'float'
    const triple = mode === 'triple'

    // Triple IDE layout: the panel column becomes TWO side-by-side columns —
    // the file tree (explorerWidth) and the preview (previewWidth) — so the
    // frame reads 对话 | 文件树 | 预览.
    const tripleWidth = triple && previewOpen
      ? Math.min(state.availableWidth > 0 ? state.availableWidth : 1200, Math.round(state.explorerWidth + state.previewWidth))
      : panel

    // Four tracks: shell sidebar, center, shell details, the panel column.
    frame.style.gridTemplateColumns =
      `${this.shellTracks[0]} minmax(0, 1fr) ${this.shellTracks[2]} ${Math.round(tripleWidth)}px`

    // Preview placement: below the tree (column), as a right drawer (row),
    // as a floating pane overlaying the chat area (absolute, outside the
    // grid — the tree column keeps its full width, so the search bar never
    // narrows while a file is open), or as the triple-IDE right column.
    if (this.panelCol !== null) {
      this.panelCol.style.flexDirection = (side || triple) ? 'row' : 'column'
    }
    if (this.explorerCol !== null) {
      if (triple) {
        this.explorerCol.style.flex = '0 0 auto'
        this.explorerCol.style.width = `${Math.round(state.explorerWidth)}px`
        this.explorerCol.style.borderRight = '1px solid var(--aion-bg-3, #e5e6eb)'
      } else {
        this.explorerCol.style.flex = '1 1 0'
        this.explorerCol.style.width = ''
        this.explorerCol.style.borderRight = ''
      }
    }
    if (this.previewCol !== null) {
      if (triple) {
        this.previewCol.style.position = ''
        this.previewCol.style.flex = '1 1 0'
        this.previewCol.style.width = ''
        this.previewCol.style.height = ''
        this.previewCol.style.zIndex = ''
        this.previewCol.style.boxShadow = ''
        this.previewCol.style.borderTop = 'none'
        this.previewCol.style.borderLeft = '1px solid var(--aion-bg-3, #e5e6eb)'
        this.previewCol.style.visibility = 'visible'
      } else if (floating) {
        const width = previewOpen ? Math.round(state.previewWidth) : 0
        // Detach from the grid column: position against the frame.
        this.previewCol.style.position = 'absolute'
        this.previewCol.style.top = '0'
        this.previewCol.style.bottom = '0'
        this.previewCol.style.right = `${Math.round(panel)}px`
        this.previewCol.style.width = `${width}px`
        this.previewCol.style.height = ''
        this.previewCol.style.flex = ''
        this.previewCol.style.zIndex = '25'
        this.previewCol.style.borderTop = 'none'
        this.previewCol.style.borderLeft = '1px solid var(--aion-bg-3, #e5e6eb)'
        this.previewCol.style.boxShadow = '-8px 0 24px rgba(0, 0, 0, 0.25)'
        this.previewCol.style.visibility = width > 0 ? 'visible' : 'hidden'
      } else if (side) {
        const width = previewOpen ? Math.round(state.previewWidth) : 0
        this.previewCol.style.position = ''
        this.previewCol.style.width = `${width}px`
        this.previewCol.style.height = ''
        this.previewCol.style.flex = '0 0 auto'
        this.previewCol.style.zIndex = ''
        this.previewCol.style.boxShadow = ''
        this.previewCol.style.borderTop = 'none'
        this.previewCol.style.borderLeft = '1px solid var(--aion-bg-3, #e5e6eb)'
        this.previewCol.style.visibility = width > 0 ? 'visible' : 'hidden'
      } else {
        const height = previewOpen ? Math.round(this.previewHeight) : 0
        this.previewCol.style.position = ''
        this.previewCol.style.height = `${height}px`
        this.previewCol.style.width = ''
        this.previewCol.style.flex = '0 0 auto'
        this.previewCol.style.zIndex = ''
        this.previewCol.style.boxShadow = ''
        this.previewCol.style.borderTop = '1px solid var(--aion-bg-3, #e5e6eb)'
        this.previewCol.style.borderLeft = 'none'
        this.previewCol.style.visibility = height > 0 ? 'visible' : 'hidden'
      }
    }
    if (this.heightHandle !== null) {
      this.heightHandle.style.display = !floating && !triple && previewOpen ? 'block' : 'none'
    }

    // Width handle: at the left edge of the panel column.
    const width = this.frameWidth > 0 ? this.frameWidth : frame.getBoundingClientRect().width
    if (this.widthHandle !== null) {
      const left = Math.round(width - tripleWidth)
      this.widthHandle.style.left = `${left}px`
      this.widthHandle.style.display = tripleWidth > 0 && state.root !== '' ? 'block' : 'none'
    }

    // Floating expand button: visible only when the panel is collapsed.
    if (this.floatingButton !== null) {
      const show = state.root !== '' && state.explorerCollapsed
      this.floatingButton.style.display = show ? 'flex' : 'none'
    }
  }

  /** Detach everything (plugin unload). */
  dispose(): void {
    this.waitObserver?.disconnect()
    this.styleObserver?.disconnect()
    this.sizeObserver?.disconnect()
    for (const dispose of this.disposers) dispose()
    this.panelCol?.remove()
    this.widthHandle?.remove()
    this.floatingButton?.remove()
    if (this.instantTimer !== undefined) clearTimeout(this.instantTimer)
    if (frameElement === this.frame) frameElement = null
    this.frame = null
  }
}
