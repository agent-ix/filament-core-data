import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { describe, expect, it } from "vitest";
import {
	type CoreDataRecordName,
	validateCoreDataRecord,
} from "../src/generated";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const schemaRoot = resolve(root, "schema/semantic/v1");
const fixtureRoot = resolve(root, "fixtures/semantic/v1");
const schemaBase = "https://schemas.agent-ix.org/filament-core-data/v1/";
const generatedDuringTests = new Set([
	"agent_ix_core_data/core_data.py",
	"src/generated.ts",
]);

/**
 * Exact automated issue #9 matrix trace inventory:
 * TC-130, TC-131, TC-132, TC-133, TC-134, TC-135, TC-136, TC-137, TC-138,
 * TC-139, TC-140, TC-141, TC-142, TC-143, TC-144, TC-145, TC-146, TC-147,
 * TC-148, TC-149, TC-150, TC-151, TC-152, TC-153, TC-154, TC-155, TC-156,
 * TC-157, TC-158, TC-159, TC-160, TC-161, TC-162, TC-163, TC-164, TC-165,
 * TC-166, TC-167, TC-168, TC-169, TC-170, TC-171, TC-172, TC-173, TC-174,
 * TC-175, TC-176, TC-177, TC-178, TC-179, TC-180, TC-181, TC-182, TC-183,
 * TC-184, TC-185, TC-186, TC-187, TC-188, TC-189, TC-190, TC-191, TC-192,
 * TC-193, TC-194, TC-195, TC-196, TC-197, TC-198, TC-200, TC-201, TC-202.
 * The named-human normative merge case is intentionally absent from automation.
 * Acceptance criteria: FR-019-AC-1..5, FR-020-AC-1..6, FR-021-AC-1..7,
 * FR-022-AC-1..6, FR-023-AC-1..6, FR-024-AC-1..7, FR-025-AC-1..6,
 * FR-026-AC-1..6, NFR-012-AC-2, StR-001-VC-1.
 * Constraints: FR-019-CON-1..2, FR-020-CON-1..2.
 */

type JsonObject = Record<string, unknown>;

function readJson(path: string): unknown {
	return JSON.parse(readFileSync(resolve(fixtureRoot, path), "utf8"));
}

function object(value: unknown, label: string): JsonObject {
	expect(
		value !== null && typeof value === "object" && !Array.isArray(value),
		label,
	).toBe(true);
	return value as JsonObject;
}

function array(value: unknown, label: string): unknown[] {
	expect(Array.isArray(value), label).toBe(true);
	return value as unknown[];
}

function clone<T>(value: T): T {
	return structuredClone(value);
}

function resolveFixtureReferences(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(resolveFixtureReferences);
	if (value !== null && typeof value === "object") {
		const entry = value as JsonObject;
		if (Object.keys(entry).length === 1 && typeof entry.$fixture === "string") {
			return resolveFixtureReferences(readJson(`positive/${entry.$fixture}`));
		}
		return Object.fromEntries(
			Object.entries(entry).map(([key, child]) => [
				key,
				resolveFixtureReferences(child),
			]),
		);
	}
	return value;
}

const schemas = readdirSync(schemaRoot)
	.filter((name) => name.endsWith(".schema.json"))
	.sort()
	.map((name) => ({
		name,
		value: JSON.parse(
			readFileSync(resolve(schemaRoot, name), "utf8"),
		) as JsonObject,
	}));

const ajv = new Ajv2020({
	allErrors: true,
	strict: true,
	strictRequired: false,
});
addFormats(ajv);
for (const schema of schemas) ajv.addSchema(schema.value);

function validates(schemaName: string, value: unknown): boolean {
	const validate = ajv.getSchema(`${schemaBase}${schemaName}`);
	if (!validate) throw new Error(`schema was not registered: ${schemaName}`);
	return validate(resolveFixtureReferences(value)) as boolean;
}

function segments(path: string): string[] {
	return path.split(".");
}

function parentAt(
	value: unknown,
	path: string,
): [JsonObject | unknown[], string] {
	const parts = segments(path);
	const last = parts.pop();
	if (!last) throw new Error(`invalid mutation path: ${path}`);
	let cursor = value as JsonObject | unknown[];
	for (const part of parts) {
		const index = Array.isArray(cursor) ? Number(part) : part;
		cursor = cursor[index as never] as JsonObject | unknown[];
	}
	return [cursor, last];
}

function setAt(value: unknown, path: string, replacement: unknown): void {
	const [parent, key] = parentAt(value, path);
	if (Array.isArray(parent)) parent[Number(key)] = replacement;
	else parent[key] = replacement;
}

function removeAt(value: unknown, path: string): void {
	const [parent, key] = parentAt(value, path);
	if (Array.isArray(parent)) parent.splice(Number(key), 1);
	else delete parent[key];
}

const orderIndependentArrays = new Set([
	"capabilities",
	"dependencies",
	"excluded",
	"exports",
	"extensions",
	"imports",
	"included",
	"mappings",
	"packages",
	"profiles",
	"roles",
	"schemas",
	"sourceRoots",
	"targets",
]);
const excludedFingerprintKeys = new Set([
	"hostname",
	"locale",
	"sourcePath",
	"timestamp",
	"workingDirectory",
]);

