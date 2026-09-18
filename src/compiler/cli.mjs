#!/usr/bin/env node
/**
 * The compiler command line (FR-041, FR-052).
 *
 * Five verbs. `emit-ir` is the promoted issue #4 prototype path and is
 * deliberately untouched: it is the route the frozen spike replay still takes,
 * and its bytes are a committed golden. `compile`, `inspect` and `diff` are the
 * contract path, and `generate` is the generation path issue #22 adds — the
 * four that came before it keep their flags, their exit codes and their output
 * unchanged (FR-071-CON-6).
 *
 * Two conventions run through all four. Every input is a flag or a file — the
 * CLI reads no environment variable to decide anything, so two hosts cannot
 * disagree about what a command meant. And every output is written through a
 * `.tmp` sibling and a rename, so a failed run cannot leave half a document
 * where the next reader expects a whole one.
 */
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { biomeFormatter, FormatterError } from "./backends/format.mjs";
import { poetryProducer } from "./backends/python-v1/produce.mjs";
import {
	BACKEND_TARGETS,
	generateTarget,
	selectBackend,
} from "./backends/seam.mjs";
import { fingerprintIrForTarget } from "./backends/typescript-v1/canonical.mjs";
import { emitTypeScriptPackage } from "./backends/typescript-v1/emit.mjs";
import { ContractRefusalError, diffSemanticContract } from "./compat/diff.mjs";
import { compileSemanticIr } from "./compile.mjs";
import {
	DEFAULT_LIMITS,
	hasBlocking,
	sortDiagnostics,
} from "./diagnostics.mjs";
import { createHost } from "./host.mjs";
import { formatInspection, inspectIr, inspectionJson } from "./inspect.mjs";
import { serializeIr } from "./ir/normalize.mjs";
import { serializeSemanticIr } from "./ir.mjs";
import { REPO_ROOT, serializeLock } from "./packages/lock.mjs";
import { compilePackage } from "./pipeline.mjs";

const USAGE = `Usage:
  node src/compiler/cli.mjs emit-ir --entrypoint <path> [--generator <id>] [--base-dir <path>] --out <path>
  node src/compiler/cli.mjs compile --package <dir> [--package-path <dir>]... [--profile <name>]
                                    [--dialect <dialect>] [--entrypoint <relative path>]
                                    [--lock <file>] [--write-lock <file>] [--limits <file>]
                                    --out <file> [--diagnostics <file>]
  node src/compiler/cli.mjs inspect --ir <file> [--json] [--package <dir>]
  node src/compiler/cli.mjs diff --old <ir> --new <ir> --out <file>
                                 [--consumer-policy <file>]... [--consumer-evidence <status>]
                                 [--target-result <target>=<disposition>]...
  node src/compiler/cli.mjs generate --ir <file> [--target <target>] --out-root <dir>
                                     [--profile <file>] [--manifest <file>] [--limits <file>]

Exit codes: 0 success, 1 a blocking diagnostic or a breaking aggregate, 2 a usage error.`;

const FLAGS = {
	"emit-ir": {
		single: ["entrypoint", "generator", "base-dir", "out"],
		repeated: [],
		boolean: [],
	},
	compile: {
		single: [
			"package",
			"profile",
			"dialect",
			"entrypoint",
			"lock",
			"write-lock",
			"limits",
			"out",
			"diagnostics",
		],
		repeated: ["package-path"],
		boolean: [],
	},
	inspect: { single: ["ir", "package"], repeated: [], boolean: ["json"] },
	diff: {
		single: ["old", "new", "out", "consumer-evidence"],
		repeated: ["consumer-policy", "target-result"],
		boolean: [],
	},
	generate: {
		single: ["ir", "target", "out-root", "profile", "manifest", "limits"],
		repeated: [],
		boolean: [],
	},
};

/**
 * The profile a generation assumes when the caller names none.
 *
 * Declared here rather than borrowed from a fixture: a default that read a test
 * artifact would make the command's behaviour a function of a file nobody
 * thinks of as an input. `semantic-source` authority with a `read-only` edge
 * and `reject` unknowns is the conservative reading — a generated language
 * package derives from the semantic source, is not edited back, and admits
 * nothing the contract did not declare.
 */
