#!/usr/bin/env node
/**
 * The Rust backend's byte baseline, its determinism evidence, its formatter
 * gate, and its support-matrix gate (FR-060).
 *
 * This script is deliberately *not* the script that writes the goldens. The
 * goldens under `test/fixtures/rust-serde/goldens/` are written by
 * `src/compiler/backends/rust-serde/cli.mjs generate --out`, which reaches the
 * emitter through `generateRust` and a directory sink; the digest baseline in
 * `test/fixtures/rust-serde/digests.json` is written here, through `emitCrate`
 * directly. Two artifacts, two writers, two entry points: a single emitter
 * change has to be committed twice by two deliberate acts before the check goes
 * green again, and regenerating only the goldens leaves the baseline red
 * (FR-060-AC-12, FR-060-CON-6).
 *
 * Nothing here is asserted that is not measured. The determinism evidence runs
 * real second generations in child processes under the declared perturbations
 * and compares the bytes they wrote; it does not compare a result to a cached
 * copy of itself (FR-060-CON-2).
 *
 * Usage:
 *   --write-digests   write test/fixtures/rust-serde/digests.json
 *   --check-digests   compare the goldens against that baseline
 *   --determinism     two runs, then TZ, LANG, PWD and HOME perturbations
 *   --rustfmt         assert the pinned formatter, then rustfmt --check
 *   --matrix          every support-matrix row is qualified
 *   --manifests <dir> the file list in each generated manifest is sorted
 */

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
	mkdirSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	rmSync,
	statSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import {
	corpusBases,
	requestFor,
} from "../src/compiler/backends/rust-serde/cli.mjs";
import { emitCrate } from "../src/compiler/backends/rust-serde/crate.mjs";
import { readLicense } from "../src/compiler/backends/rust-serde/index.mjs";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const CLI = join(ROOT, "src", "compiler", "backends", "rust-serde", "cli.mjs");
const GOLDENS = join(ROOT, "test", "fixtures", "rust-serde", "goldens");
const DIGESTS = join(ROOT, "test", "fixtures", "rust-serde", "digests.json");
const MATRIX = join(
	ROOT,
	"docs",
	"semantic-data-system",
	"rust-backend-support-matrix.md",
);
const TOOLCHAIN = join(ROOT, "rust-toolchain.toml");

/** The scratch root; per worktree, and outside anything biome or git walks. */
function targetDir() {
	return (
		process.env.CARGO_TARGET_DIR ??
		join(ROOT, "node_modules", ".cache", "rust-target")
	);
}

function sha256(text) {
	return `sha256:${createHash("sha256").update(text, "utf8").digest("hex")}`;
}

/** Every file under `dir`, as paths relative to it, in code-point order. */
function walk(dir, prefix = "") {
	const out = [];
	for (const name of readdirSync(dir).sort()) {
		const full = join(dir, name);
		const rel = prefix ? `${prefix}/${name}` : name;
		if (statSync(full).isDirectory()) out.push(...walk(full, rel));
		else out.push(rel);
	}
	return out.sort((left, right) => (left < right ? -1 : left > right ? 1 : 0));
}

// ---------------------------------------------------------------------------
// The digest baseline
// ---------------------------------------------------------------------------

/**
 * The baseline, built through `emitCrate` — the entry point the golden writer
 * does not use.
 */
function baseline() {
	const licenseText = readLicense(ROOT);
	const bases = {};
	for (const base of corpusBases(ROOT)) {
		const emitted = emitCrate(requestFor(base), { licenseText });
		const files = {};
		for (const path of [...emitted.files.keys()].sort()) {
			files[path] = sha256(emitted.files.get(path));
		}
		bases[base.name] = {
			state: emitted.state,
			fileCount: emitted.files.size,
			files,
			crate: sha256(
				Object.entries(files)
					.map(([path, digest]) => `${path} ${digest}\n`)
					.join(""),
			),
		};
	}
	return {
		note: "Written by scripts/build-rust-backend-goldens.mjs through emitCrate. The goldens beside it are written by cli.mjs generate through generateRust. Two writers, two entry points (FR-060).",
		bases,
	};
}

function writeDigests() {
	writeFileSync(DIGESTS, `${JSON.stringify(baseline(), null, "\t")}\n`, "utf8");
	process.stdout.write(`wrote ${relative(ROOT, DIGESTS)}\n`);
	return 0;
}

/**
 * Compares the baseline against two things, because it has to fail on two
 * different mistakes.
 *
 * Against a *fresh emit*, so a changed emitter byte turns the baseline red
 * naming the digest — and stays red after the goldens alone are regenerated,
 * because regenerating the goldens does not touch this file. Against the
 * *committed golden bytes on disk*, so a golden edited by hand fails here even
 * though the emitter never changed (FR-060-AC-12).
 */
