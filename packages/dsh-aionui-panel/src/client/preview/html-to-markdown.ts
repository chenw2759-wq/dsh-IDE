/**
 * A compact HTML → Markdown converter for the WYSIWYG visual editor's
 * Markdown save path. The visual editor edits the COMPILED HTML in place; when
 * the source file is Markdown, saving must convert the edited DOM back to
 * Markdown so the structure (headings / lists / code blocks / tables / links)
 * survives — otherwise the file re-renders as escaped HTML ("乱码").
 *
 * Covers the subset the panel's own markdown renderer emits: h1-h6, p, strong,
 * em, del, code/pre, a, img, ul/ol/li, blockquote, hr, table. Formatting that
 * Markdown cannot express (color / font-size / font-family / underline /
 * highlight) is persisted as a SMALL, sanitized subset of inline HTML
 * (`<u>`, `<font>`, `<span style>`), validated by inline-html.ts so the
 * renderer round-trips it exactly.
 * @module dsh-aionui-panel/client/preview/html-to-markdown
 */

import { fontTagAttrs, spanTagAttrs } from './inline-html.ts'

/** Escape text that will be interpreted as markdown syntax. */
function mdInline(text: string): string {
  return text
    .replace(/\\([\\`*{}\[\]()#+\-.!_>])/g, '$1')
    .replace(/([\\`*{}\[\]()#+.!_>])/g, '\\$1')
}

/** Inline markdown for the CHILDREN of one element (text + nested inline). */
function children(el: Element): string {
  let out = ''
  for (const child of Array.from(el.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      out += mdInline(child.textContent ?? '')
      continue
    }
    const node = child as Element
    const tag = node.tagName.toLowerCase()
    if (tag === 'br') {
      out += '  \n'
      continue
    }
    out += inline(node)
  }
  return out
}

/** Inline markdown for ONE element (its own tag plus its children). */
function inline(el: Element): string {
  const tag = el.tagName.toLowerCase()
  if (tag === 'img') {
    const src = el.getAttribute('src') ?? ''
    const alt = el.getAttribute('alt') ?? ''
    return `![${mdInline(alt)}](${src})`
  }
  const inner = children(el)
  if (tag === 'strong' || tag === 'b') return `**${inner}**`
  if (tag === 'em' || tag === 'i') return `*${inner}*`
  if (tag === 'del' || tag === 's') return `~~${inner}~~`
  if (tag === 'code') return `\`${inner}\``
  if (tag === 'a') {
    const href = el.getAttribute('href') ?? ''
    return href === '' ? inner : `[${inner}](${href})`
  }
  if (tag === 'u') return `<u>${inner}</u>`
  if (tag === 'font') {
    const attrs = fontTagAttrs(el)
    return attrs === '' ? inner : `<font${attrs}>${inner}</font>`
  }
  if (tag === 'span') {
    const attrs = spanTagAttrs(el)
    return attrs === '' ? inner : `<span${attrs}>${inner}</span>`
  }
  return inner
}

/** Convert one top-level block element to a markdown string. */
function block(el: Element): string {
  const tag = el.tagName.toLowerCase()
  if (tag === 'h1') return `# ${inline(el).trim()}`
  if (tag === 'h2') return `## ${inline(el).trim()}`
  if (tag === 'h3') return `### ${inline(el).trim()}`
  if (tag === 'h4') return `#### ${inline(el).trim()}`
  if (tag === 'h5') return `##### ${inline(el).trim()}`
  if (tag === 'h6') return `###### ${inline(el).trim()}`
  if (tag === 'hr') return '---'
  if (tag === 'blockquote') {
    return inline(el).trim().split('\n').map((line) => `> ${line}`).join('\n')
  }
  if (tag === 'pre') {
    const code = el.querySelector('code')
    // The renderer puts the language class on <pre> (e.g. <pre class="language-js">),
    // not on <code>; read both so the fence keeps its language on round-trip.
    const lang = code?.className.match(/language-([\w+-]+)/)?.[1]
      ?? el.className.match(/language-([\w+-]+)/)?.[1]
      ?? ''
    return '```' + lang + '\n' + (code?.textContent ?? el.textContent ?? '').replace(/\n$/, '') + '\n```'
  }
  if (tag === 'ul' || tag === 'ol') {
    const items = Array.from(el.children).filter((c) => c.tagName.toLowerCase() === 'li')
    return items.map((li, index) => {
      const prefix = tag === 'ol' ? `${index + 1}. ` : '- '
      return `${prefix}${inline(li).trim()}`
    }).join('\n')
  }
  if (tag === 'table') {
    const rows = Array.from(el.querySelectorAll('tr'))
    if (rows.length === 0) return ''
    const parseRow = (tr: Element): string[] => Array.from(tr.children).map((c) => inline(c).trim().replace(/\|/g, '\\|'))
    const header = parseRow(rows[0])
    const sep = header.map(() => '---').join(' | ')
    const bodyRows = rows.slice(1).map((tr) => parseRow(tr).join(' | '))
    return [header.join(' | '), sep, ...bodyRows].join('\n')
  }
  // p / li / formatting element / anything else: plain paragraph content.
  return inline(el).trim()
}

/** Convert a compiled HTML fragment to Markdown. */
export function htmlToMarkdown(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const out: string[] = []
  for (const child of Array.from(doc.body.children)) {
    const text = block(child)
    if (text === '') continue
    out.push(text)
  }
  return out.join('\n\n').trim() + '\n'
}
