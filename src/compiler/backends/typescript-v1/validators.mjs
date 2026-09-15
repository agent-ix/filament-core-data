/**
 * The generated runtime validators (FR-066, Task-107).
 *
 * `renderValidators` returns the two runtime modules of the emitted package:
 * `errors.ts`, which carries the closed structural-code register, the
 * `ValidationError` and `ValidationResult` shapes, the declared depth bound and
 * the small runtime the checks share; and `validators.ts`, which carries one
 * `validate<Type>` per exported type.
 *
 * Three properties shape almost every decision below.
 *
 * **No cast.** FR-066 forbids a type assertion anywhere in generated source, so
 * the narrowing from `unknown` to the generated type happens in exactly one
 * construct: a user-defined type predicate, `check<Type>(value): value is Type`.
 * A predicate is not an assertion — it is a function whose body a reader can
 * check — and `types.mjs` already uses one for the branded reference
 * constructor. Every generated validator is therefore two functions: a
 * `prepare` pass that builds the value the caller will receive (semantic
 * defaults applied, undeclared members separated), and a `check` predicate that
 * decides it and narrows it.
 *
 * **No coercion, no getter.** Every member is read through
 * `Object.getOwnPropertyDescriptor`, which cannot invoke an accessor, so a
 * getter that throws cannot make a validator throw and a getter returning a
 * different value on each read cannot make the check disagree with the value
 * returned. An own accessor property is reported rather than invoked; an
 * inherited member is absent.
 *
 * **No third-party runtime.** Every check is generated code. The `ajv` of
 * FR-066's differential check is a test-time second decider and never enters the
 * generated package, whose external dependency closure is empty.
 *
 * The canonical form the `unique` check compares by is generated into
 * `errors.ts` rather than into `validators.ts`. `errors.ts` is the package's
 * fixed validation runtime — codes, shapes, bounds — and is identical for every
 * document; `validators.ts` is generated per type. A shared, document-independent
 * routine belongs with the rest of the fixed runtime, and putting it there keeps
 * a consumer that imports only the error vocabulary from reaching the per-type
 * checks.
 *
 * Two readings are *declared backend decisions pending*
 * `agent-ix/filament-core-data#58`, which records that the published contract
 * states no JSON wire form for the `bytes` kernel scalar and none for a
 * discriminated union's tag: `bytes` is standard base64 as RFC 4648 §4 defines
 * it, and its `minLength`/`maxLength` count decoded octets; a union is
 * internally tagged on the property `names.mjs` exports as
 * `UNION_DISCRIMINANT`. Issue #21 recorded a different reading of the union tag
 * against the same gap, so the two backends disagree and only the contract's
 * owner can reconcile them. `conformance/thresholds.json` permits this slot zero
 * divergences, so a ruling against either reading is a reported failure for the
 * owner rather than a suppression this work may register.
 */

import { UNION_DISCRIMINANT } from "./names.mjs";

/**
 * The closed structural-code register, generated into `errors.ts`.
 *
 * A constraint failure never draws from this list — it reports the constraint's
 * own `diagnosticCode`, which the document carries. These are the failures that
 * are structural: a value of the wrong JavaScript type, a member absent where
 * the contract requires one, a collection outside its declared bounds.
 */
export const STRUCTURAL_CODES = Object.freeze({
	NOT_AN_OBJECT: "agent-ix.typescript-backend.NOT_AN_OBJECT",
	NOT_AN_ARRAY: "agent-ix.typescript-backend.NOT_AN_ARRAY",
	NOT_A_STRING: "agent-ix.typescript-backend.NOT_A_STRING",
	NOT_A_NUMBER: "agent-ix.typescript-backend.NOT_A_NUMBER",
	NOT_A_BOOLEAN: "agent-ix.typescript-backend.NOT_A_BOOLEAN",
	MISSING_REQUIRED: "agent-ix.typescript-backend.MISSING_REQUIRED",
	EXPLICIT_UNDEFINED: "agent-ix.typescript-backend.EXPLICIT_UNDEFINED",
	NULL_NOT_PERMITTED: "agent-ix.typescript-backend.NULL_NOT_PERMITTED",
	ACCESSOR_MEMBER: "agent-ix.typescript-backend.ACCESSOR_MEMBER",
	UNKNOWN_MEMBER: "agent-ix.typescript-backend.UNKNOWN_MEMBER",
	UNKNOWN_MEMBER_SURFACED:
		"agent-ix.typescript-backend.UNKNOWN_MEMBER_SURFACED",
	NOT_AN_INTEGER: "agent-ix.typescript-backend.NOT_AN_INTEGER",
	NOT_A_NUMBER_VALUE: "agent-ix.typescript-backend.NOT_A_NUMBER_VALUE",
	NOT_FINITE: "agent-ix.typescript-backend.NOT_FINITE",
	INTEGER_OUT_OF_SAFE_RANGE:
		"agent-ix.typescript-backend.INTEGER_OUT_OF_SAFE_RANGE",
	NOT_BASE64: "agent-ix.typescript-backend.NOT_BASE64",
	NOT_A_DECLARED_VARIANT: "agent-ix.typescript-backend.NOT_A_DECLARED_VARIANT",
	MISSING_DISCRIMINANT: "agent-ix.typescript-backend.MISSING_DISCRIMINANT",
	COLLECTION_TOO_SHORT: "agent-ix.typescript-backend.COLLECTION_TOO_SHORT",
	COLLECTION_TOO_LONG: "agent-ix.typescript-backend.COLLECTION_TOO_LONG",
	COLLECTION_NOT_UNIQUE: "agent-ix.typescript-backend.COLLECTION_NOT_UNIQUE",
	DEPTH_LIMIT_EXCEEDED: "agent-ix.typescript-backend.DEPTH_LIMIT_EXCEEDED",
	SHAPE_MISMATCH: "agent-ix.typescript-backend.SHAPE_MISMATCH",
});

