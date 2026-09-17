/**
 * The generated `identity.ts` and `provenance.ts` (FR-067, FR-137, Task-109).
 *
 * This source module keeps the name it was written under; the *generated*
 * artifacts do not. Under ADR-0007 `identity` and `provenance` are two concepts
 * with two names in every target, and `metadata` is retired as a name for
 * either — it meant semantic identity in the generated Rust crate and
 * provenance in the generated TypeScript package, which is the one difference
 * in the emitted set that no language property explains.
 *
 * A generated TypeScript type expresses structure and nothing else, so every
 * other contract datum the IR document carries reaches the consumer here:
 * identities, roles, unknown policies, units, relationship descriptors,
 * extensions at all three levels, occurrences, and the provenance of the
 * document itself. Nothing in the document is dropped. That is not a
 * precaution — `conformance/bases/core-1-1.json` and `package-1-1.json` each
 * carry an occurrence, a document-level extension and a field declaring
 * `unit: "ms"`, and the committed `typescript` target contract sets
 * `unsupportedFeaturePolicy: "fail"`, so a silent drop is not available.
 *
 * This module is the sole owner of the relationship descriptor. A relationship
 * carries no name and is not part of a record's serialized shape, so `types.mjs`
 * renders none; two descriptors of one relationship in two modules would be two
 * answers to one question.
 *
 * What the metadata may not carry is stated as a list rather than as a
 * principle, so a test can look for each by name: no wall-clock value, no
 * generation timestamp, no build date, no hostname, no machine identifier, no
 * user name, no user id, no home directory, no working directory, no absolute
 * path, no tool path, no interpreter path, and no environment variable value.
 * Each is a determinism leak this repository has shipped before. An
 * `occurrence`'s `observedAt` is the one timestamp that appears, and it is
 * copied verbatim from the document: it is contract data the author wrote, not
 * a clock this backend read.
 */

import { fingerprintIrForTarget } from "./canonical.mjs";

/** The `as const` a generated data module needs, exempted by FR-066 by name. */
const AS_CONST = " as const";

/** A JSON string literal, which is also a valid TypeScript string literal. */
function literal(value) {
	return JSON.stringify(value);
}

/** A property name TypeScript accepts bare, or the same name quoted. */
function propertyName(name) {
	const text = String(name);
	return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(text) ? text : JSON.stringify(text);
}

/** Code-unit ordering. Never `localeCompare`, which reads the host's collator. */
function byKey(left, right) {
	if (left[0] === right[0]) return 0;
	return left[0] < right[0] ? -1 : 1;
}

/**
 * A JSON value rendered as a TypeScript expression, with object keys ordered by
 * code unit so the emitted bytes do not depend on the document's key order.
 */
function value(node, indent = "\t") {
	if (node === null || typeof node !== "object") return literal(node ?? null);
	if (Array.isArray(node)) {
		if (node.length === 0) return "[]";
		const members = node.map(
			(member) => `${indent}\t${value(member, `${indent}\t`)},`,
		);
		return ["[", ...members, `${indent}]`].join("\n");
	}
	const keys = Object.keys(node).sort();
	if (keys.length === 0) return "{}";
	const members = keys.map(
		(key) =>
			`${indent}\t${propertyName(key)}: ${value(node[key], `${indent}\t`)},`,
	);
	return ["{", ...members, `${indent}}`].join("\n");
}

/** One extension, as the descriptor shape the generated package declares. */
function extensionDescriptor(extension, indent) {
	const members = [
		`${indent}\tidentity: ${literal(extension.identity ?? "")},`,
		`${indent}\tversion: ${literal(extension.version ?? "")},`,
		`${indent}\trequired: ${extension.required === true},`,
	];
	if (typeof extension.capability === "string") {
		members.push(`${indent}\tcapability: ${literal(extension.capability)},`);
	}
	members.push(
		`${indent}\tpayload: ${value(extension.payload ?? null, `${indent}\t`)},`,
	);
	return ["{", ...members, `${indent}}`].join("\n");
}

