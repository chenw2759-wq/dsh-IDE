# dsh-IDE — An All-in-One IDE for the DSH Web GUI (JupyterLab-style Workspace + SSH Remote Development)

<p align="center">
  <img src="https://img.shields.io/badge/dsh-plugin-2ea44f" alt="dsh-plugin">
  <img src="https://img.shields.io/badge/node-%3E%3D22-339933" alt="node">
  <img src="https://img.shields.io/badge/license-BSD--3--Clause-blue" alt="license">
</p>

> [中文](README.md) | **English**

Turn the DeepSeek Harness (DSH) Web GUI into an **all-in-one development environment**: a right-hand panel
with a file tree, a line-numbered zebra-striped code editor, a command-line terminal, Trae-style edit
diffs, type-colored tabs, and multi-format previews — an out-of-the-box JupyterLab-style workspace. It also
ships with an **SSH remote workspace mode**: configure an SSH host (password / key, reusing
`~/.dsh/dsh-ssh.json`) from the top-right corner (left of the session log); once connected, the right
panel switches to the remote file tree, and **the model's local read / write / edit / glob / grep and
bash / terminal execute transparently on the remote server** while the LLM and agent loop stay local —
"local brain, remote hands".

## Feature Overview

### 🖼️ Markdown Preview (Three Layouts)

Markdown files render directly in the panel (cyan tab), switchable between three layouts:

- **Bottom pane (⇊)**: preview shown in the lower pane
- **Right pane (⇉)**: preview shown in the right code column
- **Floating overlay (⇱)**: floats over the chat, wider

![Markdown Preview](docs/markdown预览.png)
![Markdown Preview - Right](docs/markdown预览-右栏.png)
![Markdown Preview - Bottom](docs/markdown预览-下栏.png)

### 🌳 Left File Tree

Lazy-loaded file tree with filename search, context menu (download / rename / copy / paste / delete),
auto-switching between the local working directory and the SSH remote directory.

![Left Pane](docs/左栏.png)

### 📊 Status Bar

The bottom status bar shows the workspace state.

![Status Bar](docs/状态栏.png)

### ✏️ Live Code Editing

Editable code area with line numbers and zebra striping (aligned to code lines and following scroll),
Ctrl+S save with mtime conflict detection; the toolbar offers split (editor | preview), refresh, and more.

![Live Code Editing](docs/支持代码即时编辑.png)

### 🔴🟢 Red/Green Annotations (Trae-style Edit Diff)

**Any external edit** (agent tool writes, other processes) automatically pops an "Update(path)" card into
the **bottom pane** — Added/removed stats, deleted lines in red, added lines in green; every edit pops its
own card (baseline auto-advances, no repeats, no misses). Saving pops one too:

- **Brand-new files (no baseline) pop an all-GREEN card** (the whole file counts as added)
- **Deleted files pop an all-RED card** (the whole file counts as removed)
- The card carries a fixed **two-column line-number gutter** (old / new aligned), zebra-striped unchanged rows
- Click "**Edit latest version**" — the editor covers the whole frame so you can modify and save the
  latest code directly (red/green refresh automatically); clicking "**Refresh**" never loses the colors

![Red/Green Diff](docs/红绿标注.png)

### 🎨 Color Markers (Type-colored Tabs)

Every open tab carries a type color — **orange** = image, **green** = CSV, **blue** = Python, **yellow** =
JS/TS, **purple** = JSON, **cyan** = Markdown, **red** = diff, **gray** = log — scannable at a glance even
with many tabs; newly opened files and diffs auto-scroll into view, and the tab bar scrolls horizontally
with truncated titles.

![Color Markers](docs/颜色标记.png)

### ⌨️ Terminal & Run

Built-in command-line terminal: "▶ Run" executes the current file directly (python / node / bash etc.),
">_ Terminal" opens a command panel for ad-hoc commands (both run remotely in SSH mode); a standalone
terminal entry also lives on the file tab bar.

![Terminal](docs/命令行展示.png)

### 📜 Log Preview

Log files (gray tab) preview directly in the panel.

![Log Preview](docs/日志预览.png)

### 🖼️ Image Preview

Image files preview directly (orange tab).

![Image Preview](docs/图片预览.png)

### 📋 CSV Preview

CSV data renders as a table (green tab).

![CSV Preview](docs/csv预览.png)

### 🌐 HTML Preview

HTML files support source / preview switching (purple tab).

![HTML Preview](docs/html预览.png)

### 🚀 SSH Remote Development (Local Brain, Remote Hands)

- **Seam switching**: a profile patch routes `ctx.fs` / `ctx.subprocess` through a mode facade — local mode
  delegates to the deployment's sandboxed implementations, SSH mode to SFTP/SSH remote implementations
  (atomic writes, version checks, CRLF handling, streaming output, PTY terminals). Model tools run
  remotely with zero changes.
- **Remote filesystem**: a full `@deepseek-ai/dsh-fs` implementation — paths / versions / atomic writes /
  CRLF / canonical path transfer.
- **Remote subprocess**: a full `@deepseek-ai/dsh-subprocess` implementation — exec + PTY terminal with
  overflow spooling to local disk.
- **Multiple hosts**: configure many hosts in the GUI (ProxyJump chains, passphrase keys), one-click
  switching; a settings-page management section (add / edit / delete / test / enter-exit) persists to
  `~/.dsh/dsh-ssh.json`.
- **Symlink following**: the remote file tree resolves symlinked directories correctly (e.g. AutoDL's
  `/root/autodl-tmp`).
