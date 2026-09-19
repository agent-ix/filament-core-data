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

import {
	abstractAncestors,
	adoptDeclaration,
	admits,
	bindConstructs,
	constructOf,
	declarationOf,
	equalityOf,
	identityFieldNames,
	isEnumerationShaped,
	isRecordShaped,
	kindName,
	populationsOf,
	renderingOf,
} from "../../constructs.mjs";
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

/**
 * A native value type reference (gap 1 of FCD #199/#200): `ix://quire/native/<Name>`
 * names a kernel scalar and declares no node, over the closed set below.
 */
const NATIVE_PREFIX = "ix://quire/native/";
const NATIVE_SCALARS = new Map([
	["UUID", "uuid"],
	["Boolean", "boolean"],
	["Integer", "integer"],
	["Decimal", "number"],
	["String", "string"],
	["Timestamp", "datetime"],
	["Duration", "duration"],
	["Bytes", "bytes"],
	["JsonObject", "any"],
]);

function nativeScalar(ref) {
	if (typeof ref !== "string" || !ref.startsWith(NATIVE_PREFIX)) return undefined;
	return NATIVE_SCALARS.get(ref.slice(NATIVE_PREFIX.length));
}

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
 * `conformance/bases/core-2-0.json`, which gives a `map` `preserve` and a
 * `union` `surface`, and which the independent oracle decides `success`.
 */
export function unknownDisposition(definition, policy) {
	const retains = policy === "preserve" || policy === "surface";
	if (isRecordShaped(definition))
		return retains ? "record-retain" : "record-reject";
	if (isEnumerationShaped(definition) || definition?.kind === "union") {
		return retains ? "variant-catchall" : "variant-closed";
	}
	return "inert";
}

/** The mapping row a type selects: its construct's shape, or its core kind. */
function rowOf(declaration, kind) {
	return declaration === undefined
		? `kind:${kind}`
		: `shape:${declaration.shape}`;
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
	// fcd#183: `mapDocument` (and `emitCrate`/`generateRust`, which call it)
	// is a direct entry point a script or test can reach without going
	// through `backends/seam.mjs`, which is the layer that turns a document
	// declaring any contract but 2.0.0 into `agent-ix.compiler.
	// UNKNOWN_CONTRACT_VERSION` before a backend ever sees it. This module's
	// own closed diagnostic registry (`./diagnostics.mjs`) deliberately
	// mirrors only the five reader-owned codes `conformance/diagnostic-
	// codes.json` fixes, so a sixth, unpublished code is not minted here to
	// carry this refusal as a diagnostic; the seam bypass is the caller's
	// defect, not new input this backend must classify, so it throws rather
	// than silently mapping a document no seam ever validated (mirrors
	// `diagnostic()` below, which throws for the same reason on an
	// unregistered code).
	if (ir?.contractVersion !== "2.0.0") {
		throw new TypeError(
			`mapDocument expects a document backends/seam.mjs already refused under agent-ix.compiler.UNKNOWN_CONTRACT_VERSION if it declared anything but 2.0.0; got ${fragment(String(ir?.contractVersion))}`,
		);
	}

	const diagnostics = [];
	const raise = (entry, message, locus) =>
		diagnostics.push(
			diagnostic(entry, { message, ...(locus ? { locus } : {}) }),
		);

	const version = String(ir.contractVersion);
	bindConstructs(ir);
	const definitions = ir.types ?? [];
	const byIdentity = new Map();
	for (const definition of definitions)
		byIdentity.set(definition.identity, definition);
	// The construct facts read the authored document, not the rendering view:
	// a subtype's own fields are the ones that redefine or subset (FR-141).
	const authored = options.authored ?? byIdentity;

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
			authored,
		});
		if (model === undefined) continue;
		diagnostics.push(...model.diagnostics);
		delete model.diagnostics;
		if (model.supportType !== true) models.push(model);
	}
	diagnostics.push(...collisionsIn(SCOPES.CRATE_TYPES, typeScope));
	bindIdentityEquality(models, byIdentity, raise);
	bindAbstractSupertypes(models, raise);

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
			populations: populationsOf(ir),
			componentOf: graph.componentOf,
			boxedEdges: [...graph.boxed].sort(byCodePoint),
		},
		diagnostics,
	};
}

