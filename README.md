# dsh-IDE — DSH Web GUI 一体化开发环境（JupyterLab 风格工作区 + SSH 远程开发）

<p align="center">
  <img src="https://img.shields.io/badge/dsh-plugin-2ea44f" alt="dsh-plugin">
  <img src="https://img.shields.io/badge/node-%3E%3D22-339933" alt="node">
  <img src="https://img.shields.io/badge/license-BSD--3--Clause-blue" alt="license">
</p>

> **中文** | [English](README.en.md)

把 DeepSeek Harness（DSH）Web GUI 升级为**一体化开发环境**：右侧面板提供文件树、带行号与斑马底纹的
代码编辑器、命令行终端、Trae 风格编辑 diff、类型颜色标签、多格式预览——开箱即用的 JupyterLab 式
工作区；同时内置 **SSH 远程工作区模式**：右上角（session log 左侧）配置 SSH 主机（密码 / 密钥，复用
`~/.dsh/dsh-ssh.json`），进入后右侧面板自动切换为远程文件树，**模型本机的
read / write / edit / glob / grep 与 bash / 终端在 SSH 模式下透明地在远程服务器执行**，LLM 与 Agent
循环仍在本机——「本地大脑、远程手脚」。

## 功能总览

### ⚙️ 右边栏工作区设置（系统设置内）

「设置」→「右边栏工作区」栏目集中管理右栏工作区的**功能开关**（8 项：自动 diff / 监视圆点 / Git 角标 / 语法高亮 / 缩放预览 / 三栏 IDE / 终端停靠 / 会话隔离）与**编辑工具栏工具**（9 项，供富文本编辑选用），圆角卡片 + 开关，改动即时生效并持久化。

### 🖼️ Markdown 预览（三种布局）

Markdown 文件在面板中直接渲染预览（青色标签），并支持三种布局随意切换：

- **下框展示（⇊）**：预览显示在下栏
- **右侧弹出（⇉）**：预览显示在右侧代码栏
- **浮动覆盖（⇱）**：浮动覆盖在对话框上方，宽度更大

![Markdown 预览](docs/markdown预览.png)
![Markdown 预览-右栏](docs/markdown预览-右栏.png)
![Markdown 预览-下栏](docs/markdown预览-下栏.png)

### 🌳 左侧文件树

左侧文件树：懒加载、按文件名搜索定位、**Git 状态角标**（A/M/D/R/U/C）、右键菜单（**新建文件 / 新建文件夹** / 下载 / **行内重命名** / 复制 / 粘贴 / **删除进回收站**），本地目录与 SSH 远程目录自动切换；已打开的文件**绝不重复开 tab**，磁盘变化时在原 tab 上自动刷新内容。

![左栏](docs/左栏.png)

**🔍 监视路径（自动弹出范围）**：默认只监视**一级目录**（根目录及其直接子目录下的文件）。
点击目录行右侧**圆点**逐级切换：**浅黄** = 监视此目录下一级路径，**绿色** = 监视此目录下**所有层级（n级）**，再点恢复默认；监视标记按会话记忆。顶栏（文件 / 变更 / >_ 右侧）有规则说明框。构建产物、临时文件、锁文件等**过程文件无论标记都不弹出**。

![监视路径](docs/监视路径.png)

### 📊 状态栏

底部状态栏展示工作区状态。

![状态栏](docs/状态栏.png)

### ✏️ 支持代码即时编辑

代码区即时编辑：**五颜六色的语法高亮**（Trae 风格配色，**跟随浅色/深色主题自动切换**）+ 行号 + 斑马底纹，可读写编辑、Ctrl+S 保存、保存带 mtime 冲突检测；工具栏提供分屏（编辑器 | 预览）、刷新等操作。

![支持代码即时编辑](docs/支持代码即时编辑.png)

### 🔴🟢 红绿标注（Trae 风格编辑 diff）

