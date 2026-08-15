/**
 * Framework-free state core of the panel system: four small stores (layout,
 * explorer, scm, preview) built on a minimal subscribe/getSnapshot primitive
 * so every decision lives outside React (StrictMode-safe: update reducers are
 * pure; async work — fetches, persistence — runs in the action layer).
 *
 * AionUi's right-panel architecture (Apache-2.0, re-implemented): the width
 * clamps below are the exact ordered pair that keeps the chat area >= 360px
 * at all times (see the research report's section 4.2).
 * @module dsh-aionui-panel/client/store
 */

import type { FileRead, FsEntry, GitStatusView, PreviewContentType, SearchHit } from '../core/types.ts'
import type { PanelApi } from './api.ts'
import { detectContentType, isTextType, tabIdOf } from './fileType.ts'
import {
  evictPreviewScopes, readJson, readStoredNumber, writeJson, writeStoredNumber,
} from './persist.ts'
import { getSettingsStore, type SettingsStore } from './settings.ts'

/**
 * Line-level diff of two texts (the Trae-style edit diff: deleted lines in
 * red, added lines in green). A simple O(n·m) LCS over lines keeps the
 * output stable for typical file sizes; long inputs fall back to a naive
 * sequential diff so the UI never stalls on huge files.
 */
export function lineDiff(oldText: string, newText: string): Array<{ kind: 'same' | 'del' | 'add'; text: string }> {
  // Brand-new baseline: an empty old text means every line is an addition —
  // a fresh-write file renders all-green with no stray deleted empty line.
  if (oldText === '') return newText.split('\n').map((text) => ({ kind: 'add', text }))
  if (newText === '') return oldText.split('\n').map((text) => ({ kind: 'del', text }))
  const a = oldText.split('\n')
  const b = newText.split('\n')
  if (a.length * b.length > 200_000) {
    // Naive sequential diff: walk both lists, emitting runs.
    const out: Array<{ kind: 'same' | 'del' | 'add'; text: string }> = []
    let i = 0
    let j = 0
    while (i < a.length || j < b.length) {
      if (i < a.length && j < b.length && a[i] === b[j]) {
        out.push({ kind: 'same', text: a[i] })
        i += 1
        j += 1
      } else {
        if (i < a.length) { out.push({ kind: 'del', text: a[i] }); i += 1 }
        if (j < b.length) { out.push({ kind: 'add', text: b[j] }); j += 1 }
      }
    }
    return out
  }
  // LCS table.
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0))
  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }
  const out: Array<{ kind: 'same' | 'del' | 'add'; text: string }> = []
  let i = 0
  let j = 0
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      out.push({ kind: 'same', text: a[i] })
      i += 1
      j += 1
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push({ kind: 'del', text: a[i] })
      i += 1
    } else {
      out.push({ kind: 'add', text: b[j] })
      j += 1
    }
  }
  while (i < a.length) { out.push({ kind: 'del', text: a[i] }); i += 1 }
  while (j < b.length) { out.push({ kind: 'add', text: b[j] }); j += 1 }
  return out
}

// ─── state primitive ────────────────────────────────────────────────────────

/** Internal channel for the stored-layout flush used by pagehide flushing. */
const FLUSH_PERSIST = Symbol('flushPersist')

/** A minimal external store usable with useSyncExternalStore. */
export interface StateHandle<S> {
  getSnapshot: () => S
  subscribe: (listener: () => void) => () => void
  /** Pure update: fn receives the previous state and returns the next. */
  update: (fn: (prev: S) => S) => void
}

/** Create a state handle with an immutable snapshot (new object per update). */
export function createState<S>(initial: S): StateHandle<S> {
  let state = initial
  const listeners = new Set<() => void>()
  return {
    getSnapshot: () => state,
    subscribe(listener) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    update(fn) {
      const next = fn(state)
      if (next === state) return
      state = next
      for (const listener of listeners) listener()
    },
  }
}

// ─── layout: constants, clamps, store ───────────────────────────────────────

/** Chat-area floor the two clamps guarantee (never below this). */
export const MIN_CHAT_PANEL_PX = 360
/** Preview region width contract. */
export const MIN_PREVIEW_PANEL_PX = 340
export const DEFAULT_PREVIEW_REGION_PX = 480
export const MAX_PREVIEW_REGION_PX = 1200
/** Explorer (workspace) width contract. */
export const MIN_WORKSPACE_PANEL_PX = 220
export const MAX_WORKSPACE_PANEL_PX = 500
export const DEFAULT_WORKSPACE_PANEL_PX = 260
/** Preview region horizontal chrome (margins + borders) the clamps subtract. */
export const PREVIEW_REGION_CHROME_PX = 24

/** Storage keys (AionUi contract, verbatim). */
export const KEY_EXPLORER_WIDTH = 'chat-workspace-width-px'
export const KEY_PREVIEW_WIDTH = 'chat-preview-width-px'
export const KEY_COLLAPSE = 'project-panel-collapse:'
export const KEY_EXPLORER_UI = 'explorer-ui:'
export const KEY_SCM_UI = 'scm-ui:'

/**
 * Explorer clamp: reserve the chat-area floor so the panel column never
 * grows into the chat's minimum. The preview region lives BELOW the file
 * tree (a stacked panel column), so it does not consume horizontal space
 * and needs no reserve here.
 */
export function clampExplorerWidth(requested: number, available: number, _previewOpen: boolean): number {
  const reserve = MIN_CHAT_PANEL_PX
  const maxByContainer = Math.max(MIN_WORKSPACE_PANEL_PX, available - reserve)
  return Math.min(requested, maxByContainer)
}

/**
 * Preview clamp (runs after the explorer clamp): reserve chat's floor plus
 * the already-clamped explorer width plus the region chrome. The ordered pair
 * guarantees chat = available - explorer - preview >= 360.
 */
export function clampPreviewWidth(requested: number, available: number, explorerWidth: number): number {
  const maxByContainer = Math.max(
    MIN_PREVIEW_PANEL_PX,
    available - MIN_CHAT_PANEL_PX - explorerWidth - PREVIEW_REGION_CHROME_PX,
  )
  return Math.min(requested, maxByContainer)
}

/**
 * Side-mode preview clamp (P1.2): the preview is its OWN grid track next to
 * the explorer, so it may shrink to 0 (fully closed) and grow up to HALF the
 * available row width. The chat (1fr center track) compresses as the preview
 * grows — the floor below guarantees chat stays >= MIN_CHAT_PANEL_PX.
 */
export function clampSidePreviewWidth(requested: number, available: number, explorerWidth: number): number {
  const half = Math.max(0, Math.floor(available / 2))
  const byChat = Math.max(0, available - MIN_CHAT_PANEL_PX - explorerWidth - PREVIEW_REGION_CHROME_PX)
  return Math.min(requested, half, byChat)
}

/** Layout panel state (project-scoped). */
export interface LayoutState {
  /** The project root ('' when no project is bound). */
  root: string
  /** Requested explorer width (persisted; clamped on render). */
  explorerWidth: number
  /** Requested preview width (persisted; clamped on render). */
  previewWidth: number
  /** Explorer collapsed (width 0, kept mounted). */
  explorerCollapsed: boolean
  /** Preview region visible. */
  previewOpen: boolean
  /** Where the preview/editor region sits: below the tree, a side drawer, or
   *  a floating pane that overlays the chat area. */
  previewMode: PreviewLayoutMode
  /** Floating-pane position (px, frame-relative) in float mode; null = the
   *  default right-side slot. Persisted globally (`aionui-float-pos`). */
  floatPos: { x: number; y: number } | null
  /** Measured available width of the [content | panels] row. */
  availableWidth: number
  /** True while a panel drag is in flight (disables transitions). */
  dragging: boolean
  /** Integrated terminal: docked at the bottom fifth of the CHAT column. */
  terminalOpen: boolean
  /** Focus popup: when the tree is collapsed beside an open preview, the
   *  topmost expand button opens this small movable floating file-tree window
   *  (rounded, frosted) instead of re-docking the tree column. */
  treePopupOpen: boolean
  /** Float-dock zone the floating preview is snapped to (desktop-icon style:
   *  far-right / cover-tree / below-tree / chat-below); null = free float. */
  floatDock: FloatDockZone | null
}

/** Storage key of the floating-pane position (global, JSON {x,y} or null). */
export const KEY_FLOAT_POS = 'aionui-float-pos'

/** Storage key of the floating-pane dock zone (global, '' = free float). */
export const KEY_FLOAT_DOCK = 'aionui-float-dock'

/** Floating preview dock zones (desktop-icon style snapping). */
export const FLOAT_DOCKS = ['right', 'cover-tree', 'below-tree', 'chat'] as const
export type FloatDockZone = (typeof FLOAT_DOCKS)[number]

/** Storage key of the tree-popup position (global, JSON {x,y}). */
export const KEY_TREE_POPUP_POS = 'aionui-tree-popup-pos'

