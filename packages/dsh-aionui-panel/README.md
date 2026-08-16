# dsh-aionui-panel — DSH Web GUI 右侧面板系统

> AionUi 右侧面板的像素级复刻（Apache-2.0 授权参考实现，非抄录）：Explorer
> 项目面板（文件树 / 文件名搜索 / Git 变更）+ Preview 预览面板（10+ 格式多 tab
> 预览）+ 统一拖拽布局系统，按项目隔离的偏好持久化。

## 安装

本仓库是插件 monorepo，`packages/dsh-aionui-panel` 即插件包。安装到 DSH profile：

```
dsh plugin --profile web add link:/Users/zcl/code/dsh-web-ui/packages/dsh-aionui-panel
```

若已把 `- ../dsh-aionui-panel` 加入 `packages/dsh-web-ui-all/aggregate.yml`
（patchFrom 与 deps），跑 `node scripts/aggregate.mjs` 后安装聚合包即可一次到位。

## 使用

项目会话（当前会话有工作目录）打开后，聊天区右侧出现两块面板：

- **Explorer（最右栏，默认 260px，范围 220~500px）**：`文件 / 变更` 双 tab；
  文件树整行点击展开/收起文件夹，点击文件在预览面板打开，顶部按文件名搜索
  （150ms 防抖，点击结果 = 定位到树中，不打断思路）；`变更` tab 读取真实
  git 状态，支持 stage / unstage / discard（untracked 走删除，tracked 走
  restore，批量放弃有确认）。
- **Preview（右二栏，默认 480px，范围 340~1200px）**：多 tab 预览，支持
  markdown / html / code / diff / csv / pdf / word / excel / ppt / 图片 / 文本 /
  url；源码/预览切换、分屏编辑（比例持久化）、保存（mtime 冲突检测）、下载、
  刷新（4 态：不渲染死按钮）、dirty 点、中键关闭、右键菜单批量关闭
  （dirty 确认）、tab 溢出渐变指示器。
  docx 预览在浏览器端解 ZIP 并渲染段落/表格/run 格式（加粗/斜体/下划线/颜色/
  字号/字体/高亮/底纹）、内联图片与形状照片（`w:drawing`/`a:blip`，含
  `mc:AlternateContent` 形状）、内容控件（`w:sdt`）、页眉页脚（`header1.xml` 的
  logo/信头）；编辑保存时从编辑后 HTML 重建 `word/document.xml`，run 格式不丢。
  图表与嵌入对象暂不解析（已知限制）。

交互细节：

- 拖拽左缘把手调宽（rAF 每帧合并，body user-select:none）；双击把手复位默认宽度。
- 两级宽度钳位（Explorer 先、Preview 后）数学保证聊天区 >= 360px；超限值回写持久化。
- 折叠 = 宽度缩 0 且组件保持挂载（树展开态 / 预览 tab 不丢），无过渡动画；
  折叠后右侧出现浮动展开按钮。
- 明暗双主题跟随 GUI（`body[data-ds-dark-theme]`），prefers-reduced-motion 全局禁用动画。
- 偏好按项目隔离持久化（localStorage keys 与 AionUi 一致）：
  `chat-workspace-width-px` / `chat-preview-width-px` / `preview-panel-split-ratio`
  / `project-panel-collapse:<root>` / `explorer-ui:<root>` / `scm-ui:<root>`
  / `preview-ui:<root>`（LRU 上限 12 scope）。读取一律范围校验，非法值回退默认。

## 数据源

真实文件系统与真实 git 仓库，无任何 mock：

- host 半区（`src/index.ts` + `src/host/`）经 `/aionui-panel/*` HTTP 路由提供
  目录列举、文件读取（文本 80k 字符上限 / 图片 data URL）、写入（mtime 冲突
  检测）、文件名搜索（跳过 .git / node_modules）、git status（porcelain v1 -z）
  / stage / unstage / discard，以及 SSE 变更流（fs 监听 + git 轮询）。
- 所有操作经过工作区门卫：路径必须落在已注册 workspace 内（realpath 规范化 +
  前缀校验），浏览器只能读写项目根下的相对路径。
- browser 半区（`src/client/`）以当前会话 cwd 作为项目根，切换会话即切换项目。

## 结构

- `src/index.ts` — host 半区入口（cordis 插件：路由注册 + systemPrompt 公告）。
- `src/host/` — fs/git 数据服务与路由层（workspace gate）。
- `src/core/types.ts` — 前后半区共享的线上类型。
- `src/client/` — browser 半区：框架无关状态核心（`store.ts`）、拖拽引擎
  （`drag.ts` + `hooks/useResizableSplit.ts`）、DOM 布局控制器（`layout.ts`，
  向 shell 的三栏 grid 追加面板轨道）、React 组件（explorer / scm / preview）。
- `tests/` — clamp 公式、porcelain 解析、持久化校验、markdown/csv 渲染、
  store 行为等纯逻辑测试（vitest，37 个）。

## 构建

```sh
export NPM_TOKEN='<token>'   # 若仍使用私有 scope 认证
pnpm install
pnpm -r build
```

## 署名

本项目是 AionUi（iOfficeAI/AionUi，Apache-2.0）右侧面板系统的复刻实现：
尺寸、颜色、动效、交互参数来自对 v2.1.53 的实测调研（研究报告与截图见
aionui-research 仓库），实现为全新代码，未大段抄录源码。上游版权归 AionUi
项目所有，本项目仅按 Apache-2.0 约定保留署名。
