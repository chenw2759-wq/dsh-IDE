/**
 * The `ctx.fs` switching facade: local mode delegates to the deployment's
 * sandboxed local backend (mounted in an isolated child scope), remote mode
 * delegates to the SSH filesystem provider. One instance provides `ctx.fs`
 * in the host scope after the `fs-sandbox` row is disabled by the profile
 * patch, so every model-facing fs tool switches execution worlds with the
 * mode store.
 *
 * @module dsh-easyssh/switch-fs
 */
import { FileSystem } from '@deepseek-ai/dsh-fs';
import type { FsDirEntry, FsEditOutcome, FsEditRequest, FsInfo, FsPathInfo, FsTarget, FsWriteIntent, FsWriteOutcome } from '@deepseek-ai/dsh-fs';
import type { SandboxMode } from '@deepseek-ai/dsh-sandbox';
import type { Context } from '@deepseek-ai/cordis';
import type { WorkspaceState } from '../protocol.ts';
import type { SshFileSystem } from '../remote/remote-fs.ts';
/** Switch dependencies: both backends plus the mode feed. */
export interface SwitchFsDeps {
    local: FileSystem;
    remote: SshFileSystem;
    getState: () => WorkspaceState;
}
/** Mode-routing filesystem facade (provides `ctx.fs`). */
export declare class SwitchFileSystem extends FileSystem {
    private readonly deps;
    constructor(ctx: Context, deps: SwitchFsDeps);
    /** The active backend for the current mode. */
    private delegate;
    /**
     * The capability fact the tool layer reads: the local backend's sandbox
     * default in local mode; no confinement in remote mode (remote execution
     * cannot be fenced by the local sandbox).
     */
    get sandboxMode(): SandboxMode | undefined;
    resolve(path: string, opts?: {
        cwd?: string;
        signal?: AbortSignal;
    }): Promise<FsTarget>;
    processPath(target: FsTarget): string;
    fileUrl(target: FsTarget): string;
    contains(parent: FsTarget, child: FsTarget): boolean;
    stat(target: FsTarget, signal?: AbortSignal): Promise<FsInfo | undefined>;
    lstat(path: string, opts?: {
        cwd?: string;
    }, signal?: AbortSignal): Promise<FsPathInfo | undefined>;
    readText(target: FsTarget, signal?: AbortSignal): Promise<string>;
    streamText(target: FsTarget, signal?: AbortSignal): Promise<AsyncIterable<string>>;
    readBytes(target: FsTarget, signal: AbortSignal | undefined, maxBytes: number): Promise<Uint8Array>;
    listDir(target: FsTarget, signal?: AbortSignal): Promise<FsDirEntry[]>;
    writeText(target: FsTarget, content: string, expected?: FsWriteIntent, signal?: AbortSignal, sandboxPolicy?: Parameters<FileSystem['writeText']>[4]): Promise<FsWriteOutcome>;
    editText(target: FsTarget, edit: FsEditRequest, expected?: {
        version: ReturnType<typeof import('@deepseek-ai/dsh-fs').FsVersion>;
    }, signal?: AbortSignal, sandboxPolicy?: Parameters<FileSystem['editText']>[4]): Promise<FsEditOutcome>;
}
export default SwitchFileSystem;
//# sourceMappingURL=switch-fs.d.ts.map