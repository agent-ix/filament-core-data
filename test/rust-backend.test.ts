/**
 * Issue #21 — the Rust/Serde semantic codegen backend. Test cases TC-645..744
 * of `spec/tests.md`.
 *
 * This file carries the gates that are about the *change* rather than about the
 * generated code: the closed diagnostic registry, the identifier derivation, and
 * the non-disruption family. The mapping, pattern, emission, conformance and
 * consumer gates live beside them as the tracks land.
 *
 * The requirement ids those three answer to are deliberately not written in this
 * header. A trace id on a file's own container comment matches the engine's
 * authored-tag form and then binds to nothing, so the row it names is reported
 * unbacked — indistinguishable from a test nobody wrote. Each id is written
 * where it binds instead: on the `Traces:` comment of the individual case.
 *
 * On the non-disruption family specifically. Four tickets in this repository
 * have now been dragged back by one defect, and it is not a defect in any gate's
 * *condition* — it is a defect in how a gate names the change it guards. A
 * merged change's path set is a fixed historical fact. Encoding it as a live
 * computation against a moving reference degrades four ways: a negative
 * prohibition over a range that empties on merge passes vacuously; a positive
 * assertion over the same range fails immediately; a baseline read from the
 * trunk at run time compares the branch to itself and asserts nothing; and a
 * range fixed at its base but open at its head annexes every later ticket's
 * paths. Issue #20 then found a fifth: a *tree* diff over a range annexes the
 * trunk when the branch merged it. Both ends here come from history, the union
 * is taken over the branch's own first-parent non-merge commits, and the branch
 * rebases rather than merges — which is asserted rather than claimed.
 */

import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	readdirSync,
	rmSync,
	statSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
	changeRange,
	changedPathsUnion,
	mergeCommitsIn,
} from "./changed-paths";

const root = resolve(__dirname, "..");
const read = (path: string): string => readFileSync(path, "utf8");
const readJson = (path: string): unknown => JSON.parse(read(path));

/**
 * The two sentinels NFR-023 declares. The first is created by this change's
 * first commit and the second by its last, so `changeRange` resolves both ends
 * from history and, after the squash merge, both resolve to the one squash
 * commit — which is exactly this change's path set.
 */
const SENTINELS = [
	"spec/usecase/US-011-consume-semantic-contracts-in-rust.md",
	"docs/semantic-data-system/rust-backend-support-matrix.md",
] as const;

/** Permitted paths, transcribed from NFR-023's Scope. */
const PERMITTED: readonly string[] = [
	"^src/compiler/backends/rust-serde/",
	"^crates/",
	"^spec/",
	"^plan/",
	"^reviews/",
	"^test/rust-backend[^/]*\\.ts$",
	"^test/contract-census\\.test\\.ts$",
	"^test/semantic-architecture\\.test\\.ts$",
	"^test/semantic-contract\\.test\\.ts$",
	"^test/semantic-core\\.test\\.ts$",
	"^test/semantic-ir-v1-1\\.test\\.ts$",
	"^test/typespec-feasibility\\.test\\.ts$",
	"^test/fixtures/rust-serde/",
	"^test/changed-paths\\.ts$",
	"^docs/semantic-data-system/rust-backend[^/]*\\.md$",
	"^docs/semantic-data-system/index\\.md$",
	"^docs/semantic-data-system/roadmap\\.md$",
	"^scripts/build-rust-backend-docs\\.mjs$",
	"^scripts/build-rust-backend-goldens\\.mjs$",
	"^scripts/rust-backend-harness\\.mjs$",
	"^scripts/rust-backend-locus-differential\\.mjs$",
	"^scripts/rust-backend-target-verdicts\\.mjs$",
	"^Makefile$",
	"^\\.gitignore$",
	"^rust-toolchain\\.toml$",
	"^rustfmt\\.toml$",
	"^Cargo\\.toml$",
	"^Cargo\\.lock$",
	"^\\.cargo/config\\.toml$",
	"^THIRD-PARTY-NOTICES\\.md$",
	"^conformance/adapters/registry\\.json$",
	"^conformance/coverage\\.json$",
];

/** Prohibited paths, transcribed from NFR-023's Scope. */
const PROHIBITED: readonly string[] = [
	"^schema/",
	"^fixtures/",
	"^packages/",
	"^spikes/",
	"^\\.github/",
	"^src/compiler/backends/rust\\.mjs$",
	"^src/compiler/backends/typescript\\.mjs$",
	"^src/compiler/backends/python-schema\\.mjs$",
	"^src/compiler/backends/type-names\\.mjs$",
	"^src/compiler/emitters/",
	"^src/compiler/ir/",
	"^src/compiler/frontend/",
	"^src/compiler/compat/",
	"^src/generated\\.ts$",
	"^agent_ix_core_data/",
	"^tests/",
	"^package\\.json$",
	"^pnpm-lock\\.yaml$",
	"^pyproject\\.toml$",
	"^poetry\\.lock$",
	"^biome\\.json$",
	"^tsconfig.*\\.json$",
];

/** Every `test/*.test.ts` but this change's own is prohibited. */
const OWNED_TESTS = new Set([
	"test/contract-census.test.ts",
	"test/semantic-architecture.test.ts",
	"test/semantic-contract.test.ts",
	"test/semantic-core.test.ts",
	"test/semantic-ir-v1-1.test.ts",
	"test/typespec-feasibility.test.ts",
]);

function isOtherSuite(path: string): boolean {
	return (
		/^test\/.*\.test\.ts$/.test(path) &&
		!/^test\/rust-backend/.test(path) &&
		!OWNED_TESTS.has(path)
	);
}

function isPermitted(path: string): boolean {
	if (isOtherSuite(path)) return false;
	return PERMITTED.some((pattern) => new RegExp(pattern).test(path));
}

function isProhibited(path: string): boolean {
	if (isOtherSuite(path)) return true;
	// `startsWith`, not a regex. A regex literal ending `\\//` reads as the start
	// of a line comment to a scanner that does not tokenise regex literals, and
	// quire's trace scanner is one: it swallowed the rest of this line, lost the
	// opening brace it carried, and reported the file's braces unbalanced, which
	// would have silently unbound every trace tag in it.
	if (path.startsWith("conformance/")) {
		return (
			path !== "conformance/adapters/registry.json" &&
			path !== "conformance/coverage.json"
		);
	}
	return PROHIBITED.some((pattern) => new RegExp(pattern).test(path));
}

/**
 * Matches a comment-only line, assembled from parts.
 *
 * Written as a regex literal this reads `/^\s*(//|\*|/\*)/`, and a scanner
 * that does not tokenise regex literals sees a line comment and a *block*
 * comment opening inside it — quire's trace scanner is one, and it then eats
 * braces until the next close, reports the file unbalanced, and silently binds
 * none of its trace tags. Composing the pattern keeps those two sequences out
 * of the source text.
 */
const SLASH = "/";
const COMMENT_LINE = new RegExp(`^\\s*(${SLASH}${SLASH}|\\*|${SLASH}\\*)`);

/**
 * A semantic identity, assembled rather than written out.
 *
 * A literal `ix:` followed by two slashes reads as the start of a line comment
 * to a scanner that does not tokenise string literals — quire's trace scanner
 * is one — and it then swallows the rest of the line, including any brace it
 * carried. The file's braces come out unbalanced and *every trace tag in it
 * binds nothing*, silently. `test/compiler.test.ts` carries the same condition
 * today. Composing the prefix keeps the sequence out of the source text.
 */
const ix = (rest: string): string => `ix:${SLASH}${SLASH}${rest}`;

const DOUBLE = String.fromCharCode(34);
const SINGLE = String.fromCharCode(39);
const BACKTICK = String.fromCharCode(96);

/**
 * A pattern built from `RegExp` rather than written as a literal.
 *
 * A regex literal carrying an odd number of quote characters desynchronises a
 * scanner that tracks string state but does not tokenise regex literals: the
 * quote inside the pattern opens a string that never closes, and every brace
 * after it is miscounted. The consequence is not a warning — it is that the
 * file's trace tags bind nothing at all.
 */
const LOCK_NAME = new RegExp(
	`^name = ${DOUBLE}([^${DOUBLE}]+)${DOUBLE}$`,
	"gm",
);

const temp = (label: string): string =>
	mkdtempSync(join(tmpdir(), `rust-backend-${label}-`));

// ---------------------------------------------------------------------------
// The closed generator diagnostic registry
// ---------------------------------------------------------------------------

