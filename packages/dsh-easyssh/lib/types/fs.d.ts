/**
 * The `ctx.fs` switch row: provides the mode-routing filesystem facade in the
 * host scope. The local backend (the deployment's sandboxed filesystem) is
 * mounted in an isolated child scope so its own `ctx.fs` provide never
 * collides; the facade auto-provides `fs` here because the `fs-sandbox` row
 * is disabled by the profile patch.
 *
 * Mounted by the profile patch as:
 *   - id: easyssh-fs
 *     name: 'dsh-easyssh/fs'
 *
 * @module dsh-easyssh/fs
 */
import type { Context } from '@deepseek-ai/cordis';
import type { EasysshCore } from './core.ts';
declare module '@deepseek-ai/cordis' {
    interface Context {
        easysshCore: EasysshCore;
    }
}
/** Stable cordis plugin name. */
export declare const name = "easyssh-fs";
/** Services required: the shared workspace core (mode store + engine) and the
 * sandbox policy the local backend (`SandboxedFileSystem`) consumes. */
export declare const inject: string[];
/** Mount the switching filesystem facade. */
export declare function apply(ctx: Context): void;
//# sourceMappingURL=fs.d.ts.map