function checkDigests() {
	const problems = [];
	let recorded;
	try {
		recorded = JSON.parse(readFileSync(DIGESTS, "utf8"));
	} catch (error) {
		process.stderr.write(
			`the digest baseline ${relative(ROOT, DIGESTS)} could not be read: ${error.message}\n`,
		);
		return 1;
	}

	// 1. A fresh emit, through `emitCrate`.
	const fresh = baseline().bases;
	for (const name of new Set([
		...Object.keys(recorded.bases),
		...Object.keys(fresh),
	])) {
		const was = recorded.bases[name];
		const now = fresh[name];
		if (!was) {
			problems.push(
				`the emitter produced ${name}, which the digest baseline does not record`,
			);
			continue;
		}
		if (!now) {
			problems.push(
				`the digest baseline records ${name}, which the emitter did not produce`,
			);
			continue;
		}
		if (was.crate !== now.crate) {
			problems.push(
				`${name}: the digest baseline records the crate digest ${was.crate}, the emitter now produces ${now.crate}`,
			);
		}
		for (const path of new Set([
			...Object.keys(was.files),
			...Object.keys(now.files),
		])) {
			if (was.files[path] !== now.files[path]) {
				problems.push(
					`${name}/${path}: the digest baseline records ${was.files[path] ?? "no digest"}, the emitter now produces ${now.files[path] ?? "no file"}`,
				);
			}
		}
	}

	// 2. The golden bytes on disk.
	for (const [name, entry] of Object.entries(recorded.bases)) {
		const dir = join(GOLDENS, name);
		let present;
		try {
			present = walk(dir);
		} catch {
			problems.push(`the golden crate ${name} is missing from the goldens`);
			continue;
		}
		if (present.length !== entry.fileCount) {
			problems.push(
				`${name}: the digest baseline records ${entry.fileCount} files, the golden carries ${present.length}`,
			);
		}
		for (const [path, digest] of Object.entries(entry.files)) {
			let actual;
			try {
				actual = sha256(readFileSync(join(dir, path), "utf8"));
			} catch {
				problems.push(
					`${name}/${path}: the digest baseline names a file the golden does not carry`,
				);
				continue;
			}
			if (actual !== digest) {
				problems.push(
					`${name}/${path}: the digest baseline says ${digest}, the golden hashes to ${actual}`,
				);
			}
		}
		for (const path of present) {
			if (!(path in entry.files))
				problems.push(
					`${name}/${path}: the golden carries a file the digest baseline does not name`,
				);
		}
	}
	for (const problem of problems)
		process.stderr.write(`digest baseline failed: ${problem}\n`);
	if (problems.length > 0) return 1;
	const count = Object.values(recorded.bases).reduce(
		(total, entry) => total + entry.fileCount,
		0,
	);
	process.stdout.write(
		`digest baseline passed: ${Object.keys(recorded.bases).length} bases, ${count} files\n`,
	);
	return 0;
}

// ---------------------------------------------------------------------------
// The determinism evidence
// ---------------------------------------------------------------------------

/** Runs `cli.mjs generate` into a fresh directory and returns its bytes. */
function generateInto(label, { env = {}, cwd = ROOT } = {}) {
	const target = targetDir();
	mkdirSync(target, { recursive: true });
	const out = mkdtempSync(join(target, "determinism-"));
	const result = spawnSync(process.execPath, [CLI, "generate", "--out", out], {
		cwd,
		encoding: "utf8",
		env: { ...process.env, ...env },
	});
	if (result.status !== 0) {
		throw new Error(
			`the ${label} generation failed: ${result.stdout ?? ""}${result.stderr ?? ""}`,
		);
	}
	const files = new Map();
	for (const path of walk(out)) files.set(path, readFileSync(join(out, path)));
	rmSync(out, { recursive: true, force: true });
	return files;
}

/** Compares two generations byte for byte and reports what it measured. */
function compare(problems, label, left, right) {
	let bytes = 0;
	let differing = 0;
	const names = new Set([...left.keys(), ...right.keys()]);
	for (const name of [...names].sort()) {
		const a = left.get(name);
		const b = right.get(name);
		if (a === undefined || b === undefined) {
			differing += 1;
			problems.push(
				`${label}: the file ${name} is present in only one generation`,
			);
			continue;
		}
		bytes += a.length;
		if (!a.equals(b)) {
			differing += 1;
			problems.push(
				`${label}: the file ${name} differs between the two generations`,
			);
		}
	}
	process.stdout.write(
		`${label}: ${names.size} files, ${bytes} bytes compared, ${differing} differing\n`,
	);
}

