/**
 * Preview content routing: the renderers for every content type plus the
 * split-screen editor|preview layout. View mode (source/preview) resets to
 * preview when the displayed FILE changes (keyed on path+type, not tab id —
 * AionUi contract), and the split ratio is persisted under
 * preview-panel-split-ratio with a 20..80 clamp.
 * @module dsh-aionui-panel/client/preview/content
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { JSX } from 'react'
import hljs from 'highlight.js'
import type { PreviewTabState } from '../store.ts'
import { useResizableSplit } from '../hooks/useResizableSplit.ts'
import { t } from '../locales.ts'
import { hljsLanguageOf } from '../fileType.ts'
import { renderMarkdown, resolveMarkdownImage } from './markdown.ts'
import previewCss from '../styles/preview.module.css'

/** Escape text for safe injection into a <pre><code> highlight layer. */
function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** Cap above which highlighting is skipped (very large files fall back to plain text). */
const HIGHLIGHT_CAP = 200_000

/** Highlight one text (escaped fallback on unknown language or oversize). */
function highlightHtml(content: string, language: string | undefined): string {
  if (language === undefined || content.length > HIGHLIGHT_CAP) return escapeHtml(content)
  try {
    if (hljs.getLanguage(language) === undefined) return escapeHtml(content)
    return hljs.highlight(content, { language }).value
  } catch {
    return escapeHtml(content)
  }
}

/** Split-ratio persistence key (AionUi contract). */
export const KEY_SPLIT_RATIO = 'preview-panel-split-ratio'

/** The rendered content of one tab (viewMode/split are controlled by the panel). */
export function TabContent({
  tab,
  viewMode,
  split,
  onContentChange,
  onSave,
  onEditDiffContent,
  onSaveEditDiff,
}: {
  tab: PreviewTabState
  viewMode: 'source' | 'preview'
  split: boolean
  onContentChange: (content: string) => void
  onSave: () => void
  /** Edit-diff tabs: live-edit the latest content and save it back to disk. */
  onEditDiffContent?: (id: string, text: string) => void
  onSaveEditDiff?: (id: string) => void
}): JSX.Element {
  if (tab.error !== null) {
    return <div className={previewCss.placeholder}>
      <div className={previewCss.placeholderTitle}>{tab.title}</div>
      <div className={previewCss.placeholderError}>{tab.error}</div>
    </div>
  }

  const editable = tab.contentType === 'markdown' || tab.contentType === 'html'
    || tab.contentType === 'code' || tab.contentType === 'csv' || tab.contentType === 'text'

  // Split screen: editable types only; editor | preview with a ratio handle.
  if (split && editable) {
    return (
      <SplitPane
        tab={tab}
        onContentChange={onContentChange}
        onSave={onSave}
      />
    )
  }

  return (
    <div className={previewCss.content}>
      {tab.truncated && tab.content !== null && (
        <div className={previewCss.truncatedNote}>{t('preview.errorOversized')}</div>
      )}
      {tab.contentType === 'markdown' && tab.content !== null && (
        <MarkdownViewer
          content={tab.content}
          root={tab.root}
          path={tab.path}
          sourceMode={viewMode === 'source'}
          onContentChange={onContentChange}
        />
      )}
      {tab.contentType === 'html' && tab.content !== null && (
        <HtmlViewer
          content={tab.content}
          sourceMode={viewMode === 'source'}
          onContentChange={onContentChange}
        />
      )}
      {(tab.contentType === 'code' || tab.contentType === 'text') && tab.content !== null && (
        <CodeEditor
          content={tab.content}
          onContentChange={onContentChange}
          onSave={onSave}
          language={hljsLanguageOf(tab.path)}
        />
      )}
      {tab.contentType === 'csv' && tab.content !== null && <CsvViewer content={tab.content} />}
      {tab.contentType === 'diff' && tab.content !== null && (
        <DiffViewer
          content={tab.content}
          path={tab.path}
          editContent={tab.editContent}
          onEdit={(text) => onEditDiffContent?.(tab.id, text)}
          onSaveEdit={() => onSaveEditDiff?.(tab.id)}
        />
      )}
      {tab.contentType === 'image' && tab.content !== null && (
        <ImageViewer src={tab.content} meta={`${tab.image?.width ?? ''}${tab.image ? ' x ' : ''}${tab.image?.height ?? ''}`} />
      )}
      {tab.contentType === 'pdf' && tab.content !== null && <PdfViewer dataUrl={tab.content} title={tab.title} />}
      {tab.contentType === 'url' && <UrlViewer tab={tab} />}
      {(tab.contentType === 'word' || tab.contentType === 'excel' || tab.contentType === 'ppt' || tab.contentType === 'unsupported') && (
        <UnsupportedViewer tab={tab} />
      )}
      {tab.content === null && !tab.loading && (
        <div className={previewCss.placeholder}>
          <div className={previewCss.placeholderTitle}>{tab.title}</div>
          <div className={previewCss.placeholderMeta}>{t('preview.downloadHint')}</div>
        </div>
      )}
      {tab.loading && <div className={previewCss.placeholder}>{t('scm.loading')}</div>}
    </div>
  )
}

