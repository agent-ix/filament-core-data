/**
 * The branch register: build and check (FR-062 "The branch register").
 *
 * The register is a census of the mapping, so it is generated in one direction
 * only — from the vocabularies of `branches.mjs` to the file — and checked in
 * the other by regenerating and comparing. Two consequences are deliberate.
 *
 * A row that names no case is **unmet**. It fails the check and it is closed by
 * adding a case, never by dropping the row: dropping it would make the census
 * smaller and the gate greener at the same time, which is the shape of gate
 * this bundle exists to refuse.
 *
 * The binding between a row and a case is asserted by the *suite*, not by this
 * file. A case declares the branches it exercises in its own doc comment, as
 * `Branches: <id>, <id>;`, and this module reads those declarations. A branch
 * added to a vocabulary therefore has no case until someone writes one, and the
 * check names the branch that is missing (FR-062-AC-2).
 *
 * Pure apart from the two files it is told to read.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
	BACKEND_DIRECTORY,
	contributions,
	enumerateBranches,
	readMappingTable,
} from "./branches.mjs";
import { formatJson } from "./json-format.mjs";
import { byCodePoint } from "./mapping.mjs";

/** The register's own file name, inside the backend directory. */
export const REGISTER_FILE = "branch-register.json";

/** The suite whose cases the register binds to, relative to the repository root. */
export const SUITE_PATH = "test/rust-backend.test.ts";

/**
 * Matches a doc comment followed by an `it("...")`, capturing both.
 *
 * Assembled from parts rather than written as one literal: a regex literal
 * carrying a comment-opening sequence desynchronises a scanner that does not
 * tokenise regex literals, and quire's trace scanner is one — the same hazard
 * the suite's own header records.
 */
const STAR = "*";
const SLASH = "/";
const CASE = new RegExp(
	`${SLASH}\\${STAR}\\${STAR}((?:[^${STAR}]|\\${STAR}(?!${SLASH}))*)\\${STAR}${SLASH}\\s*it\\(\\s*"((?:[^"\\\\]|\\\\.)*)"`,
	"g",
);

/** Matches the branch declaration inside a doc comment, terminated by `;`. */
const DECLARATION = /Branches:\s*([^;]*);/;

/**
 * Every case in a suite, with the branches it declares.
 *
 * Returns `{ cases, duplicates }`. A duplicate title is reported rather than
 * merged: two cases with one title cannot be told apart by a register row, and
 * a row naming the title would then name an ambiguous case.
 */
export function scanCases(suiteText) {
	const cases = [];
	const seen = new Set();
	const duplicates = [];
	for (const match of String(suiteText).matchAll(CASE)) {
		const [, comment, title] = match;
		const declared = DECLARATION.exec(comment);
		const branches =
			declared === null
				? []
				: declared[1]
						.split("\n")
						.map((line) => line.replace(/^\s*\*?\s*/, ""))
						.join(" ")
						.split(",")
						.map((entry) => entry.trim())
						.filter((entry) => entry.length > 0);
		if (seen.has(title)) duplicates.push(title);
		seen.add(title);
		cases.push({ caseId: title, branches });
	}
	return { cases, duplicates };
}

/**
 * Builds the register from a backend directory and a suite.
 *
 * `rows` is the vocabulary; the cases are attached to it. Nothing is admitted
 * to `rows` that the vocabularies did not produce, and nothing is withheld from
 * it because no case names it.
 */
