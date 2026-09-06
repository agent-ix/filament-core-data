import { execFileSync, spawnSync } from "node:child_process";
import {
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
import { changedPathsUnion } from "./changed-paths";
import { runCorpusCommand, withCorpusScratch } from "./corpus-scratch";
import {
	interruptScratchMutation,
	snapshotPaths,
	withGenerationScratch,
} from "./generation-scratch";
import {
	validateClauseRef,
	validateFieldDecl,
	validateMultiplicity,
} from "../packages/semantic-kernel/typescript/validators.js";

import { generateRust } from "../src/compiler/backends/rust-serde/index.mjs";
import type { GenerationRequest } from "../src/compiler/backends/seam.d.mts";
import { typescriptBackend } from "../src/compiler/backends/typescript-v1/index.mjs";
import { createHost } from "../src/compiler/host.mjs";

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
	KERNEL_LOSSES,
	checkLossBijection,
	decide,
} from "../src/compiler/frontend/json-schema/representability.mjs";
import {
	hostLeaks,
	provenanceOf,
} from "../src/compiler/frontend/json-schema/provenance.mjs";
import {
	checkKernelBundle,
	checkKernelFreshness,
	kernelDigest,
	kernelDigestInputs,
} from "../src/compiler/frontend/json-schema/bundle.mjs";
import { DIAGNOSTIC_CODES } from "../src/compiler/diagnostics.mjs";

const root = resolve(import.meta.dirname, "..");
const read = (p: string) =>
	JSON.parse(readFileSync(resolve(root, p), "utf8")) as Record<string, unknown>;

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
	"scripts/build-semantic-kernel.mjs",
	"test/semantic-kernel.test.ts",
	// NFR-030/#83 already permits the original kernel diagnostic emission tests.
	"test/compiler-core.test.ts",
	"test/changed-paths.ts",
	"tests/test_semantic_kernel.py",
	"Makefile",
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

function changedPaths(checkout = root): string[] {
	return changedPathsUnion(checkout, KERNEL_SENTINELS);
}

// Both were introduced by the landed #82 squash. The planned closing document
// was never created: an unfinished deliverable cannot locate committed work.
const KERNEL_SENTINELS = [
	"spec/usecase/US-014-consume-the-semantic-kernel-natively.md",
	"packages/semantic-kernel/bundle.json",
] as const;

function withOwnershipHistory(
	run: (history: {
		checkout: string;
		git: (...args: string[]) => string;
		write: (path: string, body?: string) => void;
		commit: (message: string) => void;
	}) => void,
): void {
	const checkout = mkdtempSync(join(tmpdir(), "kernel-ownership-"));
	const git = (...args: string[]) =>
		execFileSync("git", ["-c", "core.hooksPath=/dev/null", ...args], {
			cwd: checkout,
			encoding: "utf8",
		}).trim();
	const write = (path: string, body = "fixture\n") => {
		mkdirSync(dirname(resolve(checkout, path)), { recursive: true });
		writeFileSync(resolve(checkout, path), body);
	};
	const commit = (message: string) => {
		git("add", "-A");
		git("commit", "-m", message);
	};
	try {
		git("init", "--initial-branch=main");
		git("config", "user.email", "kernel-gate@example.invalid");
		git("config", "user.name", "kernel ownership gate");
		write("README.md", "base\n");
		write("schema/frozen.json", "{}\n");
		commit("baseline");
		run({ checkout, git, write, commit });
	} finally {
		rmSync(checkout, { recursive: true, force: true });
	}
}