/** Split screen: textarea editor | rendered preview, ratio persisted. */
function SplitPane({
  tab,
  onContentChange,
  onSave,
}: {
  tab: PreviewTabState
  onContentChange: (content: string) => void
  onSave: () => void
}): JSX.Element {
  const { width: splitRatio, handleProps } = useResizableSplit({
    unit: 'ratio',
    defaultWidth: 50,
    minWidth: 20,
    maxWidth: 80,
    storageKey: KEY_SPLIT_RATIO,
  })
  const content = tab.content ?? ''

  return (
    <div className={previewCss.splitPane}>
      <div className={previewCss.splitPaneLeft} style={{ width: `${splitRatio}%` }}>
        <div className={previewCss.splitHeader}>{t('preview.editor')}</div>
        <div className={previewCss.splitBody}>
          <CodeEditor
            content={content}
            onContentChange={onContentChange}
            onSave={onSave}
            language={hljsLanguageOf(tab.path)}
          />
        </div>
      </div>
      <div
        className={previewCss.splitHandle}
        data-reverse="false"
        style={{ left: `calc(${splitRatio}% - 6px)` }}
        {...handleProps}
      />
      <div className={previewCss.splitPaneRight} style={{ width: `${100 - splitRatio}%` }}>
        <div className={previewCss.splitHeader}>{t('preview.preview')}</div>
        <div className={previewCss.splitBody}>
          {tab.contentType === 'markdown' && <MarkdownViewer content={content} root={tab.root} path={tab.path} />}
          {tab.contentType === 'html' && <HtmlViewer content={content} />}
          {tab.contentType === 'csv' && <CsvViewer content={content} />}
          {tab.contentType === 'code' && <CodeViewer content={content} language={tab.title.split('.').pop() ?? ''} />}
        </div>
      </div>
    </div>
  )
}

/** Markdown viewer with an optional source mode (textarea). */
function MarkdownViewer({
  content,
  root,
  path,
  sourceMode = false,
  onContentChange,
}: {
  content: string
  /** Project root of the markdown file (image srcs resolve against it). */
  root: string
  /** The markdown file's workspace-relative path (image dir base). */
  path: string
  sourceMode?: boolean
  onContentChange?: (content: string) => void
}): JSX.Element {
  const resolveImageSrc = useCallback((src: string): string | null => {
    if (root === '' || path === '') return null
    const resolution = resolveMarkdownImage(path, src)
    if (resolution.kind === 'absolute') return src
    if (resolution.kind === 'escape') return null
    // Workspace-relative target: serve the bytes through the host raw route
    // (same origin as the GUI), preserving any ?query#fragment suffix.
    return `/aionui-panel/raw?root=${encodeURIComponent(root)}&path=${encodeURIComponent(resolution.path)}${resolution.suffix}`
  }, [root, path])
  const html = useMemo(
    () => renderMarkdown(content, { resolveImageSrc }),
    [content, resolveImageSrc],
  )
  if (sourceMode && onContentChange !== undefined) {
    return (
      <div className={previewCss.content}>
        <textarea
          className={previewCss.textEditor}
          value={content}
          spellCheck={false}
          onChange={(event) => onContentChange(event.target.value)}
        />
      </div>
    )
  }
  return <div className={previewCss.mdViewer} dangerouslySetInnerHTML={{ __html: html }} />
}

