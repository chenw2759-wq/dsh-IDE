/**
 * One asynchronously-started SSH command projected onto the subprocess seam.
 * Ported from UynajGI/dsh-ssh (MIT) — the raw ssh2 channel is replaced by the
 * engine's streaming ExecSession.
 */
import { PassThrough } from 'node:stream';
import { quoteShellArg, readRemoteEnvironment, scrubRemoteEnvironment, serializeEnvironment } from "./environment.js";
import { SshOutputCollector } from "./output.js";
function isCollect(mode) {
    return mode !== 'pipe' && mode !== 'inherit';
}
/** Resolve the remote working directory for one spawn spec. */
function resolveRemoteCwd(state, cwd) {
    const root = state.remoteRoot;
    if (root === undefined)
        throw new Error('subprocess-ssh: remote workspace root is not set');
    if (cwd !== undefined && cwd.startsWith('/'))
        return cwd;
    return root;
}
/** Build the remote command text: cd, env -i scrub, exec the argv. */
async function buildCommand(engine, alias, state, spec) {
    const remote = await readRemoteEnvironment(engine, alias);
    const environment = serializeEnvironment(scrubRemoteEnvironment(remote), spec.env);
    const argv = spec.argv.map(quoteShellArg).join(' ');
    return `cd -- ${quoteShellArg(resolveRemoteCwd(state, spec.cwd))} && exec env -i -- ${environment} ${argv}`;
}
/** SSH-backed subprocess handle. The channel does not expose a remote pid, so `pid` is `-1`. */
export class SshSubprocessHandle {
    engine;
    getState;
    spec;
    spillDir;
    stdin;
    stdout;
    stderr;
    collected;
    done;
    terminationController = new AbortController();
    stdoutCollector;
    stderrCollector;
    session;
    graceTimer;
    settled = false;
    constructor(engine, getState, spec, spillDir) {
        this.engine = engine;
        this.getState = getState;
        this.spec = spec;
        this.spillDir = spillDir;
        const outMode = spec.stdio.stdout;
        const errMode = spec.stdio.stderr;
        this.stdout = outMode === 'pipe' ? new PassThrough() : undefined;
        this.stderr = errMode === 'pipe' ? new PassThrough() : undefined;
        this.stdoutCollector = isCollect(outMode)
            ? new SshOutputCollector(outMode.maxBytes, outMode.spill?.maxBytes, 'stdout', spillDir)
            : undefined;
        this.stderrCollector = isCollect(errMode)
            ? new SshOutputCollector(errMode.maxBytes, errMode.spill?.maxBytes, 'stderr', spillDir)
            : undefined;
        this.collected = {
            ...(this.stdoutCollector !== undefined ? { stdout: this.stdoutCollector } : {}),
            ...(this.stderrCollector !== undefined ? { stderr: this.stderrCollector } : {}),
        };
        this.stdin = spec.stdio.stdin === 'pipe' ? new PassThrough() : undefined;
        spec.signal?.addEventListener('abort', this.onAbort, { once: true });
        this.done = this.run();
        void this.done.catch(() => { });
        if (spec.signal?.aborted === true)
            this.terminate();
    }
    /** Remote process id; `-1` because the SSH channel does not expose one. */
    get pid() {
        return -1;
    }
    /** @inheritdoc */
    terminate() {
        if (this.settled || this.terminationController.signal.aborted)
            return;
        this.terminationController.abort(new Error('subprocess-ssh: command terminated'));
        const session = this.session;
        if (session !== undefined)
            this.signalTerm(session);
    }
    /** @inheritdoc */
    waitForExit(signal) {
        if (this.settled)
            return Promise.resolve(true);
        if (signal?.aborted === true)
            return Promise.resolve(false);
        if (signal === undefined) {
            return this.done.then(() => true, () => true);
        }
        return new Promise((resolve) => {
            const onAbort = () => { cleanup(); resolve(false); };
            const cleanup = () => { signal.removeEventListener('abort', onAbort); };
            signal.addEventListener('abort', onAbort, { once: true });
            void this.done.then(() => { cleanup(); resolve(true); }, () => { cleanup(); resolve(true); });
        });
    }
    onAbort = () => { this.terminate(); };
    signalTerm(session) {
        try {
            session.signal('TERM');
        }
        catch {
            // The channel closed before the signal could be delivered; close is authoritative.
        }
        this.graceTimer = setTimeout(() => {
            try {
                session.signal('KILL');
            }
            catch {
                // Escalation after a graceful close is a no-op.
            }
        }, this.spec.graceMs);
    }
    settle() {
        if (this.settled)
            return;
        this.settled = true;
        if (this.graceTimer !== undefined)
            clearTimeout(this.graceTimer);
        this.graceTimer = undefined;
        this.stdoutCollector?.seal();
        this.stderrCollector?.seal();
        this.spec.signal?.removeEventListener('abort', this.onAbort);
    }
    async run() {
        let session;
        try {
            const state = this.getState();
            if (state.mode !== 'remote' || state.alias === undefined) {
                throw new Error('subprocess-ssh: not in remote mode — switch the GUI to SSH mode first');
            }
            const command = await buildCommand(this.engine, state.alias, state, this.spec);
            session = await this.engine.openExec(state.alias, command);
        }
        catch (error) {
            this.settle();
            throw error;
        }
        this.session = session;
        if (this.terminationController.signal.aborted)
            this.signalTerm(session);
        this.wireStdout(session);
        this.wireStderr(session);
        if (this.stdin !== undefined) {
            this.stdin.pipe({
                write: (chunk, encoding, callback) => {
                    try {
                        session.send(chunk.toString(encoding ?? 'utf8'));
                        callback?.();
                    }
                    catch (error) {
                        callback?.(error instanceof Error ? error : new Error(String(error)));
                    }
                },
                end: (callback) => {
                    session.end();
                    callback?.();
                },
            });
        }
        else if (typeof this.spec.stdio.stdin === 'object') {
            session.end(this.spec.stdio.stdin.data);
        }
        return await new Promise((resolve, reject) => {
            session.onExit = (code, error) => {
                this.settle();
                if (error !== undefined) {
                    reject(new Error(`subprocess-ssh: ${error}`));
                }
                else {
                    resolve({ exitCode: code, signal: null });
                }
            };
        });
    }
    wireStdout(session) {
        const mode = this.spec.stdio.stdout;
        session.onData = (data) => {
            if (mode === 'pipe')
                this.stdout?.write(data);
            else if (mode === 'inherit')
                process.stdout.write(data);
            else
                this.stdoutCollector?.push(data);
        };
    }
    wireStderr(session) {
        const mode = this.spec.stdio.stderr;
        session.onErrData = (data) => {
            if (mode === 'pipe')
                this.stderr?.write(data);
            else if (mode === 'inherit')
                process.stderr.write(data);
            else
                this.stderrCollector?.push(data);
        };
    }
}
