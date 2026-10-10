import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import { expect, it } from "vitest";
import { jsonSchemaBackend } from "../src/compiler/backends/json-schema-v1/index.mjs";
import { pythonPydanticBackend } from "../src/compiler/backends/python-v1/index.mjs";
import { poetryProducer } from "../src/compiler/backends/python-v1/produce.mjs";
import { emitCrate } from "../src/compiler/backends/rust-serde/crate.mjs";
import { buildModel } from "../src/compiler/backends/typescript-v1/model.mjs";
import {
	renderErrors,
	renderValidators,
} from "../src/compiler/backends/typescript-v1/validators.mjs";
import { readContractIr } from "../src/compiler/ir/reader.mjs";
import * as conformanceOracle from "../conformance/oracle/oracle.mjs";
import {
	buildMatrixIr,
	buildDifferentialFuzzCases,
	buildDifferentialFuzzIr,
	cellRecordName,
	cellValue,
	cellHasValidProbe,
	inlineWideInteger,
	MATRIX_COLUMNS,
	MATRIX_CELLS,
} from "../scripts/age-2229-numeric-matrix.mjs";

const typescript = createRequire(resolve("package.json"))("typescript");

const RUST_LIMITS = {
	maxInputBytes: 33_554_432,
	maxDepth: 256,
	maxNodes: 1_000_000,
	maxCollectionItems: 100_000,
	maxDiagnostics: 1_000,
};

function nullableValue(cell: (typeof MATRIX_CELLS)[number]) {
	if (cell.nesting === "nested") return { nested: null };
	return { value: null };
}

// The Rust mapping table's collection/nullable row is Vec<Nullable<T>>;
// keep this probe distinct from the shared TypeScript/JSON field-null probe.
function rustNullableValue(cell: (typeof MATRIX_CELLS)[number]) {
	if (cell.nesting === "collection") return { value: [null] };
	return nullableValue(cell);
}

function rustTypeName(cell: (typeof MATRIX_CELLS)[number]) {
	return cellRecordName(cell)
		.split("_")
		.map((part) => part[0].toUpperCase() + part.slice(1))
		.join("");
}

function numericIntegerProbe(cell: (typeof MATRIX_CELLS)[number]) {
	return { value: 5 };
}

function fuzzRecordValue(testCase: ReturnType<typeof buildDifferentialFuzzCases>[number], value: unknown) {
	const fieldValue = testCase.nesting === "collection" ? [value] : value;
	return { value: fieldValue };
}

function fuzzOracleOutcome(
	ir: ReturnType<typeof buildDifferentialFuzzIr>,
	testCase: ReturnType<typeof buildDifferentialFuzzCases>[number],
	value: unknown,
) {
	return conformanceOracle.admitInstance(
		{ ir },
		`ix://agent-ix/age-2229-numeric-matrix/type/${testCase.name}`,
		fuzzRecordValue(testCase, value),
		testCase,
	);
}

/** FR-144: an omitted upper bound defaults to MAX_SAFE_INTEGER. */
it("rejects an integer-only-min probe outside the effective safe range", () => {
	const fuzzCases = buildDifferentialFuzzCases();
	expect(fuzzCases[0]).toMatchObject({
		baseType: "integer",
		center: 2n ** 53n,
		shape: "min",
		wire: "string",
	});
	const fuzzOutcome = fuzzOracleOutcome(
		buildDifferentialFuzzIr(),
		fuzzCases[0],
		fuzzCases[0].probes.valid,
	);
	expect(fuzzOutcome.ok).toBe(false);

	const baseIdentity = "ix://agent-ix/age-2229-numeric-matrix/type/EffectiveRangeBase";
	const recordIdentity = "ix://agent-ix/age-2229-numeric-matrix/type/EffectiveRange";
	const ir = {
		contractVersion: "2.0.0",
		types: [
			{
				identity: baseIdentity,
				displayName: "EffectiveRangeBase",
				kind: "scalar",
				scalar: "integer",
				constraints: [
					{
						identity: `${recordIdentity}/constraint/min`,
						keyword: "min",
						operands: { value: "9007199254740992" },
						appliesTo: baseIdentity,
						diagnosticCode: "agent-ix.probe.EFFECTIVE_RANGE_MIN",
					},
				],
			},
			{
				identity: recordIdentity,
				displayName: "EffectiveRange",
				kind: "record",
				fields: [
					{
						identity: `${recordIdentity}#value`,
						name: "value",
						typeRef: baseIdentity,
					},
				],
			},
		],
	};
	const outcome = conformanceOracle.admitInstance(
		{ ir },
		recordIdentity,
		{ value: "9007199254740992" },
		{ wire: "string" },
	);
	expect(outcome).toEqual({
		ok: false,
		code: "agent-ix.probe.EFFECTIVE_RANGE_MIN",
	});
});

