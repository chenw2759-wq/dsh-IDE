/**
 * Wire contract between the host half (routes.ts) and the browser half
 * (client/api.ts). Pure types only — imported by both halves, bundled into
 * each, no runtime identity to share.
 */
/** The two workspace modes of the plugin. */
export type WorkspaceMode = 'local' | 'remote';
/** The plugin's mode state (host-owned singleton). */
export interface WorkspaceState {
    /** Current mode: local = this machine, remote = an SSH host. */
    mode: WorkspaceMode;
    /** Active SSH host alias (kept while in local mode so the toggle can return). */
    alias?: string;
    /** Resolved absolute remote root (the workspace gate prefix). */
    remoteRoot?: string;
    /** Human label of the remote root ('~' when the default home was resolved). */
    remoteRootLabel?: string;
}
/** One directory entry (both backends normalize to this shape). */
export interface WorkspaceEntry {
    name: string;
    type: 'dir' | 'file' | 'other';
    size: number;
    mtimeMs: number;
}
/** Directory listing response. */
export interface DirListing {
    /** The listed absolute path. */
    path: string;
    entries: WorkspaceEntry[];
}
/** File read response (text only; binary/oversize is rejected with an error). */
export interface FileRead {
    path: string;
    content: string;
    size: number;
    mtime: number;
}
/** File write response (new mtime for the UI's conflict tracking). */
export interface FileWriteResult {
    mtime: number;
}
/** One filename-search hit. */
export interface SearchHit {
    /** Absolute path. */
    path: string;
    /** Path relative to the search root. */
    rel: string;
    isDir: boolean;
}
/** Filename-search response. */
export interface SearchView {
    query: string;
    hits: SearchHit[];
    truncated: boolean;
}
/** JSON error body used by every route. */
export interface ApiErrorBody {
    error: string;
}
/** Route paths the client calls (shared literals). */
export declare const WORKSPACE_API_BASE: "/api/dsh-easyssh";
export declare const WORKSPACE_API: {
    readonly state: string;
    readonly tree: string;
    readonly file: string;
    readonly search: string;
};
//# sourceMappingURL=protocol.d.ts.map