/** The declared recursion bound the generated validators carry. */
export const MAX_VALIDATION_DEPTH = 256;

/** The member a `preserve` or `surface` record carries its unknowns in. */
export const PRESERVED_MEMBER = "__unknown";

/** The format names this backend generates a check for. */
const FORMAT_CHECKS = Object.freeze({
	"agent-ix:uuid":
		"/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/",
	"agent-ix:date": "/^\\d{4}-\\d{2}-\\d{2}$/",
	"agent-ix:date-time":
		"/^\\d{4}-\\d{2}-\\d{2}[Tt]\\d{2}:\\d{2}:\\d{2}(\\.\\d+)?([Zz]|[+-]\\d{2}:\\d{2})$/",
	"agent-ix:duration":
		"/^[-+]?P(?!$)(\\d+Y)?(\\d+M)?(\\d+W)?(\\d+D)?(T(?!$)(\\d+H)?(\\d+M)?(\\d+(\\.\\d+)?S)?)?$/",
	"agent-ix:email": "/^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/",
	"agent-ix:uri": "/^[A-Za-z][A-Za-z0-9+.-]*:/",
});

/** A JSON string literal, which is also a valid TypeScript string literal. */
function literal(value) {
	return JSON.stringify(value);
}

/** An RFC 6901 reference token: `~` becomes `~0` and `/` becomes `~1`. */
function pointerToken(name) {
	return String(name).replaceAll("~", "~0").replaceAll("/", "~1");
}

/**
 * A constraint hangs on a *type* — `appliesTo` is a type identity — and the
 * frontend mints an alias type per constrained property, so a field typed
 * `Millis` is subject to the `min` its target `Count` declares. That chain is
 * walked by *delegation* rather than by collection: an alias's check calls its
 * target's, which applies the target's own constraints. Collecting the chain
 * here as well would apply every constraint twice and would apply it to a value
 * the alias's own check has not narrowed.
 */

/** The generated expression checking one constraint against `candidate`. */
function constraintCondition(constraint, subject) {
	const operands = constraint.operands ?? {};
	const scalar = subject.scalar;
	const length = lengthExpression(subject);
	switch (constraint.keyword) {
		case "min":
			return orderedCondition(scalar, ">=", operands.value);
		case "max":
			return orderedCondition(scalar, "<=", operands.value);
		case "exclusiveMin":
			return orderedCondition(scalar, ">", operands.value);
		case "exclusiveMax":
			return orderedCondition(scalar, "<", operands.value);
		case "minLength":
			return length && `${length} >= ${literal(operands.value)}`;
		case "maxLength":
			return length && `${length} <= ${literal(operands.value)}`;
		case "pattern":
			return `new RegExp(${literal(operands.regex)}).test(candidate)`;
		case "enumValues": {
			const values = (operands.values ?? [])
				.map((entry) => literal(entry))
				.join(", ");
			return `[${values}].some((member) => Object.is(member, candidate))`;
		}
		case "nonEmpty":
			return length && `${length} > 0`;
		case "unique":
			return "isUniqueCollection(candidate)";
		case "format":
			return formatCondition(operands.name);
		default:
			return undefined;
	}
}

/**
 * The ordered comparison for a keyword's subject.
 *
 * `date` and `datetime` operands arrive as ISO-8601 strings and are compared by
 * their instant rather than lexically, because two spellings of one instant are
 * one value. `duration` never reaches here: FR-066 records an ordering
 * constraint on a duration subject as a representability loss, because ISO-8601
 * designators admit no total order without a calendar.
 */
function orderedCondition(scalar, operator, value) {
	if (scalar === "date" || scalar === "datetime") {
		return `Date.parse(candidate) ${operator} Date.parse(${literal(value)})`;
	}
	return `candidate ${operator} ${literal(value)}`;
}

/**
 * The length a `minLength` or `maxLength` counts.
 *
 * A `string` subject counts Unicode code points, so an astral character counts
 * once rather than twice. A `bytes` subject counts the octets its base64
 * encoding decodes to — a declared decision pending
 * `agent-ix/filament-core-data#58`.
 */
function lengthExpression(subject) {
	if (subject.kind === "sequence") return "candidate.length";
	if (subject.kind === "map") return "ownKeys(candidate).length";
	if (subject.scalar === "bytes") return "base64OctetLength(candidate)";
	if (subject.scalar === undefined) return undefined;
	return "codePointLength(candidate)";
}

function formatCondition(name) {
	const pattern = FORMAT_CHECKS[name];
	if (pattern === undefined) return undefined;
	return `${pattern}.test(candidate)`;
}

/**
 * A condition wrapped in parentheses only where negating it needs them.
 *
 * A call or a member expression negates directly; a comparison does not. The
 * pinned formatter removes a redundant pair, so emitting one would make the
 * generated text differ from the formatted text for no reason.
 */
function negatable(condition) {
	return /\s(?:&&|\|\||===|!==|>=|<=|>|<)\s/.test(condition)
		? `(${condition})`
		: condition;
}

/** The generated statements applying every constraint reaching `identity`. */
function constraintStatements(model, identity, indent) {
	const entry = model.typesByIdentity[identity];
	const lines = [];
	for (const constraint of entry?.constraints ?? []) {
		const condition = constraintCondition(constraint, entry);
		if (!condition) {
			// FR-068 refuses a constraint inapplicable to its resolved subject
			// before generation begins, so this is unreachable for an admitted
			// document. Where it is reached it is a defect in this generator, and a
			// loud failure is better than source that does not compile.
			throw new TypeError(
				`no check is declared for the ${constraint.keyword} constraint on ${entry?.identity}`,
			);
		}
		lines.push(
			`${indent}if (!${negatable(condition)}) {`,
			`${indent}\tfail(errors, pointer, ${literal(constraint.diagnosticCode)}, ${literal(`the ${constraint.keyword} constraint ${constraint.identity} is not satisfied`)});`,
			`${indent}}`,
		);
	}
	return lines;
}

