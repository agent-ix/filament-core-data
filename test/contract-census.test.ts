import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { changedPathsFrom } from "./changed-paths.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const auditRoot = resolve(root, "audit/filament-contract-census");
const censusWorkspaceRoot = process.env.FILAMENT_CENSUS_WORKSPACE_ROOT;

/**
 * Exact matrix trace inventory for the issue #10 gate:
 * TC-054, TC-055, TC-056, TC-057, TC-058, TC-059, TC-060, TC-061, TC-062,
 * TC-063, TC-064, TC-065, TC-066, TC-067, TC-068, TC-069, TC-070, TC-071,
 * TC-072, TC-073, TC-074, TC-075, TC-076, TC-077, TC-078, TC-079, TC-080,
 * TC-081, TC-082, TC-083, TC-084, TC-085, TC-086, TC-087, TC-088.
 * Acceptance criteria: FR-009-AC-1, FR-009-AC-2, FR-009-AC-3, FR-009-AC-4,
 * FR-009-AC-5, FR-009-AC-6, FR-010-AC-1, FR-010-AC-2, FR-010-AC-3,
 * FR-010-AC-4, FR-010-AC-5, FR-011-AC-1, FR-011-AC-2, FR-011-AC-3,
 * FR-011-AC-4, FR-011-AC-5, FR-012-AC-1, FR-012-AC-2, FR-012-AC-3,
 * FR-012-AC-4, FR-013-AC-1, FR-013-AC-2, FR-013-AC-3, FR-013-AC-4,
 * FR-013-AC-5, NFR-005-AC-1, NFR-005-AC-2, NFR-005-AC-3,
 * NFR-005-AC-4, US-003-AC-1, US-003-AC-2.
 */

const requiredEvidence = [
	"README.md",
	"snapshot.json",
	"snapshot.md",
	"inventory.json",
	"inventory.md",
	"parity.json",
	"parity.md",
	"conflicts.json",
	"missing-contracts.json",
	"impact.json",
	"impact.md",
	"signoff-refresh.json",
	"validation.json",
] as const;

const explicitStates = new Set([
	"known",
	"none",
	"not-applicable",
	"unknown",
	"unavailable",
]);
const allowedDispositions = new Set([
	"fit",
	"fit-with-extension",
	"duplicate",
	"representation-local",
	"split-required",
	"replacement-candidate",
	"missing",
]);
const representationRoles = new Set([
	"authored",
	"generated",
	"persisted",
	"wire",
	"analytical",
	"extracted",
]);

type JsonObject = Record<string, unknown>;

function readJson(name: string): JsonObject {
	return JSON.parse(
		readFileSync(resolve(auditRoot, name), "utf8"),
	) as JsonObject;
}

function objects(value: unknown, label: string): JsonObject[] {
	expect(Array.isArray(value), label).toBe(true);
	return value as JsonObject[];
}

