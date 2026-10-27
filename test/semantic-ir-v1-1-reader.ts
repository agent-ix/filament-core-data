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
	Decimal: "decimal",
	Float32: "float32",
	Float64: "float64",
	String: "string",
	Timestamp: "datetime",
	Duration: "duration",
	Bytes: "bytes",
	JsonObject: "any",
};

const I128_MIN = -170141183460469231731687303715884105728n;
const I128_MAX = 170141183460469231731687303715884105727n;

function canonicalInteger(value: unknown): value is string {
	return (
		typeof value === "string" && /^(0|-?[1-9][0-9]*)(?![\s\S])/.test(value)
	);
}

function withinI128(value: string): boolean {
	try {
		const parsed = BigInt(value);
		return parsed >= I128_MIN && parsed <= I128_MAX;
	} catch {
		return false;
	}
}

function decimalPolicies(
	types: Map<string, JsonObject>,
	ref: unknown,
	fields: Map<string, JsonObject>,
	seen = new Set<string>(),
): JsonObject[] {
	if (typeof ref !== "string" || seen.has(ref)) return [];
	seen.add(ref);
	const native = nativeScalar(ref);
	if (native !== undefined) return [];
	const field = fields.get(ref);
	if (field) {
		return [
			...(isObject(field.decimal) ? [field] : []),
			...decimalPolicies(types, field.typeRef, fields, seen),
		];
	}
	const definition = types.get(ref);
	if (!definition) return [];
	return [
		...(isObject(definition.decimal) ? [definition] : []),
		...(definition.kind === "alias"
			? decimalPolicies(types, definition.target, fields, seen)
			: []),
	];
}

function valueAdmitted(scalar: string | undefined, value: unknown): boolean {
	if (scalar === "integer") return canonicalInteger(value) && withinI128(value);
	if (scalar === "decimal")
		return (
			typeof value === "string" && /^(0|-?[1-9][0-9]*)(\.[0-9]+)?$/.test(value)
		);
	if (scalar === "float32" || scalar === "float64")
		return typeof value === "number" && Number.isFinite(value);
	if (scalar === "boolean") return typeof value === "boolean";
	return true;
}

function nativeScalar(identity: unknown): string | undefined {
	if (identity === "ix://quire/native/Text") return "string";
	if (typeof identity !== "string" || !identity.startsWith(NATIVE_PREFIX))
		return undefined;
	return NATIVE_SCALARS[identity.slice(NATIVE_PREFIX.length)];
}

