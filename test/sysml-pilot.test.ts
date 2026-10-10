import { execFileSync } from "node:child_process";
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
