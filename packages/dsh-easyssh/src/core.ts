/**
 * The shared workspace core: the mode store, the host store, and the SSH
 * engine, provided as `ctx.easysshCore` by the main plugin row so the
 * two switch rows (fs / subprocess) resolve one instance each.
 */

import type { SshEngine, HostStore } from '@deepseek-ai/dsh-ssh'
import type { RemoteModeStore } from './store.ts'

/** One process-wide core shared by every dsh-easyssh row. */
export interface EasysshCore {
  store: RemoteModeStore
  hosts: HostStore
  engine: SshEngine
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    easysshCore: EasysshCore
  }
}