/** A list of extension descriptors, or `[]`. */
function extensionList(extensions, indent) {
	const present = [...(extensions ?? [])];
	if (present.length === 0) return "[]";
	const members = present.map(
		(extension) =>
			`${indent}\t${extensionDescriptor(extension, `${indent}\t`)},`,
	);
	return ["[", ...members, `${indent}]`].join("\n");
}

/** One relationship, as the descriptor shape this module alone declares. */
function relationshipDescriptor(relationship, indent) {
	const multiplicity = relationship.multiplicity ?? {};
	const upper =
		typeof multiplicity.upper === "number"
			? String(multiplicity.upper)
			: "null";
	return [
		"{",
		`${indent}\tidentity: ${literal(relationship.identity ?? "")},`,
		`${indent}\tverb: ${literal(relationship.verb ?? "")},`,
		`${indent}\tcategory: ${literal(relationship.category ?? "")},`,
		`${indent}\tcomposite: ${relationship.composite === true},`,
		`${indent}\ttarget: ${literal(relationship.target ?? "")},`,
		`${indent}\tlower: ${typeof multiplicity.lower === "number" ? multiplicity.lower : 0},`,
		`${indent}\tupper: ${upper},`,
		`${indent}}`,
	].join("\n");
}

/** One operation parameter, or an operation's return, as a field descriptor. */
function fieldDescriptor(field, indent) {
	const multiplicity = field.multiplicity ?? {};
	const upper =
		typeof multiplicity.upper === "number"
			? String(multiplicity.upper)
			: "null";
	return [
		"{",
		`${indent}\tidentity: ${literal(field.identity ?? "")},`,
		`${indent}\tname: ${literal(field.name ?? "")},`,
		`${indent}\ttypeRef: ${literal(field.typeRef ?? "")},`,
		`${indent}\toptional: ${field.optional === true},`,
		`${indent}\tnullable: ${field.nullable === true},`,
		`${indent}\tcollection: ${field.collection === true},`,
		`${indent}\tlower: ${typeof multiplicity.lower === "number" ? multiplicity.lower : 0},`,
		`${indent}\tupper: ${upper},`,
		`${indent}}`,
	].join("\n");
}

/**
 * One operation, as readonly data.
 *
 * No executable function is generated for an operation: the generated surface
 * is data, and an operation is contract data a consumer may dispatch on rather
 * than behaviour this target implements.
 */
function operationDescriptor(operation, indent) {
	const params = [...(operation.params ?? [])];
	const renderedParams =
		params.length === 0
			? "[]"
			: [
					"[",
					...params.map(
						(param) =>
							`${indent}\t\t${fieldDescriptor(param, `${indent}\t\t`)},`,
					),
					`${indent}\t]`,
				].join("\n");
	const returns = operation.returns;
	const returnsMultiplicity = returns?.multiplicity ?? {};
	const renderedReturns =
		returns === undefined
			? "null"
			: [
					"{",
					`${indent}\t\ttypeRef: ${literal(returns.typeRef ?? "")},`,
					`${indent}\t\tnullable: ${returns.nullable === true},`,
					`${indent}\t\tlower: ${typeof returnsMultiplicity.lower === "number" ? returnsMultiplicity.lower : 0},`,
					`${indent}\t\tupper: ${typeof returnsMultiplicity.upper === "number" ? String(returnsMultiplicity.upper) : "null"},`,
					`${indent}\t}`,
				].join("\n");
	return [
		"{",
		`${indent}\tidentity: ${literal(operation.identity ?? "")},`,
		`${indent}\tname: ${literal(operation.name ?? "")},`,
		`${indent}\tparams: ${renderedParams},`,
		`${indent}\treturns: ${renderedReturns},`,
		`${indent}\tpre: ${(operation.pre ?? []).length === 0 ? "[]" : `[${(operation.pre ?? []).map((entry) => literal(entry)).join(", ")}]`},`,
		`${indent}\tpost: ${(operation.post ?? []).length === 0 ? "[]" : `[${(operation.post ?? []).map((entry) => literal(entry)).join(", ")}]`},`,
		`${indent}}`,
	].join("\n");
}

