import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * The two session-header utility buttons (registered in
 * conversation.session.header.utilities, left of the session-log entry):
 * the SSH configure/enter button and the local⇄remote toggle. The runtime
 * dependencies (mode / api / hostsApi) arrive as slot-injected owner props.
 */
import { useSyncExternalStore } from 'react';
import { openConfigDialog } from "./dialog.js";
import { tt } from "./text.js";
/** React hook: subscribe to the mode store. */
function useMode(mode) {
    return useSyncExternalStore(mode.subscribe.bind(mode), mode.getSnapshot.bind(mode));
}
/** The SSH configure/enter button (always visible). */
export function ConnectButton(props) {
    const state = useMode(props.mode);
    const remote = state.mode === 'remote' && state.alias !== undefined;
    return (_jsxs("button", { type: "button", "data-ssh-workspace-connect": "", "data-active": remote ? 'true' : undefined, title: remote ? tt('connect.remoteTooltip') : tt('connect.tooltip'), onClick: () => {
            openConfigDialog(props.mode, props.api, props.hostsApi);
        }, children: [_jsxs("svg", { viewBox: "0 0 16 16", width: "14", height: "14", fill: "none", stroke: "currentColor", strokeWidth: "1.3", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", children: [_jsx("rect", { x: "2", y: "3", width: "12", height: "10", rx: "2" }), _jsx("path", { d: "M6 6.5l2.2 1.6L6 9.7" }), _jsx("path", { d: "M9.5 9.5h2" })] }), _jsx("span", { children: remote ? `SSH: ${state.alias}` : tt('connect.label') })] }));
}
/** The local⇄remote toggle (visible once a remote target exists). */
export function ToggleButton(props) {
    const state = useMode(props.mode);
    if (state.alias === undefined)
        return null;
    const alias = state.alias;
    const remote = state.mode === 'remote';
    return (_jsxs("button", { type: "button", "data-ssh-workspace-toggle": "", "data-remote": remote ? 'true' : undefined, title: remote ? tt('toggle.tooltipRemote') : tt('toggle.tooltipLocal'), onClick: () => {
            if (remote) {
                void props.mode.setLocal();
            }
            else {
                void props.mode.setRemote(alias);
            }
        }, children: [remote ? (_jsxs("svg", { viewBox: "0 0 16 16", width: "14", height: "14", fill: "none", stroke: "currentColor", strokeWidth: "1.3", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", children: [_jsx("path", { d: "M3.5 5.5h6a3 3 0 0 1 0 6h-1" }), _jsx("path", { d: "M5.5 7.5L3.5 5.5l2-2" })] })) : (_jsxs("svg", { viewBox: "0 0 16 16", width: "14", height: "14", fill: "none", stroke: "currentColor", strokeWidth: "1.3", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", children: [_jsx("path", { d: "M8 3l3.5 3.5L8 10" }), _jsx("path", { d: "M3.5 9.5v0a3 3 0 0 0 3 3h1" })] })), _jsx("span", { children: remote ? tt('toggle.labelRemote') : tt('toggle.labelLocal') })] }));
}
