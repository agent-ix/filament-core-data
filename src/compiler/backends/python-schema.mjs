/**
 * Schema keys that make `datamodel-code-generator` emit caller-controlled
 * Python. The set is closed: widening it is a spec amendment, and narrowing it
 * to make a schema pass is forbidden (FR-043-CON-1).
 */
const FORBIDDEN_KEYS = new Set([
	"x-python-import",
	"customTypePath",
	"default_factory",
]);

const NORMALIZED_ID = "urn:agent-ix:typespec-feasibility:python-input:1";

function titleFrom(name) {
	return name
		.split(/[^A-Za-z0-9]+/)
		.filter(Boolean)
		.map((part) => `${part[0].toUpperCase()}${part.slice(1)}`)
		.join("");
}

/**
 * Prepare the official TypeSpec JSON Schema bundle for
 * `datamodel-code-generator`.
 *
 * The `$ref` localisation and the `RecordString.json` alias are two halves of
 * one workaround for issue #31: the official emitter gives that shared helper a
 * relative `$id` that resolves under no single namespace base. FR-033
 * absolutises `$id` for published, addressable schemas; this adapter strips it
 * for a single-file generator input. Neither moves to match the other
 * (FR-043-CON-3).
 *
 * Pure: no filesystem, network, or clock access, and the input document is left
 * unmutated.
 */
export function normalizeJsonSchemaForPython(schema) {
	const definitions = schema.$defs ?? {};
	const references = new Map();
	for (const [name, definition] of Object.entries(definitions)) {
		if (definition.$id) references.set(definition.$id, `#/$defs/${name}`);
	}
	references.set("RecordString.json", "#/$defs/RecordString");
	const rewrite = (value) => {
		if (Array.isArray(value)) return value.map(rewrite);
		if (value === null || typeof value !== "object") return value;
		const output = {};
		for (const [key, child] of Object.entries(value)) {
			if (FORBIDDEN_KEYS.has(key)) {
				throw new Error(`Forbidden executable Python schema extension: ${key}`);
			}
			if (key === "$ref" && references.has(child))
				output[key] = references.get(child);
			else output[key] = rewrite(child);
		}
		return output;
	};
	const normalized = rewrite(schema);
	for (const [name, definition] of Object.entries(normalized.$defs ?? {})) {
		delete definition.$id;
		delete definition.$schema;
		if (
			name === "RecordString" &&
			definition.unevaluatedProperties !== undefined
		) {
			definition.additionalProperties = definition.unevaluatedProperties;
			delete definition.unevaluatedProperties;
		}
		definition.title ??= titleFrom(name);
	}
	normalized.$id = NORMALIZED_ID;
	return normalized;
}
