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
import {
	DIAGNOSTIC_CODES,
	diagnostic,
	fragment,
	hasBlocking,
} from "../diagnostics.mjs";
import { FRONTEND_DIALECTS } from "../dialects.mjs";
import * as specBundle from "./spec-bundle/frontend.mjs";
import * as typespec from "./typespec/frontend.mjs";

export { FRONTEND_DIALECTS };

const REGISTRY = new Map([
	[typespec.dialect, { frontend: typespec, implemented: true }],
	[specBundle.dialect, { frontend: specBundle, implemented: true }],
]);

/**
 * The refusal for a dialect the contract declares and this repository has not
 * built.
 *
 * It lives here rather than inside a placeholder frontend module, so that
 * registering an unimplemented dialect needs a registry entry and nothing else.
 * A placeholder module that returns this is a module someone has to remember to
 * delete, and `spec-bundle`'s outlived its own ticket: it still named issue #36,
 * closed and merged, when the accurate owner was #86.
 */
function notImplemented(dialect, owner) {
	return {
		ir: null,
		diagnostics: [
			diagnostic(DIAGNOSTIC_CODES.FRONTEND_NOT_IMPLEMENTED, {
				message: `the ${fragment(dialect)} frontend is not implemented in this repository; it is ${fragment(owner ?? "unattributed")}`,
			}),
		],
	};
}

/**
 * Selects a frontend by dialect.
 *
 * Throws for a value outside the vocabulary: that is the calling program naming
 * something the contract does not define, which no compiled input can cause.
 */
export function selectFrontend(dialect, registry = REGISTRY) {
	const entry = registry.get(dialect);
	if (!entry) {
		throw new TypeError(
			`unknown source dialect ${JSON.stringify(dialect)}; the contract declares ${FRONTEND_DIALECTS.join(" and ")}`,
		);
	}
	return entry;
}

/** True when the repository implements this dialect's frontend. */
export function isImplemented(dialect, registry = REGISTRY) {
	return selectFrontend(dialect, registry).implemented;
}

/**
 * Builds a registry for a test: the committed one, with the named entries
 * replaced.
 *
 * Load-bearing rather than a convenience, for the reason the generation seam
 * states about its own: asserting "`spec-bundle` is unimplemented" is an
 * assertion about issue #86's *absence*, and it goes red the moment #86 lands,
 * on a branch that did nothing wrong. The unimplemented arm has to be
 * exercisable over a synthetic registration, or it becomes unexercisable the
 * moment every declared dialect is built — and the arm outlives the dialects.
 */
export function registryWith(overrides) {
	const registry = new Map(REGISTRY);
	for (const [dialect, entry] of Object.entries(overrides)) {
		registry.set(dialect, entry);
	}
	return registry;
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
export async function runFrontend(request, registry = REGISTRY) {
	const entry = selectFrontend(request.dialect, registry);
	if (!entry.implemented) {
		return assertFrontendContract(
			request.dialect,
			entry.frontend?.run
				? await entry.frontend.run(request)
				: notImplemented(request.dialect, entry.owner),
		);
	}
	return assertFrontendContract(
		request.dialect,
		await entry.frontend.run(request),
	);
}
