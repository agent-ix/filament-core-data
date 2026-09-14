#!/usr/bin/env node
/**
 * The kernel Rust crate's measured gates (FR-086).
 *
 * Every claim here is a measurement. The tree comparison regenerates into a
 * scratch directory outside the working tree and compares file by file; the
 * build gate runs a real `cargo build --offline --locked` over a scratch copy
 * of the committed bytes with `CARGO_TARGET_DIR` outside the working tree; the
 * formatter gate runs the pinned `rustfmt`. No recorded prior result stands in
 * for a run (FR-086-CON-3, FR-086-CON-6).
 *
 * This script writes nothing into the working tree. `make semantic-kernel`
 * writes the crate and `make semantic-kernel-digests` writes the baseline;
 * neither is a prerequisite of the check, because a check that regenerates its
 * own baseline compares a file to itself.
 *
 * No step contacts a package registry. Nothing here invokes `cargo publish` or
 * passes `--registry`, `--index` or a publish `--dry-run`: the publication gate
 * `agent-ix/quoin#290` is kept by `publish = false` in the generated manifest,
 * which travels with the artifact, not by an intention to refrain.
 *
 * Usage:
 *   --tree <scratch>    regenerate into <scratch> and compare, then the manifest
 *   --manifest          the committed manifest's publish, lint, dependency and metadata claims
 *   --rustfmt           the pinned formatter, then rustfmt --check over the committed crate
 *   --build <scratch>   cargo build --offline --locked over a scratch copy
 *   --gate              the publication gate and the inherited-defect record
 */

import { spawnSync } from "node:child_process";
import {
	cpSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	rmSync,
	statSync,
	writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
	BACKEND as RUST_BACKEND,
	DEFAULT_LIMITS as RUST_LIMITS,
	DEFAULT_PROFILE as RUST_PROFILE,
} from "../src/compiler/backends/rust-serde/cli.mjs";
import {
	generateRust,
	readLicense,
} from "../src/compiler/backends/rust-serde/index.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const KERNEL = join(ROOT, "packages/semantic-kernel");
/**
 * The crate these gates measure. It is the committed one, and the environment
 * override exists so a *falsification* can be measured without writing into
 * the working tree: a test that proved `publish = false` is enforced by
 * deleting it from the committed manifest would be a test whose subject is its
 * own repository, which is the hazard that strands a half-restored file when
 * two runs overlap. A test copies the crate to a scratch directory, edits the
 * copy, and points the gate at it.
 */
const CRATE = process.env.KERNEL_CRATE_ROOT
	? resolve(process.env.KERNEL_CRATE_ROOT)
	: join(KERNEL, "rust");
const MANIFEST = join(CRATE, "Cargo.toml");
const TOOLCHAIN = join(ROOT, "rust-toolchain.toml");
const MATRIX = join(
	ROOT,
	"docs",
	"semantic-data-system",
	"rust-backend-support-matrix.md",
);
const PACKAGES_DOC = join(
	ROOT,
	"docs",
	"semantic-data-system",
	"semantic-kernel-packages.md",
);
const NOTICES = join(ROOT, "THIRD-PARTY-NOTICES.md");

/** The publication gate and the inherited defect, named once. */
const PUBLICATION_GATE = "agent-ix/quoin#290";
const INHERITED_DEFECT = "agent-ix/filament-core-data#21";

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));

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

function report(problems, label) {
	for (const problem of problems)
		process.stderr.write(`${label} failed: ${problem}\n`);
	return problems.length > 0 ? 1 : 0;
}

/**
 * The request `scripts/build-semantic-kernel.mjs` builds for the Rust half,
 * over the committed kernel IR and the `inputDigest` FR-084 recorded beside it.
 * Nothing is restated: the backend identity, the profile and the limits come
 * from `cli.mjs` (FR-086-CON-1).
 */
function kernelRequest() {
	return {
		contractVersion: "1.0.0",
		lockFingerprint: readJson(join(KERNEL, "provenance.json")).inputDigest,
		ir: readJson(join(KERNEL, "semantic-ir.json")),
		profile: RUST_PROFILE,
		mappings: [],
		backend: RUST_BACKEND,
		outputRoot: "packages/semantic-kernel/rust",
		limits: RUST_LIMITS,
	};
}

