/**
 * The contract 2.0.0 construct declarations and model members (FR-141, FR-142).
 *
 * A construct kind is module data: a type's `kind` is `{module, name}`, and the
 * document's `constructs` table declares it by identity, shape and member
 * presence. Nothing here names a construct kind. The closed core vocabulary a
 * declaration is written in is read from
 * `schema/semantic/v1/construct-vocabulary.json`, and the core kinds from the
 * published schema, so neither is restated here. What a backend renders is
 * decided by the declaration: its shape selects the rendering, its identity the
 * equality, and the members it admits the construct members carried.
 *
 * A backend reaches a type's declaration through `declarationOf`, which reads
 * the binding `bindConstructs` records for each type object of a document;
 * `typeIndex` and `renderingView` bind the document they are given.
 */

import { createRequire } from "node:module";
import { DIAGNOSTIC_CODES, diagnostic } from "./diagnostics.mjs";

const require = createRequire(import.meta.url);
const VOCABULARY = require("../../schema/semantic/v1/construct-vocabulary.json");
const IR_SCHEMA = require("../../schema/semantic/v1/semantic-ir.schema.json");

function deepFreeze(value) {
	if (value !== null && typeof value === "object") {
		for (const item of Object.values(value)) deepFreeze(item);
		Object.freeze(value);
	}
	return value;
}

const list = (value) => (Array.isArray(value) ? value : []);
const isObject = (value) =>
	value !== null && typeof value === "object" && !Array.isArray(value);

/** The closed core vocabulary construct declarations are written in. */
export const CONSTRUCT_VOCABULARY = deepFreeze(
	JSON.parse(JSON.stringify(VOCABULARY)),
);

/** The core kinds: every `typeDefinition.kind` that is a string, in schema order. */
export const CORE_KINDS = Object.freeze([
	...IR_SCHEMA.$defs.typeDefinition.properties.kind.anyOf.find((branch) =>
		Array.isArray(branch.enum),
	).enum,
]);

const MEMBERS = new Map(
	CONSTRUCT_VOCABULARY.members.map((member) => [member.name, member]),
);
const RULES = new Map(
	CONSTRUCT_VOCABULARY.rules.map((rule) => [rule.name, rule]),
);
const FLAGS = new Map(
	list(CONSTRUCT_VOCABULARY.flags).map((flag) => [flag.name, flag]),
);

/** The rule `name` states, or `undefined` for a name the vocabulary omits. */
export function ruleOf(name) {
	return RULES.get(name);
}

/**
 * The type members a core kind requires by the published schema, which a core
 * type carries with its core meaning even where a construct declares a member
 * of the same name.
 */
const CORE_REQUIRED_MEMBERS = new Set(
	IR_SCHEMA.$defs.typeDefinition.allOf.flatMap((clause) =>
		list(clause.then?.required),
	),
);

/**
 * The rendering each shape selects, keyed by every shape of the vocabulary
 * (the parity test holds the keys to it): a record shape renders as a record,
 * an enumeration as a closed set of literals, an interface as operations with
 * no instance data, and a namespace as no data type at all. A state machine is
 * a record carrying its states.
 */
export const SHAPE_RENDERINGS = Object.freeze({
	record: "record",
	enumeration: "enum",
	interface: "interface",
	state_machine: "state_machine",
	sequence: "record",
	namespace: "namespace",
});

/**
 * The equality each identity selects, keyed by every identity of the
 * vocabulary: identified instances compare by their identity fields, values by
 * every field, and a construct declaring no identity declares no equality.
 */
export const IDENTITY_EQUALITIES = Object.freeze({
	identified: "identity",
	value: "value",
	none: undefined,
});

/**
 * The construct features a backend rendering every shape and identity of the
 * vocabulary declares: one per shape and one per identity, each prefixed.
 */
export function constructFeatures(prefix = "") {
	return [
		...CONSTRUCT_VOCABULARY.shapes.map((shape) => `${prefix}shape:${shape}`),
		...CONSTRUCT_VOCABULARY.identities.map((one) => `${prefix}identity:${one}`),
	];
}

/** Whether `kind` is a construct kind, `{module, name}`. */
export function isConstructKind(kind) {
	return isObject(kind);
}

/** The kind's name: a core kind, or a construct kind's `name`. */
export function kindName(kind) {
	if (typeof kind === "string") return kind;
	if (isObject(kind) && typeof kind.name === "string") return kind.name;
	return String(kind);
}

/** The kind as prose: a core kind, or `<module>/<name>`. */
export function kindLabel(kind) {
	if (isObject(kind)) return `${kind.module}/${kind.name}`;
	return String(kind);
}

/** The table key of a construct kind. */
function kindKey(kind) {
	return JSON.stringify([kind.module, kind.name]);
}

