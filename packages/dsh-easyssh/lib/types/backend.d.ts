import type { SshEngine } from '@deepseek-ai/dsh-ssh';
import type { DirListing, FileRead, FileWriteResult, SearchView, WorkspaceState } from './protocol.ts';
/** Search caps (hits, scanned entries, depth). */
export declare const SEARCH_HIT_CAP = 200;
export declare const SEARCH_SCAN_CAP = 20000;
export declare const SEARCH_MAX_DEPTH = 4;
/** Error carrying a stable machine-readable code (routes map codes to status). */
export declare class BackendError extends Error {
    readonly code: 'binary' | 'too-large' | 'conflict' | 'outside-root' | 'not-remote' | 'root-mismatch' | 'io';
    constructor(code: 'binary' | 'too-large' | 'conflict' | 'outside-root' | 'not-remote' | 'root-mismatch' | 'io', message: string);
}
/** Normalize a workspace-relative path: strip slashes and '.', reject '..'. */
export declare function normalizeRel(raw: string): string;
/** True when abs is inside root (prefix on normalized paths). */
export declare function isInside(root: string, abs: string): boolean;
/** Resolve a rel path against a root using posix semantics (both backends). */
export declare function relToAbs(root: string, rel: string): string;
/** Escape a string into a POSIX single-quoted shell word. */
export declare function shellQuote(value: string): string;
/** The backend contract both implementations satisfy. */
export interface WorkspaceBackend {
    /** Validate that the requested root is acceptable in the current mode. */
    assertRoot(root: string): void;
    list(root: string, rel: string): Promise<DirListing>;
    read(root: string, rel: string): Promise<FileRead>;
    write(root: string, rel: string, content: string, expectedMtime?: number): Promise<FileWriteResult>;
    search(root: string, query: string): Promise<SearchView>;
}
/**
 * Local backend: plain node:fs against an absolute local root (the session's
 * cwd, supplied by the browser). Realpath-walk gating keeps symlinks inside.
 */
export declare class LocalBackend implements WorkspaceBackend {
    assertRoot(root: string): void;
    list(root: string, rel: string): Promise<DirListing>;
    read(root: string, rel: string): Promise<FileRead>;
    write(root: string, rel: string, content: string, expectedMtime?: number): Promise<FileWriteResult>;
    search(root: string, query: string): Promise<SearchView>;
    /** Realpath-walk gate: the resolved absolute path must stay inside root. */
    private resolve;
    private isWithin;
    private relOf;
    private io;
}
/**
 * Remote backend: every operation rides the dsh-ssh engine's SFTP/exec against
 * the mode's active host, gated to the resolved remote root.
 */
export declare class RemoteBackend implements WorkspaceBackend {
    private readonly engine;
    private readonly getState;
    constructor(engine: SshEngine, getState: () => WorkspaceState);
    private get alias();
    assertRoot(root: string): void;
    list(root: string, rel: string): Promise<DirListing>;
    read(root: string, rel: string): Promise<FileRead>;
    write(root: string, rel: string, content: string, expectedMtime?: number): Promise<FileWriteResult>;
    search(root: string, query: string): Promise<SearchView>;
    /** Glob search over the remote root (remote_glob tool; max depth 6). */
    glob(root: string, pattern: string): Promise<SearchView>;
    /** Content grep over the remote root (remote_grep tool; capped output). */
    grep(root: string, pattern: string): Promise<{
        lines: string[];
        truncated: boolean;
    }>;
    /** Run one find command and normalize its '%y|%p' lines. */
    private parseFind;
    private relOf;
    private io;
}
//# sourceMappingURL=backend.d.ts.map