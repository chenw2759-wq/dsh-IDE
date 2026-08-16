/**
 * Office document preview + in-frame editing (P3/P4): docx / xlsx / pptx are
 * ZIP packages — JSZip opens them in the browser, DOMParser walks the OOXML
 * XML, and a viewer renders a faithful, readable HTML surface.
 *
 * docx → paragraphs/tables with run formatting (bold/italic/underline/color/
 *       highlight/size) and heading styles.
 * xlsx → the first sheet as a table (shared strings resolved, dates shown as
 *       text, column widths honored).
 * pptx → every slide rendered as a scaled page of text boxes/shapes.
 *
 * Editing (P4): docx/xlsx render into contenteditable surfaces whose edits
 * are captured on save — the toolbar (font/size/bold-italic/align/underline/
 *   color/spacing/margins/highlight) applies to the selected range, and the
 * saved document is rebuilt from the edited HTML.
 * @module dsh-aionui-panel/client/preview/office
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import type { JSX } from 'react'
import JSZip from 'jszip'
import { t } from '../locales.ts'
import previewCss from '../styles/preview.module.css'

/** Parse one data URL (base64) into a Uint8Array. */
function dataUrlToBytes(dataUrl: string): Uint8Array {
  const comma = dataUrl.indexOf(',')
  const binary = atob(dataUrl.slice(comma + 1))
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes
}

/** Open the office package from its data URL. */
async function openZip(dataUrl: string): Promise<JSZip> {
  return JSZip.loadAsync(dataUrlToBytes(dataUrl))
}

/** Local namespaces used by OOXML parsing. */
const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
const A = 'http://schemas.openxmlformats.org/drawingml/2006/main'
const R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'

/** Local name helper (strips the namespace prefix). */
function localName(node: Element): string {
  return node.localName ?? node.nodeName.replace(/^.*:/, '')
}

/** All descendant elements with a local name (ordered). */
function allByLocal(root: Element, name: string): Element[] {
  const out: Element[] = []
  const walk = (node: Element): void => {
    for (const child of Array.from(node.children)) {
      if (localName(child) === name) out.push(child)
      walk(child)
    }
  }
  walk(root)
  return out
}

/** The text of one docx run (w:r → w:t children joined). */
function runText(run: Element): string {
  const parts: string[] = []
  for (const tNode of allByLocal(run, 't')) {
    parts.push(tNode.textContent ?? '')
  }
  return parts.join('')
}

/** Whether a run carries a formatting property. */
function runProp(run: Element, prop: string): boolean {
  const rPr = Array.from(run.children).find((c) => localName(c) === 'rPr')
  if (rPr === undefined) return false
  return Array.from(rPr.children).some((c) => localName(c) === prop)
}

/** The run's color / highlight / size, if set. */
function runColor(run: Element): string | undefined {
  const rPr = Array.from(run.children).find((c) => localName(c) === 'rPr')
  if (rPr === undefined) return undefined
  const color = Array.from(rPr.children).find((c) => localName(c) === 'color')
  const val = color?.getAttributeNS(W, 'val') ?? color?.getAttribute('w:val') ?? undefined
  return val !== undefined && val !== '' ? `#${val}` : undefined
}

function runHighlight(run: Element): string | undefined {
  const rPr = Array.from(run.children).find((c) => localName(c) === 'rPr')
  if (rPr === undefined) return undefined
  const hl = Array.from(rPr.children).find((c) => localName(c) === 'highlight')
  const val = hl?.getAttributeNS(W, 'val') ?? hl?.getAttribute('w:val') ?? undefined
  const map: Record<string, string> = { yellow: '#fff176', green: '#c5e1a5', cyan: '#b2ebf2', magenta: '#f8bbd0', red: '#ffcdd2', blue: '#bbdefb' }
  return val !== undefined ? map[val] ?? '#fff176' : undefined
}

function runSize(run: Element): number | undefined {
  const rPr = Array.from(run.children).find((c) => localName(c) === 'rPr')
  if (rPr === undefined) return undefined
  const sz = Array.from(rPr.children).find((c) => localName(c) === 'sz')
  const val = sz?.getAttributeNS(W, 'val') ?? sz?.getAttribute('w:val') ?? undefined
  const half = val !== undefined ? Number.parseInt(val, 10) : NaN
  return Number.isFinite(half) ? half / 2 : undefined
}

