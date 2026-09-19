/**
 * The end-to-end spec path, run as one gate (EPIC #100 criterion 2).
 *
 * The criterion is that a repository `spec/` tree reaches generated types in
 * Rust, TypeScript, Python and JSON Schema, demonstrated end to end on one real
 * bundle. Every piece of that chain already had a gate of its own — the Rust
 * lift has its goldens, each backend has its expected package — and none of
 * them asserts that the chain joins up. A backend whose input arrives from a
 * hand-written IR fixture is not evidence that the frontend's output is
 * admissible to it, which is exactly the join this repository has broken twice.
 *
 * So this runs the real thing: the lift writes an IR document from markdown,
 * and that document, not a fixture, is what every target generates from.
 *
 * The fingerprint check is the part worth keeping. `normalizedFingerprint` is
 * the seam's fingerprint of the *IR*, so every target must report the same one
 * from a single lift. A target reporting a different fingerprint has either
 * normalized the IR differently or generated from something else, and both are
 * defects that no per-backend golden can see.
 *
 * `--compile` additionally proves each target's *output* is admissible to a
 * real toolchain, not only that the generator reported zero blocking
 * diagnostics: `cargo build`/`clippy` on the Rust crate (offline, in a scratch
 * copy outside the repo so nothing here dirties the tree or the workspace),
 * `tsc --strict --noEmit` on the TypeScript package, a real Python import of
 * each Python package (not a syntax-only `py_compile`, so a pydantic/dataclass
 * decorator error surfaces here), and an Ajv 2020-12 compile of every emitted
 * JSON Schema. It is opt-in because it needs `cargo`, `poetry` and a Python
 * 3.13 interpreter on PATH, which the `business` bundle's own gate run has
 * never required; a caller that cannot satisfy that fails loudly rather than
 * silently skipping.
 */
