import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { describe, expect, it } from "vitest";
import { changedPathsOf } from "./changed-paths.js";
import {
	multiplicityFromPresence,
	normalize,
	readSemanticIr,
} from "./semantic-ir-v1-1-reader";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const schemaRoot = resolve(root, "schema/semantic/v1");
const fixtureRoot = resolve(root, "fixtures/semantic/v1");
const schemaBase = "https://schemas.agent-ix.org/filament-core-data/v1/";
/**
 * Issue #34 (semantic IR v1.1) matrix trace inventory:
 * TC-203, TC-204, TC-205, TC-206, TC-207, TC-208, TC-209, TC-210, TC-211,
 * TC-212, TC-213, TC-214, TC-215, TC-216, TC-217, TC-218, TC-219, TC-220,
 * TC-221, TC-222, TC-223, TC-224, TC-225, TC-226, TC-227, TC-228, TC-229,
 * TC-230, TC-231, TC-232, TC-233, TC-234, TC-235, TC-236, TC-237, TC-238,
 * TC-239, TC-240, TC-241, TC-242, TC-243, TC-244, TC-245, TC-246, TC-247.
 * Acceptance criteria: FR-020-AC-7..8, FR-027-AC-1..9, FR-028-AC-1..13,
 * FR-029-AC-1..8, FR-030-AC-1..6, NFR-013-AC-1..5.
 * Constraints: FR-027-CON-1..2, FR-028-CON-1..2, FR-029-CON-1..2, FR-030-CON-1..2.
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
	return validate(value) as boolean;
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
	// Both ends now come from history. The sentinel is the file issue #34's own
	// change created — confirmed with `git log --diff-filter=A -1`, which names
	// 014bff7 — so the range is that change's commit, it survives the squash
	// merge, and it disappears (failing loudly) if the change is reverted.
	return changedPathsOf(
		root,
		"fixtures/semantic/v1/positive/semantic-ir-v1-1.json",
	);
}

function sha256(path: string): string {
	return `sha256:${createHash("sha256").update(readFileSync(path)).digest("hex")}`;
}

function clone<T>(value: T): T {
	return structuredClone(value);
}

function parentAt(
	value: unknown,
	path: string,
): [JsonObject | unknown[], string] {
	const parts = path.split(".");
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

type NegativeCase = {
	id: string;
	schema: string;
	base: string;
	set?: { path: string; value: unknown };
	remove?: string;
	code: string;
	note?: string;
};

function negativeCase(id: string): NegativeCase {
	const entry = array(readJson("negative/cases.json"), "negative cases")
		.map((value) => object(value, "case"))
		.find((value) => value.id === id);
	if (!entry) throw new Error(`negative case is not recorded: ${id}`);
	return entry as unknown as NegativeCase;
}

/** Applies a recorded negative case and returns whether the mutated document validates. */
function negativeValidates(id: string): {
	valid: boolean;
	entry: NegativeCase;
} {
	const entry = negativeCase(id);
	const value = clone(readJson(entry.base));
	if (entry.set) setAt(value, entry.set.path, entry.set.value);
	if (entry.remove) removeAt(value, entry.remove);
	return { valid: validates(entry.schema, value), entry };
}

function schemaNamed(name: string): JsonObject {
	return object(schemas.find((schema) => schema.name === name)?.value, name);
}

describe("semantic IR v1.1 baseline and non-disruption", () => {
	/**
	 * Traces: TC-208, TC-231; FR-027-AC-6, FR-030-CON-1.
	 * fcd#179 deleted contracts 1.0.0 and 1.1.0; 2.0.0 is the only one. The
	 * digest loop below still pins these fixtures' bytes (a general
	 * fixture-integrity guarantee, unrelated to contract-version acceptance),
	 * but this test no longer asserts that `positive/semantic-ir.json` (a
	 * 1.0.0 document) validates under the current schema, since that is
	 * exactly the acceptance of an old contract that #179 removes. The file
	 * stays on disk, still pinned by digest, no longer schema-valid.
	 */
	it("keeps every v1 positive fixture byte-identical", () => {
		const baseline = object(
			readJson("v1-fixture-digests.json"),
			"v1 fixture digest baseline",
		);
		const digests = object(baseline.digests, "digests");
		for (const [name, digest] of Object.entries(digests)) {
			expect(sha256(resolve(fixtureRoot, "positive", name)), name).toBe(digest);
		}
		const manifest = object(
			readJson("positive/package-manifest.json"),
			"v1 manifest",
		);
		expect(
			validates("package-manifest.schema.json", manifest),
			JSON.stringify(ajv.errors),
		).toBe(true);
	});

	/** Traces: TC-234; NFR-013-AC-2. */
	it("leaves the frozen TypeSpec spike untouched", () => {
		// Scoped by issue #27 (FR-044), which owns the spike's rewiring. The
		// retained evidence NFR-013 protects is still byte-identical apart from
		// the one declared field, pinned by TC-371 in test/compiler.test.ts.
		const promotionPaths = [
			"spikes/typespec-feasibility/scripts/run-experiment.mjs",
			"spikes/typespec-feasibility/package.json",
			"spikes/typespec-feasibility/evidence/custom.json",
		];
		const permitted = (path: string) =>
			promotionPaths.includes(path) ||
			path.startsWith("spikes/typespec-feasibility/emitter/");
		for (const path of changedPaths()) {
			if (permitted(path)) continue;
			expect(path.startsWith("spikes/"), path).toBe(false);
		}
		const spikeDiff = execFileSync(
			"git",
			["diff", "--no-renames", "origin/main", "--name-only", "--", "spikes/"],
			{ cwd: root, encoding: "utf8" },
		)
			.split("\n")
			.filter((line) => line.length > 0)
			.filter((path) => !permitted(path));
		expect(spikeDiff).toEqual([]);
	});

	/** Traces: TC-236; NFR-013-AC-4. */
	it("keeps issue #34 inside its permitted paths", () => {
		const allowed = [
			"conformance/",
			"plan/Plan-009-conformance-corpus-and-oracle/",
			"test/conformance-corpus.test.ts",
			"docs/semantic-data-system/",
			"fixtures/semantic/v1/",
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
			"packages/semantic-core/",
			"fixtures/semantic-core/",
			"Makefile",
			"reviews/",
			"schema/semantic/v1/",
			"spec/",
			"test/",
			"tests/",
			"audit/filament-contract-census/",
			"pyproject.toml",
			"poetry.lock",
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
			// Issue #19 also publishes two generated documents and excludes its
			// generated fixtures from the formatter.
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
			"test/changed-paths.ts",
			"plan/",
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
		])
			expect(changedPaths(), prohibited).not.toContain(prohibited);
	});
});