/** The primitive `typeof` guard and structural code for each kernel scalar. */
const SCALAR_GUARDS = Object.freeze({
	boolean: { test: 'typeof candidate === "boolean"', code: "NOT_A_BOOLEAN" },
	integer: { test: 'typeof candidate === "number"', code: "NOT_A_NUMBER" },
	number: { test: 'typeof candidate === "number"', code: "NOT_A_NUMBER" },
	string: { test: 'typeof candidate === "string"', code: "NOT_A_STRING" },
	bytes: { test: 'typeof candidate === "string"', code: "NOT_A_STRING" },
	date: { test: 'typeof candidate === "string"', code: "NOT_A_STRING" },
	datetime: { test: 'typeof candidate === "string"', code: "NOT_A_STRING" },
	duration: { test: 'typeof candidate === "string"', code: "NOT_A_STRING" },
	uuid: { test: 'typeof candidate === "string"', code: "NOT_A_STRING" },
});

/** The numeric-domain statements an `integer` or `number` subject earns. */
function numericStatements(scalar, indent) {
	const lines = [
		`${indent}if (Number.isNaN(candidate)) {`,
		`${indent}\tfail(errors, pointer, CODES.NOT_A_NUMBER_VALUE, "the value is NaN");`,
		`${indent}\treturn false;`,
		`${indent}}`,
		`${indent}if (!Number.isFinite(candidate)) {`,
		`${indent}\tfail(errors, pointer, CODES.NOT_FINITE, "the value is not finite");`,
		`${indent}\treturn false;`,
		`${indent}}`,
	];
	if (scalar !== "integer") return lines;
	return [
		...lines,
		`${indent}if (!Number.isInteger(candidate)) {`,
		`${indent}\tfail(errors, pointer, CODES.NOT_AN_INTEGER, "the value is not an integer");`,
		`${indent}\treturn false;`,
		`${indent}}`,
		`${indent}if (!Number.isSafeInteger(candidate)) {`,
		`${indent}\tfail(errors, pointer, CODES.INTEGER_OUT_OF_SAFE_RANGE, "the magnitude exceeds Number.MAX_SAFE_INTEGER");`,
		`${indent}\treturn false;`,
		`${indent}}`,
	];
}

/** The body of a scalar type's `check` predicate. */
function scalarCheckBody(model, entry) {
	const guard = SCALAR_GUARDS[entry.scalar];
	const lines = [];
	if (guard === undefined) {
		lines.push(
			`\tfail(errors, pointer, CODES.SHAPE_MISMATCH, "no check is generated for this scalar");`,
			"\treturn false;",
		);
		return lines;
	}
	lines.push(
		`\tif (!(${guard.test})) {`,
		`\t\tfail(errors, pointer, CODES.${guard.code}, "the value is of the wrong type");`,
		"\t\treturn false;",
		"\t}",
	);
	if (entry.scalar === "integer" || entry.scalar === "number") {
		lines.push(...numericStatements(entry.scalar, "\t"));
	}
	if (entry.scalar === "bytes") {
		lines.push(
			"\tif (!isBase64(candidate)) {",
			'\t\tfail(errors, pointer, CODES.NOT_BASE64, "the value is not well-formed base64");',
			"\t\treturn false;",
			"\t}",
		);
	}
	lines.push(...constraintStatements(model, entry.identity, "\t"));
	lines.push("\treturn errors.length === before;");
	return lines;
}

/** The body of an `enum` type's `check` predicate. */
function enumCheckBody(model, entry) {
	const names = (entry.variants ?? []).map((variant) => variant.name);
	return [
		'\tif (typeof candidate !== "string") {',
		'\t\tfail(errors, pointer, CODES.NOT_A_STRING, "the value is of the wrong type");',
		"\t\treturn false;",
		"\t}",
		...nameSet("\t", "variants", names),
		"\tif (!variants.includes(candidate)) {",
		'\t\tfail(errors, pointer, CODES.NOT_A_DECLARED_VARIANT, "the value names no declared variant");',
		"\t\treturn false;",
		"\t}",
		...constraintStatements(model, entry.identity, "\t"),
		"\treturn errors.length === before;",
	];
}

/** The body of a `union` type's `check` predicate. */
function unionCheckBody(entry) {
	if (entry.wireForm === "untagged") {
		const lines = ["\tconst branchErrors: ValidationError[] = [];"];
		for (const variant of entry.variants ?? []) {
			if (variant.payload?.declared !== true) continue;
			lines.push(
				"\tbranchErrors.length = 0;",
				`\tif (${checkCall(variant.payload, "candidate", "pointer").replace("errors", "branchErrors")}) return true;`,
			);
		}
		lines.push(
			'\tfail(errors, pointer, CODES.SHAPE_MISMATCH, "the value matches no declared union branch");',
			"\treturn false;",
		);
		return lines;
	}
	const lines = [
		"\tif (!isPlainObject(candidate)) {",
		'\t\tfail(errors, pointer, CODES.NOT_AN_OBJECT, "the value is not an object");',
		"\t\treturn false;",
		"\t}",
		`\tconst tag = ownMember(candidate, ${literal(UNION_DISCRIMINANT)});`,
		'\tif (tag.state !== "value" || typeof tag.value !== "string") {',
		'\t\tfail(errors, pointer, CODES.MISSING_DISCRIMINANT, "the discriminant is absent or is not a string");',
		"\t\treturn false;",
		"\t}",
		"\tswitch (tag.value) {",
	];
	for (const variant of entry.variants ?? []) {
		lines.push(`\t\tcase ${literal(variant.name)}: {`);
		if (variant.payload === undefined) {
			lines.push("\t\t\tbreak;");
		} else {
			lines.push(
				'\t\t\tconst payload = ownMember(candidate, "value");',
				'\t\t\tif (payload.state !== "value") {',
				'\t\t\t\tfail(errors, join(pointer, "value"), CODES.MISSING_REQUIRED, "the variant payload is absent");',
				"\t\t\t\tbreak;",
				"\t\t\t}",
				`\t\t\t${checkCall(variant.payload, "payload.value", 'join(pointer, "value")')};`,
				"\t\t\tbreak;",
			);
		}
		lines.push("\t\t}");
	}
	lines.push(
		"\t\tdefault: {",
		'\t\t\tfail(errors, pointer, CODES.NOT_A_DECLARED_VARIANT, "the discriminant names no declared variant");',
		"\t\t\tbreak;",
		"\t\t}",
		"\t}",
		"\treturn errors.length === before;",
	);
	return lines;
}

