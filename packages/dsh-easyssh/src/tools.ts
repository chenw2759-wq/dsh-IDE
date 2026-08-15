/**
 * Agent tools: the remote-workspace counterpart of the local fs tools. Every
 * tool is bound to the CURRENT SSH mode host (no alias parameter — the mode
 * store decides), gated to the resolved remote root, and returns lossless
 * JSON. In local mode every tool answers a clear "switch to SSH mode first"
 * error instead of touching the local machine.
 */
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { ContentBlock } from '@deepseek-ai/dsh-llm'
import type { SshEngine } from '@deepseek-ai/dsh-ssh'
import { BackendError, RemoteBackend, isInside } from './backend.ts'
import { RemoteModeStore } from './store.ts'
import type { WorkspaceState } from './protocol.ts'

/** One text content block (the only render shape these tools emit). */
function text(value: string): ContentBlock[] {
  return [{ type: 'text', text: value }]
}

/** Tool-set dependencies. */
export interface WorkspaceToolsDeps {
  store: RemoteModeStore
  engine: SshEngine
}

/** Failure envelope shared by every tool. */
interface ToolFailure {
  ok: false
  error: string
}

/** Build every remote_* tool (registered by the host half). */
export function makeWorkspaceTools(deps: WorkspaceToolsDeps) {
  const { store, engine } = deps
  const remote = new RemoteBackend(engine, () => store.getSnapshot())

  /** The current remote state, or a failure when not in remote mode. */
  const remoteState = (): { state: WorkspaceState & { mode: 'remote'; alias: string } } | ToolFailure => {
    const state = store.getSnapshot()
    if (state.mode !== 'remote' || state.alias === undefined) {
      return { ok: false, error: 'not in remote mode — switch the GUI to SSH mode first (top-right button)' }
    }
    return { state: state as WorkspaceState & { mode: 'remote'; alias: string } }
  }

  /** Gate one absolute path to the remote root. */
  const gatePath = (state: WorkspaceState, abs: string): string | undefined => {
    const root = state.remoteRoot
    if (root === undefined || !isInside(root, abs)) {
      return `path '${abs}' is outside the remote workspace root '${root ?? '?'}'`
    }
    return undefined
  }

  /** Run one remote op, catching errors into the failure envelope. */
  const run = async <T>(operation: () => Promise<T>): Promise<T | ToolFailure> => {
    try {
      return await operation()
    } catch (error) {
      const message = error instanceof BackendError ? error.message : error instanceof Error ? error.message : String(error)
      return { ok: false, error: message }
    }
  }

  return [
    defineTool({
      name: 'remote_status',
      description: 'Query the current workspace mode of the SSH workspace plugin: local (this machine) or remote (an SSH host). Call this before any remote_* tool to confirm the mode and the remote root. Triggers: SSH mode, remote workspace, where am I working.',
      parameters: {},
      output: {
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            mode: { type: 'string', enum: ['local', 'remote'], required: true },
            alias: { type: 'string' },
            remoteRoot: { type: 'string' },
            remoteRootLabel: { type: 'string' },
          },
        },
        render: (_args, value) => {
          const state = value as WorkspaceState
          if (state.mode === 'remote') {
            return text(`mode: remote (${state.alias}) root: ${state.remoteRootLabel ?? state.remoteRoot ?? '~'}`)
          }
          return text(`mode: local (this machine)${state.alias !== undefined ? ` — last remote target: ${state.alias}` : ''}`)
        },
      },
      async execute() {
        return store.getSnapshot()
      },
    }),

    defineTool({
      name: 'remote_ls',
      description: 'List a directory on the CURRENT SSH-mode host (must be inside the remote workspace root). Triggers: list remote directory, remote files, ls on the server.',
      parameters: {
        path: { type: 'string', required: true, description: 'Absolute remote directory path inside the remote root (e.g. /home/user/project/src).' },
      },
      output: {
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            ok: { type: 'boolean', required: true },
            path: { type: 'string' },
            entries: { type: 'array', items: { type: 'object', additionalProperties: false, properties: {
              name: { type: 'string', required: true }, type: { type: 'string', required: true }, size: { type: 'integer', required: true }, mtimeMs: { type: 'integer', required: true },
            } } },
            error: { type: 'string' },
          },
        },
        render: (_args, value) => {
          if (value.ok !== true) return text(`remote_ls failed: ${value.error ?? 'unknown error'}`)
          const rows = (value.entries ?? []).map((entry: { name: string; type: string; size: number }) =>
            `${entry.type === 'dir' ? 'dir ' : 'file'} ${entry.name}${entry.type === 'file' ? ` (${entry.size} bytes)` : ''}`)
          return text([`${value.path}`, ...(rows.length > 0 ? rows : ['(empty)'])].join('\n'))
        },
      },
      async execute(args) {
        const check = remoteState()
        if ('error' in check) return check
        const gate = gatePath(check.state, args.path)
        if (gate !== undefined) return { ok: false, error: gate }
        return run(async () => {
          const entries = await engine.ls(check.state.alias, args.path)
          return { ok: true, path: args.path, entries: entries.map((entry) => ({ name: entry.name, type: entry.type, size: entry.size, mtimeMs: entry.mtimeMs })) }
        })
      },
    }),

    defineTool({
      name: 'remote_read',
      description: 'Read a text file on the CURRENT SSH-mode host (must be inside the remote workspace root). The whole file is returned (no size cap). Triggers: read remote file, view remote source, cat on the server.',
      parameters: {
        path: { type: 'string', required: true, description: 'Absolute remote file path inside the remote root.' },
      },
      output: {
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            ok: { type: 'boolean', required: true },
            path: { type: 'string' },
            content: { type: 'string' },
            size: { type: 'integer' },
            mtime: { type: 'integer' },
            truncated: { type: 'boolean' },
            error: { type: 'string' },
          },
        },
        render: (_args, value) => {
          if (value.ok !== true) return text(`remote_read failed: ${value.error ?? 'unknown error'}`)
          const notice = value.truncated === true ? `\n\n[truncated at ${(value.content ?? '').length} chars of ${value.size ?? '?'}]` : ''
          return text(value.content + notice)
        },
      },
      async execute(args) {
        const check = remoteState()
        if ('error' in check) return check
        const gate = gatePath(check.state, args.path)
        if (gate !== undefined) return { ok: false, error: gate }
        return run(async () => {
          const result = await engine.readFile(check.state.alias, args.path)
          return {
            ok: true,
            path: args.path,
            content: result.content.toString('utf8'),
            size: result.size,
            mtime: result.mtime,
            truncated: false,
          }
        })
      },
    }),

    defineTool({
      name: 'remote_write',
      description: 'Write (create or overwrite) a text file on the CURRENT SSH-mode host. Parent directories are created automatically. The path must be an absolute path inside the remote workspace root. Prefer reading the file first (remote_read) before overwriting. Triggers: create remote file, edit remote file, save remote file, write config on the server.',
      parameters: {
        path: { type: 'string', required: true, description: 'Absolute remote file path inside the remote root.' },
        content: { type: 'string', required: true, description: 'Full new file content (UTF-8 text).' },
      },
      output: {
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            ok: { type: 'boolean', required: true },
            path: { type: 'string' },
            mtime: { type: 'integer' },
            error: { type: 'string' },
          },
        },
        render: (_args, value) => text(value.ok === true ? `wrote ${value.path}` : `remote_write failed: ${value.error ?? 'unknown error'}`),
      },
      async execute(args) {
        const check = remoteState()
        if ('error' in check) return check
        const gate = gatePath(check.state, args.path)
        if (gate !== undefined) return { ok: false, error: gate }
        return run(async () => {
          const result = await engine.writeFile(check.state.alias, args.path, Buffer.from(args.content, 'utf8'))
          return { ok: true, path: args.path, mtime: result.mtime }
        })
      },
    }),

    defineTool({
      name: 'remote_mkdir',
      description: 'Create a directory (mkdir -p semantics) on the CURRENT SSH-mode host, inside the remote workspace root. Triggers: create remote directory, mkdir on the server.',
      parameters: {
        path: { type: 'string', required: true, description: 'Absolute remote directory path inside the remote root.' },
      },
      output: {
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            ok: { type: 'boolean', required: true },
            path: { type: 'string' },
            error: { type: 'string' },
          },
        },
        render: (_args, value) => text(value.ok === true ? `created ${value.path}` : `remote_mkdir failed: ${value.error ?? 'unknown error'}`),
      },
      async execute(args) {
        const check = remoteState()
        if ('error' in check) return check
        const gate = gatePath(check.state, args.path)
        if (gate !== undefined) return { ok: false, error: gate }
        return run(async () => {
          await engine.mkdir(check.state.alias, args.path)
          return { ok: true, path: args.path }
        })
      },
    }),

    defineTool({
      name: 'remote_rm',
      description: 'Delete a file or directory on the CURRENT SSH-mode host, inside the remote workspace root. Directories require recursive: true and are deleted recursively — confirm the intent before using it. Triggers: delete remote file, remove remote dir, rm on the server.',
      parameters: {
        path: { type: 'string', required: true, description: 'Absolute remote path inside the remote root.' },
        recursive: { type: 'boolean', description: 'Set true to delete a directory recursively.' },
      },
      output: {
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            ok: { type: 'boolean', required: true },
            path: { type: 'string' },
            error: { type: 'string' },
          },
        },
        render: (_args, value) => text(value.ok === true ? `deleted ${value.path}` : `remote_rm failed: ${value.error ?? 'unknown error'}`),
      },
      async execute(args) {
        const check = remoteState()
        if ('error' in check) return check
        const gate = gatePath(check.state, args.path)
        if (gate !== undefined) return { ok: false, error: gate }
        return run(async () => {
          await engine.rm(check.state.alias, args.path, args.recursive === true)
          return { ok: true, path: args.path }
        })
      },
    }),

    defineTool({
      name: 'remote_rename',
      description: 'Rename or move a file/directory (mv semantics) on the CURRENT SSH-mode host; both paths must be inside the remote workspace root. Triggers: rename remote file, move remote file.',
      parameters: {
        from: { type: 'string', required: true, description: 'Absolute remote source path inside the remote root.' },
        to: { type: 'string', required: true, description: 'Absolute remote destination path inside the remote root.' },
      },
      output: {
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            ok: { type: 'boolean', required: true },
            from: { type: 'string' },
            to: { type: 'string' },
            error: { type: 'string' },
          },
        },
        render: (_args, value) => text(value.ok === true ? `renamed ${value.from} -> ${value.to}` : `remote_rename failed: ${value.error ?? 'unknown error'}`),
      },
      async execute(args) {
        const check = remoteState()
        if ('error' in check) return check
        const gateFrom = gatePath(check.state, args.from)
        if (gateFrom !== undefined) return { ok: false, error: gateFrom }
        const gateTo = gatePath(check.state, args.to)
        if (gateTo !== undefined) return { ok: false, error: gateTo }
        return run(async () => {
          await engine.rename(check.state.alias, args.from, args.to)
          return { ok: true, from: args.from, to: args.to }
        })
      },
    }),

    defineTool({
      name: 'remote_glob',
      description: 'Find files matching a glob pattern under the CURRENT SSH-mode host\'s remote workspace root (max depth 6, capped at 200 hits). Patterns use * and ** (crosses directories). Triggers: find remote files by pattern, glob on the server.',
      parameters: {
        pattern: { type: 'string', required: true, description: 'Root-relative glob pattern, e.g. src/**/*.ts or *.log.' },
      },
      output: {
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            ok: { type: 'boolean', required: true },
            hits: { type: 'array', items: { type: 'string' } },
            truncated: { type: 'boolean' },
            error: { type: 'string' },
          },
        },
        render: (_args, value) => {
          if (value.ok !== true) return text(`remote_glob failed: ${value.error ?? 'unknown error'}`)
          const lines = (value.hits ?? []).map((hit: string) => hit)
          const tail = value.truncated === true ? '\n[truncated at 200 hits]' : ''
          return text(lines.length > 0 ? lines.join('\n') + tail : '(no matches)')
        },
      },
      async execute(args) {
        const check = remoteState()
        if ('error' in check) return check
        return run(async () => {
          const root = check.state.remoteRoot
          if (root === undefined) return { ok: false, error: 'remote root is not set' }
          const view = await remote.glob(root, args.pattern)
          return { ok: true, hits: view.hits.map((hit) => hit.path), truncated: view.truncated }
        })
      },
    }),

    defineTool({
      name: 'remote_grep',
      description: 'Search file contents under the CURRENT SSH-mode host\'s remote workspace root with grep (skips .git and node_modules; capped at 200 matches per file and 200KB of output). Triggers: grep remote code, search remote contents.',
      parameters: {
        pattern: { type: 'string', required: true, description: 'Fixed-string or basic regex pattern (grep -E semantics are not applied; use plain strings for safety).' },
      },
      output: {
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            ok: { type: 'boolean', required: true },
            lines: { type: 'array', items: { type: 'string' } },
            truncated: { type: 'boolean' },
            error: { type: 'string' },
          },
        },
        render: (_args, value) => {
          if (value.ok !== true) return text(`remote_grep failed: ${value.error ?? 'unknown error'}`)
          const tail = value.truncated === true ? '\n[output truncated at 200KB]' : ''
          return text((value.lines ?? []).join('\n') + tail)
        },
      },
      async execute(args) {
        const check = remoteState()
        if ('error' in check) return check
        return run(async () => {
          const root = check.state.remoteRoot
          if (root === undefined) return { ok: false, error: 'remote root is not set' }
          const result = await remote.grep(root, args.pattern)
          return { ok: true, lines: result.lines, truncated: result.truncated }
        })
      },
    }),
  ]
}
