/**
 * Bounded host-side projection of one remote output stream with a local
 * spill file. Ported from UynajGI/dsh-ssh (MIT) — verbatim semantics.
 */
import { randomBytes } from 'node:crypto';
import { closeSync, mkdtempSync, openSync, unlinkSync, writeSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
let spillCounter = 0;
let defaultSpillDir;
/** Private (0700) per-process spill directory under the OS tmpdir, created lazily. */
function privateSpillDir() {
    defaultSpillDir ??= mkdtempSync(join(tmpdir(), 'dsh-subprocess-ssh-'));
    return defaultSpillDir;
}
/**
 * Collects one remote stream with a bounded in-memory tail. On first overflow
 * a spill file is opened (when a spill cap is configured) and every chunk —
 * already-collected ones included — is appended there while the full stream
 * stays within the cap; without one, only the in-memory tail is retained.
 */
export class SshOutputCollector {
    maxBytes;
    maxSpillBytes;
    label;
    spillDir;
    chunks = [];
    retained = 0;
    total = 0;
    dropped = false;
    spillFd;
    spillFile;
    spillDisabled;
    constructor(maxBytes, maxSpillBytes, label, spillDir = privateSpillDir()) {
        this.maxBytes = maxBytes;
        this.maxSpillBytes = maxSpillBytes;
        this.label = label;
        this.spillDir = spillDir;
        this.spillDisabled = maxSpillBytes === undefined;
    }
    /** Append one byte-faithful remote chunk, trimming the retained tail to the cap. */
    push(chunk) {
        if (chunk.length === 0)
            return;
        const buffer = Buffer.from(chunk);
        this.total += buffer.length;
        const overflows = this.retained + buffer.length > this.maxBytes;
        if (!this.spillDisabled && (overflows || this.spillFd !== undefined))
            this.spillAll(buffer);
        this.chunks.push(buffer);
        this.retained += buffer.length;
        while (this.retained > this.maxBytes) {
            const head = this.chunks[0];
            const excess = this.retained - this.maxBytes;
            if (head.length <= excess) {
                this.chunks.shift();
                this.retained -= head.length;
            }
            else {
                this.chunks[0] = head.subarray(excess);
                this.retained -= excess;
            }
            this.dropped = true;
        }
    }
    /** @inheritdoc */
    readFrom(fromByte) {
        const retained = Buffer.concat(this.chunks, this.retained);
        const windowStart = this.total - this.retained;
        const lossy = fromByte < windowStart;
        const start = lossy ? 0 : Math.min(retained.length, Math.max(0, fromByte - windowStart));
        return {
            text: retained.subarray(start).toString('utf8'),
            nextOffset: this.total,
            lossy,
            ...(this.spillFile !== undefined ? { spillPath: this.spillFile } : {}),
        };
    }
    /** Open the spill file lazily and append one chunk (plus any prior chunks once). */
    spillAll(chunk) {
        if (this.maxSpillBytes !== undefined && this.total > this.maxSpillBytes) {
            this.discardSpill();
            return;
        }
        if (this.spillFd === undefined) {
            this.spillFile = join(this.spillDir, `dsh-subprocess-ssh-${process.pid}-${++spillCounter}-${randomBytes(6).toString('hex')}-${this.label}.log`);
            this.spillFd = openSync(this.spillFile, 'wx', 0o600);
            for (const prior of this.chunks)
                writeSync(this.spillFd, prior);
        }
        writeSync(this.spillFd, chunk);
    }
    /** Stop spilling and remove the file once it can no longer hold the complete stream. */
    discardSpill() {
        const fd = this.spillFd;
        const file = this.spillFile;
        this.spillFd = undefined;
        this.spillFile = undefined;
        this.spillDisabled = true;
        if (fd !== undefined) {
            try {
                closeSync(fd);
            }
            catch {
                this.spillFd = fd;
            }
        }
        if (file !== undefined) {
            try {
                unlinkSync(file);
            }
            catch {
                // A failed unlink leaves at most maxSpillBytes behind, never an unbounded file.
            }
        }
    }
    /** Close the spill file once the stream has ended; stop advertising it on a failed close. */
    seal() {
        if (this.spillFd === undefined)
            return;
        try {
            closeSync(this.spillFd);
        }
        catch {
            this.spillFile = undefined;
        }
        this.spillFd = undefined;
    }
    /** Seal the spill and return the final collected output. */
    finalize() {
        this.seal();
        return {
            text: Buffer.concat(this.chunks).toString('utf8'),
            truncated: this.dropped,
            ...(this.spillFile !== undefined ? { spillPath: this.spillFile } : {}),
        };
    }
}
