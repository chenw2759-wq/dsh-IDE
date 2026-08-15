/**
 * Visual-editor round-trip tests: formatting that Markdown cannot express
 * (color / font-size / font-family / underline / highlight) is persisted as a
 * sanitized inline-HTML subset and parsed back by the renderer; headings and
 * the title-with-hyphen case must not produce mojibake.
 */
import { describe, expect, it } from 'vitest'
import { renderInline, renderMarkdown } from '../src/client/preview/markdown.ts'
import { htmlToMarkdown } from '../src/client/preview/html-to-markdown.ts'
import { safeColor, safeStyle, matchInlineHtml } from '../src/client/preview/inline-html.ts'

describe('safeStyle / safeColor sanitization', () => {
  it('keeps safe colors, sizes and font families', () => {
    expect(safeColor('#ff0000')).toBe('#ff0000')
    expect(safeColor('red')).toBe('red')
    expect(safeColor('rgb(1, 2, 3)')).toBe('rgb(1, 2, 3)')
    expect(safeColor('url(javascript:x)')).toBeNull()
    expect(safeColor('red;background:black')).toBeNull()
  })

  it('drops unsafe style declarations', () => {
    expect(safeStyle('color: red; position: fixed')).toBe('color: red')
    expect(safeStyle('font-size: 20px; background-color: #fff176')).toBe('font-size: 20px; background-color: #fff176')
    expect(safeStyle('background: url(x); left: 0')).toBe('')
  })
})

describe('renderInline parses sanitized inline HTML', () => {
  it('renders u / font color / span style', () => {
    expect(renderInline('<u>下划线</u>')).toBe('<u>下划线</u>')
    expect(renderInline('<font color="#ff0000">红</font>')).toBe('<font color="#ff0000">红</font>')
    expect(renderInline('<span style="color: #00ff00">绿</span>')).toBe('<span style="color: #00ff00">绿</span>')
    expect(renderInline('<span style="font-size: 24px">大</span>')).toBe('<span style="font-size: 24px">大</span>')
  })

  it('renders markdown inside the inline HTML and drops unsafe tags', () => {
    expect(renderInline('<font color="#ff0000">红 **粗**</font>')).toBe('<font color="#ff0000">红 <strong>粗</strong></font>')
    expect(renderInline('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(renderInline('<span style="position: fixed">x</span>')).toBe('&lt;span style=&quot;position: fixed&quot;&gt;x&lt;/span&gt;')
  })
})

describe('htmlToMarkdown round-trip preserves visual formatting', () => {
  it('emits sanitized inline HTML for color / size / underline', () => {
    const md = htmlToMarkdown('<p><span style="color: rgb(255, 0, 0)">红字</span> 和 <u>下划线</u> 和 <font size="7">大字</font></p>')
    expect(md).toContain('<span style="color: rgb(255, 0, 0)">红字</span>')
    expect(md).toContain('<u>下划线</u>')
    expect(md).toContain('<font size="7">大字</font>')
  })

  it('keeps bold/italic as markdown and does not emit stray backslashes in titles', () => {
    const md = htmlToMarkdown('<h1>任务-计划书</h1><p><b>加粗</b> <i>斜体</i></p>')
    // A hyphen inside a heading is not markdown-significant: no escaping needed.
    expect(md).toContain('# 任务-计划书')
    expect(md).toContain('**加粗**')
    expect(md).toContain('*斜体*')
    // Round-trip: the title renders exactly.
    expect(renderMarkdown(md)).toContain('<h1>任务-计划书</h1>')
  })

  it('keeps a top-level heading and inline color together', () => {
    const md = htmlToMarkdown('<h2>标题</h2><p><span style="color: #ff0000">红字</span></p>')
    expect(md).toContain('## 标题')
    expect(md).toContain('<span style="color: #ff0000">红字</span>')
  })
})

describe('matchInlineHtml boundary', () => {
  it('returns null for non-whitelisted or unclosed tags', () => {
    expect(matchInlineHtml('<script>', 0, (s) => s)).toBeNull()
    expect(matchInlineHtml('<u>没有闭合', 0, (s) => s)).toBeNull()
    expect(matchInlineHtml('<span style="color:red">x</span>', 0, (s) => s)).not.toBeNull()
  })
})
