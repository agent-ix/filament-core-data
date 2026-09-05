import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { readdirSync } from "node:fs";

import { generateRust } from "../src/compiler/backends/rust-serde/index.mjs";
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

	// TC-1047 — the Rust target refuses, and the refusal is the finding.
	it("records the Rust name collision rather than working around it", () => {
		const manifest = generateRust(
			kernelRequest("packages/semantic-kernel/rust"),
			{ clear() {}, write() {} },
			{ root },
		) as { state: string; diagnostics?: { code: string; message: string }[] };

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