function canonical(value: unknown, parentKey = ""): string {
	if (Array.isArray(value)) {
		const children = value.map((child) => canonical(child));
		if (orderIndependentArrays.has(parentKey)) children.sort();
		return `[${children.join(",")}]`;
	}
	if (value !== null && typeof value === "object") {
		return `{${Object.entries(value as JsonObject)
			.filter(([key]) => !excludedFingerprintKeys.has(key))
			.sort(([left], [right]) => left.localeCompare(right))
			.map(([key, child]) => `${JSON.stringify(key)}:${canonical(child, key)}`)
			.join(",")}}`;
	}
	return JSON.stringify(value);
}

function fingerprint(value: unknown): string {
	return `sha256:${createHash("sha256").update(canonical(value)).digest("hex")}`;
}

function changedPaths(): string[] {
	const committed = execFileSync(
		"git",
		["diff", "--no-renames", "--name-only", "origin/main...HEAD"],
		{
			cwd: root,
			encoding: "utf8",
		},
	);
	const working = execFileSync(
		"git",
		["status", "--porcelain", "--untracked-files=all"],
		{ cwd: root, encoding: "utf8" },
	)
		.split("\n")
		.filter(Boolean)
		.map((line) => line.slice(3))
		// schema.test.ts regenerates these controls in-place in a parallel test file.
		// The committed branch diff below still catches any retained mutation.
		.filter((path) => !generatedDuringTests.has(path));
	return [...new Set([...committed.split("\n"), ...working])].filter(Boolean);
}

function walkStrings(value: unknown, visit: (text: string) => void): void {
	if (typeof value === "string") visit(value);
	else if (Array.isArray(value))
		for (const child of value) walkStrings(child, visit);
	else if (value !== null && typeof value === "object") {
		for (const child of Object.values(value as JsonObject))
			walkStrings(child, visit);
	}
}

function collectRefs(value: unknown, refs: string[] = []): string[] {
	if (Array.isArray(value)) {
		for (const child of value) collectRefs(child, refs);
	} else if (value !== null && typeof value === "object") {
		for (const [key, child] of Object.entries(value as JsonObject)) {
			if (key === "$ref" && typeof child === "string") refs.push(child);
			else collectRefs(child, refs);
		}
	}
	return refs;
}

function boundedWalk(
	value: unknown,
	limits = { depth: 64, nodes: 10_000, collection: 1_000 },
): { ok: boolean; code?: string } {
	const active = new Set<object>();
	let nodes = 0;
	function visit(current: unknown, depth: number): string | undefined {
		if (depth > limits.depth) return "agent-ix.security.MAX_DEPTH";
		nodes += 1;
		if (nodes > limits.nodes) return "agent-ix.security.MAX_NODES";
		if (current === null || typeof current !== "object") return undefined;
		if (active.has(current)) return "agent-ix.security.CYCLE";
		const children = Array.isArray(current)
			? current
			: Object.values(current as JsonObject);
		if (children.length > limits.collection)
			return "agent-ix.security.MAX_COLLECTION";
		active.add(current);
		for (const child of children) {
			const code = visit(child, depth + 1);
			if (code) return code;
		}
		active.delete(current);
		return undefined;
	}
	const code = visit(value, 0);
	return code ? { ok: false, code } : { ok: true };
}