// ---------------------------------------------------------------------------
// The byte-comparison gate
// ---------------------------------------------------------------------------

/**
 * A fresh generation into a scratch directory outside the working tree, then a
 * file-by-file comparison naming the differing file, then the manifest that
 * generation produced (FR-086-AC-1, FR-086-AC-2, FR-086-AC-17).
 */
function tree(scratch) {
	if (!scratch) {
		process.stderr.write("--tree needs a scratch directory\n");
		return 1;
	}
	const out = resolve(scratch);
	if (out.startsWith(`${ROOT}/`)) {
		process.stderr.write(
			`the scratch directory ${out} is inside the working tree; the comparison would risk passing by comparing a file to itself\n`,
		);
		return 1;
	}
	rmSync(out, { recursive: true, force: true });
	mkdirSync(out, { recursive: true });

	const problems = [];
	const emitted = new Map();
	const manifest = generateRust(
		kernelRequest(),
		{
			clear() {},
			write(_outputRoot, path, text) {
				emitted.set(path, text);
				const full = join(out, path);
				mkdirSync(dirname(full), { recursive: true });
				writeFileSync(full, text);
			},
		},
		{ licenseText: readLicense(ROOT) },
	);

	if (manifest.state !== "success") {
		problems.push(`the generation reports state ${manifest.state}`);
	}
	for (const diagnostic of manifest.diagnostics ?? []) {
		if (diagnostic.severity === "error" || diagnostic.blocking === true) {
			problems.push(
				`the generation reports the blocking diagnostic ${diagnostic.code}: ${diagnostic.message}`,
			);
		}
	}
	const listed = (manifest.files ?? []).map((entry) => entry.path);
	if (listed.length !== emitted.size) {
		problems.push(
			`the manifest lists ${listed.length} files and the generation wrote ${emitted.size}`,
		);
	}
	for (const path of listed) {
		if (!emitted.has(path))
			problems.push(`the manifest lists ${path}, which was not written`);
	}

	// The committed tree against the fresh one, in both directions.
	let committed;
	try {
		committed = walk(CRATE);
	} catch {
		problems.push(
			`the committed crate ${relative(ROOT, CRATE)} is missing, so there is nothing to compare`,
		);
		committed = [];
	}
	for (const path of committed) {
		const fresh = emitted.get(path);
		if (fresh === undefined) {
			problems.push(
				`${path}: the committed crate carries a file the emitter does not emit`,
			);
			continue;
		}
		if (readFileSync(join(CRATE, path), "utf8") !== fresh) {
			problems.push(
				`${path}: the committed crate differs from a fresh generation`,
			);
		}
	}
	for (const path of [...emitted.keys()].sort()) {
		if (!committed.includes(path))
			problems.push(
				`${path}: the emitter emits a file the crate does not carry`,
			);
	}
	// The file ordering, not only the file set (FR-086-AC-2).
	const order = [...emitted.keys()];
	const sorted = [...order].sort((left, right) =>
		left < right ? -1 : left > right ? 1 : 0,
	);
	for (let index = 0; index < order.length; index += 1) {
		if (order[index] !== sorted[index]) {
			problems.push(
				`the emitted file order is not sorted by code point at position ${index}: ${order[index]} before ${sorted[index]}`,
			);
			break;
		}
	}

	const code = report(problems, "kernel crate comparison");
	if (code === 0) {
		process.stdout.write(
			`kernel crate comparison passed: ${committed.length} committed files equal a fresh generation, manifest state ${manifest.state}\n`,
		);
	}
	return code;
}

// ---------------------------------------------------------------------------
// The manifest's own claims
// ---------------------------------------------------------------------------

