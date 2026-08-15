import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { BackendError, LocalBackend, RemoteBackend, isInside, normalizeRel, relToAbs } from '../src/backend.ts'

describe('path utils', () => {
  it('normalizes rel paths and rejects ".."', () => {
    expect(normalizeRel('a//b/./c')).toBe('a/b/c')
    expect(normalizeRel('')).toBe('')
    expect(() => normalizeRel('../x')).toThrow(BackendError)
    expect(() => normalizeRel('a/../b')).toThrow(BackendError)
  })

  it('resolves rel against a root', () => {
    expect(relToAbs('/home/u', 'a/b')).toBe('/home/u/a/b')
    expect(relToAbs('/home/u', '')).toBe('/home/u')
    expect(relToAbs('/home/u/', 'x')).toBe('/home/u/x')
  })

  it('isInside gates prefixes', () => {
    expect(isInside('/home/u', '/home/u/a')).toBe(true)
    expect(isInside('/home/u', '/home/u')).toBe(true)
    expect(isInside('/home/u', '/home/u2')).toBe(false)
    expect(isInside('/home/u', '/home')).toBe(false)
  })
})

describe('LocalBackend', () => {
  let dir: string
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'ssh-ws-'))
  })
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  it('lists dirs first then files, skipping .git', async () => {
    await mkdir(join(dir, 'sub'))
    await mkdir(join(dir, '.git'))
    await writeFile(join(dir, 'a.txt'), 'hi')
    const backend = new LocalBackend()
    const listing = await backend.list(dir, '')
    expect(listing.entries.map((entry) => entry.name)).toEqual(['sub', 'a.txt'])
    expect(listing.entries[0]?.type).toBe('dir')
  })

  it('reads text and rejects binary files', async () => {
    await writeFile(join(dir, 't.txt'), 'hello')
    const backend = new LocalBackend()
    const file = await backend.read(dir, 't.txt')
    expect(file.content).toBe('hello')
    await writeFile(join(dir, 'b.bin'), Buffer.from([0, 1, 2, 3]))
    await expect(backend.read(dir, 'b.bin')).rejects.toMatchObject({ code: 'binary' })
  })

  it('write succeeds with a fresh mtime and flags conflicts', async () => {
    await writeFile(join(dir, 'w.txt'), 'one')
    const backend = new LocalBackend()
    const first = await backend.read(dir, 'w.txt')
    await backend.write(dir, 'w.txt', 'two', first.mtime)
    const second = await backend.read(dir, 'w.txt')
    expect(second.content).toBe('two')
    // Replaying the stale mtime must be rejected.
    await expect(backend.write(dir, 'w.txt', 'three', first.mtime)).rejects.toMatchObject({ code: 'conflict' })
  })

  it('search skips node_modules and .git', async () => {
    await writeFile(join(dir, 'config.json'), '{}')
    await mkdir(join(dir, 'node_modules'), { recursive: true })
    await writeFile(join(dir, 'node_modules', 'config-dep.js'), 'x')
    await mkdir(join(dir, '.git'), { recursive: true })
    await writeFile(join(dir, '.git', 'config'), 'x')
    const backend = new LocalBackend()
    const view = await backend.search(dir, 'config')
    expect(view.hits.map((hit) => hit.rel)).toEqual(['config.json'])
  })

  it('rejects paths escaping the root', async () => {
    const backend = new LocalBackend()
    await expect(backend.list(dir, '..')).rejects.toMatchObject({ code: 'outside-root' })
    await expect(backend.read(dir, '../secret')).rejects.toMatchObject({ code: 'outside-root' })
  })

  it('writes into new subdirectories (parents are created)', async () => {
    const backend = new LocalBackend()
    await backend.write(dir, 'deep/nested/file.txt', 'x')
    const file = await backend.read(dir, 'deep/nested/file.txt')
    expect(file.content).toBe('x')
  })
})

describe('RemoteBackend gating', () => {
  const fakeEngine = {} as never

  it('throws when not in remote mode', () => {
    const backend = new RemoteBackend(fakeEngine, () => ({ mode: 'local' }))
    expect(() => backend.assertRoot('/x')).toThrow(BackendError)
  })

  it('throws on root mismatch and accepts the exact root', () => {
    const backend = new RemoteBackend(fakeEngine, () => ({ mode: 'remote', alias: 'a', remoteRoot: '/home/u' }))
    expect(() => backend.assertRoot('/etc')).toThrow(BackendError)
    expect(() => backend.assertRoot('/home/u')).not.toThrow()
  })
})
