import type { SshEngine } from '@deepseek-ai/dsh-ssh';
import { RemoteModeStore } from './store.ts';
/** Tool-set dependencies. */
export interface WorkspaceToolsDeps {
    store: RemoteModeStore;
    engine: SshEngine;
}
/** Build every remote_* tool (registered by the host half). */
export declare function makeWorkspaceTools(deps: WorkspaceToolsDeps): import("@deepseek-ai/dsh-tools").ToolDefinition[];
//# sourceMappingURL=tools.d.ts.map