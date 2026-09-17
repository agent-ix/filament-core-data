/** JSON Schema 2020-12 generation backend (FR-100). */
import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
	constructOf,
	inheritedNameCollisions,
	isEnumerationShaped,
	isInstanceless,
	isRecordShaped,
	populationsOf,
	renderingView,
} from "../../constructs.mjs";
import { DIAGNOSTIC_CODES, diagnostic } from "../../diagnostics.mjs";
import { admitIr, SCHEMA_FILES } from "../typescript-v1/admit.mjs";

export const identity = "ix://agent-ix/filament-core-data/backend/json-schema";
const DRAFT = "https://json-schema.org/draft/2020-12/schema";
const REPO_ROOT = resolve(
	dirname(fileURLToPath(import.meta.url)),
	"..",
	"..",
	"..",
	"..",
);

const scalarSchema = Object.freeze({
	boolean: { type: "boolean" },
	integer: { type: "integer" },
	number: { type: "number" },
	string: { type: "string" },
	bytes: { type: "string", contentEncoding: "base64" },
	date: { type: "string", format: "date" },
	datetime: { type: "string", format: "date-time" },
	duration: { type: "string", format: "duration" },
	uuid: { type: "string", format: "uuid" },
});
const FORMAT_MAP = Object.freeze({
	"agent-ix:uuid": "uuid",
	"agent-ix:date": "date",
	"agent-ix:date-time": "date-time",
	"agent-ix:duration": "duration",
	"agent-ix:email": "email",
	"agent-ix:uri": "uri",
	"iana:email": "email",
	"iana:uri": "uri",
	date: "date",
	"date-time": "date-time",
	duration: "duration",
	uuid: "uuid",
	email: "email",
	uri: "uri",
});

/**
 * A schema's file name: the definition's declared `displayName`, else the last
 * segment of its identity. The identity's last segment is an artifact id for a
 * lifted document, so the declared name is what a consumer looks the file up by.
 */
function nameOf(type) {
	const declared =
		typeof type.displayName === "string" && type.displayName.length > 0
			? type.displayName
			: String(type.identity).split("/").at(-1);
	return declared.replace(/[^A-Za-z0-9._-]/g, "-");
}
/**
 * Every emitted file name two sources claim, compared case-insensitively
 * because a case-insensitive file system holds `Status.json` and
 * `status.json` as one file: two definitions deriving one name, or a
 * definition deriving the `index.json` the backend writes itself.
 */