/** A JSON pointer token. */
function pointerToken(name) {
	return `/${String(name).replace(/~/g, "~0").replace(/\//g, "~1")}`;
}

/**
 * Reads a construct declaration, refusing at the first defect as the Rust
 * reader does: `{ declaration }`, or `{ pointer, message }` with the pointer
 * below the declaration.
 *
 * `declaration.members` and `declaration.references` are `Map`s in declaration
 * order; `presenceOf` and `rolesOf` read them with the vocabulary defaults.
 */
export function readDeclaration(value) {
	const refuse = (pointer, message) => ({ pointer, message });
	if (!isObject(value))
		return refuse("", "a construct declaration is an object");
	const allowed = [
		"identity",
		"shape",
		"members",
		"references",
		"rules",
		"meaning",
		...FLAGS.keys(),
	];
	for (const name of Object.keys(value))
		if (!allowed.includes(name))
			return refuse("", `the member ${name} is not one a declaration admits`);
	for (const name of ["identity", "shape", "members", "meaning"])
		if (!Object.hasOwn(value, name))
			return refuse("", `a required member ${name} is absent`);
	const term = (text, pointer, names, what) =>
		typeof text === "string" && names.includes(text)
			? undefined
			: refuse(pointer, `${what} is one of ${names.join(", ")}`);
	const identityDefect = term(
		value.identity,
		"/identity",
		CONSTRUCT_VOCABULARY.identities,
		"identity",
	);
	if (identityDefect) return identityDefect;
	const shapeDefect = term(
		value.shape,
		"/shape",
		CONSTRUCT_VOCABULARY.shapes,
		"shape",
	);
	if (shapeDefect) return shapeDefect;

	if (!isObject(value.members))
		return refuse("/members", "members is an object");
	const members = new Map();
	for (const [name, presence] of Object.entries(value.members)) {
		const at = `/members${pointerToken(name)}`;
		if (!MEMBERS.has(name))
			return refuse(
				at,
				`members names the core members only and ${name} is not one`,
			);
		const defect = term(
			presence,
			at,
			CONSTRUCT_VOCABULARY.presences,
			"a member presence",
		);
		if (defect) return defect;
		members.set(name, presence);
	}

	const references = new Map();
	if (Object.hasOwn(value, "references")) {
		if (!isObject(value.references))
			return refuse("/references", "references is an object");
		for (const [name, roles] of Object.entries(value.references)) {
			const at = `/references${pointerToken(name)}`;
			if (!Array.isArray(MEMBERS.get(name)?.referenceItems))
				return refuse(
					at,
					`references names core reference members only and ${name} is not one`,
				);
			if (!Array.isArray(roles) || roles.length === 0)
				return refuse(at, "a reference admits a non-empty list of roles");
			const read = [];
			for (const [position, role] of roles.entries()) {
				const itemAt = `${at}/${position}`;
				if (typeof role !== "string" || role.length === 0 || role === "*")
					return refuse(itemAt, "a role is a non-empty role name and not *");
				if (read.includes(role))
					return refuse(itemAt, `${name} admits the role ${role} once`);
				read.push(role);
			}
			references.set(name, Object.freeze(read));
		}
	}

	const rules = [];
	if (Object.hasOwn(value, "rules")) {
		if (!Array.isArray(value.rules))
			return refuse("/rules", "rules is an array");
		for (const [position, rule] of value.rules.entries()) {
			const at = `/rules/${position}`;
			const defect = term(rule, at, [...RULES.keys()], "a rule");
			if (defect) return defect;
			if (rules.includes(rule)) return refuse(at, `rules selects ${rule} once`);
			rules.push(rule);
		}
	}

	if (typeof value.meaning !== "string" || value.meaning.length === 0)
		return refuse("/meaning", "meaning is a non-empty Quire meaning id");

	const flags = {};
	for (const [name, flag] of FLAGS) {
		if (!Object.hasOwn(value, name)) {
			flags[name] = flag.default;
			continue;
		}
		if (typeof value[name] !== "boolean")
			return refuse(`/${name}`, `${name} is a boolean`);
		flags[name] = value[name];
	}

	const declaration = Object.freeze({
		identity: value.identity,
		shape: value.shape,
		members,
		references,
		rules: Object.freeze(rules),
		meaning: value.meaning,
		...flags,
	});
	for (const [pointer, term, requirements, selected] of [
		[
			"/identity",
			value.identity,
			CONSTRUCT_VOCABULARY.identityRequirements,
			"identity",
		],
		["/shape", value.shape, CONSTRUCT_VOCABULARY.shapeRequirements, "shape"],
	]) {
		for (const requirement of list(requirements)) {
			if (requirement[selected] !== term) continue;
			if (presenceOf(declaration, requirement.member) !== requirement.presence)
				return refuse(
					pointer,
					`a ${term} declaration requires ${requirement.member} to be ${requirement.presence}`,
				);
		}
	}
	for (const [position, rule] of rules.entries()) {
		const { member, presence } = RULES.get(rule);
		if (presenceOf(declaration, member) !== presence)
			return refuse(
				`/rules/${position}`,
				`the rule ${rule} requires ${member} to be ${presence}`,
			);
	}
	for (const member of references.keys())
		if (presenceOf(declaration, member) === "forbidden")
			return refuse(
				`/references${pointerToken(member)}`,
				`the reference ${member} is to a member the declaration forbids`,
			);
	return { declaration };
}