/**
 * One clause, as readonly data, with its text carried opaquely.
 *
 * The text is never parsed here. `agent-ix/quire-contract-ir#52` owns clause
 * semantics and the IR itself carries the text without parsing it, so a backend
 * that started interpreting it would be answering a question no contract has
 * asked it.
 */
function clauseDescriptor(clause, indent) {
	const span = clause.sourceSpan;
	const renderedSpan =
		span === undefined || span === null
			? "null"
			: [
					"{",
					`${indent}\t\tpath: ${literal(span.path ?? "")},`,
					`${indent}\t\tstartLine: ${typeof span.startLine === "number" ? span.startLine : 0},`,
					`${indent}\t\tstartColumn: ${typeof span.startColumn === "number" ? span.startColumn : 0},`,
					`${indent}\t}`,
				].join("\n");
	return [
		"{",
		`${indent}\tidentity: ${literal(clause.identity ?? "")},`,
		`${indent}\tlanguage: ${literal(clause.language ?? "")},`,
		`${indent}\tclauseId: ${literal(clause.clauseId ?? "")},`,
		`${indent}\ttext: ${literal(clause.text ?? "")},`,
		`${indent}\tsourceSpan: ${renderedSpan},`,
		`${indent}}`,
	].join("\n");
}

/** One enum or union member, including the identity ordinary TypeScript omits. */
function variantDescriptor(variant, indent) {
	return [
		"{",
		`${indent}\tidentity: ${literal(variant.identity ?? "")},`,
		`${indent}\tname: ${literal(variant.name ?? "")},`,
		`${indent}\tpayloadType: ${literal(variant.payloadType ?? "")},`,
		`${indent}}`,
	].join("\n");
}

/** One constraint's identity and contract operands, preserved as readonly data. */
function constraintDescriptor(constraint, indent) {
	return [
		"{",
		`${indent}\tidentity: ${literal(constraint.identity ?? "")},`,
		`${indent}\tkeyword: ${literal(constraint.keyword ?? "")},`,
		`${indent}\tappliesTo: ${literal(constraint.appliesTo ?? "")},`,
		`${indent}\tdiagnosticCode: ${literal(constraint.diagnosticCode ?? "")},`,
		`${indent}\toperands: ${value(constraint.operands ?? null, `${indent}\t`)},`,
		`${indent}}`,
	].join("\n");
}

/** A list of descriptors rendered by `render`, or `[]`. */
function descriptorList(entries, render, indent) {
	const present = [...(entries ?? [])];
	if (present.length === 0) return "[]";
	const members = present.map(
		(entry) => `${indent}\t${render(entry, `${indent}\t`)},`,
	);
	return ["[", ...members, `${indent}]`].join("\n");
}

/** The `<Type>.<field>` key a field-level map is keyed by. */
function fieldKey(entry, field) {
	return `${entry.identifier}.${field.name}`;
}

/** A `Record` literal, ordered by key, or `{}`. */
function recordLiteral(pairs, sorted = true) {
	if (pairs.length === 0) return "{}";
	const ordered = sorted ? [...pairs].sort(byKey) : [...pairs];
	const members = ordered.map(([key, rendered]) => {
		const single = `\t${propertyName(key)}: ${rendered},`;
		if (single.length <= LINE_WIDTH || rendered.includes("\n")) return single;
		return `\t${propertyName(key)}:\n\t\t${rendered},`;
	});
	return ["{", ...members, "}"].join("\n");
}

/**
 * The pinned formatter's line width, in columns, with a leading tab counted as
 * one. Measured against the binary rather than assumed, so a line the generator
 * emits already broken is a line the formatter does not have to move.
 */
const LINE_WIDTH = 79;

/**
 * A union of string literals, with the leading space the one-line form needs
 * and the leading newline the broken form needs, so no trailing space is left
 * behind on a line the generator breaks itself.
 */
function unionSuffix(names, prefix) {
	const sorted = [...names].sort();
	if (sorted.length === 0) return " never";
	const members = sorted.map((name) => literal(name));
	const single = members.join(" | ");
	if (prefix.length + single.length <= LINE_WIDTH) return ` ${single}`;
	return `\n\t| ${members.join("\n\t| ")}`;
}

