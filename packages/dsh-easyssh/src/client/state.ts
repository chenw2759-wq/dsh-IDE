/**
 * Client-side mode state: mirrors the host's /state endpoint with a light
 * poll (3s) plus immediate refresh after every local action. The snapshot
 * object is replaced only on successful fetches, so React's
 * useSyncExternalStore sees stable references between polls.
 */
import type { WorkspaceState } from '../protocol.ts'
import type { WorkspaceApi } from './api.ts'

const POLL_MS = 3_000

export class ModeState {
  private state: WorkspaceState = { mode: 'local' }
  private readonly listeners = new Set<() => void>()
  private timer: number | undefined

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

  /** Re-fetch the host state (no-op on network failure — keep the last view). */
  async refresh(): Promise<void> {
    try {
      this.state = await this.api.getState()
      this.emit()
    } catch {
      // transient network hiccup: keep the previous snapshot
    }
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

  async setLocal(): Promise<void> {
    this.state = await this.api.setModeLocal()
    this.emit()
  }

  async setRemote(alias: string, remoteRoot?: string): Promise<void> {
    this.state = await this.api.setModeRemote(alias, remoteRoot)
    this.emit()
  }
}