function text(value: unknown, label: string): string {
	expect(typeof value, label).toBe("string");
	expect((value as string).trim(), label).not.toBe("");
	return value as string;
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

function evidenceFingerprint(names: readonly string[]): string {
	const hash = createHash("sha256");
	for (const name of [...names].sort()) {
		hash.update(name);
		hash.update("\0");
		hash.update(canonical(readJson(name)));
		hash.update("\0");
	}
	return hash.digest("hex");
}

function sourceRepositoryPath(repository: JsonObject): string | undefined {
	const locator = text(repository.localPath, "repository.localPath");
	if (locator.startsWith("workspace://")) {
		if (!censusWorkspaceRoot) return undefined;
		const workspaceRelative = locator.slice("workspace://".length);
		expect(isAbsolute(workspaceRelative), locator).toBe(false);
		expect(workspaceRelative.split("/")).not.toContain("..");
		return resolve(censusWorkspaceRoot, workspaceRelative);
	}
	return locator;
}

function changedPaths(): string[] {
	return changedPathsFrom(root, "main");
}

describe("Filament contract census", () => {
	/** Traces: TC-073, TC-082; FR-013-AC-1, NFR-004. */
	it("contains every required audit artifact", () => {
		for (const name of requiredEvidence) {
			expect(existsSync(resolve(auditRoot, name)), name).toBe(true);
		}
		expect(
			existsSync(
				resolve(root, "reviews/2026-08-29-filament-contract-census.md"),
			),
		).toBe(true);
	});

	/** Traces: TC-054..058, TC-088; FR-009-AC-1..6. */
	it("pins repositories, corpus inputs, active work, access, and drift", () => {
		const snapshot = readJson("snapshot.json");
		expect(snapshot.schemaVersion).toBe("1.0.0");
		text(snapshot.generatedAt, "snapshot generatedAt");
		const repositories = objects(snapshot.repositories, "repositories");
		expect(repositories.length).toBeGreaterThanOrEqual(8);
		for (const repository of repositories) {
			for (const field of [
				"id",
				"canonicalUrl",
				"localPath",
				"defaultBranch",
				"inspectedBranch",
				"head",
				"status",
				"consequence",
				"confidence",
			]) {
				text(repository[field], `${String(repository.id)}.${field}`);
			}
			expect(repository.head).toMatch(/^[0-9a-f]{40}$/);
			expect(typeof repository.dirty).toBe("boolean");
			expect(Array.isArray(repository.worktrees)).toBe(true);
		}
		for (const pin of objects(snapshot.pins, "pins")) {
			text(pin.id, "pin id");
			text(pin.value, `${String(pin.id)}.value`);
			expect(pin.immutable, `${String(pin.id)}.immutable`).toBe(true);
			text(pin.source, `${String(pin.id)}.source`);
		}
		for (const collection of objects(
			snapshot.externalCollections,
			"externalCollections",
		)) {
			for (const field of [
				"id",
				"source",
				"method",
				"toolVersion",
				"accessStatus",
				"enumerationStatus",
				"consequence",
				"confidence",
			]) {
				text(collection[field], `${String(collection.id)}.${field}`);
			}
			expect(collection.enumerationStatus).toMatch(/^(complete|incomplete)$/);
			if (collection.enumerationStatus === "complete") {
				expect(collection.accessStatus).toBe("available");
			}
		}
		expect(objects(snapshot.activeWork, "activeWork").length).toBeGreaterThan(
			0,
		);

		const refresh = readJson("signoff-refresh.json");
		text(refresh.generatedAt, "signoff refresh generatedAt");
		expect(refresh.baselineGeneratedAt).toBe(snapshot.generatedAt);
		for (const source of objects(refresh.sources, "refresh sources")) {
			text(source.id, "refresh source id");
			expect(typeof source.drift).toBe("boolean");
			expect(typeof source.contractAffecting).toBe("boolean");
			text(source.disposition, `${String(source.id)}.disposition`);
			if (source.contractAffecting === true) {
				expect(refresh.readyCandidate).toBe(false);
				expect(source.disposition).toMatch(/^(refreshed|invalidated)$/);
			}
		}
	});

	/** Traces: TC-059..063; FR-010-AC-1..5. */
	it("inventories every repository and contract family with explicit evidence states", () => {
		const snapshot = readJson("snapshot.json");
		const inventory = readJson("inventory.json");
		const records = objects(inventory.records, "inventory records");
		const repositoryIds = new Set(
			objects(snapshot.repositories, "repositories").map((repo) =>
				text(repo.id, "repository id"),
			),
		);
		const families = new Set(
			objects(snapshot.contractFamilies, "contract families").map((family) =>
				text(family.id, "family id"),
			),
		);
		const ids = records.map((record) => text(record.id, "inventory id"));
		expect(new Set(ids).size).toBe(ids.length);
		const coveredRepos = new Set<string>();
		const coveredFamilies = new Set<string>();
		for (const record of records) {
			const repositoryId = text(
				record.repositoryId,
				`${String(record.id)}.repositoryId`,
			);
			const family = text(record.family, `${String(record.id)}.family`);
			expect(repositoryIds.has(repositoryId), repositoryId).toBe(true);
			expect(families.has(family), family).toBe(true);
			coveredRepos.add(repositoryId);
			coveredFamilies.add(family);
			for (const field of [
				"concept",
				"representation",
				"role",
				"language",
				"authority",
				"ownership",
				"producer",
			]) {
				text(record[field], `${String(record.id)}.${field}`);
			}
			expect(representationRoles.has(String(record.role))).toBe(true);
			const locus = record.source as JsonObject;
			text(locus.path, `${String(record.id)}.source.path`);
			text(locus.commit, `${String(record.id)}.source.commit`);
			expect(Number(locus.startLine)).toBeGreaterThan(0);
			expect(Number(locus.endLine)).toBeGreaterThanOrEqual(
				Number(locus.startLine),
			);
			for (const property of [
				"identity",
				"nullability",
				"defaults",
				"version",
				"provenance",
				"lossiness",
				"consumers",
			]) {
				const observation = record[property] as JsonObject;
				expect(
					explicitStates.has(String(observation.state)),
					`${String(record.id)}.${property}.state`,
				).toBe(true);
				text(observation.evidence, `${String(record.id)}.${property}.evidence`);
				if (["unknown", "unavailable"].includes(String(observation.state))) {
					text(
						observation.consequence,
						`${String(record.id)}.${property}.consequence`,
					);
				}
			}
		}
		expect(coveredRepos).toEqual(repositoryIds);
		expect(coveredFamilies).toEqual(families);
	});

	/** Traces: TC-060, TC-063, TC-084; FR-010-AC-2, FR-010-AC-5, NFR-004. */
	it("uses portable source locators and resolves them in a configured workspace", () => {
		const snapshot = readJson("snapshot.json");
		const repositories = new Map(
			objects(snapshot.repositories, "repositories").map((repository) => [
				String(repository.id),
				repository,
			]),
		);
		for (const record of objects(
			readJson("inventory.json").records,
			"records",
		)) {
			const repository = repositories.get(String(record.repositoryId));
			expect(repository, String(record.repositoryId)).toBeDefined();
			const source = record.source as JsonObject;
			const repositoryPath = sourceRepositoryPath(repository as JsonObject);
			const sourceRelativePath = text(
				source.path,
				`${String(record.id)}.source.path`,
			);
			expect(isAbsolute(sourceRelativePath), sourceRelativePath).toBe(false);
			expect(relative(".", sourceRelativePath).split("/")).not.toContain("..");
			if (!repositoryPath) continue;
			const sourcePath = resolve(repositoryPath, sourceRelativePath);
			expect(
				existsSync(sourcePath),
				`${String(record.id)} -> ${sourcePath}`,
			).toBe(true);
			expect(statSync(sourcePath).isFile(), sourcePath).toBe(true);
			expect(source.commit).toBe(repository?.head);
			const lineCount = readFileSync(sourcePath, "utf8").split("\n").length;
			expect(Number(source.endLine), sourcePath).toBeLessThanOrEqual(lineCount);
		}
	});

	/** Traces: TC-064..068; FR-011-AC-1..5. */
	it("records evidence-backed parity and defaults uncertainty to conflict", () => {
		const inventoryIds = new Set(
			objects(readJson("inventory.json").records, "records").map((record) =>
				String(record.id),
			),
		);
		const parity = readJson("parity.json");
		const concepts = objects(parity.concepts, "parity concepts");
		const dispositionByContract = new Map<string, number>();
		for (const concept of concepts) {
			text(concept.id, "parity concept id");
			text(concept.rationale, `${String(concept.id)}.rationale`);
			text(concept.confidence, `${String(concept.id)}.confidence`);
			text(concept.evidence, `${String(concept.id)}.evidence`);
			expect(
				allowedDispositions.has(String(concept.disposition)),
				String(concept.id),
			).toBe(true);
			const contractIds = concept.contractIds as string[];
			expect(Array.isArray(contractIds)).toBe(true);
			for (const contractId of contractIds) {
				expect(inventoryIds.has(contractId), contractId).toBe(true);
				dispositionByContract.set(
					contractId,
					(dispositionByContract.get(contractId) ?? 0) + 1,
				);
			}
			if (contractIds.length > 1) {
				expect(concept.comparisonStatus).toMatch(/^(compared|not-comparable)$/);
				text(concept.dimensions, `${String(concept.id)}.dimensions`);
			}
			if (concept.disposition === "fit") {
				expect(concept.equivalenceComplete).toBe(true);
				expect(concept.comparisonStatus).toBe("compared");
			}
		}
		for (const inventoryId of inventoryIds) {
			expect(dispositionByContract.get(inventoryId), inventoryId).toBe(1);
		}
		const conflicts = objects(
			readJson("conflicts.json").conflicts,
			"conflicts",
		);
		for (const conflict of conflicts) {
			for (const field of [
				"id",
				"conceptId",
				"dimension",
				"summary",
				"evidence",
				"confidence",
			]) {
				text(conflict[field], `conflict.${field}`);
			}
		}
		const dynamicIssues = objects(
			parity.dynamicSchemaIssues,
			"dynamic schema issues",
		);
		expect(new Set(dynamicIssues.map((issue) => String(issue.number)))).toEqual(
			new Set([1, 2, 3, 4].map(String)),
		);
		for (const issue of dynamicIssues) {
			text(issue.url, `dynamic issue ${String(issue.number)} url`);
			text(
				issue.disposition,
				`dynamic issue ${String(issue.number)} disposition`,
			);
		}
	});

	/** Traces: TC-069..072; FR-012-AC-1..4. */
	it("assesses repository and concept impact without implying approval", () => {
		const impact = readJson("impact.json");
		for (const group of ["repositories", "concepts"] as const) {
			for (const record of objects(impact[group], `impact.${group}`)) {
				for (const field of [
					"id",
					"effort",
					"risk",
					"migrationWave",
					"confidence",
					"recommendation",
					"rationale",
				]) {
					text(record[field], `${group}.${String(record.id)}.${field}`);
				}
				expect(record.effort).toMatch(/^(S|M|L|XL)$/);
				expect(Array.isArray(record.dependencies)).toBe(true);
				expect(String(record.approvalStatus)).toBe("not-approved");
				if (record.disruptive === true) {
					expect(
						objects(record.affectedSystems, "affected systems").length,
					).toBeGreaterThan(0);
					expect(
						objects(record.compatibilityControls, "compatibility controls")
							.length,
					).toBeGreaterThan(0);
					text(record.gate, `${String(record.id)}.gate`);
				}
			}
		}
		for (const overlap of objects(impact.activeOverlaps, "active overlaps")) {
			for (const field of [
				"id",
				"source",
				"overlap",
				"sequencingConsequence",
			]) {
				text(overlap[field], `overlap.${field}`);
			}
		}
	});

	/** Traces: TC-073..077, TC-086..087; FR-013-AC-1..5, US-003-AC-1..2. */
	it("publishes a linked review that preserves gates, unknowns, and demonstrations", () => {
		const review = readFileSync(
			resolve(root, "reviews/2026-08-29-filament-contract-census.md"),
			"utf8",
		);
		for (const heading of [
			"## Scope",
			"## Method",
			"## Evidence Summary",
			"## Findings",
			"## Limitations",
			"## Recommendations",
			"## Release Gate Disposition",
			"## Acceptance Criteria Disposition",
			"## Demonstrations",
		]) {
			expect(review).toContain(heading);
		}
		for (const file of [
			"snapshot.json",
			"inventory.json",
			"parity.json",
			"conflicts.json",
			"missing-contracts.json",
			"impact.json",
			"validation.json",
		]) {
			expect(review).toContain(`../audit/filament-contract-census/${file}`);
		}
		for (const gate of [
			"consumer migration",
			"database",
			"wire-format",
			"package publication",
			"enforcement",
			"legacy retirement",
		]) {
			expect(review.toLowerCase()).toContain(gate);
		}
		expect(review).toMatch(/unknown[\s\S]*low confidence/i);
		expect(review).toMatch(/repeated concept[\s\S]*unconfirmed consumer/i);
	});

	/** Traces: TC-078..083; NFR-004, NFR-005-AC-1..4. */
	it("proves deterministic evidence and a read-only delivery", () => {
		const validation = readJson("validation.json");
		const fingerprintedFiles = validation.fingerprintedFiles as string[];
		expect(Array.isArray(fingerprintedFiles)).toBe(true);
		expect(validation.normalizedFingerprint).toBe(
			evidenceFingerprint(fingerprintedFiles),
		);
		expect(validation.repeatNormalizedFingerprint).toBe(
			validation.normalizedFingerprint,
		);
		expect(validation.externalRepositoryMutations).toBe(0);
		expect(validation.existingRuntimeOrContractMutations).toBe(0);
		expect(validation.packagePublications).toBe(0);
		expect(validation.catalogChanges).toBe(0);
		expect(validation.enforcementChanges).toBe(0);
		expect(validation.weakenedRequirements).toBe(0);

		const allowed = [
			"audit/filament-contract-census/",
			"plan/Plan-002-filament-contract-census/",
			"reviews/",
			"spec/",
			"test/contract-census.test.ts",
			"test/semantic-architecture.test.ts",
		];
		const inheritedArchitecture = [
			"README.md",
			"biome.json",
			"package.json",
			"pnpm-lock.yaml",
			"docs/semantic-data-system/",
			"plan/Plan-001-semantic-data-architecture-record/",
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
			"schema/semantic/v1/",
			"spikes/typespec-feasibility/",
			"fixtures/semantic/v1/",
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
			"test/compiler-core.test.ts",
			"test/changed-paths.ts",
			// Issue #19 also publishes two generated documents and excludes its
			// generated fixtures from the formatter.
			"docs/semantic-data-system/compiler-diagnostics.md",
			"docs/semantic-data-system/ir-compatibility-policy.md",
			"biome.json",
		];
		for (const path of changedPaths()) {
			expect(
				[...allowed, ...inheritedArchitecture].some(
					(prefix) => path === prefix || path.startsWith(prefix),
				),
				path,
			).toBe(true);
		}
	});

	/** Traces: TC-085; NFR-004. */
	it("keeps manual judgments attributable and confidence-scored", () => {
		const impact = readJson("impact.json");
		for (const record of [
			...objects(impact.repositories, "impact repositories"),
			...objects(impact.concepts, "impact concepts"),
		]) {
			text(record.method, `${String(record.id)}.method`);
			text(record.rationale, `${String(record.id)}.rationale`);
			text(record.confidence, `${String(record.id)}.confidence`);
		}
	});
});
