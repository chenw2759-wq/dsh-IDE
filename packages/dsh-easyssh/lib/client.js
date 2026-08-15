window.__ModuleLoader__.load({
	id: "dsh-easyssh",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		let react_dom_client = require("react-dom/client");
		//#region src/protocol.ts
		const WORKSPACE_API = {
			state: "/api/dsh-easyssh/state",
			tree: "/api/dsh-easyssh/tree",
			file: "/api/dsh-easyssh/file",
			search: "/api/dsh-easyssh/search"
		};
//#endregion
		//#region src/client/api.ts
		/**
		* Browser-side API clients: the /api/dsh-easyssh route family plus the
		* two /api/dsh-ssh endpoints the config dialog needs (host create + test).
		* Plain fetch, same origin 鈥?the only data path the panel components use.
		*/
		/** Error carrying the route's JSON error message. */
		var WorkspaceApiError = class extends Error {
			constructor(message) {
				super(message);
				this.name = "WorkspaceApiError";
			}
		};
		/** Parse a JSON response or throw a WorkspaceApiError. */
		async function readJson(response) {
			let body;
			try {
				body = await response.json();
			} catch {
				throw new WorkspaceApiError(`HTTP ${response.status}: invalid JSON response`);
			}
			if (!response.ok) throw new WorkspaceApiError(typeof body === "object" && body !== null && typeof body.error === "string" ? body.error : `HTTP ${response.status}`);
			return body;
		}
		/** Query-string helper. */
		function query(params) {
			const search = new URLSearchParams();
			for (const [key, value] of Object.entries(params)) if (value !== void 0 && value !== "") search.set(key, String(value));
			const text = search.toString();
			return text === "" ? "" : "?" + text;
		}
		/** The workspace route family client. */
		var WorkspaceApi = class {
			async getState() {
				return (await readJson(await fetch(WORKSPACE_API.state))).state;
			}
			async setModeLocal() {
				return (await readJson(await fetch(WORKSPACE_API.state, {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ mode: "local" })
				}))).state;
			}
			async setModeRemote(alias, remoteRoot) {
				return (await readJson(await fetch(WORKSPACE_API.state, {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({
						mode: "remote",
						alias,
						remoteRoot
					})
				}))).state;
			}
			async list(root, path) {
				return (await readJson(await fetch(WORKSPACE_API.tree + query({
					root,
					path
				})))).listing;
			}
			async read(root, path) {
				return (await readJson(await fetch(WORKSPACE_API.file + query({
					root,
					path
				})))).file;
			}
			async write(root, path, content, expectedMtime) {
				return (await readJson(await fetch(WORKSPACE_API.file, {
					method: "PUT",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({
						root,
						path,
						content,
						expectedMtime
					})
				}))).result;
			}
			async search(root, queryText) {
				return (await readJson(await fetch(WORKSPACE_API.search + query({
					root,
					query: queryText
				})))).search;
			}
		};
		const HOSTS_API = "/api/dsh-ssh/hosts";
		const TEST_API = "/api/dsh-ssh/test";
		var SshHostsApi = class {
			async list() {
				return (await readJson(await fetch(HOSTS_API))).hosts;
			}
			async create(payload) {
				return (await readJson(await fetch(HOSTS_API, {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify(payload)
				}))).host;
			}
			async test(alias) {
				return (await readJson(await fetch(TEST_API, {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ alias })
				}))).result;
			}
		};
