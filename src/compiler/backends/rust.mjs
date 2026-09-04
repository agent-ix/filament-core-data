import {
	enumMembers,
	replaceEnumMember,
	resolveModelBase,
	simpleReferences,
} from "./type-names.mjs";

function snake(name) {
	return name.replaceAll(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
}

function rustType(typeName, optional, members) {
	let result = replaceEnumMember(typeName, members, () => "String");
	result = simpleReferences(result)
		.replaceAll(/([A-Za-z_][A-Za-z0-9_]*)\[\]/g, "Vec<$1>")
		.replaceAll("utcDateTime", "String")
		.replaceAll("Record<string>", "BTreeMap<String, serde_json::Value>")
		.replaceAll("string", "String")
		.replaceAll("int32", "i32")
		.replaceAll(/"[^"]+"/g, "String")
		.replaceAll(/ \| null/g, "");
	if (typeName.includes("null") || optional) result = `Option<${result}>`;
	return result;
}

/**
 * Flatten a model's inherited fields, nearest declaration winning.
 *
 * Throws on a base the document does not carry, and on a base chain that
 * revisits a model already on the chain, rather than dropping fields silently
 * or recursing without bound (FR-042-AC-5, FR-042-AC-6).
 */
function inheritedFields(model, byId, seen = new Set()) {
	if (seen.has(model.id)) {
		throw new Error(
			`Semantic IR base chain forms a cycle at ${model.id}: ${[...seen, model.id].join(" -> ")}`,
		);
	}
	seen.add(model.id);
	const base = resolveModelBase(model, byId);
	const fields = base ? inheritedFields(base, byId, seen) : [];
	const merged = new Map(fields.map((field) => [field.name, field]));
	for (const field of model.fields) merged.set(field.name, field);
	return [...merged.values()];
}

/**
 * Render Rust/Serde declarations from a semantic IR document.
 *
 * Pure: same document in, same string out, with no filesystem, environment,
 * clock, or network access (FR-042).
 */
export function emitRust(ir) {
	const members = enumMembers(ir);
	const byId = new Map(ir.types.map((type) => [type.id, type]));
	const lines = [
		"// Generated experimental output. Do not publish.",
		"use serde::{Deserialize, Serialize};",
		"use std::collections::BTreeMap;",
		"",
	];
	for (const type of ir.types.filter(
		(candidate) => candidate.kind === "scalar",
	)) {
		lines.push(`pub type ${type.name} = String;`, "");
	}
	for (const type of ir.types.filter(
		(candidate) => candidate.kind === "enum",
	)) {
		lines.push("#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]");
		lines.push(`pub enum ${type.name} {`);
		for (const member of type.members) {
			lines.push(`    #[serde(rename = ${JSON.stringify(member.value)})]`);
			lines.push(`    ${member.name[0].toUpperCase()}${member.name.slice(1)},`);
		}
		lines.push("}", "");
	}
	for (const type of ir.types.filter(
		(candidate) => candidate.kind === "model",
	)) {
		lines.push("#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]");
		lines.push(`pub struct ${type.name} {`);
		for (const field of inheritedFields(type, byId)) {
			const fieldName = snake(field.name);
			if (fieldName !== field.name)
				lines.push(`    #[serde(rename = ${JSON.stringify(field.name)})]`);
			lines.push(
				`    pub ${fieldName}: ${rustType(field.type, field.optional, members)},`,
			);
		}
		lines.push("}", "");
	}
	return `${lines.join("\n").trim()}\n`;
}
