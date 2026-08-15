/**
 * The `ctx.subprocess` switching facade: local mode delegates to the
 * deployment's local subprocess runtime (mounted in an isolated child scope),
 * remote mode delegates to the SSH subprocess provider. One instance provides
 * `ctx.subprocess` in the host scope after the `subprocess` row is disabled
 * by the profile patch, so the model's bash/terminal tools switch execution
 * worlds with the mode store.
 *
 * @module dsh-easyssh/switch-subprocess
 */

import { SubprocessRuntime } from '@deepseek-ai/dsh-subprocess'
import type {
  SubprocessHandle,
  SubprocessSpawnSpec,
  SubprocessTerminalHandle,
  SubprocessTerminalSpawnSpec,
} from '@deepseek-ai/dsh-subprocess'
import type { Context } from '@deepseek-ai/cordis'
import type { WorkspaceState } from '../protocol.ts'
import type { SshSubprocessRuntime } from '../remote/remote-subprocess.ts'

/** Switch dependencies: both runtimes plus the mode feed. */
export interface SwitchSubprocessDeps {
  local: SubprocessRuntime
  remote: SshSubprocessRuntime
  getState: () => WorkspaceState
}

/** Mode-routing subprocess facade (provides `ctx.subprocess`). */
export class SwitchSubprocessRuntime extends SubprocessRuntime {
  constructor(ctx: Context, private readonly deps: SwitchSubprocessDeps) {
    super(ctx)
  }

  /** The active backend for the current mode. */
  private delegate(): SubprocessRuntime {
    return this.deps.getState().mode === 'remote' ? this.deps.remote : this.deps.local
  }

  /** @inheritdoc */
  resolveExecutable(
    command: string,
    env?: Readonly<Record<string, string>>,
    signal?: AbortSignal,
  ): Promise<string> {
    return this.delegate().resolveExecutable(command, env, signal)
  }

  /** @inheritdoc */
  spawn(spec: SubprocessSpawnSpec): SubprocessHandle {
    return this.delegate().spawn(spec)
  }

  /** @inheritdoc */
  spawnTerminal(spec: SubprocessTerminalSpawnSpec): Promise<SubprocessTerminalHandle> {
    return this.delegate().spawnTerminal(spec)
  }
}

export default SwitchSubprocessRuntime
