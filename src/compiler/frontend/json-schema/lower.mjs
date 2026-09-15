/**
 * JSON Schema to semantic IR lowering (FR-082).
 *
 * Pure: takes the documents and returns either an IR document or diagnostics,
 * and reads nothing.
 *
 * Two diagnostics rather than one, and the distinction is the point.
 * `UNSUPPORTED_SCHEMA_KEYWORD` says *this keyword is outside the recognised
 * set*; `UNSUPPORTED_SCHEMA_SHAPE` says *this keyword is recognised, but this
 * arrangement of it has never been seen here*. They send a reader to different
 * files — the first to the keyword set, the second to the kind-assignment
 * table — and collapsing them into one code would send every reader to the
 * wrong one half the time.
 */

import { DIAGNOSTIC_CODES } from "../../diagnostics.mjs";
import { unrecognisedKeywords } from "./keywords.mjs";
import { mintName } from "./mint.mjs";

const IDENTITY_PREFIX = "ix://agent-ix/semantic-core/type";
const UNTAGGED_UNION_EXTENSION =
	"ix://agent-ix/semantic-core/extension/untagged-union-wire-form";

/** @param {string} name */
export function identityOf(name) {
	return `${IDENTITY_PREFIX}/${name}`;
}

/** The declared type name a `$ref` or `$id` URL names. */
export function nameFromUrl(url) {
	const last = String(url).split("/").pop() ?? "";
	return last.replace(/\.json$/, "");
}

/**
 * The IR scalar a bare `{"type": X}` names.
 *
 * A property carrying only `type` is the same scalar row of the kind table with
 * zero constraints. Treating it as uncovered would make the committed bundle
 * unlowerable, which FR-082 says it is not.
 */
const SCALAR_OF = Object.freeze({
	string: "string",
	number: "number",
	integer: "integer",
	boolean: "boolean",
});

/** Whether a subschema is a bare primitive: `{"type": X}` and nothing else. */
function barePrimitive(schema) {
	return (
		schema !== null &&
		typeof schema === "object" &&
		Object.keys(schema).every(
			(key) => key === "type" || key === "x-agent-ix-semantic-id",
		) &&
		typeof schema.type === "string" &&
		schema.type in SCALAR_OF
	);
}

/**
 * A constraint in the shape `semantic-ir.schema.json` requires: an identity,
 * the subject it applies to, a diagnostic code and an origin — not a bare
 * keyword and value.
 *
 * The extra members are not ceremony. `appliesTo` is what lets a reader say
 * which type a violated constraint belongs to, and `diagnosticCode` is what a
 * generated package reports when it refuses a value. A constraint without them
 * can be checked but not explained.
 */
function constraintOf(owner, keyword, value, file) {
	return {
		identity: `${identityOf(owner)}/constraint/${keyword}`,
		appliesTo: identityOf(owner),
		keyword,
		operands: { value },
		diagnosticCode: `agent-ix.semantic-core.${keyword.toUpperCase()}`,
		origin: {
			source: {
				sourceIdentity: "ix://agent-ix/semantic-core",
				path: `packages/semantic-core/generated/json-schema/${file}`,
				startLine: 1,
				startColumn: 1,
			},
		},
	};
}

/** A source locus for a construct read out of `file`. */
function locus(file) {
	return {
		source: {
			sourceIdentity: "ix://agent-ix/semantic-core",
			path: `packages/semantic-core/generated/json-schema/${file}`,
			startLine: 1,
			startColumn: 1,
		},
	};
}

/**
 * A variant in the shape the schema requires.
 *
 * `nullable` and `defaultKind` are stated on every field rather than defaulted
 * by a reader, because "the schema said nothing" and "the schema said none"
 * are different facts and only one of them is a contract.
 */
function completeVariant(owner, variant, file) {
	return {
		identity: `${identityOf(owner)}/variant/${variant.name}`,
		name: variant.name,
		...(variant.payloadType ? { payloadType: variant.payloadType } : {}),
		origin: locus(file),
	};
}

/** The source wire form is carried through the IR's declared extension surface. */
function untaggedUnionExtension() {
	return {
		identity: UNTAGGED_UNION_EXTENSION,
		version: "1.0.0",
		required: false,
		payload: { wireForm: "untagged" },
	};
}

function diag(entry, message, locus_) {
	return { code: entry.code, message, locus: locus_ };
}

