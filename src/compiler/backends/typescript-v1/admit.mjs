/**
 * The TypeScript backend's own IR admissibility reader (FR-068, Tasks 102-103).
 *
 * This is a second implementation beside `src/compiler/ir/reader.mjs` and
 * `src/compiler/ir/schema.mjs`, deliberately, and it imports neither. A backend
 * that asks the compiler whether the compiler's own output is valid produces
 * agreement and no evidence: the two would fail together on every rule the
 * compiler gets wrong, and the conformance run would report a pass. Nothing
 * here imports anything under `conformance/` either — the corpus is the
 * yardstick, and a module under `src/` that reads it at run time makes the
 * yardstick a dependency of the thing it measures. The register below is
 * checked against the corpus's own register by a *test*, not by an import.
 *
 * Two rules this module applies are stated in no published contract artifact
 * and are recorded as this backend's declared reading rather than as contract:
 *
 * - every registered admissibility code carries severity `error`, and
 * - a diagnostic's `locus` is the nearest enclosing node's `origin.source`, or
 *   a clause's `sourceSpan` where the failing node is a clause.
 *
 * `conformance/diagnostic-codes.json` records a rule and a citation for each of
 * its thirty codes and records neither a severity nor a locus derivation, while
 * `conformance/corpus.mjs` keys its diagnostic comparison on
 * `[pointer, code, severity, locus]`. That gap is filed as
 * `agent-ix/filament-core-data#61`. The published `sourceLocus` shape is used
 * as it stands; `agent-ix/filament-core-data#56` records that its traversal and
 * absolute-path guards do not apply past a line terminator, and is cited here
 * rather than worked around.
 *
 * No module under this directory may touch the Node filesystem module, so the
 * published schemas arrive through an injected `readSchema` rather than being
 * read here. That is the same confinement `src/compiler/host.mjs` gives the
 * rest of the compiler, and it is why this file names no core module but
 * `node:crypto`'s absence — it needs none.
 */

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { canonicalize } from "./canonical.mjs";
import { REFERENCE_POLICY } from "./loss.mjs";

const IR = (name) => `agent-ix.semantic-ir.${name}`;

/** Every registered code carries severity `error`; see the header and #61. */
function code(name) {
	return Object.freeze({
		code: IR(name),
		severity: "error",
		blocking: true,
	});
}

/**
 * The closed admissibility register. Thirty codes, spelled here and nowhere
 * else, standing in exact bijection with the `agent-ix.semantic-ir.` half of
 * `conformance/diagnostic-codes.json` — asserted in both directions by a test.
 */
export const ADMISSIBILITY_CODES = Object.freeze({
	SCHEMA_VIOLATION: code("SCHEMA_VIOLATION"),
	INVALID_DOCUMENT: code("INVALID_DOCUMENT"),
	PRESENCE_MULTIPLICITY_MISMATCH: code("PRESENCE_MULTIPLICITY_MISMATCH"),
	INVALID_MULTIPLICITY: code("INVALID_MULTIPLICITY"),
	FLAGS_ON_NON_COLLECTION: code("FLAGS_ON_NON_COLLECTION"),
	UNIT_ON_NON_SCALAR: code("UNIT_ON_NON_SCALAR"),
	UNRESOLVED_TYPE_REF: code("UNRESOLVED_TYPE_REF"),
	UNRESOLVED_ELEMENT_TYPE: code("UNRESOLVED_ELEMENT_TYPE"),
	UNRESOLVED_VARIANT_PAYLOAD: code("UNRESOLVED_VARIANT_PAYLOAD"),
	UNRESOLVED_OCCURRENCE_DEFINITION: code("UNRESOLVED_OCCURRENCE_DEFINITION"),
	ALIAS_CYCLE: code("ALIAS_CYCLE"),
	DEPTH_LIMIT_EXCEEDED: code("DEPTH_LIMIT_EXCEEDED"),
	DUPLICATE_IDENTITY: code("DUPLICATE_IDENTITY"),
	DUPLICATE_FIELD_NAME: code("DUPLICATE_FIELD_NAME"),
	DUPLICATE_PARAM: code("DUPLICATE_PARAM"),
	DUPLICATE_CLAUSE_ID: code("DUPLICATE_CLAUSE_ID"),
	DANGLING_CLAUSE_REF: code("DANGLING_CLAUSE_REF"),
	MISSING_SOURCE_SPAN: code("MISSING_SOURCE_SPAN"),
	CONSTRAINT_NOT_APPLICABLE: code("CONSTRAINT_NOT_APPLICABLE"),
	INVALID_OPERAND: code("INVALID_OPERAND"),
	INVALID_PATTERN: code("INVALID_PATTERN"),
	UNRESOLVED_RELATIONSHIP_TARGET: code("UNRESOLVED_RELATIONSHIP_TARGET"),
	COMPOSITE_CYCLE: code("COMPOSITE_CYCLE"),
	V1_1_NODE_IN_V1_0: code("V1_1_NODE_IN_V1_0"),
	UNRESOLVED_IMPORT: code("UNRESOLVED_IMPORT"),
	PACKAGE_CYCLE: code("PACKAGE_CYCLE"),
	STALE_LOCK: code("STALE_LOCK"),
	UNKNOWN_MAPPING_TARGET: code("UNKNOWN_MAPPING_TARGET"),
	UNDECLARED_LOSS: code("UNDECLARED_LOSS"),
	UNKNOWN_REQUIRED_EXTENSION: code("UNKNOWN_REQUIRED_EXTENSION"),
});

const CONTRACTS = "docs/semantic-data-system/contracts-v1.md";
const IR_SCHEMA = "schema/semantic/v1/semantic-ir.schema.json";
const CORPUS_REGISTER = "conformance/diagnostic-codes.json";

/**
 * A ledger row read from a clause that entails the rule. `note` records where
 * the clause entails the *rule* but a parameter of it — a bound, a table — comes
 * from somewhere else, so a reader is not left to assume the whole check is
 * contract.
 */
function fromClause(artifact, quote, note) {
	return Object.freeze({
		provenance: "published-clause",
		artifact,
		quote,
		note,
	});
}

/** A ledger row read from the yardstick's own register rather than a contract. */
function fromCorpus(note) {
	return Object.freeze({
		provenance: "corpus-register",
		artifact: CORPUS_REGISTER,
		note,
	});
}

/**
 * The per-code derivation ledger.
 *
 * An import ban is checkable; transcription is not. This is the disclosure that
 * makes the independence claim falsifiable at all, and it is deliberately
 * unflattering where the honest answer is unflattering:
 * `conformance/diagnostic-codes.json` marks fifteen of its thirty codes
 * `provenance: "minted"`, and a rule read from the yardstick is not a rule read
 * from the contract. A row claiming a published clause carries the quote, and a
 * test asserts that quote occurs verbatim in the named artifact.
 */