/** The generated call checking one element summary. */
function checkCall(element, valueExpression, pointerExpression) {
	if (element === undefined || element.declared !== true) {
		return `fail(errors, ${pointerExpression}, CODES.SHAPE_MISMATCH, "the element type is not declared")`;
	}
	return `check${element.identifier}(${valueExpression}, ${pointerExpression}, errors, surfaced, depth + 1)`;
}

/** The body of a `sequence` type's `check` predicate. */
function sequenceCheckBody(model, entry) {
	return [
		"\tif (!Array.isArray(candidate)) {",
		'\t\tfail(errors, pointer, CODES.NOT_AN_ARRAY, "the value is not an array");',
		"\t\treturn false;",
		"\t}",
		"\tfor (let index = 0; index < candidate.length; index += 1) {",
		`\t\t${checkCall(entry.itemsEntry, "candidate[index]", "join(pointer, String(index))")};`,
		"\t}",
		...constraintStatements(model, entry.identity, "\t"),
		"\treturn errors.length === before;",
	];
}

/** The body of a `map` type's `check` predicate. */
function mapCheckBody(model, entry) {
	return [
		"\tif (!isPlainObject(candidate)) {",
		'\t\tfail(errors, pointer, CODES.NOT_AN_OBJECT, "the value is not an object");',
		"\t\treturn false;",
		"\t}",
		"\tfor (const key of ownKeys(candidate)) {",
		"\t\tconst member = ownMember(candidate, key);",
		'\t\tif (member.state === "accessor") {',
		'\t\t\tfail(errors, join(pointer, key), CODES.ACCESSOR_MEMBER, "the member is an accessor and is not read");',
		"\t\t\tcontinue;",
		"\t\t}",
		`\t\t${checkCall(entry.valuesEntry, "member.value", "join(pointer, key)")};`,
		"\t}",
		...constraintStatements(model, entry.identity, "\t"),
		"\treturn errors.length === before;",
	];
}

/** The body of an `alias` or `reference` type's `check` predicate. */
function delegatingCheckBody(model, entry) {
	const lines = [];
	if (entry.kind === "reference") {
		lines.push(
			'\tif (typeof candidate !== "string") {',
			'\t\tfail(errors, pointer, CODES.NOT_A_STRING, "a reference is carried as a string");',
			"\t\treturn false;",
			"\t}",
		);
		lines.push(...constraintStatements(model, entry.identity, "\t"));
		lines.push("\treturn errors.length === before;");
		return lines;
	}
	// The predicate call sits in the condition so its `candidate is T` narrows
	// the value the alias's own constraints are then applied to. The target's
	// failures are already in `errors`, so nothing is lost by not entering.
	const own = constraintStatements(model, entry.identity, "\t\t");
	lines.push(
		`\tif (${checkCall(entry.targetEntry, "candidate", "pointer")}) {`,
		...(own.length > 0
			? own
			: ["\t\t// The target declares every constraint."]),
		"\t}",
	);
	lines.push("\treturn errors.length === before;");
	return lines;
}

/** The per-field statements of a record's `check` predicate. */
function fieldStatements(field) {
	const token = literal(pointerToken(field.name));
	const lines = [
		`\t{`,
		`\t\tconst member = ownMember(candidate, ${literal(field.name)});`,
		`\t\tconst at = join(pointer, ${token});`,
		'\t\tif (member.state === "accessor") {',
		'\t\t\tfail(errors, at, CODES.ACCESSOR_MEMBER, "the member is an accessor and is not read");',
		'\t\t} else if (member.state === "absent") {',
	];
	lines.push(
		field.optional
			? "\t\t\t// An absent optional property is accepted."
			: '\t\t\tfail(errors, at, CODES.MISSING_REQUIRED, "the property is absent");',
	);
	lines.push(
		"\t\t} else if (member.value === undefined) {",
		'\t\t\tfail(errors, at, CODES.EXPLICIT_UNDEFINED, "the property is present with the value undefined");',
		"\t\t} else if (member.value === null) {",
	);
	lines.push(
		field.nullable
			? "\t\t\t// A null value is accepted: the field is nullable."
			: '\t\t\tfail(errors, at, CODES.NULL_NOT_PERMITTED, "the property is null and the field is not nullable");',
	);
	lines.push("\t\t} else {");
	if (field.collection) {
		const lower = field.multiplicity?.lower;
		const upper = field.multiplicity?.upper;
		lines.push(
			"\t\t\tif (!Array.isArray(member.value)) {",
			'\t\t\t\tfail(errors, at, CODES.NOT_AN_ARRAY, "the value is not an array");',
			"\t\t\t} else {",
		);
		if (typeof lower === "number" && lower > 0) {
			lines.push(
				`\t\t\t\tif (member.value.length < ${literal(lower)}) {`,
				`\t\t\t\t\tfail(errors, at, CODES.COLLECTION_TOO_SHORT, "the collection is shorter than its declared lower bound");`,
				"\t\t\t\t}",
			);
		}
		if (typeof upper === "number") {
			lines.push(
				`\t\t\t\tif (member.value.length > ${literal(upper)}) {`,
				`\t\t\t\t\tfail(errors, at, CODES.COLLECTION_TOO_LONG, "the collection is longer than its declared upper bound");`,
				"\t\t\t\t}",
			);
		}
		if (field.multiplicity?.unique === true) {
			lines.push(
				"\t\t\t\tif (!isUniqueCollection(member.value)) {",
				'\t\t\t\t\tfail(errors, at, CODES.COLLECTION_NOT_UNIQUE, "two members share a canonical form");',
				"\t\t\t\t}",
			);
		}
		lines.push(
			"\t\t\t\tfor (let index = 0; index < member.value.length; index += 1) {",
			`\t\t\t\t\t${checkCall(field.element, "member.value[index]", "join(at, String(index))")};`,
			"\t\t\t\t}",
			"\t\t\t}",
		);
	} else {
		lines.push(`\t\t\t${checkCall(field.element, "member.value", "at")};`);
	}
	lines.push("\t\t}", "\t}");
	return lines;
}

