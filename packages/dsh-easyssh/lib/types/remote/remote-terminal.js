/**
 * SSH PTY allocation and process-session ownership for the subprocess seam.
 * Ported from UynajGI/dsh-ssh (MIT) — the raw ssh2 shell channel is replaced
 * by the engine's openShell session.
 */
import { PassThrough } from 'node:stream';
import { quoteShellArg, readRemoteEnvironment, scrubRemoteEnvironment, serializeEnvironment } from "./environment.js";
/** Resolve after one duration. */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
/** One SSH PTY and its remote login shell, projected onto the subprocess terminal seam. */
export class SshTerminalHandle {
    closeChannel;
    sendChannel;
    signalChannel;
    graceMs;
    pid = -1;
    output = new PassThrough();
    done;
    exitResolve;
    topLevelExited = false;
    cleanup;
    constructor(closeChannel, sendChannel, signalChannel, graceMs) {
        this.closeChannel = closeChannel;
        this.sendChannel = sendChannel;
        this.signalChannel = signalChannel;
        this.graceMs = graceMs;
        this.done = new Promise((resolve) => { this.exitResolve = resolve; });
    }
    /** Settle the exit promise (called by the runtime when the channel closes). */
    resolveExit(outcome) {
        this.exitResolve(outcome);
    }
    /** @inheritdoc */
    write(data) {
        if (this.topLevelExited)
            return Promise.reject(new Error('terminal process has exited'));
        return new Promise((resolve, reject) => {
            try {
                this.sendChannel(data);
                resolve();
            }
            catch (error) {
                reject(error instanceof Error ? error : new Error(String(error)));
            }
        });
    }
    /** The SSH channel does not expose a foreground process group. */
    inspectForeground() {
        return Promise.resolve(undefined);
    }
    /** @inheritdoc */
    signalForeground(_signal) {
        return Promise.reject(new Error('subprocess-ssh: cannot resolve the foreground process group over an SSH channel'));
    }
    /** @inheritdoc */
    terminate() {
        if (this.cleanup !== undefined)
            return this.cleanup;
        const cleanup = this.closeOnce();
        this.cleanup = cleanup;
        void cleanup.catch(() => { this.cleanup = undefined; });
        return cleanup;
    }
    signal(name) {
        try {
            this.signalChannel(name);
        }
        catch {
            // The channel closed before the signal could be delivered.
        }
    }
    async closeOnce() {
        this.signal('TERM');
        await Promise.race([this.done.then(() => undefined, () => undefined), delay(this.graceMs)]);
        if (!this.topLevelExited)
            this.signal('KILL');
        await Promise.race([this.done.then(() => undefined, () => undefined), delay(this.graceMs)]);
        if (!this.topLevelExited) {
            this.closeChannel();
            throw new Error('subprocess-ssh: terminal cleanup failed; channel still open');
        }
    }
}
/**
 * Allocate an SSH PTY, replace its login shell with the requested argv, and
 * return the live terminal handle.
 */
export async function spawnSshTerminal(engine, getState, spec) {
    spec.signal?.throwIfAborted();
    const program = spec.argv[0];
    if (program === undefined || program.length === 0) {
        throw new Error('subprocess-ssh: terminal argv must contain a program');
    }
    const state = getState();
    if (state.mode !== 'remote' || state.alias === undefined) {
        throw new Error('subprocess-ssh: not in remote mode — switch the GUI to SSH mode first');
    }
    const remote = await readRemoteEnvironment(engine, state.alias);
    const environment = serializeEnvironment(scrubRemoteEnvironment(remote), spec.env);
    const session = await engine.openShell(state.alias, { cols: spec.cols, rows: spec.rows });
    const root = state.remoteRoot;
    if (root === undefined)
        throw new Error('subprocess-ssh: remote workspace root is not set');
    const cwd = spec.cwd !== undefined && spec.cwd.startsWith('/') ? spec.cwd : root;
    const handle = new SshTerminalHandle(() => session.close(), (data) => session.send(data), (name) => session.signal(name), spec.graceMs);
    session.onData = (data) => {
        if (!handle.output.destroyed)
            handle.output.write(data);
    };
    session.onExit = (code, error) => {
        handle.topLevelExited = true;
        handle.output.end();
        handle.resolveExit({ exitCode: error !== undefined ? null : code, signal: null });
    };
    const argv = spec.argv.map(quoteShellArg).join(' ');
    await handle.write(`cd ${quoteShellArg(cwd)} && exec env -i -- ${environment} ${argv}\r`);
    spec.signal?.throwIfAborted();
    return handle;
}
