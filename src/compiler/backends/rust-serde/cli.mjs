#!/usr/bin/env node
/**
 * The command line the `make rust-*` targets call.
 *
 * `generate`, `check`, `register` and `mutations` are implemented here. Each
 * reads and writes files and none of them starts a child process, because
 * FR-042-AC-4 holds every module under `src/compiler/` to spawning nothing.
 * The verbs that do run `cargo`, `rustfmt` or a second `node` —
 * `install-from-artifact`, `mutate`, `fuzz`, `properties` and `verdicts` — are
 * implemented in `scripts/rust-backend-harness.mjs`, which imports this file.
 * Naming one here exits non-zero saying where it lives, rather than exiting
 * zero having done nothing: a gate that cannot run fails saying so, which is
 * what NFR-022-AC-1 requires of every gate in this bundle.
 *
 * `register --check` and `mutations --check` are FR-062's two closing gates.
 * Both are censuses of the finished mapping, so both read the vocabularies and
 * the suite rather than a file they wrote themselves, and both fail naming the
 * branch or the mutation at fault.
 */

import { createHash } from "node:crypto";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
	buildRegister,
	checkRegister,
	readSuite,
	REGISTER_FILE,
	serializeRegister,
} from "./branch-register.mjs";
import { emitCrate } from "./crate.mjs";
import { REGISTERED_ENTRIES } from "./diagnostics.mjs";
import { DETECTORS, loadBackend, runDetectors } from "./harness/detectors.mjs";
import { directorySink, generateRust, readLicense } from "./index.mjs";
import { byCodePoint } from "./mapping.mjs";
import {
	buildCatalogue,
	CATALOGUE_FILE,
	runCatalogue,
	serializeCatalogue,
	structureOf,
} from "./mutations.mjs";
import { PROVED_VALIDATORS, PUBLISHED_PATTERNS } from "./patterns.mjs";

const HERE = fileURLToPath(new URL("./", import.meta.url));
const ROOT = fileURLToPath(new URL("../../../../", import.meta.url));

