/**
 * The Explorer column: Files/Changes tab bar (37px), the persistent filename
 * search at the top of the Files tab (150ms debounced; a hit click REVEALS
 * the file in the tree — expand ancestors + select — never opens preview),
 * the lazy file tree (34px rows, full-row expand/collapse, 16px icons), and
 * the in-column collapse chevron.
 *
 * AionUi Explorer behavior (Apache-2.0, re-implemented): row click toggles
 * folders (no need to hit the arrow), search results are reveal-only, and
 * clicking a file opens it in the preview panel (dedup focuses the tab).
 * @module dsh-aionui-panel/client/components/ExplorerPanel
 */

import { memo, useEffect, useRef, useState } from 'react'
import type { JSX } from 'react'
import type { FsEntry } from '../../core/types.ts'
import { parentRel } from '../fileType.ts'
import { t } from '../locales.ts'
import { useStore } from '../hooks/useStore.ts'
import type { PanelStores } from '../store.ts'
import { FileTypeIcon } from './FileIcon.tsx'
import { ChevronRightIcon, CloseIcon, ExpandRightIcon, PlusIcon, SearchIcon } from './icons.tsx'
import { ScmPanel } from './ScmPanel.tsx'
import { activateOnKey } from './a11y.ts'
import { FileContextMenu, type FileMenuState } from './FileContextMenu.tsx'
import { ContextMenu, type MenuState } from './overlay.tsx'
import { createFileAction, createFolderAction } from './fs-actions.ts'
import explorerCss from '../styles/explorer.module.css'
import '../styles/tokens.module.css'

/** Row indent step per tree depth (px). */
const INDENT_STEP = 16

/** One row's inline-rename editing state (null = no editing row). */
interface RenameState { path: string; isDir: boolean }

/** Git badge color by letter (VS Code-ish). */
const GIT_BADGE_COLOR: Record<string, string> = {
  A: '#22c55e', M: '#eab308', D: '#f87171', R: '#a78bfa', U: '#94a3b8', C: '#f87171',
}

/**
 * The whole explorer column content.
 * @param stores - the panel store bundle.
 * @param onToggleCollapse - collapse the column (host chrome).
 */
