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

/**
 * FR-149: `data_schema` reference form on artifact types, and the registry
 * and traceability keys the live semantic modules declare.
 */
const base = { manifest_version: "1.0.0", name: "m", version: "1.0.0" };

function accepts(extra: Record<string, unknown>): void {
	const validate = validator(buildAjv());
	const ok = validate({ ...base, ...extra });
	expect(validate.errors, JSON.stringify(validate.errors)).toBeNull();
	expect(ok).toBe(true);
}

function rejects(extra: Record<string, unknown>): void {
	expect(validator(buildAjv())({ ...base, ...extra })).toBe(false);
}

function artifact(data_schema: unknown): Record<string, unknown> {
	return {
		artifact_types: [
			{
				name: "A",
				grammar_ref: "g",
				frontmatter_schema_ref: "schemas/a.json",
				data_schema,
			},
		],
	};
}

describe("artifact type data_schema", () => {
	/** Traces: TC-1898; FR-149-AC-1. */
	it("accepts an inline schema and a module-relative reference", () => {
		accepts(
			artifact({ type: "object", properties: { a: { type: "string" } } }),
		);
		accepts(artifact({ schema: "schemas/a.data.json" }));
	});

	/** Traces: TC-1898; FR-149-AC-1. */
	it("rejects an ambiguous reference, an unsafe path and a non-object", () => {
		rejects(artifact({ schema: "schemas/a.json", type: "object" }));
		rejects(artifact({ schema: "schemas/a.json", digest: "x" }));
		rejects(artifact({ digest: "x" }));
		rejects(artifact({ schema: "/abs/a.json" }));
		rejects(artifact({ schema: "../a.json" }));
		rejects(artifact({ schema: "a.yaml" }));
		rejects(artifact({ schema: "" }));
		rejects(artifact("schemas/a.json"));
	});
});

describe("vocabulary registries", () => {
	const term = { definition: "d", category: "c" };

	/** Traces: TC-1899; FR-149-AC-2. */
	it("accepts lexicon, observable_verbs and vacuous_predicates terms", () => {
		for (const key of ["lexicon", "observable_verbs", "vacuous_predicates"]) {
			accepts({ [key]: { token: term, bare: { definition: "d" } } });
			rejects({ [key]: { token: {} } });
			rejects({ [key]: { token: { definition: 1 } } });
			rejects({ [key]: { token: { definition: "d", category: 1 } } });
			rejects({ [key]: [term] });
		}
	});

	/** Traces: TC-1899; FR-149-AC-2. */
	it("rejects an undeclared member on an ambiguity term only", () => {
		accepts({ ambiguity_terms: { fast: term } });
		rejects({ ambiguity_terms: { fast: { definition: "d", extra: 1 } } });
		rejects({ ambiguity_terms: { fast: { category: "c" } } });
		accepts({ lexicon: { fast: { definition: "d", extra: 1 } } });
	});

	/** Traces: TC-1899; FR-149-AC-2. */
	it("types a property idiom's shape against the closed shape set", () => {
		accepts({
			property_idioms: { lossless: { definition: "d", shape: "round-trip" } },
		});
		rejects({
			property_idioms: { lossless: { definition: "d", shape: "roundtrip" } },
		});
		rejects({ property_idioms: { lossless: { definition: "d" } } });
	});
});

describe("grammar_severity", () => {
	/** Traces: TC-1900; FR-149-AC-3. */
	it("accepts <grammar>:<check> keys with an off|warning|error level", () => {
		accepts({
			grammar_severity: { "ac:vacuous-outcome": "error", "ears:x": "off" },
		});
	});

	/** Traces: TC-1900; FR-149-AC-3. */
	it("rejects a malformed key or an unknown level", () => {
		rejects({ grammar_severity: { acvacuous: "error" } });
		rejects({ grammar_severity: { "a:b:c": "error" } });
		rejects({ grammar_severity: { ":check": "error" } });
		rejects({ grammar_severity: { "ac: x": "error" } });
		rejects({ grammar_severity: { "ac:x": "fatal" } });
		rejects({ grammar_severity: { "ac:x": 1 } });
	});
});

describe("verification_catalog", () => {
	const method = { name: "Unit", class: "Test", definition: "d" };

	/** Traces: TC-1901; FR-149-AC-4. */
	it("accepts a full entry", () => {
		accepts({
			verification_catalog: {
				unit: {
					...method,
					evidence_kind: "Unit",
					cost: "first-line",
					applicability: { property_shapes: ["example"] },
					tooling: ["pytest"],
				},
			},
		});
	});

	/** Traces: TC-1901; FR-149-AC-4. */
	it("rejects missing, blank or undeclared members and wrong shapes", () => {
		for (const bad of [
			{ name: "Unit", class: "Test" },
			{ ...method, class: "  " },
			{ ...method, name: "" },
			{ ...method, extra: 1 },
			{ ...method, applicability: { r: "example" } },
			{ ...method, tooling: "pytest" },
		]) {
			rejects({ verification_catalog: { unit: bad } });
		}
	});
});