/**
 * The `as const satisfies Record<…>` tail that follows a record literal's own
 * closing brace, broken across lines only where the one-line form would exceed
 * the formatter's width.
 */
/**
 * A list declaration, with the value moved to the next line where the one-line
 * form would exceed the width and the moved form would not.
 */
function listDeclaration(name, literalText, typeText) {
	const head = `export const ${name} = `;
	const tail = `${AS_CONST} satisfies ${typeText};`;
	const single = `${head}${literalText}${tail}`;
	if (literalText.includes("\n") || single.length <= LINE_WIDTH) return single;
	const moved = `\t${literalText}${tail}`;
	if (moved.length <= LINE_WIDTH) return `${head.trimEnd()}\n${moved}`;
	return single;
}

function mapDeclaration(name, literalText, typeText) {
	// An empty record renders `{}`, so the whole declaration sits on one line and
	// the width is measured against that line rather than against a closing brace
	// in the first column.
	const head = `export const ${name} = `;
	const lastLine = literalText.includes("\n")
		? literalText.slice(literalText.lastIndexOf("\n") + 1)
		: `${head}${literalText}`;
	const tail = ` as const satisfies ${typeText};`;
	if (lastLine.length + tail.length <= LINE_WIDTH) {
		return `${head}${literalText}${tail}`;
	}
	// The two type shapes this module emits, broken the way the pinned formatter
	// breaks them: a `Record` splits at its two arguments, and a wrapper around
	// one splits at the wrapper.
	const record = /^Record<([^,]+), (.+)>$/.exec(typeText);
	const wrapped = /^([A-Za-z]+)<(Record<.+>)>$/.exec(typeText);
	let broken = tail;
	if (record !== null) {
		broken = ` as const satisfies Record<\n\t${record[1]},\n\t${record[2]}\n>;`;
	} else if (wrapped !== null) {
		broken = ` as const satisfies ${wrapped[1]}<\n\t${wrapped[2]}\n>;`;
	}
	return `${head}${literalText}${broken}`;
}

/**
 * The banner every emitted file carries.
 *
 * It names the backend identity, the backend version and the IR fingerprint,
 * and no clock value — a banner carrying a generation time is the reason two
 * byte-identical generations would stop being byte-identical.
 *
 * It is exported rather than inlined by each renderer so that one module
 * decides the banner for all eight files; the caller prepends it.
 */
export function bannerFor(model, fingerprint) {
	return [
		"/**",
		" * Generated by the Agent IX semantic TypeScript backend. Do not edit.",
		" *",
		` * Backend: ${model.backend.identity}@${model.backend.version}`,
		` * Contract: ${model.contractVersion}`,
		` * IR fingerprint: ${fingerprint}`,
		" */",
		"",
	].join("\n");
}

/** The fingerprint a caller supplied, or the one its document implies. */
function fingerprintFrom(options) {
	if (typeof options.fingerprint === "string") return options.fingerprint;
	if (options.ir !== undefined) return fingerprintIrForTarget(options.ir);
	throw new TypeError(
		"renderProvenance needs options.fingerprint or options.ir: the fingerprint is taken over the normalized document, which the resolved model does not carry",
	);
}

/**
 * The generated `identity.ts`.
 *
 * The identity maps are typed `Record<ExportedTypeName, …>` through `satisfies`,
 * so a missing entry and an entry for an unexported name each fail
 * `tsc --noEmit` rather than producing a partial map at run time. `satisfies` is
 * not a type assertion: it checks the literal against the type and keeps the
 * literal's own narrower type, which is exactly what an exhaustive readonly map
 * needs.
 */