describe("semantic IR v1.1 schema inventory (red until Tasks 035..038 land)", () => {
	/** Traces: TC-223, TC-230; FR-029-AC-5, FR-030-AC-4. */
	it("declares the v1.1 discriminator, node families, and closed vocabularies", () => {
		const ir = object(
			schemas.find(({ name }) => name === "semantic-ir.schema.json")?.value,
			"semantic-ir schema",
		);
		const defs = object(ir.$defs, "$defs");
		const properties = object(ir.properties, "properties");
		const version = object(properties.contractVersion, "contractVersion");
		// fcd#179: 2.0.0 is the only contract version this schema admits.
		expect(version.enum, "contractVersion enum").toEqual(["2.0.0"]);
		for (const def of [
			"multiplicity",
			"relationship",
			"operation",
			"clause",
			"constraint",
		])
			expect(defs, def).toHaveProperty(def);
		const field = object(defs.field, "field");
		const fieldProperties = object(field.properties, "field properties");
		expect(fieldProperties).toHaveProperty("multiplicity");
		expect(fieldProperties).toHaveProperty("unit");
		const constraint = JSON.stringify(defs.constraint);
		expect(constraint).not.toContain('"keyword":{"type":"string"');
		expect(constraint).not.toContain('"operands":{}');
		const common = object(
			schemas.find(({ name }) => name === "common.schema.json")?.value,
			"common schema",
		);
		expect(object(common.$defs, "common $defs")).toHaveProperty("target");
	});
});

describe("FR-030 version discriminator, source dialect, and manifest targets", () => {
	/** Traces: TC-227; FR-030-AC-1. */
	it("accepts documents whose dialect names a frontend", () => {
		for (const fixture of [
			"positive/semantic-ir-v1-1.json",
			"positive/semantic-ir-v1-1-spec-bundle.json",
		]) {
			const ir = object(readJson(fixture), fixture);
			expect(ir.contractVersion, fixture).toBe("2.0.0");
			expect(
				validates("semantic-ir.schema.json", ir),
				`${fixture}: ${JSON.stringify(ajv.errors)}`,
			).toBe(true);
		}
		const dialects = new Set(
			[
				"positive/semantic-ir-v1-1.json",
				"positive/semantic-ir-v1-1-spec-bundle.json",
			].map(
				(fixture) =>
					object(object(readJson(fixture), fixture).source, "source").dialect,
			),
		);
		expect(dialects).toEqual(new Set(["typespec", "spec-bundle"]));
	});

	/** Traces: TC-228; FR-030-AC-2. */
	it("rejects the retired JSON Schema dialect constant on a 1.1.0 document and cites ADR-0005", () => {
		const { valid, entry } = negativeValidates(
			"ir-v1-1-retired-json-schema-dialect",
		);
		expect(valid).toBe(false);
		expect(entry.code).toBe("agent-ix.semantic-ir.RETIRED_SOURCE_DIALECT");
		expect(entry.note ?? "").toContain("ADR-0005");
		const mismatch = negativeValidates("ir-v1-0-frontend-dialect");
		expect(mismatch.valid, "1.0.0 document keeps the v1 constant").toBe(false);
	});

	/** Traces: TC-229; FR-030-AC-3. */
	it("binds manifest targets to the declared registry", () => {
		const manifest = object(
			readJson("positive/package-manifest.json"),
			"manifest",
		);
		expect(manifest.targets).toEqual(["rust", "markdown"]);
		expect(validates("package-manifest.schema.json", manifest)).toBe(true);
		const { valid, entry } = negativeValidates("manifest-unknown-target");
		expect(valid).toBe(false);
		expect(entry.set?.value).toBe("go");
		const profileTarget = clone(manifest);
		setAt(profileTarget, "profiles.0.targets.0", "go");
		expect(validates("package-manifest.schema.json", profileTarget)).toBe(
			false,
		);
	});

	/** Traces: TC-230; FR-030-AC-4, FR-030-CON-2. */
	it("defines the target and representation registries once in the common schema", () => {
		const common = object(
			schemaNamed("common.schema.json").$defs,
			"common $defs",
		);
		const target = object(common.target, "target");
		expect(target.enum).toEqual([
			"json-schema",
			"rust",
			"typescript",
			"python-pydantic-v2",
			"python-dataclass",
		]);
		expect(
			object(common.representationFormat, "representationFormat").enum,
		).toEqual([
			"markdown",
			"json",
			"postgresql",
			"protobuf",
			"avro",
			"arrow",
			"parquet",
			"csv",
			"tsv",
		]);
		const manifest = JSON.stringify(
			schemaNamed("package-manifest.schema.json"),
		);
		const contract = JSON.stringify(schemaNamed("target-contract.schema.json"));
		const representation = JSON.stringify(
			schemaNamed("representation.schema.json"),
		);
		expect(
			manifest.split("common.schema.json#/$defs/manifestTarget").length,
		).toBe(3);
		expect(contract).toContain(
			'"target":{"$ref":"common.schema.json#/$defs/target"}',
		);
		expect(representation).toContain(
			'"format":{"$ref":"common.schema.json#/$defs/representationFormat"}',
		);
		for (const text of [manifest, contract, representation])
			expect(
				text.includes('"json-schema","rust","typescript"'),
				"inline copy of the generated-target registry",
			).toBe(false);
	});

	/** Traces: TC-246; FR-030-AC-5, FR-030-AC-6. */
	it("rejects unknown contract versions and unknown dialects before emission", () => {
		expect(negativeValidates("ir-v1-1-unsupported-version").valid).toBe(false);
		expect(negativeValidates("ir-unknown-version").valid).toBe(false);
		const dialect = negativeValidates("ir-v1-1-unknown-dialect");
		expect(dialect.valid).toBe(false);
		expect(dialect.entry.set?.value).toBe("avro");
		const version = object(
			schemaNamed("semantic-ir.schema.json").properties,
			"properties",
		);
		// fcd#179: 2.0.0 is the only contract version this schema admits.
		expect(object(version.contractVersion, "contractVersion").enum).toEqual([
			"2.0.0",
		]);
	});
});

