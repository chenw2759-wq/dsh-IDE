/**
 * The SSH host-manager settings page (registered in the `settings.section`
 * slot): list/add/edit/delete/test hosts persisted in ~/.dsh/dsh-ssh.json,
 * plus enter/exit SSH mode — so hosts are configured once in Settings and the
 * header button only needs to connect.
 */
import { type ReactElement } from 'react';
import type { ModeState } from './state.ts';
import type { SshHostsApi, WorkspaceApi } from './api.ts';
/** Composed slot props (standard kit ignored via optional unknowns). */
export interface HostSettingsPageProps {
    mode: ModeState;
    api: WorkspaceApi;
    hostsApi: SshHostsApi;
    sessionId?: unknown;
    useSessions?: unknown;
    useWorkspaces?: unknown;
    useProjection?: unknown;
    useInput?: unknown;
    inputActions?: unknown;
    renderSlot?: unknown;
    renderSlotChain?: unknown;
    t?: unknown;
}
/** The settings page body. */
export declare function HostSettingsPage(props: HostSettingsPageProps): ReactElement;
//# sourceMappingURL=settings.d.ts.map