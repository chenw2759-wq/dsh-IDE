/**
 * Workspace settings for the right-side IDE: a "右边栏工作区" mode panel that
 * toggles whole features on/off and picks WHICH editing tools the edit-mode
 * toolbar shows. Persisted in localStorage; read by feature code.
 * @module dsh-aionui-panel/client/settings
 */

import { createState, type StateHandle } from './store.ts'

/** Feature toggles for the right-side workspace. */
export interface WorkspaceFeatures {
  /** External edits auto-pop the red/green diff card. */
  autoDiff: boolean
  /** Per-directory watch dots on the file tree. */
  watchDots: boolean
  /** Git status badges (A/M/D/R/U/C) on tree rows. */
  gitBadges: boolean
  /** Syntax highlighting in editors. */
  syntaxHighlight: boolean
  /** Zoom toolbar on image/HTML previews. */
  zoomPreview: boolean
  /** Triple-IDE layout mode in the layout cycle. */
  tripleLayout: boolean
  /** Integrated terminal docked at the chat bottom. */
  terminalDock: boolean
  /** Per-session memory for tree + tabs. */
  sessionIsolation: boolean
}

/** Editing tools the edit-mode toolbar may show (P4: office/rich editing). */
export interface WorkspaceEditorTools {
  font: boolean
  fontSize: boolean
  boldItalic: boolean
  align: boolean
  underline: boolean
  color: boolean
  spacing: boolean
  margin: boolean
  highlight: boolean
}

/** All settings for the right-side workspace. */
export interface WorkspaceSettings {
  features: WorkspaceFeatures
  editorTools: WorkspaceEditorTools
}

const KEY = 'aionui-workspace-settings'

const DEFAULT_SETTINGS: WorkspaceSettings = {
  features: {
    autoDiff: true,
    watchDots: true,
    gitBadges: true,
    syntaxHighlight: true,
    zoomPreview: true,
    tripleLayout: true,
    terminalDock: true,
    sessionIsolation: true,
  },
  editorTools: {
    font: true,
    fontSize: true,
    boldItalic: true,
    align: true,
    underline: true,
    color: true,
    spacing: true,
    margin: true,
    highlight: true,
  },
}

/** A patch: each nested section may carry only the keys being changed. */
export type SettingsPatch = {
  features?: Partial<WorkspaceFeatures>
  editorTools?: Partial<WorkspaceEditorTools>
}

/** Settings store: plain state + a patching action. */
export interface SettingsStore extends StateHandle<WorkspaceSettings> {
  /** Deep-merge a partial settings object (nested sections replaced per key). */
  set: (patch: SettingsPatch) => void
  reset: () => void
}

function readStored(): WorkspaceSettings {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw === null) return DEFAULT_SETTINGS
    const parsed = JSON.parse(raw) as Partial<WorkspaceSettings>
    return {
      features: { ...DEFAULT_SETTINGS.features, ...(parsed.features ?? {}) },
      editorTools: { ...DEFAULT_SETTINGS.editorTools, ...(parsed.editorTools ?? {}) },
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

/** Read current settings directly (feature code without a store handle). */
export function readSettings(): WorkspaceSettings {
  return readStored()
}

/** Create the settings store (reads persisted values on init). */
export function createSettingsStore(): SettingsStore {
  const handle = createState<WorkspaceSettings>(readStored())
  const persist = (state: WorkspaceSettings): void => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
    } catch {
      // best-effort
    }
  }
  const store: SettingsStore = Object.assign(handle, {
    set(patch: SettingsPatch) {
      handle.update((prev) => {
        const next: WorkspaceSettings = {
          features: { ...prev.features, ...(patch.features ?? {}) },
          editorTools: { ...prev.editorTools, ...(patch.editorTools ?? {}) },
        }
        persist(next)
        return next
      })
    },
    reset() {
      persist(DEFAULT_SETTINGS)
      handle.update(() => DEFAULT_SETTINGS)
    },
  })
  return store
}

/** Module-level singleton: the panel wiring and the settings-section both
 *  share ONE store instance, so toggles in the shell settings panel update the
 *  live panel feature code (and vice versa) without a page reload. */
let sharedSettingsStore: SettingsStore | null = null
export function getSettingsStore(): SettingsStore {
  if (sharedSettingsStore === null) sharedSettingsStore = createSettingsStore()
  return sharedSettingsStore
}

/** Feature toggle ids (labels come from locales). */
export const FEATURE_IDS: Array<keyof WorkspaceFeatures> = [
  'autoDiff', 'watchDots', 'gitBadges', 'syntaxHighlight',
  'zoomPreview', 'tripleLayout', 'terminalDock', 'sessionIsolation',
]

/** Editor-tool ids (labels come from locales). */
export const EDITOR_TOOL_IDS: Array<keyof WorkspaceEditorTools> = [
  'font', 'fontSize', 'boldItalic', 'align', 'underline', 'color', 'spacing', 'margin', 'highlight',
]
