/**
 * The normalized serialization and the IR fingerprint (FR-050).
 *
 * "The same IR" has to be a byte comparison, not a judgement, or the conformance
 * corpus cannot tell a compiler defect from a formatting difference. Two things
 * make that possible: the canonical form of FR-048, which fixes key order,
 * number form and string escaping, and the *materialisation* below, which writes
 * out the values a `1.1.0` document may leave derivable — multiplicity from
 * presence, presence from multiplicity, nullable from its absence — so two
 * documents that mean the same thing serialise the same way.
 *
 * A `1.0.0` document gains no bytes: it has no multiplicity to materialise, and
 * inventing one would change what the document says.
 */
import { canonicalize, digest } from "../packages/canonical.mjs";
import { multiplicityFromPresence } from "./reader.mjs";

/** The IR arrays whose order carries no meaning and is sorted by identity. */
export const IDENTITY_SETS = Object.freeze([
	"/types",
	"/types/*/fields",
	"/types/*/variants",
	"/types/*/constraints",
	"/types/*/relationships",
	"/types/*/operations",
	"/types/*/clauses",
	"/types/*/extensions",
	"/types/*/fields/*/extensions",
	"/types/*/operations/*/params",
	"/types/*/operations/*/params/*/extensions",
	"/occurrences",
	"/extensions",
]);

function isObject(value) {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

function asArray(value) {
	return Array.isArray(value) ? value.filter(isObject) : [];
}

/** The canonical byte form of an IR document, with its sets identity-sorted. */
export function canonicalIr(document, options = {}) {
	return canonicalize(document, { sets: IDENTITY_SETS, ...options });
}

/**
 * The normalized serialization. For a `1.1.0` document every field and every
 * operation parameter carries an explicit `multiplicity`, `presence` and
 * `nullable` before canonicalisation.
 */
export function normalizeIr(document, options = {}) {
	if (!isObject(document)) return canonicalIr(document, options);
	const copy = structuredClone(document);
	if (copy.contractVersion === "1.1.0" || copy.contractVersion === "2.0.0") {
		const materialize = (field) => {
			const multiplicity = isObject(field.multiplicity)
				? field.multiplicity
				: multiplicityFromPresence(field.presence);
			field.multiplicity = multiplicity;
			if (copy.contractVersion === "1.1.0")
				field.presence = multiplicity.lower >= 1 ? "required" : "optional";
			field.nullable = field.nullable === true;
		};
		for (const definition of asArray(copy.types)) {
			for (const field of asArray(definition.fields)) materialize(field);
			for (const operation of asArray(definition.operations)) {
				for (const parameter of asArray(operation.params))
					materialize(parameter);
			}
		}
	}
	return canonicalIr(copy, options);
}

/**
 * `sha256:<hex>` over the normalized serialization.
 *
 * A document nested past `maxDepth` cannot be canonicalised, and this is a
 * published symbol, so the bound surfaces as a value a caller can test rather
 * than as an exception it did not ask for.
 */
export function fingerprintIr(document, options = {}) {
	try {
		return digest(normalizeIr(document, options));
	} catch (error) {
		if (error?.name !== "CanonicalLimitError") throw error;
		return undefined;
	}
}

/** The bytes the CLI writes for an IR document: tab-indented JSON, one newline. */
export function serializeIr(document) {
	return `${JSON.stringify(document, null, "\t")}\n`;
}
