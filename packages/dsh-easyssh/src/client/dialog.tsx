/**
 * The SSH config dialog: alias / host / port / user / auth (password or key +
 * passphrase) / optional remote root. Saves into the shared dsh-ssh host
 * store (/api/dsh-ssh/hosts), tests the connection, then enters SSH mode.
 * Rendered as a fixed overlay with its own React root (the shell exposes no
 * modal slot for external plugins).
 */
import { createRoot } from 'react-dom/client'
import { useEffect, useState, type ReactElement } from 'react'
import type { ModeState } from './state.ts'
import type { SshHostsApi, SshHostSummary, WorkspaceApi } from './api.ts'
import { tt } from './text.ts'
import css from './workspace.module.css'

interface DialogState {
  alias: string
  host: string
  port: string
  user: string
  authKind: 'password' | 'key'
  password: string
  keyPath: string
  passphrase: string
  remoteRoot: string
}

const INITIAL: DialogState = {
  alias: '',
  host: '',
  port: '22',
  user: '',
  authKind: 'password',
  password: '',
  keyPath: '',
  passphrase: '',
  remoteRoot: '',
}

type Phase =
  | { kind: 'editing' }
  | { kind: 'testing' }
  | { kind: 'failed'; message: string }
  | { kind: 'ready'; latencyMs?: number }

/** Open the dialog (mounts one overlay; subsequent calls reuse the element). */
export function openConfigDialog(mode: ModeState, api: WorkspaceApi, hostsApi: SshHostsApi): void {
  const element = document.createElement('div')
  element.dataset.sshWorkspaceDialog = ''
  document.body.appendChild(element)
  const root = createRoot(element)
  const close = (): void => {
    root.unmount()
    element.remove()
  }
  root.render(<ConfigDialog mode={mode} api={api} hostsApi={hostsApi} onClose={close} />)
}