//#endregion
		//#region src/client/locales.ts
		/**
		* Locale dictionaries for the dsh-easyssh surface (zh/en).
		* The key union derives from the zh dictionary (mirrors the dsh-ssh locale
		* pattern), so the LocaleNamespaceMap augmentation types the `t` seat and
		* the register call against exactly the shipped keys.
		*/
		/** Locale namespace this plugin owns. */
		const NS = "dsh-easyssh";
		/** The zh dictionary (the key union source). */
		const zh = {
			"connect.label": "SSH",
			"connect.tooltip": "閰嶇疆 SSH 涓绘満骞惰繘鍏?SSH 杩滅▼宸ヤ綔鍖烘ā寮?,
			"connect.remoteTooltip": "褰撳墠 SSH 妯″紡涓绘満锛堢偣鍑婚噸鏂伴厤缃級",
			"toggle.tooltipLocal": "褰撳墠鎺у埗鏈満锛岀偣鍑诲垏鎹㈠埌 SSH 杩滅▼涓绘満",
			"toggle.tooltipRemote": "褰撳墠鎺у埗杩滅▼涓绘満锛岀偣鍑婚€€鍑?SSH 妯″紡",
			"toggle.labelLocal": "SSH 妯″紡",
			"toggle.labelRemote": "閫€鍑?SSH",
			"panel.exitRemote": "閫€鍑?SSH 妯″紡",
			"settings.label": "SSH 杩滅▼宸ヤ綔鍖?,
			"settings.hint": "鍦ㄨ繖閲岀鐞?SSH 涓绘満锛堝鍒犳敼/娴嬭瘯/杩涘叆鎴栭€€鍑?SSH 妯″紡锛夛紝閰嶇疆鑷姩淇濆瓨鍒?~/.dsh/dsh-ssh.json锛屾棤闇€姣忔閲嶅濉啓銆?,
			"dialog.title": "SSH 杩滅▼宸ヤ綔鍖?,
			"dialog.subtitle": "涓绘満閰嶇疆涓?dsh-ssh 鍏变韩锛垀/.dsh/dsh-ssh.json锛夛紝淇濆瓨鍚庡嵆鍙繘鍏?SSH 妯″紡",
			"dialog.alias": "鍒悕",
			"dialog.host": "涓绘満",
			"dialog.port": "绔彛",
			"dialog.user": "鐢ㄦ埛鍚?,
			"dialog.auth": "璁よ瘉鏂瑰紡",
			"dialog.auth.password": "瀵嗙爜",
			"dialog.auth.key": "瀵嗛挜",
			"dialog.password": "瀵嗙爜",
			"dialog.keyPath": "绉侀挜璺緞",
			"dialog.passphrase": "瀵嗛挜鍙ｄ护锛堝彲閫夛級",
			"dialog.remoteRoot": "杩滅▼鏍圭洰褰?,
			"dialog.remoteRootHint": "榛樿 ~锛堢櫥褰曠敤鎴峰鐩綍锛夛紱蹇呴』鏄粷瀵硅矾寰?,
			"dialog.saveTest": "淇濆瓨骞舵祴璇曡繛鎺?,
			"dialog.enter": "杩涘叆 SSH 妯″紡",
			"dialog.cancel": "鍙栨秷",
			"dialog.testing": "姝ｅ湪娴嬭瘯杩炴帴鈥?,
			"dialog.testOk": "杩炴帴鎴愬姛锛堝欢杩?%d ms锛?,
			"dialog.testFail": "杩炴帴澶辫触锛?s",
			"dialog.saved": "涓绘満宸蹭繚瀛?,
			"dialog.enterHint": "娴嬭瘯閫氳繃鍚庡嵆鍙繘鍏?SSH 妯″紡锛涘乏渚ч潰鏉垮皢鏄剧ず杩滅▼鏂囦欢鏍戯紝鏂囦欢鎿嶄綔鐢?Agent 缁?SSH 瀹屾垚",
			"panel.empty": "鎵撳紑涓€涓細璇濆悗鏄剧ず鏂囦欢鏍?,
			"panel.search": "鎸夋枃浠跺悕鎼滅储鈥?,
			"panel.loading": "鍔犺浇涓€?,
			"panel.openFailed": "鏃犳硶鎵撳紑鏂囦欢锛?,
			"panel.save": "淇濆瓨",
			"panel.saveFail": "淇濆瓨澶辫触锛?,
			"panel.saved": "宸蹭繚瀛?,
			"panel.conflictTitle": "鏂囦欢宸茶杩滅▼淇敼锛坢time 鍐茬獊锛?,
			"panel.conflictOverwrite": "浠嶈瑕嗙洊",
			"panel.conflictAbort": "鏀惧純鎴戠殑淇敼",
			"panel.close": "鍏抽棴",
			"panel.notText": "璇ユ枃浠朵笉鏄枃鏈紱璇疯 Agent 鐢?ssh_exec / ssh_download 澶勭悊",
			"panel.rootSwitch": "鍒囨崲杩滅▼鏍圭洰褰?,
			"panel.rootPlaceholder": "缁濆璺緞锛屽 /srv/app",
			"panel.rootApply": "鍒囨崲",
			"panel.collapse": "鎶樺彔闈㈡澘",
			"panel.expand": "灞曞紑闈㈡澘",
			"panel.modeLocal": "鏈満",
			"panel.modeRemote": "杩滅▼",
			"panel.searchEmpty": "鏃犲尮閰嶆枃浠?
		};
		/** The en dictionary (same key set). */
		const en = {
			"connect.label": "SSH",
			"connect.tooltip": "Configure an SSH host and enter SSH remote-workspace mode",
			"connect.remoteTooltip": "Current SSH-mode host (click to reconfigure)",
			"toggle.tooltipLocal": "Controlling this machine 鈥?click to switch to the SSH host",
			"toggle.tooltipRemote": "Controlling the remote host 鈥?click to exit SSH mode",
			"toggle.labelLocal": "SSH mode",
			"toggle.labelRemote": "Exit SSH",
			"panel.exitRemote": "Exit SSH mode",
			"settings.label": "SSH Remote Workspace",
			"settings.hint": "Manage SSH hosts here (add/edit/delete/test, enter or exit SSH mode); config is saved to ~/.dsh/dsh-ssh.json automatically 鈥?no need to re-enter it every time.",
			"dialog.title": "SSH Remote Workspace",
			"dialog.subtitle": "Hosts are shared with dsh-ssh (~/.dsh/dsh-ssh.json); save then enter SSH mode",
			"dialog.alias": "Alias",
			"dialog.host": "Host",
			"dialog.port": "Port",
			"dialog.user": "User",
			"dialog.auth": "Authentication",
			"dialog.auth.password": "Password",
			"dialog.auth.key": "Private key",
			"dialog.password": "Password",
			"dialog.keyPath": "Key path",
			"dialog.passphrase": "Passphrase (optional)",
			"dialog.remoteRoot": "Remote root",
			"dialog.remoteRootHint": "Default ~ (login home); must be an absolute path",
			"dialog.saveTest": "Save and test connection",
			"dialog.enter": "Enter SSH mode",
			"dialog.cancel": "Cancel",
			"dialog.testing": "Testing connection鈥?,
			"dialog.testOk": "Connected (%d ms)",
			"dialog.testFail": "Connection failed: %s",
			"dialog.saved": "Host saved",
			"dialog.enterHint": "Once the test passes you can enter SSH mode; the left panel shows the remote tree and the Agent edits files over SSH",
			"panel.empty": "Open a session to see the file tree",
			"panel.search": "Search filenames鈥?,
			"panel.loading": "Loading鈥?,
			"panel.openFailed": "Cannot open file: ",
			"panel.save": "Save",
			"panel.saveFail": "Save failed: ",
			"panel.saved": "Saved",
			"panel.conflictTitle": "The file changed on the remote side (mtime conflict)",
			"panel.conflictOverwrite": "Overwrite anyway",
			"panel.conflictAbort": "Discard my edits",
			"panel.close": "Close",
			"panel.notText": "Not a text file; ask the Agent to use ssh_exec / ssh_download",
			"panel.rootSwitch": "Switch remote root",
			"panel.rootPlaceholder": "Absolute path, e.g. /srv/app",
			"panel.rootApply": "Switch",
			"panel.collapse": "Collapse panel",
			"panel.expand": "Expand panel",
			"panel.modeLocal": "Local",
			"panel.modeRemote": "Remote",
			"panel.searchEmpty": "No matching files"
		};
		/** The dictionary pair registered into the locale service. */
		const dictionaries = {
			zh,
			en
		};
