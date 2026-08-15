/**
 * Visual editor (P4.2): PowerPoint-style editing of a compiled HTML/Markdown
 * result. The rendered page is shown on a canvas; every top-level block
 * becomes a draggable text box (move / resize / re-edit text / change color /
 * font size / background). Boxes can be added and deleted. Saving
 * serializes the boxes back into a plain HTML document (each box = one block,
 * positioned with inline styles so the layout survives a re-open).
 *
 * This is a simplified "text box per position" model — the rendered HTML is
 * REPLACED by the box document on save, so it works best on simple compiled
 * pages (slide-like decks, single-column articles). Complex interleaved
 * layouts are flattened into stacked boxes; that is a documented limit.
 * @module dsh-aionui-panel/client/preview/visual-editor
 */

import { useEffect, useRef, useState } from 'react'
import type { JSX } from 'react'
import { t } from '../locales.ts'
import previewCss from '../styles/preview.module.css'

/** One text box on the canvas. */
interface Box {
  id: string
  x: number
  y: number
  w: number
  h: number
  text: string
  color: string
  bg: string
  fontSize: number
  bold: boolean
}

const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32, 40, 48]
const COLORS = ['#1f2329', '#7f1d1d', '#b91c1c', '#c2410c', '#a16207', '#15803d', '#0e7490', '#1d4ed8', '#4338ca', '#7c3aed', '#be185d', '#ffffff']
const BGS = ['transparent', '#fff7ed', '#ffedd5', '#fef3c7', '#ecfccb', '#dcfce7', '#e0f2fe', '#dbeafe', '#ede9fe', '#fce7f3', '#ffe4e6', '#1f2329']

let boxSeq = 0
const nextId = (): string => `box-${++boxSeq}-${Date.now().toString(36)}`

/** Split a compiled HTML document into initial text boxes (top-level blocks). */
export function htmlToBoxes(html: string): Box[] {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const blocks = Array.from(doc.body.children).filter((el) => (el.textContent ?? '').trim() !== '')
  if (blocks.length === 0) {
    const text = (doc.body.textContent ?? '').trim()
    if (text !== '') {
      return [{
        id: nextId(), x: 40, y: 40, w: 600, h: 80, text,
        color: '#1f2329', bg: 'transparent', fontSize: 18, bold: false,
      }]
    }
    return []
  }
  return blocks.map((el, index) => {
    const text = (el.textContent ?? '').trim()
    const tag = el.tagName.toLowerCase()
    const size = tag === 'h1' ? 32 : tag === 'h2' ? 26 : tag === 'h3' ? 22 : el.tagName.toLowerCase() === 'li' ? 16 : 16
    return {
      id: nextId(),
      x: 40,
      y: 40 + index * 90,
      w: 600,
      h: Math.max(60, text.length > 40 ? 80 : 60),
      text,
      color: '#1f2329',
      bg: 'transparent',
      fontSize: size,
      bold: tag === 'h1' || tag === 'h2' || tag === 'h3' || tag === 'strong',
    }
  })
}

/** Serialize the boxes back into a plain HTML document. */
export function boxesToHtml(boxes: Box[]): string {
  const blocks = boxes.map((box) => {
    const style = [
      `position:relative`,
      `margin:0 auto 12px`,
      `width:${Math.round(box.w)}px`,
      `min-height:${Math.round(box.h)}px`,
      `color:${box.color}`,
      `font-size:${box.fontSize}px`,
      box.bold ? 'font-weight:700' : '',
      box.bg !== 'transparent' ? `background:${box.bg}` : '',
      `padding:10px 12px`,
      `border-radius:8px`,
      `box-sizing:border-box`,
    ].filter(Boolean).join(';')
    return `<div style="${style}">${escapeVisual(box.text).replace(/\n/g, '<br/>')}</div>`
  }).join('\n')
  return blocks
}

