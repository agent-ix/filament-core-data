#!/usr/bin/env node
/**
 * The command line the `make rust-*` targets call.
 *
 * `generate`, `check`, `install-from-artifact`, `register`, `mutations`,
 * `mutate`, `fuzz` and `properties` are implemented here. A verb that is not
 * exits non-zero naming the task that implements it, rather than exiting zero
 * having done nothing: a gate that cannot run fails saying so, which is what
 * NFR-022-AC-1 requires of every gate in this bundle.
 *
 * `register --check` and `mutations --check` are FR-062's two closing gates.
 * Both are censuses of the finished mapping, so both read the vocabularies and
 * the suite rather than a file they wrote themselves, and both fail naming the
 * branch or the mutation at fault.
 */

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
	cpSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
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
import { runFuzz, runProperties } from "./properties.mjs";

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

// ---------------------------------------------------------------------------
// `install-from-artifact` (FR-061)
// ---------------------------------------------------------------------------
//
// The two consumers are built from the *packaged* crate, never from the
// generator's output directory, so that "it generates" and "it is usable" stay
// two separate pieces of evidence. The packaging step is `cargo package
// --offline --no-verify` and nothing else: no `cargo publish`, no
// `--registry`, no `--index`, and no publish `--dry-run`, because a dry-run
// publish still contacts an index and this issue's safety gate forbids crate
// publication outright. Every command this verb runs is recorded and the
// recorded list is checked against those four forbidden forms before the verb
// returns, so the claim is made against the list rather than by reading the
// target by eye (FR-061-AC-11).

/** The scratch root every step of this verb works inside. */
function scratchRoot() {
	const target =
		process.env.CARGO_TARGET_DIR ??
		join(ROOT, "node_modules", ".cache", "rust-target");
	return join(target, "artifact");
}

/**
 * The consumer contract the consumers are built against.
 *
 * It is `conformance/bases/core-1-1.json` plus three constructs the four
 * corpus bases do not carry and FR-061 requires evidence for: a record whose
 * unknown policy is `preserve`, a collection member with a `multiplicity.lower`
 * above zero, and a `required` package extension. Without them three of the
 * eight named invalid classes and the `preserve` round trip would have no value
 * to run against, and the honest report of that is a fixture rather than a
 * softened criterion.
 */
function consumerContract() {
	const path = join(
		ROOT,
		"test",
		"fixtures",
		"rust-serde",
		"consumer-contract.json",
	);
	return JSON.parse(readFileSync(path, "utf8")).ir;
}

/** Builds the compiler request for one IR document under one output root. */
function requestForIr(ir, outputRoot) {
	return {
		contractVersion: "1.0.0",
		lockFingerprint: sha256(JSON.stringify(ir)),
		ir,
		profile: DEFAULT_PROFILE,
		mappings: [],
		backend: BACKEND,
		outputRoot,
		limits: DEFAULT_LIMITS,
	};
}

/** Emits one crate into `parent/<outputRoot>` and returns its manifest. */
function emitInto(parent, ir, outputRoot) {
	mkdirSync(parent, { recursive: true });
	return generateRust(requestForIr(ir, outputRoot), directorySink(parent), {
		licenseText: readLicense(ROOT),
	});
}

/**
 * Runs one command, recording it. `expect` is `"success"` or `"failure"`: a
 * rehearsal expects a build to fail, and a rehearsal that quietly succeeded
 * would be evidence of nothing.
 */
function run(record, command, args, options = {}) {
	record.push([command, ...args].join(" "));
	const result = spawnSync(command, args, {
		cwd: options.cwd ?? ROOT,
		encoding: "utf8",
		// The offline claim is enforced twice: every cargo invocation carries
		// `--offline`, and the environment denies the network besides, so a
		// command that forgot the flag still cannot reach a registry.
		env: {
			...process.env,
			CARGO_NET_OFFLINE: "true",
			...(options.env ?? {}),
		},
	});
	if (result.error) {
		return { ok: false, code: null, out: String(result.error.message) };
	}
	return {
		ok: result.status === 0,
		code: result.status,
		out: `${result.stdout ?? ""}${result.stderr ?? ""}`,
	};
}

