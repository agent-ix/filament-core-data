#!/usr/bin/env node
/**
 * Derives every identifier of `--count` generated documents and prints one
 * digest (FR-062-AC-13).
 *
 * It exists to be run twice, in two child processes, under `LANG=C` and under
 * `LANG=tr_TR.UTF-8`. The Turkish locale is the one that breaks a case
 * conversion: `i` upper-cases to `İ` there, so a derivation that reached for a
 * locale-sensitive mapping would print a different digest and the property that
 * compares the two digests would fail. Running it in-process would prove
 * nothing, because the locale is read by the host at start-up.
 */

import { createHash } from "node:crypto";
import { DEFAULT_SEED, documents } from "../generator.mjs";
import { mapDocument } from "../mapping.mjs";

function argument(name, fallback) {
	const index = process.argv.indexOf(name);
	if (index === -1 || process.argv[index + 1] === undefined) return fallback;
	return Number(process.argv[index + 1]);
}

const seed = argument("--seed", DEFAULT_SEED);
const count = argument("--count", 256);
if (!Number.isInteger(seed) || !Number.isInteger(count) || count < 1) {
	process.stderr.write(
		"derive-identifiers requires an integer --seed and a positive integer --count; it does not guess one\n",
	);
	process.exit(1);
}

const digest = createHash("sha256");
for (const { ir } of documents(seed, count)) {
	const { model, diagnostics } = mapDocument(ir, {});
	if (model === undefined) {
		digest.update(`refused:${diagnostics.map((one) => one.code).join(",")}\n`);
		continue;
	}
	for (const type of model.types) {
		digest.update(
			`${type.identity}\t${type.typeName}\t${type.moduleName}\t${type.constantName}\n`,
		);
		for (const field of type.fields ?? []) {
			digest.update(`${field.identity}\t${field.ident}\n`);
		}
		for (const variant of type.variants ?? []) {
			digest.update(`${variant.identity}\t${variant.ident}\n`);
		}
	}
}
process.stdout.write(`${digest.digest("hex")}\n`);
