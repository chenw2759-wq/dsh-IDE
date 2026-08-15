/**
 * The two session-header utility buttons (registered in
 * conversation.session.header.utilities, left of the session-log entry):
 * the SSH configure/enter button and the local⇄remote toggle. The runtime
 * dependencies (mode / api / hostsApi) arrive as slot-injected owner props.
 */
import { type ReactElement } from 'react';
import type { ModeState } from './state.ts';
import type { WorkspaceApi, SshHostsApi } from './api.ts';
/**
 * The composed slot props: our inject face plus the framework standard kit
 * (unused by these buttons — typed loosely so the registration's composed
 * props constraint is satisfied without importing the conversation package's
 * prop tables into the component).
 */
export interface ConnectButtonProps {
    mode: ModeState;
    api: WorkspaceApi;
    hostsApi: SshHostsApi;
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
export interface ToggleButtonProps {
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
/** The SSH configure/enter button (always visible). */
export declare function ConnectButton(props: ConnectButtonProps): ReactElement;
/** The local⇄remote toggle (visible once a remote target exists). */
export declare function ToggleButton(props: ToggleButtonProps): ReactElement | null;
//# sourceMappingURL=header.d.ts.map