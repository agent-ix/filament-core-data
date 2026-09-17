/**
 * The IR-surface compatibility classification (FR-069).
 *
 * A backend that regenerates a package needs to know whether the regeneration
 * is a patch, an addition, or a break, or the generated package's own version
 * number is guesswork. That the conformance corpus also asks for the answer is
 * what makes it checkable.
 *
 * This is a second implementation beside `src/compiler/compat/diff.mjs`,
 * deliberately. It imports neither that module nor anything under
 * `conformance/`. The rules are read from the normative document
 * `docs/semantic-data-system/compatibility.md` (ARCH-008) and from the
 * Compatibility section of `docs/semantic-data-system/contracts-v1.md`. Each
 * rule below names the clause it comes from, because a rule with no clause
 * behind it is an invention and this classifier is judged against a yardstick
 * it may not read.
 *
 * The `unknown` fallback is load-bearing and is implemented as a *residue*
 * comparison rather than as an afterthought: every member a rule examines is
 * masked out of both documents, and anything that still differs is `unknown`.
 * That way a construct nobody thought about cannot pass as compatible, which is
 * the one direction `CLASSIFICATION_ORDER` makes dangerous — `unknown` sits
 * below `breaking`, so an unmodelled break would aggregate less restrictively
 * than the published policy requires.
 */

import { canonicalize, normalizeIr } from "./canonical.mjs";

/**
 * Least restrictive last: patch, additive, conditional, unknown, breaking,
 * invalid, the same ranking `diffSemanticContract`'s `DISPOSITION_RANK` uses.
 * This is that list reversed, so index 0 is the most restrictive and
 * `moreRestrictive` is a minimum over indices.
 */
export const CLASSIFICATION_ORDER = Object.freeze([
	"invalid",
	"breaking",
	"unknown",
	"conditional",
	"additive",
	"patch",
]);

/**
 * The change kinds this classifier models, as declared data.
 *
 * FR-069 makes this list part of what the corpus agreement tests: because a
 * change the rules do not model becomes `unknown`, the *boundary* of this list
 * is observable. A backend that models one kind more than the oracle turns an
 * `unknown` verdict into a specific one and diverges — a better implementation
 * failing the gate. FR-069-CON-7 therefore forbids narrowing this list to make
 * a case agree; a divergence is reported instead.
 */
export const MODELLED_CHANGES = Object.freeze([
	"package-identity-changed",
	"package-provenance-changed",
	"source-identity-changed",
	"source-provenance-changed",
	"type-added",
	"type-removed",
	"type-kind-changed",
	"type-representation-changed",
	"type-display-name-changed",
	"type-unknown-policy-tightened",
	"type-unknown-policy-changed",
	"type-origin-changed",
	"field-added-required",
	"field-added-optional",
	"field-removed",
	"field-became-required",
	"field-became-optional",
	"field-nullability-changed",
	"field-default-changed",
	"field-unit-changed",
	"field-name-changed",
	"field-type-ref-retargeted",
	"field-type-ref-rerepresented",
	"field-cardinality-changed",
	"field-collection-flags-changed",
	"field-origin-changed",
	"variant-added",
	"variant-removed",
	"variant-payload-changed",
	"variant-name-changed",
	"relationship-added",
	"relationship-removed",
	"relationship-changed",
	"operation-added",
	"operation-removed",
	"operation-changed",
	"constraint-added",
	"constraint-removed",
	"constraint-operands-changed",
	"extension-added-required",
	"extension-added-optional",
	"extension-removed",
	"extension-changed",
]);

