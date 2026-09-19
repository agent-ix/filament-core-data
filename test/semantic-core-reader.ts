/**
 * Test-scoped semantic-core grammar reader (issue #35, FR-031 "Grammar rules
 * the reader enforces"). JSON Schema validates each declaration's shape; this
 * module enforces the cross-property rules a schema cannot express, over one
 * archetype instance's declaration set.
 *
 * Evidence only: imported by tests, never published.
 */

export type JsonObject = Record<string, unknown>;

export type Diagnostic = { code: string; path: string; message: string };

export const KERNEL_SCALARS = [
	"UUID",
	"Boolean",
	"Integer",
	"Decimal",
	"String",
	"Timestamp",
	"Duration",
	"Bytes",
	"JsonObject",
] as const;

/** Scalars a `unit` may attach to (FR-032 `unitAllowed`). */
export const UNIT_ALLOWED = new Set([
	"Integer",
	"Decimal",
	"Timestamp",
	"Duration",
]);

function isObject(value: unknown): value is JsonObject {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

function asArray(value: unknown): JsonObject[] {
	return Array.isArray(value) ? value.filter(isObject) : [];
}

function push(
	out: Diagnostic[],
	code: string,
	path: string,
	message: string,
): void {
	out.push({ code, path, message });
}

function checkMultiplicity(
	value: unknown,
	path: string,
	out: Diagnostic[],
): void {
	if (!isObject(value)) return;
	const lower = value.lower;
	const upper = value.upper;
	if (typeof lower !== "number" || lower < 0) {
		push(
			out,
			"agent-ix.semantic-core.INVALID_MULTIPLICITY",
			`${path}.lower`,
			"lower must be >= 0",
		);
		return;
	}
	if (upper !== undefined && (typeof upper !== "number" || upper < lower)) {
		push(
			out,
			"agent-ix.semantic-core.INVALID_MULTIPLICITY",
			`${path}.upper`,
			"upper must be >= lower",
		);
		return;
	}
	const collection = upper === undefined || upper > 1;
	if (!collection && (value.ordered === true || value.unique === true))
		push(
			out,
			"agent-ix.semantic-core.FLAGS_ON_NON_COLLECTION",
			path,
			"ordered/unique need a collection",
		);
}

function checkTypeRef(
	ref: unknown,
	path: string,
	out: Diagnostic[],
	isReturns = false,
): void {
	if (!isObject(ref)) return;
	const target = String(ref.target);
	const kernel = (KERNEL_SCALARS as readonly string[]).includes(target);
	checkMultiplicity(ref.multiplicity, `${path}.multiplicity`, out);
	if (target === "Decimal" && ref.decimal === undefined)
		push(
			out,
			"agent-ix.semantic-core.MISSING_DECIMAL_POLICY",
			`${path}.decimal`,
			"Decimal needs precision and scale",
		);
	if (target !== "Decimal" && ref.decimal !== undefined)
		push(
			out,
			"agent-ix.semantic-core.DECIMAL_ON_NON_DECIMAL",
			`${path}.decimal`,
			"decimal is only for Decimal",
		);
	if (ref.unit !== undefined) {
		if (isReturns)
			push(
				out,
				"agent-ix.semantic-core.UNIT_ON_RETURNS",
				`${path}.unit`,
				"returns carries no unit",
			);
		else if (!kernel || !UNIT_ALLOWED.has(target))
			push(
				out,
				"agent-ix.semantic-core.UNIT_NOT_ALLOWED",
				`${path}.unit`,
				`unit is not allowed on ${target}`,
			);
	}
}

function checkFields(
	fields: JsonObject[],
	path: string,
	out: Diagnostic[],
): void {
	const names = new Set<string>();
	fields.forEach((field, index) => {
		const name = String(field.name);
		if (names.has(name))
			push(
				out,
				"agent-ix.semantic-core.DUPLICATE_NAME",
				`${path}.${index}.name`,
				`duplicate ${name}`,
			);
		names.add(name);
		checkTypeRef(field.type, `${path}.${index}.type`, out);
		if (field.identity === true && isObject(field.type)) {
			const multiplicity = isObject(field.type.multiplicity)
				? field.type.multiplicity
				: { lower: 1, upper: 1 };
			if (multiplicity.lower !== 1 || multiplicity.upper !== 1)
				push(
					out,
					"agent-ix.semantic-core.IDENTITY_NOT_SINGLE",
					`${path}.${index}.identity`,
					"identity needs 1..1",
				);
			if (field.type.target === "JsonObject")
				push(
					out,
					"agent-ix.semantic-core.IDENTITY_ON_JSON_OBJECT",
					`${path}.${index}.identity`,
					"JsonObject cannot be an identity",
				);
		}
	});
}

/** Reads one archetype instance's declaration set and returns the grammar-rule diagnostics. */
export function readDeclarations(instance: unknown): Diagnostic[] {
	const out: Diagnostic[] = [];
	if (!isObject(instance))
		return [
			{
				code: "agent-ix.semantic-core.INVALID_INSTANCE",
				path: "",
				message: "not an object",
			},
		];
	checkFields(asArray(instance.fields), "fields", out);

	const relationKeys = new Set<string>();
	asArray(instance.relations).forEach((relation, index) => {
		const key = `${String(relation.verb)}→${String(relation.target)}`;
		if (relationKeys.has(key))
			push(
				out,
				"agent-ix.semantic-core.DUPLICATE_RELATION",
				`relations.${index}`,
				`duplicate ${key}`,
			);
		relationKeys.add(key);
		checkMultiplicity(
			relation.multiplicity,
			`relations.${index}.multiplicity`,
			out,
		);
	});

	const clauseIds = new Set<string>();
	asArray(instance.clauses).forEach((clause, index) => {
		const id = String(clause.clauseId);
		if (clauseIds.has(id))
			push(
				out,
				"agent-ix.semantic-core.DUPLICATE_CLAUSE_ID",
				`clauses.${index}.clauseId`,
				`duplicate ${id}`,
			);
		clauseIds.add(id);
	});

	const operationNames = new Set<string>();
	asArray(instance.operations).forEach((operation, index) => {
		const name = String(operation.name);
		if (operationNames.has(name))
			push(
				out,
				"agent-ix.semantic-core.DUPLICATE_NAME",
				`operations.${index}.name`,
				`duplicate ${name}`,
			);
		operationNames.add(name);
		checkFields(asArray(operation.params), `operations.${index}.params`, out);
		checkTypeRef(operation.returns, `operations.${index}.returns`, out, true);
		for (const side of ["pre", "post"] as const) {
			const seen = new Set<string>();
			asArray(operation[side]).forEach((ref, refIndex) => {
				const id = String(ref.clauseId);
				if (seen.has(id))
					push(
						out,
						"agent-ix.semantic-core.DUPLICATE_CLAUSE_ID",
						`operations.${index}.${side}.${refIndex}.clauseId`,
						`duplicate ${id}`,
					);
				seen.add(id);
			});
		}
	});

	const values = new Set<string>();
	asArray(instance.enumValues).forEach((entry, index) => {
		const value = String(entry.value);
		if (values.has(value))
			push(
				out,
				"agent-ix.semantic-core.DUPLICATE_ENUM_VALUE",
				`enumValues.${index}.value`,
				`duplicate ${value}`,
			);
		values.add(value);
	});
	return out;
}
