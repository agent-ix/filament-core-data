import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { changedPathsFrom } from "./changed-paths.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const spike = resolve(root, "spikes/typespec-feasibility");

/**
 * Exact issue #4 matrix trace inventory:
 * TC-089, TC-090, TC-091, TC-092, TC-093, TC-094, TC-095, TC-096, TC-097,
 * TC-098, TC-099, TC-100, TC-101, TC-102, TC-103, TC-104, TC-105, TC-106,
 * TC-107, TC-108, TC-109, TC-110, TC-111, TC-112, TC-113, TC-114, TC-115,
 * TC-116, TC-117, TC-118, TC-119, TC-120, TC-121, TC-122, TC-123, TC-124,
 * TC-125, TC-126, TC-127, TC-128, TC-129.
 * Acceptance criteria: FR-014-AC-1, FR-014-AC-2, FR-014-AC-3, FR-015-AC-1,
 * FR-015-AC-2, FR-015-AC-3, FR-015-AC-4, FR-016-AC-1, FR-016-AC-2,
 * FR-016-AC-3, FR-016-AC-4, FR-017-AC-1, FR-017-AC-2, FR-017-AC-3,
 * FR-017-AC-4, FR-017-AC-5, FR-018-AC-1, FR-018-AC-2, FR-018-AC-3,
 * FR-018-AC-4, US-004-AC-1, US-004-AC-2, StR-001-AC-1.
 */

type JsonObject = Record<string, unknown>;

function readJson(path: string): JsonObject {
	return JSON.parse(readFileSync(resolve(spike, path), "utf8")) as JsonObject;
}

function records(value: unknown, label: string): JsonObject[] {
	expect(Array.isArray(value), label).toBe(true);
	return value as JsonObject[];
}

function nonempty(value: unknown, label: string): string {
	expect(typeof value, label).toBe("string");
	expect(String(value).trim(), label).not.toBe("");
	return String(value);
}

function canonical(value: unknown): string {
	if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
	if (value !== null && typeof value === "object") {
		return `{${Object.entries(value as JsonObject)
			.sort(([left], [right]) => left.localeCompare(right))
			.map(([key, child]) => `${JSON.stringify(key)}:${canonical(child)}`)
			.join(",")}}`;
	}
	return JSON.stringify(value);
}

function fingerprint(paths: string[]): string {
	const hash = createHash("sha256");
	for (const path of [...paths].sort()) {
		hash.update(path);
		hash.update("\0");
		const content = readFileSync(resolve(spike, path), "utf8");
		hash.update(
			path.endsWith(".json") ? canonical(JSON.parse(content)) : content,
		);
		hash.update("\0");
	}
	return hash.digest("hex");
}

function changedPaths(): string[] {
	// Issue #19 note: this baseline moves. Once the change this suite guards
	// is merged, `main` carries it, the set empties, and every prohibition
	// below passes vacuously — the gate goes quiet rather than red. The fix
	// is `changedPathsOf` with a sentinel this suite's own change created;
	// picking that sentinel wrongly baselines against an unrelated tree and
	// makes the prohibition fail on history it was never meant to judge, so
	// it belongs to whoever owns these requirements. Tracked as issue #51.
	return changedPathsFrom(root, "main");
}

