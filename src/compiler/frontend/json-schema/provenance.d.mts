/** Generation provenance (FR-084). Declared toolchain only; no host values. */

export declare function provenanceOf(input: {
	target: string;
	semanticCore: string;
	emissionDigest: string;
	inputDigest: string;
	losses: readonly { id: string; code: string; construct: string }[];
}): Readonly<Record<string, unknown>>;

/** Names of host values that leaked into a record. Empty is the requirement. */
export declare function hostLeaks(
	record: unknown,
	host: Record<string, unknown>,
): readonly string[];
