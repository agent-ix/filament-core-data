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

function jsonSafeIr() {
	const ir = structuredClone(numericIr());
	ir.types = ir.types.filter(
		(type: { displayName: string }) =>
			!new Set([
				"DecimalCollection",
				"DirectDecimalCollection",
				"NullableDecimalCollection",
				"DecimalBounded",
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
			ir: numericIr(),
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
	expect(rust).toContain("normalize_decimal_12");
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
			`use exact_numeric::{
    DecimalAlias, DecimalBounded, DecimalEnum, DecimalList, DeepDecimalAlias,
    DirectDecimalCollection, NestedDecimalRoutes, NullableDecimalCollection,
    RuntimeNumeric,
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
	const uniqueResult = jsonSchemaBackend.generate({ ir: numericIr() } as never);
	expect(uniqueResult.state).toBe("unsupported");
	expect(uniqueResult.files).toEqual([]);
	expect(uniqueResult.diagnostics[0].message).toContain("decimal uniqueness");
});
