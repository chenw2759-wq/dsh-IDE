/**
 * The /api/dsh-ssh route family: host CRUD, exec, cluster, SFTP transfer
 * (NDJSON progress stream for uploads, binary stream for downloads), remote
 * listing, tunnels, and the WebSocket PTY terminal upgrade. Every route
 * carries a loopback-only trust fence (plus browser same-origin markers) —
 * these endpoints execute commands on remote servers, so LAN-exposed dsh web
 * deployments must not serve them.
 */
import type { WebRoute, WebUpgradeRoute } from '@deepseek-ai/dsh-host-webserver';
import type { SshEngine } from './engine.ts';
import type { HostStore } from './store.ts';
/** Route family dependencies. */
export interface SshRoutesDeps {
    /** The host store (CRUD). */
    store: HostStore;
    /** The engine (ops). */
    engine: SshEngine;
    /** Temp dir for upload/download staging (tests inject a sandbox). */
    stagingDir?: string;
}
/**
 * Build every /api/dsh-ssh route (exact paths) plus the terminal upgrade.
 * @param deps - store, engine, staging dir.
 * @returns routes and the upgrade route.
 */
export declare function makeRoutes(deps: SshRoutesDeps): {
    routes: WebRoute[];
    upgrade: WebUpgradeRoute;
};