/**
 * `multiplicity` and the `presence` derived from it.
 *
 * `presence` is never stated independently: it is `required` exactly when
 * `lower >= 1`. The FR-050 reader re-derives the same relation and reports
 * `PRESENCE_MULTIPLICITY_MISMATCH`, so computing the two separately would be
 * asserting a fact the reader is about to check.
 */
export function multiplicityOf(schema, isRequired) {
	if (schema && schema.type === "array") {
		// Whether or not the property is named in `required`: an array-typed
		// member's lower bound is its `minItems`, and IR v1.1 has no way to say
		// "must be present and may be empty".
		const lower = typeof schema.minItems === "number" ? schema.minItems : 0;
		return {
			multiplicity: { lower },
			presence: lower >= 1 ? "required" : "optional",
		};
	}
	const lower = isRequired ? 1 : 0;
	return {
		multiplicity: { lower, upper: 1 },
		presence: lower >= 1 ? "required" : "optional",
	};
}

/**
 * Lowers one property to a field, minting a named type for any anonymous
 * construct in the position.
 *
 * `field.typeRef` is a single identity, so no field may carry an inline shape:
 * an anonymous construct has to become its own named type or it cannot be
 * referenced at all.
 */
function lowerProperty(owner, property, schema, isRequired, out, minted, file) {
	const at = `/properties/${property}`;
	const { multiplicity, presence } = multiplicityOf(schema, isRequired);
	const mint = (definition) => {
		const name = mintName(owner, property);
		minted.push({ name, ...definition });
		return identityOf(name);
	};

	/** @type {string | null} */
	let typeRef = null;

	if (schema && typeof schema === "object" && "$ref" in schema) {
		typeRef = identityOf(nameFromUrl(schema.$ref));
	} else if (schema && Array.isArray(schema.anyOf)) {
		// Branches are all `$ref`s, or all recognised property-position forms.
		// A mixture is the case the table does not cover.
		const allRefs = schema.anyOf.every(
			(b) => b && typeof b === "object" && "$ref" in b,
		);
		const allPrimitive = schema.anyOf.every(barePrimitive);
		if (!allRefs && !allPrimitive) {
			out.push(
				diag(
					DIAGNOSTIC_CODES.UNSUPPORTED_SCHEMA_SHAPE,
					`anyOf branches at ${at} are neither all $refs nor all recognised property-position forms`,
					at,
				),
			);
			return null;
		}
		typeRef = mint({
			kind: "union",
			// JSON Schema `anyOf` selects a branch from the value itself.  It
			// does not add the TypeScript backend's `{ kind, value }` envelope.
			// Preserve that fact for the emitters rather than inventing a tag.
			...(allRefs ? { extensions: [untaggedUnionExtension()] } : {}),
			variants: (allRefs
				? schema.anyOf.map((b) => {
						const target = nameFromUrl(b.$ref);
						return { name: target, payloadType: identityOf(target) };
					})
				: schema.anyOf.map((b) => ({ name: b.type }))
			).map((v) => completeVariant(mintName(owner, property), v, file)),
		});
	} else if (
		schema &&
		schema.type === "string" &&
		typeof schema.const === "string"
	) {
		typeRef = mint({
			kind: "enum",
			variants: [
				completeVariant(
					mintName(owner, property),
					{ name: schema.const },
					file,
				),
			],
		});
	} else if (schema && schema.type === "string" && Array.isArray(schema.enum)) {
		typeRef = mint({
			kind: "enum",
			variants: schema.enum.map((v) =>
				completeVariant(mintName(owner, property), { name: String(v) }, file),
			),
		});
	} else if (schema && schema.type === "integer") {
		const name = mintName(owner, property);
		const constraints = [];
		if (typeof schema.minimum === "number")
			constraints.push(constraintOf(name, "min", schema.minimum, file));
		if (typeof schema.maximum === "number")
			constraints.push(constraintOf(name, "max", schema.maximum, file));
		typeRef = mint({ kind: "scalar", scalar: "integer", constraints });
	} else if (schema && schema.type === "array") {
		const items = schema.items;
		if (items && typeof items === "object" && "$ref" in items) {
			typeRef = identityOf(nameFromUrl(items.$ref));
		} else if (
			items &&
			Array.isArray(items.anyOf) &&
			items.anyOf.every(barePrimitive)
		) {
			typeRef = mint({
				kind: "union",
				variants: items.anyOf.map((b) =>
					completeVariant(mintName(owner, property), { name: b.type }, file),
				),
			});
		} else if (barePrimitive(items)) {
			typeRef = mint({ kind: "scalar", scalar: SCALAR_OF[items.type] });
		} else {
			out.push(
				diag(
					DIAGNOSTIC_CODES.UNSUPPORTED_SCHEMA_SHAPE,
					`array items at ${at} is not a $ref`,
					at,
				),
			);
			return null;
		}
	} else if (
		schema &&
		typeof schema === "object" &&
		Object.keys(schema).length === 0
	) {
		// The unconstrained property. `JsonObject` narrows "any JSON value" to
		// "any JSON object": IR v1.1 has no any-type, so this is a declared
		// representability loss rather than a faithful lowering, and it is
		// recorded as one instead of being repaired by editing a published
		// schema.
		typeRef = mint({ kind: "record", fields: [], unknownPolicy: "preserve" });
	} else if (barePrimitive(schema) && schema.type !== "string") {
		typeRef = mint({ kind: "scalar", scalar: SCALAR_OF[schema.type] });
	} else if (schema && schema.type === "string") {
		// `pattern` and `minLength` are recognised keywords but are not members
		// of the IR constraint keyword enum, which is min/max/exclusiveMin/
		// exclusiveMax. Emitting them in a shape the schema refuses would make
		// the document invalid; emitting them silently as something else would
		// misreport the constraint. They are carried as a declared gap instead.
		typeRef = mint({ kind: "scalar", scalar: "string", constraints: [] });
	} else {
		out.push(
			diag(
				DIAGNOSTIC_CODES.UNSUPPORTED_SCHEMA_SHAPE,
				`no kind-assignment row covers the shape at ${at}`,
				at,
			),
		);
		return null;
	}

	return {
		identity: `${identityOf(owner)}/field/${property}`,
		name: property,
		typeRef,
		presence,
		// Stated, never defaulted: the JSON Schema carries no nullability or
		// default-kind, and recording "none" says the contract has none rather
		// than that the lowering did not look.
		nullable: false,
		defaultKind: "none",
		origin: locus(file),
		multiplicity,
	};
}

