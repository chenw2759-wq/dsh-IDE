/**
 * The SSH engine: a per-alias persistent connection pool (ssh2) with
 * multi-hop jump support, command execution, PTY shells, SFTP transfers,
 * local port-forward tunnels and cluster execution — the DSH counterpart of
 * ssh-skill's daemon + scripts, living entirely in the host process.
 */
import type { ClusterResult, ExecResult, SshHostSummary, TestResult, TransferProgress, TunnelInfo } from './protocol.ts';
import { type HostStore } from './store.ts';
/** Default engine knobs. */
export interface EngineOptions {
    /** Connections idle longer than this are closed (ms). */
    idleTimeoutMs?: number;
    /** SSH handshake timeout (ms). */
    connectTimeoutMs?: number;
    /** Keepalive ping interval (ms). */
    keepaliveIntervalMs?: number;
    /** Cap on captured stdout/stderr bytes per exec (ms). */
    maxOutputBytes?: number;
    /** Default exec timeout (ms). */
    defaultExecTimeoutMs?: number;
    /** Default cluster concurrency. */
    defaultMaxWorkers?: number;
    /** SFTP concurrent channel count for transfers. */
    sftpConcurrency?: number;
}
/** A live PTY shell session. */
export interface ShellSession {
    /** Assign to receive remote output. */
    onData?: (data: Buffer) => void;
    /** Assign to be notified when the channel closes. */
    onExit?: (code: number | null, error?: string) => void;
    /** Write raw input to the shell. */
    send(data: string): void;
    /** Resize the remote PTY. */
    resize(cols: number, rows: number): void;
    /** Send an SSH signal (e.g. 'TERM', 'KILL') to the remote process group. */
    signal(name: string): void;
    /** Close the session and its channel. */
    close(): void;
    /** Pause remote output delivery (transport backpressure). */
    pause(): void;
    /** Resume remote output delivery. */
    resume(): void;
}
/**
 * A live streaming exec channel (no PTY): separate stdout/stderr delivery,
 * stdin writes, SSH signals (TERM/KILL), and an explicit end for the final
 * input burst. Used by the subprocess capability seam's remote provider.
 */
export interface ExecSession extends ShellSession {
    /** Assign to receive the remote stderr stream. */
    onErrData?: (data: Buffer) => void;
    /** Send an SSH signal (e.g. 'TERM', 'KILL') to the remote process. */
    signal(name: string): void;
    /** Write the final input burst and half-close stdin. */
    end(data?: string): void;
}
/**
 * The engine. Owns the pool, tunnels, and all operations. One instance per
 * plugin apply; dispose() closes every connection.
 */