/** The `[lints.rust]` table the committed manifest carries, read not restated. */
function deniedLints(text) {
	const table = /\n\[lints\.rust\]\n([\s\S]*?)(?:\n\[|$)/.exec(text);
	if (!table) return null;
	return Object.fromEntries(
		[...table[1].matchAll(/^([a-z_]+)\s*=\s*"([a-z]+)"/gm)].map((one) => [
			one[1],
			one[2],
		]),
	);
}

/**
 * `publish = false`, the three denied lints, the single exact dependency and
 * the declared metadata — every one read out of the committed manifest, so
 * removing any of them fails here naming the manifest (FR-086-AC-3,
 * FR-086-AC-11, FR-086-AC-12).
 */
function manifestGate() {
	const problems = [];
	let text;
	try {
		text = readFileSync(MANIFEST, "utf8");
	} catch {
		process.stderr.write(
			`the committed manifest ${relative(ROOT, MANIFEST)} is missing\n`,
		);
		return 1;
	}
	if (!/^publish\s*=\s*false$/m.test(text)) {
		problems.push(
			`${relative(ROOT, MANIFEST)} does not carry \`publish = false\`, which is what enforces ${PUBLICATION_GATE}`,
		);
	}
	const lints = deniedLints(text);
	if (!lints) {
		problems.push(`${relative(ROOT, MANIFEST)} carries no [lints.rust] table`);
	} else {
		for (const [lint, level] of [
			["warnings", "deny"],
			["missing_docs", "deny"],
			["unsafe_code", "forbid"],
		]) {
			if (lints[lint] !== level) {
				problems.push(
					`${relative(ROOT, MANIFEST)} sets ${lint} to ${lints[lint] ?? "nothing"}, and the requirement declares ${level}`,
				);
			}
		}
	}
	for (const [key, value] of [
		["license", "AGPL-3.0-only"],
		["edition", "2021"],
		["rust-version", "1.85.0"],
	]) {
		if (!new RegExp(`^${key}\\s*=\\s*"${value}"$`, "m").test(text)) {
			problems.push(
				`${relative(ROOT, MANIFEST)} does not declare ${key} = "${value}"`,
			);
		}
	}

	const deps = /\n\[dependencies\]\n([\s\S]*?)(?:\n\[|$)/.exec(text);
	if (!deps) {
		problems.push(
			`${relative(ROOT, MANIFEST)} carries no [dependencies] table`,
		);
	} else {
		const names = [...deps[1].matchAll(/^([A-Za-z0-9_-]+)\s*=/gm)].map(
			(one) => one[1],
		);
		if (names.length !== 1 || names[0] !== "serde") {
			problems.push(
				`the generated crate declares ${names.join(", ") || "no dependency"}; it declares serde and nothing else`,
			);
		}
		if (names.includes("serde_json")) {
			problems.push(
				"the generated crate declares serde_json, which is a consumer's dev-dependency and never a runtime dependency of a generated crate",
			);
		}
	}
	const pin = /serde\s*=\s*\{\s*version\s*=\s*"=([0-9.]+)"/.exec(text)?.[1];
	if (!pin) {
		problems.push(
			`${relative(ROOT, MANIFEST)} does not declare serde at an exact version pin`,
		);
	} else {
		// The attribution register answers for the pin that is actually
		// declared, so moving the pin without moving the row fails here.
		let notices;
		try {
			notices = readFileSync(NOTICES, "utf8");
		} catch {
			notices = "";
			problems.push(`${relative(ROOT, NOTICES)} is missing`);
		}
		if (notices && !notices.includes(pin)) {
			problems.push(
				`${relative(ROOT, NOTICES)} carries no row for serde at the pinned version ${pin}`,
			);
		}
	}

	// Nothing here writes; a crate that carries a lock file or a build
	// directory is a tree the gates have dirtied.
	for (const name of ["Cargo.lock", "target"]) {
		try {
			statSync(join(CRATE, name));
			problems.push(
				`the committed crate carries ${name}, which a gate left behind rather than a generation emitting it`,
			);
		} catch {
			// absent, which is the passing case
		}
	}

	const code = report(problems, "kernel manifest gate");
	if (code === 0) {
		process.stdout.write(
			`kernel manifest gate passed: publish = false, serde =${pin} alone, warnings/missing_docs denied and unsafe_code forbidden\n`,
		);
	}
	return code;
}

// ---------------------------------------------------------------------------
// The formatter gate
// ---------------------------------------------------------------------------

function pinnedChannel() {
	return readFileSync(TOOLCHAIN, "utf8").match(
		/^\s*channel\s*=\s*"([^"]+)"/m,
	)?.[1];
}

function declaredRustfmt() {
	return readFileSync(MATRIX, "utf8").match(
		/^-\s*`rustfmt`\s+version:\s*`([^`]+)`/m,
	)?.[1];
}

/**
 * The pinned formatter, asserted before it is run, so a difference reported by
 * some other version fails saying which version it found rather than being read
 * as a generator defect (FR-086-AC-7, FR-086-AC-16).
 */
function rustfmtGate() {
	const channel = pinnedChannel();
	const declared = declaredRustfmt();

	const rustc = spawnSync("rustc", ["-vV"], { encoding: "utf8" });
	if (rustc.status !== 0) {
		process.stderr.write(
			"rustc is not on PATH: the kernel formatter gate cannot run, and this is a failure rather than a skip\n",
		);
		return 1;
	}
	const version = spawnSync("rustfmt", ["--version"], { encoding: "utf8" });
	if (version.status !== 0) {
		process.stderr.write(
			"rustfmt is not on PATH: the kernel formatter gate cannot run, and this is a failure rather than a skip\n",
		);
		return 1;
	}
	const release = rustc.stdout.match(/^release:\s*(\S+)/m)?.[1];
	const running = version.stdout.trim().split(" ")[1];
	const problems = [];
	if (release !== channel) {
		problems.push(
			`the running toolchain is ${release}, and rust-toolchain.toml pins ${channel}`,
		);
	}
	if (running !== declared) {
		problems.push(
			`the running rustfmt is ${running}, and the support matrix declares ${declared}`,
		);
	}
	if (problems.length > 0) return report(problems, "kernel formatter gate");

	const sources = walk(CRATE)
		.filter((path) => path.endsWith(".rs"))
		.map((path) => join(CRATE, path));
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
	if (result.status !== 0) {
		process.stderr.write(
			`kernel formatter gate failed: the committed crate is not a fixed point of rustfmt ${running}:\n${result.stdout}${result.stderr}`,
		);
		return 1;
	}
	process.stdout.write(
		`kernel formatter gate passed: rustfmt ${running} from toolchain ${release} reports no change over ${sources.length} generated source files\n`,
	);
	return 0;
}

// ---------------------------------------------------------------------------
// The measured build gate
// ---------------------------------------------------------------------------

/**
 * A real build of the committed bytes, offline, in a scratch copy, with
 * `CARGO_TARGET_DIR` outside the working tree (FR-086-AC-5, FR-086-AC-9,
 * FR-086-AC-13, FR-086-CON-6, FR-086-CON-7).
 *
 * The generated crate declares no `Cargo.lock`, which is deliberate: the lock
 * is a consumer's artifact, not a generated one. The resolve therefore happens
 * here, in the scratch, offline — `cargo generate-lockfile --offline` cannot
 * reach a registry, so a dependency absent from the offline supply fails the
 * gate rather than being fetched — and the build that follows is `--locked`
 * against the lock that resolve produced.
 */
function build(scratch) {
	if (!scratch) {
		process.stderr.write("--build needs a scratch directory\n");
		return 1;
	}
	const out = resolve(scratch);
	if (out.startsWith(`${ROOT}/`)) {
		process.stderr.write(
			`the scratch directory ${out} is inside the working tree; a build there would dirty the tree\n`,
		);
		return 1;
	}
	if (spawnSync("cargo", ["--version"], { encoding: "utf8" }).status !== 0) {
		process.stderr.write(
			"cargo is not on PATH: the kernel build gate cannot run, and this is a failure rather than a skip\n",
		);
		return 1;
	}
	rmSync(out, { recursive: true, force: true });
	mkdirSync(out, { recursive: true });
	const copy = join(out, "crate");
	const target = join(out, "cargo-target");
	cpSync(CRATE, copy, { recursive: true });

	const lints = deniedLints(readFileSync(MANIFEST, "utf8")) ?? {};
	const env = {
		...process.env,
		CARGO_TARGET_DIR: target,
		CARGO_NET_OFFLINE: "true",
	};
	const lock = spawnSync(
		"cargo",
		[
			"generate-lockfile",
			"--offline",
			"--manifest-path",
			join(copy, "Cargo.toml"),
		],
		{ encoding: "utf8", env },
	);
	if (lock.status !== 0) {
		process.stderr.write(
			`kernel build gate failed: the offline resolve did not succeed, so the offline supply does not carry the pinned dependencies:\n${lock.stdout}${lock.stderr}`,
		);
		return 1;
	}
	const result = spawnSync(
		"cargo",
		[
			"build",
			"--offline",
			"--locked",
			"--manifest-path",
			join(copy, "Cargo.toml"),
		],
		{ encoding: "utf8", env },
	);
	const output = `${result.stdout}${result.stderr}`;
	if (result.status !== 0) {
		process.stderr.write(`kernel build gate failed:\n${output}`);
		return 1;
	}
	if (/^warning:/m.test(output)) {
		process.stderr.write(
			`kernel build gate failed: the build reported a warning under the crate's own [lints.rust] table:\n${output}`,
		);
		return 1;
	}
	process.stdout.write(
		`kernel build gate passed: cargo build --offline --locked over the committed bytes, zero warnings and zero errors under ${Object.entries(
			lints,
		)
			.map(([lint, level]) => `${lint} = "${level}"`)
			.join(", ")}\n`,
	);
	rmSync(out, { recursive: true, force: true });
	return 0;
}