function fileNameCollisions(definitions) {
	const claims = new Map();
	for (const type of [...definitions].sort(byIdentity)) {
		const path = `${nameOf(type)}.json`;
		const key = path.toLowerCase();
		const claim = claims.get(key) ?? { paths: [], identities: [] };
		if (!claim.paths.includes(path)) claim.paths.push(path);
		claim.identities.push(String(type.identity));
		claims.set(key, claim);
	}
	return [...claims.entries()]
		.filter(
			([key, claim]) => key === "index.json" || claim.identities.length > 1,
		)
		.map(([key, claim]) => ({
			key,
			paths: claim.paths.sort(),
			identities: claim.identities,
			reserved: key === "index.json",
		}))
		.sort((left, right) =>
			left.key < right.key ? -1 : left.key > right.key ? 1 : 0,
		);
}
/** The refusal message for one file-name collision. */
function collisionMessage({ paths, identities, reserved }) {
	const named = paths.join(" and ");
	return reserved
		? `${named}: JSON Schema backend derives a file name for ${identities.join(" and ")} that collides with the backend's index.json`
		: `${named}: JSON Schema backend derives one file name, compared case-insensitively, for ${identities.join(" and ")}`;
}
function byIdentity(left, right) {
	const a = String(left.identity);
	const b = String(right.identity);
	return a < b ? -1 : a > b ? 1 : 0;
}
function byName(left, right) {
	const a = String(left.name ?? left.identity);
	const b = String(right.name ?? right.identity);
	return a < b ? -1 : a > b ? 1 : 0;
}
function schemaId(ir, type) {
	return `https://agent-ix.dev/schema/${ir.package.identity}/${nameOf(type)}.json`;
}
function ref(types, id) {
	const target = types.get(id);
	return target ? { $ref: `./${nameOf(target)}.json` } : {};
}
function constraint(schema, one, subject) {
	const value = one?.operands?.value;
	const key = one?.keyword;
	const table = {
		min: "minimum",
		max: "maximum",
		exclusiveMin: "exclusiveMinimum",
		exclusiveMax: "exclusiveMaximum",
		minLength: "minLength",
		maxLength: "maxLength",
	};
	if (key === "nonEmpty") {
		if (subject?.kind === "sequence") schema.minItems ??= 1;
		else if (subject?.kind === "map") schema.minProperties ??= 1;
		else schema.minLength ??= 1;
	} else if (key === "unique") schema.uniqueItems = true;
	else if (key === "enumValues") schema.enum = one.operands.values;
	else if (key === "pattern") schema.pattern = one.operands.regex;
	else if (key === "format") schema.format = FORMAT_MAP[one.operands.name];
	else if (table[key] && value !== undefined) schema[table[key]] = value;
	return schema;
}
function annotated(schema, node) {
	schema["x-agent-ix-semantic-id"] = node.identity;
	if (node.unknownPolicy)
		schema["x-agent-ix-unknown-policy"] = node.unknownPolicy;
	if (node.roles?.length) schema["x-agent-ix-roles"] = node.roles;
	if (node.origin) schema["x-agent-ix-origin"] = node.origin;
	if (node.unit) schema["x-agent-ix-unit"] = node.unit;
	if (node.relationships?.length)
		schema["x-agent-ix-relationships"] = node.relationships;
	if (node.operations?.length)
		schema["x-agent-ix-operations"] = node.operations;
	if (node.clauses?.length) schema["x-agent-ix-clauses"] = node.clauses;
	if (node.occurrences?.length)
		schema["x-agent-ix-occurrences"] = node.occurrences;
	if (node.extensions?.length)
		schema["x-agent-ix-extensions"] = node.extensions;
	if (node.subsets?.length) schema["x-agent-ix-subsets"] = node.subsets;
	if (typeof node.redefines === "string")
		schema["x-agent-ix-redefines"] = node.redefines;
	if (node.constraints?.length)
		schema["x-agent-ix-constraints"] = node.constraints;
	return schema;
}
function fieldSchema(field, types) {
	let schema = ref(types, field.typeRef);
	// A constrained field is represented in IR as an alias. Keep the alias's
	// constraints beside the reference: a bare sibling reference would erase the
	// constraint at the API boundary this backend exists to enforce.
	let target = types.get(field.typeRef);
	const seen = new Set();
	while (target?.kind === "alias" && !seen.has(target.identity)) {
		seen.add(target.identity);
		for (const one of target.constraints ?? []) constraint(schema, one, target);
		target = types.get(target.target);
	}
	if (
		field.multiplicity &&
		(field.multiplicity.upper === undefined || field.multiplicity.upper > 1)
	) {
		schema = { type: "array", items: schema };
		if (field.multiplicity.lower > 0)
			schema.minItems = field.multiplicity.lower;
		if (field.multiplicity.upper !== undefined)
			schema.maxItems = field.multiplicity.upper;
		if (field.multiplicity.unique) schema.uniqueItems = true;
	}
	if (field.nullable) schema = { anyOf: [schema, { type: "null" }] };
	for (const one of field.constraints ?? []) constraint(schema, one, target);
	return annotated(schema, field);
}
/**
 * The construct members a schema carries beside its instance shape (FR-100,
 * FR-142), one `x-agent-ix-*` annotation per member. Names where the member
 * names a field, state, operation or clause; identities where it names a type.
 */
const CONSTRUCT_ANNOTATIONS = Object.freeze([
	["kind", "x-agent-ix-kind"],
	["supertypes", "x-agent-ix-supertypes"],
	["abstract", "x-agent-ix-abstract"],
	["identityFields", "x-agent-ix-identity-fields"],
	["owner", "x-agent-ix-owner"],
	["members", "x-agent-ix-members"],
	["occurrenceField", "x-agent-ix-occurrence-field"],
	["equality", "x-agent-ix-equality"],
	["states", "x-agent-ix-states"],
	["transitions", "x-agent-ix-transitions"],
	["steps", "x-agent-ix-steps"],
	["persists", "x-agent-ix-persists"],
	["vocabulary", "x-agent-ix-vocabulary"],
]);

function constructAnnotations(schema, facts) {
	for (const [member, keyword] of CONSTRUCT_ANNOTATIONS)
		if (facts?.[member] !== undefined) schema[keyword] = facts[member];
	return schema;
}