/** The kernel scalars whose Rust form has `Eq` and `Hash`. */
const HASHABLE_SCALARS = Object.freeze([
	"boolean",
	"integer",
	"string",
	"date",
	"datetime",
	"duration",
	"uuid",
]);

/**
 * Whether the type `ref` names maps to a Rust type with `Eq` and `Hash`,
 * adding each generated newtype the answer relies on to `newtypes`. A record,
 * an enum, a union, a `number` or `any` scalar, and a cycle have no such form.
 */
function hashableType(ref, byIdentity, newtypes, seen = new Set()) {
	if (seen.has(ref)) return false;
	const nativeScalarName = nativeScalar(ref);
	if (nativeScalarName !== undefined) {
		const hashable = HASHABLE_SCALARS.includes(nativeScalarName);
		if (hashable) newtypes.add(ref);
		return hashable;
	}
	const definition = byIdentity.get(ref);
	if (definition === undefined) return false;
	const within = new Set(seen).add(ref);
	let hashable;
	switch (definition.kind) {
		case "scalar":
			hashable = HASHABLE_SCALARS.includes(definition.scalar);
			break;
		case "reference":
			hashable = true;
			break;
		case "alias":
			hashable = hashableType(definition.target, byIdentity, newtypes, within);
			break;
		case "sequence":
			hashable = hashableType(definition.items, byIdentity, newtypes, within);
			break;
		case "map":
			hashable = hashableType(definition.values, byIdentity, newtypes, within);
			break;
		default:
			hashable = false;
	}
	if (hashable) newtypes.add(ref);
	return hashable;
}

/**
 * Instances of an identified construct are equal, and hash, by their identity
 * fields (FR-054): each identity field's Rust type must have `Eq` and `Hash`,
 * and every generated newtype it reaches derives them. An identity field
 * without that form is refused rather than compared by every member.
 */
function bindIdentityEquality(models, byIdentity, raise) {
	const newtypes = new Set();
	for (const model of models) {
		if (model.identityFields === undefined || model.abstract === true) continue;
		const members = [];
		for (const name of model.identityFields) {
			const field = model.fields.find((one) => one.name === name);
			if (field === undefined) continue;
			if (
				field.nullable ||
				!hashableType(field.typeRef, byIdentity, newtypes)
			) {
				raise(
					RUST_BACKEND_CODES.UNSUPPORTED_CONSTRUCT,
					`the identity field ${fragment(field.identity)} of ${fragment(model.identity)} maps to \`${fragment(field.rustType)}\`, which has no Eq and Hash, so instances cannot compare by identity`,
					field.origin?.source ?? model.origin?.source,
				);
				continue;
			}
			members.push(field.ident);
		}
		model.identityMembers = members;
	}
	for (const model of models)
		if (newtypes.has(model.identity)) model.derivesHash = true;
}

/**
 * A concrete subtype implements the trait of each abstract supertype, one
 * accessor per field the supertype carries (FR-054). A subtype whose field of
 * that name has another Rust type is refused rather than converted.
 */
