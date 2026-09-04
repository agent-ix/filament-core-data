/**
 * The constraint applicability table (FR-029, FR-050).
 *
 * One table, two readers. The frontend consults it to refuse a constraint at the
 * decorator that declared it, and the IR reader consults it to refuse a document
 * that carries one anyway. Keeping it in one module is deliberate: an
 * applicability rule that the emitter and the reader disagree about is a rule
 * that lets an invalid document through one door and stops it at the other.
 */

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
export const CORE_CLAUSE_LANGUAGES = Object.freeze(["ocl", "sysml", "fretish"]);

export const NAMESPACED_LANGUAGE =
	/^[a-z0-9][a-z0-9.-]*:[A-Za-z0-9][A-Za-z0-9._-]*$/;

/**
 * True when `keyword` may apply to a subject whose resolved structural kind is
 * `kind` and, for a scalar, whose scalar name is `scalar`.
 */
export function applies(keyword, kind, scalar) {
	const allowed = KEYWORD_APPLICABILITY[keyword];
	if (!allowed) return false;
	return allowed.includes(kind === "scalar" ? String(scalar) : kind);
}
