#!/usr/bin/env node
/**
 * The extraction frontend's change-set harness (NFR-032).
 *
 * Every verb here answers a question about *history*, never about a moving
 * ref: this change's own commit range is resolved from the two sentinel
 * artifacts NFR-032 names — `spec/usecase/US-015-…md`, created by the first
 * commit, and `docs/semantic-data-system/extraction-frontend-diagnostics.md`,
 * created by the last — through `changeRange` of `test/changed-paths.ts`,
 * and its path set is the union of the per-commit name lists over
 * `git log --first-parent --no-merges`. Nothing here reimplements the
 * sentinel resolution; the helper is imported, so the fifth face of the
 * merge-degrading defect it documents is not rediscovered.
 *
 * One refinement on the *tip* (CR-036-9): while the change is in flight the
 * sentinels sit in different commits and the branch keeps moving past the
 * closing one — review fixes, change requests — so the range's tip is `HEAD`,
 * which must be a descendant of the closing sentinel's commit, and its base is
 * the opening sentinel's parent. Once the pull request is squash-merged both
 * sentinels and `HEAD`-at-merge are one commit, the history-pinned form and
 * this form coincide, and the pinned tip is used from then on so later
 * tickets are not annexed. `workingRange` below is that rule.
 *
 * Verbs that only read the repository (`change-range`, `changed-paths`,
 * `merge-commits`, `gate`) run against `--root` (default: the repository this
 * script lives in). Verbs that mutate history — the three rehearsals and the
 * suite comparison — refuse to run without `--scratch <dir>` and work only in
 * clones they make under it; they never touch the checkout they were run
 * from.
 *
 * - `gate` classifies every path of the set as permitted or prohibited under
 *   NFR-032 and exits non-zero when any path is prohibited or unclassified.
 * - `squash-rehearsal` squashes the range onto its base in a clone, the way
 *   a squash merge lands it, and proves the post-merge set equals the
 *   pre-merge set.
 * - `accretion-rehearsal` lands an unrelated sibling on top of the squash and
 *   proves the set does not grow, and that a prohibited path no later commit
 *   owns still fails the gate. `--plant-prohibited` adds a prohibited path to
 *   the squash itself so the caller can prove the gate fails on it.
 * - `revert-rehearsal` reverts the range in a clone, proves the tree equals
 *   the base, and runs the full suite there.
 * - `suite-compare` runs the full suite on the base and on the tip in two
 *   clones and compares every pre-existing row's outcome.
 *
 * The full suite is `pnpm run test` (vitest), the five `make rust*` targets
 * `make rust` chains — run one at a time so a red first target does not hide
 * the rows behind it — and `poetry run pytest`, each row recorded by name.
 *
 * `test/changed-paths.ts` is TypeScript; this script re-executes itself under
 * `--experimental-strip-types` when it was started without it.
 */

