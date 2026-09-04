/**
 * The compatibility classifier (FR-051).
 *
 * The division of labour here is the whole design. Some differences are visible
 * in two IR documents — a field appeared, a bound narrowed, a variant went away
 * — and the diff computes those. Others are not in an IR document at all: a
 * profile's authority, a mapping's edit direction, a reserved Protobuf number, a
 * generated name, the constraint vocabulary itself. Those come in as declared
 * inputs, and when an input is absent the family is **omitted and named in
 * `requiredGates`** rather than classified. An absent input is a gap, never a
 * `patch`: reporting "no change" for something you could not look at is how a
 * breaking release gets promoted.
 */
import { canonicalize } from "../packages/canonical.mjs";
import { familyMap } from "../family-map.mjs";
import { fingerprintIr, normalizeIr } from "../ir/normalize.mjs";
import { V1_1_ADDED_NODES, readIrAsContract } from "./evolution.mjs";

/** Least restrictive to most; the ranking the issue #9 contract tests assert. */
export const DISPOSITION_RANK = Object.freeze([
	"patch",
	"additive",
	"conditional",
	"unknown",
	"breaking",
	"invalid",
]);

/** The families whose observations come from an input rather than from the IR. */
export const INPUT_FAMILIES = Object.freeze({
	profile: "profile documents",
	authority: "profile documents",
	mapping: "mapping documents",
	loss: "mapping documents",
	"protobuf-reservation": "a Protobuf reservation registry",
	"generated-api": "per-target dispositions",
	"constraint-vocabulary": "a declared constraint vocabulary",
	"kernel-scalar": "a declared kernel scalar library",
});

/** The observed-family to report-family map, read as data (FR-051-AC-2). */
export function familyMapping() {
	return familyMap();
}

function mostRestrictive(dispositions) {
	let worst = "patch";
	for (const disposition of dispositions) {
		if (
			DISPOSITION_RANK.indexOf(disposition) > DISPOSITION_RANK.indexOf(worst)
		) {
			worst = disposition;
		}
	}
	return worst;
}

function byIdentity(list) {
	const map = new Map();
	for (const entry of Array.isArray(list) ? list : []) {
		map.set(String(entry.identity), entry);
	}
	return map;
}

function typesOf(document) {
	return byIdentity(document?.types);
}

function same(left, right) {
	return canonicalize(left ?? null) === canonicalize(right ?? null);
}

/** Widening a scalar's domain is conditional; every other change to it breaks. */
const WIDENINGS = new Set(["integer>number", "date>datetime"]);

function scalarChange(before, after) {
	if (before === after) return undefined;
	return WIDENINGS.has(`${before}>${after}`) ? "conditional" : "breaking";
}

function multiplicityChange(before, after) {
	if (same(before, after)) return undefined;
	if (
		(before?.ordered ?? false) !== (after?.ordered ?? false) ||
		(before?.unique ?? false) !== (after?.unique ?? false)
	) {
		return "breaking";
	}
	const beforeUpper = before?.upper ?? Number.POSITIVE_INFINITY;
	const afterUpper = after?.upper ?? Number.POSITIVE_INFINITY;
	const widened =
		(after?.lower ?? 0) <= (before?.lower ?? 0) && afterUpper >= beforeUpper;
	return widened ? "additive" : "breaking";
}

/**
 * The disposition of an optional addition, given what the consumers say.
 *
 * Unknown evidence outranks a policy: a consumer nobody has evidence about is
 * not a consumer who preserves unknowns, and pretending otherwise is how a
 * silent break ships.
 */
function additionDisposition(consumerPolicies, evidence) {
	if (evidence === "unknown") return "unknown";
	const policies = Array.isArray(consumerPolicies) ? consumerPolicies : [];
	if (
		policies.some(
			(policy) =>
				policy.unknownExtensions === "reject" ||
				policy.unknownModules === "reject",
		)
	) {
		return "breaking";
	}
	if (evidence === "stale") return "conditional";
	return "additive";
}

