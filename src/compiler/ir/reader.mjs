/**
 * The compiler's IR reader: the cross-field rules a JSON Schema cannot express
 * (FR-050).
 *
 * This is deliberately a *third* implementation. Issue #34 published a
 * test-scoped TypeScript reader and an independent Python one, and TC-514
 * compares all three on every published negative case. If this module imported
 * either of them the agreement would be a tautology; written separately from the
 * requirement text, it is evidence. The schema and FR-027..FR-029 remain the
 * authority — three readers agreeing on a wrong rule is still wrong — so the
 * agreement is a drift guard, not a correctness proof.
 *
 * Every rule below carries the `agent-ix.semantic-ir.*` code the issue #34
 * readers already emit, which is what makes the comparison possible at all.
 */
import {
	DEFAULT_LIMITS,
	DIAGNOSTIC_CODES,
	diagnostic,
	fragment,
} from "../diagnostics.mjs";
import {
	CORE_CLAUSE_LANGUAGES,
	EDGE_CATEGORIES,
	NAMESPACED_LANGUAGE,
	applies,
	isKeyword,
} from "./applicability.mjs";

/** Nesting depth, stopping as soon as `bound` is exceeded. */
function depthOf(value, bound, depth = 0) {
	if (depth > bound) return depth;
	if (Array.isArray(value)) {
		let deepest = depth;
		for (const item of value) {
			deepest = Math.max(deepest, depthOf(item, bound, depth + 1));
			if (deepest > bound) return deepest;
		}
		return deepest;
	}
	if (value !== null && typeof value === "object") {
		let deepest = depth;
		for (const item of Object.values(value)) {
			deepest = Math.max(deepest, depthOf(item, bound, depth + 1));
			if (deepest > bound) return deepest;
		}
		return deepest;
	}
	return depth;
}

