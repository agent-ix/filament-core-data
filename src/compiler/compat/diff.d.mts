/** Declarations for the compatibility classifier (FR-051). */

export declare const DISPOSITION_RANK: readonly string[];
export declare const INPUT_FAMILIES: Readonly<Record<string, string>>;

export declare function familyMapping(
	root?: string,
): Record<string, { family: string; surface: string }>;

export declare function diffSemanticContract(
	request: Record<string, unknown>,
): Record<string, unknown>;
