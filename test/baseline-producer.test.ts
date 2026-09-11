import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const schema = JSON.parse(
	readFileSync(
		resolve(root, "schema/baseline/v1/producer-bundle.schema.json"),
		"utf8",
	),
);
const fixture = JSON.parse(
	readFileSync(
		resolve(root, "fixtures/baseline-1-2/relationship-population-a.json"),
		"utf8",
	),
);

function validates(value: unknown): boolean {
	const ajv = new Ajv2020({ allErrors: true, strict: true });
	return ajv.compile(schema)(value);
}

describe("Baseline 1.2 producer schema", () => {
	/** Tracing: TC-1373, TC-1375, TC-1376, TC-1378, TC-1379 */
	it("accepts fixture A's exact relationship, population, closure, and correspondence shape", () => {
		expect(validates(fixture)).toBe(true);
	});

	/** Tracing: TC-1375 */
	it("rejects a field-only relationship invention", () => {
		const invalid = structuredClone(fixture);
		invalid.relationships[0].fieldIdentity =
			"ix://agent-ix/commerce/field/Order-shipment-id";
		expect(validates(invalid)).toBe(false);
	});

	/** Tracing: TC-1379 */
	it("rejects an undeclared producer member", () => {
		const invalid = structuredClone(fixture);
		invalid.unapprovedAmbientConfiguration = "current-directory";
		expect(validates(invalid)).toBe(false);
	});
});
