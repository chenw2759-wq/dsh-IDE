/**
 * dsh-ssh — host half. Mounts the SSH engine (persistent ssh2 connection
 * pool, exec / PTY shell / SFTP / tunnels / cluster), the /api/dsh-ssh route
 * family plus the terminal WebSocket upgrade, the agent tools (ssh_list,
 * ssh_exec, ssh_upload, ssh_download, ssh_tunnel, ssh_cluster), and a
 * system-prompt announcement. The browser half (./client) renders the host
 * manager and web terminal. Everything rides official NPM SDK packages —
 * no dsh source changes.
 */
import type { Context } from '@deepseek-ai/cordis';
import z from 'schemastery';
/** Stable cordis plugin name. */
export declare const name = "ssh";
/** Re-exported engine and store so sibling plugins (e.g. dsh-ssh-workspace) can share one stack. */
export { SshEngine } from './engine.ts';
export { HostStore } from './store.ts';
export type { ExecSession, ShellSession } from './engine.ts';
export type { RemoteDirEntry } from './protocol.ts';
/** Services required before the SSH surfaces can mount. */
export declare const inject: string[];
/**
 * Settings namespace of the SSH capability — the section the web settings
 * surface edits. Spelled here rather than imported: the browser half spells
 * the same value and must not depend on a Host package.
 */
export declare const SSH_SETTINGS_NAMESPACE: import("@deepseek-ai/dsh-settings").SettingsNamespace;
/** Plugin config, validated by the same-named schemastery schema. */
export interface Config {
    /**
     * When true (default), a system-prompt section announces the SSH plugin to
     * every agent (tools + host store). Set false to keep it silent.
     */
    announceToAgent?: boolean;
    /** Master switch for the plugin (routes, tools, prompt section). */
    enabled?: boolean;
}
export declare const Config: z<Config>;
/** Model-facing announcement: plugin presence, capabilities, and limits. */
export declare const SSH_GUIDANCE = "\u672C\u673A\u5DF2\u5B89\u88C5 dsh-ssh \u63D2\u4EF6\uFF08DSH \u8FDC\u7A0B SSH \u8FD0\u7EF4\uFF09\uFF1A\u4FA7\u8FB9\u680F\u300CSSH\u300D\u5165\u53E3\uFF1B\u5728 dsh-web-ui \u63D2\u4EF6\u5168\u5BB6\u6876\u4ED3\u5E93\uFF08packages/dsh-ssh\uFF09\u7EDF\u4E00\u7EF4\u62A4\u3002\u80FD\u529B\uFF1A\u4E3B\u673A\u914D\u7F6E\u5B58 ~/.dsh/dsh-ssh.json\uFF08\u53EF\u4ECE ~/.ssh/config \u5BFC\u5165\uFF09\uFF1B\u6301\u4E45\u8FDE\u63A5\u6C60\u590D\u7528\u957F\u8FDE\u63A5\uFF08\u7A7A\u95F2 30 \u5206\u949F\u81EA\u52A8\u65AD\u5F00\uFF09\uFF1Bssh_list \u5217\u51FA\u4E3B\u673A\u3001ssh_exec \u6267\u884C\u8FDC\u7A0B\u547D\u4EE4\u3001ssh_upload/ssh_download \u4F20\u8F93\u6587\u4EF6\u3001ssh_tunnel \u672C\u5730\u7AEF\u53E3\u8F6C\u53D1\uFF08\u8BBF\u95EE\u8FDC\u7A0B\u6570\u636E\u5E93/\u5185\u7F51\u670D\u52A1\uFF09\u3001ssh_cluster \u96C6\u7FA4\u5E76\u53D1\u6267\u884C\uFF1B\u652F\u6301\u5BC6\u94A5/\u5BC6\u7801\u8BA4\u8BC1\u3001passphrase \u5BC6\u94A5\u4E0E ProxyJump \u8DF3\u677F\u673A\uFF1BWeb \u7EC8\u7AEF\u8D70 WebSocket\u3002\u9650\u5236\uFF1A\u4E3B\u673A\u64CD\u4F5C\u7531\u7528\u6237\u5728 GUI \u4E2D\u914D\u7F6E\u540E agent \u65B9\u53EF\u4F7F\u7528\uFF1B\u5BC6\u7801\u4EE5\u660E\u6587\u5B58\u5728\u7528\u6237\u4E3B\u76EE\u5F55\u79C1\u6709\u6587\u4EF6\uFF08\u6743\u9650 0600\uFF09\uFF1B\u547D\u4EE4\u8F93\u51FA\u539F\u6837\u8FD4\u56DE\u3001\u53EF\u80FD\u542B\u654F\u611F\u4FE1\u606F\uFF1B\u65AD\u7EBF\u91CD\u8FDE\u53EF\u80FD\u91CD\u653E\u975E\u5E42\u7B49\u547D\u4EE4\uFF1B\u4F20\u8F93/\u6267\u884C\u6D88\u8017\u771F\u5B9E\u8FDC\u7A0B\u8D44\u6E90\uFF0C\u5148\u786E\u8BA4\u518D\u64CD\u4F5C\u3002\u7528\u6237\u63D0\u5230\u300CSSH / \u8FDC\u7A0B\u670D\u52A1\u5668 / \u670D\u52A1\u5668\u64CD\u4F5C / \u8DF3\u677F\u673A / \u96A7\u9053 / \u90E8\u7F72 / \u4E0A\u4F20\u4E0B\u8F7D\u300D\u65F6\u5373\u6307\u672C\u63D2\u4EF6\uFF0C\u8BF7\u636E\u6B64\u534F\u4F5C\u3002";
/**
 * Mount the SSH engine, routes, tools, and announcement.
 * @param ctx - host plugin context carrying webServer/tools/systemPrompt.
 * @param config - resolved plugin config (schema defaults applied by the loader).
 */
export declare function apply(ctx: Context, config?: Config): void;
