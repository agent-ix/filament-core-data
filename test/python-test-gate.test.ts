import { spawnSync } from "node:child_process";
import {
	chmodSync,
	mkdirSync,
	mkdtempSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const scratch = mkdtempSync(join(tmpdir(), "fcd-python-test-gate-"));
const bin = join(scratch, "bin");
const python = join(scratch, ".venv", "bin", "python");
const poetry = join(bin, "poetry");
const override = join(scratch, "gate-recipes.mk");

mkdirSync(bin);
mkdirSync(dirname(python), { recursive: true });
writeFileSync(
	override,
	"test-node test-python test-rust sysml-pilot-check:\n\t@echo gate-started:$@:$$VIRTUAL_ENV\n",
);

afterAll(() => rmSync(scratch, { recursive: true, force: true }));

function executable(path: string): void {
	writeFileSync(path, "#!/bin/sh\nexit 0\n");
	chmodSync(path, 0o755);
}

function run(target: string): { status: number | null; output: string } {
	const result = spawnSync(
		"make",
		["-j4", "-f", "Makefile", "-f", override, `CURDIR=${scratch}`, target],
		{
			cwd: root,
			encoding: "utf8",
			env: {
				...process.env,
				PATH: `${bin}:${dirname(process.execPath)}:/usr/bin:/bin`,
			},
		},
	);
	return { status: result.status, output: `${result.stdout}${result.stderr}` };
}

const targets = [
	"test",
	"test-all",
	"test-node",
	"test-python",
	"test-rust",
	"sysml-pilot-check",
];

describe("Python test prerequisites", () => {
	it("stops every test entry point before starting gates when Poetry is absent", () => {
		executable(python);
		for (const target of targets) {
			const result = run(target);
			expect(result.status, `${target}: ${result.output}`).not.toBe(0);
			expect(
				result.output.match(/Python test prerequisite missing/g),
			).toHaveLength(1);
			expect(result.output, target).not.toContain("gate-started:");
		}
		rmSync(python);
	}, 15_000);

	it("stops every test entry point before starting gates when .venv is absent", () => {
		executable(poetry);
		for (const target of targets) {
			const result = run(target);
			expect(result.status, `${target}: ${result.output}`).not.toBe(0);
			expect(
				result.output.match(/Python test prerequisite missing/g),
			).toHaveLength(1);
			expect(result.output, target).not.toContain("gate-started:");
		}
	}, 15_000);

	it("starts all aggregate branches when both prerequisites are present", () => {
		executable(python);
		const result = run("test-all");
		expect(result.status, result.output).toBe(0);
		for (const target of targets.slice(2))
			expect(result.output).toContain(
				`gate-started:${target}:${join(scratch, ".venv")}`,
			);
	}, 15_000);
});