/** The four command forms this requirement forbids outright. */
const FORBIDDEN_COMMAND_FORMS = Object.freeze([
	{ name: "cargo publish", test: (line) => /\bcargo\s+publish\b/.test(line) },
	{ name: "--registry", test: (line) => line.includes("--registry") },
	{ name: "--index", test: (line) => line.includes("--index") },
	{ name: "a publish --dry-run", test: (line) => line.includes("--dry-run") },
]);

/** Fails where a manifest the change adds does not carry `publish = false`. */
function manifestPublishFalse(problems, path) {
	let text;
	try {
		text = readFileSync(path, "utf8");
	} catch {
		problems.push(`the manifest ${path} was not found`);
		return;
	}
	if (!/^publish\s*=\s*false$/m.test(text)) {
		problems.push(`the manifest ${path} does not carry \`publish = false\``);
	}
}

function installFromArtifact() {
	const problems = [];
	const commands = [];
	const scratch = scratchRoot();
	rmSync(scratch, { recursive: true, force: true });
	mkdirSync(scratch, { recursive: true });

	// 1. Emit the crate the consumers are built against.
	const source = join(scratch, "generated");
	const manifest = emitInto(source, consumerContract(), CRATE_DIR_NAME);
	if (manifest.state !== "success") {
		process.stderr.write(
			`install-from-artifact: the consumer contract did not generate: ${manifest.state}\n`,
		);
		return 1;
	}
	const crateDir = join(source, CRATE_DIR_NAME);
	process.stdout.write(
		`generated ${manifest.files.length} files for the consumer contract\n`,
	);

	// 2. Package it. This is the only packaging command in the requirement.
	const packageTarget = join(scratch, "package-target");
	const packaged = run(
		commands,
		"cargo",
		["package", "--offline", "--no-verify"],
		{
			cwd: crateDir,
			env: { CARGO_TARGET_DIR: packageTarget },
		},
	);
	if (!packaged.ok) {
		process.stderr.write(`cargo package failed:\n${packaged.out}\n`);
		return 1;
	}

	// 3. Unpack the artifact into the scratch directory the consumers build in.
	const build = join(scratch, "build");
	mkdirSync(build, { recursive: true });
	const tarball = join(packageTarget, "package", `${CRATE_DIR_NAME}.crate`);
	const unpacked = run(commands, "tar", ["-xzf", tarball, "-C", build]);
	if (!unpacked.ok) {
		process.stderr.write(`unpacking the artifact failed:\n${unpacked.out}\n`);
		return 1;
	}

	// 4. Copy the consumers in beside it. Their `path` dependency names a
	//    sibling of themselves inside this directory and reaches nothing in the
	//    generator's tree (FR-061-AC-9).
	for (const consumer of CONSUMERS) {
		cpSync(join(ROOT, "crates", consumer), join(build, consumer), {
			recursive: true,
		});
	}

	// 5. Build and run each consumer. `-D warnings` is passed to the local
	//    crate through `cargo rustc`; a global RUSTFLAGS would also deny
	//    warnings inside `serde` and fail for reasons unrelated to this
	//    backend.
	for (const consumer of CONSUMERS) {
		const cwd = join(build, consumer);
		manifestPublishFalse(problems, join(cwd, "Cargo.toml"));
		const built = run(
			commands,
			"cargo",
			["rustc", "--offline", "--", "-D", "warnings"],
			{
				cwd,
			},
		);
		if (!built.ok) {
			problems.push(`${consumer} did not build with -D warnings`);
			process.stderr.write(built.out);
			continue;
		}
		const tested = run(commands, "cargo", ["test", "--offline"], { cwd });
		process.stdout.write(tested.out);
		if (!tested.ok)
			problems.push(`${consumer} did not pass its own assertions`);
	}
	manifestPublishFalse(problems, join(build, CRATE_DIR_NAME, "Cargo.toml"));

	// 5b. The offline supply is a supply, not a fallback. The dependency set is
	//     vendored out of the existing cache — no step reaches a registry — the
	//     consumer is rebuilt against the vendored copy alone, and then one
	//     crate is removed from it. The rebuild has to *fail*: a build that
	//     fetched the missing crate instead would mean the offline claim was
	//     resting on a warm cache rather than on the flag (FR-061-AC-13).
	const supplyDir = join(scratch, "vendor");
	const supplyConsumer = join(build, "consumer-runtime");
	const vendored = run(commands, "cargo", ["vendor", "--offline", supplyDir], {
		cwd: supplyConsumer,
	});
	if (!vendored.ok) {
		problems.push("the dependency set could not be vendored offline");
		process.stderr.write(vendored.out);
	} else {
		mkdirSync(join(supplyConsumer, ".cargo"), { recursive: true });
		writeFileSync(
			join(supplyConsumer, ".cargo", "config.toml"),
			`[source.crates-io]\nreplace-with = "vendored-sources"\n\n[source.vendored-sources]\ndirectory = ${JSON.stringify(supplyDir)}\n`,
			"utf8",
		);
		const fromSupply = run(
			commands,
			"cargo",
			["build", "--offline", "--tests"],
			{
				cwd: supplyConsumer,
			},
		);
		if (!fromSupply.ok) {
			problems.push(
				"the consumer did not build against the vendored supply alone",
			);
			process.stderr.write(fromSupply.out);
		}
		rmSync(join(supplyDir, "serde_json"), { recursive: true, force: true });
		const withoutIt = run(
			commands,
			"cargo",
			["build", "--offline", "--tests"],
			{
				cwd: supplyConsumer,
			},
		);
		if (withoutIt.ok) {
			problems.push(
				"the build succeeded after `serde_json` was removed from the supply, so it did not come from the supply",
			);
		} else if (
			!withoutIt.out.includes("no matching package named `serde_json`")
		) {
			problems.push(
				"the build failed after `serde_json` was removed, but not because the supply no longer holds it",
			);
			process.stderr.write(withoutIt.out);
		} else {
			process.stdout.write(
				"offline supply: removing `serde_json` from the vendored set fails the build rather than fetching it\n",
			);
		}
		rmSync(join(supplyConsumer, ".cargo"), { recursive: true, force: true });
	}

	// 6. Rehearse the two compile failures against a document carrying one
	//    extra type. Each rehearsal isolates one failure: the first leaves the
	//    declared count correct so only the `match` can fail, the second
	//    restores the missing arm so only the `const` assertion can fail.
	const widened = consumerContract();
	widened.types = [...widened.types, EXTRA_TYPE];
	const rehearsalRoot = join(scratch, "rehearsal");
	emitInto(rehearsalRoot, widened, CRATE_DIR_NAME);

	const consumerSource = readFileSync(
		join(ROOT, "crates", "consumer-compile-time", "src", "lib.rs"),
		"utf8",
	);
	for (const rehearsal of REHEARSALS) {
		const cwd = join(rehearsalRoot, rehearsal.name);
		cpSync(join(ROOT, "crates", "consumer-compile-time"), cwd, {
			recursive: true,
		});
		writeFileSync(
			join(cwd, "src", "lib.rs"),
			rehearsal.patch(consumerSource),
			"utf8",
		);
		const attempt = run(commands, "cargo", ["build", "--offline"], { cwd });
		if (attempt.ok) {
			problems.push(
				`${rehearsal.name}: the build succeeded where ${rehearsal.expects} was expected`,
			);
			continue;
		}
		if (!rehearsal.matches(attempt.out)) {
			problems.push(
				`${rehearsal.name}: the build failed, but not with ${rehearsal.expects}`,
			);
			process.stderr.write(attempt.out);
			continue;
		}
		process.stdout.write(
			`${rehearsal.name}: ${rehearsal.expects}, as expected\n`,
		);
	}

	// 7. Check the recorded command list rather than the target by eye.
	process.stdout.write("commands invoked:\n");
	for (const line of commands) process.stdout.write(`  ${line}\n`);
	for (const form of FORBIDDEN_COMMAND_FORMS) {
		for (const line of commands) {
			if (form.test(line))
				problems.push(
					`the recorded command list contains ${form.name}: ${line}`,
				);
		}
	}
	if (
		!commands.some((line) => line === "cargo package --offline --no-verify")
	) {
		problems.push(
			"the recorded command list does not contain `cargo package --offline --no-verify`",
		);
	}

	for (const problem of problems)
		process.stderr.write(`install-from-artifact failed: ${problem}\n`);
	if (problems.length > 0) return 1;
	process.stdout.write(
		`install-from-artifact passed: ${commands.length} commands, ${CONSUMERS.length} consumers, ${REHEARSALS.length} rehearsals\n`,
	);
	return 0;
}

