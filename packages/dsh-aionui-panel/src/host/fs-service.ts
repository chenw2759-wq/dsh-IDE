/**
 * Host filesystem service for the panel: directory listing, file read (whole
 * text, no size cap), text write with an mtime conflict check, filename search
 * with directory pruning, delete (untracked discard), and a recursive watcher
 * that emits change events. Every operation resolves against a gated project
 * root and refuses to escape it (path traversal guard). Text is decoded utf-8;
 * images come back as data URLs (capped) so the browser renders them without
 * extra round trips.
 *
 * SSH-mode delegation: when the optional remote core is present and the
 * requested root equals the active remote root, every fs operation rides the
 * SSH engine instead of the local disk (list/read/write/search/delete), so
 * the panel shows the remote workspace while the GUI is in SSH mode.
 * @module dsh-aionui-panel/host/fs-service
 */

import { readdir, readFile, realpath, stat, writeFile, rm, mkdir, rename as renamePath, copyFile } from 'node:fs/promises'
import { watch as watchDir, type Dirent, type FSWatcher } from 'node:fs'
import { join, dirname } from 'node:path'
import type { DirListing, FileRead, FsEntry, PanelError, SearchHit, SearchView } from '../core/types.ts'
import { isPathInside, type GateVerdict, type WorkspaceGate } from './gate.ts'

/** Image read cap (data URL payload budget). */
const IMAGE_CAP_BYTES = 8 << 20

/**
 * Minimal structural view of the dsh-ssh-workspace host core (`sshWorkspaceCore`
 * service): the mode store plus the SSH engine. Defined structurally here so
 * this plugin never hard-depends on the workspace plugin's package.
 */
export interface SshCoreLike {
  store: {
    getSnapshot(): { mode: 'local' | 'remote'; alias?: string; remoteRoot?: string }
  }
  engine: {
    ls(alias: string, path: string): Promise<Array<{ name: string; type: 'dir' | 'file' | 'other'; size: number; mtimeMs: number }>>
    readFile(alias: string, path: string): Promise<{ content: Buffer; mtime: number; size: number }>
    writeFile(alias: string, path: string, content: Buffer, expectedMtime?: number): Promise<{ mtime: number }>
    rm(alias: string, path: string, recursive?: boolean): Promise<void>
    exec(alias: string, command: string, timeoutMs?: number): Promise<{ success: boolean; stdout: string; stderr: string }>
    rename(alias: string, fromPath: string, toPath: string): Promise<void>
  }
}
/** Filename-search caps (results and scanned entries). */
const SEARCH_HIT_CAP = 200
const SEARCH_SCAN_CAP = 20_000
/** Remote find max depth (the engine's exec shell quotes each argument). */
const SEARCH_MAX_DEPTH_REMOTE = 24
/** Directories skipped by search (VS Code-like noise reduction). */
const SEARCH_SKIP_DIRS = new Set(['.git', 'node_modules'])
/** Directories never listed in the tree. */
const TREE_SKIP_DIRS = new Set(['.git'])
/** Polling fallback interval when recursive watch is unavailable. */
const POLL_FALLBACK_MS = 3_000

