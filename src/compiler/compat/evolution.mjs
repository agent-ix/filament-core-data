/**
 * Projecting an IR document between contract versions (FR-051).
 *
 * A projection is a *view* of a compile's output, not a new compile, so it
 * carries the envelope — `source.digest`, the whole `package` block — verbatim.
 * Recomputing a digest here would produce a document that claims to have been
 * built from inputs the projection never saw.
 *
 * The forward projection declares its loss. Dropping a `1.1.0` member quietly
 * would let a `1.0.0` consumer believe it had the whole contract, which is
 * exactly the failure the loss vocabulary exists to prevent.
 */
import { DIAGNOSTIC_CODES, diagnostic, fragment } from "../diagnostics.mjs";
import { multiplicityFromPresence } from "../ir/reader.mjs";

/** The `1.0.0` constant `semantic-ir.schema.json` requires as that version's dialect. */
export const V1_DIALECT = "https://json-schema.org/draft/2020-12/schema";

/** The members contract `1.1.0` added, and therefore the forward projection drops. */
export const V1_1_ADDED_NODES = Object.freeze([
	"field.multiplicity",
	"field.unit",
	"typeDefinition.relationships",
	"typeDefinition.operations",
	"typeDefinition.clauses",
	"constraint.keyword (closed)",
	"source.dialect (frontend)",
]);

export const CONTRACT_VERSIONS = Object.freeze(["1.0.0", "1.1.0"]);

function asArray(value) {
	return Array.isArray(value) ? value : [];
}

/**
 * Reads a document as a given contract version.
 *
 * Returns `{ document, loss, diagnostics }`. `document` is `null` whenever a
 * diagnostic blocks. `options.dialect` is required when projecting *up* to
 * `1.1.0`, because the schema forbids the `1.0.0` constant on a `1.1.0`
 * document and no rule can derive which frontend produced it.
 */
export function readIrAsContract(document, targetVersion, options = {}) {
	if (!CONTRACT_VERSIONS.includes(targetVersion)) {
		return {
			document: null,
			loss: [],
			diagnostics: [
				diagnostic(DIAGNOSTIC_CODES.UNKNOWN_CONTRACT_VERSION, {
					message: `${fragment(targetVersion)} is not a contract version this compiler reads; it reads ${CONTRACT_VERSIONS.join(" and ")}`,
				}),
			],
		};
	}
	const current = String(document?.contractVersion);
	if (current === targetVersion) {
		return { document, loss: [], diagnostics: [] };
	}

	if (targetVersion === "1.0.0") {
		const loss = [];
		const projected = structuredClone(document);
		projected.contractVersion = "1.0.0";
		projected.source = { ...projected.source, dialect: V1_DIALECT };
		for (const definition of asArray(projected.types)) {
			for (const key of ["relationships", "operations", "clauses"]) {
				for (const node of asArray(definition[key])) {
					loss.push(String(node.identity));
				}
				delete definition[key];
			}
			for (const field of asArray(definition.fields)) {
				if (field.multiplicity !== undefined) {
					loss.push(`${field.identity}#multiplicity`);
					delete field.multiplicity;
				}
				if (field.unit !== undefined) {
					loss.push(`${field.identity}#unit`);
					delete field.unit;
				}
			}
		}
		loss.sort((left, right) => (left < right ? -1 : left > right ? 1 : 0));
		return { document: projected, loss, diagnostics: [] };
	}

	if (!options.dialect) {
		return {
			document: null,
			loss: [],
			diagnostics: [
				diagnostic(DIAGNOSTIC_CODES.MISSING_TARGET_DIALECT, {
					message:
						"projecting to contract 1.1.0 needs the frontend dialect the document came from; the 1.0.0 schema constant is not valid on a 1.1.0 document and the value cannot be derived",
				}),
			],
		};
	}
	const projected = structuredClone(document);
	projected.contractVersion = "1.1.0";
	projected.source = { ...projected.source, dialect: options.dialect };
	for (const definition of asArray(projected.types)) {
		for (const field of asArray(definition.fields)) {
			if (field.multiplicity === undefined) {
				field.multiplicity = multiplicityFromPresence(field.presence);
			}
		}
	}
	return { document: projected, loss: [], diagnostics: [] };
}