**任何外部编辑**（Agent 工具写文件、其他进程改动）都会自动弹出「Update(路径)」卡片到**下栏**——
Added/removed 统计 + 删除行红底、新增行绿底；每个文件的每次编辑都会弹（基线自动推进，不重复不遗漏）；
保存后同样弹出：

- **全新文件（无历史基线）自动弹出全绿卡片**（整份文件视为新增）
- **文件被删除自动弹出全红卡片**（整份文件视为移除）
- diff 卡带固定**双列行号**（旧 / 新各一列，增删行号对齐）、未变更行斑马底纹
- 点「**编辑最新版本**」→ 编辑器覆盖整个显示框，可直接修改最新代码并保存（保存后红绿自动更新）；
  点「**刷新**」红绿不丢失

![红绿标注](docs/红绿标注.png)

### 🎨 颜色标记（类型颜色标签）

每个打开的标签带类型色块——**橙** = 图片、**绿** = CSV、**蓝** = Python、**黄** = JS/TS、**紫** = JSON、
**青** = Markdown、**红** = diff、**灰** = 日志——标签再多也能一眼分辨；新打开的文件与 diff 自动滚到
可见位置，标签条横向滚动 + 标题截断，绝不拥挤。

![颜色标记](docs/颜色标记.png)

### ⌨️ 命令行展示（终端与运行）

内置命令行终端：代码工具栏「▶ 运行」直接执行当前文件（python / node / bash 等），「>_ 终端」打开
命令行面板随时输入命令（SSH 模式下均在远程执行）；文件栏 tab 条也有独立终端入口。终端以
**真实终端风格**停靠在聊天栏底部五分之一处（黑体、macOS 圆点标题、❯ 提示符、绿光标，不与对话重叠）。

![命令行展示](docs/命令行展示.png)

![终端](docs/终端.png)

### 📜 日志预览

日志文件（灰色标签）在面板中直接预览。

![日志预览](docs/日志预览.png)

### 🖼️ 图片预览 / 📋 CSV 预览 / 🌐 HTML 预览

- **图片**（橙色标签）与 **HTML**（紫色标签）预览支持**放大/缩小**：工具栏 − / % / + / 1:1 / 适应宽度，或 **Ctrl+滚轮**缩放
- **CSV** 数据表渲染为表格（绿色标签）

![图片预览](docs/图片预览.png)
![CSV 预览](docs/csv预览.png)
![HTML 预览](docs/html预览.png)

### 🎚️ 多标签拖拽排序 + 三栏 IDE 布局

- 预览标签可**拖拽排序**（拖动 tab 到目标位置）
- 布局四态循环：下框（⇊）/ 右侧弹出（⇉）/ 浮动（⇱）/ **三栏 IDE（⿻）**——对话 | 文件树 | 预览三栏并排
- **预览自由拖拽**：side 布局下拖动预览列宽度把手（0~½ 界面宽，变大即压缩对话、永不覆盖）；float 布局下按住预览标签栏可把浮动窗拖到任意位置（位置记忆 + 180ms 缓动动画）
- **聚焦模式**：预览打开时点文件栏「>_」旁的折叠箭头，文件树收为约 30px 右栏 rail（仅留小圆角展开按钮），点击即展开，专注预览与编辑

### 🧬 R 语言支持

`.R` / `.r` 脚本以 **Rscript** 运行（▶ 运行），R 标签用 R 官方蓝；`.Rmd`（R Markdown）识别为
Markdown 可预览渲染；代码高亮原生支持 R。

### 🚀 SSH 远程开发（本地大脑、远程手脚）

- **接缝切换**：通过 profile 补丁把 `ctx.fs` / `ctx.subprocess` 切换为模式路由门面——本地模式委托
  给部署自带的沙箱化实现，SSH 模式委托给 SFTP/SSH 远程实现（原子写、版本校验、CRLF 处理、流式输出、
  PTY 终端）。模型工具零改动地远程执行。
