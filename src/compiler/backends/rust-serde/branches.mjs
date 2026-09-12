/**
 * The mapping-branch vocabulary (FR-062 "The branch register").
 *
 * A branch is one decision the mapping can take. This module enumerates them
 * from the artefacts that *declare* them and from nothing else: the mapping
 * table, the constraint applicability table, the closed diagnostic registry,
 * and the identifier derivation module's own exports. Nothing here is a
 * transcription, because a transcribed vocabulary is a second place for the
 * rule to drift, and a register checked against a transcription is a register
 * checked against itself (FR-062-AC-8).
 *
 * The five sources and what each contributes:
 *
 * - `mapping-table.json` — every `kind`, kernel `scalar`, `field` axis
 *   combination, `unknownPolicy` disposition, `defaultKind`, `extension`,
 *   `metadata` and `indirection` row. The indirection rows are the recursion
 *   shapes: a cycle closes through exactly the positions that axis names.
 * - `src/compiler/ir/applicability.mjs` — one branch per keyword-and-subject
 *   pair the applicability table admits, which is what "each constraint keyword
 *   on each applicable subject" quantifies over.
 * - `diagnostics.mjs` — one branch per registered code, across both namespaces.
 * - `names.mjs` — one branch per identifier renderer it exports, and one per
 *   declared collision scope.
 *
 * Pure: the only input is the mapping table's text, which the caller reads.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { KEYWORD_APPLICABILITY } from "../../ir/applicability.mjs";
import { REGISTERED_ENTRIES } from "./diagnostics.mjs";
import { byCodePoint } from "./mapping.mjs";
import * as names from "./names.mjs";

/** The directory this backend lives in, located from this module. */
export const BACKEND_DIRECTORY = fileURLToPath(new URL("./", import.meta.url));

/** Reads the mapping table from a backend directory. */
export function readMappingTable(directory = BACKEND_DIRECTORY) {
	return JSON.parse(
		readFileSync(join(directory, "mapping-table.json"), "utf8"),
	);
}

/**
 * The identifier renderers, read from the module's exports rather than listed.
 *
 * Every renderer is an exported function whose name ends in `Name`; the
 * predicate is the module's own naming convention, so adding a renderer adds a
 * branch without anyone remembering to add it here.
 */
export function renderers() {
	return Object.keys(names)
		.filter((key) => typeof names[key] === "function" && /[a-z]Name$/.test(key))
		.sort(byCodePoint);
}

/**
 * Branches no published input can reach, each with the reason and the owner.
 *
 * A branch here is *unmet by construction*: the code path exists and no value
 * can select it, because the published record does not let anyone state the
 * input that would. It is recorded rather than covered and rather than dropped.
 * Counting it as covered because the code exists would be a number that reads
 * as evidence and is not; dropping it would hide an arm of the mapping.
 *
 * Each entry cites a gap id, and the register check resolves that id against
 * `conformance/contract-gaps.json`. A citation that stops resolving fails the
 * gate, so this list cannot become a place to park a branch nobody wants to
 * test: the reason has to still be true.
 */
export const UNREACHABLE_BRANCHES = Object.freeze([
	Object.freeze({
		branchId: "extension:required-admitted-capability",
		axis: "extension",
		vocabulary: "mapping-table.json",
		construct:
			"the accepting arm of the generated extension rule: a required extension naming a capability the crate admits",
		gap: "GAP-007",
		owner: "agent-ix/filament-core-data#59",
		reason:
			"the admitted-capability set the generated crate carries is empty, and `consumer-policy.schema.json` is sealed with no capability member, so no published artifact lets a consumer declare an admitted capability. The arm exists and no input reaches it.",
	}),
]);

/** One row of the vocabulary. */
function row(branchId, axis, vocabulary, construct) {
	return { branchId, axis, vocabulary, construct };
}

/**
 * Every branch of the mapping, in code-point order of its id.
 *
 * The id namespaces are `kind:`, `scalar:`, `field:`, `unknownPolicy:`,
 * `defaultKind:`, `extension:`, `metadata:`, `indirection:` (the mapping
 * table's own row keys), `constraint:<keyword>/<subject>`, `diagnostic:<code>`,
 * `name:<renderer>` and `scope:<scope>`.
 */
export function enumerateBranches(table) {
	const rows = [];

	for (const one of table.rows) {
		rows.push(
			row(
				one.rowKey,
				one.axis,
				"mapping-table.json",
				`${one.rustForm}${one.diagnosticCode === null ? "" : ` — ${one.diagnosticCode}`}`,
			),
		);
	}

	for (const one of table.rows) {
		if (typeof one.supportType !== "string") continue;
		rows.push(
			row(
				`support-type:${one.selector}`,
				"support-type",
				"mapping-table.json",
				`the ${one.selector} kernel scalar rendered by crate::support::${one.supportType}`,
			),
		);
	}

	for (const [keyword, subjects] of Object.entries(KEYWORD_APPLICABILITY)) {
		for (const subject of subjects) {
			rows.push(
				row(
					`constraint:${keyword}/${subject}`,
					"constraint",
					"src/compiler/ir/applicability.mjs",
					`the keyword \`${keyword}\` lowered onto a ${subject} subject`,
				),
			);
		}
	}

	for (const entry of REGISTERED_ENTRIES) {
		rows.push(
			row(
				`diagnostic:${entry.code}`,
				"diagnostic",
				"diagnostics.mjs",
				`${entry.severity}${entry.blocking ? ", blocking" : ""}: ${entry.rule}`,
			),
		);
	}

	for (const renderer of renderers()) {
		rows.push(
			row(
				`name:${renderer}`,
				"name",
				"names.mjs",
				`the \`${renderer}\` identifier derivation`,
			),
		);
	}

	for (const [key, scope] of Object.entries(names.SCOPES)) {
		rows.push(
			row(
				`scope:${key}`,
				"name",
				"names.mjs",
				`identifier injectivity over ${scope}`,
			),
		);
	}

	for (const entry of UNREACHABLE_BRANCHES) {
		rows.push({
			branchId: entry.branchId,
			axis: entry.axis,
			vocabulary: entry.vocabulary,
			construct: entry.construct,
			unreachable: { gap: entry.gap, owner: entry.owner, reason: entry.reason },
		});
	}

	rows.sort((left, right) => byCodePoint(left.branchId, right.branchId));
	return rows;
}

/** How many branches each vocabulary contributed, for the register's header. */
export function contributions(rows) {
	const counts = {};
	for (const one of rows) {
		counts[one.vocabulary] = (counts[one.vocabulary] ?? 0) + 1;
	}
	const ordered = {};
	for (const key of Object.keys(counts).sort(byCodePoint))
		ordered[key] = counts[key];
	return ordered;
}