import { execFileSync, spawnSync } from "node:child_process";
import {
	existsSync,
	mkdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SELF = fileURLToPath(import.meta.url);
if (!process.execArgv.some((arg) => arg.startsWith("--experimental-strip-types"))) {
	const child = spawnSync(
		process.execPath,
		[
			"--experimental-strip-types",
			"--disable-warning=ExperimentalWarning",
			SELF,
			...process.argv.slice(2),
		],
		{ stdio: "inherit" },
	);
	process.exit(child.status ?? 1);
}

/** The repository this script lives in: `scripts/..` (root `scripts/`, the one such path NFR-032 permits; CR-036-8). */
const HOME_ROOT = resolve(dirname(SELF), "..");

const helpers = await import(
	pathToFileURL(join(HOME_ROOT, "test", "changed-paths.ts")).href
);
const { changeRange, REGENERATED_IN_PLACE } = helpers;

/** True when `ancestor` is an ancestor of (or equal to) `descendant`. */
function isAncestor(root, ancestor, descendant) {
	const result = spawnSync(
		"git",
		["merge-base", "--is-ancestor", ancestor, descendant],
		{ cwd: root, stdio: "ignore" },
	);
	return result.status === 0;
}

/**
 * This change's range as the gates read it (CR-036-9): `changeRange`'s base
 * and, while the sentinels are in different commits, `HEAD` as the tip —
 * which must descend from the closing sentinel's commit, or the checkout is
 * not this change's branch and the gate cannot assert. Once squashed, the
 * pinned tip. `pinnedTip` carries `changeRange`'s own tip either way.
 */
export function workingRange(root) {
	const pinned = changeRange(root, SENTINELS);
	if (pinned.squashed) return { ...pinned, pinnedTip: pinned.tip };
	const head = git(root, "rev-parse", "HEAD");
	if (!isAncestor(root, pinned.tip, head)) {
		throw new Error(
			`HEAD ${head} does not descend from the closing sentinel's commit ${pinned.tip}: this checkout is not the change's branch, so the range cannot be located`,
		);
	}
	return { base: pinned.base, tip: head, squashed: false, pinnedTip: pinned.tip };
}

/**
 * The paths of the working range: the union of the per-commit name lists
 * over `git log --first-parent --no-merges` from base to tip, plus every
 * uncommitted path in the tree that differs from `HEAD` (the in-flight end
 * state; `test/changed-paths.ts` `changedPathsUnion` folds the tree in the
 * same way), minus the artefacts that suite regenerates in place.
 */
export function workingPathsUnion(root) {
	const { base, tip } = workingRange(root);
	const committed = git(
		root,
		"log",
		"--first-parent",
		"--no-merges",
		"--no-renames",
		"--format=",
		"--name-only",
		`${base}..${tip}`,
	)
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line.length > 0);
	// Raw, not through `git()`: its `trim()` would eat the leading status
	// column of the first line and misname that path.
	const working = execFileSync(
		"git",
		[...GIT_IDENTITY, "status", "--porcelain", "--untracked-files=all"],
		{ cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
	)
		.split("\n")
		.filter((line) => line.trim().length > 0)
		.map((line) => line.slice(3).trim())
		.filter((path) => path.length > 0)
		.filter((path) => !REGENERATED_IN_PLACE.has(path))
		.filter((path) => !matchesHead(root, path));
	return [...new Set([...committed, ...working])].sort();
}

/** True when the working-tree file at `path` is byte-identical to `HEAD`'s. */
function matchesHead(root, path) {
	const absolute = resolve(root, path);
	if (!existsSync(absolute)) return false;
	const shown = spawnSync("git", ["show", `HEAD:${path}`], {
		cwd: root,
		maxBuffer: 64 * 1024 * 1024,
		stdio: ["ignore", "pipe", "ignore"],
	});
	if (shown.status !== 0) return false;
	return readFileSync(absolute).equals(shown.stdout);
}

/** Merge commits inside the working range. NFR-023 requires none. */
export function workingMergeCommits(root) {
	const { base, tip } = workingRange(root);
	return git(root, "log", "--merges", "--format=%H", `${base}..${tip}`)
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line.length > 0);
}

/** The two sentinels NFR-032 names, first and last commit of the change. */
export const SENTINELS = Object.freeze([
	"spec/usecase/US-015-lift-a-spec-bundle-into-a-domain-package.md",
	"docs/semantic-data-system/extraction-frontend-diagnostics.md",
]);

/** NFR-032 permitted paths, each traced to the Output or step that names it. */
const PERMITTED = Object.freeze([
	{ name: "crates/extraction-frontend/**", test: (p) => p.startsWith("crates/extraction-frontend/") },
	{ name: "Cargo.toml (members line)", test: (p) => p === "Cargo.toml" },
	{ name: "Cargo.lock", test: (p) => p === "Cargo.lock" },
	{ name: "Makefile (one extraction-frontend block)", test: (p) => p === "Makefile" },
	{ name: "THIRD-PARTY-NOTICES.md (additive rows for the crates Cargo.lock adds; CR-036-8)", test: (p) => p === "THIRD-PARTY-NOTICES.md" },
	{ name: "scripts/extraction-frontend-harness.mjs (the NFR-032 rehearsal harness, CR-036-8; the FR-098 rust-generate runner, CR-036-9)", test: (p) => p === "scripts/extraction-frontend-harness.mjs" },
	{ name: "test/fixtures/compiler/shared/cases.json", test: (p) => p === "test/fixtures/compiler/shared/cases.json" },
	{ name: "test/fixtures/compiler/shared/spec-bundle/**", test: (p) => p.startsWith("test/fixtures/compiler/shared/spec-bundle/") },
	{ name: "test/fixtures/compiler/shared/typespec/records-and-scalars/**", test: (p) => p.startsWith("test/fixtures/compiler/shared/typespec/records-and-scalars/") },
	{ name: "docs/semantic-data-system/extraction-frontend-diagnostics.md", test: (p) => p === "docs/semantic-data-system/extraction-frontend-diagnostics.md" },
	{ name: "spec/**", test: (p) => p.startsWith("spec/") },
	{ name: "plan/**", test: (p) => p.startsWith("plan/") },
	{ name: "reviews/**", test: (p) => p.startsWith("reviews/") },
]);

