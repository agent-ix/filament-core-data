#!/usr/bin/env node
/**
 * Recomputes the `## Test Execution Summary` table of `spec/tests.md` from the
 * `## Test Case Summary` rows, so the counts are measured rather than asserted
 * (issue #27 shipped two counts that were off by one).
 *
 * The `Coverage` column is measured too. It used to be the literal string
 * `100% mapped` on every row, which said nothing: a row could trace to a
 * criterion no requirement declares and the column would still read 100%. Now it
 * is the share of that category's rows whose `Traces To` names at least one
 * criterion an artifact under `spec/` actually declares.
 *
 * Usage: node scripts/test-matrix-summary.mjs [--check]
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const path = resolve(process.env.MATRIX ?? "spec/tests.md");
const text = readFileSync(path, "utf8");
const specRoot = resolve(path, "..");

/**
 * Every id a spec artifact declares that a matrix row may legitimately trace
 * to: an acceptance criterion, a named constraint, a verification criterion,
 * and the requirement's own id (older rows trace a whole NFR).
 */
function declaredCriteria() {
	const declared = new Set();
	const walk = (directory) => {
		for (const entry of readdirSync(directory, { withFileTypes: true })) {
			const child = resolve(directory, entry.name);
			if (entry.isDirectory()) {
				walk(child);
				continue;
			}
			if (!entry.name.endsWith(".md") || entry.name === "tests.md") continue;
			const body = readFileSync(child, "utf8");
			for (const match of body.matchAll(
				/^\|\s*((?:StR|US|FR|NFR|IT)-\d+-(?:AC|CON|VC|EX|M)-\d+)\s*\|/gm,
			)) {
				declared.add(match[1]);
			}
			const id = /^id:\s*((?:StR|US|FR|NFR|IT)-\d+)\s*$/m.exec(body);
			if (id) declared.add(id[1]);
		}
	};
	walk(specRoot);
	return declared;
}

const declared = declaredCriteria();
const rows = [
	...text.matchAll(
		/^\| (TC-\d+) \| (.*?) \| (\w+) \| (P\d) \| (.*?) \| (.*?) \|$/gm,
	),
];
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
for (const [, , , type, , traces, status] of rows) {
	const bucket = buckets.get(type) ?? {
		total: 0,
		passed: 0,
		failed: 0,
		blocked: 0,
		mapped: 0,
	};
	bucket.total += 1;
	if (status.startsWith("✅")) bucket.passed += 1;
	else if (status.startsWith("❌")) bucket.failed += 1;
	else bucket.blocked += 1;
	// A row counts as mapped only when it names a criterion some spec artifact
	// declares. A range (`FR-012-AC-1..3`) is accepted as written.
	const named = [
		...traces.matchAll(/(?:StR|US|FR|NFR|IT)-\d+(?:-(?:AC|CON|VC|EX|M)-\d+)?/g),
	].map((match) => match[0]);
	const ranged = /-(?:AC|CON)-\d+\.\.\d+/.test(traces);
	if (ranged || named.some((id) => declared.has(id))) bucket.mapped += 1;
	buckets.set(type, bucket);
}
const unknown = [...buckets.keys()].filter((type) => !order.includes(type));
if (unknown.length > 0)
	throw new Error(`unknown test types: ${unknown.join(", ")}`);

const lines = [
	"| Category | Total | Passed | Failed | Blocked | Coverage |",
	"|---|---|---|---|---|---|",
];
// Floored and counted: rounding turned 229 of 230 into "100% mapped", which is
// exactly the reassurance a coverage column must not give.
const share = (bucket) =>
	`${Math.floor((bucket.mapped / bucket.total) * 100)}% mapped (${bucket.mapped}/${bucket.total})`;

const totals = { total: 0, passed: 0, failed: 0, blocked: 0, mapped: 0 };
for (const type of order) {
	const bucket = buckets.get(type);
	if (!bucket) continue;
	for (const key of Object.keys(totals)) totals[key] += bucket[key];
	lines.push(
		`| ${type} | ${bucket.total} | ${bucket.passed} | ${bucket.failed} | ${bucket.blocked} | ${share(bucket)} |`,
	);
}
lines.push(
	`| **Total** | **${totals.total}** | **${totals.passed}** | **${totals.failed}** | **${totals.blocked}** | **${share(totals)}** |`,
);
const table = lines.join("\n");

const marker = "| Category | Total | Passed | Failed | Blocked | Coverage |";
const start = text.indexOf(marker);
if (start < 0) throw new Error("summary table not found");
const end = text.indexOf("\n\n", text.indexOf("| **Total** |", start));
const updated = `${text.slice(0, start)}${table}${text.slice(end)}`;

if (process.argv.includes("--check")) {
	if (updated !== text) {
		process.stderr.write(
			"spec/tests.md execution summary is stale; run node scripts/test-matrix-summary.mjs\n",
		);
		process.exitCode = 1;
	}
	process.stdout.write(`${table}\n`);
} else {
	writeFileSync(path, updated);
	process.stdout.write(`${table}\n`);
}
