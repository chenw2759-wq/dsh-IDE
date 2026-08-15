/**
 * Visual editor (P4.2, revised): the compiled HTML/Markdown result becomes a
 * WYSIWYG surface — you edit the rendered page in place, exactly like Word.
 * The rendered result IS the editable document (no floating text boxes, no
 * overlaid columns).
 *
 * Two surfaces share one toolbar:
 * - Markdown: a contenteditable div holding the compiled HTML (the source is
 *   converted back to Markdown on save by htmlToMarkdown).
 * - HTML: a design-mode IFRAME rendering the FULL document (its <style> and
 *   body background stay intact), so the canvas background renders and saving
 *   serializes the whole document back — never a body-only fragment.
 *
 * Editing is uncontrolled (the browser owns the DOM; React never re-injects
 * innerHTML), so the caret never jumps. The save callback receives the edited
 * result; the caller serializes it (HTML files keep HTML, Markdown files are
 * converted back to Markdown).
 * @module dsh-aionui-panel/client/preview/visual-editor
 */

import { useEffect, useRef, useState } from 'react'
import type { JSX } from 'react'
import { readSettings } from '../settings.ts'
import { t } from '../locales.ts'
import previewCss from '../styles/preview.module.css'
import { htmlToMarkdown } from './html-to-markdown.ts'

const FONTS = ['宋体', '黑体', '仿宋', '楷体', 'Arial', 'Times New Roman', 'Microsoft YaHei', 'sans-serif', 'serif']
const SIZES = [12, 14, 16, 18, 20, 24, 28, 32, 40, 48]

/** Base styles for a document FRAGMENT edited in the HTML iframe (full
 *  documents carry their own <head>/<style>, which is preserved verbatim). */
const FRAGMENT_BASE = 'body{margin:0;font-family:-apple-system,"system-ui","Segoe UI",Roboto,"PingFang SC","Microsoft YaHei",sans-serif;color:#1d2129;line-height:1.6}@media (prefers-color-scheme:dark){body{color:rgba(255,255,255,0.9)}}'

/** True when the string looks like a full HTML document (own html/head/body). */
function isFullDocument(html: string): boolean {
  return /<!doctype\s+html/i.test(html) || /<html[\s>]/i.test(html) || /<head[\s>]/i.test(html) || /<body[\s>]/i.test(html)
}

