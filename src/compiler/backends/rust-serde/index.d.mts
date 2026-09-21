/**
 * Type declarations for `generateRust(request, sink)`, the one module in this
 * backend that writes (FR-057, FR-058).
 *
 * The sidecar of `index.mjs`, not an independent artifact: the
 * `src/compiler/` ownership ledger treats an `X.d.mts` as owned by whoever owns
 * `X.mjs`, so this needs no Outputs entry of its own.
 *
 * `generateRust` is declared loosely, matching `json-schema-v1/index.d.mts`'s
 * house style for a backend entry point: it returns the request's
 * `emitCrate` manifest unchanged, which callers narrow themselves at each call
 * site rather than this declaration asserting one shape for every caller.
 */

/** The repository root, located from this module rather than from the cwd. */
export declare const REPOSITORY_ROOT: string;

/** Reads the repository `LICENSE`, which the emitted crate carries verbatim. */
export declare function readLicense(root?: string): string;

/** A sink that writes to a directory (`base` is a host directory). */
export declare function directorySink(base: string): {
	root: string;
	clear(outputRoot: string): void;
	write(outputRoot: string, relativePath: string, text: string): void;
};

export interface RustSink {
	clear?(outputRoot: string): void;
	write(outputRoot: string, relativePath: string, text: string): void;
}

export declare function generateRust(
	request: unknown,
	sink: RustSink,
	options?: { licenseText?: string; root?: string },
): unknown;
