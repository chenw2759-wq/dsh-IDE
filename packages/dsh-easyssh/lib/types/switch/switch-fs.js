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
import { FileSystem } from '@deepseek-ai/dsh-fs';
/** Mode-routing filesystem facade (provides `ctx.fs`). */
export class SwitchFileSystem extends FileSystem {
    deps;
    constructor(ctx, deps) {
        super(ctx);
        this.deps = deps;
    }
    /** The active backend for the current mode. */
    delegate() {
        return this.deps.getState().mode === 'remote' ? this.deps.remote : this.deps.local;
    }
    /**
     * The capability fact the tool layer reads: the local backend's sandbox
     * default in local mode; no confinement in remote mode (remote execution
     * cannot be fenced by the local sandbox).
     */
    get sandboxMode() {
        return this.deps.getState().mode === 'remote' ? undefined : this.deps.local.sandboxMode;
    }
    resolve(path, opts) {
        return this.delegate().resolve(path, opts);
    }
    processPath(target) {
        return this.delegate().processPath(target);
    }
    fileUrl(target) {
        return this.delegate().fileUrl(target);
    }
    contains(parent, child) {
        return this.delegate().contains(parent, child);
    }
    stat(target, signal) {
        return this.delegate().stat(target, signal);
    }
    lstat(path, opts, signal) {
        return this.delegate().lstat(path, opts, signal);
    }
    readText(target, signal) {
        return this.delegate().readText(target, signal);
    }
    streamText(target, signal) {
        return this.delegate().streamText(target, signal);
    }
    readBytes(target, signal, maxBytes) {
        return this.delegate().readBytes(target, signal, maxBytes);
    }
    listDir(target, signal) {
        return this.delegate().listDir(target, signal);
    }
    writeText(target, content, expected, signal, sandboxPolicy) {
        return this.delegate().writeText(target, content, expected, signal, sandboxPolicy);
    }
    editText(target, edit, expected, signal, sandboxPolicy) {
        return this.delegate().editText(target, edit, expected, signal, sandboxPolicy);
    }
}
export default SwitchFileSystem;
