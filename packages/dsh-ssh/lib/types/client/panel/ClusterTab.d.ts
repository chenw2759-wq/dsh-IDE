import type { SshApi } from '../api.ts';
/** Cluster tab props. */
export interface ClusterTabProps {
    api: SshApi;
}
/** The cluster execution tab. */
export declare function ClusterTab({ api }: ClusterTabProps): import("react").JSX.Element;
