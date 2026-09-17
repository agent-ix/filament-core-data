/**
 * Rust identifier derivation for the Rust/Serde backend (FR-055).
 *
 * Three rules carry the whole requirement, and each exists because the obvious
 * alternative is a defect.
 *
 * A *type* name derives from the type's `displayName`, the declared name of
 * the class, never from its semantic identity. The identity is the artifact id
 * a spec bundle assigns (`FR-006`), which names the contract rather than the
 * class; the declared name (`ConfigVersion`) is what a consumer writes. Nothing
 * makes a `displayName` unique, so two types whose display names render one
 * identifier raise `NAME_COLLISION` in the crate's re-export namespace, naming
 * both identities, rather than being suffixed apart.
 *
 * A *member* name — a field, a variant, an operation, a parameter — derives
 * from its wire `name`, because a member's wire name is its contract and the
 * cross-field rules already make it unique within its scope. The identity is
 * carried into the collision message so a refusal names two identities rather
 * than two spellings of one name.
 *
 * A character the renderer cannot carry is a refusal, never a deletion.
 * Dropping the diaeresis from `Größe` to reach `GrE`, or `名前` to reach the
 * empty string, is the silent degradation FR-058 exists to forbid (SR-082
 * FND-951). Case conversion uses the locale-independent simple mappings, so a
 * Turkish host cannot change a generated identifier.
 *
 * Pure: the only inputs are the argument and the pinned tables.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * Reads one pinned table committed beside this module.
 *
 * The tables are the only input the emitter reads that is not the request, and
 * a missing one is a defect in the checkout rather than in the contract. It
 * therefore throws, naming the table: a backend that carried on without its
 * reserved-word list, its published patterns, or its proved-validator registry
 * would emit a crate degraded in exactly the way FR-058 exists to forbid, and
 * the degradation would be invisible in the generated source.
 */
function readPinnedTable(name) {
	try {
		return readFileSync(
			fileURLToPath(new URL(`./${name}`, import.meta.url)),
			"utf8",
		);
	} catch (cause) {
		throw new Error(
			`the pinned table \`${name}\` could not be read, so the backend refuses to emit a degraded crate`,
			{ cause },
		);
	}
}

import { diagnostic, fragment, RUST_BACKEND_CODES } from "./diagnostics.mjs";

const RESERVED = JSON.parse(readPinnedTable("reserved-words.json"));

/** Reserved words with no raw-identifier form; these are refusals, not renames. */
const NO_RAW_FORM = new Set(RESERVED.noRawForm);
const RESERVED_WORDS = new Set([
	...RESERVED.reserved,
	...RESERVED.reservedFuture,
]);

/**
 * The four Rust scopes injectivity is quantified over (FR-055 Behavior).
 * Naming them matters: "one scope" is undefined over a crate that has both
 * per-type modules and a flat re-export namespace.
 */
export const SCOPES = Object.freeze({
	CRATE_TYPES: "the crate's re-export namespace",
	RECORD_MEMBERS: "one record's member set",
	ENUM_VARIANTS: "one enum or union's variant set",
	OPERATION_PARAMS: "one operation's parameter set",
});

/**
 * `XID_Start` and `XID_Continue` for the pinned Unicode version, decided by the
 * engine's own property escapes rather than by a transcribed table, because a
 * transcribed table is a second place for the rule to drift. The `u` flag is
 * required for a property escape and is used here and nowhere else: this is a
 * question about identifier characters, not about the ECMA-262 dialect FR-057
 * decides patterns in.
 */
const XID_START = /\p{XID_Start}/u;
const XID_CONTINUE = /\p{XID_Continue}/u;

/** A separator run the segmenter drops rather than refuses. */
const SEPARATOR = /^[\s._\-/:+~@]$/;

/**
 * Splits a source string into word segments.
 *
 * Boundaries are lower-or-digit followed by upper, upper followed by
 * upper-then-lower, and any run of separators. `HTTPStatusCode` therefore
 * segments as `HTTP`, `Status`, `Code` rather than as one word or as eleven.
 *
 * Returns `{ segments }` on success and `{ refusal }` on a character the
 * renderer cannot carry.
 */
function segment(source) {
	const points = [...String(source)];
	const words = [];
	let current = [];
	const flush = () => {
		if (current.length > 0) words.push(current.join(""));
		current = [];
	};
	for (let index = 0; index < points.length; index += 1) {
		const ch = points[index];
		if (SEPARATOR.test(ch)) {
			flush();
			continue;
		}
		const isDigit = ch >= "0" && ch <= "9";
		if (!isDigit && !XID_CONTINUE.test(ch)) {
			return { refusal: ch };
		}
		const previous = points[index - 1];
		const next = points[index + 1];
		const upper = isUpper(ch);
		if (
			current.length > 0 &&
			upper &&
			previous !== undefined &&
			!SEPARATOR.test(previous)
		) {
			// lower-or-digit → upper, and upper → upper-then-lower.
			if (!isUpper(previous) || (next !== undefined && isLower(next))) {
				flush();
			}
		}
		current.push(ch);
	}
	flush();
	return { segments: words };
}

/** Locale-independent simple case tests and mappings. */
function isUpper(ch) {
	return ch !== lower(ch) && ch === upper(ch);
}
function isLower(ch) {
	return ch !== upper(ch) && ch === lower(ch);
}
function upper(text) {
	// `toUpperCase`, not `toLocaleUpperCase`: the locale-sensitive form maps
	// `i` to `İ` under a Turkish locale and the generated identifier would then
	// depend on the host (FR-055-AC-12).
	return String(text).toUpperCase();
}
function lower(text) {
	return String(text).toLowerCase();
}