- **远程文件系统**：完整 `@deepseek-ai/dsh-fs` 实现，路径 / 版本 / 原子写 / CRLF / 规范路径传输。
- **远程子进程**：完整 `@deepseek-ai/dsh-subprocess` 实现，exec + PTY 终端，输出溢出转储到本地。
- **多主机**：GUI 配置多台主机（含 ProxyJump 跳板链、密钥 passphrase），一键切换；设置页主机管理
  专区（增删改 / 测试连接 / 进入退出），配置持久化在 `~/.dsh/dsh-ssh.json`。
- **符号链接跟随**：远程文件树正确识别符号链接目录（如 AutoDL 的 `/root/autodl-tmp`）。
- **显式远程工具**：`remote_status` / `remote_ls` / `remote_read` / `remote_write` / `remote_mkdir` /
  `remote_rm` / `remote_rename` / `remote_glob` / `remote_grep`，以及 `ssh_exec` / `ssh_upload` /
  `ssh_download`。

![SSH 配置](docs/ssh配置.png)

SSH 主机配置：别名 / 主机 / 端口 / 用户名 / 密码或密钥 / 远程根目录，保存并测试连接后一键进入 SSH 模式。

![SSH 远程工作区](docs/ssh远程工作区.png)

进入 SSH 模式后，右侧面板自动切换为远程文件树，read / write / edit / glob / grep 与终端透明地在远程服务器执行。

## 操作速览

- **布局切换**：预览 tab 条右侧「⇊ / ⇉ / ⇱」循环切换——下框展示 / 右侧弹出代码框 / 浮动覆盖（更宽）。
- **编辑文件**：打开 `.py` / `.md` / `.js` 等文件 → 直接输入 → Ctrl+S 保存（mtime 冲突检测）。
- **运行代码**：打开 `.py` / `.js` / `.sh` 等文件 → 工具栏「▶ 运行」，SSH 模式下在远程主机执行。
- **打开终端**：预览工具栏「>_ 终端」，或文件栏 tab 条「>_」按钮（不打开代码也能开命令行）。
- **查看 diff**：外部编辑 / 保存后自动弹卡；点「编辑最新版本」直接改，点「刷新」保留红绿。
- **文件右键**：文件树节点右键 → 下载 / 重命名 / 复制 / 粘贴 / 删除（本地与远程一致）。

## 仓库结构

```
dsh-IDE/
├── packages/
│   ├── dsh-aionui-panel/ # 右侧面板系统：文件树/预览/终端/编辑 diff/类型色标签（IDE 工作区本体）
│   ├── dsh-ssh/          # SSH 引擎：ssh2 连接池、exec/PTY/SFTP/隧道/集群（SSH 远程模式依赖）
│   └── dsh-easyssh/      # SSH 远程工作区：模式状态机、接缝门面、远程实现、Web GUI 前端
└── README.md
```

> 右侧文件面板（文件树 / 预览 / 终端 / 右键菜单 / 编辑 diff）由 **dsh-aionui-panel**（DSH Web GUI 右侧
> 面板系统）提供，本仓库内与 dsh-IDE 配套维护；dsh-easyssh 通过 `sshWorkspaceMode` 跨插件服务驱动它
> 跟随 SSH 模式。SSH 远程开发只是 dsh-IDE 的能力之一——本地目录同样享受完整的 IDE 工作区。

## 安装

前置要求：Node.js ≥ 22、pnpm、已安装 dsh（`npx @deepseek-ai/dsh`）。

```sh
# 1) 克隆并构建
git clone https://github.com/chenw2759-wq/dsh-IDE.git
cd dsh-IDE
pnpm install
pnpm --filter "./packages/dsh-aionui-panel" build
pnpm --filter "./packages/dsh-ssh" build
pnpm --filter "./packages/dsh-easyssh" build

# 2) 把三个包安装到 web profile（注意用你自己的绝对路径）
dsh plugin --profile web add file:C:/你的路径/dsh-IDE/packages/dsh-aionui-panel
dsh plugin --profile web add file:C:/你的路径/dsh-IDE/packages/dsh-ssh
dsh plugin --profile web add file:C:/你的路径/dsh-IDE/packages/dsh-easyssh
```

