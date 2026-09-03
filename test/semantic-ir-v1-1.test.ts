import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { describe, expect, it } from "vitest";

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
		(path) => path.length > 0,
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