/**
 * Classifies the difference between two semantic contracts.
 *
 * Every input beyond `old` and `new` is optional; each absent one removes the
 * families it feeds from the report and adds a named gate.
 */
export function diffSemanticContract(request) {
	const {
		old: before,
		new: after,
		consumerPolicies,
		consumerEvidenceStatus = "current",
		targetResults = {},
		profiles,
		mappings,
		reservations,
		vocabulary,
		generatedNames,
		observedLoss = {},
		retainedBridges = [],
	} = request;
	const map = familyMapping();
	const familyOf = (observed) =>
		Object.hasOwn(map, observed) ? map[observed] : undefined;
	const changes = [];
	const evidence = consumerEvidenceStatus;

	const record = (identity, observed, disposition, rationale) => {
		const mapped = familyOf(observed);
		if (!mapped) throw new TypeError(`unmapped observed family: ${observed}`);
		const perTarget = targetResults[identity] ?? targetResults["*"] ?? [];
		const entry = {
			identity,
			family: mapped.family,
			surface: mapped.surface,
			// Unknown evidence is a *floor*, never a substitute. Replacing a
			// disposition with `unknown` would relax `breaking` to `unknown`, which
			// ranks lower — less information making a release gate easier to pass
			// is the exact failure the vocabulary exists to prevent.
			disposition: mostRestrictive([
				disposition,
				...perTarget.map((item) => item.disposition),
				...(evidence === "unknown" ? ["unknown"] : []),
			]),
			rationale,
			affectedConsumers: (Array.isArray(consumerPolicies)
				? consumerPolicies
				: []
			).map((policy) => policy.consumer),
			targetResults: perTarget.map((item) => ({
				target: item.target,
				disposition: item.disposition,
			})),
		};
		changes.push(entry);
		return entry;
	};

	// ---- the envelope --------------------------------------------------------
	//
	// A contract-version uplift is *additive only when it adds nothing but the
	// declared nodes*, and the way to establish that is to project the new
	// document back to the old version and compare. Reporting each materialised
	// `multiplicity` as its own field change would classify the very revision
	// NFR-013 declares additive as breaking — the nodes did not change, the
	// contract's ability to express them did.
	//
	// A version uplift is *additive only when it adds nothing but the declared
	// nodes*, and the way to establish that is to project the new document back
	// and compare. When the projection matches, the type graph is compared
	// against the projection rather than skipped: an uplift that also renamed a
	// field must still report the rename, and it must not report every
	// materialised `multiplicity` as a change of its own.
	if (before?.contractVersion !== after?.contractVersion) {
		const projection = readIrAsContract(
			after,
			String(before?.contractVersion),
			{ dialect: String(before?.source?.dialect) },
		);
		const uplift =
			projection.document !== null &&
			normalizeIr(projection.document) === normalizeIr(before);
		record(
			String(after?.source?.identity ?? "ix://agent-ix/unknown/source"),
			"contract-version",
			uplift ? "additive" : "breaking",
			uplift
				? `contract ${before?.contractVersion} to ${after?.contractVersion} adds only ${V1_1_ADDED_NODES.join(", ")}; the projection back to ${before?.contractVersion} is byte-identical to the old document`
				: `contract version ${before?.contractVersion} to ${after?.contractVersion} carries changes beyond the declared additive nodes`,
		);
	}

	// ---- the type graph ------------------------------------------------------
	// When the versions differ the new document is compared against the *old
	// version's projection of itself*, so the members the uplift added are not
	// counted as changes while everything else still is.
	const comparisonSubject =
		before?.contractVersion !== after?.contractVersion
			? (readIrAsContract(after, String(before?.contractVersion), {
					dialect: String(before?.source?.dialect),
				}).document ?? after)
			: after;
	const oldTypes = typesOf(before);
	const newTypes = typesOf(comparisonSubject);
	const oldByName = new Map(
		[...oldTypes.values()].map((type) => [String(type.displayName), type]),
	);

	for (const [identity, type] of oldTypes) {
		if (newTypes.has(identity)) continue;
		const renamed = [...newTypes.values()].find(
			(candidate) =>
				String(candidate.displayName) === String(type.displayName) &&
				!oldTypes.has(String(candidate.identity)),
		);
		record(
			identity,
			renamed ? "identity" : "type",
			"breaking",
			renamed
				? `the stable identity of ${type.displayName} changed to ${renamed.identity}`
				: `the type ${type.displayName} was removed`,
		);
	}
	for (const [identity, type] of newTypes) {
		if (oldTypes.has(identity)) continue;
		if (oldByName.has(String(type.displayName))) continue;
		record(
			identity,
			"type",
			"additive",
			`the type ${type.displayName} was added`,
		);
	}

	for (const [identity, next] of newTypes) {
		const previous = oldTypes.get(identity);
		if (!previous) continue;

		if (previous.kind !== next.kind) {
			record(
				identity,
				"type",
				"breaking",
				`the structural kind changed from ${previous.kind} to ${next.kind}`,
			);
		} else {
			const scalar = scalarChange(previous.scalar, next.scalar);
			if (scalar) {
				record(
					identity,
					"type",
					scalar,
					`the scalar domain changed from ${previous.scalar} to ${next.scalar}`,
				);
			}
		}

		if (previous.unknownPolicy !== next.unknownPolicy) {
			const tightened =
				previous.unknownPolicy === "preserve" &&
				next.unknownPolicy === "reject";
			record(
				identity,
				"unknown-policy",
				tightened ? "breaking" : "conditional",
				`the unknown policy changed from ${previous.unknownPolicy} to ${next.unknownPolicy}`,
			);
		}

		diffFields(previous, next, record, consumerPolicies, evidence);
		diffVariants(previous, next, record, consumerPolicies, evidence);
		diffConstraints(previous, next, record);
		diffNodes(previous, next, record);

		if (!same(previous.roles ?? [], next.roles ?? [])) {
			record(identity, "type", "conditional", "the declared roles changed");
		}
		if (
			same(stripDocumentation(previous), stripDocumentation(next)) &&
			!same(previous, next)
		) {
			record(
				identity,
				"documentation",
				"patch",
				"only documentation changed; no semantic value moved",
			);
		}
	}

	// ---- families that come from declared inputs -----------------------------
	const requiredGates = [];
	if (profiles?.old && profiles?.new) {
		const gainedOmission = (profiles.new.allowedOmissions ?? []).filter(
			(identity) => !(profiles.old.allowedOmissions ?? []).includes(identity),
		);
		for (const identity of gainedOmission) {
			record(
				identity,
				"profile",
				"breaking",
				"the profile gained an allowed omission",
			);
		}
		// The inputs are *profile documents*, valid against `profile.schema.json`.
		if (profiles.old.editDirection !== profiles.new.editDirection) {
			record(
				profiles.new.identity,
				"mapping",
				"conditional",
				`edit direction changed from ${profiles.old.editDirection} to ${profiles.new.editDirection}`,
			);
		}
		if (profiles.old.authority !== profiles.new.authority) {
			record(
				profiles.new.identity,
				"authority",
				"breaking",
				`authority changed from ${profiles.old.authority} to ${profiles.new.authority}`,
			);
		}
	} else {
		requiredGates.push(
			`profile and authority families need ${INPUT_FAMILIES.profile}`,
		);
	}

	if (mappings?.old && mappings?.new) {
		// The inputs are *mapping documents*, valid against
		// `mapping.schema.json`, so the fields read here are the ones such a
		// document actually carries: the transformation's preservation level and
		// its declared omissions. Reading an invented shape would make the
		// classifier agree only with fixtures written to match it.
		const oldMappings = byIdentity(mappings.old);
		for (const [identity, next] of byIdentity(mappings.new)) {
			const previous = oldMappings.get(identity);
			if (!previous) continue;
			const before = previous.transformation ?? {};
			const now = next.transformation ?? {};
			if (before.kind !== now.kind || before.purity !== now.purity) {
				record(
					identity,
					"mapping",
					"conditional",
					`the transformation changed from ${before.kind}/${before.purity} to ${now.kind}/${now.purity}`,
				);
			}
			if ((before.preservation ?? null) !== (now.preservation ?? null)) {
				record(
					identity,
					"mapping",
					"conditional",
					`preservation changed from ${before.preservation ?? "none"} to ${now.preservation ?? "none"}`,
				);
			}
			// Declared loss is loss the consumer was told about. Which identities a
			// transformation *actually* drops is not something a mapping document
			// says — it is an observation, so it arrives as its own input. Reading
			// it out of the document would mean inventing a member the published
			// schema forbids, and then only fixtures written to match would pass.
			const dropped = observedLoss[identity] ?? [];
			const declared = new Set(now.omittedIdentities ?? []);
			const undeclared = dropped.filter((item) => !declared.has(item));
			if (undeclared.length > 0) {
				record(
					identity,
					"loss",
					"breaking",
					`loss is present and undeclared for ${undeclared.join(", ")}`,
				);
			}
		}
	} else {
		requiredGates.push(
			`mapping and loss families need ${INPUT_FAMILIES.mapping}`,
		);
	}

	if (reservations?.old && reservations?.new) {
		for (const entry of reservations.new.used ?? []) {
			if (!(reservations.old.reserved ?? []).includes(entry)) continue;
			record(
				reservations.new.identity,
				"protobuf-reservation",
				"invalid",
				`the reserved Protobuf entry ${entry} was reused`,
			);
		}
	} else {
		requiredGates.push(
			`the protobuf-reservation family needs ${INPUT_FAMILIES["protobuf-reservation"]}`,
		);
	}

	if (vocabulary?.old && vocabulary?.new) {
		diffVocabulary(vocabulary, record);
	} else {
		requiredGates.push(
			`the constraint-vocabulary and kernel-scalar families need ${INPUT_FAMILIES["constraint-vocabulary"]}`,
		);
	}

	if (generatedNames?.old && generatedNames?.new) {
		for (const [identity, name] of Object.entries(generatedNames.new)) {
			if (generatedNames.old[identity] === name) continue;
			record(
				identity,
				"generated-api",
				"patch",
				"a generated name changed with no semantic identity change",
			);
		}
	} else if (Object.keys(targetResults).length === 0) {
		requiredGates.push(
			`the generated-api family needs ${INPUT_FAMILIES["generated-api"]}`,
		);
	}

	// The report schema requires a non-empty `changes`. Two identical contracts
	// are a real outcome, so they are reported as one `patch` rather than as an
	// invalid report.
	if (changes.length === 0) {
		record(
			String(after?.source?.identity ?? "ix://agent-ix/unknown/source"),
			"documentation",
			"patch",
			"the two contracts have equal fingerprints",
		);
	}

	changes.sort((left, right) => {
		const identity =
			left.identity < right.identity
				? -1
				: left.identity > right.identity
					? 1
					: 0;
		if (identity !== 0) return identity;
		return left.rationale < right.rationale
			? -1
			: left.rationale > right.rationale
				? 1
				: 0;
	});

	return {
		contractVersion: "1.0.0",
		oldFingerprint: fingerprintIr(before),
		newFingerprint: fingerprintIr(after),
		consumerEvidenceStatus: evidence,
		changes,
		aggregateDisposition: mostRestrictive(
			changes.map((change) => change.disposition),
		),
		requiredGates: requiredGates.sort(),
		retainedBridges: [...retainedBridges].sort(),
	};
}

