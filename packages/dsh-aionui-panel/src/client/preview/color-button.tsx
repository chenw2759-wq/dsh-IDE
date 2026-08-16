/**
 * Word-style color button (font color / highlight) shared by every editor
 * (markdown visual, HTML visual, office). The control has two parts:
 * - the main "A" glyph (with a bar showing the current color): clicking it
 *   APPLIES the remembered color to the current selection — one click;
 * - a small "▾" arrow: opens a color palette popover; picking a swatch sets
 *   the remembered color (and applies it to the selection if any).
 *
 * This is exactly Word's font-color button: choose a color once, then click
 * the "A" to color any selected text. It replaces the two-step native
 * `<input type=color>` dialog, which is why color "required too many clicks".
 *
 * Selection safety: the popover and buttons use `onMouseDown` with
 * `saveSelection` + `preventDefault` so the editable keeps its selection while
 * you pick a color — the root cause of "can't set color AND bold/italic at
 * the same time" (the native dialog collapsed the selection).
 * @module dsh-aionui-panel/client/preview/color-button
 */

import { useEffect, useRef, useState } from 'react'
import type { JSX } from 'react'
import previewCss from '../styles/preview.module.css'

/** Text-color palette (Word's standard colors, condensed). */
export const TEXT_COLORS = [
  '#000000', '#7f7f7f', '#ffffff',
  '#ff0000', '#ff7f00', '#ffff00', '#00ff00', '#00b0f0', '#0070c0', '#002060', '#7030a0',
  '#7f1d1d', '#a16207', '#15803d', '#0e7490', '#1d4ed8', '#be185d',
]

/** Highlight (background) palette. */
export const HIGHLIGHT_COLORS = [
  '#ffff00', '#00ff00', '#00ffff', '#ff00ff', '#0000ff', '#ff0000',
  '#fff176', '#c5e1a5', '#b2ebf2', '#f8bbd0', '#ffcdd2', '#bbdefb', '#ffe0b2', '#ffffff', '#000000',
]

/**
 * One Word-style color control.
 * @param command - `foreColor` (text color) or `hiliteColor` (background).
 * @param label - tooltip text (字色 / 底色).
 * @param exec - applies the command to the (restored) selection + marks dirty.
 * @param saveSelection - snapshots the editable's selection (called on mousedown).
 */
export function ColorButton({ command, label, exec, saveSelection, active = false }: {
  command: 'foreColor' | 'hiliteColor'
  label: string
  exec: (cmd: string, value?: string) => void
  saveSelection: () => void
  /** True while the current selection carries this color (lights the button). */
  active?: boolean
}): JSX.Element {
  const [color, setColor] = useState(command === 'foreColor' ? '#000000' : '#ffff00')
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLSpanElement>(null)
  const palette = command === 'foreColor' ? TEXT_COLORS : HIGHLIGHT_COLORS

  // Close the popover when clicking anywhere outside it.
  useEffect(() => {
    if (!open) return
    const onDoc = (event: PointerEvent): void => {
      const el = wrapRef.current
      if (el !== null && event.target instanceof Node && el.contains(event.target)) return
      setOpen(false)
    }
    document.addEventListener('pointerdown', onDoc)
    return () => document.removeEventListener('pointerdown', onDoc)
  }, [open])

  const pick = (value: string): void => {
    setColor(value)
    setOpen(false)
    // Applying a picked color is the same single execCommand path; if there is
    // no selection it just sets the future typing color (Word-like).
    exec(command, value)
  }

  return (
    <span ref={wrapRef} className={previewCss.colorButtonWrap} title={label}>
      {/* The "A" glyph: applies the REMEMBERED color to the selection. */}
      <button
        type="button"
        className={`${previewCss.colorButtonGlyph}${active ? ` ${previewCss.colorButtonGlyphActive}` : ''}`}
        aria-label={label}
        onMouseDown={(e) => { e.preventDefault(); saveSelection() }}
        onClick={() => exec(command, color)}
      >
        <span className={previewCss.colorButtonLetter}>A</span>
        <span className={previewCss.colorButtonBar} style={{ background: color }} />
      </button>
      {/* The dropdown arrow: opens the palette. */}
      <button
        type="button"
        className={previewCss.colorButtonArrow}
        aria-label={`${label} ${open ? 'close' : 'open'}`}
        onMouseDown={(e) => { e.preventDefault(); saveSelection() }}
        onClick={() => setOpen((v) => !v)}
      >
        <svg width="7" height="5" viewBox="0 0 7 5" aria-hidden="true"><path d="M0 0l3.5 5L7 0z" fill="currentColor" /></svg>
      </button>
      {open && (
        <span className={previewCss.colorPalettePop} role="listbox" aria-label={label}>
          {palette.map((c) => (
            <button
              key={c}
              type="button"
              className={previewCss.colorPaletteSwatch}
              style={{ background: c }}
              aria-label={c}
              onMouseDown={(e) => { e.preventDefault(); saveSelection() }}
              onClick={() => pick(c)}
            />
          ))}
        </span>
      )}
    </span>
  )
}
