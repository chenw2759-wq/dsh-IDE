/**
 * Selection-format state for the WYSIWYG toolbars (markdown visual / HTML
 * iframe / office): queries the browser's `queryCommandState` (bold / italic /
 * underline / align) and walks the selection's ancestor chain for explicit
 * color / highlight, so the toolbar can light up the button that matches the
 * current formatting — exactly like Word's active formatting buttons.
 * @module dsh-aionui-panel/client/preview/formats
 */

/** The format state of the current selection. */
export interface ActiveFormats {
  bold: boolean
  italic: boolean
  underline: boolean
  justifyLeft: boolean
  justifyCenter: boolean
  justifyRight: boolean
  /** The selection carries an explicit text color (font color / span color). */
  foreColor: boolean
  /** The selection carries an explicit highlight (background color). */
  hiliteColor: boolean
}

/** The empty (nothing-selected / nothing-formatted) state. */
export const EMPTY_FORMATS: ActiveFormats = {
  bold: false,
  italic: false,
  underline: false,
  justifyLeft: false,
  justifyCenter: false,
  justifyRight: false,
  foreColor: false,
  hiliteColor: false,
}

/** Does one inline style declaration list contain the exact property name
 *  (`color` must not match `background-color`). */
function styleHasProp(style: string, prop: string): boolean {
  for (const decl of style.split(';')) {
    const colon = decl.indexOf(':')
    if (colon < 0) continue
    if (decl.slice(0, colon).trim() === prop) return true
  }
  return false
}

/** Walk up from the selection's common ancestor looking for an explicit inline
 *  `color` / `background-color` (from `<font color>` or `style="…"`). The
 *  computed `queryCommandValue('foreColor')` is NOT used: it returns the
 *  inherited default color for uncolored text, so it can't tell "explicitly
 *  colored" from "default". */
function hasExplicitStyle(doc: Document, prop: 'color' | 'background-color'): boolean {
  try {
    const sel = doc.getSelection()
    if (sel === null || sel.rangeCount === 0) return false
    const range = sel.getRangeAt(0)
    let node: Node | null = range.commonAncestorContainer
    if (node.nodeType === Node.TEXT_NODE) node = node.parentNode
    while (node !== null && node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element
      if (prop === 'color' && el.tagName === 'FONT' && (el.getAttribute('color') ?? '') !== '') return true
      const style = el.getAttribute('style') ?? ''
      if (styleHasProp(style, prop)) return true
      node = el.parentNode
    }
  } catch {
    // fall through to false
  }
  return false
}

/** Query one document's selection format state (never throws). */
export function queryFormats(doc: Document): ActiveFormats {
  try {
    return {
      bold: doc.queryCommandState('bold'),
      italic: doc.queryCommandState('italic'),
      underline: doc.queryCommandState('underline'),
      justifyLeft: doc.queryCommandState('justifyLeft'),
      justifyCenter: doc.queryCommandState('justifyCenter'),
      justifyRight: doc.queryCommandState('justifyRight'),
      foreColor: hasExplicitStyle(doc, 'color'),
      hiliteColor: hasExplicitStyle(doc, 'background-color'),
    }
  } catch {
    return EMPTY_FORMATS
  }
}

/** True when a fontSize value is an exact CSS size (px/pt/em/rem/%). */
export function isExactSize(value: string): boolean {
  return /^(?:\d+(?:\.\d+)?)(px|pt|em|rem|%)$/.test(value)
}

/** Wrap the selection in a span carrying the exact font size. The legacy
 *  <font size="1-7"> scale (and Chrome's CSS keyword sizes) are lossy, so exact
 *  px/pt sizes need a manual span wrap. */
export function applyExactFontSize(doc: Document, value: string): void {
  const sel = doc.getSelection()
  if (sel === null || sel.rangeCount === 0 || sel.isCollapsed) return
  const range = sel.getRangeAt(0)
  const span = doc.createElement('span')
  span.style.fontSize = value
  span.appendChild(range.extractContents())
  range.insertNode(span)
  const reselect = doc.createRange()
  reselect.selectNodeContents(span)
  sel.removeAllRanges()
  sel.addRange(reselect)
}
