/**
 * The frontend seam and dialect registry (FR-045).
 *
 * One seam, so a frontend is chosen by the `source.dialect` value the contract
 * already declares rather than by whichever call site reached for it. Two rules
 * make the seam worth having:
 *
 *   - a defect in a *compiled input* is a diagnostic and never an exception,
 *     while a defect in the *calling program* — a dialect outside the closed
 *     vocabulary — throws, because nothing a package supplies should be able to
 *     crash the compiler;
 *   - a frontend stamps its own dialect and never reads the one used to select
 *     it, so no frontend can be made to claim another's identity.
 */
import { hasBlocking } from "../diagnostics.mjs";
import { FRONTEND_DIALECTS } from "../dialects.mjs";
import * as specBundle from "./spec-bundle/frontend.mjs";
import * as typespec from "./typespec/frontend.mjs";

export { FRONTEND_DIALECTS };

const REGISTRY = new Map([
	[typespec.dialect, { frontend: typespec, implemented: true }],
	[specBundle.dialect, { frontend: specBundle, implemented: false }],
]);

/**
 * Selects a frontend by dialect.
 *
 * Throws for a value outside the vocabulary: that is the calling program naming
 * something the contract does not define, which no compiled input can cause.
 */
export function selectFrontend(dialect) {
	const entry = REGISTRY.get(dialect);
	if (!entry) {
		throw new TypeError(
			`unknown source dialect ${JSON.stringify(dialect)}; the contract declares ${FRONTEND_DIALECTS.join(" and ")}`,
		);
	}
	return entry;
}

/** True when the repository implements this dialect's frontend. */
export function isImplemented(dialect) {
	return selectFrontend(dialect).implemented;
}

/**
 * The seam's own contract: a blocking diagnostic and a non-null document never
 * come back together. Exported so it can be exercised directly — a frontend that
 * breaks the contract is a defect in the compiler, and the seam is the only
 * place that can catch it.
 */
export function assertFrontendContract(dialect, result) {
	const diagnostics = result.diagnostics ?? [];
	if (hasBlocking(diagnostics) && result.ir != null) {
		throw new Error(
			`${dialect} returned a document alongside a blocking diagnostic; a partial document is never a complete one`,
		);
	}
	return { ir: result.ir ?? null, diagnostics };
}

/** Runs a frontend over a `FrontendRequest` and enforces the seam's contract. */
export async function runFrontend(request) {
	const { frontend } = selectFrontend(request.dialect);
	return assertFrontendContract(request.dialect, await frontend.run(request));
}
