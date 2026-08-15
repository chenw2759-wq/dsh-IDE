/**
 * Workspace-gate tests: the canonical membership function (isPathInside) —
 * the security boundary every fs/git path check relies on. Table-driven so a
 * sibling-prefix or off-by-one regression is caught immediately.
 *
 * Note: `..` collapse is the caller's job (join() happens before the check in
 * fs-service.resolveInsideRoot / git-service.pathsInside); isPathInside is a
 * pure prefix check on already-joined paths.
 */
import { describe, expect, it } from 'vitest'
import { isPathInside } from '../src/host/gate.ts'

describe('isPathInside', () => {
  it('accepts equality (with and without trailing slash)', () => {
    expect(isPathInside('/w', '/w')).toBe(true)
    expect(isPathInside('/w', '/w/')).toBe(true)
  })

  it('accepts descendants', () => {
    expect(isPathInside('/w', '/w/a')).toBe(true)
    expect(isPathInside('/w', '/w/a/b/c.txt')).toBe(true)
    expect(isPathInside('/w/a', '/w/a/b')).toBe(true)
  })

  it('rejects siblings and sibling-prefix paths', () => {
    expect(isPathInside('/w', '/w2')).toBe(false)
    expect(isPathInside('/w', '/w2/a')).toBe(false)
    expect(isPathInside('/w/a', '/w/a2')).toBe(false)
    expect(isPathInside('/w/a', '/w/a2/b')).toBe(false)
    expect(isPathInside('/w', '/w.txt')).toBe(false)
  })

  it('rejects parent escapes', () => {
    expect(isPathInside('/w', '/')).toBe(false)
    expect(isPathInside('/w', '/etc')).toBe(false)
    expect(isPathInside('/w/a', '/w')).toBe(false)
  })

  it('rejects empty roots and empty children', () => {
    expect(isPathInside('/w', '')).toBe(false)
    expect(isPathInside('', '/w')).toBe(false)
    expect(isPathInside('', '')).toBe(false)
  })
})