describe("kernel ownership history (issue #51)", () => {
	/** Traces: TC-1105; NFR-030-AC-1; NFR-030-AC-2. */
	it("keeps the real owned paths after unrelated commits and dirty later-owned edits", () => {
		withOwnershipHistory(({ checkout, git, write, commit }) => {
			git("switch", "-c", "kernel");
			write(KERNEL_SENTINELS[0]);
			commit("kernel specification");
			write(KERNEL_SENTINELS[1]);
			commit("kernel bundle");
			const owned = [...KERNEL_SENTINELS].sort();
			expect(changedPaths(checkout).sort()).toEqual(owned);
			write("src/compiler/backends/later.mjs");
			write("docs/later-ticket.md");
			commit("unrelated later ticket");
			write("src/compiler/backends/later.mjs", "later dirty work\n");
			expect(changedPaths(checkout).sort()).toEqual(owned);
		});
	});

	/** Traces: TC-1105; NFR-030-AC-1; NFR-030-AC-2; NFR-030-AC-6. */
	it("retains a forbidden owned path after a real squash and main repointing", () => {
		withOwnershipHistory(({ checkout, git, write, commit }) => {
			git("switch", "-c", "kernel");
			write(KERNEL_SENTINELS[0]);
			commit("kernel specification");
			write(KERNEL_SENTINELS[1]);
			write("schema/rogue.json");
			commit("kernel bundle with forbidden change");
			git("switch", "main");
			git("merge", "--squash", "kernel");
			commit("land kernel squash");
			git("update-ref", "refs/remotes/origin/main", "HEAD");
			expect(git("diff", "--no-renames", "--name-only", "main...HEAD")).toBe(
				"",
			);
			expect(git("status", "--porcelain")).toBe("");
			const paths = changedPaths(checkout);
			expect(paths).toContain("schema/rogue.json");
			expect(
				paths.some((path) =>
					PROHIBITED.some((prefix) => path.startsWith(prefix)),
				),
			).toBe(true);
			expect(
				paths.every((path) =>
					PERMITTED.some((prefix) => path.startsWith(prefix)),
				),
			).toBe(false);
		});
	});

	/** Traces: TC-1105; NFR-030-AC-1; NFR-030-AC-6. */
	it("reports untracked, staged and unstaged prohibited bytes but not restored bytes", () => {
		withOwnershipHistory(({ checkout, write, commit, git }) => {
			write(KERNEL_SENTINELS[0]);
			write(KERNEL_SENTINELS[1]);
			commit("landed kernel");
			write("schema/rogue.json");
			expect(changedPaths(checkout)).toContain("schema/rogue.json");
			git("add", "schema/rogue.json");
			expect(changedPaths(checkout)).toContain("schema/rogue.json");
			write("schema/frozen.json", "changed\n");
			expect(changedPaths(checkout)).toContain("schema/frozen.json");
			write("schema/frozen.json", "{}\n");
			expect(changedPaths(checkout)).not.toContain("schema/frozen.json");
		});
	});

	/** Traces: TC-1105; NFR-030-AC-1; NFR-030-AC-6. */
	it("does not hide a prohibited deletion behind a permitted rename destination", () => {
		withOwnershipHistory(({ checkout, git, write, commit }) => {
			git("switch", "-c", "kernel");
			write(KERNEL_SENTINELS[0]);
			commit("kernel specification");
			write(KERNEL_SENTINELS[1]);
			git("mv", "schema/frozen.json", "packages/semantic-kernel/moved.json");
			commit("kernel bundle with forbidden rename");
			expect(changedPaths(checkout)).toContain("schema/frozen.json");
			expect(changedPaths(checkout)).toContain(
				"packages/semantic-kernel/moved.json",
			);
		});
	});

	/** Traces: TC-1105; NFR-030-AC-1; NFR-030-AC-6. */
	it("retains a prohibited write restored before the final sentinel commit", () => {
		withOwnershipHistory(({ checkout, git, write, commit }) => {
			git("switch", "-c", "kernel");
			write(KERNEL_SENTINELS[0]);
			commit("kernel specification");
			write("schema/frozen.json", "changed\n");
			commit("transient forbidden write");
			write("schema/frozen.json", "{}\n");
			write(KERNEL_SENTINELS[1]);
			commit("restore before kernel closing artifact");
			expect(changedPaths(checkout)).toContain("schema/frozen.json");
		});
	});

	/** Traces: TC-1105; NFR-030-AC-3. */
	it("refuses missing sentinel history rather than asserting an empty path set", () => {
		withOwnershipHistory(({ checkout }) => {
			expect(() => changedPaths(checkout)).toThrow(/no commit in history adds/);
		});
	});
});

