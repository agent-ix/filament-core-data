import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { describe, expect, it } from "vitest";
import { jsonSchemaBackend } from "../src/compiler/backends/json-schema-v1/index.mjs";
import { generateTarget } from "../src/compiler/backends/seam.mjs";
import { DEFAULT_LIMITS } from "../src/compiler/diagnostics.mjs";
import { createHost } from "../src/compiler/host.mjs";

const root = resolve(import.meta.dirname, "..");
const golden = resolve(
	root,
	"crates/extraction-frontend/fixtures/config-version-table/expected/semantic-ir.json",
);
/** A `2.0.0` ConfigVersion document of records, which the backend renders. */
const configVersion12 = resolve(
	root,
	"fixtures/semantic/v1/positive/config-version-v2.json",
);
/** One construct of each kind and every model member, which it renders. */
const constructs = resolve(
	root,
	"fixtures/semantic/v1/positive/semantic-ir-v2-constructs.json",
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
		// Its clauses are carried as data: one advisory declared loss (FR-142-AC-8).
		expect(manifest.diagnostics.map((d) => [d.code, d.blocking])).toEqual([
			["agent-ix.compiler.CONSTRUCT_MEMBER_UNENFORCED", false],
		]);
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

	/** Traces: TC-1749; FR-142-AC-5, FR-142-CON-2. */
	it("renders every construct kind as its own kind and none as another", () => {
		const ir = JSON.parse(readFileSync(constructs, "utf8"));
		const result = jsonSchemaBackend.generate({ ir });
		expect(result.state).toBe("success");
		expect(
			result.diagnostics.map((d: { code: string; blocking: boolean }) => [
				d.code,
				d.blocking,
			]),
		).toEqual(
			Array(6).fill(["agent-ix.compiler.CONSTRUCT_MEMBER_UNENFORCED", false]),
		);
		const declared = (ir.constructs as { kind: { name: string } }[]).map(
			(entry) => entry.kind.name,
		);
		const seen = new Set<string>();
		for (const type of ir.types as {
			kind: string | { name: string };
			displayName: string;
		}[]) {
			if (typeof type.kind !== "object") continue;
			const file = result.files.find(
				(one) => one.path === `${type.displayName}.json`,
			);
			if (!file) throw new Error(`${type.displayName} schema was not emitted`);
			expect(JSON.parse(file.text)["x-agent-ix-kind"], type.displayName).toBe(
				type.kind.name,
			);
			seen.add(type.kind.name);
		}
		// A construct table entry a population alone uses (QSpec FR-154 row
		// 2/AC-7, FR-208) has no per-type schema
		// of its own — the JSON Schema backend emits one file per type, never
		// per population — so it is counted here without expecting a schema
		// file, not folded into `seen`.
		const declaredByPopulation = new Set(
			(
				ir.populations as { kind?: { name?: string } }[] | undefined
			)?.map((population) => population.kind?.name) ?? [],
		);
		expect(
			[...new Set([...seen, ...declaredByPopulation])].sort(),
		).toStrictEqual([...declared].sort());
	});

	/** Traces: TC-1774; FR-100-AC-10. */
	it("renders each construct's members and every model member", () => {
		const ir = JSON.parse(readFileSync(constructs, "utf8"));
		const result = jsonSchemaBackend.generate({ ir });
		const schema = (name: string) => {
			const file = result.files.find((one) => one.path === `${name}.json`);
			if (!file) throw new Error(`${name} schema was not emitted`);
			return JSON.parse(file.text);
		};
		const ajv = new Ajv2020({ strict: false, allErrors: true });
		addFormats(ajv);

		const line = schema("OrderLine");
		expect(line.type).toBe("object");
		expect(line["x-agent-ix-equality"]).toBe("value");
		expect(schema("OrderPlaced").readOnly).toBe(true);
		// `readOnly` is the declared `immutable` flag, not the presence of an
		// occurrence field: the same document with the flag withdrawn renders the
		// event mutable (FR-142-AC-14, FR-100-AC-10).
		const mutable = JSON.parse(readFileSync(constructs, "utf8")) as {
			constructs: { construct: { immutable?: boolean } }[];
		};
		const flagged = mutable.constructs.filter(
			(entry) => entry.construct.immutable === true,
		);
		expect(flagged.length).toBeGreaterThan(0);
		for (const entry of flagged) delete entry.construct.immutable;
		const withoutFlag = jsonSchemaBackend.generate({ ir: mutable });
		const withoutFlagSchema = JSON.parse(
			withoutFlag.files.find((one) => one.path === "OrderPlaced.json")?.text ??
				"{}",
		);
		expect(withoutFlagSchema.readOnly).toBeUndefined();
		expect(withoutFlagSchema["x-agent-ix-occurrence-field"]).toBe("placedAt");
		expect(schema("OrderPlaced")["x-agent-ix-occurrence-field"]).toBe(
			"placedAt",
		);
		expect(schema("Shipment")["x-agent-ix-owner"]).toBe(
			"ix://agent-ix/orders/type/FR-001",
		);
		expect(schema("Shipment")["x-agent-ix-identity-fields"]).toStrictEqual([
			"id",
		]);
		expect(schema("OrderAggregate")["x-agent-ix-members"]).toStrictEqual([
			"ix://agent-ix/orders/type/FR-001",
			"ix://agent-ix/orders/type/VO-001",
		]);
		expect(schema("OrderStatus").enum).toStrictEqual([
			"cancelled",
			"draft",
			"placed",
			"shipped",
		]);
		const lifecycle = schema("OrderLifecycle");
		expect(lifecycle.$defs.OrderLifecycleState).toStrictEqual({
			type: "string",
			enum: ["placed", "shipped"],
		});
		expect(lifecycle["x-agent-ix-transitions"][0]).toMatchObject({
			from: "placed",
			to: "shipped",
			trigger: "advance",
			guard: "can_ship",
		});
		const advance = lifecycle["x-agent-ix-operations"][0];
		expect(advance.frame).toStrictEqual({
			modifies: ["ix://agent-ix/orders/field/SM-001-current"],
			creates: [],
			deletes: [],
		});
		// Traces: TC-1796; FR-141-AC-9. A mixed list keeps its order and forms.
		expect(advance.pre[0]).toBe("can_ship");
		expect(advance.pre[1].text).toBe("to <> current");
		expect(advance.post[0].text).toBe("current = to");
		expect(
			schema("Fulfilment")["x-agent-ix-steps"].map(
				(step: { name: string }) => step.name,
			),
		).toStrictEqual(["fulfil"]);

		// A repository and a domain have no instances: no value validates.
		for (const name of ["OrderRepository", "Ordering"]) {
			const instanceless = schema(name);
			expect(instanceless.not, name).toStrictEqual({});
			expect(ajv.validate({ ...instanceless, $id: undefined }, {}), name).toBe(
				false,
			);
		}
		expect(schema("OrderRepository")["x-agent-ix-persists"]).toStrictEqual([
			"ix://agent-ix/orders/type/FR-001",
		]);
		expect(schema("Ordering")["x-agent-ix-vocabulary"]).toStrictEqual([
			{ term: "Order", doc: "A customer's request for goods." },
		]);

		const order = schema("Order");
		expect(order["x-agent-ix-supertypes"]).toStrictEqual([
			"ix://agent-ix/orders/type/FR-000",
		]);
		expect(Object.keys(order.properties)).toContain("labels");
		expect(order.properties.labels["x-agent-ix-redefines"]).toBe(
			"ix://agent-ix/orders/field/FR-000-labels",
		);
		expect(order.properties.badges["x-agent-ix-subsets"]).toStrictEqual([
			"ix://agent-ix/orders/field/FR-000-labels",
		]);
		expect(schema("Party")["x-agent-ix-abstract"]).toBe(true);
		expect(schema("index")["x-agent-ix-populations"][0].displayName).toBe(
			"OpenOrders",
		);
	});

	/** Traces: TC-1362; FR-100-AC-2. */
	it("emits ConfigVersion properties, required fields, and constraints", () => {
		const ir = JSON.parse(readFileSync(golden, "utf8"));
		const result = jsonSchemaBackend.generate({ ir });
		expect(result.state).toBe("success");
		expect(result.diagnostics.map((d) => d.code)).toEqual([
			"agent-ix.compiler.CONSTRUCT_MEMBER_UNENFORCED",
		]);
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

	/** Traces: TC-1764; FR-100-AC-7. */
	it("renders an entity as a record schema naming its kind and identity fields, filed under its declared name", () => {
		const ir = JSON.parse(readFileSync(golden, "utf8"));
		const result = jsonSchemaBackend.generate({ ir });
		expect(result.state).toBe("success");
		const paths = result.files.map((one) => one.path);
		expect(paths.some((path) => path.startsWith("FR-"))).toBe(false);
		for (const name of ["ConfigOverlay", "ConfigVersion"]) {
			const file = result.files.find((one) => one.path === `${name}.json`);
			if (!file) throw new Error(`${name} schema was not emitted`);
			const schema = JSON.parse(file.text);
			expect(schema.type).toBe("object");
			expect(schema["x-agent-ix-kind"]).toBe("entity");
			expect(schema["x-agent-ix-identity-fields"]).toStrictEqual(["id"]);
			expect(schema.required).toContain("id");
		}
		// A record carries neither annotation.
		const records = jsonSchemaBackend.generate({
			ir: JSON.parse(readFileSync(configVersion12, "utf8")),
		});
		const record = records.files.find(
			(one) => one.path === "ConfigVersion.json",
		);
		if (!record) throw new Error("ConfigVersion schema was not emitted");
		const recordSchema = JSON.parse(record.text);
		expect(recordSchema["x-agent-ix-kind"]).toBeUndefined();
		expect(recordSchema["x-agent-ix-identity-fields"]).toBeUndefined();
	});

	/** Traces: TC-1771; FR-100-AC-9. */
	it("refuses two display names that derive one file name, case-insensitively, naming both identities and writing no file", () => {
		const ir = JSON.parse(readFileSync(golden, "utf8"));
		const overlay = ir.types.find(
			(type: { displayName?: string }) => type.displayName === "ConfigOverlay",
		);
		const version = ir.types.find(
			(type: { displayName?: string }) => type.displayName === "ConfigVersion",
		);
		overlay.displayName = "Config Overlay";
		version.displayName = "Config-Overlay";
		const result = jsonSchemaBackend.generate({ ir });
		expect(result.state).toBe("unsupported");
		expect(result.files).toStrictEqual([]);
		expect(result.diagnostics).toHaveLength(1);
		const [refusal] = result.diagnostics;
		expect(refusal.blocking).toBe(true);
		expect(refusal.message).toContain("Config-Overlay.json");
		expect(refusal.message).toContain(overlay.identity);
		expect(refusal.message).toContain(version.identity);

		// A definition named `index` would overwrite the backend's own index.
		const indexed = JSON.parse(readFileSync(golden, "utf8"));
		indexed.types.find(
			(type: { displayName?: string }) => type.displayName === "ConfigOverlay",
		).displayName = "index";
		const refused = jsonSchemaBackend.generate({ ir: indexed });
		expect(refused.state).toBe("unsupported");
		expect(refused.files).toStrictEqual([]);
		expect(refused.diagnostics).toHaveLength(1);
		expect(refused.diagnostics[0].message).toContain(
			"collides with the backend's index.json",
		);
		expect(refused.diagnostics[0].message).not.toContain(
			"one file name, compared case-insensitively",
		);

		// `Status` and `status` are one file on a case-insensitive file system.
		const cased = JSON.parse(readFileSync(golden, "utf8"));
		const upper = cased.types.find(
			(type: { displayName?: string }) => type.displayName === "ConfigOverlay",
		);
		const lower = cased.types.find(
			(type: { displayName?: string }) => type.displayName === "ConfigVersion",
		);
		upper.displayName = "Status";
		lower.displayName = "status";
		const folded = jsonSchemaBackend.generate({ ir: cased });
		expect(folded.state).toBe("unsupported");
		expect(folded.files).toStrictEqual([]);
		expect(folded.diagnostics).toHaveLength(1);
		expect(folded.diagnostics[0].message).toContain(
			"Status.json and status.json",
		);
		expect(folded.diagnostics[0].message).toContain(upper.identity);
		expect(folded.diagnostics[0].message).toContain(lower.identity);
	});

	/** Traces: TC-1782; FR-100-AC-11. */
	it("reads a subtype's construct members from the authored document and refuses an inherited field collision", () => {
		const ir = JSON.parse(readFileSync(constructs, "utf8"));
		const party = ir.types.find(
			(type: { displayName: string }) => type.displayName === "Party",
		);
		const orderIndex = ir.types.findIndex(
			(type: { displayName: string }) => type.displayName === "Order",
		);
		// An inherited, unredefined Party field that subsets another.
		party.fields.push({
			...party.fields[1],
			name: "remark",
			identity: "ix://agent-ix/orders/field/FR-000-remark",
			subsets: [party.fields[1].identity],
		});
		const result = jsonSchemaBackend.generate({ ir });
		expect(result.state).toBe("success");
		const schema = (name: string) => {
			const file = result.files.find((one) => one.path === `${name}.json`);
			if (!file) throw new Error(`${name}.json was not emitted`);
			return JSON.parse(file.text);
		};
		const order = schema("Order");
		expect(order.properties.remark["x-agent-ix-subsets"]).toStrictEqual([
			"ix://agent-ix/orders/field/FR-000-labels",
		]);
		expect(order["x-agent-ix-identity-fields"]).toStrictEqual(["id"]);
		expect(order["x-agent-ix-supertypes"]).toStrictEqual([
			"ix://agent-ix/orders/type/FR-000",
		]);

		const collided = JSON.parse(readFileSync(constructs, "utf8"));
		const id = collided.types[orderIndex].fields.find(
			(field: { name: string }) => field.name === "id",
		);
		delete id.redefines;
		const refused = jsonSchemaBackend.generate({ ir: collided });
		expect(refused.state).toBe("unsupported");
		expect(refused.files).toStrictEqual([]);
		expect(
			refused.diagnostics.map((one) => [one.code, one.message]),
		).toStrictEqual([
			[
				"agent-ix.compiler.UNDECLARED_LOSS",
				`/ir/types/${orderIndex}/fields: two effective fields are named id; one would be dropped, since neither redefines the other`,
			],
		]);
	});

	/** Traces: TC-1768; FR-100-AC-8. */
	it("files and identifies each schema by its display name while its semantic id stays the artifact id", () => {
		const ir = JSON.parse(readFileSync(golden, "utf8"));
		const result = jsonSchemaBackend.generate({ ir });
		expect(result.state).toBe("success");
		const file = result.files.find((one) => one.path === "ConfigVersion.json");
		if (!file) throw new Error("ConfigVersion schema was not emitted");
		const schema = JSON.parse(file.text);
		expect(schema.$id.endsWith("/ConfigVersion.json")).toBe(true);
		expect(schema["x-agent-ix-semantic-id"]).toBe(
			"ix://agent-ix/config-service/type/FR-006",
		);
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
