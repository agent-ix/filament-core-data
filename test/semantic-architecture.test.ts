import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { changedPathsOf } from "./changed-paths.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const architectureRoot = resolve(root, "docs/semantic-data-system");
const allowedStatuses = new Set([
	"normative",
	"provisional",
	"informative",
	"historical",
]);

const requiredArtifacts = [
	"index.md",
	"principles.md",
	"terminology.md",
	"authority.md",
	"ownership.md",
	"metamodel.md",
	"generated-packages.md",
	"representations-and-transformations.md",
	"compatibility.md",
	"typespec-feasibility.md",
	"corpus-review-method.md",
	"roadmap.md",
	"conflicts.md",
	"adr/index.md",
	"adr/0001-concern-specific-authority.md",
	"adr/0002-generated-package-ownership.md",
	"adr/0003-best-fit-representations.md",
	"adr/0004-conditional-typespec-source.md",
	"adr/0005-typespec-structural-source.md",
] as const;

type Frontmatter = Record<string, string>;

function readArchitectureFile(path: string): string {
	return readFileSync(resolve(architectureRoot, path), "utf8");
}

function frontmatter(document: string): Frontmatter {
	const match = /^---\n([\s\S]*?)\n---/.exec(document);
	if (!match) return {};

	return Object.fromEntries(
		match[1]
			.split("\n")
			.map((line) => /^([a-z_]+):\s*["']?([^"']*?)["']?\s*$/.exec(line))
			.filter((entry): entry is RegExpExecArray => entry !== null)
			.map((entry) => [entry[1], entry[2]]),
	);
}

function architectureLinks(path: string, document: string): string[] {
	return [...document.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)]
		.map((match) => match[1])
		.filter(
			(target) =>
				!target.startsWith("#") &&
				!target.startsWith("https://") &&
				!target.startsWith("http://") &&
				!target.startsWith("ix://") &&
				!target.startsWith("mailto:"),
		)
		.map((target) =>
			resolve(architectureRoot, dirname(path), target.split("#", 1)[0]),
		);
}

function assertAcyclicSuccessors(
	edges: ReadonlyMap<string, readonly string[]>,
): void {
	for (const successors of edges.values()) {
		if (successors.length > 1) {
			throw new Error("a historical decision has multiple current successors");
		}
	}

	for (const start of edges.keys()) {
		const visited = new Set<string>();
		let current: string | undefined = start;
		while (current !== undefined) {
			if (visited.has(current)) {
				throw new Error(`supersession cycle detected at ${current}`);
			}
			visited.add(current);
			current = edges.get(current)?.[0];
		}
	}
}

function changedPaths(): string[] {
	// Issue #51, fixed by issue #23. This gate used to resolve its range
	// from a moving `main`, which is the quiet face of the defect issue #27
	// met: once the change this suite guards merges, the range empties, the
	// loop below iterates zero times, and every prohibition passes over
	// nothing. Left open it is also the accreting face — the range annexes a
	// later ticket's paths, and the only way to keep it green is to widen the
	// permitted list below, which issue #55 records as how these guards were
	// disabled incrementally.
	//
	// Both ends now come from history. The sentinel is the file issue #8's own
	// change created — confirmed with `git log --diff-filter=A -1`, which names
	// 3722184 — so the range is that change's commit, it survives the squash
	// merge, and it disappears (failing loudly) if the change is reverted.
	return changedPathsOf(root, "docs/semantic-data-system/metamodel.md");
}

