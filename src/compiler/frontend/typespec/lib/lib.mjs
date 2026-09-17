/**
 * Implementations of the Agent IX semantic decorator vocabulary (FR-053).
 *
 * A decorator here does two things and no more: it validates its own arguments
 * against the declared pattern, at its own source location, and it records the
 * value in a program state map. It never computes an IR value — that is the
 * lowering's job — so the vocabulary stays readable as a list of what a package
 * may say rather than as a second implementation of the compiler.
 *
 * Argument defects are collected rather than thrown, because a defect in a
 * compiled input is a diagnostic and never an exception (FR-045).
 */

export const STATE = {
	role: Symbol.for("agent-ix.semantic.role"),
	unknownPolicy: Symbol.for("agent-ix.semantic.unknownPolicy"),
	unit: Symbol.for("agent-ix.semantic.unit"),
	multiplicity: Symbol.for("agent-ix.semantic.multiplicity"),
	collection: Symbol.for("agent-ix.semantic.collection"),
	defaultKind: Symbol.for("agent-ix.semantic.defaultKind"),
	identityField: Symbol.for("agent-ix.semantic.identityField"),
	decimal: Symbol.for("agent-ix.semantic.decimal"),
	presence: Symbol.for("agent-ix.semantic.presence"),
	relationship: Symbol.for("agent-ix.semantic.relationship"),
	operations: Symbol.for("agent-ix.semantic.operations"),
	pre: Symbol.for("agent-ix.semantic.pre"),
	post: Symbol.for("agent-ix.semantic.post"),
	clause: Symbol.for("agent-ix.semantic.clause"),
	semanticReference: Symbol.for("agent-ix.semantic.semanticReference"),
	semanticExtension: Symbol.for("agent-ix.semantic.semanticExtension"),
	/** Argument defects, and the second application of a single-valued decorator. */
	defects: Symbol.for("agent-ix.semantic.defects"),
	/** Where each application was written, so a defect can be reported there. */
	loci: Symbol.for("agent-ix.semantic.loci"),
};

/** The declared argument patterns (FR-053). */
export const PATTERNS = {
	namespacedName: /^[a-z0-9][a-z0-9.-]*:[a-zA-Z0-9][a-zA-Z0-9._-]*$/,
	identifier: /^[A-Za-z_][A-Za-z0-9_]*$/,
	semanticIdentity:
		/^ix:\/\/[a-z0-9][a-z0-9._-]*\/[A-Za-z0-9][A-Za-z0-9._~:/-]*$/,
	unitSymbol: /^[!-~]+$/,
	semver:
		/^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/,
	clauseLanguage:
		/^(quire|ocl|sysml|fretish|[a-z0-9][a-z0-9.-]*:[A-Za-z0-9][A-Za-z0-9._-]*)$/,
};

export const UNKNOWN_POLICIES = ["preserve", "reject", "surface"];
export const DEFAULT_KINDS = ["semantic", "representation", "migration"];
export const PRESENCES = ["required", "optional"];
export const EDGE_CATEGORIES = [
	"structural",
	"behavioral",
	"dataflow",
	"dependency",
	"realization",
	"governance",
	"traceability",
];

/** Decorators a declaration may carry more than once. */
export const REPEATABLE = new Set([
	"role",
	"relationship",
	"pre",
	"post",
	"clause",
	"semanticExtension",
]);

function defects(program) {
	const map = program.stateMap(STATE.defects);
	const list = map.get("all") ?? [];
	map.set("all", list);
	return list;
}

/** Records where an application was written, keyed by target and decorator name. */
function noteLocus(context, target, name, index = 0) {
	const map = context.program.stateMap(STATE.loci);
	const byTarget = map.get(target) ?? {};
	const key = `${name}#${index}`;
	byTarget[key] = context.decoratorTarget ?? target;
	map.set(target, byTarget);
}

function reject(context, target, name, parameter, expected, value) {
	defects(context.program).push({
		kind: "argument",
		decorator: name,
		parameter,
		expected,
		value: String(value),
		target,
		node: context.decoratorTarget,
	});
}

function single(context, target, name, key, value) {
	const map = context.program.stateMap(key);
	if (map.has(target)) {
		defects(context.program).push({
			kind: "duplicate",
			decorator: name,
			target,
			node: context.decoratorTarget,
			first: map.get(target)?.node,
		});
		return;
	}
	map.set(target, { ...value, node: context.decoratorTarget });
}

function repeat(context, target, key, value) {
	const map = context.program.stateMap(key);
	const list = map.get(target) ?? [];
	list.push({ ...value, node: context.decoratorTarget });
	map.set(target, list);
}

function check(context, target, name, parameter, pattern, value) {
	if (
		pattern instanceof RegExp
			? pattern.test(String(value))
			: pattern.includes(value)
	) {
		return true;
	}
	reject(
		context,
		target,
		name,
		parameter,
		pattern instanceof RegExp ? pattern.source : pattern.join(" | "),
		value,
	);
	return false;
}

