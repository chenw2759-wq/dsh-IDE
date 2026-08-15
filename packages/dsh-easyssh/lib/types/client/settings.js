import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * The SSH host-manager settings page (registered in the `settings.section`
 * slot): list/add/edit/delete/test hosts persisted in ~/.dsh/dsh-ssh.json,
 * plus enter/exit SSH mode — so hosts are configured once in Settings and the
 * header button only needs to connect.
 */
import { useEffect, useState, useSyncExternalStore } from 'react';
import { tt } from "./text.js";
import css from './settings.module.css';
const EMPTY_FORM = {
    alias: '',
    host: '',
    port: 22,
    user: '',
    auth: { kind: 'password', password: '' },
    remoteRoot: '',
};
/** The settings page body. */
export function HostSettingsPage(props) {
    const state = useSyncExternalStore(props.mode.subscribe.bind(props.mode), props.mode.getSnapshot.bind(props.mode));
    const [hosts, setHosts] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [editingAlias, setEditingAlias] = useState(null);
    const [message, setMessage] = useState(null);
    const [busy, setBusy] = useState(false);
    const [roots, setRoots] = useState({});
    const [rootInput, setRootInput] = useState('');
    const refresh = async () => {
        try {
            setHosts(await props.hostsApi.list());
        }
        catch (error) {
            setHosts([]);
            setMessage({ kind: 'error', text: error instanceof Error ? error.message : String(error) });
        }
    };
    useEffect(() => {
        void refresh();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const set = (key, value) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };
    const saveHost = async () => {
        const alias = form.alias?.trim() ?? '';
        const host = form.host.trim();
        const user = form.user.trim();
        const port = Number.parseInt(String(form.port ?? 22), 10);
        if (alias === '' || host === '' || user === '' || !Number.isInteger(port) || port < 1 || port > 65535) {
            setMessage({ kind: 'error', text: 'alias / host / user are required and port must be an integer' });
            return;
        }
        setBusy(true);
        setMessage(null);
        try {
            await props.hostsApi.create({
                alias,
                host,
                port,
                user,
                auth: form.auth?.kind === 'key'
                    ? { kind: 'key', keyPath: form.auth.keyPath, passphrase: form.auth.passphrase }
                    : { kind: 'password', password: form.auth?.password ?? '' },
            });
            setForm(EMPTY_FORM);
            setEditingAlias(null);
            setMessage({ kind: 'info', text: tt('panel.saved') });
            await refresh();
        }
        catch (error) {
            setMessage({ kind: 'error', text: error instanceof Error ? error.message : String(error) });
        }
        finally {
            setBusy(false);
        }
    };
    const testHost = async (alias) => {
        setBusy(true);
        setMessage(null);
        try {
            const result = await props.hostsApi.test(alias);
            setMessage(result.ok
                ? { kind: 'info', text: `${alias}: ${tt('dialog.testOk', result.latencyMs ?? 0)}` }
                : { kind: 'error', text: `${alias}: ${tt('dialog.testFail', result.error ?? 'unknown')}` });
        }
        catch (error) {
            setMessage({ kind: 'error', text: error instanceof Error ? error.message : String(error) });
        }
        finally {
            setBusy(false);
        }
    };
    const deleteHost = async (alias) => {
        setBusy(true);
        setMessage(null);
        try {
            const response = await fetch(`/api/dsh-ssh/hosts?alias=${encodeURIComponent(alias)}`, { method: 'DELETE' });
            if (!response.ok) {
                const body = await response.json().catch(() => null);
                throw new Error(body?.error ?? `HTTP ${response.status}`);
            }
            if (state.mode === 'remote' && state.alias === alias)
                await props.mode.setLocal();
            setMessage({ kind: 'info', text: `${alias} ${tt('panel.close')}` });
            await refresh();
        }
        catch (error) {
            setMessage({ kind: 'error', text: error instanceof Error ? error.message : String(error) });
        }
        finally {
            setBusy(false);
        }
    };
    const startEdit = (host) => {
        setEditingAlias(host.alias);
        setForm({
            alias: host.alias,
            host: host.host,
            port: host.port,
            user: host.user,
            auth: { kind: host.auth, password: '' },
            remoteRoot: '',
        });
    };
    const connect = async (alias, remoteRoot) => {
        setBusy(true);
        setMessage(null);
        try {
            await props.mode.setRemote(alias, remoteRoot === undefined || remoteRoot.trim() === '' ? undefined : remoteRoot.trim());
            setMessage({ kind: 'info', text: `SSH: ${alias}` });
        }
        catch (error) {
            setMessage({ kind: 'error', text: error instanceof Error ? error.message : String(error) });
        }
        finally {
            setBusy(false);
        }
    };
    const switchRoot = async (rootInput) => {
        const trimmed = rootInput.trim();
        if (state.mode !== 'remote' || state.alias === undefined || trimmed === '')
            return;
        setBusy(true);
        setMessage(null);
        try {
            await props.mode.setRemote(state.alias, trimmed);
            setMessage({ kind: 'info', text: `root: ${trimmed}` });
        }
        catch (error) {
            setMessage({ kind: 'error', text: error instanceof Error ? error.message : String(error) });
        }
        finally {
            setBusy(false);
        }
    };
    const exitRemote = async () => {
        setBusy(true);
        try {
            await props.mode.setLocal();
            setMessage({ kind: 'info', text: tt('panel.modeLocal') });
        }
        catch (error) {
            setMessage({ kind: 'error', text: error instanceof Error ? error.message : String(error) });
        }
        finally {
            setBusy(false);
        }
    };
    return (_jsxs("div", { className: css.page, children: [_jsx("p", { className: css.hint, children: tt('settings.hint') }), _jsxs("div", { className: css.modeLine, children: [_jsxs("strong", { children: [tt('panel.modeRemote') === 'Remote' ? 'Mode' : '模式', "\uFF1A"] }), state.mode === 'remote'
                        ? `${tt('panel.modeRemote')} ${state.alias ?? ''} @ ${state.remoteRootLabel ?? state.remoteRoot ?? '~'}`
                        : tt('panel.modeLocal'), state.mode === 'remote' && (_jsx("button", { type: "button", className: css.button, onClick: () => void exitRemote(), disabled: busy, children: tt('panel.exitRemote') }))] }), state.mode === 'remote' && (_jsxs("div", { className: css.rootLine, children: [_jsx("input", { value: rootInput, placeholder: tt('panel.rootPlaceholder'), onChange: (event) => setRootInput(event.target.value), onKeyDown: (event) => { if (event.key === 'Enter')
                            void switchRoot(rootInput); }, spellCheck: false }), _jsx("button", { type: "button", className: css.button, onClick: () => void switchRoot(rootInput), disabled: busy, children: tt('panel.rootApply') })] })), message !== null && _jsx("div", { className: message.kind === 'error' ? css.error : css.info, children: message.text }), _jsx("h3", { className: css.title, children: "Hosts" }), _jsxs("table", { className: css.table, children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "alias" }), _jsx("th", { children: "host" }), _jsx("th", { children: "port" }), _jsx("th", { children: "user" }), _jsx("th", { children: "auth" }), _jsx("th", { children: "remoteRoot" }), _jsx("th", {})] }) }), _jsxs("tbody", { children: [(hosts ?? []).map((host) => (_jsxs("tr", { children: [_jsx("td", { children: host.alias }), _jsx("td", { children: host.host }), _jsx("td", { children: host.port }), _jsx("td", { children: host.user }), _jsxs("td", { children: [host.auth, host.auth === 'key' && !host.keyReady ? ' (key missing)' : ''] }), _jsx("td", { children: _jsx("input", { className: css.rootCell, value: roots[host.alias] ?? '', placeholder: "~", onChange: (e) => setRoots((prev) => ({ ...prev, [host.alias]: e.target.value })), spellCheck: false }) }), _jsxs("td", { className: css.actions, children: [_jsx("button", { type: "button", className: css.button, onClick: () => void connect(host.alias, roots[host.alias]), disabled: busy || state.mode === 'remote', children: tt('dialog.enter') }), _jsx("button", { type: "button", className: css.button, onClick: () => void testHost(host.alias), disabled: busy, children: "Test" }), _jsx("button", { type: "button", className: css.button, onClick: () => startEdit(host), disabled: busy, children: "Edit" }), _jsx("button", { type: "button", className: `${css.button} ${css.danger}`, onClick: () => void deleteHost(host.alias), disabled: busy, children: "Del" })] })] }, host.alias))), (hosts ?? []).length === 0 && (_jsx("tr", { children: _jsx("td", { colSpan: 7, className: css.empty, children: hosts === null ? '…' : '(no hosts — add one below)' }) }))] })] }), _jsx("h3", { className: css.title, children: editingAlias !== null ? `Edit ${editingAlias}` : 'Add host' }), _jsxs("div", { className: css.form, children: [_jsxs("label", { className: css.field, children: [_jsx("span", { children: "alias" }), _jsx("input", { value: form.alias ?? '', disabled: editingAlias !== null, onChange: (e) => set('alias', e.target.value), placeholder: "my-server", spellCheck: false })] }), _jsxs("label", { className: css.field, children: [_jsx("span", { children: "host" }), _jsx("input", { value: form.host, onChange: (e) => set('host', e.target.value), placeholder: "1.2.3.4", spellCheck: false })] }), _jsxs("label", { className: css.field, children: [_jsx("span", { children: "port" }), _jsx("input", { value: String(form.port ?? 22), inputMode: "numeric", onChange: (e) => set('port', Number.parseInt(e.target.value, 10)), spellCheck: false })] }), _jsxs("label", { className: css.field, children: [_jsx("span", { children: "user" }), _jsx("input", { value: form.user, onChange: (e) => set('user', e.target.value), placeholder: "root", spellCheck: false })] }), _jsxs("label", { className: css.field, children: [_jsx("span", { children: "auth" }), _jsxs("select", { value: form.auth?.kind ?? 'password', onChange: (e) => set('auth', { kind: e.target.value }), children: [_jsx("option", { value: "password", children: "password" }), _jsx("option", { value: "key", children: "key" })] })] }), form.auth?.kind === 'key' ? (_jsxs(_Fragment, { children: [_jsxs("label", { className: css.field, children: [_jsx("span", { children: "keyPath" }), _jsx("input", { value: form.auth.keyPath ?? '', onChange: (e) => set('auth', { kind: 'key', keyPath: e.target.value }), placeholder: "C:\\\\Users\\\\you\\\\.ssh\\\\id_ed25519", spellCheck: false })] }), _jsxs("label", { className: css.field, children: [_jsx("span", { children: "passphrase" }), _jsx("input", { type: "password", value: form.auth.passphrase ?? '', onChange: (e) => set('auth', { kind: 'key', passphrase: e.target.value }), spellCheck: false })] })] })) : (_jsxs("label", { className: css.field, children: [_jsx("span", { children: "password" }), _jsx("input", { type: "password", value: form.auth?.password ?? '', onChange: (e) => set('auth', { kind: 'password', password: e.target.value }), spellCheck: false })] })), _jsxs("label", { className: css.field, children: [_jsx("span", { children: "remoteRoot" }), _jsx("input", { value: form.remoteRoot, onChange: (e) => set('remoteRoot', e.target.value), placeholder: "~", spellCheck: false })] }), _jsxs("div", { className: css.formActions, children: [_jsx("button", { type: "button", className: `${css.button} ${css.primary}`, onClick: () => void saveHost(), disabled: busy, children: editingAlias !== null ? 'Update' : 'Add host' }), editingAlias !== null && (_jsx("button", { type: "button", className: css.button, onClick: () => { setEditingAlias(null); setForm(EMPTY_FORM); }, children: "Cancel" }))] })] })] }));
}
