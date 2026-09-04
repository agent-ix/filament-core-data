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
	OPERATION_NOT_REPRESENTABLE: Object.freeze({
		code: TARGET("OPERATION_NOT_REPRESENTABLE"),
		severity: "error",
		blocking: true,
	}),
	CLAUSE_NOT_REPRESENTABLE: Object.freeze({
		code: TARGET("CLAUSE_NOT_REPRESENTABLE"),
		severity: "error",
		blocking: true,
	}),
	FORMAT_NOT_IMPLEMENTED: Object.freeze({
		code: TARGET("FORMAT_NOT_IMPLEMENTED"),
		severity: "error",
		blocking: true,
	}),
	DEFAULT_KIND_NOT_REPRESENTABLE: Object.freeze({
		code: TARGET("DEFAULT_KIND_NOT_REPRESENTABLE"),
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
});

/**
 * The constructs this target declares it cannot represent, as data, so a
 * reviewer counts them rather than reading for them.
 */
export const TARGET_LOSSES = Object.freeze([
	Object.freeze({
		construct: "operation",
		code: LOSS_CODES.OPERATION_NOT_REPRESENTABLE.code,
		rationale:
			"the generated surface is data rather than behaviour; an operation has no rendering in a type declaration or a validator",
	}),
	Object.freeze({
		construct: "clause",
		code: LOSS_CODES.CLAUSE_NOT_REPRESENTABLE.code,
		rationale:
			"formal clause text is not parsed here; agent-ix/quire-contract-ir#52 owns clause semantics and the IR carries the text opaquely",
	}),
	Object.freeze({
		construct: "format-constraint",
		code: LOSS_CODES.FORMAT_NOT_IMPLEMENTED.code,
		rationale:
			"a format name this backend implements no check for would otherwise become a silently skipped check",
	}),
	Object.freeze({
		construct: "default-kind",
		code: LOSS_CODES.DEFAULT_KIND_NOT_REPRESENTABLE.code,
		rationale:
			"a representation or migration default is not a value the generated type can carry at generation time",
	}),
	Object.freeze({
		construct: "duration-order",
		code: LOSS_CODES.DURATION_ORDER_NOT_REPRESENTABLE.code,
		rationale:
			"ISO-8601 designators admit no total order — P1M and P30D are not comparable without a calendar — so an ordering constraint on a duration subject is refused rather than answered by an invented comparison",
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
 * `docs/semantic-data-system/contracts-v1.md` states a resolution rule for
 * *relationship* targets — "Relationship targets resolve to a document type or
 * a lock export" — and states none for the `target` of a `reference`-kind type
 * definition. `conformance/contract-gaps.json` GAP-011 records that, and its
 * own consequence text says the question lands here: "a generated-package
 * backend must decide whether to emit a type for a reference it cannot
 * resolve".
 *
 * `strict` is the corpus's published reading, which cases REF-001..004 pin. It
 * is the default because conforming to the published yardstick is not the same
 * act as ruling on the contract, and this backend does not rule. The GAP-011
 * row names `agent-ix/filament-core-data#9` as its owner and that issue is
 * closed, so no live ticket can settle it today;
 * `agent-ix/filament-core-data#59` records exactly that and asks for a live
 * owner.
 *
 * When an owner settles it, changing this backend to the settled reading is one
 * edit here and nowhere else.
 */
export const REFERENCE_POLICY = "strict";

/** The two settings the policy admits, so a third is a visible change. */
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

		for (const [position, operation] of (type.operations ?? []).entries()) {
			record({
				code: LOSS_CODES.OPERATION_NOT_REPRESENTABLE.code,
				construct: "operation",
				owner,
				pointer: `/ir/types/${index}/operations/${position}`,
				detail: operation?.name ?? null,
			});
		}

		for (const [position, clause] of (type.clauses ?? []).entries()) {
			record({
				code: LOSS_CODES.CLAUSE_NOT_REPRESENTABLE.code,
				construct: "clause",
				owner,
				pointer: `/ir/types/${index}/clauses/${position}`,
				detail: clause?.clauseId ?? null,
			});
		}

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

		for (const [position, field] of (type.fields ?? []).entries()) {
			if (field === null || typeof field !== "object") continue;
			if (
				field.defaultKind === "representation" ||
				field.defaultKind === "migration"
			) {
				record({
					code: LOSS_CODES.DEFAULT_KIND_NOT_REPRESENTABLE.code,
					construct: "default-kind",
					owner: field.identity ?? owner,
					pointer: `/ir/types/${index}/fields/${position}/defaultKind`,
					detail: field.defaultKind,
				});
			}
		}
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