/** The dialog body. */
export function ConfigDialog(props: {
  mode: ModeState
  api: WorkspaceApi
  hostsApi: SshHostsApi
  onClose: () => void
}): ReactElement {
  const [form, setForm] = useState<DialogState>(INITIAL)
  const [phase, setPhase] = useState<Phase>({ kind: 'editing' })
  const [savedAlias, setSavedAlias] = useState<string | undefined>(undefined)
  const [editingAlias, setEditingAlias] = useState<string | null>(null)
  const [hosts, setHosts] = useState<SshHostSummary[] | null>(null)
  const [picking, setPicking] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  // Load the saved host list once (the multi-host device picker).
  useEffect(() => {
    let alive = true
    void props.hostsApi.list().then((list) => {
      if (alive) setHosts(list)
    }).catch(() => {
      if (alive) setHosts([])
    })
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const set = <K extends keyof DialogState>(key: K, value: DialogState[K]): void => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  /** Enter SSH mode on an EXISTING host (multi-host picker, one click). */
  const enterExisting = async (alias: string): Promise<void> => {
    setPicking(alias)
    try {
      await props.mode.setRemote(alias)
      props.onClose()
    } catch (error) {
      setPicking(null)
      setPhase({ kind: 'failed', message: error instanceof Error ? error.message : String(error) })
    }
  }

  /** Fill the form from an existing host for editing (secrets left blank so
   *  an untouched auth keeps the stored one). */
  const startEdit = (host: SshHostSummary): void => {
    setEditingAlias(host.alias)
    setForm({
      alias: host.alias,
      host: host.host,
      port: String(host.port),
      user: host.user,
      authKind: host.auth,
      password: '',
      keyPath: '',
      passphrase: '',
      remoteRoot: '',
    })
    setPhase({ kind: 'editing' })
  }

  /** Delete an existing host; exits SSH mode first when it is the active one. */
  const removeHost = async (alias: string): Promise<void> => {
    setDeleting(alias)
    try {
      await props.hostsApi.remove(alias)
      const mode = props.mode.getSnapshot()
      if (mode.mode === 'remote' && mode.alias === alias) await props.mode.setLocal()
      setHosts((prev) => (prev === null ? prev : prev.filter((host) => host.alias !== alias)))
      if (editingAlias === alias) {
        setEditingAlias(null)
        setForm(INITIAL)
        setSavedAlias(undefined)
      }
    } catch (error) {
      setPhase({ kind: 'failed', message: error instanceof Error ? error.message : String(error) })
    } finally {
      setDeleting(null)
    }
  }

  const saveAndTest = async (): Promise<void> => {
    setPhase({ kind: 'testing' })
    const alias = form.alias.trim()
    const host = form.host.trim()
    const user = form.user.trim()
    const port = Number.parseInt(form.port, 10)
    if (alias === '' || host === '' || user === '' || !Number.isInteger(port)) {
      setPhase({ kind: 'failed', message: 'alias / host / user are required and port must be an integer' })
      return
    }
    try {
      const auth = form.authKind === 'password'
        ? { kind: 'password' as const, password: form.password }
        : { kind: 'key' as const, keyPath: form.keyPath.trim(), passphrase: form.passphrase === '' ? undefined : form.passphrase }
      if (editingAlias !== null) {
        // Partial PATCH: only resend auth when a new secret was entered, so
        // an untouched password/key stays stored (the host rejects empty).
        const hasNewSecret = form.authKind === 'password'
          ? form.password !== ''
          : form.keyPath.trim() !== ''
        const summary = await props.hostsApi.update(editingAlias, {
          host,
          port,
          user,
          ...(hasNewSecret ? { auth } : {}),
        })
        setSavedAlias(summary.alias)
      } else {
        const summary = await props.hostsApi.create({ alias, host, port, user, auth })
        setSavedAlias(summary.alias)
      }
      const result = await props.hostsApi.test(alias)
      if (result.ok) {
        setPhase({ kind: 'ready', latencyMs: result.latencyMs })
      } else {
        setPhase({ kind: 'failed', message: result.error ?? 'unknown error' })
      }
    } catch (error) {
      setPhase({ kind: 'failed', message: error instanceof Error ? error.message : String(error) })
    }
  }

  const enterRemote = async (): Promise<void> => {
    const alias = savedAlias ?? form.alias.trim()
    try {
      await props.mode.setRemote(alias, form.remoteRoot.trim() === '' ? undefined : form.remoteRoot.trim())
      props.onClose()
    } catch (error) {
      setPhase({ kind: 'failed', message: error instanceof Error ? error.message : String(error) })
    }
  }

  return (
    <div className={css.dialogBackdrop} onClick={props.onClose}>
      <div className={css.dialog} onClick={(event) => event.stopPropagation()}>
        <div className={css.dialogHeader}>
          <strong>{tt('dialog.title')}</strong>
          <span className={css.dialogSubtitle}>{tt('dialog.subtitle')}</span>
        </div>

        {hosts !== null && hosts.length > 0 && (
          <div className={css.hostPicker}>
            <div className={css.hostPickerTitle}>{tt('dialog.existing')}</div>
            {hosts.map((host) => (
              <div key={host.alias} className={css.hostRow}>
                <span className={css.hostAlias}>{host.alias}</span>
                <span className={css.hostMeta}>{host.user}@{host.host}:{host.port}</span>
                <span className={css.hostRowActions}>
                  <button
                    type="button"
                    className={`${css.button} ${css.buttonPrimary} ${css.hostEnter}`}
                    disabled={picking === host.alias}
                    onClick={() => void enterExisting(host.alias)}
                  >
                    {picking === host.alias ? tt('dialog.testing') : tt('dialog.enter')}
                  </button>
                  <button
                    type="button"
                    className={css.button}
                    disabled={deleting === host.alias}
                    onClick={() => startEdit(host)}
                  >
                    {tt('dialog.edit')}
                  </button>
                  <button
                    type="button"
                    className={`${css.button} ${css.danger}`}
                    disabled={deleting === host.alias}
                    onClick={() => void removeHost(host.alias)}
                  >
                    {deleting === host.alias ? '…' : tt('dialog.delete')}
                  </button>
                </span>
              </div>
            ))}
            <div className={css.hostPickerDivider} />
          </div>
        )}

        <div className={css.dialogGrid}>
          <label className={css.field}>
            <span>{tt('dialog.alias')}</span>
            <input value={form.alias} onChange={(event) => set('alias', event.target.value)} placeholder="my-server" spellCheck={false} />
          </label>
          <label className={css.field}>
            <span>{tt('dialog.host')}</span>
            <input value={form.host} onChange={(event) => set('host', event.target.value)} placeholder="1.2.3.4" spellCheck={false} />
          </label>
          <label className={css.field}>
            <span>{tt('dialog.port')}</span>
            <input value={form.port} onChange={(event) => set('port', event.target.value)} inputMode="numeric" spellCheck={false} />
          </label>
          <label className={css.field}>
            <span>{tt('dialog.user')}</span>
            <input value={form.user} onChange={(event) => set('user', event.target.value)} placeholder="root" spellCheck={false} />
          </label>

          <label className={css.field}>
            <span>{tt('dialog.auth')}</span>
            <select value={form.authKind} onChange={(event) => set('authKind', event.target.value as 'password' | 'key')}>
              <option value="password">{tt('dialog.auth.password')}</option>
              <option value="key">{tt('dialog.auth.key')}</option>
            </select>
          </label>
          {form.authKind === 'password' ? (
            <label className={css.field}>
              <span>{tt('dialog.password')}</span>
              <input type="password" value={form.password} onChange={(event) => set('password', event.target.value)} spellCheck={false} />
            </label>
          ) : (
            <>
              <label className={css.field}>
                <span>{tt('dialog.keyPath')}</span>
                <input value={form.keyPath} onChange={(event) => set('keyPath', event.target.value)} placeholder="C:\\Users\\you\\.ssh\\id_ed25519" spellCheck={false} />
              </label>
              <label className={css.field}>
                <span>{tt('dialog.passphrase')}</span>
                <input type="password" value={form.passphrase} onChange={(event) => set('passphrase', event.target.value)} spellCheck={false} />
              </label>
            </>
          )}

          <label className={css.field}>
            <span>{tt('dialog.remoteRoot')}</span>
            <input value={form.remoteRoot} onChange={(event) => set('remoteRoot', event.target.value)} placeholder="~" spellCheck={false} />
          </label>
          <div className={css.fieldHint}>{tt('dialog.remoteRootHint')}</div>
        </div>

        {phase.kind === 'ready' && <div className={css.dialogOk}>{tt('dialog.saved')} · {tt('dialog.testOk', phase.latencyMs ?? 0)}</div>}
        {phase.kind === 'failed' && <div className={css.dialogFail}>{tt('dialog.testFail', phase.message)}</div>}
        {phase.kind === 'testing' && <div className={css.dialogInfo}>{tt('dialog.testing')}</div>}

        <div className={css.dialogActions}>
          <button type="button" className={css.button} onClick={props.onClose} disabled={phase.kind === 'testing'}>
            {tt('dialog.cancel')}
          </button>
          {phase.kind === 'ready' ? (
            <button type="button" className={`${css.button} ${css.buttonPrimary}`} onClick={() => void enterRemote()}>
              {tt('dialog.enter')}
            </button>
          ) : (
            <button type="button" className={`${css.button} ${css.buttonPrimary}`} onClick={() => void saveAndTest()} disabled={phase.kind === 'testing'}>
              {phase.kind === 'testing' ? tt('dialog.testing') : (editingAlias !== null ? tt('dialog.updateTest') : tt('dialog.saveTest'))}
            </button>
          )}
        </div>
        {phase.kind === 'ready' && <div className={css.dialogHint}>{tt('dialog.enterHint')}</div>}
      </div>
    </div>
  )
}
