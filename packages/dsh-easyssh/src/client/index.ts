/**
 * Browser-half entry for the dsh-easyssh plugin — runs inside the dsh
 * web GUI. Registers the two session-header utilities (SSH configure + mode
 * toggle, left of the session log) and the persistent SSH host-manager page
 * in Settings. The file-tree UI lives in the right-side aionui panel, which
 * reads the SSH mode through the `sshWorkspaceMode` service provided here
 * (root follows the mode: local cwd ⇄ remoteRoot). Failure policy: every DOM
 * wiring problem is logged, never thrown — the web shell fails the whole
 * boot when a plugin apply throws.
 */
import type { ClientContext, SessionId } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: pulls the conversation SlotMap augmentation (the utilities slot).
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import { SshHostsApi, WorkspaceApi } from './api.ts'
import { RemoteWorkspaceBadge } from './badge.tsx'
import { ConnectButton, ToggleButton } from './header.tsx'
import { NS, dictionaries, type WorkspaceKey } from './locales.ts'
import { HostSettingsPage } from './settings.tsx'
import { ModeState } from './state.ts'
import { setLanguage, tt } from './text.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** dsh-easyssh surface copy. */
    'dsh-easyssh': WorkspaceKey
  }
}

/** The cross-plugin mode service name (read by the aionui panel). */
export const SSH_WORKSPACE_MODE_SERVICE = 'sshWorkspaceMode'

/** Required services: slots for the header buttons, locale for the copy, sessions for the local root. */
export const inject = ['slots', 'locale', 'sessions']

/** Apply the browser half. */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, dictionaries), 'dsh-easyssh: dictionaries')

  const api = new WorkspaceApi()
  const hostsApi = new SshHostsApi()
  const mode = new ModeState(api)
  let localRoot = ''

  // The local-mode project root follows the active session's cwd.
  const bindRoot = (): void => {
    const snapshot = ctx.sessions.list.getSnapshot()
    const sessionId = snapshot.current as SessionId | undefined
    const cwd = sessionId === undefined ? undefined : snapshot.byId[sessionId]?.cwd
    localRoot = typeof cwd === 'string' && cwd !== '' ? cwd : ''
  }
  const rootSubscription = ctx.sessions.list.subscribe(bindRoot)
  bindRoot()

  // Expose the mode to other client plugins (the aionui panel follows it).
  ctx.provide(SSH_WORKSPACE_MODE_SERVICE, mode)

  const disposers: Array<() => void> = []
  try {
    ctx.slots.inject('conversation.session.header.utilities', () => {
      const unregister: Array<() => void> = []
      unregister.push(ctx.slots.register(
        { name: 'conversation.session.header.utilities', id: 'ssh-workspace-connect', order: -10, inject: () => ({ mode, api, hostsApi }) },
        ConnectButton,
      ))
      unregister.push(ctx.slots.register(
        { name: 'conversation.session.header.utilities', id: 'ssh-workspace-toggle', order: -9, inject: () => ({ mode }) },
        ToggleButton,
      ))
      return () => {
        for (const dispose of unregister) dispose()
      }
    })

    // The remote-workspace badge: a static session-header action (negative
    // order, before interactive buttons) showing `alias @ remoteRoot` while
    // SSH mode is active. DSH's own workspace label is host-local and
    // immutable, so this badge surfaces the real working directory.
    ctx.slots.inject('conversation.session.header.actions', () => ctx.slots.register(
      { name: 'conversation.session.header.actions', id: 'ssh-workspace-badge', order: -100, inject: () => ({ mode }) },
      RemoteWorkspaceBadge,
    ))

    mode.start()

    // SSH host-manager page in Settings (persistent configuration; the header
    // dialog then only needs to connect). Registered separately so a failure
    // here degrades the settings page only, never the workspace surfaces.
    ctx.slots.inject('settings.section', () => ctx.slots.register(
      { name: 'settings.section', id: 'ssh-workspace-hosts', order: 100, label: () => tt('settings.label'), inject: () => ({ mode, api, hostsApi }) },
      HostSettingsPage,
    ))
  } catch (error) {
    console.warn('[dsh-easyssh] mount failed:', error)
  }

  // Language mirroring (the shell owns <html lang>; the dictionary follows).
  const syncLanguage = (): void => {
    setLanguage(document.documentElement.lang?.startsWith('zh') ?? false)
  }
  const langObserver = new MutationObserver(syncLanguage)
  langObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] })
  syncLanguage()

  ctx.effect(() => () => {
    mode.stop()
    rootSubscription()
    langObserver.disconnect()
    for (const dispose of disposers.splice(0)) dispose()
  }, 'dsh-easyssh: wiring')
}