function recordSchema(type, types) {
	const properties = Object.fromEntries(
		[...(type.fields ?? [])]
			.sort(byName)
			.map((field) => [field.name, fieldSchema(field, types)]),
	);
	const schema = { type: "object", properties };
	const required = [...(type.fields ?? [])]
		.sort(byName)
		.filter((field) => field.presence === "required")
		.map((field) => field.name);
	if (required.length) schema.required = required;
	if (type.unknownPolicy === "reject") schema.additionalProperties = false;
	return schema;
}

function renderType(ir, type, types) {
	let schema;
	const facts = constructOf(type, types);
	switch (true) {
		case type.kind === "scalar":
			schema = { ...(scalarSchema[type.scalar] ?? {}) };
			break;
		case isRecordShaped(type.kind): {
			// A record-shaped construct is the record schema over its effective
			// fields. An event's instance is immutable, which JSON Schema states
			// as `readOnly`; a state machine's states are a string enum under
			// `$defs` (FR-100).
			schema = recordSchema(type, types);
			if (facts?.immutable) schema.readOnly = true;
			if (facts?.states?.length)
				schema.$defs = {
					[`${nameOf(type)}State`]: {
						type: "string",
						enum: [...facts.states],
					},
				};
			break;
		}
		case isEnumerationShaped(type.kind):
			schema = {
				type: "string",
				enum: [...(type.variants ?? [])].sort(byName).map((one) => one.name),
			};
			break;
		case isInstanceless(type.kind):
			// A repository holds no state and a domain is a namespace: neither
			// has an instance, so no JSON value validates against its schema,
			// and the schema carries its members as annotations (FR-100).
			schema = { not: {} };
			break;
		case type.kind === "union":
			schema = {
				oneOf: [...(type.variants ?? [])].sort(byName).map((one) => {
					const branch = one.payloadType
						? {
								type: "object",
								properties: {
									tag: { const: one.name },
									payload: ref(types, one.payloadType),
								},
								required: ["tag", "payload"],
								additionalProperties: false,
							}
						: {
								type: "object",
								properties: { tag: { const: one.name } },
								required: ["tag"],
								additionalProperties: false,
							};
					return annotated(branch, one);
				}),
			};
			break;
		case type.kind === "alias":
			schema = { allOf: [ref(types, type.target)] };
			break;
		case type.kind === "sequence":
			schema = { type: "array", items: ref(types, type.items) };
			break;
		case type.kind === "map":
			schema = {
				type: "object",
				additionalProperties: ref(types, type.values),
			};
			break;
		case type.kind === "reference":
			schema = { type: "string", "x-agent-ix-reference-target": type.target };
			break;
		default:
			schema = {};
	}
	for (const one of type.constraints ?? []) constraint(schema, one, type);
	return {
		$schema: DRAFT,
		$id: schemaId(ir, type),
		title: type.displayName,
		...constructAnnotations(annotated(schema, type), facts),
	};
}
function text(value) {
	return `${JSON.stringify(value, null, "\t")}\n`;
}
function digest(value) {
	return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}
function requiredExtension(ir) {
	const nodes = [ir, ...(ir.types ?? []), ...(ir.occurrences ?? [])];
	for (const type of ir.types ?? []) {
		nodes.push(
			...(type.fields ?? []),
			...(type.variants ?? []),
			...(type.constraints ?? []),
			...(type.relationships ?? []),
			...(type.operations ?? []),
			...(type.clauses ?? []),
		);
		for (const operation of type.operations ?? [])
			nodes.push(...(operation.params ?? []));
	}
	for (const node of nodes) {
		const extension = (node?.extensions ?? []).find((one) => one.required);
		if (extension) return extension;
	}
	return undefined;
}
function unsupportedFormat(ir) {
	for (const type of ir.types ?? []) {
		for (const node of [type, ...(type.fields ?? [])]) {
			const constraint = (node.constraints ?? []).find(
				(one) =>
					one.keyword === "format" &&
					!Object.hasOwn(FORMAT_MAP, one.operands?.name),
			);
			if (constraint) return constraint;
		}
	}
	return undefined;
}
function admit(request, host) {
	if (typeof host?.readText !== "function") return undefined;
	const schemas = SCHEMA_FILES.map((relativePath) =>
		JSON.parse(host.readText(join(REPO_ROOT, relativePath))),
	);
	return admitIr({ ir: request.ir }, { schemas });
}
function admissionDiagnostic(located) {
	return {
		...located.diagnostic,
		message:
			located.pointer.length > 0
				? `${located.pointer}: ${located.diagnostic.message}`
				: located.diagnostic.message,
	};
}

