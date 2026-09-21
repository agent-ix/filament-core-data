/** Declarations for the compatibility classifier (FR-051). */

export declare const DISPOSITION_RANK: readonly string[];
export declare const INPUT_FAMILIES: Readonly<Record<string, string>>;

export declare function familyMapping(): Record<
	string,
	{ family: string; surface: string }
>;

export declare function diffSemanticContract(
	request: Record<string, unknown>,
): Record<string, unknown>;

/**
 * Raised when the contract cannot express a refusal as a change.
 *
 * `compatibility-report.schema.json` closes its `family` enumeration, so a
 * refusal cannot be reported as one more change without inventing a family the
 * input never produced (`diff.mjs`). Declared here because callers catch it by
 * type and read `code` and `diagnostic` off it (#226).
 */
export declare class ContractRefusalError extends Error {
	constructor(diagnosticEntry: { message: string; code: string });
	readonly name: "ContractRefusalError";
	readonly code: string;
	readonly diagnostic: { message: string; code: string };
}
