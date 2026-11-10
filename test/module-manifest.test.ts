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

/**
 * Refuses `extra` with a schema error of `keyword` at `path`. Naming the
 * location means a refusal by the closed root alone (an undeclared key) does
 * not satisfy a test about a nested member.
 */
function rejects(
	extra: Record<string, unknown>,
	path: string,
	keyword: string,
): void {
	const validate = validator(buildAjv());
	expect(validate({ ...base, ...extra })).toBe(false);
	const found = (validate.errors ?? []).map(
		(e) => `${e.instancePath || "/"} ${e.keyword}`,
	);
	expect(found, `${path} ${keyword}`).toContain(`${path} ${keyword}`);
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

const DS = "/artifact_types/0/data_schema";

describe("artifact type data_schema", () => {
	/// Trace: FR-149-AC-1
	it("accepts an inline schema and a module-relative reference", () => {
		accepts(
			artifact({ type: "object", properties: { a: { type: "string" } } }),
		);
		accepts(artifact({ schema: "schemas/a.data.json" }));
	});

	/// Trace: FR-149-AC-1
	it("rejects an ambiguous reference, an unsafe path and a non-object", () => {
		rejects(
			artifact({ schema: "schemas/a.json", type: "object" }),
			DS,
			"oneOf",
		);
		rejects(artifact({ schema: "schemas/a.json", digest: "x" }), DS, "oneOf");
		rejects(artifact({ digest: "x" }), DS, "oneOf");
		rejects(artifact({ schema: "/abs/a.json" }), `${DS}/schema`, "pattern");
		rejects(artifact({ schema: "../a.json" }), `${DS}/schema`, "pattern");
		rejects(artifact({ schema: "a.yaml" }), `${DS}/schema`, "pattern");
		rejects(artifact({ schema: "" }), `${DS}/schema`, "minLength");
		rejects(artifact("schemas/a.json"), DS, "type");
	});
});

describe("vocabulary registries", () => {
	const term = { definition: "d", category: "c" };

	/// Trace: FR-149-AC-2
	it("types lexicon, observable_verbs and vacuous_predicates terms", () => {
		for (const key of ["lexicon", "observable_verbs", "vacuous_predicates"]) {
			accepts({ [key]: { token: term, bare: { definition: "d" } } });
			rejects({ [key]: { token: {} } }, `/${key}/token`, "required");
			rejects(
				{ [key]: { token: { definition: 1 } } },
				`/${key}/token/definition`,
				"type",
			);
			rejects(
				{ [key]: { token: { definition: "d", category: 1 } } },
				`/${key}/token/category`,
				"type",
			);
			rejects({ [key]: [term] }, `/${key}`, "type");
		}
	});

	/// Trace: FR-149-AC-2
	it("refuses an undeclared member on an ambiguity term only", () => {
		accepts({ ambiguity_terms: { fast: term } });
		rejects(
			{ ambiguity_terms: { fast: { definition: "d", extra: 1 } } },
			"/ambiguity_terms/fast",
			"additionalProperties",
		);
		rejects(
			{ ambiguity_terms: { fast: { category: "c" } } },
			"/ambiguity_terms/fast",
			"required",
		);
		accepts({ lexicon: { fast: { definition: "d", extra: 1 } } });
	});

	/// Trace: FR-149-AC-2
	it("types a property idiom's shape against the closed shape set", () => {
		accepts({
			property_idioms: { lossless: { definition: "d", shape: "round-trip" } },
		});
		rejects(
			{
				property_idioms: { lossless: { definition: "d", shape: "roundtrip" } },
			},
			"/property_idioms/lossless/shape",
			"enum",
		);
		rejects(
			{ property_idioms: { lossless: { definition: "d" } } },
			"/property_idioms/lossless",
			"required",
		);
	});
});

describe("grammar_severity", () => {
	/// Trace: FR-149-AC-3
	it("accepts <grammar>:<check> keys with an off|warning|error level", () => {
		accepts({
			grammar_severity: { "ac:vacuous-outcome": "error", "ears:x": "off" },
		});
	});

	/// Trace: FR-149-AC-3
	it("rejects a malformed key or an unknown level", () => {
		for (const key of ["acvacuous", "a:b:c", ":check", "ac: x"]) {
			rejects(
				{ grammar_severity: { [key]: "error" } },
				"/grammar_severity",
				"pattern",
			);
		}
		rejects(
			{ grammar_severity: { "ac:x": "fatal" } },
			"/grammar_severity/ac:x",
			"enum",
		);
		rejects(
			{ grammar_severity: { "ac:x": 1 } },
			"/grammar_severity/ac:x",
			"enum",
		);
	});
});

describe("verification_catalog", () => {
	const method = { name: "Unit", class: "Test", definition: "d" };
	const at = "/verification_catalog/unit";

	/// Trace: FR-149-AC-4
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

	/// Trace: FR-149-AC-4
	it("rejects missing, blank or undeclared members and wrong shapes", () => {
		const cases: [Record<string, unknown>, string, string][] = [
			[{ name: "Unit", class: "Test" }, at, "required"],
			[{ ...method, class: "  " }, `${at}/class`, "pattern"],
			[{ ...method, name: "" }, `${at}/name`, "pattern"],
			[{ ...method, extra: 1 }, at, "additionalProperties"],
			[
				{ ...method, applicability: { r: "example" } },
				`${at}/applicability/r`,
				"type",
			],
			[{ ...method, tooling: "pytest" }, `${at}/tooling`, "type"],
		];
		for (const [entry, path, keyword] of cases) {
			rejects({ verification_catalog: { unit: entry } }, path, keyword);
		}
	});
});

const T = "/traceability";
const target = {
	name: "t",
	archetype: "TestMatrix",
	section: "Test Case Summary",
	id_column: "Test ID",
};
const trace = (model: Record<string, unknown>) => ({ traceability: model });

describe("traceability", () => {
	/// Trace: FR-149-AC-5
	it("accepts the full declared model", () => {
		accepts(
			trace({
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
						from: "table_row",
					},
					{
						name: "li",
						archetype: "FR",
						section: "S",
						from: "list_item",
						pattern: "^(\\w+)",
					},
					{
						name: "hd",
						archetype: "FR",
						section: "S",
						from: "heading",
						pattern: "^(\\w+)",
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
					implements: [
						{ name: "i", language: "python", pattern: "(.*)" },
						{
							name: "ir",
							language: "rust",
							pattern: "(.*)",
							syntax: "rust_attribute",
						},
					],
				},
				vocabularies: {
					test_type: ["Unit"],
					test_type_column: "Type",
					no_source_symbol: ["Unit"],
					retired: ["Retired"],
				},
				obligations: [
					{
						name: "o1",
						target: "t",
						statement_column: "Criteria",
						method_column: "Verification",
					},
					{
						name: "o1b",
						target: "t",
						statement_column: "C",
						section: "S",
						id_format: "{row}",
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
			}),
		);
	});

	/// Trace: FR-149-AC-5
	it("refuses an undeclared model member and malformed sections", () => {
		rejects(trace({ surprise: [] }), T, "additionalProperties");
		rejects(
			trace({
				trace_tags: {
					legacy: [{ name: "l", pattern: "Trace: (.*)", rewrite_to: "m" }],
				},
			}),
			`${T}/trace_tags`,
			"additionalProperties",
		);
		rejects(
			trace({ trace_targets: [{ ...target, section: [] }] }),
			`${T}/trace_targets/0/section`,
			"oneOf",
		);
		rejects(
			trace({ trace_targets: [{ ...target, extra: 1 }] }),
			`${T}/trace_targets/0`,
			"additionalProperties",
		);
		rejects(
			trace({ trace_targets: [{ ...target, evidence: "both" }] }),
			`${T}/trace_targets/0/evidence`,
			"enum",
		);
	});

	/// Trace: FR-149-AC-5
	it("ties a trace target's id_column and pattern to its `from`", () => {
		const one = (t: Record<string, unknown>) =>
			rejects(trace({ trace_targets: [t] }), `${T}/trace_targets/0`, "oneOf");
		const { id_column: _, ...noId } = target;
		one(noId);
		one({ ...target, pattern: "(x)" });
		one({ ...noId, from: "list_item" });
		one({ ...noId, from: "heading", pattern: "(x)", id_column: "ID" });
		one({ ...target, from: "list_item", pattern: "(x)" });
		rejects(
			trace({ trace_targets: [{ ...target, from: "cell" }] }),
			`${T}/trace_targets/0/from`,
			"enum",
		);
	});

	/// Trace: FR-149-AC-5
	it("accepts syntax only on an implements form for Rust", () => {
		const form = {
			name: "i",
			language: "rust",
			pattern: "(x)",
			syntax: "rust_attribute",
		};
		rejects(
			trace({ trace_tags: { markers: [form] } }),
			`${T}/trace_tags/markers/0`,
			"additionalProperties",
		);
		rejects(
			trace({ trace_tags: { implements: [{ ...form, language: "python" }] } }),
			`${T}/trace_tags/implements/0`,
			"not",
		);
		rejects(
			trace({ trace_tags: { implements: [{ ...form, syntax: "decorator" }] } }),
			`${T}/trace_tags/implements/0/syntax`,
			"enum",
		);
	});

	/// Trace: FR-149-AC-5
	it("types the retired column vocabulary", () => {
		rejects(
			trace({ vocabularies: { retired: "Retired" } }),
			`${T}/vocabularies/retired`,
			"type",
		);
		rejects(
			trace({ vocabularies: { retired: [1] } }),
			`${T}/vocabularies/retired/0`,
			"type",
		);
	});

	/// Trace: FR-149-AC-5
	it("refuses an obligation that names both or neither of target and archetype", () => {
		const o = { name: "o", statement_column: "S" };
		const at = `${T}/obligations/0`;
		rejects(trace({ obligations: [o] }), at, "oneOf");
		rejects(
			trace({
				obligations: [
					{
						...o,
						target: "t",
						archetype: "FR",
						section: "S",
						id_format: "{row}",
					},
				],
			}),
			at,
			"oneOf",
		);
		rejects(trace({ obligations: [{ ...o, archetype: "FR" }] }), at, "oneOf");
		rejects(
			trace({ obligations: [{ ...o, archetype: "FR", section: "S" }] }),
			at,
			"oneOf",
		);
	});

	/// Trace: FR-149-AC-5
	it("refuses combinatorial strength below one", () => {
		const combinatorial = {
			dimension_column: "D",
			values_column: "V",
			strength: 0,
		};
		rejects(
			trace({
				obligations: [
					{ name: "o", target: "t", statement_column: "S", combinatorial },
				],
			}),
			`${T}/obligations/0/combinatorial/strength`,
			"minimum",
		);
		rejects(
			trace({
				obligations: [
					{
						name: "o",
						target: "t",
						statement_column: "S",
						combinatorial: { dimension_column: "D", values_column: "V" },
					},
				],
			}),
			`${T}/obligations/0/combinatorial`,
			"required",
		);
	});

	/// Trace: FR-149-AC-5
	it("refuses malformed relations, references, markers, status and coverage", () => {
		const rel = {
			name: "r",
			from: "a",
			edges: ["e"],
			direction: "incoming",
			check: "c",
		};
		const at = `${T}/required_relations/0`;
		rejects(
			trace({ required_relations: [{ ...rel, edges: [] }] }),
			`${at}/edges`,
			"minItems",
		);
		rejects(
			trace({ required_relations: [{ ...rel, direction: "up" }] }),
			`${at}/direction`,
			"enum",
		);
		rejects(
			trace({ required_relations: [{ ...rel, check: "a:b" }] }),
			`${at}/check`,
			"pattern",
		);
		rejects(
			trace({
				document_references: [
					{
						name: "r",
						archetype: "FR",
						section: "S",
						column: "c",
						pattern: "(x)",
					},
				],
			}),
			`${T}/document_references/0`,
			"required",
		);
		rejects(
			trace({
				trace_tags: { markers: [{ name: "m", language: "go", pattern: "x" }] },
			}),
			`${T}/trace_tags/markers/0/language`,
			"enum",
		);
		rejects(trace({ status: { complete: ["x"] } }), `${T}/status`, "required");
		rejects(
			trace({ vocabulary_coverage: [{ name: "v", from: "NFR", field: "f" }] }),
			`${T}/vocabulary_coverage/0`,
			"required",
		);
	});
});

describe("locator assert members", () => {
	const ASSERT =
		"/artifact_types/0/body_extraction/yield_pattern/match/f/assert";
	function withAssert(
		assert: Record<string, unknown>,
	): Record<string, unknown> {
		return {
			artifact_types: [
				{
					name: "A",
					grammar_ref: "g",
					frontmatter_schema_ref: "schemas/a.json",
					body_extraction: {
						yield_pattern: {
							match: { f: { from: "table_row", assert } },
						},
					},
				},
			],
		};
	}

	/// Trace: FR-149-AC-6
	it.each([
		["optional_columns", ["Priority"], "Priority", "type"],
		["max_rows", 5, "5", "type"],
		["matches", "^FR-[0-9]+$", 7, "type"],
		["choices", ["a", "b"], "a", "type"],
		["column_choices", { Status: ["open"] }, { Status: "open" }, "type"],
		["column_patterns", { Id: "^[A-Z]+$" }, { Id: 1 }, "type"],
		["from_vocabulary", "status", "", "minLength"],
		["column_vocabularies", { Status: "status" }, { Status: 1 }, "type"],
	])("accepts and refuses %s", (member, good, bad, keyword) => {
		accepts(withAssert({ [member]: good }));
		const at =
			member === "from_vocabulary" ||
			member === "matches" ||
			member === "max_rows" ||
			member === "optional_columns" ||
			member === "choices"
				? `${ASSERT}/${member}`
				: `${ASSERT}/${member}/${Object.keys(good as object)[0]}`;
		rejects(withAssert({ [member]: bad }), at, keyword as string);
	});
});

describe("edge type composite and symmetric", () => {
	const edge = { description: "d", category: "structural" };

	/// Trace: FR-149-AC-7
	it("accepts boolean composite and symmetric and refuses other types", () => {
		accepts({
			edge_types: {
				contains: { ...edge, composite: true },
				peer: { ...edge, symmetric: true },
			},
		});
		rejects(
			{ edge_types: { contains: { ...edge, composite: "yes" } } },
			"/edge_types/contains/composite",
			"type",
		);
		rejects(
			{ edge_types: { peer: { ...edge, symmetric: 1 } } },
			"/edge_types/peer/symmetric",
			"type",
		);
	});
});

describe("lint_rules", () => {
	/// Trace: FR-149-AC-8
	it("accepts each type-tagged rule with a string pattern", () => {
		accepts({
			lint_rules: [
				{
					type: "table_column_values",
					id: "r1",
					section: "Verification",
					column: "Method",
					allowed: ["Test"],
					annotation_pattern: "^\\(.*\\)$",
					archetypes: ["FR"],
					severity: "warning",
				},
				{
					type: "section_body_pattern",
					id: "r2",
					section: "Behavior",
					pattern: "SHALL",
					message: "m",
				},
				{
					type: "forbidden_section",
					id: "r3",
					section: "Acceptance Criteria",
					severity: "error",
				},
			],
		});
	});

	/// Trace: FR-149-AC-8
	it("refuses an untagged rule, a missing variant member and an object pattern", () => {
		rejects(
			{ lint_rules: [{ id: "r", section: "S", pattern: "x" }] },
			"/lint_rules/0",
			"required",
		);
		rejects(
			{ lint_rules: [{ type: "bogus", id: "r", section: "S" }] },
			"/lint_rules/0/type",
			"enum",
		);
		rejects(
			{
				lint_rules: [
					{
						type: "section_body_pattern",
						id: "r",
						section: "S",
						pattern: { kind: "regex" },
					},
				],
			},
			"/lint_rules/0/pattern",
			"type",
		);
		rejects(
			{
				lint_rules: [
					{ type: "table_column_values", id: "r", section: "S", column: "C" },
				],
			},
			"/lint_rules/0",
			"required",
		);
		rejects(
			{
				lint_rules: [
					{
						type: "table_column_values",
						id: "r",
						section: "S",
						allowed: ["a"],
					},
				],
			},
			"/lint_rules/0",
			"required",
		);
		rejects(
			{ lint_rules: [{ type: "section_body_pattern", id: "r", section: "S" }] },
			"/lint_rules/0",
			"required",
		);
		for (const type of ["forbidden_section", "table_column_values"]) {
			rejects(
				{
					lint_rules: [
						{
							type,
							id: "r",
							section: "S",
							column: "C",
							allowed: ["a"],
							pattern: { kind: "regex" },
						},
					],
				},
				"/lint_rules/0/pattern",
				"type",
			);
		}
	});
});

describe("plain_language_profiles and clause_sets", () => {
	const profile = {
		version: "1",
		sentence_word_limit: 25,
		max_heading_level_step: 1,
	};

	/// Trace: FR-149-AC-9
	it("accepts a profile and a clause-set path list", () => {
		accepts({
			plain_language_profiles: {
				std: {
					...profile,
					document_types: ["FR"],
					known_acronyms: { API: "Application Programming Interface" },
					ignored_uppercase_terms: ["SHALL"],
				},
			},
			clause_sets: ["clauses/widget.json"],
		});
	});

	/// Trace: FR-149-AC-9
	it("refuses an undeclared profile member, a zero limit and a non-list clause_sets", () => {
		rejects(
			{ plain_language_profiles: { std: { ...profile, extra: 1 } } },
			"/plain_language_profiles/std",
			"additionalProperties",
		);
		rejects(
			{
				plain_language_profiles: {
					std: { ...profile, sentence_word_limit: 0 },
				},
			},
			"/plain_language_profiles/std/sentence_word_limit",
			"minimum",
		);
		rejects({ clause_sets: "clauses/widget.json" }, "/clause_sets", "type");
	});
});

describe("semantic.import_types (PLAT-212)", () => {
	const semantic = (extra: Record<string, unknown>) => ({
		semantic: {
			contract_version: "1.0.0",
			package: "agent-ix/m",
			imports: { "agent-ix/core": "1.0.0" },
			...extra,
		},
	});

	it("accepts an optional import_types sibling of imports", () => {
		accepts(semantic({ import_types: { "agent-ix/core": ["Entity"] } }));
		accepts(semantic({}));
	});

	it.each([
		["a non-array value", { "agent-ix/core": "Entity" }, "type"],
		["an empty list", { "agent-ix/core": [] }, "minItems"],
		["a duplicate type name", { "agent-ix/core": ["E", "E"] }, "uniqueItems"],
		["an empty type name", { "agent-ix/core": [""] }, "minLength"],
		["a non-string entry", { "agent-ix/core": [1] }, "type"],
	])("refuses import_types holding %s", (_label, value, keyword) => {
		const validate = validator(buildAjv());
		expect(validate({ ...base, ...semantic({ import_types: value }) })).toBe(
			false,
		);
		const found = (validate.errors ?? []).map((e) => e.keyword);
		expect(found).toContain(keyword);
	});
});