/** A `const name = [...]` binding, broken across lines where it must be. */
function nameSet(indent, name, names) {
	const inline = `[${names.map((member) => literal(member)).join(", ")}]`;
	const single = `${indent}const ${name}: readonly string[] = ${inline};`;
	if (single.length <= LINE_WIDTH) return [single];
	return [
		`${indent}const ${name}: readonly string[] = [`,
		...names.map((member) => `${indent}\t${literal(member)},`),
		`${indent}];`,
	];
}

/** The body of a `record` type's `check` predicate. */
function recordCheckBody(model, entry) {
	const declared = (entry.fields ?? []).map((field) => field.name);
	const lines = [
		"\tif (!isPlainObject(candidate)) {",
		'\t\tfail(errors, pointer, CODES.NOT_AN_OBJECT, "the value is not an object");',
		"\t\treturn false;",
		"\t}",
	];
	for (const field of entry.fields ?? []) lines.push(...fieldStatements(field));
	if (entry.unknownPolicy === "reject") {
		lines.push(
			...nameSet("\t", "declared", declared),
			`\tfor (const key of ownKeys(candidate)) {`,
			"\t\tif (declared.includes(key)) continue;",
			"\t\tfail(",
			"\t\t\terrors,",
			"\t\t\tjoin(pointer, key),",
			"\t\t\tCODES.UNKNOWN_MEMBER,",
			'\t\t\t"the member is not declared and this record rejects unknown members",',
			"\t\t);",
			"\t}",
		);
	} else if (entry.unknownPolicy === "surface") {
		lines.push(
			`\tconst carried = ownMember(candidate, ${literal(PRESERVED_MEMBER)});`,
			'\tif (carried.state === "value" && isPlainObject(carried.value)) {',
			"\t\tfor (const key of ownKeys(carried.value)) {",
			"\t\t\tfail(",
			"\t\t\t\tsurfaced,",
			"\t\t\t\tjoin(pointer, key),",
			"\t\t\t\tCODES.UNKNOWN_MEMBER_SURFACED,",
			'\t\t\t\t"the member is not declared and this record surfaces unknown members",',
			"\t\t\t);",
			"\t\t}",
			"\t}",
		);
	}
	lines.push(...constraintStatements(model, entry.identity, "\t"));
	lines.push("\treturn errors.length === before;");
	return lines;
}

const CHECK_BODIES = Object.freeze({
	scalar: (model, entry) => scalarCheckBody(model, entry),
	enum: (model, entry) => enumCheckBody(model, entry),
	union: (_model, entry) => unionCheckBody(entry),
	sequence: (model, entry) => sequenceCheckBody(model, entry),
	map: (model, entry) => mapCheckBody(model, entry),
	alias: (model, entry) => delegatingCheckBody(model, entry),
	reference: (model, entry) => delegatingCheckBody(model, entry),
	record: (model, entry) => recordCheckBody(model, entry),
});

/**
 * The `prepare` pass: the value the caller receives.
 *
 * It applies `semantic` defaults, separates undeclared members under
 * `preserve` and `surface`, and recurses so a default nested three records deep
 * is applied too. It is total and reports nothing: every judgement belongs to
 * the `check` predicate, so a hostile value reaches the checks unchanged rather
 * than being rejected by a pass whose errors nobody collected.
 */
function prepareBody(model, entry) {
	if (entry.kind === "record") return recordPrepareBody(entry);
	if (entry.kind === "sequence") {
		return [
			"\tif (!Array.isArray(value)) return value;",
			`\treturn value.map((member) => prepare${entry.itemsEntry?.identifier ?? ""}(member, depth + 1));`,
		];
	}
	if (entry.kind === "map") {
		return [
			"\tif (!isPlainObject(value)) return value;",
			"\tconst out: Record<string, unknown> = Object.create(null);",
			"\tlet accessor = false;",
			"\tfor (const key of ownKeys(value)) {",
			"\t\tconst member = ownMember(value, key);",
			'\t\tif (member.state === "accessor") {',
			"\t\t\tcopyAccessor(out, value, key);",
			"\t\t\taccessor = true;",
			"\t\t\tcontinue;",
			"\t\t}",
			'\t\tif (member.state !== "value") continue;',
			`\t\tout[key] = prepare${entry.valuesEntry?.identifier ?? ""}(member.value, depth + 1);`,
			"\t}",
			"\treturn accessor ? out : { ...out };",
		];
	}
	if (entry.kind === "alias") {
		return [
			`\treturn prepare${entry.targetEntry?.identifier ?? ""}(value, depth + 1);`,
		];
	}
	if (entry.kind === "union") return unionPrepareBody(entry);
	return ["\treturn value;"];
}