//#endregion
		//#region src/client/text.ts
		/**
		* Tiny localization helper: resolves the active dictionary (zh when the
		* document language starts with zh, else en). The dictionary is swapped by
		* the plugin's apply() on <html lang> changes.
		*/
		let current = document.documentElement.lang?.startsWith("zh") ? zh : en;
		/** Switch the active dictionary (called by the client entry on lang change). */
		function setLanguage(zhMode) {
			current = zhMode ? zh : en;
		}
		/** Resolve one copy key (supports %s / %d substitution). */
		function tt(key, ...args) {
			let text = current[key] ?? zh[key] ?? key;
			for (const arg of args) text = text.replace(/%[sd]/, String(arg));
			return text;
		}
//#endregion
		//#region src/client/badge.tsx
		/**
		* The remote-workspace badge: a session-header action (static context, before
		* interactive buttons) showing the ACTIVE remote workspace while in SSH mode 鈥?		* `cys01 @ /root/autodl-tmp`. DSH's own workspace label is host-local and
		* immutable, so this badge is where the real working directory is surfaced.
		*/
		/** The badge: hidden in local mode, shows the remote workspace in SSH mode. */
		function RemoteWorkspaceBadge(props) {
			const state = (0, react.useSyncExternalStore)(props.mode.subscribe.bind(props.mode), props.mode.getSnapshot.bind(props.mode));
			if (state.mode !== "remote") return null;
			const label = state.remoteRootLabel ?? state.remoteRoot ?? "~";
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
				"data-ssh-workspace-badge": "",
				title: `${tt("panel.modeRemote")} ${state.alias ?? ""} @ ${label}`,
				style: {
					display: "inline-flex",
					alignItems: "center",
					gap: 4,
					padding: "1px 8px",
					borderRadius: 999,
					fontSize: 11,
					lineHeight: "18px",
					background: "rgba(122, 162, 247, 0.18)",
					color: "var(--aion-primary, #7aa2f7)",
					border: "1px solid rgba(122, 162, 247, 0.35)",
					whiteSpace: "nowrap",
					maxWidth: 240,
					overflow: "hidden",
					textOverflow: "ellipsis"
				},
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
					viewBox: "0 0 16 16",
					width: "11",
					height: "11",
					fill: "none",
					stroke: "currentColor",
					strokeWidth: "1.4",
					strokeLinecap: "round",
					strokeLinejoin: "round",
					"aria-hidden": "true",
					style: { flex: "none" },
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
							x: "2",
							y: "3",
							width: "12",
							height: "10",
							rx: "2"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M6 6.5l2.2 1.6L6 9.7" }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M9.5 9.5h2" })
					]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					style: {
						overflow: "hidden",
						textOverflow: "ellipsis"
					},
					children: [
						state.alias ?? "",
						" @ ",
						label
					]
				})]
			});
		}
//#endregion
//#region css
		const css$1 = ".OT3Pea_dialogBackdrop{z-index:1000;background:#00000073;justify-content:center;align-items:center;display:flex;position:fixed;inset:0}.OT3Pea_dialog{background:var(--aion-bg-1,#fff);width:460px;max-width:calc(100vw - 32px);max-height:calc(100vh - 64px);color:var(--aion-text-primary,#000);font-family:var(--aion-font-sans,-apple-system, \"Segoe UI\", \"Microsoft YaHei\", sans-serif);border-radius:10px;padding:16px 18px;font-size:13px;overflow-y:auto;box-shadow:0 12px 32px #00000059}.OT3Pea_dialogHeader{flex-direction:column;gap:4px;margin-bottom:12px;display:flex}.OT3Pea_dialogHeader strong{font-size:15px}.OT3Pea_dialogSubtitle{color:var(--aion-text-tertiary,#86909c);font-size:12px}.OT3Pea_dialogGrid{grid-template-columns:1fr;gap:10px;display:grid}.OT3Pea_field{flex-direction:column;gap:4px;display:flex}.OT3Pea_field span{color:var(--aion-text-secondary,#454d5f);font-size:12px}.OT3Pea_field input,.OT3Pea_field select{border:1px solid var(--aion-border-base,#e5e6eb);background:var(--aion-bg-2,#f2f3f5);color:var(--aion-text-primary,#000);border-radius:6px;outline:none;padding:6px 8px;font-size:13px}.OT3Pea_field input:focus,.OT3Pea_field select:focus{border-color:var(--aion-primary,#165dff)}.OT3Pea_fieldHint{color:var(--aion-text-tertiary,#86909c);font-size:11px}.OT3Pea_dialogOk{background:var(--aion-success,#00b42a);color:#fff;border-radius:6px;margin-top:10px;padding:6px 8px;font-size:12px}.OT3Pea_dialogFail{background:var(--aion-danger,#f53f3f);color:#fff;border-radius:6px;margin-top:10px;padding:6px 8px;font-size:12px}.OT3Pea_dialogInfo{background:var(--aion-bg-2,#f2f3f5);color:var(--aion-text-secondary,#454d5f);border-radius:6px;margin-top:10px;padding:6px 8px;font-size:12px}.OT3Pea_dialogActions{justify-content:flex-end;gap:8px;margin-top:14px;display:flex}.OT3Pea_button{border:1px solid var(--aion-border-base,#e5e6eb);background:var(--aion-bg-2,#f2f3f5);color:var(--aion-text-primary,#000);cursor:pointer;border-radius:6px;padding:6px 14px;font-size:13px}.OT3Pea_button:disabled{opacity:.6;cursor:default}.OT3Pea_buttonPrimary{background:var(--aion-primary,#165dff);border-color:var(--aion-primary,#165dff);color:#fff}.OT3Pea_dialogHint{color:var(--aion-text-tertiary,#86909c);margin-top:10px;font-size:11px}";
		const tagId$1 = "dsh-easyssh/workspace.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$1) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-easyssh";
			tag.dataset.pluginCss = tagId$1;
			tag.textContent = css$1;
			document.head.appendChild(tag);
		}
		var workspace_module_css_default = {
			"button": "OT3Pea_button",
			"buttonPrimary": "OT3Pea_buttonPrimary",
			"dialog": "OT3Pea_dialog",
			"dialogActions": "OT3Pea_dialogActions",
			"dialogBackdrop": "OT3Pea_dialogBackdrop",
			"dialogFail": "OT3Pea_dialogFail",
			"dialogGrid": "OT3Pea_dialogGrid",
			"dialogHeader": "OT3Pea_dialogHeader",
			"dialogHint": "OT3Pea_dialogHint",
			"dialogInfo": "OT3Pea_dialogInfo",
			"dialogOk": "OT3Pea_dialogOk",
			"dialogSubtitle": "OT3Pea_dialogSubtitle",
			"field": "OT3Pea_field",
			"fieldHint": "OT3Pea_fieldHint"
		};
