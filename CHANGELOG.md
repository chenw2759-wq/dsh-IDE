# Changelog

本文件记录 dsh-IDE 每个版本的变更。版本号遵循「主.次.修订」：次版本 = 新功能，修订 = 修复。

## v0.2.0（开发中）— 工作区增强

### 已完成（按实施阶段）

**修复（视觉编辑 / Word 编辑 / 斑马纹 / 会话隔离）**
- **集成终端空白修复**：终端面板改为从主 React 树用 `createPortal` 渲染进 `[data-aionui-terminal-host]`（此前用独立 React root 挂载，存在挂载竞态导致宿主只有黑底、面板内容不渲染）；宿主加不透明背景、提高 z-index。
- **docx 预览渲染图片与底纹**：`w:drawing/a:blip` 内联图片现在经 `word/_rels/document.xml.rels` 解析并内联为 data URL `<img>`；`w:shd w:fill` 段落/文本底纹渲染为 `background-color`。图表、嵌入对象、页眉页脚等复杂结构暂未支持（已知限制）。
- **docx 编辑保存后整段格式全部消失的根因修复**：`rebuildDocx` 的 `walk` 原来只在「叶子节点」用当前元素自身 style 生成 `w:rPr`，遇到 `<span style="…">文字</span>` 会直接递归进文本子节点、把样式丢弃，导致重建出的 `<w:r>` 没有 `<w:rPr>`——粗体/斜体/下划线/颜色/字号/字体/高亮编辑保存后只剩文字。修复：`walk` 改为把每个元素自身的 `styleToRPr` 向下传递到其**直接文本子节点**（自身无样式则继承父级），保证每个 run 都带上正确的 `<w:rPr>`。同时 `styleToRPr` 的属性匹配正则加 `(?:^|;)` 锚点，避免 `color` 误匹配到 `background-color`。新增 round-trip 测试：预览 HTML → `rebuildDocx` 重建，断言 `<w:b/>`/`<w:color w:val="FF0000"/>`/`<w:sz w:val="32"/>` 全部保留。
- **docx 内容控件/形状导致「空表格」的根因修复（简历模板姓名.docx 预览不出的元凶）**：Word 简历模板把正文段落包进 `w:sdt`（内容控件，42 个），把照片包进 `mc:AlternateContent → mc:Choice → w:drawing`（形状），而解析器原来只遍历**直接子元素**，于是 23/52 个段落和整张照片被整体丢弃，只剩空表格。修复：新增 `collectRuns`/`renderBlocks` 递归遍历，把 `w:sdt`/`w:sdtContent`/`w:hyperlink`/`w:ins`/`w:smartTag`/`mc:AlternateContent` 等包装元素当透明层穿透，`renderRun` 改递归找 `w:drawing`（不再只看直接子节点）；同时 `resolvePartImages` 按各 part 的 `_rels` 文件（而非硬编码 document.xml.rels）解析图片。**顺带补上页眉/页脚渲染**：从 `document.xml.rels` 找到 header/footer 关系，读取 `header1.xml` 等 part、经其自身的 `_rels` 内联 logo/信头图片，渲染在正文之前/之后。真实浏览器（CDP `Input.dispatchMouseEvent`）验证：姓名.docx 现在渲染出 2 张图（照片 + 页眉 logo）、1 张表与全部正文（姓名/个人信息/教育背景/技能）。**已知限制**：图表（`word/charts/chart1.xml`）与嵌入对象（嵌入 Excel）仍需额外解析，暂不渲染。
- **Markdown 可视化编辑：下划线/字号/颜色保存后丢失 + 段落合并修复**。根因一：Office 编辑器的行距按钮会把 `styleWithCSS` 全局打开，泄漏到 Markdown 编辑器后，`execCommand('underline'/'fontSize'/'bold')` 产出 `<span style="text-decoration-line:underline|font-size:xxx-large|font-weight:bold">`，而清洗白名单只认 `<u>`/`<font>`/`color|background-color|font-size(px/pt)`，于是被整段丢弃（字号/下划线丢失、颜色时好时坏）。修复：Markdown/HTML 编辑器每次命令前先 `styleWithCSS=false` 强制产出规范标签。根因二：字号走 `<font size="1-7">` 旧标度（20px 被映射成 36pt），改为选中区包 `<span style="font-size:20px">` 精确字号。根因三：contenteditable 会把块级子元素嵌套进 `<div>`，`htmlToMarkdown` 只拍平顶层导致段落合并——现在递归拍平 `<div>`。
- **docx 预览正确呈现不同字体（含中文字体）**：`runFont` 原来只读 `w:rFonts/w:ascii`（拉丁字体），中文 docx 的字体都写在 `w:eastAsia`（宋体/楷体/黑体…），所以预览里全是一个字体。现在同时读 `w:ascii`/`w:hAnsi`/`w:eastAsia`，按「拉丁字体 + 东亚字体」输出 `font-family:'Arial','宋体'`（拉丁字形走拉丁字体、汉字自动回退到东亚字体）；保存重建 `styleToRPr` 也补上 `w:rFonts`，编辑保存不再丢字体。
- **工具栏高亮当前选区已有的格式（Word 式）**：编辑时把光标放到粗体/斜体/下划线/对齐/颜色/底色文字上，对应的按钮会**显示阴影高亮**（`queryCommandState` 查粗斜体下划线对齐；颜色/底色走 DOM 祖先链查显式 `color`/`background-color`，避免 `queryCommandValue` 返回默认色导致误亮）。md 可视化 / HTML iframe / Office 三编辑器一致。
- **可视化编辑的格式命令不再丢失**：工具栏的 `<select>`/`<input type=color>` 会抢焦点，导致 `execCommand('foreColor'/'fontSize'/…)` 在空选区上执行（颜色看着像「刷背景」、字号粗斜体不生效）。现在每个工具在 `onMouseDown` 先快照选区、执行前恢复选区，且格式命令立即置脏（保存按钮马上可用）。
- **字色/底色改成 Word 式颜色按钮（一处组件，md/HTML/Office 三编辑器共用）**：把两个原生 `<input type=color>` 对话框换成 `ColorButton`——主「A」按钮（下方色条显示当前颜色）**一键**把记住的颜色套到当前选区；旁边小「▾」箭头弹出调色板（字色 17 色 / 底色 15 色），点色块即「记住该色并对选区生效」；之后再选文字、点一下「A」就上色，彻底去掉「选颜色要点好几下」的别扭逻辑。色块/按钮在 `onMouseDown` 先 `preventDefault` 并快照选区，所以**字色/底色与粗体/斜体可对同一段同时生效**（原生取色器抢焦点压垮选区正是之前「无法同时设」的根因）。三编辑器已用真实鼠标事件（CDP `Input.dispatchMouseEvent`）端到端验证：md / HTML-iframe / docx 均「粗体 + 颜色同选区生效、选区不丢」。
- **粗体/斜体/下划线不再吃到「上一次的选区」**：颜色按钮会留下 `savedRange` 快照，改完颜色后点粗体/斜体/下划线会用这个**过期快照**去恢复选区——于是「改完颜色，再改粗斜体就作用到刚才那段、或干脆改不动」（字号/字体因为走 `<select>` 自带 `onMouseDown` 快照所以没事）。修复：粗体/斜体/下划线/对齐/行距/页边距按钮在 `onMouseDown` 也先 `saveSelection()` 快照当前选区；且 `restoreSelection()` 用完快照即**清空**（consume-once），永不复用过期快照。
- **Markdown 可视化编辑的格式可保存**：颜色 / 字号 / 字体 / 下划线 / 高亮本无法用 markdown 表达，现以**严格白名单的内联 HTML**（`<u>` / `<font color|face|size>` / `<span style="color|background-color|font-size|font-family">`）持久化，渲染器经同一套校验器（`inline-html.ts`，XSS 边界）回读——改色不再变刷背景、字号/粗斜体保存后不丢；代码围栏保留语言；标题含中划线不乱码。
- 视觉编辑不再崩溃错位：文本框按**原渲染块测量对齐**（原地编辑，不再是重叠堆叠），原页面保留为背景；编辑期零回写（仅保存回写），修复「加 001 就崩」「碰一下插件维护手册就崩」的重渲染循环；缩放把手移到**左边**；底色可选画布色/透明/彩色。
- Markdown 视觉保存合并回 markdown 源（加粗保留），HTML 保存为「原背景 + 浮层」。
- Word 编辑：contenteditable 改为**非受控**（不再每次击键重注入 innerHTML），修复第二个字符光标跳全文开头；新增**撤销/重做**键；页边距改为**弹小输入框**。
- Word 保存失败（malformed request）：宿主 JSON body 上限 1MB→**64MB**（覆盖大体积 docx/xlsx/pptx 重建包）。
- py 斑马纹与文字行**严格对齐**：改为逐行 div 背景（替代易漂移的 repeating-gradient）。
- SSH 会话隔离：3s 轮询不再盲信全局 remote；无 SSH 记忆的会话强制回本地，修复「另一个会话框开 SSH 后本会话被污染」。

