/** Declarations for the RFC 8785 canonical form (FR-048). */

export declare class CanonicalLimitError extends Error {
	limit: string;
	value: number;
}

export declare function canonicalize(
	value: unknown,
	options?: { sets?: Iterable<string> | Set<string>; maxDepth?: number },
): string;

export declare function digest(input: string | Uint8Array): string;