/** The layout store plus its pure width math. */
export interface LayoutStore extends StateHandle<LayoutState> {
  /** Effective explorer width after the ordered clamp. */
  explorerWidthPx: (state: LayoutState) => number
  /** Effective preview width after the ordered clamp. */
  previewWidthPx: (state: LayoutState) => number
  /** Persist a clamped shrink when the stored width no longer fits. */
  shrinkToFit: (state: LayoutState) => void
  /** Cycle where the preview sits: bottom → side → float → triple → bottom. */
  cyclePreviewMode: () => void
  /** Set the preview mode explicitly. */
  setPreviewMode: (mode: 'bottom' | 'side' | 'float' | 'triple') => void
  /** Move the floating pane (float mode); null restores the default slot. */
  setFloatPos: (pos: { x: number; y: number } | null) => void
  /** Snap the floating pane to a dock zone; null = free float. */
  setFloatDock: (dock: FloatDockZone | null) => void
  /** Open / close the integrated terminal. */
  setTerminalOpen: (open: boolean) => void
  /** Open / close the focus tree popup. */
  setTreePopupOpen: (open: boolean) => void
}

/** Storage key of the preview-mode preference (global, not per-root). */
export const KEY_PREVIEW_MODE = 'aionui-preview-mode'

/** All preview layout modes (bottom pane / right drawer / floating / triple IDE). */
export const PREVIEW_MODES = ['bottom', 'side', 'float', 'triple'] as const
export type PreviewLayoutMode = (typeof PREVIEW_MODES)[number]

/** Storage key of the collapse preference for one root. */
export const collapseKey = (root: string): string => `${KEY_COLLAPSE}${root}`

/** Create the layout store (reads persisted widths on init). */
export function createLayoutStore(
  settingsGetter?: () => { features: { tripleLayout: boolean } },
): LayoutStore {
  const handle = createState<LayoutState>({
    root: '',
    explorerWidth: readStoredNumber(KEY_EXPLORER_WIDTH, MIN_WORKSPACE_PANEL_PX, MAX_WORKSPACE_PANEL_PX, DEFAULT_WORKSPACE_PANEL_PX),
    previewWidth: readStoredNumber(KEY_PREVIEW_WIDTH, MIN_PREVIEW_PANEL_PX, MAX_PREVIEW_REGION_PX, DEFAULT_PREVIEW_REGION_PX),
    explorerCollapsed: false,
    previewOpen: false,
    previewMode: PREVIEW_MODES[readStoredNumber(KEY_PREVIEW_MODE, 0, PREVIEW_MODES.length - 1, 0)] ?? 'bottom',
    floatPos: readFloatPos(),
    availableWidth: 0,
    dragging: false,
    terminalOpen: false,
    treePopupOpen: false,
    floatDock: readFloatDock(),
  })
  const store: LayoutStore = Object.assign(handle, {
    explorerWidthPx(state: LayoutState): number {
      return state.explorerCollapsed ? 0 : clampExplorerWidth(state.explorerWidth, state.availableWidth, state.previewOpen)
    },
    previewWidthPx(state: LayoutState): number {
      if (!state.previewOpen) return 0
      const explorer = state.explorerCollapsed ? 0 : clampExplorerWidth(state.explorerWidth, state.availableWidth, true)
      // Side mode: the preview is its OWN track next to the explorer, so it
      // may shrink to 0 and grow up to half the row (compressing the chat).
      return state.previewMode === 'side'
        ? clampSidePreviewWidth(state.previewWidth, state.availableWidth, explorer)
        : clampPreviewWidth(state.previewWidth, state.availableWidth, explorer)
    },
    shrinkToFit(state: LayoutState): void {
      if (state.availableWidth <= 0) return
      const explorer = clampExplorerWidth(state.explorerWidth, state.availableWidth, state.previewOpen)
      if (state.explorerWidth > explorer && !state.explorerCollapsed) {
        writeStoredNumber(KEY_EXPLORER_WIDTH, explorer)
        handle.update((prev) => ({ ...prev, explorerWidth: explorer }))
      }
      const preview = state.previewMode === 'side'
        ? clampSidePreviewWidth(state.previewWidth, state.availableWidth, explorer)
        : clampPreviewWidth(state.previewWidth, state.availableWidth, explorer)
      if (state.previewOpen && state.previewWidth > preview) {
        writeStoredNumber(KEY_PREVIEW_WIDTH, preview)
        handle.update((prev) => ({ ...prev, previewWidth: preview }))
      }
    },
    cyclePreviewMode(): void {
      // Respect the workspace setting: when the triple-IDE layout is off, the
      // cycle skips it (bottom → side → float → bottom).
      const triple = settingsGetter?.()?.features.tripleLayout ?? true
      const modes: readonly PreviewLayoutMode[] = triple ? PREVIEW_MODES : PREVIEW_MODES.filter((mode) => mode !== 'triple')
      const current = handle.getSnapshot().previewMode
      const next = modes[(modes.indexOf(current) + 1) % modes.length] ?? 'bottom'
      handle.update((prev) => (prev.previewMode === next ? prev : { ...prev, previewMode: next }))
      writeStoredNumber(KEY_PREVIEW_MODE, PREVIEW_MODES.indexOf(next))
    },
    setPreviewMode(mode: 'bottom' | 'side' | 'float' | 'triple'): void {
      handle.update((prev) => (prev.previewMode === mode ? prev : { ...prev, previewMode: mode }))
      writeStoredNumber(KEY_PREVIEW_MODE, PREVIEW_MODES.indexOf(mode))
    },
    setFloatPos(pos: { x: number; y: number } | null): void {
      handle.update((prev) => (prev.floatPos === pos ? prev : { ...prev, floatPos: pos }))
      try {
        localStorage.setItem(KEY_FLOAT_POS, pos === null ? '' : JSON.stringify(pos))
      } catch {
        // best-effort
      }
    },
    setFloatDock(dock: FloatDockZone | null): void {
      handle.update((prev) => (prev.floatDock === dock ? prev : { ...prev, floatDock: dock }))
      try {
        localStorage.setItem(KEY_FLOAT_DOCK, dock ?? '')
      } catch {
        // best-effort
      }
    },
    setTerminalOpen(open: boolean): void {
      handle.update((prev) => (prev.terminalOpen === open ? prev : { ...prev, terminalOpen: open }))
    },
    setTreePopupOpen(open: boolean): void {
      handle.update((prev) => (prev.treePopupOpen === open ? prev : { ...prev, treePopupOpen: open }))
    },
  })
  return store
}

/** Read the persisted floating-pane position ('' / absent = default slot). */
function readFloatPos(): { x: number; y: number } | null {
  try {
    const raw = localStorage.getItem(KEY_FLOAT_POS)
    if (raw === null || raw === '') return null
    const parsed = JSON.parse(raw) as { x?: number; y?: number }
    if (typeof parsed.x === 'number' && typeof parsed.y === 'number') return { x: parsed.x, y: parsed.y }
    return null
  } catch {
    return null
  }
}

/** Read the persisted float-dock zone ('' / absent / invalid = free float). */
function readFloatDock(): FloatDockZone | null {
  try {
    const raw = localStorage.getItem(KEY_FLOAT_DOCK)
    return raw !== null && (FLOAT_DOCKS as readonly string[]).includes(raw) ? raw as FloatDockZone : null
  } catch {
    return null
  }
}

/** Read the persisted focus-popup position (absent/invalid = default slot). */
export function readTreePopupPos(): { x: number; y: number } | null {
  try {
    const raw = localStorage.getItem(KEY_TREE_POPUP_POS)
    if (raw === null) return null
    const parsed = JSON.parse(raw) as { x?: number; y?: number }
    if (typeof parsed.x === 'number' && typeof parsed.y === 'number') return { x: parsed.x, y: parsed.y }
    return null
  } catch {
    return null
  }
}

/** Switch the layout to a project root (restores collapse + widths). */
export function layoutSetRoot(store: LayoutStore, root: string, previewOpen: boolean): void {
  store.update((prev) => {
    if (prev.root === root && prev.previewOpen === previewOpen) return prev
    let collapsed = prev.explorerCollapsed
    if (prev.root !== root) {
      try {
        collapsed = localStorage.getItem(collapseKey(root)) === 'collapsed'
      } catch {
        collapsed = false
      }
    }
    return { ...prev, root, explorerCollapsed: collapsed, previewOpen }
  })
}

// ─── explorer store ─────────────────────────────────────────────────────────

/** Explorer panel state. */
export interface ExplorerState {
  root: string
  /** The session this explorer view belongs to (per-session memory). */
  session: string
  /** rel path -> listing cache ('' = root). */
  dirs: Record<string, FsEntry[]>
  /** Expanded dir rel paths (order = display order). */
  expanded: string[]
  /** Selected node rel path (null = none). */
  selected: string | null
  /** Dirs currently fetching. */
  loading: string[]
  /** Active tab: files | changes. */
  activeTab: 'files' | 'changes'
  /** Filename search state. */
  search: {
    query: string
    status: 'idle' | 'searching' | 'done' | 'error'
    hits: SearchHit[]
    truncated: boolean
  }
  /** Bumped on every fs change event (drives refetch + re-render). */
  version: number
  /** Git status per rel path ('' = not a change): A/M/D/R/U/C — tree badges. */
  git: Record<string, string>
  /** Watch marks per directory rel: 'shallow' = watch its direct children,
   *  'deep' = watch everything under it. Absent = default (first level). */
  watch: Record<string, 'shallow' | 'deep'>
}

