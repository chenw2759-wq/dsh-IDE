/**
 * Per-session SSH memory: each session remembers its own device and mode, so
 * switching sessions restores that session's SSH state (isolation). The host
 * mode store stays process-global (the fs/subprocess seams route on it), so
 * this is the client-side per-session view: session A stays remote on "prod"
 * while session B is local, and switching re-applies the remembered mode.
 */
import type { WorkspaceState } from '../protocol.ts'

const KEY_PREFIX = 'ssh-session-state:'

/** Load a session's remembered SSH state (null = never configured). */
export function loadSessionState(sessionId: string): WorkspaceState | null {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + sessionId)
    if (raw === null) return null
    const parsed = JSON.parse(raw) as Partial<WorkspaceState>
    if (parsed.mode !== 'remote' && parsed.mode !== 'local') return null
    if (parsed.mode === 'remote' && typeof parsed.alias !== 'string') return null
    return {
      mode: parsed.mode,
      alias: parsed.mode === 'remote' ? parsed.alias : parsed.alias,
      remoteRoot: typeof parsed.remoteRoot === 'string' ? parsed.remoteRoot : undefined,
      remoteRootLabel: typeof parsed.remoteRootLabel === 'string' ? parsed.remoteRootLabel : undefined,
    }
  } catch {
    return null
  }
}

/** Remember a session's SSH state (call after every mode change). */
export function saveSessionState(sessionId: string, state: WorkspaceState): void {
  try {
    localStorage.setItem(KEY_PREFIX + sessionId, JSON.stringify(state))
  } catch {
    // best-effort
  }
}
