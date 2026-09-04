#!/usr/bin/env node
/**
 * The command line the `make rust-*` targets call.
 *
 * `generate` and `check` are implemented here. The remaining verbs the Makefile
 * already wires — `install-from-artifact`, `mutate`, `fuzz` and `properties` —
 * exit non-zero naming the task that implements them, rather than exiting zero
 * having done nothing: a gate that cannot run fails saying so, which is what
 * NFR-022-AC-1 requires of every gate in this bundle.
 */

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { emitCrate } from "./crate.mjs";
import { REGISTERED_ENTRIES } from "./diagnostics.mjs";
import { byCodePoint } from "./mapping.mjs";
import { PROVED_VALIDATORS, PUBLISHED_PATTERNS } from "./patterns.mjs";
import { directorySink, generateRust, readLicense } from "./index.mjs";

const HERE = fileURLToPath(new URL("./", import.meta.url));
const ROOT = fileURLToPath(new URL("../../../../", import.meta.url));

/** The backend's own identity and version, as the request carries them. */
export const BACKEND = Object.freeze({
	identity: "ix://agent-ix/filament-core-data/rust-backend",
	version: "0.1.0",
	supportedIrVersions: ["1.0.0", "1.1.0"],
	supportedFeatures: [
		"kind:scalar",
		"kind:record",
		"kind:enum",
		"kind:union",
		"kind:alias",
		"kind:sequence",
		"kind:map",
		"kind:reference",
	],
	options: {},
});

/** The limits a `make` invocation runs under, in the absence of a request file. */
export const DEFAULT_LIMITS = Object.freeze({
	maxInputBytes: 33554432,
	maxDepth: 256,
	maxNodes: 1000000,
	maxCollectionItems: 100000,
	maxDiagnostics: 1000,
});

/** The profile a `make` invocation runs under: nothing is dropped. */
export const DEFAULT_PROFILE = Object.freeze({
	contractVersion: "1.0.0",
	identity: "ix://agent-ix/filament-core-data/profile/rust-backend-default",
	version: "1.0.0",
	authority: "semantic-source",
	editDirection: "read-only",
	roundTrip: "semantic-lossless",
	unknownPolicy: "reject",
	allowedOmissions: [],
	enrichment: false,
	materializationLifetime: "run",
});

function sha256(text) {
	return `sha256:${createHash("sha256").update(text, "utf8").digest("hex")}`;
}

/** The conformance bases, in code-point order of their file name. */
export function corpusBases(root = ROOT) {
	const directory = join(root, "conformance", "bases");
	return readdirSync(directory)
		.filter((name) => name.endsWith(".json"))
		.sort(byCodePoint)
		.map((name) => ({
			name: name.replace(/\.json$/, ""),
			path: join(directory, name),
			bundle: JSON.parse(readFileSync(join(directory, name), "utf8")),
		}));
}

/** Builds a compiler request for one base. */
export function requestFor(base) {
	return {
		contractVersion: "1.0.0",
		lockFingerprint: sha256(JSON.stringify(base.bundle.ir)),
		ir: base.bundle.ir,
		profile: DEFAULT_PROFILE,
		mappings: [],
		backend: BACKEND,
		outputRoot: base.name,
		limits: DEFAULT_LIMITS,
	};
}

function generate(argv) {
	const outIndex = argv.indexOf("--out");
	if (outIndex === -1 || argv[outIndex + 1] === undefined) {
		process.stderr.write("generate requires --out <dir>\n");
		return 1;
	}
	const out = argv[outIndex + 1];
	mkdirSync(out, { recursive: true });
	const sink = directorySink(out);
	const licenseText = readLicense(ROOT);
	let failures = 0;

	for (const base of corpusBases()) {
		const request = requestFor(base);
		const manifest = generateRust(request, sink, { licenseText });
		writeFileSync(
			join(out, `${base.name}.output-manifest.json`),
			`${JSON.stringify(manifest, null, "\t")}\n`,
			"utf8",
		);
		const blocking = manifest.diagnostics.filter((entry) => entry.blocking);
		process.stdout.write(
			`${base.name}: state=${manifest.state} files=${manifest.files.length} diagnostics=${manifest.diagnostics.length}\n`,
		);
		for (const entry of manifest.diagnostics) {
			process.stdout.write(
				`  ${entry.severity} ${entry.code}: ${entry.message}\n`,
			);
		}
		if (blocking.length > 0) failures += 1;
	}
	if (failures > 0) {
		process.stderr.write(
			`${failures} of the corpus bases carry a blocking diagnostic and emitted no crate\n`,
		);
	}
	return 0;
}

/**
 * `check` measures the backend against itself and against the artefacts it
 * copied from, and it fails only on a defect in the backend.
 *
 * A blocking diagnostic raised by a *base* is a fact about that base, not about
 * this backend, so it is reported rather than counted as a check failure; the
 * emitting gate that must fail on it is `make rust-build`, which has no crate
 * to build.
 */
