import { readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import type { ValidateFunction } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { describe, expect, it } from "vitest";

/**
 * PLAT-899: the module manifest's `semantic` block, owned here rather than
 * vendored from a private repo. `targets` must resolve by $ref to fcd's own
 * `$defs/target` and `$defs/representationFormat` (via `$defs/manifestTarget`)
 * rather than an inlined enum, and quoin's three install-policy keys
 * (`compatibility_posture`, `legacy_forms`, `sweep_report`) must be absent.
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const schemaRoot = resolve(root, "schema/semantic/v1");
const fixtureRoot = resolve(root, "fixtures/semantic/v1");
const schemaBase = "https://schemas.agent-ix.org/filament-core-data/v1/";
const schemaFile = "module-semantic-block.schema.json";

function buildAjv(): Ajv2020 {
	const ajv = new Ajv2020({
		allErrors: true,
		strict: true,
		strictRequired: false,
	});
	addFormats(ajv);
	for (const name of readdirSync(schemaRoot).filter((entry) =>
		entry.endsWith(".schema.json"),
	)) {
		ajv.addSchema(JSON.parse(readFileSync(resolve(schemaRoot, name), "utf8")));
	}
	return ajv;
}

function validator(ajv: Ajv2020): ValidateFunction {
	const validate = ajv.getSchema(`${schemaBase}${schemaFile}`);
	if (!validate) {
		throw new Error(`schema was not registered: ${schemaFile}`);
	}
	return validate;
}

// Read from the shared fixture rather than duplicated inline, so an edit to
// the fixture cannot leave this test silently asserting the old shape.
const knownGoodBlock = JSON.parse(
	readFileSync(
		resolve(fixtureRoot, "positive/module-semantic-block.json"),
		"utf8",
	),
) as Record<string, unknown>;

describe("PLAT-899 module manifest semantic block", () => {
	it("compiles the schema and validates a known-good semantic block", () => {
		const validate = validator(buildAjv());
		const valid = validate(knownGoodBlock);
		expect(validate.errors, JSON.stringify(validate.errors)).toBeNull();
		expect(valid).toBe(true);
	});

	it("rejects a block missing a required field", () => {
		const validate = validator(buildAjv());
		const { contract_version: _omitted, ...bad } = knownGoodBlock;
		expect(validate(bad)).toBe(false);
	});

	it("rejects a target outside fcd's declared target/representationFormat registry", () => {
		const validate = validator(buildAjv());
		const bad = { ...knownGoodBlock, targets: ["cobol"] };
		expect(validate(bad)).toBe(false);
	});

	it("rejects a package identity that does not match fcd's packageIdentity pattern", () => {
		const validate = validator(buildAjv());
		const bad = { ...knownGoodBlock, package: "not-a-valid-identity" };
		expect(validate(bad)).toBe(false);
	});

	it.each([
		"compatibility_posture",
		"legacy_forms",
		"sweep_report",
	] as const)("rejects a block carrying quoin's install-policy key %s", (key) => {
		const validate = validator(buildAjv());
		const bad = { ...knownGoodBlock, [key]: "strict" };
		expect(validate(bad)).toBe(false);
	});

	it("resolves targets by $ref to fcd's own target/representationFormat $defs, never an inlined enum", () => {
		const schema = JSON.parse(
			readFileSync(resolve(schemaRoot, schemaFile), "utf8"),
		);
		expect(schema.properties.targets.items).toEqual({
			$ref: "common.schema.json#/$defs/manifestTarget",
		});
		expect(JSON.stringify(schema.properties.targets)).not.toMatch(/"enum"/);
	});
});
