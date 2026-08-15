/**
 * Bounded host-side projection of one remote output stream with a local
 * spill file. Ported from UynajGI/dsh-ssh (MIT) — verbatim semantics.
 */
import type { CollectedOutput, SubprocessOutputRead, SubprocessOutputReader } from '@deepseek-ai/dsh-subprocess';
/**
 * Collects one remote stream with a bounded in-memory tail. On first overflow
 * a spill file is opened (when a spill cap is configured) and every chunk —
 * already-collected ones included — is appended there while the full stream
 * stays within the cap; without one, only the in-memory tail is retained.
 */
export declare class SshOutputCollector implements SubprocessOutputReader {
    private readonly maxBytes;
    private readonly maxSpillBytes;
    private readonly label;
    private readonly spillDir;
    private chunks;
    private retained;
    private total;
    private dropped;
    private spillFd;
    private spillFile;
    private spillDisabled;
    constructor(maxBytes: number, maxSpillBytes: number | undefined, label: string, spillDir?: string);
    /** Append one byte-faithful remote chunk, trimming the retained tail to the cap. */
    push(chunk: Uint8Array): void;
    /** @inheritdoc */
    readFrom(fromByte: number): SubprocessOutputRead;
    /** Open the spill file lazily and append one chunk (plus any prior chunks once). */
    private spillAll;
    /** Stop spilling and remove the file once it can no longer hold the complete stream. */
    private discardSpill;
    /** Close the spill file once the stream has ended; stop advertising it on a failed close. */
    seal(): void;
    /** Seal the spill and return the final collected output. */
    finalize(): CollectedOutput;
}
//# sourceMappingURL=output.d.ts.map