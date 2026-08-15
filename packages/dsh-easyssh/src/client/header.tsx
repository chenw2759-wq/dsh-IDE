/**
 * The two session-header utility buttons (registered in
 * conversation.session.header.utilities, left of the session-log entry):
 * the SSH configure/enter button and the local⇄remote toggle. The runtime
 * dependencies (mode / api / hostsApi) arrive as slot-injected owner props.
 */
import { useSyncExternalStore, type ReactElement } from 'react'
import type { ModeState } from './state.ts'
import type { WorkspaceApi, SshHostsApi } from './api.ts'
import { openConfigDialog } from './dialog.tsx'
import { tt } from './text.ts'

/** React hook: subscribe to the mode store. */
function useMode(mode: ModeState) {
  return useSyncExternalStore(mode.subscribe.bind(mode), mode.getSnapshot.bind(mode))
}

/**
 * The composed slot props: our inject face plus the framework standard kit
 * (unused by these buttons — typed loosely so the registration's composed
 * props constraint is satisfied without importing the conversation package's
 * prop tables into the component).
 */
export interface ConnectButtonProps {
  mode: ModeState
  api: WorkspaceApi
  hostsApi: SshHostsApi
  sessionId?: unknown
  useSession?: unknown
  useSessions?: unknown
  useWorkspaces?: unknown
  useProjection?: unknown
  useInput?: unknown
  inputActions?: unknown
  renderSlot?: unknown
  renderSlotChain?: unknown
  t?: unknown
}

export interface ToggleButtonProps {
  mode: ModeState
  sessionId?: unknown
  useSession?: unknown
  useSessions?: unknown
  useWorkspaces?: unknown
  useProjection?: unknown
  useInput?: unknown
  inputActions?: unknown
  renderSlot?: unknown
  renderSlotChain?: unknown
  t?: unknown
}

/** The SSH configure/enter button (always visible). */
export function ConnectButton(props: ConnectButtonProps): ReactElement {
  const state = useMode(props.mode)
  const remote = state.mode === 'remote' && state.alias !== undefined
  return (
    <button
      type="button"
      data-ssh-workspace-connect=""
      data-active={remote ? 'true' : undefined}
      title={remote ? tt('connect.remoteTooltip') : tt('connect.tooltip')}
      onClick={() => {
        openConfigDialog(props.mode, props.api, props.hostsApi)
      }}
    >
      <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="2" y="3" width="12" height="10" rx="2" />
        <path d="M6 6.5l2.2 1.6L6 9.7" />
        <path d="M9.5 9.5h2" />
      </svg>
      <span>{remote ? `SSH: ${state.alias}` : tt('connect.label')}</span>
    </button>
  )
}

/** The local⇄remote toggle (visible once a remote target exists). */
export function ToggleButton(props: ToggleButtonProps): ReactElement | null {
  const state = useMode(props.mode)
  if (state.alias === undefined) return null
  const alias = state.alias
  const remote = state.mode === 'remote'
  return (
    <button
      type="button"
      data-ssh-workspace-toggle=""
      data-remote={remote ? 'true' : undefined}
      title={remote ? tt('toggle.tooltipRemote') : tt('toggle.tooltipLocal')}
      onClick={() => {
        if (remote) {
          void props.mode.setLocal()
        } else {
          void props.mode.setRemote(alias)
        }
      }}
    >
      {remote ? (
        <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3.5 5.5h6a3 3 0 0 1 0 6h-1" />
          <path d="M5.5 7.5L3.5 5.5l2-2" />
        </svg>
      ) : (
        <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M8 3l3.5 3.5L8 10" />
          <path d="M3.5 9.5v0a3 3 0 0 0 3 3h1" />
        </svg>
      )}
      <span>{remote ? tt('toggle.labelRemote') : tt('toggle.labelLocal')}</span>
    </button>
  )
}
