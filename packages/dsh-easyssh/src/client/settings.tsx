/**
 * The SSH host-manager settings page (registered in the `settings.section`
 * slot): list/add/edit/delete/test hosts persisted in ~/.dsh/dsh-ssh.json,
 * plus enter/exit SSH mode — so hosts are configured once in Settings and the
 * header button only needs to connect.
 */
import { useEffect, useState, useSyncExternalStore, type ReactElement } from 'react'
import type { ModeState } from './state.ts'
import type { SshHostPayload, SshHostSummary, SshHostsApi, WorkspaceApi } from './api.ts'
import { tt } from './text.ts'
import css from './settings.module.css'

/** Composed slot props (standard kit ignored via optional unknowns). */
export interface HostSettingsPageProps {
  mode: ModeState
  api: WorkspaceApi
  hostsApi: SshHostsApi
  sessionId?: unknown
  useSessions?: unknown
  useWorkspaces?: unknown
  useProjection?: unknown
  useInput?: unknown
  inputActions?: unknown
  renderSlot?: unknown
  renderSlotChain?: unknown
  t?: unknown
}

const EMPTY_FORM: SshHostPayload & { remoteRoot: string } = {
  alias: '',
  host: '',
  port: 22,
  user: '',
  auth: { kind: 'password', password: '' },
  remoteRoot: '',
}

