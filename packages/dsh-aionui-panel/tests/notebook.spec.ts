/**
 * Notebook (.ipynb) parsing + round-trip serialization: sources edit cleanly
 * while outputs / metadata / nbformat survive untouched.
 */
import { describe, expect, it } from 'vitest'
import { parseNotebook, serializeNotebook } from '../src/client/preview/notebook.tsx'
import { renderToString } from 'react-dom/server'
import { createElement } from 'react'
import { NotebookTab } from '../src/client/preview/notebook.tsx'

const SAMPLE = JSON.stringify({
  nbformat: 4,
  nbformat_minor: 5,
  metadata: { kernelspec: { display_name: 'Python 3', language: 'python' }, language_info: { name: 'python' } },
  cells: [
    { cell_type: 'markdown', metadata: {}, source: ['# Title\n', '**bold** markdown'] },
    {
      cell_type: 'code',
      execution_count: 2,
      metadata: {},
      outputs: [
        { output_type: 'stream', name: 'stdout', text: ['42\n'] },
        { output_type: 'execute_result', execution_count: 2, data: { 'text/plain': ['42'] }, metadata: {} },
      ],
      source: ['print(', '42', ')'],
    },
  ],
})

describe('parseNotebook', () => {
  it('parses cells, joining array sources', () => {
    const parsed = parseNotebook(SAMPLE)
    if (!parsed.ok) throw new Error('expected ok')
    expect(parsed.language).toBe('python')
    expect(parsed.cells).toHaveLength(2)
    expect(parsed.cells[0].cell_type).toBe('markdown')
    expect(parsed.cells[0].source).toBe('# Title\n**bold** markdown')
    expect(parsed.cells[1].source).toBe('print(42)')
    expect(parsed.cells[1].execution_count).toBe(2)
    expect(parsed.cells[1].outputs).toHaveLength(2)
  })

  it('rejects non-JSON and non-notebook payloads', () => {
    expect(parseNotebook('not json').ok).toBe(false)
    expect(parseNotebook(JSON.stringify({ a: 1 })).ok).toBe(false)
  })
})

describe('NotebookTab render', () => {
  it('renders a sample notebook without throwing and shows markdown + code + outputs', () => {
    const html = renderToString(
      createElement(NotebookTab, { content: SAMPLE, onContentChange: () => {}, onSave: () => {} }),
    )
    expect(html).toContain('Jupyter Notebook')
    const text = html.replace(/<[^>]+>/g, '')
    expect(text).toContain('Title')
    expect(text).toContain('print(')
    expect(text).toContain('42')
    expect(html).not.toContain('Invalid')
  })

  it('shows a parse error placeholder for garbage input', () => {
    const html = renderToString(
      createElement(NotebookTab, { content: 'garbage', onContentChange: () => {}, onSave: () => {} }),
    )
    expect(html).toContain('Notebook')
  })
})

describe('serializeNotebook', () => {
  it('round-trips: edited sources land in the JSON, everything else is untouched', () => {
    const parsed = parseNotebook(SAMPLE)
    if (!parsed.ok) throw new Error('expected ok')
    const next = serializeNotebook(parsed.doc, ['# 新标题\n正文', 'print(99)'])
    const again = parseNotebook(next)
    if (!again.ok) throw new Error('re-parse failed')
    expect(again.cells[0].source).toBe('# 新标题\n正文')
    expect(again.cells[1].source).toBe('print(99)')
    // outputs + execution_count survive
    expect(again.cells[1].outputs?.[0]).toMatchObject({ output_type: 'stream' })
    expect(again.cells[1].outputs?.[1]?.data?.['text/plain']).toEqual(['42'])
    expect(again.cells[1].execution_count).toBe(2)
    // nbformat survives
    expect(again.doc.nbformat).toBe(4)
  })
})
