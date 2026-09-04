/**
 * The TypeScript type projection (FR-064, Task-106).
 *
 * One declared rendering for each of the eight IR kinds and each of the nine
 * scalars, taken from the resolved model of `model.mjs` and never from the raw
 * document. The renderer is pure — same model in, same string out, no
 * filesystem, clock, environment or network — and it emits no file: text
 * placement belongs to FR-065.
 *
 * Two readings here are *declared backend decisions*, not settled contract, and
 * both are recorded against `agent-ix/filament-core-data#58`, which a sibling
 * ticket filed because the published record states no JSON wire form for a
 * discriminated union and none for the `bytes` kernel scalar:
 *
 * - a `union` renders as an internally tagged object whose tag property is the
 *   single exported `UNION_DISCRIMINANT` constant. Issue #21 recorded a
 *   different reading against the same gap — serde's external tagging — so the
 *   two backends currently disagree and only the contract's owner can reconcile
 *   them. Keeping the tag in one exported constant is what makes a ruling one
 *   edit.
 * - `bytes` renders as a `string` carrying standard base64 as RFC 4648 §4
 *   defines it, and the rendered declaration's JSDoc says so, because a
 *   consumer holding a `string` must not be left to guess between base64,
 *   base64url and hex — and because `minLength` and `maxLength` count a
 *   different number under each.
 *
 * The renderer never reads `src/compiler/backends/typescript.mjs` or
 * `type-names.mjs`. Those consume the frozen FR-041 prototype IR, which is a
 * different document shape, and their textual-substitution mechanism over
 * rendered type names is exactly what FR-042-CON-5 records as fragile.
 */

import { UNION_DISCRIMINANT, UNKNOWN_POLICY_MARKER } from "./names.mjs";

/** The `doc` extension whose text becomes a JSDoc comment. */
const DOC_EXTENSION = "ix://agent-ix/semantic-core/ext/doc";

/** The TypeScript primitive each of the nine kernel scalars renders to. */
const SCALAR_PRIMITIVES = Object.freeze({
	boolean: "boolean",
	integer: "number",
	number: "number",
	string: "string",
	bytes: "string",
	date: "string",
	datetime: "string",
	duration: "string",
	uuid: "string",
});

/** The extra JSDoc line a scalar earns where its string form needs stating. */
const SCALAR_NOTES = Object.freeze({
	bytes:
		"Base64 as RFC 4648 §4 defines it. A declared decision of this backend, not settled contract: agent-ix/filament-core-data#58 records that the published record states no wire form for the `bytes` kernel scalar.",
	date: "An RFC 3339 full-date.",
	datetime: "An RFC 3339 date-time.",
	duration: "An ISO 8601 duration.",
	uuid: "A UUID in its canonical hyphenated form.",
});

/** A property name TypeScript accepts bare, or the same name quoted. */
function propertyName(name) {
	const text = String(name);
	return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(text) ? text : JSON.stringify(text);
}

/** The `text` of a node's `doc` extension, or `undefined`. */
function docTextOf(node) {
	for (const extension of node?.extensions ?? []) {
		if (extension?.identity !== DOC_EXTENSION) continue;
		const text = extension?.payload?.text;
		if (typeof text === "string" && text.length > 0) return text;
	}
	return undefined;
}

/**
 * A JSDoc block at `indent`, or the empty string.
 *
 * `*​/` inside authored documentation would close the comment early, so it is
 * broken. The word `any` may legitimately appear in this text — FR-064-AC-17
 * measures its prohibition over parsed source rather than over comment text for
 * exactly that reason.
 */
function jsdoc(lines, indent) {
	const present = lines.filter(
		(line) => typeof line === "string" && line.length > 0,
	);
	if (present.length === 0) return "";
	const body = present
		.flatMap((line) => line.split("\n"))
		.map((line) => `${indent} * ${line.replaceAll("*/", "*\\/")}`.trimEnd());
	return [`${indent}/**`, ...body, `${indent} */`, ""].join("\n");
}

