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
  KEY_PREVIEW_WIDTH,
  KEY_TREE_POPUP_POS,
  clampExplorerWidth,
  clampSidePreviewWidth,
  readTreePopupPos,
} from './store.ts'
import { readStoredNumber, writeStoredNumber } from './persist.ts'
import type { LayoutStore } from './store.ts'

/** Pointer travel before a tab-bar press becomes a pane drag (px). */
const DRAG_THRESHOLD_PX = 4

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

/** Snap radius: the floating preview docks to the nearest preset zone whose
 *  anchor is within this many px of the dragged pane's center. */
const FLOAT_DOCK_SNAP_RADIUS = 120

/** Dock-back threshold: when the floating pane's RIGHT EDGE is within this many
 *  px of the frame's right edge on release, it docks back into the side
 *  drawer (push-to-the-right = dock). This is the primary "铆定到右侧" gesture. */
const FLOAT_DOCK_EDGE_PX = 48

/** Float-dock geometry: frame-relative, top-left coordinates for the pane. */
export interface FloatDockGeometry {
  frameW: number
  frameH: number
  /** Sidebar (shell track 0) width. */
  sidebarPx: number
  /** The explorer column width (0 when folded). */
  explorerPx: number
  /** The floating pane's width. */
  paneW: number
  /** The floating pane's height. */
  paneH: number
}

/** The pane's top-left position for one dock zone (desktop-icon snapping). */
export function floatDockAnchor(zone: string, g: FloatDockGeometry): { x: number; y: number } | null {
  const margin = 8
  const maxX = Math.max(margin, Math.round(g.frameW - g.paneW - margin))
  const maxY = Math.max(margin, Math.round(g.frameH - g.paneH - margin))
  const right = Math.min(Math.max(margin, Math.round(g.frameW - g.paneW - margin)), maxX)
  const bottom = Math.max(margin, Math.round(g.frameH - g.paneH - margin))
  const centerY = Math.min(Math.max(margin, Math.round((g.frameH - g.paneH) / 2)), maxY)
  switch (zone) {
    // Far right: flush against the right edge, vertically centered.
    case 'right':
      return { x: right, y: centerY }
    // Cover the file tree: sit over the explorer column (top-right); the tree
    // auto-floats (collapses to the round button) when this dock is chosen.
    case 'cover-tree':
      return { x: Math.min(Math.max(margin, Math.round(g.frameW - g.paneW - margin)), maxX), y: Math.min(Math.max(margin, margin), maxY) }
    // Below the tree: bottom-right, under the explorer column.
    case 'below-tree':
      return { x: right, y: bottom }
    // Chat area below: bottom-left, over the chat column's lower edge.
    case 'chat':
      return { x: Math.min(Math.max(margin, g.sidebarPx + margin), maxX), y: bottom }
    default:
      return null
  }
}

/** Pick the nearest dock zone to a pane center (null when none is close).
 *  `right` is intentionally NOT a snap target: the right edge is the dock-back
 *  gesture (flush-right → side drawer), handled separately in startFloatDrag. */