export const DERIVATIONS = Object.freeze({
	SCHEMA_VIOLATION: fromCorpus(
		"the corpus mints this code and its own citation entails nothing about the rule; the *rule* — validate against the published schema — is contract, the collapse to one diagnostic at the deepest failing instance location is the corpus's",
	),
	INVALID_DOCUMENT: fromCorpus(
		"the corpus mints this code for a value that is not an input bundle at all; the input-bundle shape is the corpus's own schema, not a published contract",
	),
	PRESENCE_MULTIPLICITY_MISMATCH: fromClause(
		CONTRACTS,
		"`multiplicity { lower, upper?, ordered?, unique? }` (absent `upper` is\nunbounded) from which `presence` is derived",
	),
	INVALID_MULTIPLICITY: fromCorpus(
		"the contract names the two bounds and never says an upper below a lower is a defect; the incoherence is obvious and the rule is still the corpus's, not a clause's",
	),
	FLAGS_ON_NON_COLLECTION: fromCorpus(
		"the contract lists ordered and unique as multiplicity members and never restricts them to a collection; the restriction is the corpus's reading",
	),
	UNIT_ON_NON_SCALAR: fromClause(
		CONTRACTS,
		"may carry a UCUM `unit` when\nits `typeRef` resolves, through aliases, to a scalar.",
	),
	UNRESOLVED_TYPE_REF: fromCorpus(
		"the contract states a resolution rule for relationship targets only; it states none for a field's typeRef, an alias target, a reference target — that last omission is GAP-011 — or an operation return type, so the rule is the corpus's",
	),
	UNRESOLVED_ELEMENT_TYPE: fromCorpus(
		"the contract states resolution for relationship targets and for a field's typeRef through aliases; it states none for a sequence's items or a map's values, so the rule is read from the corpus register",
	),
	UNRESOLVED_VARIANT_PAYLOAD: fromCorpus(
		"as for the element type: the contract names the construct and states no resolution rule for a variant payload",
	),
	UNRESOLVED_OCCURRENCE_DEFINITION: fromCorpus(
		"the contract says definitions and occurrences remain separate and states no resolution rule between them",
	),
	ALIAS_CYCLE: fromCorpus(
		"the contract says recursive type graphs are preserved and are not package cycles, which does not settle whether an alias chain closing on itself is a defect; the rule is the corpus's",
	),
	DEPTH_LIMIT_EXCEEDED: fromClause(
		CONTRACTS,
		"Graph depth,\nreference expansion, collection sizes, input bytes, and diagnostic volume must\nhave declared finite limits and terminate with source-located diagnostics.",
		"the clause entails that a finite bound exists and names no number; 256 is the corpus's declared bound and the disagreement with the compiler's 128 is agent-ix/filament-core-data#62",
	),
	DUPLICATE_IDENTITY: fromClause(
		CONTRACTS,
		"Package, type, field, variant, constraint, occurrence, mapping, and profile\nidentities are explicit.",
	),
	DUPLICATE_FIELD_NAME: fromCorpus(
		"the schema constrains a field name only to be non-empty and the contract states no uniqueness rule for it; the rule is the corpus's",
	),
	DUPLICATE_PARAM: fromCorpus(
		"the contract says operation params are field nodes and states no name-uniqueness rule for them; the rule is the corpus's",
	),
	DUPLICATE_CLAUSE_ID: fromClause(CONTRACTS, "`clauseId` unique\nper type"),
	DANGLING_CLAUSE_REF: fromClause(
		CONTRACTS,
		"`pre[]`/`post[]`\nbound by `clauseId`",
	),
	MISSING_SOURCE_SPAN: fromClause(
		CONTRACTS,
		"`sourceSpan` when source-originated",
	),
	CONSTRAINT_NOT_APPLICABLE: fromClause(
		CONTRACTS,
		"with typed operands per keyword and an applicability table\nover the resolved kind",
		"the clause entails that a table governs applicability and publishes no table; GAP-008 records that, and the table in this module is reconstructed from the keyword semantics",
	),
	INVALID_OPERAND: fromClause(
		CONTRACTS,
		"with typed operands per keyword and an applicability table\nover the resolved kind",
	),
	INVALID_PATTERN: fromClause(
		IR_SCHEMA,
		'"dialect": {\n\t\t\t\t\t\t\t\t\t"const": "ecma-262"',
	),
	UNRESOLVED_RELATIONSHIP_TARGET: fromClause(
		CONTRACTS,
		"Relationship targets resolve to a document type or a lock",
	),
	COMPOSITE_CYCLE: fromClause(
		CONTRACTS,
		"composite relationship graphs are acyclic",
	),
	V1_1_NODE_IN_V1_0: fromCorpus(
		"the schema does not version-gate the 1.1.0 nodes, which the corpus records as GAP-001; the rule that a 1.0.0 document may not carry them is the corpus's reading",
	),
	UNRESOLVED_IMPORT: fromCorpus(
		"the contract says locks resolve the complete dependency graph; it states no diagnostic for an import the lock omits, so the rule is the corpus's",
	),
	PACKAGE_CYCLE: fromClause(
		CONTRACTS,
		"Package cycles are rejected with every\nlocus.",
	),
	STALE_LOCK: fromCorpus(
		"the contract states what a fingerprint includes and excludes; it states no staleness rule between an IR's recorded manifest digest and the bundle's manifest, so the rule is the corpus's",
	),
	UNKNOWN_MAPPING_TARGET: fromCorpus(
		"the contract says mappings name correspondences; it states no resolution rule for a mapping's sourceType against the document, so the rule is the corpus's",
	),
	UNDECLARED_LOSS: fromClause(CONTRACTS, "Declared loss lists"),
	UNKNOWN_REQUIRED_EXTENSION: fromClause(
		CONTRACTS,
		"Missing versions, imports, adapters, contradictory identities, and\nunknown required capabilities fail with diagnostics and no empty-model success.",
	),
});

/**
 * The declared graph-depth bound: 256, the bound the conformance corpus
 * declares and the bound an adapter answer is compared against.
 *
 * `src/compiler/diagnostics.mjs` carries a `DEFAULT_LIMITS.maxDepth` of 128 for
 * the compiler, which is half this. The two are different numbers for two
 * different components and the disagreement is recorded as
 * `agent-ix/filament-core-data#62`; this module cites it and does not resolve
 * it, and it deliberately does not read that ambient default.
 */
export const MAX_DEPTH = 256;

/** The bounds applied where a caller supplies none. */
export const DECLARED_LIMITS = Object.freeze({
	maxDepth: MAX_DEPTH,
	maxNodes: 1_000_000,
	maxCollectionItems: 100_000,
	maxDiagnostics: 1_000,
});

