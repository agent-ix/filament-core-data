/**
 * Cross-language agreement (FR-090, Task-125).
 *
 * Measured **through the existing conformance corpus**, not through a
 * comparison written for this issue. SR-144 FND-1360 is the reason: a
 * comparison written beside the thing it compares tends to agree with it, and
 * the corpus already carries 111 cases and an oracle written against the
 * contract rather than against any implementation.
 *
 * Agreement with that oracle is a stronger claim than pairwise agreement
 * between two backends. Two implementations can agree with each other and both
 * be wrong; neither can agree with an independent oracle and be wrong in the
 * same direction.
 *
 * Two of the four adapter slots are live. The other two are unavailable and
 * their rows are counted as unmet rather than as passes — this file asserts
 * that too, because a coverage figure that quietly counts an absent adapter as
 * agreement is the failure the whole corpus exists to prevent.
 */

import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");

interface AdapterRow {
	readonly adapter: string;
	readonly status: string;
	readonly matched: number;
	readonly unmet: number;
	readonly failed: number;
}

function run(): {
	coverage: { totalCases: number; unmetCases: number; adapters: AdapterRow[] };
	exitCode: number;
} {
	const stdout = execFileSync("node", ["conformance/runner/differential.mjs"], {
		cwd: root,
		encoding: "utf8",
		maxBuffer: 1 << 28,
	});
	return JSON.parse(stdout);
}

describe("TC-1085..1089 cross-language agreement through the corpus (FR-090)", () => {
	const report = run();
	const byAdapter = new Map(
		report.coverage.adapters.map((a) => [a.adapter, a] as const),
	);

	// TC-1085
	it("agrees with the independent oracle on every case, for every live adapter", () => {
		for (const name of ["rust-backend", "typescript-backend"]) {
			const row = byAdapter.get(name);
			expect(row?.status, name).toBe("available");
			expect(row?.matched, name).toBe(report.coverage.totalCases);
			expect(row?.failed, name).toBe(0);
			expect(row?.unmet, name).toBe(0);
		}
	});

	// TC-1086 — an absent adapter must never read as agreement.
	it("counts an unavailable adapter as unmet, never as a pass", () => {
		for (const name of ["compiler-frontend", "python-backend"]) {
			const row = byAdapter.get(name);
			expect(row?.status, name).toBe("unavailable");
			expect(row?.matched, name).toBe(0);
			expect(row?.unmet, name).toBe(report.coverage.totalCases);
		}
	});

	// TC-1087
	it("reports the unmet total as the sum of the unavailable slots", () => {
		const unavailable = report.coverage.adapters.filter(
			(a) => a.status === "unavailable",
		);
		expect(report.coverage.unmetCases).toBe(
			unavailable.length * report.coverage.totalCases,
		);
	});

	// TC-1088
	it("states how much of the agreement claim is actually covered", () => {
		const live = report.coverage.adapters.filter(
			(a) => a.status === "available",
		).length;
		// Two of four. FR-090's claim is established for the languages that can
		// answer and is open for the two that cannot — issue #80 blocks the Rust
		// kernel crate and issue #81 blocks the Python one, so neither absence
		// is silent.
		expect(live).toBe(2);
		expect(report.coverage.adapters).toHaveLength(4);
	});

	// TC-1089
	it("runs clean", () => {
		expect(report.exitCode).toBe(0);
		expect(report.coverage.totalCases).toBe(111);
	});
});
