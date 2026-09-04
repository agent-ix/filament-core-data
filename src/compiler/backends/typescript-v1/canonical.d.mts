/** Declarations for the TypeScript backend's canonical byte form (FR-069). */

/** The thirteen container paths the fingerprint form orders by `identity`. */
export declare const IDENTITY_SET_PATHS: readonly string[];

/** The declared key-ordering rule, named so a later definition is a data edit. */
export declare const KEY_ORDER: "utf16-code-unit-ascending";

/** The declared canonicalization depth bound. */
export declare const MAX_CANONICAL_DEPTH: 256;

/** Raised when a value cannot be canonicalized, rather than serialized anyway. */
export declare class CanonicalError extends Error {
	readonly pointer: string;
	constructor(message: string, pointer: string);
}

/**
 * The canonical byte form of any JSON value.
 *
 * `sets: false` is the unextended RFC 8785 form the conformance corpus compares
 * as `normalized`; `sets: true` — the default — additionally orders the members
 * of `IDENTITY_SET_PATHS` by `identity`, which is the form the v1 fingerprint
 * is taken over.
 */
export declare function canonicalize(
	value: unknown,
	options?: { sets?: boolean },
): string;

/** `sha256:<64 lowercase hex>` over the UTF-8 bytes of `text`. */
export declare function digestOf(text: string): string;

/** A deep copy with the contract `1.1.0` derivable members materialized. */
export declare function normalizeIr(document: unknown): unknown;

/** The canonical string an adapter answer carries as `normalized`. */
export declare function normalizeIrForTarget(document: unknown): string;

/** The digest of the fingerprint form of the normalized document. */
export declare function fingerprintIrForTarget(document: unknown): string;