//#endregion
		//#region src/client/dialog.tsx
		/**
		* The SSH config dialog: alias / host / port / user / auth (password or key +
		* passphrase) / optional remote root. Saves into the shared dsh-ssh host
		* store (/api/dsh-ssh/hosts), tests the connection, then enters SSH mode.
		* Rendered as a fixed overlay with its own React root (the shell exposes no
		* modal slot for external plugins).
		*/
		const INITIAL = {
			alias: "",
			host: "",
			port: "22",
			user: "",
			authKind: "password",
			password: "",
			keyPath: "",
			passphrase: "",
			remoteRoot: ""
		};
		/** Open the dialog (mounts one overlay; subsequent calls reuse the element). */
		function openConfigDialog(mode, api, hostsApi) {
			const element = document.createElement("div");
			element.dataset.sshWorkspaceDialog = "";
			document.body.appendChild(element);
			const root = (0, react_dom_client.createRoot)(element);
			const close = () => {
				root.unmount();
				element.remove();
			};
			root.render(/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ConfigDialog, {
				mode,
				api,
				hostsApi,
				onClose: close
			}));
		}
		/** The dialog body. */
		function ConfigDialog(props) {
			const [form, setForm] = (0, react.useState)(INITIAL);
			const [phase, setPhase] = (0, react.useState)({ kind: "editing" });
			const [savedAlias, setSavedAlias] = (0, react.useState)(void 0);
			const set = (key, value) => {
				setForm((prev) => ({
					...prev,
					[key]: value
				}));
			};
			const saveAndTest = async () => {
				setPhase({ kind: "testing" });
				const alias = form.alias.trim();
				const host = form.host.trim();
				const user = form.user.trim();
				const port = Number.parseInt(form.port, 10);
				if (alias === "" || host === "" || user === "" || !Number.isInteger(port)) {
					setPhase({
						kind: "failed",
						message: "alias / host / user are required and port must be an integer"
					});
					return;
				}
				try {
					const summary = await props.hostsApi.create({
						alias,
						host,
						port,
						user,
						auth: form.authKind === "password" ? {
							kind: "password",
							password: form.password
						} : {
							kind: "key",
							keyPath: form.keyPath.trim(),
							passphrase: form.passphrase === "" ? void 0 : form.passphrase
						}
					});
					setSavedAlias(summary.alias);
					const result = await props.hostsApi.test(summary.alias);
					if (result.ok) setPhase({
						kind: "ready",
						latencyMs: result.latencyMs
					});
					else setPhase({
						kind: "failed",
						message: result.error ?? "unknown error"
					});
				} catch (error) {
					setPhase({
						kind: "failed",
						message: error instanceof Error ? error.message : String(error)
					});
				}
			};
			const enterRemote = async () => {
				const alias = savedAlias ?? form.alias.trim();
				try {
					await props.mode.setRemote(alias, form.remoteRoot.trim() === "" ? void 0 : form.remoteRoot.trim());
					props.onClose();
				} catch (error) {
					setPhase({
						kind: "failed",
						message: error instanceof Error ? error.message : String(error)
					});
				}
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: workspace_module_css_default.dialogBackdrop,
				onClick: props.onClose,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: workspace_module_css_default.dialog,
					onClick: (event) => event.stopPropagation(),
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: workspace_module_css_default.dialogHeader,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: tt("dialog.title") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: workspace_module_css_default.dialogSubtitle,
								children: tt("dialog.subtitle")
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: workspace_module_css_default.dialogGrid,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									className: workspace_module_css_default.field,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: tt("dialog.alias") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										value: form.alias,
										onChange: (event) => set("alias", event.target.value),
										placeholder: "my-server",
										spellCheck: false
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									className: workspace_module_css_default.field,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: tt("dialog.host") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										value: form.host,
										onChange: (event) => set("host", event.target.value),
										placeholder: "1.2.3.4",
										spellCheck: false
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									className: workspace_module_css_default.field,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: tt("dialog.port") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										value: form.port,
										onChange: (event) => set("port", event.target.value),
										inputMode: "numeric",
										spellCheck: false
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									className: workspace_module_css_default.field,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: tt("dialog.user") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										value: form.user,
										onChange: (event) => set("user", event.target.value),
										placeholder: "root",
										spellCheck: false
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									className: workspace_module_css_default.field,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: tt("dialog.auth") }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
										value: form.authKind,
										onChange: (event) => set("authKind", event.target.value),
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: "password",
											children: tt("dialog.auth.password")
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: "key",
											children: tt("dialog.auth.key")
										})]
									})]
								}),
								form.authKind === "password" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									className: workspace_module_css_default.field,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: tt("dialog.password") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										type: "password",
										value: form.password,
										onChange: (event) => set("password", event.target.value),
										spellCheck: false
									})]
								}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									className: workspace_module_css_default.field,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: tt("dialog.keyPath") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										value: form.keyPath,
										onChange: (event) => set("keyPath", event.target.value),
										placeholder: "C:\\\\Users\\\\you\\\\.ssh\\\\id_ed25519",
										spellCheck: false
									})]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									className: workspace_module_css_default.field,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: tt("dialog.passphrase") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										type: "password",
										value: form.passphrase,
										onChange: (event) => set("passphrase", event.target.value),
										spellCheck: false
									})]
								})] }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									className: workspace_module_css_default.field,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: tt("dialog.remoteRoot") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										value: form.remoteRoot,
										onChange: (event) => set("remoteRoot", event.target.value),
										placeholder: "~",
										spellCheck: false
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: workspace_module_css_default.fieldHint,
									children: tt("dialog.remoteRootHint")
								})
							]
						}),
						phase.kind === "ready" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: workspace_module_css_default.dialogOk,
							children: [
								tt("dialog.saved"),
								" 路 ",
								tt("dialog.testOk", phase.latencyMs ?? 0)
							]
						}),
						phase.kind === "failed" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: workspace_module_css_default.dialogFail,
							children: tt("dialog.testFail", phase.message)
						}),
						phase.kind === "testing" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: workspace_module_css_default.dialogInfo,
							children: tt("dialog.testing")
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: workspace_module_css_default.dialogActions,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: workspace_module_css_default.button,
								onClick: props.onClose,
								disabled: phase.kind === "testing",
								children: tt("dialog.cancel")
							}), phase.kind === "ready" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: `${workspace_module_css_default.button} ${workspace_module_css_default.buttonPrimary}`,
								onClick: () => void enterRemote(),
								children: tt("dialog.enter")
							}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: `${workspace_module_css_default.button} ${workspace_module_css_default.buttonPrimary}`,
								onClick: () => void saveAndTest(),
								disabled: phase.kind === "testing",
								children: phase.kind === "testing" ? tt("dialog.testing") : tt("dialog.saveTest")
							})]
						}),
						phase.kind === "ready" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: workspace_module_css_default.dialogHint,
							children: tt("dialog.enterHint")
						})
					]
				})
			});
		}
