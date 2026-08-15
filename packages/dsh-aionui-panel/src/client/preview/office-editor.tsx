/**
 * In-frame office editing (P4): the docx/xlsx/pptx preview becomes a
 * contenteditable surface with a formatting toolbar. Every tool is gated by
 * the workspace settings' editorTools picker (font / fontSize / boldItalic /
 * align / underline / color / spacing / margin / highlight). Saving rebuilds
 * the office package from the edited HTML and writes it back as a binary.
 *
 * The editable surface is UNCONTROLLED: the initial HTML is injected once and
 * the browser owns the DOM from then on. Keystrokes never re-render React and
 * never re-inject innerHTML — that is what keeps the caret from jumping to
 * the start after the second character. The edited HTML is read from the DOM
 * only at save time.
 *
 * Rebuild strategy: the edited DOM mirrors the parsed preview HTML — docx
 * keeps paragraphs/table rows, xlsx keeps its table, pptx keeps its slide
 * boxes — and the OOXML is regenerated from those blocks. Complex layouts
 * (headers/footers, merged cells, columns) are NOT preserved; this is a
 * known fidelity limit of the HTML-rebuild approach.
 * @module dsh-aionui-panel/client/preview/office-editor
 */

import { useEffect, useRef, useState } from 'react'
import type { JSX } from 'react'
import { readSettings } from '../settings.ts'
import { t } from '../locales.ts'
import previewCss from '../styles/preview.module.css'

const FONTS = ['宋体', '黑体', '仿宋', '楷体', 'Arial', 'Times New Roman', 'Microsoft YaHei', 'Courier New', 'sans-serif', 'serif']
const SIZES = [10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48]
const COLORS = ['#000000', '#7f1d1d', '#b91c1c', '#c2410c', '#a16207', '#15803d', '#166534', '#0e7490', '#1d4ed8', '#4338ca', '#7c3aed', '#be185d', '#52525b']
const HIGHLIGHTS = ['#fff176', '#c5e1a5', '#b2ebf2', '#f8bbd0', '#ffcdd2', '#bbdefb']

/** Apply a document.execCommand to the active selection. */
function exec(command: string, value?: string): void {
  try {
    document.execCommand(command, false, value)
  } catch {
    // best-effort
  }
}

/** Toggle a wrapping style on the selected range (spacing/margin fallbacks). */
function toggleStyle(style: string, value: string): void {
  const selection = window.getSelection()
  if (selection === null || selection.rangeCount === 0) return
  const range = selection.getRangeAt(0)
  const container = range.commonAncestorContainer
  const parent = container.nodeType === Node.TEXT_NODE ? container.parentElement : container as Element
  if (parent !== null && (parent as HTMLElement).style.getPropertyValue(style) === value) {
    (parent as HTMLElement).style.removeProperty(style)
  } else {
    exec('styleWithCSS')
    const span = document.createElement('span')
    span.style.setProperty(style, value)
    try {
      range.surroundContents(span)
    } catch {
      (parent as HTMLElement | null)?.style.setProperty(style, value)
    }
  }
}

