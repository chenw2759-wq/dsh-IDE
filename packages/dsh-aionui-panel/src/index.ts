/**
 * @deepseek-ai/dsh-client-ui-aionui-panel — host half: the workspace-gated
 * filesystem + git services and the /aionui-panel/* HTTP routes (JSON
 * operations + SSE change stream) on the shared webserver. The browser half
 * (exports "./client") is served by client-modules from the same package's
 * dsh.client declaration.
 *
 * The host half also announces the plugin to every agent through the
 * system-prompt section mechanism (the same band task-board uses), so agents
 * know the right-panel system exists and how to cooperate with it.
 *
 * SSH-mode delegation: when the dsh-ssh-workspace plugin is present, its
 * `sshWorkspaceCore` service (mode store + engine) is read dynamically and
 * handed to the fs service, so the panel shows the remote workspace while the
 * GUI is in SSH mode.
 *
 * AionUi right-panel design (Apache-2.0, iOfficeAI/AionUi) — re-implemented
 * from measured behavior and architecture, not copied code.
 * @module @deepseek-ai/dsh-client-ui-aionui-panel
 */

import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-host-webserver'
import type {} from '@deepseek-ai/dsh-subprocess'
import type { SubprocessSpawnSpec } from '@deepseek-ai/dsh-subprocess'
import type {} from '@deepseek-ai/dsh-workspace'
import type {} from '@deepseek-ai/dsh-system-prompt'
import { FsService, type SshCoreLike } from './host/fs-service.ts'
import { GitService, subprocessRunner } from './host/git-service.ts'
import { createWorkspaceGate } from './host/gate.ts'
import { registerPanelRoutes, type ExecSeam } from './host/routes.ts'

/** Required services: the route registry, the managed subprocess seam, the workspace registry, and the prompt band. */
export const inject = ['webServer', 'subprocess', 'workspaceRegistry', 'systemPrompt']

/** Order of the announcement section within the tool-guidance band. */
const SECTION_ORDER = 210

/** POSIX single-quote a shell argument (the remote exec wraps `cd <dir> &&`). */
function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`
}

/** Model-facing announcement: plugin presence, capabilities, and limits. */
export const AIONUI_PANEL_GUIDANCE = '本机已安装 dsh-aionui-panel 插件（DSH Web GUI 的右侧面板系统）：项目会话打开时，聊天区右侧出现「预览」与「文件/变更」两块面板。能力：Explorer 文件树（点击文件在预览面板打开、整行点击展开文件夹、按文件名搜索定位）；Preview 多 tab 预览（markdown/html/code/diff/csv/pdf/office/图片/文本等格式，支持源码/预览切换、分屏编辑、保存）；SCM 变更面板（真实 git stage/unstage/discard）；面板宽度可拖拽调整（Explorer 220~500px、Preview 340~1200px），双击把手复位默认宽度，折叠状态与宽度按项目持久化（localStorage）。数据源为当前会话工作目录的真实文件系统与真实 git 仓库，宿主进程经 /aionui-panel/* 路由提供。SSH 模式（dsh-ssh-workspace）下同一面板自动切换为远程文件树与远程编辑。用户提到「右侧面板 / 预览面板 / 文件树 / 变更面板」时即指本插件，请据此协作。'

/**
 * Mount the panel data services and their routes.
 * @param ctx - context carrying webServer, subprocess, workspaceRegistry, systemPrompt.
 */
export function apply(ctx: Context): void {
  const gate = createWorkspaceGate(ctx)
  // Dynamic getter: the workspace plugin may load before or after this one;
  // the core is re-read on every operation, so SSH delegation always sees
  // the current mode without a hard cross-plugin inject.
  const getRemote = (): SshCoreLike | undefined => ctx.get('sshWorkspaceCore') as SshCoreLike | undefined
  const fs = new FsService(gate, getRemote)
  const git = new GitService(subprocessRunner(ctx), gate, (root, rel) => fs.delete(root, rel))

  // Command-run seam: remote mode rides the SSH engine; local mode uses the
  // managed subprocess seam (same as the git runner).
  const exec: ExecSeam = {
    async run(command, cwd, timeoutMs) {
      const remote = getRemote()
      const state = remote?.store.getSnapshot()
      if (remote !== undefined && state?.mode === 'remote' && state.alias !== undefined && state.remoteRoot !== undefined) {
        try {
          // Run inside the remote workspace root so relative paths resolve
          // there (the engine's login shell starts in $HOME, not remoteRoot).
          const wrapped = cwd !== undefined && cwd !== ''
            ? `cd ${shellQuote(cwd)} && ${command}`
            : command
          const result = await remote.engine.exec(
            state.alias as string,
            wrapped,
            timeoutMs ?? 60_000,
          )
          return { ok: result.success, code: result.success ? 0 : 1, stdout: result.stdout, stderr: result.stderr }
        } catch (error) {
          return { ok: false, code: 1, stdout: '', stderr: error instanceof Error ? error.message : String(error) }
        }
      }
      try {
        const spec: SubprocessSpawnSpec = {
          argv: process.platform === 'win32' ? ['cmd', '/c', command] : ['sh', '-c', command],
          cwd: cwd ?? process.cwd(),
          // UTF-8 everywhere: Windows cmd defaults to GBK, which crashes on
          // non-GBK output (emoji, CJK) — force UTF-8 so the terminal shows
          // the real bytes.
          env: process.platform === 'win32'
            ? { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' }
            : undefined,
          stdio: {
            stdin: 'ignore',
            stdout: { maxBytes: 4 << 20 },
            stderr: { maxBytes: 4 << 20 },
          },
          graceMs: 10_000,
        }
        const handle = ctx.subprocess.spawn(spec)
        const outcome = await handle.done
        const stdout = handle.collected.stdout?.readFrom(0).text ?? ''
        const stderr = handle.collected.stderr?.readFrom(0).text ?? ''
        return { ok: outcome.exitCode === 0, code: outcome.exitCode, stdout, stderr }
      } catch (error) {
        return { ok: false, code: 1, stdout: '', stderr: error instanceof Error ? error.message : String(error) }
      }
    },
  }

  ctx.effect(() => registerPanelRoutes(ctx, fs, git, exec), 'dsh-aionui-panel: /aionui-panel routes')
  ctx.effect(() => ctx.systemPrompt.section({
    name: 'plugin:aionui-panel',
    order: SECTION_ORDER,
    text: AIONUI_PANEL_GUIDANCE,
  }), 'dsh-aionui-panel: prompt section')
}