type ReaderCase = {
	id: string;
	base: string;
	set: { path: string; value: unknown };
	also?: { path: string; value: unknown };
	code: string;
	path: string;
};

function readerCase(id: string): { entry: ReaderCase; document: unknown } {
	const entry = array(readJson("negative/reader-cases.json"), "reader cases")
		.map((value) => object(value, "reader case"))
		.find((value) => value.id === id) as unknown as ReaderCase | undefined;
	if (!entry) throw new Error(`reader case is not recorded: ${id}`);
	const document = clone(readJson(entry.base));
	setAt(document, entry.set.path, entry.set.value);
	if (entry.also) setAt(document, entry.also.path, entry.also.value);
	return { entry, document };
}

function expectReaderFailure(id: string): void {
	const { entry, document } = readerCase(id);
	const diagnostics = readSemanticIr(document);
	const hit = diagnostics.find((diagnostic) => diagnostic.code === entry.code);
	expect(hit, `${id}: ${JSON.stringify(diagnostics)}`).toBeDefined();
	expect(hit?.path, `${id} locus`).toBe(entry.path);
}

function goldenV11(): JsonObject {
	const document = object(
		readJson("positive/semantic-ir-v1-1.json"),
		"1.1.0 golden",
	);
	expect(
		validates("semantic-ir.schema.json", document),
		JSON.stringify(ajv.errors),
	).toBe(true);
	expect(readSemanticIr(document), "golden reader diagnostics").toEqual([]);
	return document;
}

function fieldNamed(
	document: JsonObject,
	typeName: string,
	name: string,
): JsonObject {
	const definition = array(document.types, "types")
		.map((value) => object(value, "type"))
		.find((value) => value.displayName === typeName);
	const field = array(object(definition, typeName).fields, "fields")
		.map((value) => object(value, "field"))
		.find((value) => value.name === name);
	return object(field, `${typeName}.${name}`);
}

/** Small seeded generator so the property cases need no external library. */
function seededRandom(seed: number): () => number {
	let state = seed >>> 0;
	return () => {
		state = (state * 1664525 + 1013904223) >>> 0;
		return state / 0x100000000;
	};
}

describe("FR-027 field multiplicity and units", () => {
	/** Traces: TC-203; FR-027-AC-1, FR-020-AC-7, US-006-EX-1. */
	it("derives presence from a 0..1 multiplicity and round-trips the normalized form", () => {
		const document = goldenV11();
		const summary = fieldNamed(document, "Artifact", "summary");
		expect(summary.multiplicity).toEqual({ lower: 0, upper: 1 });
		expect(summary.presence).toBe("optional");
		const first = normalize(document);
		const second = normalize(JSON.parse(first));
		expect(second).toBe(first);
		const random = seededRandom(203);
		for (let iteration = 0; iteration < 64; iteration += 1) {
			const mutated = clone(document);
			const lower = random() < 0.5 ? 0 : 1;
			const upper =
				random() < 0.3 ? undefined : lower + Math.floor(random() * 3);
			const multiplicity: Record<string, unknown> = { lower };
			if (upper !== undefined) multiplicity.upper = upper;
			if (upper === undefined || upper > 1) {
				if (random() < 0.5) multiplicity.ordered = random() < 0.5;
				if (random() < 0.5) multiplicity.unique = random() < 0.5;
			}
			setAt(mutated, "types.3.fields.1.multiplicity", multiplicity);
			setAt(
				mutated,
				"types.3.fields.1.presence",
				lower >= 1 ? "required" : "optional",
			);
			expect(readSemanticIr(mutated), JSON.stringify(multiplicity)).toEqual([]);
			const bytes = normalize(mutated);
			expect(normalize(JSON.parse(bytes))).toBe(bytes);
		}
		const v1 = readJson("positive/semantic-ir.json");
		expect(
			normalize(v1),
			"1.0.0 documents gain no derived bytes",
		).not.toContain('"multiplicity"');
	});

	/** Traces: TC-204; FR-027-AC-2. */
	it("preserves ordered and unique flags on a 1..* field", () => {
		const tags = fieldNamed(goldenV11(), "Artifact", "tags");
		expect(tags.multiplicity).toEqual({
			lower: 1,
			ordered: true,
			unique: true,
		});
		expect(tags.presence).toBe("required");
		const bytes = normalize(readJson("positive/semantic-ir-v1-1.json"));
		expect(bytes).toContain('"ordered":true');
		expect(bytes).toContain('"unique":true');
	});

	/**
	 * Traces: TC-205; FR-027-AC-3.
	 *
	 * FR-106-AC-4 carves out 2.0.0 specifically: a 2.0.0 field's presence may
	 * disagree with its multiplicity unenforced (fcd#182 is the open question
	 * on whether that should change). This case's `also` override pins the
	 * mutated document at a version other than `2.0.0` so it keeps probing
	 * the enforced side of that split rather than the exempted one.
	 */
	it("fails when stated presence contradicts the multiplicity outside 2.0.0", () => {
		expectReaderFailure("field-presence-contradicts-multiplicity");
	});

	/** Traces: TC-206; FR-027-AC-4. */
	it("fails inverted and negative bounds and accepts 0..0", () => {
		expectReaderFailure("field-upper-below-lower");
		expect(negativeValidates("ir-v1-1-negative-lower").valid).toBe(false);
		const document = clone(goldenV11());
		setAt(document, "types.3.fields.1.multiplicity", { lower: 0, upper: 0 });
		expect(validates("semantic-ir.schema.json", document)).toBe(true);
		expect(readSemanticIr(document)).toEqual([]);
	});

	/** Traces: TC-207; FR-027-AC-5, FR-027-CON-2. */
	it("accepts a unit on a scalar field and rejects it on a record field", () => {
		const duration = fieldNamed(goldenV11(), "Artifact", "duration");
		expect(duration.unit).toBe("s");
		expectReaderFailure("field-unit-on-record");
		expect(negativeValidates("ir-v1-1-empty-unit").valid).toBe(false);
		const aliased = clone(goldenV11());
		setAt(aliased, "types.3.fields.0.unit", "kg");
		expect(readSemanticIr(aliased), "alias of scalar accepts a unit").toEqual(
			[],
		);
		expectReaderFailure("field-unresolved-type-ref");
	});

	/**
	 * Traces: TC-208; FR-027-AC-6.
	 *
	 * fcd#179 deleted contract 1.0.0, which let a field omit `multiplicity`
	 * and have it silently derived from `presence`. `multiplicityFromPresence`
	 * stays as `normalize`'s own defensive fallback for a document that
	 * reaches it without having passed schema validation first, but the
	 * schema itself now requires `multiplicity`, so an omission is a named
	 * refusal rather than an accepted, derived value.
	 */
	it("refuses a field without multiplicity rather than deriving it from presence", () => {
		expect(multiplicityFromPresence("required")).toEqual({
			lower: 1,
			upper: 1,
		});
		expect(multiplicityFromPresence("optional")).toEqual({
			lower: 0,
			upper: 1,
		});
		expect(
			negativeValidates("ir-v2-field-without-multiplicity").valid,
			"2.0.0 requires it",
		).toBe(false);
	});

	/** Traces: TC-237; FR-027-AC-8. */
	it("fails ordered or unique flags on a single-valued field", () => {
		expectReaderFailure("field-flags-on-single");
	});

	/** Traces: TC-238; FR-027-AC-9. */
	it("classifies multiplicity narrowing as breaking and widening as additive", () => {
		const cases = array(readJson("compatibility/cases.json"), "cases").map(
			(value) => object(value, "case"),
		);
		const byId = new Map(cases.map((entry) => [String(entry.id), entry]));
		expect(byId.get("multiplicity-widening")?.expected).toBe("additive");
		expect(byId.get("multiplicity-narrowing")?.expected).toBe("breaking");
		expect(byId.get("unit-change")?.expected).toBe("breaking");
		expect(byId.get("ordered-flag-change")?.expected).toBe("breaking");
		expect(byId.get("unique-flag-change")?.expected).toBe("breaking");
	});
});