//#endregion
		//#region src/client/header.tsx
		/**
		* The two session-header utility buttons (registered in
		* conversation.session.header.utilities, left of the session-log entry):
		* the SSH configure/enter button and the local鈬剅emote toggle. The runtime
		* dependencies (mode / api / hostsApi) arrive as slot-injected owner props.
		*/
		/** React hook: subscribe to the mode store. */
		function useMode(mode) {
			return (0, react.useSyncExternalStore)(mode.subscribe.bind(mode), mode.getSnapshot.bind(mode));
		}
		/** The SSH configure/enter button (always visible). */
		function ConnectButton(props) {
			const state = useMode(props.mode);
			const remote = state.mode === "remote" && state.alias !== void 0;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
				type: "button",
				"data-ssh-workspace-connect": "",
				"data-active": remote ? "true" : void 0,
				title: remote ? tt("connect.remoteTooltip") : tt("connect.tooltip"),
				onClick: () => {
					openConfigDialog(props.mode, props.api, props.hostsApi);
				},
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
					viewBox: "0 0 16 16",
					width: "14",
					height: "14",
					fill: "none",
					stroke: "currentColor",
					strokeWidth: "1.3",
					strokeLinecap: "round",
					strokeLinejoin: "round",
					"aria-hidden": "true",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
							x: "2",
							y: "3",
							width: "12",
							height: "10",
							rx: "2"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M6 6.5l2.2 1.6L6 9.7" }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M9.5 9.5h2" })
					]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: remote ? `SSH: ${state.alias}` : tt("connect.label") })]
			});
		}
		/** The local鈬剅emote toggle (visible once a remote target exists). */
		function ToggleButton(props) {
			const state = useMode(props.mode);
			if (state.alias === void 0) return null;
			const alias = state.alias;
			const remote = state.mode === "remote";
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
				type: "button",
				"data-ssh-workspace-toggle": "",
				"data-remote": remote ? "true" : void 0,
				title: remote ? tt("toggle.tooltipRemote") : tt("toggle.tooltipLocal"),
				onClick: () => {
					if (remote) props.mode.setLocal();
					else props.mode.setRemote(alias);
				},
				children: [remote ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
					viewBox: "0 0 16 16",
					width: "14",
					height: "14",
					fill: "none",
					stroke: "currentColor",
					strokeWidth: "1.3",
					strokeLinecap: "round",
					strokeLinejoin: "round",
					"aria-hidden": "true",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M3.5 5.5h6a3 3 0 0 1 0 6h-1" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M5.5 7.5L3.5 5.5l2-2" })]
				}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
					viewBox: "0 0 16 16",
					width: "14",
					height: "14",
					fill: "none",
					stroke: "currentColor",
					strokeWidth: "1.3",
					strokeLinecap: "round",
					strokeLinejoin: "round",
					"aria-hidden": "true",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M8 3l3.5 3.5L8 10" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M3.5 9.5v0a3 3 0 0 0 3 3h1" })]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: remote ? tt("toggle.labelRemote") : tt("toggle.labelLocal") })]
			});
		}
