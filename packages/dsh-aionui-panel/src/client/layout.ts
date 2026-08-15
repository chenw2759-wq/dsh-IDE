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
  KEY_FLOAT_POS,
  KEY_PREVIEW_WIDTH,
  clampExplorerWidth,
  clampSidePreviewWidth,
} from './store.ts'
import { readStoredNumber, writeStoredNumber } from './persist.ts'
import type { LayoutStore } from './store.ts'

/** Focus-rail width (P1.3): the collapsed file tree beside an open preview. */
const RAIL_PX = 30

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
  private terminalHost: HTMLDivElement | null = null
  private chatCol: HTMLElement | null = null
  private widthHandle: HTMLDivElement | null = null
  private heightHandle: HTMLDivElement | null = null
  private floatingButton: HTMLButtonElement | null = null
  private railButton: HTMLButtonElement | null = null
  private styleObserver: MutationObserver | null = null
  private sizeObserver: ResizeObserver | null = null
  private waitObserver: MutationObserver | null = null
  private frameWidth = 0
  /** The shell's own 3 tracks (sidebar, center, details) — mirror of its inline style. */
  private shellTracks: string[] = []
  private previewHeight = readStoredNumber(KEY_PREVIEW_HEIGHT, MIN_PREVIEW_HEIGHT, MAX_PREVIEW_HEIGHT, DEFAULT_PREVIEW_HEIGHT)
  private instantTimer: ReturnType<typeof setTimeout> | undefined
  private disposers: Array<() => void> = []

  constructor(
    private readonly layout: LayoutStore,
    private readonly settingsGetter?: () => { features: { terminalDock: boolean } },
  ) {}

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

    // Free-drag the floating preview pane: any pointerdown landing on the
    // tab-bar grab strip (marked data-aionui-float-drag) starts a position
    // drag when the preview is in float mode.
    previewCol.addEventListener('pointerdown', (event: PointerEvent) => this.startFloatDrag(event))

    // The integrated terminal host: docks over the BOTTOM FIFTH of the CHAT
    // column (the second grid child), never over the panels. The chat column
    // gets a matching bottom padding so the two never overlap.
    const terminalHost = document.createElement('div')
    terminalHost.dataset.aionuiTerminalHost = ''
    terminalHost.style.position = 'absolute'
    terminalHost.style.zIndex = '26'
    terminalHost.style.display = 'none'
    frame.appendChild(terminalHost)
    this.terminalHost = terminalHost
    const chatCandidate = frame.children[1] as HTMLElement | undefined
    if (chatCandidate !== undefined && chatCandidate !== panelCol) this.chatCol = chatCandidate

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

    // P1.3 rail button: when the preview is open (side/triple) and the tree is
    // collapsed, the explorer stays as a thin right rail (RAIL_PX) with a
    // small expand tab — the focus mode. Fixed like the floating button, but
    // positioned at the rail's center; the rail itself is the explorer track.
    this.railButton = document.createElement('button')
    this.railButton.type = 'button'
    this.railButton.className = 'aionui-rail-expand'
    this.railButton.setAttribute('aria-label', 'Expand explorer')
    this.railButton.innerHTML = '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 3L5 8l5 5"/></svg>'
    this.railButton.addEventListener('click', () => { this.toggleExplorer() })
    document.body.appendChild(this.railButton)

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

  /** Pointer drag on the width handle: the panel column width follows. In
   *  SIDE mode (P1.2) the handle drags the PREVIEW width (0..½ row) — the
   *  explorer keeps its own width and the chat compresses as the preview
   *  grows. Everywhere else it drags the explorer width as before. */
  private startWidthDrag(event: PointerEvent): void {
    event.preventDefault()
    const state = this.layout.getSnapshot()
    const side = state.previewMode === 'side'
    const startX = event.clientX
    const startWidth = side ? state.previewWidth : state.explorerWidth
    const onMove = (moveEvent: PointerEvent): void => {
      const delta = moveEvent.clientX - startX
      if (side) {
        const explorer = state.explorerCollapsed ? 0 : clampExplorerWidth(state.explorerWidth, state.availableWidth, state.previewOpen)
        const width = Math.max(0, Math.min(clampSidePreviewWidth(startWidth - delta, state.availableWidth, explorer), Math.floor(state.availableWidth / 2)))
        this.layout.update((prev) => ({ ...prev, previewWidth: width }))
      } else {
        const width = Math.min(MAX_WORKSPACE_PANEL_PX, Math.max(MIN_WORKSPACE_PANEL_PX, startWidth - delta))
        this.layout.update((prev) => ({ ...prev, explorerWidth: width }))
      }
    }
    const onUp = (): void => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      const current = this.layout.getSnapshot()
      if (side) {
        writeStoredNumber(KEY_PREVIEW_WIDTH, current.previewWidth)
      } else {
        writeStoredNumber(KEY_EXPLORER_WIDTH, current.explorerWidth)
      }
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

  /** Free-drag the floating preview pane (float mode): the tab-bar strip is
   *  the grab area. Position is clamped inside the frame; the store persists
   *  it. Transitions are suspended while dragging so the pane follows the
   *  pointer 1:1, then the 180ms glide re-engages for the settle. */
  private startFloatDrag(event: PointerEvent): void {
    const state = this.layout.getSnapshot()
    if (state.previewMode !== 'float' || !state.previewOpen || this.previewCol === null || this.frame === null) return
    const target = event.target as Element | null
    if (target === null || !target.closest('[data-aionui-float-drag]')) return
    // The tab bar also hosts buttons (mode toggle, collapse, tab close):
    // never hijack a click on an interactive element — only the strip chrome
    // (empty bar area / tab titles) starts a drag.
    if (target.closest('button, [role="button"], input, a, [data-tab-id] [data-aionui-close]')) return
    event.preventDefault()
    const frameH = this.frame.clientHeight > 0 ? this.frame.clientHeight : this.frame.getBoundingClientRect().height
    const floatH = Math.max(240, Math.min(Math.round(frameH * 0.6), 720))
    const width = Math.round(state.previewWidth)
    const startX = event.clientX
    const startY = event.clientY
    const pos = state.floatPos ?? { x: this.frame.getBoundingClientRect().width - Math.round(this.layout.explorerWidthPx(state)) - width - 12, y: Math.round((frameH - floatH) / 2) }
    const startLeft = pos.x
    const startTop = pos.y
    const maxX = Math.max(8, Math.round(this.frameWidth - width - 8))
    const maxY = Math.max(8, frameH - floatH - 8)
    this.previewCol.dataset.aionuiFloatDragging = ''
    this.previewCol.style.transition = 'none'
    const onMove = (moveEvent: PointerEvent): void => {
      const x = Math.min(Math.max(8, startLeft + (moveEvent.clientX - startX)), maxX)
      const y = Math.min(Math.max(8, startTop + (moveEvent.clientY - startY)), maxY)
      this.layout.update((prev) => (prev.floatPos !== null && prev.floatPos.x === x && prev.floatPos.y === y ? prev : { ...prev, floatPos: { x, y } }))
      // Direct DOM write: applyGrid re-runs on the store update anyway, so
      // just nudge it once per move for zero-latency dragging.
      this.previewCol?.style.setProperty('left', `${x}px`)
      this.previewCol?.style.setProperty('top', `${y}px`)
    }
    const onUp = (): void => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      if (this.previewCol !== null) {
        delete this.previewCol.dataset.aionuiFloatDragging
        this.previewCol.style.transition = 'left 180ms cubic-bezier(0.4, 0, 0.2, 1), top 180ms cubic-bezier(0.4, 0, 0.2, 1), width 180ms cubic-bezier(0.4, 0, 0.2, 1), height 180ms cubic-bezier(0.4, 0, 0.2, 1)'
      }
      try {
        localStorage.setItem(KEY_FLOAT_POS, JSON.stringify(this.layout.getSnapshot().floatPos))
      } catch {
        // best-effort
      }
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

    // P1.2: in SIDE mode the preview is its OWN grid track beside the tree —
    // the panel column width becomes explorer + preview, so growing the
    // preview compresses the chat (the 1fr center track), never overlaying it.
    // Range: 0..½ of the available row (clamped; chat floor respected).
    const sidePreviewPx = side && previewOpen ? this.layout.previewWidthPx(state) : 0

    // P1.3 focus rail: with the preview open (side/triple), a collapsed tree
    // becomes a thin right rail (RAIL_PX) with a small expand tab instead of
    // vanishing to nothing — the rail is the explorer track's collapsed size.
    const railActive = state.explorerCollapsed && previewOpen && (side || triple)
    const explorerTrackPx = railActive
      ? RAIL_PX
      : state.explorerCollapsed
        ? 0
        : Math.round(panel)

    // Triple IDE layout: the panel column becomes TWO side-by-side columns —
    // the file tree (explorerWidth) and the preview (previewWidth) — so the
    // frame reads 对话 | 文件树 | 预览.
    const tripleWidth = triple && previewOpen
      ? Math.min(state.availableWidth > 0 ? state.availableWidth : 1200, Math.round(state.explorerWidth + state.previewWidth))
      : Math.round(explorerTrackPx + sidePreviewPx)

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
      if (triple || side) {
        // Triple: file tree is its own fixed-width column beside the preview.
        // Side (P1.2): the tree keeps its stored width; the preview track
        // grows/shrinks next to it, compressing the chat. A collapsed tree
        // shows as the P1.3 focus rail.
        this.explorerCol.style.flex = '0 0 auto'
        this.explorerCol.style.width = `${explorerTrackPx}px`
        this.explorerCol.style.borderRight = '1px solid var(--aion-bg-3, #e5e6eb)'
      } else {
        this.explorerCol.style.flex = '1 1 0'
        this.explorerCol.style.width = ''
        this.explorerCol.style.borderRight = ''
      }
    }
    if (this.previewCol !== null) {
      if (triple) {
        this.previewCol.classList.remove('aionui-float-pane')
        this.previewCol.style.position = ''
        this.previewCol.style.flex = '1 1 0'
        this.previewCol.style.width = ''
        this.previewCol.style.height = ''
        this.previewCol.style.left = ''
        this.previewCol.style.top = ''
        this.previewCol.style.right = ''
        this.previewCol.style.bottom = ''
        this.previewCol.style.transition = ''
        this.previewCol.style.zIndex = ''
        this.previewCol.style.boxShadow = ''
        this.previewCol.style.borderTop = 'none'
        this.previewCol.style.borderLeft = '1px solid var(--aion-bg-3, #e5e6eb)'
        this.previewCol.style.visibility = 'visible'
      } else if (floating) {
        const width = previewOpen ? Math.round(state.previewWidth) : 0
        // Detach from the grid column: a freely draggable floating pane. The
        // position comes from the store (persisted); null = the default slot
        // (right edge, vertically centered-ish). The pane keeps a bounded
        // height so dragging it around stays inside the frame.
        const frameH = frame.clientHeight > 0 ? frame.clientHeight : frame.getBoundingClientRect().height
        const floatH = Math.max(240, Math.min(Math.round(frameH * 0.6), 720))
        const panelPx = Math.round(panel)
        const defaultX = Math.max(8, Math.round(this.frameWidth - panelPx - width - 12))
        const defaultY = Math.max(8, Math.round((frameH - floatH) / 2))
        const pos = state.floatPos ?? { x: defaultX, y: defaultY }
        const maxX = Math.max(8, Math.round(this.frameWidth - width - 8))
        const maxY = Math.max(8, frameH - floatH - 8)
        const x = Math.min(Math.max(8, Math.round(pos.x)), maxX)
        const y = Math.min(Math.max(8, Math.round(pos.y)), maxY)
        this.previewCol.style.position = 'absolute'
        this.previewCol.style.left = `${x}px`
        this.previewCol.style.top = `${y}px`
        this.previewCol.style.right = ''
        this.previewCol.style.bottom = ''
        this.previewCol.style.width = `${width}px`
        this.previewCol.style.height = `${floatH}px`
        this.previewCol.style.flex = ''
        this.previewCol.style.zIndex = '25'
        this.previewCol.style.borderTop = 'none'
        this.previewCol.style.borderLeft = '1px solid var(--aion-bg-3, #e5e6eb)'
        this.previewCol.style.boxShadow = '-8px 0 24px rgba(0, 0, 0, 0.25), 0 8px 24px rgba(0, 0, 0, 0.18)'
        this.previewCol.style.visibility = width > 0 ? 'visible' : 'hidden'
        // Animation: left/top/width/height glide when NOT actively dragging
        // (the drag code sets transition: 'none' for the drag duration).
        this.previewCol.style.transition = 'left 180ms cubic-bezier(0.4, 0, 0.2, 1), top 180ms cubic-bezier(0.4, 0, 0.2, 1), width 180ms cubic-bezier(0.4, 0, 0.2, 1), height 180ms cubic-bezier(0.4, 0, 0.2, 1)'
        this.previewCol.classList.add('aionui-float-pane')
      } else if (side) {
        this.previewCol.classList.remove('aionui-float-pane')
        const width = Math.round(sidePreviewPx)
        this.previewCol.style.position = ''
        this.previewCol.style.left = ''
        this.previewCol.style.top = ''
        this.previewCol.style.right = ''
        this.previewCol.style.bottom = ''
        this.previewCol.style.transition = ''
        this.previewCol.style.width = `${width}px`
        this.previewCol.style.height = ''
        this.previewCol.style.flex = '0 0 auto'
        this.previewCol.style.zIndex = ''
        this.previewCol.style.boxShadow = ''
        this.previewCol.style.borderTop = 'none'
        this.previewCol.style.borderLeft = '1px solid var(--aion-bg-3, #e5e6eb)'
        this.previewCol.style.visibility = width > 0 ? 'visible' : 'hidden'
      } else {
        this.previewCol.classList.remove('aionui-float-pane')
        const height = previewOpen ? Math.round(this.previewHeight) : 0
        this.previewCol.style.position = ''
        this.previewCol.style.left = ''
        this.previewCol.style.top = ''
        this.previewCol.style.right = ''
        this.previewCol.style.bottom = ''
        this.previewCol.style.transition = ''
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

    // Floating expand button: visible only when the panel is collapsed OUTSIDE
    // the focus-rail modes (bottom mode). The P1.3 rail button takes over when
    // the collapsed tree shows as a right rail beside an open preview.
    if (this.floatingButton !== null) {
      const show = state.root !== '' && state.explorerCollapsed && !railActive
      this.floatingButton.style.display = show ? 'flex' : 'none'
    }

    // P1.3 rail expand tab: sits vertically centered on the focus rail (the
    // collapsed explorer track at the panel column's left edge). Fixed to the
    // viewport because the rail is the last grid column.
    if (this.railButton !== null) {
      const frameW = this.frameWidth > 0 ? this.frameWidth : frame.getBoundingClientRect().width
      if (railActive && state.root !== '') {
        this.railButton.style.display = 'flex'
        this.railButton.style.left = `${Math.max(0, Math.round(frameW - tripleWidth))}px`
      } else {
        this.railButton.style.display = 'none'
      }
    }

    // Integrated terminal: docked at the bottom fifth of the chat column.
    // Workspace setting: terminalDock off hides the docked host entirely
    // (the in-tab ▶ run / terminal buttons still work via the preview panel).
    const terminalDock = this.settingsGetter?.()?.features.terminalDock ?? true
    const frameEl = this.frame
    const frameH = frameEl !== null && frameEl.clientHeight > 0
      ? frameEl.clientHeight
      : frameEl !== null ? frameEl.getBoundingClientRect().height : 0
    const terminalH = Math.round(Math.min(400, Math.max(120, frameH * 0.2)))
    const sidebarPx = this.shellTracks.length >= 1 ? trackPx(this.shellTracks[0]) : 0
    if (this.terminalHost !== null) {
      if (terminalDock && state.terminalOpen && state.root !== '') {
        this.terminalHost.style.display = 'flex'
        this.terminalHost.style.left = `${Math.round(sidebarPx)}px`
        this.terminalHost.style.right = `${Math.round(tripleWidth)}px`
        this.terminalHost.style.bottom = '0'
        this.terminalHost.style.height = `${terminalH}px`
      } else {
        this.terminalHost.style.display = 'none'
      }
    }
    if (this.chatCol !== null) {
      this.chatCol.style.paddingBottom = terminalDock && state.terminalOpen && state.root !== ''
        ? `${terminalH}px`
        : ''
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
    this.railButton?.remove()
    if (this.instantTimer !== undefined) clearTimeout(this.instantTimer)
    if (frameElement === this.frame) frameElement = null
    this.frame = null
  }
}
