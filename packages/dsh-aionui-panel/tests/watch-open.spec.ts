/**
 * shouldAutoOpen: the per-directory watch marks decide which external edits
 * auto-open. An unlit dot means "not watched" — only EXPLICIT marks open.
 */
import { describe, expect, it } from 'vitest'
import { shouldAutoOpen } from '../src/client/store.ts'

describe('shouldAutoOpen', () => {
  it('never auto-opens unmarked paths (no default first level)', () => {
    expect(shouldAutoOpen('a.txt', {})).toBe(false)
    expect(shouldAutoOpen('src/a.ts', {})).toBe(false)
    expect(shouldAutoOpen('src/deep/b.ts', {})).toBe(false)
  })

  it('root shallow watches files directly under the root only', () => {
    const watch = { '': 'shallow' as const }
    expect(shouldAutoOpen('a.txt', watch)).toBe(true)
    expect(shouldAutoOpen('src/a.ts', watch)).toBe(false)
  })

  it('root deep watches everything', () => {
    const watch = { '': 'deep' as const }
    expect(shouldAutoOpen('a.txt', watch)).toBe(true)
    expect(shouldAutoOpen('src/a.ts', watch)).toBe(true)
    expect(shouldAutoOpen('src/deep/b.ts', watch)).toBe(true)
  })

  it('shallow on a directory watches only its direct children', () => {
    const watch = { src: 'shallow' as const }
    expect(shouldAutoOpen('src/a.ts', watch)).toBe(true)
    expect(shouldAutoOpen('src/deep/b.ts', watch)).toBe(false)
    // an ancestor shallow does not reach this file
    expect(shouldAutoOpen('other/a.txt', watch)).toBe(false)
  })

  it('deep on a directory watches its whole subtree', () => {
    const watch = { src: 'deep' as const }
    expect(shouldAutoOpen('src/a.ts', watch)).toBe(true)
    expect(shouldAutoOpen('src/deep/b.ts', watch)).toBe(true)
    expect(shouldAutoOpen('other/a.txt', watch)).toBe(false)
  })

  it('shallow on the direct parent reaches the file', () => {
    const watch = { 'src/deep': 'shallow' as const }
    expect(shouldAutoOpen('src/deep/b.ts', watch)).toBe(true)
    expect(shouldAutoOpen('src/deep/even/c.ts', watch)).toBe(false)
  })

  it('deep on a nested ancestor wins for deeper paths', () => {
    const watch = { 'src': 'shallow' as const, 'src/deep': 'deep' as const }
    expect(shouldAutoOpen('src/a.ts', watch)).toBe(true)
    expect(shouldAutoOpen('src/deep/even/c.ts', watch)).toBe(true)
  })
})
