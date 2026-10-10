import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import {
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import { expect, it } from "vitest";
import { jsonSchemaBackend } from "../src/compiler/backends/json-schema-v1/index.mjs";
import { emitCrate } from "../src/compiler/backends/rust-serde/crate.mjs";
import { typescriptBackend } from "../src/compiler/backends/typescript-v1/index.mjs";
import { buildModel } from "../src/compiler/backends/typescript-v1/model.mjs";
import {
	renderErrors,
	renderValidators,
} from "../src/compiler/backends/typescript-v1/validators.mjs";
import { renderTypes } from "../src/compiler/backends/typescript-v1/types.mjs";
import { readContractIr } from "../src/compiler/ir/reader.mjs";
import { admitInstance } from "../conformance/oracle/oracle.mjs";
import {
	buildMatrixIr,
	cellRecordName,
	MATRIX_CELLS,
} from "../scripts/age-2229-numeric-matrix.mjs";

const typescript = createRequire(resolve("package.json"))("typescript");
const root = resolve(import.meta.dirname, "..");
const limits = {
	maxInputBytes: 33_554_432,
	maxDepth: 256,
	maxNodes: 1_000_000,
	maxCollectionItems: 100_000,
	maxDiagnostics: 1_000,
};

const SOURCE = {
	identity: "ix://agent-ix/age-2229-regressions/source",
	version: "1.0.0",
	dialect: "spec-bundle",
	digest: `sha256:${"1".repeat(64)}`,
};
const PACKAGE = {
	identity: "agent-ix/age-2229-regressions",
	version: "1.0.0",
	manifestDigest: `sha256:${"2".repeat(64)}`,
	mappingVersions: ["1.0.0"],
	profileVersions: ["1.0.0"],
	lockDigest: `sha256:${"3".repeat(64)}`,
};
let moduleNonce = 0;

function document(types: unknown[]) {
	return {
		contractVersion: "2.0.0",
		source: SOURCE,
		package: PACKAGE,
		types,
		occurrences: [],
		extensions: [],
		constructs: [],
	};
}

function scalar(
	identity: string,
	scalarName: string,
	constraints: Record<string, unknown>[] = [],
) {
	return {
		identity,
		displayName: identity.split("/").at(-1),
		kind: "scalar",
		scalar: scalarName,
		constraints,
		extensions: [],
		roles: [],
		unknownPolicy: "reject",
	};
}

function record(identity: string, field: Record<string, unknown>) {
	return {
		identity,
		displayName: identity.split("/").at(-1),
		kind: "record",
		fields: [field],
		constraints: [],
		extensions: [],
		roles: [],
		unknownPolicy: "reject",
	};
}

function field(
	identity: string,
	typeRef: string,
	options: Record<string, unknown> = {},
) {
	return {
		identity: `${identity}#value`,
		name: "value",
		typeRef,
		presence: "required",
		nullable: false,
		multiplicity: { lower: 1, upper: 1, ordered: false, unique: false },
		defaultKind: "none",
		constraints: [],
		extensions: [],
		...options,
	};
}

function enumIr() {
	const scalarIdentity = "ix://agent-ix/age-2229-regressions/type/SignedZero";
	const recordIdentity =
		"ix://agent-ix/age-2229-regressions/type/SignedZeroRecord";
	return document([
		scalar(scalarIdentity, "float32", [
			{
				identity: `${scalarIdentity}/constraint/enumValues`,
				keyword: "enumValues",
				operands: { values: [0] },
				appliesTo: scalarIdentity,
				diagnosticCode: "ix://agent-ix/age-2229-regressions/SIGNED_ZERO_ENUM",
			},
		]),
		record(recordIdentity, field(recordIdentity, scalarIdentity)),
	]);
}

function uniqueIr() {
	const scalarIdentity =
		"ix://agent-ix/age-2229-regressions/type/UniqueFloat32";
	const recordIdentity = "ix://agent-ix/age-2229-regressions/type/UniqueRecord";
	return document([
		scalar(scalarIdentity, "float32"),
		record(
			recordIdentity,
			field(recordIdentity, scalarIdentity, {
				multiplicity: { lower: 1, upper: 3, ordered: true, unique: true },
			}),
		),
	]);
}

function nativeFloat32BoundIr(
	collection = false,
	enumValue = false,
	keyword: "min" | "max" = "min",
	boundValue = 0.10000000149011612,
) {
	const recordIdentity =
		"ix://agent-ix/age-2229-regressions/type/NativeFloat32Boundary";
	return document([
		record(
			recordIdentity,
			field(recordIdentity, "ix://quire/native/Float32", {
				collection,
				multiplicity: collection
					? { lower: 1, upper: 3, ordered: true, unique: !enumValue }
					: { lower: 1, upper: 1, ordered: false, unique: false },
				constraints: [
					{
						identity: `${recordIdentity}#value/constraint/${keyword}`,
						keyword,
						operands: { value: boundValue },
						appliesTo: `${recordIdentity}#value`,
						diagnosticCode: "ix://agent-ix/age-2229-regressions/F32_MIN",
					},
					...(enumValue
						? [
								{
									identity: `${recordIdentity}#value/constraint/enumValues`,
									keyword: "enumValues",
									operands: { values: [boundValue] },
									appliesTo: `${recordIdentity}#value`,
									diagnosticCode: "ix://agent-ix/age-2229-regressions/F32_ENUM",
								},
							]
						: []),
				],
			}),
		),
	]);
}

function nativeNullableCollectionIr(impossible = false, nullable = true) {
	const recordIdentity =
		"ix://agent-ix/age-2229-regressions/type/NativeNullableWideCollection";
	return document([
		record(
			recordIdentity,
			field(recordIdentity, "ix://quire/native/Integer", {
				collection: true,
				nullable,
				multiplicity: { lower: 1, upper: 3, ordered: true, unique: false },
				constraints: [
					{
						identity: `${recordIdentity}#value/constraint/min`,
						keyword: "min",
						operands: { value: "0" },
						appliesTo: `${recordIdentity}#value`,
						diagnosticCode: "ix://agent-ix/age-2229-regressions/NATIVE_MIN",
					},
					{
						identity: `${recordIdentity}#value/constraint/max`,
						keyword: "max",
						operands: {
							value: impossible ? "-1" : "18446744073709551615",
						},
						appliesTo: `${recordIdentity}#value`,
						diagnosticCode: "ix://agent-ix/age-2229-regressions/NATIVE_MAX",
					},
				],
			}),
		),
	]);
}

function nativeIntegerEnumIr() {
	const recordIdentity =
		"ix://agent-ix/age-2229-regressions/type/NativeIntegerEnum";
	const fieldIdentity = `${recordIdentity}#value`;
	return document([
		record(
			recordIdentity,
			field(recordIdentity, "ix://quire/native/Integer", {
				constraints: [
					{
						identity: `${fieldIdentity}/constraint/enumValues`,
						keyword: "enumValues",
						operands: { values: ["1", "2"] },
						appliesTo: fieldIdentity,
						diagnosticCode: "ix://agent-ix/age-2229-regressions/NATIVE_ENUM",
					},
				],
			}),
		),
	]);
}

function scalarEnumIr(name: string, typeRef: string, values: unknown[]) {
	const recordIdentity = `ix://agent-ix/age-2229-regressions/type/${name}`;
	const fieldIdentity = `${recordIdentity}#value`;
	const wide = name === "EnumWideInteger";
	return document([
		record(
			recordIdentity,
			field(recordIdentity, typeRef, {
				...(typeRef === "ix://quire/native/Decimal"
					? { decimal: { precision: 5, scale: 2 } }
					: {}),
				constraints: [
					...(wide
						? [
								{
									identity: `${fieldIdentity}/constraint/min`,
									keyword: "min",
									operands: { value: "9007199254740992" },
									appliesTo: fieldIdentity,
									diagnosticCode: "ix://agent-ix/age-2229-regressions/WIDE_MIN",
								},
								{
									identity: `${fieldIdentity}/constraint/max`,
									keyword: "max",
									operands: { value: "9007199254740994" },
									appliesTo: fieldIdentity,
									diagnosticCode: "ix://agent-ix/age-2229-regressions/WIDE_MAX",
								},
							]
						: []),
					{
						identity: `${fieldIdentity}/constraint/enumValues`,
						keyword: "enumValues",
						operands: { values },
						appliesTo: fieldIdentity,
						diagnosticCode: "ix://agent-ix/age-2229-regressions/SCALAR_ENUM",
					},
				],
			}),
		),
	]);
}

function nativeBoundIr(
	name: string,
	typeRef: string,
	bound: string | number,
	keyword: "min" | "max" = "min",
) {
	const recordIdentity = `ix://agent-ix/age-2229-regressions/type/${name}`;
	const fieldIdentity = `${recordIdentity}#value`;
	return document([
		record(
			recordIdentity,
			field(recordIdentity, typeRef, {
				...(typeRef === "ix://quire/native/Decimal"
					? { decimal: { precision: 5, scale: 2 } }
					: {}),
				constraints: [
					{
						identity: `${fieldIdentity}/constraint/${keyword}`,
						keyword,
						operands: { value: bound },
						appliesTo: fieldIdentity,
						diagnosticCode: "ix://agent-ix/age-2229-regressions/NATIVE_BOUND",
					},
				],
			}),
		),
	]);
}

function writeValidators(
	directory: string,
	ir: unknown,
	mutate?: (source: string) => string,
) {
	writeFileSync(join(directory, "package.json"), '{"type":"module"}\n');
	writeFileSync(
		join(directory, "errors.js"),
		typescript.transpileModule(renderErrors(), {
			compilerOptions: {
				target: typescript.ScriptTarget.ES2022,
				module: typescript.ModuleKind.ES2022,
			},
		}).outputText,
	);
	const source = typescript.transpileModule(renderValidators(buildModel(ir)), {
		compilerOptions: {
			target: typescript.ScriptTarget.ES2022,
			module: typescript.ModuleKind.ES2022,
		},
	}).outputText;
	writeFileSync(join(directory, "validators.mjs"), mutate?.(source) ?? source);
	moduleNonce += 1;
	return import(
		`${pathToFileURL(join(directory, "validators.mjs"))}?regression=${moduleNonce}`
	);
}

function nextFloat32(value: number, direction: -1 | 1) {
	const view = new DataView(new ArrayBuffer(4));
	view.setFloat32(0, value);
	let bits = view.getUint32(0);
	if (direction < 0) bits -= 1;
	else bits += 1;
	view.setUint32(0, bits);
	return view.getFloat32(0);
}

function jsonSchemas(ir: unknown) {
	const result = jsonSchemaBackend.generate({ ir } as never);
	expect(result.diagnostics.filter((one) => one.blocking)).toEqual([]);
	const ajv = new Ajv2020({ strict: false });
	const schemas = result.files
		.filter((file) => file.path !== "index.json")
		.map((file) => JSON.parse(file.text));
	for (const schema of schemas) ajv.addSchema(schema);
	return { ajv, schemas };
}

function mutateFloat32Maximum(schema: Record<string, unknown>) {
	const copy = structuredClone(schema) as Record<string, unknown>;
	let changed = false;
	const visit = (value: unknown) => {
		if (value === null || typeof value !== "object") return;
		if (Array.isArray(value)) {
			value.forEach(visit);
			return;
		}
		const object = value as Record<string, unknown>;
		if (object.type === "number" && object.exclusiveMaximum !== undefined) {
			object.maximum = Number.MAX_VALUE;
			delete object.exclusiveMaximum;
			changed = true;
		}
		Object.values(object).forEach(visit);
	};
	visit(copy);
	expect(changed).toBe(true);
	return copy;
}

function writeGeneratedFiles(
	directory: string,
	files: readonly { path: string; text: string }[],
) {
	for (const file of files) {
		const path = join(directory, file.path);
		const parent = resolve(path, "..");
		mkdirSync(parent, { recursive: true });
		writeFileSync(path, file.text);
	}
}

function runTsc(directory: string) {
	const config = join(directory, "tsconfig.json");
	writeFileSync(
		config,
		JSON.stringify({
			compilerOptions: {
				target: "ES2022",
				module: "NodeNext",
				moduleResolution: "NodeNext",
				strict: true,
				noEmit: true,
				skipLibCheck: true,
			},
			include: ["**/*.ts"],
		}),
	);
	return execFileSync(resolve(root, "node_modules/.bin/tsc"), ["-p", config], {
		cwd: directory,
		encoding: "utf8",
		stdio: "pipe",
	});
}

/** Trace: FR-144-AC-14. */
it("covers the Float32 boundary grid and proves overflow regression is live", async () => {
	const ir = buildMatrixIr();
	const directory = mkdtempSync(join(tmpdir(), "fcd-268-f32-ts-"));
	try {
		const generated = await writeValidators(directory, ir);
		const cell = MATRIX_CELLS.find(
			(one: (typeof MATRIX_CELLS)[number]) =>
				one.name === "native-float32-in-range",
		);
		expect(cell).toBeDefined();
		const name = cellRecordName(cell!);
		const validate = generated[`validate${name}`] as (value: unknown) => {
			ok: boolean;
		};
		const { ajv, schemas } = jsonSchemas(ir);
		const schema = schemas.find((one) => one.title === name) as Record<
			string,
			unknown
		>;
		const validateJson = ajv.getSchema(schema.$id as string)!;
		const one = 1;
		const previous = nextFloat32(one, -1);
		const next = nextFloat32(one, 1);
		const grid = [
			-0,
			0,
			previous,
			(previous + one) / 2,
			one,
			(one + next) / 2,
			next,
			-3.4028234663852886e38,
			3.4028234663852886e38,
			Number.MAX_VALUE,
		];
		for (const value of grid) {
			const expected = Number.isFinite(Math.fround(value));
			expect(validate({ value }).ok, `TS Float32 ${value}`).toBe(expected);
			expect(validateJson({ value }), `JSON Float32 ${value}`).toBe(expected);
		}

		// Mutation: replacing the finite binary32 preimage with a broad JS-number
		// maximum makes Number.MAX_VALUE pass. The real schema must reject it.
		const mutant = mutateFloat32Maximum(schema);
		mutant.$id = `${String(schema.$id)}-mutant`;
		ajv.addSchema(mutant);
		const mutantValidator = ajv.getSchema(mutant.$id as string)!;
		expect(validateJson({ value: Number.MAX_VALUE })).toBe(false);
		expect(mutantValidator({ value: Number.MAX_VALUE })).toBe(true);
	} finally {
		rmSync(directory, { recursive: true, force: true });
	}
});

/** Trace: FR-066-AC-5. */
it("keeps signed-zero enum equality and proves the broken comparison is red", async () => {
	const ir = enumIr();
	const directory = mkdtempSync(join(tmpdir(), "fcd-268-zero-"));
	try {
		const generated = await writeValidators(directory, ir);
		const real = generated.validateSignedZeroRecord as (value: unknown) => {
			ok: boolean;
			errors: { code: string; pointer: string }[];
		};
		expect(real({ value: -0 }).ok).toBe(true);
		expect(real({ value: 1 }).errors).toContainEqual(
			expect.objectContaining({
				code: "ix://agent-ix/age-2229-regressions/SIGNED_ZERO_ENUM",
				pointer: "/value",
			}),
		);
		const mutant = await writeValidators(directory, ir, (source) =>
			source.replace(
				"Math.fround(enumMember) === Math.fround(candidate)",
				"Object.is(Math.fround(enumMember), Math.fround(candidate))",
			),
		);
		expect(mutant.validateSignedZeroRecord({ value: -0 }).ok).toBe(false);
	} finally {
		rmSync(directory, { recursive: true, force: true });
	}
});

/** Trace: FR-066-AC-5. */
it("rounds native Float32 bounds and rejects rounded duplicate members", async () => {
	const ir = nativeFloat32BoundIr();
	const directory = mkdtempSync(join(tmpdir(), "fcd-268-native-f32-"));
	try {
		const generated = await writeValidators(directory, ir);
		const real = generated.validateNativeFloat32Boundary as (
			value: unknown,
		) => { ok: boolean };
		expect(real({ value: 0.1 }).ok).toBe(true);
		const { ajv, schemas } = jsonSchemas(ir);
		const schema = schemas.find(
			(one) => one.title === "NativeFloat32Boundary",
		) as Record<string, unknown>;
		expect(ajv.getSchema(schema.$id as string)!({ value: 0.1 })).toBe(true);
		const enumIrValue = nativeFloat32BoundIr(false, true);
		const enumGenerated = await writeValidators(directory, enumIrValue);
		expect(
			(
				enumGenerated.validateNativeFloat32Boundary as (value: unknown) => {
					ok: boolean;
				}
			)({ value: 0.1 }).ok,
		).toBe(true);
		const enumSchemas = jsonSchemas(enumIrValue);
		const enumSchema = enumSchemas.schemas.find(
			(one) => one.title === "NativeFloat32Boundary",
		) as Record<string, unknown>;
		expect(
			enumSchemas.ajv.getSchema(enumSchema.$id as string)!({ value: 0.1 }),
		).toBe(true);
		const oddMin = nativeFloat32BoundIr(
			false,
			false,
			"min",
			1.0000001192092896,
		);
		const oddMinGenerated = await writeValidators(directory, oddMin);
		const rejectedMin = (
			oddMinGenerated.validateNativeFloat32Boundary as (value: unknown) => {
				ok: boolean;
				errors: { code: string; pointer: string }[];
			}
		)({ value: 1.0000000596046448 });
		expect(rejectedMin.ok).toBe(false);
		expect(rejectedMin.errors).toContainEqual(
			expect.objectContaining({
				code: "ix://agent-ix/age-2229-regressions/F32_MIN",
				pointer: "/value",
			}),
		);
		const oddMinSchemas = jsonSchemas(oddMin);
		const oddMinSchema = oddMinSchemas.schemas.find(
			(one) => one.title === "NativeFloat32Boundary",
		) as Record<string, unknown>;
		expect(
			oddMinSchemas.ajv.getSchema(oddMinSchema.$id as string)!({
				value: 1.0000000596046448,
			}),
		).toBe(false);
		const oddMax = nativeFloat32BoundIr(
			false,
			false,
			"max",
			1.0000001192092896,
		);
		const oddMaxGenerated = await writeValidators(directory, oddMax);
		expect(
			(
				oddMaxGenerated.validateNativeFloat32Boundary as (value: unknown) => {
					ok: boolean;
				}
			)({ value: 1.0000001788139343 }).ok,
		).toBe(false);
		const oddMaxSchemas = jsonSchemas(oddMax);
		const oddMaxSchema = oddMaxSchemas.schemas.find(
			(one) => one.title === "NativeFloat32Boundary",
		) as Record<string, unknown>;
		expect(
			oddMaxSchemas.ajv.getSchema(oddMaxSchema.$id as string)!({
				value: 1.0000001788139343,
			}),
		).toBe(false);
		for (const [keyword, rejected] of [
			["min", 1.0000000596046448],
			["max", 1.0000001788139343],
		] as const) {
			const collection = nativeFloat32BoundIr(
				true,
				false,
				keyword,
				1.0000001192092896,
			);
			const validators = await writeValidators(directory, collection);
			const validate = validators.validateNativeFloat32Boundary as (
				value: unknown,
			) => { ok: boolean };
			expect(validate({ value: [rejected] }).ok).toBe(false);
			const { ajv, schemas } = jsonSchemas(collection);
			const schema = schemas.find(
				(one) => one.title === "NativeFloat32Boundary",
			) as Record<string, unknown>;
			expect(ajv.getSchema(schema.$id as string)!({ value: [rejected] })).toBe(
				false,
			);
		}
		const enumCollection = nativeFloat32BoundIr(true, true);
		const enumCollectionGenerated = await writeValidators(
			directory,
			enumCollection,
		);
		expect(
			(
				enumCollectionGenerated.validateNativeFloat32Boundary as (
					value: unknown,
				) => { ok: boolean }
			)({ value: [0.1] }).ok,
		).toBe(true);
		const enumCollectionSchemas = jsonSchemas(enumCollection);
		const enumCollectionSchema = enumCollectionSchemas.schemas.find(
			(one) => one.title === "NativeFloat32Boundary",
		) as Record<string, unknown>;
		expect(
			enumCollectionSchemas.ajv.getSchema(enumCollectionSchema.$id as string)!({
				value: [0.1],
			}),
		).toBe(true);
	} finally {
		rmSync(directory, { recursive: true, force: true });
	}
	const collectionIr = nativeFloat32BoundIr(true);
	const collectionDirectory = mkdtempSync(
		join(tmpdir(), "fcd-268-native-f32-collection-"),
	);
	try {
		const generated = await writeValidators(collectionDirectory, collectionIr);
		const validate = generated.validateNativeFloat32Boundary as (
			value: unknown,
		) => { ok: boolean };
		expect(validate({ value: [0.1, 0.10000000149011612] }).ok).toBe(false);
	} finally {
		rmSync(collectionDirectory, { recursive: true, force: true });
	}
});

it("enforces Float32 rounded uniqueness and maps JSON uniqueness", async () => {
	const ir = uniqueIr();
	const directory = mkdtempSync(join(tmpdir(), "fcd-268-unique-"));
	try {
		const generated = await writeValidators(directory, ir);
		const x = 0.1;
		// AGE-2234: TS compares the nearest binary32 values; JSON Schema's
		// required uniqueItems keyword compares the authored JSON numbers.
		const duplicateAfterRounding = { value: [x, Math.fround(x)] };
		const real = generated.validateUniqueRecord as (value: unknown) => {
			ok: boolean;
		};
		expect(real(duplicateAfterRounding).ok).toBe(false);
		const { ajv, schemas } = jsonSchemas(ir);
		const schema = schemas.find(
			(one) => one.title === "UniqueRecord",
		) as Record<string, unknown>;
		expect(schema.properties).toMatchObject({
			value: { type: "array", uniqueItems: true },
		});
		expect(ajv.getSchema(schema.$id as string)!(duplicateAfterRounding)).toBe(
			true,
		);
		const mutant = await writeValidators(directory, ir, (source) =>
			source.replaceAll("isUniqueFloat32Collection", "isUniqueCollection"),
		);
		expect(mutant.validateUniqueRecord(duplicateAfterRounding).ok).toBe(true);
	} finally {
		rmSync(directory, { recursive: true, force: true });
	}
});

it("keeps the Float32 uniqueness helper on the generated export surface", () => {
	const errors = renderErrors();
	expect(errors).toContain("export function isUniqueFloat32Collection");
	const broken = errors.replace(
		"export function isUniqueFloat32Collection",
		"function isUniqueFloat32Collection",
	);
	expect(broken).not.toContain("export function isUniqueFloat32Collection");
});

it("renders native nullable wide collections with the dedicated serde adapter", () => {
	const ir = nativeNullableCollectionIr();
	const generated = emitCrate(
		{ ir, outputRoot: "generated/rust", limits } as never,
		{ licenseText: "" },
	);
	expect(generated.diagnostics.filter((one) => one.blocking)).toEqual([]);
	const files = new Map<string, string>(
		generated.files as readonly (readonly [string, string])[],
	);
	const recordSource =
		files.get("src/types/native_nullable_wide_collection.rs") ?? "";
	expect(recordSource).not.toBe("");
	const support = files.get("src/support.rs") ?? "";
	expect(support).toContain("pub mod wide_vec_nullable");
	expect(support.match(/pub fn parse_canonical_integer/g) ?? []).toHaveLength(
		1,
	);
	expect(support.match(/wire\.parse::<(?!T>)/g)).toBeNull();
	// Mutation: using the scalar adapter for Vec<Nullable<T>> would be a type
	// error in the generated crate and is deliberately rejected by this probe.
	expect(recordSource).toContain('with = "crate::support::wide_vec_nullable"');
	expect(
		recordSource.replaceAll("wide_vec_nullable", "wide_i64"),
	).not.toContain('with = "crate::support::wide_vec_nullable"');
	const impossible = emitCrate(
		{
			ir: nativeNullableCollectionIr(true),
			outputRoot: "generated/rust",
			limits,
		} as never,
		{ licenseText: "" },
	);
	const impossibleRecord = new Map<string, string>(
		impossible.files as readonly (readonly [string, string])[],
	).get("src/types/native_nullable_wide_collection.rs");
	// The item domain is empty, but a required collection still has the
	// collection constructor's successful return path.
	expect(impossibleRecord).toContain("Ok(Self");
	expect(impossibleRecord).toContain("return Err");
});

/** Trace: FR-066-AC-5. */
it("enforces native Integer enumValues and proves the missing check is red", async () => {
	const ir = nativeIntegerEnumIr();
	const directory = mkdtempSync(join(tmpdir(), "fcd-268-native-enum-"));
	try {
		const generated = await writeValidators(directory, ir);
		const real = generated.validateNativeIntegerEnum as (value: unknown) => {
			ok: boolean;
			errors: { code: string; pointer: string }[];
		};
		expect(real({ value: 1 }).ok).toBe(true);
		const rejected = real({ value: 3 });
		expect(rejected.ok).toBe(false);
		expect(rejected.errors).toContainEqual(
			expect.objectContaining({
				code: "ix://agent-ix/age-2229-regressions/NATIVE_ENUM",
				pointer: "/value",
			}),
		);
		writeFileSync(join(directory, "errors.ts"), renderErrors());
		writeFileSync(
			join(directory, "validators.ts"),
			renderValidators(buildModel(ir)),
		);
		writeFileSync(join(directory, "types.ts"), renderTypes(buildModel(ir)));
		expect(() => runTsc(directory)).not.toThrow();
		const mutant = await writeValidators(directory, ir, (source) =>
			source.replace("[1, 2].some", "[1, 2, 3].some"),
		);
		expect(mutant.validateNativeIntegerEnum({ value: 3 }).ok).toBe(true);
	} finally {
		rmSync(directory, { recursive: true, force: true });
	}
});

/** Trace: FR-066-AC-5. */
it("compares native scalar enum members without coercion or signed-zero drift", async () => {
	const grid = [
		{
			name: "EnumString",
			typeRef: "ix://quire/native/String",
			members: ["red"],
			probes: [
				["red", true],
				["blue", false],
				[42, false],
				[Symbol("red"), false],
				[{ valueOf: () => "red" }, false],
			],
		},
		{
			name: "EnumBoolean",
			typeRef: "ix://quire/native/Boolean",
			members: [true],
			probes: [
				[true, true],
				[false, false],
				[1, false],
				["true", false],
				[Symbol("true"), false],
			],
		},
		{
			name: "EnumIntegerZero",
			typeRef: "ix://quire/native/Integer",
			members: ["0"],
			probes: [
				[0, true],
				[-0, true],
				[1, false],
				["0", false],
				["NaN", false],
				[Symbol("0"), false],
				[{ valueOf: () => 0 }, false],
			],
		},
		{
			name: "EnumWideInteger",
			typeRef: "ix://quire/native/Integer",
			members: ["9007199254740992"],
			probes: [
				["9007199254740992", true],
				["9007199254740993", false],
				[9007199254740992, false],
				[Symbol("wide"), false],
				[{ valueOf: () => "9007199254740992" }, false],
			],
		},
		{
			name: "EnumFloat32",
			typeRef: "ix://quire/native/Float32",
			members: [Math.fround(0.1)],
			probes: [
				[0.1, true],
				[Math.fround(0.1), true],
				[0.2, false],
				["NaN", false],
				[Symbol("0.1"), false],
			],
		},
		{
			name: "EnumFloat32Zero",
			typeRef: "ix://quire/native/Float32",
			members: [0],
			probes: [
				[0, true],
				[-0, true],
				[1, false],
			],
		},
		{
			name: "EnumFloat64Zero",
			typeRef: "ix://quire/native/Float64",
			members: [0],
			probes: [
				[0, true],
				[-0, true],
				[1, false],
				["0", false],
				["NaN", false],
				[Symbol("0"), false],
				[{ valueOf: () => 0 }, false],
			],
		},
		{
			name: "EnumDecimal",
			typeRef: "ix://quire/native/Decimal",
			members: ["1.1"],
			probes: [
				["1.1", true],
				["1.10", true],
				["1.2", false],
				[1.1, false],
				["NaN", false],
				[Symbol("1.1"), false],
				[{ valueOf: () => "1.1" }, false],
			],
		},
	] as const;
	const directory = mkdtempSync(join(tmpdir(), "fcd-268-enum-grid-"));
	try {
		for (const one of grid) {
			const ir = scalarEnumIr(one.name, one.typeRef, [...one.members]);
			expect([...readContractIr(ir)], `${one.name} reader`).toEqual([]);
			const generated = await writeValidators(directory, ir);
			const validate = generated[`validate${one.name}`] as (input: unknown) => {
				ok: boolean;
				errors: { code: string; pointer: string }[];
			};
			const { ajv, schemas } = jsonSchemas(ir);
			const schema = schemas.find(
				(entry) => entry.title === one.name,
			) as Record<string, unknown>;
			const validateJson = ajv.getSchema(schema.$id as string)!;
			for (const [value, expected] of one.probes) {
				const input = { value };
				const result = validate(input);
				expect(
					result.ok,
					`${one.name} TS ${String(value)} ${JSON.stringify(result.errors)}`,
				).toBe(expected);
				if (!expected) {
					expect(result.errors).toContainEqual(
						expect.objectContaining({
							code: "ix://agent-ix/age-2229-regressions/SCALAR_ENUM",
							pointer: "/value",
						}),
					);
				}
				expect(validateJson(input), `${one.name} Ajv ${String(value)}`).toBe(
					expected,
				);
				expect(
					admitInstance(
						{ ir },
						`ix://agent-ix/age-2229-regressions/type/${one.name}`,
						input,
					).ok,
					`${one.name} oracle ${String(value)}`,
				).toBe(expected);
			}
		}
	} finally {
		rmSync(directory, { recursive: true, force: true });
	}
});

/** Trace: FR-066-AC-25. */
it("rejects hostile native bound inputs without coercion or a thrown exception", async () => {
	const cases = [
		["BoundInteger", "ix://quire/native/Integer", "0"],
		["BoundFloat32", "ix://quire/native/Float32", 0],
		["BoundFloat64", "ix://quire/native/Float64", 0],
	] as const;
	const hostile = [
		Symbol("zero"),
		{
			valueOf: () => {
				throw new Error("valueOf must not run");
			},
		},
		{
			[Symbol.toPrimitive]: () => {
				throw new Error("toPrimitive must not run");
			},
		},
	];
	const directory = mkdtempSync(join(tmpdir(), "fcd-268-bound-hostile-"));
	try {
		for (const [name, typeRef, bound] of cases) {
			const ir = nativeBoundIr(name, typeRef, bound);
			expect([...readContractIr(ir)], `${name} reader`).toEqual([]);
			const generated = await writeValidators(directory, ir);
			const validate = generated[`validate${name}`] as (input: unknown) => {
				ok: boolean;
				errors: { code: string; pointer: string }[];
			};
			for (const value of hostile) {
				let result: ReturnType<typeof validate> | undefined;
				expect(() => {
					result = validate({ value });
				}, `${name} must not throw`).not.toThrow();
				expect(result?.ok, `${name} hostile input`).toBe(false);
				expect(result?.errors).toContainEqual(
					expect.objectContaining({
						code: "agent-ix.typescript-backend.SHAPE_MISMATCH",
						pointer: "/value",
					}),
				);
			}
		}
	} finally {
		rmSync(directory, { recursive: true, force: true });
	}
});

/** Trace: FR-144-AC-14. */
it("checks Decimal bounds in the exact instance oracle", async () => {
	const name = "BoundDecimal";
	const ir = nativeBoundIr(name, "ix://quire/native/Decimal", "10.5", "max");
	expect([...readContractIr(ir)]).toEqual([]);
	const directory = mkdtempSync(join(tmpdir(), "fcd-268-decimal-bound-"));
	try {
		const generated = await writeValidators(directory, ir);
		const validate = generated.validateBoundDecimal as (input: unknown) => {
			ok: boolean;
			errors: { code: string; pointer: string }[];
		};
		for (const [value, expected] of [
			["10.50", true],
			["1.10", true],
			["10.51", false],
		] as const) {
			const input = { value };
			const result = validate(input);
			expect(result.ok, `${value} TS`).toBe(expected);
			expect(
				admitInstance(
					{ ir },
					"ix://agent-ix/age-2229-regressions/type/BoundDecimal",
					input,
				).ok,
				`${value} oracle`,
			).toBe(expected);
			if (!expected)
				expect(result.errors).toContainEqual(
					expect.objectContaining({
						code: "ix://agent-ix/age-2229-regressions/NATIVE_BOUND",
						pointer: "/value",
					}),
				);
		}
	} finally {
		rmSync(directory, { recursive: true, force: true });
	}
});

/** Trace: FR-066-AC-19. */
it("typechecks the generated TypeScript export surface and proves an export mutation is red", () => {
	const ir = JSON.parse(
		readFileSync(
			join(root, "test/fixtures/backends/typescript/input/semantic-ir.json"),
			"utf8",
		),
	);
	const generated = typescriptBackend.generate(
		{ ir } as never,
		{
			host: { readText: (path: string) => readFileSync(path, "utf8") },
		} as never,
	) as {
		files: readonly { path: string; text: string }[];
		diagnostics: readonly { blocking: boolean }[];
	};
	expect(generated.diagnostics.filter((one) => one.blocking)).toEqual([]);
	const directory = mkdtempSync(join(tmpdir(), "fcd-268-tsc-"));
	try {
		writeGeneratedFiles(directory, generated.files);
		expect(() => runTsc(directory)).not.toThrow();
		const errors = join(directory, "errors.ts");
		const original = readFileSync(errors, "utf8");
		writeFileSync(
			errors,
			original.replace(
				"export interface ValidationError",
				"interface ValidationError",
			),
		);
		expect(() => runTsc(directory)).toThrow();
	} finally {
		rmSync(directory, { recursive: true, force: true });
	}
});

it("compiles the generated Rust nullable collection with warnings denied and proves an adapter mutation is red", () => {
	const generated = emitCrate(
		{
			ir: nativeNullableCollectionIr(),
			outputRoot: "generated/rust",
			limits,
		} as never,
		{ licenseText: "" },
	);
	expect(generated.diagnostics.filter((one) => one.blocking)).toEqual([]);
	const directory = mkdtempSync(join(tmpdir(), "fcd-268-rust-"));
	try {
		const files = Array.from(generated.files, ([path, text]) => ({
			path,
			text,
		}));
		writeGeneratedFiles(directory, files);
		const runCargo = () =>
			execFileSync("cargo", ["check", "--offline"], {
				cwd: directory,
				encoding: "utf8",
				stdio: "pipe",
				env: {
					...process.env,
					CARGO_TARGET_DIR: join(directory, "target"),
					RUSTFLAGS: "-D warnings",
				},
			});
		expect(runCargo).not.toThrow();
		const support = join(directory, "src/support.rs");
		const original = readFileSync(support, "utf8");
		writeFileSync(
			support,
			original.replace(
				"pub mod wide_vec_nullable",
				"pub mod broken_wide_vec_nullable",
			),
		);
		expect(runCargo).toThrow();
	} finally {
		rmSync(directory, { recursive: true, force: true });
	}
});

it("compiles a required collection whose integer element domain is empty", () => {
	const generated = emitCrate(
		{
			ir: nativeNullableCollectionIr(true, false),
			outputRoot: "generated/rust",
			limits,
		} as never,
		{ licenseText: "" },
	);
	expect(generated.diagnostics.filter((one) => one.blocking)).toEqual([]);
	const directory = mkdtempSync(join(tmpdir(), "fcd-268-rust-required-"));
	try {
		writeGeneratedFiles(
			directory,
			Array.from(generated.files, ([path, text]) => ({ path, text })),
		);
		try {
			execFileSync("cargo", ["check", "--offline"], {
				cwd: directory,
				encoding: "utf8",
				stdio: "pipe",
				env: {
					...process.env,
					CARGO_TARGET_DIR: join(directory, "target"),
					RUSTFLAGS: "-D warnings",
				},
			});
		} catch (error) {
			const stderr = (error as { stderr?: Buffer }).stderr?.toString();
			throw new Error(stderr ?? String(error));
		}
	} finally {
		rmSync(directory, { recursive: true, force: true });
	}
});
