/**
 * The total mapping from the semantic IR to Rust/Serde declarations (FR-054).
 *
 * `mapDocument` returns a *model*, not text. Nothing in this module renders a
 * Rust token; `crate.mjs` does that, and keeping the two apart is what lets the
 * mapping be compared against `mapping-table.json` row by row rather than by
 * grepping emitted source.
 *
 * The mapping is keyed on `kind` alone for the eight structural rows, on
 * `scalar` for the nine kernel scalars, and on the three independent field axes
 * — collection, nullability, presence — for the eight member rows. The axes are
 * composed and never collapsed: `Option<Nullable<T>>` is not `Option<T>`, and
 * the `present_or_absent` helper on the two optional-nullable rows is what
 * keeps an absent member and a present `null` distinguishable through a round
 * trip. Collapsing them is the defect the composition exists to prevent.
 *
 * Every disposition this module reaches is a row of `mapping-table.json` or a
 * named refusal from the closed `RUST_BACKEND_CODES` registry. A construct that
 * selects neither raises `UNSUPPORTED_CONSTRUCT` and writes no file.
 *
 * Pure: same document in, same model out. No filesystem, clock, environment,
 * network, or working directory is read on any path through this module.
 */

import { identityFieldNames } from "../../constructs.mjs";
import { lowerConstraints } from "./constraints.mjs";
import { diagnostic, fragment, RUST_BACKEND_CODES } from "./diagnostics.mjs";
import { buildGraph, isCollection } from "./graph.mjs";
import {
	collisionsIn,
	constantName,
	crateName,
	identitySegment,
	memberName,
	moduleName,
	packageQualifier,
	SCOPES,
	serdeRename,
	typeName,
	variantName,
} from "./names.mjs";

const UNTAGGED_UNION_EXTENSION =
	"ix://agent-ix/semantic-core/extension/untagged-union-wire-form";

function wireFormOf(extensions) {
	for (const extension of extensions ?? []) {
		if (extension?.identity !== UNTAGGED_UNION_EXTENSION) continue;
		if (extension?.payload?.wireForm === "untagged") return "untagged";
	}
	return undefined;
}

/** The v1.2 kernel scalars and their Rust bases; `bytes` is the one refusal. */
export const KERNEL_SCALARS = Object.freeze({
	any: "crate::support::SemanticValue",
	boolean: "bool",
	integer: "i64",
	number: "f64",
	string: "String",
	bytes: null,
	date: "crate::support::Date",
	datetime: "crate::support::DateTime",
	duration: "crate::support::Duration",
	uuid: "crate::support::Uuid",
});

/** The scalar bases that are generated validated newtypes rather than primitives. */
export const GENERATED_SCALARS = Object.freeze([
	"Date",
	"DateTime",
	"Duration",
	"Uuid",
]);

/** The existing support type that renders a matching kernel scalar definition. */
function supportTypeFor(definition, renderedName) {
	if (definition?.kind !== "scalar") return undefined;
	const scalar = definition.scalar;
	const rustType = KERNEL_SCALARS[scalar];
	if (typeof rustType !== "string" || !rustType.startsWith("crate::support::"))
		return undefined;
	const support = rustType.slice("crate::support::".length);
	return renderedName === support ? rustType : undefined;
}

/**
 * Names the generated crate owns at its re-export namespace before a single IR
 * type is mapped. Seeding the type scope with them turns a contract that
 * derives `Nullable` or `SemanticValue` into a named `NAME_COLLISION` rather
 * than into a crate that does not compile.
 */
export const RESERVED_CRATE_NAMES = Object.freeze([
	"Date",
	"DateTime",
	"Duration",
	"Extension",
	"Nullable",
	"NumberLexeme",
	"SemanticIdentity",
	"SemanticType",
	"SemanticValue",
	"SourceLocusPath",
	"UnknownMembers",
	"UnknownVariant",
	"Uuid",
	"ValidationError",
	"Diagnostic",
	"TypeMeta",
	"FieldMeta",
	"MatcherError",
]);

