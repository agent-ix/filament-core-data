/** JSON Schema 2020-12 generation backend (FR-100). */
import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
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

function nameOf(type) {
	return String(type.identity)
		.split("/")
		.at(-1)
		.replace(/[^A-Za-z0-9._-]/g, "-");
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
function renderType(ir, type, types) {
	let schema;
	switch (type.kind) {
		case "scalar":
			schema = { ...(scalarSchema[type.scalar] ?? {}) };
			break;
		case "record": {
			const properties = Object.fromEntries(
				[...(type.fields ?? [])]
					.sort(byName)
					.map((field) => [field.name, fieldSchema(field, types)]),
			);
			schema = { type: "object", properties };
			const required = [...(type.fields ?? [])]
				.sort(byName)
				.filter((field) => field.presence === "required")
				.map((field) => field.name);
			if (required.length) schema.required = required;
			if (type.unknownPolicy === "reject") schema.additionalProperties = false;
			break;
		}
		case "enum":
			schema = {
				type: "string",
				enum: [...(type.variants ?? [])].sort(byName).map((one) => one.name),
			};
			break;
		case "union":
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
		case "alias":
			schema = { allOf: [ref(types, type.target)] };
			break;
		case "sequence":
			schema = { type: "array", items: ref(types, type.items) };
			break;
		case "map":
			schema = {
				type: "object",
				additionalProperties: ref(types, type.values),
			};
			break;
		case "reference":
			schema = { type: "string", "x-agent-ix-reference-target": type.target };
			break;
		default:
			schema = {};
	}
	for (const one of type.constraints ?? []) constraint(schema, one, type);
	return {
		$schema: DRAFT,
		$id: schemaId(ir, type),
		...annotated(schema, type),
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
	supportedIrVersions: Object.freeze(["1.1.0"]),
	supportedFeatures: Object.freeze([
		"scalar",
		"record",
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
		const ir = request.ir;
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
				schemas: index,
			}),
			identities: [`ix://${ir.package.identity}`],
			mediaType: "application/json",
		});
		return { state: "success", files, diagnostics: [] };
	},
});