/** HTML viewer: sandboxed iframe (scripts off) or source textarea. */
function HtmlViewer({
  content,
  sourceMode = false,
  onContentChange,
}: {
  content: string
  sourceMode?: boolean
  onContentChange?: (content: string) => void
}): JSX.Element {
  const srcDoc = useMemo(() => {
    // Base styles so the embedded page inherits the theme background.
    return `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;font-family:-apple-system,"system-ui","Segoe UI",Roboto,"PingFang SC",sans-serif;color:#1d2129}@media (prefers-color-scheme:dark){body{color:rgba(255,255,255,0.9)}}</style></head><body>${content}</body></html>`
  }, [content])
  if (sourceMode && onContentChange !== undefined) {
    return (
      <div className={previewCss.content}>
        <textarea
          className={previewCss.textEditor}
          value={content}
          spellCheck={false}
          onChange={(event) => onContentChange(event.target.value)}
        />
      </div>
    )
  }
  return (
    <div className={previewCss.content}>
      <Zoomable>
        <iframe className={previewCss.htmlFrame} srcDoc={srcDoc} sandbox="" title="html preview" />
      </Zoomable>
    </div>
  )
}

/** Syntax-highlighted read-only code viewer (split preview side). */
function CodeViewer({ content, language }: { content: string; language: string }): JSX.Element {
  const html = useMemo(() => highlightHtml(content, hljsLanguageOf(language)), [content, language])
  return (
    <div className={previewCss.codeViewer}>
      <pre className={previewCss.codeHighlight} aria-hidden="true">
        <code dangerouslySetInnerHTML={{ __html: html }} />
      </pre>
    </div>
  )
}

/**
 * A read-write code editor: a numbered gutter plus an editable textarea whose
 * background paints the zebra stripes, so every line keeps an alternating
 * tint even while typing (JupyterLab/Trae-style). A syntax-highlight layer
 * sits BEHIND a transparent-text textarea, so the caret/selection stay native
 * while the code renders in full color. Gutter, highlight layer and textarea
 * share one line-height; scroll stays in sync through refs.
 */
export function CodeEditor({
  content,
  onContentChange,
  onSave,
  language,
}: {
  content: string
  onContentChange: (content: string) => void
  onSave: () => void
  /** highlight.js language id (undefined = plain text). */
  language?: string
}): JSX.Element {
  const lineCount = useMemo(() => content.split('\n').length, [content])
  const gutterRef = useRef<HTMLDivElement>(null)
  const highlightRef = useRef<HTMLPreElement>(null)
  const html = useMemo(() => highlightHtml(content, language), [content, language])

  const syncScroll = (event: React.UIEvent<HTMLTextAreaElement>): void => {
    const { scrollTop, scrollLeft } = event.currentTarget
    if (gutterRef.current !== null) gutterRef.current.scrollTop = scrollTop
    if (highlightRef.current !== null) {
      highlightRef.current.scrollTop = scrollTop
      highlightRef.current.scrollLeft = scrollLeft
    }
  }

  return (
    <div className={previewCss.codeEditor}>
      <div ref={gutterRef} className={previewCss.codeEditorGutter} aria-hidden="true">
        {Array.from({ length: lineCount }, (_, index) => (
          <div key={index} className={previewCss.codeEditorLineNo}>{index + 1}</div>
        ))}
      </div>
      <div className={previewCss.codeEditorBody}>
        <pre ref={highlightRef} className={previewCss.codeHighlight} aria-hidden="true">
          <code dangerouslySetInnerHTML={{ __html: html + '\n' }} />
        </pre>
        <textarea
          className={`${previewCss.textEditor} ${previewCss.editorTransparent}`}
          value={content}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          onChange={(event) => onContentChange(event.target.value)}
          onScroll={syncScroll}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === 's') {
              event.preventDefault()
              onSave()
            }
          }}
        />
      </div>
    </div>
  )
}