const RESERVED_SET = new Set(RESERVED_CRATE_NAMES);

/**
 * The crate-level identifier a document-derived type takes (FR-133).
 *
 * FR-083 mints `SourceLocusPath` for `SourceLocus.path` and FR-055 reserves
 * `SourceLocusPath` for the crate's own locus type. Both rules are right and
 * they meet on one identifier, so one of them has to yield. The reserved one
 * does not: a consumer already writes `crate::SourceLocusPath` and a resolution
 * that moved it would silently change what that reference targets. The
 * document-derived identifier yields instead, by taking the package its own
 * semantic identity names as a prefix — `SemanticCoreSourceLocusPath`.
 *
 * The rule is a derivation over the identity, not a table of known pairs: any
 * minted or authored name that lands on any reserved identifier resolves the
 * same way. Nothing about the semantic document changes; only the generated
 * identifier moves. Where the qualified identifier is itself taken — by a
 * reserved name or by another type — the scope check still raises
 * `NAME_COLLISION` naming both identities, because the alternative is two
 * constructs sharing one generated name.
 */
export function resolveReserved(rendered, identity) {
	if (rendered.ok !== true || !RESERVED_SET.has(rendered.value))
		return rendered;
	const qualifier = packageQualifier(identity);
	if (qualifier.ok !== true) return qualifier;
	return {
		ok: true,
		value: `${qualifier.value}${rendered.value}`,
		allowRaw: rendered.allowRaw,
	};
}

/** The IR members a `1.1.0` document may carry and a `1.0.0` document may not. */
const V1_1_NODES = Object.freeze([
	{ owner: "type", member: "relationships" },
	{ owner: "type", member: "operations" },
	{ owner: "type", member: "clauses" },
	{ owner: "field", member: "multiplicity" },
	{ owner: "field", member: "unit" },
]);

/**
 * How a type's declared `unknownPolicy` is disposed, keyed on its kind.
 *
 * The schema requires the member on all eight kinds, so the mapping disposes it
 * on all eight, and neither disposition is silence:
 *
 * - `record` — a closed member set. `reject` is `deny_unknown_fields`;
 *   `preserve` and `surface` retain the undeclared members in one flattened
 *   `UnknownMembers`.
 * - `enum` and `union` — a closed *variant* set, so the policy is just as real
 *   an obligation. `reject` is serde's own default, under which an unrecognised
 *   variant is a deserialization error; `preserve` and `surface` add a
 *   generated catch-all `Unknown` variant that keeps the unrecognised tag and,
 *   for a union, its payload, and round-trips unchanged.
 * - `scalar`, `alias`, `sequence`, `map`, `reference` — inert. A scalar has no
 *   members, a sequence and a map admit every element and every key by
 *   construction, and an alias and a reference are transparent, so there is no
 *   unknown member for a policy to govern. The declared value is carried
 *   verbatim into the type's metadata constant and stated inert in the
 *   generated documentation. Recording it is what stops it being dropped.
 *
 * Refusing the inert kinds was the earlier reading and it was wrong: it refused
 * `conformance/bases/core-1-1.json`, which gives a `map` `preserve` and a
 * `union` `surface`, and which the independent oracle decides `success`.
 */
export function unknownDisposition(kind, policy) {
	const retains = policy === "preserve" || policy === "surface";
	if (kind === "record" || kind === "entity")
		return retains ? "record-retain" : "record-reject";
	if (kind === "enum" || kind === "union") {
		return retains ? "variant-catchall" : "variant-closed";
	}
	return "inert";
}

/** The `1.0.0` derivation FR-027 publishes: `presence` fixes the bounds. */
export function multiplicityFromPresence(presence) {
	return presence === "optional"
		? { lower: 0, upper: 1 }
		: { lower: 1, upper: 1 };
}

