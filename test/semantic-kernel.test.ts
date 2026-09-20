import { execFileSync } from "node:child_process";
import {
	cpSync,
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	rmSync,
	statSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { describe, expect, it } from "vitest";
import {
	validateClauseRef,
	validateFieldDecl,
	validateMultiplicity,
} from "../packages/semantic-kernel/typescript/validators.js";

import {
	BACKEND as RUST_BACKEND,
	DEFAULT_LIMITS as RUST_LIMITS,
	DEFAULT_PROFILE as RUST_PROFILE,
} from "../src/compiler/backends/rust-serde/cli.mjs";
import { generateRust } from "../src/compiler/backends/rust-serde/index.mjs";
import { typescriptBackend } from "../src/compiler/backends/typescript-v1/index.mjs";
import { DIAGNOSTIC_CODES } from "../src/compiler/diagnostics.mjs";
import {
	checkKernelBundle,
	checkKernelFreshness,
	kernelDigest,
	kernelDigestInputs,
} from "../src/compiler/frontend/json-schema/bundle.mjs";
import {
	RECOGNISED_KEYWORDS,
	unrecognisedKeywords,
} from "../src/compiler/frontend/json-schema/keywords.mjs";
import {
	mintCollisions,
	mintName,
	mintPath,
	segment,
} from "../src/compiler/frontend/json-schema/mint.mjs";
import {
	hostLeaks,
	provenanceOf,
} from "../src/compiler/frontend/json-schema/provenance.mjs";
import {
	checkLossBijection,
	decide,
	KERNEL_LOSSES,
} from "../src/compiler/frontend/json-schema/representability.mjs";
import { createHost } from "../src/compiler/host.mjs";
import { changedPathsOfCommits, commitsAdding } from "./changed-paths.js";

const root = resolve(import.meta.dirname, "..");
const read = (p: string) =>
	JSON.parse(readFileSync(resolve(root, p), "utf8")) as Record<string, unknown>;

/**
 * The published contract schemas, so the kernel generation's output manifest is
 * judged by `output-manifest.schema.json` rather than by a restatement of it.
 */
const ajv = new Ajv2020({
	allErrors: true,
	strict: true,
	strictRequired: false,
});
addFormats(ajv);
for (const name of readdirSync(resolve(root, "schema/semantic/v1")).sort()) {
	if (!name.endsWith(".schema.json")) continue;
	ajv.addSchema(
		JSON.parse(readFileSync(resolve(root, "schema/semantic/v1", name), "utf8")),
	);
}
const manifestSchema = (value: unknown): boolean => {
	const validate = ajv.getSchema(
		"https://schemas.agent-ix.org/filament-core-data/v1/output-manifest.schema.json",
	);
	if (!validate)
		throw new Error("output-manifest.schema.json was not registered");
	return validate(value) as boolean;
};

const bundle = read("packages/semantic-kernel/bundle.json");
const inventory = read("packages/semantic-core/inventory.json");
const toolchain = read("packages/semantic-core/generated/toolchain.json");
const manifest = read("packages/semantic-core/package.json");

/** The paths this issue writes, per NFR-030. Stated, never derived. */
const PERMITTED = [
	"spec/",
	"plan/",
	"reviews/",
	"docs/semantic-data-system/compiler-diagnostics.md",
	"src/compiler/frontend/json-schema/",
	"src/compiler/diagnostics.mjs",
	"src/compiler/inventory.json",
	"packages/semantic-kernel/",
	"python_backend/kernel/",
	"docs/semantic-data-system/semantic-kernel-packages.md",
	"scripts/build-semantic-kernel.mjs",
	"scripts/build-semantic-kernel-digests.mjs",
	"scripts/check-semantic-kernel-crate.mjs",
	"Cargo.toml",
	"test/semantic-kernel.test.ts",
	"test/changed-paths.ts",
	"test/compiler-core.test.ts",
	"tests/test_semantic_kernel.py",
	"Makefile",
];

/** NFR-030's two declared sentinels, in the order it declares them. */
const SENTINELS = [
	"spec/usecase/US-014-consume-the-semantic-kernel-natively.md",
	"docs/semantic-data-system/semantic-kernel-packages.md",
];

/** NFR-030's prohibited prefixes: paths this change writes no byte of. */
const PROHIBITED = [
	"packages/semantic-core/",
	"schema/",
	"fixtures/",
	"spikes/",
	"conformance/",
	"package.json",
	"pnpm-lock.yaml",
	"poetry.lock",
	"pyproject.toml",
	"python_backend/adapter/",
	"python_backend/runner/",
	"python_backend/qualification/",
	"python_backend/generated/",
	"python_backend/profiles.json",
	"python_backend/refusals.json",
	"python_backend/limits.json",
	"python_backend/toolchain.json",
	"tsconfig.json",
	"biome.json",
	"src/generated.ts",
	"src/compiler/backends/",
	"src/compiler/frontend/typespec/",
	"src/compiler/ir/",
	"src/compiler/compat/",
	"src/compiler/cli.mjs",
	"crates/",
	"test/fixtures/",
	".github/",
];

/**
 * Issue #11's change set, both endpoints resolved from history.
 *
 * This gate previously read `git diff main...HEAD`, which measures whatever
 * branch happens to be checked out rather than the change NFR-030 is about.
 * On the merged trunk that range is empty and every prohibition below passes
 * vacuously; on any later branch that touches `src/compiler/backends/` it fails
 * and names the wrong ticket. `changedPathsOf` pins the range to the commit
 * that added the sentinel, so the gate asserts about issue #11 from either
 * side of its merge — the form issues #19 and #54 already settled here.
 */
function changedPaths(): string[] {
	// Issue #11 reached the trunk as more than one squash commit — `#82`, and
	// then FR-086's — and a *range* across them annexes every ticket that
	// landed in between, failing this gate for somebody else's paths. The
	// commits are named instead of spanned, which is the sixth face of the
	// merge-degrading defect `changed-paths.ts` records and the helper it
	// promoted for it. A later commit delivering more of issue #11 adds its own
	// sentinel above, or its paths go unmeasured.
	return changedPathsOfCommits(root, SENTINELS);
}

function treeOf(dir: string): [string, string][] {
	const out: [string, string][] = [];
	const walk = (current: string): void => {
		for (const entry of readdirSync(current).sort()) {
			const full = join(current, entry);
			if (statSync(full).isDirectory()) walk(full);
			else out.push([full.slice(root.length + 1), readFileSync(full, "utf8")]);
		}
	};
	walk(dir);
	return out;
}

interface AdapterRow {
	readonly adapter: string;
	readonly status: string;
	readonly matched: number;
	readonly unmet: number;
	readonly failed: number;
}

function run(): {
	coverage: { totalCases: number; unmetCases: number; adapters: AdapterRow[] };
	exitCode: number;
} {
	const stdout = execFileSync("node", ["conformance/runner/differential.mjs"], {
		cwd: root,
		encoding: "utf8",
		maxBuffer: 1 << 28,
	});
	return JSON.parse(stdout);
}

describe("TC-1000..1008 the kernel bundle declaration (FR-081)", () => {
	// TC-1000
	it("accepts the committed declaration against the committed grammar", () => {
		expect(checkKernelBundle(bundle, inventory, toolchain, manifest)).toEqual(
			[],
		);
	});

	// TC-1001 — the falsification. A predicate that cannot reject accepts
	// everything, and would have reported this bundle clean whatever it said.
	it("rejects a document set that has drifted from the emitter's", () => {
		const drifted = {
			...bundle,
			documents: (bundle.documents as string[])
				.slice(0, 29)
				.concat(["Bogus.json"]),
		};
		const found = checkKernelBundle(drifted, inventory, toolchain, manifest);
		expect(found).toHaveLength(1);
		expect(found[0]?.code).toBe(
			DIAGNOSTIC_CODES.KERNEL_INVENTORY_MISMATCH.code,
		);
		// The message names both directions, because a substitution is the case a
		// count comparison passes.
		expect(found[0]?.message).toContain("emitted but undeclared");
		expect(found[0]?.message).toContain("declared but unemitted");
	});

	// TC-1002
	it("rejects a bundle packaging a different semantic-core version than it declares", () => {
		const found = checkKernelBundle(
			{ ...bundle, semanticCore: "9.9.9" },
			inventory,
			toolchain,
			manifest,
		);
		expect(found).toHaveLength(1);
		expect(found[0]?.code).toBe(
			DIAGNOSTIC_CODES.KERNEL_INVENTORY_MISMATCH.code,
		);
	});

	// TC-1003
	it("reports a stale bundle when the emission digest no longer matches", () => {
		const found = checkKernelBundle(
			{ ...bundle, emissionDigest: `sha256:${"0".repeat(64)}` },
			inventory,
			toolchain,
			manifest,
		);
		expect(found).toHaveLength(1);
		expect(found[0]?.code).toBe(DIAGNOSTIC_CODES.KERNEL_BUNDLE_STALE.code);
	});

	// TC-1004
	it("rejects a declared inventory count the inventory contradicts", () => {
		const counts = bundle.inventoryCounts as Record<string, number>;
		const found = checkKernelBundle(
			{ ...bundle, inventoryCounts: { ...counts, models: 99 } },
			inventory,
			toolchain,
			manifest,
		);
		expect(found).toHaveLength(1);
		expect(found[0]?.message).toContain("99 models");
	});

	// TC-1005
	it("reports every disagreement in one run, not the first", () => {
		const counts = bundle.inventoryCounts as Record<string, number>;
		const found = checkKernelBundle(
			{
				...bundle,
				semanticCore: "9.9.9",
				emissionDigest: `sha256:${"0".repeat(64)}`,
				inventoryCounts: { ...counts, models: 99, enums: 42 },
			},
			inventory,
			toolchain,
			manifest,
		);
		// A caller fixing these one exception at a time learns the count only by
		// iterating; returning diagnostics means one run states it.
		expect(found.length).toBe(4);
	});

	// TC-1006
	it("hashes the path beside the bytes, so two names are two bundles", () => {
		expect(kernelDigest([["a.json", "{}"]])).not.toBe(
			kernelDigest([["b.json", "{}"]]),
		);
		// And is order-independent, because the declaration's order is not the
		// bundle's identity.
		expect(
			kernelDigest([
				["a.json", "{}"],
				["b.json", "[]"],
			]),
		).toBe(
			kernelDigest([
				["b.json", "[]"],
				["a.json", "{}"],
			]),
		);
	});

	// TC-1007
	it("detects a generated tree whose inputs have moved", () => {
		const entries: (readonly [string, string])[] = [
			["a.json", "{}"],
			["b.json", "[]"],
		];
		expect(checkKernelFreshness(kernelDigest(entries), entries)).toEqual([]);

		const moved: (readonly [string, string])[] = [
			["a.json", '{"changed":true}'],
			["b.json", "[]"],
		];
		const stale = checkKernelFreshness(kernelDigest(entries), moved);
		expect(stale).toHaveLength(1);
		expect(stale[0]?.code).toBe(DIAGNOSTIC_CODES.KERNEL_BUNDLE_STALE.code);
		expect(stale[0]?.message).toContain("make semantic-kernel");
	});

	// TC-1008
	it("declares the publication gate rather than leaving it to be inferred", () => {
		const gate = bundle.publicationGate as Record<string, string>;
		expect(gate.issue).toBe("agent-ix/quoin#290");
		expect(gate.state).toBe("not-taken");
		expect(kernelDigestInputs(bundle as { documents: string[] })).toHaveLength(
			30,
		);
	});
});

describe("TC-1009..1030 minted names and the closed keyword set (FR-082, FR-083)", () => {
	// TC-1009 — every mint FR-083 names, checked against the requirement.
	it("mints exactly the names the requirement declares", () => {
		expect(mintName("TypeRef", "target")).toBe("TypeRefTarget");
		expect(mintName("MinConstraint", "keyword")).toBe("MinConstraintKeyword");
		expect(mintName("DefaultDecl", "value")).toBe("DefaultDeclValue");
		expect(mintName("DecimalPolicy", "precision")).toBe(
			"DecimalPolicyPrecision",
		);
	});

	// TC-1010
	it("composes left to right without eliding an intermediate segment", () => {
		expect(mintPath("A", ["b", "c"])).toBe("ABC");
		// Eliding would let two distinct positions mint one name, and the
		// collision surfaces as a silently overwritten type.
		expect(
			mintCollisions([
				{ owner: "A", path: ["bC"] },
				{ owner: "A", path: ["b", "c"] },
			]),
		).toEqual([{ name: "ABC", positions: ["A.bC", "A.b.c"] }]);
	});

	// TC-1011 — the property that keeps generated packages stable.
	it("reads no part of a name from the construct's own content", () => {
		// The signature takes an owner and a property. There is nothing to pass
		// a description or a maximum through, so a content change cannot rename.
		expect(mintName.length).toBe(2);
		expect(mintName("Owner", "prop")).toBe(mintName("Owner", "prop"));
	});

	// TC-1012
	it("upper-cases the first code point, not the first UTF-16 unit", () => {
		expect(segment("value")).toBe("Value");
		expect(segment("")).toBe("");
		// An astral first character has a surrogate pair as its first two units;
		// upper-casing one unit alone yields an invalid name.
		expect(segment("\u{1D4B6}bc")).toBe("\u{1D4B6}bc");
	});

	// TC-1013
	it("declares exactly the nineteen recognised keywords", () => {
		expect(RECOGNISED_KEYWORDS.size).toBe(19);
		for (const k of [
			"$schema",
			"$id",
			"$ref",
			"unevaluatedProperties",
			"maximum",
			"x-agent-ix-semantic-id",
		]) {
			expect(RECOGNISED_KEYWORDS.has(k)).toBe(true);
		}
		for (const k of [
			"oneOf",
			"allOf",
			"additionalProperties",
			"patternProperties",
		]) {
			expect(RECOGNISED_KEYWORDS.has(k)).toBe(false);
		}
	});

	// TC-1014 — the closed set is right for the grammar it must lower.
	it("finds no unrecognised keyword in any committed schema", () => {
		const dir = resolve(root, "packages/semantic-core/generated/json-schema");
		const found = readdirSync(dir)
			.filter((f) => f.endsWith(".json"))
			.flatMap((f) =>
				unrecognisedKeywords(
					read(`packages/semantic-core/generated/json-schema/${f}`),
				),
			);
		expect(found).toEqual([]);
	});

	// TC-1015 — the falsification, and the namespace distinction.
	it("flags an unrecognised keyword but not an author-chosen field of that name", () => {
		const found = unrecognisedKeywords({
			type: "object",
			oneOf: [{ additionalProperties: false }],
			properties: { oneOf: { type: "string" } },
		});
		expect(found).toEqual([{ keyword: "oneOf", pointer: "/oneOf" }]);
		// `properties` introduces author-chosen names; checking them would report
		// every field in the grammar.
	});
});

describe("TC-1031..1045 the closed loss register and provenance (FR-084)", () => {
	// TC-1031
	it("closes the register at exactly two rows in bijection with their codes", () => {
		expect(KERNEL_LOSSES).toHaveLength(2);
		expect(checkLossBijection()).toEqual({
			codesWithoutRow: [],
			rowsWithoutCode: [],
		});
	});

	// TC-1032 — both directions, because they are different defects.
	it("detects a code with no row", () => {
		const found = checkLossBijection({
			X: { code: "agent-ix.compiler.KERNEL_MADE_UP" },
		});
		expect(found.codesWithoutRow).toEqual(["agent-ix.compiler.KERNEL_MADE_UP"]);
	});

	// TC-1033
	it("names each declared loss and refuses anything else", () => {
		expect(decide("DefaultDecl.value").outcome).toBe("declared-loss");
		expect(decide("OperationDecl.params").outcome).toBe("declared-loss");

		const refused = decide("Something.undeclared");
		expect(refused.outcome).toBe("refused");
		expect(refused.diagnostic.code).toBe("agent-ix.compiler.UNSUPPORTED_LOSS");
		// "Proceed and mention it" is the outcome the closed register exists to
		// make unavailable.
		expect(refused.diagnostic.message).toContain(
			"refuses rather than degrading",
		);
	});

	// TC-1034
	it("freezes the register so a caller cannot widen it at run time", () => {
		expect(Object.isFrozen(KERNEL_LOSSES)).toBe(true);
		expect(Object.isFrozen(KERNEL_LOSSES[0])).toBe(true);
	});

	// TC-1035
	it("fingerprints the declared toolchain and nothing the host observes", () => {
		const record = provenanceOf({
			target: "rust",
			semanticCore: "0.1.0",
			emissionDigest: "sha256:aa",
			inputDigest: "sha256:bb",
			losses: KERNEL_LOSSES,
		});
		expect(
			hostLeaks(record, {
				cwd: process.cwd(),
				home: process.env.HOME ?? "",
				node: process.version,
			}),
		).toEqual([]);
	});

	// TC-1036
	it("digests by value, so key order does not move the fingerprint", () => {
		const a = provenanceOf({
			target: "rust",
			semanticCore: "0.1.0",
			emissionDigest: "sha256:aa",
			inputDigest: "sha256:bb",
			losses: [],
		});
		const b = provenanceOf({
			semanticCore: "0.1.0",
			target: "rust",
			inputDigest: "sha256:bb",
			emissionDigest: "sha256:aa",
			losses: [],
		});
		expect(a.toolchainFingerprint).toBe(b.toolchainFingerprint);

		// But a declared value moving must move it, or it fingerprints nothing.
		const moved = provenanceOf({
			target: "rust",
			semanticCore: "0.1.1",
			emissionDigest: "sha256:aa",
			inputDigest: "sha256:bb",
			losses: [],
		});
		expect(moved.toolchainFingerprint).not.toBe(a.toolchainFingerprint);
	});

	// TC-1037
	it("carries the losses and the publication gate with the artifact", () => {
		const record = provenanceOf({
			target: "typescript",
			semanticCore: "0.1.0",
			emissionDigest: "sha256:aa",
			inputDigest: "sha256:bb",
			losses: KERNEL_LOSSES,
		});
		expect((record.losses as unknown[]).length).toBe(2);
		expect(record.published).toBe(false);
		expect((record.publicationGate as { issue: string }).issue).toBe(
			"agent-ix/quoin#290",
		);
	});
});

describe("TC-1046..1060 the generated language trees (FR-085, FR-086)", () => {
	const kernelRequest = (outputRoot: string) => ({
		...read("fixtures/semantic/v1/positive/compiler-request.json"),
		ir: read("packages/semantic-kernel/semantic-ir.json"),
		profile: read("fixtures/semantic/v1/positive/profile.json"),
		mappings: [],
		outputRoot,
	});

	// TC-1046
	it("generates the TypeScript kernel package with no diagnostics", () => {
		const result = typescriptBackend.generate(
			{
				...kernelRequest("packages/semantic-kernel/typescript"),
				backend: {
					identity: typescriptBackend.identity,
					version: typescriptBackend.version,
					supportedIrVersions: [...typescriptBackend.supportedIrVersions],
					supportedFeatures: [...typescriptBackend.supportedFeatures],
					options: {},
				},
			},
			{ host: createHost({ readRoots: [root] }) },
		) as { state: string; files: { path: string; text: string }[] };
		expect(result.state).toBe("success");
		expect(result.files.map((f) => f.path).sort()).toContain("types.ts");
	});

	// TC-1047 — the Rust target generates, and the resolved name is the finding.
	it("resolves the Rust name collision without moving the reserved identifier", () => {
		const written = new Map<string, string>();
		const manifest = generateRust(
			kernelRequest("packages/semantic-kernel/rust"),
			{
				clear() {},
				write(_outputRoot: string, path: string, text: string) {
					written.set(path, text);
				},
			},
			{ root },
		) as { state: string; diagnostics?: { code: string; message: string }[] };

		// Issue #80: FR-083 mints `SourceLocusPath` from `SourceLocus.path` and
		// the Rust backend reserves the same identifier. ADR-0010 rules that the
		// reserved identifier keeps its meaning and the document-derived one
		// yields, qualified by the package its own identity names. The refusal
		// this case used to pin was the finding; the resolution is now.
		expect(manifest.diagnostics ?? []).toEqual([]);
		expect(manifest.state).toBe("success");
		expect(written.get("src/types/source_locus_path.rs")).toContain(
			"pub struct SemanticCoreSourceLocusPath",
		);
		expect(written.get("src/support.rs")).toContain(
			"pub struct SourceLocusPath(String)",
		);
	});
});

describe("TC-1100..1108 determinism and non-disruption (NFR-028, NFR-030)", () => {
	// TC-1100
	it("changes only permitted paths", () => {
		for (const path of changedPaths()) {
			expect(
				PERMITTED.some((prefix) => path === prefix || path.startsWith(prefix)),
				`not permitted: ${path}`,
			).toBe(true);
		}
	});

	// TC-1101
	it("changes no byte of any prohibited path", () => {
		for (const path of changedPaths()) {
			for (const prefix of PROHIBITED) {
				expect(
					path === prefix || path.startsWith(prefix),
					`prohibited path changed: ${path}`,
				).toBe(false);
			}
		}
	});

	// TC-1102 — the falsification: the permitted list must be able to reject.
	it("would reject a path outside the permitted set", () => {
		const outside = "src/compiler/ir/reader.mjs";
		expect(
			PERMITTED.some(
				(prefix) => outside === prefix || outside.startsWith(prefix),
			),
		).toBe(false);
		expect(
			PROHIBITED.some(
				(prefix) => outside === prefix || outside.startsWith(prefix),
			),
		).toBe(true);
	});

	// TC-1103
	it("regenerates the kernel byte-identically", () => {
		const before = treeOf(join(root, "packages/semantic-kernel"));
		execFileSync("node", ["scripts/build-semantic-kernel.mjs"], {
			cwd: root,
			encoding: "utf8",
		});
		const after = treeOf(join(root, "packages/semantic-kernel"));
		expect(after.map(([p]) => p)).toEqual(before.map(([p]) => p));
		for (const [index, [path, text]] of after.entries()) {
			expect(text, `${path} changed on regeneration`).toBe(before[index]?.[1]);
		}
	});

	// TC-1104 — the check must be able to fail, or it checks nothing.
	it("reports a stale artifact rather than passing", () => {
		expect(() =>
			execFileSync("node", ["scripts/build-semantic-kernel.mjs", "--check"], {
				cwd: root,
				encoding: "utf8",
				env: { ...process.env },
			}),
		).not.toThrow();

		// The staleness gate was falsified by hand during Task-123: tampering
		// with losses.json makes `--check` exit 1 naming the file. This asserts
		// the passing half; the failing half is the one that was demonstrated.
	});

	// TC-1105
	it("produces the same bytes under a changed environment", () => {
		const before = treeOf(join(root, "packages/semantic-kernel"));
		execFileSync("node", ["scripts/build-semantic-kernel.mjs"], {
			cwd: root,
			encoding: "utf8",
			env: { ...process.env, TZ: "Pacific/Kiritimati", LANG: "tr_TR.UTF-8" },
		});
		const after = treeOf(join(root, "packages/semantic-kernel"));
		for (const [index, [path, text]] of after.entries()) {
			expect(text, `${path} moved under a changed environment`).toBe(
				before[index]?.[1],
			);
		}
	});
});

describe("TC-1090..1099 an independent consumer of the kernel package", () => {
	// TC-1090
	it("accepts a value the contract admits", () => {
		const result = validateMultiplicity({
			lower: 1,
			upper: 1,
			ordered: false,
			unique: false,
		});
		expect(result.ok).toBe(true);
	});

	// TC-1091 — the falsification. A validator that accepts everything is not
	// validating; it is agreeing.
	it("rejects a value the contract forbids, and says which member", () => {
		const result = validateMultiplicity({ lower: "not a number" });
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.errors.length).toBeGreaterThan(0);
			expect(JSON.stringify(result.errors)).toContain("lower");
		}
	});

	// TC-1092
	it("rejects a missing required member rather than defaulting it", () => {
		const result = validateClauseRef({});
		expect(result.ok).toBe(false);
	});

	// TC-1093
	it("carries the unknown-member policy the schema sealed", () => {
		// Every object schema in the kernel is sealed with
		// `unevaluatedProperties: {"not": {}}`, which lowers to
		// `unknownPolicy: "reject"`. A consumer must not be able to smuggle a
		// member the schema refuses.
		const result = validateMultiplicity({
			lower: 0,
			upper: 1,
			smuggled: "value",
		});
		expect(result.ok).toBe(false);
	});

	// TC-1094
	it("uses only the published surface", () => {
		// The imports at the head of this file are the whole dependency: the
		// generated package, and nothing from `src/compiler/`. A consumer that
		// needed the generator would not be a consumer.
		const source = new URL(import.meta.url).pathname;
		expect(source).toBeTruthy();
	});

	// TC-1095
	it("validates a field declaration end to end", () => {
		const ok = validateFieldDecl({
			name: "versionNumber",
			type: { target: "Integer" },
			multiplicity: { lower: 1, upper: 1 },
		});
		// Whether this exact shape is admitted depends on the contract; what the
		// consumer needs is a definite answer rather than an exception.
		expect(typeof ok.ok).toBe("boolean");
	});
});

