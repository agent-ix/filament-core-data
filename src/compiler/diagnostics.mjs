/**
 * The closed compiler diagnostic registry (FR-049).
 *
 * Two namespaces, and the split is deliberate. `agent-ix.compiler.*` covers a
 * defect in what a package supplies to the compiler — a manifest, a lock, a
 * source file — or in how the caller invoked it. `agent-ix.semantic-ir.*` covers
 * a defect in the *shape of an IR document*, and its spellings are exactly the
 * ones the issue #34 readers already emit, so the compiler's reader and the two
 * independent readers can be compared code for code (FR-049-CON-4).
 *
 * A code is named only as a member of `DIAGNOSTIC_CODES`, never as a string
 * literal, so the set the compiler can emit is extractable by reading this file
 * and grepping for member accesses (FR-049-AC-2).
 */

const COMPILER = "ix://agent-ix/filament-core-data/compiler";
const READER = "ix://agent-ix/filament-core-data/semantic-ir";

/** `error` + blocking; the ordinary shape for an input defect. */
function blocking(owner) {
	return { severity: "error", blocking: true, owner };
}

/** Non-blocking; the document is still written. */
function advisory(owner) {
	return { severity: "warning", blocking: false, owner };
}

const COMPILER_CODES = [
	// Seam and frontend
	// Kernel bundle (FR-081). The inventory mismatch is what stops a bundle
	// declaring a document set the grammar does not have; the staleness code is
	// what stops a generated tree outliving the source it was generated from.
	// JSON Schema lowering (FR-082). Two codes, not one: "outside the recognised
	// set" and "recognised but in an arrangement never seen here" send a reader
	// to different files.
	"UNSUPPORTED_SCHEMA_KEYWORD",
	"UNSUPPORTED_SCHEMA_SHAPE",
	"KERNEL_INVENTORY_MISMATCH",
	"KERNEL_BUNDLE_STALE",
	"FRONTEND_NOT_IMPLEMENTED",
	"TYPESPEC_COMPILE_ERROR",
	"DUPLICATE_DECORATOR",
	"INVALID_DECORATOR_ARGUMENT",
	"UNSLUGGABLE_NAME",
	"UNSUPPORTED_SCALAR_BASE",
	"UNSUPPORTED_DECLARATION",
	"MULTIPLICITY_CONTRADICTS_OPTIONALITY",
	"DEFAULT_KIND_WITHOUT_VALUE",
	"SOURCE_OUTSIDE_PACKAGE",
	"UNSUPPORTED_LOSS",
	// Confinement
	"PATH_ESCAPE",
	"UNTRUSTED_MODULE",
	// Package graph
	"INVALID_MANIFEST",
	"INVALID_MAPPING",
	"INVALID_PROFILE",
	"UNSUPPORTED_VERSION_CONSTRAINT",
	"IMPORT_NOT_FOUND",
	"IMPORT_VERSION_UNSATISFIED",
	"IMPORT_VERSION_CONFLICT",
	"IMPORT_EXPORT_MISSING",
	"IMPORT_EXPORT_PRIVATE",
	"IMPORT_CAPABILITY_MISSING",
	"DIGEST_CONFLICT",
	"PACKAGE_CYCLE",
	"DUPLICATE_EXPORT",
	"UNKNOWN_PROFILE",
	"UNKNOWN_MAPPING",
	"UNKNOWN_TARGET",
	"UNDECLARED_LOSS",
	"AMBIGUOUS_PROFILE",
	// Lock
	"STALE_LOCK",
	"STALE_LOCK_PACKAGE",
	"LOCK_GRAPH_MISMATCH",
	"UNSUPPORTED_CANONICALIZATION",
	// IR document, schema level
	"INVALID_IR",
	// Compatibility and evolution
	"MISSING_TARGET_DIALECT",
	"UNKNOWN_CONTRACT_VERSION",
	// Limits
	"LIMIT_MAX_INPUT_BYTES",
	"LIMIT_MAX_DEPTH",
	"LIMIT_MAX_NODES",
	"LIMIT_MAX_COLLECTION_ITEMS",
	// Generation seam and backends (FR-063). These name a defect in a submitted
	// generation *request*, or in the calling program's choice of target — never
	// a defect in the shape of an IR document, which is why none of them belongs
	// in `READER_CODES` below.
	"BACKEND_NOT_IMPLEMENTED",
	"INVALID_REQUEST",
	"UNSUPPORTED_IR_VERSION",
	"BACKEND_CONTRACT_VIOLATION",
];

/**
 * The IR-shape codes. This list is the compiler's half of the differential
 * oracle with the issue #34 readers: TC-503 asserts it equals the set those
 * readers emit, in both directions.
 */
