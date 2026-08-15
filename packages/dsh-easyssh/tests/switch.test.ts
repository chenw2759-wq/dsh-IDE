import { describe, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import type { FileSystem } from '@deepseek-ai/dsh-fs'
import type { SubprocessHandle, SubprocessRuntime } from '@deepseek-ai/dsh-subprocess'
import type { WorkspaceState } from '../src/protocol.ts'
import { SshFileSystem } from '../src/remote/remote-fs.ts'
import { SwitchFileSystem } from '../src/switch/switch-fs.ts'
import { SwitchSubprocessRuntime } from '../src/switch/switch-subprocess.ts'

function remoteState(): WorkspaceState {
  return { mode: 'remote', alias: 'prod', remoteRoot: '/home/u', remoteRootLabel: '~' }
}

function localState(): WorkspaceState {
  return { mode: 'local', alias: 'prod', remoteRoot: '/home/u', remoteRootLabel: '~' }
}

describe('SwitchFileSystem mode routing', () => {
  it('delegates reads to the local backend in local mode and the remote one in remote mode', async () => {
    const localResolve = vi.fn(async () => ({ targetKey: 'local', displayPath: '/local' }))
    const remoteResolve = vi.fn(async () => ({ targetKey: 'remote', displayPath: '/home/u/x' }))
    const local = { resolve: localResolve } as unknown as FileSystem
    const remote = { resolve: remoteResolve } as unknown as SshFileSystem
    const facade = new SwitchFileSystem(new Context(), {
      local,
      remote,
      getState: () => localState(),
    })

    await facade.resolve('x')
    expect(localResolve).toHaveBeenCalledTimes(1)
    expect(remoteResolve).not.toHaveBeenCalled()

    const facade2 = new SwitchFileSystem(new Context(), {
      local,
      remote,
      getState: () => remoteState(),
    })
    await facade2.resolve('x')
    expect(remoteResolve).toHaveBeenCalledTimes(1)
  })

  it('reports the local sandbox default in local mode and none in remote mode', () => {
    const local = { sandboxMode: 'workspace-write' } as unknown as FileSystem
    const remote = {} as unknown as SshFileSystem
    const localFacade = new SwitchFileSystem(new Context(), { local, remote, getState: () => localState() })
    expect(localFacade.sandboxMode).toBe('workspace-write')
    const remoteFacade = new SwitchFileSystem(new Context(), { local, remote, getState: () => remoteState() })
    expect(remoteFacade.sandboxMode).toBeUndefined()
  })
})

describe('SwitchSubprocessRuntime mode routing', () => {
  it('routes spawn by mode', () => {
    const localSpawn = vi.fn(() => ({ pid: 1 }) as unknown as SubprocessHandle)
    const remoteSpawn = vi.fn(() => ({ pid: -1 }) as unknown as SubprocessHandle)
    const local = { spawn: localSpawn } as unknown as SubprocessRuntime
    const remote = { spawn: remoteSpawn } as unknown as SubprocessRuntime

    const localSwitch = new SwitchSubprocessRuntime(new Context(), {
      local,
      remote,
      getState: () => localState(),
    })
    localSwitch.spawn({ argv: ['true'], stdio: { stdin: 'ignore', stdout: 'ignore', stderr: 'ignore' }, graceMs: 1000 })
    expect(localSpawn).toHaveBeenCalledTimes(1)

    const remoteSwitch = new SwitchSubprocessRuntime(new Context(), {
      local,
      remote,
      getState: () => remoteState(),
    })
    remoteSwitch.spawn({ argv: ['true'], stdio: { stdin: 'ignore', stdout: 'ignore', stderr: 'ignore' }, graceMs: 1000 })
    expect(remoteSpawn).toHaveBeenCalledTimes(1)
  })
})

describe('SshFileSystem cwd mapping', () => {
  it('honors POSIX-absolute cwds and falls back to the remote root otherwise', () => {
    const engine = {} as never
    const fs = new SshFileSystem(new Context(), engine, () => remoteState())
    expect(fs.resolveRemoteCwd('/srv/app')).toBe('/srv/app')
    // A local Windows cwd (the model's session cwd) must not leak through.
    expect(fs.resolveRemoteCwd('M:\\dsh')).toBe('/home/u')
    expect(fs.resolveRemoteCwd(undefined)).toBe('/home/u')
  })

  it('throws when not in remote mode', () => {
    const engine = {} as never
    const fs = new SshFileSystem(new Context(), engine, () => localState())
    expect(() => fs.resolveRemoteCwd(undefined)).toThrow(/not in remote mode/)
  })
})
