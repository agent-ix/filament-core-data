/**
 * Identifier minting for the TypeScript backend (FR-064, Task-106).
 *
 * An identifier is minted from a definition's `displayName` and from nothing
 * else. That is the *only* thing this backend takes from a display name: no
 * role, no nullability, no recursion flag and no openness is ever inferred from
 * a name here, because that is exactly the defect
 * `conformance/defects.json` DEF-PROTO-004..007 records against the issue #4
 * prototype, which decided nullability by `fieldType.includes("null")` and
 * openness by `fieldType.includes("Record<")`.
 *
 * A consequence worth stating rather than discovering: because the identifier
 * comes from the display name while the *contract* identity does not, changing
 * a `displayName` and leaving the `identity` alone changes the generated public
 * API while the semantic contract did not move. The generated identity map of
 * FR-067 is what makes that visible — it maps the new identifier to the
 * unchanged identity, so a consumer diffing the package reads a rename for what
 * it is instead of a removal beside an addition.
 *
 * Everything here is locale-independent by construction. No `toLowerCase`, no
 * `toUpperCase`, no `localeCompare`, and no case folding of any kind: the
 * display name's own case is carried through unchanged. Turkish dotted-I is
 * precisely how a locale-dependent mint announces itself, and the cheapest way
 * not to have that bug is to fold no case at all.
 */

import { LOSS_CODES } from "./loss.mjs";

/**
 * Reserved and hazardous names. Three groups, and the reason differs:
 *
 * 1. TypeScript and ECMAScript reserved words, which cannot be a declaration
 *    name at all.
 * 2. Members every JavaScript object reaches through its prototype —
 *    `constructor`, `__proto__`, `toString` and friends. A generated type named
 *    for one of these is legal TypeScript and a trap for the runtime validator,
 *    which must never confuse an inherited member with a declared one.
 * 3. The fixed API surface this backend generates. A minted identifier that
 *    collided with `UNION_DISCRIMINANT` or `ValidationError` would silently
 *    shadow the package's own contract.
 */
export const RESERVED_NAMES = Object.freeze([
	// 1. Reserved words, including the contextual ones a type declaration may
	//    not take, and the strict-mode future reserved words.
	"any",
	"as",
	"asserts",
	"await",
	"bigint",
	"boolean",
	"break",
	"case",
	"catch",
	"class",
	"const",
	"continue",
	"debugger",
	"declare",
	"default",
	"delete",
	"do",
	"else",
	"enum",
	"export",
	"extends",
	"false",
	"finally",
	"for",
	"function",
	"if",
	"implements",
	"import",
	"in",
	"infer",
	"instanceof",
	"interface",
	"is",
	"keyof",
	"let",
	"module",
	"namespace",
	"never",
	"new",
	"null",
	"number",
	"object",
	"package",
	"private",
	"protected",
	"public",
	"readonly",
	"return",
	"static",
	"string",
	"super",
	"switch",
	"symbol",
	"this",
	"throw",
	"true",
	"try",
	"type",
	"typeof",
	"undefined",
	"unique",
	"unknown",
	"var",
	"void",
	"while",
	"with",
	"yield",
	// 2. Prototype members and the two names that make a plain object dangerous.
	"__proto__",
	"constructor",
	"hasOwnProperty",
	"isPrototypeOf",
	"propertyIsEnumerable",
	"prototype",
	"toLocaleString",
	"toString",
	"valueOf",
	// 3. The generated package's own fixed API surface (FR-065).
	"UNION_DISCRIMINANT",
	"UNKNOWN_POLICY_MARKER",
	"ValidationError",
	"ValidationResult",
	"VALIDATION_CODES",
	"SEMANTIC_METADATA",
	"PROVENANCE",
	"TYPE_IDENTITIES",
	"FIELD_IDENTITIES",
	"TYPE_ROLES",
	"TYPE_UNKNOWN_POLICIES",
	"TYPE_EXTENSIONS",
	"FIELD_EXTENSIONS",
	"FIELD_UNITS",
	"RELATIONSHIPS",
	"OCCURRENCES",
	"DOCUMENT_EXTENSIONS",
]);

const RESERVED = new Set(RESERVED_NAMES);

/**
 * The discriminant property of every generated discriminated union, emitted as
 * one exported constant so that a ruling on `agent-ix/filament-core-data#58` —
 * which records that the published contract states no JSON wire form for a
 * discriminated union — moves one declaration rather than every union.
 */
export const UNION_DISCRIMINANT = "kind";

/** The generated marker naming a record's `unknownPolicy` in its interface. */
export const UNKNOWN_POLICY_MARKER = "__unknownPolicy";

/** Code points a TypeScript identifier may carry after the first position. */
function isIdentifierPart(codePoint) {
	return (
		(codePoint >= 0x30 && codePoint <= 0x39) ||
		(codePoint >= 0x41 && codePoint <= 0x5a) ||
		(codePoint >= 0x61 && codePoint <= 0x7a) ||
		codePoint === 0x5f ||
		codePoint === 0x24
	);
}

