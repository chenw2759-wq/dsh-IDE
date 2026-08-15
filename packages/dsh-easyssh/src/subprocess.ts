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

import type { Context } from '@deepseek-ai/cordis'
import { LocalSubprocessRuntime } from '@deepseek-ai/dsh-subprocess-local'
import type { EasysshCore } from './core.ts'
import { SshSubprocessRuntime } from './remote/remote-subprocess.ts'
import { SwitchSubprocessRuntime } from './switch/switch-subprocess.ts'

declare module '@deepseek-ai/cordis' {
  interface Context {
    easysshCore: EasysshCore
  }
}

/** Stable cordis plugin name. */
export const name = 'easyssh-subprocess'

/** Services required: the shared workspace core (mode store + engine). */
export const inject = ['easysshCore']

/** Mount the switching subprocess facade. */
export function apply(ctx: Context): void {
  const core = ctx.easysshCore

  // Local runtime in an isolated scope (its `subprocess` provide shadows only
  // below this scope). Construct directly and keep the instance.
  const localCtx = ctx.isolate('subprocess')
  const localSubprocess = new LocalSubprocessRuntime(localCtx)

  // Remote runtime in another isolated scope (no second provide here).
  const remoteCtx = ctx.isolate('subprocess')

  new SwitchSubprocessRuntime(ctx, {
    local: localSubprocess,
    remote: new SshSubprocessRuntime(remoteCtx, core.engine, () => core.store.getSnapshot()),
    getState: () => core.store.getSnapshot(),
  })
}