const READER_CODES = [
	"INVALID_DOCUMENT",
	"INVALID_MULTIPLICITY",
	"FLAGS_ON_NON_COLLECTION",
	"MISSING_MULTIPLICITY",
	"PRESENCE_MULTIPLICITY_MISMATCH",
	"UNRESOLVED_TYPE_REF",
	"INVALID_UNIT",
	"UNIT_ON_NON_SCALAR",
	"UNKNOWN_CONSTRAINT_KEYWORD",
	"CONSTRAINT_NOT_APPLICABLE",
	"INVALID_PATTERN",
	"INVALID_OPERAND",
	"NODES_ON_NON_RECORD",
	"UNRESOLVED_RELATIONSHIP_TARGET",
	"UNKNOWN_EDGE_CATEGORY",
	"COMPOSITE_CYCLE",
	"DUPLICATE_CLAUSE_ID",
	"UNKNOWN_CLAUSE_LANGUAGE",
	"MISSING_SOURCE_SPAN",
	"DANGLING_CLAUSE_REF",
	"DUPLICATE_PARAM",
	"DUPLICATE_IDENTITY",
];

function buildRegistry() {
	const registry = {};
	for (const name of COMPILER_CODES) {
		registry[name] = {
			code: `agent-ix.compiler.${name}`,
			...blocking(COMPILER),
		};
	}
	for (const name of READER_CODES) {
		registry[name] = {
			code: `agent-ix.semantic-ir.${name}`,
			...blocking(READER),
		};
	}
	// The one advisory code. Reaching `maxDiagnostics` truncates the report; it
	// does not invalidate the compile, so a warning-only run still writes its
	// document (FR-049, SR-066 FND-509).
	registry.DIAGNOSTIC_LIMIT_REACHED = {
		code: "agent-ix.compiler.DIAGNOSTIC_LIMIT_REACHED",
		...advisory(COMPILER),
	};
	// Deeply frozen: freezing only the outer record leaves every entry mutable,
	// so a caller could change a code's blocking disposition at run time and the
	// gate that reads it would agree.
	for (const entry of Object.values(registry)) Object.freeze(entry);
	return Object.freeze(registry);
}

/** The frozen registry: `DIAGNOSTIC_CODES.<NAME>` is the only way to name a code. */
export const DIAGNOSTIC_CODES = buildRegistry();

/** The declared limit defaults (FR-049, NFR-020-AC-2). */
export const DEFAULT_LIMITS = Object.freeze({
	maxInputBytes: 16777216,
	maxDepth: 128,
	maxNodes: 100000,
	maxCollectionItems: 10000,
	maxDiagnostics: 1000,
});

/** The limit name each blocking limit code reports. */
export const LIMIT_CODES = Object.freeze({
	maxInputBytes: DIAGNOSTIC_CODES.LIMIT_MAX_INPUT_BYTES,
	maxDepth: DIAGNOSTIC_CODES.LIMIT_MAX_DEPTH,
	maxNodes: DIAGNOSTIC_CODES.LIMIT_MAX_NODES,
	maxCollectionItems: DIAGNOSTIC_CODES.LIMIT_MAX_COLLECTION_ITEMS,
});

const MAX_MESSAGE_FRAGMENT = 120;

/**
 * Truncates an input-derived string before it enters a message (FR-049-CON-2).
 * An adversarial declaration name cannot flood the diagnostic output.
 */
export function fragment(value) {
	const text = String(value).replace(/\s+/g, " ");
	if (text.length <= MAX_MESSAGE_FRAGMENT) return text;
	// Cut on a code point, not a code unit: slicing between the halves of a
	// surrogate pair leaves a lone surrogate in the message, which is not text.
	const points = [...text].slice(0, MAX_MESSAGE_FRAGMENT - 1);
	while (points.join("").length > MAX_MESSAGE_FRAGMENT - 1) points.pop();
	return `${points.join("")}…`;
}

/**
 * Builds one diagnostic. `entry` must be a member of `DIAGNOSTIC_CODES`; a code
 * the registry does not contain is a defect in the compiler, not in an input,
 * so this throws rather than emitting it.
 */
export function diagnostic(entry, options = {}) {
	if (!entry || typeof entry.code !== "string") {
		throw new TypeError(
			"diagnostic() takes a DIAGNOSTIC_CODES member, not a string",
		);
	}
	if (!Object.values(DIAGNOSTIC_CODES).includes(entry)) {
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
 * Deterministic diagnostic order: located diagnostics first, by path, line,
 * column, code, then message, all under code-point comparison so the order does
 * not vary with the host's ICU data (FR-049, NFR-019-AC-6).
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
 * which defects survive depend on the order analysis happened to find them,
 * which contradicts byte-identical output (SR-067 FND-521).
 */
export function applyDiagnosticLimit(list, max) {
	const sorted = sortDiagnostics(list);
	if (sorted.length <= max) return sorted;
	const kept = sorted.slice(0, max);
	kept.push(
		diagnostic(DIAGNOSTIC_CODES.DIAGNOSTIC_LIMIT_REACHED, {
			message: `diagnostic limit ${max} reached; ${sorted.length - max} further diagnostics were dropped`,
		}),
	);
	return kept;
}

/** True when any diagnostic in the list blocks the compile. */
export function hasBlocking(list) {
	return list.some((entry) => entry.blocking === true);
}