function escapeVisual(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** The visual editor canvas. */
export function VisualEditor({ html, onEdited, onSave, dirty }: {
  html: string
  onEdited: (html: string) => void
  onSave: () => void
  dirty: boolean
}): JSX.Element {
  const [boxes, setBoxes] = useState<Box[]>(() => htmlToBoxes(html))
  const [selected, setSelected] = useState<string | null>(null)
  const [dragging, setDragging] = useState<{ id: string; mode: 'move' | 'resize'; startX: number; startY: number; orig: Box } | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const initialized = useRef(false)

  // Seed once (the caller may re-render with the same html).
  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    setBoxes(htmlToBoxes(html))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const box = (id: string): Box | undefined => boxes.find((b) => b.id === id)
  const selectedBox = selected !== null ? box(selected) : undefined

  const update = (id: string, patch: Partial<Box>): void => {
    setBoxes((prev) => {
      const next = prev.map((b) => (b.id === id ? { ...b, ...patch } : b))
      onEdited(boxesToHtml(next))
      return next
    })
  }

  const startDrag = (id: string, mode: 'move' | 'resize', event: React.PointerEvent): void => {
    event.preventDefault()
    event.stopPropagation()
    const b = box(id)
    if (b === undefined) return
    setSelected(id)
    setDragging({ id, mode, startX: event.clientX, startY: event.clientY, orig: { ...b } })
  }

  useEffect(() => {
    if (dragging === null) return
    const onMove = (event: PointerEvent): void => {
      const dx = event.clientX - dragging.startX
      const dy = event.clientY - dragging.startY
      const orig = dragging.orig
      if (dragging.mode === 'move') {
        update(dragging.id, { x: Math.max(0, orig.x + dx), y: Math.max(0, orig.y + dy) })
      } else {
        update(dragging.id, { w: Math.max(80, orig.w + dx), h: Math.max(40, orig.h + dy) })
      }
    }
    const onUp = (): void => setDragging(null)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging])

  const addBox = (): void => {
    const id = nextId()
    const n = boxes.length
    setBoxes((prev) => {
      const next = [...prev, {
        id, x: 40, y: 40 + (n % 8) * 90, w: 400, h: 70, text: t('visual.newBox'),
        color: '#1f2329', bg: 'transparent', fontSize: 16, bold: false,
      }]
      onEdited(boxesToHtml(next))
      return next
    })
    setSelected(id)
  }

  const deleteBox = (): void => {
    if (selected === null) return
    setBoxes((prev) => {
      const next = prev.filter((b) => b.id !== selected)
      onEdited(boxesToHtml(next))
      return next
    })
    setSelected(null)
  }

  return (
    <div className={previewCss.visualWrap}>
      <div className={previewCss.visualToolbar}>
        <button type="button" className={previewCss.visualBtn} onClick={addBox}>{t('visual.addBox')}</button>
        <button type="button" className={previewCss.visualBtn} disabled={selected === null} onClick={deleteBox}>{t('visual.deleteBox')}</button>
        <span className={previewCss.visualSpacer} />
        {selectedBox !== undefined && selected !== null && (
          <>
            <input
              type="color"
              className={previewCss.visualColor}
              title={t('settings.tool.color')}
              value={selectedBox.color.startsWith('#') ? selectedBox.color : '#1f2329'}
              onChange={(event) => update(selected, { color: event.target.value })}
            />
            <select
              className={previewCss.visualTool}
              title={t('settings.tool.highlight')}
              value={selectedBox.bg}
              onChange={(event) => update(selected, { bg: event.target.value })}
            >
              {BGS.map((b) => <option key={b} value={b}>{b === 'transparent' ? t('visual.bgNone') : b}</option>)}
            </select>
            <select
              className={previewCss.visualTool}
              title={t('settings.tool.fontSize')}
              value={String(selectedBox.fontSize)}
              onChange={(event) => update(selected, { fontSize: Number(event.target.value) })}
            >
              {FONT_SIZES.map((s) => <option key={s} value={String(s)}>{s}px</option>)}
            </select>
            <button
              type="button"
              className={`${previewCss.visualBtn}${selectedBox.bold ? ` ${previewCss.visualBtnActive}` : ''}`}
              title={t('settings.tool.boldItalic')}
              onClick={() => update(selected, { bold: !selectedBox.bold })}
            >
              <strong>B</strong>
            </button>
          </>
        )}
        <button type="button" className={`${previewCss.visualBtn} ${previewCss.visualSave}`} disabled={!dirty} onClick={onSave}>
          {t('preview.save')}
        </button>
      </div>
      <div ref={canvasRef} className={previewCss.visualCanvas} data-aionui-visual-canvas="">
        {boxes.map((b) => (
          <div
            key={b.id}
            data-aionui-visual-box={b.id}
            className={`${previewCss.visualBox}${selected === b.id ? ` ${previewCss.visualBoxSelected}` : ''}`}
            style={{
              left: b.x,
              top: b.y,
              width: b.w,
              height: b.h,
              color: b.color,
              background: b.bg,
              fontSize: b.fontSize,
              fontWeight: b.bold ? 700 : 400,
            }}
            onPointerDown={(event) => startDrag(b.id, 'move', event)}
            onClick={() => setSelected(b.id)}
          >
            <textarea
              className={previewCss.visualText}
              value={b.text}
              spellCheck={false}
              onPointerDown={(event) => event.stopPropagation()}
              onChange={(event) => update(b.id, { text: event.target.value })}
            />
            <span
              className={previewCss.visualResize}
              onPointerDown={(event) => startDrag(b.id, 'resize', event)}
              title={t('visual.resize')}
            />
          </div>
        ))}
        {boxes.length === 0 && (
          <div className={previewCss.visualEmpty}>{t('visual.empty')}</div>
        )}
      </div>
    </div>
  )
}
