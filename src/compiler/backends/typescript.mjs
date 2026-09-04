import {
	enumMembers,
	replaceEnumMember,
	resolveModelBase,
	simpleReferences,
} from "./type-names.mjs";

function tsType(typeName, members) {
	let result = replaceEnumMember(typeName, members, (value) =>
		JSON.stringify(value),
	);
	result = simpleReferences(result)
		.replaceAll("utcDateTime", "string")
		.replaceAll("Record<string>", "Record<string, unknown>")
		.replaceAll(
			/\b(?:u?int(?:8|16|32|64)?|safeint|float(?:32|64)?|numeric|decimal(?:128)?)\b/g,
			"number",
		);
	return result;
}

/**
 * Render TypeScript declarations from a semantic IR document.
 *
 * Pure: same document in, same string out, with no filesystem, environment,
 * clock, or network access (FR-042).
 */
export function emitTypeScript(ir) {
	const members = enumMembers(ir);
	const byId = new Map(ir.types.map((type) => [type.id, type]));
	const lines = ["// Generated experimental output. Do not publish.", ""];
	for (const type of ir.types.filter(
		(candidate) => candidate.kind === "scalar",
	)) {
		lines.push(`export type ${type.name} = string;`, "");
	}
	for (const type of ir.types.filter(
		(candidate) => candidate.kind === "enum",
	)) {
		lines.push(
			`export type ${type.name} = ${type.members.map((member) => JSON.stringify(member.value)).join(" | ")};`,
			"",
		);
	}
	for (const type of ir.types.filter(
		(candidate) => candidate.kind === "model",
	)) {
		resolveModelBase(type, byId);
		const extension = type.base
			? ` extends ${simpleReferences(type.base)}`
			: "";
		lines.push(`export interface ${type.name}${extension} {`);
		for (const field of type.fields) {
			lines.push(
				`\t${field.name}${field.optional ? "?" : ""}: ${tsType(field.type, members)};`,
			);
		}
		lines.push("}", "");
	}
	return `${lines.join("\n").trim()}\n`;
}
