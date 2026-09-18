/**
 * The closed generator diagnostic registry for the Rust/Serde backend (FR-058).
 *
 * Two namespaces exist in this slice and they are kept apart on purpose. This
 * file closes `agent-ix.rust-backend.*`, which is what the *generator* emits:
 * a construct it cannot map, a name it cannot render, a pattern it cannot
 * decide. The *reader* in `crates/semantic-ir` emits `agent-ix.semantic-ir.*`
 * from the published set `conformance/diagnostic-codes.json` fixes, because
 * those are the codes the independent oracle decides and the adapter is
 * compared on. Neither set borrows a code from the other, and the closure claim
 * below quantifies over this namespace alone (SR-082 FND-959).
 *
 * A code is named only as a member of `RUST_BACKEND_CODES`, never as a string
 * literal, so the set the generator can emit is extractable by reading this
 * file and grepping for member accesses (FR-058-AC-2).
 *
 * This module deliberately does not import `src/compiler/diagnostics.mjs`. That
 * registry is closed over a different pair of namespaces and its closure gate
 * quantifies over its own set; sharing the object would make each file's
 * "closed" claim depend on the other's. The forty lines of ordering below are
 * duplicated with that in mind.
 */

const OWNER = "ix://agent-ix/filament-core-data/rust-backend";
const READER_OWNER = "ix://agent-ix/filament-core-data/semantic-ir";

/** `error` + blocking: the generator writes no file. */
function blocking(rule) {
	return { severity: "error", blocking: true, owner: OWNER, rule };
}

/** Non-blocking: the generated crate is still written. */
function advisory(rule) {
	return { severity: "warning", blocking: false, owner: OWNER, rule };
}

/**
 * The twenty-one codes FR-058 declares. Each carries the rule it enforces, so
 * the published table in `docs/semantic-data-system/rust-backend-diagnostics.md`
 * is rendered from this object rather than maintained beside it.
 */
const DECLARED = {
	UNSUPPORTED_CONSTRUCT: blocking(
		"a construct selects no mapping row and no named refusal",
	),
	UNSUPPORTED_PATTERN: blocking(
		"an ECMA-262 pattern is neither expressible in the declared subset nor a proved-validator registry key",
	),
	UNSUPPORTED_SCALAR: blocking(
		'a kind: "scalar" names a value outside the nine kernel scalars',
	),
	UNDECLARED_WIRE_FORM: blocking(
		"a construct's JSON wire form is declared by no published artifact — the bytes kernel scalar at this revision",
	),
	UNSUPPORTED_MULTIPLICITY: blocking(
		"a field's multiplicity.upper is 0, so the member may never be present and has no Rust form that serde round-trips",
	),
	PAYLOAD_ON_ENUM_VARIANT: blocking(
		'a kind: "enum" variant carries a payloadType, which the schema permits and no contract rule reconciles with the kind',
	),
	UNORDERED_SUBJECT: blocking(
		"a bound keyword names a subject the contract does not order — an ISO 8601 duration at this revision",
	),
	INVALID_DEFAULT_VALUE: blocking(
		"a defaultValue is not a value the field's mapped Rust type admits",
	),
	UNKNOWN_FORMAT: blocking(
		"a format operand names a format the generated registry does not carry",
	),
	UNRENDERABLE_NAME: blocking(
		"a name derives no legal Rust identifier, and the backend refuses rather than dropping the characters it cannot carry",
	),
	NAME_COLLISION: blocking(
		"two semantic identities derive one identifier in one declared scope",
	),
	UNSAFE_OUTPUT_ROOT: blocking(
		"the request's outputRoot is not traversal-free under the intended-language predicate",
	),
	LIMIT_EXCEEDED: blocking(
		"an input exceeds one of the five declared limits; the message names which",
	),
	DECLARED_LOSS: advisory(
		"the backend drops a construct the profile lists in allowedOmissions",
	),
	UNKNOWN_MEMBER_SURFACED: advisory(
		"a record whose unknownPolicy is surface retained an unknown member at runtime",
	),
	DIAGNOSTIC_LIMIT_REACHED: advisory(
		"the diagnostic count reached the request's maxDiagnostics",
	),
};

/**
 * The published `agent-ix.semantic-ir.*` spellings, for defects in the *shape of
 * an IR document* rather than in this backend's own mapping.
 *
 * `conformance/diagnostic-codes.json` already fixes these five, and the
 * independent oracle decides them under exactly these codes. Minting a second
 * `agent-ix.rust-backend.*` spelling for the same defect is the
 * two-namespaces-for-one-defect problem SR-066 FND-500 raised against the
 * compiler, which FR-049 fixed by registering both sets explicitly. This file
 * takes the same resolution: one code per defect, in the namespace that owns it.
 * A gate asserts the two leaf sets stay disjoint, so the collision cannot come
 * back unnoticed.
 */
