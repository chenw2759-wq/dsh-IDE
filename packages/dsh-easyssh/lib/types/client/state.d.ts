/**
 * Client-side mode state: mirrors the host's /state endpoint with a light
 * poll (3s) plus immediate refresh after every local action. The snapshot
 * object is replaced only on successful fetches, so React's
 * useSyncExternalStore sees stable references between polls.
 */
import type { WorkspaceState } from '../protocol.ts';
import type { WorkspaceApi } from './api.ts';
export declare class ModeState {
    private readonly api;
    private state;
    private readonly listeners;
    private timer;
    constructor(api: WorkspaceApi);
    getSnapshot(): WorkspaceState;
    subscribe(listener: () => void): () => void;
    private emit;
    /** Re-fetch the host state (no-op on network failure — keep the last view). */
    refresh(): Promise<void>;
    start(): void;
    stop(): void;
    setLocal(): Promise<void>;
    setRemote(alias: string, remoteRoot?: string): Promise<void>;
}
//# sourceMappingURL=state.d.ts.map