/** CSV table. */
function CsvViewer({ content }: { content: string }): JSX.Element {
  const rows = useMemo(() => parseCsv(content), [content])
  return (
    <div className={previewCss.csvViewer}>
      <table className={previewCss.csvTable}>
        {rows.map((row, index) => (
          <tr key={index}>
            {row.map((cell, cellIndex) => (
              index === 0
                ? <th key={cellIndex}>{cell}</th>
                : <td key={cellIndex}>{cell}</td>
            ))}
          </tr>
        ))}
      </table>
    </div>
  )
}

/** Parse CSV lines (quoted cells with escaped quotes). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          cell += '"'
          i += 1
        } else {
          inQuotes = false
        }
      } else {
        cell += char
      }
      continue
    }
    if (char === '"') {
      inQuotes = true
      continue
    }
    if (char === ',') {
      row.push(cell)
      cell = ''
      continue
    }
    if (char === '\n') {
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
      continue
    }
    if (char !== '\r') cell += char
  }
  row.push(cell)
  if (row.length > 1 || row[0] !== '') rows.push(row)
  return rows
}

/** Claude Code-style diff line: gutter line numbers + tinted content. */
interface DiffRow {
  kind: 'meta' | 'hunk' | 'del' | 'add' | 'same'
  /** Old-side line number (deletions/context). */
  oldNo: number | null
  /** New-side line number (additions/context). */
  newNo: number | null
  text: string
}

/** Parse unified diff lines into rows with hunk-aware line numbers. */
function parseDiffRows(content: string): DiffRow[] {
  const lines = content.split('\n')
  const rows: DiffRow[] = []
  let oldNo = 0
  let newNo = 0
  for (const line of lines) {
    if (line.startsWith('+++') || line.startsWith('---') || line.startsWith('diff ') || line.startsWith('index ')) {
      rows.push({ kind: 'meta', oldNo: null, newNo: null, text: line })
      continue
    }
    if (line.startsWith('@@')) {
      // @@ -oldStart,oldCount +newStart,newCount @@
      const m = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line)
      oldNo = m === null ? 0 : Number(m[1]) - 1
      newNo = m === null ? 0 : Number(m[2]) - 1
      rows.push({ kind: 'hunk', oldNo: null, newNo: null, text: line })
      continue
    }
    if (line.startsWith('+')) {
      newNo += 1
      rows.push({ kind: 'add', oldNo: null, newNo, text: line.slice(1) })
      continue
    }
    if (line.startsWith('-')) {
      oldNo += 1
      rows.push({ kind: 'del', oldNo, newNo: null, text: line.slice(1) })
      continue
    }
    // Context line (space prefix or plain).
    oldNo += 1
    newNo += 1
    rows.push({ kind: 'same', oldNo, newNo, text: line.startsWith(' ') ? line.slice(1) : line })
  }
  return rows
}

/** Unified diff viewer with a Claude Code-style Update card header:
 *  file path + Added/Removed stats, numbered gutter, red-delete /
 *  green-add lines. When editContent is provided, a live-editable code area
 *  (the LATEST disk content) sits under the diff — edit it and save; the
 *  write re-diffs the file so the red/green card stays alive. */