function bindAbstractSupertypes(models, raise) {
	const byIdentity = new Map(models.map((model) => [model.identity, model]));
	for (const model of models) {
		if (model.abstractSupertypes === undefined || model.abstract === true)
			continue;
		model.implements = [];
		for (const identity of model.abstractSupertypes) {
			const supertype = byIdentity.get(identity);
			if (supertype === undefined) continue;
			const members = [];
			for (const inherited of supertype.fields) {
				const own = model.fields.find((one) => one.name === inherited.name);
				if (own === undefined || own.rustType !== inherited.rustType) {
					raise(
						RUST_BACKEND_CODES.UNSUPPORTED_CONSTRUCT,
						`the field ${fragment(inherited.name)} of ${fragment(model.identity)} does not map to \`${fragment(inherited.rustType)}\`, the type the abstract supertype ${fragment(identity)} reads it as`,
						own?.origin?.source ?? model.origin?.source,
					);
					continue;
				}
				members.push({ ident: own.ident, rustType: own.rustType });
			}
			model.implements.push({
				path: `crate::types::${supertype.moduleName}::${supertype.typeName}`,
				members,
			});
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
	const { byIdentity, graph, version, raise, typeScope, authored } = context;
	const locus = definition.origin?.source;
	const identity = definition.identity;
	const kind = kindName(definition.kind);
	const declaration = declarationOf(definition);

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
	const constant = constantName({
		identity,
		name:
			typeof definition.displayName === "string" ? definition.displayName : "",
	});
	if (constant.ok !== true) {
		raise(
			RUST_BACKEND_CODES.UNRENDERABLE_NAME,
			constant.diagnostic.message,
			locus,
		);
		return undefined;
	}
	const model = adoptDeclaration({}, definition);
	Object.assign(model, {
		identity,
		kind,
		displayName: definition.displayName,
		roles: definition.roles ?? [],
		unknownPolicy: definition.unknownPolicy,
		unknownDisposition: unknownDisposition(
			definition,
			definition.unknownPolicy,
		),
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
	});
	const construct = constructOf(authored.get(identity) ?? definition, authored);
	if (construct !== undefined) model.construct = construct;
	// The constraint diagnostics belong to the run, not to the model; the model
	// carries them only until `mapDocument` drains them into the run's list.
	model.diagnostics = lowered.diagnostics;

	const target = (ref, edgeKey, position) =>
		referenceTo(ref, edgeKey, position, definition, context);

	// A construct selects its row by its declared shape; a core kind by itself.
	switch (renderingOf(definition)) {
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
		case "state_machine": {
			// A record-shaped construct selects its shape's row: the record's
			// rendering plus the construct's members (FR-054, FR-142).
			model.row = rowOf(declaration, kind);
			if (equalityOf(definition) === "identity")
				model.identityFields = identityFieldNames(definition, authored);
			if (definition.abstract === true) model.abstract = true;
			const abstracts = abstractAncestors(
				authored.get(identity) ?? definition,
				authored,
			).map((one) => one.identity);
			if (abstracts.length > 0) model.abstractSupertypes = abstracts;
			model.fields = [];
			for (const field of definition.fields ?? []) {
				const mapped = mapField(field, definition, context, version);
				if (mapped !== undefined) model.fields.push(mapped);
			}
			const memberScope = model.fields.map((field) => ({
				identifier: field.ident,
				identity: field.identity,
			}));
			// An immutable construct reads each member through an accessor method,
			// which shares the inherent method namespace with `try_new` and
			// `validate`.
			if (construct?.immutable === true)
				for (const method of ["try_new", "validate"])
					memberScope.push({
						identifier: method,
						identity: `ix://agent-ix/filament-core-data/rust-backend/reserved/${method}`,
					});
			model.diagnostics.push(
				...collisionsIn(SCOPES.RECORD_MEMBERS, memberScope),
			);
			if (admits(definition, "states")) {
				// The states render as the variants of `<Name>State`.
				model.states = [];
				for (const state of definition.states ?? []) {
					const rendered = variantName(state);
					if (rendered.ok !== true) {
						raise(
							RUST_BACKEND_CODES.UNRENDERABLE_NAME,
							rendered.diagnostic.message,
							state.origin?.source ?? locus,
						);
						continue;
					}
					model.states.push({
						identity: state.identity,
						name: state.name,
						ident: rendered.value,
						rename: serdeRename(rendered.value, state.name),
					});
				}
				model.diagnostics.push(
					...collisionsIn(
						SCOPES.ENUM_VARIANTS,
						model.states.map((state) => ({
							identifier: state.ident,
							identity: state.identity,
						})),
					),
				);
				typeScope.push({
					identifier: `${resolvedName.value}State`,
					identity: `${identity}#states`,
				});
			}
			break;
		}
		case "enum":
		case "union": {
			model.row = rowOf(declaration, kind);
			model.wireForm =
				definition.kind === "union"
					? wireFormOf(definition.extensions)
					: undefined;
			model.variants = [];
			for (const variant of definition.variants ?? []) {
				if (definition.kind !== "union" && variant.payloadType !== undefined) {
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
		case "interface": {
			// An interface holding no state: one trait method per operation.
			model.row = rowOf(declaration, kind);
			model.methods = [];
			for (const operation of definition.operations ?? []) {
				const method = mapMethod(operation, definition, context, version);
				if (method !== undefined) model.methods.push(method);
			}
			model.diagnostics.push(
				...collisionsIn(
					SCOPES.RECORD_MEMBERS,
					model.methods.map((method) => ({
						identifier: method.ident,
						identity: method.identity,
					})),
				),
			);
			break;
		}
		case "namespace": {
			// A namespace, not a data type: a unit struct carrying its members and
			// vocabulary as associated constants.
			model.row = rowOf(declaration, kind);
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
	const scalar = nativeScalar(ref);
	if (scalar !== undefined) {
		if (scalar === "bytes") {
			raise(
				RUST_BACKEND_CODES.UNDECLARED_WIRE_FORM,
				`the ${position} of ${fragment(owner.identity)} names the kernel scalar \`bytes\`, whose JSON wire form no published artifact states`,
				owner.origin?.source,
			);
			return undefined;
		}
		return KERNEL_SCALARS[scalar];
	}
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
	if (definition.abstract === true && position !== "reference target") {
		// An abstract type renders as a trait, which is no value type a member
		// can hold: every instance is an instance of a subtype. A `reference`
		// holds the target's identity rather than a value of it, so it may name
		// an abstract type.
		raise(
			RUST_BACKEND_CODES.UNSUPPORTED_CONSTRUCT,
			`the ${position} of ${fragment(owner.identity)} names the abstract type ${fragment(ref)}, which has no Rust value type of its own`,
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

/**
 * One interface operation as a trait method: its parameters and return map
 * through the member rows, so a parameter's Rust type is the one a field of the
 * same shape carries.
 */
function mapMethod(operation, owner, context, version) {
	const { raise } = context;
	const locus = operation.origin?.source ?? owner.origin?.source;
	const rendered = memberName(operation);
	if (rendered.ok !== true) {
		raise(
			RUST_BACKEND_CODES.UNRENDERABLE_NAME,
			rendered.diagnostic.message,
			locus,
		);
		return undefined;
	}
	const params = [];
	for (const param of operation.params ?? []) {
		const mapped = mapField(param, owner, context, version);
		if (mapped === undefined) return undefined;
		params.push(mapped);
	}
	let returns;
	if (operation.returns !== undefined) {
		const mapped = mapField(
			{
				identity: `${operation.identity}#returns`,
				name: "returns",
				typeRef: operation.returns.typeRef,
				nullable: operation.returns.nullable,
				multiplicity: operation.returns.multiplicity ?? {
					lower: 1,
					upper: 1,
				},
			},
			owner,
			context,
			version,
		);
		if (mapped === undefined) return undefined;
		returns = mapped.rustType;
	}
	const frame = operation.frame;
	const readsOnly =
		frame !== undefined &&
		[frame.modifies, frame.creates, frame.deletes].every(
			(list) => (list ?? []).length === 0,
		);
	return {
		identity: operation.identity,
		name: operation.name,
		ident: rendered.value,
		params,
		returns,
		receiver: readsOnly ? "&self" : "&mut self",
		doc: docParts(
			{ displayName: operation.name },
			{ fallbackIdentity: operation.identity },
		),
	};
}

function mapField(field, owner, context, version) {
	const { raise, graph } = context;
	const locus = field.origin?.source ?? owner.origin?.source;
	// fcd#179: 2.0.0 is the only contract, and its schema requires
	// `multiplicity` on every field, so a document reaching the backend
	// (already schema-validated by the caller) always carries one; no
	// presence-derived fallback is needed or admitted.
	const multiplicity = field.multiplicity;

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
