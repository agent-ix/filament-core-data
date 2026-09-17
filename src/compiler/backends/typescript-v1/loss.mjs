/**
 * Target representability and declared loss for the TypeScript backend
 * (FR-068, Task-104).
 *
 * This is a *target-level* judgement and it is deliberately not an
 * admissibility answer. A document can be perfectly admissible against the
 * semantic contract and still carry a construct TypeScript has no
 * representation for; that is a refusal to generate, not a claim that the
 * document is invalid. Keeping the two apart is what stops target-specific loss
 * from leaking into the positional diagnostic comparison the conformance
 * harness runs, where an extra row fails the case.
 *
 * The committed `typescript` row of
 * `fixtures/semantic/v1/positive/target-contracts.json` sets
 * `unsupportedFeaturePolicy` to `fail`, so a declared loss emits zero files
 * rather than degrading the output. `contracts-v1.md` states the same rule for
 * every backend: "Unsupported features fail or use an explicitly approved lossy
 * target. They never degrade to `any`, generic maps, or empty models."
 *
 * Because a loss refuses, what counts as one matters, and the line this module
 * draws is between a construct the target cannot *represent* and one the target
 * does not *execute*. An operation, a clause, and a `representation` or
 * `migration` default are all rendered as ordinary readonly descriptor data by
 * `metadata.mjs`, exactly as a relationship, a role, a unit, an extension and an
 * occurrence are. Rendering a construct as data is not degrading it to `any`, a
 * generic map, or an empty model, so none of the three is a loss.
 *
 * That line was measured rather than argued. An earlier draft treated all three
 * as loss, and of the 70 corpus cases the admissibility reader accepts, **66
 * refused to generate** — 67 operation losses, 132 clause losses, 2
 * default-kind losses. A target contract under which almost no real document
 * can be generated is not a target contract a consumer could use, and the
 * defect was in the loss framing rather than in any of those documents.
 *
 * What remains is the case a loss exists for: a construct whose omission would
 * make the generated package *silently wrong* — a check the validator would
 * skip, or a value it would substitute. Two qualify. A `format` name this
 * backend implements no check for would become a check that quietly passes
 * everything. An ordering constraint on a `duration` subject would need a
 * comparison ISO-8601 does not define, and an invented one is a wrong answer
 * rather than a missing one.
 *
 * Nothing here imports the compiler's reader, its schema layer, its
 * applicability table, or anything under `conformance/`.
 */

/** The backend's own diagnostic namespace, distinct from the IR namespace. */
const TARGET = (name) => `agent-ix.typescript-backend.${name}`;

/**
 * The closed register of loss codes. Two prefixes, two registers, and neither
 * leaks into the other: an `agent-ix.semantic-ir.` code never appears here and
 * an `agent-ix.typescript-backend.` code never appears in an admissibility
 * answer.
 */
export const LOSS_CODES = Object.freeze({
	FORMAT_NOT_IMPLEMENTED: Object.freeze({
		code: TARGET("FORMAT_NOT_IMPLEMENTED"),
		severity: "error",
		blocking: true,
	}),
	DURATION_ORDER_NOT_REPRESENTABLE: Object.freeze({
		code: TARGET("DURATION_ORDER_NOT_REPRESENTABLE"),
		severity: "error",
		blocking: true,
	}),
	IDENTIFIER_COLLISION: Object.freeze({
		code: TARGET("IDENTIFIER_COLLISION"),
		severity: "error",
		blocking: true,
	}),
	ABSTRACT_TYPE_HELD: Object.freeze({
		code: TARGET("ABSTRACT_TYPE_HELD"),
		severity: "error",
		blocking: true,
	}),
});

/**
 * The constructs this target declares it cannot represent, as data, so a
 * reviewer counts them rather than reading for them.
 */
export const TARGET_LOSSES = Object.freeze([
	Object.freeze({
		construct: "format-constraint",
		code: LOSS_CODES.FORMAT_NOT_IMPLEMENTED.code,
		rationale:
			"a format name this backend implements no check for would otherwise become a silently skipped check",
	}),
	Object.freeze({
		construct: "duration-order",
		code: LOSS_CODES.DURATION_ORDER_NOT_REPRESENTABLE.code,
		rationale:
			"ISO-8601 designators admit no total order — P1M and P30D are not comparable without a calendar — so an ordering constraint on a duration subject is refused rather than answered by an invented comparison",
	}),
	Object.freeze({
		construct: "abstract-type-held",
		code: LOSS_CODES.ABSTRACT_TYPE_HELD.code,
		rationale:
			"an abstract type has no validator, since no instance is its own; a field, item, value, target or payload naming one would need a check that accepts every subtype, which the generated validators do not state",
	}),
]);

