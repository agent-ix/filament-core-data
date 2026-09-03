import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { describe, expect, it } from "vitest";
import {
	multiplicityFromPresence,
	normalize,
	readSemanticIr,
} from "./semantic-ir-v1-1-reader";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const schemaRoot = resolve(root, "schema/semantic/v1");
const fixtureRoot = resolve(root, "fixtures/semantic/v1");
const schemaBase = "https://schemas.agent-ix.org/filament-core-data/v1/";
const generatedDuringTests = new Set([
	"agent_ix_core_data/core_data.py",
	"src/generated.ts",
]);

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
	const committed = execFileSync(
		"git",
		["diff", "--name-only", "origin/main...HEAD"],
		{ cwd: root, encoding: "utf8" },
	);
	const working = execFileSync(
		"git",
		["status", "--porcelain", "--untracked-files=all"],
		{ cwd: root, encoding: "utf8" },
	)
		.split("\n")
		.filter((line) => line.trim().length > 0)
		.map((line) => line.slice(3).trim());
	return [...new Set([...committed.split("\n"), ...working])].filter(
		(path) => path.length > 0 && !generatedDuringTests.has(path),
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
	/** Traces: TC-208, TC-231; FR-027-AC-6, FR-027-CON-1, FR-030-CON-1, NFR-013-AC-1. */
	it("keeps every v1 positive fixture byte-identical and valid", () => {
		const baseline = object(
			readJson("v1-fixture-digests.json"),
			"v1 fixture digest baseline",
		);
		const digests = object(baseline.digests, "digests");
		for (const [name, digest] of Object.entries(digests)) {
			expect(sha256(resolve(fixtureRoot, "positive", name)), name).toBe(digest);
		}
		const ir = object(readJson("positive/semantic-ir.json"), "v1 IR");
		expect(ir.contractVersion).toBe("1.0.0");
		expect(
			validates("semantic-ir.schema.json", ir),
			JSON.stringify(ajv.errors),
		).toBe(true);
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
		for (const path of changedPaths())
			expect(path.startsWith("spikes/"), path).toBe(false);
		const spikeDiff = execFileSync(
			"git",
			["diff", "origin/main", "--stat", "--", "spikes/"],
			{ cwd: root, encoding: "utf8" },
		);
		expect(spikeDiff).toBe("");
	});

	/** Traces: TC-236; NFR-013-AC-4. */
	it("keeps issue #34 inside its permitted paths", () => {
		const allowed = [
			"docs/semantic-data-system/",
			"fixtures/semantic/v1/",
			"plan/Plan-005-semantic-ir-v1-1/",
			"reviews/",
			"schema/semantic/v1/",
			"spec/",
			"test/",
			"tests/",
			"pyproject.toml",
			"poetry.lock",
		];
		for (const path of changedPaths()) {
			expect(
				allowed.some((prefix) => path === prefix || path.startsWith(prefix)),
				path,
			).toBe(true);
			if (existsSync(resolve(root, path)))
				expect(statSync(resolve(root, path)).isFile(), path).toBe(true);
		}
		for (const prohibited of [
			"schema/avro/core-data.avpr",
			"src/generated.ts",
			"agent_ix_core_data/core_data.py",
			"package.json",
			"pnpm-lock.yaml",
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
		expect(version.enum, "contractVersion enum").toEqual(["1.0.0", "1.1.0"]);
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
	it("accepts 1.1.0 documents whose dialect names a frontend", () => {
		for (const fixture of [
			"positive/semantic-ir-v1-1.json",
			"positive/semantic-ir-v1-1-spec-bundle.json",
		]) {
			const ir = object(readJson(fixture), fixture);
			expect(ir.contractVersion, fixture).toBe("1.1.0");
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
	it("rejects unknown contract versions and unknown 1.1.0 dialects before emission", () => {
		expect(negativeValidates("ir-v1-1-unsupported-version").valid).toBe(false);
		expect(negativeValidates("ir-unknown-version").valid).toBe(false);
		const dialect = negativeValidates("ir-v1-1-unknown-dialect");
		expect(dialect.valid).toBe(false);
		expect(dialect.entry.set?.value).toBe("avro");
		const version = object(
			schemaNamed("semantic-ir.schema.json").properties,
			"properties",
		);
		expect(object(version.contractVersion, "contractVersion").enum).toEqual([
			"1.0.0",
			"1.1.0",
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

	/** Traces: TC-205; FR-027-AC-3. */
	it("fails when stated presence contradicts the multiplicity", () => {
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

	/** Traces: TC-208; FR-027-AC-6, FR-027-CON-1. */
	it("reads a 1.0.0 field without multiplicity by deriving it from presence", () => {
		const v1 = object(readJson("positive/semantic-ir.json"), "v1");
		expect(readSemanticIr(v1)).toEqual([]);
		expect(multiplicityFromPresence("required")).toEqual({
			lower: 1,
			upper: 1,
		});
		expect(multiplicityFromPresence("optional")).toEqual({
			lower: 0,
			upper: 1,
		});
		expect(
			negativeValidates("ir-v1-1-field-without-multiplicity").valid,
			"1.1.0 requires it",
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

	/** Traces: TC-225, TC-235; FR-029-CON-2, NFR-013-AC-3. */
	it("classifies vocabulary changes and records v1 → v1.1 as additive", () => {
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
		const revision = object(
			byId.get("v1-to-v1-1-additive-revision"),
			"revision case",
		);
		expect(revision.expected).toBe("additive");
		expect(revision.from).toBe("1.0.0");
		expect(revision.to).toBe("1.1.0");
		expect(
			array(revision.addedNodes, "added nodes").length,
		).toBeGreaterThanOrEqual(5);
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

	/** Traces: TC-217; FR-028-CON-1. */
	it("reads absent node arrays as empty on a 1.0.0 document", () => {
		const v1 = object(readJson("positive/semantic-ir.json"), "v1");
		for (const definition of array(v1.types, "types").map((value) =>
			object(value, "type"),
		)) {
			expect(definition.relationships).toBeUndefined();
			expect(definition.operations).toBeUndefined();
			expect(definition.clauses).toBeUndefined();
		}
		expect(validates("semantic-ir.schema.json", v1)).toBe(true);
		expect(readSemanticIr(v1)).toEqual([]);
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