/**
 * The TypeScript type expression for a resolved element summary.
 *
 * An element the document does not declare renders `never` rather than `any` or
 * `unknown`: FR-068 refuses such a document before generation, so this branch is
 * unreachable for an admitted model, and where it is reached it must be loud
 * rather than permissive.
 */
function elementType(element) {
	if (element === undefined || element.declared !== true) return "never";
	return element.identifier ?? "never";
}

/**
 * The property type of a field, from the three axes the model already decided.
 *
 * The two axes compose in one stated order: the array is an array of the
 * *element* type, and `| null` applies to the *property*, because the IR carries
 * one `nullable` boolean for the field and its multiplicity bounds describe the
 * field's cardinality. So a nullable collection is `readonly T[] | null` and
 * never `readonly (T | null)[]`; a nullable element would need a nullability
 * member the IR does not carry.
 */
function fieldType(field) {
	const base = elementType(field.element);
	const collected = field.collection ? `readonly ${base}[]` : base;
	return field.nullable ? `${collected} | null` : collected;
}

function renderScalar(entry) {
	const primitive = SCALAR_PRIMITIVES[entry.scalar];
	const note = SCALAR_NOTES[entry.scalar];
	return [
		jsdoc([docTextOf(entry), note], ""),
		`export type ${entry.identifier} = ${primitive ?? "never"};`,
	].join("");
}

function renderAlias(entry) {
	return [
		jsdoc([docTextOf(entry)], ""),
		`export type ${entry.identifier} = ${elementType(entry.targetEntry)};`,
	].join("");
}

function renderEnum(entry) {
	const members = entry.variants.map((variant) => JSON.stringify(variant.name));
	const body = members.length > 0 ? members.join(" | ") : "never";
	return [
		jsdoc([docTextOf(entry)], ""),
		`export type ${entry.identifier} = ${body};`,
	].join("");
}

function renderUnion(entry) {
	const members = entry.variants.map((variant) => {
		const tag = `readonly ${UNION_DISCRIMINANT}: ${JSON.stringify(variant.name)}`;
		return variant.payload === undefined
			? `\t| { ${tag} }`
			: `\t| { ${tag}; readonly value: ${elementType(variant.payload)} }`;
	});
	const body = members.length > 0 ? `\n${members.join("\n")}` : " never";
	return [
		jsdoc([docTextOf(entry)], ""),
		`export type ${entry.identifier} =${body};`,
	].join("");
}

/**
 * A `reference` renders as an opaque branded string, so that a reference is not
 * silently interchangeable with a plain `string`.
 *
 * The brand is a `unique symbol` and the constructor narrows through a type
 * predicate rather than through a type assertion, because FR-066 forbids a type
 * assertion anywhere in generated source and a brand is otherwise the one
 * construct that would need one.
 */
function renderReference(entry) {
	const name = entry.identifier;
	const target = entry.target ?? "";
	return [
		jsdoc(
			[
				docTextOf(entry),
				`An opaque reference to \`${target}\`. Construct one with \`${name}Of\`; a plain string is not assignable.`,
			],
			"",
		),
		`declare const ${name}Brand: unique symbol;\n`,
		`export type ${name} = string & { readonly [${name}Brand]: never };\n`,
		`function ${name}Is(value: string): value is ${name} {\n`,
		'\treturn typeof value === "string";\n',
		"}\n",
		`export function ${name}Of(value: string): ${name} {\n`,
		`\tif (${name}Is(value)) return value;\n`,
		`\tthrow new Error("unreachable: every string brands as ${name}");\n`,
		"}",
	].join("");
}

function renderSequence(entry) {
	return [
		jsdoc([docTextOf(entry)], ""),
		`export type ${entry.identifier} = readonly ${elementType(entry.itemsEntry)}[];`,
	].join("");
}

function renderMap(entry) {
	return [
		jsdoc([docTextOf(entry)], ""),
		`export type ${entry.identifier} = {\n`,
		`\treadonly [key: string]: ${elementType(entry.valuesEntry)};\n`,
		"};",
	].join("");
}