describe("TC-690..697 the closed generator diagnostic registry", () => {
	const modulePath = "src/compiler/backends/rust-serde/diagnostics.mjs";

	/** Traces: TC-691; FR-058-AC-2, FR-058-CON-1. */
	it("TC-691 every registered code is in a declared namespace, owned by it, and frozen", async () => {
		const module = await import(`../${modulePath}`);
		const entries = module.REGISTERED_ENTRIES as {
			code: string;
			severity: string;
			blocking: boolean;
			owner: string;
			rule: string;
		}[];
		expect(entries.length).toBeGreaterThan(0);
		for (const entry of entries) {
			expect(entry.code).toMatch(
				/^agent-ix\.(rust-backend|semantic-ir)\.[A-Z][A-Z0-9_]+$/,
			);
			// The owner follows the namespace. Renaming an owner is renaming a
			// code, and the published `agent-ix.semantic-ir.*` set owns its own.
			expect(entry.owner).toBe(
				entry.code.startsWith("agent-ix.rust-backend.")
					? ix("agent-ix/filament-core-data/rust-backend")
					: ix("agent-ix/filament-core-data/semantic-ir"),
			);
			expect(entry.rule.length).toBeGreaterThan(0);
			expect(Object.isFrozen(entry)).toBe(true);
			// A blocking advisory or a non-blocking error is a contradiction the
			// refusal rule cannot act on.
			expect(entry.blocking).toBe(entry.severity === "error");
		}
		expect(Object.isFrozen(module.RUST_BACKEND_CODES)).toBe(true);
	});

	/** Traces: TC-691; FR-058-AC-2, FR-058-CON-1. */
	it("TC-691 constructing a diagnostic from an unregistered entry throws", async () => {
		const module = await import(`../${modulePath}`);
		expect(() =>
			module.diagnostic({ code: "agent-ix.rust-backend.INVENTED" }),
		).toThrow(/unregistered/);
		expect(() =>
			module.diagnostic("agent-ix.rust-backend.UNSUPPORTED_PATTERN"),
		).toThrow(/not a string/);
	});

	/** Traces: TC-691; FR-058-AC-2, FR-058-CON-1. */
	it("TC-691 no live generator path constructs a diagnostic from a string", () => {
		// The property is that a code is addressed as a registry member and never
		// spelled. Forbidding the *text* of a code anywhere would also forbid
		// naming one in the documentation the emitter writes into the generated
		// crate — prose about a refusal rather than a construction of one — and a
		// gate that cannot tell those apart is measuring the wrong thing.
		const directory = resolve(root, "src/compiler/backends/rust-serde");
		expect(existsSync(directory)).toBe(true);
		const construction = new RegExp(
			`diagnostic\\(\\s*[${DOUBLE}${SINGLE}${BACKTICK}]`,
		);
		let scanned = 0;
		for (const name of readdirSync(directory)) {
			if (!name.endsWith(".mjs")) continue;
			const source = read(resolve(directory, name))
				.split("\n")
				.filter((line) => !COMMENT_LINE.test(line))
				.join("\n");
			expect(
				source,
				`${name} constructs a diagnostic from a string literal`,
			).not.toMatch(construction);
			scanned += 1;
		}
		expect(scanned).toBeGreaterThan(5);
	});

	/** Traces: TC-696; FR-058-AC-7..FR-058-AC-9, FR-058-CON-3. */
	it("TC-696 diagnostic order and truncation do not depend on discovery order", async () => {
		const module = await import(`../${modulePath}`);
		const codes = module.RUST_BACKEND_CODES;
		const make = (entry: unknown, path: string, line: number) =>
			module.diagnostic(entry, {
				message: `at ${path}:${line}`,
				locus: {
					sourceIdentity: ix("agent-ix/filament-core-data/source/typespec"),
					path,
					startLine: line,
					startColumn: 1,
				},
			});
		const list = [
			make(codes.UNSUPPORTED_PATTERN, "b.tsp", 2),
			make(codes.NAME_COLLISION, "a.tsp", 9),
			module.diagnostic(codes.UNRENDERABLE_NAME, { message: "unlocated" }),
			make(codes.UNSUPPORTED_SCALAR, "a.tsp", 1),
		];
		const forward = module
			.sortDiagnostics(list)
			.map((one: { message: string }) => one.message);
		const backward = module
			.sortDiagnostics([...list].reverse())
			.map((one: { message: string }) => one.message);
		expect(forward).toEqual(backward);
		// Located before unlocated, then by path, then by line.
		expect(forward[0]).toBe("at a.tsp:1");
		expect(forward.at(-1)).toBe("unlocated");

		const limited = module.applyDiagnosticLimit(list, 2);
		expect(limited).toHaveLength(3);
		expect(limited.at(-1).code).toBe(
			"agent-ix.rust-backend.DIAGNOSTIC_LIMIT_REACHED",
		);
		expect(limited.at(-1).blocking).toBe(false);
		expect(
			module
				.applyDiagnosticLimit([...list].reverse(), 2)
				.map((one: { message: string }) => one.message),
		).toEqual(limited.map((one: { message: string }) => one.message));
	});

	/** Traces: TC-696; FR-058-AC-7..FR-058-AC-9, FR-058-CON-3. */
	it("TC-696 an input-derived fragment is truncated at 120 code points", async () => {
		const module = await import(`../${modulePath}`);
		const long = "é".repeat(10000);
		const cut = module.fragment(long);
		expect([...cut].length).toBe(120);
		expect(cut.endsWith("…")).toBe(true);
		// Truncation is on code points, so a surrogate pair is never split.
		const astral = "\u{1F600}".repeat(400);
		expect(
			[...module.fragment(astral)].every((point: string) => point !== "\uD83D"),
		).toBe(true);
	});
});

describe("TC-655, TC-697 the published tables and the closed code sets", () => {
	/** Traces: TC-655; FR-054-AC-11, FR-054-CON-1. */
	it("TC-655 the mapping table, the requirement's tables and the rendered page agree", () => {
		// Parsed from the requirement's own markdown rather than eyeballed, so a
		// row added to one and not the other fails here rather than in review.
		const requirement = read(
			resolve(
				root,
				"spec/functional/FR-054-map-the-semantic-ir-to-rust-serde-declarations.md",
			),
		);
		const table = readJson(
			resolve(root, "src/compiler/backends/rust-serde/mapping-table.json"),
		) as {
			rows: {
				rowKey: string;
				axis: string;
				selector: string;
				rustForm: string;
			}[];
		};
		const rendered = read(
			resolve(root, "docs/semantic-data-system/rust-backend.md"),
		);

		const declaredKinds = [
			"scalar",
			"record",
			"enum",
			"union",
			"alias",
			"sequence",
			"map",
			"reference",
		];
		const declaredScalars = [
			"boolean",
			"integer",
			"number",
			"string",
			"bytes",
			"date",
			"datetime",
			"duration",
			"uuid",
		];
		const kindRows = table.rows
			.filter((row) => row.axis === "kind")
			.map((row) => row.selector);
		expect(kindRows.sort()).toEqual([...declaredKinds].sort());
		const scalarRows = table.rows
			.filter((row) => row.axis === "scalar")
			.map((row) => row.selector);
		expect(scalarRows.sort()).toEqual([...declaredScalars].sort());

		// Selector agreement is checked where a selector is contract vocabulary —
		// the kind and scalar axes. The field-axis rows are keyed by a composite
		// of three axis values, which the requirement writes as three table
		// columns rather than as one token, so they are checked by shape below.
		for (const row of table.rows.filter(
			(one) => one.axis === "kind" || one.axis === "scalar",
		)) {
			expect(
				requirement.includes(row.selector),
				`mapping row ${row.rowKey} is in no requirement table`,
			).toBe(true);
			expect(
				rendered.includes(row.selector),
				`mapping row ${row.rowKey} is not rendered`,
			).toBe(true);
		}
		// Every row, whatever its axis, reaches the rendered page.
		for (const row of table.rows) {
			expect(
				rendered.includes(row.rowKey) || rendered.includes(row.selector),
				`mapping row ${row.rowKey} is not rendered`,
			).toBe(true);
		}
		// And the eight field-axis combinations are all present and distinct.
		const axisRows = table.rows.filter((row) =>
			/^field:(single|collection)\/(non-null|nullable)\/(required|optional)$/.test(
				row.rowKey,
			),
		);
		expect(axisRows).toHaveLength(8);
		expect(new Set(axisRows.map((row) => row.rustForm)).size).toBe(8);
	});

	/** Traces: TC-697; FR-058-AC-10, FR-058-CON-5. */
	it("TC-697 every code named anywhere in the bundle is in one of the two declared sets", async () => {
		const module = await import(
			"../src/compiler/backends/rust-serde/diagnostics.mjs"
		);
		const generator = new Set(
			(module.REGISTERED_ENTRIES as readonly { code: string }[]).map(
				(entry) => entry.code.split(".").at(-1) as string,
			),
		);
		const reader = new Set(
			(
				readJson(resolve(root, "conformance/diagnostic-codes.json")) as {
					codes: { code: string }[];
				}
			).codes.map((entry) => entry.code.split(".").at(-1) as string),
		);

		// Two precise populations, not a scan for shouty tokens. The first is
		// every fully-qualified code this ticket's requirements name; the second
		// is every backticked leaf inside this ticket's own error-path rows. A
		// loose scan would sweep up the identity constants FR-056 declares and
		// the merged tickets' codes, and a gate that has to exempt fifty tokens
		// is not measuring anything.
		const requirements = readdirSync(resolve(root, "spec/functional"))
			.filter((name) => /^FR-0(5[4-9]|6[0-2])-/.test(name))
			.map((name) => read(resolve(root, "spec/functional", name)))
			.join("\n");
		const matrix = read(resolve(root, "spec/tests.md"));
		const errRows = matrix
			.split("\n")
			.filter((line) => /^\| ERR-1(1[4-9]|2[0-9]|3[01]) \|/.test(line))
			.join("\n");
		expect(errRows.split("\n")).toHaveLength(18);

		const qualified = [
			...`${requirements}\n${errRows}`.matchAll(
				/agent-ix\.(rust-backend|semantic-ir)\.([A-Z][A-Z0-9_]+)/g,
			),
		];
		for (const [, namespace, leaf] of qualified) {
			const set = namespace === "rust-backend" ? generator : reader;
			expect(set.has(leaf), `${namespace}.${leaf} is in no closed set`).toBe(
				true,
			);
		}
		const bare = [...errRows.matchAll(/`([A-Z][A-Z0-9_]{4,})`/g)].map(
			(match) => match[1],
		);
		expect(bare.length).toBeGreaterThan(10);
		for (const leaf of bare) {
			expect(
				generator.has(leaf) || reader.has(leaf),
				`${leaf} is named by an error-path row and registered nowhere`,
			).toBe(true);
		}
		// One defect, one code, one namespace. The generator's own namespace must
		// not restate a published code, and every published spelling it carries
		// must be one the published set actually declares — not an invented code
		// wearing a borrowed prefix.
		const generatorOwn = new Set(
			(module.REGISTERED_ENTRIES as readonly { code: string }[])
				.filter((entry) => entry.code.startsWith("agent-ix.rust-backend."))
				.map((entry) => entry.code.split(".").at(-1) as string),
		);
		const generatorPublished = new Set(
			(module.REGISTERED_ENTRIES as readonly { code: string }[])
				.filter((entry) => entry.code.startsWith("agent-ix.semantic-ir."))
				.map((entry) => entry.code.split(".").at(-1) as string),
		);
		const restated = [...generatorOwn].filter((leaf) => reader.has(leaf));
		expect(
			restated,
			`the generator mints a second spelling for: ${restated.join(", ")}`,
		).toEqual([]);
		const invented = [...generatorPublished].filter(
			(leaf) => !reader.has(leaf),
		);
		expect(
			invented,
			`carried as published but declared nowhere: ${invented.join(", ")}`,
		).toEqual([]);
		expect(generatorPublished.size).toBeGreaterThan(0);
	});
});

// ---------------------------------------------------------------------------
// Identifier derivation
// ---------------------------------------------------------------------------

