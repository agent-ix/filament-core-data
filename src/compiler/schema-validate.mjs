/**
 * Validation against the published v1 contract schemas (FR-047, FR-050).
 *
 * The compiler validates every document it reads *and every document it emits*
 * against the schema the repository publishes, rather than against its own idea
 * of the shape. The schemas are loaded once, by `$id`, so a `$ref` between them
 * resolves the same way it does for any other consumer with a JSON Schema
 * 2020-12 implementation — which is the portability claim the contract makes.
 */
import { resolve } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { REPO_ROOT } from "./packages/lock.mjs";

const SCHEMA_BASE = "https://schemas.agent-ix.org/filament-core-data/v1/";

const cached = new Map();

/**
 * Compiles the schema set once per root, reading through the injected host.
 *
 * Keyed by root: a single process-wide cache would return whichever root asked
 * first, so a caller that passed a different tree would be validating against
 * the wrong schemas without any sign of it.
 */
export function schemaValidators(host, root = REPO_ROOT) {
	const key = resolve(root);
	if (cached.has(key)) return cached.get(key);
	const directory = resolve(key, "schema/semantic/v1");
	const ajv = new Ajv2020({
		allErrors: true,
		strict: true,
		strictRequired: false,
	});
	addFormats(ajv);
	const names = host
		.walk(directory)
		.filter((name) => name.endsWith(".schema.json"));
	for (const name of names) {
		ajv.addSchema(JSON.parse(host.readText(resolve(directory, name))));
	}
	const validators = {
		/** Returns `[]` when the document is valid, else ajv's error list. */
		errors(schemaName, document) {
			const validate = ajv.getSchema(`${SCHEMA_BASE}${schemaName}`);
			if (!validate) throw new Error(`no such published schema: ${schemaName}`);
			return validate(document) ? [] : [...(validate.errors ?? [])];
		},
		names,
	};
	cached.set(key, validators);
	return validators;
}

/** Test seam: forget the compiled schema sets so a later call recompiles them. */
export function resetSchemaValidators() {
	cached.clear();
}

/**
 * ajv reports an `instancePath` in JSON Pointer form; for a `required` failure
 * the missing member is named in `params` rather than in the path, so the
 * pointer is extended to name it. A diagnostic that lands on the object rather
 * than on the absent member is harder to act on than one that names it.
 */
export function errorPointer(error) {
	if (error.keyword === "required" && error.params?.missingProperty) {
		return `${error.instancePath}/${error.params.missingProperty}`;
	}
	if (
		error.keyword === "additionalProperties" &&
		error.params?.additionalProperty
	) {
		return `${error.instancePath}/${error.params.additionalProperty}`;
	}
	return error.instancePath;
}

/** A short, stable description of one schema error. */
export function errorMessage(error) {
	const pointer = errorPointer(error) || "(document root)";
	return `${pointer} ${error.message ?? error.keyword}`;
}