/**
 * How the addition of an enum or union variant classifies, and the one place in
 * this module that decides it.
 *
 * `docs/semantic-data-system/compatibility.md` is the cited authority and it is
 * literal: "An **enum** addition is additive only for open-enum consumers.
 * Closed generated enums require an unknown variant or coordinated breaking
 * release", and its change-class table names "closed-enum expansion" under
 * **Breaking**. That document declares three classes — patch, additive and
 * breaking — and `conditional` is not one of them, so softening a closed-enum
 * expansion into something a consumer may ignore is a reading the authority
 * does not carry. Under `"contract"` this module therefore answers `additive`
 * where a consumer policy admits unknown members and `breaking` where none
 * does.
 *
 * The conformance corpus reads the same change as `conditional` with no policy,
 * citing `contracts-v1.md`'s weaker "Open/closed enum behavior is consumer
 * policy, not a language default", which states who decides and not what the
 * answer is when nobody has.
 *
 * The disagreement was measured rather than predicted. Under `"contract"` the
 * corpus cases `ENUM-004` and `UNION-004` — both on the base `core-1-1`, which
 * carries no consumer policy — answer `breaking` against an expected
 * `conditional`, and the compatibility family is 22 of 24. Under `"corpus"`
 * both answer `conditional` and the family is 24 of 24. No other case's answer
 * moves between the two settings.
 *
 * The default is **conformance with the corpus's published reading, not a
 * ruling on the contract**, for one reason: FR-070 forbids this work from editing a
 * corpus case, a base, the oracle, the harness or the divergence register, and
 * NFR-025 makes every one of those a prohibited path. A backend that moved the
 * yardstick it is judged against would have arranged its own verdict, which
 * `conformance/README.md` names as the thing the corpus exists to prevent. So
 * the disagreement is reported to the corpus's owner instead, and when
 * `ENUM-004` and `UNION-004` move under a `corpus-defect` verdict and a major
 * `corpusVersion` bump, this backend follows by one edit here and nowhere else.
 */
export const VARIANT_ADDITION_POLICY = "corpus";

/** The two settings the policy admits, so a third is a visible change. */
export const VARIANT_ADDITION_POLICIES = Object.freeze(["corpus", "contract"]);

const RANK = new Map(
	CLASSIFICATION_ORDER.map((value, index) => [value, index]),
);

/** The more restrictive of two classifications. */
export function moreRestrictive(left, right) {
	const leftRank = RANK.has(left) ? RANK.get(left) : RANK.get("unknown");
	const rightRank = RANK.has(right) ? RANK.get(right) : RANK.get("unknown");
	return CLASSIFICATION_ORDER[Math.min(leftRank, rightRank)];
}

/** Code-unit ordering. Never `localeCompare`, which reads the host's collator. */
function compareCodeUnits(left, right) {
	if (left === right) return 0;
	return left < right ? -1 : 1;
}

/**
 * Whether a consumer policy admits members it does not know about.
 *
 * ARCH-008: "Optional additions are additive only when every target and known
 * consumer preserves, ignores, or surfaces them as declared." So an addition is
 * `additive` only where a policy says so, and `conditional` — conditional on a
 * consumer nobody has asked — where none does.
 */
function admitsUnknown(consumerPolicy) {
	if (consumerPolicy === null || typeof consumerPolicy !== "object") {
		return false;
	}
	return (
		consumerPolicy.unknownExtensions === "preserve" ||
		consumerPolicy.unknownExtensions === "surface"
	);
}