const DEFAULT_GENERATION_PROFILE = Object.freeze({
	contractVersion: "1.0.0",
	identity: "ix://agent-ix/filament-core-data/profile/generated-typescript",
	version: "1.0.0",
	authority: "semantic-source",
	editDirection: "read-only",
	roundTrip: "semantic-lossless",
	unknownPolicy: "reject",
	allowedOmissions: [],
	enrichment: false,
	materializationLifetime: "durable",
});

class UsageError extends Error {}

function parse(command, argv) {
	const shape = FLAGS[command];
	const options = {};
	for (const name of shape.repeated) options[name] = [];
	for (let index = 0; index < argv.length; index += 1) {
		const argument = argv[index];
		if (!argument.startsWith("--")) {
			throw new UsageError(`Unexpected argument: ${argument}`);
		}
		const key = argument.slice(2);
		if (shape.boolean.includes(key)) {
			options[key] = true;
			continue;
		}
		if (!shape.single.includes(key) && !shape.repeated.includes(key)) {
			throw new UsageError(`Unknown flag: --${key}`);
		}
		if (index + 1 >= argv.length) {
			throw new UsageError(`Missing value for --${key}`);
		}
		if (shape.repeated.includes(key)) options[key].push(argv[index + 1]);
		else options[key] = argv[index + 1];
		index += 1;
	}
	return options;
}

function require_(options, ...names) {
	for (const name of names) {
		if (!options[name]) throw new UsageError(`--${name} is required`);
	}
}

/** Writes through a `.tmp` sibling, then renames it over the target. */
function writeAtomic(path, bytes) {
	const absolute = resolve(path);
	const temporary = `${absolute}.tmp`;
	mkdirSync(dirname(absolute), { recursive: true });
	writeFileSync(temporary, bytes);
	renameSync(temporary, absolute);
}

function readJsonFile(path, flag) {
	try {
		return JSON.parse(readFileSync(resolve(path), "utf8"));
	} catch (error) {
		throw new UsageError(`--${flag} is not readable JSON: ${error.message}`);
	}
}

async function emitIr(options) {
	require_(options, "entrypoint", "out");
	const baseDir = options["base-dir"]
		? resolve(options["base-dir"])
		: process.cwd();
	const ir = await compileSemanticIr({
		entrypoint: resolve(options.entrypoint),
		generator: options.generator,
		baseDir,
	});
	const out = resolve(options.out);
	mkdirSync(dirname(out), { recursive: true });
	writeFileSync(out, serializeSemanticIr(ir));
	return 0;
}

async function compile(options) {
	require_(options, "package", "out");
	const packageRoot = resolve(options.package);
	const searchPath = options["package-path"].map((path) => resolve(path));
	const limits = options.limits
		? { ...DEFAULT_LIMITS, ...readJsonFile(options.limits, "limits") }
		: DEFAULT_LIMITS;
	// A caller-named file may live anywhere; its own directory is a declared
	// root, and nothing wider is.
	const host = createHost({
		readRoots: [
			packageRoot,
			...searchPath,
			REPO_ROOT,
			...[options.lock, options.limits]
				.filter(Boolean)
				.map((path) => dirname(resolve(path))),
		],
	});
	const result = await compilePackage({
		host,
		packageRoot,
		searchPath,
		profileName: options.profile,
		dialect: options.dialect ?? "typespec",
		entrypoint: options.entrypoint ?? "main.tsp",
		lockPath: options.lock ? resolve(options.lock) : undefined,
		limits,
	});
	const diagnostics = sortDiagnostics(result.diagnostics);
	if (options.diagnostics) {
		writeAtomic(
			options.diagnostics,
			`${JSON.stringify(diagnostics, null, "\t")}\n`,
		);
	} else {
		for (const entry of diagnostics) {
			process.stderr.write(
				`${entry.code} ${entry.locus ? `${entry.locus.path}:${entry.locus.startLine}:${entry.locus.startColumn} ` : ""}${entry.message}\n`,
			);
		}
	}
	if (hasBlocking(diagnostics) || !result.ir) return 1;
	writeAtomic(options.out, serializeIr(result.ir));
	if (options["write-lock"]) {
		writeAtomic(options["write-lock"], serializeLock(result.lock));
	}
	return 0;
}