/** Locale-independent code-point comparison. */
export function byCodePoint(left, right) {
	if (left < right) return -1;
	if (left > right) return 1;
	return 0;
}

/**
 * Maps one IR document.
 *
 * Returns `{ model, diagnostics }`. `model` is `undefined` exactly when a
 * blocking diagnostic was raised, because the backend collects every blocking
 * defect it can find before returning rather than stopping at the first, and a
 * partial model would invite a caller to emit from it.
 */
export function mapDocument(ir, options = {}) {
	const diagnostics = [];
	const raise = (entry, message, locus) =>
		diagnostics.push(
			diagnostic(entry, { message, ...(locus ? { locus } : {}) }),
		);

	const version = String(ir.contractVersion);
	const definitions = ir.types ?? [];
	const byIdentity = new Map();
	for (const definition of definitions)
		byIdentity.set(definition.identity, definition);

	if (version === "1.0.0") checkV11Nodes(definitions, raise);

	const omitted = new Set(options.allowedOmissions ?? []);
	for (const identity of omitted) {
		if (!byIdentity.has(identity)) continue;
		raise(
			RUST_BACKEND_CODES.DECLARED_LOSS,
			`the type ${fragment(identity)} is dropped from the generated crate because the profile lists it in allowedOmissions`,
			byIdentity.get(identity).origin?.source,
		);
	}

	const retained = definitions.filter(
		(definition) => !omitted.has(definition.identity),
	);
	const graph = buildGraph({ types: retained });

	const typeScope = RESERVED_CRATE_NAMES.map((name) => ({
		identifier: name,
		identity: `ix://agent-ix/filament-core-data/rust-backend/reserved/${name}`,
	}));
	const models = [];

	for (const definition of retained) {
		const model = mapType(definition, {
			byIdentity,
			omitted,
			graph,
			version,
			raise,
			typeScope,
		});
		if (model === undefined) continue;
		diagnostics.push(...model.diagnostics);
		delete model.diagnostics;
		if (model.supportType !== true) models.push(model);
	}
	diagnostics.push(...collisionsIn(SCOPES.CRATE_TYPES, typeScope));

	const crate = crateName(ir.package.identity);
	if (crate.ok !== true) diagnostics.push(crate.diagnostic);

	const blocking = diagnostics.some((entry) => entry.blocking === true);
	if (blocking) return { model: undefined, diagnostics };

	return {
		model: {
			contractVersion: version,
			crateName: crate.value,
			source: ir.source,
			package: ir.package,
			types: models,
			occurrences: ir.occurrences ?? [],
			extensions: ir.extensions ?? [],
			componentOf: graph.componentOf,
			boxedEdges: [...graph.boxed].sort(byCodePoint),
		},
		diagnostics,
	};
}

function checkV11Nodes(definitions, raise) {
	for (const definition of definitions) {
		for (const node of V1_1_NODES) {
			if (node.owner === "type") {
				if (definition[node.member] === undefined) continue;
				raise(
					RUST_BACKEND_CODES.V1_1_NODE_IN_V1_0,
					`the type ${fragment(definition.identity)} carries the 1.1.0 node \`${node.member}\` in a 1.0.0 document`,
					definition.origin?.source,
				);
				continue;
			}
			const owners = [
				...(definition.fields ?? []),
				...(definition.operations ?? []).flatMap(
					(operation) => operation.params ?? [],
				),
			];
			for (const field of owners) {
				if (field[node.member] === undefined) continue;
				raise(
					RUST_BACKEND_CODES.V1_1_NODE_IN_V1_0,
					`the field ${fragment(field.identity)} carries the 1.1.0 node \`${node.member}\` in a 1.0.0 document`,
					field.origin?.source,
				);
			}
		}
	}
}