export const jsonSchemaBackend = Object.freeze({
	identity,
	version: "0.1.0",
	target: "json-schema",
	owningIssue: "agent-ix/filament-core-data#85",
	supportedIrVersions: Object.freeze(["1.1.0", "1.2.0"]),
	supportedFeatures: Object.freeze([
		"scalar",
		"record",
		"entity",
		"value_object",
		"nested_entity",
		"aggregate_root",
		"enumeration",
		"event",
		"state_machine",
		"process",
		"repository",
		"domain",
		"supertypes",
		"feature-redefinition",
		"operation-contract",
		"populations",
		"enum",
		"union",
		"alias",
		"sequence",
		"map",
		"reference",
		"multiplicity",
		"nullability",
		"constraint",
		"unknown-policy",
		"extension",
		"identity-metadata",
	]),
	generate(request, options = {}) {
		// Rendered from the view in which a subtype carries its inherited
		// fields; admission reads the request's own document.
		const ir = renderingView(request.ir);
		let admission;
		try {
			admission = admit(request, options.host);
		} catch (error) {
			return {
				state: "invalid",
				files: [],
				diagnostics: [
					diagnostic(DIAGNOSTIC_CODES.BACKEND_CONTRACT_VIOLATION, {
						message: `the JSON Schema admissibility reader could not run: ${error.message}`,
					}),
				],
			};
		}
		if (admission?.resultState === "invalid")
			return {
				state: "invalid",
				files: [],
				diagnostics: admission.diagnostics.map(admissionDiagnostic),
			};
		// Two effective fields of one name would render one property and drop
		// the other; each is refused by name (FR-141).
		const inherited = inheritedNameCollisions(ir);
		if (inherited.length > 0)
			return {
				state: "unsupported",
				files: [],
				diagnostics: inherited.map((one) =>
					diagnostic(DIAGNOSTIC_CODES.UNDECLARED_LOSS, {
						message: `/ir${one.pointer}: two effective fields are named ${one.name}; one would be dropped, since neither redefines the other`,
					}),
				),
			};
		const required = requiredExtension(ir);
		if (required)
			return {
				state: "unsupported",
				files: [],
				diagnostics: [
					diagnostic(DIAGNOSTIC_CODES.UNDECLARED_LOSS, {
						message: `JSON Schema backend has no mapping for required extension ${required.identity}`,
					}),
				],
			};
		const format = unsupportedFormat(ir);
		if (format)
			return {
				state: "unsupported",
				files: [],
				diagnostics: [
					diagnostic(DIAGNOSTIC_CODES.UNDECLARED_LOSS, {
						message: `JSON Schema backend has no enforcing mapping for format ${format.operands?.name}`,
					}),
				],
			};
		const types = new Map(
			(ir.types ?? []).map((type) => [type.identity, type]),
		);
		// Two definitions whose names derive one file name, or a definition whose
		// name derives `index.json`, would overwrite one another. Each is refused
		// with both identities named, and no file is written (FR-100-AC-9).
		const collisions = fileNameCollisions([...types.values()]);
		if (collisions.length > 0)
			return {
				state: "unsupported",
				files: [],
				diagnostics: collisions.map((collision) =>
					diagnostic(DIAGNOSTIC_CODES.UNDECLARED_LOSS, {
						message: collisionMessage(collision),
					}),
				),
			};
		const files = [...types.values()].sort(byName).map((type) => ({
			path: `${nameOf(type)}.json`,
			text: text(renderType(ir, type, types)),
			identities: [type.identity],
			mediaType: "application/schema+json",
		}));
		const index = files.map((file) => ({
			path: file.path,
			digest: digest(file.text),
			identity: file.identities[0],
			$id: schemaId(ir, types.get(file.identities[0])),
		}));
		files.push({
			path: "index.json",
			text: text({
				$schema: DRAFT,
				"x-agent-ix-package": ir.package.identity,
				...(ir.extensions?.length
					? { "x-agent-ix-extensions": ir.extensions }
					: {}),
				...(ir.occurrences?.length
					? { "x-agent-ix-occurrences": ir.occurrences }
					: {}),
				...(ir.populations?.length
					? { "x-agent-ix-populations": populationsOf(ir) }
					: {}),
				schemas: index,
			}),
			identities: [`ix://${ir.package.identity}`],
			mediaType: "application/json",
		});
		return { state: "success", files, diagnostics: [] };
	},
});
