/**
 * Client-side mode state: mirrors the host's /state endpoint with a light
 * poll (3s) plus immediate refresh after every local action. The snapshot
 * object is replaced only on successful fetches, so React's
 * useSyncExternalStore sees stable references between polls.
 *
 * Per-session isolation: every session remembers its own device + mode in
 * localStorage (`ssh-session-state:<sessionId>`). The CLIENT VIEW for the
 * active session is authoritative — switching sessions applies that session's
 * remembered state through the host API, and the 3s poll never blindly
 * adopts a global remote state that belongs to a DIFFERENT session. So a
 * session that was never configured stays local even if another session
 * turned SSH on, and switching back restores each session's own device.
 *
 * The host-side fs/subprocess seams still route on the process-global mode
 * (the model tool call chain carries no session id) — this is the documented
 * limit: isolation applies to the panel and explicit remote_* tools.
 */
import type { WorkspaceState } from '../protocol.ts'
import type { WorkspaceApi } from './api.ts'
import { loadSessionState, saveSessionState } from './session-memory.ts'

const POLL_MS = 3_000

export class ModeState {
  private state: WorkspaceState = { mode: 'local' }
  private readonly listeners = new Set<() => void>()
  private timer: number | undefined
  private sessionId: string | undefined

  constructor(private readonly api: WorkspaceApi) {}

  getSnapshot(): WorkspaceState {
    return this.state
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private emit(): void {
    for (const listener of [...this.listeners]) listener()
  }

  /** The mode THIS session should be in. `null` = the session has no memory
   *  of its own (never configured) — callers must NOT correct the global host
   *  mode for it, or a session that merely exists would yank the host out of
   *  another session's SSH mode. */
  private desiredFor(sessionId: string): WorkspaceState | null {
    const remembered = loadSessionState(sessionId)
    if (remembered === null) return null
    return remembered
  }

  /**
   * Reconcile the client view with the host's global mode. A session WITH its
   * own memory corrects the host when they disagree (isolation: switching
   * back restores each session's remembered device/mode). A session WITHOUT
   * memory only adopts a local VIEW — it never rewrites the global host mode,
   * because that global mode may belong to a different session/page that is
   * actively in SSH mode (yanking it back to local is what made "edit too
   * much" save attempts fail with "path does not resolve on disk": the panel
   * still showed the remote root, but the host had already been flipped local).
   */
  async refresh(): Promise<void> {
    let host: WorkspaceState
    try {
      host = await this.api.getState()
    } catch {
      return // transient network hiccup: keep the previous snapshot
    }
    const sessionId = this.sessionId
    if (sessionId === undefined) {
      this.state = host
      this.emit()
      return
    }
    const desired = this.desiredFor(sessionId)
    if (desired === null) {
      // Never configured: show the local view only, leave the global host
      // mode untouched.
      this.state = { mode: 'local' }
      this.emit()
      return
    }
    const same = desired.mode === host.mode
      && desired.alias === host.alias
      && desired.remoteRoot === host.remoteRoot
    if (same) {
      this.state = host
      this.emit()
      return
    }
    // The host disagrees with this session's memory: correct the host (and
    // adopt the corrected state once it settles). This is what keeps a
    // never-configured session local even when another session is remote.
    try {
      if (desired.mode === 'remote' && desired.alias !== undefined) {
        this.state = await this.api.setModeRemote(desired.alias, desired.remoteRoot)
      } else {
        this.state = await this.api.setModeLocal()
      }
      if (this.sessionId === sessionId) saveSessionState(sessionId, this.state)
    } catch {
      // Correction failed: still show the DESIRED view rather than a global
      // remote state that belongs to another session.
      this.state = desired
    }
    this.emit()
  }

  start(): void {
    void this.refresh()
    this.timer = window.setInterval(() => void this.refresh(), POLL_MS)
  }

  stop(): void {
    if (this.timer !== undefined) {
      window.clearInterval(this.timer)
      this.timer = undefined
    }
  }

  /**
   * Bind the mode to one session. On switch, the remembered mode for the new
   * session is re-applied through the host API (isolation); a session with no
   * memory gets a local VIEW but is never used to correct the global host
   * mode (that mode may belong to another session/page in SSH mode).
   */
  setSession(sessionId: string | undefined): void {
    if (sessionId === this.sessionId) return
    if (this.sessionId !== undefined) {
      saveSessionState(this.sessionId, this.state)
    }
    this.sessionId = sessionId
    if (sessionId === undefined) return
    const desired = this.desiredFor(sessionId)
    if (desired === null) {
      // Never configured: show a local view only, leave the host mode alone.
      this.state = { mode: 'local' }
      this.emit()
      return
    }
    const current = this.state
    const same = desired.mode === current.mode
      && desired.alias === current.alias
      && desired.remoteRoot === current.remoteRoot
    if (same) return
    if (desired.mode === 'remote' && desired.alias !== undefined) {
      void this.setRemote(desired.alias, desired.remoteRoot)
    } else {
      void this.setLocal()
    }
  }

  /** The session this mode view is bound to ('' when none). */
  getSessionId(): string | undefined {
    return this.sessionId
  }

  async setLocal(): Promise<void> {
    this.state = await this.api.setModeLocal()
    if (this.sessionId !== undefined) saveSessionState(this.sessionId, this.state)
    this.emit()
  }

  async setRemote(alias: string, remoteRoot?: string): Promise<void> {
    this.state = await this.api.setModeRemote(alias, remoteRoot)
    if (this.sessionId !== undefined) saveSessionState(this.sessionId, this.state)
    this.emit()
  }
}
