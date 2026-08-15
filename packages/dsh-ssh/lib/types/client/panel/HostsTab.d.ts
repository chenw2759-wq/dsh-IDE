import type { SshApi } from '../api.ts';
/** Hosts tab props. */
export interface HostsTabProps {
    api: SshApi;
    /** Connect the given alias in the terminal tab. */
    onConnect: (alias: string) => void;
}
/** The hosts table plus its toolbar and dialogs. */
export declare function HostsTab({ api, onConnect }: HostsTabProps): import("react").JSX.Element;
