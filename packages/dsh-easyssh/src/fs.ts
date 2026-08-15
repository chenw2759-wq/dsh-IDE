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

import type { Context } from '@deepseek-ai/cordis'
import { SandboxedFileSystem } from '@deepseek-ai/dsh-fs-sandbox'
import type { EasysshCore } from './core.ts'
import { SshFileSystem } from './remote/remote-fs.ts'
import { SwitchFileSystem } from './switch/switch-fs.ts'

declare module '@deepseek-ai/cordis' {
  interface Context {
    easysshCore: EasysshCore
  }
}

/** Stable cordis plugin name. */
export const name = 'easyssh-fs'

/** Services required: the shared workspace core (mode store + engine) and the
 * sandbox policy the local backend (`SandboxedFileSystem`) consumes. */
export const inject = ['easysshCore', 'sandboxPolicy']

/** Mount the switching filesystem facade. */
export function apply(ctx: Context): void {
  const core = ctx.easysshCore

  // The local backend lives in an isolated scope: its `fs` provide shadows
  // only below this scope, so consumers keep resolving our facade. Construct
  // the service directly (synchronous) and keep the instance — `ctx.plugin()`
  // only schedules an async fiber and does not make `localCtx.fs` readable here.
  const localCtx = ctx.isolate('fs')
  const localFs = new SandboxedFileSystem(localCtx, {
    cwd: process.env.DSH_CWD ?? process.cwd(),
    diffBasisMaxBytes: 10 * 1024 * 1024,
  })

  // The remote backend also needs a scope of its own: constructing it on the
  // row context would register a second `fs` provide here.
  const remoteCtx = ctx.isolate('fs')

  new SwitchFileSystem(ctx, {
    local: localFs,
    remote: new SshFileSystem(remoteCtx, core.engine, () => core.store.getSnapshot()),
    getState: () => core.store.getSnapshot(),
  })
}
