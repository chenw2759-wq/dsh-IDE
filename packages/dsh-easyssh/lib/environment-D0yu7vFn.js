import { SENSITIVE_ENV_PATTERN } from "@deepseek-ai/dsh-subprocess";
//#region src/remote/environment.ts
/**
* Remote-environment scrubbing for the SSH process and terminal launchers.
* Ported from UynajGI/dsh-ssh (MIT) — adapted to the dsh-ssh engine.
*/
/** Quote one argument for a POSIX login shell (from the dsh-ssh engine's world). */
function quoteShellArg(value) {
	return `'${value.replaceAll("'", "'\"'\"'")}'`;
}
/** Read the remote login environment (one exec per call; callers may cache). */
async function readRemoteEnvironment(engine, alias) {
	const result = await engine.exec(alias, "env", 1e4);
	if (!result.success) throw new Error(`subprocess-ssh: cannot read the remote environment: ${result.stderr.trim() || "unknown error"}`);
	const environment = {};
	for (const line of result.stdout.split("\n")) {
		if (line === "") continue;
		const separator = line.indexOf("=");
		if (separator <= 0) continue;
		const name = line.slice(0, separator);
		if (name.includes("\0")) continue;
		environment[name] = line.slice(separator + 1);
	}
	return environment;
}
/**
* Remove harness-private and credential-shaped names from a remote environment.
*/
function scrubRemoteEnvironment(environment) {
	const scrubbed = /* @__PURE__ */ new Map();
	for (const [name, value] of Object.entries(environment)) {
		if (name.startsWith("DSH_") || SENSITIVE_ENV_PATTERN.test(name)) continue;
		scrubbed.set(name, value);
	}
	return scrubbed;
}
/**
* Overlay explicit entries and serialize one validated environment for `env -i`.
*/
function serializeEnvironment(scrubbed, explicit) {
	const environment = new Map(scrubbed);
	for (const [name, value] of Object.entries(explicit ?? {})) {
		if (name.length === 0 || name.includes("=") || name.includes("\0") || value?.includes("\0") === true) throw new Error("subprocess-ssh: environment entries require non-empty NUL-free names without = and NUL-free values");
		if (value === void 0) environment.delete(name);
		else environment.set(name, value);
	}
	return [...environment].map(([name, value]) => quoteShellArg(`${name}=${value}`)).join(" ");
}
//#endregion
export { serializeEnvironment as i, readRemoteEnvironment as n, scrubRemoteEnvironment as r, quoteShellArg as t };
