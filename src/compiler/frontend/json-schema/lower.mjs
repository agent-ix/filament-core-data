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
		Object.keys(schema).length === 1 &&
		typeof schema.type === "string" &&
		schema.type in SCALAR_OF
	);
}

function diag(entry, message, locus) {
	return { code: entry.code, message, locus };
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
function lowerProperty(owner, property, schema, isRequired, out, minted) {
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
			variants: allRefs
				? schema.anyOf.map((b) => {
						const target = nameFromUrl(b.$ref);
						return { name: target, payloadType: identityOf(target) };
					})
				: schema.anyOf.map((b) => ({ name: b.type })),
		});
	} else if (
		schema &&
		schema.type === "string" &&
		typeof schema.const === "string"
	) {
		typeRef = mint({ kind: "enum", variants: [{ name: schema.const }] });
	} else if (schema && schema.type === "string" && Array.isArray(schema.enum)) {
		typeRef = mint({
			kind: "enum",
			variants: schema.enum.map((v) => ({ name: String(v) })),
		});
	} else if (schema && schema.type === "integer") {
		const constraints = [];
		if (typeof schema.minimum === "number")
			constraints.push({ keyword: "min", operand: schema.minimum });
		if (typeof schema.maximum === "number")
			constraints.push({ keyword: "max", operand: schema.maximum });
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
				variants: items.anyOf.map((b) => ({ name: b.type })),
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
		const constraints = [];
		if (typeof schema.pattern === "string")
			constraints.push({ keyword: "pattern", operand: schema.pattern });
		if (typeof schema.minLength === "number")
			constraints.push({ keyword: "minLength", operand: schema.minLength });
		typeRef = mint({ kind: "scalar", scalar: "string", constraints });
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

	return { name: property, typeRef, multiplicity, presence };
}

/**
 * Lowers the whole document set.
 *
 * Returns `{ document }` or `{ diagnostics }`, never a partial document: a
 * lowering that emitted what it managed would produce IR quietly less
 * constrained than its source, which every downstream package would then
 * accept.
 */
export function lowerBundle(documents) {
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
				);
				if (field) fields.push(field);
			}
			types.push({
				name,
				identity: identityOf(name),
				kind: "record",
				fields,
				unknownPolicy: "reject",
			});
		} else if (schema.type === "string" && Array.isArray(schema.enum)) {
			types.push({
				name,
				identity: identityOf(name),
				kind: "enum",
				variants: schema.enum.map((v) => ({ name: String(v) })),
			});
		} else if (schema.type === "string") {
			const constraints = [];
			if (typeof schema.pattern === "string")
				constraints.push({ keyword: "pattern", operand: schema.pattern });
			if (typeof schema.minLength === "number")
				constraints.push({ keyword: "minLength", operand: schema.minLength });
			types.push({
				name,
				identity: identityOf(name),
				kind: "scalar",
				scalar: "string",
				constraints,
			});
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
			types.push({
				name,
				identity: identityOf(name),
				kind: "union",
				variants: schema.anyOf.map((b) => {
					const target = nameFromUrl(b.$ref);
					return { name: target, payloadType: identityOf(target) };
				}),
			});
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
			types.push({ ...definition, identity: identityOf(definition.name) });
		}
	}

	if (out.length > 0) return { diagnostics: Object.freeze(out) };
	return {
		document: {
			contractVersion: "1.1.0",
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
