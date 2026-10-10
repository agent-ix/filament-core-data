import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { expect, it } from "vitest";

/** Trace: FR-138-AC-3, FR-138-CON-3. The pinned pilot is gate-only. */
it("accepts emitted kernel and config domain SysML packages in the pinned pilot", () => {
	const root = resolve(import.meta.dirname, "..");
	const output = execFileSync(
		process.execPath,
		[resolve(root, "scripts/check-sysml-pilot.mjs")],
		{ cwd: root, encoding: "utf8", timeout: 180_000 },
	);
	expect(output).toContain("FR-138-AC-3 pilot accepted kernel-0.sysml");
	expect(output).toContain("FR-138-AC-3 pilot accepted config-domain-0.sysml");
}, 180_000);

/** Trace: FR-138-AC-3. The pilot says shell status ok even on parser errors. */
it("rejects pilot parser errors reported on the stderr stream", () => {
	const root = resolve(import.meta.dirname, "..");
	const scratch = mkdtempSync(resolve(tmpdir(), "sysml-pilot-negative-"));
	try {
		const invalid = resolve(scratch, "invalid.sysml");
		writeFileSync(invalid, "package Broken { this is nonsense !!! }\n");
		const run = spawnSync(
			"poetry",
			["run", "python", resolve(root, "scripts/check-sysml-pilot.py"), invalid],
			{ cwd: root, encoding: "utf8", timeout: 120_000 },
		);
		expect(run.status).not.toBe(0);
		expect(run.stderr).toContain("pilot reported errors");
		expect(run.stderr).toContain("no viable alternative");
	} finally {
		rmSync(scratch, { recursive: true, force: true });
	}
}, 120_000);

/** Trace: FR-138-AC-3. A syntactically valid but semantically invalid usage is rejected. */
it("rejects pilot semantic errors instead of trusting shell success", () => {
	const root = resolve(import.meta.dirname, "..");
	const scratch = mkdtempSync(resolve(tmpdir(), "sysml-pilot-negative-"));
	try {
		const invalid = resolve(scratch, "invalid-usage.sysml");
		writeFileSync(
			invalid,
			[
				"package Broken {",
				"  item def Child {}",
				"  item def Parent {",
				"    attribute child : Child;",
				"  }",
				"}",
				"",
			].join("\n"),
		);
		const run = spawnSync(
			"poetry",
			["run", "python", resolve(root, "scripts/check-sysml-pilot.py"), invalid],
			{ cwd: root, encoding: "utf8", timeout: 120_000 },
		);
		expect(run.status).not.toBe(0);
		expect(run.stderr).toContain("pilot reported errors");
	} finally {
		rmSync(scratch, { recursive: true, force: true });
	}
}, 120_000);