describe("traceability", () => {
	const target = {
		name: "t",
		archetype: "TestMatrix",
		section: "Test Case Summary",
		id_column: "Test ID",
	};

	/** Traces: TC-1902; FR-149-AC-5. */
	it("accepts the full declared model", () => {
		accepts({
			traceability: {
				exclude: ["tests/**"],
				source_exclude: ["fixtures/**"],
				trace_targets: [
					target,
					{
						...target,
						name: "u",
						section: ["A", "*B*"],
						required: false,
						evidence: "reference-only",
						exclude: ["x"],
					},
				],
				document_references: [
					{
						name: "r",
						archetype: "FR",
						section: "Acceptance Criteria",
						column: "Verification",
						row_id_column: "ID",
						status_column: "Status",
						pattern: "\\b(TC-\\d+)\\b",
						targets: ["t"],
						expand_ranges: true,
						strip_annotations: false,
					},
				],
				status: {
					column: "Status",
					complete: ["x"],
					pending: [],
					failed: [],
					retired: [],
				},
				trace_tags: {
					markers: [
						{
							name: "m",
							language: "rust",
							pattern: "#\\[trace\\((.*)\\)\\]",
							template: "#[trace({ids})]",
						},
					],
					legacy: [
						{
							name: "l",
							language: "ts",
							pattern: "Trace: (.*)",
							rewrite_to: "m",
							id_format: "x",
						},
					],
					implements: [{ name: "i", language: "python", pattern: "(.*)" }],
				},
				vocabularies: {
					test_type: ["Unit"],
					test_type_column: "Type",
					no_source_symbol: ["Unit"],
				},
				obligations: [
					{
						name: "o1",
						target: "t",
						statement_column: "Criteria",
						method_column: "Verification",
					},
					{
						name: "o2",
						archetype: "NFR",
						section: "Measurement",
						id_format: "{document}-M-{row}",
						statement_column: "Metric",
						criticality_column: "C",
						parameters: { target: "Target" },
						combinatorial: {
							dimension_column: "D",
							values_column: "V",
							excludes_column: "E",
							strength: 2,
						},
					},
				],
				required_relations: [
					{
						name: "rr",
						from: "threat",
						edges: ["mitigates"],
						to: [],
						direction: "incoming",
						check: "uncontrolled-threat",
					},
				],
				acyclic_edges: ["arises_from"],
				vocabulary_coverage: [
					{
						name: "v",
						from: "NFR",
						field: "quality_attribute",
						check: "unowned",
						justified_absence_field: "na",
						exclude: ["x"],
					},
				],
			},
		});
	});

	/** Traces: TC-1902; FR-149-AC-5. */
	it("rejects an undeclared model member and malformed sections", () => {
		rejects({ traceability: { surprise: [] } });
		rejects({ traceability: { trace_targets: [{ ...target, section: [] }] } });
		rejects({ traceability: { trace_targets: [{ ...target, extra: 1 }] } });
		rejects({
			traceability: { trace_targets: [{ ...target, evidence: "both" }] },
		});
		const { id_column: _, ...noId } = target;
		rejects({ traceability: { trace_targets: [noId] } });
	});

	/** Traces: TC-1902; FR-149-AC-5. */
	it("rejects an obligation that names both or neither of target and archetype", () => {
		const o = { name: "o", statement_column: "S" };
		rejects({ traceability: { obligations: [o] } });
		rejects({
			traceability: {
				obligations: [
					{
						...o,
						target: "t",
						archetype: "FR",
						section: "S",
						id_format: "{row}",
					},
				],
			},
		});
		rejects({ traceability: { obligations: [{ ...o, archetype: "FR" }] } });
		rejects({
			traceability: { obligations: [{ ...o, archetype: "FR", section: "S" }] },
		});
	});

	/** Traces: TC-1902; FR-149-AC-5. */
	it("rejects malformed relations, references, markers and coverage", () => {
		const rel = {
			name: "r",
			from: "a",
			edges: ["e"],
			direction: "incoming",
			check: "c",
		};
		rejects({ traceability: { required_relations: [{ ...rel, edges: [] }] } });
		rejects({
			traceability: { required_relations: [{ ...rel, direction: "up" }] },
		});
		rejects({
			traceability: { required_relations: [{ ...rel, check: "a:b" }] },
		});
		rejects({
			traceability: {
				document_references: [
					{
						name: "r",
						archetype: "FR",
						section: "S",
						column: "c",
						pattern: "(x)",
					},
				],
			},
		});
		rejects({
			traceability: {
				trace_tags: { markers: [{ name: "m", language: "go", pattern: "x" }] },
			},
		});
		rejects({ traceability: { status: { complete: ["x"] } } });
		rejects({
			traceability: {
				vocabulary_coverage: [{ name: "v", from: "NFR", field: "f" }],
			},
		});
		rejects({
			traceability: {
				obligations: [
					{
						name: "o",
						target: "t",
						statement_column: "S",
						combinatorial: { dimension_column: "D", values_column: "V" },
					},
				],
			},
		});
	});
});
