/**
 * Sidebar entry injection.
 *
 * dsh's sidebar shell exposes no slot an external plugin can register into,
 * so — following the task-board precedent of DOM-level extension — the entry
 * row is injected between the shell's New Session button and the workspace
 * browser. The injection self-heals: a MutationObserver watches the sidebar
 * root and re-inserts the row whenever a React re-render displaces it
 * (re-insertion happens in the same frame, before paint, so no flicker).
 *
 * The row is plain DOM (no React tree) so it can never disturb the shell's
 * reconciliation; the panel view it toggles is a separate React root mounted
 * in the center column (see mount.tsx).
 */
import type { PanelController } from './panel/controller.ts';
/** Stable data attribute identifying the injected entry row. */
export declare const ENTRY_SELECTOR = "[data-dsh-ssh-entry]";
/**
 * Mount the sidebar entry, waiting for the shell to render and self-healing
 * on later React re-renders.
 * @param controller - the panel controller the entry toggles.
 * @returns disposer removing the entry and its observers.
 */
export declare function mountSidebarEntry(controller: PanelController): () => void;