/**
 * The escape for a code point an identifier may not carry.
 *
 * TypeScript would accept many non-ASCII letters directly, but "many" is not a
 * rule an independent implementation can reproduce, and the set moves with the
 * Unicode version the compiler was built against. Escaping every non-ASCII code
 * point to `_uXXXX` is a rule that is stated in one line, is stable across
 * toolchains, and folds no case.
 */
function escapeCodePoint(codePoint) {
	return `_u${codePoint.toString(16).padStart(4, "0")}`;
}

/**
 * A TypeScript identifier minted from `displayName`, by a stated rule:
 *
 * 1. Every code point that an identifier may not carry becomes `_uXXXX`.
 * 2. A leading digit gains a leading `_`, because an identifier may not start
 *    with one.
 * 3. An empty result — a display name made entirely of separators — falls back
 *    to `Type` plus the escape of the identity's last path segment, so the
 *    result is still derived from the document rather than invented.
 * 4. A reserved, prototype-hazardous, or fixed-API name gains a single trailing
 *    `_`.
 *
 * The rule is total, deterministic, and locale-independent. It is not injective
 * — two display names can mint one identifier — and that is what `reserveNames`
 * is for.
 */
export function identifierFor(identity, displayName) {
	const source = typeof displayName === "string" ? displayName : "";
	let minted = "";
	for (const character of source) {
		const codePoint = character.codePointAt(0);
		minted += isIdentifierPart(codePoint)
			? character
			: escapeCodePoint(codePoint);
	}
	if (
		minted.length > 0 &&
		minted.charCodeAt(0) >= 0x30 &&
		minted.charCodeAt(0) <= 0x39
	) {
		minted = `_${minted}`;
	}
	if (minted.length === 0) {
		const segment =
			typeof identity === "string" ? (identity.split("/").pop() ?? "") : "";
		let escaped = "";
		for (const character of segment) {
			const codePoint = character.codePointAt(0);
			escaped += isIdentifierPart(codePoint)
				? character
				: escapeCodePoint(codePoint);
		}
		minted = `Type${escaped}`;
	}
	if (RESERVED.has(minted)) minted = `${minted}_`;
	return minted;
}

/**
 * A stable module base name for a definition, used where a per-type entry
 * module is wanted — the bundle-surface fixtures of FR-071 are the caller.
 * Derived from the identity rather than the display name, so it does not move
 * when a display name does.
 */
export function moduleNameFor(identity) {
	const segment =
		typeof identity === "string" ? (identity.split("/").pop() ?? "") : "";
	let name = "";
	for (const character of segment) {
		const codePoint = character.codePointAt(0);
		name += isIdentifierPart(codePoint) ? character : "-";
	}
	return name.length > 0 ? name : "type";
}

/** Code-unit ordering. Never `localeCompare`, which reads the host's collator. */
function compareCodeUnits(left, right) {
	if (left === right) return 0;
	return left < right ? -1 : 1;
}

/**
 * Mint an identifier for every declaration and refuse a collision.
 *
 * Two distinct identities that mint one identifier are *not* resolved by
 * suffixing one of them. FR-064 requires the collision be raised, and the reason
 * is that an automatic rename is a silent change to the generated public API:
 * whichever declaration loses gets a name nobody asked for, and a consumer
 * diffing the package sees a rename with no cause. Under the `fail`
 * `unsupportedFeaturePolicy` the committed target contract declares, refusing
 * is the available answer.
 *
 * The collision is reported in the `agent-ix.typescript-backend.`
 * representability namespace of `loss.mjs`, not in the IR namespace: a name two
 * identities share says what this target can render, and says nothing at all
 * about whether the document is valid.
 *
 * Returns `{ identifiers, collisions }`, where `identifiers` maps identity to
 * identifier and `collisions` carries the same entry shape `representability`
 * returns, so a caller merges the two lists without translating between them.
 */
export function reserveNames(definitions) {
	const identifiers = new Map();
	const byIdentifier = new Map();
	const ordered = [...definitions].sort((left, right) =>
		compareCodeUnits(String(left.identity), String(right.identity)),
	);
	for (const definition of ordered) {
		const identity = String(definition.identity);
		const identifier = identifierFor(identity, definition.displayName);
		identifiers.set(identity, identifier);
		const claimed = byIdentifier.get(identifier);
		if (claimed === undefined) {
			byIdentifier.set(identifier, [identity]);
		} else {
			claimed.push(identity);
		}
	}
	const collisions = [];
	for (const [identifier, identities] of [...byIdentifier.entries()].sort(
		([left], [right]) => compareCodeUnits(left, right),
	)) {
		if (identities.length < 2) continue;
		collisions.push(
			Object.freeze({
				code: LOSS_CODES.IDENTIFIER_COLLISION.code,
				construct: "identifier-collision",
				owner: identities[0],
				pointer: "/ir/types",
				detail: `${identifier} is minted by ${identities.join(", ")}`,
			}),
		);
	}
	return { identifiers, collisions };
}