/** The WYSIWYG editing toolbar (formatting applies to the selection). */
function VisualToolbar({ exec, onSave, dirty }: { exec: (command: string, value?: string) => void; onSave: () => void; dirty: boolean }): JSX.Element {
  const tools = readSettings().editorTools
  const [font, setFont] = useState('')
  const [size, setSize] = useState('')

  return (
    <div className={previewCss.officeToolbar}>
      <button type="button" className={previewCss.officeToolBtn} title={t('preview.undo')} onMouseDown={(e) => { e.preventDefault(); exec('undo') }}>↶</button>
      <button type="button" className={previewCss.officeToolBtn} title={t('preview.redo')} onMouseDown={(e) => { e.preventDefault(); exec('redo') }}>↷</button>
      {tools.font && (
        <select className={previewCss.officeTool} value={font} onChange={(e) => { setFont(e.target.value); exec('fontName', e.target.value) }} title={t('settings.tool.font')}>
          <option value="" disabled>{t('settings.tool.font')}</option>
          {FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
      )}
      {tools.fontSize && (
        <select className={previewCss.officeTool} value={size} onChange={(e) => { setSize(e.target.value); exec('fontSize', String(Math.max(1, Math.round(Number(e.target.value) / 3)))) }} title={t('settings.tool.fontSize')}>
          <option value="" disabled>{t('settings.tool.fontSize')}</option>
          {SIZES.map((s) => <option key={s} value={String(s)}>{s}px</option>)}
        </select>
      )}
      {tools.boldItalic && (
        <>
          <button type="button" className={previewCss.officeToolBtn} title={t('settings.tool.boldItalic')} onMouseDown={(e) => { e.preventDefault(); exec('bold') }}><strong>B</strong></button>
          <button type="button" className={previewCss.officeToolBtn} title={t('settings.tool.boldItalic')} onMouseDown={(e) => { e.preventDefault(); exec('italic') }}><em>I</em></button>
        </>
      )}
      {tools.underline && (
        <button type="button" className={previewCss.officeToolBtn} title={t('settings.tool.underline')} onMouseDown={(e) => { e.preventDefault(); exec('underline') }}><span style={{ textDecoration: 'underline' }}>U</span></button>
      )}
      {tools.align && (
        <>
          <button type="button" className={previewCss.officeToolBtn} title={t('settings.tool.align')} onMouseDown={(e) => { e.preventDefault(); exec('justifyLeft') }}>左</button>
          <button type="button" className={previewCss.officeToolBtn} title={t('settings.tool.align')} onMouseDown={(e) => { e.preventDefault(); exec('justifyCenter') }}>中</button>
          <button type="button" className={previewCss.officeToolBtn} title={t('settings.tool.align')} onMouseDown={(e) => { e.preventDefault(); exec('justifyRight') }}>右</button>
        </>
      )}
      {tools.color && <input type="color" className={previewCss.officeColor} title={t('settings.tool.color')} defaultValue="#000000" onChange={(e) => exec('foreColor', e.target.value)} />}
      {tools.highlight && <input type="color" className={previewCss.officeColor} title={t('settings.tool.highlight')} defaultValue="#fff176" onChange={(e) => exec('hiliteColor', e.target.value)} />}
      <span className={previewCss.officeToolbarSpacer} />
      <button type="button" className={`${previewCss.officeToolBtn} ${previewCss.officeSave}`} disabled={!dirty} onClick={onSave}>{t('preview.save')}</button>
    </div>
  )
}

/** The Markdown WYSIWYG editor: the compiled HTML is the editable document. */
export function VisualEditor({ html, contentType, onSave }: {
  html: string
  contentType: 'html' | 'markdown'
  onSave: (editedHtml: string) => void
}): JSX.Element {
  // HTML documents get the iframe design-mode surface; markdown stays in a
  // contenteditable div (its compiled HTML is a fragment, not a document).
  if (contentType === 'html') {
    return <HtmlVisualEditor html={html} onSave={onSave} />
  }

  const ref = useRef<HTMLDivElement>(null)
  const [dirty, setDirty] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (ref.current === null || ready) return
    ref.current.innerHTML = html
    setReady(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [html])

  const exec = (command: string, value?: string): void => {
    try {
      document.execCommand(command, false, value)
    } catch {
      // best-effort
    }
  }

  const save = (): void => {
    if (ref.current === null) return
    const edited = ref.current.innerHTML
    onSave(htmlToMarkdown(edited))
    setDirty(false)
  }

  return (
    <div className={previewCss.visualWrap}>
      <VisualToolbar exec={exec} onSave={save} dirty={dirty} />
      <div
        ref={ref}
        className={`${previewCss.officeScroll} ${previewCss.visualEditable}`}
        data-aionui-visual-editable=""
        contentEditable
        suppressContentEditableWarning
        spellCheck={false}
        onInput={() => setDirty(true)}
      />
    </div>
  )
}

/** The HTML WYSIWYG editor: a design-mode iframe rendering the FULL document
 *  (background, <style>, layout all preserved), saved back as a full document. */
function HtmlVisualEditor({ html, onSave }: { html: string; onSave: (editedHtml: string) => void }): JSX.Element {
  const frameRef = useRef<HTMLIFrameElement>(null)
  const [dirty, setDirty] = useState(false)
  const [ready, setReady] = useState(false)
  const fullDoc = isFullDocument(html)

  // Build the source document once. Full documents pass through verbatim (so
  // their <style> and body background render); fragments get a minimal shell.
  const srcDoc = fullDoc
    ? html
    : `<!doctype html><html><head><meta charset="utf-8"><style>${FRAGMENT_BASE}</style></head><body>${html}</body></html>`

  // Once the frame loads, turn on design mode and wire the dirty flag.
  const handleLoad = (): void => {
    const doc = frameRef.current?.contentDocument
    if (doc === null || doc === undefined) return
    if (ready) return
    doc.designMode = 'on'
    doc.addEventListener('input', () => setDirty(true))
    setReady(true)
  }

  const withDoc = <T,>(fn: (doc: Document) => T): T | undefined => {
    const doc = frameRef.current?.contentDocument
    return doc === null || doc === undefined ? undefined : fn(doc)
  }

  const exec = (command: string, value?: string): void => {
    withDoc((doc) => {
      try {
        doc.execCommand(command, false, value)
      } catch {
        // best-effort
      }
    })
  }

  const save = (): void => {
    const out = withDoc((doc) => {
      // Serialize the WHOLE document back (preserving <head>/<style>) when the
      // source was a full document; otherwise write the edited body fragment.
      const body = doc.body.innerHTML
      return fullDoc ? `<!doctype html>\n${doc.documentElement.outerHTML}` : body
    })
    if (out === undefined) return
    onSave(out)
    setDirty(false)
  }

  return (
    <div className={previewCss.visualWrap}>
      <VisualToolbar exec={exec} onSave={save} dirty={dirty} />
      <iframe
        ref={frameRef}
        className={previewCss.visualFrame}
        srcDoc={srcDoc}
        sandbox="allow-same-origin"
        title="HTML visual editor"
        onLoad={handleLoad}
      />
    </div>
  )
}