function determinism() {
	const problems = [];
	const first = generateInto("first");
	compare(problems, "two consecutive runs", first, generateInto("second"));

	const scratchCwd = mkdtempSync(join(tmpdir(), "rust-backend-cwd-"));
	const homeA = mkdtempSync(join(tmpdir(), "rust-backend-home-a-"));
	const homeB = mkdtempSync(join(tmpdir(), "rust-backend-home-b-"));
	try {
		const perturbations = [
			["TZ=UTC", { env: { TZ: "UTC" } }],
			["TZ=Pacific/Kiritimati", { env: { TZ: "Pacific/Kiritimati" } }],
			["LANG=C", { env: { LANG: "C", LC_ALL: "C" } }],
			[
				"LANG=tr_TR.UTF-8",
				{ env: { LANG: "tr_TR.UTF-8", LC_ALL: "tr_TR.UTF-8" } },
			],
			["a second working directory", { cwd: scratchCwd }],
			["HOME=a", { env: { HOME: homeA } }],
			["HOME=b", { env: { HOME: homeB } }],
			["SOURCE_DATE_EPOCH=0", { env: { SOURCE_DATE_EPOCH: "0" } }],
		];
		for (const [label, options] of perturbations) {
			compare(problems, label, first, generateInto(label, options));
		}
	} finally {
		for (const dir of [scratchCwd, homeA, homeB])
			rmSync(dir, { recursive: true, force: true });
	}

	for (const problem of problems)
		process.stderr.write(`determinism failed: ${problem}\n`);
	return problems.length > 0 ? 1 : 0;
}

// ---------------------------------------------------------------------------
// The formatter gate
// ---------------------------------------------------------------------------

/** The channel `rust-toolchain.toml` pins. */
function pinnedChannel() {
	const text = readFileSync(TOOLCHAIN, "utf8");
	const match = text.match(/^\s*channel\s*=\s*"([^"]+)"/m);
	return match?.[1];
}

/** The `rustfmt` version the support matrix declares. */
function declaredRustfmt() {
	const text = readFileSync(MATRIX, "utf8");
	const match = text.match(/^-\s*`rustfmt`\s+version:\s*`([^`]+)`/m);
	return match?.[1];
}

function rustfmtGate() {
	const problems = [];
	const channel = pinnedChannel();
	const declared = declaredRustfmt();

	const rustc = spawnSync("rustc", ["-vV"], { encoding: "utf8" });
	if (rustc.status !== 0) {
		process.stderr.write(
			"rustc is not on PATH: the FR-060 formatter gate cannot run, and this is a failure rather than a skip\n",
		);
		return 1;
	}
	const release = rustc.stdout.match(/^release:\s*(\S+)/m)?.[1];
	const rustcCommit = rustc.stdout.match(/^commit-hash:\s*(\S+)/m)?.[1] ?? "";
	const host = rustc.stdout.match(/^host:\s*(\S+)/m)?.[1];

	const version = spawnSync("rustfmt", ["--version"], { encoding: "utf8" });
	if (version.status !== 0) {
		process.stderr.write(
			"rustfmt is not on PATH: the FR-060 formatter gate cannot run, and this is a failure rather than a skip\n",
		);
		return 1;
	}
	const running = version.stdout.trim();
	const runningVersion = running.split(" ")[1];
	const runningCommit = running.match(/\(([0-9a-f]+)\s/)?.[1] ?? "";

	if (release !== channel) {
		problems.push(
			`the running toolchain is ${release}, and rust-toolchain.toml pins ${channel}`,
		);
	}
	if (runningVersion !== declared) {
		problems.push(
			`the running rustfmt is ${runningVersion}, and the support matrix declares ${declared}`,
		);
	}
	if (!rustcCommit.startsWith(runningCommit)) {
		problems.push(
			`the running rustfmt was built from ${runningCommit}, and the running rustc from ${rustcCommit}, so the formatter is not the pinned toolchain's component`,
		);
	}
	if (problems.length > 0) {
		for (const problem of problems)
			process.stderr.write(`formatter gate failed: ${problem}\n`);
		return 1;
	}
	process.stdout.write(
		`formatter: rustfmt ${runningVersion} from toolchain ${release} on ${host}\n`,
	);

	// The fixed point itself, over every committed golden crate.
	let checked = 0;
	for (const base of readdirSync(GOLDENS).sort()) {
		const dir = join(GOLDENS, base);
		if (!statSync(dir).isDirectory()) continue;
		const sources = walk(dir)
			.filter((path) => path.endsWith(".rs"))
			.map((path) => join(dir, path));
		const result = spawnSync(
			"rustfmt",
			[
				"--check",
				"--edition",
				"2021",
				"--config-path",
				join(ROOT, "rustfmt.toml"),
				...sources,
			],
			{ encoding: "utf8" },
		);
		checked += sources.length;
		if (result.status !== 0) {
			process.stderr.write(
				`formatter gate failed: ${base} is not a fixed point of rustfmt ${runningVersion}:\n${result.stdout}${result.stderr}`,
			);
			return 1;
		}
	}
	process.stdout.write(
		`rustfmt --check: ${checked} generated source files report no change\n`,
	);
	return 0;
}

