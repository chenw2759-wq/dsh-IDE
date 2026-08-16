/**
 * The preview toolbar: 32px bar (padding 0 10). Left: source/preview toggle
 * (markdown/html), split-screen toggle (editable types), download. Right: the
 * refresh button (4-state: hidden/disabled/idle/updated — never a dead
 * button) and save (editable + dirty, Cmd/Ctrl+S too).
 * @module dsh-aionui-panel/client/preview/PreviewToolbar
 */

import type { JSX } from 'react'
import type { PreviewContentType } from '../../core/types.ts'
import { isEditableType } from '../fileType.ts'
import { t } from '../locales.ts'
import { CodeIcon, DownloadIcon, EyeIcon, RefreshIcon, SaveIcon, SplitIcon } from '../components/icons.tsx'
import previewCss from '../styles/preview.module.css'

/** Refresh button states (AionUi's 4-state machine). */
export type RefreshState = 'hidden' | 'disabled' | 'idle' | 'updated'

/** Derive the refresh state for one tab. */
export function refreshStateFor(
  contentType: PreviewContentType,
  hasContent: boolean,
  loading: boolean,
  updated: boolean,
): RefreshState {
  // URL tabs reload their frame (cross-origin documents can only be
  // re-navigated to the tab's address, never reloaded in place).
  if (contentType === 'url') return 'idle'
  if (contentType === 'word' || contentType === 'excel'
    || contentType === 'ppt' || contentType === 'unsupported' || contentType === 'image') {
    return 'hidden'
  }
  if (!hasContent || loading) return 'disabled'
  return updated ? 'updated' : 'idle'
}

/** Download the current tab's content as a file. */
export function downloadTab(tab: { title: string; content: string | null; contentType: PreviewContentType }): void {
  if (tab.content === null) return
  const isDataUrl = tab.content.startsWith('data:')
  const href = isDataUrl
    ? tab.content
    : URL.createObjectURL(new Blob([tab.content], { type: 'text/plain;charset=utf-8' }))
  const anchor = document.createElement('a')
  anchor.href = href
  anchor.download = tab.title
  anchor.style.display = 'none'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  if (!isDataUrl) setTimeout(() => URL.revokeObjectURL(href), 10_000)
}

/** The toolbar. */
export function PreviewToolbar({
  contentType,
  hasContent,
  loading,
  dirty,
  updated,
  viewMode,
  canToggleView,
  split,
  canSplit,
  onViewModeChange,
  onSplitChange,
  onRefresh,
  onSave,
  onDownload,
  onRun,
  onOpenTerminal,
  officeEditing,
  onToggleOfficeEdit,
  visualMode,
  onToggleVisualMode,
}: {
  contentType: PreviewContentType
  hasContent: boolean
  loading: boolean
  dirty: boolean
  updated: boolean
  viewMode: 'source' | 'preview' | 'visual'
  canToggleView: boolean
  split: boolean
  canSplit: boolean
  onViewModeChange: (mode: 'source' | 'preview' | 'visual') => void
  onSplitChange: (split: boolean) => void
  onRefresh: () => void
  onSave: () => void
  onDownload: () => void
  onRun?: () => void
  onOpenTerminal?: () => void
  /** Office tabs (P4): whether in-frame editing is armed. */
  officeEditing?: boolean
  onToggleOfficeEdit?: () => void
  /** HTML/Markdown (P4.2): PowerPoint-style visual editing. */
  visualMode?: boolean
  onToggleVisualMode?: () => void
}): JSX.Element {
  const refreshState = refreshStateFor(contentType, hasContent, loading, updated)
  const editable = isEditableType(contentType)
  const runnable = contentType === 'code'
  const isOffice = contentType === 'word' || contentType === 'excel' || contentType === 'ppt'
  const canVisual = contentType === 'html' || contentType === 'markdown'

  return (
    <div className={previewCss.toolbar} data-aionui-float-drag="">
      {canToggleView && (
        <>
          <button
            type="button"
            className={`${previewCss.toolbarBtn}${viewMode === 'source' ? ` ${previewCss.toolbarBtnActive}` : ''}`}
            onClick={() => onViewModeChange('source')}
          >
            <CodeIcon size={13} />
            {t('preview.source')}
          </button>
          <button
            type="button"
            className={`${previewCss.toolbarBtn}${viewMode === 'preview' ? ` ${previewCss.toolbarBtnActive}` : ''}`}
            onClick={() => onViewModeChange('preview')}
          >
            <EyeIcon size={13} />
            {t('preview.preview')}
          </button>
        </>
      )}
      {canSplit && (
        <button
          type="button"
          className={`${previewCss.toolbarBtn}${split ? ` ${previewCss.toolbarBtnActive}` : ''}`}
          title={t('preview.split')}
          onClick={() => onSplitChange(!split)}
        >
          <SplitIcon size={13} />
          {t('preview.split')}
        </button>
      )}
      {runnable && onRun !== undefined && (
        <button
          type="button"
          className={`${previewCss.toolbarBtn} ${previewCss.toolbarBtnRun}`}
          title={t('preview.run')}
          disabled={!hasContent}
          onClick={onRun}
        >
          ▶ {t('preview.run')}
        </button>
      )}
      {onOpenTerminal !== undefined && (
        <button
          type="button"
          className={previewCss.toolbarBtn}
          title={t('preview.terminal')}
          onClick={onOpenTerminal}
        >
          &gt;_ {t('preview.terminal')}
        </button>
      )}
      {isOffice && onToggleOfficeEdit !== undefined && (
        <button
          type="button"
          className={`${previewCss.toolbarBtn}${officeEditing ? ` ${previewCss.toolbarBtnActive}` : ''}`}
          title={t('preview.edit')}
          onClick={onToggleOfficeEdit}
        >
          {t('preview.edit')}
        </button>
      )}
      {canVisual && onToggleVisualMode !== undefined && (
        <button
          type="button"
          className={`${previewCss.toolbarBtn}${visualMode ? ` ${previewCss.toolbarBtnActive}` : ''}`}
          title={t('visual.title')}
          onClick={onToggleVisualMode}
        >
          {t('visual.title')}
        </button>
      )}
      <button
        type="button"
        className={previewCss.toolbarBtn}
        title={t('preview.download')}
        disabled={!hasContent}
        onClick={onDownload}
      >
        <DownloadIcon size={13} />
      </button>
      <span className={previewCss.toolbarSpacer} />
      {refreshState !== 'hidden' && (
        <button
          type="button"
          className={`${previewCss.toolbarBtn}${refreshState === 'updated' ? ` ${previewCss.toolbarBtnWarn}` : ''}`}
          title={refreshState === 'updated' ? t('preview.refresh.updated') : t('preview.refresh')}
          disabled={refreshState === 'disabled'}
          onClick={onRefresh}
        >
          <RefreshIcon size={13} />
          {t('preview.refresh')}
        </button>
      )}
      {editable && dirty && (
        <button
          type="button"
          className={previewCss.toolbarBtn}
          onClick={onSave}
          disabled={loading}
        >
          <SaveIcon size={13} />
          {t('preview.save')}
        </button>
      )}
    </div>
  )
}