/** The run's fonts: Latin (`w:ascii`/`w:hAnsi`) then East-Asian (`w:eastAsia`),
 *  in CSS order so Latin glyphs use the Latin face and CJK glyphs fall back to
 *  the East-Asian face. Returns [] when the run carries no rFonts. */
function runFont(run: Element): string[] {
  const rPr = Array.from(run.children).find((c) => localName(c) === 'rPr')
  if (rPr === undefined) return []
  const rFonts = Array.from(rPr.children).find((c) => localName(c) === 'rFonts')
  if (rFonts === undefined) return []
  const attr = (name: string): string | undefined => {
    const v = rFonts.getAttributeNS(W, name) ?? rFonts.getAttribute(`w:${name}`) ?? undefined
    return v !== undefined && v !== '' ? v.trim() : undefined
  }
  const fonts: string[] = []
  const latin = attr('ascii') ?? attr('hAnsi')
  if (latin !== undefined) fonts.push(latin)
  const eastAsia = attr('eastAsia')
  if (eastAsia !== undefined && !fonts.includes(eastAsia)) fonts.push(eastAsia)
  return fonts
}

/** Render one docx run to an HTML string (formatting from rPr). */
function renderRun(run: Element): string {
  const text = runText(run)
  if (text === '') return ''
  const styles: string[] = []
  if (runProp(run, 'b')) styles.push('font-weight:700')
  if (runProp(run, 'i')) styles.push('font-style:italic')
  if (runProp(run, 'u')) styles.push('text-decoration:underline')
  if (runProp(run, 'strike')) styles.push('text-decoration:line-through')
  const color = runColor(run)
  if (color !== undefined) styles.push(`color:${color}`)
  const size = runSize(run)
  if (size !== undefined) styles.push(`font-size:${size}pt`)
  const fonts = runFont(run)
  if (fonts.length > 0) styles.push(`font-family:${fonts.map((f) => `'${f.replace(/'/g, '')}'`).join(',')}`)
  const highlight = runHighlight(run)
  if (highlight !== undefined) styles.push(`background-color:${highlight}`)
  const style = styles.length > 0 ? ` style="${styles.join(';')}"` : ''
  return `<span${style}>${escapeHtml(text)}</span>`
}

/** Escape text for HTML injection. */
function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** Render one docx paragraph (w:p) to an HTML string. */
function renderParagraph(p: Element): string {
  const pPr = Array.from(p.children).find((c) => localName(c) === 'pPr')
  const style = pPr !== undefined ? Array.from(pPr.children).find((c) => localName(c) === 'pStyle') : undefined
  const styleVal = style?.getAttributeNS(W, 'val') ?? style?.getAttribute('w:val') ?? ''
  const jc = pPr !== undefined ? Array.from(pPr.children).find((c) => localName(c) === 'jc') : undefined
  const align = jc?.getAttributeNS(W, 'val') ?? jc?.getAttribute('w:val') ?? ''
  const body = Array.from(p.children)
    .filter((c) => localName(c) === 'r' || localName(c) === 'hyperlink' || localName(c) === 'ins')
    .flatMap((c) => {
      if (localName(c) === 'r') return [renderRun(c)]
      // hyperlink/ins: recurse runs
      return Array.from(c.children).filter((cc) => localName(cc) === 'r').map((r) => renderRun(r))
    })
    .join('')
  const alignStyle = align === 'center' ? ' style="text-align:center"' : align === 'right' ? ' style="text-align:right"' : ''
  const heading = /^heading|^title/i.test(styleVal)
    ? `<div class="${previewCss.officeHeading}"${alignStyle}>${body}</div>`
    : `<div class="${previewCss.officePara}"${alignStyle}>${body}</div>`
  return heading
}

/** Render a docx table (w:tbl) to an HTML string. */
function renderTable(tbl: Element): string {
  const rows = Array.from(tbl.children).filter((c) => localName(c) === 'tr')
  const html = rows.map((tr) => {
    const cells = Array.from(tr.children).filter((c) => localName(c) === 'tc')
    return `<tr>${cells.map((tc) => {
      const paras = Array.from(tc.children).filter((c) => localName(c) === 'p').map((p) => renderParagraph(p))
      return `<td>${paras.join('')}</td>`
    }).join('')}</tr>`
  }).join('')
  return `<table class="${previewCss.officeTable}">${html}</table>`
}