const CLOSED_KEYWORDS = [
	"min",
	"max",
	"exclusiveMin",
	"exclusiveMax",
	"pattern",
	"minLength",
	"maxLength",
	"enumValues",
	"nonEmpty",
	"unique",
	"format",
];

function allConstraints(document: JsonObject): JsonObject[] {
	return array(document.types, "types").flatMap((type) =>
		array(object(type, "type").constraints, "constraints").map((value) =>
			object(value, "constraint"),
		),
	);
}

describe("FR-029 closed constraint vocabulary", () => {
	/** Traces: TC-219; FR-029-AC-1. */
	it("has one validating positive fixture per closed keyword", () => {
		const keywords = new Set(
			allConstraints(goldenV11()).map((constraint) =>
				String(constraint.keyword),
			),
		);
		for (const keyword of CLOSED_KEYWORDS)
			expect(keywords, keyword).toContain(keyword);
	});

	/** Traces: TC-220; FR-029-AC-2, US-006-EX-4. */
	it("fails an unknown keyword at the constraint locus", () => {
		const { valid, entry } = negativeValidates("constraint-unknown-keyword");
		expect(valid).toBe(false);
		expect(entry.set?.value).toBe("mnimum");
		const { document } = readerCase("constraint-string-operand-on-number");
		setAt(document, "types.1.constraints.0.keyword", "mnimum");
		const hit = readSemanticIr(document).find(
			(diagnostic) =>
				diagnostic.code === "agent-ix.semantic-ir.UNKNOWN_CONSTRAINT_KEYWORD",
		);
		expect(hit?.path).toBe("types.1.constraints.0.keyword");
	});

	/** Traces: TC-221; FR-029-AC-3. */
	it("fails a string operand on a numeric bound and a negative length", () => {
		expectReaderFailure("constraint-string-operand-on-number");
		expect(negativeValidates("constraint-negative-min-length").valid).toBe(
			false,
		);
		expect(negativeValidates("constraint-empty-enum-values").valid).toBe(false);
	});

	/** Traces: TC-222; FR-029-AC-4. */
	it("fails a pattern constraint without a dialect", () => {
		expect(negativeValidates("constraint-pattern-without-dialect").valid).toBe(
			false,
		);
	});

	/** Traces: TC-223; FR-029-AC-5. */
	it("declares no free keyword and no untyped operands path", () => {
		const constraint = object(
			object(schemaNamed("semantic-ir.schema.json").$defs, "$defs").constraint,
			"constraint",
		);
		const variants = array(constraint.oneOf, "constraint variants").map(
			(value) => object(value, "variant"),
		);
		const declared = new Set<string>();
		for (const variant of variants) {
			const properties = object(variant.properties, "properties");
			const keyword = object(properties.keyword, "keyword");
			for (const value of array(keyword.enum, "keyword enum"))
				declared.add(String(value));
			const operands = object(properties.operands, "operands");
			expect(operands.additionalProperties, "typed operands").toBe(false);
			expect(operands.type).toBe("object");
		}
		expect([...declared].sort()).toEqual([...CLOSED_KEYWORDS].sort());
		const text = JSON.stringify(constraint);
		expect(text).not.toContain('"keyword":{"type":"string"');
		expect(text).not.toContain('"operands":{}');
		expect(text).not.toContain('"items":{}');
		expect(negativeValidates("constraint-untyped-operand").valid).toBe(false);
		expect(negativeValidates("constraint-unnamespaced-format").valid).toBe(
			false,
		);
	});

	/** Traces: TC-224; FR-029-CON-1. */
	it("finds every v1 fixture constraint inside the closed vocabulary", () => {
		const v1 = object(readJson("positive/semantic-ir.json"), "v1");
		const constraints = allConstraints(v1);
		expect(constraints.length, "v1 fixtures carry no constraints today").toBe(
			0,
		);
		for (const constraint of [...constraints, ...allConstraints(goldenV11())])
			expect(CLOSED_KEYWORDS).toContain(String(constraint.keyword));
	});

	/**
	 * Traces: TC-225, TC-235; FR-029-CON-2.
	 *
	 * The `compatibility/cases.json` entry `v1-to-v1-1-additive-revision` — the
	 * FR-029-CON-2 clause about the v1 → v1.1 narrowing, and NFR-013-AC-3,
	 * which required this corpus entry outright — described the 1.0.0 → 1.1.0
	 * migration. Both contracts are gone (fcd#179); the entry is gone from the
	 * corpus already. Whether FR-029-CON-2's trailing clause and NFR-013 (an
	 * entire requirement about that one now-nonexistent revision) still have a
	 * reason to exist is a bigger call than this deletion ticket, so this test
	 * keeps only the vocabulary-change assertions that remain live and drops
	 * the revision-history one rather than resurrecting dead corpus data.
	 */
	it("classifies vocabulary changes", () => {
		const byId = new Map(
			array(readJson("compatibility/cases.json"), "cases")
				.map((value) => object(value, "case"))
				.map((entry) => [String(entry.id), entry]),
		);
		expect(byId.get("constraint-keyword-added-to-vocabulary")?.expected).toBe(
			"additive",
		);
		expect(
			byId.get("constraint-keyword-removed-from-vocabulary")?.expected,
		).toBe("breaking");
		expect(byId.get("constraint-keyword-operands-retyped")?.expected).toBe(
			"breaking",
		);
	});

	/** Traces: TC-244; FR-029-AC-7. */
	it("fails a keyword applied outside its applicability", () => {
		expectReaderFailure("constraint-min-length-on-number");
	});

	/** Traces: TC-245; FR-029-AC-8. */
	it("fails a regex that does not compile under ecma-262", () => {
		expectReaderFailure("constraint-regex-does-not-compile");
	});
});