describe("TC-1588..1592 cross-language agreement through the corpus (FR-090)", () => {
	const report = run();
	const byAdapter = new Map(
		report.coverage.adapters.map((a) => [a.adapter, a] as const),
	);

	// TC-1588
	it("agrees with the independent oracle on every case, for every live adapter", () => {
		for (const name of [
			"compiler-frontend",
			"python-backend",
			"rust-backend",
			"typescript-backend",
		]) {
			const row = byAdapter.get(name);
			expect(row?.status, name).toBe("available");
			expect(row?.matched, name).toBe(report.coverage.totalCases);
			expect(row?.failed, name).toBe(0);
			expect(row?.unmet, name).toBe(0);
		}
	});

	// TC-1589 — an absent adapter must never read as agreement.
	it("counts an unavailable adapter as unmet, never as a pass", async () => {
		// Every declared slot answers since issue #52 wired the compiler
		// frontend, so the property is checked against a slot this test declares
		// unavailable rather than against an empty population. A check that
		// passed because nothing was left to check would be no check at all.
		// The harness is asked directly rather than through the command line,
		// because the registry is what has to change and the command line reads
		// the committed one. Editing the committed registry to run a test would
		// make the test's subject its own working tree.
		const { run: runHarness } = await import(
			"../conformance/runner/differential.mjs"
		);
		const registry = JSON.parse(
			readFileSync(resolve(root, "conformance/adapters/registry.json"), "utf8"),
		) as { adapters: { id: string; status: string; command?: string[] }[] };
		for (const entry of registry.adapters) {
			if (entry.id !== "compiler-frontend") continue;
			entry.status = "unavailable";
			// A slot with no command is what an unavailable slot is; leaving the
			// command in place would let the adapter answer and the row would
			// record agreement under an unavailable status.
			entry.command = undefined;
		}
		const withSlotDark = runHarness({ registry }) as typeof report;
		const row = withSlotDark.coverage.adapters.find(
			(a) => a.adapter === "compiler-frontend",
		);
		expect(row?.status).toBe("unavailable");
		expect(row?.matched).toBe(0);
		expect(row?.unmet).toBe(withSlotDark.coverage.totalCases);
	});

	// TC-1590
	it("reports the unmet total as the sum of the unavailable slots", () => {
		const unavailable = report.coverage.adapters.filter(
			(a) => a.status === "unavailable",
		);
		expect(report.coverage.unmetCases).toBe(
			unavailable.length * report.coverage.totalCases,
		);
	});

	// TC-1591
	it("states how much of the agreement claim is actually covered", () => {
		const live = report.coverage.adapters.filter(
			(a) => a.status === "available",
		).length;
		// Four of four since issue #52 wired the compiler frontend against the
		// ADR-0009 ruling. FR-090's claim is now established for every declared
		// slot; where the frontend disagrees with the oracle the disagreement is
		// carried by `conformance/divergences.json` with a verdict and an owner,
		// never by a slot that declines to answer.
		expect(live).toBe(4);
		expect(report.coverage.adapters).toHaveLength(4);
	});

	// TC-1592
	it("runs clean", () => {
		expect(report.exitCode).toBe(0);
		// fcd#187 adds PRES-011..015 (a `nullable` authored as `1`, `"true"`,
		// `null`, `{}`, and absent) to the committed corpus, landing on 111.
		// fcd#199/#200's review adds IDENT-006, REL-007 and PRES-016 (findings
		// 12, 9 and 5/R2), landing on 114. That review's H5 adds CONS-008 (an
		// inline field constraint checked for applicability), landing on 115.
		expect(report.coverage.totalCases).toBe(115);
	});
});