describe("semantic data architecture record", () => {
	/** Traces: TC-001, TC-029, TC-038; FR-001-AC-1, FR-008-AC-1, NFR-001-AC-1. */
	it("contains the complete required artifact inventory", () => {
		for (const artifact of requiredArtifacts) {
			expect(existsSync(resolve(architectureRoot, artifact)), artifact).toBe(
				true,
			);
		}
	});

	/** Traces: TC-002, TC-003, TC-032, TC-036, TC-040, TC-048; FR-001-AC-2, FR-001-AC-3, FR-008-AC-4, US-002-AC-1, NFR-001-AC-3, NFR-003-AC-4. */
	it("assigns exactly one allowed status and a resolution gate when provisional", () => {
		for (const artifact of requiredArtifacts) {
			const document = readArchitectureFile(artifact);
			const metadata = frontmatter(document);
			expect(document.match(/^status:/gm), artifact).toHaveLength(1);
			expect(allowedStatuses.has(metadata.status), artifact).toBe(true);
			if (metadata.status === "provisional") {
				expect(metadata.resolution_gate, artifact).toMatch(
					/^https:\/\/github\.com\/agent-ix\//,
				);
			}
		}
	});

	/** Traces: TC-039; NFR-001-AC-2. */
	it("keeps every internal architecture link resolvable", () => {
		for (const artifact of requiredArtifacts) {
			for (const link of architectureLinks(
				artifact,
				readArchitectureFile(artifact),
			)) {
				expect(existsSync(link), `${artifact} -> ${relative(root, link)}`).toBe(
					true,
				);
			}
		}
	});

	/** Traces: TC-033, TC-042, TC-044; StR-001-AC-1, NFR-002-AC-1, NFR-002-AC-3. */
	it("indexes every artifact with its declared status", () => {
		const index = readArchitectureFile("index.md");
		const indexRows = index
			.split("\n")
			.filter((line) => line.startsWith("| ["));
		for (const artifact of requiredArtifacts.filter(
			(path) => path !== "index.md",
		)) {
			const metadata = frontmatter(readArchitectureFile(artifact));
			const row = indexRows.find((line) => line.includes(`(${artifact})`));
			expect(row, artifact).toBeDefined();
			expect(row, artifact).toContain(`| ${metadata.status} |`);
		}
	});

	/** Traces: TC-029, TC-031, TC-032, TC-036; FR-008-AC-1, FR-008-AC-3, FR-008-AC-4, US-002-AC-1. */
	it("defines all five ADRs and records TypeSpec as the normative source", () => {
		const adrPaths = requiredArtifacts.filter((path) => /^adr\/\d/.test(path));
		expect(adrPaths).toHaveLength(5);
		expect(
			frontmatter(
				readArchitectureFile("adr/0004-conditional-typespec-source.md"),
			),
		).toMatchObject({
			status: "historical",
			superseded_by: "ADR-0005",
		});
		const adr0005 = readArchitectureFile(
			"adr/0005-typespec-structural-source.md",
		);
		expect(frontmatter(adr0005)).toMatchObject({
			status: "normative",
			supersedes: "ADR-0004",
		});
		expect(adr0005).toContain("TypeSpec is the structural schema source");
		expect(adr0005).not.toMatch(/fallback schema-authoring source/i);
	});

	/** Traces: TC-004, TC-053; FR-001-AC-4, FR-001-AC-5. */
	it("keeps supersession single-valued and acyclic", () => {
		expect(() =>
			assertAcyclicSuccessors(
				new Map([
					["ADR-0001", ["ADR-0002"]],
					["ADR-0002", []],
					["ADR-0004", ["ADR-0005"]],
					["ADR-0005", []],
				]),
			),
		).not.toThrow();
		expect(() =>
			assertAcyclicSuccessors(
				new Map([
					["ADR-0001", ["ADR-0002"]],
					["ADR-0002", ["ADR-0001"]],
				]),
			),
		).toThrow(/cycle/);
		expect(() =>
			assertAcyclicSuccessors(
				new Map([["ADR-0001", ["ADR-0002", "ADR-0003"]]]),
			),
		).toThrow(/multiple current successors/);
	});

	/** Traces: TC-005, TC-006, TC-007, TC-008, TC-009, TC-010, TC-011, TC-012, TC-013, TC-014, TC-015, TC-016, TC-017, TC-018, TC-019, TC-020, TC-034, TC-035, TC-049, TC-050; FR-002-AC-1, FR-002-AC-2, FR-002-AC-3, FR-002-AC-4, FR-003-AC-1, FR-003-AC-2, FR-003-AC-3, FR-003-AC-4, FR-004-AC-1, FR-004-AC-2, FR-004-AC-3, FR-004-AC-4, FR-004-AC-5, FR-004-AC-6, FR-005-AC-1, FR-005-AC-2, FR-005-AC-3, FR-005-AC-4, US-001-AC-1, US-001-AC-2. */
	it("states the required authority, ownership, identity, and package boundaries", () => {
		expect(readArchitectureFile("authority.md")).toMatch(
			/typed Markdown[\s\S]*runtime store/i,
		);
		expect(readArchitectureFile("ownership.md")).toMatch(
			/Quire[\s\S]*Quoin[\s\S]*module repositories[\s\S]*Filament consumers/i,
		);
		expect(readArchitectureFile("metamodel.md")).toMatch(
			/package identity[\s\S]*semantic type identity[\s\S]*definition identity[\s\S]*occurrence identity/i,
		);
		const packages = readArchitectureFile("generated-packages.md");
		expect(packages).toMatch(
			/Rust[\s\S]*TypeScript[\s\S]*Python[\s\S]*JSON Schema/i,
		);
		expect(packages).toMatch(/decorator|custom `@` tag/i);
		expect(packages).toMatch(/UI[\s\S]*ORM[\s\S]*Tauri[\s\S]*persistence/i);
	});

	/** Traces: TC-021, TC-022, TC-023, TC-024, TC-051, TC-052; FR-006-AC-1, FR-006-AC-2, FR-006-AC-3, FR-006-AC-4, FR-006-AC-5, FR-006-AC-6. */
	it("makes mapping coverage, transformation outcomes, provenance, and effects explicit", () => {
		const representations = readArchitectureFile(
			"representations-and-transformations.md",
		);
		for (const term of ["frontmatter", "headings", "prose", "tables"]) {
			expect(representations.toLowerCase()).toContain(term);
		}
		for (const outcome of ["unsupported", "invalid", "unavailable", "lossy"]) {
			expect(representations.toLowerCase()).toContain(outcome);
		}
		for (const provenance of [
			"source identity",
			"source version",
			"target profile",
			"mapping version",
			"transformation timestamp",
		]) {
			expect(representations.toLowerCase()).toContain(provenance);
		}
		expect(representations).toMatch(
			/deterministic[\s\S]*pure[\s\S]*effectful/i,
		);
	});

	/** Traces: TC-025, TC-026, TC-027, TC-028, TC-030, TC-037, TC-041, TC-043; FR-007-AC-1, FR-007-AC-2, FR-007-AC-3, FR-007-CON-2, FR-008-AC-2, US-002-AC-2, NFR-001-AC-4, NFR-002-AC-2. */
	it("records compatibility, review, and promotion safety gates", () => {
		const compatibility = readArchitectureFile("compatibility.md");
		for (const term of [
			"required field",
			"removal",
			"rename",
			"enum",
			"unknown field",
			"reserved",
		]) {
			expect(compatibility.toLowerCase()).toContain(term);
		}
		expect(compatibility).toMatch(/Avro[\s\S]*compatibility/i);

		const roadmap = readArchitectureFile("roadmap.md");
		expect(roadmap).toMatch(/high corpus failure[\s\S]*(pause|hold)/i);

		const typeSpec = readArchitectureFile("typespec-feasibility.md");
		expect(typeSpec).toMatch(/Capability matrix[\s\S]*Pass rule[\s\S]*Result/i);
		expect(typeSpec).toContain("ADR-0005");
		expect(typeSpec).not.toMatch(/fallback/i);

		const corpusReview = readArchitectureFile("corpus-review-method.md");
		for (const scopeItem of [
			"canonical repository",
			"declared type",
			"repeated contract family",
			"machine-readable inventory",
			"type-fit disposition",
			"impact bands",
		]) {
			expect(corpusReview.toLowerCase()).toContain(scopeItem);
		}

		const conflicts = readArchitectureFile("conflicts.md");
		for (const conflict of [
			"Markdown is canonical",
			"Unified compiled archetype",
			"Rendering/templates removed",
			"typed Rust structs",
			"Artifact and object declarations",
		]) {
			expect(conflicts).toContain(conflict);
		}
		expect(conflicts).toMatch(
			/Compatible:[\s\S]*Preserve boundary:[\s\S]*Preserve current compatibility:/i,
		);
	});

	/** Traces: TC-045, TC-046, TC-047; NFR-003-AC-1, NFR-003-AC-2, NFR-003-AC-3. */
	it("limits issue #8 changes to documentation, plans, reviews, and tests", () => {
		const allowed = [
			"conformance/",
			"plan/Plan-009-conformance-corpus-and-oracle/",
			"test/conformance-corpus.test.ts",
			"README.md",
			"biome.json",
			"package.json",
			"pnpm-lock.yaml",
			"audit/filament-contract-census/",
			"docs/semantic-data-system/",
			"plan/Plan-001-semantic-data-architecture-record/",
			"plan/Plan-002-filament-contract-census/",
			"plan/Plan-003-typespec-feasibility/",
			"plan/Plan-004-semantic-package-contract/",
			"plan/Plan-005-semantic-ir-v1-1/",
			"plan/Plan-006-semantic-core-grammar/",
			"src/compiler/",
			"plan/Plan-007-promote-prototype-emitters/",
			"test/compiler.test.ts",
			"spikes/typespec-feasibility/scripts/",
			"spikes/typespec-feasibility/package.json",
			"spikes/typespec-feasibility/evidence/custom.json",
			"spikes/typespec-feasibility/emitter/",
			"test/semantic-ir-v1-1.test.ts",
			"test/semantic-ir-v1-1-reader.ts",
			"packages/semantic-core/",
			"fixtures/semantic-core/",
			"test/semantic-core.test.ts",
			"test/semantic-core-reader.ts",
			"test/semantic-core-lowerer.ts",
			"Makefile",
			"tests/",
			"pyproject.toml",
			"poetry.lock",
			"reviews/",
			"schema/semantic/v1/",
			"spec/",
			"spikes/typespec-feasibility/",
			"fixtures/semantic/v1/",
			"test/contract-census.test.ts",
			"test/semantic-architecture.test.ts",
			"test/semantic-contract.test.ts",
			"test/typespec-feasibility.test.ts",
			// Issue #19 (the compiler core) adds the compiler fixture corpus, the
			// matrix-summary script, its plan bundle, and its test file. Each entry
			// is a path this branch writes, enumerated rather than widened.
			"test/fixtures/compiler/",
			"scripts/test-matrix-summary.mjs",
			"scripts/build-compatibility-cases.mjs",
			"scripts/build-evolution-goldens.mjs",
			"scripts/build-compiler-docs.mjs",
			"plan/Plan-008-typespec-frontend-and-ir-compiler-core/",
			"plan/Plan-011-typescript-backend/",
			"test/fixtures/backends/typescript/",
			"test/typescript-backend.test.ts",
			"tsconfig.json",
			"test/compiler-core.test.ts",
			"test/changed-paths.ts",
			// Issue #19 also publishes two generated documents and excludes its
			// generated fixtures from the formatter.
			"docs/semantic-data-system/compiler-diagnostics.md",
			"docs/semantic-data-system/ir-compatibility-policy.md",
			"biome.json",
			// Issue #21 (the Rust/Serde backend) adds a Rust workspace, its
			// toolchain and formatter pins, the generated-crate goldens, the
			// third-party attribution register and two rendered documents. Each
			// entry is a path that branch writes, enumerated rather than widened,
			// which is the extension NFR-016 states every ticket makes to these
			// cumulative lists. The gate itself still reads a moving `origin/main`,
			// which is issue #51 and not this ticket's to fix.
			".cargo/config.toml",
			"Cargo.toml",
			"Cargo.lock",
			"rust-toolchain.toml",
			"rustfmt.toml",
			"THIRD-PARTY-NOTICES.md",
			".gitignore",
			"crates/",
			"scripts/build-rust-backend-docs.mjs",
			"scripts/build-rust-backend-goldens.mjs",
			"scripts/rust-backend-",
			"docs/semantic-data-system/rust-backend",
			"test/rust-backend.test.ts",
			"test/fixtures/rust-serde/",
			"plan/",
			"test/",
		];
		for (const path of changedPaths()) {
			expect(
				allowed.some((prefix) => path === prefix || path.startsWith(prefix)),
				path,
			).toBe(true);
			if (existsSync(resolve(root, path))) {
				expect(statSync(resolve(root, path)).isFile(), path).toBe(true);
			}
		}
	});
});
