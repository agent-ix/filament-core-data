/**
 * The TypeScript backend's canonical byte form for a semantic IR document
 * (FR-069).
 *
 * This is a second implementation beside `src/compiler/ir/normalize.mjs` and
 * `src/compiler/packages/canonical.mjs`, deliberately. It imports neither, and
 * it imports nothing under `conformance/`. A backend that asks the compiler
 * whether the compiler's output canonicalizes correctly produces agreement and
 * no evidence, and an implementation copied from the oracle it is judged by is
 * not a second implementation at all. It is written from RFC 8785 and from the
 * declared set-path list below.
 *
 * There are two canonical forms here, not one, because the published record
 * names two and they are different algorithms:
 *
 * - the **unextended** RFC 8785 form, every array left in document order. This
 *   is the corpus's `agent-ix-conformance-jcs-v1`, and it is what an adapter
 *   answer's `normalized` member carries.
 * - the **extended** form, which sorts the members of the thirteen container
 *   paths below by their `identity`. This is the
 *   `RFC8785-JCS-with-identity-sorted-sets-v1` that
 *   `docs/semantic-data-system/contracts-v1.md` names for the v1 fingerprint,
 *   and it is what makes two documents differing only in set order carry one
 *   fingerprint.
 *
 * The first run of this module against the corpus matched 1 case of 111,
 * because the requirement described the extended form and the corpus compares
 * the unextended one. Separating them takes the same run to 111 of 111. Which
 * form a normalized document carries is stated in no contract document, filed
 * as `agent-ix/filament-core-data#67` beside GAP-004.
 *
 * GAP-004 itself — the named algorithm is defined nowhere — is recorded in
 * `conformance/contract-gaps.json`. Its declared owning issue
 * `agent-ix/filament-core-data#9` is closed, and
 * `agent-ix/filament-core-data#59` carries the ownership question. This is the
 * highest-volatility reading the backend makes: `normalized` is compared byte
 * for byte on every corpus case, and the fingerprint stamped into every
 * generated file's banner derives from it.
 */

import { createHash } from "node:crypto";

/**
 * The container paths whose members are a *set* — ordered by their members'
 * identity rather than by position — declared once, as data, so that a
 * fourteenth path is an edit a test can see rather than a scattered change
 * (FR-069-CON-2). `*` matches one path segment. This list applies to the
 * fingerprint form only; the corpus-comparable form leaves arrays alone.
 */
export const IDENTITY_SET_PATHS = Object.freeze([
	"/types",
	"/types/*/fields",
	"/types/*/variants",
	"/types/*/constraints",
	"/types/*/relationships",
	"/types/*/operations",
	"/types/*/clauses",
	"/types/*/extensions",
	"/types/*/fields/*/extensions",
	"/types/*/operations/*/params",
	"/types/*/operations/*/params/*/extensions",
	"/occurrences",
	"/extensions",
]);

/** The declared key-ordering rule, named so a later definition is a data edit. */
export const KEY_ORDER = "utf16-code-unit-ascending";

/** The declared canonicalization depth bound. */
export const MAX_CANONICAL_DEPTH = 256;

/** Raised when a value cannot be canonicalized, rather than serialized anyway. */
export class CanonicalError extends Error {
	constructor(message, pointer) {
		super(message);
		this.name = "CanonicalError";
		this.pointer = pointer;
	}
}

const SET_MATCHERS = IDENTITY_SET_PATHS.map((path) => path.slice(1).split("/"));

/** True when `segments` — a concrete path — matches a declared set path. */
function isIdentitySet(segments) {
	for (const matcher of SET_MATCHERS) {
		if (matcher.length !== segments.length) continue;
		let matched = true;
		for (let index = 0; index < matcher.length; index += 1) {
			if (matcher[index] === "*") continue;
			if (matcher[index] !== segments[index]) {
				matched = false;
				break;
			}
		}
		if (matched) return true;
	}
	return false;
}

/**
 * RFC 8785 string serialization. `JSON.stringify` already emits the JCS form
 * for a string: minimal escaping, `\u00XX` only for the control range.
 */
function renderString(value) {
	return JSON.stringify(value);
}

/**
 * RFC 8785 number serialization is ECMAScript `Number::toString`, which
 * `JSON.stringify` produces. `-0` is canonicalized to `0` so that two documents
 * differing only in the sign of a zero carry one fingerprint; a non-finite
 * number is refused rather than rendered as `null`.
 */
function renderNumber(value, pointer) {
	if (!Number.isFinite(value)) {
		throw new CanonicalError(
			`non-finite number cannot be canonicalized: ${String(value)}`,
			pointer,
		);
	}
	return JSON.stringify(Object.is(value, -0) ? 0 : value);
}