/** Resolves a `typeRef` through alias definitions to a kind and a scalar. */
export function resolveKind(byIdentity, typeRef, seen = new Set()) {
	if (typeof typeRef !== "string" || seen.has(typeRef)) return undefined;
	const definition = byIdentity.get(typeRef);
	if (definition === undefined) return undefined;
	seen.add(typeRef);
	if (definition.kind === "alias")
		return resolveKind(byIdentity, definition.target, seen);
	return {
		kind: String(definition.kind),
		scalar:
			typeof definition.scalar === "string" ? definition.scalar : undefined,
	};
}

function docParts(node, { fallbackIdentity, roles, unit } = {}) {
	const parts = [];
	const identity = fallbackIdentity ?? node.identity;
	parts.push(
		typeof node.displayName === "string" && node.displayName.length > 0
			? node.displayName
			: identitySegment(identity),
	);
	parts.push(`Semantic identity: ${identity}.`);
	if (Array.isArray(roles) && roles.length > 0)
		parts.push(`Roles: ${roles.join(", ")}.`);
	if (typeof unit === "string" && unit.length > 0) parts.push(`Unit: ${unit}.`);
	return parts;
}

function mapType(definition, context) {
	const { byIdentity, omitted, graph, version, raise, typeScope } = context;
	const locus = definition.origin?.source;
	const identity = definition.identity;
	const kind = String(definition.kind);

	const name = typeName(definition);
	if (name.ok !== true) {
		raise(RUST_BACKEND_CODES.UNRENDERABLE_NAME, name.diagnostic.message, locus);
		return undefined;
	}
	const supportType = supportTypeFor(definition, name.value);
	if (supportType !== undefined) {
		return { diagnostics: [], supportType: true };
	}
	// The reserved resolution runs after the support-type check, so a kernel
	// scalar the crate already renders keeps mapping onto that support type
	// rather than being qualified into a second declaration of it (issue #90).
	const resolvedName = resolveReserved(name, identity);
	if (resolvedName.ok !== true) {
		raise(
			RUST_BACKEND_CODES.UNRENDERABLE_NAME,
			resolvedName.diagnostic.message,
			locus,
		);
		return undefined;
	}
	const module = moduleName(definition);
	if (module.ok !== true) {
		raise(
			RUST_BACKEND_CODES.UNRENDERABLE_NAME,
			module.diagnostic.message,
			locus,
		);
		return undefined;
	}
	typeScope.push({ identifier: resolvedName.value, identity });

	const resolved = resolveKind(byIdentity, identity);
	const lowered = lowerConstraints(definition, resolved, {});
	for (const entry of lowered.diagnostics) {
		if (entry.locus === undefined && locus !== undefined) entry.locus = locus;
	}
	const constant = constantName({ identity, name: identitySegment(identity) });
	if (constant.ok !== true) {
		raise(
			RUST_BACKEND_CODES.UNRENDERABLE_NAME,
			constant.diagnostic.message,
			locus,
		);
		return undefined;
	}
	const model = {
		identity,
		kind,
		displayName: definition.displayName,
		roles: definition.roles ?? [],
		unknownPolicy: definition.unknownPolicy,
		unknownDisposition: unknownDisposition(kind, definition.unknownPolicy),
		origin: definition.origin,
		extensions: definition.extensions ?? [],
		typeName: resolvedName.value,
		moduleName: module.value,
		constantName: constant.value,
		doc: docParts(definition, { roles: definition.roles }),
		checks: lowered.checks,
		component: graph.componentOf.get(identity),
		relationships: definition.relationships ?? [],
		operations: definition.operations ?? [],
		clauses: definition.clauses ?? [],
	};
	// The constraint diagnostics belong to the run, not to the model; the model
	// carries them only until `mapDocument` drains them into the run's list.
	model.diagnostics = lowered.diagnostics;

	const target = (ref, edgeKey, position) =>
		referenceTo(ref, edgeKey, position, definition, context);

	switch (kind) {
		case "scalar": {
			const scalar = String(definition.scalar);
			if (!Object.hasOwn(KERNEL_SCALARS, scalar)) {
				raise(
					RUST_BACKEND_CODES.UNSUPPORTED_SCALAR,
					`the type ${fragment(identity)} names the scalar ${fragment(scalar)}, which this backend does not support`,
					locus,
				);
				return undefined;
			}
			if (scalar === "bytes") {
				raise(
					RUST_BACKEND_CODES.UNDECLARED_WIRE_FORM,
					`the type ${fragment(identity)} declares the kernel scalar \`bytes\`, whose JSON wire form no published artifact states`,
					locus,
				);
				return undefined;
			}
			model.scalar = scalar;
			model.inner = KERNEL_SCALARS[scalar];
			model.row = `scalar:${scalar}`;
			break;
		}
		case "record":
		case "entity": {
			// An entity selects its own row: the record's rendering plus its
			// identity field names (FR-054).
			model.row = `kind:${kind}`;
			if (kind === "entity")
				model.identityFields = identityFieldNames(definition);
			model.fields = [];
			for (const field of definition.fields ?? []) {
				const mapped = mapField(field, definition, context, version);
				if (mapped !== undefined) model.fields.push(mapped);
			}
			const memberScope = model.fields.map((field) => ({
				identifier: field.ident,
				identity: field.identity,
			}));
			model.diagnostics.push(
				...collisionsIn(SCOPES.RECORD_MEMBERS, memberScope),
			);
			break;
		}
		case "enum":
		case "union": {
			model.row = `kind:${kind}`;
			model.wireForm =
				kind === "union" ? wireFormOf(definition.extensions) : undefined;
			model.variants = [];
			for (const variant of definition.variants ?? []) {
				if (kind === "enum" && variant.payloadType !== undefined) {
					raise(
						RUST_BACKEND_CODES.PAYLOAD_ON_ENUM_VARIANT,
						`the enum variant ${fragment(variant.identity)} carries a payloadType, which only a union variant may`,
						variant.origin?.source ?? locus,
					);
					continue;
				}
				const rendered = variantName(variant);
				if (rendered.ok !== true) {
					raise(
						RUST_BACKEND_CODES.UNRENDERABLE_NAME,
						rendered.diagnostic.message,
						variant.origin?.source ?? locus,
					);
					continue;
				}
				const payload =
					variant.payloadType === undefined
						? undefined
						: target(
								variant.payloadType,
								`${variant.identity}#payloadType`,
								"variant payloadType",
							);
				if (variant.payloadType !== undefined && payload === undefined)
					continue;
				model.variants.push({
					identity: variant.identity,
					name: variant.name,
					ident: rendered.value,
					rename: serdeRename(rendered.value, variant.name),
					payload,
					doc: docParts(variant, { fallbackIdentity: variant.identity }),
					origin: variant.origin,
				});
			}
			const variantScope = model.variants.map((variant) => ({
				identifier: variant.ident,
				identity: variant.identity,
			}));
			// The catch-all is a declaration in the same scope, so a contract
			// variant that derives `Unknown` is a named collision rather than a
			// crate that does not compile.
			if (model.unknownDisposition === "variant-catchall") {
				variantScope.push({
					identifier: "Unknown",
					identity:
						"ix://agent-ix/filament-core-data/rust-backend/reserved/UnknownVariant",
				});
			}
			model.diagnostics.push(
				...collisionsIn(SCOPES.ENUM_VARIANTS, variantScope),
			);
			break;
		}
		case "alias": {
			model.row = "kind:alias";
			model.inner = target(
				definition.target,
				`${identity}#target`,
				"alias target",
			);
			if (model.inner === undefined) return undefined;
			break;
		}
		case "sequence": {
			model.row = "kind:sequence";
			model.items = target(
				definition.items,
				`${identity}#items`,
				"sequence items",
			);
			if (model.items === undefined) return undefined;
			model.inner = `Vec<${model.items}>`;
			break;
		}
		case "map": {
			model.row = "kind:map";
			model.values = target(
				definition.values,
				`${identity}#values`,
				"map values",
			);
			if (model.values === undefined) return undefined;
			model.inner = `::std::collections::BTreeMap<String, ${model.values}>`;
			break;
		}
		case "reference": {
			model.row = "kind:reference";
			// A `reference` maps to the validated identity, not to the target's
			// Rust type, so the target is checked for resolution and then does not
			// appear in the emitted declaration at all.
			target(definition.target, `${identity}#target`, "reference target");
			model.inner = "crate::support::SemanticIdentity";
			break;
		}
		default:
			raise(
				RUST_BACKEND_CODES.UNSUPPORTED_CONSTRUCT,
				`the type ${fragment(identity)} declares the kind ${fragment(kind)}, which selects no mapping row`,
				locus,
			);
			return undefined;
	}

	for (const operation of model.operations) {
		for (const param of operation.params ?? []) {
			target(
				param.typeRef,
				`${param.identity}#typeRef`,
				"operation parameter typeRef",
			);
		}
		if (operation.returns !== undefined) {
			target(
				operation.returns.typeRef,
				`${operation.identity}#returns`,
				"operation returns typeRef",
			);
		}
		const paramScope = [];
		for (const param of operation.params ?? []) {
			const rendered = memberName(param);
			if (rendered.ok !== true) {
				raise(
					RUST_BACKEND_CODES.UNRENDERABLE_NAME,
					rendered.diagnostic.message,
					param.origin?.source ?? locus,
				);
				continue;
			}
			paramScope.push({ identifier: rendered.value, identity: param.identity });
		}
		model.diagnostics.push(
			...collisionsIn(SCOPES.OPERATION_PARAMS, paramScope),
		);
	}

	return model;
}