function unionPrepareBody(entry) {
	if (entry.wireForm === "untagged") {
		const lines = [];
		for (const variant of entry.variants ?? []) {
			if (variant.payload?.declared !== true) continue;
			lines.push(
				`\tif (check${variant.payload.identifier}(value, "", [], [], depth + 1)) return prepare${variant.payload.identifier}(value, depth + 1);`,
			);
		}
		lines.push("\treturn value;");
		return lines;
	}
	const withPayload = (entry.variants ?? []).filter(
		(variant) => variant.payload?.declared === true,
	);
	if (withPayload.length === 0) return ["\treturn value;"];
	const lines = [
		"\tif (!isPlainObject(value)) return value;",
		`\tconst tag = ownMember(value, ${literal(UNION_DISCRIMINANT)});`,
		'\tconst payload = ownMember(value, "value");',
		'\tif (tag.state !== "value" || payload.state !== "value") return value;',
		"\tswitch (tag.value) {",
	];
	for (const variant of withPayload) {
		lines.push(
			`\t\tcase ${literal(variant.name)}:`,
			`\t\t\treturn { ...value, value: prepare${variant.payload.identifier}(payload.value, depth + 1) };`,
		);
	}
	lines.push("\t\tdefault:", "\t\t\treturn value;", "\t}");
	return lines;
}

function recordPrepareBody(entry) {
	const declared = (entry.fields ?? []).map((field) => field.name);
	const separates =
		entry.unknownPolicy === "preserve" || entry.unknownPolicy === "surface";
	const lines = [
		"\tif (!isPlainObject(value)) return value;",
		// A null-prototype accumulator, so a member named `__proto__` becomes an
		// own data property rather than reaching a prototype setter.
		"\tconst out: Record<string, unknown> = Object.create(null);",
		"\tlet accessor = false;",
	];
	for (const field of entry.fields ?? []) {
		const name = literal(field.name);
		const prepareCall =
			field.element?.declared === true
				? `prepare${field.element.identifier}`
				: undefined;
		lines.push(
			"\t{",
			`\t\tconst member = ownMember(value, ${name});`,
			'\t\tif (member.state === "value") {',
		);
		if (prepareCall === undefined) {
			lines.push(`\t\t\tout[${name}] = member.value;`);
		} else if (field.collection) {
			lines.push(
				"\t\t\tout[" + name + "] = Array.isArray(member.value)",
				`\t\t\t\t? member.value.map((item) => ${prepareCall}(item, depth + 1))`,
				"\t\t\t\t: member.value;",
			);
		} else {
			lines.push(
				`\t\t\tout[${name}] =`,
				"\t\t\t\tmember.value === null",
				"\t\t\t\t\t? member.value",
				`\t\t\t\t\t: ${prepareCall}(member.value, depth + 1);`,
			);
		}
		if (field.defaultKind === "semantic") {
			lines.push(
				'\t\t} else if (member.state === "absent") {',
				`\t\t\tout[${name}] = ${literal(field.defaultValue ?? null)};`,
			);
		}
		lines.push(
			'\t\t} else if (member.state === "accessor") {',
			`\t\t\tcopyAccessor(out, value, ${name});`,
			"\t\t\taccessor = true;",
		);
		lines.push("\t\t}", "\t}");
	}
	if (separates) {
		lines.push(
			...nameSet("\t", "declared", declared),
			"\tconst carried: Record<string, unknown> = Object.create(null);",
			"\tlet carriedAny = false;",
			"\tfor (const key of ownKeys(value)) {",
			"\t\tif (declared.includes(key)) continue;",
			"\t\tconst member = ownMember(value, key);",
			'\t\tif (member.state !== "value") continue;',
			"\t\tcarried[key] = member.value;",
			"\t\tcarriedAny = true;",
			"\t}",
			"\tif (carriedAny) {",
			`\t\tout[${literal(PRESERVED_MEMBER)}] = carried;`,
			"\t}",
		);
	} else {
		lines.push(
			...nameSet("\t", "declared", declared),
			"\tfor (const key of ownKeys(value)) {",
			"\t\tif (declared.includes(key)) continue;",
			"\t\tconst member = ownMember(value, key);",
			'\t\tif (member.state !== "value") continue;',
			"\t\tout[key] = member.value;",
			"\t}",
		);
	}
	// Spread copies own data properties without invoking a setter, so the
	// returned object carries an ordinary prototype and a `__proto__` member
	// stays a member. It *reads* every member, though, so where an accessor was
	// carried through the accumulator is returned as it stands: a value carrying
	// an accessor for a declared member is always rejected, so it never reaches a
	// caller, and reading it to tidy its prototype would invoke the getter this
	// whole pass exists not to invoke.
	lines.push("\treturn accessor ? out : { ...out };");
	return lines;
}

/**
 * The pinned formatter's line width, with a leading tab counted as one column.
 * Measured against the binary rather than assumed.
 */
const LINE_WIDTH = 79;

/**
 * Re-emit an over-long `fail(...)` statement in the broken form.
 *
 * This is not a formatter. It is one statement shape this module emits itself,
 * in one place, so that the generated text is already the shape the pinned
 * formatter of FR-071 would produce and the committed fixture's diff does not
 * churn on layout alone. Every other layout question is the injected
 * formatter's.
 */
function breakLongCalls(text) {
	return text
		.split("\n")
		.map((line) => {
			if (line.length <= LINE_WIDTH) return line;
			const match = /^(\t*)(fail|check[A-Za-z0-9_]*)\((.*)\);$/.exec(line);
			if (match === null) return line;
			const [, indent, callee, argumentText] = match;
			const args = splitArguments(argumentText);
			if (args === undefined) return line;
			const inner = args.map((argument) => `${indent}\t${argument},`);
			return [`${indent}${callee}(`, ...inner, `${indent});`].join("\n");
		})
		.join("\n");
}

/** Split an argument list at its top-level commas, or `undefined` if unsure. */
function splitArguments(text) {
	const args = [];
	let depth = 0;
	let quote = "";
	let current = "";
	for (let index = 0; index < text.length; index += 1) {
		const character = text[index];
		if (quote !== "") {
			current += character;
			if (character === "\\") {
				current += text[index + 1] ?? "";
				index += 1;
			} else if (character === quote) {
				quote = "";
			}
			continue;
		}
		if (character === '"' || character === "'") {
			quote = character;
			current += character;
			continue;
		}
		if (character === "(" || character === "[" || character === "{") depth += 1;
		if (character === ")" || character === "]" || character === "}") depth -= 1;
		if (character === "," && depth === 0) {
			args.push(current.trim());
			current = "";
			continue;
		}
		current += character;
	}
	if (quote !== "" || depth !== 0) return undefined;
	const last = current.trim();
	if (last.length > 0) args.push(last);
	return args.length > 0 ? args : undefined;
}