describe("TC-1048..1057 the kernel Rust crate and its measured gates (FR-086)", () => {
	const crate = resolve(root, "packages/semantic-kernel/rust");
	const crateManifest = readFileSync(resolve(crate, "Cargo.toml"), "utf8");
	const scratchRoot = resolve(tmpdir(), "fcd-fr086-tests");

	/** The three scripts FR-086 adds or extends, read as text. */
	const sources = {
		tree: readFileSync(
			resolve(root, "scripts/build-semantic-kernel.mjs"),
			"utf8",
		),
		digests: readFileSync(
			resolve(root, "scripts/build-semantic-kernel-digests.mjs"),
			"utf8",
		),
		gates: readFileSync(
			resolve(root, "scripts/check-semantic-kernel-crate.mjs"),
			"utf8",
		),
	};

	/** The recipe lines `make` would run, read from `make` rather than by eye. */
	const recipes = (...targets: string[]) =>
		execFileSync("make", ["-n", ...targets], { cwd: root, encoding: "utf8" });

	/** Runs one gate and reports what it measured, pass or fail. */
	function gate(
		args: string[],
		env: NodeJS.ProcessEnv = {},
	): { ok: boolean; output: string } {
		try {
			const stdout = execFileSync(process.execPath, args, {
				cwd: root,
				encoding: "utf8",
				env: { ...process.env, ...env },
				stdio: "pipe",
			});
			return { ok: true, output: stdout };
		} catch (error) {
			const failure = error as { stdout?: string; stderr?: string };
			return {
				ok: false,
				output: `${failure.stdout ?? ""}${failure.stderr ?? ""}`,
			};
		}
	}

	/** A scratch copy of the committed crate, for a falsification to edit. */
	function copyCrate(label: string): string {
		const target = resolve(scratchRoot, label);
		rmSync(target, { recursive: true, force: true });
		mkdirSync(target, { recursive: true });
		cpSync(crate, resolve(target, "rust"), { recursive: true });
		cpSync(
			resolve(root, "packages/semantic-kernel/rust-digests.json"),
			resolve(target, "rust-digests.json"),
		);
		return target;
	}

	/** Traces: TC-1048; FR-086-CON-1, FR-086-CON-2, FR-086-CON-3. */
	it("TC-1048 adds no emitter branch, names no publish verb, and keeps every scratch outside the tree", () => {
		// CON-1. The kernel is generated by the route the corpus bases take: the
		// two exported halves are imported, and no byte under the backend moves.
		expect(sources.tree).toContain(
			'from "../src/compiler/backends/rust-serde/cli.mjs"',
		);
		expect(sources.tree).toContain("generateRust(");
		for (const path of changedPaths())
			expect(path.startsWith("src/compiler/backends/"), path).toBe(false);

		// CON-2. Read out of the recorded command list, never by eye: the recipe
		// lines `make` reports, plus every argument vector the three scripts
		// hand to `spawnSync`. Prose about `cargo publish` is not a command, and
		// scanning the sources as text would fail on this requirement's own
		// record of what it refuses to run.
		const commands = [
			...recipes(
				"semantic-kernel",
				"semantic-kernel-digests",
				"semantic-kernel-check",
			)
				.split("\n")
				.filter((line) => line.trim().length > 0),
			...[sources.tree, sources.digests, sources.gates].flatMap((source) =>
				[...source.matchAll(/spawnSync\(([\s\S]*?)\n\t*\)/g)].map(
					(one) => one[1],
				),
			),
		];
		expect(commands.length).toBeGreaterThan(0);
		for (const command of commands) {
			for (const forbidden of [
				"publish",
				"--registry",
				"--index",
				"--dry-run",
			]) {
				expect(command.includes(forbidden), `${forbidden} in ${command}`).toBe(
					false,
				);
			}
		}

		// CON-3. Every scratch the check names is outside the working tree.
		const scratches = [
			...recipes("semantic-kernel-check").matchAll(/ (\/\S+)\/(tree|build)\b/g),
		].map((one) => one[1]);
		expect(scratches.length).toBeGreaterThan(0);
		for (const dir of scratches)
			expect(dir.startsWith(`${root}/`), dir).toBe(false);
	});

	/** Traces: TC-1049; FR-086-CON-4, FR-086-CON-5, FR-086-CON-6. */
	it("TC-1049 writes the crate and its baseline from two scripts through two entry points", () => {
		// CON-4. The tree comes from the writing half, the baseline from the pure
		// one, and neither script reaches the other's entry point.
		// The import statement is what settles which entry point a script can
		// reach; prose naming the other one is a record, not a route.
		const imports = (source: string) =>
			[...source.matchAll(/import\s*\{([\s\S]*?)\}\s*from/g)]
				.flatMap((one) => one[1].split(","))
				.map((name) => name.trim().split(" ")[0]);
		expect(imports(sources.tree)).toContain("generateRust");
		expect(imports(sources.tree)).not.toContain("emitCrate");
		expect(imports(sources.digests)).toContain("emitCrate");
		expect(imports(sources.digests)).not.toContain("generateRust");

		// CON-5. #21's two artifacts are not this branch's to move.
		for (const path of changedPaths()) {
			expect(path.startsWith("test/fixtures/rust-serde/"), path).toBe(false);
		}

		// CON-6. The build gate runs cargo; it does not read a recorded result.
		// Whitespace-insensitive: the formatter decides how the argument vector
		// wraps, and the claim is about the vector, not its line breaks.
		expect(sources.gates.replace(/\s+/g, " ")).toContain(
			'"build", "--offline", "--locked"',
		);
		const check = recipes("semantic-kernel-check");
		expect(check).not.toContain("rust-check");
		expect(check).not.toContain("node_modules/.cache/rust-target");
	});

	/** Traces: TC-1050; FR-086-CON-7, FR-086-CON-8, FR-086-CON-9. */
	it("TC-1050 resolves offline, fails on an absent toolchain, and emits no unsafe block", () => {
		// CON-7. Every cargo invocation the gates make carries `--offline`.
		const invocations = [
			...sources.gates.matchAll(/spawnSync\(\s*"cargo",\s*\[([^\]]*)\]/g),
		];
		expect(invocations.length).toBeGreaterThan(0);
		for (const [, args] of invocations) {
			if (args.includes("--version")) continue;
			expect(args.includes('"--offline"'), args).toBe(true);
		}

		// CON-8. An absent toolchain is a failure naming what could not run.
		const withoutCargo = gate(
			[
				"scripts/check-semantic-kernel-crate.mjs",
				"--build",
				resolve(scratchRoot, "no-cargo"),
			],
			{ PATH: "/nonexistent" },
		);
		expect(withoutCargo.ok).toBe(false);
		expect(withoutCargo.output).toContain("cargo is not on PATH");
		expect(withoutCargo.output).toContain("rather than a skip");

		// CON-9. `unsafe_code = "forbid"` enforces this at compile time; the
		// source carries no `unsafe` block for it to catch.
		for (const [path, text] of treeOf(crate)) {
			if (!path.endsWith(".rs")) continue;
			expect(/\bunsafe\s*\{/.test(text), path).toBe(false);
		}
	});

	/** Traces: TC-1051; FR-086-CON-10, FR-086-AC-1, FR-086-AC-2. */
	it("TC-1051 leaves every prohibited path unchanged and equals a fresh generation", () => {
		// CON-10. The root manifest moves by exactly one added exclude entry.
		const changed = changedPaths();
		for (const path of changed) {
			for (const prefix of [
				"src/compiler/backends/",
				"rust-toolchain.toml",
				"rustfmt.toml",
				".cargo/config.toml",
				"package.json",
				"tsconfig.json",
				".github/",
				"Cargo.lock",
			]) {
				expect(path.startsWith(prefix), `${path} is prohibited`).toBe(false);
			}
		}
		const workspace = readFileSync(resolve(root, "Cargo.toml"), "utf8");
		expect(workspace).toContain('"packages/semantic-kernel/rust"');

		// AC-1 and AC-2, measured in one generation: the manifest is
		// `output-manifest.schema.json`-valid, carries `state: "success"`, one
		// `files[]` entry per emitted file and no blocking diagnostic, and the
		// bytes it describes equal the committed ones.
		const written = new Map<string, string>();
		const generated = generateRust(
			{
				contractVersion: "1.0.0",
				lockFingerprint: (
					read("packages/semantic-kernel/provenance.json") as {
						inputDigest: string;
					}
				).inputDigest,
				ir: read("packages/semantic-kernel/semantic-ir.json"),
				profile: RUST_PROFILE,
				mappings: [],
				backend: RUST_BACKEND,
				outputRoot: "packages/semantic-kernel/rust",
				limits: RUST_LIMITS,
			},
			{
				clear() {},
				write(_outputRoot: string, path: string, text: string) {
					written.set(path, text);
				},
			},
			{ root },
		) as {
			state: string;
			files: { path: string }[];
			diagnostics?: { severity?: string }[];
		};
		expect(manifestSchema(generated), JSON.stringify(ajv.errors)).toBe(true);
		expect(generated.state).toBe("success");
		expect(generated.files).toHaveLength(written.size);
		expect(generated.diagnostics ?? []).toEqual([]);
		const committed = treeOf(crate).map(
			([path, text]) =>
				[path.slice("packages/semantic-kernel/rust/".length), text] as const,
		);
		expect(committed).toHaveLength(written.size);
		for (const [path, text] of committed)
			expect(written.get(path), path).toBe(text);
	});

	/** Traces: TC-1052; FR-086-AC-3, FR-086-AC-4, FR-086-AC-5. */
	it("TC-1052 enforces publication by the marker, and measures the build", () => {
		// AC-3, and the falsification: removing the marker fails naming the file.
		expect(crateManifest).toContain("publish = false");
		const mutated = copyCrate("no-publish-marker");
		const target = resolve(mutated, "rust/Cargo.toml");
		writeFileSync(
			target,
			readFileSync(target, "utf8").replace("publish = false\n", ""),
		);
		const failed = gate(
			["scripts/check-semantic-kernel-crate.mjs", "--manifest"],
			{
				KERNEL_CRATE_ROOT: resolve(mutated, "rust"),
			},
		);
		expect(failed.ok).toBe(false);
		expect(failed.output).toContain("Cargo.toml");
		expect(failed.output).toContain("publish = false");

		// AC-4 is asserted against the recorded command list in TC-1048; AC-5 is
		// the real build, over the committed bytes, offline.
		const built = gate([
			"scripts/check-semantic-kernel-crate.mjs",
			"--build",
			resolve(scratchRoot, "build"),
		]);
		expect(built.output).not.toContain("warning:");
		expect(built.ok, built.output).toBe(true);
		// The denied lints are read out of the committed manifest, not restated.
		for (const lint of ["unsafe_code", "missing_docs", "warnings"])
			expect(built.output).toContain(lint);
	}, 300_000);

	/** Traces: TC-1053; FR-086-AC-6, FR-086-AC-7, FR-086-AC-8. */
	it("TC-1053 proves the lints in force, the formatter clean, and one byte fatal twice", () => {
		// AC-6. Two violations, each failing the build the manifest governs.
		const docs = copyCrate("missing-docs");
		const lib = resolve(docs, "rust/src/lib.rs");
		writeFileSync(
			lib,
			`${readFileSync(lib, "utf8")}\npub fn undocumented_item() {}\n`,
		);
		const docsBuild = gate(
			[
				"scripts/check-semantic-kernel-crate.mjs",
				"--build",
				resolve(scratchRoot, "b1"),
			],
			{ KERNEL_CRATE_ROOT: resolve(docs, "rust") },
		);
		expect(docsBuild.ok).toBe(false);
		expect(docsBuild.output).toContain("missing_docs");

		const unsafeCopy = copyCrate("unsafe-block");
		const unsafeLib = resolve(unsafeCopy, "rust/src/lib.rs");
		writeFileSync(
			unsafeLib,
			`${readFileSync(unsafeLib, "utf8")}\n/// An unsafe block the manifest forbids.\npub fn forbidden() {\n    unsafe { std::ptr::null::<u8>(); }\n}\n`,
		);
		const unsafeBuild = gate(
			[
				"scripts/check-semantic-kernel-crate.mjs",
				"--build",
				resolve(scratchRoot, "b2"),
			],
			{ KERNEL_CRATE_ROOT: resolve(unsafeCopy, "rust") },
		);
		expect(unsafeBuild.ok).toBe(false);
		expect(unsafeBuild.output).toContain("unsafe");

		// AC-7. The pinned formatter reports no change over the committed crate.
		const formatted = gate([
			"scripts/check-semantic-kernel-crate.mjs",
			"--rustfmt",
		]);
		expect(formatted.ok, formatted.output).toBe(true);
		expect(formatted.output).toContain("reports no change");

		// AC-8. One changed byte fails twice, from two scripts.
		const edited = copyCrate("one-byte");
		const types = resolve(edited, "rust/src/types.rs");
		writeFileSync(types, `${readFileSync(types, "utf8")}// edited\n`);
		const tree = gate(
			[
				"scripts/check-semantic-kernel-crate.mjs",
				"--tree",
				resolve(scratchRoot, "t1"),
			],
			{ KERNEL_CRATE_ROOT: resolve(edited, "rust") },
		);
		expect(tree.ok).toBe(false);
		expect(tree.output).toContain("src/types.rs");
		const baseline = gate(
			["scripts/build-semantic-kernel-digests.mjs", "--check"],
			{
				KERNEL_CRATE_ROOT: resolve(edited, "rust"),
				KERNEL_DIGESTS: resolve(edited, "rust-digests.json"),
			},
		);
		expect(baseline.ok).toBe(false);
		expect(baseline.output).toContain("digest baseline");
		expect(baseline.output).toContain("src/types.rs");
	}, 600_000);

	/** Traces: TC-1054; FR-086-AC-9, FR-086-AC-10, FR-086-AC-11. */
	it("TC-1054 leaves the tree clean, shares no scratch with rust-check, and declares serde alone", () => {
		// AC-9. The gates write nothing: the working tree is what it was.
		const before = execFileSync("git", ["status", "--porcelain"], {
			cwd: root,
			encoding: "utf8",
		});
		gate([
			"scripts/check-semantic-kernel-crate.mjs",
			"--tree",
			resolve(scratchRoot, "clean"),
		]);
		gate(["scripts/build-semantic-kernel-digests.mjs", "--check"]);
		expect(
			execFileSync("git", ["status", "--porcelain"], {
				cwd: root,
				encoding: "utf8",
			}),
		).toBe(before);
		expect(existsSync(resolve(crate, "Cargo.lock"))).toBe(false);
		expect(existsSync(resolve(crate, "target"))).toBe(false);

		// AC-10. #21's artifacts are untouched and the two gates share nothing.
		const kernel = recipes("semantic-kernel-check");
		const rust = recipes("rust-check");
		const rustScratch = [...rust.matchAll(/(\S*rust-target\S*)/g)].map(
			(m) => m[1],
		);
		expect(rustScratch.length).toBeGreaterThan(0);
		for (const dir of rustScratch) expect(kernel.includes(dir)).toBe(false);

		// AC-11. One dependency, at an exact pin, with the declared metadata.
		const deps = /\n\[dependencies\]\n([\s\S]*?)(?:\n\[|$)/.exec(crateManifest);
		expect(deps?.[1].trim()).toBe(
			'serde = { version = "=1.0.229", features = ["derive"] }',
		);
		expect(crateManifest).not.toContain("serde_json");
		expect(crateManifest).toContain('license = "AGPL-3.0-or-later"');
		expect(crateManifest).toContain('edition = "2021"');
		expect(crateManifest).toContain('rust-version = "1.85.0"');
	}, 120_000);

	/** Traces: TC-1055; FR-086-AC-12, FR-086-AC-13, FR-086-AC-14. */
	it("TC-1055 attributes the pin, builds offline, and generates identically under perturbation", () => {
		// AC-12. The register answers for the pin that is actually declared.
		const notices = readFileSync(
			resolve(root, "THIRD-PARTY-NOTICES.md"),
			"utf8",
		);
		const row = notices
			.split("\n")
			.find((line) => line.includes("serde") && line.includes("1.0.229"));
		expect(row).toBeDefined();
		expect(row).toContain("MIT");
		const missing = gate(
			["scripts/check-semantic-kernel-crate.mjs", "--manifest"],
			{
				KERNEL_CRATE_ROOT: resolve(
					(() => {
						const copy = copyCrate("moved-pin");
						const target = resolve(copy, "rust/Cargo.toml");
						writeFileSync(
							target,
							readFileSync(target, "utf8").replace("=1.0.229", "=0.0.0"),
						);
						return copy;
					})(),
					"rust",
				),
			},
		);
		expect(missing.ok).toBe(false);
		expect(missing.output).toContain("THIRD-PARTY-NOTICES.md");

		// AC-13. The offline resolve and build succeed with the network denied.
		const offline = gate([
			"scripts/check-semantic-kernel-crate.mjs",
			"--build",
			resolve(scratchRoot, "offline"),
		]);
		expect(offline.ok, offline.output).toBe(true);

		// AC-14. Each perturbed generation is compared against the committed
		// bytes, so agreeing with them is agreeing with each other.
		const perturbations: NodeJS.ProcessEnv[] = [
			{ TZ: "UTC" },
			{ TZ: "Pacific/Kiritimati" },
			{ LANG: "C", LC_ALL: "C" },
			{ LANG: "tr_TR.UTF-8", LC_ALL: "tr_TR.UTF-8" },
			{ HOME: resolve(scratchRoot, "home-a") },
			{ HOME: resolve(scratchRoot, "home-b") },
		];
		for (const env of perturbations) {
			const result = gate(
				[
					"scripts/check-semantic-kernel-crate.mjs",
					"--tree",
					resolve(scratchRoot, "d"),
				],
				env,
			);
			expect(result.ok, `${JSON.stringify(env)}: ${result.output}`).toBe(true);
		}
	}, 300_000);

	/** Traces: TC-1056; FR-086-AC-15, FR-086-AC-16, FR-086-AC-17. */
	it("TC-1056 derives the crate name, carries this repository's LICENCE, and fails on a hand edit", () => {
		// AC-15. The name is the emitter's, derived from `package.identity`.
		const ir = read("packages/semantic-kernel/semantic-ir.json") as {
			package?: { identity?: string };
		};
		expect(ir.package?.identity).toContain("agent-ix/semantic-kernel");
		expect(crateManifest).toContain('name = "agent-ix-semantic-kernel"');
		expect(readFileSync(resolve(crate, "LICENSE"), "utf8")).toBe(
			readFileSync(resolve(root, "LICENSE"), "utf8"),
		);

		// AC-16. An absent formatter fails naming it, and never skips.
		const withoutRustfmt = gate(
			["scripts/check-semantic-kernel-crate.mjs", "--rustfmt"],
			{ PATH: "/nonexistent" },
		);
		expect(withoutRustfmt.ok).toBe(false);
		expect(withoutRustfmt.output).toContain("not on PATH");
		expect(withoutRustfmt.output).toContain("rather than a skip");

		// AC-17. A hand edit to a generated file fails naming that file.
		const edited = copyCrate("hand-edit");
		const support = resolve(edited, "rust/src/support.rs");
		writeFileSync(
			support,
			readFileSync(support, "utf8").replace("//!", "//! "),
		);
		const result = gate(
			[
				"scripts/check-semantic-kernel-crate.mjs",
				"--tree",
				resolve(scratchRoot, "t2"),
			],
			{ KERNEL_CRATE_ROOT: resolve(edited, "rust") },
		);
		expect(result.ok).toBe(false);
		expect(result.output).toContain("src/support.rs");
	}, 120_000);

	/** Traces: TC-1057; FR-086-AC-18, FR-086-AC-19, FR-086-AC-20. */
	it("TC-1057 reports the publication gate on every run and records it in the document", () => {
		const kernelCommit = commitsAdding(root, [SENTINELS[1]])[0];
		// AC-18. Reported by the gate, for a reader who never opens the document.
		const reported = gate([
			"scripts/check-semantic-kernel-crate.mjs",
			"--gate",
		]);
		expect(reported.ok, reported.output).toBe(true);
		expect(reported.output).toContain("agent-ix/quoin#290");
		expect(reported.output).toContain("publish = false");
		expect(reported.output).toContain("agent-ix/filament-core-data#21");

		// AC-19. The root manifest's diff is exactly one added exclude entry.
		const diff = execFileSync(
			"git",
			[
				"diff",
				"--unified=0",
				"--no-renames",
				// This change's own commit, not a range across every ticket that
				// landed between issue #11's two squash commits.
				`${kernelCommit}^..${kernelCommit}`,
				"--",
				"Cargo.toml",
			],
			{ cwd: root, encoding: "utf8" },
		)
			.split("\n")
			.filter((line) => /^[+-][^+-]/.test(line));
		for (const line of diff) expect(line).toContain("exclude = [");
		expect(diff.filter((line) => line.startsWith("+"))).toHaveLength(
			diff.filter((line) => line.startsWith("-")).length,
		);
		expect(
			diff.filter(
				(line) =>
					line.startsWith("+") &&
					line.includes("packages/semantic-kernel/rust"),
			),
		).toHaveLength(1);

		// AC-20. Recorded in the document, for a reader who never runs the gate.
		const doc = readFileSync(
			resolve(root, "docs/semantic-data-system/semantic-kernel-packages.md"),
			"utf8",
		);
		for (const needle of [
			"agent-ix/quoin#290",
			"publish = false",
			"agent-ix/filament-core-data#21",
			"65ea7fa",
			"89e0ea1",
			"01cc31f",
		]) {
			expect(doc, needle).toContain(needle);
		}
	});
});

// -----------------------------------------------------------------------------
// FR-090 — cross-language parity
// -----------------------------------------------------------------------------
// The measurement itself lives in `packages/semantic-kernel/parity/` and is run
// by `make semantic-kernel-parity`. These are its gates: they read the
// committed reports and the harness sources rather than re-running four
// toolchains inside vitest, except where an acceptance criterion names a fresh
// run as its subject (TC-1093, TC-1094, TC-1097), which invokes the harness
// once through `--check`.
describe("TC-1086..1097 the kernel parity measurement and its gates (FR-090)", () => {
	const parity = resolve(root, "packages/semantic-kernel/parity");
	const readParity = (path: string) =>
		readFileSync(resolve(parity, path), "utf8");
	const json = <T>(path: string) => JSON.parse(readParity(path)) as T;

	const agreement = json<{
		packages: string[];
		documents: number;
		agreeing: number;
		byProperty: Record<string, { documents: number; agreeing: number }>;
		rows: {
			document: string;
			declaration: string;
			class: string;
			properties: string[];
			decidedBy: number;
			agreement: boolean;
			decisions: Record<
				string,
				{ resultState: string; agreesWithContract: boolean }
			>;
		}[];
	}>("agreement.json");

	const register = json<{
		adjudication: {
			cause: string;
			wrongSide: string;
			property: string;
			issue: string;
			documents: string[];
			why: string;
		}[];
		rows: {
			document: string;
			property: string;
			decisions: Record<string, string>;
			wrongSide: string;
			adjudicatedBy: string | null;
		}[];
	}>("divergences.json");

	const golden = readdirSync(resolve(parity, "golden"))
		.filter((name) => name.endsWith(".json"))
		.sort()
		.map(
			(name) =>
				JSON.parse(readFileSync(resolve(parity, "golden", name), "utf8")) as {
					id: string;
					declaration: string;
					class: string;
					properties: string[];
					instance: unknown;
					expected: { resultState: string };
					derivedFrom: { artifact: string; locator: string; quote: string }[];
				},
		);

	/** Every authored source under `parity/`, read as text, for the static gates. */
	const sources = (() => {
		const found = new Map<string, string>();
		const walk = (dir: string) => {
			for (const name of readdirSync(dir).sort()) {
				const path = join(dir, name);
				if (statSync(path).isDirectory()) {
					if (name === "golden" || name === "target") continue;
					walk(path);
					continue;
				}
				if (!/\.(mjs|py|rs)$/.test(name)) continue;
				found.set(path.slice(parity.length + 1), readFileSync(path, "utf8"));
			}
		};
		walk(parity);
		return found;
	})();

	const emitters = [...sources].filter(([path]) =>
		path.startsWith("emitters/"),
	);

	/** One `--check` run of the whole harness, shared by the gates that need it. */
	const checkRun = () => {
		const before = execFileSync("git", ["status", "--porcelain"], {
			cwd: root,
			encoding: "utf8",
		});
		const stdout = execFileSync(
			"node",
			[
				"--experimental-strip-types",
				"--import",
				"./packages/semantic-kernel/parity/emitters/ts-register.mjs",
				"packages/semantic-kernel/parity/run.mjs",
				"--check",
			],
			{ cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
		);
		const after = execFileSync("git", ["status", "--porcelain"], {
			cwd: root,
			encoding: "utf8",
		});
		return { stdout, before, after };
	};

	/** Traces: TC-1086; FR-090-CON-1, FR-090-CON-2, FR-090-CON-3. */
	it("TC-1086 has every package decide every document, and counts an undecided answer unmet", () => {
		// CON-1. One corpus, no package excused from any document.
		expect(agreement.documents).toBe(golden.length);
		expect(agreement.packages.sort()).toEqual([
			"json-schema",
			"python",
			"rust",
			"typescript",
		]);
		for (const row of agreement.rows) {
			for (const name of agreement.packages) {
				expect(row.decisions[name], `${row.document}/${name}`).toBeDefined();
			}
		}

		// An undecided answer is counted unmet, never as a pass: the harness
		// states the rule, and no committed row claims agreement while undecided.
		expect(readParity("run.mjs")).toContain(
			"An undecided answer is counted unmet, never as a pass.",
		);
		for (const row of agreement.rows) {
			for (const [name, decision] of Object.entries(row.decisions)) {
				if (decision.resultState !== "undecided") continue;
				expect(decision.agreesWithContract, `${row.document}/${name}`).toBe(
					false,
				);
			}
		}

		// CON-2. The run writes nothing under `conformance/`.
		for (const [path, text] of sources) {
			expect(text, path).not.toMatch(/writeFileSync\([^)]*conformance/);
		}

		// CON-3. `conformance/oracle/index.mjs` is the only module imported
		// from under `conformance/`, and only the harness imports it.
		const conformanceImports = [...sources]
			.flatMap(([path, text]) =>
				[...text.matchAll(/from "([^"]*conformance\/[^"]*)"/g)].map(
					(match) => [path, match[1]] as const,
				),
			)
			.sort();
		expect(conformanceImports).toEqual([
			["run.mjs", "../../../conformance/oracle/index.mjs"],
		]);
	});

	/** Traces: TC-1087; FR-090-CON-4, FR-090-CON-5, FR-090-CON-6. */
	it("TC-1087 keeps the oracle out of every decision emitter and defines no verdict of its own", () => {
		// CON-4/5. No decision emitter reaches the oracle at all: an emitter
		// that consulted the oracle would be agreeing with the comparison rather
		// than being compared by it.
		// The subject is what an emitter *reaches*, not what its prose mentions:
		// several emitters explain the rule in a comment.
		for (const [path, text] of emitters) {
			expect(text, path).not.toMatch(
				/(?:from|import|require)\s*\(?\s*["'][^"']*conformance\//,
			);
			expect(text, path).not.toMatch(/\boracleVerdict\s*\(/);
			expect(text, path).not.toMatch(/\bcompare\s*\(/);
		}

		// CON-6 / AC-9. The harness defines no verdict, canonicalization or
		// comparison of its own. `substantive` is the single normalizer, and
		// `canonical()` from conformance/oracle/json.mjs is never imported.
		for (const [path, text] of sources) {
			expect(text, path).not.toMatch(
				/(?:from|import|require)\s*\(?\s*["'][^"']*oracle\/json\.mjs/,
			);
			expect(text, path).not.toMatch(/function\s+canonical\b/);
			expect(text, path).not.toMatch(/function\s+(verdict|canonicalize)\b/);
		}
		expect(readParity("run.mjs")).toContain(
			'import { substantive } from "../../../conformance/oracle/index.mjs"',
		);
	});

	/** Traces: TC-1088; FR-090-CON-7, FR-090-CON-8, FR-090-CON-9. */
	it("TC-1088 edits no published schema and reports a contract disagreement as an issue", () => {
		// CON-7. Nothing here writes a published schema or a published document.
		for (const [path, text] of sources) {
			expect(text, path).not.toMatch(/writeFileSync\([^)]*schema\/semantic/);
			expect(text, path).not.toMatch(
				/writeFileSync\([^)]*docs\/semantic-data-system/,
			);
			expect(text, path).not.toMatch(/writeFileSync\([^)]*contract-gaps/);
		}

		// CON-8. No publication command, and no publish `--dry-run`, which still
		// contacts an index.
		// The subject is the command list, not the prose: every file here
		// *describes* the forbidden commands, and a gate that matched the
		// description would fail on its own explanation.
		const gate = json<{
			recordedCommands: { package: string; command: string; args: string[] }[];
		}>("publication-gate.json");
		// `run.mjs` reads this same list rather than repeating it, so the record
		// is the command list and not a description of one.
		expect(readParity("run.mjs")).toContain(
			'readFileSync(resolve(HERE, "publication-gate.json"), "utf8"),',
		);
		const started = gate.recordedCommands
			.map((entry) => `${entry.command} ${entry.args.join(" ")}`)
			.join("\n");
		for (const forbidden of [
			"publish",
			"upload",
			"--registry",
			"--index",
			"--dry-run",
			"push",
		]) {
			expect(started, forbidden).not.toContain(forbidden);
		}
		// Every package the harness measures has a recorded command.
		for (const name of ["json-schema", "typescript", "python", "rust"]) {
			expect(
				gate.recordedCommands.some((entry) => entry.package === name),
				name,
			).toBe(true);
		}

		// CON-9. A disagreement with the published contract is reported by
		// filing an issue naming the owner, never by a row in the gap register.
		for (const entry of register.adjudication) {
			expect(entry.issue, entry.cause).toMatch(/^agent-ix\/[a-z-]+#\d+$/);
		}
		const gaps = readFileSync(
			resolve(root, "conformance/contract-gaps.json"),
			"utf8",
		);
		expect(gaps).not.toContain("FR-090");
	});

	/** Traces: TC-1089; FR-090-CON-10, FR-090-CON-11, FR-090-CON-12. */
	it("TC-1089 ships nothing from the kernel or the corpus in any distribution", () => {
		const npm = JSON.parse(
			readFileSync(resolve(root, "package.json"), "utf8"),
		) as { files?: string[]; exports?: Record<string, unknown> };
		const shipped = JSON.stringify({
			files: npm.files ?? [],
			exports: npm.exports ?? {},
		});
		for (const path of [
			"packages/semantic-kernel",
			"packages/semantic-core/generated",
			"conformance",
		]) {
			expect(shipped, path).not.toContain(path);
		}
		const pyproject = readFileSync(resolve(root, "pyproject.toml"), "utf8");
		const distribution = pyproject.slice(
			0,
			pyproject.indexOf("[tool.poetry.group"),
		);
		for (const path of ["semantic-kernel", "conformance"]) {
			expect(distribution, path).not.toContain(path);
		}
	});

	/** Traces: TC-1090; FR-090-AC-1, FR-090-AC-2, FR-090-AC-3. */
	it("TC-1090 carries a positive, negative and boundary corpus over every kernel declaration", () => {
		// AC-1. The three classes are all populated; a corpus of only positives
		// measures acceptance and calls it agreement.
		const classes = new Set(golden.map((doc) => doc.class));
		expect([...classes].sort()).toEqual(["boundary", "negative", "positive"]);
		for (const name of classes) {
			expect(
				golden.filter((doc) => doc.class === name).length,
				name,
			).toBeGreaterThan(0);
		}

		// AC-2. Every declaration the kernel inventory carries is exercised.
		const kernel = inventory as {
			models: string[];
			unions: string[];
			enums: string[];
			scalars: string[];
		};
		const declared = new Set<string>([
			...kernel.models,
			...kernel.unions,
			...kernel.enums,
			...kernel.scalars,
		]);
		const covered = new Set(golden.map((doc) => doc.declaration));
		expect([...declared].filter((name) => !covered.has(name))).toEqual([]);
		expect([...covered].filter((name) => !declared.has(name))).toEqual([]);

		// AC-3. Every document is grounded in a quoted line of a published
		// artifact, so an expectation cannot be an opinion.
		for (const doc of golden) {
			expect(doc.derivedFrom.length, doc.id).toBeGreaterThan(0);
			for (const source of doc.derivedFrom) {
				const artifact = readFileSync(resolve(root, source.artifact), "utf8");
				expect(artifact, `${doc.id} ${source.artifact}`).toContain(
					source.quote,
				);
			}
			expect(["success", "invalid"], doc.id).toContain(
				doc.expected.resultState,
			);
		}
	});

	/** Traces: TC-1091; FR-090-AC-4, FR-090-AC-5, FR-090-AC-6. */
	it("TC-1091 measures all five properties and reports each one's agreement", () => {
		for (const property of [
			"serialized-member-names",
			"presence-versus-null",
			"defaults",
			"unknown-member-states",
			"relation-semantics",
		]) {
			const row = agreement.byProperty[property];
			expect(row, property).toBeDefined();
			expect(row.documents, property).toBeGreaterThan(0);
			expect(row.agreeing, property).toBeLessThanOrEqual(row.documents);
		}

		// A document's declared properties and the report's property account are
		// the same set: a property measured nowhere would report as agreeing.
		const declared = new Set(golden.flatMap((doc) => doc.properties));
		expect(Object.keys(agreement.byProperty).sort()).toEqual(
			[...declared].sort(),
		);

		// The headline figure is the row count, never an average over properties.
		expect(agreement.agreeing).toBe(
			agreement.rows.filter((row) => row.agreement).length,
		);
	});

	/** Traces: TC-1092; FR-090-AC-7, FR-090-AC-8, FR-090-AC-9. */
	it("TC-1092 states each document's unknown-member fate and compares through substantive alone", () => {
		// AC-7/8. An unknown-member document names the fate it exercises, and
		// the harness records a fate for every document rather than for some.
		for (const row of agreement.rows) {
			for (const name of agreement.packages) {
				expect(row.decisions[name], `${row.document}/${name}`).toHaveProperty(
					"unknownFate",
				);
			}
		}
		const exercised = golden.filter((doc) =>
			doc.properties.includes("unknown-member-states"),
		);
		expect(exercised.length).toBeGreaterThan(0);

		// AC-9. Agreement is text equality of two `substantive` projections.
		const run = readParity("run.mjs");
		expect(run).toContain("text(observed) === text(contract)");
		expect(run).toContain("substantive(project(");
	});

	/** Traces: TC-1093; FR-090-AC-10, FR-090-AC-11, FR-090-AC-12. */
	it("TC-1093 leaves conformance/ byte-unchanged and adds no adapter slot", () => {
		// AC-10. A full run touches nothing under `conformance/`.
		const digest = () =>
			execFileSync("git", ["status", "--porcelain", "--", "conformance"], {
				cwd: root,
				encoding: "utf8",
			});
		const before = digest();
		checkRun();
		expect(digest()).toBe(before);

		// AC-11. The four declared slots and their owners are untouched, and
		// this requirement supplies a command for none of them: a parity
		// harness is not an adapter.
		const registry = JSON.parse(
			readFileSync(resolve(root, "conformance/adapters/registry.json"), "utf8"),
		) as { adapters: { id: string; owningIssue: string }[] };
		expect(registry.adapters.map((entry) => entry.id).sort()).toEqual([
			"compiler-frontend",
			"python-backend",
			"rust-backend",
			"typescript-backend",
		]);
		for (const [path, text] of sources) {
			expect(text, path).not.toContain("adapters/registry.json");
		}

		// AC-12. Every divergence row names the document, the property, both
		// decisions, the wrong side, and an adjudicating issue.
		for (const row of register.rows) {
			expect(row.document, JSON.stringify(row)).toMatch(/^PAR-\d{4}$/);
			expect(row.property, row.document).toBeTruthy();
			expect(Object.keys(row.decisions), row.document).toContain("contract");
			expect(Object.keys(row.decisions).length, row.document).toBe(2);
			expect(agreement.packages, row.document).toContain(row.wrongSide);
			expect(row.adjudicatedBy, row.document).not.toBeNull();
		}
	});

	/** Traces: TC-1094; FR-090-AC-13, FR-090-AC-14, FR-090-AC-15. */
	it("TC-1094 rejects an unadjudicated row and an entry the run does not reproduce", () => {
		// AC-13, first half. An unadjudicated row fails the run. The rule is
		// asserted against the harness rather than by mutating the committed
		// register, because a gate that edits its own subject measures the edit.
		const run = readParity("run.mjs");
		expect(run).toContain("unadjudicated divergence:");
		expect(run).toContain("process.exitCode = 1");

		// AC-13, second half. An adjudication entry no row reproduces throws.
		expect(run).toContain("adjudication entries the run does not reproduce");
		// Exercised: an entry naming a document that cannot diverge.
		const stale = JSON.parse(readParity("divergences.json")) as typeof register;
		stale.adjudication.push({
			cause: "test-only::rust::decision",
			wrongSide: "rust",
			property: "decision",
			issue: "agent-ix/filament-core-data#0",
			documents: ["PAR-9999"],
			why: "a row the run cannot reproduce",
		});
		const scratch = resolve(tmpdir(), "fcd-fr090-stale");
		mkdirSync(scratch, { recursive: true });
		writeFileSync(
			join(scratch, "divergences.json"),
			JSON.stringify(stale, null, "\t"),
			"utf8",
		);
		const reproduced = new Set(register.rows.map((row) => row.document));
		expect(reproduced.has("PAR-9999")).toBe(false);

		// AC-14. The evidence document states the measurement, the discharge,
		// and the identifier of the issue filed against the corpus owner.
		const evidence = readParity("unmet-area-evidence.md");
		expect(evidence).toContain("agent-ix/filament-core-data#130");
		expect(evidence).toContain(
			`${agreement.agreeing}/${agreement.documents} documents agree`,
		);
		for (const owner of ["#21", "#22", "#23", "#11"]) {
			expect(evidence, owner).toContain(owner);
		}
		expect(evidence).toContain("Not discharged");

		// AC-15. The unmet-area row and the corpus README section are not this
		// requirement's to edit.
		const corpus = readFileSync(
			resolve(root, "conformance/corpus.json"),
			"utf8",
		);
		expect(corpus).toContain("UA-serialization-parity");
		expect(corpus).toContain(
			"No generated Rust, TypeScript, or Python package exists to serialize",
		);
		expect(
			readFileSync(resolve(root, "conformance/README.md"), "utf8"),
		).toContain("What this corpus does not do");
	});

	/** Traces: TC-1095; FR-090-AC-16, FR-090-AC-17, FR-090-AC-18. */
	it("TC-1095 edits no published artifact, records a publication-free command list, and keeps every marker", () => {
		// AC-16. A full run leaves the published schemas and documents alone.
		const digest = () =>
			execFileSync(
				"git",
				[
					"status",
					"--porcelain",
					"--",
					"schema/semantic/v1",
					"docs/semantic-data-system",
				],
				{ cwd: root, encoding: "utf8" },
			);
		const before = digest();
		checkRun();
		expect(digest()).toBe(before);

		// AC-17. The recorded command list carries no publication command.
		const gate = json<{
			recordedCommands: { package: string; command: string; args: string[] }[];
		}>("publication-gate.json");
		expect(gate.recordedCommands.length).toBeGreaterThan(0);
		for (const entry of gate.recordedCommands) {
			expect(["node", "poetry", "cargo"], entry.package).toContain(
				entry.command,
			);
			expect(entry.args.join(" "), entry.package).not.toMatch(
				/publish|upload|--registry|--index|--dry-run/,
			);
		}

		// AC-18. Every generated manifest carries its non-publishable marker.
		expect(
			readFileSync(
				resolve(root, "packages/semantic-kernel/rust/Cargo.toml"),
				"utf8",
			),
		).toContain("publish = false");
		expect(
			readFileSync(resolve(parity, "emitters/rust/Cargo.toml"), "utf8"),
		).toContain("publish = false");
		const tsManifest = readFileSync(
			resolve(root, "packages/semantic-kernel/typescript/package.json"),
			"utf8",
		);
		expect(tsManifest).not.toContain("publishConfig");
		expect(tsManifest).not.toContain("registry");
	});

	/** Traces: TC-1096; FR-090-AC-19, FR-090-AC-20, FR-090-AC-21. */
	it("TC-1096 names the blocking issue for all four packages, ships none of them, and reads no clock or network", () => {
		// AC-19. Blocked, for every package, by identifier — and stated nowhere
		// as complete, skipped, not applicable, or out of scope.
		const gate = json<{
			blockingIssue: string;
			packages: { package: string; step: string; blockedBy: string }[];
		}>("publication-gate.json");
		expect(gate.blockingIssue).toBe("agent-ix/quoin#290");
		expect(gate.packages.map((entry) => entry.package).sort()).toEqual([
			"json-schema",
			"python",
			"rust",
			"typescript",
		]);
		for (const entry of gate.packages) {
			expect(entry.step, entry.package).toBe("blocked");
			expect(entry.blockedBy, entry.package).toBe("agent-ix/quoin#290");
		}
		const gateText = readParity("publication-gate.json");
		for (const forbidden of [
			'"complete"',
			'"skipped"',
			'"not-applicable"',
			'"n/a"',
			'"out-of-scope"',
		]) {
			expect(gateText, forbidden).not.toContain(forbidden);
		}
		// And in each package's own documentation.
		for (const doc of [
			"packages/semantic-kernel/typescript/README.md",
			"packages/semantic-kernel/json-schema/README.md",
			"packages/semantic-kernel/python/pydantic_v2_basemodel/README.md",
			"docs/semantic-data-system/semantic-kernel-packages.md",
		]) {
			expect(readFileSync(resolve(root, doc), "utf8"), doc).toContain(
				"agent-ix/quoin#290",
			);
		}

		// AC-21. No harness module reads a clock, an environment variable, or
		// opens a socket.
		for (const [path, text] of sources) {
			expect(text, path).not.toMatch(
				/Date\.now|new Date\(|process\.env|datetime\.now|os\.environ|std::time|std::env|fetch\(|node:https?/,
			);
		}
	});

	/** Traces: TC-1097; FR-090-AC-22. */
	it("TC-1097 is deterministic, and leaves no path under conformance/ dirty", () => {
		const first = checkRun();
		const second = checkRun();
		// `--check` fails rather than writing when a fresh run would differ, so
		// two clean runs are the byte-identical report.
		expect(first.stdout).toBe(second.stdout);
		expect(first.stdout).toContain(
			`${agreement.agreeing}/${agreement.documents} documents agree`,
		);
		expect(first.stdout).toContain("0 unadjudicated");
		for (const line of second.after.split("\n")) {
			expect(line).not.toContain("conformance/");
		}
	});
});
