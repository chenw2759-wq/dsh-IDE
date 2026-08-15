/**
 * AionUI right-panel system — browser half: mounts the explorer and preview
 * columns into the web shell's frame grid (through the layout controller),
 * binds the four stores to the live client runtime (the active session's cwd
 * is the project root, or the SSH remote root when the workspace plugin is in
 * SSH mode), subscribes to the host change stream (fs + git), and follows the
 * shell's dark marker (body[data-ds-dark-theme]) via CSS only.
 *
 * Failure policy: every DOM/runtime wiring failure is logged, never thrown —
 * the web shell fails the whole boot when a plugin apply throws.
 *
 * AionUi right-panel design (Apache-2.0, iOfficeAI/AionUi) — re-implemented
 * from measured behavior and architecture, not copied code.
 * @module dsh-aionui-panel/client
 */

import type { ClientContext, SessionId } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only: pulls the settings-surface SlotMap merge (the 'settings.section'
// entry and the SettingsSectionOwnerProps contract) so this plugin can register
// its workspace-settings page into the shell's bottom-left settings panel.
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import { PanelApi, subscribePanelEvents } from './api.ts'
import { PanelLayoutController } from './layout.ts'
import { createPanelStores, layoutSetRoot } from './store.ts'
import { readSettings } from './settings.ts'
import { mountPanels } from './mount.tsx'
import { SettingsSection } from './components/SettingsSection.tsx'
import { NS, dictionaries, setLanguage, type AionUiPanelKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Panel surface copy. */
    'aionui-panel': AionUiPanelKey
  }
}

/** The ssh-workspace mode service (structural view; absent when not installed). */
interface SshWorkspaceModeLike {
  getSnapshot(): { mode: 'local' | 'remote'; alias?: string; remoteRoot?: string }
  subscribe(listener: () => void): () => void
}

/** Required services: sessions for the project root, locale for the copy,
 *  slots to register the workspace-settings page into the shell settings. */
export const inject = ['sessions', 'locale', 'slots']