const IR_SHAPE = {
	UNKNOWN_REQUIRED_EXTENSION: blocking(
		"a required extension whose identity the crate does not declare, or which names a capability the crate does not admit; the admitted set is empty because GAP-007 records that no published artifact lets a consumer declare one, and issue #69 carries the fixture's disagreeing spelling",
	),
	CONSTRAINT_NOT_APPLICABLE: blocking(
		"a constraint keyword does not apply to its resolved subject",
	),
	INVALID_OPERAND: blocking(
		"an operand's JSON type is not one the subject's Rust type admits",
	),
	UNRESOLVED_TYPE_REF: blocking(
		"a typeRef, appliesTo, items, values, payloadType or target resolves to nothing",
	),
	UNDECLARED_LOSS: blocking(
		"the backend would drop a construct the profile does not list in allowedOmissions",
	),
};

function buildRegistry() {
	const registry = {};
	for (const [name, entry] of Object.entries(DECLARED)) {
		registry[name] = Object.freeze({
			code: `agent-ix.rust-backend.${name}`,
			...entry,
		});
	}
	for (const [name, entry] of Object.entries(IR_SHAPE)) {
		registry[name] = Object.freeze({
			code: `agent-ix.semantic-ir.${name}`,
			...entry,
			// The published set owns these codes, so it owns their owner too.
			// Renaming an owner is renaming a code.
			owner: READER_OWNER,
		});
	}
	// Deeply frozen. Freezing only the outer record leaves every entry mutable,
	// so a caller could flip a code's blocking disposition at run time and the
	// gate that reads it would agree with the change.
	return Object.freeze(registry);
}

/** The frozen registry: `RUST_BACKEND_CODES.<NAME>` is the only way to name a code. */
export const RUST_BACKEND_CODES = buildRegistry();

/** Every registered entry, in declaration order. */
export const REGISTERED_ENTRIES = Object.freeze(
	Object.values(RUST_BACKEND_CODES),
);

const REGISTERED = new Set(REGISTERED_ENTRIES);

/** The longest input-derived fragment a message may carry (FR-058-CON-3). */
export const MAX_MESSAGE_FRAGMENT = 120;

/**
 * Truncates an input-derived string before it enters a message. An adversarial
 * display name or pattern cannot enlarge the diagnostic output without bound.
 *
 * The cut is on a code point, not a code unit: slicing between the halves of a
 * surrogate pair leaves a lone surrogate in the message, which is not text.
 */
export function fragment(value) {
	const text = String(value).replace(/\s+/g, " ");
	if ([...text].length <= MAX_MESSAGE_FRAGMENT) return text;
	const points = [...text].slice(0, MAX_MESSAGE_FRAGMENT - 1);
	return `${points.join("")}…`;
}

/**
 * Builds one diagnostic. `entry` must be a member of `RUST_BACKEND_CODES`; a
 * code the registry does not carry is a defect in the backend, not in an input,
 * so this throws rather than emitting it (FR-058-AC-2).
 */
export function diagnostic(entry, options = {}) {
	if (!entry || typeof entry.code !== "string") {
		throw new TypeError(
			"diagnostic() takes a RUST_BACKEND_CODES member, not a string",
		);
	}
	if (!REGISTERED.has(entry)) {
		throw new TypeError(`unregistered diagnostic code: ${entry.code}`);
	}
	const result = {
		code: entry.code,
		severity: entry.severity,
		message: options.message ?? entry.code,
		owner: entry.owner,
		blocking: entry.blocking,
		causes: options.causes ?? [],
		related: options.related ?? [],
	};
	if (options.locus) result.locus = options.locus;
	return result;
}

/** Locale-independent code-point comparison. */
function byCodePoint(left, right) {
	if (left < right) return -1;
	if (left > right) return 1;
	return 0;
}

function sortKey(entry) {
	const locus = entry.locus;
	return locus
		? [
				0,
				locus.path,
				locus.startLine,
				locus.startColumn,
				entry.code,
				entry.message,
			]
		: [1, "", 0, 0, entry.code, entry.message];
}

/**
 * Deterministic diagnostic order: located diagnostics first, then by path,
 * line, column, code and message, all under code-point comparison so the order
 * does not vary with the host's ICU data or its locale (FR-058-AC-7).
 */
export function sortDiagnostics(list) {
	return [...list].sort((left, right) => {
		const a = sortKey(left);
		const b = sortKey(right);
		for (let index = 0; index < a.length; index += 1) {
			if (typeof a[index] === "number") {
				if (a[index] !== b[index]) return a[index] - b[index];
				continue;
			}
			const comparison = byCodePoint(a[index], b[index]);
			if (comparison !== 0) return comparison;
		}
		return 0;
	});
}

/**
 * Sorts, then truncates. The order matters: truncating an unsorted list makes
 * which defects survive depend on the order the analysis happened to find them,
 * which contradicts byte-identical output.
 */
export function applyDiagnosticLimit(list, max) {
	const sorted = sortDiagnostics(list);
	if (typeof max !== "number" || sorted.length <= max) return sorted;
	return [
		...sorted.slice(0, max),
		diagnostic(RUST_BACKEND_CODES.DIAGNOSTIC_LIMIT_REACHED, {
			message: `diagnostic limit ${max} reached; ${sorted.length - max} further diagnostics were not reported`,
		}),
	];
}

/** True when any diagnostic in the list blocks generation. */
export function hasBlocking(list) {
	return list.some((entry) => entry.blocking === true);
}
