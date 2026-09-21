/**
 * Type declarations for the injected Python producer (issue #23, ADR-0006).
 *
 * The sidecar of `produce.mjs`, not an independent artifact: the
 * `src/compiler/` ownership ledger treats an `X.d.mts` as owned by whoever owns
 * `X.mjs`, so this needs no Outputs entry of its own.
 */

/** A producer for the seam's `options.produce(documents, profileId, index)`. */
export type PythonProducer = (
	documents: Record<string, unknown>,
	profileId: string,
	index?: Record<string, unknown>,
) => Record<string, string>;

/** Raised when the producer cannot run or refuses the input it was given. */
export declare class ProducerError extends Error {
	readonly profileId: string;
	constructor(profileId: string, cause: string);
}

/** The entry point on the Python side; see `python_backend/runner/seam.py`. */
export declare const PRODUCER_COMMAND: readonly string[];

/**
 * A producer backed by the pinned `poetry run` interpreter. `command` exists so
 * a test can drive the failure arm with something that exits non-zero, without
 * a Python environment.
 */
export declare function poetryProducer(options?: {
	root?: string;
	command?: readonly string[];
}): PythonProducer;

/** A producer that refuses, for a caller that has decided not to run Python. */
export declare function unavailableProducer(): PythonProducer;
