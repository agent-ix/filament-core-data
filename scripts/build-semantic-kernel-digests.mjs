#!/usr/bin/env node
/**
 * The kernel Rust crate's digest baseline (FR-086).
 *
 * This script writes `packages/semantic-kernel/rust-digests.json` and nothing
 * else. It is deliberately *not* the script that writes the crate. The tree
 * under `packages/semantic-kernel/rust/` is written by
 * `scripts/build-semantic-kernel.mjs`, which lowers the grammar documents and
 * reaches the emitter through `index.mjs`'s writing `generateRust`; the
 * baseline here reads the committed kernel IR and its committed provenance and
 * reaches the emitter through `crate.mjs`'s pure `emitCrate`. Two artifacts,
 * two writers, two entry points: one emitter change has to be committed twice
 * by two deliberate acts before the check goes green again, and regenerating
 * only the tree leaves the baseline red (FR-086-AC-8, FR-086-CON-4).
 *
 * Nothing here reaches a registry, and nothing here writes into the committed
 * crate.
 *
 * Usage:
 *   --write   write packages/semantic-kernel/rust-digests.json
 *   --check   compare the committed crate and a fresh emit against it
 */

import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
	BACKEND as RUST_BACKEND,
	DEFAULT_LIMITS as RUST_LIMITS,
	DEFAULT_PROFILE as RUST_PROFILE,
} from "../src/compiler/backends/rust-serde/cli.mjs";
import { emitCrate } from "../src/compiler/backends/rust-serde/crate.mjs";
import { readLicense } from "../src/compiler/backends/rust-serde/index.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const KERNEL = join(ROOT, "packages/semantic-kernel");
/**
 * The crate and the baseline. Both are the committed ones, and the environment
 * overrides exist only so a falsification can be measured against a scratch
 * copy rather than by editing the committed tree and restoring it afterwards.
 */
const CRATE = process.env.KERNEL_CRATE_ROOT
	? resolve(process.env.KERNEL_CRATE_ROOT)
	: join(KERNEL, "rust");
const DIGESTS = process.env.KERNEL_DIGESTS
	? resolve(process.env.KERNEL_DIGESTS)
	: join(KERNEL, "rust-digests.json");

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));

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

/**
 * The baseline, built through `emitCrate` over the committed kernel IR.
 *
 * The request restates nothing: the backend identity, the profile and the
 * limits come from `cli.mjs`, and the lock fingerprint is the `inputDigest`
 * FR-084 already recorded in the committed provenance, so the baseline is
 * measured against the same document the tree was generated from rather than
 * against a second reading of the grammar.
 */
function baseline() {
	const ir = readJson(join(KERNEL, "semantic-ir.json"));
	const provenance = readJson(join(KERNEL, "provenance.json"));
	const emitted = emitCrate(
		{
			contractVersion: "1.0.0",
			lockFingerprint: provenance.inputDigest,
			ir,
			profile: RUST_PROFILE,
			mappings: [],
			backend: RUST_BACKEND,
			outputRoot: "packages/semantic-kernel/rust",
			limits: RUST_LIMITS,
		},
		{ licenseText: readLicense(ROOT) },
	);
	const files = {};
	for (const path of [...emitted.files.keys()].sort()) {
		files[path] = sha256(emitted.files.get(path));
	}
	return {
		note: "Written by scripts/build-semantic-kernel-digests.mjs through emitCrate. The crate beside it is written by scripts/build-semantic-kernel.mjs through generateRust. Two writers, two entry points (FR-086).",
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

function write() {
	writeFileSync(DIGESTS, `${JSON.stringify(baseline(), null, "\t")}\n`, "utf8");
	process.stdout.write(`wrote ${relative(ROOT, DIGESTS)}\n`);
	return 0;
}

/**
 * Compares the baseline against two things, because it has to fail on two
 * different mistakes.
 *
 * Against a *fresh emit*, so a changed emitter byte turns the baseline red
 * naming the digest — and it stays red after the committed tree alone is
 * regenerated, because `make semantic-kernel` does not touch this file.
 * Against the *committed crate bytes on disk*, so a generated file edited by
 * hand fails here even though the emitter never changed (FR-086-AC-8,
 * FR-086-AC-17).
 */
function check() {
	const problems = [];
	let recorded;
	try {
		recorded = readJson(DIGESTS);
	} catch (error) {
		process.stderr.write(
			`the digest baseline ${relative(ROOT, DIGESTS)} could not be read: ${error.message}\n`,
		);
		return 1;
	}

	// 1. A fresh emit, through `emitCrate`.
	const fresh = baseline();
	if (recorded.state !== fresh.state) {
		problems.push(
			`the digest baseline records state ${recorded.state}, the emitter now reports ${fresh.state}`,
		);
	}
	if (recorded.crate !== fresh.crate) {
		problems.push(
			`the digest baseline records the crate digest ${recorded.crate}, the emitter now produces ${fresh.crate}`,
		);
	}
	for (const path of new Set([
		...Object.keys(recorded.files),
		...Object.keys(fresh.files),
	])) {
		if (recorded.files[path] !== fresh.files[path]) {
			problems.push(
				`${path}: the digest baseline records ${recorded.files[path] ?? "no digest"}, the emitter now produces ${fresh.files[path] ?? "no file"}`,
			);
		}
	}

	// 2. The committed crate bytes on disk.
	let present;
	try {
		present = walk(CRATE);
	} catch {
		problems.push(
			`the committed crate ${relative(ROOT, CRATE)} is missing, so the baseline has nothing to measure`,
		);
		present = [];
	}
	if (present.length > 0 && present.length !== recorded.fileCount) {
		problems.push(
			`the digest baseline records ${recorded.fileCount} files, the committed crate carries ${present.length}`,
		);
	}
	for (const [path, digest] of Object.entries(recorded.files)) {
		let actual;
		try {
			actual = sha256(readFileSync(join(CRATE, path), "utf8"));
		} catch {
			problems.push(
				`${path}: the digest baseline names a file the committed crate does not carry`,
			);
			continue;
		}
		if (actual !== digest) {
			problems.push(
				`${path}: the digest baseline says ${digest}, the committed crate hashes to ${actual}`,
			);
		}
	}
	for (const path of present) {
		if (!(path in recorded.files)) {
			problems.push(
				`${path}: the committed crate carries a file the digest baseline does not name`,
			);
		}
	}

	for (const problem of problems) {
		process.stderr.write(`kernel digest baseline failed: ${problem}\n`);
	}
	if (problems.length > 0) return 1;
	process.stdout.write(
		`kernel digest baseline passed: ${recorded.fileCount} files, crate ${recorded.crate}\n`,
	);
	return 0;
}

const MODES = { "--write": write, "--check": check };
const mode = process.argv[2];
if (!(mode in MODES)) {
	process.stderr.write(
		`usage: build-semantic-kernel-digests.mjs <${Object.keys(MODES).join(" | ")}>\n`,
	);
	process.exitCode = 1;
} else {
	process.exitCode = MODES[mode]();
}