/** NFR-032 prohibited paths: this change changes no byte of them. */
const PROHIBITED = Object.freeze([
	{ name: "src/compiler/**", test: (p) => p.startsWith("src/compiler/") },
	{ name: "packages/**", test: (p) => p.startsWith("packages/") },
	{ name: "crates/semantic-ir/**", test: (p) => p.startsWith("crates/semantic-ir/") },
	{ name: "crates/conformance-adapter/**", test: (p) => p.startsWith("crates/conformance-adapter/") },
	{ name: "crates/consumer-compile-time/**", test: (p) => p.startsWith("crates/consumer-compile-time/") },
	{ name: "crates/consumer-runtime/**", test: (p) => p.startsWith("crates/consumer-runtime/") },
	{ name: "schema/**", test: (p) => p.startsWith("schema/") },
	{ name: "fixtures/**", test: (p) => p.startsWith("fixtures/") },
	{ name: "conformance/**", test: (p) => p.startsWith("conformance/") },
	{ name: "spikes/**", test: (p) => p.startsWith("spikes/") },
	{ name: "package.json", test: (p) => p === "package.json" },
	{ name: "pnpm-lock.yaml", test: (p) => p === "pnpm-lock.yaml" },
	{ name: "rust-toolchain.toml", test: (p) => p === "rust-toolchain.toml" },
	{ name: ".github/**", test: (p) => p.startsWith(".github/") },
	{ name: "agent_ix_core_data/**", test: (p) => p.startsWith("agent_ix_core_data/") },
	{ name: "tests/**", test: (p) => p.startsWith("tests/") },
	{ name: "test/*.test.ts", test: (p) => /^test\/[^/]+\.test\.ts$/.test(p) },
	{ name: "scripts/** (other than the harness)", test: (p) => p.startsWith("scripts/") && p !== "scripts/extraction-frontend-harness.mjs" },
]);

/** The seven paths FR-099-AC-5 names byte-unchanged, as `git diff` pathspecs. */
export const FR099_FROZEN = Object.freeze([
	"package.json",
	"schema",
	"src/compiler",
	"packages",
	"crates/semantic-ir",
	"rust-toolchain.toml",
]);

function classify(path) {
	const prohibited = PROHIBITED.find((rule) => rule.test(path));
	if (prohibited) return { path, verdict: "prohibited", rule: prohibited.name };
	const permitted = PERMITTED.find((rule) => rule.test(path));
	if (permitted) return { path, verdict: "permitted", rule: permitted.name };
	return { path, verdict: "unclassified", rule: null };
}

/** The gate: every path of the change's own set, classified. */
export function gate(root) {
	const range = workingRange(root);
	const paths = workingPathsUnion(root);
	const classified = paths.map(classify);
	return {
		root,
		base: range.base,
		tip: range.tip,
		pinnedTip: range.pinnedTip,
		squashed: range.squashed,
		paths,
		permitted: classified.filter((c) => c.verdict === "permitted").length,
		prohibited: classified.filter((c) => c.verdict === "prohibited"),
		unclassified: classified.filter((c) => c.verdict === "unclassified"),
		merges: workingMergeCommits(root),
	};
}

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
		pathToFileURL(join(HOME_ROOT, "src", "compiler", "backends", "rust-serde", "index.mjs")).href
	);
	const cli = await import(
		pathToFileURL(join(HOME_ROOT, "src", "compiler", "backends", "rust-serde", "cli.mjs")).href
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
	const manifest = backend.generateRust(request, backend.directorySink(resolve(out)), {
		licenseText: backend.readLicense(HOME_ROOT),
	});
	writeFileSync(
		join(resolve(out), `${outputRoot}.output-manifest.json`),
		`${JSON.stringify(manifest, null, "\t")}\n`,
		"utf8",
	);
	process.stdout.write(
		`${outputRoot}: state=${manifest.state} files=${manifest.files.length} diagnostics=${manifest.diagnostics.length}\n`,
	);
	for (const entry of manifest.diagnostics) {
		process.stdout.write(`  ${entry.severity} ${entry.code}: ${entry.message}\n`);
	}
	return manifest.diagnostics.some((entry) => entry.blocking) ? 1 : 0;
}

