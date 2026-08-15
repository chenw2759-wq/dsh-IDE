/**
 * One asynchronously-started SSH command projected onto the subprocess seam.
 * Ported from UynajGI/dsh-ssh (MIT) — the raw ssh2 channel is replaced by the
 * engine's streaming ExecSession.
 */
import { PassThrough } from 'node:stream';
import type { SshEngine } from '@deepseek-ai/dsh-ssh';
import type { SubprocessHandle, SubprocessOutcome, SubprocessSpawnSpec } from '@deepseek-ai/dsh-subprocess';
import type { WorkspaceState } from '../protocol.ts';
/** SSH-backed subprocess handle. The channel does not expose a remote pid, so `pid` is `-1`. */
export declare class SshSubprocessHandle implements SubprocessHandle {
    private readonly engine;
    private readonly getState;
    private readonly spec;
    private readonly spillDir;
    readonly stdin: PassThrough | undefined;
    readonly stdout: PassThrough | undefined;
    readonly stderr: PassThrough | undefined;
    readonly collected: SubprocessHandle['collected'];
    readonly done: Promise<SubprocessOutcome>;
    private readonly terminationController;
    private readonly stdoutCollector;
    private readonly stderrCollector;
    private session;
    private graceTimer;
    private settled;
    constructor(engine: SshEngine, getState: () => WorkspaceState, spec: SubprocessSpawnSpec, spillDir: string);
    /** Remote process id; `-1` because the SSH channel does not expose one. */
    get pid(): number;
    /** @inheritdoc */
    terminate(): void;
    /** @inheritdoc */
    waitForExit(signal?: AbortSignal): Promise<boolean>;
    private readonly onAbort;
    private signalTerm;
    private settle;
    private run;
    private wireStdout;
    private wireStderr;
}
//# sourceMappingURL=remote-process.d.ts.map