it("reports the DifferentialFuzz0 impossible-range diagnostic in TypeScript", async () => {
	const cases = buildDifferentialFuzzCases();
	const ir = buildDifferentialFuzzIr();
	const scratch = mkdtempSync(join(tmpdir(), "fcd-age-2229-fuzz-code-"));
	try {
		const generated = await generatedValidators(scratch, ir);
		const validate = generated.validateDifferentialFuzz0 as (
			value: unknown,
		) => { ok: boolean; errors?: readonly { code?: string }[] };
		const result = validate(fuzzRecordValue(cases[0], cases[0].probes.valid));
		expect(result.ok).toBe(false);
		expect(result.errors?.[0]?.code).toBe(
			"ix://agent-ix/age-2229-numeric-matrix/FUZZ_0_MIN",
		);
	} finally {
		rmSync(scratch, { recursive: true, force: true });
	}
}, 120000);

async function generatedValidators(directory: string, ir: any) {
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
	writeFileSync(
		join(directory, "validators.mjs"),
		typescript.transpileModule(renderValidators(buildModel(ir)), {
			compilerOptions: {
				target: typescript.ScriptTarget.ES2022,
				module: typescript.ModuleKind.ES2022,
			},
		}).outputText,
	);
	return import(
		`${pathToFileURL(join(directory, "validators.mjs"))}?${Date.now()}`
	);
}