function isObject(value) {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

function asArray(value) {
	return Array.isArray(value) ? value.filter(isObject) : [];
}

/** Resolves a `typeRef` through alias definitions, terminating on a cycle. */
export function resolveKind(types, typeRef, seen = new Set()) {
	if (typeof typeRef !== "string" || seen.has(typeRef)) return undefined;
	const definition = types.get(typeRef);
	if (!definition) return undefined;
	seen.add(typeRef);
	if (definition.kind === "alias")
		return resolveKind(types, definition.target, seen);
	return {
		kind: String(definition.kind),
		scalar:
			typeof definition.scalar === "string" ? definition.scalar : undefined,
	};
}

/** The `1.0.0` derivation FR-027 published: presence fixes the bounds. */
export function multiplicityFromPresence(presence) {
	return presence === "optional"
		? { lower: 0, upper: 1 }
		: { lower: 1, upper: 1 };
}

/**
 * Reads an IR document and returns its cross-field diagnostics.
 *
 * `importedExports` is the set of type identities the resolution exports from
 * imported packages, or the string `"unknown"` when no resolution is available.
 * The distinction matters: with no resolution the reader cannot tell a valid
 * cross-package edge from a dangling one, so it suppresses that one rule and
 * reports the suppression rather than inventing a verdict either way.
 */
export function readContractIr(document, options = {}) {
	const limits = options.limits ?? DEFAULT_LIMITS;
	const exports = options.importedExports;
	const exportsUnknown = exports === "unknown" || exports === undefined;
	const known = exportsUnknown ? new Set() : new Set(exports);
	const diagnostics = [];
	const suppressions = [];

	const raise = (entry, message, locus) =>
		diagnostics.push(
			diagnostic(entry, { message, ...(locus ? { locus } : {}) }),
		);
	const locusOf = (node) => node?.origin?.source;

	if (!isObject(document)) {
		raise(
			DIAGNOSTIC_CODES.INVALID_DOCUMENT,
			"the IR document is not an object",
		);
		return Object.assign(diagnostics, { suppressions });
	}

	const version = String(document.contractVersion);
	const documentPackage =
		typeof document.package?.identity === "string"
			? document.package.identity
			: undefined;
	const definitions = asArray(document.types);
	if (definitions.length > limits.maxNodes) {
		raise(
			DIAGNOSTIC_CODES.LIMIT_MAX_NODES,
			`the document declares ${definitions.length} types, over the maxNodes limit of ${limits.maxNodes}`,
		);
		return Object.assign(diagnostics, { suppressions });
	}

	const types = new Map();
	for (const definition of definitions) {
		types.set(String(definition.identity), definition);
	}

	const checkMultiplicity = (value, owner) => {
		if (!isObject(value)) return undefined;
		const { lower, upper } = value;
		if (!Number.isInteger(lower) || lower < 0) {
			raise(
				DIAGNOSTIC_CODES.INVALID_MULTIPLICITY,
				"the lower bound must be a non-negative integer",
				locusOf(owner),
			);
			return undefined;
		}
		if (upper !== undefined && (!Number.isInteger(upper) || upper < lower)) {
			raise(
				DIAGNOSTIC_CODES.INVALID_MULTIPLICITY,
				"the upper bound must be an integer not less than the lower bound",
				locusOf(owner),
			);
			return undefined;
		}
		const collection = upper === undefined || upper > 1;
		if (
			!collection &&
			(value.ordered !== undefined || value.unique !== undefined)
		) {
			raise(
				DIAGNOSTIC_CODES.FLAGS_ON_NON_COLLECTION,
				"ordered and unique apply only where the upper bound is absent or greater than one",
				locusOf(owner),
			);
		}
		return value;
	};

	const checkField = (field) => {
		const resolved = resolveKind(types, field.typeRef);
		if (!resolved && !known.has(String(field.typeRef))) {
			// Suppression is only for a reference that could plausibly belong to an
			// imported package — one whose identity names a *different* package. A
			// reference into this document's own package cannot be resolved by any
			// resolution, so it is a defect whether or not one was supplied.
			const foreign =
				exportsUnknown &&
				typeof field.typeRef === "string" &&
				documentPackage !== undefined &&
				!field.typeRef.startsWith(`ix://${documentPackage}/`);
			if (foreign) {
				suppressions.push({
					rule: DIAGNOSTIC_CODES.UNRESOLVED_TYPE_REF.code,
					identity: String(field.identity),
				});
			} else {
				raise(
					DIAGNOSTIC_CODES.UNRESOLVED_TYPE_REF,
					`the type reference ${fragment(field.typeRef)} resolves to no definition`,
					locusOf(field),
				);
			}
		}
		let multiplicity;
		if (field.multiplicity === undefined) {
			if (version === "1.1.0") {
				raise(
					DIAGNOSTIC_CODES.MISSING_MULTIPLICITY,
					"a 1.1.0 field declares its multiplicity",
					locusOf(field),
				);
			}
			multiplicity = multiplicityFromPresence(field.presence);
		} else {
			multiplicity = checkMultiplicity(field.multiplicity, field);
		}
		if (multiplicity) {
			const derived = multiplicity.lower >= 1 ? "required" : "optional";
			if (field.presence !== undefined && field.presence !== derived) {
				raise(
					DIAGNOSTIC_CODES.PRESENCE_MULTIPLICITY_MISMATCH,
					`presence ${fragment(field.presence)} contradicts a lower bound of ${multiplicity.lower}`,
					locusOf(field),
				);
			}
		}
		if (field.unit !== undefined) {
			if (typeof field.unit !== "string" || field.unit.length === 0) {
				raise(
					DIAGNOSTIC_CODES.INVALID_UNIT,
					"a unit is a non-empty symbol",
					locusOf(field),
				);
			} else if (resolved && resolved.kind !== "scalar") {
				raise(
					DIAGNOSTIC_CODES.UNIT_ON_NON_SCALAR,
					`a unit applies only to a scalar field (resolved ${fragment(resolved.kind)})`,
					locusOf(field),
				);
			}
		}
	};

	const checkConstraint = (constraint, owner) => {
		const keyword = String(constraint.keyword);
		if (!isKeyword(keyword)) {
			raise(
				DIAGNOSTIC_CODES.UNKNOWN_CONSTRAINT_KEYWORD,
				`${fragment(keyword)} is outside the closed constraint vocabulary`,
				locusOf(constraint) ?? locusOf(owner),
			);
			return;
		}
		const resolved = resolveKind(types, constraint.appliesTo);
		if (!resolved) {
			raise(
				DIAGNOSTIC_CODES.UNRESOLVED_TYPE_REF,
				`appliesTo ${fragment(constraint.appliesTo)} resolves to no definition`,
				locusOf(constraint) ?? locusOf(owner),
			);
			return;
		}
		if (!applies(keyword, resolved.kind, resolved.scalar)) {
			raise(
				DIAGNOSTIC_CODES.CONSTRAINT_NOT_APPLICABLE,
				`${fragment(keyword)} does not apply to ${fragment(resolved.kind === "scalar" ? String(resolved.scalar) : resolved.kind)}`,
				locusOf(constraint) ?? locusOf(owner),
			);
		}
		const operands = isObject(constraint.operands) ? constraint.operands : {};
		if (keyword === "pattern") {
			try {
				// ECMA-262 without the `u` flag: the operand's dialect is `ecma-262`,
				// and compiling it in Unicode mode rejects patterns a plain ECMA-262
				// engine accepts, so the check would refuse valid documents.
				new RegExp(String(operands.regex));
			} catch (error) {
				raise(
					DIAGNOSTIC_CODES.INVALID_PATTERN,
					`the regex does not compile under ECMA-262: ${fragment(error.message)}`,
					locusOf(constraint) ?? locusOf(owner),
				);
			}
		}
		if (
			["min", "max", "exclusiveMin", "exclusiveMax"].includes(keyword) &&
			resolved.kind === "scalar"
		) {
			const numeric =
				resolved.scalar === "integer" || resolved.scalar === "number";
			const value = operands.value;
			if (numeric ? typeof value !== "number" : typeof value !== "string") {
				raise(
					DIAGNOSTIC_CODES.INVALID_OPERAND,
					`${fragment(keyword)} on ${fragment(String(resolved.scalar))} takes ${numeric ? "a number" : "an ISO 8601 string"}`,
					locusOf(constraint) ?? locusOf(owner),
				);
			}
		}
	};

	const checkDefinition = (definition) => {
		if (definition.kind === "reference" || definition.kind === "alias") {
			const target = String(definition.target);
			if (!types.has(target) && !known.has(target)) {
				const foreign =
					exportsUnknown &&
					typeof definition.target === "string" &&
					target.startsWith("ix://") &&
					documentPackage !== undefined &&
					!target.startsWith(`ix://${documentPackage}/`);
				if (foreign) {
					suppressions.push({
						rule: DIAGNOSTIC_CODES.UNRESOLVED_TYPE_REF.code,
						identity: String(definition.identity),
					});
				} else {
					raise(
						DIAGNOSTIC_CODES.UNRESOLVED_TYPE_REF,
						`the ${definition.kind} target ${fragment(target)} resolves to no definition and no imported export`,
						locusOf(definition),
					);
				}
			}
		}
		const isRecord = definition.kind === "record";
		const fields = asArray(definition.fields);
		// Every list, not only the fields: a document with a hundred thousand
		// clauses is as unbounded as one with a hundred thousand fields.
		for (const key of [
			"fields",
			"variants",
			"constraints",
			"relationships",
			"operations",
			"clauses",
			"extensions",
		]) {
			const list = definition[key];
			if (!Array.isArray(list) || list.length <= limits.maxCollectionItems) {
				continue;
			}
			raise(
				DIAGNOSTIC_CODES.LIMIT_MAX_COLLECTION_ITEMS,
				`a ${key} list of ${list.length} exceeds the maxCollectionItems limit of ${limits.maxCollectionItems}`,
				locusOf(definition),
			);
			return;
		}
		for (const field of fields) checkField(field);
		for (const constraint of asArray(definition.constraints)) {
			checkConstraint(constraint, definition);
		}

		const relationships = asArray(definition.relationships);
		const operations = asArray(definition.operations);
		const clauses = asArray(definition.clauses);
		if (
			!isRecord &&
			(definition.relationships !== undefined ||
				definition.operations !== undefined)
		) {
			raise(
				DIAGNOSTIC_CODES.NODES_ON_NON_RECORD,
				`relationships and operations require a record (got ${fragment(definition.kind)})`,
				locusOf(definition),
			);
		}

		const clauseIds = new Set();
		for (const clause of clauses) {
			const clauseId = String(clause.clauseId);
			if (clauseIds.has(clauseId)) {
				raise(
					DIAGNOSTIC_CODES.DUPLICATE_CLAUSE_ID,
					`the clause id ${fragment(clauseId)} is declared twice`,
					locusOf(clause) ?? locusOf(definition),
				);
			}
			clauseIds.add(clauseId);
			const language = String(clause.language);
			if (
				!CORE_CLAUSE_LANGUAGES.includes(language) &&
				!NAMESPACED_LANGUAGE.test(language)
			) {
				raise(
					DIAGNOSTIC_CODES.UNKNOWN_CLAUSE_LANGUAGE,
					`the clause language ${fragment(language)} is neither core nor namespaced`,
					locusOf(clause) ?? locusOf(definition),
				);
			}
			if (
				isObject(clause.origin) &&
				"source" in clause.origin &&
				clause.sourceSpan == null
			) {
				raise(
					DIAGNOSTIC_CODES.MISSING_SOURCE_SPAN,
					"a source-originated clause carries a sourceSpan",
					locusOf(clause) ?? locusOf(definition),
				);
			}
		}

		for (const relationship of relationships) {
			const target = String(relationship.target);
			if (!types.has(target) && !known.has(target)) {
				const foreign =
					exportsUnknown &&
					documentPackage !== undefined &&
					!target.startsWith(`ix://${documentPackage}/`);
				if (foreign) {
					suppressions.push({
						rule: DIAGNOSTIC_CODES.UNRESOLVED_RELATIONSHIP_TARGET.code,
						identity: String(relationship.identity),
					});
				} else {
					raise(
						DIAGNOSTIC_CODES.UNRESOLVED_RELATIONSHIP_TARGET,
						`the relationship target ${fragment(target)} resolves to no definition and no imported export`,
						locusOf(relationship) ?? locusOf(definition),
					);
				}
			}
			if (!EDGE_CATEGORIES.includes(String(relationship.category))) {
				raise(
					DIAGNOSTIC_CODES.UNKNOWN_EDGE_CATEGORY,
					`the edge category ${fragment(relationship.category)} is outside the closed set`,
					locusOf(relationship) ?? locusOf(definition),
				);
			}
			checkMultiplicity(relationship.multiplicity, relationship);
		}

		for (const operation of operations) {
			const names = new Set();
			for (const parameter of asArray(operation.params)) {
				const name = String(parameter.name);
				if (names.has(name)) {
					raise(
						DIAGNOSTIC_CODES.DUPLICATE_PARAM,
						`the parameter ${fragment(name)} is declared twice`,
						locusOf(parameter) ?? locusOf(operation),
					);
				}
				names.add(name);
				checkField(parameter);
			}
			if (isObject(operation.returns)) {
				if (!resolveKind(types, operation.returns.typeRef)) {
					raise(
						DIAGNOSTIC_CODES.UNRESOLVED_TYPE_REF,
						"the return type reference resolves to no definition",
						locusOf(operation),
					);
				}
				checkMultiplicity(operation.returns.multiplicity, operation);
			}
			for (const side of ["pre", "post"]) {
				for (const clauseId of Array.isArray(operation[side])
					? operation[side]
					: []) {
					if (clauseIds.has(String(clauseId))) continue;
					raise(
						DIAGNOSTIC_CODES.DANGLING_CLAUSE_REF,
						`${side} names the clause id ${fragment(clauseId)}, which this type does not declare`,
						locusOf(operation),
					);
				}
			}
		}

		for (const [label, entries] of [
			["fields", fields],
			["variants", asArray(definition.variants)],
			["constraints", asArray(definition.constraints)],
			["relationships", relationships],
			["operations", operations],
			["clauses", clauses],
		]) {
			const identities = new Set();
			for (const entry of entries) {
				const identity = String(entry.identity);
				if (identities.has(identity)) {
					raise(
						DIAGNOSTIC_CODES.DUPLICATE_IDENTITY,
						`the ${label} identity ${fragment(identity)} is declared twice`,
						locusOf(entry) ?? locusOf(definition),
					);
				}
				identities.add(identity);
			}
		}
	};

	const identities = new Set();
	for (const definition of definitions) {
		const identity = String(definition.identity);
		if (identities.has(identity)) {
			raise(
				DIAGNOSTIC_CODES.DUPLICATE_IDENTITY,
				`the type identity ${fragment(identity)} is declared twice`,
				locusOf(definition),
			);
		}
		identities.add(identity);
		checkDefinition(definition);
	}

	// A document too deep to canonicalise cannot be fingerprinted, so the bound
	// is checked here, where it is a diagnostic rather than an exception. The
	// depth is measured directly rather than by calling the canonicaliser, which
	// would make the reader and the normalizer import each other.
	if (depthOf(document, limits.maxDepth) > limits.maxDepth) {
		raise(
			DIAGNOSTIC_CODES.LIMIT_MAX_DEPTH,
			`the document nests past the maxDepth limit of ${limits.maxDepth}`,
		);
		return Object.assign(diagnostics, { suppressions });
	}

	// Composite relationship graphs are acyclic. The traversal marks nodes, so a
	// cyclic graph terminates instead of recursing until the stack is exhausted.
	const state = new Map();
	const visit = (identity) => {
		state.set(identity, "open");
		for (const relationship of asArray(types.get(identity)?.relationships)) {
			if (relationship.composite !== true) continue;
			const target = String(relationship.target);
			const status = state.get(target);
			if (status === "open") {
				raise(
					DIAGNOSTIC_CODES.COMPOSITE_CYCLE,
					`a composite relationship closes a cycle at ${fragment(target)}`,
					locusOf(relationship),
				);
			} else if (status === undefined && types.has(target)) {
				visit(target);
			}
		}
		state.set(identity, "done");
	};
	for (const identity of types.keys())
		if (!state.has(identity)) visit(identity);

	return Object.assign(diagnostics, { suppressions });
}