async function inspect(options) {
	require_(options, "ir");
	const document = readJsonFile(options.ir, "ir");
	let importedExports = "unknown";
	if (options.package) {
		const { resolvePackageGraph } = await import("./packages/resolve.mjs");
		const packageRoot = resolve(options.package);
		const host = createHost({ readRoots: [packageRoot, REPO_ROOT] });
		const resolution = resolvePackageGraph({
			host,
			packageRoot,
			searchPath: [],
		});
		importedExports = resolution.importedExports ?? new Set();
	}
	const summary = inspectIr(document, { importedExports });
	process.stdout.write(
		options.json ? inspectionJson(summary) : formatInspection(summary),
	);
	return summary.diagnostics.length > 0 ? 1 : 0;
}

async function diff(options) {
	require_(options, "old", "new", "out");
	const targetResults = {};
	for (const entry of options["target-result"]) {
		const [target, disposition] = entry.split("=");
		if (!target || !disposition) {
			throw new UsageError(`--target-result takes <target>=<disposition>`);
		}
		targetResults["*"] = targetResults["*"] ?? [];
		targetResults["*"].push({ target, disposition });
	}
	const report = diffSemanticContract({
		old: readJsonFile(options.old, "old"),
		new: readJsonFile(options.new, "new"),
		consumerPolicies: options["consumer-policy"].map((path) =>
			readJsonFile(path, "consumer-policy"),
		),
		consumerEvidenceStatus: options["consumer-evidence"] ?? "current",
		targetResults,
	});
	writeAtomic(options.out, `${JSON.stringify(report, null, "\t")}\n`);
	return ["breaking", "invalid"].includes(report.aggregateDisposition) ? 1 : 0;
}

/**
 * The selected target's own backend descriptor, in the shape
 * `compiler-request.schema.json` requires.
 *
 * A target the contract declares but this repository has not implemented has no
 * identity, version or feature list to report. The request still has to carry a
 * `backend` member to validate, so the registered target name stands in: it
 * names what was asked for rather than claiming some other backend answered.
 */
function backendDescriptor(target) {
	const { backend } = selectBackend(target);
	if (backend == null) {
		return {
			identity: `ix://agent-ix/filament-core-data/backend/${target}`,
			version: "0.0.0",
			supportedIrVersions: [],
			supportedFeatures: [],
			options: {},
		};
	}
	return {
		identity: backend.identity,
		version: backend.version,
		supportedIrVersions: [...backend.supportedIrVersions],
		supportedFeatures: [...backend.supportedFeatures],
		options: {},
	};
}

/** The targets whose generation runs through the injected Python producer. */
const PYTHON_TARGETS = Object.freeze([
	"python-pydantic-v2",
	"python-dataclass",
]);

/**
 * Generates a language package from one IR document (FR-071).
 *
 * The CLI is the one place that reads a flag, constructs the injected host and
 * constructs the formatter, and passes both down; nothing beneath it reaches
 * for an environment variable or the file system on its own (FR-071-CON-2).
 *
 * Nothing is written until the whole generation has succeeded. A blocking
 * diagnostic must leave a fresh `--out-root` empty and a pre-existing file
 * under it byte-unchanged, and the only way to promise that is to decide
 * before the first write rather than to unwind after one.
 */

