/**
 * The /api/dsh-easyssh route family: mode state plus workspace file ops
 * (tree / file / search) over the local fs or the remote engine. Every route
 * carries the same loopback-only trust fence as /api/dsh-ssh — these
 * endpoints can read and write files on remote servers, so LAN-exposed dsh
 * web deployments must not serve them.
 */
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { WebRoute } from '@deepseek-ai/dsh-host-webserver'
import type { HostStore, SshEngine } from '@deepseek-ai/dsh-ssh'
import { BackendError, LocalBackend, RemoteBackend } from './backend.ts'
import { DEFAULT_REMOTE_ROOT, RemoteModeStore } from './store.ts'
import { WORKSPACE_API, type WorkspaceMode, type WorkspaceState } from './protocol.ts'

/** Cap on JSON request bodies (file writes carry content). */
const MAX_JSON_BODY_BYTES = 4 * 1024 * 1024

/** Loopback literal check plus browser same-origin markers (mirrors dsh-ssh). */
function isLoopbackRequest(request: IncomingMessage): boolean {
  const address = request.socket.remoteAddress
  if (address !== '127.0.0.1' && address !== '::1' && address !== '::ffff:127.0.0.1') return false
  const host = request.headers.host
  if (typeof host !== 'string') return false
  let hostUrl: URL
  try {
    hostUrl = new URL(`http://${host}`)
  } catch {
    return false
  }
  if (hostUrl.hostname !== '127.0.0.1' && hostUrl.hostname !== 'localhost' && hostUrl.hostname !== '[::1]') return false
  if (request.headers['sec-fetch-site'] === 'cross-site') return false
  const origin = request.headers.origin
  if (origin === undefined) return true
  try {
    return new URL(origin).host === hostUrl.host
  } catch {
    return false
  }
}

/** One JSON response. */
function writeJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body)
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'referrer-policy': 'no-referrer' })
  res.end(payload)
}

/** Read a JSON request body (undefined when too large or unparseable). */
async function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown> | undefined> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    const buffer = chunk as Buffer
    size += buffer.length
    if (size > MAX_JSON_BODY_BYTES) return undefined
    chunks.push(buffer)
  }
  try {
    const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'))
    return typeof parsed === 'object' && parsed !== null ? parsed as Record<string, unknown> : undefined
  } catch {
    return undefined
  }
}

/** URL query helper (first value, decoded). */
function queryParam(url: URL, name: string): string | undefined {
  const value = url.searchParams.get(name)
  return value === null ? undefined : value
}

/** Map a backend error to an HTTP status. */
function backendStatus(error: BackendError): number {
  switch (error.code) {
    case 'conflict':
      return 409
    case 'outside-root':
    case 'root-mismatch':
    case 'not-remote':
      return 403
    case 'binary':
    case 'too-large':
      return 422
    default:
      return 500
  }
}

/** Route family dependencies. */
export interface WorkspaceRoutesDeps {
  store: RemoteModeStore
  hosts: HostStore
  engine: SshEngine
}

/**
 * Build every /api/dsh-easyssh route (exact paths).
 * @param deps - mode store, host store (alias validation), ssh engine.
 * @returns the routes to register.
 */
