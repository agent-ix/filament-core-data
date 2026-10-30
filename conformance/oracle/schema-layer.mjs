/**
 * The pinned JSON Schema 2020-12 layer of the oracle (issue #20, FR-036).
 *
 * It validates each present bundle member against its published v1 schema and
 * collapses the validator's error list to one diagnostic per distinct failing
 * instance location, discarding any location that is a strict prefix of another
 * reported location. One violation inside a `oneOf` or `allOf` cascade
 * therefore yields one diagnostic at the deepest failing node, which is what
 * makes "a negative case yields exactly one diagnostic" decidable.
 */

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import Ajv from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

import { compareCodeUnits, isObject } from "./json.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const PUBLISHED = join(HERE, "..", "..", "schema", "semantic", "v1");
const CONFORMANCE = join(HERE, "..", "schema");
const BASE = "https://schemas.agent-ix.org/filament-core-data/v1/";

/** The bundle member → published schema file the contract binds it to. */
export const MEMBER_SCHEMAS = {
	ir: "semantic-ir.schema.json",
	manifest: "package-manifest.schema.json",
	packageGraph: "package-graph.schema.json",
	profile: "profile.schema.json",
	consumerPolicy: "consumer-policy.schema.json",
};

/** Each entry of `mappings[]` is validated against the mapping schema. */
export const MAPPING_SCHEMA = "mapping.schema.json";

let cached;

/** Builds the validator once, from the published schemas and nothing else. */
export function validators() {
	if (cached) return cached;
	const ajv = new Ajv({ strict: false, allErrors: true });
	addFormats(ajv);
	for (const file of readdirSync(PUBLISHED).sort(compareCodeUnits)) {
		if (file.endsWith(".schema.json")) {
			ajv.addSchema(JSON.parse(readFileSync(join(PUBLISHED, file), "utf8")));
		}
	}
	for (const file of readdirSync(CONFORMANCE).sort(compareCodeUnits)) {
		if (file.endsWith(".schema.json")) {
			ajv.addSchema(JSON.parse(readFileSync(join(CONFORMANCE, file), "utf8")));
		}
	}
	cached = ajv;
	return ajv;
}

/** Validates one value against a schema `$id`, returning ajv errors or `[]`. */
export function validateAgainst(id, value) {
	const validate = validators().getSchema(id);
	if (!validate) throw new Error(`schema not registered: ${id}`);
	return validate(value) ? [] : [...(validate.errors ?? [])];
}

/** Validates against a published v1 schema by file name. */
export function validatePublished(file, value) {
	return validateAgainst(`${BASE}${file}`, value);
}

/** Validates against a conformance schema by file name. */
export function validateConformance(file, value) {
	const errors = validateAgainst(
		`https://schemas.agent-ix.org/filament-core-data/conformance/v1/${file}`,
		value,
	);
	return file === "package-graph.schema.json" && errors.length === 0
		? packageGraphOrderErrors(value)
		: errors;
}

/** Cross-entry constraints that JSON Schema cannot express by itself. */
function packageGraphOrderErrors(graph) {
	const errors = [];
	const emit = (instancePath, message) =>
		errors.push({ instancePath, keyword: "order", message, params: {} });
	const packages = graph.packages;
	if (
		packages.filter((entry) => entry.identity === graph.rootPackage).length !==
		1
	) {
		emit("/rootPackage", "root package must appear exactly once");
	}
	for (let i = 1; i < packages.length; i += 1) {
		if (compareCodeUnits(packages[i - 1].identity, packages[i].identity) >= 0) {
			emit(`/packages/${i}/identity`, "package identities must increase");
		}
	}
	for (const [i, entry] of packages.entries()) {
		for (const name of ["imports", "exports"]) {
			for (let j = 1; j < entry[name].length; j += 1) {
				if (compareCodeUnits(entry[name][j - 1], entry[name][j]) >= 0) {
					emit(
						`/packages/${i}/${name}/${j}`,
						`${name} must increase by identity`,
					);
				}
			}
		}
	}
	return errors;
}

function message(error) {
	const params = Object.entries(error.params ?? {})
		.sort(([left], [right]) => compareCodeUnits(left, right))
		.map(([key, value]) => `${key}=${JSON.stringify(value)}`)
		.join(" ");
	return params
		? `${error.keyword}: ${error.message} (${params})`
		: `${error.keyword}: ${error.message}`;
}

/**
 * Collapses ajv errors to one row per deepest distinct instance location.
 *
 * `prefix` is prepended so that a member's errors are addressed inside the
 * bundle (`/ir/types/0/kind`, not `/types/0/kind`).
 */
export function collapse(errors, prefix) {
	const byPath = new Map();
	for (const error of errors) {
		const path = `${prefix}${error.instancePath}`;
		const existing = byPath.get(path);
		const text = message(error);
		if (existing === undefined || compareCodeUnits(text, existing) < 0) {
			byPath.set(path, text);
		}
	}
	const paths = [...byPath.keys()].sort(compareCodeUnits);
	let deepest = paths.filter(
		(path) =>
			!paths.some((other) => other !== path && other.startsWith(`${path}/`)),
	);
	// A `oneOf` or `allOf` cascade reports one violation at several sibling
	// locations under the node the cascade guards. When that node itself
	// failed and carries more than one reported descendant, it is the
	// violation's location and the siblings are its branches.
	for (const ancestor of paths.slice().reverse()) {
		const under = deepest.filter((path) => path.startsWith(`${ancestor}/`));
		if (under.length > 1) {
			deepest = deepest.filter((path) => !under.includes(path));
			deepest.push(ancestor);
		}
	}
	return [...new Set(deepest)].sort(compareCodeUnits).map((path) => ({
		pointer: path,
		message: byPath.get(path) ?? "schema violation",
	}));
}

/**
 * Runs the schema layer over an input bundle.
 *
 * Returns `[{ pointer, message }]`, already collapsed and ordered by pointer.
 */
export function schemaDiagnostics(bundle) {
	if (!isObject(bundle)) {
		return [{ pointer: "", message: "type: must be object" }];
	}
	const rows = [];
	const shape = validateConformance("input-bundle.schema.json", bundle);
	if (shape.length > 0) {
		// Report only the envelope's own violations here; member-level detail
		// comes from the per-member runs below, which give better pointers.
		const envelope = shape.filter(
			(error) =>
				error.instancePath === "" ||
				!(
					error.instancePath.split("/")[1] in { ...MEMBER_SCHEMAS, mappings: 1 }
				),
		);
		rows.push(...collapse(envelope, ""));
	}
	for (const [member, file] of Object.entries(MEMBER_SCHEMAS)) {
		if (bundle[member] === undefined) continue;
		rows.push(
			...collapse(
				member === "packageGraph"
					? validateConformance(file, bundle[member])
					: validatePublished(file, bundle[member]),
				`/${member}`,
			),
		);
	}
	if (Array.isArray(bundle.mappings)) {
		for (const [index, mapping] of bundle.mappings.entries()) {
			rows.push(
				...collapse(
					validatePublished(MAPPING_SCHEMA, mapping),
					`/mappings/${index}`,
				),
			);
		}
	}
	const paths = rows.map((row) => row.pointer);
	return rows
		.filter(
			(row) =>
				!paths.some(
					(other) =>
						other !== row.pointer && other.startsWith(`${row.pointer}/`),
				),
		)
		.sort((left, right) => compareCodeUnits(left.pointer, right.pointer));
}