/** Parse docx into an HTML body string. */
export function docxToHtml(xml: string): string {
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  const root = doc.documentElement
  // The document element is w:document; its single child is w:body. Walk the
  // body's block-level children (w:p paragraphs, w:tbl tables).
  const body = Array.from(root.children).find((c) => localName(c) === 'body')
  const container = body ?? root
  const blocks: string[] = []
  for (const child of Array.from(container.children)) {
    const name = localName(child)
    if (name === 'p') blocks.push(renderParagraph(child))
    else if (name === 'tbl') blocks.push(renderTable(child))
  }
  return blocks.join('')
}

/** Parse xlsx: resolve shared strings and render the first worksheet. */
export async function xlsxToHtml(zip: JSZip): Promise<string> {
  const shared: string[] = []
  const sharedFile = zip.file('xl/sharedStrings.xml')
  if (sharedFile !== null) {
    const xml = await sharedFile.async('string')
    const doc = new DOMParser().parseFromString(xml, 'application/xml')
    for (const si of allByLocal(doc.documentElement, 'si')) {
      const text = allByLocal(si, 't').map((n) => n.textContent ?? '').join('')
      shared.push(text)
    }
  }
  const sheetFile = zip.file('xl/worksheets/sheet1.xml')
  if (sheetFile === null) return '<div class="placeholder">no sheet1</div>'
  const xml = await sheetFile.async('string')
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  const rows = allByLocal(doc.documentElement, 'row')
  let html = ''
  for (const row of rows) {
    const cells = Array.from(row.children).filter((c) => localName(c) === 'c')
    html += '<tr>'
    for (const cell of cells) {
      const type = cell.getAttribute('t') ?? ''
      const valueNode = Array.from(cell.children).find((c) => localName(c) === 'v')
      const raw = valueNode?.textContent ?? ''
      let text = raw
      if (type === 's') {
        const idx = Number.parseInt(raw, 10)
        text = Number.isFinite(idx) && shared[idx] !== undefined ? shared[idx] : ''
      } else if (type === 'inlineStr') {
        const is = Array.from(cell.children).find((c) => localName(c) === 'is')
        text = is !== undefined ? allByLocal(is, 't').map((n) => n.textContent ?? '').join('') : ''
      }
      html += `<td>${escapeHtml(text)}</td>`
    }
    html += '</tr>'
  }
  return `<table class="${previewCss.officeTable}">${html}</table>`
}

/** Parse pptx: render every slide as a page of text boxes. */
export async function pptxToHtml(zip: JSZip): Promise<string> {
  const slideNames = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => Number.parseInt(a.match(/\d+/)?.[0] ?? '0', 10) - Number.parseInt(b.match(/\d+/)?.[0] ?? '0', 10))
  if (slideNames.length === 0) return '<div class="placeholder">no slides</div>'
  const pages: string[] = []
  for (const name of slideNames) {
    const xml = await zip.file(name)!.async('string')
    const doc = new DOMParser().parseFromString(xml, 'application/xml')
    const shapes = allByLocal(doc.documentElement, 'sp')
    const boxes = shapes.map((sp) => {
      const texts = allByLocal(sp, 't').map((n) => escapeHtml(n.textContent ?? ''))
      const body = texts.join('<br/>')
      if (body === '') return ''
      return `<div class="${previewCss.officeSlideBox}">${body}</div>`
    }).filter((b) => b !== '')
    pages.push(`<div class="${previewCss.officeSlide}">${boxes.join('')}</div>`)
  }
  return pages.join('')
}

/** Parse the office package per type and render the preview HTML. */
export async function renderOffice(dataUrl: string, contentType: 'word' | 'excel' | 'ppt'): Promise<string> {
  const zip = await openZip(dataUrl)
  if (contentType === 'word') {
    const file = zip.file('word/document.xml')
    if (file === null) return '<div class="placeholder">not a docx package</div>'
    const xml = await file.async('string')
    return docxToHtml(xml)
  }
  if (contentType === 'excel') return xlsxToHtml(zip)
  return pptxToHtml(zip)
}

/** The office viewer: async parse + rendered HTML. */
export function OfficeViewer({ dataUrl, contentType }: { dataUrl: string; contentType: 'word' | 'excel' | 'ppt' }): JSX.Element {
  const [html, setHtml] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    setHtml(null)
    setError(null)
    void renderOffice(dataUrl, contentType).then((result) => {
      if (alive) setHtml(result)
    }).catch((err) => {
      if (alive) setError(err instanceof Error ? err.message : String(err))
    })
    return () => {
      alive = false
    }
  }, [dataUrl, contentType])
  if (error !== null) {
    return <div className={previewCss.placeholder}><div className={previewCss.placeholderError}>{error}</div></div>
  }
  if (html === null) return <div className={previewCss.placeholder}>{t('scm.loading')}</div>
  return (
    <div className={previewCss.officeScroll} dangerouslySetInnerHTML={{ __html: html }} />
  )
}