export function ExplorerPanel({
  stores,
  onToggleCollapse,
}: {
  stores: PanelStores
  onToggleCollapse: () => void
}): JSX.Element {
  const state = useStore(stores.explorer)
  const layoutState = useStore(stores.layout)
  const settings = useStore(stores.settings)
  const [searchFocus, setSearchFocus] = useState(false)
  const [fileMenu, setFileMenu] = useState<FileMenuState | null>(null)
  const [newMenu, setNewMenu] = useState<MenuState | null>(null)
  const [renaming, setRenaming] = useState<RenameState | null>(null)
  const root = state.root
  const terminalOpen = layoutState.terminalOpen
  const terminalDock = settings.features.terminalDock

  // Load the git badge map once the column mounts / the root changes.
  useEffect(() => {
    void stores.explorer.refreshGitStatus()
  }, [stores.explorer, root])

  const startRename = (path: string, isDir: boolean): void => {
    setRenaming({ path, isDir })
  }

  const refreshAfterCreate = (): void => {
    void stores.explorer.handleFsChange()
  }

  return (
    <div className="aionui-root" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {/* The Files/Changes tab bar. */}
      <div className={explorerCss.tabBar}>
        <button
          type="button"
          className={state.activeTab === 'files' ? explorerCss.tabBtnActive : explorerCss.tabBtn}
          onClick={() => stores.explorer.setActiveTab('files')}
        >
          {t('explorer.tabs.files')}
        </button>
        <button
          type="button"
          className={state.activeTab === 'changes' ? explorerCss.tabBtnActive : explorerCss.tabBtn}
          onClick={() => stores.explorer.setActiveTab('changes')}
        >
          {t('explorer.tabs.changes')}
        </button>
        {terminalDock && (
          <button
            type="button"
            className={terminalOpen ? explorerCss.tabBtnActive : explorerCss.tabBtn}
            onClick={() => stores.layout.setTerminalOpen(!terminalOpen)}
            title={t('preview.terminal')}
          >
            &gt;_
          </button>
        )}
        <button
          type="button"
          className={explorerCss.tabBtn}
          onClick={(event) => {
            const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
            setNewMenu({
              x: rect.left,
              y: rect.bottom + 4,
              entries: [
                { key: 'new-file', label: t('explorer.menuNewFile'), onSelect: () => createFileAction(stores.api, root, '', refreshAfterCreate) },
                { key: 'new-folder', label: t('explorer.menuNewFolder'), onSelect: () => createFolderAction(stores.api, root, '', refreshAfterCreate) },
              ],
            })
          }}
          title={t('explorer.menuNewFile') + ' / ' + t('explorer.menuNewFolder')}
          aria-label={t('explorer.menuNewFile') + ' / ' + t('explorer.menuNewFolder')}
        >
          <PlusIcon size={14} />
        </button>
        <span
          className={explorerCss.watchHelp}
          title={t('explorer.watchHelp')}
        >
          {t('explorer.watchHelpShort')}
        </span>
        <button
          type="button"
          className="aionui-collapse-chevron"
          style={{ marginLeft: 'auto' }}
          onClick={onToggleCollapse}
          title={t('explorer.collapse')}
          aria-label={t('explorer.collapse')}
        >
          <ExpandRightIcon size={16} />
        </button>
      </div>

      {/* Files tab: search + tree (kept mounted; hidden when changes is active). */}
      <div style={{ display: state.activeTab === 'files' ? 'flex' : 'none', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        <SearchArea
          stores={stores}
          searchFocus={searchFocus}
          onFocusChange={setSearchFocus}
        />
        <FileTree stores={stores} onContextMenu={setFileMenu} renaming={renaming} onRenameDone={() => setRenaming(null)} />
      </div>

      {/* Changes tab: SCM (mounted on demand; its store outlives the tab). */}
      {state.activeTab === 'changes' && <ScmPanel stores={stores} />}

      {fileMenu !== null && (
        <FileContextMenu
          menu={fileMenu}
          stores={stores}
          api={stores.api}
          onClose={() => setFileMenu(null)}
          onRenameInline={startRename}
        />
      )}

      <ContextMenu state={newMenu} onClose={() => setNewMenu(null)} />
    </div>
  )
}

/** The search box + results (the tree stays mounted underneath). */
function SearchArea({
  stores,
  searchFocus,
  onFocusChange,
}: {
  stores: PanelStores
  searchFocus: boolean
  onFocusChange: (focused: boolean) => void
}): JSX.Element {
  const explorer = stores.explorer
  const state = useStore(explorer)
  const search = state.search
  const active = search.query !== ''
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: active ? 1 : undefined }}>
      <div className={explorerCss.searchArea}>
        <div
          className={`${explorerCss.searchBox}${searchFocus ? ` ${explorerCss.searchAreaFocus}` : ''}`}
          style={{ borderColor: searchFocus ? 'var(--aion-primary)' : undefined }}
        >
          <span className={explorerCss.searchIcon}><SearchIcon size={14} /></span>
          <input
            ref={inputRef}
            className={explorerCss.searchInput}
            value={search.query}
            placeholder={t('explorer.search.placeholder')}
            aria-label={t('explorer.search.placeholder')}
            onFocus={() => onFocusChange(true)}
            onBlur={() => onFocusChange(false)}
            onChange={(event) => explorer.setSearchQuery(event.target.value)}
          />
          {search.query !== '' && (
            <button
              type="button"
              className={explorerCss.searchClear}
              onClick={() => { explorer.cancelSearch(); inputRef.current?.focus() }}
              aria-label={t('common.close')}
            >
              <CloseIcon size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Result list replaces the tree while the query is active (the tree
          underneath stays mounted — subscriptions never thrash). */}
      {active ? (
        <SearchResults stores={stores} />
      ) : null}
    </div>
  )
}