function gateOk(report) {
	return (
		report.paths.length > 0 &&
		report.prohibited.length === 0 &&
		report.unclassified.length === 0
	);
}

// ---------------------------------------------------------------------------
// git and process helpers
// ---------------------------------------------------------------------------

const GIT_IDENTITY = [
	"-c",
	"user.name=extraction-frontend-harness",
	"-c",
	"user.email=harness@example.invalid",
	"-c",
	"commit.gpgsign=false",
];

function git(cwd, ...args) {
	return execFileSync("git", [...GIT_IDENTITY, ...args], {
		cwd,
		encoding: "utf8",
		stdio: ["ignore", "pipe", "pipe"],
	}).trim();
}

function write(root, path, text) {
	mkdirSync(dirname(resolve(root, path)), { recursive: true });
	writeFileSync(resolve(root, path), text);
}

/**
 * A fresh clone of `source` under `scratch/<name>`, checked out at `commit`,
 * with a local `main` at `base` so gates that read `main` see the trunk the
 * change replaced rather than nothing.
 */
function cloneAt(source, scratch, name, commit, base) {
	const dir = join(scratch, name);
	rmSync(dir, { recursive: true, force: true });
	mkdirSync(scratch, { recursive: true });
	execFileSync("git", ["clone", "-q", "--no-local", source, dir], {
		stdio: ["ignore", "pipe", "pipe"],
	});
	git(dir, "checkout", "-q", "--detach", commit);
	git(dir, "branch", "-f", "main", base);
	return dir;
}

/** A squash of `base..tip` landed on `main` at `base`, as a squash merge does. */
function squashOnto(dir, base, tip) {
	git(dir, "checkout", "-q", "-B", "main", base);
	git(dir, "merge", "--squash", "-q", tip);
	git(dir, "commit", "-q", "-m", "squash of the extraction frontend range");
	return git(dir, "rev-parse", "HEAD");
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
	if (!Array.isArray(rows)) throw new Error("identity-cases table has no rows array");
	const identity = await import(
		pathToFileURL(join(HOME_ROOT, "src", "compiler", "frontend", "typespec", "identity.mjs")).href,
	);
	const output = rows.map((row) => {
		const refuse = (parts) => parts.some((part) => identity.slug(part).length === 0);
		if (row.kind === "refusal") {
			return { kind: row.kind, refuses: refuse(row.parts) ? "UNSLUGGABLE_NAME" : null };
		}
		if (row.kind === "identity") {
			return { kind: row.kind, identity: refuse(row.parts) ? null : identity.mintIdentity(row.package, row.slot, row.parts) };
		}
		if (row.kind === "alias") {
			const parts = [row.record, row.field];
			const tail = `${identity.slug(row.record)}${identity.capitalize(identity.slug(row.field))}`;
			return {
				kind: row.kind,
				identity: refuse(parts) ? null : identity.mintIdentity(row.package, "type", [tail]),
				displayName: `${row.record}${identity.capitalize(row.field)}`,
			};
		}
		if (row.kind === "diagnosticCode") {
			return { kind: row.kind, code: identity.constraintDiagnosticCode(row.package, row.parts, row.keyword) };
		}
		throw new Error(`identity-cases row has unknown kind ${row.kind}`);
	});
	emit(output);
	return 0;
}

function requireScratch(argv, verb) {
	const scratch = flag(argv, "--scratch");
	if (!scratch) {
		throw new Error(
			`${verb} rewrites history and refuses to run without --scratch <dir>: it works only in clones it makes there`,
		);
	}
	return resolve(scratch);
}

function emit(report) {
	process.stdout.write(`${JSON.stringify(report, null, "\t")}\n`);
}

