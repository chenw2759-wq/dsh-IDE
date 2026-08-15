/**
 * Browser-half entry for the dsh-easyssh plugin — runs inside the dsh
 * web GUI. Registers the two session-header utilities (SSH configure + mode
 * toggle, left of the session log) and the persistent SSH host-manager page
 * in Settings. The file-tree UI lives in the right-side aionui panel, which
 * reads the SSH mode through the `sshWorkspaceMode` service provided here
 * (root follows the mode: local cwd ⇄ remoteRoot). Failure policy: every DOM
 * wiring problem is logged, never thrown — the web shell fails the whole
 * boot when a plugin apply throws.
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client';
import { type WorkspaceKey } from './locales.ts';
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        /** dsh-easyssh surface copy. */
        'dsh-easyssh': WorkspaceKey;
    }
}
/** The cross-plugin mode service name (read by the aionui panel). */
export declare const SSH_WORKSPACE_MODE_SERVICE = "sshWorkspaceMode";
/** Required services: slots for the header buttons, locale for the copy, sessions for the local root. */
export declare const inject: string[];
/** Apply the browser half. */
export declare function apply(ctx: ClientContext): void;
//# sourceMappingURL=index.d.ts.map