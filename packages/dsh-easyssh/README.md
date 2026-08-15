# dsh-ssh-workspace — SSH 远程工作区插件

在 DSH Web GUI 中一键进入「SSH 模式」：右上角（session log 左侧）配置 SSH 主机
（密码 / 密钥，复用 dsh-ssh 的 `~/.dsh/dsh-ssh.json`），确认后左侧出现远程文件树
面板；**本地 harness 通过 SSH/SFTP 操作远程服务器**（LLM 与 Agent 循环仍在本机），
右上角切换按钮随时切回本机 UI。

## 双轨架构（v2 接缝级）

SSH 模式下的远程执行走**两条轨**：

1. **接缝切换（v2，默认路径）**：profile 补丁（`profiles/web/cordis.patch.yml`）
   禁用部署自带的 `fs-sandbox` / `subprocess` 行，由本插件提供模式路由门面
   （`@deepseek-ai/dsh-ssh-workspace/fs`、`/subprocess`）。本地模式门面委托给
   同样的沙箱化本地实现（`SandboxedFileSystem` / `LocalSubprocessRuntime`，
   挂在隔离子作用域）；SSH 模式委托给移植自 [UynajGI/dsh-ssh](https://github.com/UynajGI/dsh-ssh)
   （MIT）的远程实现。效果：**模型本机的 read/write/edit/glob/grep 与 bash/终端
   在 SSH 模式下透明地在远程主机执行**，无需提示词约定。
2. **显式工具（v1，保留）**：`remote_status` / `remote_ls` / `remote_read` /
   `remote_write` / `remote_mkdir` / `remote_rm` / `remote_rename` /
   `remote_glob` / `remote_grep` 与 `ssh_exec` / `ssh_upload` / `ssh_download`
   仍可用作显式操作与一次性运维。

**路径语义（SSH 模式）**：远程绝对路径直接用；相对路径以远程根目录
`remoteRoot`（默认 `~`，可在左侧面板头部切换）为基准；**不要使用 Windows 本机路径**。

## 能力

| 能力 | 说明 |
| --- | --- |
| 右上角按钮 | `conversation.session.header.utilities` 槽位（order -10 / -9，位于 session log 左侧） |
| 配置对话框 | 别名 / 主机 / 端口 / 用户名 / 密码或密钥（含 passphrase）/ 远程根（默认 `~`）；保存进 dsh-ssh 共享主机配置并测试连接 |
| SSH 模式 | 模式状态机 local ⇄ remote@alias（宿主进程单例）；远程根经连接解析为绝对路径并作为路径 gate 前缀 |
| 左侧文件树面板 | 在 `[data-dsh-frame]` grid 前插一列（与 aionui 右侧面板协同，互不覆盖）；懒加载树 / 文件名搜索（跳过 .git、node_modules）/ 文本预览与编辑 / 保存带 mtime 冲突检测 / 宽度与折叠按项目持久化 |
| 接缝切换 | `ctx.fs` / `ctx.subprocess` 模式路由门面（本地 = 沙箱化原实现；远程 = SFTP/SSH 实现，含原子写、版本、CRLF、流式输出、PTY 终端） |
| Agent 工具 | `remote_*` 九工具（显式远程操作，门禁在 remoteRoot 内） |
| 提示词宣告 | systemPrompt section（order 160）：SSH 模式下普通 fs/bash 工具即远程执行；路径规则；限制说明 |

## 安全模型

- `/api/dsh-ssh-workspace/*` 仅限 loopback（同源校验），与 dsh-ssh 一致。
- 认证材料沿用 dsh-ssh 信任模型（`~/.dsh/dsh-ssh.json`，0600/0700），不新增存储。
- 路径 gate：远程操作 root 必须等于模式内的 resolved remoteRoot；相对路径禁止 `..`。
- 远程操作消耗真实远程资源：工具描述与宣告段明确"先确认再执行"；grep/glob 限深限条数。
- **SSH 模式下本机沙箱不对远程执行生效**（远程进程无法被本地内核沙箱约束）——
  门面的 `sandboxMode` 在远程模式报告 `undefined`，工具层不再展示沙箱升级提示。

## 依赖

- `@deepseek-ai/dsh-ssh`（file: 工作区依赖）：复用 `SshEngine` / `HostStore`；
  扩展了 `readFile` / `writeFile` / `stat`（含 mode）/ `lstat` / `mkdir` / `rm` /
  `rename` / `readStream` / `openExec`（流式通道）/ `openShell`（PTY，含 signal）。
- 接缝类来自官方 SDK：`@deepseek-ai/dsh-fs` / `dsh-fs-sandbox` / `dsh-subprocess` /
  `dsh-subprocess-local` / `dsh-timeout` / `dsh-sandbox`（rc.6，与部署同版本）。
- 远程 fs/subprocess 实现移植自 UynajGI/dsh-ssh（MIT，文件头保留出处）。
- 本插件的 client 半区不 import dsh-ssh 的任何值（client bundle purity gate）。

## 安装

```sh
# 独立安装（profile 机制，热插拔；需重启 dsh）
dsh plugin --profile <name> add link:<repo>/packages/dsh-ssh-workspace

# 接缝切换补丁（v2 必需，否则只有 remote_* 显式工具轨）：
# 在 <profile>/cordis.patch.yml 写入禁用 fs-sandbox/subprocess 并插入两行的
# patch（见 profiles/web/cordis.patch.yml 示例），然后重启 dsh。
# 回滚：把该文件恢复为 `[]` 并重启。
```

## 开发

```sh
pnpm install --filter @deepseek-ai/dsh-ssh-workspace...
pnpm --filter @deepseek-ai/dsh-ssh-workspace test      # 单测：store + 后端门禁 + 门面路由
pnpm --filter @deepseek-ai/dsh-ssh-workspace build     # tsc -b + tsdown 双半区产物
```

## 已知限制

- v1 模式状态为进程内单例（多标签页共享）；P2 按 sessionId 隔离。
- 预览仅文本 / 代码（80KB 上限）；二进制与超大文件请用 `ssh_exec` / `ssh_download`。
- 远程 grep/glob/realpath 依赖 GNU find/grep/coreutils（-printf / -mz / base64 -w0）；
  限深 4~6 层、限 200 条。
- SSH 模式下 `pwsh` 工具在 POSIX 远程主机上不可用（请用 bash 语义命令或 `ssh_exec`）。
- 断线重连沿用 dsh-ssh 引擎语义；传输/执行消耗真实远程资源。
