/**
 * Visual editor (P4.2): PowerPoint-style editing of a compiled HTML/Markdown
 * result. The ORIGINAL rendered page stays as the canvas background (never
 * replaced); each content block becomes a draggable/resizable text box that
 * floats OVER the background, exactly like a PPT text box. Boxes can be
 * moved, resized (grab the LEFT edge), re-edited inline, re-colored, resized
 * in font size, toggled bold, and background-tinted; boxes can be added and
 * deleted.
 *
 * Editing is fully local until "Save": every keystroke updates React state
 * only — the parent store is written ONCE on save. That is what keeps a large
 * compiled page from crashing in a re-render loop. The save callback receives
 * the edited boxes; the caller serializes them (HTML keeps them as a floating
 * layer over the original markup; Markdown merges the text back into source).
 * @module dsh-aionui-panel/client/preview/visual-editor
 */

import { useLayoutEffect, useEffect, useRef, useState } from 'react'
import type { JSX } from 'react'
import { t } from '../locales.ts'
import previewCss from '../styles/preview.module.css'

/** One text box on the canvas. */
export interface VisualBox {
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
/** Special value: the box is drawn transparent so the original block text shows
 *  through only if the user set it transparent — but by default an in-place box
 *  uses the canvas surface color so it covers the block it replaced (no
 *  double-ghosting). `canvas` maps to the surface token at render time. */
const CANVAS_BG = 'var(--aion-bg-1)'
const BGS = [CANVAS_BG, 'transparent', '#fff7ed', '#ffedd5', '#fef3c7', '#ecfccb', '#dcfce7', '#e0f2fe', '#dbeafe', '#ede9fe', '#fce7f3', '#ffe4e6', '#1f2329']

let boxSeq = 0
const nextId = (): string => `box-${++boxSeq}-${Date.now().toString(36)}`

/**
 * Initial text boxes: extract the compiled page's top-level blocks AND their
 * visual positions from the ORIGINAL rendered backdrop. Each box starts
 * exactly over its source block (same rect), so editing is in-place — the
 * text sits where it rendered, not stacked in an arbitrary grid.
 */
export function htmlToBoxes(html: string): VisualBox[] {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const blocks = Array.from(doc.body.children).filter((el) => (el.textContent ?? '').trim() !== '')
  if (blocks.length === 0) {
    const text = (doc.body.textContent ?? '').trim()
    if (text !== '') {
      return [{
        id: nextId(), x: 24, y: 24, w: 640, h: 80, text,
        color: '#1f2329', bg: CANVAS_BG, fontSize: 18, bold: false,
      }]
    }
    return []
  }
  return blocks.map((el) => {
    const text = (el.textContent ?? '').trim()
    const tag = el.tagName.toLowerCase()
    const size = tag === 'h1' ? 32 : tag === 'h2' ? 26 : tag === 'h3' ? 22 : 16
    return {
      id: nextId(),
      // Placeholders; the real x/y/w/h are measured from the rendered
      // backdrop in `measureBoxPositions` after the first paint.
      x: 0,
      y: 0,
      w: 640,
      h: 64,
      text,
      color: '#1f2329',
      bg: CANVAS_BG,
      fontSize: size,
      bold: tag === 'h1' || tag === 'h2' || tag === 'h3' || tag === 'strong',
    }
  })
}

/** Serialize the boxes into a floating layer over the original markup. */
export function boxesToLayer(boxes: VisualBox[]): string {
  return boxes.map((box) => {
    const bg = serializeBg(box.bg)
    const style = [
      `position:absolute`,
      `left:${Math.round(box.x)}px`,
      `top:${Math.round(box.y)}px`,
      `width:${Math.round(box.w)}px`,
      `min-height:${Math.round(box.h)}px`,
      `color:${box.color}`,
      `font-size:${box.fontSize}px`,
      box.bold ? 'font-weight:700' : 'font-weight:400',
      bg !== '' ? `background:${bg}` : '',
      `padding:8px 10px`,
      `border-radius:8px`,
      `box-sizing:border-box`,
      `white-space:pre-wrap`,
      `word-break:break-word`,
    ].filter(Boolean).join(';')
    return `<div style="${style}">${escapeVisual(box.text)}</div>`
  }).join('')
}

/** Resolve the canvas-surface token to a concrete color for saved documents. */
function serializeBg(bg: string): string {
  if (bg === CANVAS_BG) return '#f7f8fa'
  return bg === 'transparent' ? '' : bg
}

/** Wrap the original markup + the floating box layer into a full document. */
export function boxesWrapHtml(original: string, boxes: VisualBox[]): string {
  return `<div style="position:relative;min-height:100%">` +
    `<div style="position:relative">${original}</div>` +
    `<div style="position:absolute;inset:0;pointer-events:none">` +
    boxes.map((box) => {
      const bg = serializeBg(box.bg)
      const style = [
        `position:absolute`,
        `left:${Math.round(box.x)}px`,
        `top:${Math.round(box.y)}px`,
        `width:${Math.round(box.w)}px`,
        `min-height:${Math.round(box.h)}px`,
        `color:${box.color}`,
        `font-size:${box.fontSize}px`,
        box.bold ? 'font-weight:700' : 'font-weight:400',
        bg !== '' ? `background:${bg}` : '',
        `padding:8px 10px`,
        `border-radius:8px`,
        `box-sizing:border-box`,
        `white-space:pre-wrap`,
        `word-break:break-word`,
      ].filter(Boolean).join(';')
      return `<div style="${style}">${escapeVisual(box.text)}</div>`
    }).join('') +
    `</div></div>`
}

/** Serialize the boxes back into a plain Markdown document (one paragraph per
 *  box; bold survives as **text**, other styles are markdown-inexpressible). */
export function boxesToMarkdown(boxes: VisualBox[]): string {
  return boxes.map((box) => {
    const text = box.text.trim()
    if (text === '') return ''
    const body = box.bold ? `**${text}**` : text
    return box.fontSize >= 26 ? `# ${body}` : box.fontSize >= 20 ? `## ${body}` : body
  }).filter((line) => line !== '').join('\n\n')
}

function escapeVisual(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** Mark every top-level block with data-vblock so boxes can snap to it. */
function markBlocks(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  Array.from(doc.body.children).forEach((el, index) => {
    el.setAttribute('data-vblock', String(index))
  })
  return doc.body.innerHTML
}

/** The visual editor canvas: original page background + floating boxes. */
export function VisualEditor({ html, onSave }: {
  html: string
  onSave: (boxes: VisualBox[]) => void
}): JSX.Element {
  const [boxes, setBoxes] = useState<VisualBox[]>(() => htmlToBoxes(html))
  const [selected, setSelected] = useState<string | null>(null)
  const [dragging, setDragging] = useState<{ id: string; mode: 'move' | 'resize'; startX: number; startY: number; orig: VisualBox } | null>(null)
  const [dirty, setDirty] = useState(false)
  const canvasRef = useRef<HTMLDivElement>(null)

  const box = (id: string): VisualBox | undefined => boxes.find((b) => b.id === id)
  const selectedBox = selected !== null ? box(selected) : undefined

  // After the backdrop paints, measure each source block and snap its text box
  // onto the same rect — so editing happens in place (no stacked pile).
  const measured = useRef(false)
  useLayoutEffect(() => {
    if (measured.current || canvasRef.current === null) return
    const blocks = Array.from(canvasRef.current.querySelectorAll('[data-vblock]'))
    if (blocks.length === 0) return
    const backdropEl = canvasRef.current.querySelector<HTMLElement>('[data-visual-backdrop]')
    if (backdropEl === null) return
    const canvasRect = canvasRef.current.getBoundingClientRect()
    measured.current = true
    setBoxes((prev) => prev.map((box, index) => {
      const el = blocks[index] as HTMLElement | undefined
      if (el === undefined) return box
      const rect = el.getBoundingClientRect()
      const x = rect.left - canvasRect.left + canvasRef.current!.scrollLeft
      const y = rect.top - canvasRect.top + canvasRef.current!.scrollTop
      return {
        ...box,
        x: Math.max(0, x),
        y: Math.max(0, y),
        w: Math.round(rect.width),
        h: Math.round(rect.height),
      }
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boxes.length, html])

  const update = (id: string, patch: Partial<VisualBox>): void => {
    setDirty(true)
    setBoxes((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)))
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
        // Resize from the LEFT edge: dragging left grows the width (the box's
        // left boundary moves, the right stays put) — PPT-style.
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
    setBoxes((prev) => [...prev, {
      id, x: 24, y: 24 + (n % 8) * 92, w: 420, h: 70, text: t('visual.newBox'),
      color: '#1f2329', bg: CANVAS_BG, fontSize: 16, bold: false,
    }])
    setSelected(id)
    setDirty(true)
  }

  const deleteBox = (): void => {
    if (selected === null) return
    setBoxes((prev) => prev.filter((b) => b.id !== selected))
    setSelected(null)
    setDirty(true)
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
              {BGS.map((b) => {
                const label = b === 'transparent' ? t('visual.bgNone') : b === CANVAS_BG ? t('visual.bgCanvas') : b
                return <option key={b} value={b}>{label}</option>
              })}
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
        <button type="button" className={`${previewCss.visualBtn} ${previewCss.visualSave}`} disabled={!dirty} onClick={() => onSave(boxes)}>
          {t('preview.save')}
        </button>
      </div>
      <div ref={canvasRef} className={previewCss.visualCanvas} data-aionui-visual-canvas="">
        {/* The original rendered page stays as the background (never replaced). */}
        <div className={previewCss.visualBackdrop} data-visual-backdrop="" dangerouslySetInnerHTML={{ __html: markBlocks(html) }} />
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
            {/* LEFT-edge resize handle (PPT-style: drag the left boundary). */}
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
