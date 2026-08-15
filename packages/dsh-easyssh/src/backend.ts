/**
 * Workspace backends: one normalized interface over the local filesystem and
 * over a remote SSH host (through the dsh-ssh engine). The active backend is
 * chosen by the mode store; both apply a root gate so a relative path can
 * never escape the workspace root, and remote ops are only served when the
 * requested root matches the mode's resolved remote root.
 */
import { mkdir, readdir, readFile, realpath, stat, writeFile } from 'node:fs/promises'
import type { Dirent, Stats } from 'node:fs'
import { dirname, isAbsolute, join } from 'node:path'
import type { SshEngine } from '@deepseek-ai/dsh-ssh'
import type {
  DirListing,
  FileRead,
  FileWriteResult,
  SearchHit,
  SearchView,
  WorkspaceEntry,
  WorkspaceState,
} from './protocol.ts'

/** Search caps (hits, scanned entries, depth). */
export const SEARCH_HIT_CAP = 200
export const SEARCH_SCAN_CAP = 20_000
export const SEARCH_MAX_DEPTH = 4
/** Directories skipped by search (VS Code-like noise reduction). */
const SEARCH_SKIP_DIRS = new Set(['.git', 'node_modules'])
/** Directories never listed in the tree. */
const TREE_SKIP_DIRS = new Set(['.git'])
/** Remote find/glob max depth. */
const REMOTE_FIND_MAX_DEPTH = 6
/** Remote exec timeout for find/grep. */
const REMOTE_SEARCH_TIMEOUT_MS = 20_000

/** Error carrying a stable machine-readable code (routes map codes to status). */
export class BackendError extends Error {
  constructor(
    public readonly code: 'binary' | 'too-large' | 'conflict' | 'outside-root' | 'not-remote' | 'root-mismatch' | 'io',
    message: string,
  ) {
    super(message)
    this.name = 'BackendError'
  }
}

/** Normalize a workspace-relative path: strip slashes and '.', reject '..'. */
export function normalizeRel(raw: string): string {
  const parts = raw.split('/').filter((part) => part !== '' && part !== '.')
  for (const part of parts) {
    if (part === '..') throw new BackendError('outside-root', 'path escapes root: ".." is not allowed')
  }
  return parts.join('/')
}

/** True when abs is inside root (prefix on normalized paths). */
export function isInside(root: string, abs: string): boolean {
  const prefix = root.endsWith('/') ? root : root + '/'
  return abs === root || abs.startsWith(prefix)
}

/** Resolve a rel path against a root using posix semantics (both backends). */
export function relToAbs(root: string, rel: string): string {
  const normalized = normalizeRel(rel)
  const base = root.replace(/\/+$/, '')
  return normalized === '' ? base : `${base}/${normalized}`
}

/** Escape a string into a POSIX single-quoted shell word. */
export function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`
}

/** Sanitize a search query for embedding in a remote find -iname literal. */
function sanitizeQuery(query: string): string {
  // Strip shell metacharacters and control chars; the rest is a literal.
  return query.replace(/['"`\\;$(){}|&<>*\n\r\t]/g, '').slice(0, 64)
}

/** Decode a buffer as UTF-8 text with the text/binary gate (no size cap —
 *  the preview loads the whole file; binary detection is by NUL probe only). */
function decodeText(buffer: Buffer, path: string): string {
  if (buffer.length > 0) {
    const probe = buffer.subarray(0, Math.min(buffer.length, 8192))
    if (probe.includes(0)) throw new BackendError('binary', `'${path}' is not a text file`)
  }
  return buffer.toString('utf8')
}

/** The backend contract both implementations satisfy. */
export interface WorkspaceBackend {
  /** Validate that the requested root is acceptable in the current mode. */
  assertRoot(root: string): void
  list(root: string, rel: string): Promise<DirListing>
  read(root: string, rel: string): Promise<FileRead>
  write(root: string, rel: string, content: string, expectedMtime?: number): Promise<FileWriteResult>
  search(root: string, query: string): Promise<SearchView>
}