/** Generated TypeScript, JSON Schema and Rust consumer smoke corpus. */
it("runs every generated numeric matrix cell through all consumer probes", async () => {
	const ir = buildMatrixIr();
	const requiredColumns = [
		"src/compiler/backends/json-schema-v1",
		"src/compiler/backends/python-v1",
		"src/compiler/backends/rust-serde",
		"src/compiler/backends/rust-serde/harness",
		"src/compiler/backends/typescript-v1",
		"conformance/oracle/index.mjs",
		"conformance/oracle/json.mjs",
		"conformance/oracle/oracle.mjs",
		"conformance/oracle/schema-layer.mjs",
		"src/compiler/ir/reader.mjs",
	];
	expect(MATRIX_COLUMNS).toEqual(requiredColumns);
	expect(MATRIX_CELLS).toHaveLength(247);
	expect([...readContractIr(ir)]).toEqual([]);

	const scratch = mkdtempSync(join(tmpdir(), "fcd-age-2229-matrix-"));
	try {
		const generated = await generatedValidators(scratch, ir);
		const json = jsonSchemaBackend.generate({ ir } as never);
		expect(json.diagnostics.filter((one) => one.blocking)).toEqual([]);
		const ajv = new Ajv2020({ strict: false });
		const schemas = json.files
			.filter((file) => file.path !== "index.json")
			.map((file) => JSON.parse(file.text));
		for (const schema of schemas) ajv.addSchema(schema);

		for (const cell of MATRIX_CELLS) {
			const functionName = `validate${cellRecordName(cell)}`;
			const validate = generated[functionName] as (value: unknown) => {
				ok: boolean;
				value?: unknown;
			};
			expect(validate, `${cell.name} TypeScript validator`).toBeTypeOf(
				"function",
			);
			const valid = cellValue(cell);
			const validExpected = cellHasValidProbe(cell);
			const validResult = validate(valid);
			expect(validResult.ok, `${cell.name} TypeScript valid`).toBe(validExpected);
		if (validExpected)
			expect(validResult.value, `${cell.name} TypeScript wire`).toEqual(valid);
			expect(
				validate(cellValue(cell, false)).ok,
				`${cell.name} TypeScript invalid`,
			).toBe(false);
			if (cell.nullable)
				expect(
					validate(nullableValue(cell)).ok,
					`${cell.name} TypeScript null`,
				).toBe(true);
			if (cell.native && cell.kind === "integer" && inlineWideInteger(cell)) {
				expect(
					validate(numericIntegerProbe(cell)).ok,
					`${cell.name} TypeScript native numeric wire`,
				).toBe(false);
			}
			if (cell.decimalRegex)
				expect(
					validate({ value: "1\\.5" }).ok,
					`${cell.name} escaped decimal`,
				).toBe(false);

			const schema = schemas.find(
				(one: any) => one.title === cellRecordName(cell),
			);
			expect(schema, `${cell.name} JSON Schema`).toBeDefined();
			const validateJson = ajv.getSchema(schema.$id);
			expect(validateJson, `${cell.name} compiled JSON Schema`).toBeDefined();
			expect(validateJson?.(valid), `${cell.name} JSON valid`).toBe(validExpected);
			expect(
				validateJson?.(cellValue(cell, false)),
				`${cell.name} JSON invalid`,
			).toBe(false);
			if (cell.nullable)
				expect(
					validateJson?.(nullableValue(cell)),
					`${cell.name} JSON null`,
				).toBe(true);
			if (cell.native && cell.kind === "integer" && inlineWideInteger(cell))
				expect(
					validateJson?.(numericIntegerProbe(cell)),
					`${cell.name} JSON native numeric wire`,
				).toBe(false);
			if (cell.decimalRegex)
				expect(
					validateJson?.({ value: "1\\.5" }),
					`${cell.name} JSON escaped decimal`,
				).toBe(false);
		}

		const rust = emitCrate(
			{ ir, outputRoot: "generated/rust", limits: RUST_LIMITS } as never,
			{ licenseText: "" },
		);
		expect(rust.diagnostics.filter((one) => one.blocking)).toEqual([]);
		for (const [path, text] of rust.files) {
			const destination = join(scratch, path);
			mkdirSync(resolve(destination, ".."), { recursive: true });
			writeFileSync(destination, text);
		}
		writeFileSync(
			join(scratch, "Cargo.toml"),
			`${[...rust.files].find(([path]) => path === "Cargo.toml")?.[1] ?? ""}\n[dev-dependencies]\nserde_json = "1.0.145"\n`,
		);
		mkdirSync(join(scratch, "tests"));
		const imports = MATRIX_CELLS.map((cell: any) => rustTypeName(cell)).join(
			", ",
		);
		const probes = MATRIX_CELLS.map((cell: any) => {
			const rustJson = JSON.stringify(cellValue(cell));
			const invalidJson = JSON.stringify(cellValue(cell, false));
			const name = rustTypeName(cell);
			const validProbe = cellHasValidProbe(cell)
				? `let value: ${name} = serde_json::from_str(${JSON.stringify(rustJson)}).unwrap_or_else(|error| panic!("${cell.name} valid: {error}")); let encoded = serde_json::to_string(&value).unwrap(); assert_eq!(serde_json::from_str::<serde_json::Value>(&encoded).unwrap(), serde_json::from_str::<serde_json::Value>(${JSON.stringify(rustJson)}).unwrap()); let _: ${name} = serde_json::from_str(&encoded).unwrap_or_else(|error| panic!("${cell.name} wire: {error}"));`
				: `assert!(serde_json::from_str::<${name}>(${JSON.stringify(rustJson)}).is_err(), "${cell.name} impossible valid accepted");`;
			const nullProbe = cell.nullable
				? `let _: ${name} = serde_json::from_str(${JSON.stringify(JSON.stringify(rustNullableValue(cell)))}).unwrap_or_else(|error| panic!("${cell.name} nullable: {error}"));`
				: "";
			const nativeNumericProbe =
				cell.native && cell.kind === "integer" && inlineWideInteger(cell)
					? `assert!(serde_json::from_str::<${name}>("{\\"value\\":5}").is_err());`
					: "";
			const escapedDecimalProbe = cell.decimalRegex
				? `assert!(serde_json::from_str::<${name}>("{\\"value\\":\\"1\\\\.5\\"}").is_err());`
				: "";
			return `${validProbe} assert!(serde_json::from_str::<${name}>(${JSON.stringify(invalidJson)}).is_err()); ${nativeNumericProbe} ${escapedDecimalProbe} ${nullProbe}`;
		}).join("\n    ");
		writeFileSync(
			join(scratch, "tests", "numeric_matrix.rs"),
			`#![allow(missing_docs)]\n\nuse agent_ix_age_2229_numeric_matrix::{${imports}};\n\n#[test]\nfn every_generated_cell_round_trips() {\n    ${probes}\n}\n`,
		);
		execFileSync(
			"cargo",
			[
				"test",
				"--offline",
				"--manifest-path",
				join(scratch, "Cargo.toml"),
				"--test",
				"numeric_matrix",
			],
			{
				cwd: scratch,
				stdio: "pipe",
				env: { ...process.env, CARGO_TARGET_DIR: join(scratch, "target") },
			},
		);
		process.stdout.write(
			`AGE-2229 numeric matrix columns: ${MATRIX_COLUMNS.join(", ")}\nAGE-2229 numeric matrix cells: ${MATRIX_CELLS.length}\n`,
		);
	} finally {
		rmSync(scratch, { recursive: true, force: true });
	}
}, 120000);

