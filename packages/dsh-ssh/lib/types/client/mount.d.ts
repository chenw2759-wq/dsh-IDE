import type { SshApi } from './api.ts';
import type { PanelController } from './panel/controller.ts';
/** The injected panel container (kept in the DOM, hidden when inactive). */
export declare const PANEL_VIEW_SELECTOR = "[data-dsh-ssh-view]";
/**
 * Mount the panel React tree into the center column and bind its visibility
 * to the controller's panelOpen state.
 * @param controller - the panel controller driving the view.
 * @param api - the SSH API client the tabs operate through.
 * @returns disposer unmounting the tree and restoring the column.
 */
export declare function mountPanel(controller: PanelController, api: SshApi): () => void;