/**
 * A `record` renders as an interface with **no** `extends` clause: the contract
 * IR carries no base member, and inheritance existed only in the frozen FR-041
 * prototype IR.
 *
 * `unknownPolicy` is meaningful only here. `preserve` and `surface` each add an
 * index signature admitting unknown members plus a generated marker naming
 * which policy asked for it, so the two forms are distinguishable; `reject`
 * renders closed with no index signature. On the other seven kinds the policy
 * has no rendering effect at all — `conformance/bases/core-1-1.json` carries a
 * `union` declaring `surface` and a `map` declaring `preserve`, so that is a
 * live case rather than a precaution — and FR-067 carries every policy into the
 * generated metadata so that one with no rendering effect is still declared.
 */
function renderRecord(entry) {
	const open =
		entry.unknownPolicy === "preserve" || entry.unknownPolicy === "surface";
	const members = [];
	if (open) {
		members.push(
			jsdoc(
				[
					`Unknown members are admitted: this record declares \`unknownPolicy: "${entry.unknownPolicy}"\`.`,
				],
				"\t",
			),
			`\treadonly ${UNKNOWN_POLICY_MARKER}?: ${JSON.stringify(entry.unknownPolicy)};\n`,
		);
	}
	for (const field of entry.fields ?? []) {
		const notes = [docTextOf(field)];
		if (typeof field.unit === "string") notes.push(`Unit: ${field.unit}.`);
		if (field.defaultKind && field.defaultKind !== "none") {
			notes.push(
				`Default (${field.defaultKind}): ${JSON.stringify(field.defaultValue ?? null)}.`,
			);
		}
		members.push(
			jsdoc(notes, "\t"),
			`\treadonly ${propertyName(field.name)}${field.optional ? "?" : ""}: ${fieldType(field)};\n`,
		);
	}
	if (open) members.push("\treadonly [key: string]: unknown;\n");
	const body = members.join("");
	return [
		jsdoc([docTextOf(entry)], ""),
		body.length === 0
			? `export interface ${entry.identifier} {}`
			: `export interface ${entry.identifier} {\n${body}}`,
	].join("");
}

/** Exhaustive over the eight kinds; an unhandled kind is a contract failure. */
const RENDERERS = Object.freeze({
	scalar: renderScalar,
	record: renderRecord,
	enum: renderEnum,
	union: renderUnion,
	alias: renderAlias,
	sequence: renderSequence,
	map: renderMap,
	reference: renderReference,
});

/** The kinds this renderer handles, as data, so a test counts them. */
export const RENDERED_KINDS = Object.freeze(Object.keys(RENDERERS).sort());

/**
 * The body of the generated `types.ts` module.
 *
 * Declarations come out in code-point order of `identity`, which the model
 * already applied: declaration order is not recoverable from an IR document, so
 * input array order must not reach the output. A cycle among `typeRef`,
 * `target`, `items`, `values` and `payloadType` needs nothing special — every
 * declaration references others by minted name, so a cycle renders as ordinary
 * mutually recursive TypeScript and the renderer never walks the graph.
 */
export function renderTypes(model) {
	const blocks = [
		[
			jsdoc(
				[
					"The property that discriminates every generated union.",
					"Exported as one constant so that a `switch` over it narrows the default arm to `never`, and so that a ruling on agent-ix/filament-core-data#58 — which records that the published contract states no JSON wire form for a discriminated union — moves one declaration rather than every union.",
				],
				"",
			),
			`export const ${"UNION_DISCRIMINANT"} = ${JSON.stringify(UNION_DISCRIMINANT)};`,
		].join(""),
	];
	for (const entry of model.types ?? []) {
		const render = RENDERERS[entry.kind];
		if (render === undefined) {
			throw new TypeError(
				`no rendering is declared for kind ${JSON.stringify(entry.kind)} on ${entry.identity}`,
			);
		}
		blocks.push(render(entry));
	}
	return `${blocks.join("\n\n")}\n`;
}
