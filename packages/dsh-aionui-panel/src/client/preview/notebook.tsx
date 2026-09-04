/**
 * Jupyter Notebook (.ipynb) support: parse nbformat JSON, render cells like a
 * static notebook (markdown rendered, code highlighted with its outputs
 * underneath), and edit cell sources in place — saving serializes the edited
 * sources back into the original notebook JSON so metadata/outputs survive.
 *
 * No kernel: cells are not executed here (read + edit + save only).
 * @module dsh-aionui-panel/client/preview/notebook
 */

import { useMemo, useRef, useState, type JSX } from 'react'
import hljs from 'highlight.js'
import { renderMarkdown } from './markdown.ts'
import previewCss from '../styles/preview.module.css'

/** One parsed cell (view shape). */
export interface NbCell {
  /** index in the original cells array */
  index: number
  cell_type: 'markdown' | 'code' | 'raw' | string
  source: string
  execution_count?: number | null
  outputs?: NotebookOutput[]
}

/** A parsed notebook plus the raw document (for faithful re-serialization). */
export interface ParsedNotebook {
  ok: true
  /** the original parsed JSON document (metadata, nbformat… kept verbatim) */
  doc: Record<string, unknown>
  cells: NbCell[]
  language: string
}
export type NotebookParse = ParsedNotebook | { ok: false; message: string }

/** The subset of notebook output records we render. */
export type NotebookOutput =
  | { output_type: 'stream'; name?: string; text?: string[] | string }
  | { output_type: 'error'; ename?: string; evalue?: string; traceback?: string[] }
  | { output_type: 'execute_result' | 'display_data'; data?: Record<string, unknown>; metadata?: unknown }

/** Join a Jupyter source/text field (string or array of lines). */
function joinText(value: unknown): string {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.join('')
  return ''
}

/** Pick the best text/plain / text/html / image payload from output data. */
function dataText(data: Record<string, unknown> | undefined): { kind: 'text' | 'html' | 'image' | 'markdown'; value: string } | null {
  if (data === undefined) return null
  const imagePng = data['image/png']
  if (typeof imagePng === 'string' && imagePng !== '') {
    return { kind: 'image', value: `data:image/png;base64,${imagePng}` }
  }
  const imageJpeg = data['image/jpeg']
  if (typeof imageJpeg === 'string' && imageJpeg !== '') {
    return { kind: 'image', value: `data:image/jpeg;base64,${imageJpeg}` }
  }
  const html = data['text/html']
  const htmlText = joinText(html)
  if (htmlText !== '') return { kind: 'html', value: htmlText }
  const md = data['text/markdown']
  const mdText = joinText(md)
  if (mdText !== '') return { kind: 'markdown', value: mdText }
  const plain = data['text/plain']
  const plainText = joinText(plain)
  if (plainText !== '') return { kind: 'text', value: plainText }
  // image/svg+xml etc: drop (unsupported payloads are ignored, not fatal).
  return null
}

/** Parse an ipynb text payload into view cells (nbformat >= 4). */
export function parseNotebook(content: string): NotebookParse {
  let doc: unknown
  try {
    doc = JSON.parse(content)
  } catch {
    return { ok: false, message: '不是有效的 JSON — 文件可能已损坏或不是 notebook 格式' }
  }
  if (typeof doc !== 'object' || doc === null || !Array.isArray((doc as Record<string, unknown>).cells)) {
    return { ok: false, message: '缺少 cells 数组，不是 notebook（nbformat）文件' }
  }
  const record = doc as Record<string, unknown>
  const rawCells = record.cells as Array<Record<string, unknown>>
  const nbformat = typeof record.nbformat === 'number' ? record.nbformat : undefined
  if (nbformat !== undefined && nbformat < 4) {
    return { ok: false, message: `nbformat ${nbformat} 过旧（仅支持 v4+）` }
  }
  const languageInfo = record.metadata as Record<string, unknown> | undefined
  const metaLang = languageInfo?.language_info as Record<string, unknown> | undefined
  const language = typeof metaLang?.name === 'string' ? metaLang.name : 'python'
  const cells: NbCell[] = rawCells.map((cell, index) => {
    const type = typeof cell.cell_type === 'string' ? cell.cell_type : 'code'
    const outputs = Array.isArray(cell.outputs) ? (cell.outputs as NotebookOutput[]) : []
    const count = typeof cell.execution_count === 'number' || typeof cell.execution_count === 'string'
      ? (cell.execution_count as number | string) as unknown as number
      : null
    return {
      index,
      cell_type: type,
      source: joinText(cell.source),
      execution_count: count === null ? undefined : count,
      outputs: outputs.length > 0 ? outputs : undefined,
    }
  })
  return { ok: true, doc: record, cells, language }
}

