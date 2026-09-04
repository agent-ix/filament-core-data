/**
 * Semantic identity minting (FR-053).
 *
 * These rules are not this frontend's invention: they are FR-034's, the ones the
 * semantic-core lowering already publishes, rooted at the package identity
 * rather than at `<org>/<repo>`. That matters more than it looks. Two frontends
 * that mint different identities for the same declaration produce two IR
 * documents that no diff, no lock and no consumer can reconcile, and the
 * divergence is invisible until something downstream tries to join them.
 *
 * There is deliberately no decorator that overrides a minted identity. An
 * identity is a function of the declaration and its package, and nothing else.
 */

/** The slots an identity may occupy, and the order of the parts each takes. */
export const SLOTS = Object.freeze({
	type: ["name"],
	variant: ["owner", "name"],
	field: ["owner", "name"],
	relationship: ["owner", "verb", "target"],
	operation: ["owner", "name"],
	clause: ["owner", "clauseId"],
	constraint: ["owner", "keyword"],
});

/**
 * Reduces a declaration name to the identity charset: everything outside
 * `[A-Za-z0-9]` becomes `-`, runs collapse, and the ends are trimmed. Two
 * distinct names can slug to one value, which is why the caller checks for a
 * collision rather than assuming injectivity.
 */
export function slug(value) {
	return String(value)
		.replace(/[^A-Za-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

/** `ix://<package identity>/<slot>/<parts joined by ->`. */
export function mintIdentity(packageIdentity, slot, parts) {
	if (!(slot in SLOTS)) throw new TypeError(`unknown identity slot: ${slot}`);
	const tail = parts
		.map(slug)
		.filter((part) => part.length > 0)
		.join("-");
	return `ix://${packageIdentity}/${slot}/${tail}`;
}

/** The package-local kernel scalar definition FR-034 mints for a built-in scalar. */
export function kernelIdentity(packageIdentity, kernelName) {
	return mintIdentity(packageIdentity, "type", [kernelName]);
}

/**
 * The alias a constrained field's type is retargeted to (FR-034). Constraints
 * live on type definitions — `semantic-ir.schema.json` gives a field no
 * `constraints` member — so a constrained property mints one.
 */
export function constraintAliasIdentity(packageIdentity, owner, field) {
	return mintIdentity(packageIdentity, "type", [
		`${slug(owner)}${slug(field)}`,
	]);
}

function upperSnake(value) {
	return slug(value)
		.replace(/([a-z0-9])([A-Z])/g, "$1-$2")
		.replace(/-+/g, "_")
		.toUpperCase();
}

/**
 * The `diagnosticCode` an emitted constraint carries.
 *
 * This is a datum *inside* the IR document — the code a consumer raises when the
 * constraint fails — and not one of the compiler's own diagnostic codes, so it
 * does not belong in the FR-049 registry. It still has to match the
 * `diagnostic.code` pattern of `common.schema.json`, which is why both halves
 * are slugged: a package named `core.data` or a field named `a_b.c` would
 * otherwise produce a code the schema rejects.
 */
export function constraintDiagnosticCode(packageIdentity, parts, keyword) {
	const name = packageIdentity.slice(packageIdentity.indexOf("/") + 1);
	const namespace = slug(name).toLowerCase();
	const tail = [...parts, keyword].map(upperSnake).filter(Boolean).join("_");
	return `agent-ix.${namespace}.${tail}`;
}

/**
 * Detects a slug collision: two distinct declaration names that mint one
 * identity. Returns the colliding pairs, so the caller can raise
 * `UNSLUGGABLE_NAME` at the later declaration rather than emitting a document
 * in which two things share a name.
 */
export function slugCollisions(names) {
	const seen = new Map();
	const collisions = [];
	for (const name of names) {
		const key = slug(name);
		const first = seen.get(key);
		if (first !== undefined && first !== name) collisions.push([first, name]);
		else if (first === undefined) seen.set(key, name);
	}
	return collisions;
}