/** The unpacked artifact's directory name, which is `<name>-<version>`. */
const CRATE_DIR_NAME = "agent-ix-conformance-1.0.0";

/** The two consumer crates, in code-point order. */
const CONSUMERS = Object.freeze(["consumer-compile-time", "consumer-runtime"]);

/** The type the rehearsals add to the contract. */
const EXTRA_TYPE = Object.freeze({
	identity: "ix://agent-ix/conformance/type/Extra",
	displayName: "Extra",
	kind: "scalar",
	roles: [],
	origin: {
		source: {
			sourceIdentity: "ix://agent-ix/filament-core-data/source/typespec",
			path: "model/extra.tsp",
			startLine: 1,
			startColumn: 1,
		},
	},
	constraints: [],
	extensions: [],
	unknownPolicy: "reject",
	scalar: "string",
});

/** The two isolated compile-failure rehearsals. */
const REHEARSALS = Object.freeze([
	{
		name: "match-rehearsal",
		expects: "a non-exhaustive `match` (E0004)",
		// The declared count is moved with the contract, so the `const`
		// assertion holds and the only thing left to fail is the `match`.
		patch: (text) =>
			text.replace(
				"pub const DECLARED_TYPE_COUNT: usize = 12;",
				"pub const DECLARED_TYPE_COUNT: usize = 13;",
			),
		matches: (out) =>
			out.includes("E0004") || out.includes("non-exhaustive patterns"),
	},
	{
		name: "count-rehearsal",
		expects: "a failed `const` assertion over TYPES.len()",
		// The missing arm is restored, so the `match` is exhaustive and the
		// only thing left to fail is the `const` assertion.
		patch: (text) =>
			text.replace(
				'        SemanticType::Bundle => "record",',
				'        SemanticType::Bundle => "record",\n        SemanticType::Extra => "string",',
			),
		matches: (out) =>
			out.includes("evaluation of `_` failed") ||
			out.includes(
				"the generated crate exports a different number of types than this consumer declares",
			),
	},
]);

