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
import { SubprocessRuntime } from '@deepseek-ai/dsh-subprocess';
import type { SubprocessHandle, SubprocessSpawnSpec, SubprocessTerminalHandle, SubprocessTerminalSpawnSpec } from '@deepseek-ai/dsh-subprocess';
import type { Context } from '@deepseek-ai/cordis';
import type { WorkspaceState } from '../protocol.ts';
import type { SshSubprocessRuntime } from '../remote/remote-subprocess.ts';
/** Switch dependencies: both runtimes plus the mode feed. */
export interface SwitchSubprocessDeps {
    local: SubprocessRuntime;
    remote: SshSubprocessRuntime;
    getState: () => WorkspaceState;
}
/** Mode-routing subprocess facade (provides `ctx.subprocess`). */
export declare class SwitchSubprocessRuntime extends SubprocessRuntime {
    private readonly deps;
    constructor(ctx: Context, deps: SwitchSubprocessDeps);
    /** The active backend for the current mode. */
    private delegate;
    /** @inheritdoc */
    resolveExecutable(command: string, env?: Readonly<Record<string, string>>, signal?: AbortSignal): Promise<string>;
    /** @inheritdoc */
    spawn(spec: SubprocessSpawnSpec): SubprocessHandle;
    /** @inheritdoc */
    spawnTerminal(spec: SubprocessTerminalSpawnSpec): Promise<SubprocessTerminalHandle>;
}
export default SwitchSubprocessRuntime;
//# sourceMappingURL=switch-subprocess.d.ts.map