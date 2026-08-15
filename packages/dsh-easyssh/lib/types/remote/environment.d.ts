/**
 * Remote-environment scrubbing for the SSH process and terminal launchers.
 * Ported from UynajGI/dsh-ssh (MIT) — adapted to the dsh-ssh engine.
 */
import type { SshEngine } from '@deepseek-ai/dsh-ssh';
/** Quote one argument for a POSIX login shell (from the dsh-ssh engine's world). */
export declare function quoteShellArg(value: string): string;
/** Wrap a remote command so it runs from the given working directory. */
export declare function wrapCwd(cwd: string, command: string): string;
/** Read the remote login environment (one exec per call; callers may cache). */
export declare function readRemoteEnvironment(engine: SshEngine, alias: string): Promise<Record<string, string>>;
/**
 * Remove harness-private and credential-shaped names from a remote environment.
 */
export declare function scrubRemoteEnvironment(environment: Readonly<Record<string, string>>): Map<string, string>;
/**
 * Overlay explicit entries and serialize one validated environment for `env -i`.
 */
export declare function serializeEnvironment(scrubbed: ReadonlyMap<string, string>, explicit: Readonly<NodeJS.ProcessEnv> | undefined): string;
//# sourceMappingURL=environment.d.ts.map