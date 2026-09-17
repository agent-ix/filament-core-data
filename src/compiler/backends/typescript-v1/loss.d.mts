/** Declarations for the TypeScript backend's representability half (FR-068). */

export interface LossCode {
	readonly code: string;
	readonly severity: "error";
	readonly blocking: true;
}

export declare const LOSS_CODES: Readonly<{
	FORMAT_NOT_IMPLEMENTED: LossCode;
	DURATION_ORDER_NOT_REPRESENTABLE: LossCode;
	CONSTRUCT_NOT_RENDERED: LossCode;
	IDENTIFIER_COLLISION: LossCode;
}>;

export interface DeclaredLoss {
	readonly construct: string;
	readonly code: string;
	readonly rationale: string;
}

export declare const TARGET_LOSSES: readonly DeclaredLoss[];

/** The contract 1.2.0 object-type construct kinds (FR-142). */
export declare const CONSTRUCT_KINDS: ReadonlySet<string>;

/** A construct an earlier draft declared lost and this one renders as data. */
export interface RenderedConstruct {
	readonly construct: string;
	readonly renderedAs: string;
	readonly rationale: string;
}

export declare const RENDERED_NOT_LOST: readonly RenderedConstruct[];

export declare const IMPLEMENTED_FORMATS: readonly string[];

/** The single named GAP-011 policy. Changing it is one edit, here. */
export declare const REFERENCE_POLICY: "strict" | "open";

/** The two settings the policy admits, so a third is a visible change. */
export declare const REFERENCE_POLICIES: readonly ["strict", "open"];

export interface LossReport {
	readonly code: string;
	readonly construct: string;
	readonly owner: string;
	readonly pointer: string;
	readonly detail: string | null;
}

export declare function representability(
	ir: unknown,
	options?: { implementedFormats?: Iterable<string> },
): LossReport[];

export declare function refusesGeneration(
	losses: readonly LossReport[],
): boolean;