function pascal(words) {
	return words
		.map(
			(word) => `${upper([...word][0])}${lower([...word].slice(1).join(""))}`,
		)
		.join("");
}

function snake(words) {
	return words.map((word) => lower(word)).join("_");
}

function screaming(words) {
	return words.map((word) => upper(word)).join("_");
}

/**
 * A refusal carrying the diagnostic the caller should raise. Returned rather
 * than thrown, because the backend collects every blocking defect before it
 * returns rather than stopping at the first (FR-058).
 */
function refuse(entry, identity, message) {
	return {
		ok: false,
		diagnostic: diagnostic(entry, {
			message: `${message} (${fragment(identity)})`,
		}),
	};
}

function finish(rendered, identity, { allowRaw }) {
	if (rendered.length === 0) {
		return refuse(
			RUST_BACKEND_CODES.UNRENDERABLE_NAME,
			identity,
			"renders to the empty identifier",
		);
	}
	let value = rendered;
	if (!XID_START.test([...value][0])) value = `_${value}`;
	if (RESERVED_WORDS.has(value)) {
		if (NO_RAW_FORM.has(value)) {
			return refuse(
				RUST_BACKEND_CODES.UNRENDERABLE_NAME,
				identity,
				`renders to the reserved word \`${value}\`, which has no raw-identifier form`,
			);
		}
		value = `r#${value}`;
	}
	return { ok: true, value, allowRaw };
}

/** The final `/`-delimited segment of a semantic identity. */
export function identitySegment(identity) {
	const text = String(identity);
	const slash = text.lastIndexOf("/");
	return slash === -1 ? text : text.slice(slash + 1);
}

function render(source, identity, shape) {
	const parts = segment(source);
	if (parts.refusal !== undefined) {
		return refuse(
			RUST_BACKEND_CODES.UNRENDERABLE_NAME,
			identity,
			`carries the character \`${parts.refusal}\`, which is not a Rust identifier character; the backend refuses rather than dropping it`,
		);
	}
	return finish(shape(parts.segments), identity, { allowRaw: true });
}

/**
 * The declared name a type's identifiers derive from: its `displayName`. A
 * definition without one renders the empty identifier, which refuses.
 */
function declaredName(definition) {
	return typeof definition.displayName === "string"
		? definition.displayName
		: "";
}

/** `UpperCamelCase` type name, derived from the type's `displayName`. */
export function typeName(definition) {
	return render(declaredName(definition), definition.identity, pascal);
}

/**
 * The `UpperCamelCase` qualifier for the package a semantic identity names.
 *
 * `ix://agent-ix/semantic-core/type/SourceLocusPath` qualifies as
 * `SemanticCore`. FR-133 uses it to move a document-derived identifier out of
 * the way of a reserved one: the qualifier names the namespace the construct
 * came from, so the resolved identifier still says what it is rather than
 * carrying a counter or a suffix that means nothing.
 */
export function packageQualifier(identity) {
	const text = String(identity);
	const scheme = text.indexOf("://");
	const path = scheme === -1 ? text : text.slice(scheme + 3);
	const parts = path.split("/").filter((part) => part.length > 0);
	const source = parts.length > 1 ? parts[1] : (parts[0] ?? "");
	return render(source, identity, pascal);
}

/** `UpperCamelCase` variant name, derived from the variant's wire name. */
export function variantName(variant) {
	return render(variant.name, variant.identity, pascal);
}

/** `snake_case` member name, derived from the member's wire name. */
export function memberName(node) {
	return render(node.name, node.identity, snake);
}

/** `snake_case` module name, derived from the type's `displayName`. */
export function moduleName(definition) {
	return render(declaredName(definition), definition.identity, snake);
}

/** `SCREAMING_SNAKE_CASE` constant name. */
export function constantName(node) {
	const source = node.name ?? identitySegment(node.identity);
	return render(source, node.identity, screaming);
}

/**
 * The Cargo package name for an IR `package.identity`.
 *
 * `package.identity` is an `owner/name` pair and Cargo's package-name grammar
 * forbids `/`, so the separator becomes `-` (SR-082 FND-958).
 */
export function crateName(packageIdentity) {
	const text = String(packageIdentity).replace(/\//g, "-");
	if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(text)) {
		return refuse(
			RUST_BACKEND_CODES.UNRENDERABLE_NAME,
			packageIdentity,
			"does not render a legal Cargo package name",
		);
	}
	return { ok: true, value: text };
}

/**
 * Collects derived identifiers for one scope and refuses a collision.
 *
 * A counter, a hash, or a positional suffix would make the generated name
 * depend on document order rather than on the contract, so a collision is a
 * refusal (FR-055-CON-1).
 */
export function collisionsIn(scope, entries) {
	const byIdentifier = new Map();
	const diagnostics = [];
	for (const { identifier, identity } of entries) {
		const seen = byIdentifier.get(identifier);
		if (seen === undefined) {
			byIdentifier.set(identifier, identity);
			continue;
		}
		diagnostics.push(
			diagnostic(RUST_BACKEND_CODES.NAME_COLLISION, {
				message: `\`${fragment(identifier)}\` is derived by both ${fragment(seen)} and ${fragment(identity)} in ${scope}`,
			}),
		);
	}
	return diagnostics;
}

/**
 * The serde rename a member needs, or `undefined` when the derived identifier
 * already is the wire name. Emitting a rename unconditionally would put a byte
 * in the golden that says nothing (FR-055-AC-6).
 */
export function serdeRename(identifier, wireName) {
	const bare = identifier.startsWith("r#") ? identifier.slice(2) : identifier;
	return bare === wireName ? undefined : wireName;
}