//#endregion
//#region css
		const css = "._6BVqoq_page{flex-direction:column;gap:10px;max-width:720px;font-size:13px;display:flex}._6BVqoq_hint{opacity:.7;margin:0;font-size:12px}._6BVqoq_modeLine{border:1px solid var(--aion-bg-3,#8080804d);background:var(--aion-bg-1,#8080800f);border-radius:8px;align-items:center;gap:8px;padding:8px 10px;display:flex}._6BVqoq_rootLine{align-items:center;gap:8px;display:flex}._6BVqoq_rootLine input{border:1px solid var(--aion-bg-3,#80808059);color:inherit;background:0 0;border-radius:6px;flex:1;padding:4px 8px;font-size:12px}._6BVqoq_rootCell{border:1px solid var(--aion-bg-3,#80808059);width:140px;color:inherit;background:0 0;border-radius:6px;padding:3px 6px;font-size:12px}._6BVqoq_title{margin:8px 0 4px;font-size:14px}._6BVqoq_table{border-collapse:collapse;width:100%;font-size:12px}._6BVqoq_table th,._6BVqoq_table td{text-align:left;border-bottom:1px solid var(--aion-bg-3,#80808033);padding:6px 8px}._6BVqoq_table th{opacity:.6;font-weight:600}._6BVqoq_actions{white-space:nowrap}._6BVqoq_empty{opacity:.6;text-align:center}._6BVqoq_form{border:1px solid var(--aion-bg-3,#8080804d);border-radius:8px;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;padding:10px;display:grid}._6BVqoq_field{flex-direction:column;gap:3px;display:flex}._6BVqoq_field span{opacity:.7;font-size:11px}._6BVqoq_field input,._6BVqoq_field select{border:1px solid var(--aion-bg-3,#80808059);color:inherit;background:0 0;border-radius:6px;padding:4px 8px;font-size:12px}._6BVqoq_formActions{grid-column:1/-1;justify-content:flex-end;gap:8px;display:flex}._6BVqoq_button{border:1px solid var(--aion-bg-3,#80808066);color:inherit;cursor:pointer;background:0 0;border-radius:6px;padding:3px 10px;font-size:12px}._6BVqoq_button:hover{background:#8080801f}._6BVqoq_button:disabled{opacity:.5;cursor:default}._6BVqoq_primary{color:#fff;background:#0a7aff;border-color:#0a7aff}._6BVqoq_danger{color:#e5484d;border-color:#e5484d66}._6BVqoq_error{color:#e5484d;font-size:12px}._6BVqoq_info{color:#46a758;font-size:12px}";
		const tagId = "dsh-easyssh/settings.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-easyssh";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var settings_module_css_default = {
			"actions": "_6BVqoq_actions",
			"button": "_6BVqoq_button",
			"danger": "_6BVqoq_danger",
			"empty": "_6BVqoq_empty",
			"error": "_6BVqoq_error",
			"field": "_6BVqoq_field",
			"form": "_6BVqoq_form",
			"formActions": "_6BVqoq_formActions",
			"hint": "_6BVqoq_hint",
			"info": "_6BVqoq_info",
			"modeLine": "_6BVqoq_modeLine",
			"page": "_6BVqoq_page",
			"primary": "_6BVqoq_primary",
			"rootCell": "_6BVqoq_rootCell",
			"rootLine": "_6BVqoq_rootLine",
			"table": "_6BVqoq_table",
			"title": "_6BVqoq_title"
		};
