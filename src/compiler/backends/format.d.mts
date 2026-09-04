/** Declarations for the injected formatter (FR-071). */
import type { FormatFunction } from "./seam.d.mts";

/** The pinned `@biomejs/biome` binary this repository's lockfile carries. */
export declare const BIOME_BINARY: string;

/** Raised when the formatter cannot run or refuses the text it was given. */
export declare class FormatterError extends Error {
	readonly path: string;
	constructor(path: string, cause: string);
}

/**
 * A formatter for the seam's `options.format`, backed by the pinned binary.
 * `binary` exists so a test can drive the failure arm.
 */
export declare function biomeFormatter(options?: {
	root?: string;
	binary?: string;
}): FormatFunction;

/** The identity formatter, so "not formatted" is a visible choice. */
export declare function unformatted(): FormatFunction;