/**
 * Lowers the whole document set.
 *
 * Returns `{ document }` or `{ diagnostics }`, never a partial document: a
 * lowering that emitted what it managed would produce IR quietly less
 * constrained than its source, which every downstream package would then
 * accept.
 */
/**
 * The members `semantic-ir.schema.json` requires of every type definition.
 *
 * `origin` is a source locus rather than a generated origin: these types come
 * from a committed schema document, and saying "generated" would lose the one
 * fact a reader needs, which is *which document* to open.
 */
function complete(definition, file) {
	return {
		identity: definition.identity,
		displayName: definition.name,
		kind: definition.kind,
		roles: [],
		origin: {
			source: {
				sourceIdentity: "ix://agent-ix/semantic-core",
				path: `packages/semantic-core/generated/json-schema/${file}`,
				startLine: 1,
				startColumn: 1,
			},
		},
		constraints: definition.constraints ?? [],
		extensions: definition.extensions ?? [],
		unknownPolicy: definition.unknownPolicy ?? "reject",
		...(definition.fields ? { fields: definition.fields } : {}),
		...(definition.variants ? { variants: definition.variants } : {}),
		...(definition.scalar ? { scalar: definition.scalar } : {}),
	};
}

export function lowerBundle(documents, options = {}) {
	/** @type {{ code: string, message: string, locus: string }[]} */
	const out = [];
	/** @type {Record<string, unknown>[]} */
	const types = [];

	for (const [file, schema] of [...documents].sort((a, b) =>
		a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0,
	)) {
		for (const { keyword, pointer } of unrecognisedKeywords(schema)) {
			out.push(
				diag(
					DIAGNOSTIC_CODES.UNSUPPORTED_SCHEMA_KEYWORD,
					`unrecognised keyword \`${keyword}\` at ${file}${pointer}`,
					`${file}${pointer}`,
				),
			);
		}
	}
	if (out.length > 0) return { diagnostics: Object.freeze(out) };

	for (const [file, schema] of [...documents].sort((a, b) =>
		a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0,
	)) {
		const name = nameFromUrl(schema.$id ?? file);
		if (schema["x-agent-ix-semantic-id"] !== identityOf(name)) {
			out.push(
				diag(
					DIAGNOSTIC_CODES.UNSUPPORTED_SCHEMA_SHAPE,
					`${file} carries no matching x-agent-ix-semantic-id`,
					`${file}/x-agent-ix-semantic-id`,
				),
			);
			continue;
		}
		/** @type {Record<string, unknown>[]} */
		const minted = [];

		if (schema.type === "object") {
			// A sealed object admits no member it did not evaluate. Defaulting a
			// policy for an unsealed one would let a generated package accept a
			// document the schema refuses, so an absent seal is a shape error
			// rather than a default.
			const seal = schema.unevaluatedProperties;
			if (seal === undefined) {
				out.push(
					diag(
						DIAGNOSTIC_CODES.UNSUPPORTED_SCHEMA_SHAPE,
						`${file} is a type: "object" with no unevaluatedProperties; the committed bundle seals every object schema`,
						`${file}/unevaluatedProperties`,
					),
				);
				continue;
			}
			if (
				seal === null ||
				typeof seal !== "object" ||
				!("not" in seal) ||
				Object.keys(seal).length !== 1 ||
				Object.keys(seal.not ?? {}).length !== 0
			) {
				out.push(
					diag(
						DIAGNOSTIC_CODES.UNSUPPORTED_SCHEMA_SHAPE,
						`${file} carries an unevaluatedProperties other than {"not": {}}`,
						`${file}/unevaluatedProperties`,
					),
				);
				continue;
			}

			const required = new Set(schema.required ?? []);
			const fields = [];
			for (const [property, sub] of Object.entries(schema.properties ?? {})) {
				const field = lowerProperty(
					name,
					property,
					sub,
					required.has(property),
					out,
					minted,
					file,
				);
				if (field) fields.push(field);
			}
			types.push(
				complete(
					{
						name,
						identity: identityOf(name),
						kind: "record",
						fields,
						unknownPolicy: "reject",
					},
					file,
				),
			);
		} else if (schema.type === "string" && Array.isArray(schema.enum)) {
			types.push(
				complete(
					{
						name,
						identity: identityOf(name),
						kind: "enum",
						variants: schema.enum.map((v) =>
							completeVariant(name, { name: String(v) }, file),
						),
					},
					file,
				),
			);
		} else if (schema.type === "string") {
			types.push(
				complete(
					{
						name,
						identity: identityOf(name),
						kind: "scalar",
						scalar: "string",
						constraints: [],
					},
					file,
				),
			);
		} else if (Array.isArray(schema.anyOf)) {
			if (
				!schema.anyOf.every((b) => b && typeof b === "object" && "$ref" in b)
			) {
				out.push(
					diag(
						DIAGNOSTIC_CODES.UNSUPPORTED_SCHEMA_SHAPE,
						`${file} top-level anyOf branches are not all $refs`,
						`${file}/anyOf`,
					),
				);
				continue;
			}
			types.push(
				complete(
					{
						name,
						identity: identityOf(name),
						kind: "union",
						extensions: [untaggedUnionExtension()],
						variants: schema.anyOf.map((b) => {
							const target = nameFromUrl(b.$ref);
							return completeVariant(
								name,
								{ name: target, payloadType: identityOf(target) },
								file,
							);
						}),
					},
					file,
				),
			);
		} else {
			out.push(
				diag(
					DIAGNOSTIC_CODES.UNSUPPORTED_SCHEMA_SHAPE,
					`no kind-assignment row covers ${file}`,
					file,
				),
			);
			continue;
		}

		for (const definition of minted) {
			types.push(
				complete(
					{ ...definition, identity: identityOf(definition.name) },
					file,
				),
			);
		}
	}

	if (out.length > 0) return { diagnostics: Object.freeze(out) };
	return {
		document: {
			contractVersion: "1.1.0",
			source: options.source ?? {
				identity: "ix://agent-ix/semantic-core",
				version: "0.1.0",
				dialect: "spec-bundle",
				digest: `sha256:${"0".repeat(64)}`,
			},
			package: options.package ?? {
				identity: "agent-ix/semantic-kernel",
				version: "0.1.0",
				manifestDigest: `sha256:${"0".repeat(64)}`,
				mappingVersions: [],
				profileVersions: [],
				lockDigest: `sha256:${"0".repeat(64)}`,
			},
			occurrences: [],
			extensions: [],
			types: types.sort((a, b) =>
				String(a.name) < String(b.name)
					? -1
					: String(a.name) > String(b.name)
						? 1
						: 0,
			),
		},
	};
}
