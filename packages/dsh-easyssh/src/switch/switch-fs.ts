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

import { FileSystem } from '@deepseek-ai/dsh-fs'
import type {
  FsDirEntry,
  FsEditOutcome,
  FsEditRequest,
  FsInfo,
  FsPathInfo,
  FsTarget,
  FsWriteIntent,
  FsWriteOutcome,
} from '@deepseek-ai/dsh-fs'
import type { SandboxMode } from '@deepseek-ai/dsh-sandbox'
import type { Context } from '@deepseek-ai/cordis'
import type { WorkspaceState } from '../protocol.ts'
import type { SshFileSystem } from '../remote/remote-fs.ts'

/** Switch dependencies: both backends plus the mode feed. */
export interface SwitchFsDeps {
  local: FileSystem
  remote: SshFileSystem
  getState: () => WorkspaceState
}

/** Mode-routing filesystem facade (provides `ctx.fs`). */
export class SwitchFileSystem extends FileSystem {
  constructor(ctx: Context, private readonly deps: SwitchFsDeps) {
    super(ctx)
  }

  /** The active backend for the current mode. */
  private delegate(): FileSystem {
    return this.deps.getState().mode === 'remote' ? this.deps.remote : this.deps.local
  }

  /**
   * The capability fact the tool layer reads: the local backend's sandbox
   * default in local mode; no confinement in remote mode (remote execution
   * cannot be fenced by the local sandbox).
   */
  override get sandboxMode(): SandboxMode | undefined {
    return this.deps.getState().mode === 'remote' ? undefined : this.deps.local.sandboxMode
  }

  override resolve(path: string, opts?: { cwd?: string; signal?: AbortSignal }): Promise<FsTarget> {
    return this.delegate().resolve(path, opts)
  }

  override processPath(target: FsTarget): string {
    return this.delegate().processPath(target)
  }

  override fileUrl(target: FsTarget): string {
    return this.delegate().fileUrl(target)
  }

  override contains(parent: FsTarget, child: FsTarget): boolean {
    return this.delegate().contains(parent, child)
  }

  override stat(target: FsTarget, signal?: AbortSignal): Promise<FsInfo | undefined> {
    return this.delegate().stat(target, signal)
  }

  override lstat(path: string, opts?: { cwd?: string }, signal?: AbortSignal): Promise<FsPathInfo | undefined> {
    return this.delegate().lstat(path, opts, signal)
  }

  override readText(target: FsTarget, signal?: AbortSignal): Promise<string> {
    return this.delegate().readText(target, signal)
  }

  override streamText(target: FsTarget, signal?: AbortSignal): Promise<AsyncIterable<string>> {
    return this.delegate().streamText(target, signal)
  }

  override readBytes(target: FsTarget, signal: AbortSignal | undefined, maxBytes: number): Promise<Uint8Array> {
    return this.delegate().readBytes(target, signal, maxBytes)
  }

  override listDir(target: FsTarget, signal?: AbortSignal): Promise<FsDirEntry[]> {
    return this.delegate().listDir(target, signal)
  }

  override writeText(
    target: FsTarget,
    content: string,
    expected?: FsWriteIntent,
    signal?: AbortSignal,
    sandboxPolicy?: Parameters<FileSystem['writeText']>[4],
  ): Promise<FsWriteOutcome> {
    return this.delegate().writeText(target, content, expected, signal, sandboxPolicy)
  }

  override editText(
    target: FsTarget,
    edit: FsEditRequest,
    expected?: { version: ReturnType<typeof import('@deepseek-ai/dsh-fs').FsVersion> },
    signal?: AbortSignal,
    sandboxPolicy?: Parameters<FileSystem['editText']>[4],
  ): Promise<FsEditOutcome> {
    return this.delegate().editText(target, edit, expected, signal, sandboxPolicy)
  }
}

export default SwitchFileSystem
