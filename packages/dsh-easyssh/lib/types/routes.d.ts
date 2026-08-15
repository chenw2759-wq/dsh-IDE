import type { WebRoute } from '@deepseek-ai/dsh-host-webserver';
import type { HostStore, SshEngine } from '@deepseek-ai/dsh-ssh';
import { RemoteModeStore } from './store.ts';
import { type WorkspaceMode } from './protocol.ts';
/** Route family dependencies. */
export interface WorkspaceRoutesDeps {
    store: RemoteModeStore;
    hosts: HostStore;
    engine: SshEngine;
}
/**
 * Build every /api/dsh-easyssh route (exact paths).
 * @param deps - mode store, host store (alias validation), ssh engine.
 * @returns the routes to register.
 */
export declare function makeRoutes(deps: WorkspaceRoutesDeps): WebRoute[];
/** Re-exported for tests. */
export type { WorkspaceMode };
//# sourceMappingURL=routes.d.ts.map