/**
 * The constructs an earlier draft declared lost and this one renders as data,
 * kept as a record so the reasoning survives the diff. Each is emitted by
 * `metadata.mjs` as a readonly descriptor; none refuses generation.
 */
export const RENDERED_NOT_LOST = Object.freeze([
	Object.freeze({
		construct: "operation",
		renderedAs:
			"a readonly operation descriptor carrying its identity, name, parameter descriptors, returns, and pre and post clause ids",
		rationale:
			"the generated package emits no executable function for an operation, and a descriptor is data rather than behaviour; refusing for one would refuse 67 operations across the corpus",
	}),
	Object.freeze({
		construct: "clause",
		renderedAs:
			"a readonly clause descriptor carrying its identity, language, clauseId, opaque text, and sourceSpan",
		rationale:
			"the IR itself never parses clause text and agent-ix/quire-contract-ir#52 owns clause semantics; carrying the text opaquely loses nothing",
	}),
	Object.freeze({
		construct: "identified-construct",
		renderedAs:
			"the rendering its shape selects, plus its identity field names in declared order in TYPE_IDENTITY_FIELDS and <Name>Equals comparing those fields",
		rationale:
			"an identified construct's instances are told apart by the identity fields: <Name>Equals holds exactly when every identity field is equal by canonical form, so two instances with equal identity fields are one instance",
	}),
	Object.freeze({
		construct: "construct-kinds",
		renderedAs:
			"a construct of the record, sequence or state_machine shape as a record interface with its validator; of the enumeration shape as a string literal union with its validator; of the interface shape as an interface of method signatures; of the namespace shape as no type; each with its members in the TYPE_ maps: TYPE_OWNER, TYPE_MEMBERS, TYPE_OCCURRENCE_FIELD, TYPE_EQUALITY, TYPE_IMMUTABLE, TYPE_STATES, TYPE_TRANSITIONS, TYPE_STEPS, TYPE_PERSISTS and TYPE_VOCABULARY",
		rationale:
			"a value construct's value equality and an identified construct's identity equality are <Name>Equals, an occurrence construct's immutability is its readonly members, and a state machine's states are <Name>State; the Quire meaning of clauses and guards is over instances, so the generated package carries it as data",
	}),
	Object.freeze({
		construct: "model-members",
		renderedAs:
			"a subtype's interface carrying its effective fields; an abstract type's interface with no validator; with TYPE_SUPERTYPES, TYPE_ABSTRACT, FIELD_SUBSETS, FIELD_REDEFINES, OPERATION_CONTRACTS and POPULATIONS in the identity module",
		rationale:
			"an interface is TypeScript's abstract form: no value validates as an abstract type, only as a subtype; TypeScript has no subset relation between properties, so subsets are carried as data; a redefined field is replaced in the subtype's interface, and an operation's frame and inline Quire clauses are text a consumer reads",
	}),
	Object.freeze({
		construct: "default-kind",
		renderedAs: "the field's defaultKind and defaultValue on its descriptor",
		rationale:
			"a representation or migration default is visible to a consumer even though the generated validator applies only a semantic one, which FR-066 already states",
	}),
]);

/**
 * The format names this backend implements a runtime check for. A `format`
 * constraint naming anything else is declared loss rather than a check that
 * quietly does nothing.
 */
export const IMPLEMENTED_FORMATS = Object.freeze([
	"agent-ix:uuid",
	"agent-ix:date",
	"agent-ix:date-time",
	"agent-ix:duration",
	"agent-ix:email",
	"agent-ix:uri",
]);

/**
 * The single named GAP-011 policy: whether an unresolvable `reference` target
 * is a defect.
 *
 * ADR-0009 settled it under `agent-ix/filament-core-data#59`:
 * `docs/semantic-data-system/contracts-v1.md` now applies its relationship
 * rule to a `reference`-kind definition's `target` too, and admits a declared
 * manifest import as a third resolving source for both kinds. A target
 * resolving to none of the three is refused.
 *
 * `strict` is that reading, and was already this backend's default because it
 * is what cases REF-001..004 pin. The ruling makes it normative rather than a
 * choice, so `open` is no longer a conforming setting;
 * `agent-ix/filament-core-data#52` retires it alongside the corpus move and the
 * `assurance` fixture repair, in the PR where a case can cover the removal.
 */