/** The generated `errors.ts`: the package's fixed validation runtime. */
export function renderErrors() {
	// 79 columns, with a leading tab counted as one, measured against the pinned
	// formatter binary rather than assumed.
	const entries = Object.entries(STRUCTURAL_CODES)
		.map(([name, code]) => {
			const single = `\t${name}: ${literal(code)},`;
			return single.length <= 79 ? single : `\t${name}:\n\t\t${literal(code)},`;
		})
		.join("\n");
	return `/**
 * The validation vocabulary of this generated package: the closed structural
 * code register, the error and result shapes, the declared recursion bound, and
 * the small runtime the generated checks share.
 *
 * A constraint failure never draws from this register. It reports the
 * constraint's own \`diagnosticCode\`, which the semantic document carries, so a
 * consumer switching on a code is switching on the contract's vocabulary rather
 * than on this generator's.
 */

/** Every structural failure this package can report, as declared data. */
export const VALIDATION_CODES = {
${entries}
} as const;

/** One structural code. A constraint code is any string the document declares. */
export type StructuralCode =
	(typeof VALIDATION_CODES)[keyof typeof VALIDATION_CODES];

/** The declared recursion bound. A value nested past it is refused, not chased. */
export const MAX_VALIDATION_DEPTH = ${MAX_VALIDATION_DEPTH};

/** The member a record admitting unknowns carries them in. */
export const PRESERVED_MEMBER = ${literal(PRESERVED_MEMBER)};

/** One failure: where, which rule, and what it says. */
export interface ValidationError {
	readonly pointer: string;
	readonly code: string;
	readonly message: string;
}

/**
 * The verdict.
 *
 * \`surfaced\` carries the findings a record declaring \`unknownPolicy: "surface"\`
 * reports without rejecting the value, which is why they sit on the accepting
 * arm: they are distinguishable from a rejection by their code and by leaving
 * \`ok\` true.
 */
export type ValidationResult<T> =
	| {
			readonly ok: true;
			readonly value: T;
			readonly surfaced: readonly ValidationError[];
	  }
	| { readonly ok: false; readonly errors: readonly ValidationError[] };

/** How a member of an untrusted object presented itself. */
export type MemberState = "value" | "absent" | "accessor";

/** A member read without invoking anything. */
export interface Member {
	readonly state: MemberState;
	readonly value: unknown;
}

/**
 * Read one member as an own property, without invoking an accessor.
 *
 * A getter that throws cannot make a validator throw, and a getter returning a
 * different value on each read cannot make the check disagree with the value
 * returned, because neither is ever called. An inherited member is absent: a
 * prototype-chain member does not satisfy a declared field.
 */
export function ownMember(value: object, key: string): Member {
	const descriptor = Object.getOwnPropertyDescriptor(value, key);
	if (descriptor === undefined) return { state: "absent", value: undefined };
	if (!("value" in descriptor)) return { state: "accessor", value: undefined };
	return { state: "value", value: descriptor.value };
}

/**
 * Copy one member's *descriptor* onto an accumulator without reading it.
 *
 * An accessor member is carried through the prepare pass this way rather than
 * dropped, so the check that follows can report it instead of mistaking it for
 * an absent property — and so a getter that throws is still never invoked.
 */
export function copyAccessor(
	out: Record<string, unknown>,
	source: object,
	key: string,
): void {
	const descriptor = Object.getOwnPropertyDescriptor(source, key);
	if (descriptor !== undefined) Object.defineProperty(out, key, descriptor);
}

/** The own enumerable string keys of a value, in insertion order. */
export function ownKeys(value: object): readonly string[] {
	return Object.keys(value);
}

/** True for an object that is not an array and not null, whatever its prototype. */
export function isPlainObject(value: unknown): value is object {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** An RFC 6901 pointer, extended by one already-escaped reference token. */
export function join(pointer: string, token: string): string {
	return \`\${pointer}/\${token.replaceAll("~", "~0").replaceAll("/", "~1")}\`;
}

/** Record one failure. */
export function fail(
	into: ValidationError[],
	pointer: string,
	code: string,
	message: string,
): void {
	into.push({ pointer, code, message });
}

/** Unicode code points, so an astral character counts once. */
export function codePointLength(value: string): number {
	let count = 0;
	for (const _character of value) count += 1;
	return count;
}

/**
 * Well-formed standard base64, RFC 4648 §4.
 *
 * A declared decision of this backend pending
 * agent-ix/filament-core-data#58, which records that the published contract
 * states no wire form for the \`bytes\` kernel scalar.
 */
export function isBase64(value: string): boolean {
	if (value.length % 4 !== 0) return false;
	return /^[A-Za-z0-9+/]*={0,2}$/.test(value) && !/=[^=]/.test(value);
}

/** The octets a well-formed base64 string decodes to. */
export function base64OctetLength(value: string): number {
	if (!isBase64(value)) return -1;
	const padding = value.endsWith("==") ? 2 : value.endsWith("=") ? 1 : 0;
	return (value.length / 4) * 3 - padding;
}

/**
 * The canonical byte form of a value, used to decide collection uniqueness.
 *
 * Object keys are ordered by code unit, \`undefined\` members are dropped, and
 * negative zero renders as \`0\`, so two members that differ only in key order or
 * in the sign of a zero are one member.
 */
function canonicalJson(value: unknown): string {
	if (value === null) return "null";
	if (typeof value === "boolean") return value ? "true" : "false";
	if (typeof value === "number") {
		if (!Number.isFinite(value)) return "null";
		return JSON.stringify(Object.is(value, -0) ? 0 : value);
	}
	if (typeof value === "string") return JSON.stringify(value);
	if (Array.isArray(value)) {
		return \`[\${value.map((member) => canonicalJson(member)).join(",")}]\`;
	}
	if (typeof value === "object") {
		const members: string[] = [];
		for (const key of Object.keys(value).sort()) {
			const member = ownMember(value, key);
			if (member.state !== "value" || member.value === undefined) continue;
			members.push(\`\${JSON.stringify(key)}:\${canonicalJson(member.value)}\`);
		}
		return \`{\${members.join(",")}}\`;
	}
	return "null";
}

/** True when no two members of a collection share a canonical form. */
export function isUniqueCollection(value: unknown): boolean {
	if (!Array.isArray(value)) return true;
	const seen = new Set<string>();
	for (const member of value) {
		const form = canonicalJson(member);
		if (seen.has(form)) return false;
		seen.add(form);
	}
	return true;
}

/** Order by pointer then code, by code unit, so the list is host-stable. */
export function sortErrors(
	errors: readonly ValidationError[],
): readonly ValidationError[] {
	return [...errors].sort((left, right) => {
		if (left.pointer !== right.pointer) {
			return left.pointer < right.pointer ? -1 : 1;
		}
		if (left.code !== right.code) return left.code < right.code ? -1 : 1;
		return 0;
	});
}
`;
}