// ---------------------------------------------------------------------------
// The suite, one row at a time
// ---------------------------------------------------------------------------

function run(command, args, cwd, env) {
	const result = spawnSync(command, args, {
		cwd,
		encoding: "utf8",
		env: { ...process.env, ...env },
		maxBuffer: 256 * 1024 * 1024,
	});
	if (result.error) {
		return { ok: false, out: String(result.error.message) };
	}
	return {
		ok: result.status === 0,
		out: `${result.stdout ?? ""}${result.stderr ?? ""}`,
	};
}

const RUST_TARGETS = Object.freeze([
	"rust-check",
	"rust-build",
	"rust-test",
	"rust-conformance",
	"rust-install-from-artifact",
]);

/** Every row of the full suite at `root`, as `name -> "pass" | "fail" | "skip"`. */
export function suiteRun(root) {
	const rows = new Map();
	const env = {
		CARGO_TARGET_DIR: join(root, "node_modules", ".cache", "rust-target"),
		CARGO_NET_OFFLINE: "true",
	};
	const log = [];

	if (!existsSync(join(root, "node_modules"))) {
		const installed = run(
			"pnpm",
			["install", "--offline", "--frozen-lockfile"],
			root,
			env,
		);
		if (!installed.ok) {
			throw new Error(`pnpm install --offline failed in ${root}:\n${installed.out}`);
		}
	}

	// vitest, row per assertion.
	const vitestOut = join(root, "node_modules", ".cache", "suite-vitest.json");
	rmSync(vitestOut, { force: true });
	const vitest = run(
		"pnpm",
		["exec", "vitest", "run", "--reporter=json", `--outputFile=${vitestOut}`],
		root,
		env,
	);
	log.push(`vitest exit ${vitest.ok ? 0 : "non-zero"}`);
	if (!existsSync(vitestOut)) {
		throw new Error(`vitest wrote no report in ${root}:\n${vitest.out.slice(-4000)}`);
	}
	const report = JSON.parse(readFileSync(vitestOut, "utf8"));
	for (const file of report.testResults) {
		const rel = file.name.startsWith(`${root}/`)
			? file.name.slice(root.length + 1)
			: file.name;
		for (const assertion of file.assertionResults) {
			const status =
				assertion.status === "passed"
					? "pass"
					: assertion.status === "failed"
						? "fail"
						: "skip";
			rows.set(`vitest:${rel}::${assertion.fullName}`, status);
		}
	}

	// The Rust targets, one at a time, with every cargo test row.
	for (const target of RUST_TARGETS) {
		const made = run("make", [target], root, env);
		rows.set(`make:${target}`, made.ok ? "pass" : "fail");
		log.push(`make ${target}: ${made.ok ? "pass" : "fail"}`);
		if (target !== "rust-test") continue;
		let binary = "?";
		for (const line of made.out.split("\n")) {
			const running = /^\s*Running (?:unittests )?\S+ \((.+)\)\s*$/.exec(line);
			if (running) {
				binary = basename(running[1]).replace(/-[0-9a-f]{16}$/, "");
				continue;
			}
			const row = /^test (\S+) \.\.\. (ok|FAILED|ignored)/.exec(line);
			if (row) {
				rows.set(
					`cargo:${binary}::${row[1]}`,
					row[2] === "ok" ? "pass" : row[2] === "FAILED" ? "fail" : "skip",
				);
			}
		}
	}

	// pytest, through the home checkout's poetry environment (a scratch clone
	// has none), with the clone first on the module path so its own package
	// and tests are what run.
	const pytest = run(
		"poetry",
		[
			"-C",
			HOME_ROOT,
			"run",
			"env",
			`PYTHONPATH=${root}`,
			"pytest",
			"-q",
			"-rA",
			"-p",
			"no:cacheprovider",
		],
		root,
		env,
	);
	log.push(`pytest exit ${pytest.ok ? 0 : "non-zero"}`);
	for (const line of pytest.out.split("\n")) {
		const row = /^(PASSED|FAILED|ERROR|SKIPPED|XFAIL|XPASS) (\S+)/.exec(line);
		if (row) {
			rows.set(
				`pytest:${row[2]}`,
				row[1] === "PASSED" || row[1] === "XPASS"
					? "pass"
					: row[1] === "FAILED" || row[1] === "ERROR"
						? "fail"
						: "skip",
			);
		}
	}
	return { rows, log };
}

