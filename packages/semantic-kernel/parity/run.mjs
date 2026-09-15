/**
 * The FR-090 parity run.
 *
 * Four emitted kernel packages decide one golden corpus of kernel instance
 * documents; this module reports whether they decided it the same way, and
 * writes `agreement.json` and `divergences.json`. It writes nothing under
 * `conformance/` (FR-090-CON-2) and imports nothing there but
 * `conformance/oracle/index.mjs` (FR-090-CON-3).
 *
 * It defines no verdict, no canonicalization and no comparison of its own
 * (FR-090-AC-9). Every answer — the contract's included — is lifted into the
 * corpus verdict shape by `project.mjs` and normalized by `substantive`
 * imported from the oracle surface, and two answers agree when their
 * `substantive` projections are the same text. The comparison form is
 * `agent-ix-conformance-jcs-v1`, the corpus's own; it is not, and does not
 * claim to be, `RFC8785-JCS-with-identity-sorted-sets-v1`, which
 * `conformance/contract-gaps.json` GAP-004 records as named but undefined.
 *
 * No step here runs `cargo publish`, `npm publish`, a PyPI upload or a tag
 * push, and none passes `--registry`, `--index` or a publish `--dry-run`
 * (FR-090-CON-8). The recorded command list is written to
 * `publication-gate.json`.
 */

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { substantive } from "../../../conformance/oracle/index.mjs";
import { decide as decideJsonSchema } from "./emitters/json-schema.mjs";
import { decide as decideTypeScript } from "./emitters/typescript.mjs";
import { loadGolden, PACKAGES, REPO_ROOT } from "./golden.mjs";
import { expectedAnswer, PARITY_CODES, project } from "./project.mjs";

const HERE = import.meta.dirname;
const RUST_TARGET_DIR = resolve(REPO_ROOT, "target", "parity-emitter");
const RUST_MANIFEST = resolve(
	REPO_ROOT,
	"packages/semantic-kernel/parity/emitters/rust/Cargo.toml",
);

/**
 * The exact commands this run starts, read from `publication-gate.json` rather
 * than repeated here. The record and the command list are one thing: a record
 * maintained beside the commands it claims to record is a record of what
 * someone remembered to update.
 */
export const COMMANDS = JSON.parse(
	readFileSync(resolve(HERE, "publication-gate.json"), "utf8"),
).recordedCommands.filter((entry) => !entry.inProcess);

function subprocess(entry) {
	// The recorded arguments are repository-relative so that the record reads
	// the same on every machine; the run resolves them against this checkout.
	const args = entry.args.map((argument) =>
		argument === "packages/semantic-kernel/parity/emitters/rust/Cargo.toml"
			? RUST_MANIFEST
			: argument === "target/parity-emitter"
				? RUST_TARGET_DIR
				: argument,
	);
	return JSON.parse(
		execFileSync(entry.command, args, {
			cwd: REPO_ROOT,
			encoding: "utf8",
			maxBuffer: 64 * 1024 * 1024,
			stdio: ["ignore", "pipe", "inherit"],
		}),
	);
}

const byPackage = (name) => {
	const entry = COMMANDS.find((candidate) => candidate.package === name);
	if (entry === undefined) {
		throw new Error(`publication-gate.json records no command for ${name}`);
	}
	return entry;
};

/** Every package's answers, by package name, each keyed by document id. */
export function collect(golden = loadGolden()) {
	const byId = (rows) => new Map(rows.map((row) => [row.id, row]));
	return {
		"json-schema": byId(decideJsonSchema(golden)),
		typescript: byId(decideTypeScript(golden)),
		python: byId(subprocess(byPackage("python"))),
		rust: byId(subprocess(byPackage("rust"))),
	};
}

const text = (value) => JSON.stringify(value);

const NAMES = "serialized-member-names";
const PRESENCE = "presence-versus-null";
const DEFAULTS = "defaults";
const UNKNOWN = "unknown-member-states";
const RELATION = "relation-semantics";
const TRIP = "round-trip";
const DECISION = "decision";

/**
 * Names the property two normalized verdicts differ on.
 *
 * This labels a disagreement `substantive` already found; it does not decide
 * whether there is one.
 */
export function propertyOf(document, wanted, got) {
	if (wanted.resultState !== got.resultState) return DECISION;
	const index = (rows) =>
		new Map(rows.map((row) => [`${row.pointer}|${row.code}`, row]));
	const a = index(wanted.diagnostics);
	const b = index(got.diagnostics);
	const fate = (rows) =>
		rows.find((row) => row.code === PARITY_CODES.unknown)?.locus?.jsonText;
	if (fate(wanted.diagnostics) !== fate(got.diagnostics)) return UNKNOWN;
	const relation = document.declaration === "RelationDecl";
	const pointers = (rows) =>
		rows
			.filter((row) => row.code !== PARITY_CODES.unknown)
			.map((row) => row.pointer);
	const codes = (rows) =>
		new Map(
			rows
				.filter((row) => row.code !== PARITY_CODES.unknown)
				.map((row) => [row.pointer, row.code]),
		);
	if (text(pointers(wanted.diagnostics)) !== text(pointers(got.diagnostics))) {
		return relation ? RELATION : NAMES;
	}
	for (const [pointer, code] of codes(wanted.diagnostics)) {
		const other = codes(got.diagnostics).get(pointer);
		if (other === code) continue;
		if (code === PARITY_CODES.nul || other === PARITY_CODES.nul)
			return PRESENCE;
		if (code === PARITY_CODES.dflt || other === PARITY_CODES.dflt)
			return DEFAULTS;
	}
	for (const [key, row] of a) {
		if (text(row) !== text(b.get(key))) return relation ? RELATION : TRIP;
	}
	return relation ? RELATION : TRIP;
}

