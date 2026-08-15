import { SshHostsApi, WorkspaceApi } from "./api.js";
import { RemoteWorkspaceBadge } from "./badge.js";
import { ConnectButton, ToggleButton } from "./header.js";
import { NS, dictionaries } from "./locales.js";
import { HostSettingsPage } from "./settings.js";
import { ModeState } from "./state.js";
import { setLanguage, tt } from "./text.js";
/** The cross-plugin mode service name (read by the aionui panel). */
export const SSH_WORKSPACE_MODE_SERVICE = 'sshWorkspaceMode';
/** Required services: slots for the header buttons, locale for the copy, sessions for the local root. */
export const inject = ['slots', 'locale', 'sessions'];
/** Apply the browser half. */
export function apply(ctx) {
    ctx.effect(() => ctx.locale.register(NS, dictionaries), 'dsh-easyssh: dictionaries');
    const api = new WorkspaceApi();
    const hostsApi = new SshHostsApi();
    const mode = new ModeState(api);
    let localRoot = '';
    // The local-mode project root follows the active session's cwd.
    const bindRoot = () => {
        const snapshot = ctx.sessions.list.getSnapshot();
        const sessionId = snapshot.current;
        const cwd = sessionId === undefined ? undefined : snapshot.byId[sessionId]?.cwd;
        localRoot = typeof cwd === 'string' && cwd !== '' ? cwd : '';
    };
    const rootSubscription = ctx.sessions.list.subscribe(bindRoot);
    bindRoot();
    // Expose the mode to other client plugins (the aionui panel follows it).
    ctx.provide(SSH_WORKSPACE_MODE_SERVICE, mode);
    const disposers = [];
    try {
        ctx.slots.inject('conversation.session.header.utilities', () => {
            const unregister = [];
            unregister.push(ctx.slots.register({ name: 'conversation.session.header.utilities', id: 'ssh-workspace-connect', order: -10, inject: () => ({ mode, api, hostsApi }) }, ConnectButton));
            unregister.push(ctx.slots.register({ name: 'conversation.session.header.utilities', id: 'ssh-workspace-toggle', order: -9, inject: () => ({ mode }) }, ToggleButton));
            return () => {
                for (const dispose of unregister)
                    dispose();
            };
        });
        // The remote-workspace badge: a static session-header action (negative
        // order, before interactive buttons) showing `alias @ remoteRoot` while
        // SSH mode is active. DSH's own workspace label is host-local and
        // immutable, so this badge surfaces the real working directory.
        ctx.slots.inject('conversation.session.header.actions', () => ctx.slots.register({ name: 'conversation.session.header.actions', id: 'ssh-workspace-badge', order: -100, inject: () => ({ mode }) }, RemoteWorkspaceBadge));
        mode.start();
        // SSH host-manager page in Settings (persistent configuration; the header
        // dialog then only needs to connect). Registered separately so a failure
        // here degrades the settings page only, never the workspace surfaces.
        ctx.slots.inject('settings.section', () => ctx.slots.register({ name: 'settings.section', id: 'ssh-workspace-hosts', order: 100, label: () => tt('settings.label'), inject: () => ({ mode, api, hostsApi }) }, HostSettingsPage));
    }
    catch (error) {
        console.warn('[dsh-easyssh] mount failed:', error);
    }
    // Language mirroring (the shell owns <html lang>; the dictionary follows).
    const syncLanguage = () => {
        setLanguage(document.documentElement.lang?.startsWith('zh') ?? false);
    };
    const langObserver = new MutationObserver(syncLanguage);
    langObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
    syncLanguage();
    ctx.effect(() => () => {
        mode.stop();
        rootSubscription();
        langObserver.disconnect();
        for (const dispose of disposers.splice(0))
            dispose();
    }, 'dsh-easyssh: wiring');
}