/** The presence of `member` in `declaration`: as listed, or the vocabulary default. */
export function presenceOf(declaration, member) {
	return declaration.members.get(member) ?? MEMBERS.get(member)?.default;
}

/** The roles `member` admits, when the declaration constrains it. */
export function rolesOf(declaration, member) {
	return declaration.references.get(member);
}

/**
 * The type members a core-kind type never carries: each member a declaration
 * forbids by default and no core kind requires.
 */
export function constructOnlyMembers() {
	return CONSTRUCT_VOCABULARY.members
		.filter(
			(member) =>
				member.default === "forbidden" &&
				!CORE_REQUIRED_MEMBERS.has(member.name),
		)
		.map((member) => member.name);
}

/**
 * The entries of reference member `member` of `type`: `[pointer, identity]`
 * for each named type. A member naming no type has none. The member names the
 * types itself when its `referenceItems` is empty; otherwise each listed
 * member of each item does, the item being each array entry, or the member
 * object itself.
 */
export function referenceEntries(type, typeAt, member) {
	const items = MEMBERS.get(member)?.referenceItems;
	if (!Array.isArray(items)) return [];
	const named = (value, at) => {
		if (typeof value === "string") return [[at, value]];
		return list(value).flatMap((entry, position) =>
			typeof entry === "string" ? [[`${at}/${position}`, entry]] : [],
		);
	};
	const memberAt = `${typeAt}/${member}`;
	const value = type?.[member];
	if (value === undefined) return [];
	if (items.length === 0) return named(value, memberAt);
	const entries = Array.isArray(value)
		? value.map((item, position) => [item, `${memberAt}/${position}`])
		: [[value, memberAt]];
	return entries.flatMap(([item, itemAt]) =>
		isObject(item)
			? items.flatMap((name) => named(item[name], `${itemAt}/${name}`))
			: [],
	);
}

/**
 * The document's construct table: each well-formed declaration by kind, the
 * first entry of a kind declared twice.
 */
export function constructTable(ir) {
	const table = new Map();
	for (const entry of list(ir?.constructs)) {
		if (!isObject(entry) || !isObject(entry.kind)) continue;
		const key = kindKey(entry.kind);
		if (table.has(key)) continue;
		const read = readDeclaration(entry.construct);
		if (read.declaration !== undefined) table.set(key, read.declaration);
	}
	return table;
}

/** The declaration each bound type object carries. */
const DECLARATIONS = new WeakMap();

/**
 * Binds every type of `ir` whose kind the construct table declares to its
 * declaration, and returns the table. A core-kind type is bound to nothing.
 */
export function bindConstructs(ir) {
	const table = constructTable(ir);
	for (const type of list(ir?.types)) {
		if (!isObject(type) || !isObject(type.kind)) continue;
		const declaration = table.get(kindKey(type.kind));
		if (declaration !== undefined) DECLARATIONS.set(type, declaration);
	}
	return table;
}

/** The declaration `node` is bound to, or `undefined` for a core kind. */
export function declarationOf(node) {
	return isObject(node) ? DECLARATIONS.get(node) : undefined;
}

/** Binds `target`, a copy or model entry of `source`, to `source`'s declaration. */
export function adoptDeclaration(target, source) {
	const declaration = declarationOf(source);
	if (declaration !== undefined && isObject(target))
		DECLARATIONS.set(target, declaration);
	return target;
}

/**
 * What `node` renders as: its core kind, or the rendering its construct's shape
 * selects (`SHAPE_RENDERINGS`). A construct kind no declaration binds renders
 * as nothing, and a backend refuses it.
 */
export function renderingOf(node) {
	const declaration = declarationOf(node);
	if (declaration !== undefined) return SHAPE_RENDERINGS[declaration.shape];
	return typeof node?.kind === "string" ? node.kind : undefined;
}

/** Whether `node` renders as a record-shaped type: a record, or a construct of a record shape. */
export function isRecordShaped(node) {
	const rendering = renderingOf(node);
	return rendering === "record" || rendering === "state_machine";
}

/** Whether `node` renders as a closed set of literals. */
export function isEnumerationShaped(node) {
	return renderingOf(node) === "enum";
}

