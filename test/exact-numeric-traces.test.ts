import { execFileSync } from "node:child_process";
import {
	appendFileSync,
	mkdtempSync,
	mkdirSync,
	readdirSync,
	rmSync,
	statSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { expect, it } from "vitest";
import { jsonSchemaBackend } from "../src/compiler/backends/json-schema-v1/index.mjs";
import { emitCrate } from "../src/compiler/backends/rust-serde/crate.mjs";
import { buildModel } from "../src/compiler/backends/typescript-v1/model.mjs";
import {
	renderErrors,
	renderValidators,
} from "../src/compiler/backends/typescript-v1/validators.mjs";

const PACKAGE = "ix://agent-ix/exact-numeric";
const type = (name: string) => `${PACKAGE}/type/${name}`;
const constraint = (owner: string, keyword: string, value: string) => ({
	identity: `${PACKAGE}/constraint/${owner}-${keyword}`,
	keyword,
	operands: { value },
	appliesTo: type(owner),
	diagnosticCode: `agent-ix.exact-numeric.${owner.toUpperCase()}_${keyword.toUpperCase()}`,
});

function numericIr(): any {
	const decimal = {
		identity: type("Decimal"),
		displayName: "Decimal",
		kind: "scalar",
		scalar: "decimal",
		decimal: { precision: 5, scale: 2 },
		constraints: [],
		extensions: [],
	};
	const decimalAlias = {
		identity: type("DecimalAlias"),
		displayName: "DecimalAlias",
		kind: "alias",
		target: type("Decimal"),
		constraints: [],
		extensions: [],
	};
	const deepDecimalAlias = {
		identity: type("DeepDecimalAlias"),
		displayName: "DeepDecimalAlias",
		kind: "alias",
		target: type("DecimalAlias"),
		constraints: [],
		extensions: [],
	};
	const decimalList = {
		identity: type("DecimalList"),
		displayName: "DecimalList",
		kind: "sequence",
		items: type("DecimalAlias"),
		constraints: [
			{
				identity: `${PACKAGE}/constraint/DecimalList-unique`,
				keyword: "unique",
				operands: {},
				appliesTo: type("DecimalList"),
				diagnosticCode: `${PACKAGE}/DECIMAL_LIST_UNIQUE`,
			},
		],
		extensions: [],
	};
	const decimalEnum = {
		identity: type("DecimalEnum"),
		displayName: "DecimalEnum",
		kind: "alias",
		target: type("Decimal"),
		constraints: [
			{
				...constraint("DecimalEnum", "enumValues", "1.1"),
				operands: { values: ["1.1"] },
			},
		],
		extensions: [],
	};
	const decimalBounded = {
		identity: type("DecimalBounded"),
		displayName: "DecimalBounded",
		kind: "alias",
		target: type("Decimal"),
		constraints: [constraint("DecimalBounded", "min", "1.1")],
		extensions: [],
	};
	const decimalCollection = {
		identity: type("DecimalCollection"),
		displayName: "DecimalCollection",
		kind: "record",
		unknownPolicy: "reject",
		fields: [
			{
				identity: `${PACKAGE}/field/DecimalCollection-values`,
				name: "values",
				typeRef: type("DecimalAlias"),
				constraints: [],
				presence: "required",
				nullable: false,
				multiplicity: { lower: 1, upper: 2, ordered: true, unique: true },
				extensions: [],
			},
		],
		extensions: [],
	};
	const directDecimalCollection = {
		identity: type("DirectDecimalCollection"),
		displayName: "DirectDecimalCollection",
		kind: "record",
		unknownPolicy: "reject",
		fields: [
			{
				identity: `${PACKAGE}/field/DirectDecimalCollection-single`,
				name: "single",
				typeRef: "ix://quire/native/Decimal",
				constraints: [],
				decimal: { precision: 5, scale: 2 },
				presence: "optional",
				nullable: false,
				multiplicity: { lower: 0, upper: 1, ordered: false, unique: false },
				extensions: [],
			},
			{
				identity: `${PACKAGE}/field/DirectDecimalCollection-nullable`,
				name: "nullable",
				typeRef: "ix://quire/native/Decimal",
				constraints: [],
				decimal: { precision: 5, scale: 2 },
				presence: "optional",
				nullable: true,
				multiplicity: { lower: 0, upper: 1, ordered: false, unique: false },
				extensions: [],
			},
			{
				identity: `${PACKAGE}/field/DirectDecimalCollection-values`,
				name: "values",
				typeRef: "ix://quire/native/Decimal",
				constraints: [],
				decimal: { precision: 5, scale: 2 },
				presence: "required",
				nullable: false,
				multiplicity: { lower: 1, upper: 2, ordered: true, unique: true },
				extensions: [],
			},
		],
		extensions: [],
	};
	const nullableDecimalCollection = {
		identity: type("NullableDecimalCollection"),
		displayName: "NullableDecimalCollection",
		kind: "record",
		unknownPolicy: "reject",
		fields: [
			{
				identity: `${PACKAGE}/field/NullableDecimalCollection-values`,
				name: "values",
				typeRef: type("DecimalAlias"),
				constraints: [],
				presence: "required",
				nullable: true,
				multiplicity: { lower: 1, upper: 3, ordered: true, unique: true },
				extensions: [],
			},
		],
		extensions: [],
	};
	const nestedDecimalRoutes = {
		identity: type("NestedDecimalRoutes"),
		displayName: "NestedDecimalRoutes",
		kind: "record",
		unknownPolicy: "reject",
		fields: [
			{
				identity: `${PACKAGE}/field/NestedDecimalRoutes-maybe`,
				name: "maybe",
				typeRef: type("DeepDecimalAlias"),
				constraints: [],
				presence: "optional",
				nullable: false,
				multiplicity: { lower: 0, upper: 1, ordered: false, unique: false },
				extensions: [],
			},
			{
				identity: `${PACKAGE}/field/NestedDecimalRoutes-items`,
				name: "items",
				typeRef: type("DeepDecimalAlias"),
				constraints: [],
				presence: "required",
				nullable: false,
				multiplicity: { lower: 1, upper: 3, ordered: true, unique: false },
				extensions: [],
			},
			{
				identity: `${PACKAGE}/field/NestedDecimalRoutes-nullable`,
				name: "nullable",
				typeRef: type("DeepDecimalAlias"),
				constraints: [],
				presence: "optional",
				nullable: true,
				multiplicity: { lower: 0, upper: 1, ordered: false, unique: false },
				extensions: [],
			},
		],
		extensions: [],
	};
	const runtimeNumeric = {
		identity: type("RuntimeNumeric"),
		displayName: "RuntimeNumeric",
		kind: "record",
		unknownPolicy: "reject",
		fields: [
			...[["decimal", "DecimalAlias"]].map(([name, target]) => ({
				identity: `${PACKAGE}/field/RuntimeNumeric-${name}`,
				name,
				typeRef: type(target),
				constraints: [],
				presence: "required",
				nullable: false,
				multiplicity: { lower: 1, upper: 1, ordered: false, unique: false },
				extensions: [],
			})),
		],
		extensions: [],
	};
	const types: any[] = [
		decimal,
		decimalAlias,
		deepDecimalAlias,
		decimalEnum,
		decimalBounded,
		decimalList,
		decimalCollection,
		directDecimalCollection,
		nullableDecimalCollection,
		nestedDecimalRoutes,
		runtimeNumeric,
	];
	const origin = {
		source: {
			sourceIdentity: "ix://agent-ix/exact-numeric/source/test",
			path: "numeric.json",
			startLine: 1,
			startColumn: 1,
		},
	};
	for (const definition of types) {
		definition.roles ??= [];
		definition.origin ??= origin;
		definition.unknownPolicy ??= "reject";
		definition.constraints ??= [];
		for (const one of definition.constraints ?? []) one.origin ??= origin;
		for (const field of definition.fields ?? []) {
			field.origin ??= origin;
			field.defaultKind ??= "none";
			for (const one of field.constraints ?? []) one.origin ??= origin;
		}
	}
	return {
		contractVersion: "2.0.0",
		source: {
			identity: "ix://agent-ix/exact-numeric/source/test",
			version: "1.0.0",
			dialect: "typespec",
			digest: `sha256:${"0".repeat(64)}`,
		},
		package: {
			identity: "agent-ix/exact-numeric",
			version: "1.0.0",
			manifestDigest: `sha256:${"1".repeat(64)}`,
			mappingVersions: ["1.0.0"],
			profileVersions: ["1.0.0"],
			lockDigest: `sha256:${"2".repeat(64)}`,
		},
		constructs: [],
		types,
		occurrences: [],
		extensions: [],
	};
}

/**
 * Rust serde's field-check matrix.  The generated crate below is compiled by
 * the Rust boundary test, so every shape in this record is checked by rustc:
 * native and named scalar values, collections, nullable values, optional
 * values, and a semantic default.
 */
function wrapperFieldMatrixIr(): any {
	const ir = structuredClone(numericIr());
	const namedText = {
		identity: type("NamedText"),
		displayName: "NamedText",
		kind: "scalar",
		scalar: "string",
		constraints: [],
		extensions: [],
	};
	const namedDecimal = {
		identity: type("NamedDecimal"),
		displayName: "NamedDecimal",
		kind: "scalar",
		scalar: "decimal",
		decimal: { precision: 5, scale: 2 },
		constraints: [],
		extensions: [],
	};
	const fieldIdentity = (name: string) =>
		type(`WrapperFieldMatrix-field-${name}`);
	const minLength = (identity: string) => ({
		identity: `${identity}-minLength`,
		keyword: "minLength",
		operands: { value: 1 },
		appliesTo: identity,
		diagnosticCode: "agent-ix.exact-numeric.WRAPPER_MIN_LENGTH",
	});
	const minDecimal = (identity: string) => ({
		identity: `${identity}-min`,
		keyword: "min",
		operands: { value: "0.1" },
		appliesTo: identity,
		diagnosticCode: "agent-ix.exact-numeric.WRAPPER_MIN_DECIMAL",
	});
	const field = (
		name: string,
		typeRef: string,
		multiplicity: {
			lower: number;
			upper?: number;
			ordered: boolean;
			unique: boolean;
		},
		nullable: boolean,
		constraints: unknown[] = [],
		defaultValue?: unknown,
	) => ({
		identity: fieldIdentity(name),
		name,
		typeRef,
		constraints,
		presence: multiplicity.lower === 0 ? "optional" : "required",
		nullable,
		multiplicity,
		...(defaultValue === undefined
			? { defaultKind: "none" }
			: { defaultKind: "semantic", defaultValue }),
		extensions: [],
	});
	const matrix = {
		identity: type("WrapperFieldMatrix"),
		displayName: "WrapperFieldMatrix",
		kind: "record",
		unknownPolicy: "reject",
		fields: [
			field(
				"native_scalar",
				"ix://quire/native/String",
				{ lower: 1, upper: 1, ordered: false, unique: false },
				false,
				[],
			),
			field(
				"native_collection",
				"ix://quire/native/String",
				{ lower: 1, upper: 3, ordered: true, unique: false },
				false,
				[],
			),
			field(
				"required_text",
				namedText.identity,
				{ lower: 1, upper: 1, ordered: false, unique: false },
				false,
				[minLength(fieldIdentity("required_text"))],
			),
			field(
				"optional_text",
				namedText.identity,
				{ lower: 0, upper: 1, ordered: false, unique: false },
				false,
				[minLength(fieldIdentity("optional_text"))],
			),
			field(
				"nullable_text",
				namedText.identity,
				{ lower: 1, upper: 1, ordered: false, unique: false },
				true,
				[minLength(fieldIdentity("nullable_text"))],
			),
			field(
				"text_items",
				namedText.identity,
				{ lower: 1, upper: 3, ordered: true, unique: false },
				false,
				[minLength(fieldIdentity("text_items"))],
			),
			field(
				"nullable_decimal",
				namedDecimal.identity,
				{ lower: 0, upper: 1, ordered: false, unique: false },
				true,
				[minDecimal(fieldIdentity("nullable_decimal"))],
			),
			field(
				"optional_decimal_items",
				namedDecimal.identity,
				{ lower: 0, upper: 3, ordered: true, unique: false },
				true,
				[minDecimal(fieldIdentity("optional_decimal_items"))],
			),
			field(
				"required_default",
				namedText.identity,
				{ lower: 1, upper: 1, ordered: false, unique: false },
				false,
				[],
				"hello",
			),
		],
		extensions: [],
	};
	ir.types.push(namedText, namedDecimal, matrix);
	const origin = ir.source;
	for (const definition of [namedText, namedDecimal, matrix] as any[]) {
		definition.roles = [];
		definition.constraints ??= [];
		definition.unknownPolicy ??= "reject";
		definition.origin = {
			source: {
				sourceIdentity: origin.identity,
				path: "numeric.json",
				startLine: 1,
				startColumn: 1,
			},
		};
		for (const one of definition.fields ?? []) {
			one.origin = definition.origin;
			for (const constraint of one.constraints ?? [])
				constraint.origin = definition.origin;
		}
	}
	return ir;
}

function jsonSafeIr() {
	const ir = structuredClone(numericIr());
	ir.types = ir.types.filter(
		(type: { displayName: string }) =>
			!new Set([
				"DecimalCollection",
				"DirectDecimalCollection",
				"NullableDecimalCollection",
				"DecimalBounded",
				"DecimalEnum",
				"DecimalList",
			]).has(type.displayName),
	);
	return ir;
}

function typescriptSafeIr() {
	const ir = structuredClone(numericIr());
	const omitted = new Set([
		"DirectDecimalCollection",
		"NullableDecimalCollection",
	]);
	ir.types = ir.types.filter(
		(type: { displayName: string }) => !omitted.has(type.displayName),
	);
	return ir;
}

const RUST_LIMITS = {
	maxInputBytes: 33554432,
	maxDepth: 256,
	maxNodes: 1000000,
	maxCollectionItems: 100000,
	maxDiagnostics: 1000,
};

function filesUnder(directory: string): string[] {
	return readdirSync(directory).flatMap((name) => {
		const path = resolve(directory, name);
		return statSync(path).isDirectory()
			? filesUnder(path)
			: path.endsWith(".ts")
				? [path]
				: [];
	});
}

async function generatedNumericValidators(directory: string) {
	const generated = resolve(directory, "generated");
	const compiled = resolve(directory, "compiled");
	const irPath = resolve(directory, "numeric.json");
	writeFileSync(irPath, `${JSON.stringify(typescriptSafeIr())}\n`, "utf8");
	const generator = resolve("src/compiler/cli.mjs");
	const tsc = resolve("node_modules/.bin/tsc");
	execFileSync(
		process.execPath,
		[
			generator,
			"generate",
			"--ir",
			irPath,
			"--target",
			"typescript",
			"--out-root",
			generated,
		],
		{ cwd: resolve("."), stdio: "pipe" },
	);
	mkdirSync(compiled, { recursive: true });
	execFileSync(
		tsc,
		[
			"--target",
			"ES2022",
			"--module",
			"NodeNext",
			"--moduleResolution",
			"NodeNext",
			"--outDir",
			compiled,
			...filesUnder(generated),
		],
		{ cwd: resolve("."), stdio: "pipe" },
	);
	return import(
		`${pathToFileURL(resolve(compiled, "index.js")).href}?${Date.now()}`
	) as Promise<Record<string, unknown>>;
}

/** Trace: FR-144-AC-19. */
it("renders decimal equality and uniqueness checks in the generated validator", () => {
	const model = buildModel(numericIr() as never);
	const source = `${renderErrors()}\n${renderValidators(model)}`;
	expect(source).toContain("compareDecimal(member, candidate) === 0");
	expect(source).toContain("isUniqueDecimalCollection(candidate)");
	expect(source).toContain("const scale = Math.max(a.scale, b.scale);");
	expect(source).toContain(
		'const normalizedFraction = fraction.replace(/0+$/, "")',
	);
	expect(source).toContain(
		'["1.1"].some((member) => compareDecimal(member, candidate) === 0)',
	);
});

/** Traces: FR-144-AC-13, FR-144-AC-17, FR-144-AC-19. */
it("executes Rust decimal read/write boundaries", () => {
	const result = emitCrate(
		{
			ir: wrapperFieldMatrixIr(),
			outputRoot: "generated/rust",
			limits: RUST_LIMITS,
		} as never,
		{ licenseText: "" },
	);
	expect(result.diagnostics.filter((one) => one.blocking)).toEqual([]);
	const rust = [...result.files]
		.filter(([path]) => path.endsWith(".rs"))
		.map(([, text]) => text)
		.join("\n");
	expect(rust).toContain("crate::support::Decimal");
	expect(rust).toContain("decimal_cmp");
	expect(rust).toContain("decimal_normalize");
	expect(rust).toMatch(/normalize_decimal_[0-9]+/);
	expect(rust).toContain("serialize_str");
	expect(rust).toContain("String::deserialize");
	expect(rust).toContain("pub struct RuntimeNumeric");
	expect(rust).toContain("impl<'de> Deserialize");
	expect(rust).toContain("impl Serialize");
	expect(rust).toContain("pub struct DecimalAlias");
	const scratch = mkdtempSync(join(tmpdir(), "fcd-exact-numeric-rust-"));
	try {
		for (const [path, text] of result.files) {
			const destination = join(scratch, path);
			mkdirSync(resolve(destination, ".."), { recursive: true });
			writeFileSync(destination, text, "utf8");
		}
		appendFileSync(
			join(scratch, "Cargo.toml"),
			'\n[dev-dependencies]\nserde_json = "1.0.145"\n',
		);
		mkdirSync(join(scratch, "tests"), { recursive: true });
		writeFileSync(
			join(scratch, "tests", "exact_numeric.rs"),
			`#![allow(missing_docs)]

use agent_ix_exact_numeric::{
    DecimalAlias, DecimalBounded, DecimalEnum, DecimalList, DeepDecimalAlias,
    DirectDecimalCollection, NestedDecimalRoutes, NullableDecimalCollection,
    RuntimeNumeric, WrapperFieldMatrix,
};

#[test]
fn decimal_boundaries_round_trip() {
    let value: RuntimeNumeric = serde_json::from_str(
        r#"{"decimal":"1.10"}"#,
    ).unwrap();
    let wire = serde_json::to_string(&value).unwrap();
    assert!(wire.contains(r#""decimal":"1.10""#));
    assert!(serde_json::from_str::<RuntimeNumeric>(
        r#"{"decimal":"1.001"}"#,
    ).is_err());
    let one: DecimalAlias = serde_json::from_str(r#""1.1""#).unwrap();
    let padded: DecimalAlias = serde_json::from_str(r#""1.10""#).unwrap();
    assert_eq!(serde_json::to_string(&one).unwrap(), r#""1.10""#);
    assert_eq!(serde_json::to_string(&padded).unwrap(), r#""1.10""#);
    let deep: DeepDecimalAlias = serde_json::from_str(r#""1.1""#).unwrap();
    assert_eq!(serde_json::to_string(&deep).unwrap(), r#""1.10""#);
    let member: DecimalEnum = serde_json::from_str(r#""1.10""#).unwrap();
    assert_eq!(serde_json::to_string(&member).unwrap(), r#""1.10""#);
    assert!(serde_json::from_str::<DecimalEnum>(r#""1.2""#).is_err());
    assert!(serde_json::from_str::<DecimalList>(r#"["1.1","1.10"]"#).is_err());
    let bounded: DecimalBounded = serde_json::from_str(r#""1.1""#).unwrap();
    assert_eq!(serde_json::to_string(&bounded).unwrap(), r#""1.10""#);
    assert!(serde_json::from_str::<DecimalBounded>(r#""1.0""#).is_err());
    assert!(serde_json::from_str::<DecimalBounded>(r#""1234.1""#).is_err());
    let direct: DirectDecimalCollection = serde_json::from_str(
        r#"{"single":"1.1","nullable":"1.1","values":["1.1"]}"#,
    ).unwrap();
    let direct_wire = serde_json::to_string(&direct).unwrap();
    assert!(direct_wire.contains(r#""single":"1.10""#));
    assert!(direct_wire.contains(r#""nullable":"1.10""#));
    assert!(direct_wire.contains(r#""values":["1.10"]"#));
    assert!(serde_json::from_str::<DirectDecimalCollection>(
        r#"{"single":"1.001","values":["1.1"]}"#,
    ).is_err());
    assert!(serde_json::from_str::<DirectDecimalCollection>(
        r#"{"values":["1.1","1.10"]}"#,
    ).is_err());
    assert!(serde_json::from_str::<NullableDecimalCollection>(
        r#"{"values":[null,"1.1","1.10"]}"#,
    ).is_err());
    let nested: NestedDecimalRoutes = serde_json::from_str(
        r#"{"maybe":"1.1","items":["1.1"],"nullable":"1.10"}"#,
    ).unwrap();
    let nested_wire = serde_json::to_string(&nested).unwrap();
    assert!(nested_wire.contains(r#""maybe":"1.10""#));
    assert!(nested_wire.contains(r#""items":["1.10"]"#));
    assert!(nested_wire.contains(r#""nullable":"1.10""#));
    let absent: NestedDecimalRoutes =
        serde_json::from_str(r#"{"items":["1.1"]}"#).unwrap();
    assert!(serde_json::to_string(&absent).unwrap().contains(r#""items":["1.10"]"#));
    assert!(serde_json::from_str::<NestedDecimalRoutes>(
        r#"{"items":["1234.1"]}"#,
    ).is_err());
}

#[test]
fn field_check_matrix_compiles_and_validates() {
    let valid: WrapperFieldMatrix = serde_json::from_str(
        r#"{"native_scalar":"ok","native_collection":["ok"],"required_text":"ok","nullable_text":null,"text_items":["ok"],"nullable_decimal":"0.10","optional_decimal_items":[null,"0.10"],"required_default":"hello"}"#,
    ).unwrap();
    let wire = serde_json::to_string(&valid).unwrap();
    assert!(wire.contains(r#""required_text":"ok""#));
    assert!(serde_json::from_str::<WrapperFieldMatrix>(
        r#"{"native_scalar":"ok","native_collection":["ok"],"required_text":"","nullable_text":null,"text_items":["ok"],"required_default":"hello"}"#,
    ).is_err());
    assert!(serde_json::from_str::<WrapperFieldMatrix>(
        r#"{"native_scalar":"ok","native_collection":["ok"],"required_text":"ok","nullable_text":null,"text_items":[""],"required_default":"hello"}"#,
    ).is_err());
}
`,
			"utf8",
		);
		execFileSync(
			"cargo",
			[
				"test",
				"--offline",
				"--manifest-path",
				join(scratch, "Cargo.toml"),
				"--test",
				"exact_numeric",
			],
			{ cwd: scratch, stdio: "pipe", env: process.env },
		);
	} finally {
		rmSync(scratch, { recursive: true, force: true });
	}
});

/** Traces: FR-144-AC-15, FR-144-AC-19. */
it("executes decimal enum equality and unique collection rejection", async () => {
	const scratch = mkdtempSync(join(tmpdir(), "fcd-exact-numeric-ts-"));
	try {
		const generated = await generatedNumericValidators(scratch);
		const validateEnum = generated.validateDecimalEnum as (value: unknown) => {
			ok: boolean;
		};
		const validateCollection = generated.validateDecimalCollection as (
			value: unknown,
		) => { ok: boolean };
		expect(validateEnum("1.10").ok).toBe(true);
		expect(validateEnum("1.2").ok).toBe(false);
		expect(validateCollection({ values: ["1.1", "1.10"] }).ok).toBe(false);
		expect(validateCollection({ values: ["1.1", "1.2"] }).ok).toBe(true);
	} finally {
		rmSync(scratch, { recursive: true, force: true });
	}
});

/** Traces: FR-144-AC-15, FR-144-AC-19. */
it("renders normalized Decimal forms and refuses alias, bound, and native losses", () => {
	const scalarIr = structuredClone(numericIr());
	scalarIr.types = scalarIr.types.filter(
		(type: { displayName: string }) => type.displayName === "Decimal",
	);
	const scalarResult = jsonSchemaBackend.generate({ ir: scalarIr } as never);
	expect(scalarResult.state).toBe("success");
	const scalarSchema = JSON.parse(
		scalarResult.files.find((file) => file.path === "Decimal.json")?.text ??
			"{}",
	);
	const decimalPattern = new RegExp(scalarSchema.pattern);
	for (const value of ["1.10", "0.00", "999.90"]) {
		expect(decimalPattern.test(value)).toBe(true);
	}

	const aliasBoundedIr = structuredClone(numericIr());
	aliasBoundedIr.types = aliasBoundedIr.types.filter(
		(type: { displayName: string }) =>
			["Decimal", "DecimalBounded"].includes(type.displayName),
	);
	const aliasBounded = jsonSchemaBackend.generate({
		ir: aliasBoundedIr,
	} as never);
	expect(aliasBounded.state).toBe("unsupported");
	expect(aliasBounded.diagnostics[0].message).toContain("decimal min");

	const enumIr = structuredClone(numericIr());
	enumIr.types = enumIr.types.filter((type: { displayName: string }) =>
		["Decimal", "DecimalEnum"].includes(type.displayName),
	);
	const enumResult = jsonSchemaBackend.generate({ ir: enumIr } as never);
	expect(enumResult.state).toBe("success");
	const enumSchema = JSON.parse(
		enumResult.files.find((file) => file.path === "DecimalEnum.json")?.text ??
			"{}",
	);
	const enumPattern = new RegExp(enumSchema.pattern);
	expect(enumPattern.test("1.1")).toBe(true);
	expect(enumPattern.test("1.10")).toBe(true);
	expect(enumPattern.test("1.2")).toBe(false);

	const aliasPolicyIr = structuredClone(enumIr);
	(
		aliasPolicyIr.types.find(
			(type: { displayName: string }) => type.displayName === "DecimalEnum",
		) as { decimal?: unknown }
	).decimal = { precision: 3, scale: 1 };
	const aliasPolicyResult = jsonSchemaBackend.generate({
		ir: aliasPolicyIr,
	} as never);
	const aliasPolicySchema = JSON.parse(
		aliasPolicyResult.files.find((file) => file.path === "DecimalEnum.json")
			?.text ?? "{}",
	);
	const aliasPolicyPattern = new RegExp(aliasPolicySchema.pattern);
	expect(aliasPolicyPattern.test("1.1")).toBe(true);
	expect(aliasPolicyPattern.test("1.10")).toBe(false);

	const fieldPolicyIr = structuredClone(numericIr());
	fieldPolicyIr.types = fieldPolicyIr.types.filter(
		(type: { displayName: string }) =>
			["Decimal", "DecimalAlias", "RuntimeNumeric"].includes(type.displayName),
	);
	const runtime = fieldPolicyIr.types.find(
		(type: { displayName: string }) => type.displayName === "RuntimeNumeric",
	);
	const decimalField = runtime.fields[0];
	decimalField.decimal = { precision: 3, scale: 1 };
	decimalField.constraints = [
		{
			identity: `${decimalField.identity}-enum`,
			keyword: "enumValues",
			operands: { values: ["1.1"] },
			appliesTo: decimalField.identity,
			diagnosticCode: "agent-ix.exact-numeric.RUNTIME_DECIMAL_ENUM",
		},
	];
	const fieldPolicyResult = jsonSchemaBackend.generate({
		ir: fieldPolicyIr,
	} as never);
	const fieldPolicySchema = JSON.parse(
		fieldPolicyResult.files.find((file) => file.path === "RuntimeNumeric.json")
			?.text ?? "{}",
	);
	const fieldPolicyPattern = new RegExp(
		fieldPolicySchema.properties.decimal.pattern,
	);
	expect(fieldPolicyPattern.test("1.1")).toBe(true);
	expect(fieldPolicyPattern.test("1.10")).toBe(false);

	const nativeUniqueIr = structuredClone(numericIr());
	nativeUniqueIr.types = nativeUniqueIr.types.filter(
		(type: { displayName: string }) =>
			type.displayName === "DirectDecimalCollection",
	);
	const nativeUnique = jsonSchemaBackend.generate({
		ir: nativeUniqueIr,
	} as never);
	expect(nativeUnique.state).toBe("unsupported");
	expect(nativeUnique.diagnostics[0].message).toContain("decimal uniqueness");

	const sequenceUniqueIr = structuredClone(numericIr());
	sequenceUniqueIr.types = sequenceUniqueIr.types.filter(
		(type: { displayName: string }) =>
			["Decimal", "DecimalAlias", "DecimalList"].includes(type.displayName),
	);
	const sequenceUnique = jsonSchemaBackend.generate({
		ir: sequenceUniqueIr,
	} as never);
	expect(sequenceUnique.state).toBe("unsupported");
	expect(sequenceUnique.files).toEqual([]);
	expect(sequenceUnique.diagnostics[0].message).toContain("decimal uniqueness");
});

/** Traces: FR-144-AC-15, FR-144-AC-19. */
it("refuses JSON Schema decimal bounds and decimal unique collections as declared loss", () => {
	const bounded = structuredClone(jsonSafeIr());
	const decimal = bounded.types.find(
		(type: { displayName: string }) => type.displayName === "Decimal",
	);
	decimal.constraints.push(constraint("Decimal", "max", "1.5"));
	const boundResult = jsonSchemaBackend.generate({ ir: bounded } as never);
	expect(boundResult.state).toBe("unsupported");
	expect(boundResult.files).toEqual([]);
	expect(boundResult.diagnostics).toHaveLength(1);
	expect(boundResult.diagnostics[0].code).toBe(
		"agent-ix.compiler.UNDECLARED_LOSS",
	);
	const aliasUniqueIr = structuredClone(numericIr());
	aliasUniqueIr.types = aliasUniqueIr.types.filter(
		(type: { displayName: string }) =>
			["DecimalCollection", "DecimalAlias", "Decimal"].includes(
				type.displayName,
			),
	);
	const uniqueResult = jsonSchemaBackend.generate({
		ir: aliasUniqueIr,
	} as never);
	expect(uniqueResult.state).toBe("unsupported");
	expect(uniqueResult.files).toEqual([]);
	expect(uniqueResult.diagnostics[0].message).toContain("decimal uniqueness");
});