// ---------------------------------------------------------------------------
// The support-matrix gate
// ---------------------------------------------------------------------------

/**
 * Every platform row is qualified: supported with named measured evidence, or
 * unmet with a reason and an owning issue. A row recorded unmet with no owning
 * issue fails (FR-060-AC-8, FR-060-AC-13, FR-060-AC-14).
 */
function matrixGate() {
	const problems = [];
	const text = readFileSync(MATRIX, "utf8");

	// Only the platform table. The document carries other tables, and a gate
	// that read every table in the file would decide rows that are not rows.
	const start = text.indexOf("## Platform rows");
	if (start === -1)
		problems.push("the matrix carries no `## Platform rows` section");
	const rest = text.slice(start + 1);
	const end = rest.indexOf("\n## ");
	const section = end === -1 ? rest : rest.slice(0, end);
	const rows = section
		.split("\n")
		.filter((line) => line.startsWith("| `"))
		.map((line) =>
			line
				.split("|")
				.map((cell) => cell.trim())
				.filter(Boolean),
		);

	if (rows.length === 0) problems.push("the matrix lists no platform row");

	let supported = 0;
	for (const row of rows) {
		const [triple, status, toolchain, formatter, evidence] = row;
		if (status === "supported") {
			supported += 1;
			for (const [name, cell] of [
				["toolchain version", toolchain],
				["rustfmt version", formatter],
				["evidence", evidence],
			]) {
				if (!cell || cell === "—" || cell === "-")
					problems.push(`${triple} is listed supported with no ${name}`);
			}
		} else if (status === "unmet") {
			if (!evidence?.includes("issues/"))
				problems.push(`${triple} is recorded unmet with no owning issue`);
		} else {
			problems.push(`${triple} is neither supported nor unmet: ${status}`);
		}
	}
	if (supported !== 1) {
		problems.push(
			`exactly one platform row is supported at this revision; the matrix lists ${supported}`,
		);
	}

	const channel = pinnedChannel();
	if (!text.includes(`\`${channel}\``))
		problems.push(`the matrix does not name the pinned channel ${channel}`);

	for (const problem of problems)
		process.stderr.write(`support matrix failed: ${problem}\n`);
	if (problems.length > 0) return 1;
	process.stdout.write(
		`support matrix passed: ${rows.length} rows, ${supported} supported with measured evidence\n`,
	);
	return 0;
}

// ---------------------------------------------------------------------------

/**
 * The output manifest's file list is sorted by path, by code point, on every
 * base (FR-060-AC-10).
 *
 * It reads the manifests a fresh `generate` just wrote rather than a committed
 * copy: the manifests are `JSON.stringify` output, which this repository's
 * formatter reformats, so they are checked where they are produced instead of
 * being transcribed into the goldens.
 */
function manifestOrder(dir) {
	const problems = [];
	let names;
	try {
		names = readdirSync(dir).filter((name) =>
			name.endsWith(".output-manifest.json"),
		);
	} catch (error) {
		process.stderr.write(
			`the generated manifests could not be read: ${error.message}\n`,
		);
		return 1;
	}
	if (names.length === 0) {
		process.stderr.write(`no output manifest was found under ${dir}\n`);
		return 1;
	}
	let checked = 0;
	for (const name of names.sort()) {
		const manifest = JSON.parse(readFileSync(join(dir, name), "utf8"));
		const paths = manifest.files.map((entry) => entry.path);
		const sorted = [...paths].sort((left, right) =>
			left < right ? -1 : left > right ? 1 : 0,
		);
		for (let index = 0; index < paths.length; index += 1) {
			if (paths[index] !== sorted[index]) {
				problems.push(
					`${name}: the file list is not sorted by code point at position ${index}: ${paths[index]} before ${sorted[index]}`,
				);
				break;
			}
		}
		checked += paths.length;
	}
	for (const problem of problems)
		process.stderr.write(`manifest ordering failed: ${problem}\n`);
	if (problems.length > 0) return 1;
	process.stdout.write(
		`manifest ordering passed: ${names.length} manifests, ${checked} file entries sorted by code point\n`,
	);
	return 0;
}

const MODES = {
	"--write-digests": writeDigests,
	"--check-digests": checkDigests,
	"--determinism": determinism,
	"--rustfmt": rustfmtGate,
	"--matrix": matrixGate,
	"--manifests": () => manifestOrder(process.argv[3]),
};

const mode = process.argv[2];
if (!(mode in MODES)) {
	process.stderr.write(
		`usage: build-rust-backend-goldens.mjs <${Object.keys(MODES).join(" | ")}>\n`,
	);
	process.exitCode = 1;
} else {
	process.exitCode = MODES[mode]();
}