/** The explorer store with its async actions. */
export interface ExplorerStore extends StateHandle<ExplorerState> {
  setRoot: (root: string, session?: string) => void
  setActiveTab: (tab: 'files' | 'changes') => void
  toggleDir: (rel: string) => void
  select: (rel: string | null) => void
  reveal: (rel: string) => void
  setSearchQuery: (query: string) => void
  cancelSearch: () => void
  /** Refetch every expanded dir + active search after a host change event. */
  handleFsChange: () => void
  /** Refresh the git-status badge map (call after mount / git events). */
  refreshGitStatus: () => Promise<void>
  /** Cycle a directory's watch mark: none → shallow → deep → none. */
  toggleWatch: (rel: string) => void
}

/** Read the persisted explorer UI state for a session+root (range-guarded).
 *  Isolation is per SESSION so each conversation remembers its own expanded
 *  folders; a session without any memory just sees the workspace. */
export function readExplorerUi(session: string, root: string): { expanded: string[]; selected: string | null; watch: Record<string, 'shallow' | 'deep'> } {
  const stored = readJson<{ expanded?: unknown; selected?: unknown; watch?: unknown }>(`${KEY_EXPLORER_UI}${session}:${root}`, {})
  const expanded = Array.isArray(stored.expanded)
    ? stored.expanded.filter((item): item is string => typeof item === 'string')
    : []
  const selected = typeof stored.selected === 'string' ? stored.selected : null
  const watch: Record<string, 'shallow' | 'deep'> = {}
  if (typeof stored.watch === 'object' && stored.watch !== null) {
    for (const [key, value] of Object.entries(stored.watch as Record<string, unknown>)) {
      if (value === 'shallow' || value === 'deep') watch[key] = value
    }
  }
  return { expanded, selected, watch }
}

const EMPTY_SEARCH = { query: '', status: 'idle' as const, hits: [], truncated: false }

/**
 * True when a relative path is build/process noise that must NEVER auto-open:
 * dependency dirs, build outputs, temp/editor droppings, lockfiles. Logs are
 * deliberately NOT noise (log preview is a feature).
 */
function isNoisePath(rel: string): boolean {
  const parts = rel.split('/')
  const NOISE_DIRS = new Set([
    'node_modules', '.git', 'dist', 'build', 'out', 'lib', 'coverage', '__pycache__',
    '.next', '.nuxt', '.cache', '.pytest_cache', '.mypy_cache', '.turbo',
    '.idea', '.vscode', '.venv', 'venv', 'tmp', '.tmp',
  ])
  if (parts.some((part) => NOISE_DIRS.has(part))) return true
  const base = (parts[parts.length - 1] ?? rel).toLowerCase()
  if (base.endsWith('.map') || base.endsWith('.tsbuildinfo') || base.endsWith('.pyc')
    || base.endsWith('.pyo') || base.endsWith('.class') || base.endsWith('.o')
    || base.endsWith('.obj') || base.endsWith('.exe') || base.endsWith('.dll')
    || base.endsWith('.so') || base.endsWith('.dylib') || base.endsWith('.tmp')
    || base.endsWith('.temp') || base.endsWith('.swp') || base.endsWith('.swo')) return true
  if (base === 'package-lock.json' || base === 'pnpm-lock.yaml' || base === 'yarn.lock'
    || base === 'bun.lockb' || base === 'poetry.lock' || base === '.ds_store'
    || base === 'thumbs.db') return true
  if (base.startsWith('~$')) return true
  return false
}

/**
 * Whether a changed path should AUTO-OPEN, given the per-directory watch
 * marks. Default watches only the FIRST level: files directly under the root
 * and files directly under a first-level directory. A marked directory
 * extends that — and EXPLICIT marks override the noise defaults (a user who
 * marks node_modules as deep really wants its files): 'shallow' watches its
 * direct children, 'deep' watches the whole subtree. Unmarked noise paths
 * never auto-open.
 */
export function shouldAutoOpen(rel: string, watch: Record<string, 'shallow' | 'deep'>): boolean {
  const parts = rel.split('/').filter(Boolean)
  // Explicit marks first: user intent wins over the noise/level defaults.
  for (let i = parts.length - 2; i >= 1; i -= 1) {
    const dir = parts.slice(0, i).join('/')
    const mark = watch[dir]
    if (mark === 'deep') return true
    if (mark === 'shallow' && i === parts.length - 1) return true
  }
  if (isNoisePath(rel)) return false
  return parts.length <= 2
}

/** Create the explorer store (per-root persistence, debounced writes). */
export function createExplorerStore(api: PanelApi): ExplorerStore {
  const handle = createState<ExplorerState>({
    root: '',
    session: '',
    dirs: {},
    expanded: [],
    selected: null,
    loading: [],
    activeTab: 'files',
    search: { ...EMPTY_SEARCH },
    version: 0,
    git: {},
    watch: {},
  })

  let persistTimer: ReturnType<typeof setTimeout> | undefined
  let searchTimer: ReturnType<typeof setTimeout> | undefined
  let fsVersion = 0
  let persistRoot = ''
  let persistSession = ''
  let persistExpanded: string[] = []
  let persistSelected: string | null = null
  const flushPersist = (): void => {
    if (persistTimer !== undefined) clearTimeout(persistTimer)
    persistTimer = undefined
    if (persistRoot !== '') {
      const snap = handle.getSnapshot()
      writeJson(`${KEY_EXPLORER_UI}${persistSession}:${persistRoot}`, {
        expanded: persistExpanded,
        selected: persistSelected,
        watch: snap.watch,
      })
    }
  }
  const schedulePersist = (root: string, session: string, expanded: string[], selected: string | null): void => {
    if (root === '') return
    if (persistTimer !== undefined) clearTimeout(persistTimer)
    persistRoot = root
    persistSession = session
    persistExpanded = expanded
    persistSelected = selected
    persistTimer = setTimeout(flushPersist, 150)
  }

  /** Load one dir's listing into the cache (no-op when already present). */
  const ensureDir = async (root: string, rel: string): Promise<void> => {
    const state = handle.getSnapshot()
    if (state.root !== root || state.dirs[rel] !== undefined || state.loading.includes(rel)) return
    handle.update((prev) => ({ ...prev, loading: [...prev.loading, rel] }))
    const result = await api.list(root, rel)
    handle.update((prev) => {
      if (prev.root !== root) return prev
      // A listing that landed after its dir collapsed must not re-populate
      // the cache (the expand/collapse race would resurrect stale children).
      if (rel !== '' && !prev.expanded.includes(rel)) {
        return { ...prev, loading: prev.loading.filter((item) => item !== rel) }
      }
      const dirs = { ...prev.dirs }
      if (result.ok) dirs[rel] = result.value.entries
      else delete dirs[rel]
      return { ...prev, dirs, loading: prev.loading.filter((item) => item !== rel) }
    })
  }

  /** Drop cached subtrees under a collapsed dir (its own key included). */
  const dropSubtree = (dirs: Record<string, FsEntry[]>, rel: string): Record<string, FsEntry[]> => {
    const prefix = rel === '' ? '' : `${rel}/`
    const next: Record<string, FsEntry[]> = {}
    for (const key of Object.keys(dirs)) {
      if (rel !== '' && (key === rel || key.startsWith(prefix))) continue
      next[key] = dirs[key]
    }
    return next
  }

  /** A dir's ancestor chain ('' .. parent). */
  const ancestors = (rel: string): string[] => {
    const out: string[] = []
    const parts = rel.split('/').filter(Boolean)
    let acc = ''
    for (const part of parts) {
      acc = acc === '' ? part : `${acc}/${part}`
      out.push(acc)
    }
    return out
  }

  const store: ExplorerStore = Object.assign(handle, {
    setRoot(root: string, session = '') {
      handle.update((prev) => {
        if (prev.root === root && prev.session === session) return prev
        const ui = readExplorerUi(session, root)
        return {
          ...prev,
          root,
          session,
          dirs: {},
          expanded: ui.expanded,
          selected: ui.selected,
          loading: [],
          search: { ...EMPTY_SEARCH },
          git: {},
          watch: ui.watch,
        }
      })
      void ensureDir(root, '')
      void store.refreshGitStatus()
    },
    toggleWatch(rel: string) {
      handle.update((prev) => {
        const current = prev.watch[rel]
        const next = current === 'shallow' ? 'deep' : current === 'deep' ? undefined : 'shallow'
        const watch = { ...prev.watch }
        if (next === undefined) delete watch[rel]
        else watch[rel] = next
        return { ...prev, watch }
      })
      const state = handle.getSnapshot()
      schedulePersist(state.root, state.session, state.expanded, state.selected)
    },
    async refreshGitStatus() {
      const root = handle.getSnapshot().root
      if (root === '') return
      const result = await api.gitStatus(root)
      handle.update((prev) => {
        if (prev.root !== root) return prev
        if (!result.ok || result.value === null) return prev
        const git: Record<string, string> = {}
        const rows = [...result.value.staged, ...result.value.unstaged, ...result.value.untracked]
        for (const row of rows) {
          if (row.path === '') continue
          const letter = row.state === 'created' ? 'A'
            : row.state === 'modified' ? 'M'
              : row.state === 'deleted' ? 'D'
                : row.state === 'renamed' ? 'R'
                  : row.state === 'conflicted' ? 'C'
                    : row.state === 'untracked' ? 'U'
                      : ''
          if (letter !== '') git[row.path] = letter
        }
        return { ...prev, git }
      })
    },
    setActiveTab(tab: 'files' | 'changes') {
      handle.update((prev) => (prev.activeTab === tab ? prev : { ...prev, activeTab: tab }))
    },
    toggleDir(rel: string) {
      const state = handle.getSnapshot()
      const isExpanded = state.expanded.includes(rel)
      if (isExpanded) {
        handle.update((prev) => ({
          ...prev,
          expanded: prev.expanded.filter((item) => item !== rel),
          dirs: dropSubtree(prev.dirs, rel),
        }))
      } else {
        handle.update((prev) => ({ ...prev, expanded: [...prev.expanded, rel] }))
        void ensureDir(state.root, rel)
      }
      schedulePersist(state.root, state.session, isExpanded ? state.expanded.filter((item) => item !== rel) : [...state.expanded, rel], state.selected)
    },
    select(rel: string | null) {
      handle.update((prev) => (prev.selected === rel ? prev : { ...prev, selected: rel }))
      const state = handle.getSnapshot()
      schedulePersist(state.root, state.session, state.expanded, rel)
    },
    reveal(rel: string) {
      const state = handle.getSnapshot()
      const chain = ancestors(rel)
      const missing = chain.filter((item) => !state.expanded.includes(item))
      handle.update((prev) => {
        const expanded = [...prev.expanded]
        for (const item of missing) {
          if (!expanded.includes(item)) expanded.push(item)
        }
        return { ...prev, expanded, selected: rel, search: { ...EMPTY_SEARCH } }
      })
      for (const item of missing) void ensureDir(state.root, item)
      schedulePersist(state.root, state.session, [...state.expanded, ...missing], rel)
    },
    setSearchQuery(query: string) {
      const trimmed = query.trim()
      handle.update((prev) => {
        if (trimmed === '' && prev.search.query === '') return prev
        return {
          ...prev,
          search: trimmed === ''
            ? { ...EMPTY_SEARCH }
            : { ...prev.search, query: trimmed, status: 'searching' },
        }
      })
      if (searchTimer !== undefined) clearTimeout(searchTimer)
      if (trimmed === '') return
      const root = handle.getSnapshot().root
      searchTimer = setTimeout(() => {
        searchTimer = undefined
        void api.search(root, trimmed).then((result) => {
          handle.update((prev) => {
            if (prev.root !== root || prev.search.query !== trimmed) return prev
            return {
              ...prev,
              search: result.ok
                ? { query: trimmed, status: 'done', hits: result.value.hits, truncated: result.value.truncated }
                : { ...prev.search, status: 'error', hits: [] },
            }
          })
        })
      }, 150)
    },
    cancelSearch() {
      if (searchTimer !== undefined) clearTimeout(searchTimer)
      searchTimer = undefined
      handle.update((prev) => (prev.search.query === '' ? prev : { ...prev, search: { ...EMPTY_SEARCH } }))
    },
    async handleFsChange() {
      const state = handle.getSnapshot()
      const root = state.root
      if (root === '') return
      const dirs = [...new Set(['', ...state.expanded])]
      const seq = ++fsVersion
      const results = await Promise.allSettled(dirs.map((rel) => api.list(root, rel)))
      handle.update((prev) => {
        if (prev.root !== root || seq !== fsVersion) return prev
        const nextDirs = { ...prev.dirs }
        results.forEach((result, index) => {
          const rel = dirs[index]
          if (result.status !== 'fulfilled' || !result.value.ok) return
          // A dir folded while the event burst was in flight must not be
          // re-populated (the collapse would revive from a stale snapshot).
          if (rel !== '' && !prev.expanded.includes(rel)) return
          nextDirs[rel] = result.value.value.entries
        })
        return { ...prev, dirs: nextDirs, version: prev.version + 1 }
      })
      if (state.search.query !== '') {
        void api.search(root, state.search.query).then((result) => {
          handle.update((prev) => {
            if (prev.root !== root || prev.search.query !== state.search.query) return prev
            return {
              ...prev,
              search: result.ok
                ? { query: state.search.query, status: 'done', hits: result.value.hits, truncated: result.value.truncated }
                : prev.search,
            }
          })
        })
      }
    },
  })
  ;(store as unknown as Record<symbol, unknown>)[FLUSH_PERSIST] = flushPersist
  return store
}