//#endregion
		//#region src/client/settings.tsx
		/**
		* The SSH host-manager settings page (registered in the `settings.section`
		* slot): list/add/edit/delete/test hosts persisted in ~/.dsh/dsh-ssh.json,
		* plus enter/exit SSH mode 鈥?so hosts are configured once in Settings and the
		* header button only needs to connect.
		*/
		const EMPTY_FORM = {
			alias: "",
			host: "",
			port: 22,
			user: "",
			auth: {
				kind: "password",
				password: ""
			},
			remoteRoot: ""
		};
		/** The settings page body. */
		function HostSettingsPage(props) {
			const state = (0, react.useSyncExternalStore)(props.mode.subscribe.bind(props.mode), props.mode.getSnapshot.bind(props.mode));
			const [hosts, setHosts] = (0, react.useState)(null);
			const [form, setForm] = (0, react.useState)(EMPTY_FORM);
			const [editingAlias, setEditingAlias] = (0, react.useState)(null);
			const [message, setMessage] = (0, react.useState)(null);
			const [busy, setBusy] = (0, react.useState)(false);
			const [roots, setRoots] = (0, react.useState)({});
			const [rootInput, setRootInput] = (0, react.useState)("");
			const refresh = async () => {
				try {
					setHosts(await props.hostsApi.list());
				} catch (error) {
					setHosts([]);
					setMessage({
						kind: "error",
						text: error instanceof Error ? error.message : String(error)
					});
				}
			};
			(0, react.useEffect)(() => {
				refresh();
			}, []);
			const set = (key, value) => {
				setForm((prev) => ({
					...prev,
					[key]: value
				}));
			};
			const saveHost = async () => {
				const alias = form.alias?.trim() ?? "";
				const host = form.host.trim();
				const user = form.user.trim();
				const port = Number.parseInt(String(form.port ?? 22), 10);
				if (alias === "" || host === "" || user === "" || !Number.isInteger(port) || port < 1 || port > 65535) {
					setMessage({
						kind: "error",
						text: "alias / host / user are required and port must be an integer"
					});
					return;
				}
				setBusy(true);
				setMessage(null);
				try {
					await props.hostsApi.create({
						alias,
						host,
						port,
						user,
						auth: form.auth?.kind === "key" ? {
							kind: "key",
							keyPath: form.auth.keyPath,
							passphrase: form.auth.passphrase
						} : {
							kind: "password",
							password: form.auth?.password ?? ""
						}
					});
					setForm(EMPTY_FORM);
					setEditingAlias(null);
					setMessage({
						kind: "info",
						text: tt("panel.saved")
					});
					await refresh();
				} catch (error) {
					setMessage({
						kind: "error",
						text: error instanceof Error ? error.message : String(error)
					});
				} finally {
					setBusy(false);
				}
			};
			const testHost = async (alias) => {
				setBusy(true);
				setMessage(null);
				try {
					const result = await props.hostsApi.test(alias);
					setMessage(result.ok ? {
						kind: "info",
						text: `${alias}: ${tt("dialog.testOk", result.latencyMs ?? 0)}`
					} : {
						kind: "error",
						text: `${alias}: ${tt("dialog.testFail", result.error ?? "unknown")}`
					});
				} catch (error) {
					setMessage({
						kind: "error",
						text: error instanceof Error ? error.message : String(error)
					});
				} finally {
					setBusy(false);
				}
			};
			const deleteHost = async (alias) => {
				setBusy(true);
				setMessage(null);
				try {
					const response = await fetch(`/api/dsh-ssh/hosts?alias=${encodeURIComponent(alias)}`, { method: "DELETE" });
					if (!response.ok) {
						const body = await response.json().catch(() => null);
						throw new Error(body?.error ?? `HTTP ${response.status}`);
					}
					if (state.mode === "remote" && state.alias === alias) await props.mode.setLocal();
					setMessage({
						kind: "info",
						text: `${alias} ${tt("panel.close")}`
					});
					await refresh();
				} catch (error) {
					setMessage({
						kind: "error",
						text: error instanceof Error ? error.message : String(error)
					});
				} finally {
					setBusy(false);
				}
			};
			const startEdit = (host) => {
				setEditingAlias(host.alias);
				setForm({
					alias: host.alias,
					host: host.host,
					port: host.port,
					user: host.user,
					auth: {
						kind: host.auth,
						password: ""
					},
					remoteRoot: ""
				});
			};
			const connect = async (alias, remoteRoot) => {
				setBusy(true);
				setMessage(null);
				try {
					await props.mode.setRemote(alias, remoteRoot === void 0 || remoteRoot.trim() === "" ? void 0 : remoteRoot.trim());
					setMessage({
						kind: "info",
						text: `SSH: ${alias}`
					});
				} catch (error) {
					setMessage({
						kind: "error",
						text: error instanceof Error ? error.message : String(error)
					});
				} finally {
					setBusy(false);
				}
			};
			const switchRoot = async (rootInput) => {
				const trimmed = rootInput.trim();
				if (state.mode !== "remote" || state.alias === void 0 || trimmed === "") return;
				setBusy(true);
				setMessage(null);
				try {
					await props.mode.setRemote(state.alias, trimmed);
					setMessage({
						kind: "info",
						text: `root: ${trimmed}`
					});
				} catch (error) {
					setMessage({
						kind: "error",
						text: error instanceof Error ? error.message : String(error)
					});
				} finally {
					setBusy(false);
				}
			};
			const exitRemote = async () => {
				setBusy(true);
				try {
					await props.mode.setLocal();
					setMessage({
						kind: "info",
						text: tt("panel.modeLocal")
					});
				} catch (error) {
					setMessage({
						kind: "error",
						text: error instanceof Error ? error.message : String(error)
					});
				} finally {
					setBusy(false);
				}
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: settings_module_css_default.page,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: settings_module_css_default.hint,
						children: tt("settings.hint")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: settings_module_css_default.modeLine,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("strong", { children: [tt("panel.modeRemote") === "Remote" ? "Mode" : "妯″紡", "锛?] }),
							state.mode === "remote" ? `${tt("panel.modeRemote")} ${state.alias ?? ""} @ ${state.remoteRootLabel ?? state.remoteRoot ?? "~"}` : tt("panel.modeLocal"),
							state.mode === "remote" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: settings_module_css_default.button,
								onClick: () => void exitRemote(),
								disabled: busy,
								children: tt("panel.exitRemote")
							})
						]
					}),
					state.mode === "remote" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: settings_module_css_default.rootLine,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							value: rootInput,
							placeholder: tt("panel.rootPlaceholder"),
							onChange: (event) => setRootInput(event.target.value),
							onKeyDown: (event) => {
								if (event.key === "Enter") switchRoot(rootInput);
							},
							spellCheck: false
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: settings_module_css_default.button,
							onClick: () => void switchRoot(rootInput),
							disabled: busy,
							children: tt("panel.rootApply")
						})]
					}),
					message !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: message.kind === "error" ? settings_module_css_default.error : settings_module_css_default.info,
						children: message.text
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
						className: settings_module_css_default.title,
						children: "Hosts"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("table", {
						className: settings_module_css_default.table,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: "alias" }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: "host" }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: "port" }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: "user" }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: "auth" }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: "remoteRoot" }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {})
						] }) }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tbody", { children: [(hosts ?? []).map((host) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: host.alias }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: host.host }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: host.port }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: host.user }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("td", { children: [host.auth, host.auth === "key" && !host.keyReady ? " (key missing)" : ""] }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								className: settings_module_css_default.rootCell,
								value: roots[host.alias] ?? "",
								placeholder: "~",
								onChange: (e) => setRoots((prev) => ({
									...prev,
									[host.alias]: e.target.value
								})),
								spellCheck: false
							}) }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("td", {
								className: settings_module_css_default.actions,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: settings_module_css_default.button,
										onClick: () => void connect(host.alias, roots[host.alias]),
										disabled: busy || state.mode === "remote",
										children: tt("dialog.enter")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: settings_module_css_default.button,
										onClick: () => void testHost(host.alias),
										disabled: busy,
										children: "Test"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: settings_module_css_default.button,
										onClick: () => startEdit(host),
										disabled: busy,
										children: "Edit"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: `${settings_module_css_default.button} ${settings_module_css_default.danger}`,
										onClick: () => void deleteHost(host.alias),
										disabled: busy,
										children: "Del"
									})
								]
							})
						] }, host.alias)), (hosts ?? []).length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
							colSpan: 7,
							className: settings_module_css_default.empty,
							children: hosts === null ? "鈥? : "(no hosts 鈥?add one below)"
						}) })] })]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
						className: settings_module_css_default.title,
						children: editingAlias !== null ? `Edit ${editingAlias}` : "Add host"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: settings_module_css_default.form,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								className: settings_module_css_default.field,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "alias" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									value: form.alias ?? "",
									disabled: editingAlias !== null,
									onChange: (e) => set("alias", e.target.value),
									placeholder: "my-server",
									spellCheck: false
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								className: settings_module_css_default.field,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "host" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									value: form.host,
									onChange: (e) => set("host", e.target.value),
									placeholder: "1.2.3.4",
									spellCheck: false
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								className: settings_module_css_default.field,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "port" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									value: String(form.port ?? 22),
									inputMode: "numeric",
									onChange: (e) => set("port", Number.parseInt(e.target.value, 10)),
									spellCheck: false
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								className: settings_module_css_default.field,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "user" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									value: form.user,
									onChange: (e) => set("user", e.target.value),
									placeholder: "root",
									spellCheck: false
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								className: settings_module_css_default.field,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "auth" }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
									value: form.auth?.kind ?? "password",
									onChange: (e) => set("auth", { kind: e.target.value }),
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
										value: "password",
										children: "password"
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
										value: "key",
										children: "key"
									})]
								})]
							}),
							form.auth?.kind === "key" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								className: settings_module_css_default.field,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "keyPath" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									value: form.auth.keyPath ?? "",
									onChange: (e) => set("auth", {
										kind: "key",
										keyPath: e.target.value
									}),
									placeholder: "C:\\\\Users\\\\you\\\\.ssh\\\\id_ed25519",
									spellCheck: false
								})]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								className: settings_module_css_default.field,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "passphrase" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									type: "password",
									value: form.auth.passphrase ?? "",
									onChange: (e) => set("auth", {
										kind: "key",
										passphrase: e.target.value
									}),
									spellCheck: false
								})]
							})] }) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								className: settings_module_css_default.field,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "password" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									type: "password",
									value: form.auth?.password ?? "",
									onChange: (e) => set("auth", {
										kind: "password",
										password: e.target.value
									}),
									spellCheck: false
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								className: settings_module_css_default.field,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "remoteRoot" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									value: form.remoteRoot,
									onChange: (e) => set("remoteRoot", e.target.value),
									placeholder: "~",
									spellCheck: false
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: settings_module_css_default.formActions,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: `${settings_module_css_default.button} ${settings_module_css_default.primary}`,
									onClick: () => void saveHost(),
									disabled: busy,
									children: editingAlias !== null ? "Update" : "Add host"
								}), editingAlias !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: settings_module_css_default.button,
									onClick: () => {
										setEditingAlias(null);
										setForm(EMPTY_FORM);
									},
									children: "Cancel"
								})]
							})
						]
					})
				]
			});
		}
