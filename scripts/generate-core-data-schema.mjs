#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const schemaPath = resolve(root, "schema/avro/core-data.avpr");
const tsOutPath = resolve(root, "src/generated.ts");
const pyOutPath = resolve(root, "agent_ix_core_data/core_data.py");
const protocol = JSON.parse(readFileSync(schemaPath, "utf8"));
const namedTypes = new Map(protocol.types.map((type) => [type.name, type]));
const generatedAt =
	"Generated from schema/avro/core-data.avpr. Do not edit by hand.";

function main() {
	writeFileSync(tsOutPath, generateTypeScript());
	writeFileSync(pyOutPath, generatePython());
	execFileSync(
		resolve(root, "node_modules/.bin/biome"),
		["format", "--write", tsOutPath],
		{
			cwd: root,
			stdio: "ignore",
		},
	);
}

function generateTypeScript() {
	const lines = [
		`// ${generatedAt}`,
		"",
		`export const CORE_DATA_SCHEMA_VERSION = '${protocol.namespace}.${protocol.protocol}:1' as const;`,
		"",
	];
	for (const type of protocol.types) {
		if (type.type === "enum") {
			lines.push(
				`export type ${type.name} = ${type.symbols.map((s) => `'${s}'`).join(" | ")};`,
				"",
			);
		} else if (type.type === "record") {
			lines.push(`export interface ${type.name} {`);
			for (const field of type.fields) {
				const optional = Object.hasOwn(field, "default") ? "?" : "";
				lines.push(`  ${field.name}${optional}: ${tsType(field.type)};`);
			}
			lines.push("}", "");
		}
	}
	const recordNames = protocol.types
		.filter((type) => type.type === "record")
		.map((type) => type.name);
	lines.push(
		`export type CoreDataRecordName = ${recordNames.map((name) => `'${name}'`).join(" | ")};`,
		"",
		`export const CORE_DATA_PROTOCOL = ${JSON.stringify(protocol, null, 2)} as const;`,
		"",
		"type AvroType = string | readonly AvroType[] | AvroSchemaObject;",
		"",
		"interface AvroSchemaObject {",
		"  readonly type: string;",
		"  readonly name?: string;",
		"  readonly fields?: readonly { readonly name: string; readonly type: AvroType; readonly default?: unknown }[];",
		"  readonly items?: AvroType;",
		"  readonly values?: AvroType;",
		"  readonly symbols?: readonly string[];",
		"}",
		"",
		"const namedSchemas = new Map<string, AvroType>(",
		"  CORE_DATA_PROTOCOL.types.map((schema) => [schema.name, schema as AvroSchemaObject]),",
		");",
		"",
		"export function validateCoreDataRecord(recordName: CoreDataRecordName, value: unknown): string[] {",
		"  const schema = namedSchemas.get(recordName);",
		"  if (!schema) return [`${recordName}: unknown core data record`];",
		"  return validateAvro(schema, value, recordName);",
		"}",
		"",
		"function validateAvro(schema: AvroType, value: unknown, path: string): string[] {",
		"  if (isAvroUnion(schema)) {",
		"    const branchErrors = schema.map((branch) => validateAvro(branch, value, path));",
		"    return branchErrors.some((errors) => errors.length === 0)",
		"      ? []",
		'      : [`${path}: does not match union ${schema.map(labelFor).join(" | ")}`];',
		"  }",
		'  if (typeof schema === "string") return validateNamedOrPrimitive(schema, value, path);',
		'  if (schema.type === "array") {',
		"    if (!Array.isArray(value)) return [`${path}: expected array`];",
		"    return value.flatMap((item, index) => validateAvro(schema.items!, item, `${path}[${index}]`));",
		"  }",
		'  if (schema.type === "map") {',
		"    if (!isPlainRecord(value)) return [`${path}: expected map object`];",
		"    return Object.entries(value).flatMap(([key, item]) =>",
		"      validateAvro(schema.values!, item, `${path}.${key}`),",
		"    );",
		"  }",
		'  if (schema.type === "enum") {',
		'    return typeof value === "string" && schema.symbols?.includes(value)',
		"      ? []",
		'      : [`${path}: expected one of ${schema.symbols?.join(", ")}`];',
		"  }",
		'  if (schema.type === "record") {',
		"    if (!isPlainRecord(value)) return [`${path}: expected object`];",
		"    return (schema.fields ?? []).flatMap((field) =>",
		'      !(field.name in value) && "default" in field',
		"        ? []",
		"        : validateAvro(field.type, value[field.name], `${path}.${field.name}`),",
		"    );",
		"  }",
		"  return validateNamedOrPrimitive(schema.type, value, path);",
		"}",
		"",
		"function validateNamedOrPrimitive(typeName: string, value: unknown, path: string): string[] {",
		'  if (typeName === "null") return value === null ? [] : [`${path}: expected null`];',
		'  if (typeName === "string") return typeof value === "string" ? [] : [`${path}: expected string`];',
		'  if (typeName === "boolean") return typeof value === "boolean" ? [] : [`${path}: expected boolean`];',
		'  if (typeName === "int" || typeName === "long") {',
		"    return Number.isInteger(value) ? [] : [`${path}: expected integer`];",
		"  }",
		'  if (typeName === "double" || typeName === "float") {',
		'    return typeof value === "number" && Number.isFinite(value) ? [] : [`${path}: expected number`];',
		"  }",
		"  const namedSchema = namedSchemas.get(typeName);",
		"  return namedSchema ? validateAvro(namedSchema, value, path) : [`${path}: unknown type ${typeName}`];",
		"}",
		"",
		"function labelFor(schema: AvroType): string {",
		'  if (typeof schema === "string") return schema;',
		'  if (isAvroUnion(schema)) return schema.map(labelFor).join(" | ");',
		"  return schema.name ?? schema.type;",
		"}",
		"",
		"function isAvroUnion(schema: AvroType): schema is readonly AvroType[] {",
		"  return Array.isArray(schema);",
		"}",
		"",
		"function isPlainRecord(value: unknown): value is Record<string, unknown> {",
		'  return typeof value === "object" && value !== null && !Array.isArray(value);',
		"}",
		"",
	);
	return `${lines.join("\n")}`;
}

