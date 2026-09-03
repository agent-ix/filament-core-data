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

describe("semantic IR v1.1 baseline and non-disruption", () => {
	/** Traces: TC-208, TC-231; FR-027-AC-6, FR-027-CON-1, FR-030-CON-1, NFR-013-AC-1. */
	it("keeps every v1 positive fixture byte-identical and valid", () => {
		const baseline = object(
			readJson("v1-fixture-digests.json"),
			"v1 fixture digest baseline",
		);
		const digests = object(baseline.digests, "digests");
		for (const [name, digest] of Object.entries(digests)) {
			expect(sha256(resolve(fixtureRoot, "positive", name)), name).toBe(
				digest,
			);
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
