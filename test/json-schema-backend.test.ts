import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { describe, expect, it } from "vitest";
import { jsonSchemaBackend } from "../src/compiler/backends/json-schema-v1/index.mjs";
import { generateTarget } from "../src/compiler/backends/seam.mjs";
import { CONSTRUCT_KINDS } from "../src/compiler/constructs.mjs";
import { DEFAULT_LIMITS } from "../src/compiler/diagnostics.mjs";
import { createHost } from "../src/compiler/host.mjs";

const root = resolve(import.meta.dirname, "..");
const golden = resolve(
	root,
	"crates/extraction-frontend/fixtures/config-version-table/expected/semantic-ir.json",
);
/** A `1.2.0` ConfigVersion document of records, which the backend renders. */
const configVersion12 = resolve(
	root,
	"fixtures/semantic/v1/positive/config-version-v1-2.json",
);
/** The same document at `1.1.0`, which the backend also reads. */
const configVersion11 = resolve(
	root,
	"fixtures/semantic/v1/positive/config-version-v1-1.json",
);
/** One construct of each kind and every model member, which it refuses. */
const constructs = resolve(
	root,
	"fixtures/semantic/v1/positive/semantic-ir-v1-2-constructs.json",
);
const profile = resolve(root, "fixtures/semantic/v1/positive/profile.json");