function typeNamed(document: JsonObject, name: string): JsonObject {
	const definition = array(document.types, "types")
		.map((value) => object(value, "type"))
		.find((value) => value.displayName === name);
	return object(definition, name);
}

describe("FR-028 relationships, operations, and clauses", () => {
	/** Traces: TC-210; FR-028-AC-1, FR-020-AC-7, US-006-EX-2. */
	it("carries a belongs_to structural relationship as a node and round-trips it", () => {
		const document = goldenV11();
		const artifact = typeNamed(document, "Artifact");
		const relationship = object(
			array(artifact.relationships, "relationships")[0],
			"relationship",
		);
		expect(relationship).toMatchObject({
			verb: "belongs_to",
			category: "structural",
			composite: false,
			target: "ix://agent-ix/assurance/type/Project",
			multiplicity: { lower: 0, upper: 1 },
		});
		expect(relationship.origin).toBeDefined();
		const bytes = normalize(document);
		expect(normalize(JSON.parse(bytes))).toBe(bytes);
		expect(bytes).toContain('"verb":"belongs_to"');
	});

	/** Traces: TC-211; FR-028-AC-2. */
	it("fails an unknown relationship category at the relationship locus", () => {
		const { valid, entry } = negativeValidates("relationship-unknown-category");
		expect(valid).toBe(false);
		expect(entry.set?.path).toBe("types.3.relationships.0.category");
		const { document } = readerCase("relationship-unresolved-target");
		setAt(document, "types.3.relationships.0.category", "ownership");
		const hit = readSemanticIr(document).find(
			(diagnostic) =>
				diagnostic.code === "agent-ix.semantic-ir.UNKNOWN_EDGE_CATEGORY",
		);
		expect(hit?.path).toBe("types.3.relationships.0.category");
	});

	/** Traces: TC-212; FR-028-AC-3. */
	it("validates an operation with params, a bounded return, and present pre/post clauses", () => {
		const operation = object(
			array(typeNamed(goldenV11(), "Artifact").operations, "operations")[0],
			"operation",
		);
		expect(array(operation.params, "params").length).toBe(2);
		expect(operation.returns).toEqual({
			typeRef: "ix://agent-ix/assurance/type/Artifact",
			multiplicity: { lower: 1, upper: 1 },
			nullable: false,
		});
		expect(operation.pre).toEqual(["not-archived"]);
		expect(operation.post).toEqual(["archived"]);
	});

	/** Traces: TC-213; FR-028-AC-4. */
	it("fails an operation whose post names an absent clauseId", () => {
		expectReaderFailure("operation-dangling-post-clause");
	});

	/** Traces: TC-214; FR-028-AC-5, FR-028-CON-2, US-006-EX-3. */
	it("carries clause text and span opaquely and declares no parsed-content property", () => {
		const clauses = array(
			typeNamed(goldenV11(), "Artifact").clauses,
			"clauses",
		).map((value) => object(value, "clause"));
		const invariant = clauses.find(
			(clause) => clause.clauseId === "not-archived",
		);
		expect(invariant).toMatchObject({ language: "ocl" });
		expect(typeof object(invariant, "invariant").text).toBe("string");
		expect(object(invariant, "invariant").sourceSpan).toMatchObject({
			startLine: 30,
			endLine: 31,
		});
		const clause = object(
			object(schemaNamed("semantic-ir.schema.json").$defs, "$defs").clause,
			"clause",
		);
		expect(Object.keys(object(clause.properties, "properties")).sort()).toEqual(
			["clauseId", "identity", "language", "origin", "sourceSpan", "text"],
		);
		expect(negativeValidates("clause-parsed-content").valid).toBe(false);
		expectReaderFailure("clause-source-without-span");
		const generated = clauses.find(
			(clause) => clause.clauseId === "generated-invariant",
		);
		expect(
			object(generated, "generated clause").sourceSpan,
			"generated origin needs no span",
		).toBeUndefined();
		const quire = clone(goldenV11());
		const quireText =
			"Pre: self.status <> Status::Archived ∧ count(self.tags) ≥ 1\n";
		setAt(quire, "types.3.clauses.0.language", "quire");
		setAt(quire, "types.3.clauses.0.text", quireText);
		expect(validates("semantic-ir.schema.json", quire)).toBe(true);
		expect(
			readSemanticIr(quire).filter(
				(diagnostic) =>
					diagnostic.code === "agent-ix.semantic-ir.UNKNOWN_CLAUSE_LANGUAGE",
			),
		).toEqual([]);
		// FCD carries a quire clause; Quire intake checks it. The text survives a
		// serialize/parse round trip byte-identical and gains no parsed content.
		const roundTripped = object(
			array(
				typeNamed(JSON.parse(JSON.stringify(quire)), "Artifact").clauses,
				"round-tripped clauses",
			)[0],
			"round-tripped quire clause",
		);
		expect(roundTripped.language).toBe("quire");
		expect(Buffer.from(String(roundTripped.text), "utf8")).toEqual(
			Buffer.from(quireText, "utf8"),
		);
		expect(
			Object.keys(roundTripped).filter(
				(key) =>
					![
						"clauseId",
						"identity",
						"language",
						"origin",
						"sourceSpan",
						"text",
					].includes(key),
			),
		).toEqual([]);
	});

	/** Traces: TC-215; FR-028-AC-6. */
	it("accepts a namespaced clause language and rejects a bare unknown one", () => {
		const clauses = array(
			typeNamed(goldenV11(), "Artifact").clauses,
			"clauses",
		).map((value) => object(value, "clause"));
		expect(clauses.map((clause) => clause.language)).toContain("acme:tla");
		expect(negativeValidates("clause-bare-unknown-language").valid).toBe(false);
		const document = clone(goldenV11());
		setAt(document, "types.3.clauses.0.language", "tla");
		const hit = readSemanticIr(document).find(
			(diagnostic) =>
				diagnostic.code === "agent-ix.semantic-ir.UNKNOWN_CLAUSE_LANGUAGE",
		);
		expect(hit?.path).toBe("types.3.clauses.0.language");
	});

	/** Traces: TC-216; FR-028-AC-7. */
	it("fails relationships or operations on a non-record type definition", () => {
		expect(negativeValidates("relationship-on-scalar").valid).toBe(false);
		expect(negativeValidates("operations-on-sequence").valid).toBe(false);
		const document = clone(goldenV11());
		setAt(document, "types.1.relationships", []);
		const hit = readSemanticIr(document).find(
			(diagnostic) =>
				diagnostic.code === "agent-ix.semantic-ir.NODES_ON_NON_RECORD",
		);
		expect(hit?.path).toBe("types.1");
		const seconds = typeNamed(goldenV11(), "Seconds");
		expect(
			array(seconds.clauses, "scalar clauses").length,
			"clauses on any kind",
		).toBe(1);
	});

	/**
	 * Traces: TC-217; FR-028-CON-1.
	 *
	 * `relationships[]`/`operations[]`/`clauses[]` stay optional on a type
	 * definition in the 2.0.0 schema (they are absent from `Text`, `Seconds`,
	 * `ArtifactId`, and `Artifacts` in the golden fixture itself), so reading
	 * an absent array as empty is still live, current behaviour, not a
	 * fcd#179 acceptance shim for the deleted 1.0.0 contract.
	 */
	it("reads absent node arrays as empty", () => {
		const document = goldenV11();
		for (const name of ["Text", "ArtifactId", "Artifacts"]) {
			const definition = typeNamed(document, name);
			expect(definition.relationships, name).toBeUndefined();
			expect(definition.operations, name).toBeUndefined();
			expect(definition.clauses, name).toBeUndefined();
		}
		expect(readSemanticIr(document)).toEqual([]);
	});

	/** Traces: TC-239; FR-028-AC-9. */
	it("fails a relationship target that resolves to nothing in the document or lock", () => {
		expectReaderFailure("relationship-unresolved-target");
		expect(negativeValidates("relationship-display-name-target").valid).toBe(
			false,
		);
		const { document } = readerCase("relationship-unresolved-target");
		expect(
			readSemanticIr(document, ["ix://agent-ix/assurance/type/Missing"]),
			"lock export resolves the target",
		).toEqual([]);
	});

	/** Traces: TC-240; FR-028-AC-10. */
	it("fails composite cycles and composite self-references but accepts a plain self-reference", () => {
		expectReaderFailure("relationship-composite-self-reference");
		expectReaderFailure("relationship-composite-cycle");
		const parent = object(
			array(
				typeNamed(goldenV11(), "Artifact").relationships,
				"relationships",
			)[1],
			"parent",
		);
		expect(parent.target).toBe("ix://agent-ix/assurance/type/Artifact");
		expect(parent.composite).toBe(false);
	});

	/** Traces: TC-241; FR-028-AC-11. */
	it("fails two clauses sharing a clauseId in one type definition", () => {
		expectReaderFailure("clause-duplicate-clause-id");
		expectReaderFailure("operation-duplicate-param");
		expectReaderFailure("relationship-duplicate-identity");
	});

	/** Traces: TC-242; FR-028-AC-12. */
	it("matches the IR category enumeration to the installed FR-040 EdgeCategory registry", () => {
		const relationship = object(
			object(schemaNamed("semantic-ir.schema.json").$defs, "$defs")
				.relationship,
			"relationship",
		);
		const categories = array(
			object(object(relationship.properties, "properties").category, "category")
				.enum,
			"category enum",
		).map(String);
		const manifest = resolve(
			homedir(),
			".ix/filament/modules/spec-artifacts-iso/manifest.yaml",
		);
		if (!existsSync(manifest)) {
			throw new Error(
				`FR-040 registry is not installed at ${manifest}; install spec-artifacts-iso`,
			);
		}
		const text = readFileSync(manifest, "utf8");
		const registry = new Set(
			[...text.matchAll(/\bcategory:\s*([a-z]+)/g)].map((match) => match[1]),
		);
		expect([...registry].sort()).toEqual([...categories].sort());
	});

	/** Traces: TC-243; FR-028-AC-13. */
	it("classifies node-family additions as additive and removals or retargeting as breaking", () => {
		const byId = new Map(
			array(readJson("compatibility/cases.json"), "cases")
				.map((value) => object(value, "case"))
				.map((entry) => [String(entry.id), String(entry.expected)]),
		);
		for (const additive of [
			"relationship-added",
			"operation-added",
			"clause-added",
		])
			expect(byId.get(additive), additive).toBe("additive");
		for (const breaking of [
			"relationship-removed",
			"relationship-retargeted",
			"relationship-composite-flipped",
			"operation-returns-changed",
			"clause-language-changed",
			"clause-removed",
		])
			expect(byId.get(breaking), breaking).toBe("breaking");
	});
});

