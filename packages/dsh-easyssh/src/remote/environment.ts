/**
 * Remote-environment scrubbing for the SSH process and terminal launchers.
 * Ported from UynajGI/dsh-ssh (MIT) — adapted to the dsh-ssh engine.
 */

import { SENSITIVE_ENV_PATTERN } from '@deepseek-ai/dsh-subprocess'
import type { SshEngine } from '@deepseek-ai/dsh-ssh'

/** Quote one argument for a POSIX login shell (from the dsh-ssh engine's world). */
export function quoteShellArg(value: string): string {
  return `'${value.replaceAll('\'', '\'"\'"\'')}'`
}

/** Wrap a remote command so it runs from the given working directory. */
export function wrapCwd(cwd: string, command: string): string {
  return `cd -- ${quoteShellArg(cwd)} && ${command}`
}

/** Read the remote login environment (one exec per call; callers may cache). */
export async function readRemoteEnvironment(engine: SshEngine, alias: string): Promise<Record<string, string>> {
  const result = await engine.exec(alias, 'env', 10_000)
  if (!result.success) {
    throw new Error(`subprocess-ssh: cannot read the remote environment: ${result.stderr.trim() || 'unknown error'}`)
  }
  const environment: Record<string, string> = {}
  for (const line of result.stdout.split('\n')) {
    if (line === '') continue
    const separator = line.indexOf('=')
    if (separator <= 0) continue
    const name = line.slice(0, separator)
    if (name.includes('\0')) continue
    environment[name] = line.slice(separator + 1)
  }
  return environment
}

/**
 * Remove harness-private and credential-shaped names from a remote environment.
 */
export function scrubRemoteEnvironment(environment: Readonly<Record<string, string>>): Map<string, string> {
  const scrubbed = new Map<string, string>()
  for (const [name, value] of Object.entries(environment)) {
    if (name.startsWith('DSH_') || SENSITIVE_ENV_PATTERN.test(name)) continue
    scrubbed.set(name, value)
  }
  return scrubbed
}

/**
 * Overlay explicit entries and serialize one validated environment for `env -i`.
 */
export function serializeEnvironment(
  scrubbed: ReadonlyMap<string, string>,
  explicit: Readonly<NodeJS.ProcessEnv> | undefined,
): string {
  const environment = new Map(scrubbed)
  for (const [name, value] of Object.entries(explicit ?? {})) {
    if (name.length === 0 || name.includes('=') || name.includes('\0') || value?.includes('\0') === true) {
      throw new Error('subprocess-ssh: environment entries require non-empty NUL-free names without = and NUL-free values')
    }
    if (value === undefined) environment.delete(name)
    else environment.set(name, value)
  }
  return [...environment].map(([name, value]) => quoteShellArg(`${name}=${value}`)).join(' ')
}