**交互修复（预览拖动 / 文件树折叠 / 预览边缘拖动）**
- **右侧边栏可停靠抽屉 + 拖拽停靠/脱离**：预览默认停靠为**右侧抽屉**（`side` 模式）；在任意布局下按住预览 **tab 条 / 工具栏空白处**拖动即把预览**拖出成浮动窗**（原停靠矩形无缝成为浮窗起点）；把浮窗拖到屏幕**右缘**松手自动**停靠回右侧抽屉**（`right` 不再是居中浮窗吸附位，改为「顶到右缘即停靠」）；拖到 cover-tree / below-tree / chat 预设位仍可吸附。tab 的 HTML5 拖拽排序让位于指针手势（避免原生 drag 抢走 pointer 手势）。
- **拖拽动画变流畅**：拖动/缩放期间改为**只写 DOM、不再每帧更新 store**（去掉每次 pointermove 触发的 React 重渲染 + applyGrid 全量重排——此前「卡」的根源），松手才一次性持久化一次 store；180ms 缓动仅在松手吸附/停靠时生效。
- float 预览标签栏改为阈值手势拖动（4px 才进入拖动）：按住 tab 索引即可拖，点击 tab/按钮不受影响，位置持久化。
- **float 预览框可自由缩放**：右下角新增斜纹缩放把手，拖动同时改变宽与高（宽 240~帧宽、高 160~帧高），缩放时锚定左上角不再漂移，尺寸持久化（`aionui-float-size`）；缩放或拖动后仍可吸附到预设位置。
- **拖拽/缩放防手势被抢**：拖拽热区（tab 栏 + 预览工具栏）与缩放手柄统一加 `touch-action:none`、`user-select:none`、`-webkit-user-drag:none`，pointerdown 即 `setPointerCapture` 并处理 `pointercancel`——彻底杜绝真实浏览器里 HTML5 原生 drag / 文本选择 / 触屏滚动抢走手势导致「拖不动」（历史上「都是你的幻觉」那类 bug 的根治方案）。
- **float 预览预设位置吸附（桌面图标式）**：松手时若预览框中心落在预设锚点 120px 内即吸附——`cover-tree`（盖住文件树，树自动折叠为圆形按钮）/ `below-tree`（树下方右下角）/ `chat`（聊天区下方左下角）；`right`（最右）改为**顶到右缘即停靠回右侧抽屉**，不再作为居中浮窗吸附位；拖出吸附区即回到自由浮动；吸附区随窗口缩放与自定义尺寸重算位置（`aionui-float-dock` 持久化）。
- 文件树真折叠（宽度 0 不留残影），且**折叠后预览框保持原宽度不再一起塌掉**：折叠时树变成一个**圆形悬浮按钮**（点击展开/收起浮层文件树）+ 最右侧中部一个抽屉把手（点击把树抽屉拉回）；浮层文件树为毛玻璃小悬浮窗（可拖头部、右上角关闭，位置持久化，且默认避开圆形按钮避免挡住再次点击关闭）。
- side 模式预览框**左边缘**（文件树与预览之间的把手）拖动预览宽度 0~½ 屏；外沿把手拖文件树宽度；修复 heightHandle 未赋值 bug；lightningcss 目标改为现代浏览器（保留 backdrop-filter 无前缀）。

