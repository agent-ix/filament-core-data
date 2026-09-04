/** Declarations for identifier minting (FR-064). */

/** Reserved words, prototype members, and the generated fixed API surface. */
export declare const RESERVED_NAMES: readonly string[];

/** The discriminant property of every generated discriminated union. */
export declare const UNION_DISCRIMINANT: "kind";

/** The generated marker naming a record's `unknownPolicy` in its interface. */
export declare const UNKNOWN_POLICY_MARKER: "__unknownPolicy";

/** A TypeScript identifier minted from a definition's `displayName`. */
export declare function identifierFor(
	identity: unknown,
	displayName: unknown,
): string;

/** A stable module base name, derived from the identity rather than the name. */
export declare function moduleNameFor(identity: unknown): string;

/** One refusal to render, in the entry shape `representability` returns. */
export interface RepresentabilityLoss {
	readonly code: string;
	readonly construct: string;
	readonly owner: string;
	readonly pointer: string;
	readonly detail: string | null;
}

/** Every minted identifier, and every collision refused rather than renamed. */
export declare function reserveNames(
	definitions: Iterable<{ identity: unknown; displayName?: unknown }>,
): {
	identifiers: Map<string, string>;
	collisions: RepresentabilityLoss[];
};