/** The settings page body. */
export function HostSettingsPage(props: HostSettingsPageProps): ReactElement {
  const state = useSyncExternalStore(props.mode.subscribe.bind(props.mode), props.mode.getSnapshot.bind(props.mode))
  const [hosts, setHosts] = useState<SshHostSummary[] | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingAlias, setEditingAlias] = useState<string | null>(null)
  const [message, setMessage] = useState<{ kind: 'error' | 'info'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [roots, setRoots] = useState<Record<string, string>>({})
  const [rootInput, setRootInput] = useState('')

  const refresh = async (): Promise<void> => {
    try {
      setHosts(await props.hostsApi.list())
    } catch (error) {
      setHosts([])
      setMessage({ kind: 'error', text: error instanceof Error ? error.message : String(error) })
    }
  }

  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const set = <K extends keyof typeof form>(key: K, value: typeof form[K]): void => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const saveHost = async (): Promise<void> => {
    const alias = form.alias?.trim() ?? ''
    const host = form.host.trim()
    const user = form.user.trim()
    const port = Number.parseInt(String(form.port ?? 22), 10)
    if (alias === '' || host === '' || user === '' || !Number.isInteger(port) || port < 1 || port > 65535) {
      setMessage({ kind: 'error', text: 'alias / host / user are required and port must be an integer' })
      return
    }
    setBusy(true)
    setMessage(null)
    try {
      await props.hostsApi.create({
        alias,
        host,
        port,
        user,
        auth: form.auth?.kind === 'key'
          ? { kind: 'key', keyPath: form.auth.keyPath, passphrase: form.auth.passphrase }
          : { kind: 'password', password: form.auth?.password ?? '' },
      })
      setForm(EMPTY_FORM)
      setEditingAlias(null)
      setMessage({ kind: 'info', text: tt('panel.saved') })
      await refresh()
    } catch (error) {
      setMessage({ kind: 'error', text: error instanceof Error ? error.message : String(error) })
    } finally {
      setBusy(false)
    }
  }

  const testHost = async (alias: string): Promise<void> => {
    setBusy(true)
    setMessage(null)
    try {
      const result = await props.hostsApi.test(alias)
      setMessage(result.ok
        ? { kind: 'info', text: `${alias}: ${tt('dialog.testOk', result.latencyMs ?? 0)}` }
        : { kind: 'error', text: `${alias}: ${tt('dialog.testFail', result.error ?? 'unknown')}` })
    } catch (error) {
      setMessage({ kind: 'error', text: error instanceof Error ? error.message : String(error) })
    } finally {
      setBusy(false)
    }
  }

  const deleteHost = async (alias: string): Promise<void> => {
    setBusy(true)
    setMessage(null)
    try {
      const response = await fetch(`/api/dsh-ssh/hosts?alias=${encodeURIComponent(alias)}`, { method: 'DELETE' })
      if (!response.ok) {
        const body = await response.json().catch(() => null)
        throw new Error((body as { error?: string } | null)?.error ?? `HTTP ${response.status}`)
      }
      if (state.mode === 'remote' && state.alias === alias) await props.mode.setLocal()
      setMessage({ kind: 'info', text: `${alias} ${tt('panel.close')}` })
      await refresh()
    } catch (error) {
      setMessage({ kind: 'error', text: error instanceof Error ? error.message : String(error) })
    } finally {
      setBusy(false)
    }
  }

  const startEdit = (host: SshHostSummary): void => {
    setEditingAlias(host.alias)
    setForm({
      alias: host.alias,
      host: host.host,
      port: host.port,
      user: host.user,
      auth: { kind: host.auth, password: '' },
      remoteRoot: '',
    })
  }

  const connect = async (alias: string, remoteRoot?: string): Promise<void> => {
    setBusy(true)
    setMessage(null)
    try {
      await props.mode.setRemote(alias, remoteRoot === undefined || remoteRoot.trim() === '' ? undefined : remoteRoot.trim())
      setMessage({ kind: 'info', text: `SSH: ${alias}` })
    } catch (error) {
      setMessage({ kind: 'error', text: error instanceof Error ? error.message : String(error) })
    } finally {
      setBusy(false)
    }
  }

  const switchRoot = async (rootInput: string): Promise<void> => {
    const trimmed = rootInput.trim()
    if (state.mode !== 'remote' || state.alias === undefined || trimmed === '') return
    setBusy(true)
    setMessage(null)
    try {
      await props.mode.setRemote(state.alias, trimmed)
      setMessage({ kind: 'info', text: `root: ${trimmed}` })
    } catch (error) {
      setMessage({ kind: 'error', text: error instanceof Error ? error.message : String(error) })
    } finally {
      setBusy(false)
    }
  }

  const exitRemote = async (): Promise<void> => {
    setBusy(true)
    try {
      await props.mode.setLocal()
      setMessage({ kind: 'info', text: tt('panel.modeLocal') })
    } catch (error) {
      setMessage({ kind: 'error', text: error instanceof Error ? error.message : String(error) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={css.page}>
      <p className={css.hint}>{tt('settings.hint')}</p>
      <div className={css.modeLine}>
        <strong>{tt('panel.modeRemote') === 'Remote' ? 'Mode' : '模式'}：</strong>
        {state.mode === 'remote'
          ? `${tt('panel.modeRemote')} ${state.alias ?? ''} @ ${state.remoteRootLabel ?? state.remoteRoot ?? '~'}`
          : tt('panel.modeLocal')}
        {state.mode === 'remote' && (
          <button type="button" className={css.button} onClick={() => void exitRemote()} disabled={busy}>
            {tt('panel.exitRemote')}
          </button>
        )}
      </div>

      {state.mode === 'remote' && (
        <div className={css.rootLine}>
          <input
            value={rootInput}
            placeholder={tt('panel.rootPlaceholder')}
            onChange={(event) => setRootInput(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter') void switchRoot(rootInput) }}
            spellCheck={false}
          />
          <button type="button" className={css.button} onClick={() => void switchRoot(rootInput)} disabled={busy}>
            {tt('panel.rootApply')}
          </button>
        </div>
      )}

      {message !== null && <div className={message.kind === 'error' ? css.error : css.info}>{message.text}</div>}

      <h3 className={css.title}>Hosts</h3>
      <table className={css.table}>
        <thead>
          <tr>
            <th>alias</th><th>host</th><th>port</th><th>user</th><th>auth</th><th>remoteRoot</th><th />
          </tr>
        </thead>
        <tbody>
          {(hosts ?? []).map((host) => (
            <tr key={host.alias}>
              <td>{host.alias}</td>
              <td>{host.host}</td>
              <td>{host.port}</td>
              <td>{host.user}</td>
              <td>{host.auth}{host.auth === 'key' && !host.keyReady ? ' (key missing)' : ''}</td>
              <td>
                <input
                  className={css.rootCell}
                  value={roots[host.alias] ?? ''}
                  placeholder="~"
                  onChange={(e) => setRoots((prev) => ({ ...prev, [host.alias]: e.target.value }))}
                  spellCheck={false}
                />
              </td>
              <td className={css.actions}>
                <button type="button" className={css.button} onClick={() => void connect(host.alias, roots[host.alias])} disabled={busy || state.mode === 'remote'}>
                  {tt('dialog.enter')}
                </button>
                <button type="button" className={css.button} onClick={() => void testHost(host.alias)} disabled={busy}>Test</button>
                <button type="button" className={css.button} onClick={() => startEdit(host)} disabled={busy}>Edit</button>
                <button type="button" className={`${css.button} ${css.danger}`} onClick={() => void deleteHost(host.alias)} disabled={busy}>Del</button>
              </td>
            </tr>
          ))}
          {(hosts ?? []).length === 0 && (
            <tr><td colSpan={7} className={css.empty}>{hosts === null ? '…' : '(no hosts — add one below)'}</td></tr>
          )}
        </tbody>
      </table>

      <h3 className={css.title}>{editingAlias !== null ? `Edit ${editingAlias}` : 'Add host'}</h3>
      <div className={css.form}>
        <label className={css.field}><span>alias</span>
          <input value={form.alias ?? ''} disabled={editingAlias !== null} onChange={(e) => set('alias', e.target.value)} placeholder="my-server" spellCheck={false} />
        </label>
        <label className={css.field}><span>host</span>
          <input value={form.host} onChange={(e) => set('host', e.target.value)} placeholder="1.2.3.4" spellCheck={false} />
        </label>
        <label className={css.field}><span>port</span>
          <input value={String(form.port ?? 22)} inputMode="numeric" onChange={(e) => set('port', Number.parseInt(e.target.value, 10))} spellCheck={false} />
        </label>
        <label className={css.field}><span>user</span>
          <input value={form.user} onChange={(e) => set('user', e.target.value)} placeholder="root" spellCheck={false} />
        </label>
        <label className={css.field}><span>auth</span>
          <select value={form.auth?.kind ?? 'password'} onChange={(e) => set('auth', { kind: e.target.value as 'password' | 'key' })}>
            <option value="password">password</option>
            <option value="key">key</option>
          </select>
        </label>
        {form.auth?.kind === 'key' ? (
          <>
            <label className={css.field}><span>keyPath</span>
              <input value={form.auth.keyPath ?? ''} onChange={(e) => set('auth', { kind: 'key', keyPath: e.target.value } as SshHostPayload['auth'])} placeholder="C:\\Users\\you\\.ssh\\id_ed25519" spellCheck={false} />
            </label>
            <label className={css.field}><span>passphrase</span>
              <input type="password" value={form.auth.passphrase ?? ''} onChange={(e) => set('auth', { kind: 'key', passphrase: e.target.value } as SshHostPayload['auth'])} spellCheck={false} />
            </label>
          </>
        ) : (
          <label className={css.field}><span>password</span>
            <input type="password" value={form.auth?.password ?? ''} onChange={(e) => set('auth', { kind: 'password', password: e.target.value })} spellCheck={false} />
          </label>
        )}
        <label className={css.field}><span>remoteRoot</span>
          <input value={form.remoteRoot} onChange={(e) => set('remoteRoot', e.target.value)} placeholder="~" spellCheck={false} />
        </label>
        <div className={css.formActions}>
          <button type="button" className={`${css.button} ${css.primary}`} onClick={() => void saveHost()} disabled={busy}>
            {editingAlias !== null ? 'Update' : 'Add host'}
          </button>
          {editingAlias !== null && (
            <button type="button" className={css.button} onClick={() => { setEditingAlias(null); setForm(EMPTY_FORM) }}>Cancel</button>
          )}
        </div>
      </div>
    </div>
  )
}
