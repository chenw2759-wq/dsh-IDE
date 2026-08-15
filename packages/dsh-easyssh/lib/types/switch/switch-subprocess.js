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
/** Mode-routing subprocess facade (provides `ctx.subprocess`). */
export class SwitchSubprocessRuntime extends SubprocessRuntime {
    deps;
    constructor(ctx, deps) {
        super(ctx);
        this.deps = deps;
    }
    /** The active backend for the current mode. */
    delegate() {
        return this.deps.getState().mode === 'remote' ? this.deps.remote : this.deps.local;
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
}
export default SwitchSubprocessRuntime;
