/**
 * Tiny localization helper: resolves the active dictionary (zh when the
 * document language starts with zh, else en). The dictionary is swapped by
 * the plugin's apply() on <html lang> changes.
 */
import { type WorkspaceKey } from './locales.ts';
/** Switch the active dictionary (called by the client entry on lang change). */
export declare function setLanguage(zhMode: boolean): void;
/** Resolve one copy key (supports %s / %d substitution). */
export declare function tt(key: WorkspaceKey, ...args: Array<string | number>): string;
//# sourceMappingURL=text.d.ts.map