**P1.1 右边栏工作区设置（功能开关 + 编辑工具选择）**
- 设置页迁入系统左下角「设置」面板：新增「右边栏工作区」栏目（nav 顺序在 Agent 预设之后），圆角卡片 + 文字开关（无 emoji），与面板共享同一 store，改动即时生效。
- 预览标签栏的 ⚙ 弹窗已移除（设置统一收进左下角系统设置）。
- 功能开关（8 项）：自动 diff、监视圆点、Git 角标、语法高亮、缩放预览、三栏 IDE 布局、终端停靠、会话隔离。
- 编辑工具（9 项，供后续 P4 富文本工具栏使用）：字体/字号/加粗斜体/对齐/下划线/颜色/段间距行间距/页边距/底色。
- 所有开关即时生效并持久化（localStorage `aionui-workspace-settings`）：
  - 关闭「自动 diff」后外部编辑仅刷新标签内容、不再弹出红绿 diff 卡；
  - 关闭「监视圆点 / Git 角标」后文件树不再显示对应标记；
  - 关闭「语法高亮」后编辑器按纯文本渲染；
  - 关闭「缩放预览」后隐藏缩放工具栏并禁用 Ctrl+滚轮；
  - 关闭「三栏 IDE」后布局循环跳过 triple 模式；
  - 关闭「终端停靠」后隐藏停靠终端及其开关按钮（标签内运行按钮不受影响）；
  - 关闭「会话隔离」后所有会话共享同一套文件树与标签记忆。

