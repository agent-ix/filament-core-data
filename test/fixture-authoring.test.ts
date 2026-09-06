import { spawnSync } from "node:child_process";
import { cpSync, readFileSync, rmSync, symlinkSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { withCorpusScratch } from "./corpus-scratch";
import {
	interruptScratchMutation,
	snapshotPaths,
	withGenerationScratch,
} from "./generation-scratch";

const root = resolve(import.meta.dirname, "..");
const command = "scripts/write-semantic-core-lowered.mjs";
const fixture = "fixtures/semantic-core/positive/config-version-lowered.json";
const input = "fixtures/semantic-core/positive/config-version-field-decls.json";
const authoringInputs = [
	command,
	fixture,
	input,
	"test/semantic-core-lowerer.ts",
	"package.json",
	"biome.json",
];

describe("FR-034 explicit reference-fixture authoring boundary (issue #49)", () => {
	/** Traces: FR-034; reference fixture parity, not frontend qualification. */
	it("defaults to byte-identical stdout without writing, even with the legacy environment flag", () => {
		const expected = readFileSync(resolve(root, fixture), "utf8");
		withGenerationScratch(root, authoringInputs, (scratch) => {
			const before = snapshotPaths(scratch, authoringInputs);
			const result = spawnSync(process.execPath, [command], {
				cwd: scratch,
				encoding: "utf8",
				env: { ...process.env, SEMANTIC_CORE_WRITE_LOWERED: "1" },
			});
			expect(result.error).toBeUndefined();
			expect(result.status, result.stderr).toBe(0);
			expect(result.stdout).toBe(expected);
			expect(snapshotPaths(scratch, authoringInputs)).toEqual(before);
		});
	});

	/** Traces: FR-034; writes require explicit authority and an unredirected fixed target. */
	it("writes only the fixed scratch target with explicit opt-in and refuses redirection", () => {
		const expected = readFileSync(resolve(root, fixture), "utf8");
		withGenerationScratch(root, authoringInputs, (scratch) => {
			interruptScratchMutation(scratch, fixture);
			const run = (...args: string[]) =>
				spawnSync(process.execPath, [command, ...args], {
					cwd: scratch,
					encoding: "utf8",
				});
			const written = run("--write");
			expect(written.error).toBeUndefined();
			expect(written.status, written.stderr).toBe(0);
			expect(written.stdout).toBe(`wrote ${fixture}\n`);
			expect(readFileSync(resolve(scratch, fixture), "utf8")).toBe(expected);
			const before = snapshotPaths(scratch, authoringInputs);
			const invalid = run("--write", "--output", input);
			expect(invalid.error).toBeUndefined();
			expect(invalid.status).toBe(2);
			expect(invalid.stderr).toContain("usage:");
			expect(snapshotPaths(scratch, authoringInputs)).toEqual(before);
			// Both the link and its destination are scratch; no source link is writable.
			const inputBefore = readFileSync(resolve(scratch, input), "utf8");
			rmSync(resolve(scratch, fixture));
			symlinkSync(resolve(scratch, input), resolve(scratch, fixture));
			const redirected = run("--write");
			expect(redirected.error).toBeUndefined();
			expect(redirected.status).toBe(1);
			expect(redirected.stderr).toContain(
				"refusing redirected or non-file authoring target",
			);
			expect(readFileSync(resolve(scratch, input), "utf8")).toBe(inputBefore);
		});
	});

	/** Traces: FR-034; exercise the ordinary test's real inherited-environment refusal. */
	it("refuses the inherited authoring flag in an ordinary fixture test without changing bytes", () => {
		const paths = ["fixtures/semantic-core", "test/semantic-core.test.ts"];
		const sourceBefore = snapshotPaths(root, paths);
		withCorpusScratch(root, (scratch) => {
			try {
				// Test the current refusal implementation, also before its commit.
				cpSync(
					resolve(root, "test/semantic-core.test.ts"),
					resolve(scratch, "test/semantic-core.test.ts"),
				);
				const before = readFileSync(resolve(scratch, fixture), "utf8");
				const result = spawnSync(
					process.execPath,
					[
						resolve(root, "node_modules/vitest/vitest.mjs"),
						"run",
						"test/semantic-core.test.ts",
						"-t",
						"mints identities, origins, kernel definitions",
					],
					{
						cwd: scratch,
						encoding: "utf8",
						env: { ...process.env, SEMANTIC_CORE_WRITE_LOWERED: "1" },
					},
				);
				expect(result.error).toBeUndefined();
				expect(result.status).toBe(1);
				expect(`${result.stdout}${result.stderr}`).toContain(
					"SEMANTIC_CORE_WRITE_LOWERED is not supported by tests; run node scripts/write-semantic-core-lowered.mjs --write explicitly",
				);
				expect(readFileSync(resolve(scratch, fixture), "utf8")).toBe(before);
			} finally {
				expect(snapshotPaths(root, paths)).toEqual(sourceBefore);
			}
		});
	});
});