/** Reads a numeric flag, or `undefined` when it is absent. */
function numberFlag(argv, name) {
	const index = argv.indexOf(name);
	if (index === -1) return undefined;
	const value = Number(argv[index + 1]);
	if (!Number.isInteger(value)) {
		throw new Error(
			`${name} takes an integer; \`${argv[index + 1]}\` is not one, and this run fails rather than guessing`,
		);
	}
	return value;
}

function textFlag(argv, name) {
	const index = argv.indexOf(name);
	return index === -1 ? undefined : argv[index + 1];
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
async function mutationRun(catalogue, suppress = []) {
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

/** `mutate`: run the catalogue and report the detection score (FR-062-AC-3). */
async function mutate(argv) {
	const run = await mutationRun(buildCatalogue({ directory: HERE }));
	for (const result of run.results) {
		process.stdout.write(
			`${result.detectedBy.length > 0 ? "detected" : "UNDETECTED"} ${result.mutationId}${result.detectedBy.length > 0 ? ` by ${result.detectedBy.length} case(s)` : ""}\n`,
		);
	}
	process.stdout.write(
		`detection score ${run.score.toFixed(4)} (${run.detected} of ${run.applied} applied; ${run.total} catalogued)\n`,
	);
	for (const id of run.inapplicable) {
		process.stderr.write(
			`the mutation \`${id}\` could not be applied, so the mutant was never built and the score says nothing about it\n`,
		);
	}
	if (run.score === 1 && run.inapplicable.length === 0) return 0;
	for (const id of run.undetected) {
		process.stderr.write(
			`no case detects \`${id}\`: this is a gap in the suite, closed by adding a case and never by removing the mutation\n`,
		);
	}
	return 1;
}

/** `properties`: the declared battery over the declared document count. */
function properties(argv) {
	const deep = argv.includes("--deep");
	const count = numberFlag(argv, "--count") ?? (deep ? 2048 : 256);
	const seed = numberFlag(argv, "--seed");
	const only = textFlag(argv, "--only");
	const run = runProperties({
		seed,
		count,
		only,
		licenseText: readLicense(ROOT),
	});
	for (const result of run.results) {
		process.stdout.write(
			`${result.ok ? "held" : "FAILED"} ${result.id} over ${result.documents} documents\n`,
		);
		if (result.ok !== true) process.stderr.write(`${result.failure}\n`);
	}
	process.stdout.write(
		`seed ${run.seed}, ${run.count} documents per property, ${run.results.length} properties\n`,
	);
	return run.failures.length === 0 ? 0 : 1;
}

/** `fuzz`: adversarial documents, every one of which must reach a manifest. */
function fuzz(argv) {
	const count = numberFlag(argv, "--count") ?? 64;
	const run = runFuzz({
		seed: numberFlag(argv, "--seed"),
		count,
		licenseText: readLicense(ROOT),
	});
	for (const problem of run.problems)
		process.stderr.write(`fuzz failed: ${problem}\n`);
	process.stdout.write(
		`fuzz: ${run.checked} damaged documents from seed ${run.seed}, ${run.problems.length} problems\n`,
	);
	return run.problems.length === 0 ? 0 : 1;
}

/**
 * Decides the five published `target-verdicts.json` cases through a generated
 * crate and compares them to the fixture's `rust` column (FR-059-AC-10).
 *
 * It is a verb rather than part of `check` because it builds a Rust crate and
 * runs it, and `check` is the fast gate that answers whether this backend
 * agrees with itself.
 */
async function verdicts() {
	const harness = await import("./harness/target-verdicts.mjs");
	const report = harness.run();
	process.stdout.write(`${JSON.stringify(report, null, "\t")}\n`);
	return 0;
}

function notImplemented(verb, task) {
	process.stderr.write(
		`\`${verb}\` is not implemented in this task; ${task} implements it. This exits non-zero rather than passing vacuously.\n`,
	);
	return 1;
}

async function main(argv) {
	const verb = argv[0];
	switch (verb) {
		case "generate":
			return generate(argv.slice(1));
		case "check":
			return check();
		case "verdicts":
			return verdicts();
		case "install-from-artifact":
			return installFromArtifact();
		case "register":
			return register(argv.slice(1));
		case "mutations":
			return mutations(argv.slice(1));
		case "mutate":
			return mutate(argv.slice(1));
		case "fuzz":
			return fuzz(argv.slice(1));
		case "properties":
			return properties(argv.slice(1));
		default:
			process.stderr.write(
				"usage: cli.mjs <generate --out <dir> | check | register [--check] | mutations [--check] | mutate | fuzz | properties [--seed N] [--count N] [--only id] [--deep] | install-from-artifact>\n",
			);
			return 1;
	}
}

// Only when this file *is* the command. Importing it — the harnesses under
// `harness/` do — must not run a verb as a side effect.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
	process.exitCode = await main(process.argv.slice(2));
}
