/**
 * A compact HTML → Markdown converter for the WYSIWYG visual editor's
 * Markdown save path. The visual editor edits the COMPILED HTML in place; when
 * the source file is Markdown, saving must convert the edited DOM back to
 * Markdown so the structure (headings / lists / code blocks / tables / links)
 * survives — otherwise the file re-renders as escaped HTML ("乱码").
 *
 * Covers the subset the panel's own markdown renderer emits: h1-h6, p, strong,
 * em, del, code/pre, a, img, ul/ol/li, blockquote, hr, table. Styles markdown
 * cannot express (color / font-size / background) are dropped — a documented
 * limit.
 * @module dsh-aionui-panel/client/preview/html-to-markdown
 */

/** Escape text that will be interpreted as markdown syntax. */
function mdInline(text: string): string {
  return text
    .replace(/\\([\\`*{}\[\]()#+\-.!_>])/g, '$1')
    .replace(/([\\`*{}\[\]()#+.!_>])/g, '\\$1')
}

/** Inline formatting for one text-ish element. */
function inline(el: Element): string {
  let out = ''
  for (const child of Array.from(el.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      out += mdInline(child.textContent ?? '')
      continue
    }
    const node = child as Element
    const tag = node.tagName.toLowerCase()
    const inner = inline(node)
    if (tag === 'strong' || tag === 'b') out += `**${inner}**`
    else if (tag === 'em' || tag === 'i') out += `*${inner}*`
    else if (tag === 'del' || tag === 's') out += `~~${inner}~~`
    else if (tag === 'code') out += `\`${inner}\``
    else if (tag === 'a') {
      const href = node.getAttribute('href') ?? ''
      out += href === '' ? inner : `[${inner}](${href})`
    } else if (tag === 'img') {
      const src = node.getAttribute('src') ?? ''
      const alt = node.getAttribute('alt') ?? ''
      out += `![${mdInline(alt)}](${src})`
    } else if (tag === 'br') {
      out += '  \n'
    } else {
      out += inner
    }
  }
  return out
}

/** Convert one top-level block element to a markdown string. */
function block(el: Element, listKind: 'ul' | 'ol' | null): string {
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
      const text = inline(li).trim()
      return `${prefix}${text}`
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
  // p / li / anything else: plain paragraph (list items handled by parent)
  return inline(el).trim()
}

/** Convert a compiled HTML fragment to Markdown. */
export function htmlToMarkdown(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const out: string[] = []
  for (const child of Array.from(doc.body.children)) {
    const tag = child.tagName.toLowerCase()
    const text = block(child, null)
    if (text === '') continue
    out.push(text)
  }
  return out.join('\n\n').trim() + '\n'
}
