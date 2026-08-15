/**
 * Tiny localization helper: resolves the active dictionary (zh when the
 * document language starts with zh, else en). The dictionary is swapped by
 * the plugin's apply() on <html lang> changes.
 */
import { en, zh, type WorkspaceKey } from './locales.ts'

let current: typeof zh = document.documentElement.lang?.startsWith('zh') ? zh : en

/** Switch the active dictionary (called by the client entry on lang change). */
export function setLanguage(zhMode: boolean): void {
  current = zhMode ? zh : en
}

/** Resolve one copy key (supports %s / %d substitution). */
export function tt(key: WorkspaceKey, ...args: Array<string | number>): string {
  let text = current[key] ?? zh[key] ?? key
  for (const arg of args) {
    text = text.replace(/%[sd]/, String(arg))
  }
  return text
}