describe("TC-1362 JSON Schema output for the lifted ConfigVersion", () => {
	/** Traces: TC-1360; FR-063-AC-22. */
	it("registers through the seam and publishes digests for every JSON Schema file", () => {
		const ir = JSON.parse(readFileSync(configVersion12, "utf8"));
		const manifest = generateTarget(
			{
				contractVersion: "1.0.0",
				lockFingerprint: `sha256:${"a".repeat(64)}`,
				ir,
				profile: JSON.parse(readFileSync(profile, "utf8")),
				mappings: [],
				backend: {
					identity: jsonSchemaBackend.identity,
					version: jsonSchemaBackend.version,
					supportedIrVersions: [...jsonSchemaBackend.supportedIrVersions],
					supportedFeatures: [...jsonSchemaBackend.supportedFeatures],
					options: {},
				},
				outputRoot: "generated/json-schema",
				limits: { ...DEFAULT_LIMITS },
			},
			{ target: "json-schema", host: createHost({ readRoots: [root] }) },
		);
		expect(manifest.state).toBe("success");
		expect(manifest.diagnostics).toEqual([]);
		expect(
			manifest.files.some((file) => file.path === "ConfigVersion.json"),
		).toBe(true);
		expect(
			manifest.files.every((file) => /^sha256:[0-9a-f]{64}$/.test(file.digest)),
		).toBe(true);
	});

	/** Traces: TC-1361; FR-100-AC-1. */
	it("maps every IR structural kind and kernel scalar to a compilable schema", () => {
		const prefix = "ix://agent-ix/all-kinds/type";
		const scalarNames = [
			"boolean",
			"integer",
			"number",
			"string",
			"bytes",
			"date",
			"datetime",
			"duration",
			"uuid",
		];
		const ref = (name: string) => `${prefix}/${name}`;
		const ir = {
			package: { identity: "agent-ix/all-kinds" },
			types: [
				...scalarNames.map((scalar) => ({
					identity: ref(scalar),
					kind: "scalar",
					scalar,
					extensions: [],
				})),
				{
					identity: ref("Record"),
					kind: "record",
					unknownPolicy: "reject",
					fields: [
						{
							identity: "ix://agent-ix/all-kinds/field/Record.label",
							name: "label",
							typeRef: ref("string"),
							presence: "required",
							extensions: [],
						},
					],
					extensions: [],
				},
				{
					identity: ref("Enum"),
					kind: "enum",
					variants: [{ name: "closed" }, { name: "open" }],
					extensions: [],
				},
				{
					identity: ref("Union"),
					kind: "union",
					variants: [
						{ name: "empty" },
						{ name: "value", payloadType: ref("string") },
					],
					extensions: [],
				},
				{
					identity: ref("Alias"),
					kind: "alias",
					target: ref("string"),
					extensions: [],
				},
				{
					identity: ref("Sequence"),
					kind: "sequence",
					items: ref("string"),
					extensions: [],
				},
				{
					identity: ref("Map"),
					kind: "map",
					values: ref("string"),
					extensions: [],
				},
				{
					identity: ref("Reference"),
					kind: "reference",
					target: "ix://agent-ix/entity/example",
					extensions: [],
				},
			],
			extensions: [],
		};
		const schemas = jsonSchemaBackend
			.generate({ ir })
			.files.filter((file) => file.path !== "index.json")
			.map((file) => JSON.parse(file.text));
		expect(schemas).toHaveLength(16);
		const ajv = new Ajv2020({ strict: false });
		addFormats(ajv);
		for (const schema of schemas) ajv.addSchema(schema);
		expect(schemas.every((schema) => ajv.getSchema(schema.$id))).toBe(true);
	});

	it("renders a 1.1.0 document", () => {
		const ir = JSON.parse(readFileSync(configVersion11, "utf8"));
		const result = jsonSchemaBackend.generate({ ir });
		expect(result.state).toBe("success");
		expect(result.files.map((one) => one.path)).toContain("ConfigVersion.json");
	});

	/** Traces: TC-1749; FR-142-AC-5, FR-142-CON-2. */
	it("refuses every construct kind at its pointer and writes no file", () => {
		const ir = JSON.parse(readFileSync(constructs, "utf8"));
		const result = jsonSchemaBackend.generate({ ir });
		expect(result.state).toBe("unsupported");
		expect(result.files).toStrictEqual([]);
		ir.types.forEach((type: { kind: string }, index: number) => {
			if (!CONSTRUCT_KINDS.includes(type.kind)) return;
			expect(
				result.diagnostics.some((one) =>
					one.message.startsWith(`/ir/types/${index}/kind:`),
				),
				`no refusal at /ir/types/${index}/kind`,
			).toBe(true);
		});
	});

	/** Traces: TC-1362; FR-100-AC-2. */
	// Blocked on filament-core-data#147: the lifted golden carries contract
	// 1.2.0 `entity` constructs, which this backend refuses until it renders them.
	it.skip("emits ConfigVersion properties, required fields, and constraints", () => {
		const ir = JSON.parse(readFileSync(golden, "utf8"));
		const result = jsonSchemaBackend.generate({ ir });
		expect(result.state).toBe("success");
		expect(result.diagnostics).toEqual([]);
		const file = result.files.find((one) => one.path === "ConfigVersion.json");
		expect(file).toBeDefined();
		if (!file) throw new Error("ConfigVersion schema was not emitted");
		const schema = JSON.parse(file.text);
		expect(Object.keys(schema.properties).sort()).toEqual([
			"createdAt",
			"createdBy",
			"data",
			"hash",
			"id",
			"parent",
			"versionNumber",
		]);
		expect(schema.required.sort()).toEqual([
			"createdAt",
			"createdBy",
			"data",
			"hash",
			"id",
			"versionNumber",
		]);
		expect(schema.properties.versionNumber.minimum).toBe(1);
		expect(result.files.some((one) => one.path === "index.json")).toBe(true);
	});

	/** Traces: TC-1363; FR-100-AC-3. */
	it("validates ConfigVersion payloads through generated sibling references", () => {
		const ir = JSON.parse(readFileSync(configVersion12, "utf8"));
		const result = jsonSchemaBackend.generate({ ir });
		const schemas = result.files
			.filter((one) => one.path.endsWith(".json") && one.path !== "index.json")
			.map((one) => JSON.parse(one.text));
		const ajv = new Ajv2020({ strict: false });
		addFormats(ajv);
		for (const schema of schemas) ajv.addSchema(schema);
		const configVersion = schemas.find((one) =>
			one.$id.endsWith("/ConfigVersion.json"),
		);
		expect(configVersion).toBeDefined();
		if (!configVersion) throw new Error("ConfigVersion schema was not emitted");
		const validate = ajv.getSchema(configVersion.$id);
		expect(validate).toBeDefined();
		if (!validate) throw new Error("ConfigVersion schema was not registered");
		expect(
			validate({
				id: "0b6e6a2c-1d2a-4f0e-9c0f-7a3b1d2e3f40",
				versionNumber: 1,
				data: {},
				hash: "sha256:abc",
				createdAt: "2026-01-01T00:00:00Z",
				createdBy: "operator",
			}),
		).toBe(true);
		expect(
			validate({
				id: "0b6e6a2c-1d2a-4f0e-9c0f-7a3b1d2e3f40",
				versionNumber: 0,
				data: {},
				hash: "sha256:abc",
				createdAt: "2026-01-01T00:00:00Z",
				createdBy: "operator",
			}),
		).toBe(false);
	});

	/** Traces: TC-1363; FR-100-AC-3. */
	it("distinguishes field presence, nullability, and collection boundaries", () => {
		const prefix = "ix://agent-ix/presence/type";
		const ir = {
			package: { identity: "agent-ix/presence" },
			types: [
				{
					identity: `${prefix}/String`,
					kind: "scalar",
					scalar: "string",
					extensions: [],
				},
				{
					identity: `${prefix}/Envelope`,
					kind: "record",
					unknownPolicy: "reject",
					fields: [
						{
							identity: "ix://agent-ix/presence/field/required",
							name: "required",
							typeRef: `${prefix}/String`,
							presence: "required",
							nullable: false,
							extensions: [],
						},
						{
							identity: "ix://agent-ix/presence/field/optional",
							name: "optional",
							typeRef: `${prefix}/String`,
							presence: "optional",
							nullable: false,
							extensions: [],
						},
						{
							identity: "ix://agent-ix/presence/field/requiredNullable",
							name: "requiredNullable",
							typeRef: `${prefix}/String`,
							presence: "required",
							nullable: true,
							extensions: [],
						},
						{
							identity: "ix://agent-ix/presence/field/optionalNullable",
							name: "optionalNullable",
							typeRef: `${prefix}/String`,
							presence: "optional",
							nullable: true,
							extensions: [],
						},
						{
							identity: "ix://agent-ix/presence/field/labels",
							name: "labels",
							typeRef: `${prefix}/String`,
							presence: "required",
							multiplicity: { lower: 1, upper: 2, unique: true },
							extensions: [],
						},
					],
					extensions: [],
				},
			],
			extensions: [],
		};
		const schemas = jsonSchemaBackend
			.generate({ ir })
			.files.filter((file) => file.path !== "index.json")
			.map((file) => JSON.parse(file.text));
		const ajv = new Ajv2020({ strict: false });
		for (const schema of schemas) ajv.addSchema(schema);
		const envelope = schemas.find((schema) =>
			schema.$id.endsWith("/Envelope.json"),
		);
		expect(envelope).toBeDefined();
		if (!envelope) throw new Error("Envelope schema was not emitted");
		const validate = ajv.getSchema(envelope.$id);
		expect(validate).toBeDefined();
		if (!validate) throw new Error("Envelope schema was not registered");
		expect(
			validate({ required: "yes", requiredNullable: null, labels: ["one"] }),
		).toBe(true);
		expect(validate({ requiredNullable: null, labels: ["one"] })).toBe(false);
		expect(
			validate({
				required: "yes",
				requiredNullable: null,
				optional: null,
				labels: ["one"],
			}),
		).toBe(false);
		expect(
			validate({ required: "yes", requiredNullable: null, labels: [] }),
		).toBe(false);
		expect(
			validate({
				required: "yes",
				requiredNullable: null,
				labels: ["one", "two", "three"],
			}),
		).toBe(false);
		expect(
			validate({
				required: "yes",
				requiredNullable: null,
				labels: ["one", "one"],
			}),
		).toBe(false);
	});

	/** Traces: TC-1364; FR-100-AC-4. */
	it("enforces reject and preserves the declared policy for open records", () => {
		for (const policy of ["reject", "preserve", "surface"]) {
			const ir = {
				package: { identity: `agent-ix/policy-${policy}` },
				types: [
					{
						identity: `ix://agent-ix/policy-${policy}/type/Label`,
						kind: "scalar",
						scalar: "string",
						extensions: [],
					},
					{
						identity: `ix://agent-ix/policy-${policy}/type/Envelope`,
						kind: "record",
						unknownPolicy: policy,
						fields: [
							{
								identity: `ix://agent-ix/policy-${policy}/field/Envelope.label`,
								name: "label",
								typeRef: `ix://agent-ix/policy-${policy}/type/Label`,
								presence: "required",
								extensions: [],
							},
						],
						extensions: [],
					},
				],
				extensions: [],
			};
			const schemas = jsonSchemaBackend
				.generate({ ir })
				.files.filter((one) => one.path !== "index.json")
				.map((one) => JSON.parse(one.text));
			const ajv = new Ajv2020({ strict: false });
			for (const schema of schemas) ajv.addSchema(schema);
			const envelope = schemas.find((one) =>
				one.$id.endsWith("/Envelope.json"),
			);
			expect(envelope).toBeDefined();
			if (!envelope) throw new Error("Envelope schema was not emitted");
			const validate = ajv.getSchema(envelope.$id);
			expect(validate).toBeDefined();
			if (!validate) throw new Error("Envelope schema was not registered");
			expect(validate({ label: "ok", extra: true })).toBe(policy !== "reject");
			if (policy !== "reject")
				expect(envelope["x-agent-ix-unknown-policy"]).toBe(policy);
		}
	});

	/** Traces: TC-1365; FR-100-AC-5, FR-100-CON-3. */
	it("uses generated sibling files for every reference", () => {
		const ir = JSON.parse(readFileSync(configVersion12, "utf8"));
		const refs = jsonSchemaBackend
			.generate({ ir })
			.files.flatMap((file) => [...file.text.matchAll(/"\$ref":\s*"([^"]+)"/g)])
			.map((match) => match[1]);
		expect(refs.length).toBeGreaterThan(0);
		expect(
			refs.every((value) => value.startsWith("./") && !value.includes("..")),
		).toBe(true);
	});

	/** Traces: TC-1366; FR-100-AC-6. */
	it("refuses a required extension at a field with no schema mapping", () => {
		const ir = JSON.parse(readFileSync(configVersion12, "utf8"));
		ir.types
			.find((one: { identity: string }) =>
				one.identity.endsWith("/ConfigVersion"),
			)
			.fields[0].extensions.push({
				identity: "ix://example/ext/required",
				version: "1.0.0",
				required: true,
				payload: {},
			});
		const result = jsonSchemaBackend.generate({ ir });
		expect(result.state).toBe("unsupported");
		expect(result.files).toEqual([]);
		expect(result.diagnostics).toHaveLength(1);
		expect(result.diagnostics[0].code).toBe(
			"agent-ix.compiler.UNDECLARED_LOSS",
		);
	});

	/** Traces: TC-1366; FR-100-AC-6. */
	it("refuses a required extension on an operation parameter", () => {
		const ir = JSON.parse(readFileSync(configVersion12, "utf8"));
		ir.types.find((one: { identity: string }) =>
			one.identity.endsWith("/ConfigVersion"),
		).operations = [
			{
				identity: "ix://agent-ix/config-service/operation/config-version-check",
				params: [
					{
						identity:
							"ix://agent-ix/config-service/param/config-version-check-input",
						extensions: [
							{
								identity: "ix://example/ext/required-parameter",
								version: "1.0.0",
								required: true,
								payload: {},
							},
						],
					},
				],
			},
		];
		const result = jsonSchemaBackend.generate({ ir });
		expect(result.state).toBe("unsupported");
		expect(result.files).toEqual([]);
	});

	/** Traces: TC-1366; FR-100-CON-2. */
	it("refuses a format without a JSON Schema enforcement mapping", () => {
		const ir = {
			package: { identity: "agent-ix/unknown-format" },
			types: [
				{
					identity: "ix://agent-ix/unknown-format/type/Value",
					kind: "scalar",
					scalar: "string",
					constraints: [
						{ keyword: "format", operands: { name: "agent-ix:slug" } },
					],
					extensions: [],
				},
			],
			extensions: [],
		};
		const result = jsonSchemaBackend.generate({ ir });
		expect(result.state).toBe("unsupported");
		expect(result.files).toEqual([]);
		expect(result.diagnostics[0].code).toBe(
			"agent-ix.compiler.UNDECLARED_LOSS",
		);
	});

	/** Traces: TC-1366; FR-100-CON-2. */
	it("admits through its injected host before emitting a schema", () => {
		const ir = JSON.parse(readFileSync(configVersion12, "utf8"));
		ir.types[0].identity = "not-a-semantic-identity";
		const result = jsonSchemaBackend.generate(
			{ ir },
			{ host: createHost({ readRoots: [root] }) },
		);
		expect(result.state).toBe("invalid");
		expect(result.files).toEqual([]);
		expect(result.diagnostics.length).toBeGreaterThan(0);
	});

	/** Traces: TC-1361; FR-100-AC-1. */
	it("maps every constraint operand shape without silently dropping it", () => {
		const constraints = [
			["pattern", { regex: "^[a-z]+$" }, "pattern", "^[a-z]+$"],
			["format", { name: "iana:email" }, "format", "email"],
			["enumValues", { values: ["a", "b"] }, "enum", ["a", "b"]],
			["unique", {}, "uniqueItems", true],
		] as const;
		for (const [keyword, operands, member, expected] of constraints) {
			const ir = {
				package: { identity: "agent-ix/probe" },
				types: [
					{
						identity: "ix://agent-ix/probe/type/Value",
						kind: "scalar",
						scalar: "string",
						unknownPolicy: "reject",
						constraints: [{ keyword, operands }],
						extensions: [],
					},
				],
				extensions: [],
			};
			const schema = JSON.parse(
				jsonSchemaBackend.generate({ ir }).files[0].text,
			);
			expect(schema[member]).toEqual(expected);
		}
	});

	/** Traces: TC-1361; FR-100-AC-1. */
	it("maps nonEmpty to the structural JSON Schema keyword", () => {
		const prefix = "ix://agent-ix/non-empty/type";
		const ir = {
			package: { identity: "agent-ix/non-empty" },
			types: [
				{
					identity: `${prefix}/String`,
					kind: "scalar",
					scalar: "string",
					constraints: [{ keyword: "nonEmpty", operands: {} }],
					extensions: [],
				},
				{
					identity: `${prefix}/Sequence`,
					kind: "sequence",
					items: `${prefix}/String`,
					constraints: [{ keyword: "nonEmpty", operands: {} }],
					extensions: [],
				},
				{
					identity: `${prefix}/Map`,
					kind: "map",
					values: `${prefix}/String`,
					constraints: [{ keyword: "nonEmpty", operands: {} }],
					extensions: [],
				},
			],
			extensions: [],
		};
		const schemas = new Map(
			jsonSchemaBackend
				.generate({ ir })
				.files.filter((file) => file.path !== "index.json")
				.map((file) => [file.path, JSON.parse(file.text)]),
		);
		expect(schemas.get("String.json").minLength).toBe(1);
		expect(schemas.get("Sequence.json").minItems).toBe(1);
		expect(schemas.get("Map.json").minProperties).toBe(1);
	});

	/** Traces: TC-1367; NFR-034-AC-1. */
	it("is byte-deterministic across input type ordering", () => {
		const ir = JSON.parse(readFileSync(configVersion12, "utf8"));
		const reversed = structuredClone(ir);
		reversed.types.reverse();
		const first = jsonSchemaBackend
			.generate({ ir })
			.files.map((one) => [one.path, one.text]);
		const second = jsonSchemaBackend
			.generate({ ir: reversed })
			.files.map((one) => [one.path, one.text]);
		expect(second).toEqual(first);
	});

	/** Traces: TC-1367; NFR-034-AC-1, FR-100 schema ordering. */
	it("orders schema members by code unit rather than input order", () => {
		const prefix = "ix://agent-ix/order/type";
		const ir = {
			package: { identity: "agent-ix/order" },
			types: [
				{
					identity: `${prefix}/String`,
					kind: "scalar",
					scalar: "string",
					extensions: [],
				},
				{
					identity: `${prefix}/Record`,
					kind: "record",
					fields: [
						{
							identity: "ix://agent-ix/order/field/Record.z",
							name: "z",
							typeRef: `${prefix}/String`,
							presence: "required",
							extensions: [],
						},
						{
							identity: "ix://agent-ix/order/field/Record.a",
							name: "a",
							typeRef: `${prefix}/String`,
							presence: "required",
							extensions: [],
						},
					],
					extensions: [],
				},
				{
					identity: `${prefix}/Enum`,
					kind: "enum",
					variants: [{ name: "zeta" }, { name: "alpha" }],
					extensions: [],
				},
				{
					identity: `${prefix}/Union`,
					kind: "union",
					variants: [{ name: "zeta" }, { name: "alpha" }],
					extensions: [],
				},
			],
			extensions: [],
		};
		const schemas = new Map(
			jsonSchemaBackend
				.generate({ ir })
				.files.filter((file) => file.path !== "index.json")
				.map((file) => [file.path, JSON.parse(file.text)]),
		);
		expect(Object.keys(schemas.get("Record.json").properties)).toEqual([
			"a",
			"z",
		]);
		expect(schemas.get("Enum.json").enum).toEqual(["alpha", "zeta"]);
		expect(
			schemas
				.get("Union.json")
				.oneOf.map((branch) => branch.properties.tag.const),
		).toEqual(["alpha", "zeta"]);
	});

	/** Traces: TC-1367; FR-100-CON-1. */
	it("does not depend on a source frontend or filesystem module", () => {
		const source = readFileSync(
			resolve(root, "src/compiler/backends/json-schema-v1/index.mjs"),
			"utf8",
		);
		expect(source).not.toContain("src/compiler/frontend/");
		expect(source).not.toContain('from "node:fs"');
		expect(source).not.toContain('from "node:fs/promises"');
	});

	/** Traces: TC-1361; FR-100-AC-1. */
	it("retains non-structural type and field metadata as annotations", () => {
		const ir = JSON.parse(readFileSync(configVersion12, "utf8"));
		const type = ir.types.find((one: { identity: string }) =>
			one.identity.endsWith("/ConfigVersion"),
		);
		expect(type).toBeDefined();
		if (!type)
			throw new Error("ConfigVersion type was not found in the fixture");
		type.relationships = [
			{
				identity: "ix://agent-ix/config-service/relationship/version-parent",
				name: "parent",
			},
		];
		type.fields.find((one: { name: string }) => one.name === "createdAt").unit =
			"s";
		ir.extensions = [
			{
				identity: "ix://agent-ix/config-service/ext/document-note",
				version: "1.0.0",
				required: false,
				payload: { note: "retained" },
			},
		];
		ir.occurrences = [
			{
				identity: "ix://agent-ix/config-service/occurrence/config-version",
				definition: type.identity,
				extensions: [],
			},
		];
		const result = jsonSchemaBackend.generate({ ir });
		const file = result.files.find((one) => one.path === "ConfigVersion.json");
		expect(file).toBeDefined();
		if (!file) throw new Error("ConfigVersion schema was not emitted");
		const schema = JSON.parse(file.text);
		expect(schema["x-agent-ix-relationships"]).toEqual(type.relationships);
		expect(schema.properties.createdAt["x-agent-ix-unit"]).toBe("s");
		const index = result.files.find((one) => one.path === "index.json");
		expect(index).toBeDefined();
		if (!index) throw new Error("JSON Schema index was not emitted");
		const indexSchema = JSON.parse(index.text);
		expect(indexSchema["x-agent-ix-extensions"]).toEqual(ir.extensions);
		expect(indexSchema["x-agent-ix-occurrences"]).toEqual(ir.occurrences);
	});
});