describe("FR-006 ConfigVersion worked example (Task-039)", () => {
	function configVersion(): JsonObject {
		// fcd#179: `config-version-v1-1.json` stays on disk, pinned by
		// FR-094-CON-4, but is no longer a 2.0.0 document, so this worked
		// example reads its structurally identical 2.0.0 sibling instead.
		const document = object(
			readJson("positive/config-version-v2.json"),
			"ConfigVersion",
		);
		expect(
			validates("semantic-ir.schema.json", document),
			JSON.stringify(ajv.errors),
		).toBe(true);
		expect(readSemanticIr(document)).toEqual([]);
		expect(object(document.source, "source").dialect).toBe("spec-bundle");
		return document;
	}

	/** Traces: TC-209; FR-027-AC-7. */
	it("expresses the FR-006 fields with multiplicity and zero declared loss", () => {
		const entity = typeNamed(configVersion(), "ConfigVersion");
		const fields = array(entity.fields, "fields").map((value) =>
			object(value, "field"),
		);
		expect(fields.map((field) => field.name)).toEqual([
			"id",
			"versionNumber",
			"data",
			"hash",
			"createdAt",
			"createdBy",
		]);
		for (const field of fields)
			expect(field.multiplicity).toEqual({ lower: 1, upper: 1 });
		const loss = object(
			readJson("positive/config-version-v2-loss.json"),
			"loss table",
		);
		expect(loss.fixture).toBe("positive/config-version-v2.json");
		expect(loss.declaredLoss).toEqual([]);
		const rows = array(loss.rows, "rows").map((value) => object(value, "row"));
		expect(rows.length).toBeGreaterThanOrEqual(8);
		for (const row of rows) expect(row.loss, String(row.row)).toBe("none");
	});

	/** Traces: TC-218; FR-028-AC-8. */
	it("expresses the overlay and parent relationships and the immutability invariant", () => {
		const entity = typeNamed(configVersion(), "ConfigVersion");
		const relationships = array(entity.relationships, "relationships").map(
			(value) => object(value, "relationship"),
		);
		expect(
			relationships.map((relationship) => [
				relationship.verb,
				relationship.target,
			]),
		).toEqual([
			["belongs_to", "ix://agent-ix/config-service/type/ConfigOverlay"],
			["derives_from", "ix://agent-ix/config-service/type/ConfigVersion"],
		]);
		expect(relationships[1]?.multiplicity).toEqual({ lower: 0, upper: 1 });
		const clauses = array(entity.clauses, "clauses").map((value) =>
			object(value, "clause"),
		);
		expect(clauses).toHaveLength(1);
		expect(clauses[0]).toMatchObject({
			language: "ocl",
			clauseId: "immutable",
		});
		expect(String(clauses[0]?.text)).toContain("@pre");
	});

	/** Traces: TC-226; FR-029-AC-6. */
	it("expresses versionNumber min: 1 as a typed constraint", () => {
		const versionNumber = typeNamed(configVersion(), "VersionNumber");
		expect(versionNumber.kind).toBe("alias");
		const constraint = object(
			array(versionNumber.constraints, "constraints")[0],
			"constraint",
		);
		expect(constraint).toMatchObject({
			keyword: "min",
			operands: { value: 1 },
		});
	});
});

