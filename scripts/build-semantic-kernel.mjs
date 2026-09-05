#!/usr/bin/env node
/**
 * The semantic kernel build (FR-081, FR-082, FR-084, FR-088).
 *
 * The sole file-system boundary. Every module it calls is pure: this script
 * reads the declaration and its inputs, hands values to predicates, and writes
 * what they return. Nothing under `src/compiler/frontend/json-schema/` touches
 * `node:fs`, so every case those predicates decide can be constructed in a
 * test rather than arranged on disk.
 *
 * `--check` writes nothing and exits non-zero if any artifact would change.
 * That is the staleness gate: a generated tree that outlives the source it was
 * generated from is wrong in the direction nothing reports, because it still
 * imports, still type-checks, and still validates.
 *
 * Generation only. Publication passes `agent-ix/quoin#290`, a human sign-off
 * that has not moved, and no step here invokes `cargo publish`, `npm publish`
 * or a PyPI upload.
 */

import { readFileSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
	checkKernelBundle,
	kernelDigest,
} from "../src/compiler/frontend/json-schema/bundle.mjs";
import { lowerBundle } from "../src/compiler/frontend/json-schema/lower.mjs";
import {
	KERNEL_LOSSES,
	checkLossBijection,
} from "../src/compiler/frontend/json-schema/representability.mjs";
import { provenanceOf } from "../src/compiler/frontend/json-schema/provenance.mjs";
import { typescriptBackend } from "../src/compiler/backends/typescript-v1/index.mjs";
import { createHost } from "../src/compiler/host.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const KERNEL = join(ROOT, "packages/semantic-kernel");
const SCHEMA_DIR = join(ROOT, "packages/semantic-core/generated/json-schema");

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const serialize = (value) => `${JSON.stringify(value, null, "\t")}\n`;

function main(argv) {
	const check = argv.includes("--check");
	const declaration = readJson(join(KERNEL, "bundle.json"));
	const inventory = readJson(
		join(ROOT, "packages/semantic-core/inventory.json"),
	);
	const toolchain = readJson(
		join(ROOT, "packages/semantic-core/generated/toolchain.json"),
	);
	const manifest = readJson(join(ROOT, "packages/semantic-core/package.json"));

	// The declaration is checked before anything is generated from it. A build
	// that generated first and validated afterwards would leave a tree on disk
	// that its own declaration rejects.
	const bundleDiagnostics = checkKernelBundle(
		declaration,
		inventory,
		toolchain,
		manifest,
	);
	const bijection = checkLossBijection();
	const problems = [
		...bundleDiagnostics,
		...bijection.codesWithoutRow.map((code) => ({
			code,
			message: `loss code ${code} has no KERNEL_LOSSES row`,
		})),
		...bijection.rowsWithoutCode.map((code) => ({
			code,
			message: `KERNEL_LOSSES row ${code} has no registered code`,
		})),
	];
	if (problems.length > 0) {
		for (const problem of problems) {
			process.stderr.write(`${problem.code}: ${problem.message}\n`);
		}
		process.exitCode = 1;
		return;
	}

	const documents = readdirSync(SCHEMA_DIR)
		.filter((name) => name.endsWith(".json"))
		.sort()
		.map((name) => [name, readJson(join(SCHEMA_DIR, name))]);

	const lowered = lowerBundle(documents);
	if (lowered.diagnostics) {
		for (const d of lowered.diagnostics) {
			process.stderr.write(`${d.code}: ${d.message}\n`);
		}
		process.exitCode = 1;
		return;
	}

	const inputDigest = kernelDigest(
		documents.map(([name]) => [
			name,
			readFileSync(join(SCHEMA_DIR, name), "utf8"),
		]),
	);

	/** @type {[string, string][]} */
	const artifacts = [
		["semantic-ir.json", serialize(lowered.document)],
		["losses.json", serialize({ losses: KERNEL_LOSSES })],
		[
			// The json-schema target is an index over the documents the grammar
			// already publishes, not a copy of them. One copy means no second copy
			// to drift.
			"json-schema/index.json",
			serialize({
				$comment:
					"Issue #11, FR-088. An index over packages/semantic-core/generated/json-schema/, never a copy of it.",
				base: toolchain.base,
				emissionDigest: toolchain.digest,
				documents: documents.map(([name]) => ({
					name,
					path: `../../semantic-core/generated/json-schema/${name}`,
				})),
			}),
		],
		[
			"provenance.json",
			serialize(
				provenanceOf({
					target: "json-schema",
					semanticCore: manifest.version,
					emissionDigest: toolchain.digest,
					inputDigest,
					losses: KERNEL_LOSSES,
				}),
			),
		],
	];

	// The TypeScript tree (FR-085). Generated through the backend issue #22
	// landed, not through a second emitter written here: a second emitter would
	// be a second contract, and the corpus judges only the first.
	const tsRequest = {
		contractVersion: "1.0.0",
		lockFingerprint: inputDigest,
		ir: lowered.document,
		profile: readJson(join(ROOT, "fixtures/semantic/v1/positive/profile.json")),
		mappings: [],
		backend: {
			identity: typescriptBackend.identity,
			version: typescriptBackend.version,
			supportedIrVersions: [...typescriptBackend.supportedIrVersions],
			supportedFeatures: [...typescriptBackend.supportedFeatures],
			options: {},
		},
		outputRoot: "packages/semantic-kernel/typescript",
		limits: {
			maxInputBytes: 16777216,
			maxDepth: 128,
			maxNodes: 100000,
			maxCollectionItems: 10000,
			maxDiagnostics: 1000,
		},
	};
	const ts = typescriptBackend.generate(tsRequest, {
		host: createHost({ readRoots: [ROOT] }),
	});
	if (ts.state !== "success") {
		for (const d of ts.diagnostics ?? []) {
			process.stderr.write(`${d.code}: ${d.message}\n`);
		}
		process.exitCode = 1;
		return;
	}
	for (const file of ts.files) {
		artifacts.push([`typescript/${file.path}`, file.text]);
	}

	let stale = 0;
	for (const [relative, contents] of artifacts) {
		const path = join(KERNEL, relative);
		let current = null;
		try {
			current = readFileSync(path, "utf8");
		} catch {
			current = null;
		}
		if (current === contents) continue;
		stale += 1;
		if (check) {
			process.stderr.write(
				`agent-ix.compiler.KERNEL_BUNDLE_STALE: ${relative} differs from a fresh generation\n`,
			);
			continue;
		}
		mkdirSync(dirname(path), { recursive: true });
		writeFileSync(path, contents);
	}

	if (check && stale > 0) {
		process.exitCode = 1;
		return;
	}
	process.stdout.write(
		check
			? `semantic kernel: ${artifacts.length} artifact(s) current\n`
			: `semantic kernel: ${artifacts.length} artifact(s) written, ${lowered.document.types.length} type definitions\n`,
	);
}

main(process.argv.slice(2));
