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

/**
 * `ix://<package identity>/<parts joined by />` for a `type`, `field` or
 * `operation` slot — a type definition and a member mint no slot segment of
 * their own, only their owner's identity nested by `/` — and
 * `ix://<package identity>/<slot>/<parts joined by ->` for every other slot
 * (`variant`, `relationship`, `clause`, `constraint`), which still mints
 * under its own segment (FR-095 "Node identities").
 */
export function mintIdentity(packageIdentity, slot, parts) {
	if (!(slot in SLOTS)) throw new TypeError(`unknown identity slot: ${slot}`);
	const slugged = parts.map(slug).filter((part) => part.length > 0);
	if (slot === "type" || slot === "field" || slot === "operation") {
		return `ix://${packageIdentity}/${slugged.join("/")}`;
	}
	return `ix://${packageIdentity}/${slot}/${slugged.join("-")}`;
}

/**
 * The `typeRef` a built-in scalar resolves to: `ix://quire/native/<Name>`,
 * naming no package node (gap 1 of FCD #199/#200).
 */
export function nativeTypeRef(kernelName) {
	return `ix://quire/native/${kernelName}`;
}

/**
 * `artifact-code` becomes `ARTIFACT_CODE`.
 *
 * A camel-case keyword is *not* split: FR-034 writes the code as
 * `<NAME>_<FIELD>_<KEYWORD>`, so `minLength` is `MINLENGTH`. Inserting a
 * separator there would read better and would disagree with the semantic-core
 * lowering, and agreement is the point.
 */
function upperSnake(value) {
	return slug(value).replace(/-+/g, "_").toUpperCase();
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
