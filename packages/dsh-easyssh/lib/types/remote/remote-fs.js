/**
 * Remote filesystem provider for the `ctx.fs` capability seam: paths,
 * contents, and atomic staging files live on the remote host, reached through
 * the dsh-ssh engine's SFTP/exec primitives. Ported and adapted from
 * UynajGI/dsh-ssh (MIT, https://github.com/UynajGI/dsh-ssh) — the seam
 * contract (targets, versions, atomic writes, CRLF handling, canonical path
 * transport) is preserved; the connection owner is replaced by the shared
 * SshEngine and the working directory follows the mode store's remote root.
 *
 * @module dsh-easyssh/remote-fs
 */
import { createHash, randomUUID } from 'node:crypto';
import { posix } from 'node:path';
import { FileSystem, FsError, FsTargetKey, FsVersion } from '@deepseek-ai/dsh-fs';
import { quoteShellArg } from "./environment.js";
const BINARY_SAMPLE_BYTES = 8192;
const BASE64 = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
function assertNotAborted(signal, operation) {
    if (signal?.aborted === true)
        throw new FsError(`${operation} aborted`, 'FS_ABORTED');
}
function normalizeLineEndings(value) {
    return value.replaceAll('\r\n', '\n');
}
function detectsCrlf(value) {
    const sample = value.slice(0, 4096);
    const crlf = sample.split('\r\n').length - 1;
    const lf = sample.split('\n').length - 1 - crlf;
    return crlf > lf;
}
function restoreLineEndings(value, crlf) {
    return crlf ? normalizeLineEndings(value).replaceAll('\n', '\r\n') : value;
}
function decodeText(bytes, displayPath) {
    if (bytes.subarray(0, BINARY_SAMPLE_BYTES).includes(0)) {
        throw new FsError(`cannot read "${displayPath}": binary file`, 'FS_NOT_TEXT');
    }
    try {
        return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    }
    catch (error) {
        throw new FsError(`cannot read "${displayPath}": invalid UTF-8 text`, 'FS_NOT_TEXT', { cause: error });
    }
}
/** Decode a base64-wrapped NUL-terminated canonical path from `realpath -mz`. */
function decodeCanonicalPath(encoded) {
    if (encoded.length === 0 || !BASE64.test(encoded)) {
        throw new Error('fs-ssh: canonical path transport returned invalid base64');
    }
    const framed = Buffer.from(encoded, 'base64');
    if (framed.toString('base64') !== encoded || framed.length < 2 || framed.at(-1) !== 0 || framed.subarray(0, -1).includes(0)) {
        throw new Error('fs-ssh: canonical path transport returned invalid NUL framing');
    }
    let path;
    try {
        path = new TextDecoder('utf-8', { fatal: true }).decode(framed.subarray(0, -1));
    }
    catch (error) {
        throw new Error('fs-ssh: canonical path is not valid UTF-8', { cause: error });
    }
    if (!posix.isAbsolute(path))
        throw new Error('fs-ssh: canonical path is not absolute');
    return path;
}
function entryType(stats) {
    if (stats.isFile())
        return 'file';
    if (stats.isDirectory())
        return 'directory';
    return 'other';
}
function entryVersion(stats, path) {
    return FsVersion(`ssh:${createHash('sha256').update(JSON.stringify([path, stats.size, stats.mtime, stats.mode])).digest('hex')}`);
}
function mapError(error, operation, displayPath, signal) {
    if (error instanceof FsError)
        return error;
    if (signal?.aborted === true)
        return new FsError(`${operation} aborted`, 'FS_ABORTED', { cause: error });
    const code = String(error.code ?? '');
    const message = String(error);
    if (/NO_SUCH_FILE|ENOENT|no such file|does not exist/i.test(`${code} ${message}`)) {
        return new FsError(`cannot ${operation} "${displayPath}": not found`, 'FS_NOT_FOUND', { cause: error });
    }
    if (/PERMISSION_DENIED|EACCES|permission denied/i.test(`${code} ${message}`)) {
        return new FsError(`cannot ${operation} "${displayPath}": permission denied`, 'FS_PERMISSION_DENIED', { cause: error });
    }
    return new FsError(`cannot ${operation} "${displayPath}": ${message}`, 'FS_IO_ERROR', { cause: error });
}
function literalEdit(content, request, displayPath) {
    const oldString = normalizeLineEndings(request.oldString);
    const newString = normalizeLineEndings(request.newString);
    if (oldString.length === 0) {
        throw new FsError(`cannot edit "${displayPath}": old_string must be non-empty`, 'FS_EDIT_NOT_FOUND');
    }
    let matches = 0;
    let offset = 0;
    while (true) {
        const found = content.indexOf(oldString, offset);
        if (found < 0)
            break;
        matches += 1;
        offset = found + oldString.length;
    }
    if (matches === 0)
        throw new FsError(`cannot edit "${displayPath}": old_string was not found`, 'FS_EDIT_NOT_FOUND');
    if (!request.replaceAll && matches !== 1) {
        throw new FsError(`cannot edit "${displayPath}": old_string matched ${matches} times`, 'FS_AMBIGUOUS_EDIT');
    }
    return request.replaceAll ? content.split(oldString).join(newString) : content.replace(oldString, newString);
}
/** Whether one SFTP/exec error means "path absent". */
function isNotFound(error) {
    const code = String(error.code ?? '');
    const message = String(error);
    return /NO_SUCH_FILE|ENOENT|no such file|does not exist/i.test(`${code} ${message}`);
}
/**
 * Remote filesystem backend over the dsh-ssh engine. The working directory
 * follows the mode store: relative paths resolve against the resolved remote
 * root; a POSIX-absolute cwd override is honored; local (Windows) cwds are
 * ignored so the model's relative-path habit keeps working remotely.
 */