function tsType(type) {
	if (Array.isArray(type)) {
		const nullable = type.includes("null");
		const branches = type.filter((branch) => branch !== "null").map(tsType);
		return `${branches.join(" | ")}${nullable ? " | null" : ""}`;
	}
	if (typeof type === "string") {
		if (type === "string") return "string";
		if (
			type === "int" ||
			type === "long" ||
			type === "double" ||
			type === "float"
		)
			return "number";
		if (type === "boolean") return "boolean";
		if (type === "null") return "null";
		return type;
	}
	if (type.type === "array") return `${tsType(type.items)}[]`;
	if (type.type === "map") return `Record<string, ${tsType(type.values)}>`;
	if (type.type === "record" || type.type === "enum") return type.name;
	return tsType(type.type);
}

function generatePython() {
	const lines = [
		`# ${generatedAt}`,
		"from __future__ import annotations",
		"",
		"from dataclasses import dataclass",
		"from typing import Any, Literal",
		"",
		`CORE_DATA_SCHEMA_VERSION = "${protocol.namespace}.${protocol.protocol}:1"`,
		"",
	];
	for (const type of protocol.types) {
		if (type.type === "enum") {
			lines.push(
				`${type.name} = Literal[${type.symbols.map((s) => JSON.stringify(s)).join(", ")}]`,
				"",
			);
		} else if (type.type === "record") {
			lines.push("@dataclass(frozen=True)", `class ${type.name}:`);
			for (const field of type.fields)
				lines.push(`    ${field.name}: ${pyType(field.type)}`);
			lines.push("");
		}
	}
	const recordNames = protocol.types
		.filter((type) => type.type === "record")
		.map((type) => type.name);
	lines.push(
		`CORE_DATA_PROTOCOL: dict[str, Any] = ${pyLiteral(protocol)}`,
		"",
		'NAMED_SCHEMAS = {schema["name"]: schema for schema in CORE_DATA_PROTOCOL["types"]}',
		`CORE_DATA_RECORD_NAMES = {${recordNames.map((name) => JSON.stringify(name)).join(", ")}}`,
		"",
		"def validate_core_data_record(record_name: str, value: Any) -> list[str]:",
		"    schema = NAMED_SCHEMAS.get(record_name)",
		"    if schema is None:",
		'        return [f"{record_name}: unknown core data record"]',
		"    return _validate_avro(schema, value, record_name)",
		"",
		"def _validate_avro(schema: Any, value: Any, path: str) -> list[str]:",
		"    if isinstance(schema, list):",
		"        branch_errors = [_validate_avro(branch, value, path) for branch in schema]",
		"        if any(len(errors) == 0 for errors in branch_errors):",
		"            return []",
		'        labels = " | ".join(_label_for(branch) for branch in schema)',
		'        return [f"{path}: does not match union {labels}"]',
		"    if isinstance(schema, str):",
		"        return _validate_named_or_primitive(schema, value, path)",
		'    schema_type = schema["type"]',
		'    if schema_type == "array":',
		"        if not isinstance(value, list):",
		'            return [f"{path}: expected array"]',
		"        errors: list[str] = []",
		"        for index, item in enumerate(value):",
		'            errors.extend(_validate_avro(schema["items"], item, f"{path}[{index}]"))',
		"        return errors",
		'    if schema_type == "map":',
		"        if not isinstance(value, dict):",
		'            return [f"{path}: expected map object"]',
		"        errors: list[str] = []",
		"        for key, item in value.items():",
		'            errors.extend(_validate_avro(schema["values"], item, f"{path}.{key}"))',
		"        return errors",
		'    if schema_type == "enum":',
		'        return [] if isinstance(value, str) and value in schema["symbols"] else [f"{path}: expected one of " + ", ".join(schema["symbols"])]',
		'    if schema_type == "record":',
		"        if not isinstance(value, dict):",
		'            return [f"{path}: expected object"]',
		"        errors: list[str] = []",
		'        for field in schema.get("fields", []):',
		'            if field["name"] not in value and "default" in field:',
		"                continue",
		'            errors.extend(_validate_avro(field["type"], value.get(field["name"]), f"{path}.{field[\'name\']}"))',
		"        return errors",
		"    return _validate_named_or_primitive(schema_type, value, path)",
		"",
		"def _validate_named_or_primitive(type_name: str, value: Any, path: str) -> list[str]:",
		'    if type_name == "null":',
		'        return [] if value is None else [f"{path}: expected null"]',
		'    if type_name == "string":',
		'        return [] if isinstance(value, str) else [f"{path}: expected string"]',
		'    if type_name == "boolean":',
		'        return [] if isinstance(value, bool) else [f"{path}: expected boolean"]',
		'    if type_name in {"int", "long"}:',
		'        return [] if isinstance(value, int) and not isinstance(value, bool) else [f"{path}: expected integer"]',
		'    if type_name in {"double", "float"}:',
		'        return [] if isinstance(value, (int, float)) and not isinstance(value, bool) else [f"{path}: expected number"]',
		"    named_schema = NAMED_SCHEMAS.get(type_name)",
		"    if named_schema is not None:",
		"        return _validate_avro(named_schema, value, path)",
		'    return [f"{path}: unknown type {type_name}"]',
		"",
		"def _label_for(schema: Any) -> str:",
		'    return schema if isinstance(schema, str) else schema.get("name", schema["type"])',
		"",
	);
	return `${lines.join("\n")}`;
}

function pyType(type) {
	if (Array.isArray(type)) {
		const branches = type.filter((branch) => branch !== "null").map(pyType);
		const unionType =
			branches.length === 1 ? branches[0] : branches.join(" | ");
		return type.includes("null") ? `${unionType} | None` : unionType;
	}
	if (typeof type === "string") {
		if (type === "string") return "str";
		if (type === "int" || type === "long") return "int";
		if (type === "double" || type === "float") return "float";
		if (type === "boolean") return "bool";
		if (type === "null") return "None";
		return type;
	}
	if (type.type === "array") return `list[${pyType(type.items)}]`;
	if (type.type === "map") return `dict[str, ${pyType(type.values)}]`;
	if (type.type === "record" || type.type === "enum") return type.name;
	return pyType(type.type);
}

function pyLiteral(value) {
	if (value === null) return "None";
	if (Array.isArray(value)) return `[${value.map(pyLiteral).join(", ")}]`;
	if (typeof value === "object") {
		return `{${Object.entries(value)
			.map(([key, item]) => `${JSON.stringify(key)}: ${pyLiteral(item)}`)
			.join(", ")}}`;
	}
	if (typeof value === "boolean") return value ? "True" : "False";
	return JSON.stringify(value);
}

main();
