import { HostStore, SshEngine } from "@deepseek-ai/dsh-ssh";
import { mkdir, readFile, readdir, realpath, stat, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join } from "node:path";
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
var RemoteModeStore = class {
	state = { mode: "local" };
	listeners = /* @__PURE__ */ new Set();
	/** The current state (routes/tools read this per request). */
	getSnapshot() {
		return this.state;
	}
	/** Subscribe to state changes; returns the disposer. */
	subscribe(listener) {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	}
	/** Replace the whole state (routes are the only writers). */
	set(state) {
		this.state = state;
		for (const listener of [...this.listeners]) listener();
	}
};
/** Directories skipped by search (VS Code-like noise reduction). */
const SEARCH_SKIP_DIRS = /* @__PURE__ */ new Set([".git", "node_modules"]);
/** Directories never listed in the tree. */
const TREE_SKIP_DIRS = /* @__PURE__ */ new Set([".git"]);
/** Remote find/glob max depth. */
const REMOTE_FIND_MAX_DEPTH = 6;
/** Remote exec timeout for find/grep. */
const REMOTE_SEARCH_TIMEOUT_MS = 2e4;
/** Error carrying a stable machine-readable code (routes map codes to status). */
var BackendError = class extends Error {
	code;
	constructor(code, message) {
		super(message);
		this.code = code;
		this.name = "BackendError";
	}
};
/** Normalize a workspace-relative path: strip slashes and '.', reject '..'. */
function normalizeRel(raw) {
	const parts = raw.split("/").filter((part) => part !== "" && part !== ".");
	for (const part of parts) if (part === "..") throw new BackendError("outside-root", "path escapes root: \"..\" is not allowed");
	return parts.join("/");
}
/** True when abs is inside root (prefix on normalized paths). */
function isInside(root, abs) {
	const prefix = root.endsWith("/") ? root : root + "/";
	return abs === root || abs.startsWith(prefix);
}
/** Resolve a rel path against a root using posix semantics (both backends). */
function relToAbs(root, rel) {
	const normalized = normalizeRel(rel);
	const base = root.replace(/\/+$/, "");
	return normalized === "" ? base : `${base}/${normalized}`;
}
/** Escape a string into a POSIX single-quoted shell word. */
function shellQuote(value) {
	return `'${value.replace(/'/g, `'\\''`)}'`;
}
/** Sanitize a search query for embedding in a remote find -iname literal. */
function sanitizeQuery(query) {
	return query.replace(/['"`\\;$(){}|&<>*\n\r\t]/g, "").slice(0, 64);
}
/** Decode a buffer as UTF-8 text with the text/binary gate (no size cap —
*  the preview loads the whole file; binary detection is by NUL probe only). */
function decodeText(buffer, path) {
	if (buffer.length > 0) {
		if (buffer.subarray(0, Math.min(buffer.length, 8192)).includes(0)) throw new BackendError("binary", `'${path}' is not a text file`);
	}
	return buffer.toString("utf8");
}
/**
* Local backend: plain node:fs against an absolute local root (the session's
* cwd, supplied by the browser). Realpath-walk gating keeps symlinks inside.
*/
var LocalBackend = class {
	assertRoot(root) {
		if (!isAbsolute(root)) throw new BackendError("outside-root", `root must be an absolute local path (got '${root}')`);
	}
	async list(root, rel) {
		const abs = await this.resolve(root, rel);
		let dirents;
		try {
			dirents = await readdir(abs, { withFileTypes: true });
		} catch (error) {
			throw this.io(error, abs);
		}
		return {
			path: abs,
			entries: dirents.filter((entry) => !TREE_SKIP_DIRS.has(entry.name)).map((entry) => ({
				name: entry.name,
				type: entry.isDirectory() ? "dir" : entry.isFile() ? "file" : "other",
				size: 0,
				mtimeMs: 0
			})).sort((a, b) => {
				if (a.type === "dir" && b.type !== "dir") return -1;
				if (a.type !== "dir" && b.type === "dir") return 1;
				const an = a.name.toLowerCase();
				const bn = b.name.toLowerCase();
				return an < bn ? -1 : an > bn ? 1 : 0;
			})
		};
	}
	async read(root, rel) {
		const abs = await this.resolve(root, rel);
		let buffer;
		let stats;
		try {
			buffer = await readFile(abs);
			stats = await stat(abs);
		} catch (error) {
			throw this.io(error, abs);
		}
		if (stats.isDirectory()) throw new BackendError("io", `'${abs}' is a directory`);
		return {
			path: abs,
			content: decodeText(buffer, abs),
			size: stats.size,
			mtime: stats.mtimeMs
		};
	}
	async write(root, rel, content, expectedMtime) {
		const abs = await this.resolve(root, rel);
		if (expectedMtime !== void 0) {
			let stats;
			try {
				stats = await stat(abs);
			} catch (error) {
				throw this.io(error, abs);
			}
			if (Math.round(stats.mtimeMs) !== Math.round(expectedMtime)) throw new BackendError("conflict", `mtime conflict: remote file changed (${Math.round(stats.mtimeMs)} != ${Math.round(expectedMtime)})`);
		}
		try {
			await mkdir(dirname(abs), { recursive: true });
			await writeFile(abs, content, "utf8");
			return { mtime: (await stat(abs)).mtimeMs };
		} catch (error) {
			throw this.io(error, abs);
		}
	}
	async search(root, query) {
		const hits = [];
		let scanned = 0;
		let truncated = false;
		const walk = async (dir, depth) => {
			if (hits.length >= 200 || scanned >= 2e4 || depth > 4) {
				if (hits.length >= 200 || scanned >= 2e4) truncated = true;
				return;
			}
			let dirents;
			try {
				dirents = await readdir(dir, { withFileTypes: true });
			} catch {
				return;
			}
			for (const entry of dirents) {
				scanned += 1;
				if (scanned > 2e4) {
					truncated = true;
					return;
				}
				if (entry.isDirectory() && SEARCH_SKIP_DIRS.has(entry.name)) continue;
				const abs = join(dir, entry.name);
				if (entry.isDirectory()) {
					if (entry.name.toLowerCase().includes(query)) hits.push({
						path: abs,
						rel: this.relOf(root, abs),
						isDir: true
					});
					await walk(abs, depth + 1);
				} else if (entry.name.toLowerCase().includes(query)) hits.push({
					path: abs,
					rel: this.relOf(root, abs),
					isDir: false
				});
				if (hits.length >= 200) {
					truncated = true;
					return;
				}
			}
		};
		await walk(root, 0);
		return {
			query,
			hits: hits.slice(0, 200),
			truncated
		};
	}
	/** Realpath-walk gate: the resolved absolute path must stay inside root. */
	async resolve(root, rel) {
		const normalized = normalizeRel(rel);
		const abs = normalized === "" ? root : join(root, ...normalized.split("/"));
		if (!this.isWithin(root, abs)) throw new BackendError("outside-root", `path escapes root: ${rel}`);
		let probe = abs;
		for (let hop = 0; hop < 32; hop += 1) {
			let real;
			try {
				real = await realpath(probe);
			} catch (error) {
				if (error.code !== "ENOENT") return abs;
				const parent = dirname(probe);
				if (parent === probe) return abs;
				probe = parent;
				continue;
			}
			if (!this.isWithin(root, real)) throw new BackendError("outside-root", `path resolves outside root: ${rel}`);
			return abs;
		}
		throw new BackendError("outside-root", `path cannot be resolved: ${rel}`);
	}
	isWithin(root, abs) {
		const prefix = root.endsWith("\\") || root.endsWith("/") ? root : root + (root.includes("\\") ? "\\" : "/");
		return abs === root || abs.toLowerCase().startsWith(prefix.toLowerCase());
	}
	relOf(root, abs) {
		return abs === root ? "" : abs.slice(root.length).replace(/^[\\/]+/, "");
	}
	io(error, path) {
		return new BackendError("io", `'${path}': ${error instanceof Error ? error.message : String(error)}`);
	}
};
/**
* Remote backend: every operation rides the dsh-ssh engine's SFTP/exec against
* the mode's active host, gated to the resolved remote root.
*/
var RemoteBackend = class {
	engine;
	getState;
	constructor(engine, getState) {
		this.engine = engine;
		this.getState = getState;
	}
	get alias() {
		const state = this.getState();
		if (state.mode !== "remote" || state.alias === void 0) throw new BackendError("not-remote", "not in remote mode — switch the GUI to SSH mode first");
		return state.alias;
	}
	assertRoot(root) {
		const state = this.getState();
		if (state.mode !== "remote" || state.alias === void 0) throw new BackendError("not-remote", "not in remote mode — switch the GUI to SSH mode first");
		if (state.remoteRoot === void 0 || root !== state.remoteRoot) throw new BackendError("root-mismatch", `root '${root}' does not match the remote workspace root '${state.remoteRoot ?? "?"}'`);
	}
	async list(root, rel) {
		this.assertRoot(root);
		const abs = relToAbs(root, rel);
		try {
			return {
				path: abs,
				entries: (await this.engine.ls(this.alias, abs)).filter((entry) => !TREE_SKIP_DIRS.has(entry.name)).map((entry) => ({
					name: entry.name,
					type: entry.type,
					size: entry.size,
					mtimeMs: entry.mtimeMs
				})).sort((a, b) => {
					if (a.type === "dir" && b.type !== "dir") return -1;
					if (a.type !== "dir" && b.type === "dir") return 1;
					const an = a.name.toLowerCase();
					const bn = b.name.toLowerCase();
					return an < bn ? -1 : an > bn ? 1 : 0;
				})
			};
		} catch (error) {
			throw this.io(error, abs);
		}
	}
	async read(root, rel) {
		this.assertRoot(root);
		const abs = relToAbs(root, rel);
		try {
			const result = await this.engine.readFile(this.alias, abs);
			return {
				path: abs,
				content: decodeText(result.content, abs),
				size: result.size,
				mtime: result.mtime
			};
		} catch (error) {
			if (error instanceof BackendError) throw error;
			throw this.io(error, abs);
		}
	}
	async write(root, rel, content, expectedMtime) {
		this.assertRoot(root);
		const abs = relToAbs(root, rel);
		try {
			return { mtime: (await this.engine.writeFile(this.alias, abs, Buffer.from(content, "utf8"), expectedMtime)).mtime };
		} catch (error) {
			if (error instanceof BackendError) throw error;
			throw this.io(error, abs);
		}
	}
	async search(root, query) {
		this.assertRoot(root);
		const literal = sanitizeQuery(query);
		if (literal === "") return {
			query,
			hits: [],
			truncated: false
		};
		const cmd = `find ${shellQuote(root)} -maxdepth 4 \\( -not -path ${shellQuote("*/node_modules*")} \\) \\( -not -path ${shellQuote("*/.git*")} \\) -iname ${shellQuote(`*${literal}*`)} -printf '%y|%p\\n'`;
		return this.parseFind(root, query, cmd);
	}
	/** Glob search over the remote root (remote_glob tool; max depth 6). */
	async glob(root, pattern) {
		this.assertRoot(root);
		const normalized = normalizeRel(pattern);
		if (normalized === "") return {
			query: pattern,
			hits: [],
			truncated: false
		};
		const cmd = `find ${shellQuote(root)} -maxdepth ${REMOTE_FIND_MAX_DEPTH} -path ${shellQuote(`${root}/${normalized}`)} -printf '%y|%p\\n'`;
		return this.parseFind(root, pattern, cmd);
	}
	/** Content grep over the remote root (remote_grep tool; capped output). */
	async grep(root, pattern) {
		this.assertRoot(root);
		const cmd = `grep -rIn --exclude-dir=.git --exclude-dir=node_modules -m 200 ${shellQuote(pattern.replace(/'/g, `'\\''`))} ${shellQuote(root)} 2>/dev/null | head -c 200000`;
		const result = await this.engine.exec(this.alias, cmd, REMOTE_SEARCH_TIMEOUT_MS);
		if (!result.success && result.stderr !== "" && result.stdout === "") throw new BackendError("io", result.stderr.trim());
		return {
			lines: result.stdout.split("\n").filter((line) => line !== ""),
			truncated: result.stdout.length >= 2e5
		};
	}
	/** Run one find command and normalize its '%y|%p' lines. */
	async parseFind(root, query, cmd) {
		const result = await this.engine.exec(this.alias, cmd, REMOTE_SEARCH_TIMEOUT_MS);
		if (!result.success && result.stderr !== "" && result.stdout === "") throw new BackendError("io", result.stderr.trim());
		const hits = [];
		const lines = result.stdout.split("\n");
		for (const line of lines) {
			if (line === "") continue;
			const separator = line.indexOf("|");
			if (separator < 1) continue;
			const abs = line.slice(separator + 1);
			if (abs === "") continue;
			hits.push({
				path: abs,
				rel: this.relOf(root, abs),
				isDir: line[0] === "d"
			});
			if (hits.length >= 200) break;
		}
		return {
			query,
			hits,
			truncated: hits.length >= 200 || lines.length > hits.length
		};
	}
	relOf(root, abs) {
		return abs === root ? "" : abs.slice(root.length).replace(/^\/+/, "");
	}
	io(error, path) {
		return new BackendError("io", `'${path}': ${error instanceof Error ? error.message : String(error)}`);
	}
};
//#endregion
//#region src/protocol.ts
const WORKSPACE_API = {
	state: "/api/dsh-easyssh/state",
	tree: "/api/dsh-easyssh/tree",
	file: "/api/dsh-easyssh/file",
	search: "/api/dsh-easyssh/search"
};
//#endregion
//#region src/routes.ts
/** Cap on JSON request bodies (file writes carry content). */
const MAX_JSON_BODY_BYTES = 4 * 1024 * 1024;
/** Loopback literal check plus browser same-origin markers (mirrors dsh-ssh). */
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
/** Map a backend error to an HTTP status. */
function backendStatus(error) {
	switch (error.code) {
		case "conflict": return 409;
		case "outside-root":
		case "root-mismatch":
		case "not-remote": return 403;
		case "binary":
		case "too-large": return 422;
		default: return 500;
	}
}
/**
* Build every /api/dsh-easyssh route (exact paths).
* @param deps - mode store, host store (alias validation), ssh engine.
* @returns the routes to register.
*/
function makeRoutes(deps) {
	const { store, hosts, engine } = deps;
	const local = new LocalBackend();
	const remote = new RemoteBackend(engine, () => store.getSnapshot());
	const backend = () => {
		return store.getSnapshot().mode === "remote" ? remote : local;
	};
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
	return [
		{
			kind: "exact",
			path: WORKSPACE_API.state,
			handler: async (req, res) => {
				const method = req.method ?? "GET";
				if (method === "GET") {
					if (!guard(req, res, "GET")) return;
					writeJson(res, 200, { state: store.getSnapshot() });
					return;
				}
				if (method === "POST") {
					if (!isLoopbackRequest(req)) {
						writeJson(res, 403, { error: "forbidden: loopback-only" });
						return;
					}
					const body = await readJsonBody(req);
					if (body === void 0) {
						writeJson(res, 400, { error: "malformed JSON body" });
						return;
					}
					const mode = body.mode;
					if (mode !== "local" && mode !== "remote") {
						writeJson(res, 400, { error: "mode must be \"local\" or \"remote\"" });
						return;
					}
					const previous = store.getSnapshot();
					if (mode === "local") {
						store.set({
							mode: "local",
							alias: previous.alias,
							remoteRoot: previous.remoteRoot,
							remoteRootLabel: previous.remoteRootLabel
						});
						writeJson(res, 200, { state: store.getSnapshot() });
						return;
					}
					const alias = typeof body.alias === "string" ? body.alias.trim() : "";
					if (alias === "") {
						writeJson(res, 400, { error: "alias is required for remote mode" });
						return;
					}
					if (hosts.find(alias) === void 0) {
						writeJson(res, 404, { error: `alias '${alias}' not found — configure it in the SSH dialog first` });
						return;
					}
					let remoteRoot = previous.remoteRoot;
					let label = previous.remoteRootLabel;
					const requested = typeof body.remoteRoot === "string" && body.remoteRoot.trim() !== "" ? body.remoteRoot.trim() : "~";
					if (requested === "~") try {
						const result = await engine.exec(alias, "printf %s \"$HOME\"", 1e4);
						if (!result.success || result.stdout.trim() === "") {
							writeJson(res, 502, { error: `could not resolve remote home: ${result.stderr.trim() || "empty $HOME"}` });
							return;
						}
						remoteRoot = result.stdout.trim();
						label = "~";
					} catch (error) {
						writeJson(res, 502, { error: error instanceof Error ? error.message : String(error) });
						return;
					}
					else {
						if (!requested.startsWith("/")) {
							writeJson(res, 400, { error: `remoteRoot must be an absolute path or '~' (got '${requested}')` });
							return;
						}
						remoteRoot = requested.replace(/\/+$/, "");
						label = requested;
					}
					store.set({
						mode: "remote",
						alias,
						remoteRoot,
						remoteRootLabel: label
					});
					writeJson(res, 200, { state: store.getSnapshot() });
					return;
				}
				writeJson(res, 405, { error: `method not allowed: ${method}` });
			}
		},
		{
			kind: "exact",
			path: WORKSPACE_API.tree,
			handler: async (req, res) => {
				if (!guard(req, res, "GET")) return;
				const url = new URL(req.url ?? "/", "http://localhost");
				const root = queryParam(url, "root");
				const path = queryParam(url, "path") ?? "";
				if (root === void 0 || root === "") {
					writeJson(res, 400, { error: "root query parameter is required" });
					return;
				}
				try {
					writeJson(res, 200, { listing: await backend().list(root, path) });
				} catch (error) {
					writeJson(res, backendStatus(toBackendError(error)), { error: messageOf(error) });
				}
			}
		},
		{
			kind: "exact",
			path: WORKSPACE_API.file,
			handler: async (req, res) => {
				const method = req.method ?? "GET";
				if (method === "GET") {
					if (!guard(req, res, "GET")) return;
					const url = new URL(req.url ?? "/", "http://localhost");
					const root = queryParam(url, "root");
					const path = queryParam(url, "path");
					if (root === void 0 || root === "" || path === void 0) {
						writeJson(res, 400, { error: "root and path query parameters are required" });
						return;
					}
					try {
						writeJson(res, 200, { file: await backend().read(root, path) });
					} catch (error) {
						writeJson(res, backendStatus(toBackendError(error)), { error: messageOf(error) });
					}
					return;
				}
				if (method === "PUT") {
					if (!isLoopbackRequest(req)) {
						writeJson(res, 403, { error: "forbidden: loopback-only" });
						return;
					}
					const body = await readJsonBody(req);
					if (body === void 0) {
						writeJson(res, 400, { error: "malformed JSON body" });
						return;
					}
					const root = typeof body.root === "string" ? body.root : "";
					const path = typeof body.path === "string" ? body.path : "";
					const content = typeof body.content === "string" ? body.content : void 0;
					if (root === "" || path === "" || content === void 0) {
						writeJson(res, 400, { error: "root, path and content are required" });
						return;
					}
					const rawMtime = body.expectedMtime;
					const expectedMtime = typeof rawMtime === "number" && Number.isFinite(rawMtime) ? rawMtime : void 0;
					try {
						writeJson(res, 200, { result: await backend().write(root, path, content, expectedMtime) });
					} catch (error) {
						writeJson(res, backendStatus(toBackendError(error)), { error: messageOf(error) });
					}
					return;
				}
				writeJson(res, 405, { error: `method not allowed: ${method}` });
			}
		},
		{
			kind: "exact",
			path: WORKSPACE_API.search,
			handler: async (req, res) => {
				if (!guard(req, res, "GET")) return;
				const url = new URL(req.url ?? "/", "http://localhost");
				const root = queryParam(url, "root");
				const query = queryParam(url, "query") ?? "";
				if (root === void 0 || root === "") {
					writeJson(res, 400, { error: "root query parameter is required" });
					return;
				}
				try {
					writeJson(res, 200, { search: await backend().search(root, query) });
				} catch (error) {
					writeJson(res, backendStatus(toBackendError(error)), { error: messageOf(error) });
				}
			}
		}
	];
}
/** Coerce any thrown value to a BackendError (routes normalize on it). */
function toBackendError(error) {
	return error instanceof BackendError ? error : new BackendError("io", error instanceof Error ? error.message : String(error));
}
/** The human message of a thrown value. */
function messageOf(error) {
	return error instanceof Error ? error.message : String(error);
}
//#endregion
//#region src/tools.ts
/**
* Agent tools: the remote-workspace counterpart of the local fs tools. Every
* tool is bound to the CURRENT SSH mode host (no alias parameter — the mode
* store decides), gated to the resolved remote root, and returns lossless
* JSON. In local mode every tool answers a clear "switch to SSH mode first"
* error instead of touching the local machine.
*/
/** One text content block (the only render shape these tools emit). */
function text(value) {
	return [{
		type: "text",
		text: value
	}];
}
/** Build every remote_* tool (registered by the host half). */
function makeWorkspaceTools(deps) {
	const { store, engine } = deps;
	const remote = new RemoteBackend(engine, () => store.getSnapshot());
	/** The current remote state, or a failure when not in remote mode. */
	const remoteState = () => {
		const state = store.getSnapshot();
		if (state.mode !== "remote" || state.alias === void 0) return {
			ok: false,
			error: "not in remote mode — switch the GUI to SSH mode first (top-right button)"
		};
		return { state };
	};
	/** Gate one absolute path to the remote root. */
	const gatePath = (state, abs) => {
		const root = state.remoteRoot;
		if (root === void 0 || !isInside(root, abs)) return `path '${abs}' is outside the remote workspace root '${root ?? "?"}'`;
	};
	/** Run one remote op, catching errors into the failure envelope. */
	const run = async (operation) => {
		try {
			return await operation();
		} catch (error) {
			return {
				ok: false,
				error: error instanceof BackendError ? error.message : error instanceof Error ? error.message : String(error)
			};
		}
	};
	return [
		defineTool({
			name: "remote_status",
			description: "Query the current workspace mode of the SSH workspace plugin: local (this machine) or remote (an SSH host). Call this before any remote_* tool to confirm the mode and the remote root. Triggers: SSH mode, remote workspace, where am I working.",
			parameters: {},
			output: {
				schema: {
					type: "object",
					additionalProperties: false,
					properties: {
						mode: {
							type: "string",
							enum: ["local", "remote"],
							required: true
						},
						alias: { type: "string" },
						remoteRoot: { type: "string" },
						remoteRootLabel: { type: "string" }
					}
				},
				render: (_args, value) => {
					const state = value;
					if (state.mode === "remote") return text(`mode: remote (${state.alias}) root: ${state.remoteRootLabel ?? state.remoteRoot ?? "~"}`);
					return text(`mode: local (this machine)${state.alias !== void 0 ? ` — last remote target: ${state.alias}` : ""}`);
				}
			},
			async execute() {
				return store.getSnapshot();
			}
		}),
		defineTool({
			name: "remote_ls",
			description: "List a directory on the CURRENT SSH-mode host (must be inside the remote workspace root). Triggers: list remote directory, remote files, ls on the server.",
			parameters: { path: {
				type: "string",
				required: true,
				description: "Absolute remote directory path inside the remote root (e.g. /home/user/project/src)."
			} },
			output: {
				schema: {
					type: "object",
					additionalProperties: false,
					properties: {
						ok: {
							type: "boolean",
							required: true
						},
						path: { type: "string" },
						entries: {
							type: "array",
							items: {
								type: "object",
								additionalProperties: false,
								properties: {
									name: {
										type: "string",
										required: true
									},
									type: {
										type: "string",
										required: true
									},
									size: {
										type: "integer",
										required: true
									},
									mtimeMs: {
										type: "integer",
										required: true
									}
								}
							}
						},
						error: { type: "string" }
					}
				},
				render: (_args, value) => {
					if (value.ok !== true) return text(`remote_ls failed: ${value.error ?? "unknown error"}`);
					const rows = (value.entries ?? []).map((entry) => `${entry.type === "dir" ? "dir " : "file"} ${entry.name}${entry.type === "file" ? ` (${entry.size} bytes)` : ""}`);
					return text([`${value.path}`, ...rows.length > 0 ? rows : ["(empty)"]].join("\n"));
				}
			},
			async execute(args) {
				const check = remoteState();
				if ("error" in check) return check;
				const gate = gatePath(check.state, args.path);
				if (gate !== void 0) return {
					ok: false,
					error: gate
				};
				return run(async () => {
					const entries = await engine.ls(check.state.alias, args.path);
					return {
						ok: true,
						path: args.path,
						entries: entries.map((entry) => ({
							name: entry.name,
							type: entry.type,
							size: entry.size,
							mtimeMs: entry.mtimeMs
						}))
					};
				});
			}
		}),
		defineTool({
			name: "remote_read",
			description: "Read a text file on the CURRENT SSH-mode host (must be inside the remote workspace root). The whole file is returned (no size cap). Triggers: read remote file, view remote source, cat on the server.",
			parameters: { path: {
				type: "string",
				required: true,
				description: "Absolute remote file path inside the remote root."
			} },
			output: {
				schema: {
					type: "object",
					additionalProperties: false,
					properties: {
						ok: {
							type: "boolean",
							required: true
						},
						path: { type: "string" },
						content: { type: "string" },
						size: { type: "integer" },
						mtime: { type: "integer" },
						truncated: { type: "boolean" },
						error: { type: "string" }
					}
				},
				render: (_args, value) => {
					if (value.ok !== true) return text(`remote_read failed: ${value.error ?? "unknown error"}`);
					const notice = value.truncated === true ? `\n\n[truncated at ${(value.content ?? "").length} chars of ${value.size ?? "?"}]` : "";
					return text(value.content + notice);
				}
			},
			async execute(args) {
				const check = remoteState();
				if ("error" in check) return check;
				const gate = gatePath(check.state, args.path);
				if (gate !== void 0) return {
					ok: false,
					error: gate
				};
				return run(async () => {
					const result = await engine.readFile(check.state.alias, args.path);
					return {
						ok: true,
						path: args.path,
						content: result.content.toString("utf8"),
						size: result.size,
						mtime: result.mtime,
						truncated: false
					};
				});
			}
		}),
		defineTool({
			name: "remote_write",
			description: "Write (create or overwrite) a text file on the CURRENT SSH-mode host. Parent directories are created automatically. The path must be an absolute path inside the remote workspace root. Prefer reading the file first (remote_read) before overwriting. Triggers: create remote file, edit remote file, save remote file, write config on the server.",
			parameters: {
				path: {
					type: "string",
					required: true,
					description: "Absolute remote file path inside the remote root."
				},
				content: {
					type: "string",
					required: true,
					description: "Full new file content (UTF-8 text)."
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
						path: { type: "string" },
						mtime: { type: "integer" },
						error: { type: "string" }
					}
				},
				render: (_args, value) => text(value.ok === true ? `wrote ${value.path}` : `remote_write failed: ${value.error ?? "unknown error"}`)
			},
			async execute(args) {
				const check = remoteState();
				if ("error" in check) return check;
				const gate = gatePath(check.state, args.path);
				if (gate !== void 0) return {
					ok: false,
					error: gate
				};
				return run(async () => {
					const result = await engine.writeFile(check.state.alias, args.path, Buffer.from(args.content, "utf8"));
					return {
						ok: true,
						path: args.path,
						mtime: result.mtime
					};
				});
			}
		}),
		defineTool({
			name: "remote_mkdir",
			description: "Create a directory (mkdir -p semantics) on the CURRENT SSH-mode host, inside the remote workspace root. Triggers: create remote directory, mkdir on the server.",
			parameters: { path: {
				type: "string",
				required: true,
				description: "Absolute remote directory path inside the remote root."
			} },
			output: {
				schema: {
					type: "object",
					additionalProperties: false,
					properties: {
						ok: {
							type: "boolean",
							required: true
						},
						path: { type: "string" },
						error: { type: "string" }
					}
				},
				render: (_args, value) => text(value.ok === true ? `created ${value.path}` : `remote_mkdir failed: ${value.error ?? "unknown error"}`)
			},
			async execute(args) {
				const check = remoteState();
				if ("error" in check) return check;
				const gate = gatePath(check.state, args.path);
				if (gate !== void 0) return {
					ok: false,
					error: gate
				};
				return run(async () => {
					await engine.mkdir(check.state.alias, args.path);
					return {
						ok: true,
						path: args.path
					};
				});
			}
		}),
		defineTool({
			name: "remote_rm",
			description: "Delete a file or directory on the CURRENT SSH-mode host, inside the remote workspace root. Directories require recursive: true and are deleted recursively — confirm the intent before using it. Triggers: delete remote file, remove remote dir, rm on the server.",
			parameters: {
				path: {
					type: "string",
					required: true,
					description: "Absolute remote path inside the remote root."
				},
				recursive: {
					type: "boolean",
					description: "Set true to delete a directory recursively."
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
						path: { type: "string" },
						error: { type: "string" }
					}
				},
				render: (_args, value) => text(value.ok === true ? `deleted ${value.path}` : `remote_rm failed: ${value.error ?? "unknown error"}`)
			},
			async execute(args) {
				const check = remoteState();
				if ("error" in check) return check;
				const gate = gatePath(check.state, args.path);
				if (gate !== void 0) return {
					ok: false,
					error: gate
				};
				return run(async () => {
					await engine.rm(check.state.alias, args.path, args.recursive === true);
					return {
						ok: true,
						path: args.path
					};
				});
			}
		}),
		defineTool({
			name: "remote_rename",
			description: "Rename or move a file/directory (mv semantics) on the CURRENT SSH-mode host; both paths must be inside the remote workspace root. Triggers: rename remote file, move remote file.",
			parameters: {
				from: {
					type: "string",
					required: true,
					description: "Absolute remote source path inside the remote root."
				},
				to: {
					type: "string",
					required: true,
					description: "Absolute remote destination path inside the remote root."
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
						from: { type: "string" },
						to: { type: "string" },
						error: { type: "string" }
					}
				},
				render: (_args, value) => text(value.ok === true ? `renamed ${value.from} -> ${value.to}` : `remote_rename failed: ${value.error ?? "unknown error"}`)
			},
			async execute(args) {
				const check = remoteState();
				if ("error" in check) return check;
				const gateFrom = gatePath(check.state, args.from);
				if (gateFrom !== void 0) return {
					ok: false,
					error: gateFrom
				};
				const gateTo = gatePath(check.state, args.to);
				if (gateTo !== void 0) return {
					ok: false,
					error: gateTo
				};
				return run(async () => {
					await engine.rename(check.state.alias, args.from, args.to);
					return {
						ok: true,
						from: args.from,
						to: args.to
					};
				});
			}
		}),
		defineTool({
			name: "remote_glob",
			description: "Find files matching a glob pattern under the CURRENT SSH-mode host's remote workspace root (max depth 6, capped at 200 hits). Patterns use * and ** (crosses directories). Triggers: find remote files by pattern, glob on the server.",
			parameters: { pattern: {
				type: "string",
				required: true,
				description: "Root-relative glob pattern, e.g. src/**/*.ts or *.log."
			} },
			output: {
				schema: {
					type: "object",
					additionalProperties: false,
					properties: {
						ok: {
							type: "boolean",
							required: true
						},
						hits: {
							type: "array",
							items: { type: "string" }
						},
						truncated: { type: "boolean" },
						error: { type: "string" }
					}
				},
				render: (_args, value) => {
					if (value.ok !== true) return text(`remote_glob failed: ${value.error ?? "unknown error"}`);
					const lines = (value.hits ?? []).map((hit) => hit);
					const tail = value.truncated === true ? "\n[truncated at 200 hits]" : "";
					return text(lines.length > 0 ? lines.join("\n") + tail : "(no matches)");
				}
			},
			async execute(args) {
				const check = remoteState();
				if ("error" in check) return check;
				return run(async () => {
					const root = check.state.remoteRoot;
					if (root === void 0) return {
						ok: false,
						error: "remote root is not set"
					};
					const view = await remote.glob(root, args.pattern);
					return {
						ok: true,
						hits: view.hits.map((hit) => hit.path),
						truncated: view.truncated
					};
				});
			}
		}),
		defineTool({
			name: "remote_grep",
			description: "Search file contents under the CURRENT SSH-mode host's remote workspace root with grep (skips .git and node_modules; capped at 200 matches per file and 200KB of output). Triggers: grep remote code, search remote contents.",
			parameters: { pattern: {
				type: "string",
				required: true,
				description: "Fixed-string or basic regex pattern (grep -E semantics are not applied; use plain strings for safety)."
			} },
			output: {
				schema: {
					type: "object",
					additionalProperties: false,
					properties: {
						ok: {
							type: "boolean",
							required: true
						},
						lines: {
							type: "array",
							items: { type: "string" }
						},
						truncated: { type: "boolean" },
						error: { type: "string" }
					}
				},
				render: (_args, value) => {
					if (value.ok !== true) return text(`remote_grep failed: ${value.error ?? "unknown error"}`);
					const tail = value.truncated === true ? "\n[output truncated at 200KB]" : "";
					return text((value.lines ?? []).join("\n") + tail);
				}
			},
			async execute(args) {
				const check = remoteState();
				if ("error" in check) return check;
				return run(async () => {
					const root = check.state.remoteRoot;
					if (root === void 0) return {
						ok: false,
						error: "remote root is not set"
					};
					const result = await remote.grep(root, args.pattern);
					return {
						ok: true,
						lines: result.lines,
						truncated: result.truncated
					};
				});
			}
		})
	];
}
//#endregion
//#region src/index.ts
/** Stable cordis plugin name. */
const name = "easyssh";
/**
* Services required before the workspace surfaces can mount. `webServer` is
* deliberately NOT here: headless profiles lack it, and a hard inject would
* block the whole load tree — routes register through the dynamic
* ctx.inject(['webServer'], …) below (DSH 插件规范 §4.2).
*/
const inject = ["tools", "systemPrompt"];
const Config = import_lib.default.object({
	enabled: import_lib.default.boolean().default(true),
	announceToAgent: import_lib.default.boolean().default(true)
});
/** Order of the announcement section (right after the dsh-ssh section at 150). */
const SECTION_ORDER = 160;
/** Model-facing announcement: mode semantics, transparent remoting, limits. */
const WORKSPACE_GUIDANCE = "本机已安装 dsh-easyssh 插件（SSH 远程工作区）：右上角（session log 左侧）的按钮用于配置 SSH 主机（密码/密钥，复用 dsh-ssh 的 ~/.dsh/dsh-ssh.json）并进入/退出「SSH 模式」；进入后左侧文件树面板与文件操作指向远程服务器，而 LLM 与 Agent 循环仍在本机运行。模式语义（重要）：SSH 模式下本插件的接缝切换已把 read/write/edit/glob/grep 与 bash/终端透明切换到远程主机执行——你**不需要**特殊工具，正常使用 read/write/edit/bash 即可操作远程；路径规则：远程绝对路径直接用；相对路径以远程根目录 remoteRoot 为基准（用 remote_status 查询）；**不要**使用 Windows 本机路径（C:\\、M:\\ 等）。remote_* 工具（remote_status/remote_ls/remote_read/remote_write/remote_mkdir/remote_rm/remote_rename/remote_glob/remote_grep）仍可用作显式操作；ssh_exec/ssh_upload/ssh_download 用于一次性运维。用户不需要手动操作文件：编辑、新建、保存、删除、重命名全部由你经 SFTP 直接完成，用户只描述意图。限制：远程操作消耗真实远程资源，先确认再执行；命令输出原样返回、可能含敏感信息；远程 grep/glob 有限深与条数上限；SSH 模式下本机沙箱不对远程执行生效。用户提到「SSH 模式 / 远程工作区 / 远程文件 / 远程项目 / 远程服务器上改代码」时即指本插件，请据此协作。";
/**
* Mount the mode store, routes, tools, announcement, and the shared core.
* @param ctx - host plugin context carrying tools/systemPrompt (webServer optional).
* @param config - resolved plugin config (schema defaults applied by the loader).
*/
function apply(ctx, config) {
	const resolved = {
		enabled: config?.enabled ?? true,
		announceToAgent: config?.announceToAgent ?? true
	};
	const store = new RemoteModeStore();
	const hosts = new HostStore();
	const engine = new SshEngine(hosts);
	ctx.effect(() => () => {
		engine.dispose();
	}, "dsh-easyssh: engine");
	const core = {
		store,
		hosts,
		engine
	};
	ctx.provide("easysshCore", core);
	if (!resolved.enabled) return;
	const routes = makeRoutes({
		store,
		hosts,
		engine
	});
	ctx.inject(["webServer"], (scoped) => {
		const disposers = routes.map((route) => scoped.webServer.register(route));
		return () => {
			for (const dispose of disposers) dispose();
		};
	});
	const tools = makeWorkspaceTools({
		store,
		engine
	});
	ctx.effect(() => {
		const disposers = tools.map((tool) => ctx.tools.register(tool));
		return () => {
			for (const dispose of disposers) dispose();
		};
	}, "dsh-easyssh: tools");
	if (resolved.announceToAgent) ctx.systemPrompt.section({
		name: "plugin:dsh-easyssh",
		order: SECTION_ORDER,
		text: WORKSPACE_GUIDANCE
	});
}
//#endregion
export { Config, WORKSPACE_GUIDANCE, apply, inject, name };