/** Apply the browser half. */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, dictionaries), 'dsh-aionui-panel: dictionaries')

  // The workspace-settings page lives in the SHELL's settings panel (bottom-
  // left gear → a new "右边栏工作区" nav column). The section id "general"
  // and "models" are taken by the shell; this one is ours.
  const t = ctx.locale.bind(NS)
  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'aionui-workspace',
    order: 20,
    label: () => t('settings.title'),
    locale: NS,
  }, SettingsSection))

  ctx.effect(() => {
    const api = new PanelApi()
    const stores = createPanelStores(api)
    const layout = new PanelLayoutController(stores.layout, () => readSettings())
    const disposers: Array<() => void> = []
    let disposeEvents: (() => void) | undefined
    let currentRoot = ''
    let currentSession = ''
    let lastPreviewOpen = false

    // The project root follows the active session's cwd — or the SSH remote
    // root when the workspace plugin's mode is remote. Switching sessions or
    // entering/leaving SSH mode re-binds every store (widths, collapse, tree,
    // tabs persist per root). The session id is resolved too: the file tree
    // keeps PER-SESSION memory (each conversation remembers its own expanded
    // folders; a session without memory just shows the workspace).
    const resolveSession = (): { root: string; sessionId: string } => {
      const mode = (ctx.get('sshWorkspaceMode') as SshWorkspaceModeLike | undefined)?.getSnapshot()
      if (mode?.mode === 'remote' && typeof mode.remoteRoot === 'string' && mode.remoteRoot !== '') {
        return { root: mode.remoteRoot, sessionId: String(mode.alias ?? '') }
      }
      const snapshot = ctx.sessions.list.getSnapshot()
      const sessionId = snapshot.current as SessionId | undefined
      const cwd = sessionId === undefined ? undefined : snapshot.byId[sessionId]?.cwd
      return {
        root: typeof cwd === 'string' && cwd !== '' ? cwd : '',
        sessionId: typeof sessionId === 'string' ? sessionId : '',
      }
    }

    const bindRoot = (): void => {
      const { root, sessionId } = resolveSession()
      // Workspace setting: session isolation keeps per-session tree/preview
      // memory keyed by the conversation id. Off shares one memory across all
      // sessions (''), so switching sessions keeps the same folders/tabs.
      const effectiveSession = readSettings().features.sessionIsolation === false ? '' : sessionId
      if (root === currentRoot && effectiveSession === currentSession) return
      currentRoot = root
      currentSession = effectiveSession

      disposeEvents?.()
      disposeEvents = undefined
      const previewOpen = stores.preview.getSnapshot().open
      lastPreviewOpen = previewOpen
      layoutSetRoot(stores.layout, root, previewOpen)
      stores.explorer.setRoot(root, effectiveSession)
      stores.scm.setRoot(root)
      stores.preview.setRoot(root, effectiveSession)

      if (root === '') return
      disposeEvents = subscribePanelEvents(root, (event) => {
        if (event.kind === 'fs') {
          void stores.explorer.handleFsChange()
          void stores.preview.handleFsChange(event.path)
        }
        if (event.kind === 'git') {
          // The host status is the only truth; land it directly.
          stores.scm.update((prev) => (prev.root !== root ? prev : { ...prev, status: event.status, loading: false }))
          // The index/worktree moved: every open diff tab is stale by now,
          // and the tree badges follow the same status.
          void stores.preview.handleGitChange(root)
          void stores.explorer.refreshGitStatus()
        }
      })
    }
    disposers.push(ctx.sessions.list.subscribe(bindRoot))
    bindRoot()

    // Follow the ssh-workspace plugin's mode changes (SSH enter/exit). The
    // service may load after this plugin, so poll briefly for its arrival.
    let modeService = ctx.get('sshWorkspaceMode') as SshWorkspaceModeLike | undefined
    if (modeService !== undefined) {
      disposers.push(modeService.subscribe(bindRoot))
    } else {
      const retry = window.setInterval(() => {
        modeService = ctx.get('sshWorkspaceMode') as SshWorkspaceModeLike | undefined
        if (modeService === undefined) return
        window.clearInterval(retry)
        disposers.push(modeService.subscribe(bindRoot))
        bindRoot()
      }, 200)
      disposers.push(() => window.clearInterval(retry))
    }

    // Mirror the preview open state into the layout store (single source: the
    // preview store), and play the enter animation when the region opens.
    const mirrorPreviewOpen = (): void => {
      const open = stores.preview.getSnapshot().open
      if (open === lastPreviewOpen) return
      lastPreviewOpen = open
      stores.layout.update((prev) => ({ ...prev, previewOpen: open }))
      if (open) {
        const col = document.querySelector<HTMLElement>('[data-aionui-preview-col]')
        col?.classList.add('aionui-preview-enter')
        setTimeout(() => col?.classList.remove('aionui-preview-enter'), 300)
      }
    }
    disposers.push(stores.preview.subscribe(mirrorPreviewOpen))

    // Language mirroring (the shell owns <html lang>; the dictionary follows).
    let langObserver: MutationObserver | undefined
    const syncLanguage = (): void => {
      setLanguage(document.documentElement.lang?.startsWith('zh') ? 'zh' : 'en')
    }
    langObserver = new MutationObserver(syncLanguage)
    langObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] })
    syncLanguage()

    // Mount everything. DOM failures degrade the panels, never the GUI.
    try {
      layout.mount()
      mountPanels(stores, () => layout.toggleExplorer())
    } catch (error) {
      console.error('[dsh-aionui-panel] mount failed:', error)
    }

    // Debounced persists (explorer/scm/preview) may be pending when the page
    // hides; flush them so a close/background never drops the last 150ms.
    const flushOnHide = (): void => stores.flushNow()
    const onVisibilityChange = (): void => {
      if (document.visibilityState === 'hidden') flushOnHide()
    }
    window.addEventListener('pagehide', flushOnHide)
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      flushOnHide()
      window.removeEventListener('pagehide', flushOnHide)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      disposeEvents?.()
      langObserver?.disconnect()
      for (const dispose of disposers) dispose()
      layout.dispose()
    }
  }, 'dsh-aionui-panel: wiring')
}
