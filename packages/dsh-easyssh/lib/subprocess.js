import { i as serializeEnvironment, n as readRemoteEnvironment, r as scrubRemoteEnvironment, t as quoteShellArg } from "./environment-D0yu7vFn.js";
import { join, posix } from "node:path";
import { randomBytes } from "node:crypto";
import { SubprocessRuntime } from "@deepseek-ai/dsh-subprocess";
import { LocalSubprocessRuntime } from "@deepseek-ai/dsh-subprocess-local";
import { closeSync, mkdtempSync, openSync, unlinkSync, writeSync } from "node:fs";
import { tmpdir } from "node:os";
import { MAX_TIMER_DELAY_MS } from "@deepseek-ai/dsh-timeout";
import { PassThrough } from "node:stream";
//#region src/remote/output.ts
/**
* Bounded host-side projection of one remote output stream with a local
* spill file. Ported from UynajGI/dsh-ssh (MIT) — verbatim semantics.
*/
let spillCounter = 0;
let defaultSpillDir;
/** Private (0700) per-process spill directory under the OS tmpdir, created lazily. */
function privateSpillDir() {
	defaultSpillDir ??= mkdtempSync(join(tmpdir(), "dsh-subprocess-ssh-"));
	return defaultSpillDir;
}
/**
* Collects one remote stream with a bounded in-memory tail. On first overflow
* a spill file is opened (when a spill cap is configured) and every chunk —
* already-collected ones included — is appended there while the full stream
* stays within the cap; without one, only the in-memory tail is retained.
*/
var SshOutputCollector = class {
	maxBytes;
	maxSpillBytes;
	label;
	spillDir;
	chunks = [];
	retained = 0;
	total = 0;
	dropped = false;
	spillFd;
	spillFile;
	spillDisabled;
	constructor(maxBytes, maxSpillBytes, label, spillDir = privateSpillDir()) {
		this.maxBytes = maxBytes;
		this.maxSpillBytes = maxSpillBytes;
		this.label = label;
		this.spillDir = spillDir;
		this.spillDisabled = maxSpillBytes === void 0;
	}
	/** Append one byte-faithful remote chunk, trimming the retained tail to the cap. */
	push(chunk) {
		if (chunk.length === 0) return;
		const buffer = Buffer.from(chunk);
		this.total += buffer.length;
		const overflows = this.retained + buffer.length > this.maxBytes;
		if (!this.spillDisabled && (overflows || this.spillFd !== void 0)) this.spillAll(buffer);
		this.chunks.push(buffer);
		this.retained += buffer.length;
		while (this.retained > this.maxBytes) {
			const head = this.chunks[0];
			const excess = this.retained - this.maxBytes;
			if (head.length <= excess) {
				this.chunks.shift();
				this.retained -= head.length;
			} else {
				this.chunks[0] = head.subarray(excess);
				this.retained -= excess;
			}
			this.dropped = true;
		}
	}
	/** @inheritdoc */
	readFrom(fromByte) {
		const retained = Buffer.concat(this.chunks, this.retained);
		const windowStart = this.total - this.retained;
		const lossy = fromByte < windowStart;
		const start = lossy ? 0 : Math.min(retained.length, Math.max(0, fromByte - windowStart));
		return {
			text: retained.subarray(start).toString("utf8"),
			nextOffset: this.total,
			lossy,
			...this.spillFile !== void 0 ? { spillPath: this.spillFile } : {}
		};
	}
	/** Open the spill file lazily and append one chunk (plus any prior chunks once). */
	spillAll(chunk) {
		if (this.maxSpillBytes !== void 0 && this.total > this.maxSpillBytes) {
			this.discardSpill();
			return;
		}
		if (this.spillFd === void 0) {
			this.spillFile = join(this.spillDir, `dsh-subprocess-ssh-${process.pid}-${++spillCounter}-${randomBytes(6).toString("hex")}-${this.label}.log`);
			this.spillFd = openSync(this.spillFile, "wx", 384);
			for (const prior of this.chunks) writeSync(this.spillFd, prior);
		}
		writeSync(this.spillFd, chunk);
	}
	/** Stop spilling and remove the file once it can no longer hold the complete stream. */
	discardSpill() {
		const fd = this.spillFd;
		const file = this.spillFile;
		this.spillFd = void 0;
		this.spillFile = void 0;
		this.spillDisabled = true;
		if (fd !== void 0) try {
			closeSync(fd);
		} catch {
			this.spillFd = fd;
		}
		if (file !== void 0) try {
			unlinkSync(file);
		} catch {}
	}
	/** Close the spill file once the stream has ended; stop advertising it on a failed close. */
	seal() {
		if (this.spillFd === void 0) return;
		try {
			closeSync(this.spillFd);
		} catch {
			this.spillFile = void 0;
		}
		this.spillFd = void 0;
	}
	/** Seal the spill and return the final collected output. */
	finalize() {
		this.seal();
		return {
			text: Buffer.concat(this.chunks).toString("utf8"),
			truncated: this.dropped,
			...this.spillFile !== void 0 ? { spillPath: this.spillFile } : {}
		};
	}
};
//#endregion
//#region src/remote/remote-process.ts
/**
* One asynchronously-started SSH command projected onto the subprocess seam.
* Ported from UynajGI/dsh-ssh (MIT) — the raw ssh2 channel is replaced by the
* engine's streaming ExecSession.
*/
function isCollect(mode) {
	return mode !== "pipe" && mode !== "inherit";
}
/** Resolve the remote working directory for one spawn spec. */
function resolveRemoteCwd(state, cwd) {
	const root = state.remoteRoot;
	if (root === void 0) throw new Error("subprocess-ssh: remote workspace root is not set");
	if (cwd !== void 0 && cwd.startsWith("/")) return cwd;
	return root;
}
/** Build the remote command text: cd, env -i scrub, exec the argv. */
async function buildCommand(engine, alias, state, spec) {
	const environment = serializeEnvironment(scrubRemoteEnvironment(await readRemoteEnvironment(engine, alias)), spec.env);
	const argv = spec.argv.map(quoteShellArg).join(" ");
	return `cd -- ${quoteShellArg(resolveRemoteCwd(state, spec.cwd))} && exec env -i -- ${environment} ${argv}`;
}
/** SSH-backed subprocess handle. The channel does not expose a remote pid, so `pid` is `-1`. */
var SshSubprocessHandle = class {
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
		this.stdout = outMode === "pipe" ? new PassThrough() : void 0;
		this.stderr = errMode === "pipe" ? new PassThrough() : void 0;
		this.stdoutCollector = isCollect(outMode) ? new SshOutputCollector(outMode.maxBytes, outMode.spill?.maxBytes, "stdout", spillDir) : void 0;
		this.stderrCollector = isCollect(errMode) ? new SshOutputCollector(errMode.maxBytes, errMode.spill?.maxBytes, "stderr", spillDir) : void 0;
		this.collected = {
			...this.stdoutCollector !== void 0 ? { stdout: this.stdoutCollector } : {},
			...this.stderrCollector !== void 0 ? { stderr: this.stderrCollector } : {}
		};
		this.stdin = spec.stdio.stdin === "pipe" ? new PassThrough() : void 0;
		spec.signal?.addEventListener("abort", this.onAbort, { once: true });
		this.done = this.run();
		this.done.catch(() => {});
		if (spec.signal?.aborted === true) this.terminate();
	}
	/** Remote process id; `-1` because the SSH channel does not expose one. */
	get pid() {
		return -1;
	}
	/** @inheritdoc */
	terminate() {
		if (this.settled || this.terminationController.signal.aborted) return;
		this.terminationController.abort(/* @__PURE__ */ new Error("subprocess-ssh: command terminated"));
		const session = this.session;
		if (session !== void 0) this.signalTerm(session);
	}
	/** @inheritdoc */
	waitForExit(signal) {
		if (this.settled) return Promise.resolve(true);
		if (signal?.aborted === true) return Promise.resolve(false);
		if (signal === void 0) return this.done.then(() => true, () => true);
		return new Promise((resolve) => {
			const onAbort = () => {
				cleanup();
				resolve(false);
			};
			const cleanup = () => {
				signal.removeEventListener("abort", onAbort);
			};
			signal.addEventListener("abort", onAbort, { once: true });
			this.done.then(() => {
				cleanup();
				resolve(true);
			}, () => {
				cleanup();
				resolve(true);
			});
		});
	}
	onAbort = () => {
		this.terminate();
	};
	signalTerm(session) {
		try {
			session.signal("TERM");
		} catch {}
		this.graceTimer = setTimeout(() => {
			try {
				session.signal("KILL");
			} catch {}
		}, this.spec.graceMs);
	}
	settle() {
		if (this.settled) return;
		this.settled = true;
		if (this.graceTimer !== void 0) clearTimeout(this.graceTimer);
		this.graceTimer = void 0;
		this.stdoutCollector?.seal();
		this.stderrCollector?.seal();
		this.spec.signal?.removeEventListener("abort", this.onAbort);
	}
	async run() {
		let session;
		try {
			const state = this.getState();
			if (state.mode !== "remote" || state.alias === void 0) throw new Error("subprocess-ssh: not in remote mode — switch the GUI to SSH mode first");
			const command = await buildCommand(this.engine, state.alias, state, this.spec);
			session = await this.engine.openExec(state.alias, command);
		} catch (error) {
			this.settle();
			throw error;
		}
		this.session = session;
		if (this.terminationController.signal.aborted) this.signalTerm(session);
		this.wireStdout(session);
		this.wireStderr(session);
		if (this.stdin !== void 0) this.stdin.pipe({
			write: (chunk, encoding, callback) => {
				try {
					session.send(chunk.toString(encoding ?? "utf8"));
					callback?.();
				} catch (error) {
					callback?.(error instanceof Error ? error : new Error(String(error)));
				}
			},
			end: (callback) => {
				session.end();
				callback?.();
			}
		});
		else if (typeof this.spec.stdio.stdin === "object") session.end(this.spec.stdio.stdin.data);
		return await new Promise((resolve, reject) => {
			session.onExit = (code, error) => {
				this.settle();
				if (error !== void 0) reject(/* @__PURE__ */ new Error(`subprocess-ssh: ${error}`));
				else resolve({
					exitCode: code,
					signal: null
				});
			};
		});
	}
	wireStdout(session) {
		const mode = this.spec.stdio.stdout;
		session.onData = (data) => {
			if (mode === "pipe") this.stdout?.write(data);
			else if (mode === "inherit") process.stdout.write(data);
			else this.stdoutCollector?.push(data);
		};
	}
	wireStderr(session) {
		const mode = this.spec.stdio.stderr;
		session.onErrData = (data) => {
			if (mode === "pipe") this.stderr?.write(data);
			else if (mode === "inherit") process.stderr.write(data);
			else this.stderrCollector?.push(data);
		};
	}
};
//#endregion
//#region src/remote/remote-terminal.ts
/**
* SSH PTY allocation and process-session ownership for the subprocess seam.
* Ported from UynajGI/dsh-ssh (MIT) — the raw ssh2 shell channel is replaced
* by the engine's openShell session.
*/
/** Resolve after one duration. */
function delay(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
/** One SSH PTY and its remote login shell, projected onto the subprocess terminal seam. */
var SshTerminalHandle = class {
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
		this.done = new Promise((resolve) => {
			this.exitResolve = resolve;
		});
	}
	/** Settle the exit promise (called by the runtime when the channel closes). */
	resolveExit(outcome) {
		this.exitResolve(outcome);
	}
	/** @inheritdoc */
	write(data) {
		if (this.topLevelExited) return Promise.reject(/* @__PURE__ */ new Error("terminal process has exited"));
		return new Promise((resolve, reject) => {
			try {
				this.sendChannel(data);
				resolve();
			} catch (error) {
				reject(error instanceof Error ? error : new Error(String(error)));
			}
		});
	}
	/** The SSH channel does not expose a foreground process group. */
	inspectForeground() {
		return Promise.resolve(void 0);
	}
	/** @inheritdoc */
	signalForeground(_signal) {
		return Promise.reject(/* @__PURE__ */ new Error("subprocess-ssh: cannot resolve the foreground process group over an SSH channel"));
	}
	/** @inheritdoc */
	terminate() {
		if (this.cleanup !== void 0) return this.cleanup;
		const cleanup = this.closeOnce();
		this.cleanup = cleanup;
		cleanup.catch(() => {
			this.cleanup = void 0;
		});
		return cleanup;
	}
	signal(name) {
		try {
			this.signalChannel(name);
		} catch {}
	}
	async closeOnce() {
		this.signal("TERM");
		await Promise.race([this.done.then(() => void 0, () => void 0), delay(this.graceMs)]);
		if (!this.topLevelExited) this.signal("KILL");
		await Promise.race([this.done.then(() => void 0, () => void 0), delay(this.graceMs)]);
		if (!this.topLevelExited) {
			this.closeChannel();
			throw new Error("subprocess-ssh: terminal cleanup failed; channel still open");
		}
	}
};
/**
* Allocate an SSH PTY, replace its login shell with the requested argv, and
* return the live terminal handle.
*/
async function spawnSshTerminal(engine, getState, spec) {
	spec.signal?.throwIfAborted();
	const program = spec.argv[0];
	if (program === void 0 || program.length === 0) throw new Error("subprocess-ssh: terminal argv must contain a program");
	const state = getState();
	if (state.mode !== "remote" || state.alias === void 0) throw new Error("subprocess-ssh: not in remote mode — switch the GUI to SSH mode first");
	const environment = serializeEnvironment(scrubRemoteEnvironment(await readRemoteEnvironment(engine, state.alias)), spec.env);
	const session = await engine.openShell(state.alias, {
		cols: spec.cols,
		rows: spec.rows
	});
	const root = state.remoteRoot;
	if (root === void 0) throw new Error("subprocess-ssh: remote workspace root is not set");
	const cwd = spec.cwd !== void 0 && spec.cwd.startsWith("/") ? spec.cwd : root;
	const handle = new SshTerminalHandle(() => session.close(), (data) => session.send(data), (name) => session.signal(name), spec.graceMs);
	session.onData = (data) => {
		if (!handle.output.destroyed) handle.output.write(data);
	};
	session.onExit = (code, error) => {
		handle.topLevelExited = true;
		handle.output.end();
		handle.resolveExit({
			exitCode: error !== void 0 ? null : code,
			signal: null
		});
	};
	const argv = spec.argv.map(quoteShellArg).join(" ");
	await handle.write(`cd ${quoteShellArg(cwd)} && exec env -i -- ${environment} ${argv}\r`);
	spec.signal?.throwIfAborted();
	return handle;
}
//#endregion
//#region src/remote/remote-subprocess.ts
/**
* Remote subprocess provider for the `ctx.subprocess` capability seam: each
* spawn opens a streaming exec channel (or a PTY for terminals) on the
* current SSH-mode host through the dsh-ssh engine; output spill files stay
* on the local host. Ported from UynajGI/dsh-ssh (MIT).
*
* @module dsh-easyssh/remote-subprocess
*/
/**
* Enforce the seam's documented grace bound (positive, finite, one Node timer).
*/
function requireRepresentableGrace(graceMs) {
	if (!Number.isFinite(graceMs) || graceMs <= 0 || graceMs > MAX_TIMER_DELAY_MS) throw new Error(`subprocess graceMs must be a positive finite number no greater than ${MAX_TIMER_DELAY_MS}`);
}
/** SSH command manager registered as `ctx.subprocess` (remote mode). */
var SshSubprocessRuntime = class extends SubprocessRuntime {
	engine;
	getState;
	live = /* @__PURE__ */ new Set();
	terminals = /* @__PURE__ */ new Set();
	spillDir = mkdtempSync(join(tmpdir(), "dsh-subprocess-ssh-"));
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
				pending.push(handle.waitForExit().then(() => {
					this.live.delete(handle);
				}));
			}
			for (const terminal of terminals) pending.push(terminal.terminate().then(() => {
				this.terminals.delete(terminal);
			}));
			const failures = (await Promise.allSettled(pending)).flatMap((outcome) => outcome.status === "rejected" ? [outcome.reason] : []);
			if (failures.length === 1) throw failures[0];
			if (failures.length > 1) throw new AggregateError(failures, "subprocess-ssh: teardown failed");
		}, "ssh subprocess teardown");
	}
	/** @inheritdoc */
	async resolveExecutable(command, env, signal) {
		if (command.length === 0) throw new Error("subprocess-ssh: executable name must be non-empty");
		signal?.throwIfAborted();
		const state = this.getState();
		if (state.mode !== "remote" || state.alias === void 0) throw new Error("subprocess-ssh: not in remote mode — switch the GUI to SSH mode first");
		if (posix.isAbsolute(command)) {
			const result = await this.engine.exec(state.alias, `test -f ${quoteShellArg(command)} -a -x ${quoteShellArg(command)}`, 1e4);
			signal?.throwIfAborted();
			if (!result.success || result.exitCode !== 0) throw new Error(`subprocess-ssh: command ${JSON.stringify(command)} is not an executable file`);
			return command;
		}
		if (command.includes("/")) throw new Error(`subprocess-ssh: command ${JSON.stringify(command)} is a relative path; use an absolute path or a bare PATH name`);
		const path = env?.PATH;
		const prefix = path === void 0 ? "" : `PATH=${quoteShellArg(path)} `;
		const result = await this.engine.exec(state.alias, `${prefix}command -v -- ${quoteShellArg(command)}`, 1e4);
		signal?.throwIfAborted();
		const executable = result.stdout.trim();
		if (!result.success || result.exitCode !== 0 || executable.length === 0 || executable.includes("\n") || !posix.isAbsolute(executable) && !executable.includes("/")) throw new Error(`subprocess-ssh: executable ${JSON.stringify(command)} did not resolve to one absolute path`);
		const root = state.remoteRoot;
		if (root === void 0) throw new Error("subprocess-ssh: remote workspace root is not set");
		return posix.isAbsolute(executable) ? executable : posix.resolve(root, executable);
	}
	/** @inheritdoc */
	spawn(spec) {
		if (this.disposing) throw new Error("subprocess-ssh: service is disposing");
		const program = spec.argv[0];
		if (program === void 0 || program.length === 0) throw new Error("invalid argv: expected a non-empty program name at argv[0]");
		requireRepresentableGrace(spec.graceMs);
		if (spec.signal?.aborted === true) throw new Error(`aborted before spawn: ${String(spec.signal.reason)}`);
		const handle = new SshSubprocessHandle(this.engine, this.getState, spec, this.spillDir);
		this.live.add(handle);
		const release = async () => {
			await handle.waitForExit();
			this.live.delete(handle);
		};
		handle.done.then(release, release).catch(() => {});
		return handle;
	}
	/** @inheritdoc */
	async spawnTerminal(spec) {
		if (this.disposing) throw new Error("subprocess-ssh: service is disposing");
		const program = spec.argv[0];
		if (program === void 0 || program.length === 0) throw new Error("subprocess-ssh: terminal argv must contain a program");
		requireRepresentableGrace(spec.graceMs);
		spec.signal?.throwIfAborted();
		const terminal = await spawnSshTerminal(this.engine, this.getState, spec);
		if (this.disposing) {
			await terminal.terminate();
			throw new Error("subprocess-ssh: service disposed during terminal setup");
		}
		this.terminals.add(terminal);
		const release = async () => {
			await terminal.terminate();
			this.terminals.delete(terminal);
		};
		terminal.done.then(release, release).catch(() => {});
		return terminal;
	}
};
//#endregion
//#region src/switch/switch-subprocess.ts
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
/** Mode-routing subprocess facade (provides `ctx.subprocess`). */
var SwitchSubprocessRuntime = class extends SubprocessRuntime {
	deps;
	constructor(ctx, deps) {
		super(ctx);
		this.deps = deps;
	}
	/** The active backend for the current mode. */
	delegate() {
		return this.deps.getState().mode === "remote" ? this.deps.remote : this.deps.local;
	}
	/** @inheritdoc */
	resolveExecutable(command, env, signal) {
		return this.delegate().resolveExecutable(command, env, signal);
	}
	/** @inheritdoc */
	spawn(spec) {
		return this.delegate().spawn(spec);
	}
	/** @inheritdoc */
	spawnTerminal(spec) {
		return this.delegate().spawnTerminal(spec);
	}
};
//#endregion
//#region src/subprocess.ts
/** Stable cordis plugin name. */
const name = "easyssh-subprocess";
/** Services required: the shared workspace core (mode store + engine). */
const inject = ["easysshCore"];
/** Mount the switching subprocess facade. */
function apply(ctx) {
	const core = ctx.easysshCore;
	new SwitchSubprocessRuntime(ctx, {
		local: new LocalSubprocessRuntime(ctx.isolate("subprocess")),
		remote: new SshSubprocessRuntime(ctx.isolate("subprocess"), core.engine, () => core.store.getSnapshot()),
		getState: () => core.store.getSnapshot()
	});
}
//#endregion
export { apply, inject, name };
