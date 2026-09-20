/**
 * The constraint applicability table (FR-029, FR-050), and the FR-094 edge
 * vocabulary (H4 of the FCD #199/#200 review).
 *
 * One table, two readers. The frontend consults it to refuse a constraint at the
 * decorator that declared it, and the IR reader consults it to refuse a document
 * that carries one anyway. Keeping it in one module is deliberate: an
 * applicability rule that the emitter and the reader disagree about is a rule
 * that lets an invalid document through one door and stops it at the other.
 */

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPOSITORY_ROOT = resolve(
	dirname(fileURLToPath(import.meta.url)),
	"../../..",
);

const EDGE_VOCABULARY_MANIFEST_PATH = resolve(
	REPOSITORY_ROOT,
	"crates/extraction-frontend/fixtures/modules/edge-vocabulary/manifest.yaml",
);

/**
 * verb -> `{ category, inverse }` for every `edge_types` entry of
 * `crates/extraction-frontend/fixtures/modules/edge-vocabulary/manifest.yaml`,
 * the one place both frontends draw the FR-094 edge vocabulary from (H4 of
 * the FCD #199/#200 review). The extraction-frontend reads a project's
 * configured module set at runtime through `bundle.registry().edge_types()`
 * (`crates/extraction-frontend/src/edges.rs`); this compiler has no such
 * per-project module system, so it reads this file directly instead of
 * hand-typing a second copy of the table.
 *
 * This is not a general YAML parser: `edge_types`' rows are one-line flow
 * mappings (`verb: { description: "...", category: cat[, inverse: inv] }`,
 * `manifest.yaml`'s own committed shape, every row, checked by TC-1816), and
 * this reads exactly that shape — nothing here can add a new npm dependency
 * without moving `pnpm-lock.yaml`, a path NFR-019/NFR-021's own gate closes.
 */
function parseEdgeVocabulary(source) {
	const lines = source.split("\n");
	const start = lines.findIndex((line) => line.trim() === "edge_types:");
	if (start === -1) {
		throw new Error(
			`${EDGE_VOCABULARY_MANIFEST_PATH}: no top-level "edge_types:" key`,
		);
	}
	const rowPattern = /^\s\s([a-z][a-z0-9_]*):\s*\{(.*)\}\s*$/;
	const fieldPattern = /(category|inverse):\s*([a-z][a-z0-9_]*)/g;
	const vocabulary = {};
	for (const line of lines.slice(start + 1)) {
		if (line.trim() === "" || line.trim().startsWith("#")) continue;
		const row = rowPattern.exec(line);
		if (!row) break; // a line at column 0, or with no braces, ends the block
		const [, verb, body] = row;
		const fields = {};
		for (const field of body.matchAll(fieldPattern)) fields[field[1]] = field[2];
		if (!fields.category) {
			throw new Error(
				`${EDGE_VOCABULARY_MANIFEST_PATH}: edge_types.${verb} declares no category`,
			);
		}
		vocabulary[verb] = Object.freeze({
			category: fields.category,
			inverse: fields.inverse,
		});
	}
	return vocabulary;
}

/**
 * verb -> `{ category, inverse }`, `inverse` `undefined` when the manifest
 * declares none for that verb (FR-094-CON-2: `composite` is exactly whether
 * `inverse` is `"part_of"`; the target end's `role` is exactly `inverse`,
 * omitted when `inverse` is `undefined`).
 */
export const EDGE_VOCABULARY = Object.freeze(
	parseEdgeVocabulary(readFileSync(EDGE_VOCABULARY_MANIFEST_PATH, "utf8")),
);

/** The registry `inverse` label that makes a verb composite (FR-094
 * "Relationships"), equal to the extraction-frontend's `edges::PART_OF`. */
export const PART_OF = "part_of";

/** Keyword to the resolved subjects it may apply to — a scalar name, or a kind. */
export const KEYWORD_APPLICABILITY = Object.freeze({
	min: ["integer", "number", "date", "datetime", "duration"],
	max: ["integer", "number", "date", "datetime", "duration"],
	exclusiveMin: ["integer", "number", "date", "datetime", "duration"],
	exclusiveMax: ["integer", "number", "date", "datetime", "duration"],
	minLength: ["string", "bytes"],
	maxLength: ["string", "bytes"],
	pattern: ["string"],
	enumValues: [
		"boolean",
		"integer",
		"number",
		"string",
		"bytes",
		"date",
		"datetime",
		"duration",
		"uuid",
	],
	nonEmpty: ["string", "bytes", "sequence", "map"],
	unique: ["sequence"],
	format: ["string"],
});

/** The eleven keywords FR-029 closes. */
export const CONSTRAINT_KEYWORDS = Object.freeze(
	Object.keys(KEYWORD_APPLICABILITY),
);

/** The seven FR-040 edge categories, equal to the IR `relationship.category` set. */
export const EDGE_CATEGORIES = Object.freeze([
	"structural",
	"behavioral",
	"dataflow",
	"dependency",
	"realization",
	"governance",
	"traceability",
]);

/** The core clause languages; anything else must be `<ns>:<name>`. */
export const CORE_CLAUSE_LANGUAGES = Object.freeze([
	"quire",
	"ocl",
	"sysml",
	"fretish",
]);

export const NAMESPACED_LANGUAGE =
	/^[a-z0-9][a-z0-9.-]*:[A-Za-z0-9][A-Za-z0-9._-]*$/;

/**
 * True when `keyword` may apply to a subject whose resolved structural kind is
 * `kind` and, for a scalar, whose scalar name is `scalar`.
 */
export function applies(keyword, kind, scalar) {
	if (!isKeyword(keyword)) return false;
	const allowed = KEYWORD_APPLICABILITY[keyword];
	return allowed.includes(kind === "scalar" ? String(scalar) : kind);
}

/**
 * True when `keyword` is one of the eleven.
 *
 * `keyword in KEYWORD_APPLICABILITY` would say yes to `constructor`,
 * `toString`, and every other `Object.prototype` member, and the caller would
 * then index the object and get a function. An input that reaches a `TypeError`
 * is an input that crashed the compiler, which FR-045-CON-4 forbids outright.
 */
export function isKeyword(keyword) {
	return Object.hasOwn(KEYWORD_APPLICABILITY, String(keyword));
}