function DiffViewer({
  content,
  path,
  editContent,
  onEdit,
  onSaveEdit,
}: {
  content: string
  path?: string
  editContent?: string
  onEdit?: (text: string) => void
  onSaveEdit?: () => void
}): JSX.Element {
  const lines = content.split('\n')
  let added = 0
  let removed = 0
  for (const line of lines) {
    if (line.startsWith('+') && !line.startsWith('+++')) added += 1
    else if (line.startsWith('-') && !line.startsWith('---')) removed += 1
  }
  const rows = useMemo(() => parseDiffRows(content), [content])
  const showGutter = rows.some((row) => row.oldNo !== null || row.newNo !== null)
  const gutterWidth = showGutter ? 64 : 0
  const [editorOpen, setEditorOpen] = useState(editContent !== undefined && added === 0 && removed > 0)
  const editable = editContent !== undefined && onEdit !== undefined && onSaveEdit !== undefined
  // EDIT MODE: the editor COVERS the whole preview box (the diff view is
  // hidden behind it) — clicking edit must give you the full frame to type
  // in, not a second pane squeezed under the diff.
  if (editable && editorOpen) {
    return (
      <div className={previewCss.diffViewer}>
        <div className={previewCss.diffEditorFull}>
          <div className={previewCss.diffEditorHeader}>
            <span className={previewCss.diffEditorTitle}>
              {path !== undefined ? `Update(${path})` : 'Update'} — {t('preview.editor')}
            </span>
            <span className={previewCss.diffEditorActions}>
              <button
                className={previewCss.diffEditBack}
                onClick={() => setEditorOpen(false)}
                type="button"
              >
                返回 diff
              </button>
              <button
                className={previewCss.diffEditSave}
                onClick={() => onSaveEdit?.()}
                type="button"
              >
                {t('preview.save')}
              </button>
            </span>
          </div>
          <CodeEditor
            content={editContent ?? ''}
            onContentChange={(text) => onEdit?.(text)}
            onSave={() => onSaveEdit?.()}
            language={hljsLanguageOf(path ?? '')}
          />
        </div>
      </div>
    )
  }
  return (
    <div className={previewCss.diffViewer}>
      {(added > 0 || removed > 0) && (
        <div className={previewCss.diffCard}>
          <span className={previewCss.diffCardTitle}>
            <span className={previewCss.diffCardDot}>●</span>
            {path !== undefined ? `Update(${path})` : 'Update'}
          </span>
          <span className={previewCss.diffCardStats}>
            <span className={previewCss.diffCardAdded}>Added {added} line{added === 1 ? '' : 's'}</span>
            <span className={previewCss.diffCardRemoved}>removed {removed} line{removed === 1 ? '' : 's'}</span>
          </span>
          {editable && (
            <button
              className={previewCss.diffEditToggle}
              onClick={() => setEditorOpen(true)}
              type="button"
            >
              编辑最新版本
            </button>
          )}
        </div>
      )}
      {rows.map((row, index) => {
        let className = previewCss.diffLine
        if (row.kind === 'meta') className = previewCss.diffLineMeta
        else if (row.kind === 'hunk') className = previewCss.diffLineHunk
        else if (row.kind === 'add') className = previewCss.diffLineAdd
        else if (row.kind === 'del') className = previewCss.diffLineDel
        else if (index % 2 === 1) className = `${previewCss.diffLine} ${previewCss.diffZebra}`
        const hasNumbers = row.oldNo !== null || row.newNo !== null
        return (
          <div key={index} className={className} style={hasNumbers ? { paddingLeft: gutterWidth } : undefined}>
            {showGutter && (
              <span
                className={previewCss.diffGutter}
                style={{ left: 8, width: gutterWidth - 16, position: 'absolute' }}
              >
                {/* Two fixed columns (old/new) so numbers line up across rows:
                    same rows show both, adds only the new column, dels only
                    the old column. */}
                <span className={previewCss.diffGutterCol}>{row.oldNo ?? ''}</span>
                <span className={previewCss.diffGutterCol}>{row.newNo ?? ''}</span>
              </span>
            )}
            <span className={previewCss.diffMark}>
              {row.kind === 'add' ? '+' : row.kind === 'del' ? '-' : row.kind === 'hunk' ? '@' : '\u00a0'}
            </span>
            <span className={previewCss.diffText}>{row.text === '' ? '\u00a0' : row.text}</span>
          </div>
        )
      })}
    </div>
  )
}

