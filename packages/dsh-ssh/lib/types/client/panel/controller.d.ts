/**
 * SSH panel controller: the single owner of the panel's open/closed state.
 *
 * Framework-free (structural runtime faces, task-board core/controller.ts
 * style) so the DOM mounts and the React panel share one tiny subscription
 * surface. The state lives only for the browser session (no persistence).
 */
/** Immutable controller snapshot for UI subscriptions. */
export interface PanelControllerSnapshot {
    panelOpen: boolean;
}
/** The panel state owner the sidebar entry toggles and the view renders from. */
export declare class PanelController {
    private panelOpen;
    private listeners;
    getSnapshot(): PanelControllerSnapshot;
    subscribe(fn: () => void): () => void;
    open(): void;
    close(): void;
    toggle(): void;
    private notify;
}