/**
 * The Rust type a reference edge produces, with the indirection the graph
 * decided, or `undefined` when the edge resolves to nothing or to an omitted
 * type.
 */
function referenceTo(ref, edgeKey, position, owner, context) {
	const { byIdentity, omitted, graph, raise } = context;
	const definition = byIdentity.get(ref);
	if (definition === undefined) {
		raise(
			RUST_BACKEND_CODES.UNRESOLVED_TYPE_REF,
			`the ${position} of ${fragment(owner.identity)} names ${fragment(ref)}, which resolves to nothing`,
			owner.origin?.source,
		);
		return undefined;
	}
	if (omitted.has(ref)) {
		raise(
			RUST_BACKEND_CODES.UNDECLARED_LOSS,
			`the ${position} of ${fragment(owner.identity)} names ${fragment(ref)}, which the profile drops while ${fragment(owner.identity)} is retained; the profile does not list ${fragment(owner.identity)} in allowedOmissions`,
			owner.origin?.source,
		);
		return undefined;
	}
	const rendered = typeName(definition);
	if (rendered.ok !== true) {
		raise(
			RUST_BACKEND_CODES.UNRENDERABLE_NAME,
			rendered.diagnostic.message,
			definition.origin?.source,
		);
		return undefined;
	}
	const supportType = supportTypeFor(definition, rendered.value);
	if (supportType !== undefined) return supportType;
	const resolvedName = resolveReserved(rendered, definition.identity);
	if (resolvedName.ok !== true) {
		raise(
			RUST_BACKEND_CODES.UNRENDERABLE_NAME,
			resolvedName.diagnostic.message,
			definition.origin?.source,
		);
		return undefined;
	}
	const base = `crate::${resolvedName.value}`;
	return graph.boxed.has(edgeKey) ? `Box<${base}>` : base;
}

