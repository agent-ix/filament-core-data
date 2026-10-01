#!/usr/bin/env node
/**
 * The Rust backend's determinism evidence, its formatter gate, and its
 * support-matrix gate (FR-060).
 *
 * Nothing here is asserted that is not measured. The determinism evidence runs
 * real second generations in child processes under the declared perturbations
 * and compares the bytes they wrote; it does not compare a result to a cached
 * copy of itself (FR-060-CON-2).
 *
 * Usage:
 *   --determinism     two runs, then TZ, LANG, PWD and HOME perturbations
 *   --rustfmt         assert the pinned formatter, then rustfmt --check
 *   --matrix          every support-matrix row is qualified
 *   --manifests <dir> the file list in each generated manifest is sorted
 */

import { spawnSync } from "node:child_process";
import {
	mkdirSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	rmSync,
	statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const CLI = join(ROOT, "src", "compiler", "backends", "rust-serde", "cli.mjs");
const GOLDENS = join(ROOT, "test", "fixtures", "rust-serde", "goldens");
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
 * The `[lints.rust]` entries a generated `Cargo.toml` carries, read from a
 * golden crate. Reading them is the point: a transcribed list would agree with
 * every change to the emitter.
 */
function deniedLints() {
	const bases = readdirSync(GOLDENS)
		.filter((name) => statSync(join(GOLDENS, name)).isDirectory())
		.sort();
	if (bases.length === 0) {
		throw new Error(
			"no golden crate is present, so the denied lint set could not be read and this gate fails rather than passing over an empty set",
		);
	}
	const text = readFileSync(join(GOLDENS, bases[0], "Cargo.toml"), "utf8");
	const table = /\n\[lints\.rust\]\n([\s\S]*?)(?:\n\[|$)/.exec(text);
	if (!table) {
		throw new Error(
			`the golden crate ${bases[0]} carries no [lints.rust] table, so the denied lint set could not be read`,
		);
	}
	return [...table[1].matchAll(/^([a-z_]+)\s*=/gm)].map((one) => one[1]);
}

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

	// The `[lints.rust]` table the generator writes couples the *generated*
	// crate to the `rustc` release: a future lint reddens a consumer build with
	// no contract change. FR-056-AC-1 intends that, and it is a property of the
	// generated artifact, so it is recorded beside the pin rather than left for
	// a consumer to discover on a toolchain bump. The lint names are read out of
	// a golden `Cargo.toml` rather than restated here, so adding or dropping one
	// moves this gate instead of leaving a stale sentence behind.
	for (const lint of deniedLints()) {
		if (!text.includes(`\`${lint}\``))
			problems.push(
				`the generated Cargo.toml denies \`${lint}\` and the matrix does not name it`,
			);
	}
	if (!text.includes("## What the generated crate denies")) {
		problems.push(
			"the matrix carries no `## What the generated crate denies` section, so the toolchain coupling the `[lints.rust]` table creates is unrecorded",
		);
	}

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