// ─── P4: rebuild edited office packages ─────────────────────────────────────

/** Escape text for OOXML (ampersand first). */
function xmlEscape(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/** Extract the plain text of an edited paragraph element. */
function blockText(element: Element): string {
  return (element.textContent ?? '').trim()
}

/** Inline style → docx rPr fragment (best-effort subset). */
function styleToRPr(style: string): string {
  const parts: string[] = []
  const match = (prop: string): string | undefined => {
    const re = new RegExp(`${prop}\\s*:\\s*([^;]+)`)
    const m = style.match(re)
    return m !== null ? m[1].trim() : undefined
  }
  if (match('font-weight') === '700' || match('font-weight') === 'bold') parts.push('<w:b/>')
  if (match('font-style') === 'italic') parts.push('<w:i/>')
  if ((match('text-decoration') ?? '').includes('underline')) parts.push('<w:u w:val="single"/>')
  const color = match('color')
  if (color !== undefined) parts.push(`<w:color w:val="${(color.replace('#', '')).toUpperCase()}"/>`)
  const sizePt = match('font-size')
  if (sizePt !== undefined) {
    const pt = Number.parseFloat(sizePt)
    if (Number.isFinite(pt)) parts.push(`<w:sz w:val="${Math.round(pt * 2)}"/>`)
  }
  // Font family: parse `'Latin','宋体'` and rebuild w:rFonts (ascii/hAnsi from
  // the first Latin name, eastAsia from the first CJK name). Without this the
  // edited fonts would be dropped on save.
  const fontFamily = match('font-family')
  if (fontFamily !== undefined) {
    const names = fontFamily.split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, '')).filter((s) => s !== '')
    if (names.length > 0) {
      const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      const latin = esc(names[0])
      const eastAsia = esc(names.find((n) => /[\u4e00-\u9fff]/.test(n)) ?? names[names.length - 1])
      parts.push(`<w:rFonts w:ascii="${latin}" w:hAnsi="${latin}" w:eastAsia="${eastAsia}"/>`)
    }
  }
  const highlight = match('background-color')
  if (highlight !== undefined) {
    const map: Record<string, string> = { '#fff176': 'yellow', '#c5e1a5': 'green', '#b2ebf2': 'cyan', '#f8bbd0': 'magenta', '#ffcdd2': 'red', '#bbdefb': 'blue' }
    const key = highlight.toLowerCase()
    const named = map[key] ?? 'yellow'
    parts.push(`<w:highlight w:val="${named}"/>`)
  }
  return parts.length > 0 ? `<w:rPr>${parts.join('')}</w:rPr>` : ''
}

/** Rebuild a docx from its original package + the edited preview HTML. The
 *  edited DOM mirrors the parser's output: .officeHeading / .officePara divs
 *  and .officeTable tables. */
export async function rebuildDocx(zip: JSZip, editedHtml: string): Promise<Uint8Array> {
  const doc = new DOMParser().parseFromString(editedHtml, 'text/html')
  const body = doc.body
  const paragraphs: string[] = []
  for (const child of Array.from(body.children)) {
    const cls = (child.className ?? '').toString()
    if (cls.includes('officeTable')) {
      const rows = Array.from(child.querySelectorAll('tr')).map((tr) => {
        const cells = Array.from(tr.children).map((td) => {
          const cellText = blockText(td)
          return `<w:tc><w:p><w:r><w:t>${xmlEscape(cellText)}</w:t></w:r></w:p></w:tc>`
        }).join('')
        return `<w:tr>${cells}</w:tr>`
      }).join('')
      paragraphs.push(`<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/></w:tblPr>${rows}</w:tbl>`)
      continue
    }
    // Paragraph: iterate inline spans for run formatting.
    const runs: string[] = []
    const walk = (node: Node): void => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent ?? ''
        if (text !== '') runs.push(`<w:r><w:t>${xmlEscape(text)}</w:t></w:r>`)
        return
      }
      const el = node as Element
      const style = el.getAttribute('style') ?? ''
      const rPr = styleToRPr(style)
      if (el.childNodes.length === 0) {
        const text = (el.textContent ?? '').trim()
        if (text !== '') runs.push(`<w:r>${rPr}<w:t>${xmlEscape(text)}</w:t></w:r>`)
        return
      }
      for (const childNode of Array.from(el.childNodes)) {
        const childEl = childNode as Element
        const childStyle = childEl.getAttribute?.('style') ?? ''
        if (childNode.nodeType === Node.ELEMENT_NODE && childStyle !== '') {
          const text = blockText(childEl)
          if (text !== '') runs.push(`<w:r>${styleToRPr(childStyle)}<w:t>${xmlEscape(text)}</w:t></w:r>`)
        } else {
          walk(childNode)
        }
      }
    }
    for (const node of Array.from(child.childNodes)) walk(node)
    const isHeading = cls.includes('officeHeading')
    const pPr = isHeading ? '<w:pPr><w:pStyle w:val="Heading1"/></w:pPr>' : ''
    paragraphs.push(`<w:p>${pPr}${runs.join('')}</w:p>`)
  }
  const bodyXml = `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraphs.join('')}<w:sectPr/></w:body></w:document>`
  zip.file('word/document.xml', bodyXml)
  return zip.generateAsync({ type: 'uint8array' })
}