function summarize(rows) {
	const counts = { rows: rows.size, pass: 0, fail: 0, skip: 0 };
	for (const status of rows.values()) counts[status] += 1;
	return counts;
}

// ---------------------------------------------------------------------------
// Verbs
// ---------------------------------------------------------------------------

function squashRehearsal(argv) {
	const scratch = requireScratch(argv, "squash-rehearsal");
	const root = resolve(flag(argv, "--root") ?? HOME_ROOT);
	const before = gate(root);
	const dir = cloneAt(root, scratch, "squash", before.tip, before.base);
	const squash = squashOnto(dir, before.base, before.tip);
	const after = gate(dir);
	const grew = after.paths.filter((p) => !before.paths.includes(p));
	const lost = before.paths.filter((p) => !after.paths.includes(p));
	const report = {
		verb: "squash-rehearsal",
		clone: dir,
		squash,
		before: { paths: before.paths.length, base: before.base, tip: before.tip, squashed: before.squashed },
		after: { paths: after.paths.length, base: after.base, tip: after.tip, squashed: after.squashed },
		grew,
		lost,
		prohibited: after.prohibited,
		unclassified: after.unclassified,
		merges: after.merges,
	};
	emit(report);
	return after.squashed &&
		after.base === before.base &&
		grew.length === 0 &&
		lost.length === 0 &&
		gateOk(after) &&
		after.merges.length === 0
		? 0
		: 1;
}

function accretionRehearsal(argv) {
	const scratch = requireScratch(argv, "accretion-rehearsal");
	const root = resolve(flag(argv, "--root") ?? HOME_ROOT);
	const plant = argv.includes("--plant-prohibited");
	const before = gate(root);
	const dir = cloneAt(root, scratch, "accretion", before.tip, before.base);
	squashOnto(dir, before.base, before.tip);
	if (plant) {
		// The falsification: a prohibited path inside the change's own squash.
		write(dir, "schema/planted-by-the-range.json", "{}\n");
		git(dir, "add", "-A");
		git(dir, "commit", "-q", "--amend", "--no-edit");
	}
	const squashed = gate(dir);

	// An unrelated sibling on top: a new module, a schema, a docs edit.
	write(dir, "src/sibling/marker.mjs", "export {};\n");
	write(dir, "schema/semantic/v1/later.json", "{}\n");
	write(dir, "docs/semantic-data-system/index.md", `${readFileSync(join(dir, "docs/semantic-data-system/index.md"), "utf8")}\n<!-- sibling -->\n`);
	git(dir, "add", "-A");
	git(dir, "commit", "-q", "-m", "unrelated sibling on top");
	const withSibling = gate(dir);
	const grew = withSibling.paths.filter((p) => !squashed.paths.includes(p));

	// A prohibited path no later commit owns: an uncommitted schema edit.
	write(dir, "schema/uncommitted-prohibited.json", "{}\n");
	const withStray = gate(dir);
	const strayCaught = withStray.prohibited.some(
		(c) => c.path === "schema/uncommitted-prohibited.json",
	);
	rmSync(join(dir, "schema/uncommitted-prohibited.json"));

	const report = {
		verb: "accretion-rehearsal",
		clone: dir,
		planted: plant,
		squashed: { paths: squashed.paths.length, prohibited: squashed.prohibited, unclassified: squashed.unclassified },
		withSibling: { paths: withSibling.paths.length, tip: withSibling.tip, head: git(dir, "rev-parse", "HEAD") },
		grew,
		strayProhibitedCaught: strayCaught,
		strayProhibited: withStray.prohibited,
	};
	emit(report);
	return gateOk(squashed) &&
		gateOk(withSibling) &&
		grew.length === 0 &&
		withSibling.tip === squashed.tip &&
		strayCaught
		? 0
		: 1;
}

