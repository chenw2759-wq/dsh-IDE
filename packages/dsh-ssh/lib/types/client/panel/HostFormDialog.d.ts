import type { SshApi } from '../api.ts';
import type { SshHostSummary } from '../../protocol.ts';
/** Host form dialog props. */
export interface HostFormDialogProps {
    api: SshApi;
    /** The host being edited; null/undefined means create. */
    editing?: SshHostSummary | null;
    onClose: () => void;
    onSaved: (host: SshHostSummary) => void;
}
/** The create/edit host modal. */
export declare function HostFormDialog({ api, editing, onClose, onSaved }: HostFormDialogProps): import("react").JSX.Element;
