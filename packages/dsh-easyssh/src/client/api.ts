/**
 * Browser-side API clients: the /api/dsh-easyssh route family plus the
 * two /api/dsh-ssh endpoints the config dialog needs (host create + test).
 * Plain fetch, same origin — the only data path the panel components use.
 */

import {
  WORKSPACE_API,
  type DirListing,
  type FileRead,
  type FileWriteResult,
  type SearchView,
  type WorkspaceState,
} from '../protocol.ts'

/** Error carrying the route's JSON error message. */
export class WorkspaceApiError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'WorkspaceApiError'
  }
}

/** Parse a JSON response or throw a WorkspaceApiError. */
async function readJson<T>(response: Response): Promise<T> {
  let body: unknown
  try {
    body = await response.json()
  } catch {
    throw new WorkspaceApiError(`HTTP ${response.status}: invalid JSON response`)
  }
  if (!response.ok) {
    const message = typeof body === 'object' && body !== null && typeof (body as { error?: unknown }).error === 'string'
      ? (body as { error: string }).error
      : `HTTP ${response.status}`
    throw new WorkspaceApiError(message)
  }
  return body as T
}

/** Query-string helper. */
function query(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value))
  }
  const text = search.toString()
  return text === '' ? '' : '?' + text
}

/** The workspace route family client. */
export class WorkspaceApi {
  async getState(): Promise<WorkspaceState> {
    const response = await fetch(WORKSPACE_API.state)
    const body = await readJson<{ state: WorkspaceState }>(response)
    return body.state
  }

  async setModeLocal(): Promise<WorkspaceState> {
    const response = await fetch(WORKSPACE_API.state, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ mode: 'local' }),
    })
    const body = await readJson<{ state: WorkspaceState }>(response)
    return body.state
  }

  async setModeRemote(alias: string, remoteRoot?: string): Promise<WorkspaceState> {
    const response = await fetch(WORKSPACE_API.state, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ mode: 'remote', alias, remoteRoot }),
    })
    const body = await readJson<{ state: WorkspaceState }>(response)
    return body.state
  }

  async list(root: string, path: string): Promise<DirListing> {
    const response = await fetch(WORKSPACE_API.tree + query({ root, path }))
    const body = await readJson<{ listing: DirListing }>(response)
    return body.listing
  }

  async read(root: string, path: string): Promise<FileRead> {
    const response = await fetch(WORKSPACE_API.file + query({ root, path }))
    const body = await readJson<{ file: FileRead }>(response)
    return body.file
  }

  async write(root: string, path: string, content: string, expectedMtime?: number): Promise<FileWriteResult> {
    const response = await fetch(WORKSPACE_API.file, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ root, path, content, expectedMtime }),
    })
    const body = await readJson<{ result: FileWriteResult }>(response)
    return body.result
  }

  async search(root: string, queryText: string): Promise<SearchView> {
    const response = await fetch(WORKSPACE_API.search + query({ root, query: queryText }))
    const body = await readJson<{ search: SearchView }>(response)
    return body.search
  }
}

/** The two /api/dsh-ssh endpoints the config dialog needs (host create/test). */
export interface SshHostPayload {
  alias?: string
  host: string
  port?: number
  user: string
  auth?: {
    kind: 'key' | 'password'
    keyPath?: string
    passphrase?: string
    password?: string
  }
  description?: string
}

export interface SshHostSummary {
  alias: string
  host: string
  port: number
  user: string
  auth: 'key' | 'password'
  keyReady: boolean
  description?: string
  createdAt: number
  updatedAt: number
}

export interface TestResult {
  ok: boolean
  latencyMs?: number
  error?: string
}

const HOSTS_API = '/api/dsh-ssh/hosts'
const TEST_API = '/api/dsh-ssh/test'

export class SshHostsApi {
  async list(): Promise<SshHostSummary[]> {
    const response = await fetch(HOSTS_API)
    const body = await readJson<{ hosts: SshHostSummary[] }>(response)
    return body.hosts
  }

  async create(payload: SshHostPayload): Promise<SshHostSummary> {
    const response = await fetch(HOSTS_API, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const body = await readJson<{ host: SshHostSummary }>(response)
    return body.host
  }

  async test(alias: string): Promise<TestResult> {
    const response = await fetch(TEST_API, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ alias }),
    })
    const body = await readJson<{ result: TestResult }>(response)
    return body.result
  }
}