/** Keyword → the resolved structural kinds (or scalar names) it may apply to. */
const KEYWORD_APPLICABILITY: Record<string, Set<string>> = {
	min: new Set([
		"integer",
		"number",
		"decimal",
		"float32",
		"float64",
		"date",
		"datetime",
		"duration",
	]),
	max: new Set([
		"integer",
		"number",
		"decimal",
		"float32",
		"float64",
		"date",
		"datetime",
		"duration",
	]),
	exclusiveMin: new Set([
		"integer",
		"number",
		"decimal",
		"float32",
		"float64",
		"date",
		"datetime",
		"duration",
	]),
	exclusiveMax: new Set([
		"integer",
		"number",
		"decimal",
		"float32",
		"float64",
		"date",
		"datetime",
		"duration",
	]),
	minLength: new Set(["string", "bytes"]),
	maxLength: new Set(["string", "bytes"]),
	pattern: new Set(["string"]),
	enumValues: new Set([
		"boolean",
		"integer",
		"number",
		"decimal",
		"float32",
		"float64",
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

const CLOCK_REFERENCE = "ix://quire/native/Clock";
const QUANTITY_REFERENCE = "ix://quire/unit/";
const INVALID_CLOCK_MEMBER = "agent-ix.semantic-ir.INVALID_CLOCK_MEMBER";
const INVALID_QUANTITY_MEMBER = "agent-ix.semantic-ir.INVALID_QUANTITY_MEMBER";
const INVALID_UNIT_GRAPH = "agent-ix.semantic-ir.INVALID_UNIT_GRAPH";
const UNRESOLVED_DIMENSION_REF =
	"agent-ix.semantic-ir.UNRESOLVED_DIMENSION_REF";
const UNRESOLVED_UNIT_REF = "agent-ix.semantic-ir.UNRESOLVED_UNIT_REF";

function quantityReference(reference: unknown): boolean {
	if (
		typeof reference !== "string" ||
		!reference.startsWith(QUANTITY_REFERENCE)
	)
		return false;
	const segments = reference.slice(QUANTITY_REFERENCE.length).split("/");
	const unit = segments.pop();
	const unitName = (name: string) =>
		/^[A-Za-z][A-Za-z0-9_]*(?![\s\S])/.test(name);
	return (
		unit !== undefined &&
		unitName(unit) &&
		segments.every(
			(segment) =>
				unitName(segment) || /^[a-z0-9][a-z0-9._-]*(?![\s\S])/.test(segment),
		)
	);
}

const constructAliases = new WeakSet<JsonObject>();
function isAliasDefinition(definition: JsonObject): boolean {
	return definition.kind === "alias" || constructAliases.has(definition);
}
/**
 * What a type reference makes of the member or constraint subject holding it:
 * a clock or a well-formed quantity, directly or through aliases and a field's
 * own `typeRef`; or "malformed", a quantity reference that is not well formed.
 */
const specialMemo = new WeakMap<
	Map<string, JsonObject>,
	Map<string, "clock" | "quantity" | "malformed" | undefined>
>();
function specialKind(
	types: Map<string, JsonObject>,
	fields: Map<string, JsonObject>,
	typeRef: unknown,
): "clock" | "quantity" | "malformed" | undefined {
	let memo = specialMemo.get(types);
	if (!memo) {
		memo = new Map();
		specialMemo.set(types, memo);
	}
	const walked: string[] = [];
	const seen = new Set<string>();
	let reference = typeRef;
	let found: "clock" | "quantity" | "malformed" | undefined;
	while (typeof reference === "string" && !seen.has(reference)) {
		if (reference === CLOCK_REFERENCE) {
			found = "clock";
			break;
		}
		if (quantityReference(reference)) {
			found = "quantity";
			break;
		}
		if (reference.startsWith(QUANTITY_REFERENCE)) {
			found = "malformed";
			break;
		}
		if (memo.has(reference)) {
			found = memo.get(reference);
			break;
		}
		seen.add(reference);
		walked.push(reference);
		if (nativeScalar(reference) !== undefined) break;
		const field = fields.get(reference);
		if (field) {
			reference = field.typeRef;
			continue;
		}
		const definition = types.get(reference);
		if (!definition || !isAliasDefinition(definition)) break;
		reference = definition.target;
	}
	for (const step of walked) memo.set(step, found);
	return found;
}

/** Returns true when the type position has its own Clock or quantity rules. */
function checkSpecialMember(
	member: JsonObject,
	path: string,
	types: Map<string, JsonObject>,
	fields: Map<string, JsonObject>,
	diagnostics: Diagnostic[],
): boolean {
	const special = specialKind(types, fields, member.typeRef);
	if (special === undefined) return false;
	if (special === "malformed") {
		// Through an alias the malformed reference is refused at the alias.
		if (String(member.typeRef).startsWith(QUANTITY_REFERENCE))
			diagnostics.push({
				code: "agent-ix.semantic-ir.UNRESOLVED_TYPE_REF",
				path: `${path}.typeRef`,
				message: "a quantity type reference must be well formed",
			});
		return true;
	}
	const clock = special === "clock";
	const code = clock ? INVALID_CLOCK_MEMBER : INVALID_QUANTITY_MEMBER;
	const emit = (name: string) =>
		diagnostics.push({
			code,
			path: `${path}.${name}`,
			message: `forbidden or invalid ${clock ? "Clock" : "quantity"} member ${name}`,
		});
	for (const name of ["unit", "decimal", "textProfile", "defaultValue"])
		if (Object.hasOwn(member, name)) emit(name);
	if (Object.hasOwn(member, "defaultKind") && member.defaultKind !== "none")
		emit("defaultKind");
	if (Array.isArray(member.constraints) && member.constraints.length > 0)
		emit("constraints");
	if (clock && member.nullable !== false) emit("nullable");
	return true;
}

/** A bound on a clock or a quantity: `min`/`max` with an exact rational. */
function checkSpecialConstraint(
	constraint: JsonObject,
	path: string,
	special: "clock" | "quantity",
	diagnostics: Diagnostic[],
): void {
	const keyword = String(constraint.keyword);
	if (keyword !== "min" && keyword !== "max") {
		diagnostics.push({
			code: "agent-ix.semantic-ir.CONSTRAINT_NOT_APPLICABLE",
			path: `${path}.keyword`,
			message: `${keyword} does not bound a ${special}`,
		});
		return;
	}
	const operands = isObject(constraint.operands) ? constraint.operands : {};
	const bound = graphRational(operands.value);
	const at = `${path}.operands.value`;
	if ("error" in bound && bound.error === "overflow")
		diagnostics.push({
			code: "agent-ix.semantic-ir.INTEGER_OUTSIDE_I128",
			path: at,
			message: "the bound is outside the exact i128 domain",
		});
	else if ("error" in bound || (special === "clock" && bound.value < 0n))
		diagnostics.push({
			code: "agent-ix.semantic-ir.INVALID_OPERAND",
			path: at,
			message: `a ${special} bound is a canonical rational`,
		});
}

type ExactInteger = { value: bigint } | { error: "canonical" | "overflow" };
function graphInteger(value: unknown): ExactInteger {
	if (!canonicalInteger(value)) return { error: "canonical" };
	if (value.length > 40) return { error: "overflow" };
	if (!withinI128(value)) return { error: "overflow" };
	return { value: BigInt(value) };
}
function graphRational(value: unknown): ExactInteger {
	if (typeof value !== "string") return { error: "canonical" };
	const slash = value.indexOf("/");
	if (slash === -1) return graphInteger(value);
	if (value.indexOf("/", slash + 1) !== -1) return { error: "canonical" };
	const numerator = graphInteger(value.slice(0, slash));
	const denominator = graphInteger(value.slice(slash + 1));
	if (
		("error" in numerator && numerator.error === "overflow") ||
		("error" in denominator && denominator.error === "overflow")
	)
		return { error: "overflow" };
	if ("error" in numerator || "error" in denominator)
		return { error: "canonical" };
	if (numerator.value === 0n || denominator.value < 2n)
		return { error: "canonical" };
	let divisor = numerator.value < 0n ? -numerator.value : numerator.value;
	let remainder = denominator.value;
	while (remainder !== 0n) {
		const next = divisor % remainder;
		divisor = remainder;
		remainder = next;
	}
	return divisor === 1n ? { value: numerator.value } : { error: "canonical" };
}

/** Tarjan's walk uses explicit frames so a long authored graph needs no JS recursion. */
function cyclicGroups(edges: number[][]): number[][] {
	const discovery = edges.map(() => -1);
	const low = edges.map(() => -1);
	const active = edges.map(() => false);
	const stack: number[] = [];
	const groups: number[][] = [];
	let number = 0;
	for (let start = 0; start < edges.length; start++) {
		if (discovery[start] !== -1) continue;
		const enter = (node: number) => {
			discovery[node] = number;
			low[node] = number++;
			active[node] = true;
			stack.push(node);
		};
		enter(start);
		const frames: { node: number; next: number; parent?: number }[] = [
			{ node: start, next: 0 },
		];
		while (frames.length) {
			const frame = frames[frames.length - 1];
			if (frame.next < edges[frame.node].length) {
				const target = edges[frame.node][frame.next++];
				if (discovery[target] === -1) {
					enter(target);
					frames.push({ node: target, next: 0, parent: frame.node });
				} else if (active[target])
					low[frame.node] = Math.min(low[frame.node], discovery[target]);
			} else {
				frames.pop();
				if (frame.parent !== undefined)
					low[frame.parent] = Math.min(low[frame.parent], low[frame.node]);
				if (low[frame.node] === discovery[frame.node]) {
					const group: number[] = [];
					let top: number;
					do {
						top = stack.pop()!;
						active[top] = false;
						group.push(top);
					} while (top !== frame.node);
					if (group.length > 1 || edges[frame.node].includes(frame.node))
						groups.push(group.sort((a, b) => a - b));
				}
			}
		}
	}
	return groups.sort((a, b) => a[0] - b[0]);
}

function checkDimensionUnits(
	document: JsonObject,
	diagnostics: Diagnostic[],
): void {
	const dimensions = Array.isArray(document.dimensions)
		? document.dimensions
		: [];
	const units = Array.isArray(document.units) ? document.units : [];
	const packageIdentity = isObject(document.package)
		? document.package.identity
		: undefined;
	const seen = new Set<string>();
	const emit = (code: string, path: string, message: string) => {
		const key = `${path}:${code}`;
		if (!seen.has(key)) {
			seen.add(key);
			diagnostics.push({ code, path, message });
		}
	};
	const declarationIndex = (
		entries: unknown[],
		plural: string,
		singular: string,
	) => {
		const index = new Map<string, number>();
		entries.forEach((entry, position) => {
			if (!isObject(entry) || typeof entry.identity !== "string") return;
			const path = `${plural}.${position}.identity`;
			if (index.has(entry.identity))
				emit(
					"agent-ix.semantic-ir.DUPLICATE_IDENTITY",
					path,
					"identity is declared twice",
				);
			else index.set(entry.identity, position);
			if (
				entry.identity !==
				`ix://${packageIdentity}/${singular}/${String(entry.name)}`
			)
				emit(
					INVALID_UNIT_GRAPH,
					path,
					"identity must name its package and declaration",
				);
		});
		return index;
	};
	const dimensionById = declarationIndex(dimensions, "dimensions", "dimension");
	const unitById = declarationIndex(units, "units", "unit");
	const dimensionEdges: number[][] = dimensions.map(() => []);
	dimensions.forEach((dimension, position) => {
		if (!isObject(dimension)) return;
		const path = `dimensions.${position}`;
		const terms = Array.isArray(dimension.terms) ? dimension.terms : [];
		if (dimension.base === true && terms.length)
			emit(INVALID_UNIT_GRAPH, `${path}.terms`, "base dimension has no terms");
		let previous: string | undefined;
		terms.forEach((term, termIndex) => {
			if (!isObject(term)) return;
			const termPath = `${path}.terms.${termIndex}`;
			if (typeof term.dimension === "string") {
				const target = dimensionById.get(term.dimension);
				if (target === undefined)
					emit(
						UNRESOLVED_DIMENSION_REF,
						`${termPath}.dimension`,
						"unknown dimension reference",
					);
				else dimensionEdges[position].push(target);
				if (previous !== undefined && previous >= term.dimension)
					emit(
						INVALID_UNIT_GRAPH,
						termPath,
						"dimension terms must be strictly ordered",
					);
				previous = term.dimension;
			}
			const exponent = graphInteger(term.exponent);
			if ("error" in exponent)
				emit(
					exponent.error === "overflow"
						? "agent-ix.semantic-ir.INTEGER_OUTSIDE_I128"
						: "agent-ix.semantic-ir.INVALID_OPERAND",
					`${termPath}.exponent`,
					"exponent must be a canonical i128 integer",
				);
			else if (exponent.value === 0n)
				emit(
					INVALID_UNIT_GRAPH,
					`${termPath}.exponent`,
					"dimension exponent must be nonzero",
				);
		});
	});
	for (const group of cyclicGroups(dimensionEdges)) {
		const first = group[0];
		const members = new Set(group);
		const dimension = dimensions[first] as JsonObject;
		const terms = Array.isArray(dimension.terms) ? dimension.terms : [];
		const termIndex = terms.findIndex(
			(term) =>
				isObject(term) &&
				typeof term.dimension === "string" &&
				members.has(dimensionById.get(term.dimension) ?? -1),
		);
		emit(
			INVALID_UNIT_GRAPH,
			`dimensions.${first}.terms.${termIndex}`,
			`dimension cycle: ${group.map((i) => (isObject(dimensions[i]) ? dimensions[i].name : "")).join(", ")}`,
		);
	}
	const roots = new Map<string, number>();
	const unitEdges: number[][] = units.map(() => []);
	units.forEach((unit, position) => {
		if (!isObject(unit)) return;
		const path = `units.${position}`;
		const dimension = typeof unit.dimension === "string" ? unit.dimension : "";
		if (!dimensionById.has(dimension))
			emit(
				UNRESOLVED_DIMENSION_REF,
				`${path}.dimension`,
				"unknown dimension reference",
			);
		const parsed = new Map<string, bigint>();
		for (const member of ["scale", "offset"]) {
			const result = graphRational(unit[member]);
			if ("error" in result)
				emit(
					result.error === "overflow"
						? "agent-ix.semantic-ir.INTEGER_OUTSIDE_I128"
						: "agent-ix.semantic-ir.INVALID_OPERAND",
					`${path}.${member}`,
					"coefficient must be a canonical i128 rational",
				);
			else parsed.set(member, result.value);
		}
		if (parsed.get("scale") === 0n)
			emit(INVALID_UNIT_GRAPH, `${path}.scale`, "scale must be nonzero");
		if (typeof unit.target === "string") {
			const target = unitById.get(unit.target);
			if (target === undefined)
				emit(UNRESOLVED_UNIT_REF, `${path}.target`, "unknown unit reference");
			else {
				unitEdges[position].push(target);
				const targetUnit = units[target];
				if (
					isObject(targetUnit) &&
					typeof targetUnit.dimension === "string" &&
					dimensionById.has(dimension) &&
					dimensionById.has(targetUnit.dimension) &&
					dimension !== targetUnit.dimension
				)
					emit(
						INVALID_UNIT_GRAPH,
						`${path}.target`,
						`unit dimensions differ: ${dimension}, ${targetUnit.dimension}`,
					);
			}
		} else {
			const first = roots.get(dimension);
			if (first === undefined) roots.set(dimension, position);
			else
				emit(
					INVALID_UNIT_GRAPH,
					path,
					`dimension ${dimension} already has root ${String((units[first] as JsonObject).name)}`,
				);
			if (parsed.has("scale") && unit.scale !== "1")
				emit(INVALID_UNIT_GRAPH, `${path}.scale`, "root scale must be 1");
			if (parsed.has("offset") && unit.offset !== "0")
				emit(INVALID_UNIT_GRAPH, `${path}.offset`, "root offset must be 0");
		}
	});
	for (const group of cyclicGroups(unitEdges)) {
		let cursor = group[0];
		const names: string[] = [];
		for (let step = 0; step < group.length; step++) {
			names.push(String((units[cursor] as JsonObject).name));
			cursor = unitEdges[cursor][0];
		}
		emit(
			INVALID_UNIT_GRAPH,
			`units.${group[0]}.target`,
			`unit cycle: ${names.join(", ")}`,
		);
	}
}

function checkField(
	field: JsonObject,
	path: string,
	types: Map<string, JsonObject>,
	fields: Map<string, JsonObject>,
	diagnostics: Diagnostic[],
): void {
	const special = checkSpecialMember(field, path, types, fields, diagnostics);
	if (special) {
		if (field.multiplicity === undefined)
			diagnostics.push({
				code: "agent-ix.semantic-ir.MISSING_MULTIPLICITY",
				path: `${path}.multiplicity`,
				message: "a member declares its multiplicity",
			});
		else
			checkMultiplicity(
				field.multiplicity,
				`${path}.multiplicity`,
				diagnostics,
			);
		return;
	}
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
	if (
		Object.hasOwn(field, "defaultValue") &&
		resolved?.kind === "scalar" &&
		!valueAdmitted(resolved.scalar, field.defaultValue)
	) {
		diagnostics.push({
			code: "agent-ix.semantic-ir.INVALID_DEFAULT_VALUE",
			path: `${path}.defaultValue`,
			message: "the default value is outside the exact scalar wire domain",
		});
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
	const special = specialKind(types, fields, constraint.appliesTo);
	if (special === "malformed") {
		// Through an alias the malformed reference is refused at the alias.
		if (String(constraint.appliesTo).startsWith(QUANTITY_REFERENCE))
			diagnostics.push({
				code: "agent-ix.semantic-ir.UNRESOLVED_TYPE_REF",
				path: `${path}.appliesTo`,
				message: "a quantity type reference must be well formed",
			});
		return;
	}
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
	if (special !== undefined) {
		checkSpecialConstraint(constraint, path, special, diagnostics);
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
	const policies = decimalPolicies(types, constraint.appliesTo, fields);
	if (resolved.scalar === "decimal" && policies.length === 0) {
		diagnostics.push({
			code: "agent-ix.semantic-ir.DECIMAL_POLICY_MISSING",
			path,
			message: "a decimal constraint carries a decimal policy",
		});
	} else if (resolved.scalar === "decimal" && policies.length > 1) {
		diagnostics.push({
			code: "agent-ix.semantic-ir.DECIMAL_POLICY_CONFLICT",
			path,
			message: "a decimal resolution walk carries more than one policy",
		});
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
		const numeric = [
			"integer",
			"number",
			"decimal",
			"float32",
			"float64",
		].includes(String(resolved.scalar));
		const value = operands.value;
		const integerValue = canonicalInteger(value) ? value : undefined;
		const valid =
			numeric && resolved.scalar === "integer"
				? integerValue !== undefined && withinI128(integerValue)
				: numeric
					? typeof value === "number" && Number.isFinite(value)
					: typeof value === "string";
		if (!valid) {
			diagnostics.push({
				code:
					resolved.scalar === "integer" &&
					integerValue !== undefined &&
					!withinI128(integerValue)
						? "agent-ix.semantic-ir.INTEGER_OUTSIDE_I128"
						: "agent-ix.semantic-ir.INVALID_OPERAND",
				path: `${path}.operands.value`,
				message: `${keyword} on ${String(resolved.scalar)} takes a ${numeric ? "number" : "ISO 8601 string"}`,
			});
		}
	}
}

function checkTypeDefinition(
	definition: JsonObject,
	path: string,
	types: Map<string, JsonObject>,
	fields: Map<string, JsonObject>,
	lockExports: Set<string>,
	diagnostics: Diagnostic[],
): void {
	const refuseMalformed = (reference: unknown, at: string) => {
		if (
			typeof reference === "string" &&
			reference.startsWith(QUANTITY_REFERENCE) &&
			!quantityReference(reference)
		)
			diagnostics.push({
				code: "agent-ix.semantic-ir.UNRESOLVED_TYPE_REF",
				path: at,
				message: "a quantity type reference must be well formed",
			});
	};
	for (const member of ["target", "items", "values"])
		refuseMalformed(definition[member], `${path}.${member}`);
	if (
		definition.kind === "reference" &&
		specialKind(types, fields, definition.target) === "quantity"
	)
		diagnostics.push({
			code: "agent-ix.semantic-ir.UNRESOLVED_TYPE_REF",
			path: `${path}.target`,
			message: "a reference names an object and a quantity has no identity",
		});
	asArray(definition.variants).forEach((variant, index) =>
		refuseMalformed(
			variant.payloadType,
			`${path}.variants.${index}.payloadType`,
		),
	);
	const isRecord = isEdgeKind(definition.kind);
	if (definition.kind === "scalar" && definition.scalar === "number") {
		diagnostics.push({
			code: "agent-ix.semantic-ir.SCHEMA_VIOLATION",
			path: `${path}.scalar`,
			message:
				"the legacy number scalar is not admitted; use float32 or float64",
		});
	}
	for (const [index, field] of asArray(definition.fields).entries())
		checkField(field, `${path}.fields.${index}`, types, fields, diagnostics);
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
				types,
				fields,
				diagnostics,
			);
		}
		if (isObject(operation.returns)) {
			const special = checkSpecialMember(
				operation.returns,
				`${path}.operations.${index}.returns`,
				types,
				fields,
				diagnostics,
			);
			if (!special && !resolveKind(types, operation.returns.typeRef)) {
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
	checkDimensionUnits(document, diagnostics);
	const types = new Map<string, JsonObject>();
	for (const definition of asArray(document.types))
		types.set(String(definition.identity), definition);
	// A type whose construct kind declares the alias shape is an alias, as a
	// core `alias` is (FR-142): both reach a clock or unit for FR-146.
	const aliasKinds = new Set<string>();
	for (const entry of asArray(document.constructs)) {
		const shape = isObject(entry.construct) ? entry.construct.shape : undefined;
		if (shape === "alias" && isObject(entry.kind))
			aliasKinds.add(JSON.stringify([entry.kind.module, entry.kind.name]));
	}
	for (const definition of types.values())
		if (
			isObject(definition.kind) &&
			aliasKinds.has(
				JSON.stringify([definition.kind.module, definition.kind.name]),
			)
		)
			constructAliases.add(definition);
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

function jcsString(value: string): string {
	for (let index = 0; index < value.length; index += 1) {
		const code = value.charCodeAt(index);
		if (code >= 0xd800 && code <= 0xdbff) {
			const next = value.charCodeAt(index + 1);
			if (next >= 0xdc00 && next <= 0xdfff) {
				index += 1;
				continue;
			}
			throw new TypeError("unpaired UTF-16 surrogate");
		}
		if (code >= 0xdc00 && code <= 0xdfff)
			throw new TypeError("unpaired UTF-16 surrogate");
	}
	return JSON.stringify(value);
}

/** Canonical JSON: sorted object keys, no whitespace (JCS-style, identity-sorted sets are the caller's job). */
export function canonical(value: unknown): string {
	if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
	if (isObject(value)) {
		return `{${Object.keys(value)
			.sort()
			.map((key) => `${jcsString(key)}:${canonical(value[key])}`)
			.join(",")}}`;
	}
	if (typeof value === "string") return jcsString(value);
	if (typeof value === "number" && !Number.isFinite(value))
		throw new TypeError("non-finite number is not RFC 8785 JSON");
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
	copy.canonicalization = {
		algorithm: "rfc8785-v1",
		digest: "sha256-jcs",
	};
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
