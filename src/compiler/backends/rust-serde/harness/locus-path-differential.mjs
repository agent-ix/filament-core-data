#!/usr/bin/env node
/**
 * The differential equivalence harness for the one proved validator (FR-057).
 *
 * `agent-ix.rust-backend.harness.locus-path-differential`, the identifier
 * `proved-validators.json` names.
 *
 * The entry admits a *hand-written* validator into the generated crate, so the
 * argument that it decides the published language is not an argument anybody
 * gets to make in prose. This harness compares the **generated Rust**
 * `SourceLocusPath::try_new` against an ECMA-262 engine — Node's own `RegExp`,
 * reading the pattern out of `schema/semantic/v1/common.schema.json` rather
 * than from a copy — over:
 *
 * - every string of length 0 to 6 over the entry's probe alphabet
 *   `{a, /, \\, ., :, U+000A, U+000D, U+2028, U+2029, U+0000}`, which is
 *   1 111 111 subjects;
 * - every `sourceLocus.path` value the conformance corpus and the published
 *   fixtures carry; and
 * - 100 000 pseudo-random strings from a declared, seeded generator over an
 *   extended pool that includes an astral character.
 *
 * One disagreement fails the harness, naming the input. The probe alphabet
 * carries all four ECMAScript line terminators on purpose: the pattern's guards
 * are lookaheads over `.`, which stops at the first terminator, so an alphabet
 * carrying only U+000A would admit a validator that treats U+000A as the only
 * terminator and still agree on every probed string.
 *
 * The subjects reach Rust as UTF-16 code units in hexadecimal, one subject per
 * line, because that is the basis both sides decide in and because a lone
 * surrogate has no `String` to travel in. Only well-formed subjects are
 * generated: an astral character is emitted as its whole surrogate pair.
 *
 * This is a harness, not a generation path. It builds a crate and runs a child
 * process, and neither is reachable from `generateRust`.
 */

