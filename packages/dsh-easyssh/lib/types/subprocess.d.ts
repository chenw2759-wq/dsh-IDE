/**
 * The `ctx.subprocess` switch row: provides the mode-routing subprocess
 * facade in the host scope. The local runtime is mounted in an isolated
 * child scope; the facade auto-provides `subprocess` here because the
 * `subprocess` row is disabled by the profile patch.
 *
 * Mounted by the profile patch as:
 *   - id: easyssh-subprocess
 *     name: 'dsh-easyssh/subprocess'
 *
 * @module dsh-easyssh/subprocess
 */
import type { Context } from '@deepseek-ai/cordis';
import type { EasysshCore } from './core.ts';
declare module '@deepseek-ai/cordis' {
    interface Context {
        easysshCore: EasysshCore;
    }
}
/** Stable cordis plugin name. */
export declare const name = "easyssh-subprocess";
/** Services required: the shared workspace core (mode store + engine). */
export declare const inject: string[];
/** Mount the switching subprocess facade. */
export declare function apply(ctx: Context): void;
//# sourceMappingURL=subprocess.d.ts.map