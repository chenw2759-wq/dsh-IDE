/**
 * lineDiff: the Trae-style edit diff backing the red/green preview cards.
 * Line-ending style must never paint content lines as changed, and a pure
 * append after a trailing newline must not show phantom deletions.
 */
import { describe, expect, it } from 'vitest'
import { lineDiff } from '../src/client/store.ts'

describe('lineDiff', () => {
  it('a single middle-line change keeps surrounding lines as same', () => {
    const rows = lineDiff('x\na\ny\n', 'x\nb\ny\n')
    const same = rows.filter((r) => r.kind === 'same').map((r) => r.text)
    expect(same).toContain('x')
    expect(same).toContain('y')
    expect(rows.filter((r) => r.kind === 'del').map((r) => r.text)).toEqual(['a'])
    expect(rows.filter((r) => r.kind === 'add').map((r) => r.text)).toEqual(['b'])
  })

  it('appending a line after a trailing newline adds one line, deletes none', () => {
    const rows = lineDiff('a\nb\n', 'a\nb\nc\n')
    expect(rows.filter((r) => r.kind === 'del')).toHaveLength(0)
    expect(rows.filter((r) => r.kind === 'add').map((r) => r.text)).toEqual(['c'])
  })

  it('CRLF vs LF is not a content change', () => {
    const rows = lineDiff('a\r\nb\r\n', 'a\nb\nc\n')
    const del = rows.filter((r) => r.kind === 'del')
    expect(del).toHaveLength(0)
    const same = rows.filter((r) => r.kind === 'same').map((r) => r.text)
    expect(same).toContain('a')
    expect(same).toContain('b')
    expect(rows.filter((r) => r.kind === 'add').map((r) => r.text)).toEqual(['c'])
  })

  it('mixed CRLF/LF endings within one side do not fragment', () => {
    const rows = lineDiff('a\r\nb\nc\r\n', 'a\nb\nc\nd\n')
    expect(rows.filter((r) => r.kind === 'del')).toHaveLength(0)
    expect(rows.filter((r) => r.kind === 'add').map((r) => r.text)).toEqual(['d'])
  })

  it('empty new text renders all-deleted, empty old text all-added', () => {
    expect(lineDiff('a\nb\n', '').every((r) => r.kind === 'del')).toBe(true)
    expect(lineDiff('', 'a\nb\n').every((r) => r.kind === 'add')).toBe(true)
  })
})
