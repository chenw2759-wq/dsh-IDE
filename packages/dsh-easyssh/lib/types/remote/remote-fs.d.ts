/**
 * Remote filesystem provider for the `ctx.fs` capability seam: paths,
 * contents, and atomic staging files live on the remote host, reached through
 * the dsh-ssh engine's SFTP/exec primitives. Ported and adapted from
 * UynajGI/dsh-ssh (MIT, https://github.com/UynajGI/dsh-ssh) — the seam
 * contract (targets, versions, atomic writes, CRLF handling, canonical path
 * transport) is preserved; the connection owner is replaced by the shared
 * SshEngine and the working directory follows the mode store's remote root.
 *
 * @module dsh-easyssh/remote-fs
 */
import type { Context } from '@deepseek-ai/cordis';
import type { SshEngine } from '@deepseek-ai/dsh-ssh';
import { FileSystem, FsVersion } from '@deepseek-ai/dsh-fs';
import type { FsDirEntry, FsEditOutcome, FsEditRequest, FsInfo, FsPathInfo, FsTarget, FsWriteIntent, FsWriteOutcome } from '@deepseek-ai/dsh-fs';
import type { WorkspaceState } from '../protocol.ts';
/**
 * Remote filesystem backend over the dsh-ssh engine. The working directory
 * follows the mode store: relative paths resolve against the resolved remote
 * root; a POSIX-absolute cwd override is honored; local (Windows) cwds are
 * ignored so the model's relative-path habit keeps working remotely.
 */
export declare class SshFileSystem extends FileSystem {
    private readonly engine;
    private readonly getState;
    private readonly locks;
    constructor(ctx: Context, engine: SshEngine, getState: () => WorkspaceState);
    /** The active remote execution world (throws when not in remote mode). */
    private current;
    /**
     * Resolve the working directory for a path: a POSIX-absolute cwd wins;
     * anything else (relative or a local Windows path) falls back to the
     * remote root.
     */
    resolveRemoteCwd(cwd: string | undefined): string;
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
    readBytes(target: FsTarget, signal: AbortSignal | undefined, maxBytes: number): Promise<Uint8Array>;
    streamText(target: FsTarget, signal?: AbortSignal): Promise<AsyncIterable<string>>;
    listDir(target: FsTarget, signal?: AbortSignal): Promise<FsDirEntry[]>;
    writeText(target: FsTarget, content: string, expected?: FsWriteIntent, signal?: AbortSignal): Promise<FsWriteOutcome>;
    editText(target: FsTarget, edit: FsEditRequest, expected?: {
        version: ReturnType<typeof FsVersion>;
    }, signal?: AbortSignal): Promise<FsEditOutcome>;
    private withLock;
    private canonicalPath;
    private probe;
    private requireRegular;
    private readBytesRaw;
    private checkWriteIntent;
    private readForDiff;
    private readForEdit;
    private writeAtomic;
    private removeStaging;
    /** Normalize an engine stat/ls shape into the RemoteStats the helpers expect. */
    private asStats;
}
export default SshFileSystem;
//# sourceMappingURL=remote-fs.d.ts.map