- **Explicit remote tools**: `remote_status` / `remote_ls` / `remote_read` / `remote_write` /
  `remote_mkdir` / `remote_rm` / `remote_rename` / `remote_glob` / `remote_grep`, plus `ssh_exec` /
  `ssh_upload` / `ssh_download`.

![SSH Configuration](docs/ssh配置.png)

SSH host configuration: alias / host / port / user / password or key / remote root — save, test the
connection, then enter SSH mode in one click.

![SSH Remote Workspace](docs/ssh远程工作区.png)

In SSH mode the right panel switches to the remote file tree, and read / write / edit / glob / grep and
the terminal execute transparently on the remote server.

## Quick Start

- **Switch layout**: the "⇊ / ⇉ / ⇱" button on the preview tab bar cycles bottom pane / right pane /
  floating overlay (wider).
- **Edit files**: open `.py` / `.md` / `.js` etc. → type directly → Ctrl+S (mtime conflict check).
- **Run code**: open `.py` / `.js` / `.sh` etc. → "▶ Run" in the toolbar (runs on the remote host in SSH mode).
- **Open a terminal**: ">_ Terminal" in the preview toolbar, or the ">_" button on the file tab bar
  (works without opening a file).
- **See diffs**: cards pop automatically on external edits / saves; "Edit latest version" to modify
  directly, "Refresh" keeps the colors.
- **File context menu**: download / rename / copy / paste / delete (same locally and remotely).

## Repository Layout

```
dsh-IDE/
├── packages/
│   ├── dsh-aionui-panel/ # Right-panel system: file tree/preview/terminal/edit diff/type colors
│   ├── dsh-ssh/          # SSH engine: ssh2 pool, exec/PTY/SFTP/tunnel/cluster
│   └── dsh-easyssh/      # SSH remote workspace: mode state machine, seam facades, remote impl, GUI
└── README.md
```

> The right file panel (file tree / preview / terminal / context menu / edit diff) is provided by
> **dsh-aionui-panel**, maintained in this repo alongside dsh-IDE; dsh-easyssh drives it through the
> `sshWorkspaceMode` cross-plugin service. SSH remote development is only one of dsh-IDE's capabilities —
> local directories enjoy the full IDE workspace too.

## Installation

Prerequisites: Node.js ≥ 22, pnpm, and dsh installed (`npx @deepseek-ai/dsh`).

```sh
# 1) Clone and build
git clone https://github.com/chenw2759-wq/dsh-IDE.git
cd dsh-IDE
pnpm install
pnpm --filter "./packages/dsh-aionui-panel" build
pnpm --filter "./packages/dsh-ssh" build
pnpm --filter "./packages/dsh-easyssh" build

# 2) Install the three packages into the web profile (use your own absolute paths)
dsh plugin --profile web add file:C:/your-path/dsh-IDE/packages/dsh-aionui-panel
dsh plugin --profile web add file:C:/your-path/dsh-IDE/packages/dsh-ssh
dsh plugin --profile web add file:C:/your-path/dsh-IDE/packages/dsh-easyssh
```

> The repo is branded dsh-IDE; the core plugin package keeps the install id `dsh-easyssh`.

### Step 3: seam switch (automatic — nothing to edit)

Installing dsh-easyssh automatically applies its bundled `cordis.patch.yml` (declared via
`dsh.bundle.patch`) as a profile bundle layer: it disables the deployment's `fs-sandbox` /
`subprocess` and mounts the mode-routing facades `easyssh-fs` / `easyssh-subprocess` (in SSH mode the
model's tools execute remotely; in local mode the facades delegate back to the same sandboxed local
implementations). **No manual `<profile>/cordis.patch.yml` editing is required.**

> Versions before 0.1.0 needed a hand-written seam patch; if your profile still carries one, you can
> delete it — the automatic patch is identical (same row ids, idempotent).

### Step 4: restart

```sh
# restart dsh
npx @deepseek-ai/dsh web
```

Open `http://127.0.0.1:3080` → **Ctrl+F5 hard refresh** (required when the browser caches old client
bundles) → configure a host via the SSH button → enter SSH mode.

> Rollback = restore `cordis.patch.yml` to `[]` and restart.

## Usage

1. Click **SSH** at the top right of the session (left of the session log) → fill in host
   (alias / host / port / user / password or key / remote root) → save & test → enter SSH mode.
2. The right panel switches to the remote file tree automatically; just tell the agent "read/change
   remote files" or "run a command on the server" — ordinary tools execute remotely.
3. Path rules: use remote absolute paths directly; relative paths resolve against `remoteRoot`
   (default `~`); do not use Windows local paths.
4. The top-right toggle returns to local mode any time.

## Security

- Routes are loopback-only (same-origin checked); credentials live in `~/.dsh/dsh-ssh.json` (0600).
- Remote operations consume real remote resources — confirm before acting; **the local sandbox does not
  apply to remote execution in SSH mode**.
- Remote grep/glob/realpath rely on GNU find/grep/coreutils.

## Credits

The remote `ctx.fs` / `ctx.subprocess` implementations are ported and adapted from
[UynajGI/dsh-ssh](https://github.com/UynajGI/dsh-ssh) (MIT, see file headers and NOTICE), extended with a
full Web GUI frontend and runtime mode switching.

## License

BSD-3-Clause. The MIT copyright of the remote implementations belongs to the UynajGI/dsh-ssh authors (see NOTICE).