export function buildRegister({ directory = BACKEND_DIRECTORY, suiteText }) {
	const table = readMappingTable(directory);
	const vocabulary = enumerateBranches(table);
	const { cases, duplicates } = scanCases(suiteText);

	const byBranch = new Map(vocabulary.map((one) => [one.branchId, []]));
	const unknown = [];
	for (const one of cases) {
		for (const branchId of one.branches) {
			const bucket = byBranch.get(branchId);
			if (bucket === undefined) {
				unknown.push({ caseId: one.caseId, branchId });
				continue;
			}
			if (!bucket.includes(one.caseId)) bucket.push(one.caseId);
		}
	}

	const rows = vocabulary.map((one) => ({
		...one,
		cases: [...byBranch.get(one.branchId)].sort(byCodePoint),
	}));
	const unreachable = rows.filter((one) => one.unreachable !== undefined);

	return {
		register: {
			contractVersion: "1.0.0",
			requirement: "ix://agent-ix/filament-core-data/FR-062",
			note: "One row per branch of the Rust/Serde mapping, generated from the vocabularies that declare the branches and bound to the cases that declare they exercise them. A row naming no case is unmet: it fails `cli.mjs register --check`, and it is closed by adding a case, never by dropping the row.",
			suite: SUITE_PATH,
			generatedFrom: Object.keys(contributions(vocabulary)),
			contributions: contributions(vocabulary),
			rowCount: rows.length,
			unmetCount: rows.filter(
				(one) => one.cases.length === 0 && one.unreachable === undefined,
			).length,
			unreachableCount: unreachable.length,
			rows,
		},
		unknown,
		duplicates,
		caseTitles: cases.map((one) => one.caseId),
	};
}

/** The register's serialized form: the one spelling `--check` compares against. */
export function serializeRegister(register) {
	return formatJson(register);
}

/**
 * Checks the committed register against the vocabularies and the suite.
 *
 * Returns the problems, each already a sentence. Four ways to fail, and every
 * one of them names the branch or the case at fault:
 *
 * 1. a branch no case names and no declared, still-resolving reason excuses —
 *    unmet;
 * 2. a case that declares a branch the vocabularies do not carry — a typo, or a
 *    branch that was renamed under the case's feet;
 * 3. a register on disk that differs from the regenerated one — stale;
 * 4. two cases with one title, which no row could name unambiguously.
 */
export function checkRegister({
	directory = BACKEND_DIRECTORY,
	suiteText,
	committed,
	gaps,
}) {
	const problems = [];
	const built = buildRegister({ directory, suiteText });

	// The declared gaps, resolved once. A branch recorded unreachable cites one,
	// and a citation that no longer resolves fails the gate rather than being
	// taken on trust: the reason has to still be true.
	const declaredGaps = new Set((gaps?.gaps ?? []).map((one) => String(one.id)));
	if (built.register.unreachableCount > 0 && declaredGaps.size === 0) {
		problems.push(
			"a branch is recorded unreachable and the contract-gap register could not be read, so the reason could not be checked and this gate could not run",
		);
	}

	for (const one of built.register.rows) {
		if (one.unreachable !== undefined) {
			if (one.cases.length > 0) {
				problems.push(
					`the branch \`${one.branchId}\` is recorded unreachable and is named by ${one.cases.length} case(s); a branch no input can reach cannot also be exercised`,
				);
			}
			if (declaredGaps.size > 0 && !declaredGaps.has(one.unreachable.gap)) {
				problems.push(
					`the branch \`${one.branchId}\` cites ${one.unreachable.gap}, which conformance/contract-gaps.json does not declare`,
				);
			}
			continue;
		}
		if (one.cases.length > 0) continue;
		problems.push(
			`the branch \`${one.branchId}\` (${one.axis}, from ${one.vocabulary}) is unmet: no test case declares it. Add a case that exercises it; do not drop the row.`,
		);
	}
	for (const one of built.unknown) {
		problems.push(
			`the case "${one.caseId}" declares the branch \`${one.branchId}\`, which no vocabulary carries`,
		);
	}
	for (const title of built.duplicates) {
		problems.push(
			`two cases share the title "${title}", which a register row cannot name unambiguously`,
		);
	}
	if (
		committed !== undefined &&
		committed !== serializeRegister(built.register)
	) {
		problems.push(
			`${REGISTER_FILE} is stale: regenerate it with \`cli.mjs register\``,
		);
	}
	return { problems, register: built.register };
}

/** Reads the suite text a register is built against. */
export function readSuite(root, suitePath = SUITE_PATH) {
	return readFileSync(join(root, suitePath), "utf8");
}
