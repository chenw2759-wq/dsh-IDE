// @vitest-environment jsdom
/**
 * Per-session SSH isolation tests (panel side). Verifies the client contract
 * that keeps "some conversations SSH, some not" true for the PANEL:
 *   - each session remembers its own mode in localStorage;
 *   - switching sessions re-applies the remembered mode (remote for A, local
 *     for an unconfigured B) instead of leaking another session's mode;
 *   - refresh() treats the ACTIVE session's memory as authority and corrects a
 *     host that disagrees with it.
 *
 * The host-side fs/subprocess SEAM remains process-global (the model tool
 * call chain carries no session id) — that documented limit is asserted in
 * the switch.test.ts and is NOT what these tests cover.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { loadSessionState, saveSessionState } from '../src/client/session-memory.ts'
import { ModeState } from '../src/client/state.ts'
import type { WorkspaceState } from '../src/protocol.ts'

/** A WorkspaceApi double whose host mode we can steer per test. */
function makeApi(initial: WorkspaceState) {
  let host = initial
  return {
    host: () => host,
    getState: vi.fn(async () => host),
    setModeLocal: vi.fn(async () => { host = { mode: 'local' }; return host }),
    setModeRemote: vi.fn(async (alias: string, remoteRoot?: string) => {
      host = { mode: 'remote', alias, remoteRoot }
      return host
    }),
  }
}

beforeEach(() => {
  localStorage.clear()
})

describe('session-memory', () => {
  it('round-trips a remote state and rejects garbage', () => {
    saveSessionState('s-a', { mode: 'remote', alias: 'prod', remoteRoot: '/home/u' })
    expect(loadSessionState('s-a')).toEqual({ mode: 'remote', alias: 'prod', remoteRoot: '/home/u', remoteRootLabel: undefined })

    localStorage.setItem('ssh-session-state:bad', JSON.stringify({ mode: 'weird' }))
    expect(loadSessionState('bad')).toBeNull()

    localStorage.setItem('ssh-session-state:noalias', JSON.stringify({ mode: 'remote' }))
    expect(loadSessionState('noalias')).toBeNull()

    localStorage.setItem('ssh-session-state:notjson', '{')
    expect(loadSessionState('notjson')).toBeNull()
  })
})

describe('ModeState per-session isolation', () => {
  it('applies the remembered mode when switching to a remote session', async () => {
    saveSessionState('s-remote', { mode: 'remote', alias: 'prod', remoteRoot: '/home/u' })
    const api = makeApi({ mode: 'local' })
    const state = new ModeState(api)
    state.setSession('s-remote')
    await vi.waitFor(() => expect(api.setModeRemote).toHaveBeenCalledWith('prod', '/home/u'))
    expect(state.getSnapshot().mode).toBe('remote')
  })

  it('shows a local view for a never-configured session WITHOUT yanking the host out of another session\'s SSH mode', async () => {
    // Session A goes remote and remembers it; session B has no memory.
    saveSessionState('s-a', { mode: 'remote', alias: 'prod', remoteRoot: '/home/u' })
    const api = makeApi({ mode: 'local' })
    const state = new ModeState(api)
    state.setSession('s-a')
    await vi.waitFor(() => expect(state.getSnapshot().mode).toBe('remote'))
    // Switch to the unconfigured session B: it gets a local VIEW but must NOT
    // correct the global host (which belongs to session A) and must NOT write
    // a memory that would later fight A's SSH mode.
    state.setSession('s-b')
    expect(state.getSnapshot().mode).toBe('local')
    expect(api.setModeLocal).not.toHaveBeenCalled()
    expect(loadSessionState('s-b')).toBeNull()
  })

  it('switching back to the remote session restores its device', async () => {
    saveSessionState('s-a', { mode: 'remote', alias: 'prod', remoteRoot: '/home/u' })
    const api = makeApi({ mode: 'local' })
    const state = new ModeState(api)
    state.setSession('s-a')
    await vi.waitFor(() => expect(api.setModeRemote).toHaveBeenCalled())
    state.setSession('s-b') // no memory: local view only, host untouched
    expect(state.getSnapshot().mode).toBe('local')
    state.setSession('s-a') // back to remote
    await vi.waitFor(() => expect(api.setModeRemote).toHaveBeenCalledTimes(2))
    expect(state.getSnapshot().mode).toBe('remote')
  })

  it('refresh() corrects a host that disagrees with the active session memory', async () => {
    saveSessionState('s-local', { mode: 'local' })
    // Host is remote (leaked from another session) but THIS session remembers local.
    const api = makeApi({ mode: 'remote', alias: 'prod', remoteRoot: '/home/u' })
    const state = new ModeState(api)
    state.setSession('s-local')
    // setSession already corrects; reset spies and re-run refresh to assert the poll path.
    api.setModeLocal.mockClear()
    await state.refresh()
    expect(api.setModeLocal).toHaveBeenCalled()
    expect(state.getSnapshot().mode).toBe('local')
  })

  it('keeps the previous good view when the host fetch fails (transient)', async () => {
    const api = makeApi({ mode: 'local' })
    const state = new ModeState(api)
    // Prime a good view first, then make the next host fetch fail.
    await state.refresh()
    expect(state.getSnapshot().mode).toBe('local')
    api.getState.mockRejectedValueOnce(new Error('network'))
    await state.refresh()
    // Still local — no crash, no false remote adoption.
    expect(state.getSnapshot().mode).toBe('local')
  })
})