function mapField(field, owner, context, version) {
	const { raise, graph } = context;
	const locus = field.origin?.source ?? owner.origin?.source;
	const multiplicity =
		field.multiplicity ?? multiplicityFromPresence(field.presence);

	if (multiplicity.upper === 0) {
		raise(
			RUST_BACKEND_CODES.UNSUPPORTED_MULTIPLICITY,
			`the field ${fragment(field.identity)} declares multiplicity.upper 0, so the member may never be present and has no Rust form serde round-trips`,
			locus,
		);
		return undefined;
	}

	const rendered = memberName(field);
	if (rendered.ok !== true) {
		raise(
			RUST_BACKEND_CODES.UNRENDERABLE_NAME,
			rendered.diagnostic.message,
			locus,
		);
		return undefined;
	}

	const collection = isCollection(multiplicity);
	const nullable = field.nullable === true;
	const optional = multiplicity.lower === 0;

	const element = referenceTo(
		field.typeRef,
		`${field.identity}#typeRef`,
		"field typeRef",
		owner,
		context,
	);
	if (element === undefined) return undefined;

	let rustType = element;
	if (nullable) rustType = `crate::support::Nullable<${rustType}>`;
	if (collection) rustType = `Vec<${rustType}>`;
	if (optional) rustType = `Option<${rustType}>`;

	const serdeAttributes = [];
	if (optional) {
		serdeAttributes.push("default");
		serdeAttributes.push('skip_serializing_if = "Option::is_none"');
		if (nullable) {
			serdeAttributes.push(
				'deserialize_with = "crate::support::present_or_absent"',
			);
		}
	}

	const row = `field:${collection ? "collection" : "single"}/${nullable ? "nullable" : "non-null"}/${optional ? "optional" : "required"}`;

	return {
		identity: field.identity,
		name: field.name,
		ident: rendered.value,
		rename: serdeRename(rendered.value, field.name),
		typeRef: field.typeRef,
		element,
		rustType,
		serdeAttributes,
		collection,
		nullable,
		presence: optional ? "optional" : "required",
		multiplicity,
		unit: field.unit,
		defaultKind: field.defaultKind,
		defaultValue: field.defaultValue,
		boxed: graph.boxed.has(`${field.identity}#typeRef`),
		row,
		doc: docParts(field, {
			fallbackIdentity: field.identity,
			unit: field.unit,
		}),
		origin: field.origin,
	};
}