export declare class SshEngine {
    private readonly store;
    private readonly opts;
    private readonly pool;
    private readonly tunnels;
    private sweepTimer;
    private nextTunnelId;
    /**
     * @param store - the host config store.
     * @param options - engine knobs (defaults applied).
     */
    constructor(store: HostStore, options?: EngineOptions);
    /** Secret-free host list (filtered by the optional query). */
    list(query?: string): SshHostSummary[];
    /** One host summary by alias. */
    find(alias: string): SshHostSummary | undefined;
    /**
     * Run `fn` with a live client for `alias`, reconnecting (up to the
     * attempt budget) when the connection broke mid-flight.
     */
    private withClient;
    /**
     * Build one full jump chain for an entry: hop clients connected through in
     * order, each forwarding a stream to the next destination, ending with the
     * target client. Shared by the pool and standalone shell sessions.
     */
    private connectChain;
    /** In-flight acquire promises, deduped per alias (concurrent first use). */
    private readonly acquireQueue;
    /** Connect (or reuse) the pooled chain for one alias; pins nothing. */
    private acquire;
    private doAcquire;
    /**
     * Tear down one alias's record. When `record` is given and no longer the
     * pooled record for the alias (a concurrent acquire replaced it), nothing
     * is torn down — the connection belongs to someone else now.
     */
    private disposeRecord;
    /** Close connections idle beyond the threshold (skips pinned and in-flight). */
    private sweep;
    /** Run one command on `alias` (reusing the pooled connection). */
    exec(alias: string, command: string, timeoutMs?: number): Promise<ExecResult>;
    /** Run one command against many hosts concurrently. */
    cluster(options: {
        command: string;
        aliases?: string[];
        environment?: string;
        tags?: string[];
        timeoutMs?: number;
        maxWorkers?: number;
    }): Promise<ClusterResult[]>;
    /** Open a PTY shell session for the web terminal (standalone connection). */
    openShell(alias: string, size: {
        cols: number;
        rows: number;
    }): Promise<ShellSession>;
    /**
     * Open a streaming exec channel (no PTY) for the remote subprocess seam.
     * Like the PTY shell, the channel rides its own connection so closing it
     * can never tear down a pooled exec/tunnel sharing the alias.
     */
    openExec(alias: string, command: string): Promise<ExecSession>;
    /** Upload one local file (or directory tree) to a remote path. */ upload(alias: string, localPath: string, remotePath: string, recursive: boolean, onProgress?: (progress: TransferProgress) => void): Promise<{
        bytes: number;
        files: number;
    }>;
    /** Download one remote file to a local path. */
    download(alias: string, remotePath: string, localPath: string, onProgress?: (progress: TransferProgress) => void): Promise<{
        bytes: number;
    }>;
    /** List a remote directory (file browser). */
    ls(alias: string, path: string): Promise<import('./protocol.ts').RemoteDirEntry[]>;
    /**
     * Classify readdir entries, following symlinks so a link to a directory
     * (e.g. AutoDL's /root/autodl-tmp) lists as a directory instead of 'other'.
     */
    private classifyEntries;
    /** Stat one remote path (file browser / conflict checks). */
    stat(alias: string, remotePath: string): Promise<{
        type: 'dir' | 'file' | 'other';
        size: number;
        mtimeMs: number;
        mode: number;
    }>;
    /**
     * Lstat one remote path without following the final symlink. Returns
     * undefined when the path is absent (the fs seam's lstat contract).
     */
    lstat(alias: string, remotePath: string): Promise<{
        type: 'file' | 'directory' | 'symlink' | 'other';
        size: number;
        mtimeMs: number;
        mode: number;
    } | undefined>;
    /**
     * Open a remote file read stream (the fs seam's streamText). The returned
     * stream must be consumed or destroyed; the pooled connection stays busy
     * for the stream's lifetime.
     */
    readStream(alias: string, remotePath: string): Promise<import('node:stream').Readable>;
    /**
     * Read one remote file fully into memory (text or binary) with its mtime.
     * The workspace plugin's text gate (UTF-8 + size caps) lives on its caller.
     */
    readFile(alias: string, remotePath: string): Promise<{
        content: Buffer;
        mtime: number;
        size: number;
    }>;
    /**
     * Write one remote file from memory (parents are created). When
     * `expectedMtime` is given, a stat-then-write conflict check throws before
     * any byte is written (the GUI and the workspace tools use it for
     * overwrite protection).
     */
    writeFile(alias: string, remotePath: string, content: Buffer, expectedMtime?: number): Promise<{
        mtime: number;
    }>;
    /** Create a remote directory chain (mkdir -p semantics). */
    mkdir(alias: string, remotePath: string): Promise<void>;
    /**
     * Remove a remote file or directory. Directories require `recursive: true`
     * and are walked depth-first (children first, then the directory itself).
     */
    rm(alias: string, remotePath: string, recursive?: boolean): Promise<void>;
    /** Rename / move a remote path (mv semantics, same filesystem). */
    rename(alias: string, fromPath: string, toPath: string): Promise<void>;
    /** Stat wrapper (one SFTP stat call). */
    private sftpStat;
    private sftp;
    /** Create a remote directory chain (stat-then-mkdir per segment). */
    private ensureRemoteDir;
    private fastPut;
    private fastGet;
    /** Start a local port-forward tunnel (listens on 127.0.0.1 only). */
    startTunnel(alias: string, options: {
        remotePort: number;
        remoteHost?: string;
        localPort?: number;
    }): Promise<TunnelInfo>;
    /** All active tunnels. */
    listTunnels(): TunnelInfo[];
    /** Stop one tunnel (closes the listener, live sockets, and the pinned connection). */
    stopTunnel(id: string): boolean;
    /** Stop all tunnels (optionally for one alias). */
    stopAllTunnels(alias?: string): number;
    /** Probe connectivity: connect, run `true`, close. */
    test(alias: string): Promise<TestResult>;
    /** Close every pooled connection and tunnel. */
    dispose(): void;
}
