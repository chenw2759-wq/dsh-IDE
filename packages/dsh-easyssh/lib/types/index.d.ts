/**
 * dsh-easyssh — host half. Owns the local⇄remote mode store, the
 * /api/dsh-easyssh route family (loopback-only), the remote_* agent
 * tools, a system-prompt announcement, and the shared workspace core
 * (`ctx.easysshCore`) that the two seam-switch rows (./fs, ./subprocess)
 * resolve. In SSH mode the model's ordinary read/write/edit/bash tools run
 * transparently on the remote host through those switch rows. File operations
 * ride the dsh-ssh engine (own SshEngine/HostStore instances over the same
 * ~/.dsh/dsh-ssh.json — the connection pool is per-engine, so this plugin
 * opens its own pooled connections to the same hosts). The browser half
 * (./client) renders the header buttons, the SSH config dialog, and the left
 * workspace panel.
 */
import type { Context } from '@deepseek-ai/cordis';
import z from 'schemastery';
/** Stable cordis plugin name. */
export declare const name = "easyssh";
/**
 * Services required before the workspace surfaces can mount. `webServer` is
 * deliberately NOT here: headless profiles lack it, and a hard inject would
 * block the whole load tree — routes register through the dynamic
 * ctx.inject(['webServer'], …) below (DSH 插件规范 §4.2).
 */
export declare const inject: string[];
/** Plugin config (schemastery; optional fields use .default, never .optional). */
export interface Config {
    /** Master switch (default on). Disabling requires reverting the profile seam patch. */
    enabled: boolean;
    /** Whether the model-facing announcement section is mounted. */
    announceToAgent: boolean;
}
export declare const Config: z<Config>;
/** Model-facing announcement: mode semantics, transparent remoting, limits. */
export declare const WORKSPACE_GUIDANCE = "\u672C\u673A\u5DF2\u5B89\u88C5 dsh-easyssh \u63D2\u4EF6\uFF08SSH \u8FDC\u7A0B\u5DE5\u4F5C\u533A\uFF09\uFF1A\u53F3\u4E0A\u89D2\uFF08session log \u5DE6\u4FA7\uFF09\u7684\u6309\u94AE\u7528\u4E8E\u914D\u7F6E SSH \u4E3B\u673A\uFF08\u5BC6\u7801/\u5BC6\u94A5\uFF0C\u590D\u7528 dsh-ssh \u7684 ~/.dsh/dsh-ssh.json\uFF09\u5E76\u8FDB\u5165/\u9000\u51FA\u300CSSH \u6A21\u5F0F\u300D\uFF1B\u8FDB\u5165\u540E\u5DE6\u4FA7\u6587\u4EF6\u6811\u9762\u677F\u4E0E\u6587\u4EF6\u64CD\u4F5C\u6307\u5411\u8FDC\u7A0B\u670D\u52A1\u5668\uFF0C\u800C LLM \u4E0E Agent \u5FAA\u73AF\u4ECD\u5728\u672C\u673A\u8FD0\u884C\u3002\u6A21\u5F0F\u8BED\u4E49\uFF08\u91CD\u8981\uFF09\uFF1ASSH \u6A21\u5F0F\u4E0B\u672C\u63D2\u4EF6\u7684\u63A5\u7F1D\u5207\u6362\u5DF2\u628A read/write/edit/glob/grep \u4E0E bash/\u7EC8\u7AEF\u900F\u660E\u5207\u6362\u5230\u8FDC\u7A0B\u4E3B\u673A\u6267\u884C\u2014\u2014\u4F60**\u4E0D\u9700\u8981**\u7279\u6B8A\u5DE5\u5177\uFF0C\u6B63\u5E38\u4F7F\u7528 read/write/edit/bash \u5373\u53EF\u64CD\u4F5C\u8FDC\u7A0B\uFF1B\u8DEF\u5F84\u89C4\u5219\uFF1A\u8FDC\u7A0B\u7EDD\u5BF9\u8DEF\u5F84\u76F4\u63A5\u7528\uFF1B\u76F8\u5BF9\u8DEF\u5F84\u4EE5\u8FDC\u7A0B\u6839\u76EE\u5F55 remoteRoot \u4E3A\u57FA\u51C6\uFF08\u7528 remote_status \u67E5\u8BE2\uFF09\uFF1B**\u4E0D\u8981**\u4F7F\u7528 Windows \u672C\u673A\u8DEF\u5F84\uFF08C:\\\u3001M:\\ \u7B49\uFF09\u3002remote_* \u5DE5\u5177\uFF08remote_status/remote_ls/remote_read/remote_write/remote_mkdir/remote_rm/remote_rename/remote_glob/remote_grep\uFF09\u4ECD\u53EF\u7528\u4F5C\u663E\u5F0F\u64CD\u4F5C\uFF1Bssh_exec/ssh_upload/ssh_download \u7528\u4E8E\u4E00\u6B21\u6027\u8FD0\u7EF4\u3002\u7528\u6237\u4E0D\u9700\u8981\u624B\u52A8\u64CD\u4F5C\u6587\u4EF6\uFF1A\u7F16\u8F91\u3001\u65B0\u5EFA\u3001\u4FDD\u5B58\u3001\u5220\u9664\u3001\u91CD\u547D\u540D\u5168\u90E8\u7531\u4F60\u7ECF SFTP \u76F4\u63A5\u5B8C\u6210\uFF0C\u7528\u6237\u53EA\u63CF\u8FF0\u610F\u56FE\u3002\u9650\u5236\uFF1A\u8FDC\u7A0B\u64CD\u4F5C\u6D88\u8017\u771F\u5B9E\u8FDC\u7A0B\u8D44\u6E90\uFF0C\u5148\u786E\u8BA4\u518D\u6267\u884C\uFF1B\u547D\u4EE4\u8F93\u51FA\u539F\u6837\u8FD4\u56DE\u3001\u53EF\u80FD\u542B\u654F\u611F\u4FE1\u606F\uFF1B\u8FDC\u7A0B grep/glob \u6709\u9650\u6DF1\u4E0E\u6761\u6570\u4E0A\u9650\uFF1BSSH \u6A21\u5F0F\u4E0B\u672C\u673A\u6C99\u7BB1\u4E0D\u5BF9\u8FDC\u7A0B\u6267\u884C\u751F\u6548\u3002\u7528\u6237\u63D0\u5230\u300CSSH \u6A21\u5F0F / \u8FDC\u7A0B\u5DE5\u4F5C\u533A / \u8FDC\u7A0B\u6587\u4EF6 / \u8FDC\u7A0B\u9879\u76EE / \u8FDC\u7A0B\u670D\u52A1\u5668\u4E0A\u6539\u4EE3\u7801\u300D\u65F6\u5373\u6307\u672C\u63D2\u4EF6\uFF0C\u8BF7\u636E\u6B64\u534F\u4F5C\u3002";
/**
 * Mount the mode store, routes, tools, announcement, and the shared core.
 * @param ctx - host plugin context carrying tools/systemPrompt (webServer optional).
 * @param config - resolved plugin config (schema defaults applied by the loader).
 */
export declare function apply(ctx: Context, config?: Config): void;
//# sourceMappingURL=index.d.ts.map