/**
 * Local backend: plain node:fs against an absolute local root (the session's
 * cwd, supplied by the browser). Realpath-walk gating keeps symlinks inside.
 */
export class LocalBackend implements WorkspaceBackend {
  assertRoot(root: string): void {
    if (!isAbsolute(root)) throw new BackendError('outside-root', `root must be an absolute local path (got '${root}')`)
  }

  async list(root: string, rel: string): Promise<DirListing> {
    const abs = await this.resolve(root, rel)
    let dirents: Dirent[]
    try {
      dirents = await readdir(abs, { withFileTypes: true })
    } catch (error) {
      throw this.io(error, abs)
    }
    const entries: WorkspaceEntry[] = dirents
      .filter((entry) => !TREE_SKIP_DIRS.has(entry.name))
      .map((entry): WorkspaceEntry => ({
        name: entry.name,
        type: entry.isDirectory() ? 'dir' : entry.isFile() ? 'file' : 'other',
        size: 0,
        mtimeMs: 0,
      }))
      .sort((a, b) => {
        if (a.type === 'dir' && b.type !== 'dir') return -1
        if (a.type !== 'dir' && b.type === 'dir') return 1
        const an = a.name.toLowerCase()
        const bn = b.name.toLowerCase()
        return an < bn ? -1 : an > bn ? 1 : 0
      })
    return { path: abs, entries }
  }

  async read(root: string, rel: string): Promise<FileRead> {
    const abs = await this.resolve(root, rel)
    let buffer: Buffer
    let stats: Stats
    try {
      buffer = await readFile(abs)
      stats = await stat(abs)
    } catch (error) {
      throw this.io(error, abs)
    }
    if (stats.isDirectory()) throw new BackendError('io', `'${abs}' is a directory`)
    return { path: abs, content: decodeText(buffer, abs), size: stats.size, mtime: stats.mtimeMs }
  }

  async write(root: string, rel: string, content: string, expectedMtime?: number): Promise<FileWriteResult> {
    const abs = await this.resolve(root, rel)
    if (expectedMtime !== undefined) {
      let stats: Stats
      try {
        stats = await stat(abs)
      } catch (error) {
        throw this.io(error, abs)
      }
      if (Math.round(stats.mtimeMs) !== Math.round(expectedMtime)) {
        throw new BackendError('conflict', `mtime conflict: remote file changed (${Math.round(stats.mtimeMs)} != ${Math.round(expectedMtime)})`)
      }
    }
    try {
      await mkdir(dirname(abs), { recursive: true })
      await writeFile(abs, content, 'utf8')
      const stats = await stat(abs)
      return { mtime: stats.mtimeMs }
    } catch (error) {
      throw this.io(error, abs)
    }
  }

  async search(root: string, query: string): Promise<SearchView> {
    const hits: SearchHit[] = []
    let scanned = 0
    let truncated = false
    const walk = async (dir: string, depth: number): Promise<void> => {
      if (hits.length >= SEARCH_HIT_CAP || scanned >= SEARCH_SCAN_CAP || depth > SEARCH_MAX_DEPTH) {
        if (hits.length >= SEARCH_HIT_CAP || scanned >= SEARCH_SCAN_CAP) truncated = true
        return
      }
      let dirents: Dirent[]
      try {
        dirents = await readdir(dir, { withFileTypes: true })
      } catch {
        return // permission noise: skip silently
      }
      for (const entry of dirents) {
        scanned += 1
        if (scanned > SEARCH_SCAN_CAP) {
          truncated = true
          return
        }
        if (entry.isDirectory() && SEARCH_SKIP_DIRS.has(entry.name)) continue
        const abs = join(dir, entry.name)
        if (entry.isDirectory()) {
          if (entry.name.toLowerCase().includes(query)) hits.push({ path: abs, rel: this.relOf(root, abs), isDir: true })
          await walk(abs, depth + 1)
        } else if (entry.name.toLowerCase().includes(query)) {
          hits.push({ path: abs, rel: this.relOf(root, abs), isDir: false })
        }
        if (hits.length >= SEARCH_HIT_CAP) {
          truncated = true
          return
        }
      }
    }
    await walk(root, 0)
    return { query, hits: hits.slice(0, SEARCH_HIT_CAP), truncated }
  }

