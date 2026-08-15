import { describe, expect, it } from 'vitest'
import { RemoteModeStore } from '../src/store.ts'

describe('RemoteModeStore', () => {
  it('starts in local mode', () => {
    expect(new RemoteModeStore().getSnapshot()).toEqual({ mode: 'local' })
  })

  it('notifies subscribers on set and stops after dispose', () => {
    const store = new RemoteModeStore()
    let calls = 0
    const dispose = store.subscribe(() => { calls += 1 })
    store.set({ mode: 'remote', alias: 'prod', remoteRoot: '/home/u' })
    expect(calls).toBe(1)
    expect(store.getSnapshot()).toEqual({ mode: 'remote', alias: 'prod', remoteRoot: '/home/u' })
    dispose()
    store.set({ mode: 'local' })
    expect(calls).toBe(1)
  })

  it('keeps the last remote target when returning to local mode', () => {
    const store = new RemoteModeStore()
    store.set({ mode: 'remote', alias: 'prod', remoteRoot: '/home/u', remoteRootLabel: '~' })
    store.set({ mode: 'local', alias: 'prod', remoteRoot: '/home/u', remoteRootLabel: '~' })
    expect(store.getSnapshot().alias).toBe('prod')
    expect(store.getSnapshot().mode).toBe('local')
  })
})