// ─── scm store ──────────────────────────────────────────────────────────────

/** SCM panel state. */
export interface ScmState {
  root: string
  /** null: not a git repository (or still loading). */
  status: GitStatusView | null
  loading: boolean
  /** Paths with an action in flight. */
  busy: string[]
  /** Paths the last action reported failed. */
  failed: string[]
  /** list | tree. */
  viewMode: 'list' | 'tree'
  /** Section collapse map (repositories | changes). */
  sectionCollapsed: Record<string, boolean>
  /** Tree-view expanded dir keys. */
  treeExpanded: string[]
  /** Path of the last row opened in the preview panel (null = none). */
  selected: string | null
}

/** The scm store with its async actions. */
export interface ScmStore extends StateHandle<ScmState> {
  setRoot: (root: string) => void
  refresh: () => Promise<void>
  stage: (paths: string[]) => Promise<void>
  unstage: (paths: string[]) => Promise<void>
  discard: (paths: string[]) => Promise<void>
  discardAll: () => Promise<void>
  setViewMode: (mode: 'list' | 'tree') => void
  setSectionCollapsed: (id: string, collapsed: boolean) => void
  setTreeExpanded: (keys: string[]) => void
  setFailed: (paths: string[]) => void
  select: (path: string | null) => void
}

/** Read the persisted scm UI state for a root (guarded). */
export function readScmUi(root: string): { viewMode: 'list' | 'tree'; sectionCollapsed: Record<string, boolean>; treeExpanded: string[]; selected: string | null } {
  const stored = readJson<{ viewMode?: unknown; sectionCollapsed?: unknown; treeExpanded?: unknown; selected?: unknown }>(`${KEY_SCM_UI}${root}`, {})
  const viewMode = stored.viewMode === 'tree' ? 'tree' : 'list'
  const sectionCollapsed: Record<string, boolean> = typeof stored.sectionCollapsed === 'object' && stored.sectionCollapsed !== null
    ? Object.fromEntries(Object.entries(stored.sectionCollapsed as Record<string, unknown>).filter(([, v]) => typeof v === 'boolean')) as Record<string, boolean>
    : {}
  const treeExpanded = Array.isArray(stored.treeExpanded)
    ? stored.treeExpanded.filter((item): item is string => typeof item === 'string')
    : []
  const selected = typeof stored.selected === 'string' ? stored.selected : null
  return { viewMode, sectionCollapsed, treeExpanded, selected }
}

/** Create the scm store (host status is the only truth — no optimistic rows). */
export function createScmStore(api: PanelApi): ScmStore {
  const handle = createState<ScmState>({
    root: '',
    status: null,
    loading: false,
    busy: [],
    failed: [],
    viewMode: 'list',
    sectionCollapsed: {},
    treeExpanded: [],
    selected: null,
  })

  let persistTimer: ReturnType<typeof setTimeout> | undefined
  let persistState: ScmState | null = null
  let loadSeq = 0
  const flushPersist = (): void => {
    if (persistTimer !== undefined) clearTimeout(persistTimer)
    persistTimer = undefined
    if (persistState !== null && persistState.root !== '') {
      writeJson(`${KEY_SCM_UI}${persistState.root}`, {
        viewMode: persistState.viewMode,
        sectionCollapsed: persistState.sectionCollapsed,
        treeExpanded: persistState.treeExpanded,
        selected: persistState.selected,
      })
    }
  }
  const schedulePersist = (state: ScmState): void => {
    if (state.root === '') return
    if (persistTimer !== undefined) clearTimeout(persistTimer)
    persistState = state
    persistTimer = setTimeout(flushPersist, 150)
  }

  /** Fetch the status and land it (guarded against root switches + out-of-order). */
  const load = async (root: string, keepBusy: string[] = []): Promise<void> => {
    const seq = ++loadSeq
    handle.update((prev) => ({ ...prev, loading: true }))
    const result = await api.gitStatus(root)
    handle.update((prev) => {
      // Only the newest in-flight load may land; a stale response must not
      // overwrite fresher state (focus refresh vs SSE push race).
      if (prev.root !== root || seq !== loadSeq) return prev
      return {
        ...prev,
        status: result.ok ? result.value : prev.status,
        loading: false,
        busy: keepBusy,
      }
    })
  }

  const store: ScmStore = Object.assign(handle, {
    setRoot(root: string) {
      handle.update((prev) => {
        if (prev.root === root) return prev
        const ui = readScmUi(root)
        return {
          ...prev,
          root,
          status: null,
          loading: true,
          busy: [],
          failed: [],
          viewMode: ui.viewMode,
          sectionCollapsed: ui.sectionCollapsed,
          treeExpanded: ui.treeExpanded,
          selected: ui.selected,
        }
      })
      void load(root)
    },
    async refresh() {
      const root = handle.getSnapshot().root
      if (root !== '') await load(root)
    },
    async stage(paths: string[]) {
      const root = handle.getSnapshot().root
      if (root === '' || paths.length === 0) return
      handle.update((prev) => ({ ...prev, busy: [...prev.busy, ...paths] }))
      const result = await api.gitStage(root, paths)
      handle.update((prev) => ({
        ...prev,
        failed: result.ok && Array.isArray(result.value?.failed) ? result.value.failed : (result.ok ? [] : paths),
        busy: prev.busy.filter((item) => !paths.includes(item)),
      }))
      await load(root)
    },
    async unstage(paths: string[]) {
      const root = handle.getSnapshot().root
      if (root === '' || paths.length === 0) return
      handle.update((prev) => ({ ...prev, busy: [...prev.busy, ...paths] }))
      const result = await api.gitUnstage(root, paths)
      handle.update((prev) => ({
        ...prev,
        failed: result.ok && Array.isArray(result.value?.failed) ? result.value.failed : (result.ok ? [] : paths),
        busy: prev.busy.filter((item) => !paths.includes(item)),
      }))
      await load(root)
    },
    async discard(paths: string[]) {
      const root = handle.getSnapshot().root
      if (root === '' || paths.length === 0) return
      handle.update((prev) => ({ ...prev, busy: [...prev.busy, ...paths] }))
      const result = await api.gitDiscard(root, paths)
      handle.update((prev) => ({
        ...prev,
        failed: result.ok && Array.isArray(result.value?.failed) ? result.value.failed : (result.ok ? [] : paths),
        busy: prev.busy.filter((item) => !paths.includes(item)),
      }))
      await load(root)
    },
    async discardAll() {
      const state = handle.getSnapshot()
      const paths = [
        ...(state.status?.unstaged ?? []),
        ...(state.status?.untracked ?? []),
      ].map((row) => row.path)
      await this.discard(paths)
    },
    setViewMode(mode: 'list' | 'tree') {
      handle.update((prev) => (prev.viewMode === mode ? prev : { ...prev, viewMode: mode }))
      schedulePersist(handle.getSnapshot())
    },
    setSectionCollapsed(id: string, collapsed: boolean) {
      handle.update((prev) => ({ ...prev, sectionCollapsed: { ...prev.sectionCollapsed, [id]: collapsed } }))
      schedulePersist(handle.getSnapshot())
    },
    setTreeExpanded(keys: string[]) {
      handle.update((prev) => ({ ...prev, treeExpanded: keys }))
      schedulePersist(handle.getSnapshot())
    },
    setFailed(paths: string[]) {
      handle.update((prev) => ({ ...prev, failed: paths }))
    },
    select(path: string | null) {
      handle.update((prev) => (prev.selected === path ? prev : { ...prev, selected: path }))
      schedulePersist(handle.getSnapshot())
    },
  })
  ;(store as unknown as Record<symbol, unknown>)[FLUSH_PERSIST] = flushPersist
  return store
}

