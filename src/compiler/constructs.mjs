/**
 * The contract 1.2.0 object-type constructs and model members (FR-141, FR-142).
 *
 * The one Node list of construct kinds, and the one reading of a construct's
 * members every backend renders from. The reader and every backend read the
 * kinds from here; the schema's `kind` enum and the Rust and Python copies are
 * held to it by a parity test.
 *
 * It imports only the diagnostic registry, so a backend may read it without
 * reaching the reader, the schema layer or the filesystem.
 */

import { DIAGNOSTIC_CODES, diagnostic } from "./diagnostics.mjs";

/** One construct kind per business object type, in schema order. */
export const CONSTRUCT_KINDS = Object.freeze([
	"entity",
	"value_object",
	"nested_entity",
	"aggregate_root",
	"enumeration",
	"event",
	"state_machine",
	"process",
	"repository",
	"domain",
]);

/**
 * The kinds rendered as a record-shaped data type: a `record`, and every
 * construct whose instances are values carrying fields (FR-142). A
 * `state_machine` carries its fields, which may be none, beside its states.
 */
export const RECORD_SHAPED_KINDS = Object.freeze([
	"record",
	"entity",
	"value_object",
	"nested_entity",
	"aggregate_root",
	"event",
	"process",
	"state_machine",
]);

/**
 * The construct kinds with no instance data: a `repository` is an interface
 * holding no state, and a `domain` is a namespace, not a data type (FR-142).
 * No backend renders a value type for either.
 */
export const INSTANCELESS_KINDS = Object.freeze(["repository", "domain"]);

/** The kinds that carry `identityFields` (FR-142). */
export const IDENTIFIED_KINDS = Object.freeze([
	"entity",
	"nested_entity",
	"aggregate_root",
	"process",
]);

/** Whether `kind` is rendered as a record-shaped type. */
export function isRecordShaped(kind) {
	return RECORD_SHAPED_KINDS.includes(kind);
}

/** Whether `kind` is rendered as a closed set of literals: `enum` or `enumeration`. */
export function isEnumerationShaped(kind) {
	return kind === "enum" || kind === "enumeration";
}

/** Whether `kind` has no instance data: `repository` or `domain`. */
export function isInstanceless(kind) {
	return INSTANCELESS_KINDS.includes(kind);
}

/** The constructs that carry relationships and operations as a record does. */
export const EDGE_KINDS = Object.freeze([
	"record",
	...CONSTRUCT_KINDS.filter((kind) => kind !== "enumeration"),
]);

const list = (value) => (Array.isArray(value) ? value : []);
const isObject = (value) =>
	value !== null && typeof value === "object" && !Array.isArray(value);

/** A type index by identity, for a caller that holds only the document. */
export function typeIndex(ir) {
	return new Map(
		list(ir?.types)
			.filter((type) => isObject(type) && typeof type.identity === "string")
			.map((type) => [type.identity, type]),
	);
}

/**
 * The transitive supertypes of `type`, nearest last in depth-first order, each
 * once. A supertype naming no declared type, and a cycle, are refused by the
 * readers before any backend runs (FR-141); here they are skipped so the
 * function stays total.
 */
function ancestorsOf(type, byIdentity) {
	const ordered = [];
	const seen = new Set([type?.identity]);
	const visit = (node) => {
		for (const identity of list(node?.supertypes)) {
			if (seen.has(identity)) continue;
			seen.add(identity);
			const supertype = byIdentity.get(identity);
			if (supertype === undefined) continue;
			visit(supertype);
			ordered.push(supertype);
		}
	};
	visit(type);
	return ordered;
}

/**
 * The abstract transitive supertypes of `type`, in `ancestorsOf` order. A
 * concrete subtype is an instance of each, so a backend states each as the
 * native abstract form the subtype implements (FR-141).
 */
export function abstractAncestors(type, byIdentity) {
	return ancestorsOf(type, byIdentity).filter((one) => one.abstract === true);
}

/**
 * The fields an instance of `type` carries (FR-141): every field its
 * supertypes declare, farthest supertype first, then its own, with each field
 * a later field `redefines` left out, since the redefining field narrows it
 * in its place. A field reached through two paths appears once.
 */
export function effectiveFields(type, byIdentity) {
	const declared = [
		...ancestorsOf(type, byIdentity).flatMap((one) => list(one.fields)),
		...list(type?.fields),
	].filter(isObject);
	const redefined = new Set(
		declared
			.map((field) => field.redefines)
			.filter((identity) => typeof identity === "string"),
	);
	const seen = new Set();
	return declared.filter((field) => {
		if (redefined.has(field.identity) || seen.has(field.identity)) return false;
		seen.add(field.identity);
		return true;
	});
}

/** Every field `type` and its supertypes declare, redefined or not, by identity. */
function fieldIndex(type, byIdentity) {
	return new Map(
		[type, ...ancestorsOf(type, byIdentity)]
			.flatMap((one) => list(one?.fields))
			.filter(isObject)
			.map((field) => [field.identity, field]),
	);
}

