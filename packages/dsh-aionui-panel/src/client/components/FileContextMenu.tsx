/**
 * FileContextMenu: the explorer right-click menu — download / rename / copy /
 * paste / delete for one tree node. Download streams the file through the
 * host raw route (works for local and SSH-mode roots); copy/paste keep a
 * clipboard path in the panel store.
 * @module dsh-aionui-panel/client/components/FileContextMenu
 */

import { useEffect, useRef, type JSX } from 'react'
import { t } from '../locales.ts'
import type { PanelApi } from '../api.ts'
import type { PanelStores } from '../store.ts'
import explorerCss from '../styles/explorer.module.css'

/** One open menu. */
export interface FileMenuState {
  x: number
  y: number
  /** Root-relative path of the clicked node ('' = the root itself). */
  path: string
  isDir: boolean
}

/** Module-level clipboard: the copied path (rel to the same root). */
let clipboard: { root: string; path: string; isDir: boolean } | null = null

/** The menu + its actions. */
export function FileContextMenu({
  menu,
  stores,
  api,
  onClose,
  onRenameInline,
}: {
  menu: FileMenuState
  stores: PanelStores
  api: PanelApi
  onClose: () => void
  /** Request an inline rename row for the target instead of a prompt. */
  onRenameInline?: (path: string, isDir: boolean) => void
}): JSX.Element {
  const ref = useRef<HTMLDivElement>(null)
  const root = stores.explorer.getSnapshot().root

  // Close on outside click / Escape.
  useEffect(() => {
    const onDown = (event: MouseEvent): void => {
      if (ref.current !== null && !ref.current.contains(event.target as Node)) onClose()
    }
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  /** Re-fetch the current dir (the parent of the target). */
  const refresh = (): void => {
    void stores.explorer.handleFsChange()
  }

  /** The directory new entries land in (the clicked dir, or the parent). */
  const targetDir = (): string => {
    if (menu.isDir) return menu.path
    return menu.path.includes('/') ? menu.path.slice(0, menu.path.lastIndexOf('/')) : ''
  }

  const createFile = (): void => {
    onClose()
    const name = window.prompt(t('explorer.newFilePrompt'))
    if (name === null || name.trim() === '') return
    const dir = targetDir()
    const path = dir === '' ? name.trim() : `${dir}/${name.trim()}`
    void api.write(root, path, '').then((result) => {
      if (result.ok) refresh()
    })
  }

  const createFolder = (): void => {
    onClose()
    const name = window.prompt(t('explorer.newFolderPrompt'))
    if (name === null || name.trim() === '') return
    const dir = targetDir()
    const path = dir === '' ? name.trim() : `${dir}/${name.trim()}`
    void api.mkdir(root, path).then((result) => {
      if (result.ok) refresh()
    })
  }

  const download = async (): Promise<void> => {
    onClose()
    if (menu.isDir || menu.path === '') return
    const url = `/aionui-panel/raw?root=${encodeURIComponent(root)}&path=${encodeURIComponent(menu.path)}`
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = menu.path.split('/').pop() ?? menu.path
    anchor.style.display = 'none'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
  }

  const rename = (): void => {
    onClose()
    if (onRenameInline !== undefined) {
      onRenameInline(menu.path, menu.isDir)
      return
    }
    const current = menu.path.split('/').pop() ?? menu.path
    const next = window.prompt(t('explorer.renamePrompt'), current)
    if (next === null || next.trim() === '' || next.trim() === current) return
    const parent = menu.path.includes('/') ? menu.path.slice(0, menu.path.lastIndexOf('/')) : ''
    const newPath = parent === '' ? next.trim() : `${parent}/${next.trim()}`
    void api.rename(root, menu.path, newPath).then((result) => {
      if (result.ok) refresh()
    })
  }

  const copy = (): void => {
    onClose()
    clipboard = { root, path: menu.path, isDir: menu.isDir }
  }

  const paste = (): void => {
    onClose()
    if (clipboard === null || clipboard.root !== root || clipboard.path === menu.path) return
    const name = clipboard.path.split('/').pop() ?? clipboard.path
    const targetDir = menu.isDir ? menu.path : (menu.path.includes('/') ? menu.path.slice(0, menu.path.lastIndexOf('/')) : '')
    const newPath = targetDir === '' ? name : `${targetDir}/${name}`
    void api.copy(root, clipboard.path, newPath).then((result) => {
      if (result.ok) refresh()
    })
  }

  const remove = (): void => {
    onClose()
    if (menu.path === '') return
    if (!window.confirm(`${t('common.delete')} ${menu.path}?`)) return
    void api.delete(root, menu.path).then((result) => {
      if (result.ok) refresh()
    })
  }

  const style = {
    left: Math.min(menu.x, window.innerWidth - 180),
    top: Math.min(menu.y, window.innerHeight - 260),
  }

  return (
    <div ref={ref} className={explorerCss.contextMenu} style={style}>
      <button type="button" className={explorerCss.contextItem} onClick={createFile}>
        📄 {t('explorer.menuNewFile')}
      </button>
      <button type="button" className={explorerCss.contextItem} onClick={createFolder}>
        📁 {t('explorer.menuNewFolder')}
      </button>
      <div className={explorerCss.contextSep} />
      <button type="button" className={explorerCss.contextItem} onClick={() => void download()} disabled={menu.isDir || menu.path === ''}>
        ⬇ {t('explorer.menuDownload')}
      </button>
      <button type="button" className={explorerCss.contextItem} onClick={rename} disabled={menu.path === ''}>
        ✎ {t('explorer.menuRename')}
      </button>
      <button type="button" className={explorerCss.contextItem} onClick={copy} disabled={menu.path === ''}>
        ⎘ {t('explorer.menuCopy')}
      </button>
      <button
        type="button"
        className={explorerCss.contextItem}
        onClick={paste}
        disabled={clipboard === null || clipboard.root !== root}
      >
        ⎙ {t('explorer.menuPaste')}
      </button>
      <div className={explorerCss.contextSep} />
      <button type="button" className={`${explorerCss.contextItem} ${explorerCss.contextDanger}`} onClick={remove} disabled={menu.path === ''}>
        🗑 {t('common.delete')}
      </button>
    </div>
  )
}
