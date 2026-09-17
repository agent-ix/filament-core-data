/**
 * The Python generation backends (issue #23).
 *
 * Two targets, one backend: `python-pydantic-v2` and `python-dataclass` differ
 * only by which immutable profile in `python_backend/profiles.json` the
 * generator runs under, so they are one module parameterised rather than two
 * modules that must be kept in agreement.
 *
 * **This backend consumes JSON Schema, not IR.** That is the shape of the
 * dependency rather than a convenience: `datamodel-code-generator` reads JSON
 * Schema, so the IR reaches Python through the `json-schema` target's own
 * emission. One consequence is worth stating because it is the point — the
 * schemas Python generates from are the same bytes a consumer of the
 * `json-schema` target receives. Python cannot drift from JSON Schema here,
 * because there is no second lowering to drift.
 *
 * The generator itself is a Python program and runs as a child process. This
 * module never starts it: ADR-0006 makes the effect injected, and
 * `./produce.mjs` holds it, exactly as `../format.mjs` holds the formatter's
 * spawn for the TypeScript target. A caller that supplies no producer gets a
 * refusal, never an empty package.
 */

import { unenforcedMemberAdvisories } from "../../constructs.mjs";
import { DIAGNOSTIC_CODES, diagnostic } from "../../diagnostics.mjs";
import { jsonSchemaBackend } from "../json-schema-v1/index.mjs";

export const identity = "ix://agent-ix/filament-core-data/backend/python";

/**
 * Target to profile.
 *
 * The profile ids are `python_backend/profiles.json`'s own, not restated
 * spellings: the runner refuses an id it does not declare, so a drift here is a
 * refusal rather than a silently different package.
 */
const PROFILES = Object.freeze({
	"python-pydantic-v2": "pydantic_v2_basemodel",
	"python-dataclass": "pydantic_v2_dataclass",
});

/**
 * The features this backend supports.
 *
 * It carries exactly the `json-schema` target's set, because everything it
 * generates from is that target's output. Claiming more would be claiming
 * something the lowering it depends on does not deliver.
 */
const SUPPORTED_FEATURES = jsonSchemaBackend.supportedFeatures;

/** The media type a generated Python path carries. */
function mediaTypeOf(path) {
	if (path.endsWith(".py")) return "text/x-python";
	if (path.endsWith(".json")) return "application/json";
	if (path.endsWith(".md")) return "text/markdown";
	return "text/plain";
}

/**
 * The schema documents, keyed by the file name the generator resolves `$ref`
 * against.
 *
 * `index.json` is dropped: it is the JSON Schema target's own manifest, not a
 * schema, and handing it to the generator would emit a module for it.
 *
 * The names are the lowering's own, unrenamed. The emitted documents `$ref`
 * one another by relative file name, and the generator resolves those itself
 * as a modular input directory — so a rename here would break every reference
 * that resolves before it.
 */
function documentsFrom(files) {
	const documents = {};
	for (const file of files) {
		if (file.path === "index.json") continue;
		documents[file.path] = JSON.parse(file.text);
	}
	return documents;
}

/**
 * The `json-schema` target's own manifest, handed beside the documents rather
 * than among them: it carries the document-level members no schema carries —
 * the populations — which the generated construct module renders (FR-136).
 */
function indexFrom(files) {
	const index = files.find((file) => file.path === "index.json");
	return index === undefined ? undefined : JSON.parse(index.text);
}

/** Builds the backend for one target. */
function pythonBackendFor(target) {
	return Object.freeze({
		identity,
		version: "0.1.0",
		target,
		owningIssue: "agent-ix/filament-core-data#23",
		supportedIrVersions: jsonSchemaBackend.supportedIrVersions,
		supportedFeatures: SUPPORTED_FEATURES,
		profileId: PROFILES[target],
		generate(request, options = {}) {
			const lowered = jsonSchemaBackend.generate(request, options);
			// A refusal by the lowering is this backend's refusal too, reported
			// unchanged. Restating it would give one defect two vocabularies.
			if (lowered.state !== "success") return lowered;

			const produce = options.produce;
			if (typeof produce !== "function")
				return {
					state: "unavailable",
					files: [],
					diagnostics: [
						diagnostic(DIAGNOSTIC_CODES.BACKEND_CONTRACT_VIOLATION, {
							message:
								`the ${target} backend needs an injected producer and received none; ` +
								"supply `options.produce` from src/compiler/backends/python-v1/produce.mjs",
						}),
					],
				};

			let files;
			try {
				files = produce(
					documentsFrom(lowered.files),
					PROFILES[target],
					indexFrom(lowered.files),
				);
			} catch (error) {
				// By the error's own name rather than by its class: importing
				// `ProducerError` would make the module that starts the child
				// process reachable from this one, which is exactly the reach
				// ADR-0006 removes. A producer's own refusal already names the
				// profile and the cause, so it is reported unchanged.
				const message =
					error.name === "ProducerError"
						? error.message
						: `the Python producer could not run: ${error.message}`;
				return {
					state: "invalid",
					files: [],
					diagnostics: [
						diagnostic(DIAGNOSTIC_CODES.BACKEND_CONTRACT_VIOLATION, {
							message,
						}),
					],
				};
			}

			return {
				state: "success",
				files: Object.entries(files)
					.sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
					.map(([path, text]) => ({
						path,
						text,
						identities: [],
						mediaType: mediaTypeOf(path),
					})),
				// The lowering's own advisories name the json-schema target; this
				// target's generated package carries the same members unenforced.
				diagnostics: unenforcedMemberAdvisories(request.ir, target),
			};
		},
	});
}

export const pythonPydanticBackend = pythonBackendFor("python-pydantic-v2");
export const pythonDataclassBackend = pythonBackendFor("python-dataclass");
