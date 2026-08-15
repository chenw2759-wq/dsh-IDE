/**
 * Host config store: one JSON file (`~/.dsh/dsh-ssh.json`) holding every
 * SSH host entry, written atomically (tmp + rename). Also parses the user's
 * standard `~/.ssh/config` for one-shot import. Secrets (passwords,
 * passphrases) live in this user-owned file in plaintext — same trust model
 * as ssh-skill's annotated ssh-config comments; document it, never log it.
 */
import type { HostPayload, ImportResult, SshHostEntry, SshHostSummary } from './protocol.ts';
/** Store file location: <home>/.dsh/dsh-ssh.json. */
export declare function storePath(): string;
/** The user's standard OpenSSH config path. */
export declare function sshConfigPath(): string;
/** Validate the wire shape of a host payload; returns a message or undefined. */
export declare function validateHostPayload(payload: unknown): string | undefined;
/** Validate an alias for creation. */
export declare function validateAlias(alias: string): string | undefined;
/**
 * The host store. Pure file I/O — no cordis dependency, unit-testable.
 */
export declare class HostStore {
    /** The JSON file path. */
    readonly path: string;
    /** Optional override of the ~/.ssh/config path (tests). */
    private readonly sshConfigOverride;
    /**
     * @param path - store file path (defaults to the standard location).
     * @param sshConfigOverride - ssh config path override (tests only).
     */
    constructor(path?: string, sshConfigOverride?: string);
    /** Load all entries (empty store when the file is absent). */
    list(): SshHostEntry[];
    /** Find one entry by alias. */
    find(alias: string): SshHostEntry | undefined;
    /** Secret-free projection for the browser and agent surfaces. */
    summarize(entry: SshHostEntry): SshHostSummary;
    /** Create one entry. Throws on alias collision or invalid payload. */
    create(payload: HostPayload): SshHostEntry;
    /** Update the fields present in `patch`; unknown aliases throw. */
    update(alias: string, patch: Partial<HostPayload>): SshHostEntry;
    /** Remove one entry. */
    delete(alias: string): void;
    /**
     * Import hosts from `~/.ssh/config`: Host blocks with a single non-wildcard
     * pattern and a HostName become entries (key auth via IdentityFile, jump
     * hosts via ProxyJump). Existing aliases are skipped.
     * @returns import statistics.
     */
    importFromSshConfig(): ImportResult;
    private skippedNames;
    private load;
    private save;
}
/** Expand a leading `~` in a filesystem path. */
export declare function expandHome(path: string): string;