type Verdict = {
	id: string;
	schemaValid?: boolean;
	diagnostics?: string[];
	normalized?: string;
	code?: string;
	hit?: boolean;
	path?: string | null;
};

/** Mirrors `tests/semantic_ir_reader.py --verdicts` from the TypeScript side. */
function typescriptVerdicts(): Verdict[] {
	const results: Verdict[] = [];
	const positives = readdirSync(resolve(fixtureRoot, "positive"))
		.filter((name) => name.startsWith("semantic-ir") && name.endsWith(".json"))
		.sort();
	for (const name of [...positives, "config-version-v1-1.json"]) {
		const document = readJson(`positive/${name}`);
		results.push({
			id: `positive/${name}`,
			schemaValid: validates("semantic-ir.schema.json", document),
			diagnostics: readSemanticIr(document)
				.map((d) => d.code)
				.sort(),
			normalized: normalize(document),
		});
	}
	for (const raw of array(readJson("negative/cases.json"), "cases")) {
		const entry = object(raw, "case") as unknown as NegativeCase;
		if (entry.schema !== "semantic-ir.schema.json") continue;
		results.push({
			id: `negative/${entry.id}`,
			schemaValid: negativeValidates(entry.id).valid,
		});
	}
	for (const raw of array(
		readJson("negative/reader-cases.json"),
		"reader cases",
	)) {
		const entry = object(raw, "reader case") as unknown as ReaderCase;
		const { document } = readerCase(entry.id);
		const hits = readSemanticIr(document).filter((d) => d.code === entry.code);
		results.push({
			id: `reader/${entry.id}`,
			code: entry.code,
			hit: hits.length > 0,
			path: hits[0]?.path ?? null,
		});
	}
	return results;
}