export function renderIdentity(model) {
	const types = model.types ?? [];
	const typeNames = types.map((entry) => entry.identifier);
	const fieldKeys = [];
	const fieldIdentity = [];
	const fieldExtensions = [];
	const fieldUnits = [];
	for (const entry of types) {
		for (const field of entry.fields ?? []) {
			const key = fieldKey(entry, field);
			fieldKeys.push(key);
			fieldIdentity.push([key, literal(field.identity)]);
			fieldExtensions.push([key, extensionList(field.extensions, "\t")]);
			if (typeof field.unit === "string") {
				fieldUnits.push([key, literal(field.unit)]);
			}
		}
	}

	const typeIdentity = types.map((entry) => [
		entry.identifier,
		literal(entry.identity),
	]);
	const typeRoles = types.map((entry) => [
		entry.identifier,
		entry.roles.length === 0
			? "[]"
			: `[${entry.roles.map((role) => literal(role)).join(", ")}]`,
	]);
	const typePolicy = types.map((entry) => [
		entry.identifier,
		literal(entry.unknownPolicy),
	]);
	const typeKind = types.map((entry) => [
		entry.identifier,
		literal(entry.kind),
	]);
	const typeIdentityFields = types
		.filter((entry) => Array.isArray(entry.identityFields))
		.map((entry) => [
			entry.identifier,
			`[${entry.identityFields.map((name) => literal(name)).join(", ")}]`,
		]);
	const typeExtensions = types.map((entry) => [
		entry.identifier,
		extensionList(entry.extensions, "\t"),
	]);
	const typeRelationships = types.map((entry) => {
		const declared = [...(entry.relationships ?? [])];
		const rendered =
			declared.length === 0
				? "[]"
				: [
						"[",
						...declared.map(
							(relationship) =>
								`\t\t${relationshipDescriptor(relationship, "\t\t")},`,
						),
						"\t]",
					].join("\n");
		return [entry.identifier, rendered];
	});

	return `/**
 * The semantic identity of everything this package renders, and the contract
 * data a TypeScript type cannot carry: roles, unknown policies, units,
 * relationship descriptors, and extensions at type and field level.
 *
 * Identities are copied from the semantic document verbatim. They are never
 * minted, shortened or re-cased here: an identity that moves when a display
 * name changes is exactly the defect \`conformance/defects.json\` records as
 * DEF-PROTO-008, and the generated identifier moving while the identity does not
 * is what makes such a rename visible.
 *
 * This module imports nothing, so a consumer reading identity data reaches no
 * validator.
 */

/** One extension the document declares, at any of its three levels. */
export interface ExtensionDescriptor {
	readonly identity: string;
	readonly version: string;
	readonly required: boolean;
	readonly capability?: string;
	readonly payload: unknown;
}

/** One relationship a record declares. Rendered here and nowhere else. */
export interface RelationshipDescriptor {
	readonly identity: string;
	readonly verb: string;
	readonly category: string;
	readonly composite: boolean;
	readonly target: string;
	readonly lower: number;
	/** \`null\` where the document declares no upper bound. */
	readonly upper: number | null;
}

/** One operation parameter, or an operation's return. */
export interface FieldDescriptor {
	readonly identity: string;
	readonly name: string;
	readonly typeRef: string;
	readonly optional: boolean;
	readonly nullable: boolean;
	readonly collection: boolean;
	readonly lower: number;
	readonly upper: number | null;
}

/**
 * One operation a record declares, as data.
 *
 * No executable function is generated for it: the generated surface is data,
 * and an operation is contract data a consumer may dispatch on.
 */
export interface OperationDescriptor {
	readonly identity: string;
	readonly name: string;
	readonly params: readonly FieldDescriptor[];
	readonly returns: {
		readonly typeRef: string;
		readonly nullable: boolean;
		readonly lower: number;
		readonly upper: number | null;
	} | null;
	readonly pre: readonly string[];
	readonly post: readonly string[];
}

/**
 * One clause a type declares, with its text carried opaquely.
 *
 * The text is not parsed. \`agent-ix/quire-contract-ir#52\` owns clause
 * semantics, and the IR carries the text without parsing it.
 */
export interface ClauseDescriptor {
	readonly identity: string;
	readonly language: string;
	readonly clauseId: string;
	readonly text: string;
	readonly sourceSpan: {
		readonly path: string;
		readonly startLine: number;
		readonly startColumn: number;
	} | null;
}

/** One enum or union member, including its semantic identity. */
export interface VariantDescriptor {
	readonly identity: string;
	readonly name: string;
	readonly payloadType: string;
}

/** One constraint's semantic identity and operands. */
export interface ConstraintDescriptor {
	readonly identity: string;
	readonly keyword: string;
	readonly appliesTo: string;
	readonly diagnosticCode: string;
	readonly operands: unknown;
}

/**
 * One field's declared default.
 *
 * The kind is carried for every field. The value is carried wherever the kind
 * is not \`none\`, including for a \`representation\` or a \`migration\` default that
 * the generated validator deliberately does not apply.
 */
export interface DefaultDescriptor {
	readonly kind: string;
	readonly value: unknown;
}

/** One observed value the document carries. */
export interface OccurrenceDescriptor {
	readonly identity: string;
	readonly definition: string;
	/** Copied verbatim from the document; not a clock this backend read. */
	readonly observedAt: string;
	readonly value: unknown;
}

/** Every type name this package exports. */
export type ExportedTypeName =${unionSuffix(typeNames, "export type ExportedTypeName = ")};

/** Every \`<Type>.<field>\` key this package exports a field identity for. */
export type ExportedFieldKey =${unionSuffix(fieldKeys, "export type ExportedFieldKey = ")};

/** The semantic identity of each exported type. */
${mapDeclaration("TYPE_IDENTITY", recordLiteral(typeIdentity), "Record<ExportedTypeName, string>")}

/** The structural kind each exported type was lowered from. */
${mapDeclaration("TYPE_KIND", recordLiteral(typeKind), "Record<ExportedTypeName, string>")}

/** The namespaced roles each exported type declares, in document order. */
${mapDeclaration("TYPE_ROLES", recordLiteral(typeRoles), "Record<ExportedTypeName, readonly string[]>")}

/**
 * The unknown-member policy each exported type declares.
 *
 * It is carried for all eight kinds, including the seven on which it has no
 * validation effect, because it is contract data the document states and this
 * package declares nothing dropped.
 */
${mapDeclaration("TYPE_UNKNOWN_POLICY", recordLiteral(typePolicy), "Record<ExportedTypeName, string>")}

/**
 * The names of the fields that tell an entity's instances apart, in declared
 * order. A type that is not an entity has no entry.
 */
${mapDeclaration("TYPE_IDENTITY_FIELDS", recordLiteral(typeIdentityFields), "Partial<Record<ExportedTypeName, readonly string[]>>")}

/** The extensions each exported type declares. */
${mapDeclaration("TYPE_EXTENSIONS", recordLiteral(typeExtensions), "Record<ExportedTypeName, readonly ExtensionDescriptor[]>")}

/** The relationships each exported type declares; empty where it declares none. */
${mapDeclaration("TYPE_RELATIONSHIPS", recordLiteral(typeRelationships), "Record<ExportedTypeName, readonly RelationshipDescriptor[]>")}

/** The semantic identity of each exported field. */
${mapDeclaration("FIELD_IDENTITY", recordLiteral(fieldIdentity), "Record<ExportedFieldKey, string>")}

/** The extensions each exported field declares. */
${mapDeclaration("FIELD_EXTENSIONS", recordLiteral(fieldExtensions), "Record<ExportedFieldKey, readonly ExtensionDescriptor[]>")}

/** The unit each declaring field carries. A field declaring none has no entry. */
${mapDeclaration("FIELD_UNIT", recordLiteral(fieldUnits), "Partial<Record<ExportedFieldKey, string>>")}
${contractData(model)}
`;
}

