import type { SshApi } from '../api.ts';
import type { PanelController } from './controller.ts';
/** The panel's tab identifiers. */
export type SshTab = 'hosts' | 'terminal' | 'transfer' | 'tunnels' | 'cluster';
/** Panel shell props. */
export interface SshPanelProps {
    /** The panel state owner (open/close/toggle). */
    controller: PanelController;
    /** The SSH API client every tab operates through. */
    api: SshApi;
}
/** The tabbed SSH panel. */
export declare function SshPanel({ controller, api }: SshPanelProps): import("react").JSX.Element;
