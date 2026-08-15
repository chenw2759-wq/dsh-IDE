import type { SshApi } from '../api.ts';
/** Transfer tab props. */
export interface TransferTabProps {
    api: SshApi;
}
/** The upload/download tab. */
export declare function TransferTab({ api }: TransferTabProps): import("react").JSX.Element;