export function makeRoutes(deps: WorkspaceRoutesDeps): WebRoute[] {
  const { store, hosts, engine } = deps
  const local = new LocalBackend()
  const remote = new RemoteBackend(engine, () => store.getSnapshot())

  const backend = (): LocalBackend | RemoteBackend => {
    const state = store.getSnapshot()
    return state.mode === 'remote' ? remote : local
  }

  const guard = (req: IncomingMessage, res: ServerResponse, method: string): boolean => {
    if (!isLoopbackRequest(req)) {
      writeJson(res, 403, { error: 'forbidden: loopback-only' })
      return false
    }
    if (req.method !== method) {
      writeJson(res, 405, { error: `method not allowed: ${req.method}` })
      return false
    }
    return true
  }

  const stateRoute: WebRoute = {
    kind: 'exact',
    path: WORKSPACE_API.state,
    handler: async (req, res) => {
      const method = req.method ?? 'GET'
      if (method === 'GET') {
        if (!guard(req, res, 'GET')) return
        writeJson(res, 200, { state: store.getSnapshot() })
        return
      }
      if (method === 'POST') {
        if (!isLoopbackRequest(req)) {
          writeJson(res, 403, { error: 'forbidden: loopback-only' })
          return
        }
        const body = await readJsonBody(req)
        if (body === undefined) {
          writeJson(res, 400, { error: 'malformed JSON body' })
          return
        }
        const mode = body.mode
        if (mode !== 'local' && mode !== 'remote') {
          writeJson(res, 400, { error: 'mode must be "local" or "remote"' })
          return
        }
        const previous = store.getSnapshot()
        if (mode === 'local') {
          // Keep the last remote target so the toggle can return to it.
          store.set({ mode: 'local', alias: previous.alias, remoteRoot: previous.remoteRoot, remoteRootLabel: previous.remoteRootLabel })
          writeJson(res, 200, { state: store.getSnapshot() })
          return
        }
        const alias = typeof body.alias === 'string' ? body.alias.trim() : ''
        if (alias === '') {
          writeJson(res, 400, { error: 'alias is required for remote mode' })
          return
        }
        const entry = hosts.find(alias)
        if (entry === undefined) {
          writeJson(res, 404, { error: `alias '${alias}' not found — configure it in the SSH dialog first` })
          return
        }
        let remoteRoot = previous.remoteRoot
        let label: string | undefined = previous.remoteRootLabel
        const requested = typeof body.remoteRoot === 'string' && body.remoteRoot.trim() !== '' ? body.remoteRoot.trim() : DEFAULT_REMOTE_ROOT
        if (requested === DEFAULT_REMOTE_ROOT) {
          // Resolve the login home over the connection.
          try {
            const result = await engine.exec(alias, 'printf %s "$HOME"', 10_000)
            if (!result.success || result.stdout.trim() === '') {
              writeJson(res, 502, { error: `could not resolve remote home: ${result.stderr.trim() || 'empty $HOME'}` })
              return
            }
            remoteRoot = result.stdout.trim()
            label = DEFAULT_REMOTE_ROOT
          } catch (error) {
            writeJson(res, 502, { error: error instanceof Error ? error.message : String(error) })
            return
          }
        } else {
          if (!requested.startsWith('/')) {
            writeJson(res, 400, { error: `remoteRoot must be an absolute path or '~' (got '${requested}')` })
            return
          }
          remoteRoot = requested.replace(/\/+$/, '')
          label = requested
        }
        store.set({ mode: 'remote', alias, remoteRoot, remoteRootLabel: label })
        writeJson(res, 200, { state: store.getSnapshot() })
        return
      }
      writeJson(res, 405, { error: `method not allowed: ${method}` })
    },
  }

  const treeRoute: WebRoute = {
    kind: 'exact',
    path: WORKSPACE_API.tree,
    handler: async (req, res) => {
      if (!guard(req, res, 'GET')) return
      const url = new URL(req.url ?? '/', 'http://localhost')
      const root = queryParam(url, 'root')
      const path = queryParam(url, 'path') ?? ''
      if (root === undefined || root === '') {
        writeJson(res, 400, { error: 'root query parameter is required' })
        return
      }
      try {
        const listing = await backend().list(root, path)
        writeJson(res, 200, { listing })
      } catch (error) {
        writeJson(res, backendStatus(toBackendError(error)), { error: messageOf(error) })
      }
    },
  }

  const fileRoute: WebRoute = {
    kind: 'exact',
    path: WORKSPACE_API.file,
    handler: async (req, res) => {
      const method = req.method ?? 'GET'
      if (method === 'GET') {
        if (!guard(req, res, 'GET')) return
        const url = new URL(req.url ?? '/', 'http://localhost')
        const root = queryParam(url, 'root')
        const path = queryParam(url, 'path')
        if (root === undefined || root === '' || path === undefined) {
          writeJson(res, 400, { error: 'root and path query parameters are required' })
          return
        }
        try {
          const file = await backend().read(root, path)
          writeJson(res, 200, { file })
        } catch (error) {
          writeJson(res, backendStatus(toBackendError(error)), { error: messageOf(error) })
        }
        return
      }
      if (method === 'PUT') {
        if (!isLoopbackRequest(req)) {
          writeJson(res, 403, { error: 'forbidden: loopback-only' })
          return
        }
        const body = await readJsonBody(req)
        if (body === undefined) {
          writeJson(res, 400, { error: 'malformed JSON body' })
          return
        }
        const root = typeof body.root === 'string' ? body.root : ''
        const path = typeof body.path === 'string' ? body.path : ''
        const content = typeof body.content === 'string' ? body.content : undefined
        if (root === '' || path === '' || content === undefined) {
          writeJson(res, 400, { error: 'root, path and content are required' })
          return
        }
        const rawMtime = body.expectedMtime
        const expectedMtime = typeof rawMtime === 'number' && Number.isFinite(rawMtime) ? rawMtime : undefined
        try {
          const result = await backend().write(root, path, content, expectedMtime)
          writeJson(res, 200, { result })
        } catch (error) {
          writeJson(res, backendStatus(toBackendError(error)), { error: messageOf(error) })
        }
        return
      }
      writeJson(res, 405, { error: `method not allowed: ${method}` })
    },
  }

  const searchRoute: WebRoute = {
    kind: 'exact',
    path: WORKSPACE_API.search,
    handler: async (req, res) => {
      if (!guard(req, res, 'GET')) return
      const url = new URL(req.url ?? '/', 'http://localhost')
      const root = queryParam(url, 'root')
      const query = queryParam(url, 'query') ?? ''
      if (root === undefined || root === '') {
        writeJson(res, 400, { error: 'root query parameter is required' })
        return
      }
      try {
        const search = await backend().search(root, query)
        writeJson(res, 200, { search })
      } catch (error) {
        writeJson(res, backendStatus(toBackendError(error)), { error: messageOf(error) })
      }
    },
  }

  return [stateRoute, treeRoute, fileRoute, searchRoute]
}

/** Coerce any thrown value to a BackendError (routes normalize on it). */
function toBackendError(error: unknown): BackendError {
  return error instanceof BackendError ? error : new BackendError('io', error instanceof Error ? error.message : String(error))
}

/** The human message of a thrown value. */
function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/** Re-exported for tests. */
export type { WorkspaceMode }
