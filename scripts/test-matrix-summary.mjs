#!/usr/bin/env node
/**
 * Recomputes the `## Test Execution Summary` table of `spec/tests.md` from the
 * `## Test Case Summary` rows, so the counts are measured rather than asserted
 * (issue #27 shipped two counts that were off by one).
 *
 * Usage: node scripts/test-matrix-summary.mjs [--check]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const path = resolve(process.env.MATRIX ?? "spec/tests.md");
const text = readFileSync(path, "utf8");
const rows = [...text.matchAll(/^\| (TC-\d+) \| (.*?) \| (\w+) \| (P\d) \| (.*?) \| (.*?) \|$/gm)];
if (rows.length === 0) throw new Error("no test-case rows found");

const order = [
	"Static",
	"Manual",
	"Analysis",
	"Property",
	"Unit",
	"Integration",
	"Fuzz",
	"Snapshot",
	"Compile",
	"E2E",
	"Benchmark",
];
const buckets = new Map();
for (const [, , , type, , , status] of rows) {
	const bucket = buckets.get(type) ?? { total: 0, passed: 0, failed: 0, blocked: 0 };
	bucket.total += 1;
	if (status.startsWith("✅")) bucket.passed += 1;
	else if (status.startsWith("❌")) bucket.failed += 1;
	else bucket.blocked += 1;
	buckets.set(type, bucket);
}
const unknown = [...buckets.keys()].filter((type) => !order.includes(type));
if (unknown.length > 0) throw new Error(`unknown test types: ${unknown.join(", ")}`);

const lines = ["| Category | Total | Passed | Failed | Blocked | Coverage |", "|---|---|---|---|---|---|"];
const totals = { total: 0, passed: 0, failed: 0, blocked: 0 };
for (const type of order) {
	const bucket = buckets.get(type);
	if (!bucket) continue;
	for (const key of Object.keys(totals)) totals[key] += bucket[key];
	lines.push(`| ${type} | ${bucket.total} | ${bucket.passed} | ${bucket.failed} | ${bucket.blocked} | 100% mapped |`);
}
lines.push(
	`| **Total** | **${totals.total}** | **${totals.passed}** | **${totals.failed}** | **${totals.blocked}** | **100% mapped** |`,
);
const table = lines.join("\n");

const marker = "| Category | Total | Passed | Failed | Blocked | Coverage |";
const start = text.indexOf(marker);
if (start < 0) throw new Error("summary table not found");
const end = text.indexOf("\n\n", text.indexOf("| **Total** |", start));
const updated = `${text.slice(0, start)}${table}${text.slice(end)}`;

if (process.argv.includes("--check")) {
	if (updated !== text) {
		process.stderr.write("spec/tests.md execution summary is stale; run node scripts/test-matrix-summary.mjs\n");
		process.exitCode = 1;
	}
	process.stdout.write(`${table}\n`);
} else {
	writeFileSync(path, updated);
	process.stdout.write(`${table}\n`);
}