// ---------------------------------------------------------------------------
// The publication gate and the inherited defect
// ---------------------------------------------------------------------------

/**
 * Reported on every run, for a reader who never opens the document, and
 * checked against the document, for a reader who never runs the gate
 * (FR-086-AC-18, FR-086-AC-20).
 */
function gate() {
	const problems = [];
	let doc;
	try {
		doc = readFileSync(PACKAGES_DOC, "utf8");
	} catch {
		process.stderr.write(
			`${relative(ROOT, PACKAGES_DOC)} is missing, and a blocked gate carrying no record fails the check\n`,
		);
		return 1;
	}
	for (const [what, needle] of [
		["the publication gate", PUBLICATION_GATE],
		["the inherited open defect", INHERITED_DEFECT],
		["what enforces the gate", "publish = false"],
		["the first clean-clone reproduction", "65ea7fa"],
		["the second clean-clone reproduction", "89e0ea1"],
	]) {
		if (!doc.includes(needle))
			problems.push(
				`${relative(ROOT, PACKAGES_DOC)} does not name ${what} (${needle})`,
			);
	}
	const provenance = readJson(join(KERNEL, "provenance.json"));
	if (provenance.published !== false) {
		problems.push(
			"the kernel provenance does not record the packages as unpublished",
		);
	}
	if (provenance.publicationGate?.issue !== PUBLICATION_GATE) {
		problems.push(
			`the kernel provenance records the publication gate as ${provenance.publicationGate?.issue ?? "nothing"}, and a blocked gate carrying no owning issue fails the check`,
		);
	}
	const code = report(problems, "kernel publication gate");
	if (code === 0) {
		process.stdout.write(
			`kernel publication gate: Rust publication is BLOCKED on ${PUBLICATION_GATE}, enforced by \`publish = false\` in the generated manifest rather than by an intention to refrain; ${INHERITED_DEFECT} is an inherited open defect this gate does not fix\n`,
		);
	}
	return code;
}

// ---------------------------------------------------------------------------

const MODES = {
	"--tree": () => tree(process.argv[3]),
	"--manifest": manifestGate,
	"--rustfmt": rustfmtGate,
	"--build": () => build(process.argv[3]),
	"--gate": gate,
};

const mode = process.argv[2];
if (!(mode in MODES)) {
	process.stderr.write(
		`usage: check-semantic-kernel-crate.mjs <${Object.keys(MODES).join(" | ")}>\n`,
	);
	process.exitCode = 1;
} else {
	process.exitCode = MODES[mode]();
}
