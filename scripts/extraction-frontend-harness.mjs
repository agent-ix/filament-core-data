#!/usr/bin/env node
/**
 * The extraction frontend's two script verbs.
 *
 * - `rust-generate` runs the Rust backend over one lifted document (FR-098-AC-8).
 * - `identity-cases` evaluates the shared FR-095 identity table through the
 *   TypeSpec identity implementation (FR-095-AC-16).
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SELF = fileURLToPath(import.meta.url);

/** The repository this script lives in: `scripts/..`. */
const HOME_ROOT = resolve(dirname(SELF), "..");

// ---------------------------------------------------------------------------
// FR-098-AC-8, the Rust half: the rust-serde backend over one lifted document
// ---------------------------------------------------------------------------

/**
 * `rust-generate --ir <file> --out <dir> [--output-root <name>]`: run the
 * Rust backend (`generateRust` of `src/compiler/backends/rust-serde/index.mjs`,
 * the backend's own writer) over one IR document, the way
 * `src/compiler/backends/rust-serde/cli.mjs generate` runs it over the
 * conformance bases, and write `<out>/<root>.output-manifest.json`. Every
 * diagnostic is printed; the exit status is `1` when any diagnostic blocks,
 * so a refusal is a failure rather than a manifest nobody reads
 * (SR-170 FND-1500). The request is built exactly as `cli.mjs` `requestFor`
 * builds one — its exported `BACKEND`, `DEFAULT_PROFILE` and `DEFAULT_LIMITS`,
 * `mappings: []`, and a `lockFingerprint` over the document.
 */
async function rustGenerate(argv) {
	const ir = flag(argv, "--ir");
	const out = flag(argv, "--out");
	if (!ir || !out) {
		throw new Error("rust-generate requires --ir <file> and --out <dir>");
	}
	const outputRoot = flag(argv, "--output-root") ?? "lifted";
	const { createHash } = await import("node:crypto");
	const backend = await import(
		pathToFileURL(
			join(HOME_ROOT, "src", "compiler", "backends", "rust-serde", "index.mjs"),
		).href
	);
	const cli = await import(
		pathToFileURL(
			join(HOME_ROOT, "src", "compiler", "backends", "rust-serde", "cli.mjs"),
		).href
	);
	const document = JSON.parse(readFileSync(resolve(ir), "utf8"));
	const request = {
		contractVersion: "1.0.0",
		lockFingerprint: `sha256:${createHash("sha256").update(JSON.stringify(document), "utf8").digest("hex")}`,
		ir: document,
		profile: cli.DEFAULT_PROFILE,
		mappings: [],
		backend: cli.BACKEND,
		outputRoot,
		limits: cli.DEFAULT_LIMITS,
	};
	mkdirSync(resolve(out), { recursive: true });
	const manifest = backend.generateRust(
		request,
		backend.directorySink(resolve(out)),
		{
			licenseText: backend.readLicense(HOME_ROOT),
		},
	);
	writeFileSync(
		join(resolve(out), `${outputRoot}.output-manifest.json`),
		`${JSON.stringify(manifest, null, "\t")}\n`,
		"utf8",
	);
	process.stdout.write(
		`${outputRoot}: state=${manifest.state} files=${manifest.files.length} diagnostics=${manifest.diagnostics.length}\n`,
	);
	for (const entry of manifest.diagnostics) {
		process.stdout.write(
			`  ${entry.severity} ${entry.code}: ${entry.message}\n`,
		);
	}
	return manifest.diagnostics.some((entry) => entry.blocking) ? 1 : 0;
}

function flag(argv, name) {
	const index = argv.indexOf(name);
	return index === -1 ? undefined : argv[index + 1];
}

/**
 * Evaluate the shared FR-095 identity table through the TypeSpec identity
 * implementation. `identity.mjs` exposes a pure minter; this adapter makes
 * its empty-slug precondition explicit, so an empty part is the contract's
 * `UNSLUGGABLE_NAME` refusal rather than a silently shortened identity.
 */
async function identityCases(argv) {
	const table = flag(argv, "--table");
	if (!table) throw new Error("identity-cases requires --table <file>");
	const rows = JSON.parse(readFileSync(resolve(table), "utf8")).rows;
	if (!Array.isArray(rows))
		throw new Error("identity-cases table has no rows array");
	const identity = await import(
		pathToFileURL(
			join(
				HOME_ROOT,
				"src",
				"compiler",
				"frontend",
				"typespec",
				"identity.mjs",
			),
		).href
	);
	const output = rows.map((row) => {
		const refuse = (parts) =>
			parts.some((part) => identity.slug(part).length === 0);
		if (row.kind === "refusal") {
			return {
				kind: row.kind,
				refuses: refuse(row.parts) ? "UNSLUGGABLE_NAME" : null,
			};
		}
		if (row.kind === "identity") {
			return {
				kind: row.kind,
				identity: refuse(row.parts)
					? null
					: identity.mintIdentity(row.package, row.slot, row.parts),
			};
		}
		if (row.kind === "diagnosticCode") {
			return {
				kind: row.kind,
				code: identity.constraintDiagnosticCode(
					row.package,
					row.parts,
					row.keyword,
				),
			};
		}
		throw new Error(`identity-cases row has unknown kind ${row.kind}`);
	});
	emit(output);
	return 0;
}

function emit(report) {
	process.stdout.write(`${JSON.stringify(report, null, "\t")}\n`);
}

async function main(argv) {
	const verb = argv[0];
	switch (verb) {
		case "rust-generate":
			return rustGenerate(argv);
		case "identity-cases":
			return identityCases(argv);
		default:
			process.stderr.write(
				"usage: extraction-frontend-harness.mjs identity-cases --table FILE\n" +
					"       extraction-frontend-harness.mjs rust-generate --ir FILE --out DIR [--output-root NAME]\n",
			);
			return 1;
	}
}

if (process.argv[1] === SELF) {
	try {
		process.exitCode = await main(process.argv.slice(2));
	} catch (error) {
		process.stderr.write(`${error.message ?? error}\n`);
		process.exitCode = 1;
	}
}