function render(value, segments, depth, sets) {
	const pointer = `/${segments.join("/")}`;
	if (depth > MAX_CANONICAL_DEPTH) {
		throw new CanonicalError(
			`canonicalization depth exceeds ${MAX_CANONICAL_DEPTH}`,
			pointer,
		);
	}
	if (value === null) return "null";
	if (typeof value === "boolean") return value ? "true" : "false";
	if (typeof value === "number") return renderNumber(value, pointer);
	if (typeof value === "string") return renderString(value);
	if (Array.isArray(value)) {
		const members = value.map((member, index) => ({
			index,
			text: render(member, [...segments, String(index)], depth + 1, sets),
			identity:
				member !== null &&
				typeof member === "object" &&
				!Array.isArray(member) &&
				typeof member.identity === "string"
					? member.identity
					: undefined,
		}));
		const ordered =
			sets && isIdentitySet(segments) ? sortSet(members) : members;
		return `[${ordered.map((member) => member.text).join(",")}]`;
	}
	if (typeof value === "object") {
		const keys = Object.keys(value)
			.filter((key) => value[key] !== undefined)
			.sort(compareCodeUnits);
		const members = keys.map(
			(key) =>
				`${renderString(key)}:${render(value[key], [...segments, key], depth + 1, sets)}`,
		);
		return `{${members.join(",")}}`;
	}
	throw new CanonicalError(
		`value of type ${typeof value} cannot be canonicalized`,
		pointer,
	);
}

/** Code-unit ordering. Never `localeCompare`, which reads the host's collator. */
function compareCodeUnits(left, right) {
	if (left === right) return 0;
	return left < right ? -1 : 1;
}

/**
 * The set order, and it is total.
 *
 * Ordering by `identity` alone is not a total order on a document carrying
 * duplicate identities, and such documents exist — `DUPLICATE_IDENTITY` is a
 * registered admissibility code and the adapter must still produce a
 * `normalized` string for those cases. So equal identities fall back to the
 * code-unit order of the members' own canonical forms, and members equal under
 * that too keep their original index (FR-069, D-14).
 */
function sortSet(members) {
	return [...members].sort((left, right) => {
		const leftIdentity = left.identity;
		const rightIdentity = right.identity;
		if (leftIdentity !== undefined && rightIdentity !== undefined) {
			const byIdentity = compareCodeUnits(leftIdentity, rightIdentity);
			if (byIdentity !== 0) return byIdentity;
		} else if (leftIdentity !== undefined) {
			return -1;
		} else if (rightIdentity !== undefined) {
			return 1;
		}
		const byText = compareCodeUnits(left.text, right.text);
		if (byText !== 0) return byText;
		return left.index - right.index;
	});
}

/**
 * The canonical byte form of any JSON value. The argument is never mutated.
 */
export function canonicalize(value, { sets = true } = {}) {
	return render(value, [], 0, sets);
}

/** `sha256:<64 lowercase hex>` over the UTF-8 bytes of `text`. */
export function digestOf(text) {
	return `sha256:${createHash("sha256").update(text, "utf8").digest("hex")}`;
}

/** Multiplicity derived from a field's `presence`, when it carries none. */
function multiplicityFromPresence(presence) {
	return presence === "optional"
		? { lower: 0, upper: 1 }
		: { lower: 1, upper: 1 };
}

/**
 * Materialize members that 1.1.0 makes derivable — a field's
 * `multiplicity`, its `presence`, and its `nullable` — so that two documents
 * that differ only in which of them was written down carry one canonical form.
 * A `1.0.0` document gains no member.
 */
function materializeField(field, version) {
	if (field === null || typeof field !== "object" || Array.isArray(field)) {
		return field;
	}
	const multiplicity =
		field.multiplicity !== undefined && field.multiplicity !== null
			? field.multiplicity
			: multiplicityFromPresence(field.presence);
	const lower =
		typeof multiplicity === "object" &&
		multiplicity !== null &&
		typeof multiplicity.lower === "number"
			? multiplicity.lower
			: field.presence === "optional"
				? 0
				: 1;
	return {
		...field,
		multiplicity,
		presence:
			version === "2.0.0" &&
			(field.presence === "required" || field.presence === "optional")
				? field.presence
				: lower >= 1
					? "required"
					: "optional",
		nullable: field.nullable === true,
	};
}

/**
 * The normalized document: a deep copy with the 1.1/2.0 members materialized.
 * The argument is left byte-identical (FR-069).
 */
export function normalizeIr(document) {
	const copy = structuredClone(document);
	if (
		copy === null ||
		typeof copy !== "object" ||
		Array.isArray(copy) ||
		(copy.contractVersion !== "1.1.0" && copy.contractVersion !== "2.0.0") ||
		!Array.isArray(copy.types)
	) {
		return copy;
	}
	for (const type of copy.types) {
		if (type === null || typeof type !== "object") continue;
		if (Array.isArray(type.fields)) {
			type.fields = type.fields.map((field) =>
				materializeField(field, copy.contractVersion),
			);
		}
		if (Array.isArray(type.operations)) {
			for (const operation of type.operations) {
				if (operation === null || typeof operation !== "object") continue;
				if (Array.isArray(operation.params)) {
					operation.params = operation.params.map((field) =>
						materializeField(field, copy.contractVersion),
					);
				}
			}
		}
	}
	return copy;
}

/**
 * The canonical string an adapter answer carries as `normalized`, and the input
 * to the fingerprint every generated file's banner names.
 *
 * It depends on nothing from the admissibility reader: FR-068 and FR-069 do not
 * form a cycle, and this function is measurable against every corpus case
 * before a single diagnostic rule exists.
 */
export function normalizeIrForTarget(document) {
	return canonicalize(normalizeIr(document), { sets: false });
}

/** The fingerprint of a document: the digest of its normalized canonical form. */
export function fingerprintIrForTarget(document) {
	return digestOf(normalizeIrForTarget(document));
}