/** The flat search-result stream (click = reveal in tree). */
function SearchResults({ stores }: { stores: PanelStores }): JSX.Element {
  const explorer = stores.explorer
  const state = useStore(explorer)
  const search = state.search
  return (
    <div className={explorerCss.scrollArea}>
      {search.status === 'searching' && search.hits.length === 0 && (
        <div className={explorerCss.searchStatus}>{t('explorer.search.searching')}</div>
      )}
      {search.status === 'error' && <div className={explorerCss.searchStatus}>{t('explorer.search.error')}</div>}
      {search.status === 'done' && search.hits.length === 0 && (
        <div className={explorerCss.searchStatus}>{t('explorer.search.empty')}</div>
      )}
      {search.hits.map((hit) => (
        <div
          key={hit.path}
          className={explorerCss.resultRow}
          role="button"
          tabIndex={0}
          title={hit.path}
          onClick={() => {
            // Reveal: expand the ancestor chain and select — not preview.
            explorer.reveal(hit.path)
          }}
          onKeyDown={activateOnKey(() => { explorer.reveal(hit.path) })}
        >
          <FileTypeIcon name={hit.name} isDir={hit.isDir} expanded={false} />
          <span className={explorerCss.resultName}>{hit.name}</span>
          <span className={explorerCss.resultPath}>{parentRel(hit.path)}</span>
        </div>
      ))}
      {search.truncated && search.hits.length > 0 && (
        <div className={explorerCss.searchStatus}>{t('explorer.search.truncated', { count: search.hits.length })}</div>
      )}
    </div>
  )
}

/** The lazy file tree. */
function FileTree({
  stores,
  onContextMenu,
  renaming,
  onRenameDone,
}: {
  stores: PanelStores
  onContextMenu: (menu: FileMenuState) => void
  renaming: RenameState | null
  onRenameDone: () => void
}): JSX.Element {
  const explorer = stores.explorer
  const state = useStore(explorer)
  const root = state.root

  if (root === '') return <div className={explorerCss.emptyState}>{t('explorer.tree.empty')}</div>
  const entries = state.dirs['']
  if (entries === undefined) {
    return <div className={explorerCss.searchStatus}>{t('scm.loading')}</div>
  }
  if (entries.length === 0) return <div className={explorerCss.emptyState}>{t('explorer.tree.empty')}</div>

  return (
    <div className={`${explorerCss.scrollArea} ${explorerCss.tree}`}>
      {entries.map((entry) => (
        <TreeRow
          key={entry.path}
          entry={entry}
          depth={0}
          expanded={state.expanded}
          selected={state.selected}
          dirs={state.dirs}
          root={state.root}
          git={state.git}
          watch={state.watch}
          renaming={renaming}
          stores={stores}
          onContextMenu={onContextMenu}
          onRenameDone={onRenameDone}
        />
      ))}
    </div>
  )
}

