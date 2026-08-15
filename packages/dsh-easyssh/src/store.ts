/**
 * The plugin's mode store: a process-local singleton deciding whether the
 * workspace surfaces (left panel, remote_* tools) point at this machine or at
 * an SSH host. Pure state — no cordis dependency, unit-testable.
 */
import type { WorkspaceState } from './protocol.ts'

/** The default remote root: the login user's home, resolved on connect. */
export const DEFAULT_REMOTE_ROOT = '~'

export class RemoteModeStore {
  private state: WorkspaceState = { mode: 'local' }
  private readonly listeners = new Set<() => void>()

  /** The current state (routes/tools read this per request). */
  getSnapshot(): WorkspaceState {
    return this.state
  }

  /** Subscribe to state changes; returns the disposer. */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /** Replace the whole state (routes are the only writers). */
  set(state: WorkspaceState): void {
    this.state = state
    for (const listener of [...this.listeners]) listener()
  }
}