function seededDocument(seed: number): JsonObject {
	const random = seededRandom(seed);
	const pick = <T>(items: T[]): T =>
		items[Math.floor(random() * items.length)] as T;
	const document = clone(goldenV11());
	const artifact = typeNamed(document, "Artifact");
	for (const field of array(artifact.fields, "fields").map((value) =>
		object(value, "field"),
	)) {
		const lower = pick([0, 1]);
		const upper = pick([undefined, lower, lower + 1, lower + 5]);
		const multiplicity: JsonObject = { lower };
		if (upper !== undefined) multiplicity.upper = upper;
		if (upper === undefined || upper > 1) {
			if (random() < 0.5) multiplicity.ordered = random() < 0.5;
			if (random() < 0.5) multiplicity.unique = random() < 0.5;
		}
		field.multiplicity = multiplicity;
		field.presence = lower >= 1 ? "required" : "optional";
		field.nullable = random() < 0.3;
		if (field.name === "duration") field.unit = pick(["s", "ms", "min", "kg"]);
	}
	const relationship = object(
		array(artifact.relationships, "relationships")[0],
		"relationship",
	);
	relationship.category = pick([
		"structural",
		"dependency",
		"traceability",
		"governance",
	]);
	relationship.verb = pick(["belongs_to", "uses", "depends_on"]);
	relationship.multiplicity = pick([
		{ lower: 0, upper: 1 },
		{ lower: 1, upper: 1 },
		{ lower: 0 },
	]);
	const clause = object(array(artifact.clauses, "clauses")[0], "clause");
	clause.language = pick(["quire", "ocl", "sysml", "fretish", "acme:tla"]);
	clause.text = `context Artifact inv seed${seed}: self.summary <> '${seed}'`;
	const operation = object(
		array(artifact.operations, "operations")[0],
		"operation",
	);
	object(operation.returns, "returns").nullable = random() < 0.5;
	const seconds = typeNamed(document, "Seconds");
	const bound = object(
		array(seconds.constraints, "constraints")[0],
		"constraint",
	);
	object(bound.operands, "operands").value = Math.floor(random() * 1000);
	return document;
}

describe("FR-020 closing gate: two readers, round trip, fixture inventory (Task-040)", () => {
	/** Traces: TC-232; FR-020-AC-8. */
	it("agrees with the independent Python reader on every fixture and recorded case", () => {
		const python = execFileSync(
			"poetry",
			["run", "python", "tests/semantic_ir_reader.py", "--verdicts"],
			{ cwd: root, encoding: "utf8" },
		);
		const theirs = new Map(
			(JSON.parse(python) as Verdict[]).map((v) => [v.id, v]),
		);
		const ours = typescriptVerdicts();
		expect(ours.length).toBeGreaterThanOrEqual(40);
		expect(new Set(theirs.keys())).toEqual(new Set(ours.map((v) => v.id)));
		for (const verdict of ours) {
			const other = theirs.get(verdict.id);
			expect(other, verdict.id).toBeDefined();
			if (verdict.schemaValid !== undefined)
				expect(other?.schemaValid, `${verdict.id} schema`).toBe(
					verdict.schemaValid,
				);
			if (verdict.diagnostics)
				expect(other?.diagnostics, `${verdict.id} diagnostics`).toEqual(
					verdict.diagnostics,
				);
			if (verdict.normalized)
				expect(other?.normalized, `${verdict.id} normalized bytes`).toBe(
					verdict.normalized,
				);
			if (verdict.hit !== undefined) {
				expect(other?.hit, `${verdict.id} hit`).toBe(verdict.hit);
				expect(other?.path, `${verdict.id} locus`).toBe(verdict.path);
			}
		}
	});

	/** Traces: TC-233; FR-020-AC-7. */
	it("round-trips generated 1.1.0 documents with all five node kinds byte-identically", () => {
		for (let seed = 1; seed <= 48; seed += 1) {
			const document = seededDocument(seed);
			expect(
				validates("semantic-ir.schema.json", document),
				`seed ${seed}: ${JSON.stringify(ajv.errors)}`,
			).toBe(true);
			expect(readSemanticIr(document), `seed ${seed}`).toEqual([]);
			const bytes = normalize(document);
			expect(normalize(JSON.parse(bytes)), `seed ${seed}`).toBe(bytes);
			expect(JSON.parse(bytes)).toEqual(
				JSON.parse(normalize(JSON.parse(bytes))),
			);
		}
	});

	/** Traces: TC-247; NFR-013-AC-5. */
	it("has at least one golden and one negative fixture per new node kind", () => {
		const golden = JSON.stringify([
			readJson("positive/semantic-ir-v1-1.json"),
			readJson("positive/config-version-v1-1.json"),
		]);
		const negatives = JSON.stringify([
			readJson("negative/cases.json"),
			readJson("negative/reader-cases.json"),
		]);
		// Plain substrings, not regex literals: Quire's coverage scanner counts
		// braces inside regex literals and would report this file unbalanced.
		const nodeKinds: [string, string, string][] = [
			["multiplicity", '"multiplicity"', "multiplicity"],
			["unit", '"unit":"s"', "unit"],
			["relationship", '"relationships":[{', "relationship"],
			["operation", '"operations":[{', "operation"],
			["clause", '"clauses":[{', "clause"],
			["constraint", '"keyword":"min"', "constraint"],
			["dialect", '"dialect":"typespec"', "dialect"],
		];
		for (const [kind, goldenNeedle, negativeNeedle] of nodeKinds) {
			expect(golden.includes(goldenNeedle), `${kind} golden`).toBe(true);
			expect(
				negatives.toLowerCase().includes(negativeNeedle),
				`${kind} negative`,
			).toBe(true);
		}
	});
});
