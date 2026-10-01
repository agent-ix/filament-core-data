/**
 * Kernel bundle predicates (FR-081).
 *
 * Pure by construction: every function here is a map from supplied values to
 * diagnostics or bytes, and none of them reads a file. The single file-system
 * boundary is `scripts/build-semantic-kernel.mjs`, which supplies what these
 * decide on.
 *
 * The separation is the point. A predicate that reads its own inputs cannot be
 * tested against an input it was not given, so the cases that matter, such as
 * a document set that has drifted, can only be reached by arranging a
 * filesystem. Passing them in means a test
 * can construct them.
 */

import { DIAGNOSTIC_CODES } from "../../diagnostics.mjs";

/** @typedef {{ code: string, message: string, locus?: string }} Diagnostic */

function diagnostic(entry, message, locus) {
	return locus === undefined
		? { code: entry.code, message }
		: { code: entry.code, message, locus };
}

/**
 * Checks a bundle declaration against the grammar it claims to package.
 *
 * The expected document set is derived from the authored inventory, one
 * `<name>.json` per model, union, enum and scalar, and compared with the
 * enumeration the bundle declares. Returns diagnostics rather than throwing, so
 * one run reports every disagreement instead of the first.
 *
 * @param {Record<string, unknown>} declaration
 * @param {Record<string, unknown>} inventory
 * @returns {readonly Diagnostic[]}
 */
export function checkKernelBundle(declaration, inventory) {
	/** @type {Diagnostic[]} */
	const out = [];

	const declared = [
		.../** @type {readonly string[]} */ (declaration.documents ?? []),
	].sort();
	const derived = ["models", "unions", "enums", "scalars"]
		.flatMap((key) =>
			Array.isArray(inventory[key])
				? /** @type {readonly string[]} */ (inventory[key])
				: [],
		)
		.map((name) => `${name}.json`)
		.sort();

	// The two sets must be the same set, not merely the same size. A count
	// comparison passes for two sets that differ by a substitution, which is the
	// case a stale declaration actually produces.
	const missing = derived.filter((f) => !declared.includes(f));
	const extra = declared.filter((f) => !derived.includes(f));
	if (missing.length > 0 || extra.length > 0) {
		out.push(
			diagnostic(
				DIAGNOSTIC_CODES.KERNEL_INVENTORY_MISMATCH,
				`the bundle declares ${declared.length} document(s) and the inventory derives ${derived.length}: ` +
					`${missing.length} derived but undeclared (${missing.slice(0, 3).join(", ")}${missing.length > 3 ? ", …" : ""}), ` +
					`${extra.length} declared but not derived (${extra.slice(0, 3).join(", ")}${extra.length > 3 ? ", …" : ""})`,
				"/documents",
			),
		);
	}

	return Object.freeze(out);
}
