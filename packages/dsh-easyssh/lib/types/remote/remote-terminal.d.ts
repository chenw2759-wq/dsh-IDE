/**
 * SSH PTY allocation and process-session ownership for the subprocess seam.
 * Ported from UynajGI/dsh-ssh (MIT) — the raw ssh2 shell channel is replaced
 * by the engine's openShell session.
 */
import { PassThrough } from 'node:stream';
import type { SshEngine } from '@deepseek-ai/dsh-ssh';
import type { SubprocessOutcome, SubprocessTerminalForeground, SubprocessTerminalHandle, SubprocessTerminalSignal, SubprocessTerminalSpawnSpec } from '@deepseek-ai/dsh-subprocess';
import type { WorkspaceState } from '../protocol.ts';
/** One SSH PTY and its remote login shell, projected onto the subprocess terminal seam. */
export declare class SshTerminalHandle implements SubprocessTerminalHandle {
    private readonly closeChannel;
    private readonly sendChannel;
    private readonly signalChannel;
    private readonly graceMs;
    readonly pid = -1;
    readonly output: PassThrough;
    readonly done: Promise<SubprocessOutcome>;
    private exitResolve;
    topLevelExited: boolean;
    private cleanup;
    constructor(closeChannel: () => void, sendChannel: (data: string) => void, signalChannel: (name: string) => void, graceMs: number);
    /** Settle the exit promise (called by the runtime when the channel closes). */
    resolveExit(outcome: SubprocessOutcome): void;
    /** @inheritdoc */
    write(data: string): Promise<void>;
    /** The SSH channel does not expose a foreground process group. */
    inspectForeground(): Promise<SubprocessTerminalForeground | undefined>;
    /** @inheritdoc */
    signalForeground(_signal: SubprocessTerminalSignal): Promise<number>;
    /** @inheritdoc */
    terminate(): Promise<void>;
    private signal;
    private closeOnce;
}
/**
 * Allocate an SSH PTY, replace its login shell with the requested argv, and
 * return the live terminal handle.
 */
export declare function spawnSshTerminal(engine: SshEngine, getState: () => WorkspaceState, spec: SubprocessTerminalSpawnSpec): Promise<SshTerminalHandle>;
//# sourceMappingURL=remote-terminal.d.ts.map