**P1.2 预览框自由拖拽 + 动画**
- 预览框尺寸/位置自由拖拽：side 模式预览列成为独立 grid track，宽度 0~½ 界面任意拖拽（宽度把手），变大即压缩对话（聊天栏 1fr 收缩、保留 360px 下限），永不覆盖对话框。
- float 模式变为自由浮动窗：可拖动（标签栏抓取）到任意位置，位置持久化（`aionui-float-pos`）；位移/尺寸 180ms 缓动动画，拖拽中暂停过渡、松手回弹。

**P1.3 聚焦模式（文件树右栏 rail）**
- 预览打开时收起文件树：树折叠为约 30px 右栏 rail，仅留一个小圆角展开按钮（rail 中央），点击即展开回文件树；专注预览与编辑。

**P2 SSH（圆角按钮 + 多机 + 会话隔离）**
- SSH 按钮改为圆角胶囊样式（图标 + 文字，远程态品牌色高亮）；切换按钮虚线圆角。
- 多机选择：连接对话框顶部列出已保存主机（别名/用户@主机:端口），点击即测连进入；下方仍可新建主机。
- 会话级 SSH 状态隔离：每个会话在 localStorage 记住自己的设备与模式（`ssh-session-state:<sessionId>`），切换会话自动恢复该会话的 SSH 目标/本地状态——不同会话可各自处于不同主机或本地。限制：宿主侧 fs/subprocess 接缝仍按全局模式路由，隔离作用于面板与显式 remote_* 工具视图。

**P3 Office 呈现（docx/xlsx/pptx 直接预览）**
- 浏览器端 ZIP 解析（JSZip 打包进 client）：docx 段落/表格/加粗斜体下划线/颜色/字号/高亮/居中渲染；xlsx 首个工作表（共享字符串解析）渲染为表格；pptx 每页一卡片分页呈现。
- 无需新增宿主依赖、无需重启 dsh（仅客户端构建）。

**P4 编辑（框内富文本 + 可视化编辑）**
- docx/xlsx/pptx 框内编辑：工具栏「编辑」进入 contenteditable；工具栏按设置面板勾选显示（字体/字号/加粗斜体/对齐/下划线/文字颜色/高亮/段间距行间距/页边距）；保存时由编辑后 HTML 重建 Office 包（JSZip）并以二进制写回（`/aionui-panel/write-binary`，mtime 冲突保护）。已知限制：HTML 重建保真度有限（页眉页脚/合并单元格等不保留）。
- HTML/Markdown 可视化编辑（Word 式原地编辑）：**不再是浮动文本框**——渲染结果本身就是可编辑文档。Markdown 在 contenteditable 里编辑编译后的 HTML，保存时经 `htmlToMarkdown` 转回 markdown 源（标题含中划线不再产生 `\-` 乱码，代码围栏保留语言）。HTML 在 **design-mode iframe** 里编辑完整文档：原 `<style>` 与画布背景照常渲染，保存序列化**整个文档**（不再是只剩 body 碎片的单列覆盖）；body 背景/分栏布局原样保留。
- 可视化编辑零回写：编辑期间不改 store，仅「保存」回写一次，修复重渲染循环导致的崩溃与错位。

**P5 收尾**
8. 更新日志补全、截图、README、全量验证。

### 已知技术风险
- 会话级 SSH 隔离在宿主侧仍按全局模式路由（tool-fs 调用链不携带会话标识）；已按计划降级：隔离作用于面板与显式 remote_* 工具，并在此注明。
- docx 保存采用 HTML+样式重建方案，复杂排版（页眉页脚/分栏等）保真度受限，已标注为已知限制。
- PPT 不保留动画与切换效果。

## v0.1.x

- 会话级文件树与预览标签隔离（按会话记忆展开与 tabs）。
- 监视路径 UI：默认一级监视；目录圆点切换（浅黄=下一级、绿=全部层级）；显式标记优先于噪声过滤。
- 终端重做：无 emoji、黑体、macOS 风格，停靠聊天栏底部五分之一（不覆盖对话）。
- 图片/HTML 预览缩放（工具栏 + Ctrl+滚轮；内容槽像素化 + flex 禁收缩，缩放时框不缩）。
- 同文件不重复开 tab；已打开 tab 磁盘变化自动刷新；diff 卡编辑保存带 mtime 冲突检测。
- R 语言支持（Rscript 运行、R 蓝标签、.Rmd 预览）；语法高亮跟随浅色/深色主题。
- 七大 IDE 增强：Git 状态角标、新建文件/文件夹、行内重命名、回收站删除、标签拖拽排序、三栏 IDE 布局、监视路径。
- 接缝切换补丁内置插件（cordis.patch.yml 自动应用，安装零手动）；构建产物 lib/ 移出版本控制；prepare 钩子自动构建。
- 自动弹出过滤：构建产物目录、临时文件、锁文件不弹；Windows 路径分隔符修复（git-status）。
- 中英双语文档与截图。
