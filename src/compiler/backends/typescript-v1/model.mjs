/**
 * The resolved type model (FR-064, Task-105).
 *
 * This is the one artifact `renderTypes`, `renderValidators`, `renderIdentity`,
 * `renderMetadata` and `renderPackage` all consume. Four requirements named it
 * before it had an owner, which is how five modules end up with five slightly
 * different ideas of the shape they exchange; declaring it once is the point.
 *
 * `buildModel` is also the *only* module of this backend that walks the raw IR
 * document (FR-064-CON-6). Every renderer reads the model and never the
 * document, so a resolution rule — the alias chain, the three field axes, the
 * constraint subject — has one implementation rather than five.
 *
 * Two properties are load-bearing and are asserted rather than hoped for:
 *
 * - **Every value comes from an IR member.** Nothing is inferred from a display
 *   name, a namespace prefix, or a rendered type string. The prototype emitter's
 *   `role`, `nullable`, `recursive` and `extensionPoint` name heuristics are
 *   `conformance/defects.json` DEF-PROTO-004..007, and they are what
 *   FR-064-CON-2 exists to exclude.
 * - **The model is acyclic.** The IR's type graph is not: `typeRef`,
 *   `alias.target`, `sequence.items`, `map.values` and `variant.payloadType` are
 *   flat identities into one flat array and may form cycles, and
 *   `conformance/bases/core-1-1.json` carries a real one — `Node` has a field
 *   typed `NodeRef`, which is a `reference` whose target is `Node`. So a
 *   resolution carries a *summary* of the entry it resolves to — its identity,
 *   its minted identifier, its kind and its resolved scalar — rather than a
 *   reference to the entry object. That is everything a renderer needs, and it
 *   keeps the model a plain acyclic value that can be canonicalized, deeply
 *   compared, and serialized. A model that could not be compared would make
 *   FR-064-AC-19 unmeasurable.
 *
 * Purity: no filesystem, no clock, no environment variable, no `process.cwd()`,
 * no network, and the argument is left byte-identical.
 */

import { MAX_DEPTH } from "./admit.mjs";
import { reserveNames } from "./names.mjs";

/** Code-unit ordering. Never `localeCompare`, which reads the host's collator. */
function compareCodeUnits(left, right) {
	if (left === right) return 0;
	return left < right ? -1 : 1;
}

/** Order a list of identity-bearing nodes by identity, code-unit ascending. */
function byIdentity(nodes) {
	return [...nodes].sort((left, right) =>
		compareCodeUnits(String(left?.identity), String(right?.identity)),
	);
}

