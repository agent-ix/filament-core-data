/**
 * Test-scoped reader for semantic IR contract 2.0.0 (issues #34, #93 and #172;
 * fcd#179 deleted 1.0.0 and 1.1.0, the versions this module once also read).
 *
 * JSON Schema validates shape; this module implements the cross-field rules
 * of FR-027..FR-030 that a schema cannot express, and the normalized
 * serialization of FR-027 / FR-020-AC-7. A second, independent reader lives
 * under `tests/` (Python) and TC-232 compares the two verdicts.
 *
 * This file is evidence, not a published API: it is imported by tests only.
 */

export type JsonObject = Record<string, unknown>;

export type Diagnostic = {
	code: string;
	path: string;
	message: string;
};

export type Multiplicity = {
	lower: number;
	upper?: number;
	ordered: boolean;
	unique: boolean;
};

const CATEGORIES = new Set([
	"structural",
	"behavioral",
	"dataflow",
	"dependency",
	"realization",
	"governance",
	"traceability",
]);

const CORE_LANGUAGES = new Set(["quire", "ocl", "sysml", "fretish"]);

/**
 * A native value type reference (gap 1 of FCD #199/#200):
 * `ix://quire/native/<Name>` declares no document node, over this closed set
 * of kernel scalars, mirrored independently from
 * `crates/semantic-ir/src/rules.rs`'s `NATIVE_SCALARS` and
 * `tests/semantic_ir_reader.py`'s `NATIVE_SCALARS`.
 */
const NATIVE_PREFIX = "ix://quire/native/";
const NATIVE_SCALARS: Record<string, string> = {
	UUID: "uuid",
	Boolean: "boolean",
	Integer: "integer",
	Decimal: "number",
	String: "string",
	Timestamp: "datetime",
	Duration: "duration",
	Bytes: "bytes",
	JsonObject: "any",
};

function nativeScalar(identity: unknown): string | undefined {
	if (typeof identity !== "string" || !identity.startsWith(NATIVE_PREFIX))
		return undefined;
	return NATIVE_SCALARS[identity.slice(NATIVE_PREFIX.length)];
}

/** Keyword → the resolved structural kinds (or scalar names) it may apply to. */
const KEYWORD_APPLICABILITY: Record<string, Set<string>> = {
	min: new Set(["integer", "number", "date", "datetime", "duration"]),
	max: new Set(["integer", "number", "date", "datetime", "duration"]),
	exclusiveMin: new Set(["integer", "number", "date", "datetime", "duration"]),
	exclusiveMax: new Set(["integer", "number", "date", "datetime", "duration"]),
	minLength: new Set(["string", "bytes"]),
	maxLength: new Set(["string", "bytes"]),
	pattern: new Set(["string"]),
	enumValues: new Set([
		"boolean",
		"integer",
		"number",
		"string",
		"bytes",
		"date",
		"datetime",
		"duration",
		"uuid",
	]),
	nonEmpty: new Set(["string", "bytes", "sequence", "map"]),
	unique: new Set(["sequence"]),
	format: new Set(["string"]),
};