export function nearestFloatDock(cx: number, cy: number, g: FloatDockGeometry): { zone: string; x: number; y: number } | null {
  let best: { zone: string; x: number; y: number; d: number } | null = null
  for (const zone of ['cover-tree', 'below-tree', 'chat'] as const) {
    const anchor = floatDockAnchor(zone, g)
    if (anchor === null) continue
    const ax = anchor.x + g.paneW / 2
    const ay = anchor.y + g.paneH / 2
    const d = Math.hypot(ax - cx, ay - cy)
    if (d <= FLOAT_DOCK_SNAP_RADIUS && (best === null || d < best.d)) {
      best = { zone, x: anchor.x, y: anchor.y, d }
    }
  }
  return best === null ? null : { zone: best.zone, x: best.x, y: best.y }
}


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
  private floatResizeHandle: HTMLDivElement | null = null
  private floatingButton: HTMLButtonElement | null = null
  private railButton: HTMLButtonElement | null = null
  private treePopup: HTMLDivElement | null = null
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
    this.heightHandle = heightHandle
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

    // The floating preview's resize handle (bottom-right corner, out of the
    // grid flow). Only shown while the preview floats; dragging it changes the
    // pane's width + height (user-resizable, persisted).
    this.floatResizeHandle = document.createElement('div')
    this.floatResizeHandle.className = 'aionui-float-resize-handle'
    this.floatResizeHandle.style.position = 'absolute'
    this.floatResizeHandle.style.zIndex = '26'
    this.floatResizeHandle.style.cursor = 'nwse-resize'
    this.floatResizeHandle.style.width = '22px'
    this.floatResizeHandle.style.height = '22px'
    this.floatResizeHandle.style.display = 'none'
    this.floatResizeHandle.style.touchAction = 'none'
    frame.appendChild(this.floatResizeHandle)
    this.floatResizeHandle.addEventListener('pointerdown', (event: PointerEvent) => this.startFloatResize(event))

    // Two floating controls appear only while the tree is folded:
    // 1) a ROUND button (the folded tree's avatar) — click toggles the focus
    //    tree popup (open the floating file tree / close it again);
    // 2) a small drawer handle at the far-right middle — click re-docks the
    //    tree as the normal explorer drawer.
    this.floatingButton = document.createElement('button')
    this.floatingButton.type = 'button'
    this.floatingButton.className = 'aionui-floating-expand'
    this.floatingButton.setAttribute('aria-label', 'Toggle file tree popup')
    this.floatingButton.innerHTML = '<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 3h8M4 8h8M4 13h5"/></svg>'
    this.floatingButton.addEventListener('click', () => {
      const state = this.layout.getSnapshot()
      // Toggle the floating file tree popup (open ⇄ close).
      this.layout.setTreePopupOpen(!state.treePopupOpen)
    })
    document.body.appendChild(this.floatingButton)

    this.railButton = document.createElement('button')
    this.railButton.type = 'button'
    this.railButton.className = 'aionui-rail-drawer'
    this.railButton.setAttribute('aria-label', 'Expand file tree drawer')
    this.railButton.innerHTML = '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 3L5 8l5 5"/></svg>'
    this.railButton.addEventListener('click', () => {
      this.toggleExplorer()
      this.layout.setTreePopupOpen(false)
    })
    document.body.appendChild(this.railButton)

    // The focus tree popup: a small movable floating window rendered OVER the
    // preview (rounded corners, frosted glass). Header = drag strip + close;
    // body is a host the React tree mounts into.
    const treePopup = document.createElement('div')
    treePopup.dataset.aionuiTreePopup = ''
    treePopup.className = 'aionui-tree-popup'
    const popupHeader = document.createElement('div')
    popupHeader.className = 'aionui-tree-popup-header'
    popupHeader.dataset.aionuiTreePopupDrag = ''
    const popupTitle = document.createElement('span')
    popupTitle.className = 'aionui-tree-popup-title'
    popupTitle.textContent = '文件'
    popupHeader.appendChild(popupTitle)
    const popupClose = document.createElement('button')
    popupClose.type = 'button'
    popupClose.className = 'aionui-tree-popup-close'
    popupClose.setAttribute('aria-label', 'Close')
    popupClose.innerHTML = '<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8"/></svg>'
    popupClose.addEventListener('click', () => { this.layout.setTreePopupOpen(false) })
    popupHeader.appendChild(popupClose)
    const popupBody = document.createElement('div')
    popupBody.className = 'aionui-tree-popup-body'
    popupBody.dataset.aionuiTreePopupBody = ''
    treePopup.appendChild(popupHeader)
    treePopup.appendChild(popupBody)
    treePopup.style.display = 'none'
    document.body.appendChild(treePopup)
    this.treePopup = treePopup
    popupHeader.addEventListener('pointerdown', (event: PointerEvent) => this.startTreePopupDrag(event))

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

  /** Pointer drag on the outer width handle (the panel column's left edge):
   *  drags the TREE width in every mode — the preview's own edge is the
   *  height handle in side mode. */
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

  /** Pointer drag on the middle handle. Side mode: the handle sits between the
   *  tree and the preview (panelCol row), so it drags the PREVIEW width (0..½
   *  row, chat floor respected) — the preview's own left edge. Everywhere
   *  else it is the preview-height handle. */
  private startHeightDrag(event: PointerEvent): void {
    event.preventDefault()
    const state = this.layout.getSnapshot()
    if (state.previewMode === 'side') {
      const startX = event.clientX
      const startWidth = state.previewWidth
      const onMove = (moveEvent: PointerEvent): void => {
        const delta = moveEvent.clientX - startX
        const explorer = state.explorerCollapsed ? 0 : clampExplorerWidth(state.explorerWidth, state.availableWidth, true)
        const width = Math.max(0, clampSidePreviewWidth(startWidth + delta, state.availableWidth, explorer))
        this.layout.update((prev) => ({ ...prev, previewWidth: width }))
      }
      const onUp = (): void => {
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
        writeStoredNumber(KEY_PREVIEW_WIDTH, this.layout.getSnapshot().previewWidth)
      }
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
      return
    }
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

  /** Drag the preview by its tab-bar strip in EVERY mode. Threshold gesture:
   *  pointerdown anywhere on the strip records the origin; only after the
   *  pointer travels more than DRAG_THRESHOLD_PX does the drag arm — a plain
   *  click on a tab / button still works. In a docked mode (side/bottom/triple)
   *  arming PULLS the pane OUT into a floating window (detach); in float mode it
   *  drags the pane. On release: flush-right docks the pane back into the side
   *  drawer; a near-by preset zone snaps it there; otherwise it free-floats.
   *  During the drag ONLY the DOM is written (no store update per move) so the
   *  pane follows the pointer 1:1 without React re-render jank. */
  private startFloatDrag(event: PointerEvent): void {
    const state = this.layout.getSnapshot()
    if (!state.previewOpen || this.previewCol === null || this.frame === null) return
    const target = event.target as Element | null
    if (target === null || !target.closest('[data-aionui-float-drag]')) return
    // Real interactive controls (mode toggle, collapse, tab close glyph, url
    // input…) are never drag origins — everything else on the strip is.
    if (target.closest('button, input, a, [data-aionui-close]')) return
    // Capture the pointer so the browser can't take over the gesture (HTML5
    // drag / text selection / scroll) and fire pointercancel mid-drag — the
    // historical "real browser drag never moves" bug.
    try { this.previewCol.setPointerCapture(event.pointerId) } catch { /* best-effort */ }
    event.preventDefault()

    const frame = this.frame
    const frameW = this.frameWidth > 0 ? this.frameWidth : frame.getBoundingClientRect().width
    const frameH = frame.clientHeight > 0 ? frame.clientHeight : frame.getBoundingClientRect().height
    const wasFloat = state.previewMode === 'float'

    // Origin size + top-left of the pane for this drag.
    let width: number
    let floatH: number
    let startLeft: number
    let startTop: number
    if (wasFloat) {
      const defaultH = Math.max(240, Math.min(Math.round(frameH * 0.6), 720))
      const size = state.floatSize ?? { w: Math.round(state.previewWidth), h: defaultH }
      width = Math.round(size.w)
      floatH = Math.round(size.h)
      const sidebarPx = this.shellTracks.length >= 1 ? trackPx(this.shellTracks[0]) : 0
      const explorerPx = state.explorerCollapsed ? 0 : clampExplorerWidth(state.explorerWidth, state.availableWidth, true)
      const dockOrigin = state.floatDock !== null
        ? floatDockAnchor(state.floatDock, { frameW, frameH, sidebarPx, explorerPx, paneW: width, paneH: floatH })
        : null
      const pos = dockOrigin ?? state.floatPos ?? { x: frame.getBoundingClientRect().width - Math.round(this.layout.explorerWidthPx(state)) - width - 12, y: Math.round((frameH - floatH) / 2) }
      startLeft = pos.x
      startTop = pos.y
    } else {
      // Detach: the pane's CURRENT rendered rect becomes the float's origin, so
      // the "pull out" is seamless (no jump from the docked drawer to the float).
      const pr = this.previewCol.getBoundingClientRect()
      const fr = frame.getBoundingClientRect()
      width = Math.max(240, Math.round(pr.width))
      floatH = Math.max(160, Math.round(pr.height))
      startLeft = Math.round(pr.left - fr.left)
      startTop = Math.round(pr.top - fr.top)
    }

    const startX = event.clientX
    const startY = event.clientY
    const maxX = Math.max(8, Math.round(frameW - width - 8))
    const maxY = Math.max(8, frameH - floatH - 8)
    let armed = false

    const onMove = (moveEvent: PointerEvent): void => {
      if (!armed) {
        if (Math.abs(moveEvent.clientX - startX) < DRAG_THRESHOLD_PX && Math.abs(moveEvent.clientY - startY) < DRAG_THRESHOLD_PX) return
        armed = true
        if (!wasFloat) {
          // Pull out into float: adopt the docked rect as the float origin,
          // then continue the drag 1:1 from where the pointer grabbed it.
          this.layout.setFloatSize({ w: width, h: floatH })
          this.layout.setFloatPos({ x: startLeft, y: startTop })
          this.layout.setFloatDock(null)
          this.layout.setPreviewMode('float')
          // applyGrid has now rendered the float; re-read its actual rect so
          // the drag continues from the exact rendered position.
          const pr2 = this.previewCol !== null ? this.previewCol.getBoundingClientRect() : null
          const fr2 = frame.getBoundingClientRect()
          if (pr2 !== null) {
            startLeft = Math.round(pr2.left - fr2.left)
            startTop = Math.round(pr2.top - fr2.top)
          }
        } else if (this.layout.getSnapshot().floatDock !== null) {
          // Detach from any float dock zone: a live drag is always free.
          this.layout.setFloatDock(null)
        }
        if (this.previewCol !== null) {
          this.previewCol.dataset.aionuiFloatDragging = ''
          this.previewCol.style.transition = 'none'
        }
      }
      const x = Math.min(Math.max(8, startLeft + (moveEvent.clientX - startX)), maxX)
      const y = Math.min(Math.max(8, startTop + (moveEvent.clientY - startY)), maxY)
      // DOM-only writes (no store update per move) — the pane follows the
      // pointer 1:1 and the resize handle stays pinned to its corner.
      if (this.previewCol !== null) {
        this.previewCol.style.left = `${x}px`
        this.previewCol.style.top = `${y}px`
      }
      if (this.floatResizeHandle !== null) {
        this.floatResizeHandle.style.left = `${x + width - 11}px`
        this.floatResizeHandle.style.top = `${y + floatH - 11}px`
      }
    }

    const settleTransition = (): void => {
      if (this.previewCol !== null) {
        delete this.previewCol.dataset.aionuiFloatDragging
        this.previewCol.style.transition = 'left 180ms cubic-bezier(0.4, 0, 0.2, 1), top 180ms cubic-bezier(0.4, 0, 0.2, 1), width 180ms cubic-bezier(0.4, 0, 0.2, 1), height 180ms cubic-bezier(0.4, 0, 0.2, 1)'
      }
    }

    const onUp = (): void => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onCancel)
      settleTransition()
      if (!armed) return
      const snapshot = this.layout.getSnapshot()
      const pr = this.previewCol !== null ? this.previewCol.getBoundingClientRect() : null
      const fr = frame.getBoundingClientRect()
      const x = pr !== null ? Math.round(pr.left - fr.left) : (snapshot.floatPos?.x ?? 8)
      const y = pr !== null ? Math.round(pr.top - fr.top) : (snapshot.floatPos?.y ?? 8)

      // Push-to-the-right = dock back into the side drawer.
      if (frameW - (x + width) <= FLOAT_DOCK_EDGE_PX) {
        this.layout.setFloatDock(null)
        this.layout.setFloatPos({ x, y })
        this.layout.setPreviewMode('side')
        return
      }

      // Otherwise snap to a preset float zone, or free-float.
      const frameH2 = frame.clientHeight > 0 ? frame.clientHeight : frame.getBoundingClientRect().height
      const sidebarPx2 = this.shellTracks.length >= 1 ? trackPx(this.shellTracks[0]) : 0
      const explorerPx2 = snapshot.explorerCollapsed ? 0 : clampExplorerWidth(snapshot.explorerWidth, snapshot.availableWidth, true)
      const cx = x + width / 2
      const cy = y + floatH / 2
      const snap = nearestFloatDock(cx, cy, { frameW, frameH: frameH2, sidebarPx: sidebarPx2, explorerPx: explorerPx2, paneW: width, paneH: floatH })
      if (snap !== null) {
        this.layout.setFloatPos({ x: snap.x, y: snap.y })
        this.layout.setFloatDock(snap.zone as 'cover-tree' | 'below-tree' | 'chat')
        // "Cover the file tree" folds the tree into its round button.
        if (snap.zone === 'cover-tree' && !snapshot.explorerCollapsed) {
          this.layout.update((prev) => ({ ...prev, explorerCollapsed: true }))
          try {
            localStorage.setItem(`project-panel-collapse:${snapshot.root}`, 'collapsed')
          } catch {
            // best-effort
          }
        }
      } else {
        // Free float at the current position.
        this.layout.setFloatDock(null)
        this.layout.setFloatPos({ x, y })
      }
    }

    const onCancel = (): void => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onCancel)
      settleTransition()
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onCancel)
  }

  /** Resize the floating preview by its bottom-right corner: width follows the
   *  pointer's X, height follows Y, both clamped to sane bounds inside the
   *  frame. The size is persisted so it survives reloads and dock snapping. */
  private startFloatResize(event: PointerEvent): void {
    const state = this.layout.getSnapshot()
    if (state.previewMode !== 'float' || !state.previewOpen || this.previewCol === null || this.frame === null) return
    // Capture the pointer so the browser can't steal the gesture mid-drag.
    try { (event.currentTarget as Element).setPointerCapture(event.pointerId) } catch { /* best-effort */ }
    event.preventDefault()
    event.stopPropagation()
    const frame = this.frame
    const frameH = frame.clientHeight > 0 ? frame.clientHeight : frame.getBoundingClientRect().height
    const startX = event.clientX
    const startY = event.clientY
    const startSize = state.floatSize ?? { w: Math.round(state.previewWidth), h: Math.max(240, Math.min(Math.round(frameH * 0.6), 720)) }
    const startLeft = startSize.w
    const startTop = startSize.h
    // Pin the pane's CURRENT top-left as the free position before the first
    // resize frame: applyGrid otherwise re-derives the default slot (hug-right
    // / centered) from the changing size, which would slide the pane while the
    // user only drags the corner. Clear any dock zone too (an explicit resize
    // means the user now wants this exact size, not the preset).
    if (state.floatDock !== null) this.layout.setFloatDock(null)
    if (this.previewCol !== null) {
      const pr = this.previewCol.getBoundingClientRect()
      const fr = frame.getBoundingClientRect()
      this.layout.setFloatPos({ x: Math.round(pr.left - fr.left), y: Math.round(pr.top - fr.top) })
    }
    // Minimum pane size and maximum (never larger than the frame minus margin).
    const MIN_W = 240
    const MIN_H = 160
    const maxW = Math.max(MIN_W, Math.round(this.frameWidth - 16))
    const maxH = Math.max(MIN_H, Math.round(frameH - 16))
    let lastW = startLeft
    let lastH = startTop
    const onMove = (moveEvent: PointerEvent): void => {
      const w = Math.min(maxW, Math.max(MIN_W, startLeft + (moveEvent.clientX - startX)))
      const h = Math.min(maxH, Math.max(MIN_H, startTop + (moveEvent.clientY - startY)))
      if (w === lastW && h === lastH) return
      lastW = w
      lastH = h
      // DOM-only writes (no store update per move) so the resize follows the
      // pointer 1:1 without React re-render jank; the store persists once on
      // release below.
      if (this.previewCol !== null) {
        this.previewCol.style.width = `${w}px`
        this.previewCol.style.height = `${h}px`
      }
      if (this.floatResizeHandle !== null) {
        const pr = this.previewCol !== null ? this.previewCol.getBoundingClientRect() : null
        const fr = frame.getBoundingClientRect()
        const left = pr !== null ? Math.round(pr.left - fr.left) : 8
        const top = pr !== null ? Math.round(pr.top - fr.top) : 8
        this.floatResizeHandle.style.left = `${left + w - 11}px`
        this.floatResizeHandle.style.top = `${top + h - 11}px`
      }
    }
    const onUp = (): void => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onCancel)
      // Persist the final size once (single store write → single re-render).
      this.layout.setFloatSize({ w: lastW, h: lastH })
    }
    const onCancel = (): void => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onCancel)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onCancel)
  }

  /** Free-drag the focus tree popup (header = grab area). Position is clamped
   *  to the viewport and persisted; no threshold — the header is dedicated
   *  drag chrome (the close button is excluded by selector). */
  private startTreePopupDrag(event: PointerEvent): void {
    const popup = this.treePopup
    if (popup === null) return
    const target = event.target as Element | null
    if (target === null || !target.closest('[data-aionui-tree-popup-drag]')) return
    if (target.closest('button')) return
    event.preventDefault()
    const rect = popup.getBoundingClientRect()
    const startX = event.clientX
    const startY = event.clientY
    const startLeft = rect.left
    const startTop = rect.top
    popup.dataset.aionuiTreePopupDragging = ''
    const onMove = (moveEvent: PointerEvent): void => {
      const x = Math.min(Math.max(0, startLeft + (moveEvent.clientX - startX)), window.innerWidth - 200)
      const y = Math.min(Math.max(0, startTop + (moveEvent.clientY - startY)), window.innerHeight - 80)
      popup.style.left = `${x}px`
      popup.style.top = `${y}px`
    }
    const onUp = (): void => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      delete popup.dataset.aionuiTreePopupDragging
      try {
        localStorage.setItem(KEY_TREE_POPUP_POS, JSON.stringify({
          x: popup.style.left === '' ? 0 : Number.parseFloat(popup.style.left),
          y: popup.style.top === '' ? 0 : Number.parseFloat(popup.style.top),
        }))
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
    const previewOpen = state.previewOpen
    const mode = state.previewMode
    const side = mode === 'side'
    const floating = mode === 'float'
    const triple = mode === 'triple'
    const frameH = frame.clientHeight > 0 ? frame.clientHeight : frame.getBoundingClientRect().height

    // The explorer's OWN width (0 when folded). The PREVIEW is never folded —
    // its track keeps its width even while the tree is collapsed.
    const explorerPx = state.explorerCollapsed ? 0 : clampExplorerWidth(state.explorerWidth, state.availableWidth, state.previewOpen)

    // Preview width per mode (the preview never shrinks just because the tree
    // folded):
    // - side: its own track beside the tree (0..½ row, chat floor respected)
    // - bottom: the preview fills the panel column width (= explorer width)
    // - float: a bounded floating pane width
    // - triple: the panel column is explorer + preview
    const sidePreviewPx = side && previewOpen ? this.layout.previewWidthPx(state) : 0
    const bottomPreviewPx = (!side && !floating && !triple && previewOpen)
      ? clampExplorerWidth(state.explorerWidth, state.availableWidth, true)
      : 0

    // The panel column's total width:
    // - triple: explorer + preview (when open)
    // - side: explorer + preview track
    // - bottom: explorer when unfolded, PREVIEW width when folded (preview stays)
    // - float: explorer only (preview floats outside the grid)
    const tripleWidth = triple && previewOpen
      ? Math.min(state.availableWidth > 0 ? state.availableWidth : 1200, Math.round(state.explorerWidth + state.previewWidth))
      : floating
        ? explorerPx
        : side
          ? Math.round(explorerPx + sidePreviewPx)
          : Math.round(explorerPx + bottomPreviewPx)

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
        // grows/shrinks next to it, compressing the chat. A folded tree is
        // width 0 — the preview keeps its own track.
        this.explorerCol.style.flex = '0 0 auto'
        this.explorerCol.style.width = `${explorerPx}px`
        this.explorerCol.style.borderRight = '1px solid var(--aion-bg-3, #e5e6eb)'
      } else {
        // Bottom / float: the explorer fills the panel column. Folded = the
        // explorer is hidden (flex-basis 0) while the preview keeps the
        // column width below it.
        this.explorerCol.style.flex = state.explorerCollapsed ? '0 0 0' : '1 1 0'
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
        const frameH = frame.clientHeight > 0 ? frame.clientHeight : frame.getBoundingClientRect().height
        const defaultH = Math.max(240, Math.min(Math.round(frameH * 0.6), 720))
        const size = state.floatSize ?? { w: Math.round(state.previewWidth), h: defaultH }
        const width = previewOpen ? Math.min(Math.round(size.w), Math.max(240, Math.round(this.frameWidth - 16))) : 0
        const floatH = Math.min(Math.round(size.h), Math.max(160, Math.round(frameH - 16)))
        // Detach from the grid column: a freely draggable floating pane. The
        // position comes from the store (persisted); null = the default slot
        // (right edge, vertically centered-ish). The pane keeps a bounded
        // height so dragging it around stays inside the frame.
        const panelPx = Math.round(explorerPx)
        const sidebarPx = this.shellTracks.length >= 1 ? trackPx(this.shellTracks[0]) : 0
        const defaultX = Math.max(8, Math.round(this.frameWidth - panelPx - width - 12))
        const defaultY = Math.max(8, Math.round((frameH - floatH) / 2))
        // A dock zone overrides the free position (desktop-icon snapping): the
        // pane stays glued to its preset even as the frame resizes.
        const dockAnchor = state.floatDock !== null
          ? floatDockAnchor(state.floatDock, {
              frameW: this.frameWidth,
              frameH,
              sidebarPx,
              explorerPx: panelPx,
              paneW: width,
              paneH: floatH,
            })
          : null
        const pos = dockAnchor ?? state.floatPos ?? { x: defaultX, y: defaultY }
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
        // The resize handle pins to the pane's bottom-right corner.
        if (this.floatResizeHandle !== null) {
          this.floatResizeHandle.style.display = width > 0 ? 'block' : 'none'
          this.floatResizeHandle.style.left = `${x + width - 11}px`
          this.floatResizeHandle.style.top = `${y + floatH - 11}px`
        }
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
      // Side mode: the handle sits BETWEEN the tree and the preview (panelCol
      // is a row), so it drags the PREVIEW width — the preview's own left
      // edge. Everywhere else it stays the preview-height handle.
      if (side && previewOpen) {
        this.heightHandle.classList.add('aionui-preview-width-handle')
        this.heightHandle.style.display = 'block'
        this.heightHandle.style.cursor = 'col-resize'
        this.heightHandle.style.height = '100%'
        this.heightHandle.style.width = '10px'
      } else {
        this.heightHandle.classList.remove('aionui-preview-width-handle')
        this.heightHandle.style.height = `${PREVIEW_HEIGHT_HANDLE_PX}px`
        this.heightHandle.style.width = ''
        this.heightHandle.style.cursor = 'row-resize'
        this.heightHandle.style.display = !floating && !triple && previewOpen ? 'block' : 'none'
      }
    }

    // Width handle: at the left edge of the panel column — drags the TREE
    // width in every mode (side included). The preview's own edge is the
    // height handle above.
    const width = this.frameWidth > 0 ? this.frameWidth : frame.getBoundingClientRect().width
    if (this.widthHandle !== null) {
      const left = Math.round(width - tripleWidth)
      this.widthHandle.style.left = `${left}px`
      this.widthHandle.style.display = tripleWidth > 0 && state.root !== '' ? 'block' : 'none'
    }

    // The float resize handle shows only while the preview floats (its
    // position is set inside the floating branch above).
    if (this.floatResizeHandle !== null && !floating) {
      this.floatResizeHandle.style.display = 'none'
    }

    // Two folded-tree controls (visible only while the tree is collapsed):
    // - the ROUND button (tree avatar) toggles the floating file-tree popup;
    // - the far-right drawer handle re-docks the tree as the normal drawer.
    if (this.floatingButton !== null) {
      const show = state.root !== '' && state.explorerCollapsed
      this.floatingButton.style.display = show ? 'flex' : 'none'
    }
    if (this.railButton !== null) {
      const show = state.root !== '' && state.explorerCollapsed
      this.railButton.style.display = show ? 'flex' : 'none'
    }

    // Focus tree popup: a small movable frosted window over the preview.
    if (this.treePopup !== null) {
      const showPopup = state.root !== '' && state.treePopupOpen && state.explorerCollapsed
      if (showPopup) {
        const frameW = this.frameWidth > 0 ? this.frameWidth : frame.getBoundingClientRect().width
        const popupW = 320
        const popupH = Math.min(480, Math.max(280, Math.round(frameH * 0.6)))
        const saved = readTreePopupPos()
        // The popup must never cover the round toggle button (fixed at
        // right:14px, 44px wide → its left edge is frameW - 58). Keep the
        // popup's right edge at least 12px clear of that button so a click on
        // the button always lands on the button, closing the popup again.
        const buttonClearX = Math.max(8, frameW - popupW - 70)
        const defaultX = Math.min(Math.max(8, Math.round(frameW - tripleWidth - popupW - 16)), buttonClearX)
        const defaultY = Math.max(8, Math.round(frameH * 0.12))
        const maxX = Math.max(8, Math.min(window.innerWidth - popupW - 8, buttonClearX))
        const px = saved !== null ? Math.min(Math.max(8, saved.x), maxX) : defaultX
        const py = saved !== null ? Math.min(Math.max(8, saved.y), Math.max(8, window.innerHeight - popupH - 8)) : defaultY
        this.treePopup.style.display = 'flex'
        this.treePopup.style.left = `${px}px`
        this.treePopup.style.top = `${py}px`
        this.treePopup.style.width = `${popupW}px`
        this.treePopup.style.height = `${popupH}px`
      } else {
        this.treePopup.style.display = 'none'
      }
    }

    // Integrated terminal: docked at the bottom fifth of the chat column.
    // Workspace setting: terminalDock off hides the docked host entirely
    // (the in-tab ▶ run / terminal buttons still work via the preview panel).
    const terminalDock = this.settingsGetter?.()?.features.terminalDock ?? true
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
    this.floatResizeHandle?.remove()
    this.floatingButton?.remove()
    this.railButton?.remove()
    this.treePopup?.remove()
    if (this.instantTimer !== undefined) clearTimeout(this.instantTimer)
    if (frameElement === this.frame) frameElement = null
    this.frame = null
  }
}
