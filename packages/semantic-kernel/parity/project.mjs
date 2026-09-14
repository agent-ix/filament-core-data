/**
 * Lifts one emitter answer into the conformance corpus's verdict shape.
 *
 * This is a projection, not a judgement. It defines no verdict, no
 * canonicalization and no comparison (FR-090-AC-9): it restates a decision
 * already made by a package's own decision path in the shape
 * `substantive` — imported from `conformance/oracle/index.mjs`, the corpus's
 * one declared import surface — accepts, so that `substantive` is the single
 * normalizer on both sides of every agreement question this requirement asks.
 *
 * A wire document is projected to one diagnostic per leaf, addressed by its
 * RFC 6901 pointer. The five properties FR-090 names all fall out of that one
 * stream:
 *
 * - serialized member names are the pointers;
 * - presence versus null is `WIRE_NULL` against an absent pointer;
 * - a materialized default is a pointer the input did not carry, reported as
 *   `WIRE_DEFAULT`;
 * - the unknown-member state is the emitter's reported fate;
 * - relation semantics are the pointers and leaves of a `RelationDecl`.
 *
 * `locus` carries the leaf's JSON text. `substantive` projects exactly five
 * members of a diagnostic — pointer, code, severity, owner, blocking, locus —
 * and `locus` is the only one that carries structured data, so a wire *value*
 * disagreement has to travel there to be a `substantive` disagreement rather
 * than a disagreement this requirement invented a second comparison to see.
 */

const OWNER = "ix://agent-ix/filament-core-data/requirement/FR-090";

const CODES = {
	refused: "agent-ix.parity.REFUSED",
	member: "agent-ix.parity.WIRE_MEMBER",
	nul: "agent-ix.parity.WIRE_NULL",
	dflt: "agent-ix.parity.WIRE_DEFAULT",
	unknown: "agent-ix.parity.UNKNOWN_MEMBER_FATE",
	undecided: "agent-ix.parity.UNDECIDED",
};

/** Every code this projection can emit, as declared data. */
export const PARITY_CODES = CODES;

const escapeToken = (token) =>
	token.replaceAll("~", "~0").replaceAll("/", "~1");

function walk(value, pointer, present, out) {
	if (value === null) {
		out.push([pointer, CODES.nul, "null"]);
		return;
	}
	if (Array.isArray(value)) {
		if (value.length === 0) out.push([pointer, CODES.member, "[]"]);
		for (const [index, item] of value.entries()) {
			walk(item, `${pointer}/${index}`, present, out);
		}
		return;
	}
	if (typeof value === "object") {
		const keys = Object.keys(value).sort();
		if (keys.length === 0) out.push([pointer, CODES.member, "{}"]);
		for (const key of keys) {
			walk(value[key], `${pointer}/${escapeToken(key)}`, present, out);
		}
		return;
	}
	const code = present.has(pointer) ? CODES.member : CODES.dflt;
	out.push([pointer, code, JSON.stringify(value)]);
}

function pointers(value, pointer, out) {
	if (value === null || typeof value !== "object") {
		out.add(pointer);
		return;
	}
	if (Array.isArray(value)) {
		for (const [index, item] of value.entries()) {
			pointers(item, `${pointer}/${index}`, out);
		}
		return;
	}
	for (const key of Object.keys(value)) {
		pointers(value[key], `${pointer}/${escapeToken(key)}`, out);
	}
}

const row = (pointer, code, locus) => ({
	pointer,
	diagnostic: {
		code,
		severity: "info",
		message: "one member of the serialized kernel document",
		owner: OWNER,
		blocking: false,
		causes: [],
		related: [],
		locus: locus === null ? null : { jsonText: locus },
	},
});

/**
 * Projects one answer — `{ resultState, wire, unknownFate }` — against the
 * golden document's own instance, which supplies the set of pointers the input
 * carried so a materialized default is distinguishable from a written member.
 */
export function project(answer, goldenDocument) {
	if (answer === undefined || answer.resultState === undefined) {
		return {
			resultState: "invalid",
			diagnostics: [row("", CODES.undecided, null)],
		};
	}
	if (answer.resultState !== "success") {
		return {
			resultState: "invalid",
			diagnostics: [
				row("", CODES.refused, null),
				row("", CODES.unknown, answer.unknownFate ?? "not-reported"),
			],
		};
	}
	const present = new Set();
	pointers(goldenDocument.instance, "", present);
	const leaves = [];
	walk(answer.wire, "", present, leaves);
	const diagnostics = leaves.map(([pointer, code, locus]) =>
		row(pointer, code, locus),
	);
	diagnostics.push(
		row("", CODES.unknown, answer.unknownFate ?? "not-reported"),
	);
	return { resultState: "success", diagnostics };
}

/**
 * The unknown-member fate the contract states for one golden document.
 *
 * Every kernel object is sealed with `unevaluatedProperties: { not: {} }`, so
 * `reject` is the only policy the thirty published documents declare. A
 * document that does not carry an undeclared member does not exercise the
 * policy at all, and reporting it as agreeing would be reporting an
 * unmeasured property as measured.
 */
export function unknownFateOf(goldenDocument) {
	if (goldenDocument.unknownPolicy !== "reject") return "not-applicable";
	if (!goldenDocument.properties.includes("unknown-member-states")) {
		return "not-exercised";
	}
	return "rejected";
}

/** The contract's own answer for one golden document, in emitter answer shape. */
export function expectedAnswer(goldenDocument) {
	const expected = goldenDocument.expected;
	if (expected.resultState !== "success") {
		return {
			resultState: "invalid",
			unknownFate: unknownFateOf(goldenDocument),
		};
	}
	return {
		resultState: "success",
		wire: expected.wire,
		unknownFate: unknownFateOf(goldenDocument),
	};
}
