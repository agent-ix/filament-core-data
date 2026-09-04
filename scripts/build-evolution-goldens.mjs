#!/usr/bin/env node
/**
 * Builds the contract-version projection goldens (FR-051-AC-7, FR-051-AC-8).
 *
 * The input is the issue #34 worked `1.1.0` example, which this ticket may not
 * change; the outputs are its `1.0.0` projection and the round trip back. The
 * goldens are committed so a change to the projection shows up as a diff a
 * reviewer can read, rather than as a test that quietly agrees with whatever the
 * code now does.
 *
 * Usage: node scripts/build-evolution-goldens.mjs [--check]
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readIrAsContract } from "../src/compiler/compat/evolution.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = resolve(root, "test/fixtures/compiler/evolution");
const check = process.argv.includes("--check");

const source = JSON.parse(
	readFileSync(
		resolve(root, "fixtures/semantic/v1/positive/semantic-ir-v1-1.json"),
		"utf8",
	),
);

const forward = readIrAsContract(source, "1.0.0");
const backward = readIrAsContract(forward.document, "1.1.0", {
	dialect: "typespec",
});

const outputs = {
	"forward-1-0-0.json": {
		$comment:
			"The 1.0.0 projection of fixtures/semantic/v1/positive/semantic-ir-v1-1.json (FR-051-AC-7). `loss` names every 1.1.0-only member the projection dropped; a projection that dropped them silently would let a 1.0.0 consumer believe it had the whole contract.",
		loss: forward.loss,
		document: forward.document,
	},
	"backward-1-1-0.json": {
		$comment:
			"The 1.1.0 projection of the 1.0.0 document above (FR-051-AC-8), with the frontend dialect declared by the caller because the schema forbids the 1.0.0 constant on a 1.1.0 document. `loss` is empty: deriving multiplicity from presence adds nothing the old document did not already say.",
		loss: backward.loss,
		document: backward.document,
	},
};

mkdirSync(outputDir, { recursive: true });
let stale = 0;
for (const [name, value] of Object.entries(outputs)) {
	const bytes = `${JSON.stringify(value, null, "\t")}\n`;
	const path = resolve(outputDir, name);
	if (check) {
		let current = "";
		try {
			current = readFileSync(path, "utf8");
		} catch {
			current = "";
		}
		if (current !== bytes) {
			process.stderr.write(`stale: ${name}\n`);
			stale += 1;
		}
		continue;
	}
	writeFileSync(path, bytes);
}
if (check && stale > 0) process.exitCode = 1;
process.stdout.write(
	`${Object.keys(outputs).length} projection goldens${check ? " checked" : " written"}\n`,
);
