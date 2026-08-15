/**
 * The remote-workspace badge: a session-header action (static context, before
 * interactive buttons) showing the ACTIVE remote workspace while in SSH mode —
 * `cys01 @ /root/autodl-tmp`. DSH's own workspace label is host-local and
 * immutable, so this badge is where the real working directory is surfaced.
 */
import { useSyncExternalStore, type ReactElement } from 'react'
import type { ModeState } from './state.ts'
import { tt } from './text.ts'

/** Composed slot props (standard kit ignored via optional unknowns). */
export interface RemoteWorkspaceBadgeProps {
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

/** The badge: hidden in local mode, shows the remote workspace in SSH mode. */
export function RemoteWorkspaceBadge(props: RemoteWorkspaceBadgeProps): ReactElement | null {
  const state = useSyncExternalStore(props.mode.subscribe.bind(props.mode), props.mode.getSnapshot.bind(props.mode))
  if (state.mode !== 'remote') return null
  const label = state.remoteRootLabel ?? state.remoteRoot ?? '~'
  return (
    <span
      data-ssh-workspace-badge=""
      title={`${tt('panel.modeRemote')} ${state.alias ?? ''} @ ${label}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '1px 8px',
        borderRadius: 999,
        fontSize: 11,
        lineHeight: '18px',
        background: 'rgba(122, 162, 247, 0.18)',
        color: 'var(--aion-primary, #7aa2f7)',
        border: '1px solid rgba(122, 162, 247, 0.35)',
        whiteSpace: 'nowrap',
        maxWidth: 240,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
    >
      <svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: 'none' }}>
        <rect x="2" y="3" width="12" height="10" rx="2" />
        <path d="M6 6.5l2.2 1.6L6 9.7" />
        <path d="M9.5 9.5h2" />
      </svg>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {state.alias ?? ''} @ {label}
      </span>
    </span>
  )
}
