import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import { expect, it } from "vitest";
import { jsonSchemaBackend } from "../src/compiler/backends/json-schema-v1/index.mjs";
import { emitCrate } from "../src/compiler/backends/rust-serde/crate.mjs";
import { buildModel } from "../src/compiler/backends/typescript-v1/model.mjs";
import {
	renderErrors,
	renderValidators,
} from "../src/compiler/backends/typescript-v1/validators.mjs";
import { readContractIr } from "../src/compiler/ir/reader.mjs";
import {
	buildMatrixIr,
	cellRecordName,
	cellValue,
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

const lockedBuild =
	process.env.LOCKED_BUILD ?? resolve(import.meta.dirname, "../../locked-build.sh");

function nullableValue(cell: (typeof MATRIX_CELLS)[number]) {
	if (cell.nesting === "nested") return { nested: null };
	return { value: null };
}

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

/** Trace: FR-144-AC-2, FR-144-AC-13, FR-144-AC-15. */
it("runs every generated numeric matrix cell through all consumer probes", async () => {
	const ir = buildMatrixIr();
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
			const validResult = validate(valid);
			expect(
				validResult.ok,
				`${cell.name} TypeScript valid`,
			).toBe(true);
			expect(validResult.value, `${cell.name} TypeScript wire`).toEqual(valid);
			expect(
				validate(cellValue(cell, false)).ok,
				`${cell.name} TypeScript invalid`,
			).toBe(false);
			if (cell.nullable)
				expect(validate(nullableValue(cell)).ok, `${cell.name} TypeScript null`).toBe(true);

			const schema = schemas.find(
				(one: any) => one.title === cellRecordName(cell),
			);
			expect(schema, `${cell.name} JSON Schema`).toBeDefined();
			const validateJson = ajv.getSchema(schema.$id);
			expect(validateJson, `${cell.name} compiled JSON Schema`).toBeDefined();
			expect(validateJson?.(valid), `${cell.name} JSON valid`).toBe(
				true,
			);
			expect(
				validateJson?.(cellValue(cell, false)),
				`${cell.name} JSON invalid`,
			).toBe(false);
			if (cell.nullable)
				expect(validateJson?.(nullableValue(cell)), `${cell.name} JSON null`).toBe(true);
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
		const imports = MATRIX_CELLS.map((cell: any) => cellRecordName(cell)).join(
			", ",
		);
		const probes = MATRIX_CELLS.map((cell: any) => {
			const rustJson = JSON.stringify(cellValue(cell));
			const invalidJson = JSON.stringify(cellValue(cell, false));
			const name = cellRecordName(cell);
			const nullProbe = cell.nullable
				? `let _: ${name} = serde_json::from_str(${JSON.stringify(JSON.stringify(nullableValue(cell)))}).unwrap();`
				: "";
			return `let value: ${name} = serde_json::from_str(${JSON.stringify(rustJson)}).unwrap(); let encoded = serde_json::to_string(&value).unwrap(); assert_eq!(serde_json::from_str::<serde_json::Value>(&encoded).unwrap(), serde_json::from_str::<serde_json::Value>(${JSON.stringify(rustJson)}).unwrap()); let _: ${name} = serde_json::from_str(&encoded).unwrap(); assert!(serde_json::from_str::<${name}>(${JSON.stringify(invalidJson)}).is_err()); ${nullProbe}`;
		}).join("\n    ");
		writeFileSync(
			join(scratch, "tests", "numeric_matrix.rs"),
			`use agent_ix_age_2229_numeric_matrix::{${imports}};\n\n#[test]\nfn every_generated_cell_round_trips() {\n    ${probes}\n}\n`,
		);
		execFileSync(
			lockedBuild,
			[
				join(scratch, "target"),
				"cargo",
				"test",
				"--offline",
				"--manifest-path",
				join(scratch, "Cargo.toml"),
				"--test",
				"numeric_matrix",
			],
			{ cwd: scratch, stdio: "pipe", env: process.env },
		);
		process.stdout.write(
			`AGE-2229 numeric matrix cells: ${MATRIX_CELLS.length}\n`,
		);
	} finally {
		rmSync(scratch, { recursive: true, force: true });
	}
});