/** Image viewer with zoom (toolbar + ctrl+wheel). */
function ImageViewer({ src, meta }: { src: string; meta: string }): JSX.Element {
  return (
    <div className={previewCss.content}>
      <Zoomable>
        <img src={src} alt="" style={{ display: 'block', maxWidth: 'none' }} />
      </Zoomable>
      {meta.trim() !== '' && <div className={previewCss.imageMeta}>{meta}</div>}
    </div>
  )
}

/**
 * Zoom wrapper for visual previews (images, HTML): a small toolbar
 * (− / % / + / 1:1 / fit-width) plus Ctrl+wheel zooming. The content is
 * wrapped in a scale transform inside an auto-scrolling body, so zoomed
 * overflow scrolls naturally.
 */
function Zoomable({ children }: { children: React.ReactNode }): JSX.Element {
  const [scale, setScale] = useState(1)
  const bodyRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  const fit = useCallback((): void => {
    const body = bodyRef.current
    const content = contentRef.current
    if (body === null || content === null) return
    const natural = content.scrollWidth
    if (natural <= 0) return
    const fitScale = Math.max(0.25, Math.min(4, (body.clientWidth - 24) / natural))
    setScale((s) => (Math.abs(s - fitScale) < 0.01 ? s : fitScale))
  }, [])

  useEffect(() => {
    // Fit once on mount only: a persistent ResizeObserver would re-fit when
    // the scrollbars appear/disappear as the user zooms, overriding their
    // manual scale. Manual zoom stays until the user clicks 适应 again.
    fit()
  }, [fit])

  const zoomBy = (delta: number): void => {
    setScale((s) => Math.round(Math.min(4, Math.max(0.25, s + delta)) * 100) / 100)
  }

  return (
    <div className={previewCss.zoomWrap}>
      <div className={previewCss.zoomBar}>
        <button type="button" className={previewCss.zoomBtn} onClick={() => zoomBy(-0.25)} title={t('preview.zoomOut')}>−</button>
        <span className={previewCss.zoomPct}>{Math.round(scale * 100)}%</span>
        <button type="button" className={previewCss.zoomBtn} onClick={() => zoomBy(0.25)} title={t('preview.zoomIn')}>+</button>
        <button type="button" className={previewCss.zoomBtn} onClick={() => setScale(1)} title={t('preview.zoomReset')}>1:1</button>
        <button type="button" className={previewCss.zoomBtn} onClick={fit} title={t('preview.zoomFit')}>{t('preview.zoomFitShort')}</button>
      </div>
      <div
        ref={bodyRef}
        className={previewCss.zoomBody}
        onWheel={(event) => {
          if (!event.ctrlKey) return
          event.preventDefault()
          zoomBy(event.deltaY < 0 ? 0.1 : -0.1)
        }}
      >
        <div ref={contentRef} style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}>
          {children}
        </div>
      </div>
    </div>
  )
}

/** PDF viewer (blob iframe). */
function PdfViewer({ dataUrl, title }: { dataUrl: string; title: string }): JSX.Element {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!dataUrl.startsWith('data:')) {
      setUrl(null)
      return
    }
    const blob = dataUrlToBlob(dataUrl)
    if (blob === null) {
      setUrl(null)
      return
    }
    const objectUrl = URL.createObjectURL(blob)
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [dataUrl])
  return url === null
    ? <div className={previewCss.placeholder}>{t('preview.unsupported')}</div>
    : <iframe className={previewCss.pdfViewer} src={url} title={title} />
}

/** Convert a data URL to a Blob (null on failure). */
export function dataUrlToBlob(dataUrl: string): Blob | null {
  const comma = dataUrl.indexOf(',')
  if (comma === -1) return null
  const meta = dataUrl.slice(0, comma)
  const mime = /data:([^;]+)/.exec(meta)?.[1] ?? 'application/octet-stream'
  try {
    const binary = atob(dataUrl.slice(comma + 1))
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
    return new Blob([bytes], { type: mime })
  } catch {
    return null
  }
}

