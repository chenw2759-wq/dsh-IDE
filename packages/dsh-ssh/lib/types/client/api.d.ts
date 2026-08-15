/**
 * Browser-side API client for the /api/dsh-ssh route family. The only data
 * access path the panel components use — plain fetch/WebSocket, same origin.
 */
import { type ClusterResult, type ExecResult, type HostPayload, type ImportResult, type RemoteDirEntry, type SshHostSummary, type TestResult, type TransferProgress, type TunnelInfo } from '../protocol.ts';
/** Error carrying the route's JSON error message. */
export declare class SshApiError extends Error {
    constructor(message: string);
}
/** One open terminal connection (WebSocket JSON frames). */
export interface TerminalConnection {
    /** Fired on the ready frame (shell is up). */
    onReady: (() => void) | undefined;
    /** Fired on every output frame. */
    onOutput: ((data: string) => void) | undefined;
    /** Fired on the exit frame (or transport error). */
    onExit: ((code: number | null, error?: string) => void) | undefined;
    /** Send raw input to the remote shell. */
    send(data: string): void;
    /** Resize the remote PTY. */
    resize(cols: number, rows: number): void;
    /** Close the socket and the remote session. */
    close(): void;
}
/** The browser half's only data entry point. */
export declare class SshApi {
    listHosts(queryText?: string): Promise<SshHostSummary[]>;
    createHost(payload: HostPayload): Promise<SshHostSummary>;
    updateHost(alias: string, patch: HostPayload): Promise<SshHostSummary>;
    deleteHost(alias: string): Promise<void>;
    importSshConfig(): Promise<ImportResult>;
    testHost(alias: string): Promise<TestResult>;
    exec(alias: string, command: string, timeoutMs?: number): Promise<ExecResult>;
    cluster(options: {
        command: string;
        aliases?: string[];
        environment?: string;
        tags?: string[];
        timeoutMs?: number;
        maxWorkers?: number;
    }): Promise<ClusterResult[]>;
    ls(alias: string, path: string): Promise<RemoteDirEntry[]>;
    listTunnels(): Promise<TunnelInfo[]>;
    startTunnel(options: {
        alias: string;
        remotePort: number;
        remoteHost?: string;
        localPort?: number;
    }): Promise<TunnelInfo>;
    stopTunnel(tunnelId: string): Promise<boolean>;
    stopAllTunnels(alias?: string): Promise<number>;
    /**
     * Upload one file (raw bytes) to a remote path. Progress arrives through
     * the NDJSON response stream; resolves when the result frame lands.
     */
    uploadFile(file: File, alias: string, remotePath: string, onProgress?: (progress: TransferProgress) => void): Promise<{
        transferredBytes: number;
    }>;
    /**
     * Download a remote file with client-side progress. Streams straight to
     * disk when the File System Access API is available (no full-file RAM
     * copy); otherwise falls back to an in-memory Blob.
     */
    downloadFile(alias: string, remotePath: string, onProgress?: (progress: TransferProgress) => void): Promise<{
        blob?: Blob;
        filename: string;
        streamed: boolean;
        bytes: number;
    }>;
    /** Open a WebSocket terminal session. */
    openTerminal(alias: string, cols: number, rows: number): TerminalConnection;
}
