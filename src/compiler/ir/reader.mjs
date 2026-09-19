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
	CONSTRUCT_VOCABULARY,
	constructOnlyMembers,
	isConstructKind,
	kindLabel,
	presenceOf,
	readDeclaration,
	ruleOf,
} from "../constructs.mjs";
import {
	DEFAULT_LIMITS,
	DIAGNOSTIC_CODES,
	diagnostic,
	fragment,
} from "../diagnostics.mjs";
import {
	applies,
	CORE_CLAUSE_LANGUAGES,
	EDGE_CATEGORIES,
	isKeyword,
	NAMESPACED_LANGUAGE,
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

/**
 * The contract 2.0.0 `constructs` table and each type's conformance to its
 * construct declaration (FR-142): the checks the published JSON Schema cannot
 * state because they read a second node of the document. Each defect is an
 * `INVALID_IR` at the pointer the Rust reader's schema layer names, the same
 * layer that refuses it there.
 */
function checkConstructs(document, definitions, raise, locusOf) {
	const invalid = (pointer, message, node) =>
		raise(DIAGNOSTIC_CODES.INVALID_IR, `${pointer}: ${message}`, locusOf(node));
	const entries = [];
	const constructs = Array.isArray(document.constructs)
		? document.constructs
		: [];
	constructs.forEach((entry, position) => {
		if (!isObject(entry)) return;
		const entryAt = `/ir/constructs/${position}`;
		let declaration;
		if (entry.construct !== undefined) {
			const read = readDeclaration(entry.construct);
			if (read.declaration === undefined)
				invalid(`${entryAt}/construct${read.pointer}`, read.message);
			else declaration = read.declaration;
		}
		const kind = entry.kind;
		if (
			!isObject(kind) ||
			typeof kind.module !== "string" ||
			typeof kind.name !== "string"
		)
			return;
		const label = kindLabel(kind);
		if (entries.some((one) => one.label === label)) {
			invalid(`${entryAt}/kind`, `constructs declares the kind ${label} once`);
			return;
		}
		entries.push({ label, declaration, used: false, at: `${entryAt}/kind` });
	});

	const construct = constructOnlyMembers();
	definitions.forEach((definition, position) => {
		const at = `/ir/types/${position}`;
		if (!isConstructKind(definition.kind)) {
			for (const member of construct)
				if (Object.hasOwn(definition, member))
					invalid(
						`${at}/${member}`,
						`${member} is carried by a construct kind only`,
						definition,
					);
			return;
		}
		const label = kindLabel(definition.kind);
		const entry = entries.find((one) => one.label === label);
		if (entry === undefined) {
			invalid(
				`${at}/kind`,
				`the kind ${label} names no constructs entry`,
				definition,
			);
			return;
		}
		entry.used = true;
		const declaration = entry.declaration;
		if (declaration === undefined) return;
		const name = definition.kind.name;
		for (const { name: member } of CONSTRUCT_VOCABULARY.members) {
			const presence = presenceOf(declaration, member);
			const present = Object.hasOwn(definition, member);
			if (presence === "required" && !present)
				invalid(at, `a ${name} construct requires ${member}`, definition);
			if (presence === "forbidden" && present)
				invalid(
					`${at}/${member}`,
					`a ${name} construct carries no ${member}`,
					definition,
				);
		}
		for (const rule of declaration.rules) {
			// A rule the vocabulary marks `nonEmpty` asks its member for at
			// least one entry; no rule name is written here.
			const stated = ruleOf(rule);
			if (stated?.nonEmpty !== true) continue;
			const member = stated.member;
			if (Array.isArray(definition[member]) && definition[member].length === 0)
				invalid(
					`${at}/${member}`,
					`a ${name} construct declares at least one of ${member}`,
					definition,
				);
		}
	});

	// A population's kind resolves against the same constructs table exactly
	// like a type definition's kind (QSpec FR-154 row 2/AC-7, FR-208): a
	// dangling kind is INVALID_IR, and a resolved kind counts as used so the
	// "no type definition or population is of that kind" check below does not
	// misfire on a constructs entry a population alone uses.
	asArray(document.populations).forEach((population, position) => {
		const at = `/ir/populations/${position}/kind`;
		const kind = population.kind;
		if (
			!isObject(kind) ||
			typeof kind.module !== "string" ||
			typeof kind.name !== "string"
		)
			return;
		const label = kindLabel(kind);
		const entry = entries.find((one) => one.label === label);
		if (entry === undefined) {
			invalid(at, `the kind ${label} names no constructs entry`, population);
			return;
		}
		entry.used = true;
	});

	// `readContractIr` refuses any other contractVersion before this function
	// runs, so every document reaching here already declares 2.0.0 (fcd#179).
	for (const entry of entries)
		if (!entry.used)
			invalid(
				entry.at,
				`constructs declares ${entry.label}, and no type definition or population is of that kind`,
			);
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

	// FR-050's own Inputs section assumes this function's input is already "a
	// semantic IR document at contractVersion 2.0.0", schema-validated by the
	// caller first (the same two-layer composition `crates/semantic-ir` uses:
	// schema, then cross-field rules, only when the schema layer is silent).
	// A caller that skips that layer — `conformance/adapters/compiler-frontend/
	// adapter.mjs:109` calls this function with no preceding schema check —
	// would otherwise silently run every rule below against a document
	// declaring a contract fcd#179 deleted. This is that precondition enforced
	// defensively, so a document naming any other contractVersion is refused
	// here too, wholesale, before any other member is read.
	if (document.contractVersion !== "2.0.0") {
		raise(
			DIAGNOSTIC_CODES.UNKNOWN_CONTRACT_VERSION,
			`the IR document declares contract version ${fragment(String(document.contractVersion))}; this compiler supports 2.0.0`,
		);
		return Object.assign(diagnostics, { suppressions });
	}

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
			raise(
				DIAGNOSTIC_CODES.MISSING_MULTIPLICITY,
				"a field declares its multiplicity",
				locusOf(field),
			);
		} else {
			multiplicity = checkMultiplicity(field.multiplicity, field);
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
		// Relationships and operations belong to a record among the core kinds;
		// a construct kind's declaration decides their presence (FR-142).
		const isRecord =
			isConstructKind(definition.kind) || definition.kind === "record";
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
			// FR-141: `quire` is the one checked clause language; an inline
			// clause in any other admitted language is carried unchecked.
			for (const side of ["pre", "post"]) {
				for (const clause of asArray(operation[side])) {
					if (!isObject(clause) || clause.language === "quire") continue;
					raise(
						DIAGNOSTIC_CODES.CLAUSE_LANGUAGE_UNCHECKED,
						`${side} clause language ${fragment(clause.language)} is carried unchecked`,
						locusOf(clause) ?? locusOf(operation),
					);
				}
			}
			for (const side of ["pre", "post"]) {
				for (const clauseId of Array.isArray(operation[side])
					? operation[side]
					: []) {
					// An inline clause binds no clause id.
					if (isObject(clauseId) || clauseIds.has(String(clauseId))) continue;
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

	checkConstructs(document, definitions, raise, locusOf);

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