describe("semantic package contract v1", () => {
	/** Traces: TC-130, TC-131, TC-134, TC-135, TC-145, TC-146, TC-153, TC-156, TC-158, TC-160, TC-161, TC-163, TC-164, TC-170, TC-176, TC-184, TC-188, TC-189, TC-190, TC-192, TC-195, TC-197, TC-198. */
	it("publishes a complete versioned contract while preserving authority and scope", () => {
		expect(schemas.map(({ name }) => name)).toEqual([
			"common.schema.json",
			"compatibility-report.schema.json",
			"compiler-request.schema.json",
			"consumer-policy.schema.json",
			"legacy-adapter.schema.json",
			"mapping.schema.json",
			"output-manifest.schema.json",
			"package-lock.schema.json",
			"package-manifest.schema.json",
			"profile.schema.json",
			"representation.schema.json",
			"semantic-ir.schema.json",
			"target-contract.schema.json",
		]);
		for (const { name, value } of schemas) {
			expect(value.$schema, name).toBe(
				"https://json-schema.org/draft/2020-12/schema",
			);
			expect(value.$id, name).toBe(`${schemaBase}${name}`);
			expect(ajv.validateSchema(value), name).toBe(true);
		}

		const contract = readFileSync(
			resolve(root, "docs/semantic-data-system/contracts-v1.md"),
			"utf8",
		);
		for (const term of [
			"The v1 structural source is TypeSpec",
			"ADR-0005",
			"Avro remains a compatibility representation",
			"AGPL-3.0-or-later",
			"the owner selected TypeSpec",
		])
			expect(contract).toContain(term);
		expect(contract).toMatch(
			/PostgreSQL[\s\S]*physical DDL[\s\S]*consumer-owned/i,
		);
		expect(contract).toMatch(
			/Quire retains[\s\S]*Quoin retains[\s\S]*compiler compiles/i,
		);

		// Scoped by issue #27: the promotion removes the spike emitter's `file:`
		// devDependency, so a whole-file diff no longer expresses what NFR-012
		// protects. The published surface and the runtime dependency set are what
		// must not move, and TC-391 checks the same keys plus dependency-set
		// equality modulo that one removal.
		const beforeManifest = JSON.parse(
			execFileSync("git", ["show", "origin/main:package.json"], {
				cwd: root,
				encoding: "utf8",
			}),
		) as Record<string, unknown>;
		const afterManifest = JSON.parse(
			readFileSync(resolve(root, "package.json"), "utf8"),
		) as Record<string, unknown>;
		for (const key of [
			"name",
			"version",
			"description",
			"author",
			"license",
			"type",
			"packageManager",
			"main",
			"module",
			"types",
			"exports",
			"files",
			"repository",
			"dependencies",
		]) {
			expect(JSON.stringify(afterManifest[key]), key).toBe(
				JSON.stringify(beforeManifest[key]),
			);
		}
		// Scoped by issue #19: the published surface this criterion protects is
		// the metadata above, which is unchanged. `scripts` is a developer
		// interface, and #19 adds four `--check` invocations to `lint` so a
		// generated fixture or document that drifts fails the gate. Every script
		// origin/main declared is still declared, with the same command.
		const beforeScripts = beforeManifest.scripts as Record<string, string>;
		const afterScripts = afterManifest.scripts as Record<string, string>;
		for (const [name, command] of Object.entries(beforeScripts)) {
			if (name === "lint") {
				expect(afterScripts[name].startsWith(command), name).toBe(true);
				continue;
			}
			expect(afterScripts[name], name).toBe(command);
		}
	});

	/** Traces: TC-132, TC-133, TC-135, TC-136, TC-137, TC-138, TC-139, TC-140. */
	it("validates the IR type vocabulary, stable identities, origins, and explicit value states", () => {
		const ir = object(readJson("positive/semantic-ir.json"), "semantic IR");
		expect(
			validates("semantic-ir.schema.json", ir),
			JSON.stringify(ajv.errors),
		).toBe(true);
		const types = array(ir.types, "IR types").map((value) =>
			object(value, "type"),
		);
		expect(new Set(types.map((type) => type.kind))).toEqual(
			new Set([
				"scalar",
				"record",
				"enum",
				"union",
				"alias",
				"sequence",
				"map",
				"reference",
			]),
		);
		for (const type of types) {
			expect(String(type.identity)).toMatch(/^ix:\/\//);
			expect(type.origin).toBeDefined();
		}
		expect(new Set(types.map((type) => type.identity)).size).toBe(types.length);
		const artifact = types.find((type) => type.displayName === "Artifact");
		expect(artifact?.kind).toBe("record");
		expect(artifact?.roles).toEqual(
			expect.arrayContaining([
				"agent-ix:entity",
				"agent-ix:evidence",
				"agent-ix:report",
			]),
		);
		const fields = array(artifact?.fields, "Artifact fields").map((field) =>
			object(field, "field"),
		);
		expect(new Set(fields.map((field) => field.identity)).size).toBe(
			fields.length,
		);
		expect(fields).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					name: "summary",
					presence: "optional",
					nullable: false,
					defaultKind: "none",
				}),
				expect.objectContaining({
					name: "note",
					presence: "required",
					nullable: true,
					defaultKind: "semantic",
					defaultValue: null,
				}),
			]),
		);
		const renamed = clone(ir);
		object(
			array(renamed.types, "renamed types")[1],
			"renamed artifact",
		).displayName = "EvidenceArtifact";
		expect(
			object(array(renamed.types, "renamed types")[1], "renamed artifact")
				.identity,
		).toBe(artifact?.identity);
		const reference = types.find((type) => type.kind === "reference");
		expect(reference?.target).toBe(artifact?.identity);
	});

	/** Traces: TC-133, TC-140, TC-142, TC-144, TC-147, TC-149, TC-151, TC-152, TC-157, TC-162, TC-175, TC-183, TC-193, TC-200. */
	it("rejects the adverse corpus with stable code families and no empty success", () => {
		const cases = array(readJson("negative/cases.json"), "negative cases");
		for (const rawCase of cases) {
			const entry = object(rawCase, "negative case");
			let value = clone(readJson(String(entry.base)));
			if (typeof entry.select === "number")
				value = array(value, String(entry.id))[entry.select];
			if (entry.set) {
				const mutation = object(entry.set, `${String(entry.id)}.set`);
				setAt(value, String(mutation.path), mutation.value);
			}
			if (typeof entry.remove === "string") removeAt(value, entry.remove);
			expect(validates(String(entry.schema), value), String(entry.id)).toBe(
				false,
			);
			expect(entry.code, String(entry.id)).toMatch(
				/^agent-ix\.[a-z0-9-]+\.[A-Z][A-Z0-9_]+$/,
			);
		}
		const states = object(
			schemas.find(({ name }) => name === "common.schema.json")?.value,
			"common",
		);
		expect(JSON.stringify(states)).toContain('"partial"');
		expect(JSON.stringify(states)).toContain('"unavailable"');
	});

	/** Traces: TC-141, TC-142, TC-143, TC-144, TC-145, TC-146, TC-201. */
	it("makes package resolution and fingerprints deterministic without conflating registry policy", () => {
		const manifest = object(
			readJson("positive/package-manifest.json"),
			"manifest",
		);
		const lock = object(readJson("positive/package-lock.json"), "lock");
		expect(validates("package-manifest.schema.json", manifest)).toBe(true);
		expect(validates("package-lock.schema.json", lock)).toBe(true);
		const reordered = clone({ manifest, lock });
		array(object(reordered.lock, "lock").packages, "packages").reverse();
		object(reordered.manifest, "manifest").sourcePath = "/different/checkout";
		expect(fingerprint(reordered)).toBe(fingerprint({ manifest, lock }));
		const changed = clone({ manifest, lock });
		object(object(changed.manifest, "manifest").package, "package").version =
			"1.0.1";
		expect(fingerprint(changed)).not.toBe(fingerprint({ manifest, lock }));
		const irBefore = canonical(readJson("positive/semantic-ir.json"));
		const alternateProfile = clone(array(manifest.profiles, "profiles")[0]);
		object(alternateProfile, "profile").targets = ["typescript"];
		expect(canonical(readJson("positive/semantic-ir.json"))).toBe(irBefore);
		for (const concern of [
			"exports",
			"targets",
			"mappings",
			"profiles",
		] as const) {
			const invalid = clone(manifest);
			invalid[concern] = "not-an-array";
			expect(validates("package-manifest.schema.json", invalid), concern).toBe(
				false,
			);
			expect(manifest[concern]).toEqual(
				object(readJson("positive/package-manifest.json"), "manifest")[concern],
			);
		}

		const graphCases = array(
			readJson("package-graph-cases.json"),
			"graph cases",
		);
		for (const rawCase of graphCases) {
			const graphCase = object(rawCase, "graph case");
			if (graphCase.expected === "invalid") {
				expect(
					array(graphCase.loci, `${String(graphCase.id)} loci`).length,
				).toBeGreaterThan(1);
			}
		}
		expect(JSON.stringify(manifest)).not.toMatch(/registryUrl|installPolicy/);
	});

	/** Traces: TC-147, TC-148, TC-149, TC-150, TC-151, TC-152. */
	it("keeps mapping selections, transformation kinds, lens laws, effects, and loss explicit", () => {
		const mapping = object(readJson("positive/mapping.json"), "mapping");
		expect(validates("mapping.schema.json", mapping)).toBe(true);
		const transformation = object(mapping.transformation, "transformation");
		expect(transformation).toMatchObject({
			kind: "lens",
			purity: "pure",
			externalReads: [],
			externalWrites: [],
		});
		expect(transformation.getPutLaws).toEqual([
			"get-put",
			"put-get",
			"put-put",
		]);
		const kinds = array(
			readJson("transformation-kinds.json"),
			"transformation kinds",
		).map((value) => object(value, "transformation"));
		expect(new Set(kinds.map((value) => value.kind))).toEqual(
			new Set([
				"codec",
				"lens",
				"projection",
				"extraction",
				"rendering",
				"aggregation",
				"enrichment",
				"materialization",
			]),
		);
		for (const candidate of kinds) {
			const example = { ...mapping, transformation: candidate };
			expect(
				validates("mapping.schema.json", example),
				String(candidate.kind),
			).toBe(true);
		}
		const lossy = kinds.find((value) => value.kind === "projection");
		const strictProfile = object(readJson("positive/profile.json"), "profile");
		const qualifiesLoss = (profile: JsonObject, transform: JsonObject) =>
			transform.preservation !== "declared-lossy" ||
			(profile.roundTrip === "declared-lossy" &&
				array(transform.omittedIdentities, "omissions").every((identity) =>
					array(profile.allowedOmissions, "allowed omissions").includes(
						identity,
					),
				));
		expect(qualifiesLoss(strictProfile, lossy ?? {})).toBe(false);
		const lossyProfile = {
			...strictProfile,
			roundTrip: "declared-lossy",
			allowedOmissions: clone(lossy?.omittedIdentities),
		};
		expect(qualifiesLoss(lossyProfile, lossy ?? {})).toBe(true);

		const get = (source: JsonObject) => ({
			id: source.id,
			summary: source.summary,
		});
		const put = (source: JsonObject, view: JsonObject) => ({
			...source,
			...view,
		});
		for (let index = 0; index < 100; index += 1) {
			const source = {
				id: `a-${index}`,
				summary: `summary-${index}`,
				hidden: index,
			};
			const view = get(source);
			expect(put(source, get(source))).toEqual(source);
			expect(get(put(source, view))).toEqual(view);
			const later = { id: `b-${index}`, summary: `later-${index}` };
			expect(put(put(source, view), later)).toEqual(put(source, later));
		}
	});

	/** Traces: TC-153, TC-154, TC-155, TC-156, TC-157, TC-158. */
	it("defines best-fit representation contracts and preserves Markdown as portable text", () => {
		const representations = array(
			readJson("positive/representations.json"),
			"representations",
		).map((value) => object(value, "representation"));
		for (const representation of representations) {
			expect(
				validates("representation.schema.json", representation),
				String(representation.format),
			).toBe(true);
			expect(object(representation.mapping, "mapping").kind).toBe(
				representation.format,
			);
			expect(array(representation.bestFit, "best fit").length).toBeGreaterThan(
				0,
			);
			expect(array(representation.nonUses, "non uses").length).toBeGreaterThan(
				0,
			);
		}
		const mismatched = clone(representations[0]);
		mismatched.mapping = clone(representations[1].mapping);
		expect(validates("representation.schema.json", mismatched)).toBe(false);
		expect(new Set(representations.map((entry) => entry.format))).toEqual(
			new Set([
				"markdown",
				"json",
				"postgresql",
				"protobuf",
				"avro",
				"arrow",
				"parquet",
				"csv",
				"tsv",
			]),
		);
		for (const format of ["protobuf", "arrow", "parquet"]) {
			expect(
				representations.find((entry) => entry.format === format)?.selected,
			).toBe(false);
		}
		const protobuf = object(
			representations.find((entry) => entry.format === "protobuf")?.mapping,
			"protobuf",
		);
		const assigned = Object.values(
			object(protobuf.fieldNumbers, "field numbers"),
		);
		expect(new Set(assigned).size).toBe(assigned.length);
		for (const reserved of array(protobuf.reservedNumbers, "reserved numbers"))
			expect(assigned).not.toContain(reserved);
		const markdown = readFileSync(
			resolve(fixtureRoot, "markdown/artifact.md"),
			"utf8",
		);
		for (const locus of [
			"---\nid:",
			"# Artifact",
			"Human-authored prose",
			"| Check | Result |",
			"- one list item",
			"```json",
			"relationships:",
			"unrepresentable",
		]) {
			expect(markdown).toContain(locus);
		}
	});

	/** Traces: TC-159, TC-160, TC-161, TC-162, TC-163, TC-164, TC-179, TC-180, TC-184, TC-200. */
	it("defines one compiler and diagnostic envelope without implementing a backend", () => {
		const request = readJson("positive/compiler-request.json");
		const output = object(readJson("positive/output-manifest.json"), "output");
		expect(
			validates("compiler-request.schema.json", request),
			JSON.stringify(ajv.errors),
		).toBe(true);
		expect(validates("output-manifest.schema.json", output)).toBe(true);
		const targets = array(
			readJson("positive/target-contracts.json"),
			"targets",
		).map((value) => object(value, "target"));
		for (const target of targets) {
			expect(
				validates("target-contract.schema.json", target),
				String(target.target),
			).toBe(true);
			expect(target.customSourceLicense).toBe("AGPL-3.0-or-later");
			expect(target.nativeApi).not.toContain("any");
			expect(target.nativeApi).not.toContain("untyped map");
			expect(target.nativeApi).not.toContain("empty model");
			for (const dependency of array(
				target.runtimeDependencies,
				"runtime dependencies",
			)) {
				expect(
					array(target.prohibitedDependencies, "prohibited dependencies"),
				).not.toContain(dependency);
			}
			for (const dependency of array(
				target.executableGeneratorDependencies,
				"generator dependencies",
			)) {
				expect(object(dependency, "generator dependency").exactVersion).toMatch(
					/^\d+\.\d+\.\d+/,
				);
				expect(
					object(dependency, "generator dependency").provenance,
				).toBeTruthy();
			}
			for (const finding of array(
				target.securityFindings,
				"security findings",
			)) {
				expect(object(finding, "security finding").disposition).toBeTruthy();
			}
		}
		const unsafeTarget = clone(targets[0]);
		unsafeTarget.securityFindings = [
			{ id: "CVE-example", severity: "critical" },
		];
		expect(validates("target-contract.schema.json", unsafeTarget)).toBe(false);
		const widenedTarget = clone(targets[0]);
		widenedTarget.runtimeDependencies = ["ui"];
		expect(validates("target-contract.schema.json", widenedTarget)).toBe(false);
		const secondRequest = clone(
			resolveFixtureReferences(request),
		) as JsonObject;
		object(secondRequest.backend, "backend").identity =
			"ix://agent-ix/semantic-compiler/backend/typescript";
		expect(validates("compiler-request.schema.json", secondRequest)).toBe(true);
		const secondOutput = {
			...output,
			backend: object(secondRequest.backend, "backend").identity,
		};
		expect(validates("output-manifest.schema.json", secondOutput)).toBe(true);
		expect(Object.keys(secondOutput).sort()).toEqual(
			Object.keys(output).sort(),
		);

		const diagnostic = {
			code: "agent-ix.semantic-ir.UNSUPPORTED_VERSION",
			severity: "error",
			message: "semantic IR contract version 2.0.0 is unsupported",
			owner: "ix://agent-ix/assurance/package/root",
			locus: {
				sourceIdentity: "ix://agent-ix/assurance/source/root",
				path: "semantic-ir.json",
				startLine: 1,
				startColumn: 1,
			},
			blocking: true,
			causes: [],
			related: [],
		};
		const failed = {
			...output,
			state: "unsupported",
			files: [],
			diagnostics: [diagnostic],
		};
		expect(validates("output-manifest.schema.json", failed)).toBe(true);
		expect(
			object(array(failed.diagnostics, "diagnostics")[0], "diagnostic").code,
		).toBe(diagnostic.code);
		for (const file of array(output.files, "files")) {
			expect(String(object(file, "file").path)).not.toMatch(
				/^\/|(?:^|\/)\.\.(?:\/|$)/,
			);
			expect(
				array(object(file, "file").semanticIdentities, "semantic identities")
					.length,
			).toBeGreaterThan(0);
		}
		const outputPaths = array(output.files, "files").map((file) =>
			String(object(file, "file").path),
		);
		expect(new Set(outputPaths).size).toBe(outputPaths.length);
		expect(existsSync(resolve(root, "src/semantic-compiler.ts"))).toBe(false);
	});

	/** Traces: TC-165, TC-166, TC-167, TC-168, TC-169, TC-170. */
	it("classifies every compatibility family with the most restrictive disposition", () => {
		const report = readJson("positive/compatibility-report.json");
		expect(validates("compatibility-report.schema.json", report)).toBe(true);
		const cases = array(
			readJson("compatibility/cases.json"),
			"compatibility cases",
		).map((value) => object(value, "compatibility case"));
		const expected = new Set(cases.map((entry) => entry.expected));
		for (const disposition of [
			"patch",
			"additive",
			"conditional",
			"breaking",
			"unknown",
			"invalid",
		])
			expect(expected).toContain(disposition);
		const families = new Set(cases.map((entry) => entry.family));
		for (const family of [
			"documentation",
			"field",
			"type",
			"enum",
			"union",
			"identity",
			"constraint",
			"unknown-policy",
			"mapping",
			"profile",
			"authority",
			"loss",
			"protobuf-reservation",
			"generated-api",
		]) {
			expect(families, family).toContain(family);
		}
		const rank = new Map([
			["patch", 0],
			["additive", 1],
			["conditional", 2],
			["unknown", 3],
			["breaking", 4],
			["invalid", 5],
		]);
		const disagreement = cases.find(
			(entry) => entry.id === "target-disagreement",
		);
		const mostRestrictive = array(disagreement?.targetResults, "target results")
			.map(String)
			.sort(
				(left, right) => Number(rank.get(right)) - Number(rank.get(left)),
			)[0];
		expect(mostRestrictive).toBe(disagreement?.expected);
		expect(
			cases.find((entry) => entry.id === "authority-change-same-shape")
				?.expected,
		).toBe("breaking");
		expect(
			cases.find((entry) => entry.id === "unknown-consumer")?.expected,
		).toBe("unknown");
		expect(
			array(object(report, "report").retainedBridges, "bridges"),
		).toContain("avro-v1");
	});

	/** Traces: TC-171, TC-172, TC-173, TC-174, TC-175, TC-176, TC-196. */
	it("keeps dynamic, generated, Quoin, and Avro compatibility boundaries explicit", () => {
		const policies = array(
			readJson("positive/consumer-policies.json"),
			"consumer policies",
		).map((value) => object(value, "consumer policy"));
		for (const policy of policies)
			expect(validates("consumer-policy.schema.json", policy)).toBe(true);
		expect(policies.map((policy) => policy.identityPlanes)).toEqual([
			policies[0].identityPlanes,
			policies[0].identityPlanes,
		]);
		expect(
			policies.find((policy) => policy.mode === "dynamic")?.unknownModules,
		).toBe("preserve");
		expect(
			policies.find((policy) => policy.mode === "generated")?.unknownModules,
		).toBe("surface");
		const sharedValue = object(
			array(
				object(readJson("positive/semantic-ir.json"), "IR").occurrences,
				"occurrences",
			)[0],
			"occurrence",
		).value;
		expect(fingerprint(sharedValue)).toBe(
			fingerprint(JSON.parse(JSON.stringify(sharedValue))),
		);

		const adapter = readJson("positive/legacy-adapter.json");
		expect(validates("legacy-adapter.schema.json", adapter)).toBe(true);
		const quoin = object(
			readJson("legacy/quoin-manifests.json"),
			"Quoin inventory",
		);
		const manifests = array(quoin.manifests, "Quoin manifests").map((value) =>
			object(value, "manifest"),
		);
		expect(manifests).toHaveLength(9);
		expect(new Set(manifests.map((manifest) => manifest.path)).size).toBe(
			manifests.length,
		);
		for (const manifest of manifests) {
			expect(manifest.digest).toMatch(/^sha256:[0-9a-f]{64}$/);
			expect(manifest.rewritten).toBe(false);
			expect(manifest.valid).toBe(true);
		}
		const bridge = object(readJson("legacy/avro-bridge.json"), "Avro bridge");
		expect(bridge.semanticWideningAllowed).toBe(false);
		expect(existsSync(resolve(root, String(bridge.source)))).toBe(true);
		expect(existsSync(resolve(root, String(bridge.positiveFixtures)))).toBe(
			true,
		);
		const avroFixtures = JSON.parse(
			readFileSync(resolve(root, String(bridge.positiveFixtures)), "utf8"),
		) as Record<CoreDataRecordName, unknown>;
		for (const [name, payload] of Object.entries(avroFixtures)) {
			expect(
				validateCoreDataRecord(name as CoreDataRecordName, payload),
				name,
			).toEqual([]);
		}
		const invalidEntry = clone(avroFixtures.CoreArtifactEntry) as JsonObject;
		delete invalidEntry.code;
		expect(
			validateCoreDataRecord("CoreArtifactEntry", invalidEntry).length,
		).toBeGreaterThan(0);
	});

	/** Traces: TC-177, TC-178, TC-179, TC-180. */
	it("is reproducible, path-independent, and resolvable offline", () => {
		const allInputs = {
			schemas: schemas.map(({ name, value }) => ({ name, value })),
			ir: readJson("positive/semantic-ir.json"),
			manifest: readJson("positive/package-manifest.json"),
			lock: readJson("positive/package-lock.json"),
		};
		const first = fingerprint(allInputs);
		const secondInput = clone(allInputs);
		secondInput.schemas.reverse();
		object(secondInput, "inputs").workingDirectory = "/private/tmp/other";
		expect(fingerprint(secondInput)).toBe(first);
		for (const { name, value } of schemas) {
			for (const ref of collectRefs(value)) {
				expect(ref, `${name} remote ref`).not.toMatch(/^https?:\/\//);
				const target = ref.split("#", 1)[0];
				if (target)
					expect(
						existsSync(resolve(schemaRoot, target)),
						`${name} -> ${ref}`,
					).toBe(true);
			}
		}
	});

	/** Traces: TC-181, TC-182, TC-183, TC-184. */
	it("publishes one cross-target verdict and canonical-value contract", () => {
		const matrix = object(
			readJson("target-verdicts.json"),
			"target verdict matrix",
		);
		const targets = array(matrix.targets, "targets").map(String);
		expect(targets).toEqual([
			"json-schema",
			"rust",
			"typescript",
			"python-pydantic-v2",
			"python-dataclass",
		]);
		for (const rawCase of array(matrix.cases, "cases")) {
			const fixture = object(rawCase, "target fixture");
			const verdicts = object(fixture.verdicts, "verdicts");
			expect(Object.keys(verdicts).sort()).toEqual([...targets].sort());
			expect(new Set(Object.values(verdicts)).size, String(fixture.id)).toBe(1);
			if (Object.values(verdicts)[0] === "accept") {
				expect(canonical(fixture.canonicalSemanticValue)).toBe(
					canonical(JSON.parse(canonical(fixture.canonicalSemanticValue))),
				);
			} else expect(fixture.diagnosticCode).toMatch(/^agent-ix\./);
		}
	});

	/** Traces: TC-185, TC-186, TC-187, TC-188, TC-189, TC-202. */
	it("bounds hostile paths, payloads, graph traversal, and dependency effects", () => {
		const unsafePaths = [
			"../outside",
			"/absolute",
			"a/../../outside",
			"..\\outside",
			"C:\\outside",
			"bad\u0000path",
		];
		const inertPayloads = [
			"${{ secrets.TOKEN }}",
			"{{ constructor.constructor('return process')() }}",
			"<%= process.env %>",
		];
		const safeRelative = (path: string) =>
			!path.startsWith("/") &&
			!/^[A-Za-z]:/.test(path) &&
			!path.includes("\\") &&
			!path.includes("\u0000") &&
			!path.includes("..") &&
			!/[${}<>()]/.test(path);
		for (const value of unsafePaths)
			expect(safeRelative(value), value).toBe(false);
		for (const value of inertPayloads)
			expect(JSON.parse(JSON.stringify(value))).toBe(value);
		for (let index = 0; index < 200; index += 1) {
			const hostile = `${"a/".repeat(index % 20)}../${index}-${"x".repeat(index % 40)}`;
			expect(safeRelative(hostile)).toBe(false);
		}

		const resolvedRequest = object(
			resolveFixtureReferences(readJson("positive/compiler-request.json")),
			"request",
		);
		const requestLimits = object(resolvedRequest.limits, "limits");
		for (const value of unsafePaths) {
			const hostileRequest = clone(resolvedRequest);
			hostileRequest.outputRoot = value;
			expect(
				validates("compiler-request.schema.json", hostileRequest),
				value,
			).toBe(false);
		}
		const limits = {
			depth: Number(requestLimits.maxDepth),
			nodes: Number(requestLimits.maxNodes),
			collection: Number(requestLimits.maxCollectionItems),
		};
		expect(
			Buffer.byteLength(JSON.stringify(resolvedRequest)),
		).toBeLessThanOrEqual(Number(requestLimits.maxInputBytes));
		expect(
			Buffer.byteLength("x".repeat(Number(requestLimits.maxInputBytes) + 1)),
		).toBeGreaterThan(Number(requestLimits.maxInputBytes));
		expect(
			new Array(Number(requestLimits.maxDiagnostics) + 1).length,
		).toBeGreaterThan(Number(requestLimits.maxDiagnostics));
		let deep: JsonObject = {};
		let cursor = deep;
		for (let index = 0; index < 70; index += 1) {
			cursor.next = {};
			cursor = cursor.next as JsonObject;
		}
		expect(boundedWalk(deep, limits)).toEqual({
			ok: false,
			code: "agent-ix.security.MAX_DEPTH",
		});
		const cyclic: JsonObject = {};
		cyclic.self = cyclic;
		expect(boundedWalk(cyclic, limits)).toEqual({
			ok: false,
			code: "agent-ix.security.CYCLE",
		});
		expect(
			boundedWalk(new Array(limits.collection + 1).fill(0), limits),
		).toEqual({
			ok: false,
			code: "agent-ix.security.MAX_COLLECTION",
		});

		walkStrings(resolvedRequest, (text) =>
			expect(text).not.toMatch(/require\(|child_process|https?:\/\/[^/]*evil/i),
		);
		const hostilePayload = {
			schema: "${{ secrets.TOKEN }}",
			template: "{{ constructor.constructor('return process')() }}",
			example: "<%= process.env %>",
		};
		expect(JSON.parse(JSON.stringify(hostilePayload))).toEqual(hostilePayload);
	});

	/** Traces: TC-190, TC-191, TC-192, TC-193, TC-194. */
	it("supports an independent reader and preserves governed optional extensions", () => {
		const examples: Array<[string, unknown]> = [
			["semantic-ir.schema.json", readJson("positive/semantic-ir.json")],
			[
				"package-manifest.schema.json",
				readJson("positive/package-manifest.json"),
			],
			["package-lock.schema.json", readJson("positive/package-lock.json")],
			["mapping.schema.json", readJson("positive/mapping.json")],
			["profile.schema.json", readJson("positive/profile.json")],
			[
				"compiler-request.schema.json",
				readJson("positive/compiler-request.json"),
			],
			[
				"output-manifest.schema.json",
				readJson("positive/output-manifest.json"),
			],
			[
				"compatibility-report.schema.json",
				readJson("positive/compatibility-report.json"),
			],
			["legacy-adapter.schema.json", readJson("positive/legacy-adapter.json")],
		];
		for (const representation of array(
			readJson("positive/representations.json"),
			"representations",
		))
			examples.push(["representation.schema.json", representation]);
		for (const target of array(
			readJson("positive/target-contracts.json"),
			"targets",
		))
			examples.push(["target-contract.schema.json", target]);
		for (const policy of array(
			readJson("positive/consumer-policies.json"),
			"policies",
		))
			examples.push(["consumer-policy.schema.json", policy]);
		for (const [schema, example] of examples)
			expect(validates(schema, example), schema).toBe(true);
		const positiveSchemas = new Set(examples.map(([schema]) => schema));
		const negativeSchemas = new Set(
			array(readJson("negative/cases.json"), "negative cases").map((entry) =>
				String(object(entry, "case").schema),
			),
		);
		for (const { name } of schemas.filter(
			({ name }) => name !== "common.schema.json",
		)) {
			expect(positiveSchemas, `${name} positive example`).toContain(name);
			expect(negativeSchemas, `${name} negative example`).toContain(name);
		}

		const ir = object(readJson("positive/semantic-ir.json"), "IR");
		const artifact = object(array(ir.types, "types")[1], "artifact");
		const extension = object(
			array(artifact.extensions, "extensions")[0],
			"extension",
		);
		const roundTrip = JSON.parse(JSON.stringify(extension));
		expect(roundTrip).toEqual(extension);
		expect(extension.required).toBe(false);
		expect(extension.identity).toMatch(/^ix:\/\//);
		expect(extension.version).toBe("1.0.0");
	});

	/** Traces: TC-195, TC-196, TC-197, TC-198. */
	it("keeps issue nine non-disruptive and separately gated", () => {
		const allowed = [
			"docs/semantic-data-system/",
			"fixtures/semantic/v1/",
			"plan/Plan-004-semantic-package-contract/",
			"plan/Plan-005-semantic-ir-v1-1/",
			"plan/Plan-006-semantic-core-grammar/",
			"src/compiler/",
			"tsconfig.json",
			"tsconfig.build.json",
			"plan/Plan-007-promote-prototype-emitters/",
			"package.json",
			"pnpm-lock.yaml",
			"docs/semantic-data-system/typespec-feasibility.md",
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
			"reviews/2026-08-30-plan-004-semantic-package-contract-gap-analysis.md",
			"reviews/2026-08-30-semantic-package-contract-code-review.md",
			"schema/semantic/v1/",
			"spec/",
			"audit/filament-contract-census/",
			"test/contract-census.test.ts",
			"test/semantic-architecture.test.ts",
			"test/semantic-contract.test.ts",
			"test/typespec-feasibility.test.ts",
			// Issue #19 (the compiler core) adds the compiler fixture corpus, the
			// matrix-summary script, its plan bundle, and its test file. Each entry
			// is a path this branch writes, enumerated rather than widened.
			"test/fixtures/compiler/",
			"scripts/",
			"plan/Plan-008-typespec-frontend-and-ir-compiler-core/",
			"test/compiler-core.test.ts",
			// Issue #19 also publishes two generated documents and excludes its
			// generated fixtures from the formatter.
			"docs/semantic-data-system/compiler-diagnostics.md",
			"docs/semantic-data-system/ir-compatibility-policy.md",
			"biome.json",
		];
		for (const path of changedPaths()) {
			expect(
				allowed.some((prefix) => path === prefix || path.startsWith(prefix)),
				path,
			).toBe(true);
			if (existsSync(resolve(root, path)))
				expect(statSync(resolve(root, path)).isFile(), path).toBe(true);
		}
		// Issue #27 removes the spike emitter's `file:` devDependency, so
		// `package.json` and `pnpm-lock.yaml` necessarily move. What these
		// criteria protect — the published surface and the runtime dependency
		// set — is pinned exactly by TC-391 in test/compiler.test.ts.
		for (const prohibited of [
			"schema/avro/core-data.avpr",
			"src/generated.ts",
			"agent_ix_core_data/core_data.py",
		]) {
			expect(changedPaths(), prohibited).not.toContain(prohibited);
		}
		const plan = readFileSync(
			resolve(root, "plan/Plan-004-semantic-package-contract/plan.md"),
			"utf8",
		);
		for (const gate of [
			"compiler",
			"publication",
			"database",
			"consumer",
			"retirement",
			"human",
		])
			expect(plan.toLowerCase()).toContain(gate);
		expect(relative(root, schemaRoot)).toBe("schema/semantic/v1");
	});
});