/** POSIX single-quote a remote shell argument (find -iname patterns). */
function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`
}

/**
 * Resolve a relative path against the canonical root, realpath-checking the
 * existing ancestors so a symlink cannot smuggle the operation outside the
 * root. A path that does not yet exist (ENOENT) is verified through its
 * nearest existing ancestor — a nonexistent tail cannot itself be a symlink.
 * A path whose real path escapes the root is rejected with path-outside-root.
 */
async function resolveInsideRoot(root: string, rel: string): Promise<{ ok: true; abs: string } | { ok: false; error: PanelError }> {
  if (rel.includes('\0')) return { ok: false, error: { code: 'path-outside-root', message: 'invalid path' } }
  const abs = join(root, rel)
  if (!isPathInside(root, abs)) {
    return { ok: false, error: { code: 'path-outside-root', message: `path escapes root: ${rel}` } }
  }
  // Walk ancestors until we hit one that exists; validate its real path.
  let probe = abs
  for (let hop = 0; hop < 32; hop += 1) {
    let real: string
    try {
      real = await realpath(probe)
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code
      // Any other realpath failure (EACCES/ELOOP/...) lets the operation run;
      // the caller's own try/catch maps permission/IO problems to its normal
      // not-found / write-failed codes.
      if (code !== 'ENOENT') return { ok: true, abs }
      // Ancestor does not exist yet; realpath the parent instead.
      const parent = dirname(probe)
      if (parent === probe) return { ok: true, abs }
      probe = parent
      continue
    }
    if (!isPathInside(root, real)) {
      return { ok: false, error: { code: 'path-outside-root', message: `path resolves outside root: ${rel}` } }
    }
    return { ok: true, abs }
  }
  return { ok: false, error: { code: 'path-outside-root', message: `path cannot be resolved: ${rel}` } }
}

/** True when the relative path is, or passes through, a .git component. */
function isGitPath(rel: string): boolean {
  return rel.split('/').some((part) => part.toLowerCase() === '.git')
}

/** Case-insensitive alpha compare (dirs first, then files). */
function compareEntries(a: FsEntry, b: FsEntry): number {
  if (a.isDir !== b.isDir) return a.isDir ? -1 : 1
  const an = a.name.toLowerCase()
  const bn = b.name.toLowerCase()
  return an < bn ? -1 : an > bn ? 1 : 0
}

/** The image probe: parse PNG/JPEG/GIF/WebP header dimensions (undefined on failure). */
export function probeImageSize(data: Buffer): { width: number; height: number } | undefined {
  try {
    if (data.length >= 24 && data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4e && data[3] === 0x47) {
      return { width: data.readUInt32BE(16), height: data.readUInt32BE(20) }
    }
    if (data.length >= 10 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) {
      // Walk the marker segments to the first SOF marker (frame header) and
      // read the dimensions there; the bytes right after SOI (`FF E0 ...`)
      // are an APP segment, not the frame dimensions. Bounded to 16 segments
      // so a malformed file cannot stall the probe.
      let pos = 2 // skip the SOI marker itself (FF D8)
      for (let segment = 0; segment < 16; segment += 1) {
        if (pos + 2 > data.length) return undefined
        if (data[pos] !== 0xff) return undefined
        // Skip any 0xFF padding before the actual marker byte.
        while (pos < data.length && data[pos] === 0xff) pos += 1
        if (pos >= data.length) return undefined
        const marker = data[pos]
        pos += 1
        // Standalone markers (TEM / RST0..RST7) carry no payload.
        if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0xd8) continue
        // SOF0..SOF15 (excluding DHT/DAC/DNL/...): the frame header with dims.
        const isSof =
          marker === 0xc0 || marker === 0xc1 || marker === 0xc2 || marker === 0xc3 ||
          marker === 0xc5 || marker === 0xc6 || marker === 0xc7 ||
          marker === 0xc9 || marker === 0xca || marker === 0xcb ||
          marker === 0xcd || marker === 0xce || marker === 0xcf
        if (isSof) {
          // pos points at the length field: length(2) precision(1) height(2) width(2).
          if (pos + 7 > data.length) return undefined
          return { height: data.readUInt16BE(pos + 3), width: data.readUInt16BE(pos + 5) }
        }
        // A sized segment: 2-byte length (including itself) + its payload.
        if (pos + 2 > data.length) return undefined
        const length = data.readUInt16BE(pos)
        pos += length
        if (pos < 0) return undefined
      }
      return undefined
    }
    if (data.length >= 14 && data[0] === 0x47 && data[1] === 0x49 && data[2] === 0x46) {
      return { width: data.readUInt16LE(6), height: data.readUInt16LE(8) }
    }
    if (
      data.length >= 30 && data[8] === 0x57 && data[9] === 0x45 && data[10] === 0x42 && data[11] === 0x50
      && data[12] === 0x56 && data[13] === 0x50 && data[14] === 0x38 && data[15] === 0x58
    ) {
      const size = (o: number): number => data[o] | (data[o + 1] << 8) | (data[o + 2] << 16)
      return { width: size(24) + 1, height: size(27) + 1 }
    }
  } catch {
    return undefined
  }
  return undefined
}

/** Derive the mime type for an image read from the extension, then the content. */
function imageMime(rel: string, data: Buffer): string {
  const ext = rel.split('.').pop()?.toLowerCase() ?? ''
  const byExt: Record<string, string> = {
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif',
    webp: 'image/webp', svg: 'image/svg+xml', ico: 'image/x-icon', avif: 'image/avif', bmp: 'image/bmp',
  }
  if (byExt[ext]) return byExt[ext]
  if (data.length >= 3 && data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4e) return 'image/png'
  if (data.length >= 3 && data[0] === 0xff && data[1] === 0xd8) return 'image/jpeg'
  return 'application/octet-stream'
}

/**
 * Filesystem service: gated listing/read/write/search/delete plus a change
 * watcher. All relative paths are resolved against the gated root.
 * @param gate - the workspace gate (host: registered workspace membership).
 * @param getRemote - optional provider of the SSH workspace core (mode store +
 *   engine). When present and the mode is remote, operations for the remote
 *   root delegate to the SSH engine instead of the local disk.
 */
export class FsService {
  /**
   * Last-read content per absolute path (LRU-capped). Serves as the edit-diff
   * BASELINE: when a file changes on disk, the auto-open flow reads it and
   * diffs against this cached previous content — so an externally edited file
   * opens showing its red-delete / green-add delta instead of a blank state.
   */
  private readonly contentCache = new Map<string, string>()
  private static readonly CACHE_CAP = 64

  private cacheSet(abs: string, content: string): void {
    if (this.contentCache.size >= FsService.CACHE_CAP) {
      const oldest = this.contentCache.keys().next().value
      if (oldest !== undefined) this.contentCache.delete(oldest)
    }
    this.contentCache.set(abs, content)
  }

  /** The previous content of a path (undefined when never read/written). */
  previousContent(abs: string): string | undefined {
    return this.contentCache.get(abs)
  }

  constructor(
    private readonly gate: WorkspaceGate,
    private readonly getRemote?: () => SshCoreLike | undefined,
  ) {}

  /** The active remote target when root is the SSH-mode remote root. */
  private remoteTarget(root: string): { alias: string; remoteRoot: string; engine: SshCoreLike['engine'] } | null {
    const core = this.getRemote?.()
    if (core === undefined) return null
    const state = core.store.getSnapshot()
    if (state.mode !== 'remote' || state.alias === undefined || state.remoteRoot === undefined) return null
    if (root !== state.remoteRoot) return null
    return { alias: state.alias, remoteRoot: state.remoteRoot, engine: core.engine }
  }

  /** True when root is the SSH-mode remote root (git is unavailable there). */
  isRemote(root: string): boolean {
    return this.remoteTarget(root) !== null
  }

  /** Verify a project root against the workspace gate (used by the SSE layer). */
  async verify(root: string): Promise<GateVerdict> {
    const remote = this.remoteTarget(root)
    if (remote !== null) return { ok: true, canonical: remote.remoteRoot }
    return this.gate(root)
  }

  /** Resolve a remote-relative path against the remote root (no traversal). */
  private remoteAbs(remoteRoot: string, rel: string): string | null {
    if (rel.includes('\0') || rel.split('/').includes('..')) return null
    if (rel === '') return remoteRoot
    return remoteRoot.endsWith('/') ? remoteRoot + rel : `${remoteRoot}/${rel}`
  }

  /** List one directory (relative path; '' = root). Sorted dirs-first alpha. */
  async list(root: string, rel: string): Promise<DirListing | PanelError> {
    const remote = this.remoteTarget(root)
    if (remote !== null) {
      const abs = this.remoteAbs(remote.remoteRoot, rel)
      if (abs === null) return { code: 'path-outside-root', message: 'path escapes root' }
      try {
        const entries = await remote.engine.ls(remote.alias, abs)
        const out: FsEntry[] = []
        for (const entry of entries) {
          if (entry.type === 'dir' && TREE_SKIP_DIRS.has(entry.name)) continue
          const path = rel === '' ? entry.name : `${rel}/${entry.name}`
          out.push({
            name: entry.name,
            path,
            isDir: entry.type === 'dir',
            size: entry.type === 'dir' ? 0 : entry.size,
            mtime: entry.type === 'dir' ? 0 : entry.mtimeMs,
          })
        }
        out.sort(compareEntries)
        return { root: remote.remoteRoot, entries: out }
      } catch {
        return { code: 'not-found', message: `cannot list ${rel}` }
      }
    }
    const gated = await this.gate(root)
    if (!gated.ok) return gated.error
    const resolved = await resolveInsideRoot(gated.canonical, rel)
    if (!resolved.ok) return resolved.error
    let dirents: Dirent[]
    try {
      dirents = await readdir(resolved.abs, { withFileTypes: true })
    } catch {
      return { code: 'not-found', message: `cannot list ${rel}` }
    }
    const out: FsEntry[] = []
    for (const entry of dirents) {
      if (entry.isDirectory() && TREE_SKIP_DIRS.has(entry.name)) continue
      const path = rel === '' ? entry.name : `${rel}/${entry.name}`
      if (entry.isDirectory()) {
        out.push({ name: entry.name, path, isDir: true, size: 0, mtime: 0 })
      }
    }
    const files = dirents.filter((entry) => !entry.isDirectory())
    const statted = await Promise.all(files.map(async (entry) => {
      const path = rel === '' ? entry.name : `${rel}/${entry.name}`
      try {
        const info = await stat(join(resolved.abs, entry.name))
        return { name: entry.name, path, isDir: false, size: info.size, mtime: info.mtimeMs }
      } catch {
        // Entry vanished mid-list; keep a size-0 row rather than dropping it.
        return { name: entry.name, path, isDir: false, size: 0, mtime: 0 }
      }
    }))
    out.push(...statted)
    out.sort(compareEntries)
    return { root: gated.canonical, entries: out }
  }

  /** Read one file for preview: text decoded utf-8 (whole file), images as data URLs. */
  async read(root: string, rel: string, asImage: boolean): Promise<FileRead | PanelError> {
    const remote = this.remoteTarget(root)
    if (remote !== null) {
      const abs = this.remoteAbs(remote.remoteRoot, rel)
      if (abs === null) return { code: 'path-outside-root', message: 'path escapes root' }
      try {
        const result = await remote.engine.readFile(remote.alias, abs)
        if (asImage) {
          if (result.content.length > IMAGE_CAP_BYTES) {
            return { code: 'read-failed', message: 'image exceeds preview cap' }
          }
          const mime = imageMime(rel, result.content)
          return {
            content: `data:${mime};base64,${result.content.toString('base64')}`,
            truncated: false,
            size: result.size,
            mtime: result.mtime,
            image: probeImageSize(result.content),
          }
        }
        return {
          content: result.content.toString('utf8'),
          truncated: false,
          size: result.size,
          mtime: result.mtime,
          previous: this.previousContent(abs),
        }
      } catch {
        return { code: 'not-found', message: `cannot read ${rel}` }
      }
    }
    const gated = await this.gate(root)
    if (!gated.ok) return gated.error
    const resolved = await resolveInsideRoot(gated.canonical, rel)
    if (!resolved.ok) return resolved.error
    let data: Buffer
    let info: Awaited<ReturnType<typeof stat>>
    try {
      data = await readFile(resolved.abs)
      info = await stat(resolved.abs)
    } catch {
      return { code: 'not-found', message: `cannot read ${rel}` }
    }
    if (info.isDirectory()) return { code: 'is-directory', message: `${rel} is a directory` }
    if (asImage) {
      if (data.length > IMAGE_CAP_BYTES) {
        return { code: 'read-failed', message: 'image exceeds preview cap' }
      }
      const mime = imageMime(rel, data)
      return {
        content: `data:${mime};base64,${data.toString('base64')}`,
        truncated: false,
        size: data.length,
        mtime: info.mtimeMs,
        image: probeImageSize(data),
      }
    }
    const text = data.toString('utf8')
    const previous = this.previousContent(resolved.abs)
    this.cacheSet(resolved.abs, text)
    return {
      content: text,
      truncated: false,
      size: data.length,
      mtime: info.mtimeMs,
      previous,
    }
  }

  /**
   * Read one file's raw bytes (the markdown image route): gated, traversal-
   * guarded, and .git-refusing. The bytes are streamed by the HTTP layer with
   * the derived mime so `<img>` tags can load workspace files directly.
   */
  async readRaw(root: string, rel: string): Promise<{ data: Buffer; mime: string; size: number } | PanelError> {
    const remote = this.remoteTarget(root)
    if (remote !== null) {
      if (isGitPath(rel)) return { code: 'path-outside-root', message: 'refusing to read .git' }
      const abs = this.remoteAbs(remote.remoteRoot, rel)
      if (abs === null) return { code: 'path-outside-root', message: 'path escapes root' }
      try {
        const result = await remote.engine.readFile(remote.alias, abs)
        return { data: result.content, mime: imageMime(rel, result.content), size: result.size }
      } catch {
        return { code: 'not-found', message: `cannot read ${rel}` }
      }
    }
    const gated = await this.gate(root)
    if (!gated.ok) return gated.error
    if (isGitPath(rel)) return { code: 'path-outside-root', message: 'refusing to read .git' }
    const resolved = await resolveInsideRoot(gated.canonical, rel)
    if (!resolved.ok) return resolved.error
    let data: Buffer
    let info: Awaited<ReturnType<typeof stat>>
    try {
      info = await stat(resolved.abs)
    } catch {
      return { code: 'not-found', message: `cannot read ${rel}` }
    }
    if (info.isDirectory()) return { code: 'is-directory', message: `${rel} is a directory` }
    try {
      data = await readFile(resolved.abs)
    } catch {
      return { code: 'not-found', message: `cannot read ${rel}` }
    }
    return { data, mime: imageMime(rel, data), size: data.length }
  }

  /** Write text content back, refusing when the file moved on disk (mtime conflict). */
  async write(
    root: string,
    rel: string,
    content: string,
    baseMtime?: number,
  ): Promise<{ mtime: number } | PanelError> {
    const remote = this.remoteTarget(root)
    if (remote !== null) {
      if (isGitPath(rel)) return { code: 'path-outside-root', message: 'refusing to touch .git' }
      const abs = this.remoteAbs(remote.remoteRoot, rel)
      if (abs === null) return { code: 'path-outside-root', message: 'path escapes root' }
      try {
        const result = await remote.engine.writeFile(remote.alias, abs, Buffer.from(content, 'utf8'), baseMtime)
        this.cacheSet(abs, content)
        return { mtime: result.mtime }
      } catch (error) {
        if (String(error).includes('mtime conflict')) {
          return { code: 'write-conflict', message: 'file changed on the remote since it was loaded' }
        }
        return { code: 'write-failed', message: `cannot write ${rel}` }
      }
    }
    const gated = await this.gate(root)
    if (!gated.ok) return gated.error
    if (isGitPath(rel)) return { code: 'path-outside-root', message: 'refusing to touch .git' }
    const resolved = await resolveInsideRoot(gated.canonical, rel)
    if (!resolved.ok) return resolved.error
    try {
      let current: Awaited<ReturnType<typeof stat>>
      try {
        current = await stat(resolved.abs)
      } catch {
        current = { mtimeMs: 0 } as Awaited<ReturnType<typeof stat>>
      }
      if (baseMtime !== undefined && Number(current.mtimeMs) !== 0 && Math.abs(Number(current.mtimeMs) - baseMtime) > 1) {
        return { code: 'write-conflict', message: 'file changed on disk since it was loaded' }
      }
      await mkdir(dirname(resolved.abs), { recursive: true })
      await writeFile(resolved.abs, content, 'utf8')
      const info = await stat(resolved.abs)
      this.cacheSet(resolved.abs, content)
      return { mtime: info.mtimeMs }
    } catch {
      return { code: 'write-failed', message: `cannot write ${rel}` }
    }
  }

  /** Recursive filename search (case-insensitive substring), pruned at noise dirs. */
  async search(root: string, query: string): Promise<SearchView | PanelError> {
    const remote = this.remoteTarget(root)
    if (remote !== null) {
      const needle = query.trim().toLowerCase()
      if (needle === '') return { query, hits: [], truncated: false }
      const safe = needle.replace(/[^a-z0-9._-]/g, '')
      const command = `find ${shellQuote(remote.remoteRoot)} -maxdepth ${SEARCH_MAX_DEPTH_REMOTE} \\( -not -path ${shellQuote('*/node_modules*')} \\) \\( -not -path ${shellQuote('*/.git*')} \\) -iname ${shellQuote(`*${safe}*`)} -printf '%y|%p\\n'`
      try {
        const result = await remote.engine.exec(remote.alias, command, 20_000)
        if (!result.success && result.stderr !== '' && result.stdout === '') {
          return { code: 'search-failed', message: result.stderr.trim() }
        }
        const hits: SearchHit[] = []
        const lines = result.stdout.split('\n').filter((line: string) => line !== '')
        for (const line of lines) {
          const sep = line.indexOf('|')
          if (sep < 0) continue
          const kind = line.slice(0, sep)
          const absPath = line.slice(sep + 1)
          if (absPath.startsWith(remote.remoteRoot)) {
            const rel = absPath.slice(remote.remoteRoot.length).replace(/^\/+/, '')
            if (rel === '') continue
            const name = rel.split('/').pop() ?? rel
            hits.push({ path: rel, name, isDir: kind === 'd' })
          }
          if (hits.length >= SEARCH_HIT_CAP) break
        }
        const rank = (hit: SearchHit): number => {
          const name = hit.name.toLowerCase()
          if (name === needle) return 0
          if (name.startsWith(needle)) return 1
          return 2
        }
        hits.sort((a, b) => rank(a) - rank(b) || a.path.length - b.path.length || (a.path < b.path ? -1 : 1))
        return { query, hits, truncated: hits.length >= SEARCH_HIT_CAP }
      } catch {
        return { code: 'search-failed', message: 'remote search failed' }
      }
    }
    const gated = await this.gate(root)
    if (!gated.ok) return gated.error
    const needle = query.trim().toLowerCase()
    if (needle === '') return { query, hits: [], truncated: false }
    const hits: SearchHit[] = []
    let scanned = 0
    let truncated = false
    const walk = async (rel: string, depth: number): Promise<void> => {
      if (truncated) return
      const resolved = await resolveInsideRoot(gated.canonical, rel)
      if (!resolved.ok) return
      let dirents: Dirent[]
      try {
        dirents = await readdir(resolved.abs, { withFileTypes: true })
      } catch {
        return
      }
      for (const entry of dirents) {
        if (scanned >= SEARCH_SCAN_CAP) {
          truncated = true
          return
        }
        scanned += 1
        const path = rel === '' ? entry.name : `${rel}/${entry.name}`
        if (entry.isDirectory()) {
          if (SEARCH_SKIP_DIRS.has(entry.name)) continue
          if (depth < 24 && !truncated) await walk(path, depth + 1)
          continue
        }
        if (entry.name.toLowerCase().includes(needle)) {
          if (hits.length >= SEARCH_HIT_CAP) {
            truncated = true
            return
          }
          hits.push({ path, name: entry.name, isDir: false })
        }
      }
    }
    try {
      await walk('', 0)
    } catch {
      return { code: 'search-failed', message: 'search walk failed' }
    }
    // Rank: exact matches first, then prefix, then substring; shorter paths first.
    const rank = (hit: SearchHit): number => {
      const name = hit.name.toLowerCase()
      if (name === needle) return 0
      if (name.startsWith(needle)) return 1
      return 2
    }
    hits.sort((a, b) => rank(a) - rank(b) || a.path.length - b.path.length || (a.path < b.path ? -1 : 1))
    return { query, hits, truncated }
  }

  /** Delete a path (discard of untracked files). Recursive for directories. */
  async delete(root: string, rel: string): Promise<{ ok: true } | PanelError> {
    const remote = this.remoteTarget(root)
    if (remote !== null) {
      if (rel === '') return { code: 'path-outside-root', message: 'refusing to delete the root' }
      if (isGitPath(rel)) return { code: 'path-outside-root', message: 'refusing to touch .git' }
      const abs = this.remoteAbs(remote.remoteRoot, rel)
      if (abs === null) return { code: 'path-outside-root', message: 'path escapes root' }
      try {
        await remote.engine.rm(remote.alias, abs, true)
        return { ok: true }
      } catch {
        return { code: 'write-failed', message: `cannot delete ${rel}` }
      }
    }
    const gated = await this.gate(root)
    if (!gated.ok) return gated.error
    if (rel === '') return { code: 'path-outside-root', message: 'refusing to delete the root' }
    if (isGitPath(rel)) return { code: 'path-outside-root', message: 'refusing to touch .git' }
    const resolved = await resolveInsideRoot(gated.canonical, rel)
    if (!resolved.ok) return resolved.error
    try {
      await rm(resolved.abs, { recursive: true, force: true })
      return { ok: true }
    } catch {
      return { code: 'write-failed', message: `cannot delete ${rel}` }
    }
  }

  /** Rename / move a path (local fs.rename or remote SFTP rename). */
  async rename(root: string, rel: string, newRel: string): Promise<{ ok: true } | PanelError> {
    const remote = this.remoteTarget(root)
    if (remote !== null) {
      if (rel === '' || newRel === '' || isGitPath(rel) || isGitPath(newRel)) {
        return { code: 'path-outside-root', message: 'refusing to rename the root or .git' }
      }
      const abs = this.remoteAbs(remote.remoteRoot, rel)
      const newAbs = this.remoteAbs(remote.remoteRoot, newRel)
      if (abs === null || newAbs === null) return { code: 'path-outside-root', message: 'path escapes root' }
      try {
        await remote.engine.rename(remote.alias, abs, newAbs)
        return { ok: true }
      } catch {
        return { code: 'write-failed', message: `cannot rename ${rel}` }
      }
    }
    const gated = await this.gate(root)
    if (!gated.ok) return gated.error
    if (rel === '' || newRel === '' || isGitPath(rel) || isGitPath(newRel)) {
      return { code: 'path-outside-root', message: 'refusing to rename the root or .git' }
    }
    const resolved = await resolveInsideRoot(gated.canonical, rel)
    const resolvedNew = await resolveInsideRoot(gated.canonical, newRel)
    if (!resolved.ok) return resolved.error
    if (!resolvedNew.ok) return resolvedNew.error
    try {
      await renamePath(resolved.abs, resolvedNew.abs)
      return { ok: true }
    } catch {
      return { code: 'write-failed', message: `cannot rename ${rel}` }
    }
  }

  /** Copy a path into the same tree (read + write; local or remote). */
  async copy(root: string, rel: string, newRel: string): Promise<{ ok: true } | PanelError> {
    const remote = this.remoteTarget(root)
    if (remote !== null) {
      if (rel === '' || newRel === '' || isGitPath(rel) || isGitPath(newRel)) {
        return { code: 'path-outside-root', message: 'refusing to copy the root or .git' }
      }
      const abs = this.remoteAbs(remote.remoteRoot, rel)
      const newAbs = this.remoteAbs(remote.remoteRoot, newRel)
      if (abs === null || newAbs === null) return { code: 'path-outside-root', message: 'path escapes root' }
      try {
        const info = await remote.engine.readFile(remote.alias, abs)
        await remote.engine.writeFile(remote.alias, newAbs, info.content)
        return { ok: true }
      } catch {
        return { code: 'write-failed', message: `cannot copy ${rel}` }
      }
    }
    const gated = await this.gate(root)
    if (!gated.ok) return gated.error
    if (rel === '' || newRel === '' || isGitPath(rel) || isGitPath(newRel)) {
      return { code: 'path-outside-root', message: 'refusing to copy the root or .git' }
    }
    const resolved = await resolveInsideRoot(gated.canonical, rel)
    const resolvedNew = await resolveInsideRoot(gated.canonical, newRel)
    if (!resolved.ok) return resolved.error
    if (!resolvedNew.ok) return resolvedNew.error
    try {
      await mkdir(dirname(resolvedNew.abs), { recursive: true })
      await copyFile(resolved.abs, resolvedNew.abs)
      return { ok: true }
    } catch {
      return { code: 'write-failed', message: `cannot copy ${rel}` }
    }
  }
  /**
   * Watch a root recursively and emit change events (debounced + batched).
   * The callback receives the changed path RELATIVE to the root ('/' separ-
   * ated). Windows fs.watch sometimes reports a null filename; the watcher
   * then falls back to a scan-diff (recursive, .git/node_modules pruned) so
   * concrete paths still reach the client.
   * @param root - project root to watch (gated on connect).
   * @param onChange - fired (debounced) with the relative changed path.
   * @returns disposer.
   */
  watch(root: string, onChange: (rel: string | undefined) => void): () => void {
    // No local fs.watch over SSH: the client refreshes on root switches and
    // after its own write/delete actions, which covers the remote flows.
    if (this.remoteTarget(root) !== null) return () => {}
    let disposed = false
    let timer: NodeJS.Timeout | undefined
    let pollTimer: NodeJS.Timeout | undefined
    let scanTimer: NodeJS.Timeout | undefined
    let watcher: FSWatcher | undefined
    let scanLock: Promise<void> | undefined
    // Last recursive scan: rel -> size:mtimeMs signature (scan-diff baseline).
    let lastScan: Map<string, string> | undefined
    // The debounce window collects EVERY named rel (Windows reports several
    // events per change — the parent dir plus the file). Always a Set: a
    // missing init made every named event silently drop on flush.
    let pendingRels = new Set<string>()

    /**
     * Re-scan the tree and emit every path whose signature changed since the
     * last scan (added / modified / deleted). Prunes .git + node_modules.
     */
    const scanAndEmit = async (): Promise<void> => {
      if (disposed) return
      const gated = await this.gate(root)
      if (!gated.ok || disposed) return
      if (scanLock !== undefined) { await scanLock; return }
      scanLock = (async () => {
        const current = await this.scanTree(gated.canonical)
        const prev = lastScan
        lastScan = current
        if (prev === undefined || disposed) return // first scan: baseline only
        const changes: string[] = []
        for (const [rel, sig] of current) {
          if (!prev.has(rel) || prev.get(rel) !== sig) changes.push(rel)
        }
        for (const rel of prev.keys()) {
          if (!current.has(rel)) changes.push(rel) // deleted
        }
        for (const rel of changes) onChange(rel)
      })()
      await scanLock
      scanLock = undefined
    }

    const fire = (rel: string | undefined): void => {
      if (rel === undefined) {
        // Filename lost (Windows reports null on some events): recover the
        // concrete paths with a debounced scan-diff instead of a blind
        // full-refresh (which cannot auto-open anything).
        if (scanTimer !== undefined) return
        scanTimer = setTimeout(() => {
          scanTimer = undefined
          void scanAndEmit()
        }, 150)
        return
      }
      pendingRels.add(rel)
      if (timer !== undefined) return
      timer = setTimeout(() => {
        timer = undefined
        if (disposed) return
        const batch = pendingRels
        pendingRels = new Set()
        if (batch.size === 0) return
        // Directory events accompany file events; emitting them makes the
        // client auto-open a folder (read fails). Drop paths that still
        // exist as directories; keep vanished ones (deletions).
        void (async () => {
          const gated = await this.gate(root)
          if (!gated.ok) {
            for (const rel of batch) onChange(rel)
            return
          }
          for (const rel of batch) {
            const resolved = await resolveInsideRoot(gated.canonical, rel)
            if (!resolved.ok) { onChange(rel); continue }
            try {
              const info = await stat(resolved.abs)
              if (!info.isDirectory()) onChange(rel)
            } catch {
              onChange(rel) // deleted: let the client decide
            }
          }
        })()
      }, 150)
    }

    // The poll is only a fallback: it starts when recursive watch is
    // unavailable (throw) or later degrades (error event), and keeps the
    // scan-diff current so the client still sees concrete change paths.
    const startPolling = (): void => {
      if (pollTimer !== undefined) return
      void scanAndEmit()
      pollTimer = setInterval(() => { void scanAndEmit() }, POLL_FALLBACK_MS)
    }
    void this.gate(root).then(async (gated) => {
      if (!gated.ok || disposed) return
      // Baseline BEFORE the watcher starts, so no change can be mistaken for
      // the initial state.
      lastScan = await this.scanTree(gated.canonical)
      if (disposed) return
      try {
        watcher = watchDir(gated.canonical, { recursive: true }, (_event, filename) => {
          // filename is root-relative in recursive mode; normalize to '/'.
          const rel = typeof filename === 'string' && filename !== ''
            ? filename.replace(/\\/g, '/')
            : undefined
          fire(rel)
        })
        watcher.on('error', () => {
          if (disposed) return
          watcher?.close()
          watcher = undefined
          startPolling()
        })
      } catch {
        watcher = undefined
        startPolling()
      }
    })
    return () => {
      disposed = true
      if (timer !== undefined) clearTimeout(timer)
      if (pollTimer !== undefined) clearInterval(pollTimer)
      if (scanTimer !== undefined) clearTimeout(scanTimer)
      watcher?.close()
    }
  }

  /**
   * Recursive snapshot of a root: rel -> `${size}:${mtimeMs}` signature for
   * every file (directories are covered by their descendants; .git and
   * node_modules are pruned — their churn is never user code). Bounded depth
   * keeps pathological trees from stalling the poll.
   */
  private async scanTree(rootAbs: string, depth = 0): Promise<Map<string, string>> {
    const out = new Map<string, string>()
    if (depth > 10) return out
    let entries: Dirent[]
    try {
      entries = await readdir(rootAbs, { withFileTypes: true })
    } catch {
      return out
    }
    for (const entry of entries) {
      if (entry.name === '.git' || entry.name === 'node_modules') continue
      const abs = join(rootAbs, entry.name)
      if (entry.isDirectory()) {
        const sub = await this.scanTree(abs, depth + 1)
        for (const [rel, sig] of sub) out.set(rel, sig)
      } else {
        try {
          const info = await stat(abs)
          out.set(abs.slice(this.rootLenOf(rootAbs) + 1).replace(/\\/g, '/'), `${info.size}:${info.mtimeMs}`)
        } catch {
          // vanished between readdir and stat: skip this round
        }
      }
    }
    return out
  }

  /** Root-relative length of a canonical root (for slice-based rel paths). */
  private rootLenOf(rootAbs: string): number {
    return rootAbs.endsWith('/') || rootAbs.endsWith('\\') ? rootAbs.length - 1 : rootAbs.length
  }
}