describe("TC-658..665 identifier derivation", () => {
	const modulePath = "src/compiler/backends/rust-serde/names.mjs";
	const type = (segment: string) => ({
		identity: ix(`agent-ix/pkg/type/${segment}`),
	});
	const member = (name: string, identity = ix("agent-ix/pkg/field/x")) => ({
		name,
		identity,
	});

	/** Traces: TC-658; FR-055-AC-1. */
	it("TC-658 acronyms, separators and casings render one identifier", async () => {
		const m = await import(`../${modulePath}`);
		for (const segment of [
			"HTTPStatusCode",
			"http_status_code",
			"httpStatusCode",
			"HTTP-status-code",
		]) {
			expect(m.typeName(type(segment)).value, segment).toBe("HttpStatusCode");
		}
		for (const name of [
			"HTTPStatusCode",
			"http status code",
			"httpStatusCode",
			"HTTP-status-code",
		]) {
			expect(m.memberName(member(name)).value, name).toBe("http_status_code");
		}
	});

	/** Traces: TC-658; FR-055-AC-1. */
	it("TC-658 a type name reads the identity, not the display name", async () => {
		const m = await import(`../${modulePath}`);
		// Two records whose display names render one identifier but whose
		// identities differ. Deriving from `displayName` would refuse a document
		// whose wire names never collide (SR-082 FND-950).
		const first = {
			identity: ix("agent-ix/pkg/type/StatusCode"),
			displayName: "HTTPStatusCode",
		};
		const second = {
			identity: ix("agent-ix/pkg/type/ResultCode"),
			displayName: "HTTP status code",
		};
		expect(m.typeName(first).value).toBe("StatusCode");
		expect(m.typeName(second).value).toBe("ResultCode");
		expect(m.typeName(first).value).not.toBe(m.typeName(second).value);
	});

	/** Traces: TC-659; FR-055-AC-2. */
	it("TC-659 reserved words take the raw form, and the four without one are refused", async () => {
		const m = await import(`../${modulePath}`);
		for (const word of ["type", "fn", "match", "loop", "async"]) {
			expect(m.memberName(member(word)).value, word).toBe(`r#${word}`);
		}
		for (const word of ["crate", "self", "Self", "super"]) {
			const outcome = m.memberName(member(word));
			expect(outcome.ok, word).toBe(false);
			expect(outcome.diagnostic.code).toBe(
				"agent-ix.rust-backend.UNRENDERABLE_NAME",
			);
			expect(outcome.diagnostic.blocking).toBe(true);
		}
	});

	/** Traces: TC-660; FR-055-AC-3. */
	it("TC-660 an unrenderable name is refused and never silently mangled", async () => {
		const m = await import(`../${modulePath}`);
		const empty = m.memberName(member(""));
		expect(empty.ok).toBe(false);
		expect(empty.diagnostic.message).toContain(ix("agent-ix/pkg/field/x"));

		// A character XID_Continue admits renders faithfully; Rust has accepted
		// non-ASCII identifiers since 1.53. None of these becomes `GrE`,
		// `NaVeSize`, `Rger` or the empty string.
		expect(m.memberName(member("Größe")).value).toBe("größe");
		expect(m.memberName(member("naïve size")).value).toBe("naïve_size");
		expect(m.memberName(member("Ärger")).value).toBe("ärger");
		const cjk = m.memberName(member("名前"));
		expect(cjk.ok).toBe(true);
		expect(cjk.value).toBe("名前");

		// A character it does not admit is a refusal, not a deletion.
		const refused = m.memberName(member("a b"));
		expect(refused.ok).toBe(false);
		expect(refused.diagnostic.code).toBe(
			"agent-ix.rust-backend.UNRENDERABLE_NAME",
		);
	});

	/** Traces: TC-661; FR-055-AC-4. */
	it("TC-661 a digit-leading name is prefixed", async () => {
		const m = await import(`../${modulePath}`);
		expect(m.memberName(member("9lives")).value).toBe("_9lives");
		expect(m.typeName(type("2fast")).value).toBe("_2fast");
	});

	/** Traces: TC-662; FR-055-AC-5, FR-055-CON-1. */
	it("TC-662 a collision names both identities and is never suffixed away", async () => {
		const m = await import(`../${modulePath}`);
		const diagnostics = m.collisionsIn(m.SCOPES.RECORD_MEMBERS, [
			{ identifier: "status_code", identity: ix("agent-ix/pkg/field/a") },
			{ identifier: "status_code", identity: ix("agent-ix/pkg/field/b") },
		]);
		expect(diagnostics).toHaveLength(1);
		expect(diagnostics[0].code).toBe("agent-ix.rust-backend.NAME_COLLISION");
		expect(diagnostics[0].message).toContain(ix("agent-ix/pkg/field/a"));
		expect(diagnostics[0].message).toContain(ix("agent-ix/pkg/field/b"));
		// The derivation itself never disambiguates.
		const source = read(resolve(root, modulePath));
		expect(source).not.toMatch(/identifier\s*\+\s*(index|counter|seq)/);
	});

	/** Traces: TC-663; FR-055-AC-6. */
	it("TC-663 a rename is emitted only where the identifier differs from the wire name", async () => {
		const m = await import(`../${modulePath}`);
		expect(m.serdeRename("id", "id")).toBeUndefined();
		expect(m.serdeRename("r#type", "type")).toBeUndefined();
		expect(m.serdeRename("status_code", "statusCode")).toBe("statusCode");
	});

	/** Traces: TC-664; FR-055-AC-7..FR-055-AC-9, FR-055-CON-3. */
	it("TC-664 derivation is position-, order-, locale- and ambient-independent", async () => {
		const m = await import(`../${modulePath}`);
		// Position and order: the function takes one node and nothing else.
		const one = m.memberName(member("statusCode")).value;
		expect(m.memberName(member("statusCode")).value).toBe(one);

		// Locale: the locale-sensitive case mappings turn `i` into `İ` under
		// tr-TR, so no live path may use them (FR-055-AC-12). Comment lines are
		// stripped first: this module explains the trap in prose, and a gate that
		// cannot tell an explanation from a call fires on its own documentation.
		const source = read(resolve(root, modulePath))
			.split("\n")
			.filter((line) => !COMMENT_LINE.test(line))
			.join("\n");
		expect(source).not.toContain("toLocaleUpperCase");
		expect(source).not.toContain("toLocaleLowerCase");
		expect(source).not.toContain("localeCompare");
		expect(m.memberName(member("Iid")).value).toBe("iid");

		// Ambient input: the module reads its argument and the pinned tables.
		expect(source).not.toMatch(
			/process\.env|process\.cwd|Date\.now|Math\.random/,
		);
	});

	/** Traces: TC-665; FR-055-AC-10, FR-055-CON-2. */
	it("TC-665 the reserved-word list is pinned with its provenance", () => {
		const pinned = readJson(
			resolve(root, "src/compiler/backends/rust-serde/reserved-words.json"),
		) as {
			edition: string;
			unicodeVersion: string;
			provenance: string;
			reserved: string[];
			reservedFuture: string[];
			noRawForm: string[];
		};
		expect(pinned.edition).toBe("2021");
		expect(pinned.provenance.length).toBeGreaterThan(20);
		expect(pinned.unicodeVersion).toMatch(/^\d+\.\d+\.\d+$/);
		expect(new Set(pinned.noRawForm)).toEqual(
			new Set(["crate", "self", "Self", "super"]),
		);
		// Every no-raw-form word is also a reserved word, or the refusal never fires.
		for (const word of pinned.noRawForm) {
			expect(pinned.reserved, word).toContain(word);
		}
		// The edition the list claims is the edition the workspace builds.
		expect(read(resolve(root, "Cargo.toml"))).toContain(
			`edition = "${pinned.edition}"`,
		);
	});

	/** Traces: TC-665; FR-055-AC-10, FR-055-CON-2. */
	it("TC-665 the crate name replaces the identity separator Cargo forbids", async () => {
		const m = await import(`../${modulePath}`);
		expect(m.crateName("agent-ix/assurance").value).toBe("agent-ix-assurance");
		expect(m.crateName("agent-ix/core.data").ok).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// Non-disruption
// ---------------------------------------------------------------------------

describe("TC-713 the emitted call rendering is a formatter fixed point", () => {
	/** Traces: TC-713; FR-060-AC-3, FR-060-CON-2. */
	it("TC-713 all three branches of the try_new call survive rustfmt --check", async () => {
		// The goldens cannot catch this. `rustfmt` breaks this shape in two
		// stages — the method chain first, the argument list only when the
		// arguments exceed `fn_call_width` — and none of the four corpus bases
		// reaches the middle branch, because their records carry two or eight
		// fields. A three-field record does, and the emitter got it wrong: it
		// broke the argument list where the formatter would have kept the call on
		// one line. A golden minted from the bases would have stayed green
		// through that, which is why this fixture exists beside them.
		// The specifier is composed rather than written out, which is this
		// suite's convention for importing an untyped `.mjs`: a literal one makes
		// `tsc --noEmit` demand a declaration file for a module that has none.
		const { emitCrate } = await import(modulePathOf("crate.mjs"));
		const bundle = readJson(
			resolve(root, "test/fixtures/rust-serde/format-branches.json"),
		) as { ir: unknown };
		const files = emitCrate({
			contractVersion: "1.0.0",
			lockFingerprint: `sha256:${"0".repeat(64)}`,
			ir: bundle.ir,
			profile: {},
			mappings: [],
			backend: {
				identity: ix("agent-ix/filament-core-data/rust-backend"),
				version: "0.0.0",
			},
			outputRoot: "out",
			limits: {},
		}) as { files?: Map<string, string> } | Map<string, string>;
		const emitted =
			files instanceof Map ? files : (files.files as Map<string, string>);

		const scratch = temp("format-branches");
		try {
			for (const [relative, body] of emitted) {
				const full = resolve(scratch, relative);
				mkdirSync(dirname(full), { recursive: true });
				writeFileSync(full, body);
			}
			writeFileSync(
				resolve(scratch, "rustfmt.toml"),
				read(resolve(root, "rustfmt.toml")),
			);
			const sources = [...emitted.keys()].filter((name) =>
				name.endsWith(".rs"),
			);
			expect(sources.length).toBeGreaterThan(3);

			// The three branches are actually present, or this fixture proves
			// nothing about the branch it was written for.
			const bodies = sources
				.map((name) => emitted.get(name) as string)
				.join("\n");
			expect(bodies).toMatch(/Self::try_new\([a-z]/);
			expect(bodies).toMatch(/Self::try_new\(wire\.[^)]*\)\n\s+\.map_err/);
			expect(bodies).toMatch(/Self::try_new\(\n/);

			execFileSync("rustfmt", ["--check", ...sources], {
				cwd: scratch,
				stdio: "pipe",
			});
		} finally {
			rmSync(scratch, { recursive: true, force: true });
		}
	});
});

describe("TC-737..744 non-disruption", () => {
	/** Traces: TC-737; NFR-023-AC-1. */
	it("TC-737 every path in this change's own set is permitted and none is prohibited", () => {
		const paths = changedPathsUnion(root, SENTINELS);
		expect(paths.length).toBeGreaterThan(0);
		for (const path of paths) {
			expect(isProhibited(path), `prohibited: ${path}`).toBe(false);
			expect(isPermitted(path), `not permitted: ${path}`).toBe(true);
		}
	});

	/** Traces: TC-744; NFR-023-AC-9..NFR-023-AC-11. */
	it("TC-744 no trunk merge sits inside this change's range", () => {
		// The fifth face of the defect: a tree diff over a range that contains a
		// trunk merge annexes the trunk. `changedPathsUnion` filters it, and this
		// asserts the branch did not create the condition in the first place.
		expect(mergeCommitsIn(root, SENTINELS)).toEqual([]);
	});

	/** Traces: TC-744; NFR-023-AC-9..NFR-023-AC-11. */
	it("TC-744 both ends of the range come from history, not from a moving ref", () => {
		const { base, tip } = changeRange(root, SENTINELS);
		expect(base).toMatch(/^[0-9a-f]{40}$/);
		expect(tip).toMatch(/^[0-9a-f]{40}$/);

		// This suite must not baseline on a moving reference, in either
		// direction. Assembled from parts so the gate does not match itself.
		const source = read(resolve(root, "test/rust-backend.test.ts"))
			.split("\n")
			.filter((line) => !COMMENT_LINE.test(line))
			.join("\n");
		expect(source).not.toMatch(new RegExp(["origin", "main"].join("/")));
		expect(source).not.toMatch(new RegExp(`\\.\\.${["HE", "AD"].join("")}`));
	});

	/** Traces: TC-744; NFR-023-AC-9..NFR-023-AC-11. */
	it("TC-744 a gate whose sentinels do not resolve fails rather than passing", () => {
		expect(() => changedPathsUnion(root, ["no/such/sentinel.md"])).toThrow(
			/cannot be located/,
		);
	});

	/** Traces: TC-738; NFR-023-AC-2. */
	it("TC-738 the published package manifest's metadata fields are byte-unchanged", () => {
		const { base } = changeRange(root, SENTINELS);
		const atBase = JSON.parse(
			execFileSync("git", ["show", `${base}:package.json`], {
				cwd: root,
				encoding: "utf8",
			}),
		) as Record<string, unknown>;
		const now = readJson(resolve(root, "package.json")) as Record<
			string,
			unknown
		>;
		for (const field of [
			"exports",
			"main",
			"module",
			"types",
			"files",
			"scripts",
		]) {
			expect(JSON.stringify(now[field]), field).toBe(
				JSON.stringify(atBase[field]),
			);
		}
	});

	/** Traces: TC-739; NFR-023-AC-3. */
	it("TC-739 the only conformance path this change touches is the rust-backend registry entry", () => {
		const touched = changedPathsUnion(root, SENTINELS).filter((path) =>
			path.startsWith("conformance/"),
		);
		for (const path of touched) {
			expect(
				["conformance/adapters/registry.json", "conformance/coverage.json"],
				`unexpected conformance path: ${path}`,
			).toContain(path);
		}
	});

	/** Traces: TC-739; NFR-023-AC-3. */
	it("TC-739 the registry change is confined to the rust-backend entry", () => {
		const { base } = changeRange(root, SENTINELS);
		const path = "conformance/adapters/registry.json";
		let atBase: { adapters: Record<string, unknown>[] };
		try {
			atBase = JSON.parse(
				execFileSync("git", ["show", `${base}:${path}`], {
					cwd: root,
					encoding: "utf8",
				}),
			);
		} catch {
			throw new Error(`${path} is not in history at the change's base`);
		}
		const now = readJson(resolve(root, path)) as {
			adapters: Record<string, unknown>[];
			[key: string]: unknown;
		};
		// Every member but `adapters` byte-identical.
		for (const key of Object.keys(atBase as Record<string, unknown>)) {
			if (key === "adapters") continue;
			expect(JSON.stringify(now[key]), `registry member ${key} changed`).toBe(
				JSON.stringify((atBase as Record<string, unknown>)[key]),
			);
		}
		// Every adapter but `rust-backend` byte-identical, in the same order.
		expect(now.adapters.map((one) => one.id)).toEqual(
			atBase.adapters.map((one) => one.id),
		);
		for (let index = 0; index < atBase.adapters.length; index += 1) {
			if (atBase.adapters[index].id === "rust-backend") continue;
			expect(
				JSON.stringify(now.adapters[index]),
				`adapter ${String(atBase.adapters[index].id)} changed`,
			).toBe(JSON.stringify(atBase.adapters[index]));
		}
		// And the rust-backend entry keeps every member it is not obliged to move.
		const before = atBase.adapters.find(
			(one) => one.id === "rust-backend",
		) as Record<string, unknown>;
		const after = now.adapters.find(
			(one) => one.id === "rust-backend",
		) as Record<string, unknown>;
		for (const key of [
			"id",
			"language",
			"owningIssue",
			"pointerCompatible",
			"rationale",
		]) {
			expect(JSON.stringify(after[key]), `rust-backend.${key}`).toBe(
				JSON.stringify(before[key]),
			);
		}
	});

	/** Traces: TC-739; FR-059-AC-12, NFR-023-AC-3. */
	it("TC-739 the coverage account moves only on the rust-backend row", () => {
		// The account is a generated report about the adapters, not a yardstick,
		// and it necessarily moves when the slot it accounts for is filled. The
		// permission is bounded here so it cannot carry anything else: no other
		// adapter's row, no unmet area, no register row.
		const { base } = changeRange(root, SENTINELS);
		const path = "conformance/coverage.json";
		type Account = {
			adapters: {
				adapter: string;
				status: string;
				matched: number;
				unmet: number;
				failed: number;
			}[];
			unmetCases: number;
			unmetAreas: unknown;
			registerRows?: unknown;
		};
		const atBase = JSON.parse(
			execFileSync("git", ["show", `${base}:${path}`], {
				cwd: root,
				encoding: "utf8",
				maxBuffer: 64 * 1024 * 1024,
			}),
		) as Account;
		const now = readJson(resolve(root, path)) as Account;

		expect(JSON.stringify(now.unmetAreas)).toBe(
			JSON.stringify(atBase.unmetAreas),
		);
		expect(now.adapters.map((one) => one.adapter)).toEqual(
			atBase.adapters.map((one) => one.adapter),
		);
		for (let index = 0; index < atBase.adapters.length; index += 1) {
			if (atBase.adapters[index].adapter === "rust-backend") continue;
			expect(
				JSON.stringify(now.adapters[index]),
				`adapter ${atBase.adapters[index].adapter} moved`,
			).toBe(JSON.stringify(atBase.adapters[index]));
		}
		const mine = now.adapters.find((one) => one.adapter === "rust-backend");
		expect(mine?.status).toBe("available");
		expect(mine?.failed).toBe(0);
		// Matched plus unmet is the case count either way; the slot cannot report
		// more answers than the corpus has cases.
		const before = atBase.adapters.find(
			(one) => one.adapter === "rust-backend",
		);
		expect((mine?.matched ?? 0) + (mine?.unmet ?? 0)).toBe(
			(before?.matched ?? 0) + (before?.unmet ?? 0),
		);
		expect(now.unmetCases).toBe(
			atBase.unmetCases - (before?.unmet ?? 0) + (mine?.unmet ?? 0),
		);
		// Every member the account carries beyond these is byte-identical.
		const strip = (value: Account) => {
			const copy = JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
			delete copy.adapters;
			delete copy.unmetCases;
			return JSON.stringify(copy);
		};
		expect(strip(now)).toBe(strip(atBase));
	});

	/** Traces: TC-740; NFR-023-AC-4, FR-054-CON-5. */
	it("TC-740 the frozen schemas, fixtures, packages, spikes and prototype backends are byte-unchanged", () => {
		const frozen = [
			"src/compiler/backends/rust.mjs",
			"src/compiler/backends/typescript.mjs",
			"src/compiler/backends/type-names.mjs",
			"src/compiler/backends/python-schema.mjs",
			"src/compiler/ir/reader.mjs",
			"src/compiler/ir/normalize.mjs",
			"src/compiler/inventory.json",
			"schema/semantic/v1/common.schema.json",
			"schema/semantic/v1/semantic-ir.schema.json",
			"fixtures/semantic/v1/positive/target-contracts.json",
			"fixtures/semantic/v1/target-verdicts.json",
			"conformance/corpus.json",
			"conformance/thresholds.json",
			"conformance/divergences.json",
			"conformance/contract-gaps.json",
			"conformance/cases/provenance/PROV-002.json",
		];
		const { base } = changeRange(root, SENTINELS);
		for (const path of frozen) {
			const atBase = execFileSync("git", ["show", `${base}:${path}`], {
				cwd: root,
				maxBuffer: 64 * 1024 * 1024,
			});
			expect(readFileSync(resolve(root, path)).equals(atBase), path).toBe(true);
		}
	});

	/** Traces: TC-741; NFR-023-AC-5. */
	it("TC-741 every crate manifest carries publish = false", () => {
		const manifests = ["Cargo.toml"];
		const cratesDir = resolve(root, "crates");
		if (existsSync(cratesDir)) {
			for (const name of readdirSync(cratesDir)) {
				const manifest = resolve(cratesDir, name, "Cargo.toml");
				if (existsSync(manifest)) manifests.push(`crates/${name}/Cargo.toml`);
			}
		}
		expect(manifests.length).toBeGreaterThan(1);
		for (const path of manifests) {
			const body = read(resolve(root, path));
			expect(
				/publish\s*=\s*false/.test(body) ||
					/publish\.workspace\s*=\s*true/.test(body),
				`${path} does not carry publish = false`,
			).toBe(true);
		}
	});

	/** Traces: TC-742; NFR-023-AC-6, NFR-023-AC-7. */
	it("TC-742 every added manifest is AGPL-3.0-only and every third-party crate is attributed", () => {
		expect(read(resolve(root, "Cargo.toml"))).toContain(
			'license = "AGPL-3.0-only"',
		);
		const notices = read(resolve(root, "THIRD-PARTY-NOTICES.md"));
		const lock = read(resolve(root, "Cargo.lock"));
		const workspaceMembers = new Set(
			readdirSync(resolve(root, "crates")).map((name) => `agent-ix-${name}`),
		);
		for (const match of lock.matchAll(LOCK_NAME)) {
			const crate = match[1];
			if (workspaceMembers.has(crate)) continue;
			expect(notices, `${crate} is in a lockfile and not attributed`).toContain(
				crate,
			);
		}
		// The notices file names an SPDX expression for every entry it carries.
		expect(notices).toContain("MIT OR Apache-2.0");
	});

	/** Traces: TC-743; NFR-023-AC-8. */
	it("TC-743 every permitted entry is named by a requirement or by this requirement's verification", () => {
		// NFR-023-AC-11: widening the list to absorb a failing gate is itself a
		// failure, rather than a matter of the author's word. Every permitted
		// pattern must be traceable to a path some spec artifact names.
		const specText = [
			...readdirSync(resolve(root, "spec/functional"))
				.filter((name) => /^FR-0(5[4-9]|6[0-2])-/.test(name))
				.map((name) => read(resolve(root, "spec/functional", name))),
			read(
				resolve(
					root,
					"spec/non-functional/NFR-023-non-disruptive-rust-backend.md",
				),
			),
			read(
				resolve(
					root,
					"spec/non-functional/NFR-022-deterministic-and-hermetic-rust-generation.md",
				),
			),
		].join("\n");
		// The witness is derived from the pattern itself rather than from a
		// hand-maintained map, because a map is one more place to add an entry
		// when the list is widened — which is exactly the move NFR-023-AC-11
		// exists to catch.
		const witnessOf = (pattern: string): string =>
			pattern
				.replace(/^\^/, "")
				.replace(/\$$/, "")
				.replace(/\[\^\/\]\*/g, "*")
				.replace(/\\\./g, ".")
				.replace(/\\\//g, "/");
		for (const pattern of PERMITTED) {
			const witness = witnessOf(pattern);
			expect(witness.length, pattern).toBeGreaterThan(0);
			expect(
				specText.includes(witness),
				`permitted path ${witness} is named by no requirement`,
			).toBe(true);
		}
	});

	/** Traces: TC-744; NFR-023-AC-9..NFR-023-AC-11. */
	it("TC-744 a later unrelated change adds no path to this change's set", () => {
		const scratch = temp("accretion");
		try {
			const run = (...args: string[]): void => {
				execFileSync("git", args, { cwd: scratch, stdio: "pipe" });
			};
			const write = (path: string, body: string): void => {
				mkdirSync(dirname(resolve(scratch, path)), { recursive: true });
				writeFileSync(resolve(scratch, path), body);
			};
			run("init", "--initial-branch=main");
			run("config", "user.email", "gate@example.invalid");
			run("config", "user.name", "gate");
			write("README.md", "base\n");
			run("add", "-A");
			run("commit", "-m", "base");

			// This change, squash-merged as one commit that adds both sentinels.
			write(SENTINELS[0], "# US-011\n");
			write(SENTINELS[1], "# support matrix\n");
			write(
				"src/compiler/backends/rust-serde/mapping.mjs",
				"export const map = () => {};\n",
			);
			run("add", "-A");
			run("commit", "-m", "the change");
			const mine = changedPathsUnion(scratch, SENTINELS);
			expect(mine).toEqual(
				[
					SENTINELS[1],
					SENTINELS[0],
					"src/compiler/backends/rust-serde/mapping.mjs",
				].sort(),
			);

			// A later ticket lands on top, adding exactly the paths this change
			// prohibits. The set does not move.
			write("conformance/cases/new/NEW-001.json", "{}\n");
			write("schema/semantic/v1/other.json", "{}\n");
			run("add", "-A");
			run("commit", "-m", "a later ticket");
			expect(changedPathsUnion(scratch, SENTINELS)).toEqual(mine);

			// A trunk merge inside the range contributes none of the trunk's paths.
			run("checkout", "-b", "trunk", "HEAD~2");
			write("docs/unrelated.md", "trunk work\n");
			run("add", "-A");
			run("commit", "-m", "trunk");
			run("checkout", "main");
			run("merge", "--no-ff", "-m", "merge trunk", "trunk");
			write(SENTINELS[1], "# support matrix, revised\n");
			run("add", "-A");
			run("commit", "-m", "after the merge");
			expect(changedPathsUnion(scratch, SENTINELS)).not.toContain(
				"docs/unrelated.md",
			);

			// And the gate still discriminates: a prohibited path in the working
			// tree at a path no later commit owns is still this change's.
			write("schema/semantic/v1/rogue.json", "{}\n");
			expect(changedPathsUnion(scratch, SENTINELS)).toContain(
				"schema/semantic/v1/rogue.json",
			);
			expect(isProhibited("schema/semantic/v1/rogue.json")).toBe(true);
		} finally {
			rmSync(scratch, { recursive: true, force: true });
		}
	});

	/** Traces: TC-744; NFR-023-AC-9..NFR-023-AC-11. */
	it("TC-744 the permitted and prohibited predicates discriminate", () => {
		// A constant list that accepts everything is decoration. These are the
		// cases the gate exists to catch.
		expect(isProhibited("schema/semantic/v1/common.schema.json")).toBe(true);
		expect(isProhibited("conformance/cases/reference/REF-001.json")).toBe(true);
		expect(isProhibited("conformance/thresholds.json")).toBe(true);
		expect(isProhibited("conformance/adapters/registry.json")).toBe(false);
		expect(isProhibited("test/compiler.test.ts")).toBe(true);
		expect(isProhibited("test/rust-backend.test.ts")).toBe(false);
		expect(isProhibited(".github/workflows/build-test.yml")).toBe(true);
		expect(isProhibited("src/compiler/backends/rust.mjs")).toBe(true);
		expect(isPermitted("src/compiler/backends/rust-serde/mapping.mjs")).toBe(
			true,
		);
		expect(isPermitted("src/compiler/pipeline.mjs")).toBe(false);
		expect(isPermitted("package.json")).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// The branch register, the property battery and the mutation catalogue
// ---------------------------------------------------------------------------

/**
 * These cases are the slice's closing census, and two of their conventions are
 * load bearing.
 *
 * Each case that exercises a mapping branch declares it in its own doc comment,
 * on a line naming the branch ids and terminated by a semicolon. `cli.mjs
 * register` reads those declarations and
 * binds them to the vocabularies — the mapping table, the applicability table,
 * the diagnostic registry and the derivation module — so a branch nobody
 * declared is an unmet register row and a failing check, and it is closed by
 * adding a case rather than by dropping the row.
 *
 * Each such case's body is one detector from `harness/detectors.mjs`, run here
 * against the working tree's modules and run again by the mutation harness
 * against a mutated scratch copy. Writing the assertion once is the point: a
 * detector the suite does not run is a mutation score nobody earned, and a case
 * the harness does not run is a detection claim nobody checked.
 *
 * The expectations are read from the mapping table and the applicability table
 * rather than from the emitter's own output (FR-062-CON-1). The one exception
 * is the corpus-bytes case, which compares a mutant against the pristine
 * emitter and is a change detector by construction; it is named as such, and no
 * register row rests on it alone.
 */
const backendDirectory = resolve(root, "src/compiler/backends/rust-serde");
const modulePathOf = (name: string): string =>
	`../src/compiler/backends/rust-serde/${name}`;

interface LoadedBackend {
	detectors: any;
	backend: any;
	options: any;
}

let loadedBackend: Promise<LoadedBackend> | undefined;

/**
 * Loads the backend once, with the corpus and the pristine bytes the
 * change-detector compares against.
 */
async function loadOnce(): Promise<LoadedBackend> {
	if (loadedBackend === undefined) {
		loadedBackend = (async (): Promise<LoadedBackend> => {
			const detectors = await import(modulePathOf("harness/detectors.mjs"));
			const cli = await import(modulePathOf("cli.mjs"));
			const crate = await import(modulePathOf("crate.mjs"));
			const licenseText = read(resolve(root, "LICENSE"));
			const bases = cli.corpusBases();
			const baseline = new Map<string, string>(
				bases.map((base: { name: string }) => {
					const result = crate.emitCrate(cli.requestFor(base), { licenseText });
					return [
						base.name,
						[...result.files]
							.map(([path, text]: [string, string]) => `${path}\n${text}`)
							.join(""),
					];
				}),
			);
			const published = readJson(
				resolve(root, "conformance/diagnostic-codes.json"),
			) as { codes: { code: string }[] };
			const options = {
				licenseText,
				bases,
				baseline,
				publishedCodes: published.codes.map((one) => one.code),
			};
			return {
				detectors,
				backend: await detectors.loadBackend(backendDirectory, options),
				options,
			};
		})();
	}
	return loadedBackend;
}

/** Runs one detector against the working tree. It throws, naming what it saw. */
async function runDetectorCase(caseId: string): Promise<void> {
	const { detectors, backend } = await loadOnce();
	const detector = detectors.DETECTORS.find(
		(one: { caseId: string }) => one.caseId === caseId,
	);
	expect(
		detector,
		`no detector is named "${caseId}", so this case asserts nothing`,
	).toBeDefined();
	detector.run(backend);
}

/** Every `it(...)` title in this suite, read from its own text. */
function suiteTitles(): Set<string> {
	const text = read(resolve(root, "test/rust-backend.test.ts"));
	const pattern = new RegExp(
		`\\bit\\(\\s*${DOUBLE}((?:[^${DOUBLE}\\\\]|\\\\.)*)${DOUBLE}`,
		"g",
	);
	return new Set([...text.matchAll(pattern)].map((match) => match[1]));
}

/** A digest of every file under a directory, for the non-disruption assertion. */
function treeDigest(directory: string): Map<string, string> {
	const digests = new Map<string, string>();
	const walk = (current: string): void => {
		for (const name of readdirSync(current).sort()) {
			const path = join(current, name);
			if (statSync(path).isDirectory()) {
				walk(path);
				continue;
			}
			digests.set(
				path,
				createHash("sha256").update(readFileSync(path)).digest("hex"),
			);
		}
	};
	walk(directory);
	return digests;
}

describe("TC-725..730 the branch register, the properties and the mutation catalogue", () => {
	/**
	 * Traces: TC-725; FR-062-AC-1, FR-062-AC-8.
	 *
	 * Branches: kind:alias, kind:enum, kind:map, kind:record, kind:reference,
	 * kind:scalar, kind:sequence, kind:union;
	 */
	it("TC-725 every kind row selects the Rust form the mapping table states", async () => {
		await runDetectorCase(
			"TC-725 every kind row selects the Rust form the mapping table states",
		);
	});

	/**
	 * Traces: TC-725; FR-062-AC-1, FR-062-AC-8.
	 *
	 * Branches: scalar:boolean, scalar:bytes, scalar:date, scalar:datetime,
	 * scalar:duration, scalar:integer, scalar:number, scalar:string,
	 * scalar:uuid;
	 */
	it("TC-725 every kernel scalar maps to the Rust base the mapping table states", async () => {
		await runDetectorCase(
			"TC-725 every kernel scalar maps to the Rust base the mapping table states",
		);
	});

	/**
	 * Traces: TC-725; FR-062-AC-1, FR-062-AC-8, FR-062-AC-11.
	 *
	 * Branches: field:collection/non-null/optional,
	 * field:collection/non-null/required,
	 * field:collection/nullable/optional,
	 * field:collection/nullable/required, field:multiplicity/upper-zero,
	 * field:single/non-null/optional, field:single/non-null/required,
	 * field:single/nullable/optional, field:single/nullable/required;
	 */
	it("TC-725 the eight field-axis rows produce the member type and the serde attributes the table states", async () => {
		await runDetectorCase(
			"TC-725 the eight field-axis rows produce the member type and the serde attributes the table states",
		);
	});

	/**
	 * Traces: TC-725; FR-062-AC-1, FR-062-AC-8.
	 *
	 * Branches: unknownPolicy:inert, unknownPolicy:record/preserve,
	 * unknownPolicy:record/reject, unknownPolicy:record/surface,
	 * unknownPolicy:variants/preserve, unknownPolicy:variants/reject,
	 * unknownPolicy:variants/surface;
	 */
	it("TC-725 the unknownPolicy rows dispose each of the eight kinds exactly once", async () => {
		await runDetectorCase(
			"TC-725 the unknownPolicy rows dispose each of the eight kinds exactly once",
		);
	});

	/**
	 * Traces: TC-725; FR-062-AC-1, FR-062-AC-8.
	 *
	 * Branches: defaultKind:migration, defaultKind:none,
	 * defaultKind:representation, defaultKind:semantic, extension:node,
	 * metadata:contract;
	 */
	it("TC-725 every defaultKind, extension and metadata row reaches the emitted crate", async () => {
		await runDetectorCase(
			"TC-725 every defaultKind, extension and metadata row reaches the emitted crate",
		);
	});

	/**
	 * Traces: TC-725; FR-062-AC-1, FR-062-AC-8, FR-062-AC-12.
	 *
	 * Branches: indirection:alias-target, indirection:field-collection,
	 * indirection:field-single, indirection:map-values,
	 * indirection:operation-edge, indirection:reference-target,
	 * indirection:sequence-items, indirection:variant-payload;
	 */
	it("TC-725 every indirection row materializes at the position the table names", async () => {
		await runDetectorCase(
			"TC-725 every indirection row materializes at the position the table names",
		);
	});

	/**
	 * Traces: TC-725; FR-062-AC-1, FR-062-AC-8.
	 *
	 * Branches: constraint:enumValues/boolean, constraint:enumValues/bytes,
	 * constraint:enumValues/date, constraint:enumValues/datetime,
	 * constraint:enumValues/duration, constraint:enumValues/integer,
	 * constraint:enumValues/number, constraint:enumValues/string,
	 * constraint:enumValues/uuid, constraint:exclusiveMax/date,
	 * constraint:exclusiveMax/datetime,
	 * constraint:exclusiveMax/duration, constraint:exclusiveMax/integer,
	 * constraint:exclusiveMax/number, constraint:exclusiveMin/date,
	 * constraint:exclusiveMin/datetime,
	 * constraint:exclusiveMin/duration, constraint:exclusiveMin/integer,
	 * constraint:exclusiveMin/number, constraint:format/string,
	 * constraint:max/date, constraint:max/datetime,
	 * constraint:max/duration, constraint:max/integer,
	 * constraint:max/number, constraint:maxLength/bytes,
	 * constraint:maxLength/string, constraint:min/date,
	 * constraint:min/datetime, constraint:min/duration,
	 * constraint:min/integer, constraint:min/number,
	 * constraint:minLength/bytes, constraint:minLength/string,
	 * constraint:nonEmpty/bytes, constraint:nonEmpty/map,
	 * constraint:nonEmpty/sequence, constraint:nonEmpty/string,
	 * constraint:pattern/string, constraint:unique/sequence;
	 */
	it("TC-725 every constraint keyword lowers onto every subject its applicability row admits", async () => {
		await runDetectorCase(
			"TC-725 every constraint keyword lowers onto every subject its applicability row admits",
		);
	});

	/**
	 * Traces: TC-725; FR-062-AC-1, FR-062-AC-8.
	 *
	 * Branches: diagnostic:agent-ix.rust-backend.DECLARED_LOSS,
	 * diagnostic:agent-ix.rust-backend.DIAGNOSTIC_LIMIT_REACHED,
	 * diagnostic:agent-ix.rust-backend.INVALID_DEFAULT_VALUE,
	 * diagnostic:agent-ix.rust-backend.LIMIT_EXCEEDED,
	 * diagnostic:agent-ix.rust-backend.NAME_COLLISION,
	 * diagnostic:agent-ix.rust-backend.PAYLOAD_ON_ENUM_VARIANT,
	 * diagnostic:agent-ix.rust-backend.UNDECLARED_WIRE_FORM,
	 * diagnostic:agent-ix.rust-backend.UNKNOWN_FORMAT,
	 * diagnostic:agent-ix.rust-backend.UNKNOWN_MEMBER_SURFACED,
	 * diagnostic:agent-ix.rust-backend.UNORDERED_SUBJECT,
	 * diagnostic:agent-ix.rust-backend.UNRENDERABLE_NAME,
	 * diagnostic:agent-ix.rust-backend.UNSAFE_OUTPUT_ROOT,
	 * diagnostic:agent-ix.rust-backend.UNSUPPORTED_CONSTRUCT,
	 * diagnostic:agent-ix.rust-backend.UNSUPPORTED_MULTIPLICITY,
	 * diagnostic:agent-ix.rust-backend.UNSUPPORTED_PATTERN,
	 * diagnostic:agent-ix.rust-backend.UNSUPPORTED_SCALAR,
	 * diagnostic:agent-ix.semantic-ir.CONSTRAINT_NOT_APPLICABLE,
	 * diagnostic:agent-ix.semantic-ir.INVALID_OPERAND,
	 * diagnostic:agent-ix.semantic-ir.UNDECLARED_LOSS,
	 * diagnostic:agent-ix.semantic-ir.UNKNOWN_REQUIRED_EXTENSION,
	 * diagnostic:agent-ix.semantic-ir.UNRESOLVED_TYPE_REF,
	 * diagnostic:agent-ix.semantic-ir.V1_1_NODE_IN_V1_0;
	 */
	it("TC-725 every registered diagnostic code is disposed as its severity requires and named by a live path", async () => {
		await runDetectorCase(
			"TC-725 every registered diagnostic code is disposed as its severity requires and named by a live path",
		);
	});

	/**
	 * Traces: TC-725; FR-062-AC-1, FR-062-AC-8.
	 *
	 * Branches: name:constantName, name:crateName, name:memberName,
	 * name:moduleName, name:typeName, name:variantName,
	 * scope:CRATE_TYPES, scope:ENUM_VARIANTS, scope:OPERATION_PARAMS,
	 * scope:RECORD_MEMBERS;
	 */
	it("TC-725 every identifier renderer derives from the source the requirement names and refuses a collision", async () => {
		await runDetectorCase(
			"TC-725 every identifier renderer derives from the source the requirement names and refuses a collision",
		);
	});

	/** Traces: TC-725; FR-062-AC-1, FR-062-CON-1. */
	it("TC-725 a bound and a length render the comparison their keyword names", async () => {
		await runDetectorCase(
			"TC-725 a bound and a length render the comparison their keyword names",
		);
	});

	/** Traces: TC-725; FR-062-AC-1, FR-062-CON-1. */
	it("TC-725 a record that rejects unknown members denies unknown fields and one that retains them flattens", async () => {
		await runDetectorCase(
			"TC-725 a record that rejects unknown members denies unknown fields and one that retains them flattens",
		);
	});

	/** Traces: TC-725; FR-062-AC-1, FR-062-CON-1. */
	it("TC-725 a pattern outside the expressible subset is classified unsupported and refused", async () => {
		await runDetectorCase(
			"TC-725 a pattern outside the expressible subset is classified unsupported and refused",
		);
	});

	/** Traces: TC-725; FR-062-AC-1, FR-062-CON-1. */
	it("TC-725 an operation's parameter and return metadata carry the mapped type its axes state", async () => {
		await runDetectorCase(
			"TC-725 an operation's parameter and return metadata carry the mapped type its axes state",
		);
	});

	/** Traces: TC-727; FR-062-AC-3. */
	it("TC-727 the corpus bases emit the bytes the pristine emitter produced", async () => {
		await runDetectorCase(
			"TC-727 the corpus bases emit the bytes the pristine emitter produced",
		);
	});

	/** Traces: TC-729; FR-062-AC-6, FR-062-AC-10. */
	it("TC-729 the degradation scan names a declaration that carries a degraded type", async () => {
		await runDetectorCase(
			"TC-729 the degradation scan names a declaration that carries a degraded type",
		);
	});
	/** Traces: TC-725; FR-062-AC-1. */
	it("TC-725 every register row names a case the suite carries, and the register is not stale", async () => {
		const branchRegister = await import(modulePathOf("branch-register.mjs"));
		const suiteText = read(resolve(root, "test/rust-backend.test.ts"));
		const committed = read(join(backendDirectory, "branch-register.json"));
		const gaps = readJson(resolve(root, "conformance/contract-gaps.json")) as {
			gaps: { id: string; owningIssue: string }[];
		};
		const { problems, register } = branchRegister.checkRegister({
			directory: backendDirectory,
			suiteText,
			committed,
			gaps,
		});
		expect(problems, problems.join("\n")).toEqual([]);
		expect(register.rowCount).toBeGreaterThan(100);
		expect(register.unmetCount).toBe(0);
		const titles = suiteTitles();
		const declaredGaps = new Set(gaps.gaps.map((one) => one.id));
		for (const row of register.rows as {
			branchId: string;
			cases: string[];
			unreachable?: { gap: string; owner: string; reason: string };
		}[]) {
			if (row.unreachable !== undefined) {
				// A branch no published input can reach is recorded, not covered
				// and not dropped: it names the gap that makes it unreachable, the
				// issue that owns it, and no case. The citation is resolved here,
				// so a reason that stops being true stops passing.
				expect(row.cases).toEqual([]);
				expect(
					declaredGaps.has(row.unreachable.gap),
					`the branch ${row.branchId} cites ${row.unreachable.gap}, which the contract-gap register does not declare`,
				).toBe(true);
				expect(row.unreachable.owner).toMatch(/#\d+$/);
				expect(row.unreachable.reason.length).toBeGreaterThan(40);
				continue;
			}
			expect(
				row.cases.length,
				`the branch ${row.branchId} names no case; close it by adding a case, never by dropping the row`,
			).toBeGreaterThan(0);
			for (const caseId of row.cases) {
				expect(
					titles.has(caseId),
					`the branch ${row.branchId} names the case "${caseId}", which this suite does not carry`,
				).toBe(true);
			}
		}
		// The unreachable record is not an escape hatch: exactly the branches
		// `branches.mjs` declares unreachable are recorded so, and a row that
		// claimed both a reason and a case would have failed above.
		const branches = await import(modulePathOf("branches.mjs"));
		expect(
			(register.rows as { branchId: string; unreachable?: unknown }[])
				.filter((one) => one.unreachable !== undefined)
				.map((one) => one.branchId)
				.sort(),
		).toEqual(
			(branches.UNREACHABLE_BRANCHES as { branchId: string }[])
				.map((one) => one.branchId)
				.sort(),
		);
	});

	/** Traces: TC-726; FR-062-AC-2, FR-062-CON-4. */
	it("TC-726 a branch added without a case fails the register check naming the branch", async () => {
		const mutations = await import(modulePathOf("mutations.mjs"));
		const { base, backend } = mutations.scratchCopy(root, "register-gate");
		try {
			// The scratch copy carries this suite, because the register binds to
			// it; the branch added below is named by no case in it.
			mkdirSync(join(base, "test"), { recursive: true });
			writeFileSync(
				join(base, "test", "rust-backend.test.ts"),
				read(resolve(root, "test/rust-backend.test.ts")),
				"utf8",
			);
			const tablePath = join(backend, "mapping-table.json");
			const table = JSON.parse(read(tablePath)) as { rows: unknown[] };
			table.rows.push({
				rowKey: "kind:widget",
				axis: "kind",
				selector: "widget",
				rustForm: "pub struct N;",
				serdeAttributes: [],
				mechanism:
					"a branch this case adds, and for which it deliberately writes no test",
				diagnosticCode: null,
			});
			writeFileSync(
				tablePath,
				`${JSON.stringify(table, null, "\t")}\n`,
				"utf8",
			);

			const result = spawnSync(
				process.execPath,
				[join(backend, "cli.mjs"), "register", "--check"],
				{ encoding: "utf8" },
			);
			expect(result.status).toBe(1);
			expect(result.stderr).toContain("kind:widget");
			expect(result.stderr).toContain("unmet");
			// And the same run over the unmutated copy passes, so the failure is
			// the added branch and not the copy.
			const clean = mutations.scratchCopy(root, "register-clean");
			try {
				mkdirSync(join(clean.base, "test"), { recursive: true });
				writeFileSync(
					join(clean.base, "test", "rust-backend.test.ts"),
					read(resolve(root, "test/rust-backend.test.ts")),
					"utf8",
				);
				const ok = spawnSync(
					process.execPath,
					[join(clean.backend, "cli.mjs"), "register", "--check"],
					{ encoding: "utf8" },
				);
				expect(ok.stderr, ok.stderr).toBe("");
				expect(ok.status).toBe(0);
			} finally {
				rmSync(clean.base, { recursive: true, force: true });
			}
		} finally {
			rmSync(base, { recursive: true, force: true });
		}
	}, 60000);

	/** Traces: TC-726; FR-062-AC-14, FR-062-CON-7. */
	it("TC-726 make lint reaches both check modes through a Make target calling node, and package.json carries no script for them", () => {
		// `package.json` is a prohibited path under NFR-023, so the checks reach
		// `make lint` through the Makefile and through nothing else.
		const manifest = readJson(resolve(root, "package.json")) as {
			scripts: Record<string, string>;
		};
		for (const [name, script] of Object.entries(manifest.scripts)) {
			expect(
				script.includes("rust-serde"),
				`the package manifest's \`${name}\` script reaches the Rust backend, and package.json is a prohibited path`,
			).toBe(false);
		}
		expect(isProhibited("package.json")).toBe(true);

		// The `lint` recipe, and the recipes of the targets it depends on: `make
		// lint` reaches a check through either.
		const makefile = read(resolve(root, "Makefile"));
		const recipeOf = (target: string): string => {
			const pattern = new RegExp(
				`^${target}:([^\\n]*)\\n((?:\\t[^\\n]*\\n)*)`,
				"m",
			);
			const found = pattern.exec(makefile);
			return found === null ? "" : `${found[1]}\n${found[2]}`;
		};
		const lint = recipeOf("lint");
		expect(
			lint.length,
			"the Makefile carries no `lint` target",
		).toBeGreaterThan(0);
		const prerequisites = lint
			.split("\n")[0]
			.trim()
			.split(/\s+/)
			.filter((one) => one.length > 0);
		const reached = [lint, ...prerequisites.map(recipeOf)].join("\n");
		for (const verb of ["register --check", "mutations --check"]) {
			expect(
				reached.includes(
					`node src/compiler/backends/rust-serde/cli.mjs ${verb}`,
				),
				`\`make lint\` does not reach \`cli.mjs ${verb}\`; add it to the lint recipe or to a target lint depends on, calling node directly`,
			).toBe(true);
		}
	});

	/** Traces: TC-727; FR-062-AC-3, FR-062-CON-5. */
	it("TC-727 every catalogued mutation is detected by at least one case and the detection score is 1.0", async () => {
		const mutations = await import(modulePathOf("mutations.mjs"));
		const { detectors, options } = await loadOnce();
		const catalogue = mutations.buildCatalogue({ directory: backendDirectory });
		expect(catalogue.mutationCount).toBeGreaterThan(10);
		const run = await mutations.runCatalogue({
			root,
			catalogue,
			detectors,
			backendOptions: options,
		});
		expect(
			run.undetected,
			`no case detects: ${run.undetected.join(", ")}. Close the gap by adding a case, never by removing the mutation.`,
		).toEqual([]);
		expect(run.score).toBe(1);
		expect(run.total).toBe(catalogue.mutationCount);
		// A mutation that could not be applied was never tried, and an entry that
		// is never tried is not a mutation the score speaks for. It is reported
		// as its own outcome and it fails this case rather than quietly moving
		// the denominator.
		expect(
			run.inapplicable,
			`never applied, so never tried: ${run.inapplicable.join(", ")}`,
		).toEqual([]);
		expect(run.applied).toBe(catalogue.mutationCount);
	}, 300000);

	/** Traces: TC-727; FR-062-AC-4. */
	it("TC-727 suppressing the case that detects a mutation drops the score below 1.0 and names it", async () => {
		const mutations = await import(modulePathOf("mutations.mjs"));
		const { detectors, options } = await loadOnce();
		const catalogue = readJson(join(backendDirectory, "mutations.json")) as {
			mutations: { mutationId: string; detectedBy: string[] }[];
		};
		// The mutation the fewest cases detect: suppressing that set is the
		// sharpest form of the criterion, and it is read off the catalogue
		// rather than named here, so it follows the suite as cases are added.
		const singly = [...catalogue.mutations].sort(
			(left, right) => left.detectedBy.length - right.detectedBy.length,
		)[0];
		expect(
			singly,
			"the catalogue records no mutation at all, so suppression cannot be measured",
		).toBeDefined();
		expect(singly.detectedBy.length).toBeGreaterThan(0);
		const suppressed = await mutations.runCatalogue({
			root,
			catalogue: mutations.buildCatalogue({ directory: backendDirectory }),
			detectors,
			backendOptions: options,
			suppress: (singly as { detectedBy: string[] }).detectedBy,
		});
		expect(suppressed.score).toBeLessThan(1);
		expect(suppressed.undetected).toContain(
			(singly as { mutationId: string }).mutationId,
		);
	}, 300000);

	/** Traces: TC-728; FR-062-AC-5, FR-062-AC-11, FR-062-AC-12, FR-062-AC-13, FR-062-CON-3. */
	it("TC-728 every declared property holds over at least 256 generated documents, with the seed printed", async () => {
		const properties = await import(modulePathOf("properties.mjs"));
		const run = properties.runProperties({
			count: 256,
			licenseText: read(resolve(root, "LICENSE")),
		});
		for (const result of run.results as {
			id: string;
			ok: boolean;
			documents: number;
			failure?: string;
		}[]) {
			expect(result.ok, `${result.id}: ${result.failure}`).toBe(true);
			expect(result.documents).toBeGreaterThanOrEqual(256);
		}
		// The nine properties FR-062 declares, named rather than counted.
		expect(
			(run.results as { id: string }[]).map((one) => one.id).sort(),
		).toEqual(
			[
				"axis-types-distinct",
				"boxed-edges-stable",
				"deterministic-generation",
				"emit-or-refuse",
				"locale-independent-derivation",
				"name-injectivity",
				"no-degraded-declaration",
				"reordering-invariant",
				"serialization-round-trip",
			].sort(),
		);
		expect(Number.isInteger(run.seed)).toBe(true);
		// A counter-example is reproduced from the message alone.
		const failure = new properties.PropertyFailure(
			"axis-types-distinct",
			7,
			3,
			"why",
		);
		expect(failure.message).toContain("--seed 7");
		expect(failure.message).toContain("document 3");
		// A run that cannot resolve its seed, its count or its generator fails
		// rather than skipping.
		expect(() => properties.runProperties({ seed: "not-a-seed" })).toThrow(
			/could not resolve a seed/,
		);
		expect(() => properties.runProperties({ count: 0 })).toThrow(
			/could not resolve a document count/,
		);
		expect(() =>
			properties.runProperties({ only: "no-such-property" }),
		).toThrow(/no property is named/);
	}, 300000);

	/** Traces: TC-729; FR-062-AC-6, FR-062-AC-10. */
	it("TC-729 an emitter that substitutes String for a constrained scalar fails the degradation scan and a property", async () => {
		const mutations = await import(modulePathOf("mutations.mjs"));
		const { detectors, options } = await loadOnce();
		const { base, backend } = mutations.scratchCopy(root, "negative-control");
		try {
			const operator = mutations.OPERATORS.find(
				(one: { id: string }) => one.id === "substitute-string-for-newtype",
			);
			const path = join(backend, "mapping.mjs");
			const applied = mutations.applyOperator(operator, read(path));
			expect(
				applied,
				"the substitution operator found no site, so the negative control could not be built",
			).toBeDefined();
			writeFileSync(path, applied.mutated, "utf8");

			const broken = await detectors.loadBackend(backend, options);
			const ir = broken.generator.generateDocument(
				broken.generator.DEFAULT_SEED,
				0,
			);
			const model = broken.mapping.mapDocument(ir, {}).model;
			expect(
				model,
				"the broken emitter refused its own document",
			).toBeDefined();
			// The scan fails, and it names the degraded declaration rather than
			// reporting a count. A scan that stays green here is not evidence.
			const degraded = broken.degradation.scanDegradation(model, broken.table);
			expect(degraded.length).toBeGreaterThan(0);
			expect(
				degraded.map((one: { observed: string }) => one.observed),
			).toContain("String");
			const described = broken.degradation
				.describeDegradation(degraded)
				.join("\n");
			expect(described).toContain("scalar:date");
			expect(described).toContain("crate::support::Date");

			// And at least one property fails under it.
			const run = broken.properties.runProperties({
				count: 8,
				licenseText: "",
			});
			expect((run.failures as { id: string }[]).map((one) => one.id)).toContain(
				"no-degraded-declaration",
			);

			// And the catalogue records the mutation with the case that detects it.
			const catalogue = readJson(join(backendDirectory, "mutations.json")) as {
				mutations: { mutationId: string; detectedBy: string[] }[];
			};
			const row = catalogue.mutations.find(
				(one) => one.mutationId === "substitute-string-for-newtype@mapping.mjs",
			);
			expect(
				row,
				"the catalogue carries no substitution mutation",
			).toBeDefined();
			expect(
				(row as { detectedBy: string[] }).detectedBy.length,
			).toBeGreaterThan(0);
		} finally {
			rmSync(base, { recursive: true, force: true });
		}
	}, 120000);

	/** Traces: TC-730; FR-062-AC-7, FR-062-CON-2. */
	it("TC-730 the mutation run writes only to a scratch copy and leaves the working tree unchanged", async () => {
		const mutations = await import(modulePathOf("mutations.mjs"));
		const { detectors, options } = await loadOnce();
		const status = (): string =>
			execFileSync("git", ["status", "--porcelain"], {
				cwd: root,
				encoding: "utf8",
			});
		// Both halves of FR-062-AC-7. The run must not change the tree, which is
		// asserted file by file as well as through git; and a run over a clean
		// tree must leave `git status --porcelain` empty, which is the form the
		// criterion takes in CI. Asserting emptiness unconditionally would fail
		// on an author's unrelated edit, which is a fact about the checkout
		// rather than about the harness.
		const before = status();
		const digestsBefore = treeDigest(backendDirectory);
		await mutations.runCatalogue({
			root,
			catalogue: mutations.buildCatalogue({ directory: backendDirectory }),
			detectors,
			backendOptions: options,
		});
		const after = status();
		expect(after).toBe(before);
		expect([...treeDigest(backendDirectory)]).toEqual([...digestsBefore]);
		if (before === "") expect(after).toBe("");
	}, 300000);

	/** Traces: TC-730; FR-062-AC-8. */
	it("TC-730 the register is checked against the vocabularies rather than against itself", async () => {
		const branches = await import(modulePathOf("branches.mjs"));
		const diagnostics = await import(modulePathOf("diagnostics.mjs"));
		const applicability = await import("../src/compiler/ir/applicability.mjs");
		const register = readJson(
			join(backendDirectory, "branch-register.json"),
		) as {
			rows: { branchId: string; vocabulary: string }[];
			contributions: Record<string, number>;
		};
		const ids = new Set(register.rows.map((one) => one.branchId));

		// Every mapping-table row: kind, kernel scalar, field-axis combination,
		// unknownPolicy, defaultKind, extension, metadata and recursion shape.
		const table = readJson(join(backendDirectory, "mapping-table.json")) as {
			rows: { rowKey: string; axis: string }[];
		};
		for (const row of table.rows) {
			expect(
				ids.has(row.rowKey),
				`the register carries no row for ${row.rowKey}`,
			).toBe(true);
		}
		for (const axis of [
			"kind",
			"scalar",
			"field",
			"unknownPolicy",
			"defaultKind",
			"extension",
			"metadata",
			"indirection",
		]) {
			expect(
				table.rows.some((row) => row.axis === axis),
				`the mapping table declares no ${axis} axis`,
			).toBe(true);
		}
		// Every constraint keyword against every subject its applicability row
		// admits.
		let pairs = 0;
		for (const [keyword, subjects] of Object.entries(
			applicability.KEYWORD_APPLICABILITY as Record<string, string[]>,
		)) {
			for (const subject of subjects) {
				expect(
					ids.has(`constraint:${keyword}/${subject}`),
					`the register carries no row for \`${keyword}\` on a ${subject} subject`,
				).toBe(true);
				pairs += 1;
			}
		}
		expect(pairs).toBe(40);
		// Every diagnostic code, in both namespaces.
		for (const entry of diagnostics.REGISTERED_ENTRIES as { code: string }[]) {
			expect(
				ids.has(`diagnostic:${entry.code}`),
				`the register carries no row for ${entry.code}`,
			).toBe(true);
		}
		// Every name-derivation case, read from the derivation module's exports.
		for (const renderer of branches.renderers() as string[]) {
			expect(ids.has(`name:${renderer}`)).toBe(true);
		}
		// And nothing else: the register is exactly the vocabularies' census, so
		// a row cannot be added to it by hand to make a count look better.
		const enumerated = branches
			.enumerateBranches(branches.readMappingTable(backendDirectory))
			.map((one: { branchId: string }) => one.branchId)
			.sort();
		expect([...ids].sort()).toEqual(enumerated);
		expect(
			Object.values(register.contributions).reduce((a, b) => a + b, 0),
		).toBe(register.rows.length);
	});

	/** Traces: TC-730; FR-062-AC-9, FR-062-CON-5. */
	it("TC-730 the catalogue equals the operator set crossed with the target set, and shrinking either shrinks it", async () => {
		const mutations = await import(modulePathOf("mutations.mjs"));
		const committed = readJson(join(backendDirectory, "mutations.json")) as {
			operators: { id: string }[];
			targets: string[];
			mutations: { mutationId: string; operator: string; target: string }[];
		};
		const rebuilt = mutations.buildCatalogue({ directory: backendDirectory });
		expect(
			mutations.serializeCatalogue(mutations.structureOf(rebuilt)),
			"mutations.json is stale: regenerate it with `cli.mjs mutations`",
		).toBe(mutations.serializeCatalogue(mutations.structureOf(committed)));

		// The eleven operators FR-062 declares, by what each edit does.
		expect(committed.operators.map((one) => one.id).sort()).toEqual(
			[
				"drop-blocking-flag",
				"drop-box-at-cycle-edge",
				"drop-deserialize-with",
				"drop-option-wrapper",
				"drop-serde-rename",
				"drop-skip-serializing-if",
				"flip-deny-unknown-fields",
				"invert-bound-comparison",
				"relax-pattern-classification",
				"substitute-string-for-newtype",
				"widen-applicability-row",
			].sort(),
		);
		// Every entry is an (operator, target) pair drawn from the two declared
		// sets, and every pair is distinct.
		const targets = new Set(committed.targets);
		const operators = new Set(committed.operators.map((one) => one.id));
		for (const mutation of committed.mutations) {
			expect(operators.has(mutation.operator)).toBe(true);
			expect(targets.has(mutation.target)).toBe(true);
			expect(mutation.mutationId).toBe(
				`${mutation.operator}@${mutation.target}`,
			);
		}
		expect(new Set(committed.mutations.map((one) => one.mutationId)).size).toBe(
			committed.mutations.length,
		);
		// Each operator admits at least one pair, so removing any one of them
		// shrinks the catalogue rather than leaving it unchanged.
		for (const operator of committed.operators) {
			const smaller = mutations.buildCatalogue({
				directory: backendDirectory,
				operators: (mutations.OPERATORS as { id: string }[]).filter(
					(one) => one.id !== operator.id,
				),
			});
			expect(
				smaller.mutationCount,
				`removing the operator \`${operator.id}\` does not shrink the catalogue`,
			).toBeLessThan(committed.mutations.length);
			expect(
				mutations.serializeCatalogue(mutations.structureOf(smaller)),
			).not.toBe(
				mutations.serializeCatalogue(mutations.structureOf(committed)),
			);
		}
		// And so does removing a module from the target set.
		for (const target of committed.targets.filter((one) =>
			committed.mutations.some((entry) => entry.target === one),
		)) {
			const smaller = mutations.buildCatalogue({
				directory: backendDirectory,
				targets: committed.targets.filter((one) => one !== target),
			});
			expect(
				smaller.mutationCount,
				`removing the target \`${target}\` does not shrink the catalogue`,
			).toBeLessThan(committed.mutations.length);
		}
		// The target set is the emitter's own import closure plus the tables
		// pinned beside it, computed rather than listed.
		const closure = mutations.emitterClosure(backendDirectory) as string[];
		for (const module of closure) expect(targets.has(module)).toBe(true);
		expect(closure).toContain("crate.mjs");
		expect(closure).toContain("mapping.mjs");
		expect(targets.has("mapping-table.json")).toBe(true);
		expect(targets.has("support-template.rs")).toBe(true);
		// The gate's own outputs are not modules of the emitter and are not
		// targets: mutating an output measures nothing.
		expect(targets.has("mutations.json")).toBe(false);
		expect(targets.has("branch-register.json")).toBe(false);
	}, 60000);
});
