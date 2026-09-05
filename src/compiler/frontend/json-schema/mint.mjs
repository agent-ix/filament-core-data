/**
 * Minted names for anonymous constructs (FR-083).
 *
 * A JSON Schema leaves constructs anonymous that a typed target must name: the
 * union under `TypeRef.target`, the one-member enum under
 * `MinConstraint.keyword`. The name has to come from somewhere, and where it
 * comes from decides whether the generated packages are stable.
 *
 * The rule is: **owner and property, and nothing else.** No part of a minted
 * name is read from the construct's own content, so changing a `description`
 * or a `maximum` never renames a type. A name derived from content is a name
 * that moves when the content moves, and every consumer of that type moves
 * with it — silently, because the old name simply stops existing.
 */

/**
 * `<propertyName>` with its first code point upper-cased and nothing else
 * changed.
 *
 * Code point rather than character: a leading astral character has a surrogate
 * pair as its first two UTF-16 units, and upper-casing the first unit alone
 * produces a different, invalid name.
 *
 * @param {string} property
 * @returns {string}
 */
export function segment(property) {
	if (property.length === 0) return property;
	const first = String.fromCodePoint(
		/** @type {number} */ (property.codePointAt(0)),
	);
	return first.toUpperCase() + property.slice(first.length);
}

/**
 * The minted name for a construct occupying `property` of `owner`.
 *
 * Composes left to right: a construct nested inside a minted type carries the
 * enclosing mint's whole name as its owner prefix, and no intermediate segment
 * is elided. Eliding one would let two distinct positions mint the same name,
 * and the collision would surface as a silently overwritten type rather than
 * as an error.
 *
 * @param {string} owner
 * @param {string} property
 * @returns {string}
 */
export function mintName(owner, property) {
	return `${owner}${segment(property)}`;
}

/**
 * The minted name for a path of properties beneath a declared type.
 *
 * @param {string} owner
 * @param {readonly string[]} path
 * @returns {string}
 */
export function mintPath(owner, path) {
	return path.reduce((name, property) => mintName(name, property), owner);
}

/**
 * Whether two positions would mint the same name.
 *
 * Exposed rather than left implicit because the rule's one failure mode is a
 * collision, and a collision that nothing reports is a type that overwrites
 * another.
 *
 * @param {readonly { owner: string, path: readonly string[] }[]} positions
 * @returns {readonly { name: string, positions: readonly string[] }[]}
 */
export function mintCollisions(positions) {
	/** @type {Map<string, string[]>} */
	const byName = new Map();
	for (const position of positions) {
		const name = mintPath(position.owner, position.path);
		const where = `${position.owner}${position.path.map((p) => `.${p}`).join("")}`;
		const list = byName.get(name) ?? [];
		list.push(where);
		byName.set(name, list);
	}
	return Object.freeze(
		[...byName.entries()]
			.filter(([, where]) => where.length > 1)
			.map(([name, where]) => ({ name, positions: Object.freeze(where) })),
	);
}