export const REFERENCE_POLICY = "strict";

/** Retained until #52 retires `open`; see the ruling above. */
export const REFERENCE_POLICIES = Object.freeze(["strict", "open"]);

function scalarOf(types, identity, seen = new Set()) {
	if (typeof identity !== "string" || seen.has(identity)) return undefined;
	seen.add(identity);
	const type = types.get(identity);
	if (type === undefined) return undefined;
	if (type.kind === "scalar") return type.scalar;
	if (type.kind === "alias" || type.kind === "reference") {
		return scalarOf(types, type.target, seen);
	}
	return undefined;
}

const ORDERING_KEYWORDS = new Set([
	"min",
	"max",
	"exclusiveMin",
	"exclusiveMax",
]);

/**
 * Every construct in `ir` that this target cannot represent, each naming the
 * owning type's identity and the construct.
 *
 * Pure: no clock, no environment, no filesystem, no network, and the argument
 * is not mutated.
 */
export function representability(ir, options = {}) {
	const losses = [];
	if (ir === null || typeof ir !== "object" || !Array.isArray(ir.types)) {
		return losses;
	}
	const formats = new Set(options.implementedFormats ?? IMPLEMENTED_FORMATS);
	const byIdentity = new Map();
	for (const type of ir.types) {
		if (type !== null && typeof type === "object") {
			byIdentity.set(type.identity, type);
		}
	}

	const record = (entry) => {
		losses.push(Object.freeze(entry));
	};

	for (const [index, type] of ir.types.entries()) {
		if (type === null || typeof type !== "object") continue;
		const owner = type.identity;

		// An `operation` and a `clause` are rendered as readonly descriptor data
		// by `metadata.mjs` and are deliberately not recorded here; see the
		// module header and `RENDERED_NOT_LOST`.

		for (const [position, constraint] of (type.constraints ?? []).entries()) {
			if (constraint === null || typeof constraint !== "object") continue;
			if (
				constraint.keyword === "format" &&
				!formats.has(constraint.operands?.name)
			) {
				record({
					code: LOSS_CODES.FORMAT_NOT_IMPLEMENTED.code,
					construct: "format-constraint",
					owner,
					pointer: `/ir/types/${index}/constraints/${position}/operands/name`,
					detail: constraint.operands?.name ?? null,
				});
			}
			if (
				ORDERING_KEYWORDS.has(constraint.keyword) &&
				scalarOf(byIdentity, constraint.appliesTo) === "duration"
			) {
				record({
					code: LOSS_CODES.DURATION_ORDER_NOT_REPRESENTABLE.code,
					construct: "duration-order",
					owner,
					pointer: `/ir/types/${index}/constraints/${position}/keyword`,
					detail: constraint.keyword,
				});
			}
		}

		// A value an abstract type names has no validator to check it (FR-141).
		const held = [
			...(type.fields ?? []).map((field, position) => [
				field?.typeRef,
				`/ir/types/${index}/fields/${position}/typeRef`,
			]),
			...(type.variants ?? []).map((variant, position) => [
				variant?.payloadType,
				`/ir/types/${index}/variants/${position}/payloadType`,
			]),
			...["target", "items", "values"].map((member) => [
				type.kind === "reference" ? undefined : type[member],
				`/ir/types/${index}/${member}`,
			]),
		];
		for (const [ref, pointer] of held) {
			if (byIdentity.get(ref)?.abstract !== true) continue;
			record({
				code: LOSS_CODES.ABSTRACT_TYPE_HELD.code,
				construct: "abstract-type-held",
				owner,
				pointer,
				detail: ref,
			});
		}

		// A `representation` or `migration` default is carried on the field's
		// descriptor by `metadata.mjs`; the generated validator applies only a
		// `semantic` one, which FR-066 states. Neither is a loss.
	}

	// `unknownPolicy` on a kind other than `record` is neither a loss nor a
	// defect: the committed bases carry a `union` at `surface` and a `map` at
	// `preserve`, and the policy has no rendering or validation effect there.
	// Recording that explicitly is cheaper than rediscovering it.
	return losses;
}

/** True when a model carrying these losses must refuse to generate. */
export function refusesGeneration(losses) {
	return losses.length > 0;
}
