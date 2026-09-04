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

import { execFileSync } from "node:child_process";
import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	readdirSync,
	rmSync,
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
	"^test/fixtures/rust-serde/",
	"^test/changed-paths\\.ts$",
	"^docs/semantic-data-system/rust-backend[^/]*\\.md$",
	"^docs/semantic-data-system/index\\.md$",
	"^docs/semantic-data-system/roadmap\\.md$",
	"^scripts/build-rust-backend-docs\\.mjs$",
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
function isOtherSuite(path: string): boolean {
	return /^test\/.*\.test\.ts$/.test(path) && !/^test\/rust-backend/.test(path);
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
 * Two patterns built from `RegExp` rather than written as literals.
 *
 * A regex literal carrying an odd number of quote characters desynchronises a
 * scanner that tracks string state but does not tokenise regex literals: the
 * quote inside the pattern opens a string that never closes, and every brace
 * after it is miscounted. The consequence is not a warning — it is that the
 * file's trace tags bind nothing at all.
 */
const CODE_AS_LITERAL = new RegExp(
	`[${[DOUBLE, SINGLE, BACKTICK].map((mark) => mark).join("")}]agent-ix\\.rust-backend\\.`,
);
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
	it("TC-691 every code the registry carries is in the rust-backend namespace and is frozen", async () => {
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
			expect(entry.code).toMatch(/^agent-ix\.rust-backend\.[A-Z][A-Z0-9_]+$/);
			expect(entry.owner).toBe(ix("agent-ix/filament-core-data/rust-backend"));
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
	it("TC-691 no live generator path spells a code as a string literal", () => {
		const directory = resolve(root, "src/compiler/backends/rust-serde");
		if (!existsSync(directory)) return expect(existsSync(directory)).toBe(true);
		for (const name of readdirSync(directory)) {
			if (!name.endsWith(".mjs") || name === "diagnostics.mjs") continue;
			const source = read(resolve(directory, name))
				.split("\n")
				.filter((line) => !COMMENT_LINE.test(line))
				.join("\n");
			expect(
				source,
				`${name} spells a diagnostic code as a literal`,
			).not.toMatch(CODE_AS_LITERAL);
		}
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