function stripDocumentation(type) {
	const copy = structuredClone(type);
	const strip = (node) => {
		if (!node || typeof node !== "object") return;
		if (Array.isArray(node.extensions)) {
			node.extensions = node.extensions.filter(
				(extension) => !String(extension.identity).endsWith("/ext/doc"),
			);
		}
	};
	strip(copy);
	for (const field of copy.fields ?? []) strip(field);
	return copy;
}

function diffFields(previous, next, record, consumerPolicies, evidence) {
	const before = byIdentity(previous.fields);
	const after = byIdentity(next.fields);
	for (const [identity, field] of before) {
		if (after.has(identity)) continue;
		record(
			identity,
			"field",
			"breaking",
			`the field ${field.name} was removed`,
		);
	}
	for (const [identity, field] of after) {
		if (before.has(identity)) continue;
		const required = field.presence === "required";
		record(
			identity,
			"field",
			required ? "breaking" : additionDisposition(consumerPolicies, evidence),
			required
				? `the required field ${field.name} was added`
				: `the optional field ${field.name} was added`,
		);
	}
	for (const [identity, field] of after) {
		const original = before.get(identity);
		if (!original) continue;
		const multiplicity = multiplicityChange(
			original.multiplicity,
			field.multiplicity,
		);
		if (multiplicity) {
			record(
				identity,
				"multiplicity",
				multiplicity,
				`multiplicity changed from ${canonicalize(original.multiplicity ?? null)} to ${canonicalize(field.multiplicity ?? null)}`,
			);
		}
		if ((original.unit ?? null) !== (field.unit ?? null)) {
			record(
				identity,
				"unit",
				"breaking",
				`the unit changed from ${original.unit ?? "none"} to ${field.unit ?? "none"}`,
			);
		}
		if (original.typeRef !== field.typeRef) {
			record(
				identity,
				"type",
				"breaking",
				`the field's type reference changed from ${original.typeRef} to ${field.typeRef}`,
			);
		}
		// Nullability and defaults are semantic values, and a change to either is
		// a change a consumer has to handle. Leaving them out let a field become
		// nullable under a `patch`.
		if ((original.nullable === true) !== (field.nullable === true)) {
			record(
				identity,
				"field",
				field.nullable === true ? "conditional" : "breaking",
				`the field became ${field.nullable === true ? "nullable" : "non-nullable"}`,
			);
		}
		if (
			original.defaultKind !== field.defaultKind ||
			!same(original.defaultValue, field.defaultValue)
		) {
			record(
				identity,
				"field",
				"conditional",
				`the default changed from ${original.defaultKind} to ${field.defaultKind}`,
			);
		}
		if ((original.presence ?? null) !== (field.presence ?? null)) {
			record(
				identity,
				"field",
				field.presence === "required" ? "breaking" : "additive",
				`presence changed from ${original.presence} to ${field.presence}`,
			);
		}
	}
}

