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

import { lowerConstraints } from "./constraints.mjs";
import { RUST_BACKEND_CODES, diagnostic, fragment } from "./diagnostics.mjs";
import { buildGraph, isCollection } from "./graph.mjs";
import {
	SCOPES,
	collisionsIn,
	constantName,
	crateName,
	identitySegment,
	memberName,
	moduleName,
	serdeRename,
	typeName,
	variantName,
} from "./names.mjs";

/** The nine kernel scalars and their Rust bases; `bytes` is the one refusal. */
export const KERNEL_SCALARS = Object.freeze({
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
	"Uuid",
	"ValidationError",
	"Diagnostic",
	"TypeMeta",
	"FieldMeta",
	"MatcherError",
]);

/** The IR members a `1.1.0` document may carry and a `1.0.0` document may not. */
const V1_1_NODES = Object.freeze([
	{ owner: "type", member: "relationships" },
	{ owner: "type", member: "operations" },
	{ owner: "type", member: "clauses" },
	{ owner: "field", member: "multiplicity" },
	{ owner: "field", member: "unit" },
]);

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
		models.push(model);
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
	const module = moduleName(definition);
	if (module.ok !== true) {
		raise(
			RUST_BACKEND_CODES.UNRENDERABLE_NAME,
			module.diagnostic.message,
			locus,
		);
		return undefined;
	}
	typeScope.push({ identifier: name.value, identity });

	if (kind !== "record" && definition.unknownPolicy !== "reject") {
		raise(
			RUST_BACKEND_CODES.UNKNOWN_POLICY_ON_NON_RECORD,
			`the type ${fragment(identity)} is a ${kind} and declares the unknown policy \`${fragment(definition.unknownPolicy)}\`; only a record has a place to put a retained member`,
			locus,
		);
		return undefined;
	}

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
		origin: definition.origin,
		extensions: definition.extensions ?? [],
		typeName: name.value,
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
					`the type ${fragment(identity)} names the scalar ${fragment(scalar)}, which is outside the nine kernel scalars`,
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
		case "record": {
			model.row = "kind:record";
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
	const base = `crate::${rendered.value}`;
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