/**
 * The four size limits, measured over the document rather than over the
 * emitted crate, so a document that would recurse without bound is refused
 * before a byte is produced (NFR-020, FR-056).
 */
export function enforceLimits(ir, limits) {
	const diagnostics = [];
	if (limits === undefined) return diagnostics;
	const raise = (which, measured, limit) =>
		diagnostics.push(
			diagnostic(RUST_BACKEND_CODES.LIMIT_EXCEEDED, {
				message: `the input exceeds the declared limit \`${which}\`: measured ${measured}, limit ${limit}`,
			}),
		);

	const encoded = JSON.stringify(ir);
	const bytes = Buffer.byteLength(encoded, "utf8");
	if (limits.maxInputBytes !== undefined && bytes > limits.maxInputBytes) {
		raise("maxInputBytes", bytes, limits.maxInputBytes);
	}

	let nodes = 0;
	let deepest = 0;
	let widest = 0;
	const walk = (value, depth) => {
		if (depth > deepest) deepest = depth;
		if (Array.isArray(value)) {
			nodes += 1;
			if (value.length > widest) widest = value.length;
			for (const item of value) walk(item, depth + 1);
			return;
		}
		if (value !== null && typeof value === "object") {
			nodes += 1;
			for (const key of Object.keys(value)) walk(value[key], depth + 1);
			return;
		}
		nodes += 1;
	};
	walk(ir, 1);

	if (limits.maxNodes !== undefined && nodes > limits.maxNodes) {
		raise("maxNodes", nodes, limits.maxNodes);
	}
	if (limits.maxDepth !== undefined && deepest > limits.maxDepth) {
		raise("maxDepth", deepest, limits.maxDepth);
	}
	if (
		limits.maxCollectionItems !== undefined &&
		widest > limits.maxCollectionItems
	) {
		raise("maxCollectionItems", widest, limits.maxCollectionItems);
	}
	return diagnostics;
}