const decorators = {
	role(context, target, name) {
		if (!check(context, target, "@role", "name", PATTERNS.namespacedName, name))
			return;
		repeat(context, target, STATE.role, { name });
		noteLocus(context, target, "role");
	},

	unknownPolicy(context, target, policy) {
		if (
			!check(
				context,
				target,
				"@unknownPolicy",
				"policy",
				UNKNOWN_POLICIES,
				policy,
			)
		)
			return;
		single(context, target, "@unknownPolicy", STATE.unknownPolicy, { policy });
	},

	unit(context, target, symbol) {
		if (!check(context, target, "@unit", "symbol", PATTERNS.unitSymbol, symbol))
			return;
		single(context, target, "@unit", STATE.unit, { symbol });
	},

	multiplicity(context, target, lower, upper) {
		if (!Number.isInteger(lower) || lower < 0) {
			reject(
				context,
				target,
				"@multiplicity",
				"lower",
				"a non-negative integer",
				lower,
			);
			return;
		}
		if (upper !== undefined && (!Number.isInteger(upper) || upper < 0)) {
			reject(
				context,
				target,
				"@multiplicity",
				"upper",
				"a non-negative integer",
				upper,
			);
			return;
		}
		single(context, target, "@multiplicity", STATE.multiplicity, {
			lower,
			upper,
		});
	},

	collection(context, target, ordered, unique) {
		single(context, target, "@collection", STATE.collection, {
			ordered,
			unique,
		});
	},

	defaultKind(context, target, kind) {
		if (!check(context, target, "@defaultKind", "kind", DEFAULT_KINDS, kind))
			return;
		single(context, target, "@defaultKind", STATE.defaultKind, { kind });
	},

	identityField(context, target) {
		single(context, target, "@identityField", STATE.identityField, {
			identity: true,
		});
	},

	decimal(context, target, precision, scale) {
		if (!Number.isInteger(precision) || precision < 1) {
			reject(
				context,
				target,
				"@decimal",
				"precision",
				"an integer >= 1",
				precision,
			);
			return;
		}
		if (!Number.isInteger(scale) || scale < 0) {
			reject(context, target, "@decimal", "scale", "an integer >= 0", scale);
			return;
		}
		single(context, target, "@decimal", STATE.decimal, { precision, scale });
	},

	presence(context, target, presence) {
		if (!check(context, target, "@presence", "presence", PRESENCES, presence))
			return;
		single(context, target, "@presence", STATE.presence, { presence });
	},

	relationship(
		context,
		target,
		verb,
		category,
		targetIdentity,
		lower,
		upper,
		composite,
	) {
		let ok = check(
			context,
			target,
			"@relationship",
			"verb",
			PATTERNS.identifier,
			verb,
		);
		ok =
			check(
				context,
				target,
				"@relationship",
				"category",
				EDGE_CATEGORIES,
				category,
			) && ok;
		ok =
			check(
				context,
				target,
				"@relationship",
				"targetIdentity",
				PATTERNS.semanticIdentity,
				targetIdentity,
			) && ok;
		if (!ok) return;
		repeat(context, target, STATE.relationship, {
			verb,
			category,
			targetIdentity,
			lower,
			upper,
			composite,
		});
	},

	operations(context, target, owner) {
		if (
			!check(
				context,
				target,
				"@operations",
				"owner",
				PATTERNS.identifier,
				owner,
			)
		)
			return;
		single(context, target, "@operations", STATE.operations, { owner });
	},

	pre(context, target, clauseId) {
		if (
			!check(context, target, "@pre", "clauseId", PATTERNS.identifier, clauseId)
		)
			return;
		repeat(context, target, STATE.pre, { clauseId });
	},

	post(context, target, clauseId) {
		if (
			!check(
				context,
				target,
				"@post",
				"clauseId",
				PATTERNS.identifier,
				clauseId,
			)
		)
			return;
		repeat(context, target, STATE.post, { clauseId });
	},

	clause(context, target, language, clauseId, text) {
		let ok = check(
			context,
			target,
			"@clause",
			"language",
			PATTERNS.clauseLanguage,
			language,
		);
		ok =
			check(
				context,
				target,
				"@clause",
				"clauseId",
				PATTERNS.identifier,
				clauseId,
			) && ok;
		if (!ok) return;
		repeat(context, target, STATE.clause, { language, clauseId, text });
	},

	semanticReference(context, target, targetIdentity) {
		if (
			!check(
				context,
				target,
				"@semanticReference",
				"targetIdentity",
				PATTERNS.semanticIdentity,
				targetIdentity,
			)
		) {
			return;
		}
		single(context, target, "@semanticReference", STATE.semanticReference, {
			targetIdentity,
		});
	},

	semanticExtension(context, target, identity, version, required, payloadJson) {
		let ok = check(
			context,
			target,
			"@semanticExtension",
			"identity",
			PATTERNS.semanticIdentity,
			identity,
		);
		ok =
			check(
				context,
				target,
				"@semanticExtension",
				"version",
				PATTERNS.semver,
				version,
			) && ok;
		let payload;
		try {
			payload = JSON.parse(payloadJson);
		} catch {
			reject(
				context,
				target,
				"@semanticExtension",
				"payloadJson",
				"valid JSON",
				payloadJson,
			);
			ok = false;
		}
		if (!ok) return;
		repeat(context, target, STATE.semanticExtension, {
			identity,
			version,
			required,
			payload,
		});
	},
};

export const $decorators = { "AgentIx.Semantic.Decorators": decorators };

/** The vocabulary, as data, so a test can assert the library declares no sixteenth. */
export const VOCABULARY = Object.freeze(Object.keys(decorators).sort());
