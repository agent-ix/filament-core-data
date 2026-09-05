/**
 * The closed recognised-keyword set (FR-082).
 *
 * Closed, and deliberately so. A lowering that ignores a keyword it does not
 * recognise produces an IR document that is *quietly* less constrained than
 * the schema it came from: every downstream package then accepts values the
 * contract forbids, and nothing anywhere reports it. The failure surfaces
 * years later as data that does not match its type.
 *
 * So an unrecognised member name is a blocking diagnostic naming the keyword
 * and the pointer, and the lowering returns no document. There is no
 * permissive mode, no flag, and no environment setting that relaxes this —
 * a permissive mode is the same defect with a switch in front of it.
 */

/**
 * Exactly the eighteen keywords FR-082 declares. Frozen: a caller that could
 * push onto this set could widen the contract at run time, which is the
 * failure this set exists to prevent.
 */
export const RECOGNISED_KEYWORDS = Object.freeze(
	new Set([
		"$schema",
		"$id",
		"$ref",
		"type",
		"properties",
		"required",
		"unevaluatedProperties",
		"not",
		"description",
		"const",
		"enum",
		"anyOf",
		"items",
		"minItems",
		"pattern",
		"minLength",
		"minimum",
		"maximum",
	]),
);

/**
 * Every unrecognised member name in a subschema, with the JSON Pointer at
 * which it occurred.
 *
 * Returns all of them rather than the first: a caller fixing an unrecognised
 * keyword one exception at a time learns how many there are only by
 * iterating, and the count is the thing that says whether a schema is nearly
 * representable or not representable at all.
 *
 * @param {unknown} node
 * @param {string} [pointer]
 * @returns {readonly { keyword: string, pointer: string }[]}
 */
export function unrecognisedKeywords(node, pointer = "") {
	/** @type {{ keyword: string, pointer: string }[]} */
	const out = [];
	const walk = (value, at) => {
		if (Array.isArray(value)) {
			value.forEach((item, index) => walk(item, `${at}/${index}`));
			return;
		}
		if (value === null || typeof value !== "object") return;
		for (const [key, child] of Object.entries(value)) {
			// `properties` and `$defs` introduce a namespace of author-chosen
			// names; those are data, not keywords, and are never checked against
			// the set. Checking them would report every field name in the grammar.
			if (key === "properties" || key === "$defs") {
				if (child !== null && typeof child === "object") {
					for (const [name, sub] of Object.entries(child)) {
						walk(sub, `${at}/${key}/${name}`);
					}
				}
				continue;
			}
			if (!RECOGNISED_KEYWORDS.has(key)) {
				out.push({ keyword: key, pointer: `${at}/${key}` });
				continue;
			}
			walk(child, `${at}/${key}`);
		}
	};
	walk(node, pointer);
	return Object.freeze(out);
}
