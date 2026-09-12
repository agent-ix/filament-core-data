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
const staticSchema = JSON.parse(
	readFileSync(
		resolve(root, "schema/baseline/v1/static-bundle.schema.json"),
		"utf8",
	),
);
const staticBundle = JSON.parse(
	readFileSync(resolve(root, "fixtures/baseline-1-2/static-bundle-a.json"), "utf8"),
);

/** The adverse fixtures whose one-axis mutation is a shape violation. */
const shapeViolations = [
	"adverse/01-missing-identities.json",
	"adverse/02-digest-domain-substituted.json",
	"adverse/03-revision-namespace-substituted.json",
	"adverse/05-endpoint-role-multiplicity-lost.json",
	"adverse/06-component-provenance-absent.json",
];

/** The adverse fixtures whose one-axis mutation is an agreement between members. */
const crossMemberViolations = [
	"adverse/04-export-foreign-cross-bound.json",
	"adverse/07-stale-correspondence-selection.json",
	"adverse/08-inventory-incomplete.json",
];

function adverse(name: string): unknown {
	return JSON.parse(
		readFileSync(resolve(root, "fixtures/baseline-1-2", name), "utf8"),
	);
}

function validates(value: unknown): boolean {
	const ajv = new Ajv2020({ allErrors: true, strict: true });
	return ajv.compile(schema)(value);
}

function validatesStatic(value: unknown): boolean {
	const ajv = new Ajv2020({ allErrors: true, strict: true });
	return ajv.compile(staticSchema)(value);
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

describe("Baseline 1.2 static producer bundle schema", () => {
	/** Tracing: TC-1431 */
	it("accepts the admitted static bundle fixture", () => {
		expect(validatesStatic(staticBundle)).toBe(true);
	});

	/** Tracing: TC-1433 */
	it("rejects every shape-violating adverse fixture", () => {
		for (const name of shapeViolations) {
			expect(validatesStatic(adverse(name)), name).toBe(false);
		}
	});

	/**
	 * The three remaining axes are agreements between members — a foreign export
	 * mapping, a stale correspondence selection, an unlisted inventory member —
	 * which no shape schema decides; the admission entry point refuses them.
	 *
	 * Tracing: TC-1431
	 */
	it("admits the cross-member adverse fixtures by shape", () => {
		for (const name of crossMemberViolations) {
			expect(validatesStatic(adverse(name)), name).toBe(true);
		}
	});

	/** Tracing: TC-1434 */
	it("rejects an assessment member offered inside a static bundle", () => {
		for (const member of [
			"population",
			"observationRecords",
			"window",
			"availability",
			"snapshot",
		]) {
			const invalid = structuredClone(staticBundle);
			invalid[member] = { offered: "by an assessment producer" };
			expect(validatesStatic(invalid), member).toBe(false);
		}
	});

	/** Tracing: TC-1433 */
	it("rejects an undeclared producer member on the static bundle", () => {
		const invalid = structuredClone(staticBundle);
		invalid.unapprovedAmbientConfiguration = "current-directory";
		expect(validatesStatic(invalid)).toBe(false);
	});
});
