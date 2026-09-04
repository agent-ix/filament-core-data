#!/usr/bin/env node
/**
 * The Rust backend's process-running harness.
 *
 * The generator under `src/compiler/backends/rust-serde/` is pure: it never
 * spawns a process, and `test/compiler.test.ts` holds it to that over every
 * module under `src/compiler/`. A harness that runs `cargo`, `rustfmt` or a
 * second `node` is not the generator, so it lives here and imports the pure
 * modules rather than the other way round.
 *
 * The verbs are the ones that need a child process, plus the two runs that
 * belong beside them in `make rust-deep`:
 *
 * - `install-from-artifact` (FR-061) packages the generated crate and builds
 *   both consumers against the unpacked artifact.
 * - `mutate` (FR-062-AC-3) runs the mutation catalogue and reports the score.
 * - `fuzz` (FR-058) drives adversarial documents through the emitter.
 * - `properties` runs the **whole** battery, including the locale-independence
 *   property, whose two child processes are `deriveIdentifierDigest` below.
 *   `cli.mjs properties` runs the pure eight; this verb runs all nine.
 * - `verdicts` (FR-059-AC-10) decides the published target verdicts through a
 *   generated crate.
 *
 * A verb that is not implemented exits non-zero naming what would implement it,
 * rather than exiting zero having done nothing (NFR-022-AC-1).
 */

import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
	cpSync,
	mkdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
	BACKEND,
	DEFAULT_LIMITS,
	DEFAULT_PROFILE,
	mutationRun,
} from "../src/compiler/backends/rust-serde/cli.mjs";
import {
	directorySink,
	generateRust,
	readLicense,
} from "../src/compiler/backends/rust-serde/index.mjs";
import { buildCatalogue } from "../src/compiler/backends/rust-serde/mutations.mjs";
import {
	runFuzz,
	runProperties,
} from "../src/compiler/backends/rust-serde/properties.mjs";

const ROOT = fileURLToPath(new URL("../", import.meta.url));

/**
 * The child that derives every identifier under one locale (FR-062-AC-13).
 *
 * It is a *child*, and it has to be: Node resolves its ICU locale at start-up,
 * so a derivation compared in-process would compare two runs of one locale and
 * prove nothing. The module it runs is pure — it derives and prints a digest —
 * and only this call, which is outside `src/compiler/`, starts it.
 */
const LOCALE_CHILD = fileURLToPath(
	new URL(
		"../src/compiler/backends/rust-serde/harness/derive-identifiers.mjs",
		import.meta.url,
	),
);

/** Derives the identifier digest of `count` documents under one locale. */
export function deriveIdentifierDigest(locale, seed, count) {
	return execFileSync(
		process.execPath,
		[LOCALE_CHILD, "--seed", String(seed), "--count", String(count)],
		{
			encoding: "utf8",
			env: { ...process.env, LANG: locale, LC_ALL: locale },
		},
	).trim();
}

function sha256(text) {
	return `sha256:${createHash("sha256").update(text, "utf8").digest("hex")}`;
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

/** `mutate`: run the catalogue and report the detection score (FR-062-AC-3). */
async function mutate() {
	const run = await mutationRun(buildCatalogue());
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
 * `properties`: the whole declared battery, over the declared document count.
 *
 * This is the entry that runs all nine, because the ninth compares two child
 * processes and the deriver that starts them is this file's. `cli.mjs
 * properties` runs the pure eight and says so.
 */
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
		deriveIdentifierDigest,
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

/**
 * Decides the five published `target-verdicts.json` cases through a generated
 * crate and compares them to the fixture's `rust` column (FR-059-AC-10).
 *
 * It is a verb rather than part of `check` because it builds a Rust crate and
 * runs it, and `check` is the fast gate that answers whether this backend
 * agrees with itself.
 */
async function verdicts() {
	const harness = await import("./rust-backend-target-verdicts.mjs");
	const report = harness.run();
	process.stdout.write(`${JSON.stringify(report, null, "\t")}\n`);
	return 0;
}

async function main(argv) {
	const verb = argv[0];
	switch (verb) {
		case "install-from-artifact":
			return installFromArtifact();
		case "mutate":
			return mutate();
		case "fuzz":
			return fuzz(argv.slice(1));
		case "properties":
			return properties(argv.slice(1));
		case "verdicts":
			return verdicts();
		default:
			process.stderr.write(
				"usage: rust-backend-harness.mjs <install-from-artifact | mutate | fuzz [--seed N] [--count N] | properties [--seed N] [--count N] [--only id] [--deep] | verdicts>\n",
			);
			return 1;
	}
}

// Only when this file *is* the command. Importing it — the suite does, for the
// locale deriver — must not run a verb as a side effect.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
	process.exitCode = await main(process.argv.slice(2));
}
