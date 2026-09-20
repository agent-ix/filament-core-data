/**
 * The closed representability register (FR-084).
 *
 * Exactly two rows, in bijection with the two loss codes. Both directions are
 * asserted, because a register drifts in both: a code with no row is a loss
 * nothing describes, and a row with no code is a description nothing reports.
 *
 * The register's value is entirely in being *closed*. An open register is a
 * place to put anything the lowering could not represent, which converts every
 * future unrepresentable construct from a refusal into a footnote. So a
 * construct no row names refuses under `UNSUPPORTED_LOSS` and is never
 * reported as a declared loss.
 */

import { DIAGNOSTIC_CODES } from "../../diagnostics.mjs";

/**
 * The two declared losses, closed.
 *
 * Each states what was lost and why it is not repaired here. Neither is
 * repaired by editing a published schema: the schemas are the contract, and a
 * lowering that edits its input to make itself faithful has stopped measuring
 * the contract.
 */
export const KERNEL_LOSSES = Object.freeze([
	Object.freeze({
		id: "unconstrained-value",
		code: DIAGNOSTIC_CODES.KERNEL_UNCONSTRAINED_VALUE.code,
		construct: "DefaultDecl.value",
		owner: "ix://agent-ix/semantic-core/DefaultDecl",
		lost: "any JSON value narrowed to any JSON object",
		why: "`DefaultDecl.value` is `unknown` in main.tsp and `{}` in DefaultDecl.json, and IR v1.1 has no any-type. The JsonObject lowering — kind record, fields [], unknownPolicy preserve — is the closest representable shape, and it admits strictly less than the schema does.",
	}),
	Object.freeze({
		id: "required-collection-presence",
		code: DIAGNOSTIC_CODES.KERNEL_REQUIRED_COLLECTION_PRESENCE.code,
		construct: "OperationDecl.params",
		owner: "ix://agent-ix/semantic-core/OperationDecl",
		lost: "required-but-possibly-empty collapsed to optional",
		why: "`OperationDecl.params` is named in required and carries no minItems, so it lowers to lower 0 and its derived presence is optional. IR v1.1 cannot express 'the member must be present and may be empty'.",
	}),
]);

/** The loss codes, derived from the register rather than restated beside it. */
export const KERNEL_LOSS_CODES = Object.freeze(
	KERNEL_LOSSES.map((row) => row.code),
);

/**
 * Asserts the register and the registered codes are in bijection.
 *
 * Returns the discrepancies rather than throwing, and reports both directions
 * separately, because "a code nothing describes" and "a description nothing
 * reports" are different defects with different fixes.
 */
export function checkLossBijection(registry = DIAGNOSTIC_CODES) {
	const registered = Object.values(registry)
		.map((entry) => entry.code)
		.filter(
			(code) =>
				code.includes("KERNEL_") &&
				!code.endsWith("KERNEL_BUNDLE_STALE") &&
				!code.endsWith("KERNEL_INVENTORY_MISMATCH"),
		);
	const declared = new Set(KERNEL_LOSS_CODES);
	return Object.freeze({
		codesWithoutRow: Object.freeze(
			registered.filter((code) => !declared.has(code)),
		),
		rowsWithoutCode: Object.freeze(
			KERNEL_LOSS_CODES.filter((code) => !registered.includes(code)),
		),
	});
}

/**
 * Decides a construct: a declared loss, or a refusal.
 *
 * There is no third answer. A construct is either one the register names, in
 * which case the loss is recorded and generation proceeds, or one it does not,
 * in which case generation refuses. "Proceed and mention it" is the outcome
 * this register exists to make unavailable.
 */
export function decide(construct) {
	const row = KERNEL_LOSSES.find((entry) => entry.construct === construct);
	if (row) {
		return Object.freeze({
			outcome: "declared-loss",
			row,
			diagnostic: Object.freeze({
				code: row.code,
				message: `${row.construct}: ${row.lost}`,
				locus: row.owner,
			}),
		});
	}
	return Object.freeze({
		outcome: "refused",
		diagnostic: Object.freeze({
			code: DIAGNOSTIC_CODES.UNSUPPORTED_LOSS.code,
			message: `${construct} is not representable and no KERNEL_LOSSES row names it; generation refuses rather than degrading it`,
			locus: construct,
		}),
	});
}