// ─── preview store ──────────────────────────────────────────────────────────

/** One preview tab. */
export interface PreviewTabState {
  id: string
  title: string
  root: string
  path: string
  contentType: PreviewContentType
  /** Diff tabs (opened from the SCM panel): content is the path's git diff. */
  diff?: { staged: boolean }
  /** URL tabs: bumped by reloadTab to re-navigate the preview frame. */
  reloadNonce?: number
  /** null: content not loaded yet. */
  content: string | null
  /** The content baseline the last diff was generated against (edit diff). */
  baseContent?: string
  /** Auto-opened by an fs-change event (external first edit): no baseline may
   * exist, so the first load diffs against '' (all-green fresh-write) when
   * the host cache has no previous content either. */
  autoOpened?: boolean
  /** The file was deleted on disk; its all-red diff already popped once. */
  deleted?: boolean
  /** Edit-diff tabs: the LATEST disk content, kept editable alongside the
   * red/green view (saving it re-diffs the file and keeps the card alive). */
  editContent?: string
  /** The mtime editContent was based on — the write-conflict base so a save
   * can never clobber a NEWER disk state with stale content. */
  editMtime?: number
  /** Image dimensions for image tabs. */
  image?: { width: number; height: number }
  /** Office tabs (P4): the edited contenteditable HTML (null = read-only
   *  preview). Saving rebuilds the docx/xlsx/pptx package from it. */
  officeEditHtml?: string
  dirty: boolean
  /** mtime the loaded/saved content is based on (write-conflict base). */
  mtime?: number
  /** Disk is newer than the loaded content (refresh affordance). */
  updated: boolean
  loading: boolean
  truncated: boolean
  error: string | null
  savedAt: number
}

/** Preview panel state. */
export interface PreviewState {
  root: string
  /** The session this preview belongs to (per-session tab memory). */
  session: string
  open: boolean
  tabs: PreviewTabState[]
  activeTabId: string | null
  /** Bumped on every fs change event (drives staleness checks). */
  version: number
}

/** The preview store with its async actions. */
export interface PreviewStore extends StateHandle<PreviewState> {
  setRoot: (root: string, session?: string) => void
  openFile: (root: string, path: string) => void
  openDiff: (root: string, path: string, staged: boolean) => void
  /** Open a Trae-style edit diff (red deletes / green adds) for one save or
   *  one external edit. forceBottom pins the preview to the lower pane;
   *  mtime is the baseline the newText was read at (save conflict base). */
  openEditDiff: (root: string, path: string, title: string, oldText: string, newText: string, forceBottom?: boolean, mtime?: number) => void
  switchTab: (id: string) => void
  closeTabs: (ids: string[]) => void
  /** Drag-reorder: move tab `id` to the position of `targetId`. */
  moveTab: (id: string, targetId: string) => void
  updateContent: (id: string, content: string) => void
  saveTab: (id: string) => Promise<void>
  reloadTab: (id: string) => Promise<void>
  /** Edit-diff tabs: live-edit the latest content (kept in editContent). */
  setEditDiffContent: (id: string, text: string) => void
  saveEditDiff: (id: string) => Promise<void>
  /** Office tabs (P4): enter in-frame editing with the edited HTML, or exit
   *  back to the read-only preview (editHtml undefined). */
  setOfficeEditHtml: (id: string, editHtml: string | undefined) => void
  setOpen: (open: boolean) => void
  handleFsChange: (rel?: string) => Promise<void>
  handleGitChange: (root: string) => void
}

/** Persisted tab meta (content is re-fetched on restore). */
interface PersistedTab {
  id: string
  title: string
  root: string
  path: string
  contentType: PreviewContentType
  diff?: { staged: boolean }
  savedAt: number
}

/** Read persisted tabs for a session+root (guarded, content-less). */
export function readPreviewTabs(session: string, root: string): PersistedTab[] {
  const stored = readJson<{ savedAt?: unknown; tabs?: unknown }>(`preview-ui:${session}:${root}`, {})
  if (!Array.isArray(stored.tabs)) return []
  const out: PersistedTab[] = []
  for (const item of stored.tabs) {
    if (typeof item !== 'object' || item === null) continue
    const record = item as Record<string, unknown>
    if (typeof record.id !== 'string' || typeof record.path !== 'string') continue
    const rawDiff = record.diff
    const diff = typeof rawDiff === 'object' && rawDiff !== null
      && typeof (rawDiff as Record<string, unknown>).staged === 'boolean'
      ? { staged: (rawDiff as { staged: boolean }).staged }
      : undefined
    out.push({
      id: record.id,
      title: typeof record.title === 'string' ? record.title : record.path,
      root: typeof record.root === 'string' ? record.root : root,
      path: record.path,
      contentType: typeof record.contentType === 'string' ? record.contentType as PreviewContentType : 'text',
      diff,
      savedAt: typeof record.savedAt === 'number' ? record.savedAt : 0,
    })
  }
  return out
}

/**
 * Create the preview store (per-root tab persistence with LRU scopes).
 * @param api - the panel api.
 * @param onAutoDiff - fired when an EXTERNAL edit pops an auto diff into the
 *   lower pane (lets the layout pin the preview to the bottom region).
 */
