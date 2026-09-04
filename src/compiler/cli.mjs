#!/usr/bin/env node
/**
 * The compiler command line (FR-041, FR-052).
 *
 * Four verbs. `emit-ir` is the promoted issue #4 prototype path and is
 * deliberately untouched: it is the route the frozen spike replay still takes,
 * and its bytes are a committed golden. `compile`, `inspect` and `diff` are the
 * contract path.
 *
 * Two conventions run through all four. Every input is a flag or a file — the
 * CLI reads no environment variable to decide anything, so two hosts cannot
 * disagree about what a command meant. And every output is written through a
 * `.tmp` sibling and a rename, so a failed run cannot leave half a document
 * where the next reader expects a whole one.
 */
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { compileSemanticIr } from "./compile.mjs";
import { diffSemanticContract } from "./compat/diff.mjs";
import {
	DEFAULT_LIMITS,
	hasBlocking,
	sortDiagnostics,
} from "./diagnostics.mjs";
import { createHost } from "./host.mjs";
import { serializeIr } from "./ir/normalize.mjs";
import { serializeSemanticIr } from "./ir.mjs";
import { formatInspection, inspectIr, inspectionJson } from "./inspect.mjs";
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
};

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

const COMMANDS = { "emit-ir": emitIr, compile, inspect, diff };

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
		process.stderr.write(`${error.message}\n`);
		process.exitCode = 1;
	});
