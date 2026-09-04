/**
 * Type-name substitution helpers shared by the TypeScript and Rust backends.
 *
 * Both backends render source by rewriting the type-name strings the IR
 * carries, using an ordered substitution table (FR-042). Enum members are
 * substituted longest-name-first so a shorter member name cannot corrupt a
 * longer one containing it.
 */

export function enumMembers(ir) {
	const values = new Map();
	for (const type of ir.types.filter(
		(candidate) => candidate.kind === "enum",
	)) {
		for (const member of type.members)
			values.set(`${type.id}.${member.name}`, member.value);
	}
	return [...values.entries()].sort(
		([left], [right]) => right.length - left.length,
	);
}

export function replaceEnumMember(typeName, members, render) {
	let result = typeName;
	for (const [name, value] of members)
		result = result.replaceAll(name, render(value));
	return result;
}

export function simpleReferences(typeName) {
	return typeName.replaceAll(
		/AgentIx\.Semantic\.(?:Core|Assurance|Wire)\.([A-Za-z0-9_]+)/g,
		"$1",
	);
}

/**
 * Resolve a model's declared base, or throw naming it when the IR does not
 * carry it (FR-042-AC-5). Scalars are exempt: their base is a TypeSpec builtin
 * such as `string`, which is never an IR type.
 */
export function resolveModelBase(model, byId) {
	if (!model.base) return undefined;
	const base = byId.get(model.base);
	if (!base) {
		throw new Error(
			`Semantic IR names a base absent from the document: ${model.id} extends ${model.base}`,
		);
	}
	return base;
}