/** The office editing toolbar (tools hidden per settings). */
export function OfficeToolbar({ onSave, dirty }: { onSave: () => void; dirty: boolean }): JSX.Element {
  const tools = readSettings().editorTools
  const [font, setFont] = useState('')
  const [size, setSize] = useState('')
  const [marginOpen, setMarginOpen] = useState(false)
  const [marginValue, setMarginValue] = useState('2em')

  const applyFont = (value: string): void => {
    setFont(value)
    exec('fontName', value)
  }
  const applySize = (value: string): void => {
    setSize(value)
    exec('fontSize', String(Math.max(1, Math.round(Number(value) / 3))))
  }
  const applyMargin = (): void => {
    toggleStyle('margin-left', marginValue.trim() === '' ? '' : marginValue.trim())
    setMarginOpen(false)
  }

  return (
    <div className={previewCss.officeToolbar}>
      {/* Undo / redo (Word-like). */}
      <button type="button" className={previewCss.officeToolBtn} title={t('preview.undo')} onMouseDown={(e) => { e.preventDefault(); exec('undo') }}>↶</button>
      <button type="button" className={previewCss.officeToolBtn} title={t('preview.redo')} onMouseDown={(e) => { e.preventDefault(); exec('redo') }}>↷</button>
      {tools.font && (
        <select
          className={previewCss.officeTool}
          value={font}
          onChange={(event) => applyFont(event.target.value)}
          title={t('settings.tool.font')}
        >
          <option value="" disabled>{t('settings.tool.font')}</option>
          {FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
      )}
      {tools.fontSize && (
        <select
          className={previewCss.officeTool}
          value={size}
          onChange={(event) => applySize(event.target.value)}
          title={t('settings.tool.fontSize')}
        >
          <option value="" disabled>{t('settings.tool.fontSize')}</option>
          {SIZES.map((s) => <option key={s} value={String(s)}>{s}pt</option>)}
        </select>
      )}
      {tools.boldItalic && (
        <>
          <button type="button" className={previewCss.officeToolBtn} title={t('settings.tool.boldItalic')} onMouseDown={(e) => { e.preventDefault(); exec('bold') }}>
            <strong>B</strong>
          </button>
          <button type="button" className={previewCss.officeToolBtn} title={t('settings.tool.boldItalic')} onMouseDown={(e) => { e.preventDefault(); exec('italic') }}>
            <em>I</em>
          </button>
        </>
      )}
      {tools.align && (
        <>
          <button type="button" className={previewCss.officeToolBtn} title={t('settings.tool.align')} onMouseDown={(e) => { e.preventDefault(); exec('justifyLeft') }}>左</button>
          <button type="button" className={previewCss.officeToolBtn} title={t('settings.tool.align')} onMouseDown={(e) => { e.preventDefault(); exec('justifyCenter') }}>中</button>
          <button type="button" className={previewCss.officeToolBtn} title={t('settings.tool.align')} onMouseDown={(e) => { e.preventDefault(); exec('justifyRight') }}>右</button>
        </>
      )}
      {tools.underline && (
        <button type="button" className={previewCss.officeToolBtn} title={t('settings.tool.underline')} onMouseDown={(e) => { e.preventDefault(); exec('underline') }}>
          <span style={{ textDecoration: 'underline' }}>U</span>
        </button>
      )}
      {tools.color && (
        <input
          type="color"
          className={previewCss.officeColor}
          title={t('settings.tool.color')}
          defaultValue="#000000"
          onChange={(event) => exec('foreColor', event.target.value)}
        />
      )}
      {tools.highlight && (
        <input
          type="color"
          className={previewCss.officeColor}
          title={t('settings.tool.highlight')}
          defaultValue="#fff176"
          onChange={(event) => exec('hiliteColor', event.target.value)}
        />
      )}
      {tools.spacing && (
        <>
          <button type="button" className={previewCss.officeToolBtn} title={t('settings.tool.spacing')} onMouseDown={(e) => { e.preventDefault(); toggleStyle('line-height', '1.2') }}>1.2</button>
          <button type="button" className={previewCss.officeToolBtn} title={t('settings.tool.spacing')} onMouseDown={(e) => { e.preventDefault(); toggleStyle('line-height', '1.6') }}>1.6</button>
          <button type="button" className={previewCss.officeToolBtn} title={t('settings.tool.spacing')} onMouseDown={(e) => { e.preventDefault(); toggleStyle('line-height', '2') }}>2.0</button>
        </>
      )}
      {tools.margin && (
        <>
          <button type="button" className={previewCss.officeToolBtn} title={t('settings.tool.margin')} onMouseDown={(e) => { e.preventDefault(); setMarginOpen(!marginOpen) }}>页边距</button>
          {marginOpen && (
            <span className={previewCss.officeMarginPop}>
              <input
                className={previewCss.officeTool}
                value={marginValue}
                placeholder="2em / 24px"
                onChange={(event) => setMarginValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') applyMargin()
                  if (event.key === 'Escape') setMarginOpen(false)
                }}
                autoFocus
              />
              <button type="button" className={previewCss.officeToolBtn} onMouseDown={(e) => { e.preventDefault(); applyMargin() }}>确定</button>
            </span>
          )}
        </>
      )}
      <span className={previewCss.officeToolbarSpacer} />
      <button
        type="button"
        className={`${previewCss.officeToolBtn} ${previewCss.officeSave}`}
        disabled={!dirty}
        onClick={onSave}
      >
        {t('preview.save')}
      </button>
    </div>
  )
}

/** The editable office surface (uncontrolled contenteditable — no re-inject). */
export function EditableOffice({ html, contentType, onEdited, onSave, dirty }: {
  html: string
  contentType: 'word' | 'excel' | 'ppt'
  onEdited: (html: string) => void
  onSave: () => void
  dirty: boolean
}): JSX.Element {
  const ref = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)

  // Inject the initial HTML exactly once; afterwards the browser owns the DOM
  // (React never re-sets innerHTML, so the caret stays where the user types).
  useEffect(() => {
    if (ref.current === null || ready) return
    ref.current.innerHTML = html
    setReady(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [html])

  return (
    <div className={previewCss.officeEditWrap}>
      <OfficeToolbar onSave={onSave} dirty={dirty} />
      <div
        ref={ref}
        className={previewCss.officeScroll}
        data-aionui-office-editable=""
        contentEditable
        suppressContentEditableWarning
        spellCheck={false}
        onInput={() => {
          if (ref.current !== null) onEdited(ref.current.innerHTML)
        }}
      />
    </div>
  )
}

export { COLORS, HIGHLIGHTS }