/** One tree row (recursive for children). */
function TreeRowBase({
  entry,
  depth,
  expanded,
  selected,
  dirs,
  root,
  git,
  watch,
  renaming,
  stores,
  onContextMenu,
  onRenameDone,
}: {
  entry: FsEntry
  depth: number
  expanded: string[]
  selected: string | null
  dirs: Record<string, FsEntry[]>
  root: string
  git: Record<string, string>
  watch: Record<string, 'shallow' | 'deep'>
  renaming: RenameState | null
  stores: PanelStores
  onContextMenu?: (menu: FileMenuState) => void
  onRenameDone: () => void
}): JSX.Element {
  const explorer = stores.explorer
  const preview = stores.preview
  const settings = useStore(stores.settings)
  const isExpanded = expanded.includes(entry.path)
  const isSelected = selected === entry.path
  const children = entry.isDir ? dirs[entry.path] : undefined
  const isRenaming = renaming !== null && renaming.path === entry.path
  const gitBadge = git[entry.path]

  const handleClick = (): void => {
    if (isRenaming) return
    if (entry.isDir) {
      // Full-row expand/collapse toggle.
      explorer.toggleDir(entry.path)
      return
    }
    // A file: select + open in preview (dedup focuses the open tab).
    explorer.select(entry.path)
    preview.openFile(root, entry.path)
  }

  const handleContextMenu = (event: React.MouseEvent): void => {
    event.preventDefault()
    event.stopPropagation()
    onContextMenu?.({ x: event.clientX, y: event.clientY, path: entry.path, isDir: entry.isDir })
  }

  const commitRename = (nextName: string): void => {
    const name = nextName.trim()
    if (name === '' || name === entry.name) {
      onRenameDone()
      return
    }
    const parent = entry.path.includes('/') ? entry.path.slice(0, entry.path.lastIndexOf('/')) : ''
    const newPath = parent === '' ? name : `${parent}/${name}`
    void stores.api.rename(root, entry.path, newPath).then((result) => {
      if (result.ok) {
        explorer.handleFsChange()
        void explorer.refreshGitStatus()
      }
      onRenameDone()
    })
  }

  return (
    <>
      {isRenaming ? (
        <InlineRenameRow entry={entry} depth={depth} onCommit={commitRename} onCancel={onRenameDone} />
      ) : (
        <div
          className={`${explorerCss.treeRow}${isSelected ? ` ${explorerCss.treeRowSelected}` : ''}`}
          style={{ paddingLeft: 12 + 8 + depth * INDENT_STEP }}
          onClick={handleClick}
          onKeyDown={activateOnKey(handleClick)}
          onContextMenu={handleContextMenu}
          role="button"
          tabIndex={0}
          aria-expanded={entry.isDir ? isExpanded : undefined}
          title={entry.path}
        >
          {entry.isDir ? (
            <span className={`${explorerCss.treeArrow}${isExpanded ? ` ${explorerCss.treeArrowOpen}` : ''}`}>
              <ChevronRightIcon size={13} />
            </span>
          ) : (
            <span className={explorerCss.treeArrowEmpty} />
          )}
          <FileTypeIcon name={entry.name} isDir={entry.isDir} expanded={isExpanded} />
          <span className={explorerCss.treeName}>{entry.name}</span>
          {gitBadge !== undefined && settings.features.gitBadges && (
            <span
              className={explorerCss.gitBadge}
              style={{ color: GIT_BADGE_COLOR[gitBadge] ?? 'var(--aion-text-tertiary)' }}
              title={`git: ${gitBadge}`}
            >
              {gitBadge}
            </span>
          )}
          {entry.isDir && settings.features.watchDots && (
            <button
              type="button"
              className={`${explorerCss.watchDot}${watch[entry.path] === 'shallow' ? ` ${explorerCss.watchDotShallow}` : watch[entry.path] === 'deep' ? ` ${explorerCss.watchDotDeep}` : ''}`}
              title={watch[entry.path] === 'shallow'
                ? t('explorer.watchShallow')
                : watch[entry.path] === 'deep'
                  ? t('explorer.watchDeep')
                  : t('explorer.watchDefault')}
              aria-label={t('explorer.watchToggle')}
              onClick={(event) => {
                event.stopPropagation()
                explorer.toggleWatch(entry.path)
              }}
            />
          )}
        </div>
      )}
      {entry.isDir && isExpanded && children !== undefined && (
        <div>
          {children.map((child) => (
            <TreeRow
              key={child.path}
              entry={child}
              depth={depth + 1}
              expanded={expanded}
              selected={selected}
              dirs={dirs}
              root={root}
              git={git}
              watch={watch}
              renaming={renaming}
              stores={stores}
              onContextMenu={onContextMenu}
              onRenameDone={onRenameDone}
            />
          ))}
        </div>
      )}
    </>
  )
}

/** Inline rename row: a bare input replacing the row until Enter/Escape/blur. */
function InlineRenameRow({
  entry,
  depth,
  onCommit,
  onCancel,
}: {
  entry: FsEntry
  depth: number
  onCommit: (name: string) => void
  onCancel: () => void
}): JSX.Element {
  const [value, setValue] = useState(entry.name)
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])
  return (
    <div className={explorerCss.treeRow} style={{ paddingLeft: 12 + 8 + depth * INDENT_STEP }}>
      <span className={explorerCss.treeArrowEmpty} />
      <input
        ref={inputRef}
        className={explorerCss.renameInput}
        value={value}
        spellCheck={false}
        onChange={(event) => setValue(event.target.value)}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === 'Enter') onCommit(value)
          else if (event.key === 'Escape') onCancel()
          event.stopPropagation()
        }}
        onBlur={() => onCommit(value)}
      />
    </div>
  )
}

/**
 * A memoized tree row so the whole tree does not re-render on every explorer
 * state change (search keystrokes, tab switches, fs version bumps). The row
 * takes the `state` fields it actually reads as individual props — `expanded`,
 * `selected`, `dirs` — whose references only change when the corresponding
 * data changed, so the default shallow comparison skips rows whose own entry,
 * ancestor, expansion or selection are unaffected. A `dirs` re-fetch (an fs
 * event that relists the expanded dirs) still re-renders the rows under those
 * dirs — the unavoidable O(open-dirs) cost — but transient UI state no longer
 * invalidates the tree.
 */
const TreeRow = memo(TreeRowBase)
