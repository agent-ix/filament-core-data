import { readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import type { ValidateFunction } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { describe, expect, it } from "vitest";

/**
 * PLAT de-vendoring program: `module-manifest.schema.json` moved here from
 * agent-ix/filament-core-service (FR-035). fcd is the contract repo that
 * depends on nothing, so it owns the schema; fcs consumes it as a published
 * contract like any other consumer, through `@agent-ix/semantic-schema`
 * (JS/TS) or the `agent-ix-semantic-schema` crate (Rust).
 *
 * The schema's content is unchanged by the move other than `$id` (rewritten
 * to this contract's `schemaBase`, matching every other file in this
 * directory). Its `semantic` property still declares its own inline shape
 * rather than $ref-ing `module-semantic-block.schema.json`, which overlaps it
 * — unifying the two is a separate, deliberate change this move does not make.
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const schemaRoot = resolve(root, "schema/semantic/v1");
const fixtureRoot = resolve(root, "fixtures/semantic/v1");
const schemaBase = "https://schemas.agent-ix.org/filament-core-data/v1/";
const schemaFile = "module-manifest.schema.json";

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

const knownGoodManifest = JSON.parse(
	readFileSync(resolve(fixtureRoot, "positive/module-manifest.json"), "utf8"),
) as Record<string, unknown>;

describe("module-manifest.schema.json (moved from filament-core-service)", () => {
	it("compiles the schema and validates a known-good manifest", () => {
		const validate = validator(buildAjv());
		const valid = validate(knownGoodManifest);
		expect(validate.errors, JSON.stringify(validate.errors)).toBeNull();
		expect(valid).toBe(true);
	});

	it("rejects a manifest missing a required top-level field", () => {
		const validate = validator(buildAjv());
		const { version: _omitted, ...bad } = knownGoodManifest;
		expect(validate(bad)).toBe(false);
	});

	it("rejects an unknown top-level key (additionalProperties: false)", () => {
		const validate = validator(buildAjv());
		const bad = { ...knownGoodManifest, unknown_extra_key: "x" };
		expect(validate(bad)).toBe(false);
	});

	it("rejects a semantic block missing its required package identity", () => {
		const validate = validator(buildAjv());
		const semantic = knownGoodManifest.semantic as Record<string, unknown>;
		const { package: _pkg, ...restSemantic } = semantic;
		const bad = { ...knownGoodManifest, semantic: restSemantic };
		expect(validate(bad)).toBe(false);
	});

	it("carries its own $id under this contract's schemaBase, not fcs's former domain", () => {
		const document = JSON.parse(
			readFileSync(resolve(schemaRoot, schemaFile), "utf8"),
		) as Record<string, unknown>;
		expect(document.$id).toBe(`${schemaBase}${schemaFile}`);
		expect(document.$schema).toBe(
			"https://json-schema.org/draft/2020-12/schema",
		);
	});
});
