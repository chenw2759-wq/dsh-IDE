import { type ReactElement } from 'react';
import type { ModeState } from './state.ts';
import type { SshHostsApi, WorkspaceApi } from './api.ts';
/** Open the dialog (mounts one overlay; subsequent calls reuse the element). */
export declare function openConfigDialog(mode: ModeState, api: WorkspaceApi, hostsApi: SshHostsApi): void;
/** The dialog body. */
export declare function ConfigDialog(props: {
    mode: ModeState;
    api: WorkspaceApi;
    hostsApi: SshHostsApi;
    onClose: () => void;
}): ReactElement;
//# sourceMappingURL=dialog.d.ts.map