//#endregion
		//#region src/client/state.ts
		const POLL_MS = 3e3;
		var ModeState = class {
			api;
			state = { mode: "local" };
			listeners = /* @__PURE__ */ new Set();
			timer;
			constructor(api) {
				this.api = api;
			}
			getSnapshot() {
				return this.state;
			}
			subscribe(listener) {
				this.listeners.add(listener);
				return () => {
					this.listeners.delete(listener);
				};
			}
			emit() {
				for (const listener of [...this.listeners]) listener();
			}
			/** Re-fetch the host state (no-op on network failure 鈥?keep the last view). */
			async refresh() {
				try {
					this.state = await this.api.getState();
					this.emit();
				} catch {}
			}
			start() {
				this.refresh();
				this.timer = window.setInterval(() => void this.refresh(), POLL_MS);
			}
			stop() {
				if (this.timer !== void 0) {
					window.clearInterval(this.timer);
					this.timer = void 0;
				}
			}
			async setLocal() {
				this.state = await this.api.setModeLocal();
				this.emit();
			}
			async setRemote(alias, remoteRoot) {
				this.state = await this.api.setModeRemote(alias, remoteRoot);
				this.emit();
			}
		};
//#endregion
		//#region src/client/index.ts
		/** The cross-plugin mode service name (read by the aionui panel). */
		const SSH_WORKSPACE_MODE_SERVICE = "sshWorkspaceMode";
		/** Required services: slots for the header buttons, locale for the copy, sessions for the local root. */
		const inject = [
			"slots",
			"locale",
			"sessions"
		];
		/** Apply the browser half. */
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, dictionaries), "dsh-easyssh: dictionaries");
			const api = new WorkspaceApi();
			const hostsApi = new SshHostsApi();
			const mode = new ModeState(api);
			const bindRoot = () => {
				const snapshot = ctx.sessions.list.getSnapshot();
				const sessionId = snapshot.current;
				sessionId === void 0 || snapshot.byId[sessionId]?.cwd;
			};
			const rootSubscription = ctx.sessions.list.subscribe(bindRoot);
			bindRoot();
			ctx.provide(SSH_WORKSPACE_MODE_SERVICE, mode);
			const disposers = [];
			try {
				ctx.slots.inject("conversation.session.header.utilities", () => {
					const unregister = [];
					unregister.push(ctx.slots.register({
						name: "conversation.session.header.utilities",
						id: "ssh-workspace-connect",
						order: -10,
						inject: () => ({
							mode,
							api,
							hostsApi
						})
					}, ConnectButton));
					unregister.push(ctx.slots.register({
						name: "conversation.session.header.utilities",
						id: "ssh-workspace-toggle",
						order: -9,
						inject: () => ({ mode })
					}, ToggleButton));
					return () => {
						for (const dispose of unregister) dispose();
					};
				});
				ctx.slots.inject("conversation.session.header.actions", () => ctx.slots.register({
					name: "conversation.session.header.actions",
					id: "ssh-workspace-badge",
					order: -100,
					inject: () => ({ mode })
				}, RemoteWorkspaceBadge));
				mode.start();
				ctx.slots.inject("settings.section", () => ctx.slots.register({
					name: "settings.section",
					id: "ssh-workspace-hosts",
					order: 100,
					label: () => tt("settings.label"),
					inject: () => ({
						mode,
						api,
						hostsApi
					})
				}, HostSettingsPage));
			} catch (error) {
				console.warn("[dsh-easyssh] mount failed:", error);
			}
			const syncLanguage = () => {
				setLanguage(document.documentElement.lang?.startsWith("zh") ?? false);
			};
			const langObserver = new MutationObserver(syncLanguage);
			langObserver.observe(document.documentElement, {
				attributes: true,
				attributeFilter: ["lang"]
			});
			syncLanguage();
			ctx.effect(() => () => {
				mode.stop();
				rootSubscription();
				langObserver.disconnect();
				for (const dispose of disposers.splice(0)) dispose();
			}, "dsh-easyssh: wiring");
		}
//#endregion
		exports.SSH_WORKSPACE_MODE_SERVICE = SSH_WORKSPACE_MODE_SERVICE;
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map