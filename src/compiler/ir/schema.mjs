/**
 * Schema validation of an IR document (FR-050).
 *
 * The compiler validates against the schema the repository *publishes*, not
 * against its own idea of the shape, so a document it accepts is one any
 * consumer with a JSON Schema 2020-12 implementation would also accept. That is
 * the portability claim the contract makes, and validating against a private
 * copy would quietly stop testing it.
 */
import { DIAGNOSTIC_CODES, diagnostic, fragment } from "../diagnostics.mjs";
import { createHost } from "../host.mjs";
import { REPO_ROOT } from "../packages/lock.mjs";
import {
	errorMessage,
	errorPointer,
	schemaValidators,
} from "../schema-validate.mjs";

let fallback;

/** A host scoped to the repository, for callers that supply none. */
export function repositoryHost() {
	if (!fallback) fallback = createHost({ readRoots: [REPO_ROOT] });
	return fallback;
}

/**
 * Returns one `INVALID_IR` diagnostic per schema error, each naming the failing
 * instance pointer. The locus, where the offending node carries an `origin`, is
 * that node's own source position (FR-049).
 */
export function validateIrDocument(document, options = {}) {
	const host = options.host ?? repositoryHost();
	const errors = schemaValidators(host).errors(
		"semantic-ir.schema.json",
		document,
	);
	return errors.map((error) =>
		diagnostic(DIAGNOSTIC_CODES.INVALID_IR, {
			message: `${fragment(errorMessage(error))}`,
			...(() => {
				const locus = originLocusFor(document, errorPointer(error));
				return locus ? { locus } : {};
			})(),
		}),
	);
}

/**
 * Walks an instance pointer up to the nearest node carrying an `origin.source`,
 * so a schema failure lands on the declaration that produced it rather than on
 * the document.
 */
export function originLocusFor(document, pointer) {
	const segments = pointer.split("/").filter(Boolean);
	let node = document;
	const trail = [node];
	for (const segment of segments) {
		const key = segment.replace(/~1/g, "/").replace(/~0/g, "~");
		node = Array.isArray(node) ? node[Number(key)] : node?.[key];
		if (node === undefined) break;
		trail.push(node);
	}
	for (let index = trail.length - 1; index >= 0; index -= 1) {
		const candidate = trail[index];
		if (
			candidate &&
			typeof candidate === "object" &&
			candidate.origin?.source
		) {
			return candidate.origin.source;
		}
	}
	return undefined;
}