/**
 * The document-level and per-type contract data, appended to `identity.ts`.
 *
 * These declarations were emitted in a module named `metadata.ts` until FR-137.
 * They are not provenance — they are contract the document states — so under
 * ADR-0007 they belong beside the semantic identity they qualify, and the name
 * `metadata` is retired rather than re-pointed at one of the two concepts it
 * used to mean. Kept as its own function only because `renderIdentity` is
 * already long; the text it returns is part of that one module.
 */
function contractData(model) {
	const occurrences = [...(model.occurrences ?? [])];
	const renderedOccurrences =
		occurrences.length === 0
			? "[]"
			: [
					"[",
					...occurrences.map((occurrence) =>
						[
							"\t{",
							`\t\tidentity: ${literal(occurrence.identity ?? "")},`,
							`\t\tdefinition: ${literal(occurrence.definition ?? "")},`,
							`\t\tobservedAt: ${literal(occurrence.observedAt ?? "")},`,
							`\t\tvalue: ${value(occurrence.value ?? null, "\t\t")},`,
							"\t},",
						].join("\n"),
					),
					"]",
				].join("\n");

	const types = model.types ?? [];
	const operations = types.map((entry) => [
		entry.identifier,
		descriptorList(entry.operations, operationDescriptor, "\t"),
	]);
	const clauses = types.map((entry) => [
		entry.identifier,
		descriptorList(entry.clauses, clauseDescriptor, "\t"),
	]);
	const variants = types.map((entry) => [
		entry.identifier,
		descriptorList(entry.variants, variantDescriptor, "\t"),
	]);
	const constraints = types.map((entry) => [
		entry.identifier,
		descriptorList(entry.constraints, constraintDescriptor, "\t"),
	]);
	const defaults = [];
	for (const entry of types) {
		for (const field of entry.fields ?? []) {
			const kind = field.defaultKind ?? "none";
			const rendered =
				kind === "none"
					? `{ kind: ${literal(kind)}, value: null }`
					: `{ kind: ${literal(kind)}, value: ${value(field.defaultValue ?? null, "\t")} }`;
			defaults.push([fieldKey(entry, field), rendered]);
		}
	}

	return `
/** The extensions the document declares at its top level. */
${listDeclaration("DOCUMENT_EXTENSIONS", extensionList(model.extensions, ""), "readonly ExtensionDescriptor[]")}

/** The occurrences the document carries; empty where it carries none. */
${listDeclaration("OCCURRENCES", renderedOccurrences, "readonly OccurrenceDescriptor[]")}

/**
 * The operations each type declares, as data.
 *
 * No executable function is generated for an operation. The generated surface
 * is data, and rendering an operation as a readonly descriptor is not the
 * degradation \`contracts-v1.md\` prohibits — that is a fall back to \`any\`, a
 * generic map, or an empty model, and this is none of those.
 */
${mapDeclaration("TYPE_OPERATIONS", recordLiteral(operations), "Record<ExportedTypeName, readonly OperationDescriptor[]>")}

/**
 * The clauses each type declares, with their text carried opaquely.
 *
 * The text is never parsed here: \`agent-ix/quire-contract-ir#52\` owns clause
 * semantics and the IR itself carries the text without parsing it.
 */
${mapDeclaration("TYPE_CLAUSES", recordLiteral(clauses), "Record<ExportedTypeName, readonly ClauseDescriptor[]>")}

/** The enum and union members, including their semantic identities. */
${mapDeclaration("TYPE_VARIANTS", recordLiteral(variants), "Record<ExportedTypeName, readonly VariantDescriptor[]>")}

/** The constraints each type carries, including their semantic identities. */
${mapDeclaration("TYPE_CONSTRAINTS", recordLiteral(constraints), "Record<ExportedTypeName, readonly ConstraintDescriptor[]>")}

/**
 * The declared default of each exported field.
 *
 * A \`representation\` or \`migration\` default appears here even though the
 * generated validator applies only a \`semantic\` one, so a consumer can see a
 * default the semantic contract declines to substitute.
 */
${mapDeclaration("FIELD_DEFAULT", recordLiteral(defaults), "Record<ExportedFieldKey, DefaultDescriptor>")}
`;
}