> 仓库品牌为 dsh-IDE；核心插件包名沿用 `dsh-easyssh`（安装标识，不随品牌改名）。

> 💡 **pnpm 构建放行（一行）**：dsh-ssh 依赖的原生库（ssh2 / cpu-features）需要构建。pnpm 10+
> 默认阻止依赖构建脚本，`dsh plugin add` 会报
> `ERR_PNPM_IGNORED_BUILDS: Ignored build scripts: cpu-features@0.0.10, ssh2@1.17.0`，并在
> `<profile>/pnpm-workspace.yaml` 里**自动写入占位**：
>
> ```yaml
> allowBuilds:
>   cpu-features: set this to true or false
>   ssh2: set this to true or false
> ```
>
> 把两个 `set this to true or false` 改成 `true`，然后**重新执行第 2 步的 `dsh plugin add`**
> （重复执行是幂等的）。这是 pnpm 的标准流程，任何带原生依赖的插件都一样。

### 第 3 步：接缝切换（自动，无需手动）

安装 dsh-easyssh 时，其自带的 `cordis.patch.yml`（经 `dsh.bundle.patch` 声明）会作为 profile
bundle 层**自动应用**：禁用部署自带的 `fs-sandbox` / `subprocess`，挂载模式路由门面
`easyssh-fs` / `easyssh-subprocess`（SSH 模式下模型工具透明地远程执行；本地模式委托回同一套
沙箱实现）。**不需要手动编辑 `<profile>/cordis.patch.yml`**。

> ⚠️ **升级用户必读**：手动写入接缝补丁只属于 **0.1.0 之前的旧版本**。若你按旧文档在
> `<profile>/cordis.patch.yml`（Windows 默认 `C:\Users\<你>\.dsh\profiles\web\cordis.patch.yml`）
> 里写过手写补丁，升级后必须把它**删除（恢复为 `[]`）**——否则自动补丁 + 手写补丁各插入一次
> 相同的 `ssh-workspace-fs` / `ssh-workspace-subprocess` 行，启动会报
> `duplicate loader entry id` 错误。删除后重启即可（自动补丁内容与旧手写补丁一致，行 id 相同）。

### 第 4 步：重启

```sh
# 重启 dsh
npx @deepseek-ai/dsh web
```

打开 `http://127.0.0.1:3080` → **Ctrl+F5 硬刷新**（浏览器缓存旧 client 包时必做）→ 右上角 SSH 按钮配置主机 → 进入 SSH 模式。

> 回滚 = 把 `cordis.patch.yml` 恢复为 `[]` 再重启。

## 使用

1. 会话右上角（session log 左侧）点击 **SSH** → 填主机（别名/主机/端口/用户名/密码或密钥/远程根）
   → 保存并测试 → 进入 SSH 模式。
2. 右侧面板自动切换到远程文件树；直接对 Agent 说「读/改远程文件」「在服务器上执行命令」——普通工具即远程执行。
3. 路径规则：远程绝对路径直接用；相对路径以远程根 `remoteRoot`（默认 `~`）为基准；不要用 Windows 本机路径。
4. 右上角切换按钮随时回到本机模式。

## 安全

- 路由仅 loopback（同源校验）；认证材料存 `~/.dsh/dsh-ssh.json`（0600）。
- 远程操作消耗真实远程资源，先确认再执行；**SSH 模式下本机沙箱不对远程执行生效**。
- 远程 grep/glob/realpath 依赖 GNU find/grep/coreutils。

## 致谢

远程 `ctx.fs` / `ctx.subprocess` 实现移植并改编自 [UynajGI/dsh-ssh](https://github.com/UynajGI/dsh-ssh)
（MIT，详见各文件头与 NOTICE），在其基础上补全了 Web GUI 前端与运行时模式切换。

## License

BSD-3-Clause。远程实现的 MIT 版权归 UynajGI/dsh-ssh 原作者（见 NOTICE）。
