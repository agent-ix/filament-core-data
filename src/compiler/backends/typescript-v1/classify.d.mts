/** Declarations for the TypeScript backend's IR-surface classifier (FR-069). */

/** A compatibility disposition over the IR surface. */
export type Classification =
	| "invalid"
	| "breaking"
	| "unknown"
	| "conditional"
	| "additive"
	| "patch";

/**
 * Most restrictive first, so index 0 is `invalid`. This is the disposition rank
 * of `docs/semantic-data-system/ir-compatibility-policy.md` reversed.
 */
export declare const CLASSIFICATION_ORDER: readonly Classification[];

/**
 * The change kinds the classifier models, as declared data.
 *
 * The boundary of this list is observable through the `unknown` fallback, so it
 * is part of what the corpus agreement tests. FR-069-CON-7 forbids narrowing it
 * to make a case agree.
 */
export declare const MODELLED_CHANGES: readonly string[];

/**
 * How a move between contract versions classifies, and the one place in the
 * module that decides it.
 *
 * `"corpus"` — the default — classifies such a move flatly `conditional`,
 * conforming to the conformance corpus's published reading. `"normative"`
 * applies the round-trip rule of
 * `docs/semantic-data-system/ir-compatibility-policy.md`, which is
 * `status: normative` and says the opposite. The default is conformance and not
 * a ruling; `agent-ix/filament-core-data#64` records the disagreement, and #9,
 * the declared owner of the contract questions in this area, is closed, with
 * #59 carrying the ownership question.
 */
export declare const VERSION_UPLIFT_POLICY: "corpus" | "normative";

/** The two settings the policy admits, so a third is a visible change. */
export declare const VERSION_UPLIFT_POLICIES: readonly ["corpus", "normative"];

/**
 * How the addition of an enum or union variant with no consumer policy
 * classifies, and the one place in the module that decides it.
 *
 * `"corpus"` — the default — answers `conditional`, conforming to the
 * conformance corpus's published reading. `"contract"` answers `breaking`,
 * following `docs/semantic-data-system/compatibility.md`, which makes an enum
 * addition "additive only for open-enum consumers" and names "closed-enum
 * expansion" in its Breaking change class. With a policy that admits unknown
 * members both settings answer `additive`. The default is conformance and not a
 * ruling: FR-070 forbids this work from editing a corpus case and NFR-025 makes
 * the corpus a prohibited path, so the disagreement is reported to the corpus's
 * owner instead. Measured, the two settings differ on exactly `ENUM-004` and
 * `UNION-004`.
 */
export declare const VARIANT_ADDITION_POLICY: "corpus" | "contract";

/** The two settings the policy admits, so a third is a visible change. */
export declare const VARIANT_ADDITION_POLICIES: readonly ["corpus", "contract"];

/** The more restrictive of two classifications. */
export declare function moreRestrictive(
	left: Classification,
	right: Classification,
): Classification;

/** One recorded change, with the pointer of the node that moved. */
export interface SurfaceChange {
	readonly classification: Classification;
	/** RFC 6901 pointer, rooted at the IR document. */
	readonly pointer: string;
	readonly message: string;
	/** A member of `MODELLED_CHANGES`, or `unmodelled`, or `pair-inadmissible`. */
	readonly kind: string;
}

export interface ClassifyOptions {
	/**
	 * A `consumer-policy.schema.json` document, where one is supplied. An
	 * addition is `additive` only where a policy declares that unknown members
	 * are preserved or surfaced; with no policy it is `conditional`.
	 */
	readonly consumerPolicy?: Record<string, unknown> | null;
	/** Whether the earlier document is inadmissible under FR-068. */
	readonly beforeInvalid?: boolean;
	/** Whether the later document is inadmissible under FR-068. */
	readonly afterInvalid?: boolean;
}

export interface SurfaceClassification {
	/** The most restrictive recorded change, or `patch` where none was recorded. */
	readonly classification: Classification;
	/** Ordered by pointer, then classification, then message, all by code unit. */
	readonly changes: readonly SurfaceChange[];
}

/**
 * Classify an ordered pair of semantic IR documents over the IR surface only.
 *
 * Reads no clock, no environment variable, no filesystem and no socket, and
 * mutates neither argument. It never overrides
 * `schema/semantic/v1/compatibility-report.schema.json`, which stays the
 * authority for the profile, mapping, representation, target and consumer
 * surfaces this classification does not read.
 */
export declare function classifySurface(
	before: Record<string, unknown>,
	after: Record<string, unknown>,
	options?: ClassifyOptions,
): SurfaceClassification;