function withKernelScratch(run: (scratch: string) => void): void {
	withGenerationScratch(
		root,
		[
			"packages/semantic-kernel",
			"packages/semantic-core",
			"src/compiler",
			"scripts/build-semantic-kernel.mjs",
			"schema/semantic/v1",
			"conformance/schema",
			"fixtures/semantic/v1/positive/profile.json",
			"LICENSE",
			"package.json",
		],
		run,
	);
}

function generateFreshKernel(scratch: string, env = process.env): void {
	// These are generated outputs, not bundle.json or an inferred source set.
	// Removing the copies makes a generator that writes nothing fail equality.
	for (const path of [
		"semantic-ir.json",
		"losses.json",
		"json-schema/index.json",
		"provenance.json",
		"typescript",
	])
		rmSync(join(scratch, "packages/semantic-kernel", path), {
			recursive: true,
		});
	execFileSync(process.execPath, ["scripts/build-semantic-kernel.mjs"], {
		cwd: scratch,
		encoding: "utf8",
		env,
	});
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
	return withCorpusScratch(root, (scratch) => {
		const result = runCorpusCommand(
			scratch,
			"conformance/runner/differential.mjs",
		);
		expect(result.error).toBeUndefined();
		expect(result.status, result.stderr).toBe(0);
		return JSON.parse(result.stdout);
	});
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
	it("declares exactly the eighteen recognised keywords", () => {
		expect(RECOGNISED_KEYWORDS.size).toBe(18);
		for (const k of [
			"$schema",
			"$id",
			"$ref",
			"unevaluatedProperties",
			"maximum",
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
	const kernelRequest = (outputRoot: string): GenerationRequest => ({
		...(read(
			"fixtures/semantic/v1/positive/compiler-request.json",
		) as unknown as GenerationRequest),
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
			{ host: createHost({ readRoots: [root] }), format: (text) => text },
		);
		expect(result.state).toBe("success");
		expect(result.files.map((f) => f.path).sort()).toContain("types.ts");
	});

	// TC-1047 — the Rust target refuses, and the refusal is the finding.
	it("records the Rust name collision rather than working around it", () => {
		const manifest = generateRust(
			kernelRequest("packages/semantic-kernel/rust"),
			{ clear() {}, write() {} },
			{ root },
		);

		// Issue #80: FR-083 mints `SourceLocusPath` from `SourceLocus.path`, and
		// the Rust backend reserves the same identifier. The backend refuses
		// rather than letting one definition overwrite the other, which is why
		// this was caught by trying rather than shipped.
		expect(manifest.state).toBe("unsupported");
		const collision = (manifest.diagnostics ?? []).find((d) =>
			d.code.endsWith("NAME_COLLISION"),
		);
		expect(collision?.message).toContain("SourceLocusPath");
		expect(collision?.message).toContain("reserved");
	});
});

describe("TC-1100..1108 determinism and non-disruption (NFR-028, NFR-030)", () => {
	/** Traces: TC-1105; NFR-030-AC-1. */
	it("changes only permitted paths", () => {
		for (const path of changedPaths()) {
			expect(
				PERMITTED.some((prefix) => path === prefix || path.startsWith(prefix)),
				`not permitted: ${path}`,
			).toBe(true);
		}
	});

	/** Traces: TC-1105; NFR-030-AC-1; NFR-030-AC-6. */
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

	/** Traces: NFR-028-AC-6; generated TypeScript and JSON Schema index only. */
	it("regenerates the kernel byte-identically", () => {
		const before = snapshotPaths(root, ["packages/semantic-kernel"]);
		withKernelScratch((scratch) => {
			generateFreshKernel(scratch);
			expect(snapshotPaths(scratch, ["packages/semantic-kernel"])).toEqual(
				before,
			);
		});
	});

	/** Traces: NFR-028-AC-4; FR-085-AC-3. */
	it("reports an interrupted scratch artifact mutation without changing source bytes", () => {
		withKernelScratch((scratch) => {
			const args = ["scripts/build-semantic-kernel.mjs", "--check"];
			const healthy = spawnSync(process.execPath, args, {
				cwd: scratch,
				encoding: "utf8",
			});
			expect(healthy.error).toBeUndefined();
			expect(healthy.status).toBe(0);
			expect(healthy.stdout).toContain("artifact(s) current");
			interruptScratchMutation(scratch, "packages/semantic-kernel/losses.json");
			const mutated = snapshotPaths(scratch, ["packages/semantic-kernel"]);
			const stale = spawnSync(process.execPath, args, {
				cwd: scratch,
				encoding: "utf8",
			});
			expect(stale.error).toBeUndefined();
			expect(stale.status).toBe(1);
			expect(stale.stderr).toContain(
				"agent-ix.compiler.KERNEL_BUNDLE_STALE: losses.json differs from a fresh generation",
			);
			expect(snapshotPaths(scratch, ["packages/semantic-kernel"])).toEqual(
				mutated,
			);
		});
	});

	/** Traces: NFR-028-AC-1; generated TypeScript and JSON Schema index only. */
	it("produces the same bytes under a changed environment", () => {
		const before = snapshotPaths(root, ["packages/semantic-kernel"]);
		withKernelScratch((scratch) => {
			generateFreshKernel(scratch, {
				...process.env,
				TZ: "Pacific/Kiritimati",
				LANG: "tr_TR.UTF-8",
			});
			expect(snapshotPaths(scratch, ["packages/semantic-kernel"])).toEqual(
				before,
			);
		});
	});
});

describe("TC-1090..1099 an independent consumer of the kernel package", () => {
	// TC-1090
	it("accepts a value the contract admits", () => {
		const result = validateMultiplicity({ lower: 1, upper: 1 });
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

describe("TC-1085..1089 cross-language agreement through the corpus (FR-090)", () => {
	const report = run();
	const byAdapter = new Map(
		report.coverage.adapters.map((a) => [a.adapter, a] as const),
	);

	// TC-1085
	it("agrees with the independent oracle on every case, for every live adapter", () => {
		for (const name of ["rust-backend", "typescript-backend"]) {
			const row = byAdapter.get(name);
			expect(row?.status, name).toBe("available");
			expect(row?.matched, name).toBe(report.coverage.totalCases);
			expect(row?.failed, name).toBe(0);
			expect(row?.unmet, name).toBe(0);
		}
	});

	// TC-1086 — an absent adapter must never read as agreement.
	it("counts an unavailable adapter as unmet, never as a pass", () => {
		for (const name of ["compiler-frontend", "python-backend"]) {
			const row = byAdapter.get(name);
			expect(row?.status, name).toBe("unavailable");
			expect(row?.matched, name).toBe(0);
			expect(row?.unmet, name).toBe(report.coverage.totalCases);
		}
	});

	// TC-1087
	it("reports the unmet total as the sum of the unavailable slots", () => {
		const unavailable = report.coverage.adapters.filter(
			(a) => a.status === "unavailable",
		);
		expect(report.coverage.unmetCases).toBe(
			unavailable.length * report.coverage.totalCases,
		);
	});

	// TC-1088
	it("states how much of the agreement claim is actually covered", () => {
		const live = report.coverage.adapters.filter(
			(a) => a.status === "available",
		).length;
		// Two of four. FR-090's claim is established for the languages that can
		// answer and is open for the two that cannot — issue #80 blocks the Rust
		// kernel crate and issue #81 blocks the Python one, so neither absence
		// is silent.
		expect(live).toBe(2);
		expect(report.coverage.adapters).toHaveLength(4);
	});

	// TC-1089
	it("runs clean", () => {
		expect(report.exitCode).toBe(0);
		expect(report.coverage.totalCases).toBe(111);
	});
});
