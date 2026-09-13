/**
 * Materializes the corpus into plain JSON one non-JavaScript adapter can read.
 *
 * An adapter written in a language that cannot import `conformance/oracle/index.mjs`
 * has two ways to obtain a case's input bundle: reimplement base loading and
 * patch application in its own language, or read a bundle somebody else built.
 * The first is what the `rust-backend` adapter does, and it costs that adapter a
 * JSON Patch implementation whose bugs are indistinguishable from reader bugs —
 * a materialization defect reports as a conformance divergence. This verb
 * removes that confusion for every adapter after it.
 *
 * It writes bundles and nothing else. No verdict, no diagnostic, no
 * classification and no expectation crosses this boundary: an adapter that read
 * the oracle's answer would measure the oracle against itself, which is the one
 * failure mode the corpus exists to prevent. Case metadata is limited to what an
 * adapter must echo (`caseId`, `caseDigest`) or dispatch on (`kind`).
 *
 * Usage: `node tools/materialize-cases.mjs [directory]`, from `conformance/`.
 * The default directory is `.cases/`, which is generated and not committed.
 */

import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { buildBefore, buildInput, loadCorpus, ROOT } from "../corpus.mjs";

/** The members an adapter may see: what it echoes, and what it dispatches on. */
function row(entry, digest) {
	const materialized = {
		caseId: entry.id,
		caseDigest: digest,
		kind: entry.kind,
		contractVersion: entry.contractVersion,
		input: buildInput(entry),
	};
	if (entry.kind === "compatibility") {
		materialized.before = buildBefore(entry);
	}
	return materialized;
}

/**
 * Writes one file per case plus an `index.json` in manifest order.
 *
 * The directory is emptied first: a stale file from a corpus version that no
 * longer declares its case is a case an adapter would answer and the harness
 * would reject, and diagnosing that costs more than rewriting the tree.
 */
export function materializeCases(directory) {
	const { manifest, cases } = loadCorpus();
	const digests = new Map(manifest.cases.map((one) => [one.id, one.digest]));
	rmSync(directory, { recursive: true, force: true });
	mkdirSync(directory, { recursive: true });
	const index = [];
	for (const entry of cases) {
		const materialized = row(entry, digests.get(entry.id));
		writeFileSync(
			join(directory, `${entry.id}.json`),
			`${JSON.stringify(materialized, null, "\t")}\n`,
		);
		index.push({
			caseId: entry.id,
			caseDigest: materialized.caseDigest,
			kind: entry.kind,
			path: `${entry.id}.json`,
		});
	}
	writeFileSync(
		join(directory, "index.json"),
		`${JSON.stringify({ corpusVersion: manifest.corpusVersion, cases: index }, null, "\t")}\n`,
	);
	return { directory, count: index.length };
}

if (import.meta.url === `file://${process.argv[1]}`) {
	const target = resolve(ROOT, process.argv[2] ?? ".cases");
	const { count } = materializeCases(target);
	process.stderr.write(`materialized ${count} cases into ${target}\n`);
}
