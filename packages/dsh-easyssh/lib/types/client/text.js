/**
 * Tiny localization helper: resolves the active dictionary (zh when the
 * document language starts with zh, else en). The dictionary is swapped by
 * the plugin's apply() on <html lang> changes.
 */
import { en, zh } from "./locales.js";
let current = document.documentElement.lang?.startsWith('zh') ? zh : en;
/** Switch the active dictionary (called by the client entry on lang change). */
export function setLanguage(zhMode) {
    current = zhMode ? zh : en;
}
/** Resolve one copy key (supports %s / %d substitution). */
export function tt(key, ...args) {
    let text = current[key] ?? zh[key] ?? key;
    for (const arg of args) {
        text = text.replace(/%[sd]/, String(arg));
    }
    return text;
}