import { execFileSync, spawnSync } from "node:child_process";
import {
	cpSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	rmSync,
	statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const TARGETS = [
	"typescript",
	"rust",
	"json-schema",
	"python-pydantic-v2",
	"python-dataclass",
];

const REPO_ROOT = resolve(import.meta.dirname, "..");

const [irPath, stagingRoot, compileFlag] = process.argv.slice(2);
if (!irPath || !stagingRoot) {
	console.error(
		"usage: node scripts/spec-to-targets.mjs <semantic-ir.json> <staging root> [--compile]",
	);
	process.exit(2);
}
if (compileFlag !== undefined && compileFlag !== "--compile") {
	console.error(`unknown third argument: ${compileFlag}`);
	process.exit(2);
}
const compile = compileFlag === "--compile";

/** A scratch directory outside the repo, so a compile step cannot dirty the tree. */
function scratchDir(prefix) {
	return mkdtempSync(join(tmpdir(), `spec-to-targets-${prefix}-`));
}

/**
 * `cargo build` then `cargo clippy -D warnings`, offline, over a scratch copy
 * of the generated crate — the same offline-scratch pattern
 * `scripts/check-semantic-kernel-crate.mjs` uses for the kernel crate.
 */
function compileRust(outRoot) {
	if (spawnSync("cargo", ["--version"], { encoding: "utf8" }).status !== 0) {
		return ["rust: cargo is not on PATH, so the compile check cannot run"];
	}
	const scratch = scratchDir("rust");
	try {
		const crate = join(scratch, "crate");
		cpSync(outRoot, crate, { recursive: true });
		const env = {
			...process.env,
			CARGO_TARGET_DIR: join(scratch, "target"),
			CARGO_NET_OFFLINE: "true",
		};
		const manifestPath = join(crate, "Cargo.toml");
		const lock = spawnSync(
			"cargo",
			["generate-lockfile", "--offline", "--manifest-path", manifestPath],
			{ encoding: "utf8", env },
		);
		if (lock.status !== 0) {
			return [
				`rust: offline lockfile resolve failed:\n${lock.stdout}${lock.stderr}`,
			];
		}
		const build = spawnSync(
			"cargo",
			["build", "--offline", "--locked", "--manifest-path", manifestPath],
			{ encoding: "utf8", env },
		);
		if (build.status !== 0) {
			return [`rust: cargo build failed:\n${build.stdout}${build.stderr}`];
		}
		const clippy = spawnSync(
			"cargo",
			[
				"clippy",
				"--offline",
				"--locked",
				"--manifest-path",
				manifestPath,
				"--all-targets",
				"--",
				"-D",
				"warnings",
			],
			{ encoding: "utf8", env },
		);
		if (clippy.status !== 0) {
			return [`rust: cargo clippy failed:\n${clippy.stdout}${clippy.stderr}`];
		}
		return [];
	} finally {
		rmSync(scratch, { recursive: true, force: true });
	}
}

/** `tsc --strict --noEmit` over the package entry point, resolving `.js`-suffixed ESM imports. */
function compileTypescript(outRoot) {
	const tsc = join(REPO_ROOT, "node_modules", ".bin", "tsc");
	const result = spawnSync(
		tsc,
		[
			"--noEmit",
			"--strict",
			"--module",
			"NodeNext",
			"--moduleResolution",
			"NodeNext",
			"--target",
			"ES2022",
			join(outRoot, "index.ts"),
		],
		{ encoding: "utf8" },
	);
	if (result.status !== 0) {
		return [
			`typescript: tsc --strict reported errors:\n${result.stdout}${result.stderr}`,
		];
	}
	return [];
}

/**
 * A real import of the generated package, not a syntax-only check: relative
 * imports between the emitted modules (`from .Sys import Sys`) need a package
 * whose `__path__` is the output directory, which `submodule_search_locations`
 * gives it regardless of the directory's own name (`python-pydantic-v2` is not
 * a valid Python identifier).
 */
function compilePython(target, outRoot) {
	if (spawnSync("poetry", ["--version"], { encoding: "utf8" }).status !== 0) {
		return [
			`${target}: poetry is not on PATH, so the compile check cannot run`,
		];
	}
	const script = [
		"import importlib.util, sys",
		`spec = importlib.util.spec_from_file_location("spec_to_targets_${target.replace(/-/g, "_")}", ${JSON.stringify(join(outRoot, "__init__.py"))}, submodule_search_locations=[${JSON.stringify(outRoot)}])`,
		"module = importlib.util.module_from_spec(spec)",
		"sys.modules[spec.name] = module",
		"spec.loader.exec_module(module)",
	].join("\n");
	const result = spawnSync("poetry", ["run", "python3", "-c", script], {
		encoding: "utf8",
		cwd: REPO_ROOT,
	});
	if (result.status !== 0) {
		return [`${target}: import failed:\n${result.stdout}${result.stderr}`];
	}
	return [];
}

/** Every emitted schema, compiled together by Ajv 2020-12, the same way `test/json-schema-backend.test.ts` proves the backend's own output compiles. */
function compileJsonSchema(outRoot) {
	const problems = [];
	const names = readdirSync(outRoot).filter(
		(name) => name.endsWith(".json") && name !== "index.json",
	);
	const ajv = new Ajv2020({ strict: false });
	addFormats(ajv);
	const schemas = [];
	for (const name of names) {
		try {
			schemas.push(JSON.parse(readFileSync(join(outRoot, name), "utf8")));
		} catch (error) {
			problems.push(`json-schema: ${name} did not parse: ${error.message}`);
		}
	}
	for (const schema of schemas) {
		try {
			ajv.addSchema(schema);
		} catch (error) {
			problems.push(
				`json-schema: ${schema.$id ?? "(no $id)"} did not compile: ${error.message}`,
			);
		}
	}
	for (const schema of schemas) {
		if (!ajv.getSchema(schema.$id)) {
			problems.push(`json-schema: ${schema.$id} did not compile`);
		}
	}
	return problems;
}

const COMPILERS = {
	rust: compileRust,
	typescript: compileTypescript,
	"json-schema": compileJsonSchema,
	"python-pydantic-v2": (outRoot) =>
		compilePython("python-pydantic-v2", outRoot),
	"python-dataclass": (outRoot) => compilePython("python-dataclass", outRoot),
};

const countFiles = (dir) => {
	let total = 0;
	for (const entry of readdirSync(dir)) {
		const path = join(dir, entry);
		total += statSync(path).isDirectory() ? countFiles(path) : 1;
	}
	return total;
};

const failures = [];
const fingerprints = new Map();
const rows = [];

for (const target of TARGETS) {
	const outRoot = resolve(stagingRoot, target);
	let manifest;
	try {
		manifest = JSON.parse(
			execFileSync(
				process.execPath,
				[
					"src/compiler/cli.mjs",
					"generate",
					"--ir",
					irPath,
					"--target",
					target,
					"--out-root",
					outRoot,
				],
				{ encoding: "utf8" },
			),
		);
	} catch (error) {
		failures.push(
			`${target}: generate failed: ${error.stderr || error.message}`,
		);
		continue;
	}

	const blocking = (manifest.diagnostics ?? []).filter(
		(entry) => entry.severity !== "info" && entry.severity !== "warning",
	);
	if (blocking.length > 0) {
		failures.push(
			`${target}: ${blocking.length} blocking diagnostic(s): ${blocking
				.map((entry) => entry.code)
				.join(", ")}`,
		);
	}

	let files = 0;
	try {
		files = countFiles(outRoot);
	} catch {
		files = 0;
	}
	if (files === 0) {
		failures.push(`${target}: generated no files`);
	}

	if (compile && files > 0) {
		failures.push(...COMPILERS[target](outRoot));
	}

	fingerprints.set(target, manifest.normalizedFingerprint);
	rows.push({ target, files, fingerprint: manifest.normalizedFingerprint });
}

const distinct = new Set(fingerprints.values());
if (distinct.size > 1) {
	failures.push(
		`the targets disagree on the IR fingerprint: ${[...fingerprints]
			.map(([target, value]) => `${target}=${value}`)
			.join(", ")}`,
	);
}

const ir = JSON.parse(
	execFileSync("cat", [irPath], {
		encoding: "utf8",
		maxBuffer: 64 * 1024 * 1024,
	}),
);
console.log(
	`lifted ${ir.types.length} type(s) from ${ir.package.identity} at contract ${ir.contractVersion}`,
);
for (const row of rows) {
	console.log(
		`  ${row.target.padEnd(20)} ${String(row.files).padStart(3)} file(s)`,
	);
}
console.log(`  IR fingerprint ${[...distinct][0] ?? "(none)"}`);

if (ir.types.length === 0) {
	failures.push(
		"the bundle lifted zero types, so every target below generated over an empty population",
	);
}

if (failures.length > 0) {
	console.error("\nspec-to-targets failed:");
	for (const failure of failures) console.error(`  - ${failure}`);
	process.exit(1);
}
console.log("\nspec-to-targets: the spec path reaches every target.");