/** The published schema files a caller must supply through `readSchema`. */
export const SCHEMA_FILES = Object.freeze([
	"conformance/schema/input-bundle.schema.json",
	"schema/semantic/v1/semantic-ir.schema.json",
	"schema/semantic/v1/common.schema.json",
	"schema/semantic/v1/package-manifest.schema.json",
	"schema/semantic/v1/package-lock.schema.json",
	"schema/semantic/v1/profile.schema.json",
	"schema/semantic/v1/mapping.schema.json",
	"schema/semantic/v1/consumer-policy.schema.json",
]);

const BUNDLE_SCHEMA_ID =
	"https://schemas.agent-ix.org/filament-core-data/conformance/v1/input-bundle.schema.json";

const BACKEND_IDENTITY = "ix://agent-ix/filament-core-data/backend/typescript";

let validatorCache;
let validatorKey;

function bundleValidator(schemas) {
	const key = schemas;
	if (validatorCache !== undefined && validatorKey === key) {
		return validatorCache;
	}
	const ajv = new Ajv2020({
		strict: false,
		allErrors: true,
		validateFormats: true,
	});
	addFormats(ajv);
	for (const schema of schemas) ajv.addSchema(schema);
	validatorCache = ajv.getSchema(BUNDLE_SCHEMA_ID);
	validatorKey = key;
	return validatorCache;
}

/* ------------------------------------------------------------------ pointers */

function escapeSegment(segment) {
	return String(segment).replaceAll("~", "~0").replaceAll("/", "~1");
}

function pointerOf(...segments) {
	return segments.map((segment) => `/${escapeSegment(segment)}`).join("");
}

function depthOf(pointer) {
	return pointer === "" ? 0 : pointer.split("/").length - 1;
}

function parentOf(pointer) {
	const cut = pointer.lastIndexOf("/");
	return cut <= 0 ? "" : pointer.slice(0, cut);
}

function commonPrefix(pointers) {
	let prefix = pointers[0];
	for (const pointer of pointers.slice(1)) {
		while (prefix !== "" && !`${pointer}/`.startsWith(`${prefix}/`)) {
			prefix = parentOf(prefix);
		}
	}
	return prefix;
}

/* ------------------------------------------------------------------- ordering */

function compareCodeUnits(left, right) {
	if (left === right) return 0;
	return left < right ? -1 : 1;
}

/* ------------------------------------------------------------------ diagnostic */

/** Whether a value is usable as a `common.schema.json#/$defs/sourceLocus`. */
function usableLocus(value) {
	return (
		value !== null &&
		typeof value === "object" &&
		!Array.isArray(value) &&
		typeof value.sourceIdentity === "string" &&
		typeof value.path === "string" &&
		value.path.length > 0 &&
		Number.isInteger(value.startLine) &&
		value.startLine >= 1 &&
		Number.isInteger(value.startColumn) &&
		value.startColumn >= 1
	);
}

/**
 * Build one `{ pointer, diagnostic }` row. The RFC 6901 pointer sits *beside*
 * the diagnostic and never inside it: `common.schema.json#/$defs/diagnostic` is
 * `additionalProperties: false` and carries no member for an in-document
 * location, which the corpus records as GAP-003.
 */
function diagnostic(entry, pointer, message, { owner, locus } = {}) {
	const built = {
		code: entry.code,
		severity: entry.severity,
		message,
		owner: owner ?? BACKEND_IDENTITY,
		blocking: entry.blocking,
		causes: [],
		related: [],
	};
	if (usableLocus(locus)) built.locus = locus;
	return { pointer, diagnostic: built };
}

/* -------------------------------------------------------------------- reading */

/** The empty resolvable set, for a bundle that declares no exports. */
const EMPTY = new Set();

const isObject = (value) =>
	value !== null && typeof value === "object" && !Array.isArray(value);

/**
 * The locus a node carries: its `origin.source`, and a clause's `sourceSpan`
 * only where the node carries no origin at all.
 *
 * The order matters and the corpus settles it. A clause carries both, and they
 * are not the same value — `core-1-1`'s first Root clause has an `origin.source`
 * of `root.tsp:9:3` and a `sourceSpan` of `root.tsp:9:3` through `9:24` — and
 * the expected diagnostic for CLAUSE-006 carries the origin, with no `endLine`
 * and no `endColumn`. `origin` is also the member every node carries, which
 * makes it the general rule and the span the fallback rather than the reverse.
 */
function locusOf(node) {
	if (!isObject(node)) return undefined;
	if (isObject(node.origin) && usableLocus(node.origin.source)) {
		return node.origin.source;
	}
	if (usableLocus(node.sourceSpan)) return node.sourceSpan;
	return undefined;
}

/** The first locus on the chain from the failing node outwards. */
function nearestLocus(...nodes) {
	for (const node of nodes) {
		const locus = locusOf(node);
		if (locus !== undefined) return locus;
	}
	return undefined;
}

/** The first `ix://` identity on the chain from the failing node outwards. */
function nearestOwner(...nodes) {
	for (const node of nodes) {
		if (isObject(node) && typeof node.identity === "string") {
			if (node.identity.startsWith("ix://")) return node.identity;
		}
	}
	return undefined;
}

/* ------------------------------------------------------------ the type graph */

const SCALAR_KINDS = new Set(["scalar"]);
const ALIAS_KINDS = new Set(["alias", "reference"]);

/**
 * Follow a chain of aliases and references. Returns one of
 * `{ state: "resolved", type }`, `{ state: "absent" }`, `{ state: "cycle" }`,
 * or `{ state: "depth" }`.
 *
 * A cycle is reported before a depth bound, because a cycle is the more
 * specific fact and a depth report would hide it. The bound is `hops > maxDepth`
 * — a chain of exactly `maxDepth` hops resolves.
 */
function resolveChain(types, identity, maxDepth) {
	const seen = new Set();
	let current = identity;
	let hops = 0;
	for (;;) {
		if (typeof current !== "string") return { state: "absent" };
		if (seen.has(current)) return { state: "cycle" };
		seen.add(current);
		const type = types.get(current);
		if (type === undefined) return { state: "absent" };
		if (!ALIAS_KINDS.has(type.kind)) return { state: "resolved", type };
		hops += 1;
		if (hops > maxDepth) return { state: "depth" };
		current = type.target;
	}
}

/** The scalar a reference resolves to through aliases, or undefined. */
function resolvedScalar(types, identity, maxDepth) {
	const chain = resolveChain(types, identity, maxDepth);
	if (chain.state !== "resolved") return undefined;
	return SCALAR_KINDS.has(chain.type.kind) ? chain.type.scalar : undefined;
}