function diffVariants(previous, next, record, consumerPolicies, evidence) {
	const kind = next.kind === "union" ? "union" : "enum";
	const before = byIdentity(previous.variants);
	const after = byIdentity(next.variants);
	for (const [identity, variant] of before) {
		if (after.has(identity)) continue;
		record(
			identity,
			kind,
			"breaking",
			`the variant ${variant.name} was removed`,
		);
	}
	for (const [identity, variant] of after) {
		const original = before.get(identity);
		if (original) {
			if (!same(original.payloadType ?? null, variant.payloadType ?? null)) {
				record(
					identity,
					kind,
					"breaking",
					`the variant payload changed from ${original.payloadType ?? "none"} to ${variant.payloadType ?? "none"}`,
				);
			}
			continue;
		}
		const policies = Array.isArray(consumerPolicies) ? consumerPolicies : [];
		const closed = policies.some(
			(policy) =>
				policy.unknownExtensions === "reject" ||
				policy.unknownModules === "reject",
		);
		record(
			identity,
			kind,
			kind === "enum"
				? closed
					? "breaking"
					: additionDisposition(consumerPolicies, evidence)
				: "additive",
			`the variant ${variant.name} was added`,
		);
	}
}

function diffConstraints(previous, next, record) {
	const before = byIdentity(previous.constraints);
	const after = byIdentity(next.constraints);
	for (const [identity, constraint] of before) {
		if (after.has(identity)) continue;
		record(
			identity,
			"constraint",
			"breaking",
			`the ${constraint.keyword} constraint was removed`,
		);
	}
	for (const [identity, constraint] of after) {
		const original = before.get(identity);
		if (!original) {
			record(
				identity,
				"constraint",
				"breaking",
				`the ${constraint.keyword} constraint was added`,
			);
			continue;
		}
		if (same(original.operands, constraint.operands)) {
			if (!same(original, constraint)) {
				record(
					identity,
					"constraint",
					"patch",
					"the constraint changed with no semantic operand change",
				);
			}
			continue;
		}
		record(
			identity,
			"constraint",
			"breaking",
			`the ${constraint.keyword} operands changed`,
		);
	}
}

