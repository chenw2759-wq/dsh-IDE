import { SshEngine, HostStore } from '@deepseek-ai/dsh-ssh';
import z from 'schemastery';
import { RemoteModeStore } from "./store.js";
import { makeRoutes } from "./routes.js";
import { makeWorkspaceTools } from "./tools.js";
/** Stable cordis plugin name. */
export const name = 'easyssh';
/**
 * Services required before the workspace surfaces can mount. `webServer` is
 * deliberately NOT here: headless profiles lack it, and a hard inject would
 * block the whole load tree — routes register through the dynamic
 * ctx.inject(['webServer'], …) below (DSH 插件规范 §4.2).
 */
export const inject = ['tools', 'systemPrompt'];
export const Config = z.object({
    enabled: z.boolean().default(true),
    announceToAgent: z.boolean().default(true),
});
/** Order of the announcement section (right after the dsh-ssh section at 150). */
const SECTION_ORDER = 160;
/** Model-facing announcement: mode semantics, transparent remoting, limits. */
export const WORKSPACE_GUIDANCE = '本机已安装 dsh-easyssh 插件（SSH 远程工作区）：右上角（session log 左侧）的按钮用于配置 SSH 主机（密码/密钥，复用 dsh-ssh 的 ~/.dsh/dsh-ssh.json）并进入/退出「SSH 模式」；进入后左侧文件树面板与文件操作指向远程服务器，而 LLM 与 Agent 循环仍在本机运行。模式语义（重要）：SSH 模式下本插件的接缝切换已把 read/write/edit/glob/grep 与 bash/终端透明切换到远程主机执行——你**不需要**特殊工具，正常使用 read/write/edit/bash 即可操作远程；路径规则：远程绝对路径直接用；相对路径以远程根目录 remoteRoot 为基准（用 remote_status 查询）；**不要**使用 Windows 本机路径（C:\\、M:\\ 等）。remote_* 工具（remote_status/remote_ls/remote_read/remote_write/remote_mkdir/remote_rm/remote_rename/remote_glob/remote_grep）仍可用作显式操作；ssh_exec/ssh_upload/ssh_download 用于一次性运维。用户不需要手动操作文件：编辑、新建、保存、删除、重命名全部由你经 SFTP 直接完成，用户只描述意图。限制：远程操作消耗真实远程资源，先确认再执行；命令输出原样返回、可能含敏感信息；远程 grep/glob 有限深与条数上限；SSH 模式下本机沙箱不对远程执行生效。用户提到「SSH 模式 / 远程工作区 / 远程文件 / 远程项目 / 远程服务器上改代码」时即指本插件，请据此协作。';
/**
 * Mount the mode store, routes, tools, announcement, and the shared core.
 * @param ctx - host plugin context carrying tools/systemPrompt (webServer optional).
 * @param config - resolved plugin config (schema defaults applied by the loader).
 */
export function apply(ctx, config) {
    const resolved = {
        enabled: config?.enabled ?? true,
        announceToAgent: config?.announceToAgent ?? true,
    };
    const store = new RemoteModeStore();
    const hosts = new HostStore();
    const engine = new SshEngine(hosts);
    ctx.effect(() => () => {
        engine.dispose();
    }, 'dsh-easyssh: engine');
    // The shared core is ALWAYS provided: the seam-switch rows (./fs,
    // ./subprocess) inject it, and they replace the deployment's fs/subprocess
    // providers — starving them would break the model's file tools.
    const core = { store, hosts, engine };
    ctx.provide('easysshCore', core);
    if (!resolved.enabled)
        return;
    const routes = makeRoutes({ store, hosts, engine });
    // webServer is optional (headless profiles lack it): dynamic inject keeps
    // this plugin loadable everywhere, mounting routes only when it appears.
    // The inject callback receives a scoped Context with the service available.
    ctx.inject(['webServer'], (scoped) => {
        const disposers = routes.map(route => scoped.webServer.register(route));
        return () => {
            for (const dispose of disposers)
                dispose();
        };
    });
    const tools = makeWorkspaceTools({ store, engine });
    ctx.effect(() => {
        const disposers = tools.map(tool => ctx.tools.register(tool));
        return () => {
            for (const dispose of disposers)
                dispose();
        };
    }, 'dsh-easyssh: tools');
    if (resolved.announceToAgent) {
        ctx.systemPrompt.section({
            name: 'plugin:dsh-easyssh',
            order: SECTION_ORDER,
            text: WORKSPACE_GUIDANCE,
        });
    }
}
