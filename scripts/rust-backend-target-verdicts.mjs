#!/usr/bin/env node
/**
 * The published target-verdict harness (FR-059-AC-10).
 *
 * `fixtures/semantic/v1/target-verdicts.json` publishes five cases with a
 * verdict per target, and its `rust` column is a claim about *this* backend's
 * output. Nothing in the repository read it until now, so the claim was
 * unmeasured. This harness decides all five through a generated crate and
 * compares.
 *
 * The decision is the generated crate's own. `serde_json` appears in the runner
 * — never in the generated crate, whose only dependency stays `serde` — and it
 * supplies a deserializer and nothing else, which is exactly what a consumer
 * does. The accept/reject verdict comes from the generated `Deserialize`, the
 * generated `try_new`, and the generated `decide_extension`.
 *
 * Two things the fixture does not say, declared here rather than guessed:
 *
 * - It binds no case to a type. The first three cases are values of a contract
 *   type, and which type is left to the reader, so the binding below is
 *   declared: `required-non-null-present` and `missing-required-id` are values
 *   of a record with a required `id` and an optional nullable `note`;
 *   `unknown-closed-variant` is a value of a record with one required member of
 *   a closed `enum`. Deciding the third against the first record would reject it
 *   for the wrong reason — a missing `id` rather than an unrecognised variant —
 *   and a harness that gets the right verdict for the wrong reason measures
 *   nothing.
 * - Its `diagnosticCode` values are in an `agent-ix.conformance.*` namespace
 *   that *neither* of this ticket's two closed sets carries. They are not minted
 *   here. The comparison is on the accept/reject verdict alone, and the
 *   namespace is reported rather than reconciled.
 *
 * `fixtures/**` is read-only and this harness only reads it.
 */

import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { requestFor } from "../src/compiler/backends/rust-serde/cli.mjs";
import {
	directorySink,
	generateRust,
	readLicense,
} from "../src/compiler/backends/rust-serde/index.mjs";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const SCRATCH = join(
	ROOT,
	"node_modules",
	".cache",
	"rust-target",
	"verdict-harness",
);

/** The exact `serde_json` the runner deserializes with; never the crate's. */
const SERDE_JSON_VERSION = "1.0.151";

/**
 * Which generated type each of the fixture's contract-value cases is a value
 * of. Declared, because the fixture binds none.
 */
export const CASE_TYPES = Object.freeze({
	"required-non-null-present": "Artifact",
	"missing-required-id": "Artifact",
	"unknown-closed-variant": "StatusHolder",
	"unknown-preservable-extension": "Extension",
	"unknown-required-capability": "Extension",
});

const P = "ix://agent-ix/verdicts";

const locus = (path) => ({
	source: {
		sourceIdentity: "ix://agent-ix/filament-core-data/source/typespec",
		path,
		startLine: 1,
		startColumn: 1,
	},
});

const field = (owner, name, ref, lower, nullable) => ({
	identity: `${P}/field/${owner}-${name}`,
	name,
	typeRef: ref,
	presence: lower === 0 ? "optional" : "required",
	nullable,
	defaultKind: "none",
	origin: locus("model/verdicts.tsp"),
	multiplicity: { lower, upper: 1 },
});

/**
 * The contract the fixture's first three cases are values of.
 *
 * It is built here rather than taken from a corpus base because no base carries
 * the shape the fixture's values imply, and inventing the shape *in the corpus*
 * would be writing to `conformance/`, which this work does not do.
 */
export const VERDICT_IR = Object.freeze({
	contractVersion: "1.1.0",
	source: {
		identity: "ix://agent-ix/filament-core-data/source/typespec",
		version: "1.0.0",
		dialect: "typespec",
		digest: `sha256:${"0".repeat(64)}`,
	},
	package: {
		identity: "agent-ix/verdicts",
		version: "1.0.0",
		manifestDigest: `sha256:${"1".repeat(64)}`,
		mappingVersions: ["1.0.0"],
		profileVersions: ["1.0.0"],
		lockDigest: `sha256:${"2".repeat(64)}`,
	},
	types: [
		{
			identity: `${P}/type/Text`,
			displayName: "Text",
			kind: "scalar",
			roles: [],
			origin: locus("model/verdicts.tsp"),
			constraints: [],
			extensions: [],
			unknownPolicy: "reject",
			scalar: "string",
		},
		{
			identity: `${P}/type/Status`,
			displayName: "Status",
			kind: "enum",
			roles: [],
			origin: locus("model/verdicts.tsp"),
			constraints: [],
			extensions: [],
			// `reject`, so the variant set is closed and an unrecognised tag is a
			// deserialization error. That is what the fixture's third case asserts.
			unknownPolicy: "reject",
			variants: [
				{
					identity: `${P}/variant/status-draft`,
					name: "draft",
					origin: locus("model/verdicts.tsp"),
				},
				{
					identity: `${P}/variant/status-final`,
					name: "final",
					origin: locus("model/verdicts.tsp"),
				},
			],
		},
		{
			identity: `${P}/type/Artifact`,
			displayName: "Artifact",
			kind: "record",
			roles: [],
			origin: locus("model/verdicts.tsp"),
			constraints: [],
			extensions: [],
			unknownPolicy: "reject",
			fields: [
				field("artifact", "id", `${P}/type/Text`, 1, false),
				field("artifact", "note", `${P}/type/Text`, 0, true),
			],
			relationships: [],
			operations: [],
			clauses: [],
		},
		{
			identity: `${P}/type/StatusHolder`,
			displayName: "StatusHolder",
			kind: "record",
			roles: [],
			origin: locus("model/verdicts.tsp"),
			constraints: [],
			extensions: [],
			unknownPolicy: "reject",
			fields: [field("holder", "status", `${P}/type/Status`, 1, false)],
			relationships: [],
			operations: [],
			clauses: [],
		},
	],
	occurrences: [],
	extensions: [],
});