function diffNodes(previous, next, record) {
	for (const [key, observed] of [
		["relationships", "relationship"],
		["operations", "operation"],
		["clauses", "clause"],
	]) {
		const before = byIdentity(previous[key]);
		const after = byIdentity(next[key]);
		for (const [identity] of before) {
			if (after.has(identity)) continue;
			record(identity, observed, "breaking", `a ${observed} was removed`);
		}
		for (const [identity, node] of after) {
			const original = before.get(identity);
			if (!original) {
				record(identity, observed, "additive", `a ${observed} was added`);
				continue;
			}
			if (same(original, node)) continue;
			record(identity, observed, "breaking", `a ${observed} changed`);
		}
	}
}

function diffVocabulary(vocabulary, record) {
	const identity =
		vocabulary.identity ?? "ix://agent-ix/filament-core-data/vocabulary";
	const oldKeywords = new Set(vocabulary.old.constraintKeywords ?? []);
	const newKeywords = new Set(vocabulary.new.constraintKeywords ?? []);
	for (const keyword of oldKeywords) {
		if (newKeywords.has(keyword)) continue;
		record(
			identity,
			"constraint-vocabulary",
			"breaking",
			`the keyword ${keyword} was removed`,
		);
	}
	for (const keyword of newKeywords) {
		if (oldKeywords.has(keyword)) continue;
		record(
			identity,
			"constraint-vocabulary",
			"additive",
			`the keyword ${keyword} was added`,
		);
	}
	for (const [keyword, operands] of Object.entries(
		vocabulary.new.operands ?? {},
	)) {
		const original = (vocabulary.old.operands ?? {})[keyword];
		if (original === undefined || same(original, operands)) continue;
		record(
			identity,
			"constraint-vocabulary",
			"breaking",
			`the operands of ${keyword} were retyped`,
		);
	}
	const oldScalars = new Map(
		Object.entries(vocabulary.old.kernelScalars ?? {}),
	);
	const newScalars = new Map(
		Object.entries(vocabulary.new.kernelScalars ?? {}),
	);
	for (const [name] of oldScalars) {
		if (newScalars.has(name)) continue;
		record(
			identity,
			"kernel-scalar",
			"breaking",
			`the kernel scalar ${name} was removed`,
		);
	}
	for (const [name, representation] of newScalars) {
		if (!oldScalars.has(name)) {
			record(
				identity,
				"kernel-scalar",
				"additive",
				`the kernel scalar ${name} was added`,
			);
			continue;
		}
		if (same(oldScalars.get(name), representation)) continue;
		record(
			identity,
			"kernel-scalar",
			"breaking",
			`the kernel scalar ${name} was re-represented`,
		);
	}
}
