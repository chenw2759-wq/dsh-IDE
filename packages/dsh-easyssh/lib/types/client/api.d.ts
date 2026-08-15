/**
 * Browser-side API clients: the /api/dsh-easyssh route family plus the
 * two /api/dsh-ssh endpoints the config dialog needs (host create + test).
 * Plain fetch, same origin — the only data path the panel components use.
 */
import { type DirListing, type FileRead, type FileWriteResult, type SearchView, type WorkspaceState } from '../protocol.ts';
/** Error carrying the route's JSON error message. */
export declare class WorkspaceApiError extends Error {
    constructor(message: string);
}
/** The workspace route family client. */
export declare class WorkspaceApi {
    getState(): Promise<WorkspaceState>;
    setModeLocal(): Promise<WorkspaceState>;
    setModeRemote(alias: string, remoteRoot?: string): Promise<WorkspaceState>;
    list(root: string, path: string): Promise<DirListing>;
    read(root: string, path: string): Promise<FileRead>;
    write(root: string, path: string, content: string, expectedMtime?: number): Promise<FileWriteResult>;
    search(root: string, queryText: string): Promise<SearchView>;
}
/** The two /api/dsh-ssh endpoints the config dialog needs (host create/test). */
export interface SshHostPayload {
    alias?: string;
    host: string;
    port?: number;
    user: string;
    auth?: {
        kind: 'key' | 'password';
        keyPath?: string;
        passphrase?: string;
        password?: string;
    };
    description?: string;
}
export interface SshHostSummary {
    alias: string;
    host: string;
    port: number;
    user: string;
    auth: 'key' | 'password';
    keyReady: boolean;
    description?: string;
    createdAt: number;
    updatedAt: number;
}
export interface TestResult {
    ok: boolean;
    latencyMs?: number;
    error?: string;
}
export declare class SshHostsApi {
    list(): Promise<SshHostSummary[]>;
    create(payload: SshHostPayload): Promise<SshHostSummary>;
    test(alias: string): Promise<TestResult>;
}
//# sourceMappingURL=api.d.ts.map