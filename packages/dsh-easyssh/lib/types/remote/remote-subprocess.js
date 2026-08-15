/**
 * Remote subprocess provider for the `ctx.subprocess` capability seam: each
 * spawn opens a streaming exec channel (or a PTY for terminals) on the
 * current SSH-mode host through the dsh-ssh engine; output spill files stay
 * on the local host. Ported from UynajGI/dsh-ssh (MIT).
 *
 * @module dsh-easyssh/remote-subprocess
 */
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, posix } from 'node:path';
import { SubprocessRuntime } from '@deepseek-ai/dsh-subprocess';
import { MAX_TIMER_DELAY_MS } from '@deepseek-ai/dsh-timeout';
import { quoteShellArg } from "./environment.js";
import { SshSubprocessHandle } from "./remote-process.js";
import { spawnSshTerminal } from "./remote-terminal.js";
/**
 * Enforce the seam's documented grace bound (positive, finite, one Node timer).
 */
function requireRepresentableGrace(graceMs) {
    if (!Number.isFinite(graceMs) || graceMs <= 0 || graceMs > MAX_TIMER_DELAY_MS) {
        throw new Error(`subprocess graceMs must be a positive finite number no greater than ${MAX_TIMER_DELAY_MS}`);
    }
}
/** SSH command manager registered as `ctx.subprocess` (remote mode). */
export class SshSubprocessRuntime extends SubprocessRuntime {
    engine;
    getState;
    live = new Set();
    terminals = new Set();
    spillDir = mkdtempSync(join(tmpdir(), 'dsh-subprocess-ssh-'));
    disposing = false;
    constructor(ctx, engine, getState) {
        super(ctx);
        this.engine = engine;
        this.getState = getState;
        ctx.effect(() => async () => {
            this.disposing = true;
            const handles = [...this.live];
            const terminals = [...this.terminals];
            const pending = [];
            for (const handle of handles) {
                handle.terminate();
                pending.push(handle.waitForExit().then(() => { this.live.delete(handle); }));
            }
            for (const terminal of terminals) {
                pending.push(terminal.terminate().then(() => { this.terminals.delete(terminal); }));
            }
            const outcomes = await Promise.allSettled(pending);
            const failures = outcomes.flatMap(outcome => outcome.status === 'rejected' ? [outcome.reason] : []);
            if (failures.length === 1)
                throw failures[0];
            if (failures.length > 1)
                throw new AggregateError(failures, 'subprocess-ssh: teardown failed');
        }, 'ssh subprocess teardown');
    }
    /** @inheritdoc */
    async resolveExecutable(command, env, signal) {
        if (command.length === 0)
            throw new Error('subprocess-ssh: executable name must be non-empty');
        signal?.throwIfAborted();
        const state = this.getState();
        if (state.mode !== 'remote' || state.alias === undefined) {
            throw new Error('subprocess-ssh: not in remote mode — switch the GUI to SSH mode first');
        }
        if (posix.isAbsolute(command)) {
            const result = await this.engine.exec(state.alias, `test -f ${quoteShellArg(command)} -a -x ${quoteShellArg(command)}`, 10_000);
            signal?.throwIfAborted();
            if (!result.success || result.exitCode !== 0) {
                throw new Error(`subprocess-ssh: command ${JSON.stringify(command)} is not an executable file`);
            }
            return command;
        }
        if (command.includes('/')) {
            throw new Error(`subprocess-ssh: command ${JSON.stringify(command)} is a relative path; use an absolute path or a bare PATH name`);
        }
        const path = env?.PATH;
        const prefix = path === undefined ? '' : `PATH=${quoteShellArg(path)} `;
        const result = await this.engine.exec(state.alias, `${prefix}command -v -- ${quoteShellArg(command)}`, 10_000);
        signal?.throwIfAborted();
        const executable = result.stdout.trim();
        if (!result.success || result.exitCode !== 0
            || executable.length === 0
            || executable.includes('\n')
            || (!posix.isAbsolute(executable) && !executable.includes('/'))) {
            throw new Error(`subprocess-ssh: executable ${JSON.stringify(command)} did not resolve to one absolute path`);
        }
        const root = state.remoteRoot;
        if (root === undefined)
            throw new Error('subprocess-ssh: remote workspace root is not set');
        return posix.isAbsolute(executable) ? executable : posix.resolve(root, executable);
    }
    /** @inheritdoc */
    spawn(spec) {
        if (this.disposing)
            throw new Error('subprocess-ssh: service is disposing');
        const program = spec.argv[0];
        if (program === undefined || program.length === 0) {
            throw new Error('invalid argv: expected a non-empty program name at argv[0]');
        }
        requireRepresentableGrace(spec.graceMs);
        if (spec.signal?.aborted === true) {
            throw new Error(`aborted before spawn: ${String(spec.signal.reason)}`);
        }
        const handle = new SshSubprocessHandle(this.engine, this.getState, spec, this.spillDir);
        this.live.add(handle);
        const release = async () => {
            await handle.waitForExit();
            this.live.delete(handle);
        };
        void handle.done.then(release, release).catch(() => { });
        return handle;
    }
    /** @inheritdoc */
    async spawnTerminal(spec) {
        if (this.disposing)
            throw new Error('subprocess-ssh: service is disposing');
        const program = spec.argv[0];
        if (program === undefined || program.length === 0) {
            throw new Error('subprocess-ssh: terminal argv must contain a program');
        }
        requireRepresentableGrace(spec.graceMs);
        spec.signal?.throwIfAborted();
        const terminal = await spawnSshTerminal(this.engine, this.getState, spec);
        if (this.disposing) {
            await terminal.terminate();
            throw new Error('subprocess-ssh: service disposed during terminal setup');
        }
        this.terminals.add(terminal);
        const release = async () => {
            await terminal.terminate();
            this.terminals.delete(terminal);
        };
        void terminal.done.then(release, release).catch(() => { });
        return terminal;
    }
}
export default SshSubprocessRuntime;