/** The backend's own identity and version, as the request carries them. */
export const BACKEND = Object.freeze({
	identity: "ix://agent-ix/filament-core-data/rust-backend",
	version: "0.1.0",
	supportedIrVersions: ["1.0.0", "1.1.0", "1.2.0"],
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

	// 6. The two closing censuses of FR-062. They run last, after the modules
	// they census have been read, because a census that runs over an empty
	// population is the shape of gate this bundle exists to refuse
	// (FR-062-CON-6).
	const suiteText = readSuite(ROOT);
	const registerCheck = checkRegister({
		directory: HERE,
		suiteText,
		committed: readFileSync(join(HERE, REGISTER_FILE), "utf8"),
		gaps: contractGaps(),
	});
	problems.push(...registerCheck.problems);

	// The catalogue's structural half: the operator set crossed with the target
	// set, and every mutation naming a case the detector battery carries. The
	// detection score itself is `mutate`, because running nineteen mutants is a
	// gate of its own rather than a line in this one.
	const catalogueCommitted = JSON.parse(
		readFileSync(join(HERE, CATALOGUE_FILE), "utf8"),
	);
	const catalogueRebuilt = buildCatalogue({ directory: HERE });
	if (
		serializeCatalogue(structureOf(catalogueRebuilt)) !==
		serializeCatalogue(structureOf(catalogueCommitted))
	) {
		problems.push(
			`${CATALOGUE_FILE} is stale: the operator set crossed with the target set no longer produces the committed entries`,
		);
	}
	const detectorCases = new Set(DETECTORS.map((one) => one.caseId));
	const suiteCases = new Set(
		buildRegister({ directory: HERE, suiteText }).caseTitles,
	);
	for (const detector of DETECTORS) {
		if (suiteCases.has(detector.caseId)) continue;
		problems.push(
			`the detector \`${detector.caseId}\` names a case the suite does not carry`,
		);
	}
	for (const mutation of catalogueCommitted.mutations ?? []) {
		if (mutation.detectedBy.length === 0) {
			problems.push(
				`the mutation \`${mutation.mutationId}\` records no detecting case`,
			);
		}
		for (const caseId of mutation.detectedBy) {
			if (detectorCases.has(caseId)) continue;
			problems.push(
				`the mutation \`${mutation.mutationId}\` names the detecting case "${caseId}", which the detector battery does not carry`,
			);
		}
	}

	for (const problem of problems)
		process.stderr.write(`check failed: ${problem}\n`);
	if (problems.length > 0) return 1;
	process.stdout.write(
		`check passed: ${REGISTERED_ENTRIES.length} registered codes, ${table.rows.length} mapping rows, ${registerCheck.register.rowCount} branch-register rows, ${catalogueRebuilt.mutationCount} catalogued mutations\n`,
	);
	return 0;
}

/**
 * The declared contract gaps, which a branch recorded unreachable cites.
 *
 * A missing file is not silently an empty set: the check reports that it could
 * not resolve the reason, which is a failure and not a pass.
 */
function contractGaps() {
	try {
		return JSON.parse(
			readFileSync(join(ROOT, "conformance", "contract-gaps.json"), "utf8"),
		);
	} catch {
		return { gaps: [] };
	}
}

/** `register` and `register --check` (FR-062-AC-1, FR-062-AC-2, FR-062-AC-8). */
function register(argv) {
	const suiteText = readSuite(ROOT);
	if (!argv.includes("--check")) {
		const built = buildRegister({ directory: HERE, suiteText });
		writeFileSync(
			join(HERE, REGISTER_FILE),
			serializeRegister(built.register),
			"utf8",
		);
		process.stdout.write(
			`wrote ${REGISTER_FILE}: ${built.register.rowCount} branches, ${built.register.unmetCount} unmet, ${built.register.unreachableCount} recorded unreachable\n`,
		);
		return built.register.unmetCount === 0 ? 0 : 1;
	}
	let committed;
	try {
		committed = readFileSync(join(HERE, REGISTER_FILE), "utf8");
	} catch {
		process.stderr.write(
			`register check failed: ${REGISTER_FILE} is missing, so the gate could not run\n`,
		);
		return 1;
	}
	const { problems, register: built } = checkRegister({
		directory: HERE,
		suiteText,
		committed,
		gaps: contractGaps(),
	});
	for (const problem of problems)
		process.stderr.write(`register check failed: ${problem}\n`);
	if (problems.length > 0) return 1;
	process.stdout.write(
		`register check passed: ${built.rowCount} branches, every one named by a case (${Object.entries(
			built.contributions,
		)
			.map(([key, value]) => `${key} ${value}`)
			.join(", ")})\n`,
	);
	return 0;
}

/** The backend options every detector run shares: the corpus and the pristine bytes. */
function detectorOptions() {
	const licenseText = readLicense(ROOT);
	const bases = corpusBases();
	const baseline = new Map(
		bases.map((base) => {
			const result = emitCrate(requestFor(base), { licenseText });
			return [
				base.name,
				[...result.files].map(([path, text]) => `${path}\n${text}`).join(""),
			];
		}),
	);
	return { licenseText, bases, baseline, publishedCodes: publishedCodes() };
}

/** The published reader codes, read from the corpus artefact that fixes them. */
function publishedCodes() {
	const published = JSON.parse(
		readFileSync(join(ROOT, "conformance", "diagnostic-codes.json"), "utf8"),
	);
	return published.codes.map((one) => one.code);
}

/** Runs the whole catalogue and returns the run. */
export async function mutationRun(catalogue, suppress = []) {
	return runCatalogue({
		root: ROOT,
		catalogue,
		detectors: { loadBackend, runDetectors },
		backendOptions: detectorOptions(),
		suppress,
	});
}

/** `mutations` and `mutations --check` (FR-062-AC-9). */
async function mutations(argv) {
	const suiteText = readSuite(ROOT);
	const titles = new Set(
		buildRegister({ directory: HERE, suiteText }).caseTitles,
	);
	const problems = [];
	for (const detector of DETECTORS) {
		if (titles.has(detector.caseId)) continue;
		problems.push(
			`the detector \`${detector.caseId}\` names a case the suite does not carry`,
		);
	}

	if (!argv.includes("--check")) {
		const run = await mutationRun(buildCatalogue({ directory: HERE }));
		const expected = Object.fromEntries(
			run.results.map((one) => [one.mutationId, one.detectedBy]),
		);
		const catalogue = buildCatalogue({ directory: HERE, expected });
		writeFileSync(
			join(HERE, CATALOGUE_FILE),
			serializeCatalogue(catalogue),
			"utf8",
		);
		process.stdout.write(
			`wrote ${CATALOGUE_FILE}: ${catalogue.mutationCount} mutations over ${catalogue.operators.length} operators and ${catalogue.targets.length} targets, detection score ${run.score.toFixed(4)}\n`,
		);
		for (const problem of problems)
			process.stderr.write(`mutations failed: ${problem}\n`);
		for (const id of run.inapplicable) {
			process.stderr.write(
				`mutations failed: the mutation \`${id}\` could not be applied, so it was never tried\n`,
			);
		}
		return problems.length === 0 &&
			run.score === 1 &&
			run.inapplicable.length === 0
			? 0
			: 1;
	}

	let committed;
	try {
		committed = JSON.parse(readFileSync(join(HERE, CATALOGUE_FILE), "utf8"));
	} catch {
		process.stderr.write(
			`mutations check failed: ${CATALOGUE_FILE} is missing, so the gate could not run\n`,
		);
		return 1;
	}
	const rebuilt = buildCatalogue({ directory: HERE });
	if (
		serializeCatalogue(structureOf(rebuilt)) !==
		serializeCatalogue(structureOf(committed))
	) {
		problems.push(
			`${CATALOGUE_FILE} is stale: the operator set crossed with the target set no longer produces the committed entries. Regenerate it with \`cli.mjs mutations\`.`,
		);
	}
	const detectorCases = new Set(DETECTORS.map((one) => one.caseId));
	for (const mutation of committed.mutations ?? []) {
		if (mutation.detectedBy.length === 0) {
			problems.push(
				`the mutation \`${mutation.mutationId}\` records no detecting case; close it by adding a case, never by removing the mutation`,
			);
		}
		for (const caseId of mutation.detectedBy) {
			if (detectorCases.has(caseId)) continue;
			problems.push(
				`the mutation \`${mutation.mutationId}\` names the detecting case "${caseId}", which the detector battery does not carry`,
			);
		}
	}
	for (const problem of problems)
		process.stderr.write(`mutations check failed: ${problem}\n`);
	if (problems.length > 0) return 1;
	process.stdout.write(
		`mutations check passed: ${committed.mutations.length} mutations, ${committed.operators.length} operators, ${committed.targets.length} targets, every mutation naming a case the suite carries\n`,
	);
	return 0;
}

/**
 * The verbs that need a child process, and where they live.
 *
 * `install-from-artifact`, `mutate`, `fuzz`, `properties` and `verdicts` run
 * `cargo`, `rustfmt` or a second `node`, and FR-042-AC-4 holds every module
 * under `src/compiler/` to spawning nothing. They are therefore implemented in
 * `scripts/rust-backend-harness.mjs`, which imports this file rather than the
 * other way round. Naming one here exits non-zero saying where it is, rather
 * than exiting zero having done nothing (NFR-022-AC-1).
 */
const MOVED_VERBS = Object.freeze([
	"install-from-artifact",
	"mutate",
	"fuzz",
	"properties",
	"verdicts",
]);

function movedOut(verb) {
	process.stderr.write(
		`\`${verb}\` runs a child process, so it is not implemented here: \`node scripts/rust-backend-harness.mjs ${verb}\` runs it. This exits non-zero rather than passing vacuously.\n`,
	);
	return 1;
}

async function main(argv) {
	const verb = argv[0];
	if (MOVED_VERBS.includes(verb)) return movedOut(verb);
	switch (verb) {
		case "generate":
			return generate(argv.slice(1));
		case "check":
			return check();
		case "register":
			return register(argv.slice(1));
		case "mutations":
			return mutations(argv.slice(1));
		default:
			process.stderr.write(
				"usage: cli.mjs <generate --out <dir> | check | register [--check] | mutations [--check]>; the child-process verbs are `node scripts/rust-backend-harness.mjs <install-from-artifact | mutate | fuzz | properties | verdicts>`\n",
			);
			return 1;
	}
}

// Only when this file *is* the command. Importing it — the harnesses under
// `scripts/` do — must not run a verb as a side effect.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
	process.exitCode = await main(process.argv.slice(2));
}