  /** Realpath-walk gate: the resolved absolute path must stay inside root. */
  private async resolve(root: string, rel: string): Promise<string> {
    const normalized = normalizeRel(rel)
    const abs = normalized === '' ? root : join(root, ...normalized.split('/'))
    if (!this.isWithin(root, abs)) throw new BackendError('outside-root', `path escapes root: ${rel}`)
    let probe = abs
    for (let hop = 0; hop < 32; hop += 1) {
      let real: string
      try {
        real = await realpath(probe)
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code
        if (code !== 'ENOENT') return abs // permission/IO: let the caller surface it
        const parent = dirname(probe)
        if (parent === probe) return abs
        probe = parent
        continue
      }
      if (!this.isWithin(root, real)) throw new BackendError('outside-root', `path resolves outside root: ${rel}`)
      return abs
    }
    throw new BackendError('outside-root', `path cannot be resolved: ${rel}`)
  }

  private isWithin(root: string, abs: string): boolean {
    const prefix = root.endsWith('\\') || root.endsWith('/') ? root : root + (root.includes('\\') ? '\\' : '/')
    return abs === root || abs.toLowerCase().startsWith(prefix.toLowerCase())
  }

  private relOf(root: string, abs: string): string {
    return abs === root ? '' : abs.slice(root.length).replace(/^[\\/]+/, '')
  }

  private io(error: unknown, path: string): BackendError {
    const message = error instanceof Error ? error.message : String(error)
    return new BackendError('io', `'${path}': ${message}`)
  }
}

/**
 * Remote backend: every operation rides the dsh-ssh engine's SFTP/exec against
 * the mode's active host, gated to the resolved remote root.
 */
export class RemoteBackend implements WorkspaceBackend {
  constructor(
    private readonly engine: SshEngine,
    private readonly getState: () => WorkspaceState,
  ) {}

  private get alias(): string {
    const state = this.getState()
    if (state.mode !== 'remote' || state.alias === undefined) {
      throw new BackendError('not-remote', 'not in remote mode — switch the GUI to SSH mode first')
    }
    return state.alias
  }

  assertRoot(root: string): void {
    const state = this.getState()
    if (state.mode !== 'remote' || state.alias === undefined) {
      throw new BackendError('not-remote', 'not in remote mode — switch the GUI to SSH mode first')
    }
    if (state.remoteRoot === undefined || root !== state.remoteRoot) {
      throw new BackendError('root-mismatch', `root '${root}' does not match the remote workspace root '${state.remoteRoot ?? '?'}'`)
    }
  }

  async list(root: string, rel: string): Promise<DirListing> {
    this.assertRoot(root)
    const abs = relToAbs(root, rel)
    try {
      const entries = await this.engine.ls(this.alias, abs)
      return {
        path: abs,
        entries: entries
          .filter((entry) => !TREE_SKIP_DIRS.has(entry.name))
          .map((entry): WorkspaceEntry => ({ name: entry.name, type: entry.type, size: entry.size, mtimeMs: entry.mtimeMs }))
          .sort((a, b) => {
            if (a.type === 'dir' && b.type !== 'dir') return -1
            if (a.type !== 'dir' && b.type === 'dir') return 1
            const an = a.name.toLowerCase()
            const bn = b.name.toLowerCase()
            return an < bn ? -1 : an > bn ? 1 : 0
          }),
      }
    } catch (error) {
      throw this.io(error, abs)
    }
  }