/** The whole run: agreement rows, divergence rows and the counted totals. */
export function measure(golden = loadGolden(), answers = collect(golden)) {
	const rows = [];
	const divergences = [];
	for (const document of golden) {
		const contract = substantive(project(expectedAnswer(document), document));
		const decisions = {};
		let decided = 0;
		for (const name of PACKAGES) {
			const answer = answers[name].get(document.id);
			const undecided =
				answer === undefined || answer.resultState === "undecided";
			if (!undecided) decided += 1;
			const observed = substantive(project(answer, document));
			const agrees = !undecided && text(observed) === text(contract);
			decisions[name] = {
				resultState: undecided ? "undecided" : observed.resultState,
				agreesWithContract: agrees,
				unknownFate:
					observed.diagnostics.find(
						(entry) => entry.code === PARITY_CODES.unknown,
					)?.locus?.jsonText ?? null,
			};
			if (!agrees) {
				divergences.push({
					document: document.id,
					declaration: document.declaration,
					class: document.class,
					property: undecided
						? DECISION
						: propertyOf(document, contract, observed),
					decisions: {
						contract: contract.resultState,
						[name]: undecided ? "undecided" : observed.resultState,
					},
					wrongSide: name,
					adjudicatedBy: null,
				});
			}
		}
		rows.push({
			document: document.id,
			declaration: document.declaration,
			class: document.class,
			properties: document.properties,
			decidedBy: decided,
			agreement: PACKAGES.every((name) => decisions[name].agreesWithContract),
			decisions,
		});
	}
	return { rows, divergences };
}

const REGISTER = resolve(HERE, "divergences.json");

/** The authored adjudication of the divergence register, preserved across runs. */
function adjudication() {
	return JSON.parse(readFileSync(REGISTER, "utf8")).adjudication ?? [];
}

/**
 * Writes a report, or — in check mode — compares it against the committed one
 * and fails naming the file rather than writing it.
 */
/**
 * Renders a report the way the repository's formatter would, so that a
 * committed report and a fresh one are the same bytes. `biome format` is
 * deterministic, reads no clock and opens no socket; it is a renderer here,
 * not a check.
 */
function render(value) {
	return execFileSync(
		"pnpm",
		["exec", "biome", "format", "--stdin-file-path=report.json"],
		{
			cwd: REPO_ROOT,
			input: `${JSON.stringify(value, null, "\t")}\n`,
			encoding: "utf8",
			maxBuffer: 64 * 1024 * 1024,
			stdio: ["pipe", "pipe", "inherit"],
		},
	);
}

function write(path, value, check) {
	const target = resolve(HERE, path);
	const text = render(value);
	if (!check) {
		writeFileSync(target, text, "utf8");
		return;
	}
	const committed = readFileSync(target, "utf8");
	if (committed !== text) {
		throw new Error(`${path} is stale: a fresh run would change it`);
	}
}

/** Runs every emitter and writes the two reports. */
export function run(check = false) {
	const golden = loadGolden();
	const { rows, divergences } = measure(golden);
	const owners = adjudication();
	const reproduced = new Set();
	const owned = divergences.map((row) => {
		const entry = owners.find(
			(candidate) =>
				candidate.wrongSide === row.wrongSide &&
				candidate.property === row.property &&
				candidate.documents.includes(row.document),
		);
		if (entry === undefined) return row;
		reproduced.add(entry.cause);
		return { ...row, adjudicatedBy: entry.issue };
	});
	const unreproduced = owners
		.filter((entry) => !reproduced.has(entry.cause))
		.map((entry) => entry.cause);
	if (unreproduced.length > 0) {
		throw new Error(
			`adjudication entries the run does not reproduce: ${unreproduced.join(", ")}`,
		);
	}
	const byProperty = {};
	for (const row of rows) {
		for (const property of row.properties) {
			byProperty[property] ??= { documents: 0, agreeing: 0 };
			byProperty[property].documents += 1;
			if (row.agreement) byProperty[property].agreeing += 1;
		}
	}
	write(
		"agreement.json",
		{
			$comment: [
				"FR-090. Written by packages/semantic-kernel/parity/run.mjs.",
				"Comparison form: agent-ix-conformance-jcs-v1, through substantive()",
				"imported from conformance/oracle/index.mjs. Not RFC8785-JCS-with-",
				"identity-sorted-sets-v1, which conformance/contract-gaps.json GAP-004",
				"records as named but undefined.",
				"An undecided answer is counted unmet, never as a pass.",
			],
			packages: PACKAGES,
			documents: rows.length,
			agreeing: rows.filter((row) => row.agreement).length,
			byProperty,
			rows,
		},
		check,
	);
	const register = JSON.parse(readFileSync(REGISTER, "utf8"));
	write("divergences.json", { ...register, rows: owned }, check);
	return { rows, divergences: owned };
}

if (import.meta.filename === process.argv[1]) {
	const check = process.argv.includes("--check");
	const { rows, divergences } = run(check);
	const unowned = divergences.filter((row) => row.adjudicatedBy === null);
	process.stdout.write(
		`${rows.filter((row) => row.agreement).length}/${rows.length} documents agree; ` +
			`${divergences.length} divergence rows, ${unowned.length} unadjudicated\n`,
	);
	if (unowned.length > 0) {
		for (const row of unowned) {
			process.stderr.write(
				`unadjudicated divergence: ${row.document} ${row.property} ` +
					`wrong side ${row.wrongSide}\n`,
			);
		}
		process.stderr.write(
			"a divergence row without an adjudicating owner is a suppression " +
				"wearing a record's clothes; file the issue and adjudicate it\n",
		);
		process.exitCode = 1;
	}
}