export class SshFileSystem extends FileSystem {
    engine;
    getState;
    locks = new Map();
    constructor(ctx, engine, getState) {
        super(ctx);
        this.engine = engine;
        this.getState = getState;
    }
    /** The active remote execution world (throws when not in remote mode). */
    current() {
        const state = this.getState();
        if (state.mode !== 'remote' || state.alias === undefined) {
            throw new FsError('not in remote mode — switch the GUI to SSH mode first', 'FS_IO_ERROR');
        }
        if (state.remoteRoot === undefined) {
            throw new FsError('remote workspace root is not set', 'FS_IO_ERROR');
        }
        return { alias: state.alias, remoteRoot: state.remoteRoot };
    }
    /**
     * Resolve the working directory for a path: a POSIX-absolute cwd wins;
     * anything else (relative or a local Windows path) falls back to the
     * remote root.
     */
    resolveRemoteCwd(cwd) {
        if (cwd !== undefined && posix.isAbsolute(cwd))
            return cwd;
        return this.current().remoteRoot;
    }
    async resolve(path, opts) {
        assertNotAborted(opts?.signal, 'resolve');
        if (path.trim().length === 0)
            throw new FsError('file_path must be a non-empty string', 'FS_NOT_FOUND');
        const displayPath = posix.resolve(this.resolveRemoteCwd(opts?.cwd), path);
        try {
            const targetKey = await this.canonicalPath(displayPath, opts?.signal);
            assertNotAborted(opts?.signal, 'resolve');
            return { targetKey: FsTargetKey(targetKey), displayPath };
        }
        catch (error) {
            throw mapError(error, 'resolve', displayPath, opts?.signal);
        }
    }
    processPath(target) {
        return String(target.targetKey);
    }
    fileUrl(target) {
        const path = this.processPath(target);
        if (!posix.isAbsolute(path))
            throw new Error(`fs-ssh: expected an absolute process path: ${JSON.stringify(path)}`);
        return `file://${path.split('/').map(segment => encodeURIComponent(segment)).join('/')}`;
    }
    contains(parent, child) {
        const relative = posix.relative(this.processPath(parent), this.processPath(child));
        return relative === '' || (relative !== '..' && !relative.startsWith('../') && !posix.isAbsolute(relative));
    }
    async stat(target, signal) {
        assertNotAborted(signal, 'stat');
        const stats = await this.probe(String(target.targetKey), target.displayPath, signal);
        if (stats === undefined)
            return undefined;
        return {
            version: entryVersion(stats, String(target.targetKey)),
            type: entryType(stats),
            ...(stats.isFile() ? { size: stats.size } : {}),
        };
    }
    async lstat(path, opts, signal) {
        assertNotAborted(signal, 'lstat');
        if (path.trim().length === 0)
            throw new FsError('file_path must be a non-empty string', 'FS_NOT_FOUND');
        const displayPath = posix.resolve(this.resolveRemoteCwd(opts?.cwd), path);
        const { alias } = this.current();
        try {
            const info = await this.engine.lstat(alias, displayPath);
            assertNotAborted(signal, 'lstat');
            if (info === undefined)
                return undefined;
            const type = info.type === 'symlink' ? 'symlink' : info.type === 'directory' ? 'directory' : info.type === 'file' ? 'file' : 'other';
            return {
                version: entryVersion(this.asStats({ type: info.type, size: info.size, mtimeMs: info.mtimeMs, mode: info.mode }), displayPath),
                type,
                ...(type === 'file' ? { size: info.size } : {}),
            };
        }
        catch (error) {
            if (isNotFound(error))
                return undefined;
            throw mapError(error, 'lstat', displayPath, signal);
        }
    }
    async readText(target, signal) {
        await this.requireRegular(target, signal);
        const bytes = await this.readBytesRaw(target, signal, Number.POSITIVE_INFINITY);
        assertNotAborted(signal, 'read');
        return decodeText(bytes, target.displayPath);
    }
    async readBytes(target, signal, maxBytes) {
        const info = await this.requireRegular(target, signal);
        if (info.size !== undefined && info.size > maxBytes) {
            throw new FsError(`cannot read "${target.displayPath}": ${info.size} bytes exceeds the ${maxBytes}-byte limit`, 'FS_TOO_LARGE');
        }
        const bytes = await this.readBytesRaw(target, signal, maxBytes);
        assertNotAborted(signal, 'read');
        return bytes;
    }
    async streamText(target, signal) {
        await this.requireRegular(target, signal);
        const { alias } = this.current();
        const displayPath = target.displayPath;
        const stream = await this.engine.readStream(alias, String(target.targetKey));
        return {
            async *[Symbol.asyncIterator]() {
                const decoder = new TextDecoder('utf-8', { fatal: true });
                let sampledBytes = 0;
                try {
                    for await (const chunk of stream) {
                        assertNotAborted(signal, 'read');
                        const bytes = Buffer.from(chunk);
                        if (sampledBytes < BINARY_SAMPLE_BYTES) {
                            const sample = bytes.subarray(0, BINARY_SAMPLE_BYTES - sampledBytes);
                            if (sample.includes(0))
                                throw new FsError(`cannot read "${displayPath}": binary file`, 'FS_NOT_TEXT');
                            sampledBytes += sample.length;
                        }
                        try {
                            const text = decoder.decode(bytes, { stream: true });
                            if (text.length > 0)
                                yield text;
                        }
                        catch (error) {
                            throw new FsError(`cannot read "${displayPath}": invalid UTF-8 text`, 'FS_NOT_TEXT', { cause: error });
                        }
                    }
                    try {
                        decoder.decode();
                    }
                    catch (error) {
                        throw new FsError(`cannot read "${displayPath}": invalid UTF-8 text`, 'FS_NOT_TEXT', { cause: error });
                    }
                }
                catch (error) {
                    throw mapError(error, 'read', displayPath, signal);
                }
            },
        };
    }
    async listDir(target, signal) {
        const info = await this.stat(target, signal);
        if (info === undefined)
            throw new FsError(`cannot list "${target.displayPath}": not found`, 'FS_NOT_FOUND');
        if (info.type !== 'directory')
            throw new FsError(`cannot list "${target.displayPath}": not a directory`, 'FS_NOT_DIRECTORY');
        const { alias } = this.current();
        try {
            const listed = await this.engine.ls(alias, String(target.targetKey));
            assertNotAborted(signal, 'list');
            const entries = [];
            for (const entry of listed) {
                const displayPath = posix.join(target.displayPath, entry.name);
                const canonical = await this.canonicalPath(displayPath, signal);
                const stats = this.asStats({
                    type: entry.type === 'dir' ? 'directory' : entry.type === 'file' ? 'file' : 'other',
                    size: entry.size,
                    mtimeMs: entry.mtimeMs,
                    mode: entry.mode ?? 0o600,
                });
                entries.push({
                    name: entry.name,
                    type: entryType(stats),
                    target: { targetKey: FsTargetKey(canonical), displayPath },
                    version: entryVersion(stats, canonical),
                    ...(entry.type === 'file' ? { size: entry.size } : {}),
                });
            }
            return entries.sort((left, right) => left.name.localeCompare(right.name));
        }
        catch (error) {
            throw mapError(error, 'list', target.displayPath, signal);
        }
    }
    async writeText(target, content, expected, signal) {
        return this.withLock(String(target.targetKey), async () => {
            const existing = await this.probe(String(target.targetKey), target.displayPath, signal);
            if (existing !== undefined && !existing.isFile()) {
                throw new FsError(`cannot write "${target.displayPath}": not a regular file`, 'FS_NOT_REGULAR_FILE');
            }
            this.checkWriteIntent(existing, expected, target);
            const before = existing === undefined ? null : await this.readForDiff(target, signal);
            const version = await this.writeAtomic(target, content, existing, expected?.kind === 'createIfAbsent', signal);
            return {
                operation: existing === undefined ? 'create' : 'update',
                version,
                before,
                after: normalizeLineEndings(content),
            };
        });
    }
    async editText(target, edit, expected, signal) {
        return this.withLock(String(target.targetKey), async () => {
            const existing = await this.probe(String(target.targetKey), target.displayPath, signal);
            if (existing === undefined) {
                throw new FsError(`cannot edit "${target.displayPath}": file changed since it was read`, 'FS_STALE_VERSION');
            }
            if (!existing.isFile()) {
                throw new FsError(`cannot edit "${target.displayPath}": not a regular file`, 'FS_NOT_REGULAR_FILE');
            }
            if (expected !== undefined && entryVersion(existing, String(target.targetKey)) !== expected.version) {
                throw new FsError(`cannot edit "${target.displayPath}": file changed since it was read`, 'FS_STALE_VERSION');
            }
            const raw = await this.readForEdit(target, signal);
            const before = normalizeLineEndings(raw);
            const after = literalEdit(before, edit, target.displayPath);
            const storage = restoreLineEndings(after, detectsCrlf(raw));
            const version = await this.writeAtomic(target, storage, existing, false, signal);
            return { version, before, after };
        });
    }
    async withLock(targetKey, operation) {
        const prior = this.locks.get(targetKey) ?? Promise.resolve();
        const run = prior.then(operation, operation);
        const tail = run.then(() => undefined, () => undefined);
        this.locks.set(targetKey, tail);
        try {
            return await run;
        }
        finally {
            if (this.locks.get(targetKey) === tail)
                this.locks.delete(targetKey);
        }
    }
    async canonicalPath(path, signal) {
        const { alias } = this.current();
        const result = await this.engine.exec(alias, `set -o pipefail; realpath -mz -- ${quoteShellArg(path)} | base64 -w0`, 10_000);
        signal?.throwIfAborted();
        if (!result.success || result.exitCode !== 0)
            throw new Error(result.stderr || `realpath failed for ${path}`);
        return decodeCanonicalPath(result.stdout.trim());
    }
    async probe(path, displayPath, signal) {
        assertNotAborted(signal, 'stat');
        const { alias } = this.current();
        try {
            const info = await this.engine.stat(alias, path);
            assertNotAborted(signal, 'stat');
            return this.asStats({ type: info.type, size: info.size, mtimeMs: info.mtimeMs, mode: info.mode });
        }
        catch (error) {
            if (isNotFound(error))
                return undefined;
            throw mapError(error, 'stat', displayPath, signal);
        }
    }
    async requireRegular(target, signal) {
        const info = await this.stat(target, signal);
        if (info === undefined)
            throw new FsError(`cannot read "${target.displayPath}": not found`, 'FS_NOT_FOUND');
        if (info.type !== 'file')
            throw new FsError(`cannot read "${target.displayPath}": not a regular file`, 'FS_NOT_REGULAR_FILE');
        return info;
    }
    async readBytesRaw(target, signal, maxBytes) {
        const { alias } = this.current();
        try {
            const data = await this.engine.readFile(alias, String(target.targetKey));
            assertNotAborted(signal, 'read');
            if (data.content.length > maxBytes) {
                throw new FsError(`cannot read "${target.displayPath}": content exceeds the ${maxBytes}-byte limit`, 'FS_TOO_LARGE');
            }
            return data.content;
        }
        catch (error) {
            throw mapError(error, 'read', target.displayPath, signal);
        }
    }
    checkWriteIntent(existing, expected, target) {
        if (expected?.kind === 'createIfAbsent' && existing !== undefined) {
            throw new FsError(`cannot overwrite existing "${target.displayPath}" without reading it first`, 'FS_NOT_OBSERVED');
        }
        if (expected?.kind === 'replaceIfVersion') {
            if (existing === undefined || entryVersion(existing, String(target.targetKey)) !== expected.version) {
                throw new FsError(`cannot write "${target.displayPath}": file changed since it was read`, 'FS_STALE_VERSION');
            }
        }
    }
    async readForDiff(target, signal) {
        try {
            return normalizeLineEndings(decodeText(await this.readBytesRaw(target, signal, Number.POSITIVE_INFINITY), target.displayPath));
        }
        catch (error) {
            if (error instanceof FsError && error.code === 'FS_NOT_TEXT')
                return null;
            throw mapError(error, 'read', target.displayPath, signal);
        }
    }
    async readForEdit(target, signal) {
        return decodeText(await this.readBytesRaw(target, signal, Number.POSITIVE_INFINITY), target.displayPath);
    }
    async writeAtomic(target, content, existing, createIfAbsent, signal) {
        assertNotAborted(signal, 'write');
        const { alias } = this.current();
        const targetPath = String(target.targetKey);
        const stagingDirectory = posix.join(posix.dirname(targetPath), `.dsh-${randomUUID()}.tmp`);
        const temporary = posix.join(stagingDirectory, 'content');
        let stagingCreated = false;
        try {
            await this.engine.mkdir(alias, stagingDirectory);
            stagingCreated = true;
            await this.engine.writeFile(alias, temporary, Buffer.from(content, 'utf8'));
            assertNotAborted(signal, 'write');
            const mode = existing === undefined ? 0o600 : existing.mode & 0o777;
            await this.engine.exec(alias, `chmod ${mode.toString(8)} -- ${quoteShellArg(temporary)}`, 10_000);
            assertNotAborted(signal, 'write');
            if (createIfAbsent) {
                const publication = await this.engine.exec(alias, `if ln -T -- ${quoteShellArg(temporary)} ${quoteShellArg(targetPath)}; then printf created; elif test -e ${quoteShellArg(targetPath)} || test -L ${quoteShellArg(targetPath)}; then printf exists; else exit 1; fi`, 10_000);
                if (publication.stdout.trim() === 'exists') {
                    throw new FsError(`cannot overwrite existing "${target.displayPath}" without reading it first`, 'FS_NOT_OBSERVED');
                }
                if (publication.stdout.trim() !== 'created')
                    throw new Error('guarded create returned an invalid publication result');
            }
            else {
                await this.engine.rename(alias, temporary, targetPath);
            }
            assertNotAborted(signal, 'write');
            await this.removeStaging(stagingDirectory);
            const committed = await this.probe(targetPath, target.displayPath, signal);
            if (committed === undefined)
                throw new FsError(`cannot write "${target.displayPath}": commit produced no file`, 'FS_IO_ERROR');
            return entryVersion(committed, targetPath);
        }
        catch (error) {
            if (stagingCreated)
                await this.removeStaging(stagingDirectory);
            throw mapError(error, 'write', target.displayPath, signal);
        }
    }
    async removeStaging(directory) {
        const { alias } = this.current();
        try {
            await this.engine.rm(alias, directory, true);
        }
        catch {
            // The target is already committed; an empty private directory cannot turn that write into a failure.
        }
    }
    /** Normalize an engine stat/ls shape into the RemoteStats the helpers expect. */
    asStats(info) {
        const isDir = info.type === 'dir' || info.type === 'directory';
        const isFile = info.type === 'file';
        return {
            isFile: () => isFile,
            isDirectory: () => isDir,
            isSymbolicLink: () => info.type === 'symlink',
            size: info.size,
            mtime: Math.round(info.mtimeMs / 1000),
            mode: info.mode,
        };
    }
}
export default SshFileSystem;
