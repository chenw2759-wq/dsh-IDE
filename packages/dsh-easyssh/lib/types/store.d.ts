/**
 * The plugin's mode store: a process-local singleton deciding whether the
 * workspace surfaces (left panel, remote_* tools) point at this machine or at
 * an SSH host. Pure state — no cordis dependency, unit-testable.
 */
import type { WorkspaceState } from './protocol.ts';
/** The default remote root: the login user's home, resolved on connect. */
export declare const DEFAULT_REMOTE_ROOT = "~";
export declare class RemoteModeStore {
    private state;
    private readonly listeners;
    /** The current state (routes/tools read this per request). */
    getSnapshot(): WorkspaceState;
    /** Subscribe to state changes; returns the disposer. */
    subscribe(listener: () => void): () => void;
    /** Replace the whole state (routes are the only writers). */
    set(state: WorkspaceState): void;
}
//# sourceMappingURL=store.d.ts.map