describe("TypeSpec feasibility gate", () => {
	/** Traces: TC-089..096; FR-014-AC-1..3. */
	it("pins the complete toolchain and representative modular slice", () => {
		const required = [
			"package.json",
			"tspconfig.yaml",
			"packages/semantic-core/package.json",
			"packages/semantic-core/main.tsp",
			"packages/assurance/package.json",
			"packages/assurance/main.tsp",
			"packages/wire/main.tsp",
			"mappings/projections.json",
			"evidence/toolchain.json",
		];
		for (const path of required)
			expect(existsSync(resolve(spike, path)), path).toBe(true);

		const tools = records(readJson("evidence/toolchain.json").tools, "tools");
		for (const tool of tools) {
			nonempty(tool.name, "tool.name");
			nonempty(tool.version, `${String(tool.name)}.version`);
			nonempty(tool.command, `${String(tool.name)}.command`);
			expect(tool.version).not.toMatch(/[x*^~]|latest/i);
		}
		const source = [
			readFileSync(resolve(spike, "packages/semantic-core/main.tsp"), "utf8"),
			readFileSync(resolve(spike, "packages/assurance/main.tsp"), "utf8"),
		].join("\n");
		for (const concept of [
			"Artifact",
			"SemanticObject",
			"Relation",
			"DomainEvent",
			"VerificationRun",
			"Evidence",
			"VerificationResult",
		])
			expect(source).toContain(concept);
		expect(source).toMatch(/\?\s*:/);
		expect(source).toMatch(/\|\s*null/);
		expect(source).toMatch(/Relation\[\]|Relation\s*\|/);
	});

	/** Traces: TC-097..103; FR-015-AC-1..4. */
	it("retains official JSON Schema, Protobuf, versioning, and diagnostic evidence", () => {
		for (const path of [
			"generated/official/json-schema/semantic.json",
			"generated/official/protobuf/semantic.proto",
			"evidence/official.json",
			"evidence/invalid-source.json",
		])
			expect(existsSync(resolve(spike, path)), path).toBe(true);
		const schema = readJson("generated/official/json-schema/semantic.json");
		expect(schema.$schema).toBe("https://json-schema.org/draft/2020-12/schema");
		nonempty(schema.$id, "$id");
		expect(JSON.stringify(schema)).toContain("unevaluatedProperties");
		expect(JSON.stringify(schema)).toMatch(/oneOf|anyOf/);
		const proto = readFileSync(
			resolve(spike, "generated/official/protobuf/semantic.proto"),
			"utf8",
		);
		expect(proto).toContain('syntax = "proto3"');
		expect(proto).toMatch(/reserved\s+\d+/);
		expect(proto).toMatch(/=\s*\d+;/);
		const invalid = readJson("evidence/invalid-source.json");
		expect(invalid.exitCode).not.toBe(0);
		nonempty(invalid.source, "invalid source");
		nonempty(invalid.diagnostic, "invalid diagnostic");
	});

	/** Traces: TC-104..112; FR-016-AC-1..4. */
	it("emits deterministic semantic IR, native types, and explicit projections", () => {
		for (const path of [
			"generated/custom/semantic-ir.json",
			"generated/custom/typescript/index.ts",
			"generated/custom/python/models.py",
			"generated/custom/python/models_dataclass.py",
			"generated/custom/rust/src/lib.rs",
			"generated/custom/arrow/schema.json",
			"generated/custom/markdown/mappings.json",
			"evidence/custom.json",
		])
			expect(existsSync(resolve(spike, path)), path).toBe(true);
		const ir = readJson("generated/custom/semantic-ir.json");
		expect(ir.schemaVersion).toBe("1.0.0");
		const irTypes = records(ir.types, "IR types");
		for (const type of irTypes) {
			for (const field of ["id", "name", "package", "kind", "role", "source"])
				nonempty(type[field], `ir.${field}`);
		}
		const semanticId = irTypes.find(
			(type) => type.name === "SemanticId",
		) as JsonObject;
		expect((semanticId.constraints as JsonObject).pattern).toBe(
			"^[a-z][a-z0-9-]*:[^\\s]+$",
		);
		const artifact = irTypes.find(
			(type) => type.name === "Artifact",
		) as JsonObject;
		expect((artifact.versioning as JsonObject).packageVersions).toHaveLength(2);
		const artifactFields = records(artifact.fields, "Artifact fields");
		expect(artifactFields).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					name: "summary",
					optional: true,
					nullable: false,
				}),
				expect.objectContaining({
					name: "explicitNullNote",
					optional: false,
					nullable: true,
				}),
				expect.objectContaining({ name: "extensions", extensionPoint: true }),
				expect.objectContaining({
					name: "legacyLabel",
					deprecated: "Use extensions with a versioned vocabulary.",
				}),
			]),
		);
		const result = irTypes.find(
			(type) => type.name === "VerificationResult",
		) as JsonObject;
		expect(result.discriminator).toBe("status");
		const relation = irTypes.find(
			(type) => type.name === "Relation",
		) as JsonObject;
		expect(records(relation.fields, "Relation fields")).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ name: "related", recursive: true }),
			]),
		);
		const arrow = readJson("generated/custom/arrow/schema.json");
		expect(arrow.authority).toBe("derived-analytical-projection");
		nonempty(arrow.lossiness, "arrow lossiness");
		nonempty(arrow.provenance, "arrow provenance");
		const markdown = readJson("generated/custom/markdown/mappings.json");
		expect(markdown.rendererOwner).toBe("none");
		nonempty(markdown.roundTrip, "markdown roundTrip");
	});

	/** Traces: TC-113..118, TC-127; FR-017-AC-1..5, US-004-AC-1. */
	it("proves repeat generation, native consumers, goldens, and compatibility", () => {
		const validation = readJson("evidence/validation.json");
		const files = validation.fingerprintedFiles as string[];
		expect(validation.normalizedFingerprint).toBe(fingerprint(files));
		expect(validation.repeatNormalizedFingerprint).toBe(
			validation.normalizedFingerprint,
		);
		for (const target of ["typescript", "python", "rust"]) {
			const result = (validation.native as JsonObject)[target] as JsonObject;
			expect(result.compile).toBe("passed");
			expect(result.consumer).toBe("passed");
		}
		expect((validation.native as JsonObject).python).toEqual(
			expect.objectContaining({
				families: "pydantic-v2-basemodel-and-stdlib-dataclass",
			}),
		);
		expect(validation.goldenAgreement).toBe("passed-positive-and-negative");
		expect(validation.invalidGoldenAgreement).toBe("passed");
		expect(existsSync(resolve(spike, "generated/fixtures/invalid.json"))).toBe(
			true,
		);
		const compatibility = readJson("evidence/compatibility.json");
		expect(compatibility.examples).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ expected: "patch", actual: "patch" }),
				expect.objectContaining({ expected: "additive", actual: "additive" }),
				expect.objectContaining({ expected: "breaking", actual: "breaking" }),
			]),
		);
	});

	/** Traces: TC-119..122, TC-125..126, TC-128..129; FR-018, NFR-007, US-004-AC-2. */
	it("retains a complete capability record and recommendation inputs", () => {
		const evidence = readJson("evidence/capabilities.json");
		const capabilities = records(evidence.capabilities, "capabilities");
		expect(capabilities.length).toBeGreaterThanOrEqual(10);
		for (const capability of capabilities) {
			for (const field of [
				"id",
				"priority",
				"method",
				"command",
				"toolVersion",
				"result",
				"disposition",
				"limitation",
				"consequence",
				"rationale",
				"confidence",
			])
				nonempty(capability[field], `capability.${field}`);
			expect(capability.disposition).toMatch(
				/^(pass|partial|fail|not-applicable)$/,
			);
		}
		// The evidence file is a frozen 2026-08-30 snapshot. The decision it fed
		// is recorded in docs/semantic-data-system/adr/0005-typespec-structural-source.md,
		// so its typeSpecSelected/fallback/adrStatus fields are history, not state.
		nonempty(evidence.extensionMaintenanceCost, "extension maintenance cost");
		nonempty(evidence.costOfBeingWrong, "cost of being wrong");
		const report = readFileSync(resolve(spike, "report.md"), "utf8");
		expect(report).toContain("## Recommendation");
		expect(report).toContain("## Human Decision Gate");
	});

	/** Traces: TC-123..124; NFR-006. */
	it("keeps the spike isolated, unpublished, and non-canonical", () => {
		const allowed = [
			"conformance/",
			"plan/Plan-009-conformance-corpus-and-oracle/",
			"test/conformance-corpus.test.ts",
			"README.md",
			"biome.json",
			"docs/semantic-data-system/",
			"audit/filament-contract-census/",
			"package.json",
			"pnpm-lock.yaml",
			"spikes/typespec-feasibility/",
			"plan/Plan-001-semantic-data-architecture-record/",
			"plan/Plan-002-filament-contract-census/",
			"plan/Plan-003-typespec-feasibility/",
			"plan/Plan-004-semantic-package-contract/",
			"plan/Plan-005-semantic-ir-v1-1/",
			"plan/Plan-006-semantic-core-grammar/",
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
			"test/typespec-feasibility.test.ts",
			"test/semantic-architecture.test.ts",
			"test/contract-census.test.ts",
			"fixtures/semantic/v1/",
			"test/semantic-contract.test.ts",
			"src/compiler/",
			"tsconfig.json",
			"tsconfig.build.json",
			"plan/Plan-007-promote-prototype-emitters/",
			"test/compiler.test.ts",
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
			"test/compiler-core.test.ts",
			"test/changed-paths.ts",
			// Issue #19 also publishes two generated documents and excludes its
			// generated fixtures from the formatter.
			"docs/semantic-data-system/compiler-diagnostics.md",
			"docs/semantic-data-system/ir-compatibility-policy.md",
			"biome.json",
			"docs/semantic-data-system/typespec-feasibility.md",
		];
		for (const path of changedPaths()) {
			expect(
				allowed.some((prefix) => path === prefix || path.startsWith(prefix)),
				path,
			).toBe(true);
		}
		const packageJson = readJson("package.json");
		expect(packageJson.private).toBe(true);
		expect(packageJson.publishConfig).toBeUndefined();
		const validation = readJson("evidence/validation.json");
		expect(validation.packagePublications).toBe(0);
		expect(validation.currentSchemaMutations).toBe(0);
		expect(validation.consumerMutations).toBe(0);
		expect(validation.externalRepositoryMutations).toBe(0);
	});
});
