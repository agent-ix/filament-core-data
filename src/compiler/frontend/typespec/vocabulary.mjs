/**
 * Reading the semantic decorator vocabulary out of a compiled program (FR-053).
 *
 * The decorator implementations record into program state maps; this module is
 * the only reader of them. Keeping the read in one place is what lets the
 * lowering stay a lowering: it asks what a declaration *says* and never learns
 * how the vocabulary stores it.
 */
import { STATE } from "./lib/lib.mjs";

/** The single-valued decorators, and the repeatable ones. */
export const SINGLE_VALUED = Object.freeze([
	"unknownPolicy",
	"unit",
	"multiplicity",
	"collection",
	"defaultKind",
	"identityField",
	"decimal",
	"presence",
	"operations",
	"semanticReference",
]);

export const REPEATABLE = Object.freeze([
	"role",
	"relationship",
	"pre",
	"post",
	"clause",
	"semanticExtension",
]);

/** Every decorator the library declares, in one list. */
export const VOCABULARY = Object.freeze(
	[...SINGLE_VALUED, ...REPEATABLE].sort(),
);

/** Reads one decorator's recorded value for `target`. */
export function read(program, name, target) {
	return program.stateMap(STATE[name]).get(target);
}

/** Every defect the decorators collected while the program compiled. */
export function defects(program) {
	return program.stateMap(STATE.defects).get("all") ?? [];
}
