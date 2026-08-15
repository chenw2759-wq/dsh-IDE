/**
 * The remote-workspace badge: a session-header action (static context, before
 * interactive buttons) showing the ACTIVE remote workspace while in SSH mode —
 * `cys01 @ /root/autodl-tmp`. DSH's own workspace label is host-local and
 * immutable, so this badge is where the real working directory is surfaced.
 */
import { type ReactElement } from 'react';
import type { ModeState } from './state.ts';
/** Composed slot props (standard kit ignored via optional unknowns). */
export interface RemoteWorkspaceBadgeProps {
    mode: ModeState;
    sessionId?: unknown;
    useSession?: unknown;
    useSessions?: unknown;
    useWorkspaces?: unknown;
    useProjection?: unknown;
    useInput?: unknown;
    inputActions?: unknown;
    renderSlot?: unknown;
    renderSlotChain?: unknown;
    t?: unknown;
}
/** The badge: hidden in local mode, shows the remote workspace in SSH mode. */
export declare function RemoteWorkspaceBadge(props: RemoteWorkspaceBadgeProps): ReactElement | null;
//# sourceMappingURL=badge.d.ts.map