/** The published fixture. Read, never written. */
export function targetVerdicts(root = ROOT) {
	return JSON.parse(
		readFileSync(
			join(root, "fixtures", "semantic", "v1", "target-verdicts.json"),
			"utf8",
		),
	);
}

const RUNNER_MAIN = `use std::io::{self, Read};

use agent_ix_verdicts::support::Extension;
use agent_ix_verdicts::{decide_extension, Artifact, StatusHolder};

/// Decides one case and prints \`accept\` or \`reject <reason>\`.
fn decide(id: &str, value: &str) -> String {
    match id {
        "Artifact" => match serde_json::from_str::<Artifact>(value) {
            Ok(_) => "accept".to_owned(),
            Err(error) => format!("reject {error}"),
        },
        "StatusHolder" => match serde_json::from_str::<StatusHolder>(value) {
            Ok(_) => "accept".to_owned(),
            Err(error) => format!("reject {error}"),
        },
        "Extension" => match serde_json::from_str::<Extension>(value) {
            Ok(extension) => {
                let diagnostics = decide_extension(&extension);
                match diagnostics.iter().find(|entry| entry.blocking()) {
                    None => "accept".to_owned(),
                    Some(entry) => format!("reject {} {}", entry.code(), entry.message()),
                }
            }
            Err(error) => format!("reject {error}"),
        },
        other => format!("reject the harness bound no type named {other}"),
    }
}

fn main() {
    let mut input = String::new();
    io::stdin()
        .read_to_string(&mut input)
        .expect("the harness writes whole input");
    for line in input.lines() {
        let Some((kind, value)) = line.split_once('\\t') else {
            continue;
        };
        println!("{}", decide(kind, value));
    }
}
`;

/** Generates the contract crate and the runner, and builds them. */
export function buildRunner() {
	mkdirSync(SCRATCH, { recursive: true });
	const sink = directorySink(SCRATCH);
	const request = requestFor({ name: "contract", bundle: { ir: VERDICT_IR } });
	const manifest = generateRust(request, sink, {
		licenseText: readLicense(ROOT),
	});
	if (manifest.state !== "success") {
		throw new Error(
			`the harness could not generate its contract crate: state ${manifest.state}, ${manifest.diagnostics.map((entry) => entry.message).join("; ")}`,
		);
	}

	const runner = join(SCRATCH, "runner");
	mkdirSync(join(runner, "src"), { recursive: true });
	writeFileSync(
		join(runner, "Cargo.toml"),
		`# The runner, not the generated crate, is what depends on \`serde_json\`.
# The generated crate's only dependency stays \`serde\`, and the deserializer a
# consumer would bring is brought here instead.

[package]
name = "target-verdict-harness"
version = "0.0.0"
edition = "2021"
publish = false

[workspace]

[dependencies]
agent-ix-verdicts = { path = "../contract" }
serde_json = "=${SERDE_JSON_VERSION}"
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
	return join(SCRATCH, "build", "release", "target-verdict-harness");
}

/** Runs the five cases. Returns a report; throws on a disagreement. */
export function run() {
	const binary = buildRunner();
	const fixture = targetVerdicts();
	const cases = fixture.cases;

	const input = cases
		.map((entry) => `${CASE_TYPES[entry.id]}\t${JSON.stringify(entry.value)}`)
		.join("\n");
	const result = spawnSync(binary, { input: `${input}\n`, encoding: "utf8" });
	if (result.status !== 0) {
		throw new Error(`the harness runner failed: ${result.stderr}`);
	}
	const answers = result.stdout.split("\n").filter((line) => line.length > 0);
	if (answers.length !== cases.length) {
		throw new Error(
			`the runner answered ${answers.length} of ${cases.length} cases`,
		);
	}

	const measured = [];
	const disagreements = [];
	for (let index = 0; index < cases.length; index += 1) {
		const entry = cases[index];
		const expected = entry.verdicts.rust;
		const answer = answers[index];
		const verdict = answer.startsWith("accept") ? "accept" : "reject";
		measured.push({
			id: entry.id,
			boundTo: CASE_TYPES[entry.id],
			expected,
			measured: verdict,
			// The fixture's own code is reported, never compared: its namespace is
			// carried by neither of this ticket's two closed sets.
			fixtureDiagnosticCode: entry.diagnosticCode ?? null,
			detail: answer.slice(verdict.length).trim(),
		});
		if (verdict !== expected) disagreements.push(entry.id);
	}

	if (disagreements.length > 0) {
		throw new Error(
			`the generated crate decides ${disagreements.join(", ")} against the published rust verdict`,
		);
	}
	return {
		fixture: "fixtures/semantic/v1/target-verdicts.json",
		cases: measured,
		disagreements: 0,
		unregisteredFixtureNamespace: [
			...new Set(
				cases
					.map((entry) => entry.diagnosticCode)
					.filter((code) => typeof code === "string")
					.map((code) => code.split(".").slice(0, 2).join(".")),
			),
		],
	};
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	process.stdout.write(`${JSON.stringify(run(), null, "\t")}\n`);
}