function check() {
	const problems = [];

	// 1. The two copied patterns still equal the schema they were read from.
	const schema = JSON.parse(
		readFileSync(
			join(ROOT, "schema", "semantic", "v1", "common.schema.json"),
			"utf8",
		),
	);
	const expected = {
		semanticIdentity: schema.$defs.semanticIdentity.pattern,
		sourceLocusPath: schema.$defs.sourceLocus.properties.path.pattern,
	};
	for (const [name, regex] of Object.entries(expected)) {
		if (PUBLISHED_PATTERNS[name]?.regex !== regex) {
			problems.push(
				`published-patterns.json carries a stale \`${name}\`: the schema says ${JSON.stringify(regex)}`,
			);
		}
	}
	const provedKeys = Object.keys(PROVED_VALIDATORS.entries);
	if (provedKeys.length !== 1 || provedKeys[0] !== expected.sourceLocusPath) {
		problems.push(
			"proved-validators.json must carry exactly the published sourceLocus.path pattern as its one key",
		);
	}

	// 2. Every diagnostic code the mapping table names is a registered code.
	const table = JSON.parse(
		readFileSync(join(HERE, "mapping-table.json"), "utf8"),
	);
	const registered = new Set(REGISTERED_ENTRIES.map((entry) => entry.code));
	for (const row of table.rows) {
		if (row.diagnosticCode === null) continue;
		if (registered.has(row.diagnosticCode)) continue;
		problems.push(
			`mapping-table.json row \`${row.rowKey}\` names the unregistered code ${row.diagnosticCode}`,
		);
	}

	// 3. Every row key is unique, so a row cannot be selected two ways.
	const seen = new Set();
	for (const row of table.rows) {
		if (seen.has(row.rowKey))
			problems.push(`duplicate row key \`${row.rowKey}\``);
		seen.add(row.rowKey);
	}

	// 4. No live generator path names a code by string literal.
	const sources = readdirSync(HERE)
		.filter((name) => name.endsWith(".mjs"))
		.sort(byCodePoint);
	for (const name of sources) {
		if (name === "diagnostics.mjs" || name === "cli.mjs") continue;
		const text = readFileSync(join(HERE, name), "utf8");
		const literals = text.match(/"agent-ix\.rust-backend\.[A-Z_]+"/g) ?? [];
		for (const literal of literals) {
			problems.push(
				`${name} names a diagnostic code by string literal: ${literal}`,
			);
		}
	}

	// 5. Generating each base twice produces the same bytes.
	const licenseText = readLicense(ROOT);
	for (const base of corpusBases()) {
		const request = requestFor(base);
		const first = emitCrate(request, { licenseText });
		const second = emitCrate(request, { licenseText });
		const left = [...first.files]
			.map(([path, text]) => `${path}\n${text}`)
			.join("");
		const right = [...second.files]
			.map(([path, text]) => `${path}\n${text}`)
			.join("");
		if (left !== right)
			problems.push(`${base.name} is not byte-identical across two runs`);
		process.stdout.write(
			`${base.name}: state=${first.state} files=${first.files.size} diagnostics=${first.diagnostics.length}\n`,
		);
		for (const entry of first.diagnostics) {
			process.stdout.write(
				`  ${entry.severity} ${entry.code}: ${entry.message}\n`,
			);
		}
	}

	for (const problem of problems)
		process.stderr.write(`check failed: ${problem}\n`);
	if (problems.length > 0) return 1;
	process.stdout.write(
		`check passed: ${REGISTERED_ENTRIES.length} registered codes, ${table.rows.length} mapping rows\n`,
	);
	return 0;
}

function notImplemented(verb, task) {
	process.stderr.write(
		`\`${verb}\` is not implemented in this task; ${task} implements it. This exits non-zero rather than passing vacuously.\n`,
	);
	return 1;
}

function main(argv) {
	const verb = argv[0];
	switch (verb) {
		case "generate":
			return generate(argv.slice(1));
		case "check":
			return check();
		case "install-from-artifact":
			return notImplemented("install-from-artifact", "Task-091");
		case "mutate":
			return notImplemented("mutate", "Task-092");
		case "fuzz":
			return notImplemented("fuzz", "Task-092");
		case "properties":
			return notImplemented("properties", "Task-090");
		default:
			process.stderr.write(
				"usage: cli.mjs <generate --out <dir> | check | install-from-artifact | mutate | fuzz | properties>\n",
			);
			return 1;
	}
}

// Only when this file *is* the command. Importing it — the harnesses under
// `harness/` do — must not run a verb as a side effect.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
	process.exitCode = main(process.argv.slice(2));
}
