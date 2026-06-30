import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
	type CoreDataRecordName,
	CORE_DATA_PROTOCOL,
	validateCoreDataRecord,
} from "../src/generated";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fixturePath = resolve(root, "fixtures/representative-core-payloads.json");
const pythonBindingPath = resolve(root, "agent_ix_core_data/core_data.py");
const typeScriptBindingPath = resolve(root, "src/generated.ts");

const fixtures = JSON.parse(readFileSync(fixturePath, "utf8")) as Record<
	CoreDataRecordName,
	unknown
>;

describe("filament-core-data shared Avro contract", () => {
	it("keeps generated bindings in sync with the Avro protocol", () => {
		const before = {
			python: readFileSync(pythonBindingPath, "utf8"),
			typeScript: readFileSync(typeScriptBindingPath, "utf8"),
		};

		execFileSync("pnpm", ["run", "generate"], { cwd: root, stdio: "pipe" });

		expect(readFileSync(typeScriptBindingPath, "utf8")).toBe(before.typeScript);
		expect(readFileSync(pythonBindingPath, "utf8")).toBe(before.python);
	});

	it("validates every representative payload fixture in TypeScript", () => {
		const recordNames = CORE_DATA_PROTOCOL.types
			.filter((schema) => schema.type === "record")
			.map((schema) => schema.name as CoreDataRecordName);

		for (const recordName of recordNames) {
			expect(
				fixtures[recordName],
				`${recordName} fixture missing`,
			).toBeDefined();
			expect(validateCoreDataRecord(recordName, fixtures[recordName])).toEqual(
				[],
			);
		}
	});

	it("validates the same representative payload fixtures in Python", () => {
		const script = [
			"import importlib.util, json, pathlib, sys",
			`module_path = pathlib.Path(${JSON.stringify(pythonBindingPath)})`,
			`fixture_path = pathlib.Path(${JSON.stringify(fixturePath)})`,
			'spec = importlib.util.spec_from_file_location("core_data", module_path)',
			"module = importlib.util.module_from_spec(spec)",
			'sys.modules["core_data"] = module',
			"spec.loader.exec_module(module)",
			"fixtures = json.loads(fixture_path.read_text())",
			"errors = {}",
			"for name, payload in fixtures.items():",
			"    result = module.validate_core_data_record(name, payload)",
			"    if result:",
			"        errors[name] = result",
			"if errors:",
			"    raise SystemExit(json.dumps(errors, indent=2))",
		].join("\n");

		expect(() =>
			execFileSync("python3", ["-c", script], { cwd: root, stdio: "pipe" }),
		).not.toThrow();
	});
});