/**
 * The generated `provenance.ts`.
 *
 * One concept, one module, one name. It carries what this package was generated
 * from and by, and nothing else — the contract data that used to share its
 * predecessor `metadata.ts` now sits beside the semantic identity it qualifies,
 * in `identity.ts` (FR-137, ADR-0007).
 *
 * It imports nothing, so a consumer reading provenance alone retains neither
 * validator code nor a descriptor type.
 */
export function renderProvenance(model, options = {}) {
	const fingerprint = fingerprintFrom(options);
	const source = model.source ?? {};
	const pkg = model.package ?? {};

	const versions = (list) =>
		Array.isArray(list) && list.length > 0
			? `[${list.map((entry) => literal(entry)).join(", ")}]`
			: "[]";

	// Built through `recordLiteral` rather than written inline, so a long digest
	// is broken by the same rule as every other over-long entry.
	const provenance = recordLiteral(
		[
			["contractVersion", literal(model.contractVersion ?? "")],
			["sourceIdentity", literal(source.identity ?? "")],
			["sourceVersion", literal(source.version ?? "")],
			["sourceDialect", literal(source.dialect ?? "")],
			["sourceDigest", literal(source.digest ?? "")],
			["packageIdentity", literal(pkg.identity ?? "")],
			["packageVersion", literal(pkg.version ?? "")],
			["packageManifestDigest", literal(pkg.manifestDigest ?? "")],
			["packageMappingVersions", versions(pkg.mappingVersions)],
			["packageProfileVersions", versions(pkg.profileVersions)],
			["packageLockDigest", literal(pkg.lockDigest ?? "")],
			["fingerprint", literal(fingerprint)],
			["backendIdentity", literal(model.backend.identity)],
			["backendVersion", literal(model.backend.version)],
		],
		// The provenance object is ordered as the contract states it, not by key:
		// a reader follows source then package then fingerprint.
		false,
	);

	return `/**
 * The provenance of the semantic document this package was generated from.
 *
 * Every value here is copied from the document or computed from it. There is no
 * generation timestamp, no build date, no hostname, no machine identifier, no
 * user name, no user id, no home directory, no working directory, no absolute
 * path, no tool path, no interpreter path and no environment variable value:
 * each of those is a determinism leak, and generating this package twice at
 * different times produces identical bytes because none of them is read.
 *
 * An occurrence's \`observedAt\` is the one timestamp a generated package
 * carries, and it is contract data the document's author wrote. It is declared
 * in \`identity.ts\`, not here.
 */

/** The document's provenance and the fingerprint of its normalized form. */
export const PROVENANCE = ${provenance}${AS_CONST};
`;
}

