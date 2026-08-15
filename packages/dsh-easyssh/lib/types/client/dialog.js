import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * The SSH config dialog: alias / host / port / user / auth (password or key +
 * passphrase) / optional remote root. Saves into the shared dsh-ssh host
 * store (/api/dsh-ssh/hosts), tests the connection, then enters SSH mode.
 * Rendered as a fixed overlay with its own React root (the shell exposes no
 * modal slot for external plugins).
 */
import { createRoot } from 'react-dom/client';
import { useState } from 'react';
import { tt } from "./text.js";
import css from './workspace.module.css';
const INITIAL = {
    alias: '',
    host: '',
    port: '22',
    user: '',
    authKind: 'password',
    password: '',
    keyPath: '',
    passphrase: '',
    remoteRoot: '',
};
/** Open the dialog (mounts one overlay; subsequent calls reuse the element). */
export function openConfigDialog(mode, api, hostsApi) {
    const element = document.createElement('div');
    element.dataset.sshWorkspaceDialog = '';
    document.body.appendChild(element);
    const root = createRoot(element);
    const close = () => {
        root.unmount();
        element.remove();
    };
    root.render(_jsx(ConfigDialog, { mode: mode, api: api, hostsApi: hostsApi, onClose: close }));
}
/** The dialog body. */
export function ConfigDialog(props) {
    const [form, setForm] = useState(INITIAL);
    const [phase, setPhase] = useState({ kind: 'editing' });
    const [savedAlias, setSavedAlias] = useState(undefined);
    const set = (key, value) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };
    const saveAndTest = async () => {
        setPhase({ kind: 'testing' });
        const alias = form.alias.trim();
        const host = form.host.trim();
        const user = form.user.trim();
        const port = Number.parseInt(form.port, 10);
        if (alias === '' || host === '' || user === '' || !Number.isInteger(port)) {
            setPhase({ kind: 'failed', message: 'alias / host / user are required and port must be an integer' });
            return;
        }
        try {
            const summary = await props.hostsApi.create({
                alias,
                host,
                port,
                user,
                auth: form.authKind === 'password'
                    ? { kind: 'password', password: form.password }
                    : { kind: 'key', keyPath: form.keyPath.trim(), passphrase: form.passphrase === '' ? undefined : form.passphrase },
            });
            setSavedAlias(summary.alias);
            const result = await props.hostsApi.test(summary.alias);
            if (result.ok) {
                setPhase({ kind: 'ready', latencyMs: result.latencyMs });
            }
            else {
                setPhase({ kind: 'failed', message: result.error ?? 'unknown error' });
            }
        }
        catch (error) {
            setPhase({ kind: 'failed', message: error instanceof Error ? error.message : String(error) });
        }
    };
    const enterRemote = async () => {
        const alias = savedAlias ?? form.alias.trim();
        try {
            await props.mode.setRemote(alias, form.remoteRoot.trim() === '' ? undefined : form.remoteRoot.trim());
            props.onClose();
        }
        catch (error) {
            setPhase({ kind: 'failed', message: error instanceof Error ? error.message : String(error) });
        }
    };
    return (_jsx("div", { className: css.dialogBackdrop, onClick: props.onClose, children: _jsxs("div", { className: css.dialog, onClick: (event) => event.stopPropagation(), children: [_jsxs("div", { className: css.dialogHeader, children: [_jsx("strong", { children: tt('dialog.title') }), _jsx("span", { className: css.dialogSubtitle, children: tt('dialog.subtitle') })] }), _jsxs("div", { className: css.dialogGrid, children: [_jsxs("label", { className: css.field, children: [_jsx("span", { children: tt('dialog.alias') }), _jsx("input", { value: form.alias, onChange: (event) => set('alias', event.target.value), placeholder: "my-server", spellCheck: false })] }), _jsxs("label", { className: css.field, children: [_jsx("span", { children: tt('dialog.host') }), _jsx("input", { value: form.host, onChange: (event) => set('host', event.target.value), placeholder: "1.2.3.4", spellCheck: false })] }), _jsxs("label", { className: css.field, children: [_jsx("span", { children: tt('dialog.port') }), _jsx("input", { value: form.port, onChange: (event) => set('port', event.target.value), inputMode: "numeric", spellCheck: false })] }), _jsxs("label", { className: css.field, children: [_jsx("span", { children: tt('dialog.user') }), _jsx("input", { value: form.user, onChange: (event) => set('user', event.target.value), placeholder: "root", spellCheck: false })] }), _jsxs("label", { className: css.field, children: [_jsx("span", { children: tt('dialog.auth') }), _jsxs("select", { value: form.authKind, onChange: (event) => set('authKind', event.target.value), children: [_jsx("option", { value: "password", children: tt('dialog.auth.password') }), _jsx("option", { value: "key", children: tt('dialog.auth.key') })] })] }), form.authKind === 'password' ? (_jsxs("label", { className: css.field, children: [_jsx("span", { children: tt('dialog.password') }), _jsx("input", { type: "password", value: form.password, onChange: (event) => set('password', event.target.value), spellCheck: false })] })) : (_jsxs(_Fragment, { children: [_jsxs("label", { className: css.field, children: [_jsx("span", { children: tt('dialog.keyPath') }), _jsx("input", { value: form.keyPath, onChange: (event) => set('keyPath', event.target.value), placeholder: "C:\\\\Users\\\\you\\\\.ssh\\\\id_ed25519", spellCheck: false })] }), _jsxs("label", { className: css.field, children: [_jsx("span", { children: tt('dialog.passphrase') }), _jsx("input", { type: "password", value: form.passphrase, onChange: (event) => set('passphrase', event.target.value), spellCheck: false })] })] })), _jsxs("label", { className: css.field, children: [_jsx("span", { children: tt('dialog.remoteRoot') }), _jsx("input", { value: form.remoteRoot, onChange: (event) => set('remoteRoot', event.target.value), placeholder: "~", spellCheck: false })] }), _jsx("div", { className: css.fieldHint, children: tt('dialog.remoteRootHint') })] }), phase.kind === 'ready' && _jsxs("div", { className: css.dialogOk, children: [tt('dialog.saved'), " \u00B7 ", tt('dialog.testOk', phase.latencyMs ?? 0)] }), phase.kind === 'failed' && _jsx("div", { className: css.dialogFail, children: tt('dialog.testFail', phase.message) }), phase.kind === 'testing' && _jsx("div", { className: css.dialogInfo, children: tt('dialog.testing') }), _jsxs("div", { className: css.dialogActions, children: [_jsx("button", { type: "button", className: css.button, onClick: props.onClose, disabled: phase.kind === 'testing', children: tt('dialog.cancel') }), phase.kind === 'ready' ? (_jsx("button", { type: "button", className: `${css.button} ${css.buttonPrimary}`, onClick: () => void enterRemote(), children: tt('dialog.enter') })) : (_jsx("button", { type: "button", className: `${css.button} ${css.buttonPrimary}`, onClick: () => void saveAndTest(), disabled: phase.kind === 'testing', children: phase.kind === 'testing' ? tt('dialog.testing') : tt('dialog.saveTest') }))] }), phase.kind === 'ready' && _jsx("div", { className: css.dialogHint, children: tt('dialog.enterHint') })] }) }));
}