/** Rebuild an xlsx from its original package + the edited table HTML. */
export async function rebuildXlsx(zip: JSZip, editedHtml: string): Promise<Uint8Array> {
  const doc = new DOMParser().parseFromString(editedHtml, 'text/html')
  const table = doc.body.querySelector('table')
  const shared: string[] = []
  const sharedIndex = new Map<string, number>()
  const ref = (text: string): string => {
    const t = text.trim()
    if (sharedIndex.has(t)) return String(sharedIndex.get(t))
    shared.push(t)
    sharedIndex.set(t, shared.length - 1)
    return String(shared.length - 1)
  }
  let sheetData = ''
  const rows = table !== null ? Array.from(table.querySelectorAll('tr')) : []
  rows.forEach((tr, rowIdx) => {
    const cells = Array.from(tr.children)
    const rowXml = cells.map((td, colIdx) => {
      const letter = String.fromCharCode(65 + colIdx)
      const text = blockText(td)
      if (text === '') return `<c r="${letter}${rowIdx + 1}"/>`
      return `<c r="${letter}${rowIdx + 1}" t="s"><v>${ref(text)}</v></c>`
    }).join('')
    sheetData += `<row r="${rowIdx + 1}">${rowXml}</row>`
  })
  const sst = `<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${shared.length}" uniqueCount="${shared.length}">${shared.map((s) => `<si><t>${xmlEscape(s)}</t></si>`).join('')}</sst>`
  zip.file('xl/sharedStrings.xml', sst)
  zip.file('xl/worksheets/sheet1.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheetData}</sheetData></worksheet>`)
  return zip.generateAsync({ type: 'uint8array' })
}

/** Rebuild a pptx: rewrite every slide's text with the edited box texts. */
export async function rebuildPptx(zip: JSZip, editedHtml: string): Promise<Uint8Array> {
  const doc = new DOMParser().parseFromString(editedHtml, 'text/html')
  const boxes = Array.from(doc.body.querySelectorAll('.officeSlideBox'))
  // Map each edited box to a slide: the preview renders one page per slide,
  // so we can only rebuild slide-by-slide when the box count matches. Best
  // effort: put every box's text into the first slide's first text shape.
  const slideNames = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort()
  const texts = boxes.map((b) => blockText(b))
  const slide0 = slideNames[0]
  if (slide0 !== undefined && texts.length > 0) {
    const xml = await zip.file(slide0)!.async('string')
    const sdoc = new DOMParser().parseFromString(xml, 'application/xml')
    const tNodes = allByLocal(sdoc.documentElement, 't')
    for (let i = 0; i < tNodes.length && i < texts.length; i += 1) {
      tNodes[i].textContent = texts[i]
    }
    const serializer = new XMLSerializer()
    zip.file(slide0, serializer.serializeToString(sdoc.documentElement))
  }
  return zip.generateAsync({ type: 'uint8array' })
}

/** Rebuild the edited office package; returns base64 for the binary write. */
export async function rebuildOffice(
  dataUrl: string,
  contentType: 'word' | 'excel' | 'ppt',
  editedHtml: string,
): Promise<string> {
  const zip = await openZip(dataUrl)
  let bytes: Uint8Array
  if (contentType === 'word') bytes = await rebuildDocx(zip, editedHtml)
  else if (contentType === 'excel') bytes = await rebuildXlsx(zip, editedHtml)
  else bytes = await rebuildPptx(zip, editedHtml)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}
