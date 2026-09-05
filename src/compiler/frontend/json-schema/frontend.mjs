/**
 * The JSON Schema frontend (FR-082).
 *
 * Matches the shape `src/compiler/frontend/typespec/frontend.mjs` returns, so
 * the seam can select between them by `sourceForm` without either knowing the
 * other exists. A frontend that returned its own shape would make the seam the
 * place where the two dialects are reconciled, and the seam is the one module
 * that must not know what a dialect is.
 *
 * The lowering itself lives in `lower.mjs` and is pure. This module is the
 * adapter: it takes a request, hands the documents to the lowering, and
 * returns diagnostics or a document. It reads nothing either.
 */

import { DIAGNOSTIC_CODES } from "../../diagnostics.mjs";
import { lowerBundle } from "./lower.mjs";

/**
 * The dialect this frontend consumes.
 *
 * `spec-bundle` rather than a JSON Schema URL: `common.schema.json`'s
 * `frontendDialect` enum is `typespec | spec-bundle`, and a dialect outside it
 * is not selectable by the seam whatever this module calls itself.
 */
export const dialect = "spec-bundle";

/** The source form the seam registers this frontend under. */
export const sourceForm = "json-schema-bundle";

/**
 * Runs the frontend over a request carrying `documents`.
 *
 * Returns `{ state, document, diagnostics }`. `state` is `success` only when
 * the lowering produced a document: a frontend that returned a partial
 * document with diagnostics beside it would leave the caller to decide whether
 * the document was usable, and every caller would decide differently.
 *
 * @param {{ documents?: readonly (readonly [string, Record<string, unknown>])[] }} request
 */
export function run(request) {
	const documents = request.documents ?? [];
	if (documents.length === 0) {
		return {
			state: "invalid",
			diagnostics: Object.freeze([
				{
					// Referenced, never spelled: a literal code drifts from the
					// registry silently, and the registry is what the docs and the
					// coverage gate read.
					code: DIAGNOSTIC_CODES.UNSUPPORTED_SCHEMA_SHAPE.code,
					message:
						"the request carries no documents; an empty bundle lowers to an empty document, which is indistinguishable from a bundle that failed to load",
					locus: "/documents",
				},
			]),
		};
	}

	const lowered = lowerBundle(documents);
	if (lowered.diagnostics) {
		return {
			state: "invalid",
			diagnostics: lowered.diagnostics,
		};
	}
	return {
		state: "success",
		document: lowered.document,
		diagnostics: Object.freeze([]),
	};
}