export function createPreviewStore(
  api: PanelApi,
  onAutoDiff?: () => void,
  watchGetter?: () => Record<string, 'shallow' | 'deep'>,
  settingsGetter?: () => { features: { autoDiff: boolean } },
): PreviewStore {
  const handle = createState<PreviewState>({
    root: '',
    session: '',
    open: false,
    tabs: [],
    activeTabId: null,
    version: 0,
  })

  let persistTimer: ReturnType<typeof setTimeout> | undefined
  const flushPersist = (): void => {
    if (persistTimer !== undefined) clearTimeout(persistTimer)
    persistTimer = undefined
    const current = handle.getSnapshot()
    if (current.root === '') return
    const meta: PersistedTab[] = current.tabs.map((tab) => ({
      id: tab.id,
      title: tab.title,
      root: tab.root,
      path: tab.path,
      contentType: tab.contentType,
      diff: tab.diff,
      savedAt: tab.savedAt,
    }))
    writeJson(`preview-ui:${current.session}:${current.root}`, { savedAt: Date.now(), tabs: meta })
    evictPreviewScopes(`${current.session}:${current.root}`)
  }
  const schedulePersist = (state: PreviewState): void => {
    if (state.root === '') return
    if (persistTimer !== undefined) clearTimeout(persistTimer)
    persistTimer = setTimeout(flushPersist, 150)
  }

  /** Load content for one tab (text or image data URL, or git diff). */
  const loadContent = async (root: string, id: string): Promise<void> => {
    const tab = handle.getSnapshot().tabs.find((item) => item.id === id)
    if (tab === undefined || tab.content !== null || tab.loading) return
    handle.update((prev) => ({
      ...prev,
      tabs: prev.tabs.map((item) => (item.id === id ? { ...item, loading: true, error: null } : item)),
    }))
    const asImage = tab.contentType === 'image' || tab.contentType === 'word'
      || tab.contentType === 'excel' || tab.contentType === 'ppt'
    // A RESTORED edit-diff tab (contentType 'diff', no staged side) has no
    // persisted diff content — rebuild the card from the file tab's baseline
    // and the current disk state, instead of dumping raw code into the view.
    if (tab.contentType === 'diff' && tab.diff === undefined) {
      const fileTab = handle.getSnapshot().tabs.find((t) => t.root === root && t.path === tab.path && t.diff === undefined)
      const disk = await api.read(root, tab.path, false)
      if (disk.ok) {
        const base = fileTab?.baseContent
        if (base !== undefined && base !== disk.value.content) {
          // Rebuild the card inline (loadContent predates the store object,
          // so it cannot call openEditDiff).
          const hunks = lineDiff(base, disk.value.content)
          const lines: string[] = [`--- ${fileTab?.title ?? tab.path}`, `+++ ${fileTab?.title ?? tab.path}`]
          for (const hunk of hunks) {
            if (hunk.kind === 'same') lines.push(` ${hunk.text}`)
            else if (hunk.kind === 'del') lines.push(`-${hunk.text}`)
            else lines.push(`+${hunk.text}`)
          }
          handle.update((prev) => ({
            ...prev,
            tabs: prev.tabs.map((item) => (
              item.id === id
                ? { ...item, loading: false, content: lines.join('\n'), editContent: disk.value.content, editMtime: disk.value.mtime, error: null }
                : item
            )),
          }))
          return
        }
      }
      // No baseline or disk unchanged: nothing to diff — drop the empty tab.
      handle.update((prev) => ({
        ...prev,
        tabs: prev.tabs.filter((item) => item.id !== id),
      }))
      return
    }
    const result = tab.diff !== undefined
      ? await api.gitDiff(root, tab.path, tab.diff.staged)
      : await api.read(root, tab.path, asImage)
    handle.update((prev) => {
      if (prev.root !== root) return prev
      return {
        ...prev,
        tabs: prev.tabs.map((item) => {
          if (item.id !== id) return item
          if (!result.ok) {
            return { ...item, loading: false, error: result.error.message }
          }
          // The user started typing while the fetch was in flight: their newer
          // content must not be overwritten by this (already stale) disk read.
          if (item.dirty) return { ...item, loading: false }
          // read and gitDiff share the content field; only read carries the
          // rest (image/mtime/truncated), so the union is read as its merge.
          const loaded = result.value as { content: string; image?: FileRead['image']; mtime?: number; truncated?: boolean; previous?: string }
          return {
            ...item,
            loading: false,
            content: loaded.content,
            // The edit-diff baseline: the host's cached previous content (an
            // externally edited file opens against its last-known state —
            // this is the "remember pre-modification" mechanism), or the disk
            // snapshot on first load. An fs-change auto-open has no read
            // baseline yet: '' makes the very first diff a fresh-write
            // (all-green) when the host cache has no previous content.
            baseContent: item.baseContent
              ?? loaded.previous
              ?? (tab.diff !== undefined ? item.baseContent : tab.autoOpened ? '' : loaded.content),
            image: loaded.image,
            mtime: loaded.mtime,
            truncated: loaded.truncated ?? false,
            updated: false,
          }
        }),
      }
    })
  }

  /** Touch a tab's savedAt (LRU order within the scope). */
  const touch = (id: string): void => {
    handle.update((prev) => ({
      ...prev,
      tabs: prev.tabs.map((item) => (item.id === id ? { ...item, savedAt: Date.now() } : item)),
    }))
  }

  /**
   * Re-fetch every loaded diff tab of the root in place (fs/git change
   * events). In-flight or not-yet-loaded tabs are skipped — the next load or
   * event covers them; landing guards keep a newer edit from being clobbered.
   */
  const refreshDiffs = async (root: string): Promise<void> => {
    if (handle.getSnapshot().root !== root) return
    const diffs = handle.getSnapshot().tabs
      .filter((tab): tab is PreviewTabState & { diff: { staged: boolean } } => tab.diff !== undefined)
    await Promise.all(diffs.map(async (tab) => {
      if (tab.content === null || tab.loading) return
      const result = await api.gitDiff(root, tab.path, tab.diff.staged)
      handle.update((prev) => {
        if (prev.root !== root) return prev
        return {
          ...prev,
          tabs: prev.tabs.map((item) => {
            if (item.id !== tab.id || !result.ok) return item
            if (item.dirty || item.loading) return item
            return { ...item, content: result.value.content, error: null }
          }),
        }
      })
    }))
  }

  const store: PreviewStore = Object.assign(handle, {
    setRoot(root: string, session = '') {
      handle.update((prev) => {
        if (prev.root === root && prev.session === session) return prev
        const persisted = readPreviewTabs(session, root)
        const tabs: PreviewTabState[] = persisted.map((meta) => ({
          id: meta.id,
          title: meta.title,
          root: meta.root,
          path: meta.path,
          contentType: meta.contentType,
          diff: meta.diff,
          content: null,
          dirty: false,
          updated: false,
          loading: false,
          truncated: false,
          error: null,
          savedAt: meta.savedAt,
        }))
        const activeTabId = tabs.length > 0 ? tabs[tabs.length - 1].id : null
        return { ...prev, root, session, tabs, activeTabId, open: tabs.length > 0 }
      })
      const state = handle.getSnapshot()
      if (state.activeTabId !== null) void loadContent(root, state.activeTabId)
    },
    async openFile(root: string, path: string, asChange = false): Promise<void> {
      const type = detectContentType(path)
      const id = tabIdOf(root, path, type)
      // NEVER open the same file twice in the strip: reuse any existing tab
      // of this path (exact id, or any type/diff tab of the same file), and
      // refresh its content in place instead of stacking a duplicate.
      const tabs = handle.getSnapshot().tabs
      const existing = tabs.find((tab) => tab.id === id)
        ?? tabs.find((tab) => tab.root === root && tab.path === path && tab.diff === undefined)
        ?? tabs.find((tab) => tab.root === root && tab.path === path)
      if (existing !== undefined) {
        handle.update((prev) => ({
          ...prev,
          root,
          open: true,
          activeTabId: existing.id,
          tabs: prev.tabs.map((tab) => (tab.id === existing.id ? { ...tab, savedAt: Date.now() } : tab)),
        }))
        const loaded = loadContent(root, existing.id)
        schedulePersist(handle.getSnapshot())
        return loaded
      }
      handle.update((prev) => {
        if (prev.root !== root) return prev
        const tab: PreviewTabState = {
          id,
          title: path.split('/').pop() ?? path,
          root,
          path,
          contentType: type,
          content: null,
          dirty: false,
          updated: false,
          loading: false,
          truncated: false,
          error: null,
          autoOpened: asChange,
          savedAt: Date.now(),
        }
        return { ...prev, open: true, tabs: [...prev.tabs, tab], activeTabId: id }
      })
      const loaded = loadContent(root, id)
      schedulePersist(handle.getSnapshot())
      return loaded
    },
    openDiff(root: string, path: string, staged: boolean) {
      // A distinct id space (scm-diff: side + root + path) so the same file
      // can carry a diff tab AND a file tab, and staged/unstaged diffs of one
      // path are separate tabs — each reflects the side it was opened from.
      const id = `scm-diff:${staged ? 's' : 'u'}\u0000${root}\u0000${path}`
      const existing = handle.getSnapshot().tabs.find((tab) => tab.id === id)
      if (existing !== undefined) {
        handle.update((prev) => ({
          ...prev,
          root,
          open: true,
          activeTabId: id,
          tabs: prev.tabs.map((tab) => (tab.id === id ? { ...tab, savedAt: Date.now() } : tab)),
        }))
        void loadContent(root, id)
        schedulePersist(handle.getSnapshot())
        return
      }
      handle.update((prev) => {
        if (prev.root !== root) return prev
        const tab: PreviewTabState = {
          id,
          title: path.split('/').pop() ?? path,
          root,
          path,
          contentType: 'diff',
          diff: { staged },
          content: null,
          dirty: false,
          updated: false,
          loading: false,
          truncated: false,
          error: null,
          savedAt: Date.now(),
        }
        return { ...prev, open: true, tabs: [...prev.tabs, tab], activeTabId: id }
      })
      void loadContent(root, id)
      schedulePersist(handle.getSnapshot())
    },
    openEditDiff(root: string, path: string, title: string, oldText: string, newText: string, forceBottom = false, mtime?: number) {
      // Nothing changed — an empty-vs-empty diff is meaningless (and would
      // render a stray "+" row).
      if (oldText === '' && newText === '') return
      // A distinct id space (edit-diff) so it never collides with the file tab.
      const id = `edit-diff:\u0000${root}\u0000${path}`
      const hunks = lineDiff(oldText, newText)
      const lines: string[] = [`--- ${title}`, `+++ ${title}`]
      for (const hunk of hunks) {
        if (hunk.kind === 'same') lines.push(` ${hunk.text}`)
        else if (hunk.kind === 'del') lines.push(`-${hunk.text}`)
        else lines.push(`+${hunk.text}`)
      }
      const content = lines.join('\n')
      // Push the baseline forward so the NEXT external edit diffs against the
      // latest disk state (each edit pops its own fresh diff; no repeats).
      handle.update((prev) => ({
        ...prev,
        tabs: prev.tabs.map((tab) => (
          tab.root === root && tab.path === path && tab.diff === undefined && !tab.dirty
            ? { ...tab, baseContent: newText }
            : tab
        )),
      }))
      const existing = handle.getSnapshot().tabs.find((tab) => tab.id === id)
      if (existing !== undefined) {
        handle.update((prev) => ({
          ...prev,
          root,
          open: true,
          activeTabId: id,
          tabs: prev.tabs.map((tab) => (tab.id === id ? { ...tab, content, editContent: newText, editMtime: mtime, savedAt: Date.now() } : tab)),
        }))
        if (forceBottom) onAutoDiff?.()
        schedulePersist(handle.getSnapshot())
        return
      }
      handle.update((prev) => {
        if (prev.root !== root) return prev
        const tab: PreviewTabState = {
          id,
          title: `${title} (diff)`,
          root,
          path,
          contentType: 'diff',
          content,
          editContent: newText,
          editMtime: mtime,
          dirty: false,
          updated: false,
          loading: false,
          truncated: false,
          error: null,
          savedAt: Date.now(),
        }
        return { ...prev, open: true, tabs: [...prev.tabs, tab], activeTabId: id }
      })
      if (forceBottom) onAutoDiff?.()
      schedulePersist(handle.getSnapshot())
    },
    setEditDiffContent(id: string, text: string) {
      handle.update((prev) => ({
        ...prev,
        tabs: prev.tabs.map((tab) => (tab.id === id ? { ...tab, editContent: text } : tab)),
      }))
    },
    async saveEditDiff(id: string) {
      // Save the editable latest-content of an edit-diff tab back to disk.
      // The write carries the baseline mtime (editMtime): if the disk moved on
      // since this diff card was built, the write is REJECTED — stale content
      // must never clobber a newer edit. On conflict the card is re-read and
      // rebuilt against the current disk state so the user edits the latest.
      // The successful write itself triggers an fs-change event, which
      // re-diffs the file (red/green against the baseline) — the card stays.
      const state = handle.getSnapshot()
      const tab = state.tabs.find((item) => item.id === id)
      if (tab === undefined || tab.editContent === undefined) return
      const result = await api.write(state.root, tab.path, tab.editContent, tab.editMtime)
      if (result.ok) {
        handle.update((prev) => ({
          ...prev,
          tabs: prev.tabs.map((item) => (item.id === id ? { ...item, editMtime: result.value.mtime, savedAt: Date.now() } : item)),
        }))
        return
      }
      // Write rejected (usually a mtime conflict): re-read the disk and rebuild
      // the card around the LATEST content — the user's stale edit is dropped,
      // never written over the newer disk state.
      const fresh = await api.read(state.root, tab.path, false)
      if (!fresh.ok) return
      const fileTab = handle.getSnapshot().tabs.find((t) => t.root === tab.root && t.path === tab.path && t.diff === undefined)
      this.openEditDiff(state.root, tab.path, fileTab?.title ?? tab.path, fileTab?.baseContent ?? fresh.value.content, fresh.value.content, false, fresh.value.mtime)
    },
    switchTab(id: string) {
      const state = handle.getSnapshot()
      if (state.activeTabId === id) return
      handle.update((prev) => ({ ...prev, activeTabId: id }))
      touch(id)
      const tab = handle.getSnapshot().tabs.find((item) => item.id === id)
      if (tab !== undefined && tab.content === null) void loadContent(state.root, id)
      schedulePersist(handle.getSnapshot())
    },
    moveTab(id: string, targetId: string) {
      if (id === targetId) return
      handle.update((prev) => {
        const from = prev.tabs.findIndex((item) => item.id === id)
        const to = prev.tabs.findIndex((item) => item.id === targetId)
        if (from < 0 || to < 0) return prev
        const tabs = [...prev.tabs]
        const [moved] = tabs.splice(from, 1)
        const insertAt = tabs.findIndex((item) => item.id === targetId)
        tabs.splice(insertAt < 0 ? tabs.length : insertAt, 0, moved)
        return { ...prev, tabs }
      })
      schedulePersist(handle.getSnapshot())
    },
    closeTabs(ids: string[]) {
      const state = handle.getSnapshot()
      const remaining = state.tabs.filter((tab) => !ids.includes(tab.id))
      const active = remaining.some((tab) => tab.id === state.activeTabId)
      const activeTabId = active
        ? state.activeTabId
        : remaining.length > 0
          ? remaining[Math.min(state.tabs.findIndex((tab) => tab.id === state.activeTabId), remaining.length - 1)]?.id ?? remaining[remaining.length - 1].id
          : null
      handle.update((prev) => ({
        ...prev,
        tabs: remaining,
        activeTabId,
        open: remaining.length > 0 ? prev.open : false,
      }))
      schedulePersist(handle.getSnapshot())
    },
    updateContent(id: string, content: string) {
      handle.update((prev) => ({
        ...prev,
        tabs: prev.tabs.map((tab) => {
          if (tab.id !== id) return tab
          const isOffice = tab.contentType === 'word' || tab.contentType === 'excel' || tab.contentType === 'ppt'
          return isOffice
            ? { ...tab, officeEditHtml: content, dirty: true, updated: false }
            : { ...tab, content, dirty: true, updated: false }
        }),
      }))
    },
    setOfficeEditHtml(id: string, editHtml: string | undefined) {
      handle.update((prev) => ({
        ...prev,
        tabs: prev.tabs.map((tab) => (tab.id === id ? { ...tab, officeEditHtml: editHtml, dirty: editHtml !== undefined } : tab)),
      }))
    },
    async saveTab(id: string) {
      const state = handle.getSnapshot()
      const tab = state.tabs.find((item) => item.id === id)
      if (tab === undefined || tab.content === null || tab.diff !== undefined) return
      // Office tabs (P4): the tab holds the original data URL; the edited
      // HTML is rebuilt into a fresh package and written as binary.
      if ((tab.contentType === 'word' || tab.contentType === 'excel' || tab.contentType === 'ppt') && tab.officeEditHtml !== undefined) {
        const sentEdit = tab.officeEditHtml
        handle.update((prev) => ({
          ...prev,
          tabs: prev.tabs.map((item) => (item.id === id ? { ...item, loading: true, error: null } : item)),
        }))
        let base64: string
        try {
          const { rebuildOffice } = await import('./preview/office.tsx')
          base64 = await rebuildOffice(tab.content, tab.contentType, sentEdit)
        } catch (error) {
          handle.update((prev) => ({
            ...prev,
            tabs: prev.tabs.map((item) => (item.id === id ? { ...item, loading: false, error: error instanceof Error ? error.message : String(error) } : item)),
          }))
          return
        }
        const result = await api.writeBinary(state.root, tab.path, base64, tab.mtime)
        handle.update((prev) => {
          if (prev.root !== state.root) return prev
          return {
            ...prev,
            tabs: prev.tabs.map((item) => {
              if (item.id !== id) return item
              if (!result.ok) {
                return {
                  ...item,
                  loading: false,
                  error: result.error.code === 'write-conflict'
                    ? '文件已在磁盘上被修改，保存冲突：请刷新后重试'
                    : result.error.message,
                }
              }
              if (item.officeEditHtml !== sentEdit) {
                return { ...item, loading: false, mtime: result.value.mtime, error: null }
              }
              return { ...item, loading: false, dirty: false, mtime: result.value.mtime, error: null }
            }),
          }
        })
        return
      }
      if (tab.content === null || !isTextType(tab.contentType)) return
      const sentContent = tab.content
      const baseline = tab.baseContent
      handle.update((prev) => ({
        ...prev,
        tabs: prev.tabs.map((item) => (item.id === id ? { ...item, loading: true, error: null } : item)),
      }))
      const result = await api.write(state.root, tab.path, tab.content, tab.mtime)
      handle.update((prev) => {
        if (prev.root !== state.root) return prev
        return {
          ...prev,
          tabs: prev.tabs.map((item) => {
            if (item.id !== id) return item
            if (!result.ok) {
              return {
                ...item,
                loading: false,
                error: result.error.code === 'write-conflict'
                  ? '文件已在磁盘上被修改，保存冲突：请刷新后重试'
                  : result.error.message,
              }
            }
            if (item.content !== sentContent) {
              // The user kept typing while the save was in flight: the disk now
              // holds the sent snapshot, but the tab's newer edits are unsaved.
              // Refresh the write base so the next save is conflict-safe and
              // keep the dirty flag so the UI still shows an unsaved edit.
              return { ...item, loading: false, mtime: result.value.mtime, error: null }
            }
            return { ...item, loading: false, dirty: false, mtime: result.value.mtime, error: null }
          }),
        }
      })
      // Trae-style edit diff: after a successful save, open a diff tab showing
      // exactly what changed (deleted lines red, added lines green).
      if (result.ok && baseline !== undefined && baseline !== sentContent && !sentContent.includes('\u0000')) {
        this.openEditDiff(state.root, tab.path, tab.title, baseline, sentContent, false, result.value.mtime)
      }
    },
    async reloadTab(id: string) {
      const state = handle.getSnapshot()
      const tab = state.tabs.find((item) => item.id === id)
      if (tab === undefined) return
      if (tab.contentType === 'url') {
        // URL tabs own a live document inside the frame; reload bumps the
        // nonce so UrlViewer re-navigates the frame to its address.
        handle.update((prev) => ({
          ...prev,
          tabs: prev.tabs.map((item) =>
            item.id === id ? { ...item, reloadNonce: (item.reloadNonce ?? 0) + 1 } : item,
          ),
        }))
        return
      }
      if (tab.contentType === 'diff' && tab.diff === undefined) {
        // EDIT-diff tab: refreshing must NOT replace the view with raw file
        // content (that is what erased the red/green). Re-diff the file's
        // tab baseline against the current disk state — and when the disk is
        // unchanged, keep the existing card exactly as it is.
        const fileTab = state.tabs.find((t) => t.root === tab.root && t.path === tab.path && t.diff === undefined)
        const result = await api.read(state.root, tab.path, false)
        if (result.ok) {
          const base = fileTab?.baseContent
          if (base !== undefined && base !== result.value.content) {
            this.openEditDiff(state.root, tab.path, fileTab?.title ?? tab.path, base, result.value.content, false, result.value.mtime)
          }
        }
        return
      }
      handle.update((prev) => ({
        ...prev,
        tabs: prev.tabs.map((item) => (item.id === id ? { ...item, loading: true } : item)),
      }))
      const result = tab.diff !== undefined
        ? await api.gitDiff(state.root, tab.path, tab.diff.staged)
        : await api.read(state.root, tab.path, tab.contentType === 'image' || tab.contentType === 'word' || tab.contentType === 'excel' || tab.contentType === 'ppt')
      handle.update((prev) => {
        if (prev.root !== state.root) return prev
        return {
          ...prev,
          tabs: prev.tabs.map((item) => {
            if (item.id !== id) return item
            if (!result.ok) return { ...item, loading: false, error: result.error.message }
            const loaded = result.value as { content: string; image?: FileRead['image']; mtime?: number; truncated?: boolean }
            return {
              ...item,
              loading: false,
              content: loaded.content,
              image: loaded.image,
              mtime: loaded.mtime,
              truncated: loaded.truncated ?? false,
              updated: false,
              dirty: false,
              error: null,
            }
          }),
        }
      })
    },
    setOpen(open: boolean) {
      handle.update((prev) => (prev.open === open ? prev : { ...prev, open }))
    },
    async handleFsChange(rel?: string) {
      const state = handle.getSnapshot()
      if (state.root === '') return
      // Workspace setting: autoDiff pops red/green diff cards on external
      // edits. Off keeps tab content fresh but never pops the card.
      const autoDiffEnabled = settingsGetter?.()?.features.autoDiff ?? true
      handle.update((prev) => ({ ...prev, version: prev.version + 1 }))
      // Diff tabs are derived views: any fs change may alter them, so refresh
      // them in place (never mark "updated" — the refresh is automatic).
      await refreshDiffs(state.root)

      // AUTO-OPEN: an EXTERNAL edit (agent tool / other process) to a file
      // that is not open yet — pop it open so the edit is immediately visible
      // (vibecoding behavior). Scope: the default first level, plus any
      // directory the user marked (shallow = next level, deep = all levels);
      // noise paths never pop regardless of marks.
      if (rel !== undefined && rel !== '' && !rel.includes('\u0000') && shouldAutoOpen(rel, watchGetter?.() ?? {})) {
        const root = handle.getSnapshot().root
        const openTabs = handle.getSnapshot().tabs
        const alreadyOpen = openTabs.some((tab) => tab.root === root && tab.path === rel)
        if (!alreadyOpen) {
          // Probe via the DIRECTORY LISTING (readdir), never read(): a read()
          // overwrites the host's previous-content cache, destroying the
          // red/green baseline (first external edit would diff against the
          // post-edit text and never pop). Also keeps directories and
          // vanished paths from spawning doomed error tabs.
          const slash = rel.lastIndexOf('/')
          const dir = slash >= 0 ? rel.slice(0, slash) : ''
          const base = slash >= 0 ? rel.slice(slash + 1) : rel
          const listing = await api.list(root, dir)
          if (handle.getSnapshot().root !== root) return
          const entry = listing.ok
            ? listing.value.entries.find((e) => e.name === base)
            : undefined
          if (entry === undefined) {
            // Deleted (not a directory): if an open tab still holds the
            // content, pop an ALL-RED diff — every line removed (once).
            const open = handle.getSnapshot().tabs.find((t) => t.root === root && t.path === rel && t.diff === undefined)
            if (open !== undefined && open.content !== null && !open.dirty && !open.deleted) {
              if (autoDiffEnabled) this.openEditDiff(root, rel, open.title, open.baseContent ?? open.content, '', true)
              handle.update((prev) => ({
                ...prev,
                tabs: prev.tabs.map((t) => (t.id === open.id ? { ...t, deleted: true } : t)),
              }))
            }
            return
          }
          if (entry.isDir) return
          await this.openFile(root, rel, true)
          // openFile resolves when its content load actually finished — the
          // contrast loop below then sees a loaded tab (a fixed delay raced
          // the browser's per-domain connection limit when many tabs were
          // restoring at once).
        }
      }

      // EXTERNAL edits: pop an auto diff into the lower pane for EVERY open
      // file tab whose disk content moved away from its baseline. Deleted
      // lines render red, added lines green. Parallel reads keep bursts
      // smooth; the baseline is pushed forward by openEditDiff so each edit
      // pops exactly once. Respects the workspace setting (autoDiff off keeps
      // the tab content fresh but never pops the card).
      const tabs = handle.getSnapshot().tabs.filter((tab) =>
        tab.content !== null
        && !tab.dirty
        && !tab.deleted
        && tab.diff === undefined
        && isTextType(tab.contentType)
        && tab.baseContent !== undefined,
      )
      await Promise.all(tabs.map(async (tab) => {
        if (handle.getSnapshot().root !== state.root) return
        const result = await api.read(state.root, tab.path, false)
        if (handle.getSnapshot().root !== state.root) return
        if (!result.ok) {
          // The file was deleted: an already-open tab pops an all-red diff
          // (every line removed) instead of silently doing nothing — once.
          if (result.error?.code === 'not-found') {
            const current = handle.getSnapshot().tabs.find((item) => item.id === tab.id)
            if (current !== undefined && current.content !== null && !current.dirty && current.diff === undefined && !current.deleted) {
              if (autoDiffEnabled) this.openEditDiff(state.root, tab.path, tab.title, current.baseContent ?? current.content, '', true)
              handle.update((prev) => ({
                ...prev,
                tabs: prev.tabs.map((t) => (t.id === tab.id ? { ...t, deleted: true } : t)),
              }))
            }
          }
          return
        }
        const current = handle.getSnapshot().tabs.find((item) => item.id === tab.id)
        if (current === undefined || current.dirty || current.diff !== undefined) return
        const disk = result.value.content
        // Keep the ALREADY-OPEN tab fresh in place (never stack a duplicate):
        // its content follows the disk, so switching back to the file tab
        // always shows the latest bytes.
        handle.update((prev) => ({
          ...prev,
          tabs: prev.tabs.map((t) => (
            t.id === tab.id ? { ...t, content: disk, mtime: result.value.mtime ?? t.mtime } : t
          )),
        }))
        if (!autoDiffEnabled) return
        // Fresh-write: an fs-change auto-open with NO baseline renders the
        // whole file as additions (all-green). The content read equals the
        // new disk state (disk === current.content), so the generic guard
        // would skip it — pop the all-green diff explicitly instead.
        if (current.autoOpened === true && current.baseContent === '') {
          this.openEditDiff(state.root, tab.path, tab.title, '', disk, true, result.value.mtime)
          return
        }
        if (disk === current.baseContent || disk === current.content) return
        // Pop the diff and pin the preview to the lower pane.
        this.openEditDiff(state.root, tab.path, tab.title, current.baseContent ?? '', disk, true, result.value.mtime)
      }))
    },
    async handleGitChange(root: string) {
      // A git push means the index/worktree moved (stage/unstage/discard or
      // external git): every open diff tab is stale by definition.
      await refreshDiffs(root)
    },
  })
  ;(store as unknown as Record<symbol, unknown>)[FLUSH_PERSIST] = flushPersist
  return store
}

