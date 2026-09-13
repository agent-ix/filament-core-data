/**
 * The end-to-end spec path, run as one gate (EPIC #100 criterion 2).
 *
 * The criterion is that a repository `spec/` tree reaches generated types in
 * Rust, TypeScript, Python and JSON Schema, demonstrated end to end on one real
 * bundle. Every piece of that chain already had a gate of its own — the Rust
 * lift has its goldens, each backend has its expected package — and none of
 * them asserts that the chain joins up. A backend whose input arrives from a
 * hand-written IR fixture is not evidence that the frontend's output is
 * admissible to it, which is exactly the join this repository has broken twice.
 *
 * So this runs the real thing: the lift writes an IR document from markdown,
 * and that document, not a fixture, is what every target generates from.
 *
 * The fingerprint check is the part worth keeping. `normalizedFingerprint` is
 * the seam's fingerprint of the *IR*, so every target must report the same one
 * from a single lift. A target reporting a different fingerprint has either
 * normalized the IR differently or generated from something else, and both are
 * defects that no per-backend golden can see.
 */
import { execFileSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const TARGETS = [
	"typescript",
	"rust",
	"json-schema",
	"python-pydantic-v2",
	"python-dataclass",
];

const [irPath, stagingRoot] = process.argv.slice(2);
if (!irPath || !stagingRoot) {
	console.error(
		"usage: node scripts/spec-to-targets.mjs <semantic-ir.json> <staging root>",
	);
	process.exit(2);
}

const countFiles = (dir) => {
	let total = 0;
	for (const entry of readdirSync(dir)) {
		const path = join(dir, entry);
		total += statSync(path).isDirectory() ? countFiles(path) : 1;
	}
	return total;
};

const failures = [];
const fingerprints = new Map();
const rows = [];

for (const target of TARGETS) {
	const outRoot = resolve(stagingRoot, target);
	let manifest;
	try {
		manifest = JSON.parse(
			execFileSync(
				process.execPath,
				[
					"src/compiler/cli.mjs",
					"generate",
					"--ir",
					irPath,
					"--target",
					target,
					"--out-root",
					outRoot,
				],
				{ encoding: "utf8" },
			),
		);
	} catch (error) {
		failures.push(
			`${target}: generate failed: ${error.stderr || error.message}`,
		);
		continue;
	}

	const blocking = (manifest.diagnostics ?? []).filter(
		(entry) => entry.severity !== "info" && entry.severity !== "warning",
	);
	if (blocking.length > 0) {
		failures.push(
			`${target}: ${blocking.length} blocking diagnostic(s): ${blocking
				.map((entry) => entry.code)
				.join(", ")}`,
		);
	}

	let files = 0;
	try {
		files = countFiles(outRoot);
	} catch {
		files = 0;
	}
	if (files === 0) {
		failures.push(`${target}: generated no files`);
	}

	fingerprints.set(target, manifest.normalizedFingerprint);
	rows.push({ target, files, fingerprint: manifest.normalizedFingerprint });
}

const distinct = new Set(fingerprints.values());
if (distinct.size > 1) {
	failures.push(
		`the targets disagree on the IR fingerprint: ${[...fingerprints]
			.map(([target, value]) => `${target}=${value}`)
			.join(", ")}`,
	);
}

const ir = JSON.parse(
	execFileSync("cat", [irPath], {
		encoding: "utf8",
		maxBuffer: 64 * 1024 * 1024,
	}),
);
console.log(
	`lifted ${ir.types.length} type(s) from ${ir.package.identity} at contract ${ir.contractVersion}`,
);
for (const row of rows) {
	console.log(
		`  ${row.target.padEnd(20)} ${String(row.files).padStart(3)} file(s)`,
	);
}
console.log(`  IR fingerprint ${[...distinct][0] ?? "(none)"}`);

if (ir.types.length === 0) {
	failures.push(
		"the bundle lifted zero types, so every target below generated over an empty population",
	);
}

if (failures.length > 0) {
	console.error("\nspec-to-targets failed:");
	for (const failure of failures) console.error(`  - ${failure}`);
	process.exit(1);
}
console.log("\nspec-to-targets: the spec path reaches every target.");