function revertRehearsal(argv) {
	const scratch = requireScratch(argv, "revert-rehearsal");
	const root = resolve(flag(argv, "--root") ?? HOME_ROOT);
	const before = gate(root);
	const dir = cloneAt(root, scratch, "revert", before.tip, before.base);
	git(dir, "checkout", "-q", "-B", "reverted", before.tip);
	git(dir, "revert", "--no-commit", `${before.base}..${before.tip}`);
	git(dir, "commit", "-q", "-m", "revert of the extraction frontend range");
	const diff = git(dir, "diff", "--no-renames", "--name-only", before.base, "HEAD");
	const treeMatchesBase = diff.length === 0;
	const sentinelsGone = SENTINELS.every((s) => !existsSync(join(dir, s)));
	let suite = null;
	let error = null;
	if (treeMatchesBase) {
		try {
			const { rows, log } = suiteRun(dir);
			suite = {
				...summarize(rows),
				failed: [...rows].filter(([, s]) => s === "fail").map(([n]) => n),
				log,
			};
		} catch (e) {
			error = String(e.message ?? e);
		}
	}
	const report = {
		verb: "revert-rehearsal",
		clone: dir,
		base: before.base,
		tip: before.tip,
		reverted: git(dir, "rev-parse", "HEAD"),
		treeMatchesBase,
		treeDiff: diff.split("\n").filter((l) => l.length > 0),
		sentinelsGone,
		suite,
		error,
	};
	emit(report);
	return treeMatchesBase && sentinelsGone && suite && suite.fail === 0 ? 0 : 1;
}

function suiteCompare(argv) {
	const scratch = requireScratch(argv, "suite-compare");
	const root = resolve(flag(argv, "--root") ?? HOME_ROOT);
	const range = gate(root);
	const baseDir = cloneAt(root, scratch, "suite-base", range.base, range.base);
	const headDir = cloneAt(root, scratch, "suite-head", range.tip, range.base);
	const base = suiteRun(baseDir);
	const head = suiteRun(headDir);
	const differing = [];
	const missing = [];
	for (const [row, outcome] of base.rows) {
		if (!head.rows.has(row)) {
			missing.push(row);
			continue;
		}
		const after = head.rows.get(row);
		if (after !== outcome) differing.push({ row, base: outcome, head: after });
	}
	const added = [...head.rows.keys()].filter((row) => !base.rows.has(row));
	const report = {
		verb: "suite-compare",
		base: { commit: range.base, clone: baseDir, ...summarize(base.rows), log: base.log },
		head: { commit: range.tip, clone: headDir, ...summarize(head.rows), log: head.log },
		compared: base.rows.size - missing.length,
		differing,
		missing,
		added: added.length,
		addedFailing: added.filter((row) => head.rows.get(row) === "fail"),
	};
	emit(report);
	return differing.length === 0 && missing.length === 0 ? 0 : 1;
}

async function main(argv) {
	const verb = argv[0];
	const root = resolve(flag(argv, "--root") ?? HOME_ROOT);
	switch (verb) {
		case "change-range":
			emit(workingRange(root));
			return 0;
		case "changed-paths":
			emit(workingPathsUnion(root));
			return 0;
		case "merge-commits":
			emit(workingMergeCommits(root));
			return 0;
		case "rust-generate":
			return rustGenerate(argv);
		case "identity-cases":
			return identityCases(argv);
		case "gate": {
			const report = gate(root);
			emit(report);
			return gateOk(report) ? 0 : 1;
		}
		case "suite-run": {
			const { rows, log } = suiteRun(root);
			emit({ ...summarize(rows), log, rows: Object.fromEntries(rows) });
			return 0;
		}
		case "squash-rehearsal":
			return squashRehearsal(argv);
		case "accretion-rehearsal":
			return accretionRehearsal(argv);
		case "revert-rehearsal":
			return revertRehearsal(argv);
		case "suite-compare":
			return suiteCompare(argv);
		default:
			process.stderr.write(
				"usage: extraction-frontend-harness.mjs <change-range | changed-paths | merge-commits | gate | suite-run> [--root DIR]\n" +
				"       extraction-frontend-harness.mjs identity-cases --table FILE\n" +
					"       extraction-frontend-harness.mjs rust-generate --ir FILE --out DIR [--output-root NAME]\n" +
					"       extraction-frontend-harness.mjs <squash-rehearsal | accretion-rehearsal [--plant-prohibited] | revert-rehearsal | suite-compare> --scratch DIR [--root DIR]\n",
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