/** Convenience bundle: the four stores wired to one api. */
export interface PanelStores {
  layout: LayoutStore
  explorer: ExplorerStore
  scm: ScmStore
  preview: PreviewStore
  /** Right-side workspace settings (feature toggles + editor tools). */
  settings: SettingsStore
  /** The shared panel api (used by the file context menu). */
  api: PanelApi
}

/** PanelStores plus a pagehide flush hook. */
export interface PanelStoresWithFlush extends PanelStores {
  /** Flush every pending debounced persist immediately (pagehide/beforeunload). */
  flushNow: () => void
}

/** Create the full store bundle. */
export function createPanelStores(api: PanelApi): PanelStoresWithFlush {
  const settings = getSettingsStore()
  const layout = createLayoutStore(() => settings.getSnapshot())
  const explorer = createExplorerStore(api)
  const scm = createScmStore(api)
  // External edits pin the preview to the LOWER pane (右栏一分为二的下栏).
  const preview = createPreviewStore(api, () => {
    layout.setPreviewMode('bottom')
    layout.update((prev) => (prev.previewOpen ? prev : { ...prev, previewOpen: true }))
  }, () => explorer.getSnapshot().watch, () => settings.getSnapshot())
  const flushNow = (): void => {
    for (const store of [explorer, scm, preview]) {
      const flush = (store as unknown as Record<symbol, unknown>)[FLUSH_PERSIST]
      if (typeof flush === 'function') (flush as () => void)()
    }
  }
  const stores: PanelStoresWithFlush = { layout, explorer, scm, preview, settings, api, flushNow }
  return stores
}