/** Whether `node` has no instance data: an interface or a namespace construct. */
export function isInstanceless(node) {
	const rendering = renderingOf(node);
	return rendering === "interface" || rendering === "namespace";
}

/** The equality `node`'s construct declares: `identity`, `value`, or `undefined`. */
export function equalityOf(node) {
	const declaration = declarationOf(node);
	return declaration === undefined
		? undefined
		: IDENTITY_EQUALITIES[declaration.identity];
}

/** Whether `node`'s construct admits `member`: declared required or optional. */
export function admits(node, member) {
	const declaration = declarationOf(node);
	return (
		declaration !== undefined && presenceOf(declaration, member) !== "forbidden"
	);
}

/** A type index by identity, for a caller that holds only the document. */
export function typeIndex(ir) {
	bindConstructs(ir);
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
 * `undefined` for a type whose construct declares no identified instances. An
 * identity field may name a supertype's field. One naming no field is dropped
 * here; the readers refuse such a document before any backend runs (FR-142).
 */
export function identityFieldNames(type, byIdentity = new Map()) {
	if (equalityOf(type) !== "identity") return undefined;
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
 * mutated, and each view type keeps its type's declaration.
 */
export function renderingView(ir) {
	if (!isObject(ir) || !Array.isArray(ir.types)) return ir;
	const byIdentity = typeIndex(ir);
	return {
		...ir,
		types: ir.types.map((type) =>
			isObject(type) && isRecordShaped(type) && list(type.supertypes).length > 0
				? adoptDeclaration(
						{ ...type, fields: effectiveFields(type, byIdentity) },
						type,
					)
				: type,
		),
	};
}

/**
 * The construct members of one type, read into one plain shape every backend
 * renders (FR-142, FR-141): names where the member names a field, state,
 * operation or clause of the type, and type identities where it names a type.
 * A member the type's declaration forbids is absent. Returns `undefined` for a
 * type carrying no construct kind and no model member.
 */
export function constructOf(type, byIdentity = new Map()) {
	if (!isObject(type)) return undefined;
	const facts = {};
	const construct = declarationOf(type) !== undefined;
	if (construct) facts.kind = kindName(type.kind);
	const fields = fieldIndex(type, byIdentity);
	const fieldName = (identity) => fields.get(identity)?.name ?? identity;

	if (list(type.supertypes).length > 0) facts.supertypes = [...type.supertypes];
	if (type.abstract === true) facts.abstract = true;

	const identityFields = identityFieldNames(type, byIdentity);
	if (identityFields !== undefined) facts.identityFields = identityFields;
	if (admits(type, "owner") && typeof type.owner === "string")
		facts.owner = type.owner;
	if (admits(type, "members")) facts.members = [...list(type.members)];
	if (
		admits(type, "occurrenceField") &&
		typeof type.occurrenceField === "string"
	)
		facts.occurrenceField = fieldName(type.occurrenceField);
	if (equalityOf(type) === "value") facts.equality = "value";
	if (admits(type, "occurrenceField")) facts.immutable = true;
	if (admits(type, "states")) {
		facts.states = list(type.states).map((state) => state.name);
	}
	if (admits(type, "transitions")) {
		const states = new Map(
			list(type.states).map((state) => [state.identity, state.name]),
		);
		const operations = new Map(
			list(type.operations).map((one) => [one.identity, one.name]),
		);
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
	if (admits(type, "steps"))
		facts.steps = list(type.steps).map((step) => ({
			identity: step.identity,
			name: step.name,
			stepKind: step.stepKind,
			consumes: [...list(step.consumes)],
			emits: [...list(step.emits)],
		}));
	if (admits(type, "persists")) facts.persists = [...list(type.persists)];
	if (admits(type, "vocabulary"))
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
 * An operation's frame and the inline clauses of its `pre` and `post` (FR-141), or `undefined` when it
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
	for (const member of ["pre", "post"]) {
		const inline = list(operation?.[member]).filter(isObject);
		if (inline.length > 0)
			contract[member] = inline.map((clause) => ({
				language: clause.language,
				text: clause.text,
			}));
	}
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
		if (!isObject(type) || !isRecordShaped(type)) return;
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
 * contract 2.0.0 document, keyed by member kind; a kind the document never
 * declares is absent.
 */
export function unenforcedMemberPointers(ir) {
	const found = new Map();
	if (ir?.contractVersion !== "2.0.0") return found;
	const note = (member, pointer) => {
		if (!found.has(member)) found.set(member, pointer);
	};
	list(ir?.types).forEach((type, index) => {
		if (!isObject(type)) return;
		const at = `/ir/types/${index}`;
		if (list(type.clauses).length > 0) note("clauses", `${at}/clauses`);
		list(type.operations).forEach((operation, position) => {
			for (const member of ["pre", "post"])
				if (list(operation?.[member]).some(isObject))
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