function isObject(value: unknown): value is JsonObject {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

function asArray(value: unknown): JsonObject[] {
	return Array.isArray(value) ? value.filter(isObject) : [];
}

type Resolved = { kind: string; scalar?: string } | undefined;

/**
 * Whether a kind may carry relationships and operations: a record and every
 * contract 2.0.0 construct kind, which its declaration governs (FR-142).
 */
export function isEdgeKind(kind: unknown): boolean {
	return kind === "record" || isObject(kind);
}

/**
 * Resolves an identity to its structural kind: a native type reference; a
 * field or param, through its own `typeRef` (gap 1 of FCD #199/#200: a
 * constrained field keeps its constraints inline, with no alias node
 * between them, so `appliesTo` may name a field directly); or a document
 * type, through the alias chain.
 */
export function resolveKind(
	types: Map<string, JsonObject>,
	typeRef: unknown,
	fields: Map<string, JsonObject> = new Map(),
	seen = new Set<string>(),
): Resolved {
	if (typeof typeRef !== "string" || seen.has(typeRef)) return undefined;
	const native = nativeScalar(typeRef);
	if (native !== undefined) return { kind: "scalar", scalar: native };
	seen.add(typeRef);
	const field = fields.get(typeRef);
	if (field) return resolveKind(types, field.typeRef, fields, seen);
	const definition = types.get(typeRef);
	if (!definition) return undefined;
	if (definition.kind === "alias")
		return resolveKind(types, definition.target, fields, seen);
	return {
		kind: String(definition.kind),
		scalar:
			typeof definition.scalar === "string" ? definition.scalar : undefined,
	};
}

function checkMultiplicity(
	value: unknown,
	path: string,
	diagnostics: Diagnostic[],
): Multiplicity | undefined {
	if (!isObject(value)) return undefined;
	const lower = value.lower;
	const upper = value.upper;
	if (typeof lower !== "number" || lower < 0 || !Number.isInteger(lower)) {
		diagnostics.push({
			code: "agent-ix.semantic-ir.INVALID_MULTIPLICITY",
			path: `${path}.lower`,
			message: "lower bound must be a non-negative integer",
		});
		return undefined;
	}
	if (upper !== undefined) {
		if (
			typeof upper !== "number" ||
			!Number.isInteger(upper) ||
			upper < lower
		) {
			diagnostics.push({
				code: "agent-ix.semantic-ir.INVALID_MULTIPLICITY",
				path: `${path}.upper`,
				message: "upper bound must be an integer >= lower",
			});
			return undefined;
		}
	}
	// Owner ruling (2026-09-19T15:39:32Z) on FCD #199: every multiplicity
	// carries both `ordered` and `unique` as required booleans, checked here
	// rather than left to a schema pass that may not have run — this reader
	// is imported directly by tests with no guaranteed preceding Ajv check.
	if (typeof value.ordered !== "boolean" || typeof value.unique !== "boolean") {
		diagnostics.push({
			code: "agent-ix.semantic-ir.INVALID_MULTIPLICITY",
			path,
			message: "ordered and unique are required booleans on every multiplicity",
		});
		return undefined;
	}
	return value as Multiplicity;
}

function checkField(
	field: JsonObject,
	path: string,
	version: string,
	types: Map<string, JsonObject>,
	fields: Map<string, JsonObject>,
	diagnostics: Diagnostic[],
): void {
	const resolved = resolveKind(types, field.typeRef);
	if (!resolved) {
		diagnostics.push({
			code: "agent-ix.semantic-ir.UNRESOLVED_TYPE_REF",
			path: `${path}.typeRef`,
			message: `typeRef does not resolve: ${String(field.typeRef)}`,
		});
	}
	if (field.multiplicity === undefined) {
		// fcd#179: 2.0.0 is the only contract, and its schema requires
		// `multiplicity` on every field, so a document reaching this reader
		// without one is always in violation (no version branch left; mirrors
		// tests/semantic_ir_reader.py's `_check_field`, FR-050-CON-2/AC-4).
		diagnostics.push({
			code: "agent-ix.semantic-ir.MISSING_MULTIPLICITY",
			path: `${path}.multiplicity`,
			message: "a field declares its multiplicity",
		});
	} else {
		checkMultiplicity(field.multiplicity, `${path}.multiplicity`, diagnostics);
	}
	if (field.unit !== undefined) {
		if (typeof field.unit !== "string" || field.unit.length === 0) {
			diagnostics.push({
				code: "agent-ix.semantic-ir.INVALID_UNIT",
				path: `${path}.unit`,
				message: "unit must be a non-empty UCUM symbol",
			});
		} else if (resolved && resolved.kind !== "scalar") {
			diagnostics.push({
				code: "agent-ix.semantic-ir.UNIT_ON_NON_SCALAR",
				path: `${path}.unit`,
				message: `unit is only allowed on scalar fields (resolved ${resolved.kind})`,
			});
		}
	}
	// A constrained field keeps its constraints inline, with no alias node
	// between them (gap 1 of FCD #199/#200); each one's `appliesTo` already
	// names this field's own identity, so `resolveKind` resolves it through
	// the `fields` map above, the same as a type-level constraint.
	for (const [index, constraint] of asArray(field.constraints).entries())
		checkConstraint(
			constraint,
			`${path}.constraints.${index}`,
			types,
			fields,
			diagnostics,
		);
}

function checkConstraint(
	constraint: JsonObject,
	path: string,
	types: Map<string, JsonObject>,
	fields: Map<string, JsonObject>,
	diagnostics: Diagnostic[],
): void {
	const keyword = String(constraint.keyword);
	const allowed = KEYWORD_APPLICABILITY[keyword];
	if (!allowed) {
		diagnostics.push({
			code: "agent-ix.semantic-ir.UNKNOWN_CONSTRAINT_KEYWORD",
			path: `${path}.keyword`,
			message: `unknown keyword ${keyword}`,
		});
		return;
	}
	const resolved = resolveKind(types, constraint.appliesTo, fields);
	if (!resolved) {
		diagnostics.push({
			code: "agent-ix.semantic-ir.UNRESOLVED_TYPE_REF",
			path: `${path}.appliesTo`,
			message: `appliesTo does not resolve: ${String(constraint.appliesTo)}`,
		});
		return;
	}
	const subject =
		resolved.kind === "scalar" ? String(resolved.scalar) : resolved.kind;
	if (!allowed.has(subject)) {
		diagnostics.push({
			code: "agent-ix.semantic-ir.CONSTRAINT_NOT_APPLICABLE",
			path,
			message: `${keyword} does not apply to ${subject}`,
		});
	}
	const operands = isObject(constraint.operands) ? constraint.operands : {};
	if (keyword === "pattern") {
		try {
			new RegExp(String(operands.regex), "u");
		} catch (error) {
			diagnostics.push({
				code: "agent-ix.semantic-ir.INVALID_PATTERN",
				path: `${path}.operands.regex`,
				message: `regex does not compile under ecma-262: ${String(error)}`,
			});
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
			diagnostics.push({
				code: "agent-ix.semantic-ir.INVALID_OPERAND",
				path: `${path}.operands.value`,
				message: `${keyword} on ${String(resolved.scalar)} takes a ${numeric ? "number" : "ISO 8601 string"}`,
			});
		}
	}
}

function checkTypeDefinition(
	definition: JsonObject,
	path: string,
	version: string,
	types: Map<string, JsonObject>,
	fields: Map<string, JsonObject>,
	lockExports: Set<string>,
	diagnostics: Diagnostic[],
): void {
	const isRecord = isEdgeKind(definition.kind);
	for (const [index, field] of asArray(definition.fields).entries())
		checkField(
			field,
			`${path}.fields.${index}`,
			version,
			types,
			fields,
			diagnostics,
		);
	for (const [index, constraint] of asArray(definition.constraints).entries())
		checkConstraint(
			constraint,
			`${path}.constraints.${index}`,
			types,
			fields,
			diagnostics,
		);

	const relationships = asArray(definition.relationships);
	const operations = asArray(definition.operations);
	const clauses = asArray(definition.clauses);
	if (
		!isRecord &&
		(definition.relationships !== undefined ||
			definition.operations !== undefined)
	) {
		diagnostics.push({
			code: "agent-ix.semantic-ir.NODES_ON_NON_RECORD",
			path,
			message: `relationships/operations require kind record (got ${String(definition.kind)})`,
		});
	}
	const clauseIds = new Set<string>();
	for (const [index, clause] of clauses.entries()) {
		const clauseId = String(clause.clauseId);
		if (clauseIds.has(clauseId)) {
			diagnostics.push({
				code: "agent-ix.semantic-ir.DUPLICATE_CLAUSE_ID",
				path: `${path}.clauses.${index}.clauseId`,
				message: `clauseId ${clauseId} is declared twice`,
			});
		}
		clauseIds.add(clauseId);
		const language = String(clause.language);
		if (
			!CORE_LANGUAGES.has(language) &&
			!/^[a-z0-9][a-z0-9.-]*:[A-Za-z0-9][A-Za-z0-9._-]*$/.test(language)
		) {
			diagnostics.push({
				code: "agent-ix.semantic-ir.UNKNOWN_CLAUSE_LANGUAGE",
				path: `${path}.clauses.${index}.language`,
				message: `language ${language} is neither core nor namespaced`,
			});
		}
		if (
			isObject(clause.origin) &&
			"source" in clause.origin &&
			clause.sourceSpan == null
		) {
			diagnostics.push({
				code: "agent-ix.semantic-ir.MISSING_SOURCE_SPAN",
				path: `${path}.clauses.${index}.sourceSpan`,
				message: "source-originated clauses carry a sourceSpan",
			});
		}
	}
	for (const [index, relationship] of relationships.entries()) {
		const sourceEnd = isObject(relationship.sourceEnd)
			? relationship.sourceEnd
			: {};
		const targetEnd = isObject(relationship.targetEnd)
			? relationship.targetEnd
			: {};
		const target = String(targetEnd.type);
		if (!types.has(target) && !lockExports.has(target)) {
			diagnostics.push({
				code: "agent-ix.semantic-ir.UNRESOLVED_RELATIONSHIP_TARGET",
				path: `${path}.relationships.${index}.targetEnd.type`,
				message: `target does not resolve: ${target}`,
			});
		}
		// A relationship's source end always names the type declaring it
		// (FCD #199/#200 review finding 9); the target end's `type` is the
		// resolved target and needs the cross-reference check above instead.
		if (
			sourceEnd.type !== undefined &&
			sourceEnd.type !== definition.identity
		) {
			diagnostics.push({
				code: "agent-ix.semantic-ir.INVALID_RELATIONSHIP_SOURCE",
				path: `${path}.relationships.${index}.sourceEnd.type`,
				message: `sourceEnd.type must be the owning type's own identity (${String(definition.identity)}), got ${String(sourceEnd.type)}`,
			});
		}
		if (!CATEGORIES.has(String(relationship.category))) {
			diagnostics.push({
				code: "agent-ix.semantic-ir.UNKNOWN_EDGE_CATEGORY",
				path: `${path}.relationships.${index}.category`,
				message: `category ${String(relationship.category)} is outside the FR-040 set`,
			});
		}
		checkMultiplicity(
			sourceEnd.multiplicity,
			`${path}.relationships.${index}.sourceEnd.multiplicity`,
			diagnostics,
		);
		checkMultiplicity(
			targetEnd.multiplicity,
			`${path}.relationships.${index}.targetEnd.multiplicity`,
			diagnostics,
		);
	}
	for (const [index, operation] of operations.entries()) {
		const names = new Set<string>();
		for (const [paramIndex, param] of asArray(operation.params).entries()) {
			const name = String(param.name);
			if (names.has(name)) {
				diagnostics.push({
					code: "agent-ix.semantic-ir.DUPLICATE_PARAM",
					path: `${path}.operations.${index}.params.${paramIndex}.name`,
					message: `param ${name} is declared twice`,
				});
			}
			names.add(name);
			checkField(
				param,
				`${path}.operations.${index}.params.${paramIndex}`,
				version,
				types,
				fields,
				diagnostics,
			);
		}
		if (isObject(operation.returns)) {
			if (!resolveKind(types, operation.returns.typeRef)) {
				diagnostics.push({
					code: "agent-ix.semantic-ir.UNRESOLVED_TYPE_REF",
					path: `${path}.operations.${index}.returns.typeRef`,
					message: "returns.typeRef does not resolve",
				});
			}
			checkMultiplicity(
				operation.returns.multiplicity,
				`${path}.operations.${index}.returns.multiplicity`,
				diagnostics,
			);
		}
		// FR-141: `quire` is the one checked clause language; an inline clause
		// in any other admitted language is carried unchecked (an advisory).
		for (const side of ["pre", "post"] as const) {
			for (const [clauseIndex, clause] of (Array.isArray(operation[side])
				? operation[side]
				: []
			).entries()) {
				if (isObject(clause) && clause.language !== "quire") {
					diagnostics.push({
						code: "agent-ix.semantic-ir.CLAUSE_LANGUAGE_UNCHECKED",
						path: `${path}.operations.${index}.${side}.${clauseIndex}.language`,
						message: "carried unchecked",
					});
				}
			}
		}
		for (const side of ["pre", "post"] as const) {
			for (const [refIndex, ref] of (Array.isArray(operation[side])
				? operation[side]
				: []
			).entries()) {
				if (!isObject(ref) && !clauseIds.has(String(ref))) {
					diagnostics.push({
						code: "agent-ix.semantic-ir.DANGLING_CLAUSE_REF",
						path: `${path}.operations.${index}.${side}.${refIndex}`,
						message: `${side} references absent clauseId ${String(ref)}`,
					});
				}
			}
		}
	}
	for (const [label, entries] of [
		["relationships", relationships],
		["operations", operations],
		["clauses", clauses],
	] as const) {
		const identities = new Set<string>();
		for (const [index, entry] of entries.entries()) {
			const identity = String(entry.identity);
			if (identities.has(identity)) {
				diagnostics.push({
					code: "agent-ix.semantic-ir.DUPLICATE_IDENTITY",
					path: `${path}.${label}.${index}.identity`,
					message: `${label} identity ${identity} is declared twice`,
				});
			}
			identities.add(identity);
		}
	}
}

function checkCompositeCycles(
	types: Map<string, JsonObject>,
	diagnostics: Diagnostic[],
): void {
	const edges = new Map<string, { target: string; path: string }[]>();
	const paths = new Map<string, string>();
	let index = 0;
	for (const [identity, definition] of types) {
		paths.set(identity, `types.${index}`);
		index += 1;
		const list: { target: string; path: string }[] = [];
		for (const [relIndex, relationship] of asArray(
			definition.relationships,
		).entries())
			if (relationship.composite === true)
				list.push({
					target: String(
						isObject(relationship.targetEnd)
							? relationship.targetEnd.type
							: undefined,
					),
					path: `${paths.get(identity)}.relationships.${relIndex}`,
				});
		edges.set(identity, list);
	}
	const state = new Map<string, "open" | "done">();
	const visit = (node: string): void => {
		state.set(node, "open");
		for (const edge of edges.get(node) ?? []) {
			const status = state.get(edge.target);
			if (status === "open") {
				diagnostics.push({
					code: "agent-ix.semantic-ir.COMPOSITE_CYCLE",
					path: edge.path,
					message: `composite relationship closes a cycle at ${edge.target}`,
				});
			} else if (status === undefined && edges.has(edge.target)) {
				visit(edge.target);
			}
		}
		state.set(node, "done");
	};
	for (const node of edges.keys()) if (!state.has(node)) visit(node);
}

/** Reads a semantic IR document and returns the cross-field diagnostics. */
export function readSemanticIr(
	document: unknown,
	lockExports: Iterable<string> = [],
): Diagnostic[] {
	const diagnostics: Diagnostic[] = [];
	if (!isObject(document)) {
		return [
			{
				code: "agent-ix.semantic-ir.INVALID_DOCUMENT",
				path: "",
				message: "not an object",
			},
		];
	}
	const version = String(document.contractVersion);
	const types = new Map<string, JsonObject>();
	for (const definition of asArray(document.types))
		types.set(String(definition.identity), definition);
	// Every field or operation param in the document, by its own identity
	// (mirrors tests/semantic_ir_reader.py's `_field_index`).
	const fields = new Map<string, JsonObject>();
	for (const definition of types.values()) {
		for (const field of asArray(definition.fields)) {
			const identity = field.identity;
			if (typeof identity === "string") fields.set(identity, field);
		}
		for (const operation of asArray(definition.operations)) {
			for (const param of asArray(operation.params)) {
				const identity = param.identity;
				if (typeof identity === "string") fields.set(identity, param);
			}
		}
	}
	const exports = new Set(lockExports);
	let index = 0;
	for (const definition of asArray(document.types)) {
		checkTypeDefinition(
			definition,
			`types.${index}`,
			version,
			types,
			fields,
			exports,
			diagnostics,
		);
		index += 1;
	}
	checkCompositeCycles(types, diagnostics);
	return diagnostics;
}

/** Canonical JSON: sorted object keys, no whitespace (JCS-style, identity-sorted sets are the caller's job). */
export function canonical(value: unknown): string {
	if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
	if (isObject(value)) {
		return `{${Object.keys(value)
			.sort()
			.map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
			.join(",")}}`;
	}
	return JSON.stringify(value);
}

/**
 * Normalized serialization (FR-027): materializes `nullable` as a literal
 * boolean on every field, unconditionally on `contractVersion`. `multiplicity`
 * and `presence` are schema-required and independently authored, so neither
 * is ever derived from the other here.
 */
export function normalize(document: unknown): string {
	if (!isObject(document)) return canonical(document);
	const copy = structuredClone(document) as JsonObject;
	const materialize = (field: JsonObject): void => {
		field.nullable = field.nullable === true;
	};
	for (const definition of asArray(copy.types)) {
		for (const field of asArray(definition.fields)) materialize(field);
		for (const operation of asArray(definition.operations))
			for (const param of asArray(operation.params)) materialize(param);
	}
	return canonical(copy);
}