import { spawnSync } from "node:child_process";
import {
	mkdirSync,
	readFileSync,
	readdirSync,
	statSync,
	writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { requestFor } from "../cli.mjs";
import { directorySink, generateRust, readLicense } from "../index.mjs";

const ROOT = fileURLToPath(new URL("../../../../../", import.meta.url));
const SCRATCH = join(ROOT, "target", "locus-harness");

/** The probe alphabet the registry entry declares. */
export const PROBE_ALPHABET = Object.freeze([
	"a",
	"/",
	"\\",
	".",
	":",
	"\u000a",
	"\u000d",
	"\u2028",
	"\u2029",
	"\u0000",
]);

/** The extended pool the seeded generator draws from. */
export const EXTENDED_POOL = Object.freeze([
	...PROBE_ALPHABET,
	"b",
	"Z",
	"0",
	"-",
	"_",
	" ",
	"\t",
	"\u00e9",
	"\u4e2d",
	"\u{1f600}",
]);

/** The number of seeded random subjects the entry requires. */
export const RANDOM_SUBJECTS = 100000;

/** The seed, declared so the run is reproducible. */
export const SEED = 0x5f3759df;

/** Mulberry32: a small, declared, seeded generator. */
function mulberry32(seed) {
	let state = seed >>> 0;
	return () => {
		state = (state + 0x6d2b79f5) >>> 0;
		let t = state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/** Every string of length 0 to `maxLength` over `alphabet`. */
export function* exhaustive(alphabet, maxLength) {
	yield "";
	let level = [""];
	for (let length = 1; length <= maxLength; length += 1) {
		const next = [];
		for (const prefix of level) {
			for (const ch of alphabet) {
				const subject = prefix + ch;
				next.push(subject);
				yield subject;
			}
		}
		level = next;
	}
}

/** The seeded random subjects. */
export function* seeded(pool, count, seed) {
	const random = mulberry32(seed);
	for (let index = 0; index < count; index += 1) {
		const length = Math.floor(random() * 13);
		let subject = "";
		for (let position = 0; position < length; position += 1) {
			subject += pool[Math.floor(random() * pool.length)];
		}
		yield subject;
	}
}

/** Every `sourceLocus.path` the corpus and the published fixtures carry. */
export function corpusLocusPaths(root = ROOT) {
	const found = new Set();
	const visit = (value) => {
		if (Array.isArray(value)) {
			for (const item of value) visit(item);
			return;
		}
		if (value === null || typeof value !== "object") return;
		for (const [key, member] of Object.entries(value)) {
			if (key === "path" && typeof member === "string") found.add(member);
			else visit(member);
		}
	};
	const walk = (directory) => {
		for (const name of readdirSync(directory).sort()) {
			const full = join(directory, name);
			if (statSync(full).isDirectory()) {
				walk(full);
				continue;
			}
			if (!name.endsWith(".json")) continue;
			try {
				visit(JSON.parse(readFileSync(full, "utf8")));
			} catch {
				// A file that is not a JSON document carries no locus path.
			}
		}
	};
	walk(join(root, "conformance"));
	walk(join(root, "fixtures"));
	return [...found].sort();
}

/** The published pattern, read out of the schema rather than from a copy. */
export function publishedPattern(root = ROOT) {
	const schema = JSON.parse(
		readFileSync(
			join(root, "schema", "semantic", "v1", "common.schema.json"),
			"utf8",
		),
	);
	return schema.$defs.sourceLocus.properties.path.pattern;
}

function encode(subject) {
	const units = [];
	for (let index = 0; index < subject.length; index += 1) {
		units.push(subject.charCodeAt(index).toString(16));
	}
	return units.join(" ");
}

const RUNNER_MAIN = `use std::io::{self, BufRead, Write};

use agent_ix_conformance::support::SourceLocusPath;

fn main() {
    let stdin = io::stdin();
    let stdout = io::stdout();
    let mut out = io::BufWriter::new(stdout.lock());
    for line in stdin.lock().lines() {
        let line = line.expect("the harness writes whole lines");
        let units: Vec<u16> = line
            .split_whitespace()
            .map(|unit| u16::from_str_radix(unit, 16).expect("a hexadecimal code unit"))
            .collect();
        let subject = String::from_utf16(&units).expect("the harness sends well-formed subjects");
        let published = SourceLocusPath::try_new(subject.clone()).is_ok();
        let intended = SourceLocusPath::try_new(subject)
            .map(|path| path.is_traversal_free())
            .unwrap_or(false);
        out.write_all(if published { b"1" } else { b"0" })
            .expect("stdout accepts a byte");
        out.write_all(if intended { b"1\\n" } else { b"0\\n" })
            .expect("stdout accepts a byte");
    }
}
`;

/**
 * The two perturbations FR-057-AC-12 requires the harness to fail on.
 *
 * They are applied to the *generated* `support.rs` after emission, so what is
 * measured is the harness's power to catch a wrong validator rather than the
 * emitter's power to write a right one. Each is a defect a reviewer might
 * plausibly wave through: the first treats U+000A as the only line terminator,
 * which is what most path code assumes; the second drops the drive-letter
 * guard, which looks like Windows-only dead weight.
 */
export const PERTURBATIONS = Object.freeze({
	"line-terminator": {
		reason: "treats U+000A as the only line terminator",
		find: ".position(|unit| LINE_TERMINATORS.contains(unit))",
		replace: ".position(|unit| *unit == 0x000a)",
	},
	"drive-letter": {
		reason: "drops the drive-letter rule",
		find: "if units.len() >= 2 && is_ascii_letter(units[0]) && units[1] == b':' as u16 {",
		replace: "if false {",
	},
});

/** Generates the crate and the runner, and builds them. Returns the binary path. */
export function buildRunner(perturbation) {
	mkdirSync(SCRATCH, { recursive: true });
	const sink = directorySink(SCRATCH);
	const bundle = JSON.parse(
		readFileSync(
			join(ROOT, "conformance", "bases", "minimal-1-1.json"),
			"utf8",
		),
	);
	const request = requestFor({ name: "contract", bundle });
	const manifest = generateRust(request, sink, {
		licenseText: readLicense(ROOT),
	});
	if (manifest.state !== "success") {
		throw new Error(
			`the harness could not generate its contract crate: state ${manifest.state}`,
		);
	}

	if (perturbation !== undefined) {
		const entry = PERTURBATIONS[perturbation];
		if (entry === undefined) {
			throw new Error(`unknown perturbation \`${perturbation}\``);
		}
		const path = join(SCRATCH, "contract", "src", "support.rs");
		const source = readFileSync(path, "utf8");
		if (!source.includes(entry.find)) {
			throw new Error(
				`the perturbation \`${perturbation}\` no longer matches the generated support module, so it would prove nothing`,
			);
		}
		writeFileSync(path, source.replace(entry.find, entry.replace), "utf8");
	}

	const runner = join(SCRATCH, "runner");
	mkdirSync(join(runner, "src"), { recursive: true });
	writeFileSync(
		join(runner, "Cargo.toml"),
		`[package]
name = "locus-path-harness"
version = "0.0.0"
edition = "2021"
publish = false

[workspace]

[dependencies]
agent-ix-conformance = { path = "../contract" }
`,
		"utf8",
	);
	writeFileSync(join(runner, "src", "main.rs"), RUNNER_MAIN, "utf8");

	const built = spawnSync(
		"cargo",
		[
			"build",
			"--offline",
			"--release",
			"--manifest-path",
			join(runner, "Cargo.toml"),
		],
		{
			encoding: "utf8",
			env: { ...process.env, CARGO_TARGET_DIR: join(SCRATCH, "build") },
		},
	);
	if (built.status !== 0) {
		throw new Error(
			`the harness could not build its runner, so it fails rather than passing vacuously:\n${built.stderr}`,
		);
	}
	return join(SCRATCH, "build", "release", "locus-path-harness");
}

/** Runs the whole harness. Returns a report; throws on a disagreement. */
export function run(perturbation) {
	const binary = buildRunner(perturbation);
	const pattern = publishedPattern();
	const engine = new RegExp(pattern);

	const subjects = [
		...exhaustive(PROBE_ALPHABET, 6),
		...corpusLocusPaths(),
		...seeded(EXTENDED_POOL, RANDOM_SUBJECTS, SEED),
	];

	const result = spawnSync(binary, {
		input: `${subjects.map(encode).join("\n")}\n`,
		encoding: "utf8",
		maxBuffer: 1024 * 1024 * 1024,
	});
	if (result.status !== 0) {
		throw new Error(`the harness runner failed: ${result.stderr}`);
	}
	const answers = result.stdout.split("\n");
	if (answers.length - 1 !== subjects.length) {
		throw new Error(
			`the runner answered ${answers.length - 1} of ${subjects.length} subjects`,
		);
	}

	let disagreements = 0;
	let firstDisagreement;
	let traversalDivergences = 0;
	for (let index = 0; index < subjects.length; index += 1) {
		const subject = subjects[index];
		const published = answers[index][0] === "1";
		const intended = answers[index][1] === "1";
		const expected = engine.test(subject);
		if (published !== expected) {
			disagreements += 1;
			if (firstDisagreement === undefined) {
				firstDisagreement = { subject: encode(subject), published, expected };
			}
		}
		if (published && !intended) traversalDivergences += 1;
	}

	if (disagreements > 0) {
		throw new Error(
			`the generated validator and the ECMA-262 engine disagree on ${disagreements} subjects; the first is the UTF-16 sequence [${firstDisagreement.subject}], which the validator ${firstDisagreement.published ? "accepts" : "rejects"} and the engine ${firstDisagreement.expected ? "accepts" : "rejects"}`,
		);
	}

	return {
		pattern,
		compared: subjects.length,
		exhaustive: 1111111,
		corpus: corpusLocusPaths().length,
		seeded: RANDOM_SUBJECTS,
		disagreements,
		traversalDivergences,
	};
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const flag = process.argv.find((argument) =>
		argument.startsWith("--perturb="),
	);
	const perturbation =
		flag === undefined ? undefined : flag.slice("--perturb=".length);
	if (perturbation === undefined) {
		process.stdout.write(`${JSON.stringify(run(), null, "\t")}\n`);
	} else {
		// A perturbed validator must make the harness fail, naming the input. A
		// perturbation the harness passes is a harness that proves nothing, so
		// this exits non-zero on a *pass*.
		try {
			run(perturbation);
			process.stderr.write(
				`the harness passed with a validator that ${PERTURBATIONS[perturbation].reason}; it therefore proves nothing\n`,
			);
			process.exitCode = 1;
		} catch (error) {
			process.stdout.write(
				`perturbation \`${perturbation}\` was caught: ${error.message}\n`,
			);
		}
	}
}