async function generate(options) {
	require_(options, "ir", "out-root");
	const target = options.target ?? "typescript";
	if (!BACKEND_TARGETS.includes(target)) {
		// A target outside the closed vocabulary is the caller naming something
		// the contract does not define, which is a usage error and not a defect in
		// any document (FR-071-AC-7).
		throw new UsageError(
			`--target must be one of ${BACKEND_TARGETS.join(", ")}; received ${target}`,
		);
	}
	const ir = readJsonFile(options.ir, "ir");
	const profile = options.profile
		? readJsonFile(options.profile, "profile")
		: DEFAULT_GENERATION_PROFILE;
	const limits = options.limits
		? { ...DEFAULT_LIMITS, ...readJsonFile(options.limits, "limits") }
		: DEFAULT_LIMITS;
	const outRoot = resolve(options["out-root"]);
	const host = createHost({
		readRoots: [
			REPO_ROOT,
			...[options.ir, options.profile, options.limits]
				.filter(Boolean)
				.map((path) => dirname(resolve(path))),
		],
	});

	const request = {
		contractVersion: "1.0.0",
		lockFingerprint: fingerprintIrForTarget(ir),
		ir,
		profile,
		mappings: [],
		// The descriptor of the backend the caller selected, not of whichever
		// backend this module happens to import. While `typescript` was the only
		// implemented target the two were the same object and the difference could
		// not be observed; once `rust` is registered it can, and it is observable
		// in the worst possible place — `src/identity.rs` renders
		// `GENERATOR_IDENTITY` from `request.backend.identity`, so a hardcoded
		// descriptor made a generated Rust crate claim the TypeScript backend
		// produced it. An unimplemented target has no descriptor of its own; the
		// seam refuses it as `unavailable` before reading this member, and the
		// stand-in exists only so the request still satisfies its schema.
		backend: backendDescriptor(target),
		// A declared label, never the caller's directory. `--out-root` decides
		// where the bytes land; putting it in the request would put the caller's
		// path into the output manifest, and two runs into two different
		// directories would then produce two different manifests — which is
		// exactly what FR-071-AC-2 exists to forbid.
		outputRoot: `generated/${target}`,
		limits,
	};

	let emitted;
	try {
		if (target === "typescript") {
			emitted = emitTypeScriptPackage(request, {
				target,
				host,
				format: biomeFormatter(),
			});
		} else {
			const rendered = new Map();
			const manifest = generateTarget(request, {
				target,
				host,
				// JSON Schema bytes are serialized canonically by the backend. Unlike
				// generated source, there is no language formatter to invoke here.
				format(text, path) {
					rendered.set(path, text);
					return text;
				},
				// The Python targets generate through a Python program, and
				// ADR-0006 makes that effect injected rather than reached for. The
				// CLI is the one place that constructs it, in the same breath as
				// the host and the formatter, so no module beneath here starts a
				// process on its own.
				...(PYTHON_TARGETS.includes(target)
					? { produce: poetryProducer() }
					: {}),
			});
			emitted = {
				manifest,
				files: manifest.files.map((file) => ({
					path: file.path,
					text: rendered.get(file.path),
				})),
			};
		}
	} catch (error) {
		if (error instanceof FormatterError) {
			process.stderr.write(`${error.message}\n`);
			return 1;
		}
		throw error;
	}
	const { manifest, files } = emitted;

	const diagnostics = sortDiagnostics(manifest.diagnostics);
	for (const entry of diagnostics) {
		process.stderr.write(
			`${entry.code} ${entry.locus ? `${entry.locus.path}:${entry.locus.startLine}:${entry.locus.startColumn} ` : ""}${entry.message}\n`,
		);
	}

	const bytes = `${JSON.stringify(manifest, null, "\t")}\n`;
	if (options.manifest) writeAtomic(options.manifest, bytes);
	else process.stdout.write(bytes);

	const clean = manifest.state === "success" || manifest.state === "lossy";
	if (!clean || hasBlocking(diagnostics)) return 1;
	for (const file of files) writeAtomic(resolve(outRoot, file.path), file.text);
	return 0;
}

const COMMANDS = { "emit-ir": emitIr, compile, inspect, diff, generate };

async function main(argv) {
	const [command, ...rest] = argv;
	const run = COMMANDS[command];
	if (!run) throw new UsageError(`Unknown command: ${command ?? "(none)"}`);
	return run(parse(command, rest));
}

main(process.argv.slice(2))
	.then((code) => {
		process.exitCode = code;
	})
	.catch((error) => {
		if (error instanceof UsageError) {
			process.stderr.write(`${error.message}\n${USAGE}\n`);
			process.exitCode = 2;
			return;
		}
		if (error instanceof ContractRefusalError) {
			process.stderr.write(`${error.code} ${error.message}\n`);
			process.exitCode = 1;
			return;
		}
		process.stderr.write(`${error.message}\n`);
		process.exitCode = 1;
	});