/** URL tab: address bar + iframe. */
function UrlViewer({ tab }: { tab: PreviewTabState }): JSX.Element {
  const [input, setInput] = useState(tab.content ?? '')
  const [url, setUrl] = useState(() => normalizeUrl(tab.content ?? ''))
  const frameRef = useRef<HTMLIFrameElement>(null)
  useEffect(() => {
    setInput(tab.content ?? '')
    setUrl(normalizeUrl(tab.content ?? ''))
  }, [tab.id, tab.content])

  // The frame is sandboxed WITH allow-popups: sites like bilibili hardcode
  // target=_blank on their nav links, so popups are permitted rather than
  // silently dropped. allow-same-origin is intentionally OMITTED, so the
  // embedded site runs in an OPAQUE origin: it cannot reach window.parent or
  // touch same-origin storage, which also means localStorage access inside
  // the frame throws. The load guard and normalizeUrl's same-origin block
  // remain as defense-in-depth for any frame that still lands on the GUI
  // origin.
  const guardFrameNavigation = (): void => {
    const frame = frameRef.current
    if (frame === null) return
    try {
      const href = frame.contentWindow?.location.href
      if (href !== undefined && !href.startsWith('about:') && new URL(href).origin === window.location.origin) {
        frame.src = 'about:blank'
      }
    } catch {
      // Cross-origin frame: nothing to guard.
    }
  }

  return (
    <div className={previewCss.content}>
      <div className={previewCss.urlBar}>
        <input
          className={previewCss.urlInput}
          value={input}
          placeholder={t('preview.url.placeholder')}
          spellCheck={false}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') setUrl(normalizeUrl(input))
            if (event.key === 'Escape') {
              setInput(tab.content ?? '')
              setUrl(normalizeUrl(tab.content ?? ''))
            }
          }}
          onFocus={(event) => event.currentTarget.select()}
        />
      </div>
      <iframe
        // Keyed on url + reloadNonce: a refresh (or a new address) remounts
        // the frame, which re-navigates it — cross-origin documents cannot
        // be reloaded in place from the parent, and re-setting the src
        // attribute does not re-navigate when the value is unchanged.
        key={`${url}\u0000${tab.reloadNonce ?? 0}`}
        ref={frameRef}
        className={previewCss.urlFrame}
        src={url}
        title={tab.title}
        sandbox="allow-scripts allow-forms allow-popups"
        allow="autoplay; fullscreen; picture-in-picture; encrypted-media; clipboard-write"
        allowFullScreen
        onLoad={guardFrameNavigation}
      />
    </div>
  )
}

/** Bare domains get https://; whitespace queries go to a search engine. */
export function normalizeUrl(input: string): string {
  const trimmed = input.trim()
  if (trimmed === '') return 'about:blank'
  if (/\s/.test(trimmed)) return `https://www.bing.com/search?q=${encodeURIComponent(trimmed)}`
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  // Never embed a URL that points back at the harness host: the url frame
  // runs with allow-scripts + allow-same-origin, so a same-origin page there
  // could reach the shell document (the onLoad guard resets indirect
  // same-origin navigations, but a directly typed address must not land at
  // all). Degrade it instead.
  if (typeof window !== 'undefined') {
    try {
      if (new URL(candidate).origin === window.location.origin) return 'about:blank'
    } catch {
      // Malformed URL: fall through and return the best-effort candidate.
    }
  }
  return candidate
}

/** Office / unsupported placeholder. */
function UnsupportedViewer({ tab }: { tab: PreviewTabState }): JSX.Element {
  return (
    <div className={previewCss.placeholder}>
      <div className={previewCss.placeholderTitle}>{tab.title}</div>
      <div className={previewCss.placeholderMeta}>{t('preview.unsupported')}</div>
      <div className={previewCss.placeholderMeta}>{t('preview.downloadHint')}</div>
    </div>
  )
}
