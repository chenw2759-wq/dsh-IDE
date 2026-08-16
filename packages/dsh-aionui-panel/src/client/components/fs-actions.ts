/**
 * Shared filesystem actions for the "new" affordances (the file-tree header
 * button and the preview empty-area right-click menu): create a file / folder
 * under a directory, and show the current workspace path.
 * @module dsh-aionui-panel/client/components/fs-actions
 */

import type { PanelApi } from '../api.ts'
import { t } from '../locales.ts'
import { toast } from './overlay.tsx'

/** Prompt for a name and create a file under `dir` (root-relative; '' = root). */
export function createFileAction(api: PanelApi, root: string, dir: string, onDone: () => void): void {
  const name = window.prompt(t('explorer.newFilePrompt'))
  if (name === null || name.trim() === '') return
  const path = dir === '' ? name.trim() : `${dir}/${name.trim()}`
  void api.write(root, path, '').then((result) => {
    if (result.ok) onDone()
  })
}

/** Prompt for a name and create a folder under `dir` (root-relative). */
export function createFolderAction(api: PanelApi, root: string, dir: string, onDone: () => void): void {
  const name = window.prompt(t('explorer.newFolderPrompt'))
  if (name === null || name.trim() === '') return
  const path = dir === '' ? name.trim() : `${dir}/${name.trim()}`
  void api.mkdir(root, path).then((result) => {
    if (result.ok) onDone()
  })
}

/** Show the current workspace path (root). */
export function viewPathAction(root: string): void {
  toast(root === '' ? '/' : root)
}
