/**
 * Safe inline-HTML helpers shared by the markdown renderer (source → HTML) and
 * the HTML→Markdown converter (edited DOM → source). Markdown cannot express
 * color / font-size / font-family / underline natively, so the visual editor
 * persists them as a tiny, strictly-sanitized subset of inline HTML:
 * `<u>`, `<font color/face/size>`, `<span style="color|background-color|
 * font-size|font-family">`.
 *
 * Both directions go through the SAME validators here, so a value the
 * converter emits is guaranteed to parse back in the renderer, and nothing
 * the renderer emits ever contains an unsanitized attribute (the renderer
 * output feeds dangerouslySetInnerHTML, so this file is the XSS boundary).
 * @module dsh-aionui-panel/client/preview/inline-html
 */

/** Named colors allowed through (plus #hex and rgb()/rgba()). */
const NAMED_COLORS = new Set([
  'black', 'white', 'red', 'green', 'blue', 'yellow', 'orange', 'purple',
  'pink', 'brown', 'gray', 'grey', 'cyan', 'magenta', 'lime', 'navy', 'teal',
  'maroon', 'olive', 'silver', 'gold', 'violet', 'indigo', 'coral', 'tomato',
  'salmon', 'khaki', 'crimson', 'chocolate', 'azure', 'beige', 'bisque',
  'ivory', 'lavender', 'linen', 'mintcream', 'snow', 'transparent',
])

/** A safe CSS color: #rgb/#rgba hex, rgb()/rgba(), or a whitelisted name. */
export function safeColor(value: string): string | null {
  const v = value.trim()
  if (/^#[0-9a-fA-F]{3,8}$/.test(v)) return v
  if (/^rgba?\([\d\s,%.]+\)$/.test(v)) return v
  if (NAMED_COLORS.has(v.toLowerCase())) return v
  return null
}

/** A safe font size: px/pt/em/rem/% or the legacy <font size="1-7"> scale. */
export function safeFontSize(value: string): string | null {
  const v = value.trim()
  if (/^\d+(?:\.\d+)?(?:px|pt|em|rem|%)$/.test(v)) return v
  if (/^[1-7]$/.test(v)) return v
  return null
}

/** A safe font-family: any visible text without markup/quote/brace characters. */
export function safeFontFamily(value: string): string | null {
  const v = value.trim()
  if (v === '') return null
  if (/[<>"'&;{}\\]/.test(v)) return null
  return v
}

/** Escape a value for safe insertion into a double-quoted HTML attribute. */
export function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/**
 * Sanitize a CSS style string, keeping only the four style properties the
 * visual editor emits. Returns '' when nothing survives.
 */
export function safeStyle(styleText: string): string {
  const out: string[] = []
  for (const decl of styleText.split(';')) {
    const idx = decl.indexOf(':')
    if (idx === -1) continue
    const prop = decl.slice(0, idx).trim().toLowerCase()
    const val = decl.slice(idx + 1).trim()
    if (prop === 'color' || prop === 'background-color') {
      const c = safeColor(val)
      if (c !== null) out.push(`${prop}: ${c}`)
    } else if (prop === 'font-size') {
      const s = safeFontSize(val)
      if (s !== null) out.push(`font-size: ${s}`)
    } else if (prop === 'font-family') {
      const f = safeFontFamily(val)
      if (f !== null) out.push(`font-family: ${f}`)
    }
  }
  return out.join('; ')
}

/** Extract one `name="value"` attribute value from an attribute string. */
function attrValue(attrText: string, name: string): string | null {
  const re = new RegExp(`${name}\\s*=\\s*"([^"]*)"`, 'i')
  const m = re.exec(attrText)
  return m === null ? null : m[1]
}

/** Sanitize a <font ...> attribute string to only color/face/size. '' when empty. */
function safeFontAttrString(attrText: string): string {
  const parts: string[] = []
  const color = attrValue(attrText, 'color')
  if (color !== null) {
    const c = safeColor(color)
    if (c !== null) parts.push(`color="${c}"`)
  }
  const face = attrValue(attrText, 'face')
  if (face !== null) {
    const f = safeFontFamily(face)
    if (f !== null) parts.push(`face="${escapeAttr(f)}"`)
  }
  const size = attrValue(attrText, 'size')
  if (size !== null) {
    const s = safeFontSize(size)
    if (s !== null) parts.push(`size="${s}"`)
  }
  return parts.length === 0 ? '' : ` ${parts.join(' ')}`
}

/** Sanitize a <span ...> attribute string to only a safe style. '' when empty. */
function safeSpanAttrString(attrText: string): string {
  const style = attrValue(attrText, 'style')
  if (style === null) return ''
  const safe = safeStyle(style)
  return safe === '' ? '' : ` style="${escapeAttr(safe)}"`
}

/**
 * Match ONE safe inline-HTML token starting at `text[i]` (`<u>`, `<font …>`,
 * `<span …>` with a matching close tag). `renderInner` recursively renders the
 * content so markdown inside the span still works. Returns null when the text
 * is not a supported tag (the caller then falls back to escaping).
 */
export function matchInlineHtml(
  text: string,
  i: number,
  renderInner: (inner: string) => string,
): { html: string; end: number } | null {
  if (text[i] !== '<') return null
  const open = /^<(u|font|span)(\s[^>]*)?>/i.exec(text.slice(i))
  if (open === null) return null
  const tag = open[1].toLowerCase()
  const attrText = open[2] ?? ''
  const openLen = open[0].length
  let attrs = ''
  if (tag === 'u') {
    if (attrText.trim() !== '') return null // <u> carries no attributes
  } else if (tag === 'font') {
    attrs = safeFontAttrString(attrText)
    if (attrs === '') return null
  } else {
    attrs = safeSpanAttrString(attrText)
    if (attrs === '') return null
  }
  const closeTag = `</${tag}>`
  const closeIdx = text.indexOf(closeTag, i + openLen)
  if (closeIdx === -1) return null
  const inner = text.slice(i + openLen, closeIdx)
  return {
    html: `<${tag}${attrs}>${renderInner(inner)}</${tag}>`,
    end: closeIdx + closeTag.length,
  }
}

/**
 * Build the canonical inline-HTML attribute string for a DOM `<font>` element
 * (converter side). '' when the element carries no safe formatting.
 */
export function fontTagAttrs(el: Element): string {
  const parts: string[] = []
  const color = el.getAttribute('color')
  if (color !== null) {
    const c = safeColor(color)
    if (c !== null) parts.push(`color="${c}"`)
  }
  const face = el.getAttribute('face')
  if (face !== null) {
    const f = safeFontFamily(face)
    if (f !== null) parts.push(`face="${escapeAttr(f)}"`)
  }
  const size = el.getAttribute('size')
  if (size !== null) {
    const s = safeFontSize(size)
    if (s !== null) parts.push(`size="${s}"`)
  }
  return parts.length === 0 ? '' : ` ${parts.join(' ')}`
}

/** Build the canonical inline-HTML attribute string for a DOM `<span>`. */
export function spanTagAttrs(el: Element): string {
  const style = el.getAttribute('style')
  if (style === null) return ''
  const safe = safeStyle(style)
  return safe === '' ? '' : ` style="${escapeAttr(safe)}"`
}