/**
 * Serialize edited sources back into the original document. Cells keep every
 * other field (outputs, metadata, execution_count); only `source` is replaced
 * (nbformat ≥ 4.5 accepts a plain string).
 */
export function serializeNotebook(doc: Record<string, unknown>, sources: string[]): string {
  const rawCells = (doc.cells as Array<Record<string, unknown>>) ?? []
  const nextCells = rawCells.map((cell, index) => ({
    ...cell,
    source: sources[index] ?? joinText(cell.source),
  }))
  return JSON.stringify({ ...doc, cells: nextCells }, null, 1)
}

/** Escape a text for injection into a <pre><code> highlight layer. */
function escapeCode(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** One code/markdown/raw cell rendered for reading (outputs below code). */
function CellBody({
  cell,
  language,
  editing,
  draft,
  onDraft,
  onCommit,
}: {
  cell: NbCell
  language: string
  editing: boolean
  draft: string
  onDraft: (text: string) => void
  onCommit: () => void
}): JSX.Element {
  const type = cell.cell_type
  // Hooks MUST run unconditionally for every render of this cell (editing
  // toggles which branch returns, so the memos live up here).
  const markdownHtml = useMemo(() => renderMarkdown(cell.source), [cell.source])
  const codeHtml = useMemo(() => {
    try {
      if (hljs.getLanguage(language) === undefined) return escapeCode(cell.source)
      return hljs.highlight(cell.source, { language }).value
    } catch {
      return escapeCode(cell.source)
    }
  }, [cell.source, language])
  if (editing) {
    return (
      <textarea
        className={previewCss.notebookCellTextarea}
        value={draft}
        spellCheck={false}
        autoFocus
        onChange={(event) => onDraft(event.target.value)}
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
            event.preventDefault()
            onCommit()
          }
        }}
      />
    )
  }
  if (type === 'markdown') {
    // renderMarkdown output is sanitized (same path as the .md viewer); reuse
    // the mdViewer typography so h1/p/code/table render like a markdown tab.
    if (cell.source.trim() === '') return <div className={previewCss.notebookCellEmpty} />
    return (
      <div
        className={`${previewCss.mdViewer} ${previewCss.notebookMarkdown}`}
        dangerouslySetInnerHTML={{ __html: markdownHtml }}
      />
    )
  }
  if (type === 'raw') {
    return <pre className={previewCss.notebookRaw}>{cell.source}</pre>
  }
  return (
    <div className={previewCss.notebookCodeWrap}>
      <pre className={previewCss.notebookCode}><code dangerouslySetInnerHTML={{ __html: codeHtml }} /></pre>
    </div>
  )
}

/** Render the outputs of one code cell. */
function CellOutputs({ outputs }: { outputs?: NotebookOutput[] }): JSX.Element | null {
  if (outputs === undefined || outputs.length === 0) return null
  return (
    <div className={previewCss.notebookOutputs}>
      {outputs.map((output, index) => (
        <OutputRow key={index} output={output} />
      ))}
    </div>
  )
}

function OutputRow({ output }: { output: NotebookOutput }): JSX.Element | null {
  if (output.output_type === 'stream') {
    const text = joinText(output.text)
    return <pre className={previewCss.notebookOutput}>{text}</pre>
  }
  if (output.output_type === 'error') {
    const trace = Array.isArray(output.traceback) ? output.traceback.join('\n') : ''
    const body = trace !== '' ? trace : `${output.ename ?? 'Error'}: ${output.evalue ?? ''}`
    return <pre className={previewCss.notebookOutputError}>{body}</pre>
  }
  if (output.output_type === 'execute_result' || output.output_type === 'display_data') {
    const pick = dataText(output.data)
    if (pick === null) return null
    if (pick.kind === 'image') {
      return <img className={previewCss.notebookOutputImage} src={pick.value} alt="output" />
    }
    if (pick.kind === 'html') {
      return <div className={previewCss.notebookOutputHtml} dangerouslySetInnerHTML={{ __html: pick.value }} />
    }
    if (pick.kind === 'markdown') {
      return <div className={`${previewCss.mdViewer} ${previewCss.notebookMarkdown}`} dangerouslySetInnerHTML={{ __html: renderMarkdown(pick.value) }} />
    }
    return <pre className={previewCss.notebookOutput}>{pick.value}</pre>
  }
  return null
}

