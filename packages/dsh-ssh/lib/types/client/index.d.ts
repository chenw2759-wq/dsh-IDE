/**
 * Browser-half entry for the dsh-ssh plugin — runs inside the dsh web GUI.
 *
 * Registers the dsh-ssh locale dictionaries and mounts the two DOM surfaces:
 * the sidebar entry row (toggles the panel) and the SSH operations panel in
 * the center column. Failure policy: DOM mounting problems are logged, never
 * thrown — the web shell fails the whole boot when a plugin apply throws, and
 * an external plugin must not take the GUI down.
 *
 * Export discipline (packages/client rule): the /client surface carries what
 * cordis loading needs plus types only — all value exports stay internal.
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client';
import { type SshKey } from './locales.ts';
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        /** dsh-ssh surface copy. */
        'dsh-ssh': SshKey;
    }
}
/** Required services (fiber inject waiting — the runtime must be up first). */
export declare const inject: string[];
/** Type-only surface (export discipline: no value exports beyond the plugin contract). */
export type { PanelControllerSnapshot } from './panel/controller.ts';
export type { SshPanelProps } from './panel/SshPanel.tsx';
export type { HostsTabProps } from './panel/HostsTab.tsx';
export type { HostFormDialogProps } from './panel/HostFormDialog.tsx';
export type { TerminalTabProps } from './panel/TerminalTab.tsx';
export type { TransferTabProps } from './panel/TransferTab.tsx';
export type { TunnelsTabProps } from './panel/TunnelsTab.tsx';
export type { ClusterTabProps } from './panel/ClusterTab.tsx';
export type { SshKey } from './locales.ts';
/**
 * Mount the SSH panel.
 * @param ctx - client root context (locale service).
 */
export declare function apply(ctx: ClientContext): void;
