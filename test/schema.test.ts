import { execFileSync } from "node:child_process";
import { readFileSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { changedPathsFrom } from "./changed-paths";
import {
	interruptScratchMutation,
	snapshotPaths,
	withGenerationScratch,
} from "./generation-scratch";
import {
	type CoreDataRecordName,
	CORE_DATA_PROTOCOL,
	validateCoreDataRecord,
} from "../src/generated";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fixturePath = resolve(root, "fixtures/representative-core-payloads.json");
const pythonBindingPath = resolve(root, "agent_ix_core_data/core_data.py");

const fixtures = JSON.parse(readFileSync(fixturePath, "utf8")) as Record<
	CoreDataRecordName,
	unknown
>;

describe("filament-core-data shared Avro contract", () => {
	/** Traces: FR-026; legacy baseline preservation, not bridge qualification. */
	it("keeps generated bindings in sync without source mutation even after interrupted probes", () => {
		const outputs = ["src/generated.ts", "agent_ix_core_data/core_data.py"];
		const before = snapshotPaths(root, outputs);
		withGenerationScratch(
			root,
			[
				...outputs,
				"schema/avro/core-data.avpr",
				"scripts/generate-core-data-schema.mjs",
				"package.json",
				"biome.json",
			],
			(scratch) => {
				const generate = () =>
					execFileSync(
						process.execPath,
						["scripts/generate-core-data-schema.mjs"],
						{
							cwd: scratch,
							stdio: "pipe",
						},
					);
				// Missing outputs force real generation; retained copies cannot pass.
				for (const path of outputs) rmSync(resolve(scratch, path));
				generate();
				expect(snapshotPaths(scratch, outputs)).toEqual(before);
				for (const path of outputs) {
					interruptScratchMutation(scratch, path);
					expect(snapshotPaths(scratch, outputs).get(path)).not.toEqual(
						before.get(path),
					);
					expect(snapshotPaths(root, outputs)).toEqual(before);
					generate();
					expect(snapshotPaths(scratch, outputs)).toEqual(before);
				}
			},
		);
	});

	/** Traces: FR-026; issue #49's removed changed-path mitigation. */
	it("reports both formerly exempted generated bindings as real working-tree changes", () => {
		const outputs = ["src/generated.ts", "agent_ix_core_data/core_data.py"];
		withGenerationScratch(root, outputs, (scratch) => {
			const git = (...args: string[]) =>
				execFileSync("git", args, {
					cwd: scratch,
					encoding: "utf8",
					stdio: ["ignore", "pipe", "pipe"],
				});
			git("init", "--quiet");
			git("add", "--", ...outputs);
			git(
				"-c",
				"user.name=Isolation test",
				"-c",
				"user.email=isolation@example.invalid",
				"-c",
				"commit.gpgsign=false",
				"commit",
				"--quiet",
				"-m",
				"synthetic baseline",
			);
			// Dependencies are an intentionally untracked symlink in this scratch repo.
			const baseline = changedPathsFrom(scratch, "HEAD");
			expect(baseline.filter((path) => outputs.includes(path))).toEqual([]);
			for (const path of outputs) interruptScratchMutation(scratch, path);
			expect(
				changedPathsFrom(scratch, "HEAD")
					.filter((path) => outputs.includes(path))
					.sort(),
			).toEqual([...outputs].sort());
		});
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
