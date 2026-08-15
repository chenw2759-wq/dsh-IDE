/**
 * TerminalPanel: a lightweight command console — run one command through the
 * host exec seam (local subprocess or the remote SSH engine, whichever mode
 * is active) and show stdout/stderr. Also usable standalone (the explorer
 * toolbar's terminal button opens it without a file).
 * @module dsh-aionui-panel/client/terminal
 */

import { useEffect, useRef, useState, type JSX } from 'react'
import { t } from '../locales.ts'
import terminalCss from '../styles/terminal.module.css'

/** One executed command with its output. */
interface RunRecord {
  command: string
  cwd?: string
  running: boolean
  done: boolean
  code: number | null
  stdout: string
  stderr: string
}

/** Post one command to the host exec route (root is required by the routes layer). */
async function runCommand(root: string, command: string, cwd?: string): Promise<{ ok: boolean; code: number | null; stdout: string; stderr: string }> {
  const response = await fetch('/aionui-panel/exec', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ root, command, cwd }),
  })
  const envelope = await response.json().catch(() => null) as
    | { ok: true; value: { ok: boolean; code: number | null; stdout: string; stderr: string } }
    | { ok: false; error: { message: string } }
    | null
  if (envelope === null) return { ok: false, code: 1, stdout: '', stderr: 'route unavailable' }
  if (!envelope.ok) return { ok: false, code: 1, stdout: '', stderr: envelope.error.message }
  return envelope.value
}

/** The terminal panel. */
export function TerminalPanel({
  root,
  initialCommand,
  onClose,
}: {
  /** Workspace root (used as the default cwd). */
  root: string
  /** A command to run immediately (e.g. `python file.py`). */
  initialCommand?: string
  onClose: () => void
}): JSX.Element {
  const [records, setRecords] = useState<RunRecord[]>(() => initialCommand !== undefined
    ? [{ command: initialCommand, cwd: root, running: true, done: false, code: null, stdout: '', stderr: '' }]
    : [])
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const cwdRef = useRef(root)
  cwdRef.current = root

  // Keep the input focused: typing into the terminal must never be stolen by
  // the shell's key handlers (mousedown stopPropagation + refocus on blur).
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const keepFocus = (event: React.MouseEvent): void => {
    event.stopPropagation()
    inputRef.current?.focus()
  }

  // Auto-scroll to the newest output.
  useEffect(() => {
    const el = scrollRef.current
    if (el !== null) el.scrollTop = el.scrollHeight
  }, [records])

  const execute = (command: string): void => {
    const trimmed = command.trim()
    if (trimmed === '') return
    const record: RunRecord = {
      command: trimmed,
      cwd: cwdRef.current,
      running: true,
      done: false,
      code: null,
      stdout: '',
      stderr: '',
    }
    setRecords((prev) => [...prev, record])
    // Keep the input focused across the async run: the user should be able to
    // type the next command immediately, without re-clicking the box.
    window.setTimeout(() => inputRef.current?.focus(), 0)
    void runCommand(cwdRef.current, trimmed, cwdRef.current).then((result) => {
      setRecords((prev) => prev.map((item) => item === record
        ? { ...item, running: false, done: true, code: result.code, stdout: result.stdout, stderr: result.stderr }
        : item))
      window.setTimeout(() => inputRef.current?.focus(), 0)
    })
  }

  // Run the initial command once the panel mounts.
  const initialRef = useRef(initialCommand)
  useEffect(() => {
    if (initialRef.current !== undefined) {
      const cmd = initialRef.current
      initialRef.current = undefined
      void runCommand(cwdRef.current, cmd, cwdRef.current).then((result) => {
        setRecords((prev) => prev.map((item) => item.command === cmd && item.running
          ? { ...item, running: false, done: true, code: result.code, stdout: result.stdout, stderr: result.stderr }
          : item))
        window.setTimeout(() => inputRef.current?.focus(), 0)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className={terminalCss.panel}>
      <div className={terminalCss.header}>
        <span className={terminalCss.title}>⚡ {t('preview.terminal')}</span>
        <button type="button" className={terminalCss.closeBtn} onClick={onClose} aria-label={t('common.close')}>
          ✕
        </button>
      </div>
      <div ref={scrollRef} className={terminalCss.output}>
        {records.length === 0 && <div className={terminalCss.empty}>{t('preview.terminalHint')}</div>}
        {records.map((record, index) => (
          <div key={index} className={terminalCss.record}>
            <div className={terminalCss.promptLine}>
              <span className={terminalCss.prompt}>{record.cwd ?? ''}</span>
              <span className={terminalCss.command}>{record.command}</span>
            </div>
            {record.running && <div className={terminalCss.running}>{t('preview.terminalRunning')}</div>}
            {record.stdout !== '' && <pre className={terminalCss.stdout}>{record.stdout}</pre>}
            {record.stderr !== '' && <pre className={terminalCss.stderr}>{record.stderr}</pre>}
            {record.done && (
              <div className={record.code === 0 ? terminalCss.doneOk : terminalCss.doneFail}>
                {record.code === 0 ? t('preview.terminalOk') : `${t('preview.terminalFail')} (${record.code ?? '?'})`}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className={terminalCss.inputRow} onMouseDown={keepFocus}>
        <input
          ref={inputRef}
          className={terminalCss.input}
          value={input}
          placeholder={t('preview.terminalPlaceholder')}
          spellCheck={false}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              execute(input)
              setInput('')
            }
            event.stopPropagation()
          }}
        />
        <button
          type="button"
          className={terminalCss.runBtn}
          disabled={input.trim() === ''}
          onClick={() => { execute(input); setInput('') }}
        >
          {t('preview.run')}
        </button>
      </div>
    </div>
  )
}
