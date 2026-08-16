/**
 * ColorButton + selection-keeping contract tests (P4.2 Word-style color).
 *
 * These verify the REASON the "can't set color AND bold/italic at the same
 * time" bug happened: the old native `<input type=color>` dialog stole focus
 * and collapsed the contenteditable selection, so a following execCommand
 * applied to nothing. The new ColorButton guarantees, per click:
 *   mousedown -> preventDefault + saveSelection (selection snapshot survives)
 *   click     -> exec(command, rememberedColor)
 * and the palette only ever changes the REMEMBERED color (one click to apply
 * afterwards), which is Word's exact font-color-button model.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { ColorButton } from '../src/client/preview/color-button'

let container: HTMLDivElement
let root: Root

function mount(el: React.ReactElement): void {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => {
    root.render(el)
  })
}

function fire(target: Element, type: string, init: MouseEventInit = {}): void {
  act(() => {
    target.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, ...init }))
  })
}

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  container?.remove()
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('ColorButton Word-style model', () => {
  it('renders an "A" glyph and a dropdown arrow', () => {
    const exec = vi.fn()
    const saveSelection = vi.fn()
    mount(<ColorButton command="foreColor" label="字色" exec={exec} saveSelection={saveSelection} />)
    expect(container.querySelector('button')?.textContent).toContain('A')
    // The arrow carries an svg chevron.
    const buttons = [...container.querySelectorAll('button')]
    expect(buttons.some((b) => b.innerHTML.includes('svg'))).toBe(true)
  })

  it('applies the REMEMBERED color on a single "A" click (default black)', () => {
    const exec = vi.fn()
    const saveSelection = vi.fn()
    mount(<ColorButton command="foreColor" label="字色" exec={exec} saveSelection={saveSelection} />)
    const glyph = container.querySelector('button') as HTMLButtonElement
    fire(glyph, 'mousedown')
    fire(glyph, 'click')
    expect(saveSelection).toHaveBeenCalledTimes(1) // selection snapshot before focus loss
    expect(exec).toHaveBeenCalledTimes(1)
    expect(exec).toHaveBeenCalledWith('foreColor', '#000000')
  })

  it('picking a palette swatch updates the remembered color and applies it', () => {
    const exec = vi.fn()
    const saveSelection = vi.fn()
    mount(<ColorButton command="foreColor" label="字色" exec={exec} saveSelection={saveSelection} />)
    // Open the palette.
    const arrow = [...container.querySelectorAll('button')].find((b) => b.innerHTML.includes('svg')) as HTMLButtonElement
    fire(arrow, 'click')
    const swatches = [...container.querySelectorAll('button')].filter((b) => b.getAttribute('aria-label') === '#ff0000')
    expect(swatches).toHaveLength(1)
    const red = swatches[0]
    fire(red, 'mousedown')
    fire(red, 'click')
    // The swatch pick APPLIES immediately (selection, if any) with the picked color.
    expect(exec).toHaveBeenCalledWith('foreColor', '#ff0000')
    // Palette closes.
    expect(container.querySelector('button[aria-label="#ff0000"]')).toBeNull()
    // Now the "A" button applies the REMEMBERED red — one click, no re-pick.
    const glyph = container.querySelector('button') as HTMLButtonElement
    fire(glyph, 'mousedown')
    fire(glyph, 'click')
    expect(exec).toHaveBeenLastCalledWith('foreColor', '#ff0000')
  })

  it('highlight (hiliteColor) defaults to yellow and is independent', () => {
    const exec = vi.fn()
    const saveSelection = vi.fn()
    mount(<ColorButton command="hiliteColor" label="底色" exec={exec} saveSelection={saveSelection} />)
    const glyph = container.querySelector('button') as HTMLButtonElement
    fire(glyph, 'mousedown')
    fire(glyph, 'click')
    expect(exec).toHaveBeenCalledWith('hiliteColor', '#ffff00')
  })
})

describe('selection is snapshotted on mousedown, before the click applies', () => {
  it('keeps a non-collapsed selection across mousedown+click on the glyph', () => {
    // Real editable + real selection (what the contenteditable surface owns).
    const editable = document.createElement('div')
    editable.contentEditable = 'true'
    editable.textContent = 'hello world'
    document.body.appendChild(editable)
    const textNode = editable.firstChild as Text
    const range = document.createRange()
    range.setStart(textNode, 0)
    range.setEnd(textNode, 5)
    const sel = window.getSelection()
    sel?.removeAllRanges()
    sel?.addRange(range)
    editable.focus()

    // saveSelection mirrors the editors' real implementation (cloneRange).
    let savedRange: Range | null = null
    const saveSelection = (): void => {
      const s = window.getSelection()
      if (s !== null && s.rangeCount > 0) savedRange = s.getRangeAt(0).cloneRange()
    }
    const exec = vi.fn()
    mount(<ColorButton command="foreColor" label="字色" exec={exec} saveSelection={saveSelection} />)

    const glyph = container.querySelector('button') as HTMLButtonElement
    fire(glyph, 'mousedown')
    expect(savedRange).not.toBeNull()
    expect(savedRange?.collapsed).toBe(false)
    expect(savedRange?.toString()).toBe('hello')
    fire(glyph, 'click')
    expect(exec).toHaveBeenCalledWith('foreColor', '#000000')
    // The saved range still spans "hello" (5 chars) — not collapsed.
    expect(savedRange?.toString()).toBe('hello')
  })
})
