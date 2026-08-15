/**
 * Shared panel helpers: the active-dictionary pick (document-language based,
 * task-board precedent) bound to the dsh-ssh interpolator in locales.ts, plus
 * a small error-message extractor. All copy stays in the locale dictionaries.
 */
import { type SshKey } from '../locales.ts';
/** Template values accepted by the interpolator. */
export type TranslateValues = Record<string, string | number>;
/** Active dictionary, picked by the document language at call time. */
export declare function dictionary(): Record<string, string>;
/** Translate a key with optional {name} template params (current language). */
export declare function tt(key: SshKey, values?: TranslateValues): string;
/** Human-readable error text from an unknown thrown value. */
export declare function errorMessage(error: unknown): string;