/** The kind a reference resolves to through aliases, or undefined. */
function resolvedKind(types, identity, maxDepth) {
	const chain = resolveChain(types, identity, maxDepth);
	return chain.state === "resolved" ? chain.type.kind : undefined;
}

/* --------------------------------------------------- constraint applicability */

/**
 * The applicability table. `docs/semantic-data-system/contracts-v1.md` names it
 * — "an applicability table over the resolved kind" — and publishes it nowhere,
 * which `conformance/contract-gaps.json` records as GAP-008. It is reconstructed
 * here from the keyword semantics rather than imported from
 * `src/compiler/ir/applicability.mjs`, which FR-068-CON-1 forbids.
 */
const APPLICABILITY = Object.freeze({
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

const NUMERIC_SCALARS = new Set(["integer", "number"]);
const TEMPORAL_SCALARS = new Set(["date", "datetime", "duration"]);

/* ---------------------------------------------------------------- 1.1.0 nodes */

const V1_1_TYPE_NODES = ["relationships", "operations", "clauses"];

/* ----------------------------------------------------------------- the reader */

/**
 * Decide whether a conformance input bundle is admissible for generation.
 *
 * Returns `{ resultState, diagnostics, suppressions }`. Never throws for any
 * bundle: every refusal is a returned diagnostic. Leaves its argument
 * byte-identical.
 *
 * `options.readSchema(fileName)` supplies the published schemas, because no
 * module in this directory may touch the Node filesystem module;
 * `options.schemas` supplies them directly. `options.limits` overrides `DECLARED_LIMITS`.
 * `options.referencePolicy` is the GAP-011 setting and defaults to the one
 * `loss.mjs` declares.
 */
export function admitIr(bundle, options = {}) {
	const limits = { ...DECLARED_LIMITS, ...(options.limits ?? {}) };
	const referencePolicy = options.referencePolicy ?? REFERENCE_POLICY;
	const diagnostics = [];
	const suppressions = [];

	const suppress = (rule, missing) => {
		suppressions.push({ rule, identity: missing });
	};

	/* -- layer 1: structural ------------------------------------------------ */

	if (!isObject(bundle) || !isObject(bundle.ir)) {
		diagnostics.push(
			diagnostic(
				ADMISSIBILITY_CODES.INVALID_DOCUMENT,
				"",
				"the value is not a conformance input bundle",
			),
		);
		return finish(diagnostics, suppressions, limits);
	}

	const schemas =
		options.schemas ??
		(options.readSchema === undefined
			? undefined
			: SCHEMA_FILES.map((file) => options.readSchema(file)));
	if (schemas === undefined) {
		// A caller defect, not a document defect: the seam distinguishes the two,
		// and a missing schema source cannot be reported as a property of the
		// document being judged.
		throw new TypeError(
			"admitIr needs options.schemas or options.readSchema; see SCHEMA_FILES",
		);
	}

	const validate = bundleValidator(schemas);
	if (!validate(bundle)) {
		for (const row of collapseSchemaErrors(validate.errors, bundle)) {
			diagnostics.push(row);
		}
		return finish(diagnostics, suppressions, limits);
	}

	/* -- layer 2: cross-field ----------------------------------------------- */

	const ir = bundle.ir;
	const types = new Map();
	for (const type of ir.types) {
		if (isObject(type) && !types.has(type.identity)) {
			types.set(type.identity, type);
		}
	}
	const maxDepth = limits.maxDepth;
	const version = ir.contractVersion;

	/*
	 * The imported-export set, or `undefined` when the bundle cannot supply it.
	 * A relationship target — and, under GAP-011's open reading, a reference
	 * target — may name an identity an imported package exports rather than one
	 * this document declares, so the rule needs the manifest. Three of the four
	 * committed bases carry only `ir`, and deciding the rule anyway would be a
	 * guess that happens to agree, which is indistinguishable from a decision.
	 */
	const importedExports = isObject(bundle.manifest)
		? new Set(
				(bundle.manifest.exports ?? [])
					.map((entry) => entry?.typeIdentity)
					.filter((identity) => typeof identity === "string"),
			)
		: undefined;

	const emit = (entry, pointer, message, context) => {
		diagnostics.push(diagnostic(entry, pointer, message, context));
	};

	/*
	 * The node and collection bounds.
	 *
	 * `contracts-v1.md` requires that "collection sizes, input bytes, and
	 * diagnostic volume must have declared finite limits and terminate with
	 * source-located diagnostics", and the register carries a code for the depth
	 * bound and for none of the others. Minting one would put a code outside the
	 * closed register, which FR-068 forbids, so a bundle over either bound stops
	 * the cross-field layer and records a *suppression* naming the bound: the
	 * rules that did not run are visible rather than reported as rules that
	 * passed. That the register has no code for these two bounds is a gap in the
	 * published register, not a licence to invent one.
	 */
	if (countNodes(ir, limits.maxNodes) > limits.maxNodes) {
		suppress("cross-field-rules", "maxNodes");
		return finish(diagnostics, suppressions, limits);
	}
	const widest = widestCollection(ir);
	if (widest > limits.maxCollectionItems) {
		suppress("cross-field-rules", "maxCollectionItems");
		return finish(diagnostics, suppressions, limits);
	}

	/* identity uniqueness, across every list the document carries */
	const seenIdentities = new Set();
	const claimIdentity = (node, pointer, owner, locus) => {
		if (!isObject(node) || typeof node.identity !== "string") return;
		if (seenIdentities.has(node.identity)) {
			emit(
				ADMISSIBILITY_CODES.DUPLICATE_IDENTITY,
				`${pointer}/identity`,
				"a semantic identity is declared once in one document",
				{ owner: owner ?? node.identity, locus },
			);
			return;
		}
		seenIdentities.add(node.identity);
	};
	/*
	 * An extension describes a capability carried by its enclosing node. It is
	 * consequently unique only among that node's extensions, not among the
	 * document declarations. In particular, each package-local kernel scalar
	 * may carry the same ext/kernel-scalar capability.
	 */
	const claimExtensions = (node, pointer, owner, locus) => {
		const seen = new Set();
		for (const [position, extension] of (node?.extensions ?? []).entries()) {
			if (!isObject(extension) || typeof extension.identity !== "string") continue;
			if (seen.has(extension.identity)) {
				emit(
					ADMISSIBILITY_CODES.DUPLICATE_IDENTITY,
					`${pointer}/extensions/${position}/identity`,
					"an extension identity is declared once by one node",
					{ owner: owner ?? extension.identity, locus },
				);
				continue;
			}
			seen.add(extension.identity);
		}
	};

	for (const [index, type] of ir.types.entries()) {
		const typePointer = pointerOf("ir", "types", index);
		const typeLocus = locusOf(type);
		claimIdentity(type, typePointer, type.identity, typeLocus);
		claimExtensions(type, typePointer, type.identity, typeLocus);

		/* 1.1.0-only nodes in a 1.0.0 document */
		if (version === "1.0.0") {
			for (const node of V1_1_TYPE_NODES) {
				if (type[node] !== undefined) {
					emit(
						ADMISSIBILITY_CODES.V1_1_NODE_IN_V1_0,
						`${typePointer}/${node}`,
						"a contract 1.0.0 document carries no 1.1.0 node",
						{ owner: type.identity, locus: typeLocus },
					);
				}
			}
		}

		/* element and payload resolution */
		if (type.kind === "sequence" && !types.has(type.items)) {
			emit(
				ADMISSIBILITY_CODES.UNRESOLVED_ELEMENT_TYPE,
				`${typePointer}/items`,
				"a sequence item type resolves to a declared type",
				{ owner: type.identity, locus: typeLocus },
			);
		}
		if (type.kind === "map" && !types.has(type.values)) {
			emit(
				ADMISSIBILITY_CODES.UNRESOLVED_ELEMENT_TYPE,
				`${typePointer}/values`,
				"a map value type resolves to a declared type",
				{ owner: type.identity, locus: typeLocus },
			);
		}

		/*
		 * Alias and reference targets.
		 *
		 * A resolution diagnostic names the member whose value is not declared,
		 * not every member that transitively reaches it. `core-1-1`'s `NodeRef`
		 * is a reference to `Absent`, and `Root`'s field names `NodeRef`, which
		 * *is* declared; REF-002 expects one diagnostic, at `NodeRef`'s own
		 * target. Every other resolution code in the register points the same
		 * way — at `/items`, `/values`, `/payloadType`, `/definition`, or
		 * `/relationships/N/target` — so the chain walk below exists for cycles
		 * and for the depth bound, and declaredness is what decides resolution.
		 */
		if (ALIAS_KINDS.has(type.kind)) {
			const strictReference =
				type.kind !== "reference" || referencePolicy === "strict";
			const chain = resolveChain(types, type.identity, maxDepth);
			if (chain.state === "cycle") {
				emit(
					ADMISSIBILITY_CODES.ALIAS_CYCLE,
					`${typePointer}/target`,
					"an alias chain closes on itself and resolves to nothing",
					{ owner: type.identity, locus: typeLocus },
				);
			} else if (chain.state === "depth") {
				emit(
					ADMISSIBILITY_CODES.DEPTH_LIMIT_EXCEEDED,
					`${typePointer}/target`,
					"alias expansion is bounded at the declared finite depth",
					{ owner: type.identity, locus: typeLocus },
				);
			} else if (!types.has(type.target) && strictReference) {
				emit(
					ADMISSIBILITY_CODES.UNRESOLVED_TYPE_REF,
					`${typePointer}/target`,
					"the alias target resolves to no declared type",
					{ owner: type.identity, locus: typeLocus },
				);
			}
		}

		/* variants */
		const variantNames = new Set();
		for (const [position, variant] of (type.variants ?? []).entries()) {
			const variantPointer = `${typePointer}/variants/${position}`;
			const variantLocus = nearestLocus(variant, type);
			claimIdentity(variant, variantPointer, variant?.identity, variantLocus);
			claimExtensions(variant, variantPointer, variant?.identity, variantLocus);
			variantNames.add(variant?.name);
			if (
				variant?.payloadType !== undefined &&
				!types.has(variant.payloadType)
			) {
				emit(
					ADMISSIBILITY_CODES.UNRESOLVED_VARIANT_PAYLOAD,
					`${variantPointer}/payloadType`,
					"a variant payload type resolves to a declared type",
					{ owner: variant.identity, locus: variantLocus },
				);
			}
		}

		/* constraints */
		for (const [position, constraint] of (type.constraints ?? []).entries()) {
			const constraintPointer = `${typePointer}/constraints/${position}`;
			const constraintLocus = nearestLocus(constraint, type);
			claimIdentity(
				constraint,
				constraintPointer,
				constraint?.identity,
				constraintLocus,
			);
			claimExtensions(constraint, constraintPointer, constraint?.identity, constraintLocus);
			if (!isObject(constraint)) continue;
			const subject = resolvedScalar(types, constraint.appliesTo, maxDepth);
			const subjectKind = resolvedKind(types, constraint.appliesTo, maxDepth);
			const admitted = APPLICABILITY[constraint.keyword] ?? [];
			const applies =
				(subject !== undefined && admitted.includes(subject)) ||
				(subjectKind !== undefined && admitted.includes(subjectKind));
			if (!applies) {
				emit(
					ADMISSIBILITY_CODES.CONSTRAINT_NOT_APPLICABLE,
					constraintPointer,
					"a constraint keyword applies to the kind its subject resolves to",
					{ owner: constraint.identity, locus: constraintLocus },
				);
				continue;
			}
			const operandRow = operandDefect(constraint, subject);
			if (operandRow !== undefined) {
				emit(
					ADMISSIBILITY_CODES.INVALID_OPERAND,
					`${constraintPointer}/operands/${operandRow}`,
					"a bound operand is typed for the scalar its subject resolves to",
					{ owner: constraint.identity, locus: constraintLocus },
				);
			}
			if (constraint.keyword === "pattern") {
				try {
					// biome-ignore lint/complexity/useRegexLiterals: the pattern is data
					new RegExp(constraint.operands?.regex ?? "");
				} catch {
					emit(
						ADMISSIBILITY_CODES.INVALID_PATTERN,
						`${constraintPointer}/operands/regex`,
						"a pattern operand compiles under the declared dialect",
						{ owner: constraint.identity, locus: constraintLocus },
					);
				}
			}
		}

		/* fields */
		const fieldNames = new Set();
		for (const [position, field] of (type.fields ?? []).entries()) {
			const fieldPointer = `${typePointer}/fields/${position}`;
			const fieldLocus = nearestLocus(field, type);
			claimIdentity(field, fieldPointer, field?.identity, fieldLocus);
			claimExtensions(field, fieldPointer, field?.identity, fieldLocus);
			if (!isObject(field)) continue;

			if (fieldNames.has(field.name)) {
				emit(
					ADMISSIBILITY_CODES.DUPLICATE_FIELD_NAME,
					`${fieldPointer}/name`,
					"field names are unique within a record",
					{ owner: field.identity, locus: fieldLocus },
				);
			}
			fieldNames.add(field.name);

			fieldChecks(field, fieldPointer, fieldLocus);
		}

		/* relationships */
		for (const [position, relationship] of (
			type.relationships ?? []
		).entries()) {
			const relationshipPointer = `${typePointer}/relationships/${position}`;
			const relationshipLocus = nearestLocus(relationship, type);
			claimIdentity(
				relationship,
				relationshipPointer,
				relationship?.identity,
				relationshipLocus,
			);
			claimExtensions(relationship, relationshipPointer, relationship?.identity, relationshipLocus);
			if (!isObject(relationship)) continue;
			/*
			 * "Relationship targets resolve to a document type or a lock export"
			 * (contracts-v1.md). A bundle carrying no manifest carries no lock
			 * export, so the disjunction collapses to the document's own
			 * declarations and the rule is decided rather than suppressed — this
			 * is the clause read literally, not an assumed value for a missing
			 * input. FR-068 names exactly six input-dependent rules and this is
			 * not one of them.
			 */
			const exported = importedExports ?? EMPTY;
			if (
				!types.has(relationship.target) &&
				!exported.has(relationship.target)
			) {
				emit(
					ADMISSIBILITY_CODES.UNRESOLVED_RELATIONSHIP_TARGET,
					`${relationshipPointer}/target`,
					"a relationship target resolves to a document type or a lock export",
					{ owner: relationship.identity, locus: relationshipLocus },
				);
			}
		}

		/* operations */
		for (const [position, operation] of (type.operations ?? []).entries()) {
			const operationPointer = `${typePointer}/operations/${position}`;
			const operationLocus = nearestLocus(operation, type);
			claimIdentity(
				operation,
				operationPointer,
				operation?.identity,
				operationLocus,
			);
			claimExtensions(operation, operationPointer, operation?.identity, operationLocus);
			if (!isObject(operation)) continue;
			const paramNames = new Set();
			for (const [slot, param] of (operation.params ?? []).entries()) {
				const paramPointer = `${operationPointer}/params/${slot}`;
				const paramLocus = nearestLocus(param, operation, type);
				claimIdentity(param, paramPointer, param?.identity, paramLocus);
				claimExtensions(param, paramPointer, param?.identity, paramLocus);
				if (!isObject(param)) continue;
				if (paramNames.has(param.name)) {
					emit(
						ADMISSIBILITY_CODES.DUPLICATE_PARAM,
						`${paramPointer}/name`,
						"parameter names are unique within an operation",
						{ owner: param.identity, locus: paramLocus },
					);
				}
				paramNames.add(param.name);
				fieldChecks(param, paramPointer, paramLocus);
			}
			const declared = new Set(
				(type.clauses ?? []).map((clause) => clause?.clauseId),
			);
			for (const list of ["pre", "post"]) {
				for (const [slot, reference] of (operation[list] ?? []).entries()) {
					if (!declared.has(reference)) {
						emit(
							ADMISSIBILITY_CODES.DANGLING_CLAUSE_REF,
							`${operationPointer}/${list}/${slot}`,
							"a precondition names a clauseId the type declares",
							{ owner: operation.identity, locus: operationLocus },
						);
					}
				}
			}
			if (
				isObject(operation.returns) &&
				!types.has(operation.returns.typeRef)
			) {
				emit(
					ADMISSIBILITY_CODES.UNRESOLVED_TYPE_REF,
					`${operationPointer}/returns/typeRef`,
					"an operation return type resolves to a declared type",
					{ owner: operation.identity, locus: operationLocus },
				);
			}
		}

		/* clauses */
		const clauseIds = new Set();
		for (const [position, clause] of (type.clauses ?? []).entries()) {
			const clausePointer = `${typePointer}/clauses/${position}`;
			const clauseLocus = nearestLocus(clause, type);
			claimIdentity(clause, clausePointer, clause?.identity, clauseLocus);
			claimExtensions(clause, clausePointer, clause?.identity, clauseLocus);
			if (!isObject(clause)) continue;
			if (clauseIds.has(clause.clauseId)) {
				emit(
					ADMISSIBILITY_CODES.DUPLICATE_CLAUSE_ID,
					`${clausePointer}/clauseId`,
					"a clauseId is declared once per type",
					{ owner: clause.identity, locus: clauseLocus },
				);
			}
			clauseIds.add(clause.clauseId);
			const sourceOriginated =
				isObject(clause.origin) && clause.origin.source !== undefined;
			if (sourceOriginated && !usableLocus(clause.sourceSpan)) {
				emit(
					ADMISSIBILITY_CODES.MISSING_SOURCE_SPAN,
					`${clausePointer}/sourceSpan`,
					"a source-originated clause carries a source span",
					{ owner: clause.identity, locus: clauseLocus },
				);
			}
		}

	}

	function fieldChecks(field, fieldPointer, fieldLocus) {
		const owner = field.identity;
		const multiplicity = field.multiplicity;

		if (version === "1.0.0") {
			for (const node of ["multiplicity", "unit"]) {
				if (field[node] !== undefined) {
					emit(
						ADMISSIBILITY_CODES.V1_1_NODE_IN_V1_0,
						`${fieldPointer}/${node}`,
						"a contract 1.0.0 document carries no 1.1.0 node",
						{ owner, locus: fieldLocus },
					);
				}
			}
		}

		if (isObject(multiplicity)) {
			const lower = multiplicity.lower;
			const upper = multiplicity.upper;
			if (typeof upper === "number" && upper < lower) {
				emit(
					ADMISSIBILITY_CODES.INVALID_MULTIPLICITY,
					`${fieldPointer}/multiplicity/upper`,
					"a multiplicity upper bound is not below its lower bound",
					{ owner, locus: fieldLocus },
				);
			}
			const collection = upper === undefined || upper > 1;
			if (
				!collection &&
				(multiplicity.ordered !== undefined ||
					multiplicity.unique !== undefined)
			) {
				emit(
					ADMISSIBILITY_CODES.FLAGS_ON_NON_COLLECTION,
					`${fieldPointer}/multiplicity`,
					"ordered and unique appear only on a collection",
					{ owner, locus: fieldLocus },
				);
			}
			const derived = lower >= 1 ? "required" : "optional";
			if (field.presence !== derived) {
				emit(
					ADMISSIBILITY_CODES.PRESENCE_MULTIPLICITY_MISMATCH,
					`${fieldPointer}/presence`,
					"presence agrees with the multiplicity lower bound",
					{ owner, locus: fieldLocus },
				);
			}
		}

		if (field.unit !== undefined) {
			if (resolvedScalar(types, field.typeRef, maxDepth) === undefined) {
				emit(
					ADMISSIBILITY_CODES.UNIT_ON_NON_SCALAR,
					`${fieldPointer}/unit`,
					"a unit appears only on a field resolving to a scalar",
					{ owner, locus: fieldLocus },
				);
			}
		}

		if (!types.has(field.typeRef)) {
			emit(
				ADMISSIBILITY_CODES.UNRESOLVED_TYPE_REF,
				`${fieldPointer}/typeRef`,
				"a field type reference resolves to a declared type",
				{ owner, locus: fieldLocus },
			);
		}
	}

	/* occurrences */
	for (const [index, occurrence] of (ir.occurrences ?? []).entries()) {
		const occurrencePointer = pointerOf("ir", "occurrences", index);
		claimIdentity(
			occurrence,
			occurrencePointer,
			occurrence?.identity,
			undefined,
		);
		claimExtensions(occurrence, occurrencePointer, occurrence?.identity, undefined);
		if (!isObject(occurrence)) continue;
		if (!types.has(occurrence.definition)) {
			emit(
				ADMISSIBILITY_CODES.UNRESOLVED_OCCURRENCE_DEFINITION,
				`${occurrencePointer}/definition`,
				"an occurrence names a definition a type declares",
				{ owner: occurrence.identity },
			);
		}
	}

	/* composite relationship cycles: report the edge that closes the cycle */
	compositeCycles(ir, types, emit);

	/* document extensions */
	const policy = bundle.consumerPolicy;
	claimExtensions(ir, pointerOf("ir"), ir.package?.identity, undefined);
	for (const [index, extension] of (ir.extensions ?? []).entries()) {
		const extensionPointer = pointerOf("ir", "extensions", index);
		if (!isObject(extension) || extension.required !== true) continue;
		if (!isObject(policy)) {
			suppress("unknown-required-extension", extension.identity);
			continue;
		}
		const declared = new Set(bundle.manifest?.extensions ?? []);
		if (
			policy.unknownExtensions === "reject" &&
			!declared.has(extension.identity)
		) {
			emit(
				ADMISSIBILITY_CODES.UNKNOWN_REQUIRED_EXTENSION,
				`${extensionPointer}/identity`,
				"a required extension names a capability the consumer policy admits",
				{ owner: extension.identity },
			);
		}
	}

	/* package context */
	packageChecks(bundle, ir, types, emit, suppress);

	return finish(diagnostics, suppressions, limits);
}

/** Nodes in a document, counted no further than `cap`. */
function countNodes(value, cap) {
	let seen = 0;
	const stack = [value];
	while (stack.length > 0 && seen <= cap) {
		const node = stack.pop();
		seen += 1;
		if (Array.isArray(node)) {
			for (const member of node) stack.push(member);
		} else if (isObject(node)) {
			for (const key of Object.keys(node)) stack.push(node[key]);
		}
	}
	return seen;
}

/** The widest array in a document. */
function widestCollection(value) {
	let widest = 0;
	const stack = [value];
	while (stack.length > 0) {
		const node = stack.pop();
		if (Array.isArray(node)) {
			if (node.length > widest) widest = node.length;
			for (const member of node) stack.push(member);
		} else if (isObject(node)) {
			for (const key of Object.keys(node)) stack.push(node[key]);
		}
	}
	return widest;
}

/* ---------------------------------------------------------- package-level rules */

function packageChecks(bundle, ir, types, emit, suppress) {
	const manifest = bundle.manifest;
	const lock = bundle.lock;
	const mappings = bundle.mappings;
	const policy = bundle.consumerPolicy;

	/* unresolved imports */
	if (!isObject(manifest)) {
		suppress("unresolved-import", "manifest");
	} else if (!isObject(lock)) {
		suppress("unresolved-import", "lock");
	} else {
		const locked = new Set(
			(lock.packages ?? []).map((entry) => entry?.identity),
		);
		for (const [index, entry] of (manifest.imports ?? []).entries()) {
			if (!locked.has(entry?.packageIdentity)) {
				emit(
					ADMISSIBILITY_CODES.UNRESOLVED_IMPORT,
					pointerOf("manifest", "imports", index, "packageIdentity"),
					"an import names a package the lock resolves",
					{},
				);
			}
		}
	}

	/* package cycles */
	if (!isObject(lock)) {
		suppress("package-cycle", "lock");
	} else {
		reportPackageCycle(lock, emit);
	}

	/* stale lock */
	if (bundle.manifestDigest === undefined) {
		suppress("stale-lock", "manifestDigest");
	} else if (bundle.manifestDigest !== ir.package?.manifestDigest) {
		emit(
			ADMISSIBILITY_CODES.STALE_LOCK,
			pointerOf("ir", "package", "manifestDigest"),
			"the IR names the manifest digest the bundle's manifest hashes to",
			{},
		);
	}

	/* mapping targets */
	if (!Array.isArray(mappings)) {
		suppress("unknown-mapping-target", "mappings");
	} else {
		for (const [index, mapping] of mappings.entries()) {
			if (!isObject(mapping)) continue;
			if (!types.has(mapping.sourceType)) {
				emit(
					ADMISSIBILITY_CODES.UNKNOWN_MAPPING_TARGET,
					pointerOf("mappings", index, "sourceType"),
					"a mapping names a semantic identity a declaration owns",
					{ owner: mapping.identity },
				);
			}
		}
	}

	/* undeclared loss */
	if (!isObject(manifest)) {
		suppress("undeclared-loss", "manifest");
	} else {
		const exported = new Set(
			(manifest.exports ?? []).map((entry) => entry?.typeIdentity),
		);
		const omitted = new Set(bundle.profile?.allowedOmissions ?? []);
		for (const [index, type] of ir.types.entries()) {
			if (!isObject(type)) continue;
			const entity = (type.roles ?? []).some((role) =>
				role.endsWith(":entity"),
			);
			if (!entity) continue;
			if (exported.has(type.identity) || omitted.has(type.identity)) continue;
			emit(
				ADMISSIBILITY_CODES.UNDECLARED_LOSS,
				pointerOf("ir", "types", index, "identity"),
				"an entity type the manifest exports or the profile declares omitted",
				{ owner: type.identity, locus: locusOf(type) },
			);
		}
	}

	if (!isObject(policy)) {
		suppress("unknown-required-extension", "consumerPolicy");
	}
}

/** Depth-first search reporting the edge that closes a composite cycle. */
function compositeCycles(ir, types, emit) {
	const edges = new Map();
	const locate = new Map();
	for (const [index, type] of ir.types.entries()) {
		if (!isObject(type)) continue;
		const outgoing = [];
		for (const [position, relationship] of (
			type.relationships ?? []
		).entries()) {
			if (!isObject(relationship) || relationship.composite !== true) continue;
			outgoing.push(relationship.target);
			locate.set(`${type.identity} ${relationship.target}`, {
				pointer: pointerOf(
					"ir",
					"types",
					index,
					"relationships",
					position,
					"target",
				),
				owner: relationship.identity,
				locus: nearestLocus(relationship, type),
			});
		}
		edges.set(type.identity, outgoing);
	}
	const state = new Map();
	const reported = new Set();
	const walk = (identity) => {
		state.set(identity, "open");
		for (const target of edges.get(identity) ?? []) {
			if (state.get(target) === "open") {
				const key = `${identity} ${target}`;
				if (!reported.has(key)) {
					reported.add(key);
					const site = locate.get(key);
					if (site !== undefined) {
						emit(
							ADMISSIBILITY_CODES.COMPOSITE_CYCLE,
							site.pointer,
							"the graph of composite relationships is acyclic",
							{ owner: site.owner, locus: site.locus },
						);
					}
				}
				continue;
			}
			if (!state.has(target) && edges.has(target)) walk(target);
		}
		state.set(identity, "closed");
	};
	for (const identity of edges.keys()) {
		if (!state.has(identity)) walk(identity);
	}
	void types;
}

/** Depth-first search reporting the dependency list that closes a lock cycle. */
function reportPackageCycle(lock, emit) {
	const packages = lock.packages ?? [];
	const index = new Map();
	for (const [position, entry] of packages.entries()) {
		if (isObject(entry)) index.set(entry.identity, { position, entry });
	}
	const state = new Map();
	const reported = new Set();
	const walk = (identity) => {
		state.set(identity, "open");
		const node = index.get(identity);
		for (const dependency of node?.entry.dependencies ?? []) {
			if (state.get(dependency) === "open") {
				if (!reported.has(identity)) {
					reported.add(identity);
					emit(
						ADMISSIBILITY_CODES.PACKAGE_CYCLE,
						pointerOf("lock", "packages", node.position, "dependencies"),
						"the lock package graph is acyclic",
						{},
					);
				}
				continue;
			}
			if (!state.has(dependency) && index.has(dependency)) walk(dependency);
		}
		state.set(identity, "closed");
	};
	for (const identity of index.keys()) {
		if (!state.has(identity)) walk(identity);
	}
}

/* ------------------------------------------------------------------- operands */

/** The operand member at fault, or undefined when the operand is well typed. */
function operandDefect(constraint, subject) {
	const operands = constraint.operands ?? {};
	switch (constraint.keyword) {
		case "min":
		case "max":
		case "exclusiveMin":
		case "exclusiveMax": {
			const value = operands.value;
			if (NUMERIC_SCALARS.has(subject) && typeof value !== "number") {
				return "value";
			}
			if (TEMPORAL_SCALARS.has(subject) && typeof value !== "string") {
				return "value";
			}
			return undefined;
		}
		case "minLength":
		case "maxLength":
			return Number.isInteger(operands.value) && operands.value >= 0
				? undefined
				: "value";
		case "enumValues":
			return Array.isArray(operands.values) && operands.values.length > 0
				? undefined
				: "values";
		default:
			return undefined;
	}
}

/* --------------------------------------------------------- schema collapse */

/**
 * Collapse a JSON Schema error list to the diagnostics a reader reports.
 *
 * The rule, derived from the ten committed corpus cases whose expectation is a
 * `SCHEMA_VIOLATION` and stated here so it can be argued with:
 *
 *  1. take the deepest instance locations the validator reported;
 *  2. where exactly one location is deepest, report there — this is the plain
 *     case, and it is what `SCAL-002`, `UNK-002`, `REL-006`, `CLAUSE-006`,
 *     `ENV-002`, `ENV-004`, `PROV-002`, `ENUM-002` and `DEF-002` expect;
 *  3. where several locations tie for deepest, walk up to their nearest common
 *     ancestor that the validator also reported, and report there — this is the
 *     `oneOf` cascade, and it is what `CONS-005` expects at
 *     `/ir/types/0/constraints/0` rather than at the two members underneath it;
 *  4. where that ancestor is the document root and more than one location tied,
 *     report one diagnostic per tied location rather than collapsing two
 *     unrelated defects into one claim about the whole document.
 */
function collapseSchemaErrors(errors, bundle) {
	const locations = new Set();
	for (const error of errors ?? []) locations.add(error.instancePath);
	if (locations.size === 0) return [];
	const deepest = [...locations].reduce(
		(best, pointer) => Math.max(best, depthOf(pointer)),
		0,
	);
	const tied = [...locations].filter((pointer) => depthOf(pointer) === deepest);
	let sites = tied;
	if (tied.length > 1) {
		let ancestor = commonPrefix(tied);
		while (ancestor !== "" && !locations.has(ancestor)) {
			ancestor = parentOf(ancestor);
		}
		if (ancestor !== "") sites = [ancestor];
	}
	return sites.sort(compareCodeUnits).map((pointer) =>
		diagnostic(
			ADMISSIBILITY_CODES.SCHEMA_VIOLATION,
			pointer,
			"the value satisfies the published schema for its bundle member",
			{
				owner: nearestOwner(...ancestryOf(bundle, pointer)),
				locus: nearestLocus(...ancestryOf(bundle, pointer)),
			},
		),
	);
}

/** The nodes from a pointer's target outwards to the bundle root. */
function ancestryOf(root, pointer) {
	const chain = [];
	let node = root;
	chain.unshift(node);
	if (pointer === "") return chain;
	for (const raw of pointer.slice(1).split("/")) {
		const segment = raw.replaceAll("~1", "/").replaceAll("~0", "~");
		if (!isObject(node) && !Array.isArray(node)) break;
		node = node[segment];
		chain.unshift(node);
	}
	return chain;
}

/* --------------------------------------------------------------------- finish */

/**
 * The result-state rule, as a pure function of a diagnostic list.
 *
 * Exported because the `lossy` arm is unreachable through `admitIr` while every
 * registered code carries severity `error`, and an arm that cannot be exercised
 * is an arm nobody has checked. This is a reducer, not a test backdoor: it takes
 * the diagnostics and returns the state, and `admitIr` calls the same function.
 */
export function resultStateOf(diagnostics) {
	if (diagnostics.length === 0) return "success";
	return diagnostics.some((row) => row.diagnostic.severity === "error")
		? "invalid"
		: "lossy";
}

function finish(diagnostics, suppressions, limits) {
	const ordered = [...diagnostics].sort((left, right) => {
		const byPointer = compareCodeUnits(left.pointer, right.pointer);
		if (byPointer !== 0) return byPointer;
		const byCode = compareCodeUnits(
			left.diagnostic.code,
			right.diagnostic.code,
		);
		if (byCode !== 0) return byCode;
		const byMessage = compareCodeUnits(
			left.diagnostic.message,
			right.diagnostic.message,
		);
		if (byMessage !== 0) return byMessage;
		return compareCodeUnits(canonicalize(left), canonicalize(right));
	});
	const bounded = ordered.slice(0, limits.maxDiagnostics);
	return {
		resultState: resultStateOf(bounded),
		diagnostics: bounded,
		suppressions,
	};
}