const TYPE_LABEL: Record<string, string> = { markdown: 'Markdown', code: 'Code', raw: 'Raw' }

/** The notebook reader/editor surface (one component, no kernel). */
export function NotebookTab({
  content,
  onContentChange,
  onSave,
}: {
  content: string
  onContentChange: (content: string) => void
  onSave: () => void
}): JSX.Element {
  const parsed = useMemo(() => parseNotebook(content), [content])
  // Which cell index is being edited, and its draft text.
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [draft, setDraft] = useState('')
  // Snapshot of the sources each cell was LAST serialized with — used to keep
  // the parse result in sync when content changes externally (reload).
  const lastCommitted = useRef<string[]>([])

  if (!parsed.ok) {
    return (
      <div className={previewCss.placeholder}>
        <div className={previewCss.placeholderTitle}>Notebook</div>
        <div className={previewCss.placeholderError}>{parsed.message}</div>
      </div>
    )
  }

  const doc = parsed.doc
  const cells = parsed.cells
  const language = parsed.language

  const commit = (index: number): void => {
    const next = cells.map((cell, i) => (i === index ? draft : cell.source))
    lastCommitted.current = next
    setEditingIndex(null)
    onContentChange(serializeNotebook(doc, next))
  }
  const cancel = (): void => {
    setEditingIndex(null)
  }

  const runCount = cells.filter((cell) => cell.cell_type === 'code').length

  return (
    <div className={previewCss.notebook}>
      <div className={previewCss.notebookHeader}>
        <span className={previewCss.notebookTitle}>Jupyter Notebook</span>
        <span className={previewCss.notebookMeta}>
          {language} · {cells.length} cells · {runCount} code · nbformat {typeof doc.nbformat === 'number' ? doc.nbformat : '?'}
        </span>
        <span className={previewCss.notebookHint}>
          点击 cell 的「编辑」修改内容，保存后写回 .ipynb（不执行代码）
        </span>
      </div>
      {cells.map((cell) => {
        const isEditing = editingIndex === cell.index
        const displaySource = isEditing ? draft : cell.source
        return (
          <div key={cell.index} className={`${previewCss.notebookCell}${cell.cell_type === 'code' ? ` ${previewCss.notebookCellCode}` : ''}`}>
            <div className={previewCss.notebookCellBar}>
              <span className={previewCss.notebookBadge}>{TYPE_LABEL[cell.cell_type] ?? cell.cell_type}</span>
              {cell.cell_type === 'code' && (
                <span className={previewCss.notebookExec}>
                  In [{cell.execution_count ?? ' '}]
                </span>
              )}
              <span className={previewCss.notebookCellBarSpacer} />
              {isEditing ? (
                <>
                  <button
                    type="button"
                    className={`${previewCss.notebookBtn} ${previewCss.notebookBtnPrimary}`}
                    onClick={() => commit(cell.index)}
                  >
                    保存 cell
                  </button>
                  <button type="button" className={previewCss.notebookBtn} onClick={cancel}>
                    取消
                  </button>
                </>
              ) : (
                <button type="button" className={previewCss.notebookBtn} onClick={() => { setDraft(displaySource); setEditingIndex(cell.index) }}>
                  编辑
                </button>
              )}
            </div>
            <CellBody
              cell={cell}
              language={language}
              editing={isEditing}
              draft={draft}
              onDraft={setDraft}
              onCommit={() => commit(cell.index)}
            />
            {cell.cell_type === 'code' && !isEditing && <CellOutputs outputs={cell.outputs} />}
          </div>
        )
      })}
      <div className={previewCss.notebookFooter} />
    </div>
  )
}
