import type { SshApi } from '../api.ts';
/** Tunnels tab props. */
export interface TunnelsTabProps {
    api: SshApi;
}
/** The tunnels tab. */
export declare function TunnelsTab({ api }: TunnelsTabProps): import("react").JSX.Element;
