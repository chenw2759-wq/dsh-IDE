/**
 * DOM mounting: two React roots rendered into the panel columns the layout
 * controller appends to the frame grid. The roots wait for their columns
 * (the shell mounts asynchronously), and everything is wrapped so a DOM
 * failure degrades the panels, never the GUI boot.
 * @module dsh-aionui-panel/client/mount
 */

import { createRoot, type Root } from 'react-dom/client'
import type { JSX } from 'react'
import type { PanelStores } from './store.ts'
import { useStore } from './hooks/useStore.ts'
import { ExplorerPanel } from './components/ExplorerPanel.tsx'
import { PreviewPanel } from './preview/PreviewPanel.tsx'
import { TerminalPanel } from './preview/TerminalPanel.tsx'

const EXPLORER_COL_SELECTOR = '[data-aionui-explorer-col]'
const PREVIEW_COL_SELECTOR = '[data-aionui-preview-col]'
const TERMINAL_HOST_SELECTOR = '[data-aionui-terminal-host]'

/** Terminal wrapper: follows the active project root as sessions switch. */
function TerminalMounter({ stores }: { stores: PanelStores }): JSX.Element {
  const root = useStore(stores.explorer).root
  return <TerminalPanel root={root} onClose={() => stores.layout.setTerminalOpen(false)} />
}

/** Wait for one selector (the shell/frame mounts after boot settlement). */
function waitForElement(selector: string, onFound: (el: HTMLElement) => void): () => void {
  let disposed = false
  let observer: MutationObserver | undefined
  const tryFind = (): void => {
    if (disposed) return
    const el = document.querySelector<HTMLElement>(selector)
    if (el !== null) {
      observer?.disconnect()
      onFound(el)
    }
  }
  observer = new MutationObserver(() => { tryFind() })
  observer.observe(document.body, { childList: true, subtree: true })
  tryFind()
  return () => {
    disposed = true
    observer?.disconnect()
  }
}

/**
 * Mount both panel roots.
 * @param stores - the panel store bundle.
 * @param onToggleExplorer - collapse toggle (owned by the layout controller).
 * @returns a disposer unmounting both trees.
 */
export function mountPanels(stores: PanelStores, onToggleExplorer: () => void): () => void {
  let explorerRoot: Root | undefined
  let previewRoot: Root | undefined
  let terminalRoot: Root | undefined
  const disposers: Array<() => void> = []

  disposers.push(waitForElement(EXPLORER_COL_SELECTOR, (el) => {
    explorerRoot = createRoot(el)
    explorerRoot.render(<ExplorerPanel stores={stores} onToggleCollapse={onToggleExplorer} />)
  }))
  disposers.push(waitForElement(PREVIEW_COL_SELECTOR, (el) => {
    previewRoot = createRoot(el)
    previewRoot.render(<PreviewPanel stores={stores} />)
  }))
  disposers.push(waitForElement(TERMINAL_HOST_SELECTOR, (el) => {
    terminalRoot = createRoot(el)
    terminalRoot.render(<TerminalMounter stores={stores} />)
  }))

  return () => {
    for (const dispose of disposers) dispose()
    explorerRoot?.unmount()
    previewRoot?.unmount()
    terminalRoot?.unmount()
  }
}