  async read(root: string, rel: string): Promise<FileRead> {
    this.assertRoot(root)
    const abs = relToAbs(root, rel)
    try {
      const result = await this.engine.readFile(this.alias, abs)
      return { path: abs, content: decodeText(result.content, abs), size: result.size, mtime: result.mtime }
    } catch (error) {
      if (error instanceof BackendError) throw error
      throw this.io(error, abs)
    }
  }

  async write(root: string, rel: string, content: string, expectedMtime?: number): Promise<FileWriteResult> {
    this.assertRoot(root)
    const abs = relToAbs(root, rel)
    try {
      const result = await this.engine.writeFile(this.alias, abs, Buffer.from(content, 'utf8'), expectedMtime)
      return { mtime: result.mtime }
    } catch (error) {
      if (error instanceof BackendError) throw error
      throw this.io(error, abs)
    }
  }

  async search(root: string, query: string): Promise<SearchView> {
    this.assertRoot(root)
    const literal = sanitizeQuery(query)
    if (literal === '') return { query, hits: [], truncated: false }
    const cmd = `find ${shellQuote(root)} -maxdepth ${SEARCH_MAX_DEPTH} \\( -not -path ${shellQuote('*/node_modules*')} \\) \\( -not -path ${shellQuote('*/.git*')} \\) -iname ${shellQuote(`*${literal}*`)} -printf '%y|%p\\n'`
    return this.parseFind(root, query, cmd)
  }

  /** Glob search over the remote root (remote_glob tool; max depth 6). */
  async glob(root: string, pattern: string): Promise<SearchView> {
    this.assertRoot(root)
    const normalized = normalizeRel(pattern)
    if (normalized === '') return { query: pattern, hits: [], truncated: false }
    const cmd = `find ${shellQuote(root)} -maxdepth ${REMOTE_FIND_MAX_DEPTH} -path ${shellQuote(`${root}/${normalized}`)} -printf '%y|%p\\n'`
    return this.parseFind(root, pattern, cmd)
  }

  /** Content grep over the remote root (remote_grep tool; capped output). */
  async grep(root: string, pattern: string): Promise<{ lines: string[]; truncated: boolean }> {
    this.assertRoot(root)
    const literal = pattern.replace(/'/g, `'\\''`)
    const cmd = `grep -rIn --exclude-dir=.git --exclude-dir=node_modules -m 200 ${shellQuote(literal)} ${shellQuote(root)} 2>/dev/null | head -c 200000`
    const result = await this.engine.exec(this.alias, cmd, REMOTE_SEARCH_TIMEOUT_MS)
    if (!result.success && result.stderr !== '' && result.stdout === '') {
      throw new BackendError('io', result.stderr.trim())
    }
    const lines = result.stdout.split('\n').filter((line) => line !== '')
    return { lines, truncated: result.stdout.length >= 200000 }
  }

  /** Run one find command and normalize its '%y|%p' lines. */
  private async parseFind(root: string, query: string, cmd: string): Promise<SearchView> {
    const result = await this.engine.exec(this.alias, cmd, REMOTE_SEARCH_TIMEOUT_MS)
    if (!result.success && result.stderr !== '' && result.stdout === '') {
      throw new BackendError('io', result.stderr.trim())
    }
    const hits: SearchHit[] = []
    const lines = result.stdout.split('\n')
    for (const line of lines) {
      if (line === '') continue
      const separator = line.indexOf('|')
      if (separator < 1) continue
      const abs = line.slice(separator + 1)
      if (abs === '') continue
      hits.push({ path: abs, rel: this.relOf(root, abs), isDir: line[0] === 'd' })
      if (hits.length >= SEARCH_HIT_CAP) break
    }
    return { query, hits, truncated: hits.length >= SEARCH_HIT_CAP || lines.length > hits.length }
  }

  private relOf(root: string, abs: string): string {
    return abs === root ? '' : abs.slice(root.length).replace(/^\/+/, '')
  }

  private io(error: unknown, path: string): BackendError {
    const message = error instanceof Error ? error.message : String(error)
    return new BackendError('io', `'${path}': ${message}`)
  }
}