function isObject(value) {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * The scalar an identity resolves to through the alias chain, or `undefined`.
 *
 * Bounded by `MAX_DEPTH`, which is imported from the admissibility reader
 * rather than restated here, and guarded by a `seen` set so a cyclic chain
 * terminates. A document whose chain is cyclic or over-deep is refused by
 * FR-068 before it reaches this module; the guards are here because a total
 * function must be total even on input that should never arrive.
 */
function resolveScalar(types, identity, seen = new Set(), depth = 0) {
	if (typeof identity !== "string") return undefined;
	if (seen.has(identity) || depth > MAX_DEPTH) return undefined;
	seen.add(identity);
	const type = types.get(identity);
	if (type === undefined) return undefined;
	if (type.kind === "scalar") {
		return typeof type.scalar === "string" ? type.scalar : undefined;
	}
	if (type.kind === "alias" || type.kind === "reference") {
		return resolveScalar(types, type.target, seen, depth + 1);
	}
	return undefined;
}

/**
 * The acyclic summary of the entry `identity` names: what a renderer needs to
 * write a reference to it, and no object reference that could close a cycle.
 */
function summaryOf(types, identifiers, identity) {
	if (typeof identity !== "string") return undefined;
	const type = types.get(identity);
	return Object.freeze({
		identity,
		identifier: identifiers.get(identity),
		kind: type?.kind,
		scalar: resolveScalar(types, identity),
		declared: type !== undefined,
	});
}

/**
 * The three axes, each taken from the IR member that carries it and from no
 * other: `presence` decides optional, `nullable` decides nullable, and the
 * multiplicity bounds decide collection. They are decided once, here, so that
 * no renderer re-derives one and no two renderers derive it differently.
 *
 * `upper` absent means unbounded, so absent or greater than one is a
 * collection. `conformance/bases/core-1-1.json` carries both readings on one
 * record: `node-children` has `{ lower: 0, ordered: true, unique: true }` and is
 * a collection, while `node-tags` has `{ lower: 0, upper: 1 }` and is not, even
 * though its `typeRef` names a `sequence`.
 */
function axesOf(field) {
	// A `1.0.0` field carries no multiplicity at all — the schema requires one
	// only at `1.1.0` — so an absent *member* is not an absent *bound*. Reading
	// it as unbounded would render every `1.0.0` field as an array. Where the
	// member is absent it is derived from `presence`, which is the same
	// derivation the normalized serialization applies, and only an explicitly
	// declared multiplicity with an absent `upper` means unbounded.
	const declared = isObject(field.multiplicity);
	const multiplicity = declared
		? field.multiplicity
		: field.presence === "optional"
			? { lower: 0, upper: 1 }
			: { lower: 1, upper: 1 };
	const upper = multiplicity.upper;
	return {
		optional: field.presence === "optional",
		nullable: field.nullable === true,
		collection: upper === undefined || upper === null || upper > 1,
		lower:
			typeof multiplicity.lower === "number" ? multiplicity.lower : undefined,
		upper: typeof upper === "number" ? upper : undefined,
		ordered: multiplicity.ordered === true,
		unique: multiplicity.unique === true,
	};
}

/** One field or one operation parameter, resolved. */
function fieldEntry(types, identifiers, field) {
	const axes = axesOf(field);
	const entry = {
		identity: field.identity,
		name: field.name,
		typeRef: field.typeRef,
		element: summaryOf(types, identifiers, field.typeRef),
		optional: axes.optional,
		nullable: axes.nullable,
		collection: axes.collection,
		multiplicity: Object.freeze({
			lower: axes.lower,
			upper: axes.upper,
			ordered: axes.ordered,
			unique: axes.unique,
		}),
		defaultKind: field.defaultKind,
		extensions: Object.freeze([...(field.extensions ?? [])]),
		origin: field.origin,
	};
	// `defaultValue` is present exactly when `defaultKind` is not `none`, which
	// the published schema enforces; carrying the member only when the document
	// does keeps the two states distinguishable rather than collapsing an
	// authored `null` default into "no default".
	if (Object.hasOwn(field, "defaultValue")) {
		entry.defaultValue = field.defaultValue;
	}
	if (typeof field.unit === "string") entry.unit = field.unit;
	return Object.freeze(entry);
}

/**
 * The model of one contract IR document.
 *
 * Total over a document FR-068 has admitted: every branch returns a model
 * rather than failing on a shape the admissibility answer already accepted.
 */
export function buildModel(ir, options = {}) {
	const document = isObject(ir) ? ir : {};
	const declarations = Array.isArray(document.types) ? document.types : [];
	const types = new Map();
	for (const type of declarations) {
		if (isObject(type) && typeof type.identity === "string") {
			types.set(type.identity, type);
		}
	}

	// Names are minted, and a collision refused, while the model is built —
	// before any file map could exist, which is what FR-064-AC-14 asks for.
	const { identifiers, collisions } = reserveNames(
		declarations.filter(isObject),
	);

	// A constraint names its subject in `appliesTo`, which is a *type* identity;
	// the frontend mints an alias type per constrained property rather than
	// hanging a constraint on a field. So constraints are grouped by the entry
	// they apply to rather than by the array they were written in, and each one
	// carries `declaredOn` so the document's own arrangement is not lost.
	const applied = new Map();
	for (const type of declarations) {
		if (!isObject(type)) continue;
		for (const constraint of type.constraints ?? []) {
			if (!isObject(constraint)) continue;
			const subject =
				typeof constraint.appliesTo === "string"
					? constraint.appliesTo
					: type.identity;
			const bucket = applied.get(subject) ?? [];
			bucket.push(
				Object.freeze({
					...constraint,
					declaredOn: type.identity,
					subjectScalar: resolveScalar(types, subject),
				}),
			);
			applied.set(subject, bucket);
		}
	}

	const entries = byIdentity(declarations.filter(isObject)).map((type) => {
		const entry = {
			identity: type.identity,
			displayName: type.displayName,
			identifier: identifiers.get(type.identity),
			kind: type.kind,
			roles: Object.freeze([...(type.roles ?? [])]),
			unknownPolicy: type.unknownPolicy,
			constraints: Object.freeze(byIdentity(applied.get(type.identity) ?? [])),
			extensions: Object.freeze([...(type.extensions ?? [])]),
			origin: type.origin,
		};
		const scalar = resolveScalar(types, type.identity);
		if (scalar !== undefined) entry.scalar = scalar;

		if (type.kind === "record") {
			entry.fields = Object.freeze(
				byIdentity((type.fields ?? []).filter(isObject)).map((field) =>
					fieldEntry(types, identifiers, field),
				),
			);
			// Relationships and operations are carried for FR-067 and FR-068 and
			// are rendered into no interface: a relationship has no name and is not
			// part of a record's serialized shape, and an operation is behaviour
			// this target declares it cannot represent.
			entry.relationships = Object.freeze(
				byIdentity((type.relationships ?? []).filter(isObject)).map(
					(relationship) =>
						Object.freeze({
							...relationship,
							targetEntry: summaryOf(types, identifiers, relationship.target),
						}),
				),
			);
			entry.operations = Object.freeze(
				byIdentity((type.operations ?? []).filter(isObject)).map((operation) =>
					Object.freeze({
						identity: operation.identity,
						name: operation.name,
						params: Object.freeze(
							byIdentity((operation.params ?? []).filter(isObject)).map(
								(param) => fieldEntry(types, identifiers, param),
							),
						),
						returns: isObject(operation.returns)
							? Object.freeze({
									...operation.returns,
									element: summaryOf(
										types,
										identifiers,
										operation.returns.typeRef,
									),
								})
							: undefined,
						pre: Object.freeze([...(operation.pre ?? [])]),
						post: Object.freeze([...(operation.post ?? [])]),
						origin: operation.origin,
					}),
				),
			);
		}

		if (type.kind === "enum" || type.kind === "union") {
			entry.variants = Object.freeze(
				byIdentity((type.variants ?? []).filter(isObject)).map((variant) => {
					const rendered = {
						identity: variant.identity,
						name: variant.name,
						origin: variant.origin,
					};
					if (typeof variant.payloadType === "string") {
						rendered.payloadType = variant.payloadType;
						rendered.payload = summaryOf(
							types,
							identifiers,
							variant.payloadType,
						);
					}
					return Object.freeze(rendered);
				}),
			);
		}

		for (const member of ["target", "items", "values"]) {
			if (typeof type[member] === "string") {
				entry[member] = type[member];
				entry[`${member}Entry`] = summaryOf(types, identifiers, type[member]);
			}
		}

		// Clauses are carried so nothing in the document reaches the output
		// unrendered and undeclared; the target declares them lost (`loss.mjs`),
		// and a construct that is declared lost is still a construct the model
		// saw.
		entry.clauses = Object.freeze([...(type.clauses ?? [])]);
		return Object.freeze(entry);
	});

	return Object.freeze({
		contractVersion: document.contractVersion,
		source: document.source,
		package: document.package,
		types: Object.freeze(entries),
		typesByIdentity: Object.freeze(
			Object.fromEntries(entries.map((entry) => [entry.identity, entry])),
		),
		// Both are document-level and are rendered by FR-067 and by nothing else.
		// `conformance/bases/core-1-1.json` and `package-1-1.json` each carry one
		// of each, so a model that dropped them would drop real data under a
		// `fail` policy.
		occurrences: Object.freeze([...(document.occurrences ?? [])]),
		extensions: Object.freeze([...(document.extensions ?? [])]),
		/** Identifier collisions, in the entry shape `representability` returns. */
		losses: Object.freeze(collisions),
		backend: Object.freeze({
			identity:
				options.backendIdentity ??
				"ix://agent-ix/filament-core-data/backend/typescript",
			version: options.backendVersion ?? "1.0.0",
		}),
	});
}