/**
 * The names of a construct's identity fields, in `identityFields` order, or
 * `undefined` for a kind that carries none. An identity field may name a
 * supertype's field. One naming no field is dropped here; the readers refuse
 * such a document before any backend runs (FR-142).
 */
export function identityFieldNames(type, byIdentity = new Map()) {
	if (!IDENTIFIED_KINDS.includes(type?.kind)) return undefined;
	const fields = fieldIndex(type, byIdentity);
	return list(type.identityFields)
		.map((identity) => fields.get(identity)?.name)
		.filter((name) => typeof name === "string");
}

/**
 * The rendering view of a document: every record-shaped type's `fields` is its
 * effective field list. A backend renders from the view, so a subtype's value
 * type carries its inherited fields; the supertypes and every member stay on
 * the type for the metadata the backend carries beside it. The document is not
 * mutated.
 */
export function renderingView(ir) {
	if (!isObject(ir) || !Array.isArray(ir.types)) return ir;
	const byIdentity = typeIndex(ir);
	return {
		...ir,
		types: ir.types.map((type) =>
			isObject(type) &&
			isRecordShaped(type.kind) &&
			list(type.supertypes).length > 0
				? { ...type, fields: effectiveFields(type, byIdentity) }
				: type,
		),
	};
}

/**
 * The construct members of one type, read into one plain shape every backend
 * renders (FR-142, FR-141): names where the member names a field, state,
 * operation or clause of the type, and type identities where it names a type.
 * A member the kind does not carry is absent. Returns `undefined` for a type
 * carrying no construct kind and no model member.
 */
export function constructOf(type, byIdentity = new Map()) {
	if (!isObject(type)) return undefined;
	const facts = {};
	const construct = CONSTRUCT_KINDS.includes(type.kind);
	if (construct) facts.kind = type.kind;
	const fields = fieldIndex(type, byIdentity);
	const fieldName = (identity) => fields.get(identity)?.name ?? identity;

	if (list(type.supertypes).length > 0) facts.supertypes = [...type.supertypes];
	if (type.abstract === true) facts.abstract = true;

	const identityFields = identityFieldNames(type, byIdentity);
	if (identityFields !== undefined) facts.identityFields = identityFields;
	if (type.kind === "nested_entity" && typeof type.owner === "string")
		facts.owner = type.owner;
	if (type.kind === "aggregate_root" || type.kind === "domain")
		facts.members = [...list(type.members)];
	if (type.kind === "event" && typeof type.occurrenceField === "string")
		facts.occurrenceField = fieldName(type.occurrenceField);
	if (type.kind === "value_object") facts.equality = "value";
	if (type.kind === "event") facts.immutable = true;
	if (type.kind === "state_machine") {
		const states = new Map(
			list(type.states).map((state) => [state.identity, state.name]),
		);
		const operations = new Map(
			list(type.operations).map((one) => [one.identity, one.name]),
		);
		facts.states = list(type.states).map((state) => state.name);
		facts.transitions = list(type.transitions).map((transition) => {
			const rendered = {
				identity: transition.identity,
				from: states.get(transition.from) ?? transition.from,
				to: states.get(transition.to) ?? transition.to,
				trigger: operations.get(transition.trigger) ?? transition.trigger,
				emits: [...list(transition.emits)],
			};
			if (typeof transition.guard === "string")
				rendered.guard = transition.guard;
			return rendered;
		});
	}
	if (type.kind === "process")
		facts.steps = list(type.steps).map((step) => ({
			identity: step.identity,
			name: step.name,
			stepKind: step.stepKind,
			consumes: [...list(step.consumes)],
			emits: [...list(step.emits)],
		}));
	if (type.kind === "repository") facts.persists = [...list(type.persists)];
	if (type.kind === "domain")
		facts.vocabulary = list(type.vocabulary).map((term) => ({
			term: term.term,
			doc: term.doc,
		}));

	const subsets = {};
	const redefines = {};
	for (const field of list(type.fields).filter(isObject)) {
		if (list(field.subsets).length > 0)
			subsets[field.name] = field.subsets.map(fieldName);
		if (typeof field.redefines === "string")
			redefines[field.name] = fieldName(field.redefines);
	}
	if (Object.keys(subsets).length > 0) facts.subsets = subsets;
	if (Object.keys(redefines).length > 0) facts.redefines = redefines;

	const contracts = {};
	for (const operation of list(type.operations).filter(isObject)) {
		const contract = operationContract(operation);
		if (contract !== undefined) contracts[operation.name] = contract;
	}
	if (Object.keys(contracts).length > 0) facts.operationContracts = contracts;

	return construct || Object.keys(facts).length > 0 ? facts : undefined;
}