/** A seeded cross-backend corpus catches interactions the hand-written matrix cannot enumerate. */
it("runs the seeded differential fuzz corpus with a minimal disagreement report", async () => {
	const cases = buildDifferentialFuzzCases();
	const ir = buildDifferentialFuzzIr();
	expect(cases).toHaveLength(2048);
	expect([...readContractIr(ir)]).toEqual([]);
	const scratch = mkdtempSync(join(tmpdir(), "fcd-age-2229-fuzz-"));
	try {
		const generated = await generatedValidators(scratch, ir);
		const json = jsonSchemaBackend.generate({ ir } as never);
		expect(json.diagnostics.filter((one) => one.blocking)).toEqual([]);
		const ajv = new Ajv2020({ strict: false });
		const schemas = json.files
			.filter((file) => file.path !== "index.json")
			.map((file) => JSON.parse(file.text));
		for (const schema of schemas) ajv.addSchema(schema);
		const disagreements: Array<Record<string, unknown>> = [];
		let oracleCount = 0;
		let oracleInstanceCount = 0;
		for (const testCase of cases) {
			const validate = generated[
				`validate${testCase.name}`
			] as (value: unknown) => { ok: boolean; errors?: readonly { code?: string }[] };
			expect(validate, `${testCase.name} TypeScript validator`).toBeTypeOf("function");
			const schema = schemas.find((one: any) => one.title === testCase.name);
			expect(schema, `${testCase.name} schema`).toBeDefined();
			const validateJson = ajv.getSchema(schema.$id);
			expect(validateJson, `${testCase.name} Ajv validator`).toBeDefined();
			for (const [label, probe] of [
				["valid", testCase.probes.valid],
				["invalid", testCase.probes.invalid],
			] as const) {
				const oracleOutcome = fuzzOracleOutcome(ir, testCase, probe);
				oracleCount += 1;
				oracleInstanceCount += 1;
				const expected = oracleOutcome.ok;
				const record = fuzzRecordValue(testCase, probe);
				const tsResult = validate(record);
				const ajvResult = Boolean(validateJson?.(record));
				const tsCode = tsResult.errors?.[0]?.code ?? null;
				if (
					tsResult.ok !== expected ||
					ajvResult !== expected ||
					tsResult.ok !== ajvResult ||
					(!expected && oracleOutcome.code !== undefined && tsCode !== oracleOutcome.code)
				) {
					disagreements.push({
						name: testCase.name,
						label,
						baseType: testCase.baseType,
						shape: testCase.shape,
						aliasDepth: testCase.aliasDepth,
						nesting: testCase.nesting,
						wire: testCase.wire,
						expected,
						typescript: tsResult.ok,
						ajv: ajvResult,
						diagnostic: tsCode,
						oracleDiagnostic: oracleOutcome.code ?? null,
					});
				}
			}
		}
		// The full corpus is exercised by the JS/schema lanes. Rust's generated
		// identity module is bounded to the first 1,024 seeded cases so the source
		// stays below the host parser's call-stack limit.
		const rustCases = cases.slice(0, 1024);
		const rustNames = new Set(
			rustCases.flatMap((testCase) => [
				testCase.name,
				`${testCase.name}Base`,
				`${testCase.name}Alias1`,
				`${testCase.name}Alias2`,
			]),
		);
		const rustIr = {
			...ir,
			types: ir.types.filter((type: any) => rustNames.has(type.displayName)),
		};
		const rust = emitCrate(
			{ ir: rustIr, outputRoot: "generated/rust", limits: RUST_LIMITS } as never,
			{ licenseText: "" },
		);
		expect(rust.diagnostics.filter((one) => one.blocking)).toEqual([]);
		const rustRoot = join(scratch, "rust");
		mkdirSync(join(rustRoot, "tests"), { recursive: true });
		for (const [path, text] of rust.files) {
			const destination = join(rustRoot, path);
			mkdirSync(resolve(destination, ".."), { recursive: true });
			writeFileSync(destination, text);
		}
		writeFileSync(
			join(rustRoot, "Cargo.toml"),
			`${[...rust.files].find(([path]) => path === "Cargo.toml")?.[1] ?? ""}\n[dev-dependencies]\nserde_json = "1.0.145"\n`,
		);
		const rustImports = rustCases.map((testCase) => testCase.name).join(", ");
		const rustProbes = rustCases.map((testCase) => {
			const typeName = testCase.name;
			const valid = JSON.stringify(fuzzRecordValue(testCase, testCase.probes.valid));
			const invalid = JSON.stringify(fuzzRecordValue(testCase, testCase.probes.invalid));
			const validProbe = fuzzOracleOutcome(ir, testCase, testCase.probes.valid).ok
				? `let _: ${typeName} = serde_json::from_str(${JSON.stringify(valid)}).unwrap_or_else(|error| panic!("${typeName} valid: {error}"));`
				: `assert!(serde_json::from_str::<${typeName}>(${JSON.stringify(valid)}).is_err(), "${typeName} impossible valid accepted");`;
			return `${validProbe} assert!(serde_json::from_str::<${typeName}>(${JSON.stringify(invalid)}).is_err(), "${typeName} invalid accepted");`;
		}).join("\n    ");
		writeFileSync(
			join(rustRoot, "tests", "differential_fuzz.rs"),
			`#![allow(missing_docs)]\nuse agent_ix_age_2229_numeric_matrix::{${rustImports}};\n#[test]\nfn seeded_fuzz_serde_batch() { ${rustProbes} }\n`,
		);
		execFileSync(
			"cargo",
			["test", "--offline", "--manifest-path", join(rustRoot, "Cargo.toml"), "--test", "differential_fuzz"],
			{ cwd: rustRoot, stdio: "pipe", env: { ...process.env, CARGO_TARGET_DIR: join(rustRoot, "target") } },
		);

		// Python consumes the same schema documents. Run its real producer and
		// require every fuzz record to reach a generated module; the runtime
		// acceptance verdict is the schema oracle already compared above.
		// The Python generator represents aliases as RootModel objects and applies
		// field bounds to collection containers. Its direct scalar/optional/nested
		// rows are the comparable wire lane; keep that lane deterministic and
		// report its size separately from the full corpus.
		const pythonCases = cases
			.filter((testCase) => testCase.nesting !== "collection" && testCase.aliasDepth === 0);
		const pythonNames = new Set(
			pythonCases.flatMap((testCase) => [
				testCase.name,
				`${testCase.name}Base`,
				`${testCase.name}Alias1`,
				`${testCase.name}Alias2`,
			]),
		);
		const pythonIr = {
			...ir,
			types: ir.types.filter((type: any) => pythonNames.has(type.displayName)),
		};
		const python = pythonPydanticBackend.generate(
			{ ir: pythonIr } as never,
			{ produce: poetryProducer() } as never,
		) as never as { state: string; files: { path: string; text: string }[]; diagnostics: { blocking?: boolean }[] };
		expect(python.state).toBe("success");
		expect(python.diagnostics.filter((one) => one.blocking)).toEqual([]);
		for (const testCase of pythonCases) {
			expect(
				python.files.some((file) => file.path.includes(testCase.name)),
				`${testCase.name} Python generated module`,
			).toBe(true);
		}
		const pythonRoot = join(scratch, "python");
		const pythonPackage = join(pythonRoot, "fuzzpkg");
		mkdirSync(pythonPackage, { recursive: true });
		for (const file of python.files) {
			const destination = join(pythonPackage, file.path);
			mkdirSync(resolve(destination, ".."), { recursive: true });
			writeFileSync(destination, file.text);
		}
		const pythonScript = [
			"import json",
			...pythonCases.map((testCase) => `from fuzzpkg.${testCase.name} import ${testCase.name}`),
			"answers = []",
			"cases = json.loads(__import__('os').environ['AGE_2229_FUZZ_CASES'])",
			"for case in cases:",
			"    model = globals()[case['name']]",
			"    for label in ('valid', 'invalid'):",
			"        try:",
			"            model.model_validate({'value': [case['probes'][label]] if case['nesting'] == 'collection' else {'value': case['probes'][label]}['value']})",
			"            answers.append(True)",
			"        except Exception:",
			"            answers.append(False)",
			"print(json.dumps(answers))",
		].join("\n");
		const pythonAnswers = JSON.parse(
			execFileSync("python3", ["-c", pythonScript], {
				cwd: pythonRoot,
				encoding: "utf8",
				env: {
					...process.env,
					AGE_2229_FUZZ_CASES: JSON.stringify(
						pythonCases.map(({ name, nesting, probes }) => ({ name, nesting, probes })),
					),
				},
			}),
		) as boolean[];
		expect(pythonAnswers).toHaveLength(pythonCases.length * 2);
		for (const [index, answer] of pythonAnswers.entries()) {
			const testCase = pythonCases[Math.floor(index / 2)];
			const label = index % 2 === 0 ? "valid" : "invalid";
			const expected = fuzzOracleOutcome(ir, testCase, testCase.probes[label]).ok;
			if (answer !== expected)
				disagreements.push({
					backend: "python",
					name: testCase.name,
					label,
					expected,
					python: answer,
				});
		}
		process.stdout.write(
			`AGE-2229 differential fuzz seed: ${0x9e3779b9} count: ${cases.length} oracleCount: ${oracleCount} oracleInstances: ${oracleInstanceCount} rustBatch: ${rustCases.length} pythonBatch: ${pythonCases.length} disagreements: ${disagreements.length}\n`,
		);
		expect(oracleCount).toBe(cases.length * 2);
		expect(oracleInstanceCount).toBe(cases.length * 2);
		if (disagreements.length)
			process.stdout.write(
				`AGE-2229 minimal disagreement: ${JSON.stringify(disagreements[0])}\n`,
			);
		expect(disagreements.slice(0, 1)).toEqual([]);
	} finally {
		rmSync(scratch, { recursive: true, force: true });
	}
}, 120000);