function isObject(value) {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Byte equality of two members, where either may be absent.
 *
 * The values are wrapped before canonicalization because `canonicalize` refuses
 * `undefined` outright — a document cannot contain it — while a *member* of a
 * document legitimately can be missing. Wrapping turns the distinction into the
 * one JCS already makes: an `undefined`-valued key is dropped and a `null`-valued
 * one is not, so an absent member and a `null` member do not compare equal.
 */
function sameBytes(left, right) {
	return (
		canonicalize({ value: left }, { sets: false }) ===
		canonicalize({ value: right }, { sets: false })
	);
}

/** Index an array of identified nodes by `identity`, keeping the position. */
function byIdentity(nodes) {
	const index = new Map();
	if (!Array.isArray(nodes)) return index;
	nodes.forEach((node, position) => {
		if (isObject(node) && typeof node.identity === "string") {
			if (!index.has(node.identity))
				index.set(node.identity, { node, position });
		}
	});
	return index;
}

/**
 * Resolve a type reference through alias chains to its representation, so that a
 * field re-pointed at an alias of the type it already had can be told apart
 * from one re-pointed at a different type. Terminates on a cycle.
 */
function resolveRepresentation(types, identity) {
	const seen = new Set();
	let current = identity;
	while (typeof current === "string" && !seen.has(current)) {
		seen.add(current);
		const entry = types.get(current);
		if (entry === undefined) return { kind: "unresolved", scalar: null };
		const node = entry.node;
		if (node.kind === "alias") {
			current = node.target;
			continue;
		}
		return {
			kind: node.kind ?? null,
			scalar: node.scalar ?? null,
			target: node.target ?? null,
			items: node.items ?? null,
			values: node.values ?? null,
		};
	}
	return { kind: "cyclic", scalar: null };
}

/**
 * Strip the members every rule above examines, leaving only what no rule models.
 *
 * The stripping is done *per identified node* rather than over the whole
 * document, because an added or removed node is already classified by its own
 * rule; comparing two arrays of different length would report that same change
 * a second time as `unmodelled` and drag every addition down to `unknown`.
 * Only nodes present on both sides are compared here, and only on the members
 * no rule read.
 *
 * `clauses` is deliberately absent from the strip list. The IR never parses
 * clause text and this classifier does not pretend to know what a reworded
 * clause means, so a clause change survives into the residue and classifies
 * `unknown` — which is the honest answer and the one the corpus records.
 */
function residueOf(document) {
	const copy = structuredClone(document);
	delete copy.contractVersion;
	if (isObject(copy.source)) {
		delete copy.source.identity;
		delete copy.source.version;
		delete copy.source.digest;
		delete copy.source.dialect;
	}
	if (isObject(copy.package)) {
		delete copy.package.identity;
		delete copy.package.version;
		delete copy.package.manifestDigest;
		delete copy.package.lockDigest;
		delete copy.package.mappingVersions;
		delete copy.package.profileVersions;
	}
	delete copy.extensions;
	const types = Array.isArray(copy.types) ? copy.types : [];
	delete copy.types;

	const perType = new Map();
	for (const type of types) {
		if (!isObject(type) || typeof type.identity !== "string") continue;
		const stripped = structuredClone(type);
		for (const member of [
			"identity",
			"displayName",
			"kind",
			"scalar",
			"target",
			"items",
			"values",
			"unknownPolicy",
			"origin",
			"extensions",
			"constraints",
			"variants",
			"relationships",
			"operations",
		]) {
			delete stripped[member];
		}
		const fields = Array.isArray(stripped.fields) ? stripped.fields : [];
		delete stripped.fields;
		const perField = new Map();
		for (const field of fields) {
			if (!isObject(field) || typeof field.identity !== "string") continue;
			const strippedField = structuredClone(field);
			for (const member of [
				"identity",
				"name",
				"typeRef",
				"presence",
				"nullable",
				"defaultKind",
				"defaultValue",
				"unit",
				"origin",
				"multiplicity",
				"extensions",
			]) {
				delete strippedField[member];
			}
			perField.set(field.identity, strippedField);
		}
		perType.set(type.identity, { stripped, perField });
	}
	return { envelope: copy, perType };
}

/** One recorded change. */
function change(classification, pointer, message, kind) {
	return { classification, pointer, message, kind };
}

/**
 * Classify an ordered pair of semantic IR documents over the IR surface.
 *
 * `beforeInvalid` and `afterInvalid` come from the admissibility reader
 * (FR-068). They are options rather than a call into it because
 * canonicalization and classification are defined for documents the reader
 * refuses, and this module reads nothing from an admissibility answer.
 */
export function classifySurface(before, after, options = {}) {
	const { consumerPolicy = null } = options;
	const beforeInvalid = options.beforeInvalid === true;
	const afterInvalid = options.afterInvalid === true;

	if (beforeInvalid || afterInvalid) {
		// contracts-v1.md, Compatibility: an unknown or invalid input prevents a
		// compatible promotion. A comparison against a document that is not a
		// contract is not a compatibility statement about one.
		return {
			classification: "invalid",
			changes: [
				change(
					"invalid",
					"",
					beforeInvalid && afterInvalid
						? "both documents of the pair are inadmissible"
						: beforeInvalid
							? "the earlier document of the pair is inadmissible"
							: "the later document of the pair is inadmissible",
					"pair-inadmissible",
				),
			],
		};
	}

	const left = normalizeIr(before);
	const right = normalizeIr(after);
	const changes = [];
	const record = (classification, pointer, message, kind) => {
		changes.push(change(classification, pointer, message, kind));
	};
	const additionOfOptional = admitsUnknown(consumerPolicy)
		? "additive"
		: "conditional";

	classifyEnvelope(left, right, record);
	const additionOfVariant =
		VARIANT_ADDITION_POLICY === "contract"
			? admitsUnknown(consumerPolicy)
				? "additive"
				: "breaking"
			: additionOfOptional;
	classifyTypes(left, right, record, additionOfOptional, additionOfVariant);
	classifyExtensions(left.extensions, right.extensions, "", record, "document");
	classifyResidue(left, right, record);

	changes.sort((leftChange, rightChange) => {
		const byPointer = compareCodeUnits(leftChange.pointer, rightChange.pointer);
		if (byPointer !== 0) return byPointer;
		const byClass = compareCodeUnits(
			leftChange.classification,
			rightChange.classification,
		);
		if (byClass !== 0) return byClass;
		return compareCodeUnits(leftChange.message, rightChange.message);
	});

	let classification = "patch";
	for (const entry of changes) {
		classification = moreRestrictive(classification, entry.classification);
	}
	return { classification, changes };
}

/** The document envelope: contract version, source provenance, package identity. */
function classifyEnvelope(before, after, record) {
	const beforeSource = isObject(before.source) ? before.source : {};
	const afterSource = isObject(after.source) ? after.source : {};
	if (beforeSource.identity !== afterSource.identity) {
		// ARCH-008: "JSON Schema `$id`, package identity, and semantic type/field
		// identities remain stable across compatible releases."
		record(
			"breaking",
			"/source/identity",
			"the source identity changed",
			"source-identity-changed",
		);
	}
	if (
		beforeSource.version !== afterSource.version ||
		beforeSource.digest !== afterSource.digest
	) {
		// ARCH-008 Patch: "Documentation, metadata, or generator correction with
		// identical accepted values and meaning."
		record(
			"patch",
			"/source",
			"the source version or digest changed",
			"source-provenance-changed",
		);
	}

	const beforePackage = isObject(before.package) ? before.package : {};
	const afterPackage = isObject(after.package) ? after.package : {};
	if (beforePackage.identity !== afterPackage.identity) {
		record(
			"breaking",
			"/package/identity",
			"the package identity changed",
			"package-identity-changed",
		);
	}
	if (
		beforePackage.version !== afterPackage.version ||
		beforePackage.manifestDigest !== afterPackage.manifestDigest ||
		beforePackage.lockDigest !== afterPackage.lockDigest ||
		!sameBytes(beforePackage.mappingVersions, afterPackage.mappingVersions) ||
		!sameBytes(beforePackage.profileVersions, afterPackage.profileVersions)
	) {
		record(
			"patch",
			"/package",
			"the package version, digests, or mapping and profile versions changed",
			"package-provenance-changed",
		);
	}
}

function classifyTypes(
	before,
	after,
	record,
	additionOfOptional,
	additionOfVariant,
) {
	const beforeTypes = byIdentity(before.types);
	const afterTypes = byIdentity(after.types);

	for (const [identity, entry] of beforeTypes) {
		if (afterTypes.has(identity)) continue;
		// ARCH-008: a removal is breaking.
		record(
			"breaking",
			`/types/${entry.position}`,
			`the type ${identity} was removed`,
			"type-removed",
		);
	}
	for (const [identity, entry] of afterTypes) {
		if (beforeTypes.has(identity)) continue;
		// ARCH-008 Additive: "New optional field/type/variant or capability that
		// old readers can preserve or ignore safely." A new type reaches no old
		// reader on its own, so it needs no policy.
		record(
			"additive",
			`/types/${entry.position}`,
			`the type ${identity} was added`,
			"type-added",
		);
	}
	for (const [identity, beforeEntry] of beforeTypes) {
		const afterEntry = afterTypes.get(identity);
		if (afterEntry === undefined) continue;
		classifyType(
			beforeEntry.node,
			afterEntry.node,
			`/types/${afterEntry.position}`,
			record,
			additionOfOptional,
			additionOfVariant,
			beforeTypes,
			afterTypes,
		);
	}
}

function classifyType(
	before,
	after,
	pointer,
	record,
	additionOfOptional,
	additionOfVariant,
	beforeTypes,
	afterTypes,
) {
	if (before.kind !== after.kind) {
		record(
			"breaking",
			`${pointer}/kind`,
			`the structural kind changed from ${before.kind} to ${after.kind}`,
			"type-kind-changed",
		);
	}
	for (const member of ["scalar", "target", "items", "values"]) {
		if (before[member] !== after[member]) {
			// contracts-v1.md, Compatibility: "incompatible meaning/type changes"
			// are breaking. Each of these four *is* the type of the declaration.
			record(
				"breaking",
				`${pointer}/${member}`,
				`the ${member} changed from ${String(before[member])} to ${String(after[member])}`,
				"type-representation-changed",
			);
		}
	}
	if (before.displayName !== after.displayName) {
		// ARCH-008: "changing only a generated language identifier must not change
		// semantic identity" — the identity is stable here, so this is a rename of
		// the generated surface, which breaks a generated consumer.
		record(
			"breaking",
			`${pointer}/displayName`,
			`the display name changed from ${String(before.displayName)} to ${String(after.displayName)}`,
			"type-display-name-changed",
		);
	}
	if (before.unknownPolicy !== after.unknownPolicy) {
		if (after.unknownPolicy === "reject") {
			// ARCH-008 names an "unknown-field rejection change" breaking.
			record(
				"breaking",
				`${pointer}/unknownPolicy`,
				`the unknown policy tightened to reject`,
				"type-unknown-policy-tightened",
			);
		} else {
			// contracts-v1.md leaves the tightening direction unordered, recorded as
			// GAP-010 against agent-ix/filament-core-data#25.
			record(
				"conditional",
				`${pointer}/unknownPolicy`,
				`the unknown policy changed from ${String(before.unknownPolicy)} to ${String(after.unknownPolicy)}`,
				"type-unknown-policy-changed",
			);
		}
	}
	if (!sameBytes(before.origin, after.origin)) {
		// ARCH-008 Patch: provenance is metadata with identical accepted values.
		record(
			"patch",
			`${pointer}/origin`,
			"the origin changed",
			"type-origin-changed",
		);
	}

	classifyExtensions(
		before.extensions,
		after.extensions,
		pointer,
		record,
		"type",
	);
	classifyConstraints(before.constraints, after.constraints, pointer, record);
	classifyFields(
		before,
		after,
		pointer,
		record,
		additionOfOptional,
		beforeTypes,
		afterTypes,
	);
	classifyVariants(before, after, pointer, record, additionOfVariant);
	classifyRelationships(before, after, pointer, record);
	classifyOperations(
		before,
		after,
		pointer,
		record,
		additionOfOptional,
		beforeTypes,
		afterTypes,
	);
}

function classifyExtensions(before, after, pointer, record, owner) {
	const beforeIndex = byIdentity(before);
	const afterIndex = byIdentity(after);
	for (const [identity, entry] of beforeIndex) {
		if (afterIndex.has(identity)) continue;
		record(
			"breaking",
			`${pointer}/extensions/${entry.position}`,
			`the ${owner} extension ${identity} was removed`,
			"extension-removed",
		);
	}
	for (const [identity, entry] of afterIndex) {
		if (beforeIndex.has(identity)) continue;
		const required = entry.node.required === true;
		record(
			required ? "breaking" : "additive",
			`${pointer}/extensions/${entry.position}`,
			`a${required ? " required" : "n optional"} ${owner} extension ${identity} was added`,
			required ? "extension-added-required" : "extension-added-optional",
		);
	}
	for (const [identity, beforeEntry] of beforeIndex) {
		const afterEntry = afterIndex.get(identity);
		if (afterEntry === undefined) continue;
		if (sameBytes(beforeEntry.node, afterEntry.node)) continue;
		const becameRequired =
			beforeEntry.node.required !== true && afterEntry.node.required === true;
		record(
			becameRequired ? "breaking" : "conditional",
			`${pointer}/extensions/${afterEntry.position}`,
			`the ${owner} extension ${identity} changed`,
			"extension-changed",
		);
	}
}

function classifyConstraints(before, after, pointer, record) {
	const beforeIndex = byIdentity(before);
	const afterIndex = byIdentity(after);
	// A constraint narrows or widens the accepted values of a type without
	// changing its identity or its representation. ARCH-008 reserves Patch for a
	// change with "identical accepted values and meaning", so a constraint change
	// is not a patch; it is not a removal or a type change, so it is not
	// automatically breaking. What it breaks depends on the data a consumer
	// already holds, which is what `conditional` names.
	for (const [identity, entry] of beforeIndex) {
		if (afterIndex.has(identity)) continue;
		record(
			"conditional",
			`${pointer}/constraints/${entry.position}`,
			`the constraint ${identity} was removed`,
			"constraint-removed",
		);
	}
	for (const [identity, entry] of afterIndex) {
		if (beforeIndex.has(identity)) continue;
		record(
			"conditional",
			`${pointer}/constraints/${entry.position}`,
			`the constraint ${identity} was added`,
			"constraint-added",
		);
	}
	for (const [identity, beforeEntry] of beforeIndex) {
		const afterEntry = afterIndex.get(identity);
		if (afterEntry === undefined) continue;
		if (sameBytes(beforeEntry.node, afterEntry.node)) continue;
		record(
			"conditional",
			`${pointer}/constraints/${afterEntry.position}`,
			`the constraint ${identity} changed`,
			"constraint-operands-changed",
		);
	}
}

function classifyFields(
	before,
	after,
	pointer,
	record,
	additionOfOptional,
	beforeTypes,
	afterTypes,
) {
	classifyFieldList(
		before.fields,
		after.fields,
		`${pointer}/fields`,
		record,
		additionOfOptional,
		beforeTypes,
		afterTypes,
		"field",
	);
}

function classifyFieldList(
	beforeFields,
	afterFields,
	pointer,
	record,
	additionOfOptional,
	beforeTypes,
	afterTypes,
	noun,
) {
	const beforeIndex = byIdentity(beforeFields);
	const afterIndex = byIdentity(afterFields);

	for (const [identity, entry] of beforeIndex) {
		if (afterIndex.has(identity)) continue;
		// ARCH-008: "A field **removal** … is breaking when old data or readers
		// still rely on it."
		record(
			"breaking",
			`${pointer}/${entry.position}`,
			`the ${noun} ${identity} was removed`,
			"field-removed",
		);
	}
	for (const [identity, entry] of afterIndex) {
		if (beforeIndex.has(identity)) continue;
		const required = entry.node.presence !== "optional";
		if (required) {
			// ARCH-008: "A new **required field** is breaking unless every existing
			// representation has an unambiguous compatible default whose semantics
			// were already part of the contract." No IR member declares that, so the
			// exemption is never available here.
			record(
				"breaking",
				`${pointer}/${entry.position}`,
				`a required ${noun} ${identity} was added`,
				"field-added-required",
			);
		} else {
			// ARCH-008: "Optional additions are additive only when every target and
			// known consumer preserves, ignores, or surfaces them as declared."
			record(
				additionOfOptional,
				`${pointer}/${entry.position}`,
				`an optional ${noun} ${identity} was added`,
				"field-added-optional",
			);
		}
	}
	for (const [identity, beforeEntry] of beforeIndex) {
		const afterEntry = afterIndex.get(identity);
		if (afterEntry === undefined) continue;
		classifyField(
			beforeEntry.node,
			afterEntry.node,
			`${pointer}/${afterEntry.position}`,
			record,
			beforeTypes,
			afterTypes,
			noun,
		);
	}
}

function classifyField(
	before,
	after,
	pointer,
	record,
	beforeTypes,
	afterTypes,
	noun,
) {
	if (before.presence !== after.presence) {
		if (after.presence === "required") {
			record(
				"breaking",
				`${pointer}/presence`,
				`the ${noun} became required`,
				"field-became-required",
			);
		} else {
			record(
				"additive",
				`${pointer}/presence`,
				`the ${noun} became optional`,
				"field-became-optional",
			);
		}
	}
	if (before.nullable !== after.nullable) {
		// Each direction breaks one side: a consumer that never expected null now
		// receives it, or a producer that sent null no longer may.
		record(
			"breaking",
			`${pointer}/nullable`,
			`the ${noun} nullability changed`,
			"field-nullability-changed",
		);
	}
	if (
		before.defaultKind !== after.defaultKind ||
		!sameBytes(before.defaultValue, after.defaultValue)
	) {
		record(
			"conditional",
			`${pointer}/defaultKind`,
			`the ${noun} default changed`,
			"field-default-changed",
		);
	}
	if (before.unit !== after.unit) {
		// contracts-v1.md, Compatibility: an "incompatible meaning … change" is
		// breaking. A quantity's unit is its meaning.
		record(
			"breaking",
			`${pointer}/unit`,
			`the ${noun} unit changed from ${String(before.unit)} to ${String(after.unit)}`,
			"field-unit-changed",
		);
	}
	if (before.name !== after.name) {
		// ARCH-008: a rename "uses a new stable field identity"; a changed generated
		// name under one identity breaks a generated consumer's API.
		record(
			"breaking",
			`${pointer}/name`,
			`the ${noun} name changed from ${String(before.name)} to ${String(after.name)}`,
			"field-name-changed",
		);
	}
	if (before.typeRef !== after.typeRef) {
		const leftShape = resolveRepresentation(beforeTypes, before.typeRef);
		const rightShape = resolveRepresentation(afterTypes, after.typeRef);
		if (sameBytes(leftShape, rightShape)) {
			// ARCH-008 Patch: "identical accepted values and meaning". Re-pointing a
			// field at an alias of the type it already had changes the name of the
			// declaration and nothing a consumer can observe in the value.
			record(
				"patch",
				`${pointer}/typeRef`,
				`the ${noun} was re-pointed at ${after.typeRef}, which resolves to the same representation`,
				"field-type-ref-rerepresented",
			);
		} else {
			record(
				"breaking",
				`${pointer}/typeRef`,
				`the ${noun} was re-pointed from ${before.typeRef} to ${after.typeRef}, which resolves differently`,
				"field-type-ref-retargeted",
			);
		}
	}
	classifyMultiplicity(before, after, pointer, record, noun);
	if (!sameBytes(before.origin, after.origin)) {
		record(
			"patch",
			`${pointer}/origin`,
			`the ${noun} origin changed`,
			"field-origin-changed",
		);
	}
	classifyExtensions(
		before.extensions,
		after.extensions,
		pointer,
		record,
		noun,
	);
}

function classifyMultiplicity(before, after, pointer, record, noun) {
	const leftBounds = isObject(before.multiplicity) ? before.multiplicity : {};
	const rightBounds = isObject(after.multiplicity) ? after.multiplicity : {};
	// `presence` already carries the lower bound and is classified above, so only
	// the upper bound and the collection flags are left here.
	if (leftBounds.upper !== rightBounds.upper) {
		record(
			"breaking",
			`${pointer}/multiplicity/upper`,
			`the ${noun} cardinality changed`,
			"field-cardinality-changed",
		);
	}
	if (
		leftBounds.ordered !== rightBounds.ordered ||
		leftBounds.unique !== rightBounds.unique
	) {
		record(
			"conditional",
			`${pointer}/multiplicity`,
			`the ${noun} collection flags changed`,
			"field-collection-flags-changed",
		);
	}
}

function classifyVariants(before, after, pointer, record, additionOfVariant) {
	const beforeIndex = byIdentity(before.variants);
	const afterIndex = byIdentity(after.variants);
	for (const [identity, entry] of beforeIndex) {
		if (afterIndex.has(identity)) continue;
		record(
			"breaking",
			`${pointer}/variants/${entry.position}`,
			`the variant ${identity} was removed`,
			"variant-removed",
		);
	}
	for (const [identity, entry] of afterIndex) {
		if (beforeIndex.has(identity)) continue;
		// ARCH-008: "An **enum** addition is additive only for open-enum consumers.
		// Closed generated enums require an unknown variant or coordinated breaking
		// release." Whether the consumer is open is what its policy declares.
		// `VARIANT_ADDITION_POLICY` is the one place that decides what an absent
		// policy means: `breaking` under the cited authority, `conditional` under
		// the corpus's published reading, which is the default.
		record(
			additionOfVariant,
			`${pointer}/variants/${entry.position}`,
			`the variant ${identity} was added`,
			"variant-added",
		);
	}
	for (const [identity, beforeEntry] of beforeIndex) {
		const afterEntry = afterIndex.get(identity);
		if (afterEntry === undefined) continue;
		if (beforeEntry.node.payloadType !== afterEntry.node.payloadType) {
			record(
				"breaking",
				`${pointer}/variants/${afterEntry.position}/payloadType`,
				`the payload of variant ${identity} changed`,
				"variant-payload-changed",
			);
		}
		if (beforeEntry.node.name !== afterEntry.node.name) {
			record(
				"breaking",
				`${pointer}/variants/${afterEntry.position}/name`,
				`the name of variant ${identity} changed`,
				"variant-name-changed",
			);
		}
	}
}

function classifyRelationships(before, after, pointer, record) {
	const beforeIndex = byIdentity(before.relationships);
	const afterIndex = byIdentity(after.relationships);
	for (const [identity, entry] of beforeIndex) {
		if (afterIndex.has(identity)) continue;
		// ARCH-008 names a removal breaking.
		record(
			"breaking",
			`${pointer}/relationships/${entry.position}`,
			`the relationship ${identity} was removed`,
			"relationship-removed",
		);
	}
	for (const [identity, entry] of afterIndex) {
		if (beforeIndex.has(identity)) continue;
		// A relationship carries no member in the serialized shape, so an addition
		// reaches a consumer only through whatever it does with the graph.
		record(
			"conditional",
			`${pointer}/relationships/${entry.position}`,
			`the relationship ${identity} was added`,
			"relationship-added",
		);
	}
	for (const [identity, beforeEntry] of beforeIndex) {
		const afterEntry = afterIndex.get(identity);
		if (afterEntry === undefined) continue;
		if (sameBytes(beforeEntry.node, afterEntry.node)) continue;
		record(
			"breaking",
			`${pointer}/relationships/${afterEntry.position}`,
			`the relationship ${identity} changed`,
			"relationship-changed",
		);
	}
}

function classifyOperations(
	before,
	after,
	pointer,
	record,
	additionOfOptional,
	beforeTypes,
	afterTypes,
) {
	const beforeIndex = byIdentity(before.operations);
	const afterIndex = byIdentity(after.operations);
	for (const [identity, entry] of beforeIndex) {
		if (afterIndex.has(identity)) continue;
		record(
			"breaking",
			`${pointer}/operations/${entry.position}`,
			`the operation ${identity} was removed`,
			"operation-removed",
		);
	}
	for (const [identity, entry] of afterIndex) {
		if (beforeIndex.has(identity)) continue;
		record(
			"additive",
			`${pointer}/operations/${entry.position}`,
			`the operation ${identity} was added`,
			"operation-added",
		);
	}
	for (const [identity, beforeEntry] of beforeIndex) {
		const afterEntry = afterIndex.get(identity);
		if (afterEntry === undefined) continue;
		const operationPointer = `${pointer}/operations/${afterEntry.position}`;
		// `operation.params` are `field` nodes, so they take the field rules.
		classifyFieldList(
			beforeEntry.node.params,
			afterEntry.node.params,
			`${operationPointer}/params`,
			record,
			additionOfOptional,
			beforeTypes,
			afterTypes,
			"parameter",
		);
		if (!sameBytes(beforeEntry.node.returns, afterEntry.node.returns)) {
			record(
				"breaking",
				`${operationPointer}/returns`,
				`the return of operation ${identity} changed`,
				"operation-changed",
			);
		}
		if (
			beforeEntry.node.name !== afterEntry.node.name ||
			!sameBytes(beforeEntry.node.pre, afterEntry.node.pre) ||
			!sameBytes(beforeEntry.node.post, afterEntry.node.post)
		) {
			record(
				"breaking",
				operationPointer,
				`the operation ${identity} changed`,
				"operation-changed",
			);
		}
		if (!sameBytes(beforeEntry.node.origin, afterEntry.node.origin)) {
			record(
				"patch",
				`${operationPointer}/origin`,
				`the operation ${identity} origin changed`,
				"field-origin-changed",
			);
		}
	}
}

/**
 * Anything the rules above did not look at.
 *
 * Every member a rule examines is stripped from both documents; whatever still
 * differs, on a node both documents carry, is a change no rule models, and
 * FR-069 sends it to `unknown` rather than to `patch`. `unknown` sits below
 * `breaking` in `CLASSIFICATION_ORDER`, so this is not a safe default in the
 * usual sense — it is a *visible* one, and it is what stops a construct nobody
 * thought about from being promoted as compatible.
 */
function classifyResidue(before, after, record) {
	const left = residueOf(before);
	const right = residueOf(after);
	if (
		canonicalize(left.envelope, { sets: false }) !==
		canonicalize(right.envelope, { sets: false })
	) {
		record(
			"unknown",
			"",
			"the document envelope differs in a member no classification rule models",
			"unmodelled",
		);
	}
	for (const [identity, leftType] of left.perType) {
		const rightType = right.perType.get(identity);
		if (rightType === undefined) continue;
		if (
			canonicalize(leftType.stripped, { sets: false }) !==
			canonicalize(rightType.stripped, { sets: false })
		) {
			record(
				"unknown",
				`/types`,
				`the type ${identity} differs in a member no classification rule models`,
				"unmodelled",
			);
		}
		for (const [fieldIdentity, leftField] of leftType.perField) {
			const rightField = rightType.perField.get(fieldIdentity);
			if (rightField === undefined) continue;
			if (
				canonicalize(leftField, { sets: false }) !==
				canonicalize(rightField, { sets: false })
			) {
				record(
					"unknown",
					`/types`,
					`the field ${fieldIdentity} differs in a member no classification rule models`,
					"unmodelled",
				);
			}
		}
	}
}
