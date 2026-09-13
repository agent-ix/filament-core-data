/**
 * NFR-001 — the programme issue backing register is navigable and self-consistent.
 * Test cases TC-1584 and TC-1585 of `spec/tests.md`.
 *
 * EPIC #100's sixth acceptance criterion is that every open issue in the
 * programme traces to at least one requirement. A trace nobody can follow is
 * not a trace, so the register in `spec/spec.md` §8.1 states the mapping in one
 * place rather than leaving a reader to recognise an issue's subject matter in
 * a requirement title.
 *
 * A register can drift from the artifacts it names in two directions, and this
 * file gates both. It can name a requirement that does not exist — a rename or
 * a deletion — and it can name a requirement that says nothing about the issue,
 * which is the worse case because it looks like a trace and carries none.
 *
 * The register is read from the specification rather than restated here. A
 * table restated in the test it gates asserts only that a copy matches itself.
 *
 * Requirement ids are written on each case rather than in this header, so that
 * each binds the row it names rather than binding nothing.
 */

import { readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const REGISTER_HEADING = "### 8.1 Programme issue backing register";

type RegisterRow = { issue: number; requirement: string };

/**
 * Read the register's rows out of `spec/spec.md`, from its heading to the next
 * heading of any level, so a later section's table cannot be mistaken for it.
 */
const readRegister = (): RegisterRow[] => {
	const spec = readFileSync(resolve(root, "spec/spec.md"), "utf8");
	const start = spec.indexOf(REGISTER_HEADING);
	expect(
		start,
		`${REGISTER_HEADING} is absent from spec/spec.md`,
	).toBeGreaterThan(-1);
	const body = spec.slice(start + REGISTER_HEADING.length);
	const end = body.search(/\n#{2,4} /);
	const section = end === -1 ? body : body.slice(0, end);

	const rows: RegisterRow[] = [];
	for (const line of section.split("\n")) {
		const match = /^\|\s*#(\d+)\s*\|\s*((?:FR|NFR)-\d{3})\s*\|$/.exec(
			line.trim(),
		);
		if (match) {
			rows.push({ issue: Number(match[1]), requirement: match[2] });
		}
	}
	return rows;
};

/** Resolve a requirement id to its artifact path, by id rather than by title. */
const requirementPath = (id: string): string | undefined => {
	const directory = id.startsWith("NFR-") ? "non-functional" : "functional";
	const matches = readdirSync(resolve(root, "spec", directory)).filter((name) =>
		name.startsWith(`${id}-`),
	);
	return matches.length === 1
		? resolve(root, "spec", directory, matches[0])
		: undefined;
};

describe("programme issue backing register", () => {
	const rows = readRegister();

	it("carries a row for every issue the programme plan left unbacked", () => {
		// The register is only evidence if it is populated; an empty table would
		// pass every case below over an empty population.
		expect(rows.length).toBeGreaterThanOrEqual(19);
		expect(new Set(rows.map((row) => row.issue)).size).toBe(rows.length);
	});

	// TC-1584 — NFR-001-AC-5
	it("names, for every issue, a requirement artifact that exists", () => {
		const missing = rows.filter(
			(row) => requirementPath(row.requirement) === undefined,
		);
		expect(
			missing.map((row) => `#${row.issue} -> ${row.requirement}`),
			"register rows naming a requirement with no artifact",
		).toEqual([]);
	});

	// TC-1585 — NFR-001-AC-6
	it("names only requirements that carry the issue's own link", () => {
		const unconfirmed: string[] = [];
		for (const row of rows) {
			const path = requirementPath(row.requirement);
			if (path === undefined) {
				continue;
			}
			const text = readFileSync(path, "utf8");
			const link = `https://github.com/agent-ix/filament-core-data/issues/${row.issue}`;
			// The link must be followed by a delimiter, so that issue #6's link
			// is not satisfied by issue #63's.
			if (!new RegExp(`${link}(?![0-9])`).test(text)) {
				unconfirmed.push(`#${row.issue} -> ${row.requirement}`);
			}
		}
		expect(
			unconfirmed,
			"register rows the named requirement does not confirm",
		).toEqual([]);
	});
});
