/**
 * Remote subprocess provider for the `ctx.subprocess` capability seam: each
 * spawn opens a streaming exec channel (or a PTY for terminals) on the
 * current SSH-mode host through the dsh-ssh engine; output spill files stay
 * on the local host. Ported from UynajGI/dsh-ssh (MIT).
 *
 * @module dsh-easyssh/remote-subprocess
 */
import type { Context } from '@deepseek-ai/cordis';
import type { SshEngine } from '@deepseek-ai/dsh-ssh';
import { SubprocessRuntime } from '@deepseek-ai/dsh-subprocess';
import type { SubprocessHandle, SubprocessSpawnSpec, SubprocessTerminalHandle, SubprocessTerminalSpawnSpec } from '@deepseek-ai/dsh-subprocess';
import type { WorkspaceState } from '../protocol.ts';
/** SSH command manager registered as `ctx.subprocess` (remote mode). */
export declare class SshSubprocessRuntime extends SubprocessRuntime {
    private readonly engine;
    private readonly getState;
    private readonly live;
    private readonly terminals;
    private readonly spillDir;
    private disposing;
    constructor(ctx: Context, engine: SshEngine, getState: () => WorkspaceState);
    /** @inheritdoc */
    resolveExecutable(command: string, env?: Readonly<Record<string, string>>, signal?: AbortSignal): Promise<string>;
    /** @inheritdoc */
    spawn(spec: SubprocessSpawnSpec): SubprocessHandle;
    /** @inheritdoc */
    spawnTerminal(spec: SubprocessTerminalSpawnSpec): Promise<SubprocessTerminalHandle>;
}
export default SshSubprocessRuntime;
//# sourceMappingURL=remote-subprocess.d.ts.map