/**
 * An operation's frame and inline clauses (FR-141), or `undefined` when it
 * carries none. An empty frame is kept: it states that the operation changes
 * nothing, which is a claim, not an absence.
 */
export function operationContract(operation) {
	const contract = {};
	if (isObject(operation?.frame))
		contract.frame = {
			modifies: [...list(operation.frame.modifies)],
			creates: [...list(operation.frame.creates)],
			deletes: [...list(operation.frame.deletes)],
		};
	for (const member of ["requires", "ensures"])
		if (list(operation?.[member]).length > 0)
			contract[member] = operation[member].map((clause) => ({
				language: clause.language,
				text: clause.text,
			}));
	return Object.keys(contract).length > 0 ? contract : undefined;
}

/**
 * The document's populations (FR-141), each a display name, identity and its
 * member type extents.
 */
export function populationsOf(ir) {
	return list(ir?.populations).map((population) => ({
		identity: population.identity,
		displayName: population.displayName,
		members: list(population.members).map((member) => ({
			typeRef: member.typeRef,
			extent: { ...member.extent },
		})),
	}));
}

/**
 * Every record-shaped type whose effective fields carry one name twice: an own
 * or inherited field named as another inherited field it does not redefine
 * (FR-141). A backend refuses each rather than keeping one field and dropping
 * the other, with a pointer to the type's `fields` and the repeated name.
 */
export function inheritedNameCollisions(ir) {
	const byIdentity = typeIndex(ir);
	const found = [];
	list(ir?.types).forEach((type, index) => {
		if (!isObject(type) || !isRecordShaped(type.kind)) return;
		if (list(type.supertypes).length === 0) return;
		const seen = new Set();
		for (const field of effectiveFields(type, byIdentity)) {
			if (seen.has(field.name))
				found.push({ pointer: `/types/${index}/fields`, name: field.name });
			seen.add(field.name);
		}
	});
	return found;
}

/**
 * The model members every backend carries as data and none enforces, each
 * with the issue that owns its enforcement (FR-142). Order is the order the
 * advisories are raised in.
 */
export const UNENFORCED_MEMBERS = Object.freeze([
	Object.freeze({
		member: "clauses",
		issue: "agent-ix/filament-core-data#159",
	}),
	Object.freeze({ member: "guards", issue: "agent-ix/filament-core-data#160" }),
	Object.freeze({
		member: "transitions",
		issue: "agent-ix/filament-core-data#161",
	}),
	Object.freeze({
		member: "subsets",
		issue: "agent-ix/filament-core-data#162",
	}),
	Object.freeze({ member: "frames", issue: "agent-ix/filament-core-data#163" }),
	Object.freeze({
		member: "populations",
		issue: "agent-ix/filament-core-data#164",
	}),
]);

/**
 * The pointer of the first occurrence of each unenforced member kind in a
 * contract 1.2.0 document, keyed by member kind; a kind the document never
 * declares is absent.
 */
export function unenforcedMemberPointers(ir) {
	const found = new Map();
	if (ir?.contractVersion !== "1.2.0") return found;
	const note = (member, pointer) => {
		if (!found.has(member)) found.set(member, pointer);
	};
	list(ir?.types).forEach((type, index) => {
		if (!isObject(type)) return;
		const at = `/ir/types/${index}`;
		if (list(type.clauses).length > 0) note("clauses", `${at}/clauses`);
		list(type.operations).forEach((operation, position) => {
			for (const member of ["requires", "ensures"])
				if (list(operation?.[member]).length > 0)
					note("clauses", `${at}/operations/${position}/${member}`);
			if (isObject(operation?.frame))
				note("frames", `${at}/operations/${position}/frame`);
		});
		list(type.transitions).forEach((transition, position) => {
			note("transitions", `${at}/transitions/${position}`);
			if (typeof transition?.guard === "string")
				note("guards", `${at}/transitions/${position}/guard`);
		});
		list(type.fields).forEach((field, position) => {
			if (list(field?.subsets).length > 0)
				note("subsets", `${at}/fields/${position}/subsets`);
		});
	});
	if (list(ir?.populations).length > 0) note("populations", "/ir/populations");
	return found;
}

/**
 * One non-blocking `CONSTRUCT_MEMBER_UNENFORCED` per unenforced member kind the
 * document declares: the backend carries the member as data and enforces
 * none of it, a declared loss named with its owning issue (FR-142).
 */
export function unenforcedMemberAdvisories(ir, backend) {
	const pointers = unenforcedMemberPointers(ir);
	return UNENFORCED_MEMBERS.filter(({ member }) => pointers.has(member)).map(
		({ member, issue }) =>
			diagnostic(DIAGNOSTIC_CODES.CONSTRUCT_MEMBER_UNENFORCED, {
				message: `${pointers.get(member)}: the ${backend} backend carries ${member} as data and enforces none (declared loss, ${issue})`,
			}),
	);
}