/** The generated `validators.ts`: one `validate<Type>` per exported type. */
export function renderValidators(model) {
	const types = model.types ?? [];
	const names = types.map((entry) => entry.identifier);
	const blocks = [];
	for (const entry of types) {
		const body = CHECK_BODIES[entry.kind];
		if (body === undefined) {
			throw new TypeError(
				`no validator is declared for kind ${JSON.stringify(entry.kind)} on ${entry.identity}`,
			);
		}
		blocks.push(
			[
				`function prepare${entry.identifier}(value: unknown, depth: number): unknown {`,
				"\tif (depth > MAX_VALIDATION_DEPTH) return value;",
				...prepareBody(model, entry),
				"}",
			].join("\n"),
		);
		const checkBody = [
			"\tconst before = errors.length;",
			"\tif (depth > MAX_VALIDATION_DEPTH) {",
			'\t\tfail(errors, pointer, CODES.DEPTH_LIMIT_EXCEEDED, "the value nests past the declared bound");',
			"\t\treturn false;",
			"\t}",
			...body(model, entry),
		].join("\n");
		// `noUnusedParameters` is on for the generated package, and the five-part
		// signature is uniform so the checks can call one another. A parameter this
		// body neither reads nor forwards takes the leading underscore the compiler
		// exempts, rather than the whole option being turned off.
		const surfacedName = checkBody.includes("surfaced")
			? "surfaced"
			: "_surfaced";
		blocks.push(
			[
				`function check${entry.identifier}(`,
				"\tcandidate: unknown,",
				"\tpointer: string,",
				"\terrors: ValidationError[],",
				`\t${surfacedName}: ValidationError[],`,
				"\tdepth: number,",
				`): candidate is ${entry.identifier} {`,
				checkBody,
				"}",
			].join("\n"),
		);
		blocks.push(
			[
				`/** Decide an untrusted value against \`${entry.identity}\`. */`,
				`export function validate${entry.identifier}(input: unknown): ValidationResult<${entry.identifier}> {`,
				"\tconst errors: ValidationError[] = [];",
				"\tconst surfaced: ValidationError[] = [];",
				`\tconst value = prepare${entry.identifier}(input, 0);`,
				`\tif (check${entry.identifier}(value, "", errors, surfaced, 0)) {`,
				"\t\treturn { ok: true, value, surfaced: sortErrors(surfaced) };",
				"\t}",
				"\treturn { ok: false, errors: sortErrors(errors) };",
				"}",
			].join("\n"),
		);
	}

	const header = `/**
 * Runtime validators, one per exported type.
 *
 * Each validator is a pure function of its argument. It reads no clock, no
 * environment variable, no file and no socket; it imports nothing outside this
 * package; it never throws, whatever it is handed; and it reports every failure
 * it finds rather than stopping at the first.
 *
 * The narrowing from \`unknown\` to a generated type happens in exactly one
 * construct — a user-defined type predicate — because this package contains no
 * type assertion. A \`prepare\` pass builds the value the caller receives, with
 * semantic defaults applied and undeclared members separated; the predicate
 * then decides that value and narrows it.
 */
`;
	// Only the helpers the generated source reaches are imported, because
	// `noUnusedLocals` is on for the generated package and an unused import is a
	// compile error rather than a tidiness question.
	const body = blocks.join("\n\n");
	const helpers = [
		"VALIDATION_CODES as CODES",
		"MAX_VALIDATION_DEPTH",
		"base64OctetLength",
		"codePointLength",
		"copyAccessor",
		"fail",
		"isBase64",
		"isPlainObject",
		"isUniqueCollection",
		"join",
		"ownKeys",
		"ownMember",
		"sortErrors",
	].filter((entry) => {
		const name = entry.startsWith("VALIDATION_CODES") ? "CODES" : entry;
		return new RegExp(`\\b${name}\\b`).test(body);
	});
	const imports = [
		"import {",
		...helpers.map((entry) => `\t${entry},`),
		`} from ${literal("./errors.js")};`,
		`import type { ValidationError, ValidationResult } from ${literal("./errors.js")};`,
	];
	if (names.length > 0) {
		const single = `import type { ${names.join(", ")} } from ${literal("./types.js")};`;
		imports.push(
			single.length <= LINE_WIDTH
				? single
				: [
						"import type {",
						...names.map((name) => `\t${name},`),
						`} from ${literal("./types.js")};`,
					].join("\n"),
		);
	}
	return `${header}\n${imports.join("\n")}\n\n${breakLongCalls(body)}\n`;
}
