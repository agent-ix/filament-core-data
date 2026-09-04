/** Declarations for the TypeScript backend's admissibility reader (FR-068). */

/** One entry of the closed admissibility register. */
export interface AdmissibilityCode {
	readonly code: string;
	readonly severity: "error";
	readonly blocking: true;
}

/**
 * The thirty codes an admissibility answer may carry, in bijection with the
 * `agent-ix.semantic-ir.` half of `conformance/diagnostic-codes.json` — asserted
 * by a test, never by an import.
 */
export declare const ADMISSIBILITY_CODES: Readonly<
	Record<string, AdmissibilityCode>
>;

/** Where a rule was read from: a published clause, or the corpus's register. */
export type Derivation =
	| {
			readonly provenance: "published-clause";
			readonly artifact: string;
			readonly quote: string;
			readonly note?: string;
	  }
	| {
			readonly provenance: "corpus-register";
			readonly artifact: string;
			readonly note: string;
	  };

/** One entry per registered code; complete over the register. */
export declare const DERIVATIONS: Readonly<Record<string, Derivation>>;

/** The declared graph-depth bound: 256, the corpus's. See issue #62. */
export declare const MAX_DEPTH: 256;

export interface AdmissibilityLimits {
	readonly maxDepth: number;
	readonly maxNodes: number;
	readonly maxCollectionItems: number;
	readonly maxDiagnostics: number;
}

export declare const DECLARED_LIMITS: AdmissibilityLimits;

/** The published schema files a caller supplies through `readSchema`. */
export declare const SCHEMA_FILES: readonly string[];

/** One position in a package's own source tree. */
export interface SourceLocus {
	sourceIdentity: string;
	path: string;
	startLine: number;
	startColumn: number;
	endLine?: number;
	endColumn?: number;
}

/** A `common.schema.json#/$defs/diagnostic` document. */
export interface AdmissibilityDiagnostic {
	code: string;
	severity: "info" | "warning" | "error";
	message: string;
	owner: string;
	blocking: boolean;
	causes: AdmissibilityDiagnostic[];
	related: SourceLocus[];
	locus?: SourceLocus;
}

/**
 * The RFC 6901 pointer sits beside the diagnostic and never inside it: the
 * published diagnostic is sealed against an in-document location (GAP-003).
 */
export interface LocatedDiagnostic {
	readonly pointer: string;
	readonly diagnostic: AdmissibilityDiagnostic;
}

/** A rule that did not run because its declared input was absent. */
export interface Suppression {
	readonly rule: string;
	readonly identity: string;
}

export interface AdmissibilityResult {
	readonly resultState: "success" | "invalid" | "lossy";
	readonly diagnostics: LocatedDiagnostic[];
	readonly suppressions: Suppression[];
}

export interface AdmitOptions {
	/** The published schemas, already parsed. */
	schemas?: readonly unknown[];
	/** A reader for the files `SCHEMA_FILES` names; no module here touches fs. */
	readSchema?: (fileName: string) => unknown;
	limits?: Partial<AdmissibilityLimits>;
	referencePolicy?: "strict" | "open";
}

/**
 * The result-state rule as a pure function, so that the `lossy` arm — which no
 * registered code can reach while every one of them is `error` — is still
 * exercisable.
 */
export declare function resultStateOf(
	diagnostics: readonly LocatedDiagnostic[],
): "success" | "invalid" | "lossy";

/**
 * Decide whether a conformance input bundle is admissible for generation.
 * Never throws for a document defect; a missing schema source is a caller
 * defect and does throw.
 */
export declare function admitIr(
	bundle: unknown,
	options?: AdmitOptions,
): AdmissibilityResult;
