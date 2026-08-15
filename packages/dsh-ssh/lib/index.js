import { installSettingsSection, settingsNamespace } from "@deepseek-ai/dsh-settings";
import { createServer } from "node:net";
import { createReadStream, createWriteStream, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { Client } from "ssh2";
import { homedir, tmpdir } from "node:os";
import { unlink } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { WebSocket, WebSocketServer } from "ws";
import { defineTool } from "@deepseek-ai/dsh-tools";
//#region \0rolldown/runtime.js
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJSMin = (cb, mod) => () => (mod || (cb((mod = { exports: {} }).exports, mod), cb = null), mod.exports);
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
		key = keys[i];
		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
			get: ((k) => from[k]).bind(null, key),
			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
		});
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));
//#endregion
//#region ../../node_modules/.pnpm/cosmokit@1.8.1/node_modules/cosmokit/lib/index.cjs
var require_lib$1 = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __export = (target, all) => {
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	};
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: () => from[key],
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
	var index_exports = {};
	__export(index_exports, {
		Binary: () => Binary,
		Time: () => Time,
		arrayBufferToBase64: () => arrayBufferToBase64,
		arrayBufferToHex: () => arrayBufferToHex,
		base64ToArrayBuffer: () => base64ToArrayBuffer,
		camelCase: () => camelCase,
		camelize: () => camelize,
		capitalize: () => capitalize,
		clone: () => clone,
		contain: () => contain,
		deduplicate: () => deduplicate,
		deepEqual: () => deepEqual,
		defineProperty: () => defineProperty,
		difference: () => difference,
		filterKeys: () => filterKeys,
		formatProperty: () => formatProperty,
		hexToArrayBuffer: () => hexToArrayBuffer,
		hyphenate: () => hyphenate,
		intersection: () => intersection,
		is: () => is,
		isNonNullable: () => isNonNullable,
		isNullable: () => isNullable,
		isPlainObject: () => isPlainObject,
		makeArray: () => makeArray,
		mapValues: () => mapValues,
		noop: () => noop,
		omit: () => omit,
		paramCase: () => paramCase,
		pick: () => pick,
		remove: () => remove,
		sanitize: () => sanitize,
		snakeCase: () => snakeCase,
		trimSlash: () => trimSlash,
		uncapitalize: () => uncapitalize,
		union: () => union,
		valueMap: () => mapValues
	});
	module.exports = __toCommonJS(index_exports);
	function noop() {}
	function isNullable(value) {
		return value === null || value === void 0;
	}
	function isNonNullable(value) {
		return !isNullable(value);
	}
	function isPlainObject(data) {
		return data && typeof data === "object" && !Array.isArray(data);
	}
	function filterKeys(object, filter) {
		return Object.fromEntries(Object.entries(object).filter(([key, value]) => filter(key, value)));
	}
	function mapValues(object, transform) {
		return Object.fromEntries(Object.entries(object).map(([key, value]) => [key, transform(value, key)]));
	}
	function pick(source, keys, forced) {
		if (!keys) return { ...source };
		const result = {};
		for (const key of keys) if (forced || source[key] !== void 0) result[key] = source[key];
		return result;
	}
	function omit(source, keys) {
		if (!keys) return { ...source };
		const result = { ...source };
		for (const key of keys) Reflect.deleteProperty(result, key);
		return result;
	}
	function defineProperty(object, key, value) {
		return Object.defineProperty(object, key, {
			writable: true,
			value,
			enumerable: false
		});
	}
	function contain(array1, array2) {
		return array2.every((item) => array1.includes(item));
	}
	function intersection(array1, array2) {
		return array1.filter((item) => array2.includes(item));
	}
	function difference(array1, array2) {
		return array1.filter((item) => !array2.includes(item));
	}
	function union(array1, array2) {
		return Array.from(/* @__PURE__ */ new Set([...array1, ...array2]));
	}
	function deduplicate(array) {
		return [...new Set(array)];
	}
	function remove(list, item) {
		const index = list?.indexOf(item);
		if (index >= 0) {
			list.splice(index, 1);
			return true;
		} else return false;
	}
	function makeArray(source) {
		return Array.isArray(source) ? source : isNullable(source) ? [] : [source];
	}
	function is(type, value) {
		if (arguments.length === 1) return (value2) => is(type, value2);
		return type in globalThis && value instanceof globalThis[type] || Object.prototype.toString.call(value).slice(8, -1) === type;
	}
	function isArrayBufferLike(value) {
		return is("ArrayBuffer", value) || is("SharedArrayBuffer", value);
	}
	function isArrayBufferSource(value) {
		return isArrayBufferLike(value) || ArrayBuffer.isView(value);
	}
	var Binary;
	((Binary2) => {
		Binary2.is = isArrayBufferLike;
		Binary2.isSource = isArrayBufferSource;
		function fromSource(source) {
			if (ArrayBuffer.isView(source)) return source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength);
			else return source;
		}
		Binary2.fromSource = fromSource;
		function toBase64(source) {
			source = fromSource(source);
			if (typeof Buffer !== "undefined") return Buffer.from(source).toString("base64");
			let binary = "";
			const bytes = new Uint8Array(source);
			for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
			return btoa(binary);
		}
		Binary2.toBase64 = toBase64;
		function fromBase64(source) {
			if (typeof Buffer !== "undefined") return fromSource(Buffer.from(source, "base64"));
			return Uint8Array.from(atob(source), (c) => c.charCodeAt(0));
		}
		Binary2.fromBase64 = fromBase64;
		function toHex(source) {
			source = fromSource(source);
			if (typeof Buffer !== "undefined") return Buffer.from(source).toString("hex");
			return Array.from(new Uint8Array(source), (byte) => byte.toString(16).padStart(2, "0")).join("");
		}
		Binary2.toHex = toHex;
		function fromHex(source) {
			if (typeof Buffer !== "undefined") return fromSource(Buffer.from(source, "hex"));
			const hex = source.length % 2 === 0 ? source : source.slice(0, source.length - 1);
			const buffer = [];
			for (let i = 0; i < hex.length; i += 2) buffer.push(parseInt(`${hex[i]}${hex[i + 1]}`, 16));
			return Uint8Array.from(buffer).buffer;
		}
		Binary2.fromHex = fromHex;
	})(Binary || (Binary = {}));
	var base64ToArrayBuffer = Binary.fromBase64;
	var arrayBufferToBase64 = Binary.toBase64;
	var hexToArrayBuffer = Binary.fromHex;
	var arrayBufferToHex = Binary.toHex;
	function clone(source, refs = /* @__PURE__ */ new Map()) {
		if (!source || typeof source !== "object") return source;
		if (is("Date", source)) return new Date(source.valueOf());
		if (is("RegExp", source)) return new RegExp(source.source, source.flags);
		if (isArrayBufferLike(source)) return source.slice(0);
		if (ArrayBuffer.isView(source)) return source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength);
		const cached = refs.get(source);
		if (cached) return cached;
		if (Array.isArray(source)) {
			const result2 = [];
			refs.set(source, result2);
			source.forEach((value, index) => {
				result2[index] = Reflect.apply(clone, null, [value, refs]);
			});
			return result2;
		}
		const result = Object.create(Object.getPrototypeOf(source));
		refs.set(source, result);
		for (const key of Reflect.ownKeys(source)) {
			const descriptor = { ...Reflect.getOwnPropertyDescriptor(source, key) };
			if ("value" in descriptor) descriptor.value = Reflect.apply(clone, null, [descriptor.value, refs]);
			Reflect.defineProperty(result, key, descriptor);
		}
		return result;
	}
	function deepEqual(a, b, strict) {
		if (a === b) return true;
		if (!strict && isNullable(a) && isNullable(b)) return true;
		if (typeof a !== typeof b) return false;
		if (typeof a !== "object") return false;
		if (!a || !b) return false;
		function check(test, then) {
			return test(a) ? test(b) ? then(a, b) : false : test(b) ? false : void 0;
		}
		return check(Array.isArray, (a2, b2) => a2.length === b2.length && a2.every((item, index) => deepEqual(item, b2[index]))) ?? check(is("Date"), (a2, b2) => a2.valueOf() === b2.valueOf()) ?? check(is("RegExp"), (a2, b2) => a2.source === b2.source && a2.flags === b2.flags) ?? check(isArrayBufferLike, (a2, b2) => {
			if (a2.byteLength !== b2.byteLength) return false;
			const viewA = new Uint8Array(a2);
			const viewB = new Uint8Array(b2);
			for (let i = 0; i < viewA.length; i++) if (viewA[i] !== viewB[i]) return false;
			return true;
		}) ?? Object.keys({
			...a,
			...b
		}).every((key) => deepEqual(a[key], b[key], strict));
	}
	function capitalize(source) {
		return source.charAt(0).toUpperCase() + source.slice(1);
	}
	function uncapitalize(source) {
		return source.charAt(0).toLowerCase() + source.slice(1);
	}
	function camelCase(source) {
		return source.replace(/[_-][a-z]/g, (str) => str.slice(1).toUpperCase());
	}
	function tokenize(source, delimiters, delimiter) {
		const output = [];
		let state = 0;
		for (let i = 0; i < source.length; i++) {
			const code = source.charCodeAt(i);
			if (code >= 65 && code <= 90) {
				if (state === 1) {
					const next = source.charCodeAt(i + 1);
					if (next >= 97 && next <= 122) output.push(delimiter);
					output.push(code + 32);
				} else {
					if (state !== 0) output.push(delimiter);
					output.push(code + 32);
				}
				state = 1;
			} else if (code >= 97 && code <= 122) {
				output.push(code);
				state = 2;
			} else if (delimiters.includes(code)) {
				if (state !== 0) output.push(delimiter);
				state = 0;
			} else output.push(code);
		}
		return String.fromCharCode(...output);
	}
	function paramCase(source) {
		return tokenize(source, [45, 95], 45);
	}
	function snakeCase(source) {
		return tokenize(source, [45, 95], 95);
	}
	var camelize = camelCase;
	var hyphenate = paramCase;
	function formatProperty(key) {
		if (typeof key !== "string") return `[${key.toString()}]`;
		return /^[a-z_$][\w$]*$/i.test(key) ? `.${key}` : `[${JSON.stringify(key)}]`;
	}
	function trimSlash(source) {
		return source.replace(/\/$/, "");
	}
	function sanitize(source) {
		if (!source.startsWith("/")) source = "/" + source;
		return trimSlash(source);
	}
	var Time;
	((Time2) => {
		Time2.millisecond = 1;
		Time2.second = 1e3;
		Time2.minute = Time2.second * 60;
		Time2.hour = Time2.minute * 60;
		Time2.day = Time2.hour * 24;
		Time2.week = Time2.day * 7;
		let timezoneOffset = (/* @__PURE__ */ new Date()).getTimezoneOffset();
		function setTimezoneOffset(offset) {
			timezoneOffset = offset;
		}
		Time2.setTimezoneOffset = setTimezoneOffset;
		function getTimezoneOffset() {
			return timezoneOffset;
		}
		Time2.getTimezoneOffset = getTimezoneOffset;
		function getDateNumber(date = /* @__PURE__ */ new Date(), offset) {
			if (typeof date === "number") date = new Date(date);
			if (offset === void 0) offset = timezoneOffset;
			return Math.floor((date.valueOf() / Time2.minute - offset) / 1440);
		}
		Time2.getDateNumber = getDateNumber;
		function fromDateNumber(value, offset) {
			const date = new Date(value * Time2.day);
			if (offset === void 0) offset = timezoneOffset;
			return new Date(+date + offset * Time2.minute);
		}
		Time2.fromDateNumber = fromDateNumber;
		const numeric = /\d+(?:\.\d+)?/.source;
		const timeRegExp = new RegExp(`^${[
			"w(?:eek(?:s)?)?",
			"d(?:ay(?:s)?)?",
			"h(?:our(?:s)?)?",
			"m(?:in(?:ute)?(?:s)?)?",
			"s(?:ec(?:ond)?(?:s)?)?"
		].map((unit) => `(${numeric}${unit})?`).join("")}$`);
		function parseTime(source) {
			const capture = timeRegExp.exec(source);
			if (!capture) return 0;
			return (parseFloat(capture[1]) * Time2.week || 0) + (parseFloat(capture[2]) * Time2.day || 0) + (parseFloat(capture[3]) * Time2.hour || 0) + (parseFloat(capture[4]) * Time2.minute || 0) + (parseFloat(capture[5]) * Time2.second || 0);
		}
		Time2.parseTime = parseTime;
		function parseDate(date) {
			const parsed = parseTime(date);
			if (parsed) date = Date.now() + parsed;
			else if (/^\d{1,2}(:\d{1,2}){1,2}$/.test(date)) date = `${(/* @__PURE__ */ new Date()).toLocaleDateString()}-${date}`;
			else if (/^\d{1,2}-\d{1,2}-\d{1,2}(:\d{1,2}){1,2}$/.test(date)) date = `${(/* @__PURE__ */ new Date()).getFullYear()}-${date}`;
			return date ? new Date(date) : /* @__PURE__ */ new Date();
		}
		Time2.parseDate = parseDate;
		function format(ms) {
			const abs = Math.abs(ms);
			if (abs >= Time2.day - Time2.hour / 2) return Math.round(ms / Time2.day) + "d";
			else if (abs >= Time2.hour - Time2.minute / 2) return Math.round(ms / Time2.hour) + "h";
			else if (abs >= Time2.minute - Time2.second / 2) return Math.round(ms / Time2.minute) + "m";
			else if (abs >= Time2.second) return Math.round(ms / Time2.second) + "s";
			return ms + "ms";
		}
		Time2.format = format;
		function toDigits(source, length = 2) {
			return source.toString().padStart(length, "0");
		}
		Time2.toDigits = toDigits;
		function template(template2, time = /* @__PURE__ */ new Date()) {
			return template2.replace("yyyy", time.getFullYear().toString()).replace("yy", time.getFullYear().toString().slice(2)).replace("MM", toDigits(time.getMonth() + 1)).replace("dd", toDigits(time.getDate())).replace("hh", toDigits(time.getHours())).replace("mm", toDigits(time.getMinutes())).replace("ss", toDigits(time.getSeconds())).replace("SSS", toDigits(time.getMilliseconds(), 3));
		}
		Time2.template = template;
	})(Time || (Time = {}));
	0 && (module.exports = {
		Binary,
		Time,
		arrayBufferToBase64,
		arrayBufferToHex,
		base64ToArrayBuffer,
		camelCase,
		camelize,
		capitalize,
		clone,
		contain,
		deduplicate,
		deepEqual,
		defineProperty,
		difference,
		filterKeys,
		formatProperty,
		hexToArrayBuffer,
		hyphenate,
		intersection,
		is,
		isNonNullable,
		isNullable,
		isPlainObject,
		makeArray,
		mapValues,
		noop,
		omit,
		paramCase,
		pick,
		remove,
		sanitize,
		snakeCase,
		trimSlash,
		uncapitalize,
		union,
		valueMap
	});
}));
//#endregion
//#region src/store.ts
var import_lib = /* @__PURE__ */ __toESM((/* @__PURE__ */ __commonJSMin(((exports, module) => {
	var __defProp = Object.defineProperty;
	var __name = (target, value) => __defProp(target, "name", {
		value,
		configurable: true
	});
	var import_cosmokit = require_lib$1();
	var kSchema = Symbol.for("schemastery");
	var kValidationError = Symbol.for("ValidationError");
	globalThis.__schemastery_index__ ??= 0;
	globalThis.__schemastery_refs__ = void 0;
	var ValidationError = class extends TypeError {
		constructor(message, options) {
			let prefix = "$";
			for (const segment of options.path || []) if (typeof segment === "string") prefix += "." + segment;
			else if (typeof segment === "number") prefix += "[" + segment + "]";
			else if (typeof segment === "symbol") prefix += `[Symbol(${segment.toString()})]`;
			if (prefix.startsWith(".")) prefix = prefix.slice(1);
			super((prefix === "$" ? "" : `${prefix} `) + message);
			this.options = options;
		}
		static {
			__name(this, "ValidationError");
		}
		name = "ValidationError";
		static is(error) {
			return !!error?.[kValidationError];
		}
	};
	Object.defineProperty(ValidationError.prototype, kValidationError, { value: true });
	var Schema = /* @__PURE__ */ __name(function(options) {
		const schema = /* @__PURE__ */ __name(function(data, options2 = {}) {
			return Schema.resolve(data, schema, options2)[0];
		}, "schema");
		if (options.refs) {
			const refs = (0, import_cosmokit.valueMap)(options.refs, (options2) => new Schema(options2));
			const getRef = /* @__PURE__ */ __name((uid) => refs[uid], "getRef");
			for (const key in refs) {
				const options2 = refs[key];
				options2.sKey = getRef(options2.sKey);
				options2.inner = getRef(options2.inner);
				options2.list = options2.list && options2.list.map(getRef);
				options2.dict = options2.dict && (0, import_cosmokit.valueMap)(options2.dict, getRef);
			}
			return refs[options.uid];
		}
		Object.assign(schema, options);
		if (typeof schema.callback === "string") try {
			schema.callback = new Function("return " + schema.callback)();
		} catch {}
		Object.defineProperty(schema, "uid", { value: globalThis.__schemastery_index__++ });
		Object.setPrototypeOf(schema, Schema.prototype);
		schema.meta ||= {};
		schema.toString = schema.toString.bind(schema);
		return schema;
	}, "Schema");
	Schema.prototype = Object.create(Function.prototype);
	Schema.prototype[kSchema] = true;
	Object.defineProperty(Schema.prototype, "~standard", { get() {
		return {
			version: 1,
			vendor: "schemastery",
			validate: /* @__PURE__ */ __name((value) => {
				try {
					return { value: Schema.resolve(value, this, {})[0] };
				} catch (error) {
					if (ValidationError.is(error)) return { issues: [{
						message: error.message,
						path: error.options.path
					}] };
					throw error;
				}
			}, "validate")
		};
	} });
	Schema.ValidationError = ValidationError;
	Schema.prototype.toJSON = /* @__PURE__ */ __name(function toJSON() {
		if (globalThis.__schemastery_refs__) {
			globalThis.__schemastery_refs__[this.uid] ??= JSON.parse(JSON.stringify({ ...this }));
			return this.uid;
		}
		globalThis.__schemastery_refs__ = { [this.uid]: { ...this } };
		globalThis.__schemastery_refs__[this.uid] = JSON.parse(JSON.stringify({ ...this }));
		const result = {
			uid: this.uid,
			refs: globalThis.__schemastery_refs__
		};
		globalThis.__schemastery_refs__ = void 0;
		return result;
	}, "toJSON");
	Schema.prototype.set = /* @__PURE__ */ __name(function set(key, value) {
		this.dict[key] = value;
		return this;
	}, "set");
	Schema.prototype.push = /* @__PURE__ */ __name(function push(value) {
		this.list.push(value);
		return this;
	}, "push");
	function mergeDesc(original, messages) {
		const result = typeof original === "string" ? { "": original } : { ...original };
		for (const locale in messages) {
			const value = messages[locale];
			if (value?.$description || value?.$desc) result[locale] = value.$description || value.$desc;
			else if (typeof value === "string") result[locale] = value;
		}
		return result;
	}
	__name(mergeDesc, "mergeDesc");
	function getInner(value) {
		return value?.$value ?? value?.$inner;
	}
	__name(getInner, "getInner");
	function extractKeys(data) {
		return (0, import_cosmokit.filterKeys)(data ?? {}, (key) => !key.startsWith("$"));
	}
	__name(extractKeys, "extractKeys");
	Schema.prototype.i18n = /* @__PURE__ */ __name(function i18n(messages) {
		const schema = Schema(this);
		const desc = mergeDesc(schema.meta.description, messages);
		if (Object.keys(desc).length) schema.meta.description = desc;
		if (schema.dict) schema.dict = (0, import_cosmokit.valueMap)(schema.dict, (inner, key) => {
			return inner.i18n((0, import_cosmokit.valueMap)(messages, (data) => getInner(data)?.[key] ?? data?.[key]));
		});
		if (schema.list) schema.list = schema.list.map((inner, index) => {
			return inner.i18n((0, import_cosmokit.valueMap)(messages, (data = {}) => {
				if (Array.isArray(getInner(data))) return getInner(data)[index];
				if (Array.isArray(data)) return data[index];
				return extractKeys(data);
			}));
		});
		if (schema.inner) schema.inner = schema.inner.i18n((0, import_cosmokit.valueMap)(messages, (data) => {
			if (getInner(data)) return getInner(data);
			return extractKeys(data);
		}));
		if (schema.sKey) schema.sKey = schema.sKey.i18n((0, import_cosmokit.valueMap)(messages, (data) => data?.$key));
		return schema;
	}, "i18n");
	Schema.prototype.extra = /* @__PURE__ */ __name(function extra(key, value) {
		const schema = Schema(this);
		schema.meta = {
			...schema.meta,
			[key]: value
		};
		return schema;
	}, "extra");
	for (const key of [
		"required",
		"disabled",
		"collapse",
		"hidden",
		"loose"
	]) Object.assign(Schema.prototype, { [key](value = true) {
		const schema = Schema(this);
		schema.meta = {
			...schema.meta,
			[key]: value
		};
		return schema;
	} });
	Schema.prototype.deprecated = /* @__PURE__ */ __name(function deprecated() {
		const schema = Schema(this);
		schema.meta.badges ||= [];
		schema.meta.badges.push({
			text: "deprecated",
			type: "danger"
		});
		return schema;
	}, "deprecated");
	Schema.prototype.experimental = /* @__PURE__ */ __name(function experimental() {
		const schema = Schema(this);
		schema.meta.badges ||= [];
		schema.meta.badges.push({
			text: "experimental",
			type: "warning"
		});
		return schema;
	}, "experimental");
	Schema.prototype.pattern = /* @__PURE__ */ __name(function pattern(regexp) {
		const schema = Schema(this);
		const pattern2 = (0, import_cosmokit.pick)(regexp, ["source", "flags"]);
		schema.meta = {
			...schema.meta,
			pattern: pattern2
		};
		return schema;
	}, "pattern");
	Schema.prototype.simplify = /* @__PURE__ */ __name(function simplify(value) {
		if ((0, import_cosmokit.deepEqual)(value, this.meta.default, this.type === "dict")) return null;
		if ((0, import_cosmokit.isNullable)(value)) return value;
		if (this.type === "object" || this.type === "dict") {
			const result = {};
			for (const key in value) {
				const item = (this.type === "object" ? this.dict[key] : this.inner)?.simplify(value[key]);
				if (this.type === "dict" || !(0, import_cosmokit.isNullable)(item)) result[key] = item;
			}
			if ((0, import_cosmokit.deepEqual)(result, this.meta.default, this.type === "dict")) return null;
			return result;
		} else if (this.type === "array" || this.type === "tuple") {
			const result = [];
			value.forEach((value2, index) => {
				const schema = this.type === "array" ? this.inner : this.list[index];
				const item = schema ? schema.simplify(value2) : value2;
				result.push(item);
			});
			return result;
		} else if (this.type === "intersect") {
			const result = {};
			for (const item of this.list) Object.assign(result, item.simplify(value));
			return result;
		} else if (this.type === "union") for (const schema of this.list) try {
			Schema.resolve(value, schema, {});
			return schema.simplify(value);
		} catch {}
		return value;
	}, "simplify");
	Schema.prototype.toString = /* @__PURE__ */ __name(function toString(inline) {
		return formatters[this.type]?.(this, inline) ?? `Schema<${this.type}>`;
	}, "toString");
	Schema.prototype.role = /* @__PURE__ */ __name(function role(role, extra2) {
		const schema = Schema(this);
		schema.meta = {
			...schema.meta,
			role,
			extra: extra2
		};
		return schema;
	}, "role");
	for (const key of [
		"default",
		"link",
		"comment",
		"description",
		"max",
		"min",
		"step"
	]) Object.assign(Schema.prototype, { [key](value) {
		const schema = Schema(this);
		schema.meta = {
			...schema.meta,
			[key]: value
		};
		return schema;
	} });
	var resolvers = {};
	Schema.extend = /* @__PURE__ */ __name(function extend(type, resolve2) {
		resolvers[type] = resolve2;
	}, "extend");
	Schema.resolve = /* @__PURE__ */ __name(function resolve(data, schema, options = {}, strict = false) {
		if (!schema) return [data];
		if (options.ignore?.(data, schema)) return [data];
		if ((0, import_cosmokit.isNullable)(data) && schema.type !== "lazy") {
			if (schema.meta.required) throw new ValidationError(`missing required value`, options);
			let current = schema;
			let fallback = schema.meta.default;
			while (current?.type === "intersect" && (0, import_cosmokit.isNullable)(fallback)) {
				current = current.list[0];
				fallback = current?.meta.default;
			}
			if ((0, import_cosmokit.isNullable)(fallback)) return [data];
			data = (0, import_cosmokit.clone)(fallback);
		}
		const callback = resolvers[schema.type];
		if (!callback) throw new ValidationError(`unsupported type "${schema.type}"`, options);
		try {
			return callback(data, schema, options, strict);
		} catch (error) {
			if (!schema.meta.loose) throw error;
			return [schema.meta.default];
		}
	}, "resolve");
	Schema.from = /* @__PURE__ */ __name(function from(source) {
		if ((0, import_cosmokit.isNullable)(source)) return Schema.any();
		else if ([
			"string",
			"number",
			"boolean"
		].includes(typeof source)) return Schema.const(source).required();
		else if (source[kSchema]) return source;
		else if (typeof source === "function") switch (source) {
			case String: return Schema.string().required();
			case Number: return Schema.number().required();
			case Boolean: return Schema.boolean().required();
			case Function: return Schema.function().required();
			default: return Schema.is(source).required();
		}
		else throw new TypeError(`cannot infer schema from ${source}`);
	}, "from");
	Schema.lazy = /* @__PURE__ */ __name(function lazy(builder) {
		const schema = new Schema({
			type: "lazy",
			builder,
			inner: { toJSON: /* @__PURE__ */ __name(() => {
				if (!schema.inner[kSchema]) {
					schema.inner = schema.builder();
					schema.inner.meta = {
						...schema.meta,
						...schema.inner.meta
					};
				}
				return schema.inner.toJSON();
			}, "toJSON") }
		});
		return schema;
	}, "lazy");
	Schema.natural = /* @__PURE__ */ __name(function natural() {
		return Schema.number().step(1).min(0);
	}, "natural");
	Schema.percent = /* @__PURE__ */ __name(function percent() {
		return Schema.number().step(.01).min(0).max(1).role("slider");
	}, "percent");
	Schema.date = /* @__PURE__ */ __name(function date() {
		return Schema.union([Schema.is(Date), Schema.transform(Schema.string().role("datetime"), (value, options) => {
			const date2 = new Date(value);
			if (isNaN(+date2)) throw new ValidationError(`invalid date "${value}"`, options);
			return date2;
		}, true)]);
	}, "date");
	Schema.regExp = /* @__PURE__ */ __name(function regExp(flag = "") {
		return Schema.union([Schema.is(RegExp), Schema.transform(Schema.string().role("regexp", { flag }), (value, options) => {
			try {
				return new RegExp(value, flag);
			} catch (e) {
				throw new ValidationError(e.message, options);
			}
		}, true)]);
	}, "regExp");
	Schema.arrayBuffer = /* @__PURE__ */ __name(function arrayBuffer(encoding) {
		return Schema.union([
			Schema.is(ArrayBuffer),
			Schema.is(SharedArrayBuffer),
			Schema.transform(Schema.any(), (value, options) => {
				if (import_cosmokit.Binary.isSource(value)) return import_cosmokit.Binary.fromSource(value);
				throw new ValidationError(`expected ArrayBufferSource but got ${value}`, options);
			}, true),
			...encoding ? [Schema.transform(Schema.string(), (value, options) => {
				try {
					return encoding === "base64" ? import_cosmokit.Binary.fromBase64(value) : import_cosmokit.Binary.fromHex(value);
				} catch (e) {
					throw new ValidationError(e.message, options);
				}
			}, true)] : []
		]);
	}, "arrayBuffer");
	Schema.extend("lazy", (data, schema, options, strict) => {
		if (!schema.inner[kSchema]) {
			schema.inner = schema.builder();
			schema.inner.meta = {
				...schema.meta,
				...schema.inner.meta
			};
		}
		return Schema.resolve(data, schema.inner, options, strict);
	});
	Schema.extend("any", (data) => {
		return [data];
	});
	Schema.extend("never", (data, _, options) => {
		throw new ValidationError(`expected nullable but got ${data}`, options);
	});
	Schema.extend("const", (data, { value }, options) => {
		if ((0, import_cosmokit.deepEqual)(data, value)) return [value];
		throw new ValidationError(`expected ${value} but got ${data}`, options);
	});
	function checkWithinRange(data, meta, description, options, skipMin = false) {
		const { max = Infinity, min = -Infinity } = meta;
		if (data > max) throw new ValidationError(`expected ${description} <= ${max} but got ${data}`, options);
		if (data < min && !skipMin) throw new ValidationError(`expected ${description} >= ${min} but got ${data}`, options);
	}
	__name(checkWithinRange, "checkWithinRange");
	Schema.extend("string", (data, { meta }, options) => {
		if (typeof data !== "string") throw new ValidationError(`expected string but got ${data}`, options);
		if (meta.pattern) {
			const regexp = new RegExp(meta.pattern.source, meta.pattern.flags);
			if (!regexp.test(data)) throw new ValidationError(`expect string to match regexp ${regexp}`, options);
		}
		checkWithinRange(data.length, meta, "string length", options);
		return [data];
	});
	function decimalShift(data, digits) {
		const str = data.toString();
		if (str.includes("e")) return data * Math.pow(10, digits);
		const index = str.indexOf(".");
		if (index === -1) return data * Math.pow(10, digits);
		const frac = str.slice(index + 1);
		const integer = str.slice(0, index);
		if (frac.length <= digits) return +(integer + frac.padEnd(digits, "0"));
		return +(integer + frac.slice(0, digits) + "." + frac.slice(digits));
	}
	__name(decimalShift, "decimalShift");
	function isMultipleOf(data, min, step) {
		step = Math.abs(step);
		if (!/^\d+\.\d+$/.test(step.toString())) return (data - min) % step === 0;
		const index = step.toString().indexOf(".");
		const digits = step.toString().slice(index + 1).length;
		return Math.abs(decimalShift(data, digits) - decimalShift(min, digits)) % decimalShift(step, digits) === 0;
	}
	__name(isMultipleOf, "isMultipleOf");
	Schema.extend("number", (data, { meta }, options) => {
		if (typeof data !== "number") throw new ValidationError(`expected number but got ${data}`, options);
		checkWithinRange(data, meta, "number", options);
		const { step } = meta;
		if (step && !isMultipleOf(data, meta.min ?? 0, step)) throw new ValidationError(`expected number multiple of ${step} but got ${data}`, options);
		return [data];
	});
	Schema.extend("boolean", (data, _, options) => {
		if (typeof data === "boolean") return [data];
		throw new ValidationError(`expected boolean but got ${data}`, options);
	});
	Schema.extend("bitset", (data, { bits, meta }, options) => {
		let value = 0, keys = [];
		if (typeof data === "number") {
			value = data;
			for (const key in bits) if (data & bits[key]) keys.push(key);
		} else if (Array.isArray(data)) {
			keys = data;
			for (const key of keys) {
				if (typeof key !== "string") throw new ValidationError(`expected string but got ${key}`, options);
				if (key in bits) value |= bits[key];
			}
		} else throw new ValidationError(`expected number or array but got ${data}`, options);
		if (value === meta.default) return [value];
		return [value, keys];
	});
	Schema.extend("function", (data, _, options) => {
		if (typeof data === "function") return [data];
		throw new ValidationError(`expected function but got ${data}`, options);
	});
	Schema.extend("is", (data, { constructor }, options) => {
		if (typeof constructor === "function") {
			if (data instanceof constructor) return [data];
			throw new ValidationError(`expected ${constructor.name} but got ${data}`, options);
		} else {
			if ((0, import_cosmokit.isNullable)(data)) throw new ValidationError(`expected ${constructor} but got ${data}`, options);
			let prototype = Object.getPrototypeOf(data);
			while (prototype) {
				if (prototype.constructor?.name === constructor) return [data];
				prototype = Object.getPrototypeOf(prototype);
			}
			throw new ValidationError(`expected ${constructor} but got ${data}`, options);
		}
	});
	function property(data, key, schema, options) {
		try {
			const [value, adapted] = Schema.resolve(data[key], schema, {
				...options,
				path: [...options.path || [], key]
			});
			if (adapted !== void 0) data[key] = adapted;
			return value;
		} catch (e) {
			if (!options?.autofix) throw e;
			delete data[key];
			return schema.meta.default;
		}
	}
	__name(property, "property");
	Schema.extend("array", (data, { inner, meta }, options) => {
		if (!Array.isArray(data)) throw new ValidationError(`expected array but got ${data}`, options);
		checkWithinRange(data.length, meta, "array length", options, !(0, import_cosmokit.isNullable)(inner.meta.default));
		return [data.map((_, index) => property(data, index, inner, options))];
	});
	Schema.extend("dict", (data, { inner, sKey }, options, strict) => {
		if (!(0, import_cosmokit.isPlainObject)(data)) throw new ValidationError(`expected object but got ${data}`, options);
		const result = {};
		for (const key in data) {
			let rKey;
			try {
				rKey = Schema.resolve(key, sKey, options)[0];
			} catch (error) {
				if (strict) continue;
				throw error;
			}
			result[rKey] = property(data, key, inner, options);
			data[rKey] = data[key];
			if (key !== rKey) delete data[key];
		}
		return [result];
	});
	Schema.extend("tuple", (data, { list }, options, strict) => {
		if (!Array.isArray(data)) throw new ValidationError(`expected array but got ${data}`, options);
		const result = list.map((inner, index) => property(data, index, inner, options));
		if (strict) return [result];
		result.push(...data.slice(list.length));
		return [result];
	});
	function merge(result, data) {
		for (const key in data) {
			if (key in result) continue;
			result[key] = data[key];
		}
	}
	__name(merge, "merge");
	Schema.extend("object", (data, { dict }, options, strict) => {
		if (!(0, import_cosmokit.isPlainObject)(data)) throw new ValidationError(`expected object but got ${data}`, options);
		const result = {};
		for (const key in dict) {
			const value = property(data, key, dict[key], options);
			if (!(0, import_cosmokit.isNullable)(value) || key in data) result[key] = value;
		}
		if (!strict) merge(result, data);
		return [result];
	});
	Schema.extend("union", (data, { list, toString: toString2 }, options, strict) => {
		const messages = [];
		for (const inner of list) try {
			return Schema.resolve(data, inner, options, strict);
		} catch (error) {
			messages.push(error);
		}
		throw new ValidationError(`expected ${toString2()} but got ${JSON.stringify(data)}`, options);
	});
	Schema.extend("intersect", (data, { list, toString: toString2 }, options, strict) => {
		if (!list.length) return [data];
		let result;
		for (const inner of list) {
			const value = Schema.resolve(data, inner, options, true)[0];
			if ((0, import_cosmokit.isNullable)(value)) continue;
			if ((0, import_cosmokit.isNullable)(result)) result = value;
			else if (typeof result !== typeof value) throw new ValidationError(`expected ${toString2()} but got ${JSON.stringify(data)}`, options);
			else if (typeof value === "object") merge(result ??= {}, value);
			else if (result !== value) throw new ValidationError(`expected ${toString2()} but got ${JSON.stringify(data)}`, options);
		}
		if (!strict && (0, import_cosmokit.isPlainObject)(data)) merge(result, data);
		return [result];
	});
	Schema.extend("transform", (data, { inner, callback, preserve }, options) => {
		const [result, adapted = data] = Schema.resolve(data, inner, options, true);
		if (preserve) return [callback(result)];
		else return [callback(result), callback(adapted)];
	});
	var formatters = {};
	function defineMethod(name, keys, format) {
		formatters[name] = format;
		Object.assign(Schema, { [name](...args) {
			const schema = new Schema({ type: name });
			keys.forEach((key, index) => {
				switch (key) {
					case "sKey":
						schema.sKey = args[index] ?? Schema.string();
						break;
					case "inner":
						schema.inner = Schema.from(args[index]);
						break;
					case "list":
						schema.list = args[index].map(Schema.from);
						break;
					case "dict":
						schema.dict = (0, import_cosmokit.valueMap)(args[index], Schema.from);
						break;
					case "bits":
						schema.bits = {};
						for (const key2 in args[index]) {
							if (typeof args[index][key2] !== "number") continue;
							schema.bits[key2] = args[index][key2];
						}
						break;
					case "callback": {
						const callback = schema.callback = args[index];
						callback["toJSON"] ||= () => callback.toString();
						break;
					}
					case "constructor": {
						const constructor = schema.constructor = args[index];
						if (typeof constructor === "function") constructor["toJSON"] ||= () => constructor["name"];
						break;
					}
					default: schema[key] = args[index];
				}
			});
			if (name === "object" || name === "dict") schema.meta.default = {};
			else if (name === "array" || name === "tuple") schema.meta.default = [];
			else if (name === "bitset") schema.meta.default = 0;
			return schema;
		} });
	}
	__name(defineMethod, "defineMethod");
	defineMethod("is", ["constructor"], ({ constructor }) => {
		if (typeof constructor === "function") return constructor.name;
		else return constructor;
	});
	defineMethod("any", [], () => "any");
	defineMethod("never", [], () => "never");
	defineMethod("const", ["value"], ({ value }) => typeof value === "string" ? JSON.stringify(value) : value);
	defineMethod("string", [], () => "string");
	defineMethod("number", [], () => "number");
	defineMethod("boolean", [], () => "boolean");
	defineMethod("bitset", ["bits"], () => "bitset");
	defineMethod("function", [], () => "function");
	defineMethod("array", ["inner"], ({ inner }) => `${inner.toString(true)}[]`);
	defineMethod("dict", ["inner", "sKey"], ({ inner, sKey }) => `{ [key: ${sKey.toString()}]: ${inner.toString()} }`);
	defineMethod("tuple", ["list"], ({ list }) => `[${list.map((inner) => inner.toString()).join(", ")}]`);
	defineMethod("object", ["dict"], ({ dict }) => {
		if (Object.keys(dict).length === 0) return "{}";
		return `{ ${Object.entries(dict).map(([key, inner]) => {
			return `${key}${inner.meta.required ? "" : "?"}: ${inner.toString()}`;
		}).join(", ")} }`;
	});
	defineMethod("union", ["list"], ({ list }, inline) => {
		const result = list.map(({ toString: format }) => format()).join(" | ");
		return inline ? `(${result})` : result;
	});
	defineMethod("intersect", ["list"], ({ list }) => {
		return `${list.map((inner) => inner.toString(true)).join(" & ")}`;
	});
	defineMethod("transform", [
		"inner",
		"callback",
		"preserve"
	], ({ inner }, isInner) => inner.toString(isInner));
	module.exports = Schema;
})))(), 1);
/**
* Host config store: one JSON file (`~/.dsh/dsh-ssh.json`) holding every
* SSH host entry, written atomically (tmp + rename). Also parses the user's
* standard `~/.ssh/config` for one-shot import. Secrets (passwords,
* passphrases) live in this user-owned file in plaintext — same trust model
* as ssh-skill's annotated ssh-config comments; document it, never log it.
*/
/** File format version. */
const FORMAT_VERSION = 1;
/** Store file location: <home>/.dsh/dsh-ssh.json. */
function storePath() {
	return join(homedir(), ".dsh", "dsh-ssh.json");
}
/** The user's standard OpenSSH config path. */
function sshConfigPath() {
	return join(homedir(), ".ssh", "config");
}
/** Validate the wire shape of a host payload; returns a message or undefined. */
function validateHostPayload(payload) {
	if (typeof payload !== "object" || payload === null) return "body must be a JSON object";
	const p = payload;
	if (typeof p.host !== "string" || p.host.trim() === "") return "host is required";
	if (typeof p.user !== "string" || p.user.trim() === "") return "user is required";
	const auth = p.auth;
	if (auth !== void 0) {
		if (typeof auth !== "object" || auth === null) return "auth must be an object";
		if (auth.kind !== "key" && auth.kind !== "password") return "auth.kind must be key or password";
		if (auth.kind === "key" && (typeof auth.keyPath !== "string" || auth.keyPath.trim() === "")) return "auth.keyPath is required for key auth";
		if (auth.kind === "password" && (typeof auth.password !== "string" || auth.password === "")) return "auth.password is required for password auth";
	}
	if (p.port !== void 0 && (typeof p.port !== "number" || !Number.isInteger(p.port) || p.port < 1 || p.port > 65535)) return "port must be an integer in 1..65535";
	if (p.proxyJump !== void 0 && (!Array.isArray(p.proxyJump) || p.proxyJump.some((x) => typeof x !== "string" || x === ""))) return "proxyJump must be an array of alias strings";
	if (p.tags !== void 0 && (!Array.isArray(p.tags) || p.tags.some((x) => typeof x !== "string"))) return "tags must be an array of strings";
}
/** The alias grammar (same as the scaffold rule: lowercase, digits, single hyphens). */
const ALIAS_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
/** Validate an alias for creation. */
function validateAlias(alias) {
	if (!ALIAS_RE.test(alias)) return "alias must be lowercase letters, digits and single hyphens";
}
/**
* The host store. Pure file I/O — no cordis dependency, unit-testable.
*/
var HostStore = class {
	/** The JSON file path. */
	path;
	/** Optional override of the ~/.ssh/config path (tests). */
	sshConfigOverride;
	/**
	* @param path - store file path (defaults to the standard location).
	* @param sshConfigOverride - ssh config path override (tests only).
	*/
	constructor(path, sshConfigOverride) {
		this.path = resolve(path ?? storePath());
		this.sshConfigOverride = sshConfigOverride;
	}
	/** Load all entries (empty store when the file is absent). */
	list() {
		return this.load().hosts;
	}
	/** Find one entry by alias. */
	find(alias) {
		return this.list().find((entry) => entry.alias === alias);
	}
	/** Secret-free projection for the browser and agent surfaces. */
	summarize(entry) {
		let keyReady = true;
		if (entry.auth.kind === "key" && entry.auth.keyPath) keyReady = existsSync(expandHome(entry.auth.keyPath));
		return {
			alias: entry.alias,
			host: entry.host,
			port: entry.port,
			user: entry.user,
			auth: entry.auth.kind,
			keyReady,
			proxyJump: [...entry.proxyJump],
			...entry.description !== void 0 ? { description: entry.description } : {},
			...entry.environment !== void 0 ? { environment: entry.environment } : {},
			tags: [...entry.tags],
			...entry.location !== void 0 ? { location: entry.location } : {},
			createdAt: entry.createdAt,
			updatedAt: entry.updatedAt
		};
	}
	/** Create one entry. Throws on alias collision or invalid payload. */
	create(payload) {
		const alias = payload.alias?.trim();
		if (!alias) throw new Error("alias is required");
		const aliasError = validateAlias(alias);
		if (aliasError !== void 0) throw new Error(aliasError);
		const bodyError = validateHostPayload(payload);
		if (bodyError !== void 0) throw new Error(bodyError);
		if (payload.auth === void 0) throw new Error("auth is required");
		const file = this.load();
		if (file.hosts.some((entry) => entry.alias === alias)) throw new Error(`alias '${alias}' already exists`);
		const now = Date.now();
		const entry = {
			alias,
			host: payload.host.trim(),
			port: payload.port ?? 22,
			user: payload.user.trim(),
			auth: {
				kind: payload.auth.kind,
				keyPath: payload.auth.kind === "key" ? expandHome(payload.auth.keyPath?.trim() ?? "") : void 0,
				passphrase: payload.auth.kind === "key" ? payload.auth.passphrase ?? void 0 : void 0,
				password: payload.auth.kind === "password" ? payload.auth.password : void 0
			},
			proxyJump: [...payload.proxyJump ?? []],
			description: payload.description?.trim() || void 0,
			environment: payload.environment?.trim() || void 0,
			tags: [...payload.tags ?? []].map((tag) => tag.trim()).filter((tag) => tag !== ""),
			location: payload.location?.trim() || void 0,
			createdAt: now,
			updatedAt: now
		};
		file.hosts.push(entry);
		this.save(file);
		return entry;
	}
	/** Update the fields present in `patch`; unknown aliases throw. */
	update(alias, patch) {
		const file = this.load();
		const entry = file.hosts.find((candidate) => candidate.alias === alias);
		if (entry === void 0) throw new Error(`alias '${alias}' not found`);
		if (patch.host !== void 0 && (typeof patch.host !== "string" || patch.host.trim() === "")) throw new Error("host is required");
		if (patch.user !== void 0 && (typeof patch.user !== "string" || patch.user.trim() === "")) throw new Error("user is required");
		if (patch.port !== void 0 && (typeof patch.port !== "number" || !Number.isInteger(patch.port) || patch.port < 1 || patch.port > 65535)) throw new Error("port must be an integer in 1..65535");
		if (patch.proxyJump !== void 0 && (!Array.isArray(patch.proxyJump) || patch.proxyJump.some((x) => typeof x !== "string" || x === ""))) throw new Error("proxyJump must be an array of alias strings");
		if (patch.tags !== void 0 && (!Array.isArray(patch.tags) || patch.tags.some((x) => typeof x !== "string"))) throw new Error("tags must be an array of strings");
		if (patch.host !== void 0) entry.host = patch.host.trim();
		if (patch.port !== void 0) entry.port = patch.port;
		if (patch.user !== void 0) entry.user = patch.user.trim();
		if (patch.auth !== void 0) {
			const auth = patch.auth;
			if (auth.kind !== "key" && auth.kind !== "password") throw new Error("auth.kind must be key or password");
			if (auth.kind === "key" && (typeof auth.keyPath !== "string" || auth.keyPath.trim() === "")) throw new Error("auth.keyPath is required for key auth");
			if (auth.kind === "password" && (typeof auth.password !== "string" || auth.password === "")) throw new Error("auth.password is required for password auth");
			const keyChanged = auth.kind === "key" && auth.keyPath !== void 0 && expandHome(auth.keyPath.trim()) !== entry.auth.keyPath;
			entry.auth = {
				kind: auth.kind,
				keyPath: auth.kind === "key" ? expandHome(auth.keyPath?.trim() ?? "") : void 0,
				passphrase: auth.kind === "key" ? auth.passphrase !== void 0 ? auth.passphrase : keyChanged ? void 0 : entry.auth.passphrase : void 0,
				password: auth.kind === "password" ? auth.password : void 0
			};
		}
		if (patch.proxyJump !== void 0) entry.proxyJump = [...patch.proxyJump];
		if (patch.description !== void 0) entry.description = patch.description.trim() || void 0;
		if (patch.environment !== void 0) entry.environment = patch.environment.trim() || void 0;
		if (patch.tags !== void 0) entry.tags = [...patch.tags].map((tag) => tag.trim()).filter((tag) => tag !== "");
		if (patch.location !== void 0) entry.location = patch.location.trim() || void 0;
		entry.updatedAt = Date.now();
		this.save(file);
		return entry;
	}
	/** Remove one entry. */
	delete(alias) {
		const file = this.load();
		const index = file.hosts.findIndex((candidate) => candidate.alias === alias);
		if (index < 0) throw new Error(`alias '${alias}' not found`);
		file.hosts.splice(index, 1);
		this.save(file);
	}
	/**
	* Import hosts from `~/.ssh/config`: Host blocks with a single non-wildcard
	* pattern and a HostName become entries (key auth via IdentityFile, jump
	* hosts via ProxyJump). Existing aliases are skipped.
	* @returns import statistics.
	*/
	importFromSshConfig() {
		this.skippedNames = /* @__PURE__ */ new Set();
		const configPath = this.sshConfigOverride ?? sshConfigPath();
		if (!existsSync(configPath)) return {
			parsed: 0,
			added: 0,
			skipped: 0,
			skippedNames: []
		};
		const lines = readFileSync(configPath, "utf8").split(/\r?\n/);
		const blocks = [];
		let current;
		const skip = (name, seen) => {
			if (name !== "" && !seen.has(name)) {
				seen.add(name);
				this.skippedNames.add(name);
			}
		};
		for (const raw of lines) {
			const line = raw.trim();
			if (line === "" || line.startsWith("#")) continue;
			const match = /^([A-Za-z0-9_\-]+)\s+(.+)$/.exec(line);
			if (match === null) continue;
			const key = match[1].toLowerCase();
			const value = match[2].trim();
			if (key === "host") {
				current = {
					pattern: value,
					props: {}
				};
				blocks.push(current);
			} else if (current !== void 0) current.props[key] = value;
		}
		let added = 0;
		for (const block of blocks) {
			const pattern = block.pattern.split(/\s+/)[0];
			if (pattern.includes("*") || pattern.includes("?")) {
				skip(pattern, this.skippedNames);
				continue;
			}
			const hostName = block.props.hostname;
			if (hostName === void 0 || hostName === "") {
				skip(pattern, this.skippedNames);
				continue;
			}
			if (this.list().some((entry) => entry.alias === pattern)) {
				skip(pattern, this.skippedNames);
				continue;
			}
			const payload = {
				alias: pattern,
				host: hostName,
				port: block.props.port !== void 0 ? Number.parseInt(block.props.port, 10) : 22,
				user: block.props.user ?? process.env.USER ?? "root",
				auth: {
					kind: block.props.identityfile !== void 0 ? "key" : "password",
					keyPath: block.props.identityfile,
					password: block.props.password
				},
				proxyJump: block.props.proxyjump !== void 0 ? block.props.proxyjump.split(",").map((hop) => hop.trim()).filter((hop) => hop !== "") : [],
				description: block.props.description,
				environment: block.props.environment,
				tags: (block.props.tags ?? "").split(",").map((tag) => tag.trim()).filter((tag) => tag !== ""),
				location: block.props.location
			};
			try {
				this.create(payload);
				added += 1;
			} catch {
				skip(pattern, this.skippedNames);
			}
		}
		return {
			parsed: blocks.length,
			added,
			skipped: this.skippedNames.size,
			skippedNames: [...this.skippedNames]
		};
	}
	skippedNames = /* @__PURE__ */ new Set();
	load() {
		if (!existsSync(this.path)) return {
			version: FORMAT_VERSION,
			hosts: []
		};
		try {
			const parsed = JSON.parse(readFileSync(this.path, "utf8"));
			if (typeof parsed !== "object" || parsed === null || !Array.isArray(parsed.hosts)) throw new Error("store file shape invalid");
			return parsed;
		} catch {
			try {
				renameSync(this.path, `${this.path}.corrupt-${Date.now()}`);
			} catch {}
			return {
				version: FORMAT_VERSION,
				hosts: []
			};
		}
	}
	save(file) {
		const dir = dirname(this.path);
		if (!existsSync(dir)) mkdirSync(dir, {
			recursive: true,
			mode: 448
		});
		const tmp = this.path + ".tmp";
		writeFileSync(tmp, JSON.stringify(file, null, 2) + "\n", {
			encoding: "utf8",
			mode: 384
		});
		renameSync(tmp, this.path);
	}
};
/** Expand a leading `~` in a filesystem path. */
function expandHome(path) {
	if (path === "~") return homedir();
	if (path.startsWith("~/")) return join(homedir(), path.slice(2));
	return path;
}
//#endregion
//#region src/engine.ts
/**
* The SSH engine: a per-alias persistent connection pool (ssh2) with
* multi-hop jump support, command execution, PTY shells, SFTP transfers,
* local port-forward tunnels and cluster execution — the DSH counterpart of
* ssh-skill's daemon + scripts, living entirely in the host process.
*/
const DEFAULTS = {
	idleTimeoutMs: 30 * 6e4,
	connectTimeoutMs: 15e3,
	keepaliveIntervalMs: 15e3,
	maxOutputBytes: 2 * 1024 * 1024,
	defaultExecTimeoutMs: 6e4,
	defaultMaxWorkers: 8,
	sftpConcurrency: 8
};
/** Build the ssh2 connect config for one entry (key read from disk). */
function buildConnectConfig(entry, sock) {
	const config = {
		host: entry.host,
		port: entry.port,
		username: entry.user,
		readyTimeout: 15e3,
		keepaliveInterval: 15e3,
		keepaliveCountMax: 3
	};
	if (sock !== void 0) config.sock = sock;
	if (entry.auth.kind === "password") config.password = entry.auth.password;
	else {
		const keyPath = entry.auth.keyPath === void 0 ? void 0 : expandHome(entry.auth.keyPath);
		if (keyPath === void 0 || !existsSync(keyPath)) throw new Error(`private key not found: '${entry.auth.keyPath ?? "(unset)"}'`);
		config.privateKey = readFileSync(keyPath, "utf8");
		if (entry.auth.passphrase !== void 0 && entry.auth.passphrase !== "") config.passphrase = entry.auth.passphrase;
	}
	return config;
}
/** Connect one ssh2 client (resolve on ready, reject on error/close). */
function connectClient(config) {
	return new Promise((resolve, reject) => {
		const client = new Client();
		let settled = false;
		client.once("ready", () => {
			if (settled) return;
			settled = true;
			resolve(client);
		});
		client.once("error", (error) => {
			if (settled) return;
			settled = true;
			reject(error instanceof Error ? error : new Error(String(error)));
		});
		try {
			client.connect(config);
		} catch (error) {
			if (!settled) {
				settled = true;
				reject(error instanceof Error ? error : new Error(String(error)));
			}
		}
	});
}
/** Cap captured output at the configured byte budget (marks truncation). */
function appendOutput(target, chunk, maxBytes) {
	if (target.truncated) return;
	if (target.text.length + chunk.length > maxBytes) {
		let cut = chunk.toString("utf8").slice(0, maxBytes - target.text.length);
		if (/[\uD800-\uDBFF]$/.test(cut)) cut = cut.slice(0, -1);
		target.text += cut + "…[output truncated]";
		target.truncated = true;
		return;
	}
	target.text += chunk.toString("utf8");
}
/** Walk a local directory, collecting relative paths of every file. */
function walkLocalDir(root) {
	const files = [];
	const visit = (dir) => {
		for (const name of readdirSync(dir)) {
			const full = join(dir, name);
			const stat = statSync(full);
			if (stat.isDirectory()) visit(full);
			else if (stat.isFile()) files.push(relative(root, full));
		}
	};
	visit(root);
	return files;
}
/**
* The engine. Owns the pool, tunnels, and all operations. One instance per
* plugin apply; dispose() closes every connection.
*/
var SshEngine = class {
	store;
	opts;
	pool = /* @__PURE__ */ new Map();
	tunnels = /* @__PURE__ */ new Map();
	sweepTimer;
	nextTunnelId = 1;
	/**
	* @param store - the host config store.
	* @param options - engine knobs (defaults applied).
	*/
	constructor(store, options) {
		this.store = store;
		this.opts = {
			...DEFAULTS,
			...options
		};
		this.sweepTimer = setInterval(() => this.sweep(), Math.max(1e4, this.opts.idleTimeoutMs / 4));
		this.sweepTimer.unref?.();
	}
	/** Secret-free host list (filtered by the optional query). */
	list(query) {
		const needle = query?.trim().toLowerCase();
		return this.store.list().filter((entry) => needle === void 0 || needle === "" || entry.alias.toLowerCase().includes(needle) || (entry.description ?? "").toLowerCase().includes(needle) || entry.host.toLowerCase().includes(needle) || entry.tags.some((tag) => tag.toLowerCase().includes(needle))).map((entry) => this.store.summarize(entry));
	}
	/** One host summary by alias. */
	find(alias) {
		const entry = this.store.find(alias);
		return entry === void 0 ? void 0 : this.store.summarize(entry);
	}
	/**
	* Run `fn` with a live client for `alias`, reconnecting (up to the
	* attempt budget) when the connection broke mid-flight.
	*/
	async withClient(alias, fn, attempts = 3) {
		let lastError;
		for (let attempt = 1; attempt <= attempts; attempt += 1) {
			let record = this.pool.get(alias);
			if (record === void 0 || record.broken) {
				if (record !== void 0) this.disposeRecord(alias, record);
				record = await this.acquire(alias);
			}
			record.idleAt = Date.now();
			record.inFlight += 1;
			try {
				const result = await fn(record.client);
				record.idleAt = Date.now();
				return result;
			} finally {
				record.inFlight -= 1;
			}
		}
		throw lastError instanceof Error ? lastError : new Error(String(lastError));
	}
	/**
	* Build one full jump chain for an entry: hop clients connected through in
	* order, each forwarding a stream to the next destination, ending with the
	* target client. Shared by the pool and standalone shell sessions.
	*/
	async connectChain(entry) {
		const hops = [];
		let sock;
		const chain = entry.proxyJump;
		for (let index = 0; index < chain.length; index += 1) {
			const hopAlias = chain[index];
			const hop = this.store.find(hopAlias);
			if (hop === void 0) {
				for (const client of hops) client.end();
				throw new Error(`proxyJump alias '${hopAlias}' not found — create it first`);
			}
			const hopClient = await connectClient(buildConnectConfig(hop, sock));
			hops.push(hopClient);
			const next = index + 1 < chain.length ? this.store.find(chain[index + 1]) : void 0;
			const nextHost = next !== void 0 ? next.host : entry.host;
			const nextPort = next !== void 0 ? next.port : entry.port;
			sock = await new Promise((resolve, reject) => {
				hopClient.forwardOut("127.0.0.1", 0, nextHost, nextPort, (error, stream) => {
					if (error !== void 0) {
						for (const client of hops) client.end();
						reject(error);
					} else resolve(stream);
				});
			});
		}
		try {
			return {
				client: await connectClient(buildConnectConfig(entry, sock)),
				hops
			};
		} catch (error) {
			for (const client of hops) client.end();
			throw error;
		}
	}
	/** In-flight acquire promises, deduped per alias (concurrent first use). */
	acquireQueue = /* @__PURE__ */ new Map();
	/** Connect (or reuse) the pooled chain for one alias; pins nothing. */
	async acquire(alias) {
		const pending = this.acquireQueue.get(alias);
		if (pending !== void 0) return pending;
		const task = this.doAcquire(alias);
		this.acquireQueue.set(alias, task);
		try {
			return await task;
		} finally {
			if (this.acquireQueue.get(alias) === task) this.acquireQueue.delete(alias);
		}
	}
	async doAcquire(alias) {
		const entry = this.store.find(alias);
		if (entry === void 0) throw new Error(`alias '${alias}' not found — add it first`);
		const { client, hops } = await this.connectChain(entry);
		const record = {
			client,
			hops,
			idleAt: Date.now(),
			pinned: false,
			broken: false,
			inFlight: 0
		};
		client.on("error", () => {
			record.broken = true;
		});
		client.on("close", () => {
			record.broken = true;
		});
		this.pool.set(alias, record);
		return record;
	}
	/**
	* Tear down one alias's record. When `record` is given and no longer the
	* pooled record for the alias (a concurrent acquire replaced it), nothing
	* is torn down — the connection belongs to someone else now.
	*/
	disposeRecord(alias, record) {
		const current = this.pool.get(alias);
		if (record !== void 0 && current !== record) return;
		if (current === void 0) return;
		this.pool.delete(alias);
		try {
			current.client.end();
		} catch {}
		for (const hop of current.hops) try {
			hop.end();
		} catch {}
	}
	/** Close connections idle beyond the threshold (skips pinned and in-flight). */
	sweep() {
		const cutoff = Date.now() - this.opts.idleTimeoutMs;
		for (const [alias, record] of this.pool) if (!record.pinned && record.inFlight === 0 && record.idleAt < cutoff) this.disposeRecord(alias, record);
	}
	/** Run one command on `alias` (reusing the pooled connection). */
	async exec(alias, command, timeoutMs) {
		const started = Date.now();
		const budget = timeoutMs !== void 0 && timeoutMs > 0 ? timeoutMs : this.opts.defaultExecTimeoutMs;
		return this.withClient(alias, async (client) => {
			return await new Promise((resolve, reject) => {
				client.exec(command, (error, stream) => {
					if (error !== void 0) {
						reject(error);
						return;
					}
					const stdout = {
						text: "",
						truncated: false
					};
					const stderr = {
						text: "",
						truncated: false
					};
					let timedOut = false;
					let settled = false;
					const finish = () => {
						if (settled) return;
						settled = true;
						clearTimeout(timer);
						resolve({
							success: false,
							exitCode: null,
							timedOut,
							stdout: stdout.text,
							stderr: stderr.text,
							durationMs: Date.now() - started,
							error: timedOut ? `command timed out after ${budget} ms` : void 0
						});
					};
					const timer = setTimeout(() => {
						timedOut = true;
						try {
							stream.signal("KILL");
						} catch {}
						try {
							stream.close();
						} catch {}
						finish();
					}, budget);
					stream.on("data", (chunk) => appendOutput(stdout, chunk, this.opts.maxOutputBytes));
					stream.stderr.on("data", (chunk) => appendOutput(stderr, chunk, this.opts.maxOutputBytes));
					stream.on("close", (code) => {
						if (settled) return;
						settled = true;
						clearTimeout(timer);
						resolve({
							success: code === 0 && !timedOut,
							exitCode: code,
							timedOut,
							stdout: stdout.text,
							stderr: stderr.text,
							durationMs: Date.now() - started
						});
					});
					stream.on("error", (streamError) => {
						if (settled) return;
						settled = true;
						clearTimeout(timer);
						reject(streamError);
					});
				});
			});
		});
	}
	/** Run one command against many hosts concurrently. */
	async cluster(options) {
		let targets = this.store.list();
		if (options.aliases !== void 0 && options.aliases.length > 0) targets = targets.filter((entry) => options.aliases.includes(entry.alias));
		if (options.environment !== void 0 && options.environment !== "") targets = targets.filter((entry) => entry.environment === options.environment);
		if (options.tags !== void 0 && options.tags.length > 0) targets = targets.filter((entry) => options.tags.every((tag) => entry.tags.includes(tag)));
		if (targets.length === 0) return [];
		if (options.maxWorkers !== void 0 && (!Number.isInteger(options.maxWorkers) || options.maxWorkers < 1)) throw new Error("maxWorkers must be a positive integer");
		const workers = Math.min(this.opts.defaultMaxWorkers, options.maxWorkers ?? this.opts.defaultMaxWorkers, targets.length);
		const results = [];
		const queue = [...targets];
		const run = async () => {
			while (queue.length > 0) {
				const entry = queue.shift();
				try {
					const result = await this.exec(entry.alias, options.command, options.timeoutMs);
					results.push({
						alias: entry.alias,
						ok: result.success,
						exitCode: result.exitCode,
						timedOut: result.timedOut,
						stdout: result.stdout,
						stderr: result.stderr,
						durationMs: result.durationMs
					});
				} catch (error) {
					results.push({
						alias: entry.alias,
						ok: false,
						error: error instanceof Error ? error.message : String(error)
					});
				}
			}
		};
		await Promise.all(Array.from({ length: workers }, () => run()));
		return results;
	}
	/** Open a PTY shell session for the web terminal (standalone connection). */
	async openShell(alias, size) {
		const entry = this.store.find(alias);
		if (entry === void 0) throw new Error(`alias '${alias}' not found — add it first`);
		const { client, hops } = await this.connectChain(entry);
		return await new Promise((resolve, reject) => {
			client.shell({
				term: "xterm-256color",
				cols: size.cols,
				rows: size.rows
			}, (error, stream) => {
				if (error !== void 0) {
					try {
						client.end();
					} catch {}
					for (const hop of hops) try {
						hop.end();
					} catch {}
					reject(error);
					return;
				}
				let tornDown = false;
				const teardown = () => {
					if (tornDown) return;
					tornDown = true;
					try {
						client.end();
					} catch {}
					for (const hop of hops) try {
						hop.end();
					} catch {}
				};
				const session = {
					send: (data) => {
						try {
							stream.write(data);
						} catch {}
					},
					resize: (cols, rows) => {
						try {
							stream.setWindow(rows, cols, rows, cols);
						} catch {}
					},
					signal: (name) => {
						try {
							stream.signal(name);
						} catch {}
					},
					close: () => {
						try {
							stream.close();
						} catch {}
						teardown();
					},
					pause: () => {
						try {
							stream.pause();
						} catch {}
					},
					resume: () => {
						try {
							stream.resume();
						} catch {}
					}
				};
				stream.on("data", (chunk) => {
					session.onData?.(chunk);
				});
				stream.on("close", (code) => {
					teardown();
					session.onExit?.(code);
				});
				stream.on("error", (streamError) => {
					teardown();
					session.onExit?.(null, streamError instanceof Error ? streamError.message : String(streamError));
				});
				resolve(session);
			});
		});
	}
	/**
	* Open a streaming exec channel (no PTY) for the remote subprocess seam.
	* Like the PTY shell, the channel rides its own connection so closing it
	* can never tear down a pooled exec/tunnel sharing the alias.
	*/
	async openExec(alias, command) {
		const entry = this.store.find(alias);
		if (entry === void 0) throw new Error(`alias '${alias}' not found — add it first`);
		const { client, hops } = await this.connectChain(entry);
		return await new Promise((resolve, reject) => {
			client.exec(command, (error, stream) => {
				if (error !== void 0) {
					try {
						client.end();
					} catch {}
					for (const hop of hops) try {
						hop.end();
					} catch {}
					reject(error);
					return;
				}
				let tornDown = false;
				const teardown = () => {
					if (tornDown) return;
					tornDown = true;
					try {
						client.end();
					} catch {}
					for (const hop of hops) try {
						hop.end();
					} catch {}
				};
				const session = {
					send: (data) => {
						try {
							stream.write(data);
						} catch {}
					},
					end: (data) => {
						try {
							if (data !== void 0 && data !== "") stream.write(data);
							stream.end();
						} catch {}
					},
					resize: () => {},
					signal: (name) => {
						try {
							stream.signal(name);
						} catch {}
					},
					close: () => {
						try {
							stream.close();
						} catch {}
						teardown();
					},
					pause: () => {
						try {
							stream.pause();
						} catch {}
					},
					resume: () => {
						try {
							stream.resume();
						} catch {}
					}
				};
				stream.on("data", (chunk) => {
					session.onData?.(chunk);
				});
				stream.stderr.on("data", (chunk) => {
					session.onErrData?.(chunk);
				});
				stream.on("close", (code) => {
					teardown();
					session.onExit?.(code);
				});
				stream.on("error", (streamError) => {
					teardown();
					session.onExit?.(null, streamError instanceof Error ? streamError.message : String(streamError));
				});
				resolve(session);
			});
		});
	}
	/** Upload one local file (or directory tree) to a remote path. */ async upload(alias, localPath, remotePath, recursive, onProgress) {
		if (!remotePath.startsWith("/")) throw new Error(`remotePath must be an absolute path (got '${remotePath}')`);
		const local = resolve(localPath);
		if (!existsSync(local)) throw new Error(`local path not found: '${localPath}'`);
		return this.withClient(alias, async (client) => {
			const sftp = await this.sftp(client);
			const stat = statSync(local);
			let files;
			if (stat.isDirectory()) {
				if (!recursive) throw new Error(`'${localPath}' is a directory — enable recursive upload`);
				files = walkLocalDir(local);
				await this.ensureRemoteDir(sftp, remotePath);
			} else {
				files = [""];
				await this.ensureRemoteDir(sftp, dirname(remotePath));
			}
			let bytes = 0;
			for (const rel of files) {
				const src = rel === "" ? local : join(local, rel);
				const remoteRel = rel.split(/[\\/]/).join("/");
				const dst = rel === "" ? remotePath : remotePath.replace(/\/$/, "") + "/" + remoteRel;
				await this.fastPut(sftp, src, dst, onProgress);
				bytes += statSync(src).size;
			}
			return {
				bytes,
				files: files.length
			};
		});
	}
	/** Download one remote file to a local path. */
	async download(alias, remotePath, localPath, onProgress) {
		return this.withClient(alias, async (client) => {
			const sftp = await this.sftp(client);
			if ((await new Promise((resolve, reject) => {
				sftp.stat(remotePath, (error, stats) => error !== void 0 ? reject(error) : resolve(stats));
			})).isDirectory()) throw new Error(`'${remotePath}' is a directory — directory download is not supported yet (download individual files)`);
			const local = resolve(localPath);
			if (!existsSync(dirname(local))) mkdirSync(dirname(local), { recursive: true });
			await this.fastGet(sftp, remotePath, local, onProgress);
			return { bytes: statSync(local).size };
		});
	}
	/** List a remote directory (file browser). */
	async ls(alias, path) {
		return this.withClient(alias, async (client) => {
			const sftp = await this.sftp(client);
			return await new Promise((resolve, reject) => {
				sftp.readdir(path, (error, list) => {
					if (error !== void 0) {
						reject(error);
						return;
					}
					this.classifyEntries(sftp, path, list).then(resolve, reject);
				});
			});
		});
	}
	/**
	* Classify readdir entries, following symlinks so a link to a directory
	* (e.g. AutoDL's /root/autodl-tmp) lists as a directory instead of 'other'.
	*/
	async classifyEntries(sftp, dirPath, list) {
		const entries = [];
		for (const item of list) {
			let type = item.attrs.isDirectory() ? "dir" : item.attrs.isFile() ? "file" : "other";
			if (type === "other" && item.attrs.isSymbolicLink()) try {
				const target = await new Promise((res, rej) => {
					sftp.stat(`${dirPath.replace(/\/+$/, "")}/${item.filename}`, (statError, stats) => statError !== void 0 ? rej(statError) : res(stats));
				});
				type = target.isDirectory() ? "dir" : target.isFile() ? "file" : "other";
			} catch {}
			entries.push({
				name: item.filename,
				type,
				size: item.attrs.size,
				mtimeMs: item.attrs.mtime * 1e3,
				mode: item.attrs.mode
			});
		}
		return entries;
	}
	/** Stat one remote path (file browser / conflict checks). */
	async stat(alias, remotePath) {
		return this.withClient(alias, async (client) => {
			const sftp = await this.sftp(client);
			const attrs = await this.sftpStat(sftp, remotePath);
			return {
				type: attrs.isDirectory() ? "dir" : attrs.isFile() ? "file" : "other",
				size: attrs.size,
				mtimeMs: attrs.mtime * 1e3,
				mode: attrs.mode
			};
		});
	}
	/**
	* Lstat one remote path without following the final symlink. Returns
	* undefined when the path is absent (the fs seam's lstat contract).
	*/
	async lstat(alias, remotePath) {
		return this.withClient(alias, async (client) => {
			const sftp = await this.sftp(client);
			try {
				const attrs = await new Promise((resolve, reject) => {
					sftp.lstat(remotePath, (error, stats) => error !== void 0 ? reject(error) : resolve(stats));
				});
				return {
					type: attrs.isSymbolicLink() ? "symlink" : attrs.isDirectory() ? "directory" : attrs.isFile() ? "file" : "other",
					size: attrs.size,
					mtimeMs: attrs.mtime * 1e3,
					mode: attrs.mode
				};
			} catch (error) {
				const code = String(error.code ?? "");
				if (/NO_SUCH_FILE|ENOENT|no such file|does not exist/i.test(`${code} ${String(error)}`)) return void 0;
				throw error;
			}
		});
	}
	/**
	* Open a remote file read stream (the fs seam's streamText). The returned
	* stream must be consumed or destroyed; the pooled connection stays busy
	* for the stream's lifetime.
	*/
	async readStream(alias, remotePath) {
		return this.withClient(alias, async (client) => {
			return (await this.sftp(client)).createReadStream(remotePath);
		});
	}
	/**
	* Read one remote file fully into memory (text or binary) with its mtime.
	* The workspace plugin's text gate (UTF-8 + size caps) lives on its caller.
	*/
	async readFile(alias, remotePath) {
		return this.withClient(alias, async (client) => {
			const sftp = await this.sftp(client);
			const attrs = await this.sftpStat(sftp, remotePath);
			if (attrs.isDirectory()) throw new Error(`'${remotePath}' is a directory`);
			const chunks = [];
			await new Promise((resolve, reject) => {
				const stream = sftp.createReadStream(remotePath);
				stream.on("data", (chunk) => {
					chunks.push(chunk);
				});
				stream.on("error", (error) => reject(error));
				stream.on("end", () => resolve());
			});
			return {
				content: Buffer.concat(chunks),
				mtime: attrs.mtime * 1e3,
				size: attrs.size
			};
		});
	}
	/**
	* Write one remote file from memory (parents are created). When
	* `expectedMtime` is given, a stat-then-write conflict check throws before
	* any byte is written (the GUI and the workspace tools use it for
	* overwrite protection).
	*/
	async writeFile(alias, remotePath, content, expectedMtime) {
		return this.withClient(alias, async (client) => {
			const sftp = await this.sftp(client);
			await this.ensureRemoteDir(sftp, dirname(remotePath));
			if (expectedMtime !== void 0) {
				const current = (await this.sftpStat(sftp, remotePath)).mtime * 1e3;
				if (current !== expectedMtime) throw new Error(`mtime conflict: remote mtime ${current} != expected ${expectedMtime}`);
			}
			await new Promise((resolve, reject) => {
				const stream = sftp.createWriteStream(remotePath);
				stream.on("error", (error) => reject(error));
				stream.on("close", () => resolve());
				stream.end(content);
			});
			return { mtime: (await this.sftpStat(sftp, remotePath)).mtime * 1e3 };
		});
	}
	/** Create a remote directory chain (mkdir -p semantics). */
	async mkdir(alias, remotePath) {
		return this.withClient(alias, async (client) => {
			const sftp = await this.sftp(client);
			await this.ensureRemoteDir(sftp, remotePath);
		});
	}
	/**
	* Remove a remote file or directory. Directories require `recursive: true`
	* and are walked depth-first (children first, then the directory itself).
	*/
	async rm(alias, remotePath, recursive = false) {
		return this.withClient(alias, async (client) => {
			const sftp = await this.sftp(client);
			if (!(await this.sftpStat(sftp, remotePath)).isDirectory()) {
				await new Promise((resolve, reject) => {
					sftp.unlink(remotePath, (error) => error !== void 0 ? reject(error) : resolve());
				});
				return;
			}
			if (!recursive) throw new Error(`'${remotePath}' is a directory — pass recursive: true`);
			const remove = async (dir) => {
				const list = await new Promise((resolve, reject) => {
					sftp.readdir(dir, (error, entries) => error !== void 0 ? reject(error) : resolve(entries));
				});
				for (const entry of list) {
					const child = dir.replace(/\/+$/, "") + "/" + entry.filename;
					if (entry.attrs.isDirectory()) await remove(child);
					else await new Promise((resolve, reject) => {
						sftp.unlink(child, (error) => error !== void 0 ? reject(error) : resolve());
					});
				}
				await new Promise((resolve, reject) => {
					sftp.rmdir(dir, (error) => error !== void 0 ? reject(error) : resolve());
				});
			};
			await remove(remotePath);
		});
	}
	/** Rename / move a remote path (mv semantics, same filesystem). */
	async rename(alias, fromPath, toPath) {
		return this.withClient(alias, async (client) => {
			const sftp = await this.sftp(client);
			await new Promise((resolve, reject) => {
				sftp.rename(fromPath, toPath, (error) => error !== void 0 ? reject(error) : resolve());
			});
		});
	}
	/** Stat wrapper (one SFTP stat call). */
	sftpStat(sftp, remotePath) {
		return new Promise((resolve, reject) => {
			sftp.stat(remotePath, (error, stats) => error !== void 0 ? reject(error) : resolve(stats));
		});
	}
	sftp(client) {
		return new Promise((resolve, reject) => {
			client.sftp((error, sftp) => error !== void 0 ? reject(error) : resolve(sftp));
		});
	}
	/** Create a remote directory chain (stat-then-mkdir per segment). */
	ensureRemoteDir(sftp, remote) {
		return new Promise((resolve, reject) => {
			const segments = remote.replace(/^\/+/, "").split("/").filter((segment) => segment !== "");
			const walk = (index) => {
				if (index >= segments.length) {
					resolve();
					return;
				}
				const current = "/" + segments.slice(0, index + 1).join("/");
				sftp.stat(current, (statError) => {
					if (statError === void 0) {
						walk(index + 1);
						return;
					}
					sftp.mkdir(current, (mkdirError) => {
						if (mkdirError !== void 0) {
							reject(mkdirError);
							return;
						}
						walk(index + 1);
					});
				});
			};
			walk(0);
		});
	}
	fastPut(sftp, src, dst, onProgress) {
		return new Promise((resolve, reject) => {
			let last = 0;
			let lastEmit = 0;
			const started = Date.now();
			onProgress?.({
				phase: "transferring",
				file: dst,
				transferred: 0,
				total: statSync(src).size,
				percent: 0
			});
			sftp.fastPut(src, dst, {
				concurrency: this.opts.sftpConcurrency,
				step: (transferred, _chunk, total) => {
					const now = Date.now();
					if (now - lastEmit < 100 && transferred < total) return;
					lastEmit = now;
					const elapsed = (now - started) / 1e3;
					onProgress?.({
						phase: "transferring",
						file: dst,
						transferred,
						total,
						percent: total > 0 ? Math.round(transferred / total * 1e3) / 10 : 0,
						speedBps: elapsed > 0 ? Math.round((transferred - last) / elapsed) : void 0
					});
					last = transferred;
				}
			}, (error) => {
				if (error !== void 0) {
					onProgress?.({
						phase: "error",
						file: dst,
						transferred: 0,
						total: 0,
						percent: 0,
						error: String(error)
					});
					reject(error);
				} else {
					onProgress?.({
						phase: "done",
						file: dst,
						transferred: statSync(src).size,
						total: statSync(src).size,
						percent: 100
					});
					resolve();
				}
			});
		});
	}
	fastGet(sftp, src, dst, onProgress) {
		return new Promise((resolve, reject) => {
			let last = 0;
			let lastEmit = 0;
			const started = Date.now();
			sftp.fastGet(src, dst, {
				concurrency: this.opts.sftpConcurrency,
				step: (transferred, _chunk, total) => {
					const now = Date.now();
					if (now - lastEmit < 100 && transferred < total) return;
					lastEmit = now;
					const elapsed = (now - started) / 1e3;
					onProgress?.({
						phase: "transferring",
						file: src,
						transferred,
						total,
						percent: total > 0 ? Math.round(transferred / total * 1e3) / 10 : 0,
						speedBps: elapsed > 0 ? Math.round((transferred - last) / elapsed) : void 0
					});
					last = transferred;
				}
			}, (error) => {
				if (error !== void 0) {
					onProgress?.({
						phase: "error",
						file: src,
						transferred: 0,
						total: 0,
						percent: 0,
						error: String(error)
					});
					reject(error);
				} else {
					onProgress?.({
						phase: "done",
						file: src,
						transferred: statSync(dst).size,
						total: statSync(dst).size,
						percent: 100
					});
					resolve();
				}
			});
		});
	}
	/** Start a local port-forward tunnel (listens on 127.0.0.1 only). */
	async startTunnel(alias, options) {
		if (!Number.isInteger(options.remotePort) || options.remotePort < 1 || options.remotePort > 65535) throw new Error("remotePort must be an integer in 1..65535");
		if (options.localPort !== void 0 && (!Number.isInteger(options.localPort) || options.localPort < 1 || options.localPort > 65535)) throw new Error("localPort must be an integer in 1..65535");
		if (this.store.find(alias) === void 0) throw new Error(`alias '${alias}' not found — add it first`);
		const remoteHost = options.remoteHost ?? "127.0.0.1";
		const id = `tun-${this.nextTunnelId++}`;
		const info = {
			id,
			alias,
			localPort: 0,
			remoteHost,
			remotePort: options.remotePort,
			state: "connecting",
			startedAt: Date.now()
		};
		const record = await this.acquire(alias);
		const client = record.client;
		const sockets = /* @__PURE__ */ new Set();
		const server = createServer((socket) => {
			sockets.add(socket);
			socket.on("close", () => {
				sockets.delete(socket);
			});
			client.forwardOut("127.0.0.1", 0, remoteHost, options.remotePort, (error, stream) => {
				if (error !== void 0) {
					socket.destroy();
					return;
				}
				const destroy = () => {
					try {
						socket.destroy();
					} catch {}
					try {
						stream.close();
					} catch {}
				};
				stream.on("error", destroy);
				socket.on("error", destroy);
				stream.on("close", destroy);
				socket.on("close", destroy);
				stream.pipe(socket).pipe(stream);
			});
		});
		try {
			await new Promise((resolve, reject) => {
				server.once("error", reject);
				server.listen(options.localPort ?? 0, "127.0.0.1", () => {
					server.removeListener("error", reject);
					resolve();
				});
			});
		} catch (error) {
			if (!record.pinned && record.inFlight === 0) this.disposeRecord(alias, record);
			throw error;
		}
		record.pinned = true;
		const address = server.address();
		info.localPort = typeof address === "object" && address !== null ? address.port : 0;
		info.state = "forwarding";
		this.tunnels.set(id, {
			info,
			server,
			alias,
			sockets
		});
		return info;
	}
	/** All active tunnels. */
	listTunnels() {
		return [...this.tunnels.values()].map((tunnel) => ({ ...tunnel.info }));
	}
	/** Stop one tunnel (closes the listener, live sockets, and the pinned connection). */
	stopTunnel(id) {
		const tunnel = this.tunnels.get(id);
		if (tunnel === void 0) return false;
		this.tunnels.delete(id);
		try {
			tunnel.server.close();
		} catch {}
		for (const socket of tunnel.sockets) try {
			socket.destroy();
		} catch {}
		tunnel.sockets.clear();
		this.disposeRecord(tunnel.alias);
		return true;
	}
	/** Stop all tunnels (optionally for one alias). */
	stopAllTunnels(alias) {
		let count = 0;
		for (const [id, tunnel] of [...this.tunnels]) if (alias === void 0 || tunnel.alias === alias) {
			this.stopTunnel(id);
			count += 1;
		}
		return count;
	}
	/** Probe connectivity: connect, run `true`, close. */
	async test(alias) {
		const started = Date.now();
		try {
			const result = await this.exec(alias, "true", 1e4);
			return result.success ? {
				ok: true,
				latencyMs: result.durationMs
			} : {
				ok: false,
				latencyMs: result.durationMs,
				error: `remote exit code ${result.exitCode}`
			};
		} catch (error) {
			return {
				ok: false,
				latencyMs: Date.now() - started,
				error: error instanceof Error ? error.message : String(error)
			};
		}
	}
	/** Close every pooled connection and tunnel. */
	dispose() {
		if (this.sweepTimer !== void 0) clearInterval(this.sweepTimer);
		for (const id of [...this.tunnels.keys()]) this.stopTunnel(id);
		for (const alias of [...this.pool.keys()]) this.disposeRecord(alias);
	}
};
//#endregion
//#region src/protocol.ts
const SSH_API = {
	hosts: "/api/dsh-ssh/hosts",
	importSshConfig: "/api/dsh-ssh/hosts/import-ssh-config",
	test: "/api/dsh-ssh/test",
	exec: "/api/dsh-ssh/exec",
	cluster: "/api/dsh-ssh/cluster",
	upload: "/api/dsh-ssh/upload",
	download: "/api/dsh-ssh/download",
	ls: "/api/dsh-ssh/ls",
	tunnel: "/api/dsh-ssh/tunnel",
	terminal: "/api/dsh-ssh/terminal"
};
//#endregion
//#region src/routes.ts
/**
* The /api/dsh-ssh route family: host CRUD, exec, cluster, SFTP transfer
* (NDJSON progress stream for uploads, binary stream for downloads), remote
* listing, tunnels, and the WebSocket PTY terminal upgrade. Every route
* carries a loopback-only trust fence (plus browser same-origin markers) —
* these endpoints execute commands on remote servers, so LAN-exposed dsh web
* deployments must not serve them.
*/
/** Cap on JSON request bodies (host entries and exec payloads are small). */
const MAX_JSON_BODY_BYTES = 64 * 1024;
/** Cap on declared upload bodies (staged to disk before SFTP). */
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024 * 1024;
/**
* One noServer WebSocket server for terminal upgrades: the browser half uses
* a standards-compliant WebSocket, so the host must speak real RFC 6455
* frames (the webserver hands us the raw upgraded socket).
*/
const terminalWss = new WebSocketServer({ noServer: true });
/** Pause the shell when the socket's send buffer exceeds this… */
const BACKPRESSURE_HIGH_WATER = 1024 * 1024;
/** …and resume once it drains below this. */
const BACKPRESSURE_LOW_WATER = 512 * 1024;
/** Loopback literal check plus browser same-origin markers (mirrors the pairing routes' fence). */
function isLoopbackRequest(request) {
	const address = request.socket.remoteAddress;
	if (address !== "127.0.0.1" && address !== "::1" && address !== "::ffff:127.0.0.1") return false;
	const host = request.headers.host;
	if (typeof host !== "string") return false;
	let hostUrl;
	try {
		hostUrl = new URL(`http://${host}`);
	} catch {
		return false;
	}
	if (hostUrl.hostname !== "127.0.0.1" && hostUrl.hostname !== "localhost" && hostUrl.hostname !== "[::1]") return false;
	if (request.headers["sec-fetch-site"] === "cross-site") return false;
	const origin = request.headers.origin;
	if (origin === void 0) return true;
	try {
		return new URL(origin).host === hostUrl.host;
	} catch {
		return false;
	}
}
/** One JSON response. */
function writeJson(res, status, body) {
	const payload = JSON.stringify(body);
	res.writeHead(status, {
		"content-type": "application/json; charset=utf-8",
		"referrer-policy": "no-referrer"
	});
	res.end(payload);
}
/** Read a JSON request body (undefined when too large or unparseable). */
async function readJsonBody(req) {
	const chunks = [];
	let size = 0;
	for await (const chunk of req) {
		const buffer = chunk;
		size += buffer.length;
		if (size > MAX_JSON_BODY_BYTES) return void 0;
		chunks.push(buffer);
	}
	try {
		const parsed = JSON.parse(Buffer.concat(chunks).toString("utf8"));
		return typeof parsed === "object" && parsed !== null ? parsed : void 0;
	} catch {
		return;
	}
}
/** URL query helper (first value, decoded). */
function queryParam(url, name) {
	const value = url.searchParams.get(name);
	return value === null ? void 0 : value;
}
/**
* Build every /api/dsh-ssh route (exact paths) plus the terminal upgrade.
* @param deps - store, engine, staging dir.
* @returns routes and the upgrade route.
*/
function makeRoutes(deps) {
	const { store, engine } = deps;
	const staging = deps.stagingDir ?? join(tmpdir(), "dsh-ssh-uploads");
	mkdirSync(staging, { recursive: true });
	/** Guard helper: fence + method check. */
	const guard = (req, res, method) => {
		if (!isLoopbackRequest(req)) {
			writeJson(res, 403, { error: "forbidden: loopback-only" });
			return false;
		}
		if (req.method !== method) {
			writeJson(res, 405, { error: `method not allowed: ${req.method}` });
			return false;
		}
		return true;
	};
	return {
		routes: [
			{
				kind: "exact",
				path: SSH_API.hosts,
				handler: async (req, res) => {
					const method = req.method ?? "GET";
					if (!isLoopbackRequest(req)) {
						writeJson(res, 403, { error: "forbidden: loopback-only" });
						return;
					}
					const url = new URL(req.url ?? "/", "http://localhost");
					if (method === "GET") {
						writeJson(res, 200, { hosts: engine.list(queryParam(url, "query")) });
						return;
					}
					if (method === "POST") {
						const body = await readJsonBody(req);
						if (body === void 0) {
							writeJson(res, 400, { error: "invalid JSON body" });
							return;
						}
						try {
							const entry = store.create(body);
							writeJson(res, 201, { host: store.summarize(entry) });
						} catch (error) {
							writeJson(res, 400, { error: error instanceof Error ? error.message : String(error) });
						}
						return;
					}
					if (method !== "PATCH" && method !== "DELETE") {
						writeJson(res, 405, { error: `method not allowed: ${method}` });
						return;
					}
					const alias = queryParam(url, "alias");
					if (alias === void 0 || alias === "") {
						writeJson(res, 400, { error: "alias query parameter is required" });
						return;
					}
					if (method === "PATCH") {
						const body = await readJsonBody(req);
						if (body === void 0) {
							writeJson(res, 400, { error: "invalid JSON body" });
							return;
						}
						try {
							const entry = store.update(alias, body);
							writeJson(res, 200, { host: store.summarize(entry) });
						} catch (error) {
							writeJson(res, 400, { error: error instanceof Error ? error.message : String(error) });
						}
						return;
					}
					if (method === "DELETE") {
						try {
							engine.stopAllTunnels(alias);
							store.delete(alias);
							writeJson(res, 200, { ok: true });
						} catch (error) {
							writeJson(res, 400, { error: error instanceof Error ? error.message : String(error) });
						}
						return;
					}
					writeJson(res, 405, { error: `method not allowed: ${method}` });
				}
			},
			{
				kind: "exact",
				path: SSH_API.importSshConfig,
				handler: async (req, res) => {
					if (!guard(req, res, "POST")) return;
					try {
						writeJson(res, 200, { result: store.importFromSshConfig() });
					} catch (error) {
						writeJson(res, 500, { error: error instanceof Error ? error.message : String(error) });
					}
				}
			},
			{
				kind: "exact",
				path: SSH_API.test,
				handler: async (req, res) => {
					if (!guard(req, res, "POST")) return;
					const body = await readJsonBody(req);
					const alias = typeof body?.alias === "string" ? body.alias : "";
					if (alias === "") {
						writeJson(res, 400, { error: "alias is required" });
						return;
					}
					try {
						writeJson(res, 200, { result: await engine.test(alias) });
					} catch (error) {
						writeJson(res, 500, { error: error instanceof Error ? error.message : String(error) });
					}
				}
			},
			{
				kind: "exact",
				path: SSH_API.exec,
				handler: async (req, res) => {
					if (!guard(req, res, "POST")) return;
					const body = await readJsonBody(req);
					const alias = typeof body?.alias === "string" ? body.alias : "";
					const command = typeof body?.command === "string" ? body.command : "";
					if (alias === "" || command === "") {
						writeJson(res, 400, { error: "alias and command are required" });
						return;
					}
					const timeoutMs = typeof body?.timeoutMs === "number" ? body.timeoutMs : void 0;
					try {
						writeJson(res, 200, { result: await engine.exec(alias, command, timeoutMs) });
					} catch (error) {
						writeJson(res, 500, { error: error instanceof Error ? error.message : String(error) });
					}
				}
			},
			{
				kind: "exact",
				path: SSH_API.cluster,
				handler: async (req, res) => {
					if (!guard(req, res, "POST")) return;
					const body = await readJsonBody(req);
					const command = typeof body?.command === "string" ? body.command : "";
					if (command === "") {
						writeJson(res, 400, { error: "command is required" });
						return;
					}
					const aliases = Array.isArray(body?.aliases) ? body.aliases.filter((x) => typeof x === "string") : void 0;
					const tags = Array.isArray(body?.tags) ? body.tags.filter((x) => typeof x === "string") : void 0;
					const environment = typeof body?.environment === "string" ? body.environment : void 0;
					const timeoutMs = typeof body?.timeoutMs === "number" ? body.timeoutMs : void 0;
					const maxWorkers = typeof body?.maxWorkers === "number" ? body.maxWorkers : void 0;
					try {
						writeJson(res, 200, { results: await engine.cluster({
							command,
							aliases,
							environment,
							tags,
							timeoutMs,
							maxWorkers
						}) });
					} catch (error) {
						writeJson(res, 500, { error: error instanceof Error ? error.message : String(error) });
					}
				}
			},
			{
				kind: "exact",
				path: SSH_API.ls,
				handler: async (req, res) => {
					if (!guard(req, res, "GET")) return;
					const url = new URL(req.url ?? "/", "http://localhost");
					const alias = queryParam(url, "alias");
					const path = queryParam(url, "path") ?? "/";
					if (alias === void 0 || alias === "") {
						writeJson(res, 400, { error: "alias query parameter is required" });
						return;
					}
					try {
						writeJson(res, 200, { entries: await engine.ls(alias, path) });
					} catch (error) {
						writeJson(res, 400, { error: error instanceof Error ? error.message : String(error) });
					}
				}
			},
			{
				kind: "exact",
				path: SSH_API.tunnel,
				handler: async (req, res) => {
					if (!guard(req, res, "POST")) return;
					const body = await readJsonBody(req);
					const action = typeof body?.action === "string" ? body.action : "";
					if (action === "list") {
						writeJson(res, 200, { tunnels: engine.listTunnels() });
						return;
					}
					if (action === "start") {
						const alias = typeof body?.alias === "string" ? body.alias : "";
						const remotePort = typeof body?.remotePort === "number" ? body.remotePort : void 0;
						if (alias === "" || remotePort === void 0) {
							writeJson(res, 400, { error: "alias and remotePort are required" });
							return;
						}
						try {
							writeJson(res, 200, { tunnel: await engine.startTunnel(alias, {
								remotePort,
								remoteHost: typeof body?.remoteHost === "string" && body.remoteHost !== "" ? body.remoteHost : void 0,
								localPort: typeof body?.localPort === "number" ? body.localPort : void 0
							}) });
						} catch (error) {
							writeJson(res, 500, { error: error instanceof Error ? error.message : String(error) });
						}
						return;
					}
					if (action === "stop") {
						const id = typeof body?.tunnelId === "string" ? body.tunnelId : "";
						if (id === "") {
							writeJson(res, 400, { error: "tunnelId is required" });
							return;
						}
						writeJson(res, 200, { ok: engine.stopTunnel(id) });
						return;
					}
					if (action === "stop-all") {
						const alias = typeof body?.alias === "string" ? body.alias : void 0;
						writeJson(res, 200, { stopped: engine.stopAllTunnels(alias === "" ? void 0 : alias) });
						return;
					}
					writeJson(res, 400, { error: `unknown action '${action}'` });
				}
			},
			{
				kind: "exact",
				path: SSH_API.upload,
				handler: async (req, res) => {
					if (!guard(req, res, "POST")) return;
					const url = new URL(req.url ?? "/", "http://localhost");
					const alias = queryParam(url, "alias");
					const remotePath = queryParam(url, "remotePath");
					if (alias === void 0 || remotePath === void 0) {
						writeJson(res, 400, { error: "alias and remotePath query parameters are required" });
						return;
					}
					const declared = Number(req.headers["content-length"]);
					if (Number.isFinite(declared) && declared > MAX_UPLOAD_BYTES) {
						writeJson(res, 413, { error: "upload body too large" });
						return;
					}
					res.writeHead(200, {
						"content-type": "application/x-ndjson; charset=utf-8",
						"cache-control": "no-cache",
						"referrer-policy": "no-referrer"
					});
					const emit = (line) => {
						try {
							res.write(JSON.stringify(line) + "\n");
						} catch {}
					};
					const tmp = join(staging, `upload-${randomBytes(6).toString("hex")}`);
					const sink = createWriteStream(tmp);
					let settled = false;
					const fail = (error) => {
						if (settled) return;
						settled = true;
						emit({
							type: "result",
							ok: false,
							error: error instanceof Error ? error.message : String(error)
						});
						try {
							sink.destroy();
						} catch {}
						unlink(tmp).catch(() => void 0);
						try {
							res.end();
						} catch {}
					};
					const done = () => {
						if (settled) return;
						settled = true;
						try {
							res.end();
						} catch {}
					};
					sink.on("error", (error) => fail(error));
					req.on("error", (error) => fail(error));
					req.on("aborted", () => fail("upload aborted by the client"));
					res.on("error", () => fail("response stream closed"));
					res.on("close", () => {
						if (!res.writableEnded) fail("connection closed");
					});
					req.pipe(sink);
					sink.on("finish", async () => {
						if (settled) return;
						emit({
							type: "progress",
							progress: {
								phase: "connecting",
								file: remotePath,
								transferred: 0,
								total: 0,
								percent: 0
							}
						});
						try {
							const outcome = await engine.upload(alias, tmp, remotePath, false, (progress) => emit({
								type: "progress",
								progress
							}));
							emit({
								type: "result",
								ok: true,
								transferredBytes: outcome.bytes
							});
						} catch (error) {
							emit({
								type: "result",
								ok: false,
								error: error instanceof Error ? error.message : String(error)
							});
						} finally {
							await unlink(tmp).catch(() => void 0);
							done();
						}
					});
				}
			},
			{
				kind: "exact",
				path: SSH_API.download,
				handler: async (req, res) => {
					if (!guard(req, res, "GET")) return;
					const url = new URL(req.url ?? "/", "http://localhost");
					const alias = queryParam(url, "alias");
					const remotePath = queryParam(url, "remotePath");
					if (alias === void 0 || remotePath === void 0) {
						writeJson(res, 400, { error: "alias and remotePath query parameters are required" });
						return;
					}
					const tmp = join(staging, `download-${randomBytes(6).toString("hex")}`);
					try {
						const outcome = await engine.download(alias, remotePath, tmp);
						res.writeHead(200, {
							"content-type": "application/octet-stream",
							"content-length": String(outcome.bytes),
							"content-disposition": `attachment; filename="${basename(remotePath).replace(/"/g, "")}"`,
							"referrer-policy": "no-referrer"
						});
						await new Promise((resolve, reject) => {
							const source = createReadStream(tmp);
							source.on("error", reject);
							res.on("error", reject);
							source.pipe(res);
							source.on("end", resolve);
						});
					} catch (error) {
						if (!res.headersSent) writeJson(res, 400, { error: error instanceof Error ? error.message : String(error) });
						else res.destroy();
					} finally {
						await unlink(tmp).catch(() => void 0);
					}
				}
			}
		],
		upgrade: {
			path: SSH_API.terminal,
			handler: (req, socket, head) => {
				if (!isLoopbackRequest(req)) {
					socket.write("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
					socket.destroy();
					return;
				}
				const url = new URL(req.url ?? "/", "http://localhost");
				const alias = queryParam(url, "alias");
				if (alias === void 0) {
					socket.write("HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n");
					socket.destroy();
					return;
				}
				const cols = Number.parseInt(queryParam(url, "cols") ?? "80", 10);
				const rows = Number.parseInt(queryParam(url, "rows") ?? "24", 10);
				terminalWss.handleUpgrade(req, socket, head, (ws) => {
					let session;
					let closed = false;
					let paused = false;
					const resume = () => {
						if (paused && ws.bufferedAmount < BACKPRESSURE_LOW_WATER) {
							paused = false;
							session?.resume();
						}
					};
					const sendFrame = (frame) => {
						if (closed || ws.readyState !== WebSocket.OPEN) return;
						ws.send(JSON.stringify(frame), resume);
						if (!paused && ws.bufferedAmount > BACKPRESSURE_HIGH_WATER) {
							paused = true;
							session?.pause();
						}
					};
					const closeSession = () => {
						const opened = session;
						session = void 0;
						if (opened !== void 0) opened.close();
					};
					engine.openShell(alias, {
						cols: Number.isFinite(cols) ? cols : 80,
						rows: Number.isFinite(rows) ? rows : 24
					}).then((opened) => {
						if (ws.readyState !== WebSocket.OPEN) {
							opened.close();
							return;
						}
						session = opened;
						sendFrame({
							type: "ready",
							alias
						});
						opened.onData = (data) => sendFrame({
							type: "output",
							data: data.toString("utf8")
						});
						opened.onExit = (code, error) => {
							sendFrame({
								type: "exit",
								code,
								error
							});
							closed = true;
							try {
								ws.close(1e3);
							} catch {}
						};
					}).catch((error) => {
						sendFrame({
							type: "exit",
							code: null,
							error: error instanceof Error ? error.message : String(error)
						});
						closed = true;
						try {
							ws.close(1e3);
						} catch {}
					});
					ws.on("message", (data) => {
						let frame;
						try {
							frame = JSON.parse(String(data));
						} catch {
							return;
						}
						if (frame.type === "input") session?.send(frame.data);
						else if (frame.type === "resize") session?.resize(Math.max(2, frame.cols), Math.max(1, frame.rows));
					});
					ws.on("close", () => {
						closed = true;
						closeSession();
					});
					ws.on("error", () => {
						closed = true;
						closeSession();
					});
				});
			}
		}
	};
}
//#endregion
//#region src/tools.ts
/**
* Agent tools: the DSH-native counterpart of ssh-skill's CLI. Every tool
* talks to the same engine the web UI uses, so a host configured in the GUI
* is immediately operable by any agent, and vice versa.
*/
/** One text content block (the only render shape these tools emit). */
function text(value) {
	return [{
		type: "text",
		text: value
	}];
}
/** Host table render shared by list surfaces. */
function renderHosts(hosts) {
	if (hosts.length === 0) return "no hosts configured";
	return [
		"alias | host | port | user | auth | environment | tags | description",
		"--- | --- | --- | --- | --- | --- | --- | ---",
		...hosts.map((host) => [
			host.alias,
			host.host,
			String(host.port),
			host.user,
			host.auth,
			host.environment ?? "-",
			host.tags.length > 0 ? host.tags.join(",") : "-",
			host.description ?? ""
		].join(" | "))
	].join("\n");
}
/** Render one exec result (mirrors the bash-tool exit-code convention). */
function renderExec(result) {
	const parts = [result.timedOut ? "[timed out]" : `[exit code: ${result.exitCode ?? "null"}]`];
	if (result.stdout !== "") parts.push("stdout:\n" + result.stdout);
	if (result.stderr !== "") parts.push("stderr:\n" + result.stderr);
	if (result.error !== void 0) parts.push("error: " + result.error);
	parts.push(`duration: ${result.durationMs} ms`);
	return parts.join("\n");
}
/** Render cluster outcomes compactly. */
function renderCluster(results) {
	if (results.length === 0) return "no hosts matched";
	return results.map((result) => {
		const status = result.ok ? "ok" : result.timedOut === true ? "timed out" : "failed";
		const tail = result.error !== void 0 ? " (" + result.error + ")" : "";
		return `${result.alias}: ${status} [exit code: ${result.exitCode ?? "null"}]${tail}`;
	}).join("\n");
}
/** One tunnel line. */
function renderTunnel(tunnel) {
	return `${tunnel.id} ${tunnel.alias} 127.0.0.1:${tunnel.localPort} -> ${tunnel.remoteHost}:${tunnel.remotePort} [${tunnel.state}]`;
}
/** The host-list tool. */
function sshListTool(engine) {
	return defineTool({
		name: "ssh_list",
		description: "List configured SSH hosts (alias, host, user, auth, environment, tags, description). Use ssh_exec etc. with the alias. Triggers: SSH, remote server, server IP/hostname, connect/login, check server/status, deploy, upload/download, jump host, tunnel, port forward.",
		parameters: { query: {
			type: "string",
			description: "Optional fuzzy match against alias, description, host, and tags."
		} },
		output: {
			schema: {
				type: "object",
				additionalProperties: false,
				properties: { hosts: {
					type: "array",
					required: true,
					items: {
						type: "object",
						additionalProperties: false,
						properties: {
							alias: {
								type: "string",
								required: true
							},
							host: {
								type: "string",
								required: true
							},
							port: {
								type: "integer",
								required: true
							},
							user: {
								type: "string",
								required: true
							},
							auth: {
								type: "string",
								enum: ["key", "password"],
								required: true
							},
							keyReady: {
								type: "boolean",
								required: true
							},
							proxyJump: {
								type: "array",
								items: { type: "string" },
								required: true
							},
							description: { type: "string" },
							environment: { type: "string" },
							tags: {
								type: "array",
								items: { type: "string" },
								required: true
							},
							location: { type: "string" },
							createdAt: {
								type: "integer",
								required: true
							},
							updatedAt: {
								type: "integer",
								required: true
							}
						}
					}
				} }
			},
			render: (_args, value) => text(renderHosts(value.hosts ?? []))
		},
		async execute(args) {
			return { hosts: engine.list(args.query) };
		}
	});
}
/** The command-execution tool. */
function sshExecTool(engine) {
	return defineTool({
		name: "ssh_exec",
		description: "Execute a command on a configured SSH host by alias. Prefer combining independent read-only queries into one command. Triggers: run command on server, deploy, check server/status, service control, view logs, any remote operation.",
		parameters: {
			alias: {
				type: "string",
				required: true,
				description: "Host alias from ssh_list."
			},
			command: {
				type: "string",
				required: true,
				description: "The shell command to run remotely."
			},
			timeoutMs: {
				type: "integer",
				description: "Timeout in milliseconds (default 60000)."
			}
		},
		output: {
			schema: {
				type: "object",
				additionalProperties: false,
				properties: {
					success: {
						type: "boolean",
						required: true
					},
					exitCode: {
						oneOf: [{ type: "integer" }, { type: "null" }],
						required: true
					},
					timedOut: {
						type: "boolean",
						required: true
					},
					stdout: {
						type: "string",
						required: true
					},
					stderr: {
						type: "string",
						required: true
					},
					durationMs: {
						type: "integer",
						required: true
					},
					error: { type: "string" }
				}
			},
			render: (_args, value) => text(renderExec(value))
		},
		async execute(args) {
			try {
				return await engine.exec(args.alias, args.command, args.timeoutMs);
			} catch (error) {
				return {
					success: false,
					exitCode: null,
					timedOut: false,
					stdout: "",
					stderr: "",
					durationMs: 0,
					error: error instanceof Error ? error.message : String(error)
				};
			}
		}
	});
}
/** The upload tool. */
function sshUploadTool(engine) {
	return defineTool({
		name: "ssh_upload",
		description: "Upload a local file to a configured SSH host. The local path is on THIS machine (the dsh host). Triggers: upload file to server, deploy artifact, copy config to server.",
		parameters: {
			alias: {
				type: "string",
				required: true,
				description: "Host alias from ssh_list."
			},
			localPath: {
				type: "string",
				required: true,
				description: "Absolute local file path on this machine."
			},
			remotePath: {
				type: "string",
				required: true,
				description: "Destination path on the remote host (parent dirs are created)."
			}
		},
		output: {
			schema: {
				type: "object",
				additionalProperties: false,
				properties: {
					ok: {
						type: "boolean",
						required: true
					},
					transferredBytes: { type: "integer" },
					files: { type: "integer" },
					error: { type: "string" }
				}
			},
			render: (_args, value) => text(value.ok ? `uploaded ${value.files ?? 1} file(s), ${value.transferredBytes ?? 0} bytes` : `upload failed: ${value.error ?? "unknown error"}`)
		},
		async execute(args) {
			try {
				const outcome = await engine.upload(args.alias, args.localPath, args.remotePath, false);
				return {
					ok: true,
					transferredBytes: outcome.bytes,
					files: outcome.files
				};
			} catch (error) {
				return {
					ok: false,
					error: error instanceof Error ? error.message : String(error)
				};
			}
		}
	});
}
/** The download tool. */
function sshDownloadTool(engine) {
	return defineTool({
		name: "ssh_download",
		description: "Download a remote FILE from a configured SSH host to a local path on this machine. Directory download is not supported — download files individually. Triggers: download file from server, fetch remote log/artifact.",
		parameters: {
			alias: {
				type: "string",
				required: true,
				description: "Host alias from ssh_list."
			},
			remotePath: {
				type: "string",
				required: true,
				description: "Remote file path."
			},
			localPath: {
				type: "string",
				required: true,
				description: "Absolute destination path on this machine."
			}
		},
		output: {
			schema: {
				type: "object",
				additionalProperties: false,
				properties: {
					ok: {
						type: "boolean",
						required: true
					},
					bytes: { type: "integer" },
					error: { type: "string" }
				}
			},
			render: (_args, value) => text(value.ok ? `downloaded ${value.bytes ?? 0} bytes` : `download failed: ${value.error ?? "unknown error"}`)
		},
		async execute(args) {
			try {
				return {
					ok: true,
					bytes: (await engine.download(args.alias, args.remotePath, args.localPath)).bytes
				};
			} catch (error) {
				return {
					ok: false,
					error: error instanceof Error ? error.message : String(error)
				};
			}
		}
	});
}
/** The tunnel tool. */
function sshTunnelTool(engine) {
	return defineTool({
		name: "ssh_tunnel",
		description: "Manage local port-forward tunnels to a configured SSH host. Start a tunnel to reach a remote internal service (database, web UI, API) through 127.0.0.1 on this machine. Triggers: tunnel, port forward, connect database, access internal service.",
		parameters: {
			action: {
				type: "string",
				required: true,
				enum: [
					"start",
					"list",
					"stop",
					"stop-all"
				],
				description: "start / list / stop / stop-all."
			},
			alias: {
				type: "string",
				description: "Host alias (required for start, optional for stop-all)."
			},
			remotePort: {
				type: "integer",
				description: "Port on the remote side (required for start)."
			},
			remoteHost: {
				type: "string",
				description: "Remote host to forward to (default 127.0.0.1 — the server itself)."
			},
			localPort: {
				type: "integer",
				description: "Local listening port (default: auto-assigned)."
			},
			tunnelId: {
				type: "string",
				description: "Tunnel id (required for stop)."
			}
		},
		output: {
			schema: {
				type: "object",
				additionalProperties: false,
				properties: {
					ok: {
						type: "boolean",
						required: true
					},
					tunnel: {
						type: "object",
						additionalProperties: false,
						properties: {
							id: {
								type: "string",
								required: true
							},
							alias: {
								type: "string",
								required: true
							},
							localPort: {
								type: "integer",
								required: true
							},
							remoteHost: {
								type: "string",
								required: true
							},
							remotePort: {
								type: "integer",
								required: true
							},
							state: {
								type: "string",
								enum: [
									"forwarding",
									"connecting",
									"failed"
								],
								required: true
							},
							error: { type: "string" },
							startedAt: {
								type: "integer",
								required: true
							}
						}
					},
					tunnels: {
						type: "array",
						items: {
							type: "object",
							additionalProperties: false,
							properties: {
								id: {
									type: "string",
									required: true
								},
								alias: {
									type: "string",
									required: true
								},
								localPort: {
									type: "integer",
									required: true
								},
								remoteHost: {
									type: "string",
									required: true
								},
								remotePort: {
									type: "integer",
									required: true
								},
								state: {
									type: "string",
									enum: [
										"forwarding",
										"connecting",
										"failed"
									],
									required: true
								},
								error: { type: "string" },
								startedAt: {
									type: "integer",
									required: true
								}
							}
						}
					},
					stopped: { type: "integer" },
					error: { type: "string" }
				}
			},
			render: (_args, value) => {
				if (value.error !== void 0) return text(`tunnel error: ${value.error}`);
				if (value.tunnel !== void 0) {
					if (value.tunnel.state === "failed") return text(`tunnel failed: ${value.tunnel.error ?? "unknown error"}`);
					return text(`tunnel started: ${renderTunnel(value.tunnel)}`);
				}
				if (value.tunnels !== void 0) return text(value.tunnels.length === 0 ? "no active tunnels" : value.tunnels.map(renderTunnel).join("\n"));
				return text(`stopped ${value.stopped ?? 0} tunnel(s)`);
			}
		},
		async execute(args) {
			if (args.action === "list") return {
				ok: true,
				tunnels: engine.listTunnels()
			};
			if (args.action === "start") {
				if (args.alias === void 0 || args.remotePort === void 0) throw new Error("alias and remotePort are required for start");
				try {
					return {
						ok: true,
						tunnel: await engine.startTunnel(args.alias, {
							remotePort: args.remotePort,
							remoteHost: args.remoteHost,
							localPort: args.localPort
						})
					};
				} catch (error) {
					return {
						ok: false,
						tunnel: {
							id: "",
							alias: args.alias,
							localPort: 0,
							remoteHost: args.remoteHost ?? "127.0.0.1",
							remotePort: args.remotePort,
							state: "failed",
							error: error instanceof Error ? error.message : String(error),
							startedAt: Date.now()
						}
					};
				}
			}
			if (args.action === "stop") {
				if (args.tunnelId === void 0) throw new Error("tunnelId is required for stop");
				return engine.stopTunnel(args.tunnelId) ? {
					ok: true,
					stopped: 1
				} : {
					ok: false,
					stopped: 0,
					error: `tunnel '${args.tunnelId}' not found`
				};
			}
			if (args.action === "stop-all") return {
				ok: true,
				stopped: engine.stopAllTunnels(args.alias)
			};
			throw new Error(`unknown action '${String(args.action)}'`);
		}
	});
}
/** The cluster tool. */
function sshClusterTool(engine) {
	return defineTool({
		name: "ssh_cluster",
		description: "Run one command concurrently across many SSH hosts (all hosts, or filtered by aliases / environment / tags). Triggers: run on all servers, batch operation, production servers, cluster command.",
		parameters: {
			command: {
				type: "string",
				required: true,
				description: "The shell command to run on every matched host."
			},
			aliases: {
				type: "array",
				items: { type: "string" },
				description: "Explicit alias list; when absent every configured host matches."
			},
			environment: {
				type: "string",
				description: "Only hosts with this environment label."
			},
			tags: {
				type: "array",
				items: { type: "string" },
				description: "Only hosts carrying ALL these tags."
			},
			timeoutMs: {
				type: "integer",
				description: "Per-host timeout in milliseconds."
			},
			maxWorkers: {
				type: "integer",
				description: "Concurrency cap (default 8)."
			}
		},
		output: {
			schema: {
				type: "object",
				additionalProperties: false,
				properties: { results: {
					type: "array",
					required: true,
					items: {
						type: "object",
						additionalProperties: false,
						properties: {
							alias: {
								type: "string",
								required: true
							},
							ok: {
								type: "boolean",
								required: true
							},
							exitCode: { oneOf: [{ type: "integer" }, { type: "null" }] },
							timedOut: { type: "boolean" },
							stdout: { type: "string" },
							stderr: { type: "string" },
							durationMs: { type: "integer" },
							error: { type: "string" }
						}
					}
				} }
			},
			render: (_args, value) => text(renderCluster(value.results ?? []))
		},
		async execute(args) {
			return { results: await engine.cluster(args) };
		}
	});
}
//#endregion
//#region src/index.ts
/** Stable cordis plugin name. */
const name = "ssh";
/** Services required before the SSH surfaces can mount. */
const inject = [
	"webServer",
	"tools",
	"systemPrompt"
];
/**
* Settings namespace of the SSH capability — the section the web settings
* surface edits. Spelled here rather than imported: the browser half spells
* the same value and must not depend on a Host package.
*/
const SSH_SETTINGS_NAMESPACE = settingsNamespace("dsh-ssh");
const Config = import_lib.default.object({
	announceToAgent: import_lib.default.boolean().default(true),
	enabled: import_lib.default.boolean().default(true)
});
/** Schema default, re-read for hand-built test contexts (the loader applies them normally). */
const DEFAULT_ANNOUNCE = true;
/** Order of the announcement section within the tool-guidance band. */
const SECTION_ORDER = 150;
/** Model-facing announcement: plugin presence, capabilities, and limits. */
const SSH_GUIDANCE = "本机已安装 dsh-ssh 插件（DSH 远程 SSH 运维）：侧边栏「SSH」入口；在 dsh-web-ui 插件全家桶仓库（packages/dsh-ssh）统一维护。能力：主机配置存 ~/.dsh/dsh-ssh.json（可从 ~/.ssh/config 导入）；持久连接池复用长连接（空闲 30 分钟自动断开）；ssh_list 列出主机、ssh_exec 执行远程命令、ssh_upload/ssh_download 传输文件、ssh_tunnel 本地端口转发（访问远程数据库/内网服务）、ssh_cluster 集群并发执行；支持密钥/密码认证、passphrase 密钥与 ProxyJump 跳板机；Web 终端走 WebSocket。限制：主机操作由用户在 GUI 中配置后 agent 方可使用；密码以明文存在用户主目录私有文件（权限 0600）；命令输出原样返回、可能含敏感信息；断线重连可能重放非幂等命令；传输/执行消耗真实远程资源，先确认再操作。用户提到「SSH / 远程服务器 / 服务器操作 / 跳板机 / 隧道 / 部署 / 上传下载」时即指本插件，请据此协作。";
/**
* Mount the SSH engine, routes, tools, and announcement.
* @param ctx - host plugin context carrying webServer/tools/systemPrompt.
* @param config - resolved plugin config (schema defaults applied by the loader).
*/
function apply(ctx, config) {
	let current = () => config ?? {};
	const resolve = () => {
		const value = current();
		return {
			announceToAgent: value.announceToAgent ?? DEFAULT_ANNOUNCE,
			enabled: value.enabled ?? true
		};
	};
	const store = new HostStore();
	const engine = new SshEngine(store);
	ctx.effect(() => () => {
		engine.dispose();
	}, "dsh-ssh: engine");
	const { routes, upgrade } = makeRoutes({
		store,
		engine
	});
	let disposeRoutes;
	const tools = [
		sshListTool(engine),
		sshExecTool(engine),
		sshUploadTool(engine),
		sshDownloadTool(engine),
		sshTunnelTool(engine),
		sshClusterTool(engine)
	];
	let disposeTools;
	let disposeSection;
	const sync = () => {
		const value = resolve();
		if (disposeSection !== void 0) {
			disposeSection();
			disposeSection = void 0;
		}
		if (disposeRoutes !== void 0) {
			disposeRoutes();
			disposeRoutes = void 0;
		}
		if (disposeTools !== void 0) {
			disposeTools();
			disposeTools = void 0;
		}
		if (!value.enabled) return;
		if (value.announceToAgent) disposeSection = ctx.systemPrompt.section({
			name: "plugin:dsh-ssh",
			order: SECTION_ORDER,
			text: SSH_GUIDANCE
		});
		disposeRoutes = ctx.effect(() => {
			const disposers = routes.map((route) => ctx.webServer.register(route));
			const upgradeDisposer = ctx.webServer.registerUpgrade(upgrade);
			return () => {
				for (const dispose of disposers) dispose();
				upgradeDisposer();
			};
		}, "dsh-ssh: routes");
		disposeTools = ctx.effect(() => {
			const disposers = tools.map((tool) => ctx.tools.register(tool));
			return () => {
				for (const dispose of disposers) dispose();
			};
		}, "dsh-ssh: tools");
	};
	installSettingsSection(ctx, SSH_SETTINGS_NAMESPACE, Config, config ?? {}, {
		setSource: (source) => {
			current = source;
			sync();
		},
		onChange: sync
	});
	sync();
}
//#endregion
export { Config, HostStore, SSH_GUIDANCE, SSH_SETTINGS_NAMESPACE, SshEngine, apply, inject, name };
