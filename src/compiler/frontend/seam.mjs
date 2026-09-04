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
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { hasBlocking } from "../diagnostics.mjs";
import { REPO_ROOT } from "../packages/lock.mjs";
import * as specBundle from "./spec-bundle/frontend.mjs";
import * as typespec from "./typespec/frontend.mjs";

/**
 * The closed dialect vocabulary, read from the published schema rather than
 * restated, so the registry and the contract cannot drift apart silently.
 */
export const FRONTEND_DIALECTS = Object.freeze(
	JSON.parse(
		readFileSync(
			resolve(REPO_ROOT, "schema/semantic/v1/common.schema.json"),
			"utf8",
		),
	).$defs.frontendDialect.enum,
);

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
 * Runs a frontend over a `FrontendRequest` and enforces the seam's own contract:
 * a blocking diagnostic and a non-null document never come back together.
 */
export async function runFrontend(request) {
	const { frontend } = selectFrontend(request.dialect);
	const result = await frontend.run(request);
	const diagnostics = result.diagnostics ?? [];
	if (hasBlocking(diagnostics) && result.ir !== null) {
		throw new Error(
			`${request.dialect} returned a document alongside a blocking diagnostic; a partial document is never a complete one`,
		);
	}
	return { ir: result.ir ?? null, diagnostics };
}