/**
 * Identity-bearing nodes that the model made reachable.  The list deliberately
 * follows model edges, not raw document keys: this is the resolved-model
 * boundary and therefore catches a new construct that a renderer forgets.
 */
function identityNodes(model) {
	const nodes = [];
	const add = (node) => {
		if (typeof node?.identity === "string") nodes.push(node.identity);
	};
	for (const extension of model.extensions ?? []) add(extension);
	for (const occurrence of model.occurrences ?? []) add(occurrence);
	for (const type of model.types ?? []) {
		add(type);
		for (const constraint of type.constraints ?? []) add(constraint);
		for (const extension of type.extensions ?? []) add(extension);
		for (const clause of type.clauses ?? []) add(clause);
		for (const variant of type.variants ?? []) add(variant);
		for (const field of type.fields ?? []) {
			add(field);
			for (const extension of field.extensions ?? []) add(extension);
		}
		for (const relationship of type.relationships ?? []) add(relationship);
		for (const operation of type.operations ?? []) {
			add(operation);
			for (const param of operation.params ?? []) add(param);
		}
	}
	return nodes.sort();
}

/**
 * Audit emitted text against every identity-bearing resolved-model node.
 *
 * `losses` is explicit so a future target that really cannot render a node
 * must declare its identity at this call site; omission cannot look like a
 * successful package. This target's fail policy supplies none.
 */
export function auditRenderedNodes(model, files, losses = []) {
	const output = [...files].map((file) => file.text ?? "").join("\n");
	const declaredLosses = new Set(losses);
	return identityNodes(model).filter(
		(identity) =>
			!declaredLosses.has(identity) && !output.includes(literal(identity)),
	);
}
