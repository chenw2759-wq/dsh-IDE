import type { SshApi } from '../api.ts';
/** Terminal tab props. */
export interface TerminalTabProps {
    api: SshApi;
    /** Alias preselected by a "connect" action from the hosts tab. */
    presetAlias?: string;
    /** Monotonic id of the connect request (re-applies presetAlias). */
    requestId?: number;
}
/** The xterm terminal view. */
export declare function TerminalTab({ api, presetAlias, requestId }: TerminalTabProps): import("react").JSX.Element;
