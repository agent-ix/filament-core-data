/**
 * The independent semantic oracle (issue #20, FR-036).
 *
 * It decides, for an input bundle, the result state and the ordered diagnostic
 * list the published v1 contract requires. Every rule below was written from
 * `schema/semantic/v1/*.json` and `docs/semantic-data-system/contracts-v1.md`.
 * It imports nothing from `spikes/`, `src/`, `test/`, `tests/`, or
 * `conformance/adapters/`; it reads no clock, no network, and no environment.
 */

import { canonical, compareCodePoint, isObject, pointer } from "./json.mjs";

/** Maximum reference-expansion depth (FR-036). Cycles are caught before this. */
export const DEPTH_LIMIT = 256;

const CODE = (name) => `agent-ix.semantic-ir.${name}`;

/**
 * Compatibility classifications, most restrictive first (FR-036).
 * `unknown` outranks `conditional` because an unclassifiable change prevents a
 * compatible promotion (`contracts-v1.md`, "Compatibility").
 */
export const CLASSIFICATION_ORDER = [
	"invalid",
	"breaking",
	"unknown",
	"conditional",
	"additive",
	"patch",
];

/** Keyword → the resolved scalar names or structural kinds it may apply to. */
const KEYWORD_APPLICABILITY = {
	min: ["date", "datetime", "duration", "integer", "number"],
	max: ["date", "datetime", "duration", "integer", "number"],
	exclusiveMin: ["date", "datetime", "duration", "integer", "number"],
	exclusiveMax: ["date", "datetime", "duration", "integer", "number"],
	minLength: ["bytes", "string"],
	maxLength: ["bytes", "string"],
	pattern: ["string"],
	enumValues: [
		"boolean",
		"bytes",
		"date",
		"datetime",
		"duration",
		"integer",
		"number",
		"string",
		"uuid",
	],
	nonEmpty: ["bytes", "map", "sequence", "string"],
	unique: ["sequence"],
	format: ["string"],
};

const ORACLE_OWNER = "ix://agent-ix/filament-core-data/conformance/oracle";

function diagnostic(code, pointerText, message, severity = "error") {
	return { code: CODE(code), severity, message, pointer: pointerText };
}

function compareDiagnostics(left, right) {
	return (
		compareCodePoint(left.pointer, right.pointer) ||
		compareCodePoint(left.code, right.code) ||
		compareCodePoint(left.message, right.message) ||
		compareCodePoint(canonical(left), canonical(right))
	);
}

/* --------------------------------------------------------------- loci ---- */

/**
 * A locus is usable only when it carries what `common.schema.json#/$defs/sourceLocus`
 * requires and its path stays inside the source root. An unusable locus is not
 * attached: a diagnostic that carried one would not itself validate.
 */
function usableLocus(value) {
	return (
		isObject(value) &&
		typeof value.sourceIdentity === "string" &&
		typeof value.path === "string" &&
		value.path.length > 0 &&
		!value.path.startsWith("/") &&
		!/(^|\/)\.\.(\/|$)/.test(value.path) &&
		!value.path.includes("\\") &&
		Number.isInteger(value.startLine) &&
		value.startLine >= 1 &&
		Number.isInteger(value.startColumn) &&
		value.startColumn >= 1
	);
}

function locusOf(node) {
	if (!isObject(node)) return undefined;
	if (isObject(node.origin) && usableLocus(node.origin.source)) {
		return node.origin.source;
	}
	if (usableLocus(node.sourceSpan)) return node.sourceSpan;
	return undefined;
}

function ancestry(bundle, pointerText) {
	const segments = pointerText === "" ? [] : pointerText.slice(1).split("/");
	let node = bundle;
	const chain = [node];
	for (const raw of segments) {
		const token = raw.replace(/~1/g, "/").replace(/~0/g, "~");
		if (Array.isArray(node)) node = node[Number(token)];
		else if (isObject(node)) node = node[token];
		else node = undefined;
		chain.push(node);
	}
	return chain;
}

/**
 * Renders the internal rows as `common.schema.json#/$defs/diagnostic`
 * documents, each with the RFC 6901 pointer beside it as corpus metadata.
 *
 * `locus` is the addressed node's `origin.source` or, absent that, its nearest
 * ancestor's; `owner` is the identity of the nearest owning declaration.
 */
function render(bundle, rows) {
	return rows.map((row) => {
		const chain = ancestry(bundle, row.pointer);
		let locus;
		let owner = row.owner;
		for (let index = chain.length - 1; index >= 0; index -= 1) {
			const node = chain[index];
			if (locus === undefined) {
				const found = locusOf(node);
				if (found) locus = structuredClone(found);
			}
			if (
				owner === undefined &&
				isObject(node) &&
				typeof node.identity === "string" &&
				node.identity.startsWith("ix://")
			) {
				owner = node.identity;
			}
			if (locus !== undefined && owner !== undefined) break;
		}
		const diagnostic = {
			code: row.code,
			severity: row.severity,
			message: row.message,
			owner: owner ?? ORACLE_OWNER,
			blocking: row.severity === "error",
			causes: [],
			related: [],
		};
		if (locus !== undefined) diagnostic.locus = locus;
		return { pointer: row.pointer, diagnostic };
	});
}

/* ------------------------------------------------------------ resolver ---- */

/** Indexes `types[]` by identity, keeping the first declaration of each. */
function indexTypes(ir) {
	const byIdentity = new Map();
	const indexOf = new Map();
	const types = Array.isArray(ir.types) ? ir.types : [];
	for (const [index, definition] of types.entries()) {
		if (!isObject(definition) || typeof definition.identity !== "string")
			continue;
		if (!byIdentity.has(definition.identity)) {
			byIdentity.set(definition.identity, definition);
			indexOf.set(definition.identity, index);
		}
	}
	return { byIdentity, indexOf };
}

/**
 * Resolves an identity through alias definitions.
 *
 * Returns `{ status, kind?, scalar?, chain }` where `status` is `resolved`,
 * `unresolved`, `cycle`, or `depth`.
 */
export function resolve(types, identity, limit = DEPTH_LIMIT) {
	const chain = [];
	const seen = new Set();
	let current = identity;
	for (let step = 0; step <= limit; step += 1) {
		if (typeof current !== "string") return { status: "unresolved", chain };
		if (seen.has(current)) return { status: "cycle", chain };
		seen.add(current);
		chain.push(current);
		const definition = types.get(current);
		if (!definition) return { status: "unresolved", chain };
		if (definition.kind !== "alias") {
			return {
				status: "resolved",
				kind: String(definition.kind),
				scalar:
					typeof definition.scalar === "string" ? definition.scalar : undefined,
				definition,
				chain,
			};
		}
		current = definition.target;
	}
	return { status: "depth", chain };
}

/* ---------------------------------------------------------- identities ---- */

function* identityNodes(ir) {
	const types = Array.isArray(ir.types) ? ir.types : [];
	for (const [t, definition] of types.entries()) {
		if (!isObject(definition)) continue;
		yield [definition.identity, pointer("ir", "types", t, "identity")];
		for (const key of [
			"fields",
			"variants",
			"constraints",
			"relationships",
			"clauses",
		]) {
			const list = Array.isArray(definition[key]) ? definition[key] : [];
			for (const [i, node] of list.entries()) {
				if (isObject(node)) {
					yield [node.identity, pointer("ir", "types", t, key, i, "identity")];
				}
			}
		}
		const operations = Array.isArray(definition.operations)
			? definition.operations
			: [];
		for (const [o, operation] of operations.entries()) {
			if (!isObject(operation)) continue;
			yield [
				operation.identity,
				pointer("ir", "types", t, "operations", o, "identity"),
			];
			const params = Array.isArray(operation.params) ? operation.params : [];
			for (const [p, param] of params.entries()) {
				if (isObject(param)) {
					yield [
						param.identity,
						pointer("ir", "types", t, "operations", o, "params", p, "identity"),
					];
				}
			}
		}
	}
	const occurrences = Array.isArray(ir.occurrences) ? ir.occurrences : [];
	for (const [i, occurrence] of occurrences.entries()) {
		if (isObject(occurrence)) {
			yield [occurrence.identity, pointer("ir", "occurrences", i, "identity")];
		}
	}
}

/* -------------------------------------------------------------- fields ---- */

function checkMultiplicity(multiplicity, at, out) {
	if (!isObject(multiplicity)) return undefined;
	const { lower, upper } = multiplicity;
	if (
		upper !== undefined &&
		Number.isInteger(upper) &&
		Number.isInteger(lower) &&
		upper < lower
	) {
		out.push(
			diagnostic(
				"INVALID_MULTIPLICITY",
				`${at}/upper`,
				`upper bound ${upper} is below lower bound ${lower}`,
			),
		);
		return multiplicity;
	}
	// Owner ruling (2026-09-19T15:39:32Z) on FCD #199: every multiplicity
	// carries both `ordered` and `unique` as required booleans.
	if (
		typeof multiplicity.ordered !== "boolean" ||
		typeof multiplicity.unique !== "boolean"
	) {
		out.push(
			diagnostic(
				"INVALID_MULTIPLICITY",
				at,
				"ordered and unique are required booleans on every multiplicity",
			),
		);
		return multiplicity;
	}
	return multiplicity;
}

function checkField(field, at, types, out) {
	const resolved = resolve(types, field.typeRef);
	if (resolved.status === "cycle") {
		out.push(
			diagnostic(
				"ALIAS_CYCLE",
				`${at}/typeRef`,
				`alias chain closes on itself: ${resolved.chain.join(" -> ")}`,
			),
		);
	} else if (resolved.status === "depth") {
		out.push(
			diagnostic(
				"DEPTH_LIMIT_EXCEEDED",
				`${at}/typeRef`,
				`alias expansion exceeded the declared depth limit of ${DEPTH_LIMIT}`,
			),
		);
	} else if (resolved.status === "unresolved") {
		out.push(
			diagnostic(
				"UNRESOLVED_TYPE_REF",
				`${at}/typeRef`,
				`typeRef does not resolve: ${String(field.typeRef)}`,
			),
		);
	}

	// fcd#179: contract 2.0.0 is the only contract, and FR-106 makes `presence`
	// and `multiplicity` independent members for 2.0.0 — "SHALL NOT be derived
	// from one another at any layer" (FR-106-CON-2). `PRESENCE_MULTIPLICITY_MISMATCH`
	// applied only to `1.1.0` documents (FR-106-AC-4); with `1.1.0` deleted, no
	// document this oracle ever sees can trigger it, so the check is removed
	// rather than left calling out a condition no corpus case can reach.
	checkMultiplicity(field.multiplicity, `${at}/multiplicity`, out);

	if (
		field.unit !== undefined &&
		resolved.status === "resolved" &&
		resolved.kind !== "scalar"
	) {
		out.push(
			diagnostic(
				"UNIT_ON_NON_SCALAR",
				`${at}/unit`,
				`unit is only allowed where typeRef resolves to a scalar (resolved ${resolved.kind})`,
			),
		);
	}

	// A constrained field keeps its constraints inline, with no alias node
	// between them (gap 1 of FCD #199/#200, finding 2 of the FCD #199/#200
	// review): each one runs through `checkConstraint`, the same as a
	// type-level constraint. This oracle's own `resolve` has no field-as-
	// subject branch (unlike the three readers' `Document::resolve` /
	// `resolve_kind` / `resolveKind`), so a corpus case exercising this loop
	// must point `appliesTo` at a type, not the field's own identity.
	for (const [i, constraint] of (Array.isArray(field.constraints)
		? field.constraints
		: []
	).entries()) {
		if (isObject(constraint))
			checkConstraint(constraint, `${at}/constraints/${i}`, types, out);
	}
}

/* ------------------------------------------------------------ document ---- */

function checkConstraint(constraint, at, types, out) {
	const keyword = String(constraint.keyword);
	// The schema closes the keyword vocabulary, so an unlisted keyword never
	// reaches this layer; the applicability table is the only rule left.
	const allowed = KEYWORD_APPLICABILITY[keyword];
	if (!allowed) return;
	const resolved = resolve(types, constraint.appliesTo);
	if (resolved.status === "cycle") {
		out.push(
			diagnostic(
				"ALIAS_CYCLE",
				`${at}/appliesTo`,
				"alias chain closes on itself",
			),
		);
		return;
	}
	if (resolved.status !== "resolved") {
		out.push(
			diagnostic(
				"UNRESOLVED_TYPE_REF",
				`${at}/appliesTo`,
				`appliesTo does not resolve: ${String(constraint.appliesTo)}`,
			),
		);
		return;
	}
	const subject =
		resolved.kind === "scalar" ? String(resolved.scalar) : resolved.kind;
	if (!allowed.includes(subject)) {
		out.push(
			diagnostic(
				"CONSTRAINT_NOT_APPLICABLE",
				at,
				`${keyword} does not apply to ${subject}`,
			),
		);
	}
	if (keyword === "pattern") {
		const operands = isObject(constraint.operands) ? constraint.operands : {};
		try {
			new RegExp(String(operands.regex), "u");
		} catch {
			out.push(
				diagnostic(
					"INVALID_PATTERN",
					`${at}/operands/regex`,
					"regex does not compile under ecma-262",
				),
			);
		}
	}
	if (
		["min", "max", "exclusiveMin", "exclusiveMax"].includes(keyword) &&
		resolved.kind === "scalar"
	) {
		const operands = isObject(constraint.operands) ? constraint.operands : {};
		const numeric =
			resolved.scalar === "integer" || resolved.scalar === "number";
		const value = operands.value;
		if (numeric ? typeof value !== "number" : typeof value !== "string") {
			out.push(
				diagnostic(
					"INVALID_OPERAND",
					`${at}/operands/value`,
					`${keyword} on ${String(resolved.scalar)} takes a ${numeric ? "number" : "string"} operand`,
				),
			);
		}
	}
}

function checkTypeDefinition(definition, at, types, lockExports, out) {
	const fields = Array.isArray(definition.fields) ? definition.fields : [];
	const seenFieldNames = new Set();
	for (const [i, field] of fields.entries()) {
		if (!isObject(field)) continue;
		if (seenFieldNames.has(field.name)) {
			out.push(
				diagnostic(
					"DUPLICATE_FIELD_NAME",
					`${at}/fields/${i}/name`,
					`field name ${String(field.name)} is declared twice`,
				),
			);
		}
		seenFieldNames.add(field.name);
		checkField(field, `${at}/fields/${i}`, types, out);
	}

	for (const [i, constraint] of (Array.isArray(definition.constraints)
		? definition.constraints
		: []
	).entries()) {
		if (isObject(constraint))
			checkConstraint(constraint, `${at}/constraints/${i}`, types, out);
	}

	for (const [key, property] of [
		["items", "sequence"],
		["values", "map"],
	]) {
		if (definition.kind === property && definition[key] !== undefined) {
			const resolved = resolve(types, definition[key]);
			if (resolved.status !== "resolved") {
				out.push(
					diagnostic(
						"UNRESOLVED_ELEMENT_TYPE",
						`${at}/${key}`,
						`${property} element type does not resolve: ${String(definition[key])}`,
					),
				);
			}
		}
	}

	if (definition.kind === "alias" || definition.kind === "reference") {
		const resolved =
			definition.kind === "alias"
				? resolve(types, definition.identity)
				: resolve(types, definition.target);
		if (resolved.status === "cycle") {
			out.push(
				diagnostic(
					"ALIAS_CYCLE",
					`${at}/target`,
					`alias chain closes on itself: ${resolved.chain.join(" -> ")}`,
				),
			);
		} else if (resolved.status === "depth") {
			out.push(
				diagnostic(
					"DEPTH_LIMIT_EXCEEDED",
					`${at}/target`,
					`alias expansion exceeded the declared depth limit of ${DEPTH_LIMIT}`,
				),
			);
		} else if (resolved.status === "unresolved") {
			out.push(
				diagnostic(
					"UNRESOLVED_TYPE_REF",
					`${at}/target`,
					`target does not resolve: ${String(definition.target)}`,
				),
			);
		}
	}

	if (definition.kind === "union") {
		for (const [i, variant] of (Array.isArray(definition.variants)
			? definition.variants
			: []
		).entries()) {
			if (isObject(variant) && variant.payloadType !== undefined) {
				if (resolve(types, variant.payloadType).status !== "resolved") {
					out.push(
						diagnostic(
							"UNRESOLVED_VARIANT_PAYLOAD",
							`${at}/variants/${i}/payloadType`,
							`variant payload type does not resolve: ${String(variant.payloadType)}`,
						),
					);
				}
			}
		}
	}

	const clauses = Array.isArray(definition.clauses) ? definition.clauses : [];
	const clauseIds = new Set();
	for (const [i, clause] of clauses.entries()) {
		if (!isObject(clause)) continue;
		if (clauseIds.has(clause.clauseId)) {
			out.push(
				diagnostic(
					"DUPLICATE_CLAUSE_ID",
					`${at}/clauses/${i}/clauseId`,
					`clauseId ${String(clause.clauseId)} is declared twice on this type`,
				),
			);
		}
		clauseIds.add(clause.clauseId);
		if (
			isObject(clause.origin) &&
			"source" in clause.origin &&
			clause.sourceSpan === undefined
		) {
			out.push(
				diagnostic(
					"MISSING_SOURCE_SPAN",
					`${at}/clauses/${i}/sourceSpan`,
					"a source-originated clause carries a sourceSpan",
				),
			);
		}
	}

	for (const [i, relationship] of (Array.isArray(definition.relationships)
		? definition.relationships
		: []
	).entries()) {
		if (!isObject(relationship)) continue;
		const sourceEnd = isObject(relationship.sourceEnd)
			? relationship.sourceEnd
			: {};
		const targetEnd = isObject(relationship.targetEnd)
			? relationship.targetEnd
			: {};
		const target = String(targetEnd.type);
		if (!types.has(target) && !lockExports.has(target)) {
			out.push(
				diagnostic(
					"UNRESOLVED_RELATIONSHIP_TARGET",
					`${at}/relationships/${i}/targetEnd/type`,
					`relationship target resolves to neither a document type nor a lock export: ${target}`,
				),
			);
		}
		if (
			sourceEnd.type !== undefined &&
			String(sourceEnd.type) !== String(definition.identity)
		) {
			out.push(
				diagnostic(
					"INVALID_RELATIONSHIP_SOURCE",
					`${at}/relationships/${i}/sourceEnd/type`,
					`a relationship's source end names the type declaring it, not ${String(sourceEnd.type)}`,
				),
			);
		}
		checkMultiplicity(
			sourceEnd.multiplicity,
			`${at}/relationships/${i}/sourceEnd/multiplicity`,
			out,
		);
		checkMultiplicity(
			targetEnd.multiplicity,
			`${at}/relationships/${i}/targetEnd/multiplicity`,
			out,
		);
	}

	for (const [o, operation] of (Array.isArray(definition.operations)
		? definition.operations
		: []
	).entries()) {
		if (!isObject(operation)) continue;
		const names = new Set();
		for (const [p, param] of (Array.isArray(operation.params)
			? operation.params
			: []
		).entries()) {
			if (!isObject(param)) continue;
			if (names.has(param.name)) {
				out.push(
					diagnostic(
						"DUPLICATE_PARAM",
						`${at}/operations/${o}/params/${p}/name`,
						`param ${String(param.name)} is declared twice`,
					),
				);
			}
			names.add(param.name);
			checkField(param, `${at}/operations/${o}/params/${p}`, types, out);
		}
		if (isObject(operation.returns)) {
			if (resolve(types, operation.returns.typeRef).status !== "resolved") {
				out.push(
					diagnostic(
						"UNRESOLVED_TYPE_REF",
						`${at}/operations/${o}/returns/typeRef`,
						`returns.typeRef does not resolve: ${String(operation.returns.typeRef)}`,
					),
				);
			}
			checkMultiplicity(
				operation.returns.multiplicity,
				`${at}/operations/${o}/returns/multiplicity`,
				out,
			);
		}
		for (const side of ["pre", "post"]) {
			const refs = Array.isArray(operation[side]) ? operation[side] : [];
			for (const [r, ref] of refs.entries()) {
				if (!clauseIds.has(ref)) {
					out.push(
						diagnostic(
							"DANGLING_CLAUSE_REF",
							`${at}/operations/${o}/${side}/${r}`,
							`${side} references clauseId ${String(ref)}, which this type does not declare`,
						),
					);
				}
			}
		}
	}
}

function checkCompositeCycles(ir, out) {
	const edges = new Map();
	const definitions = Array.isArray(ir.types) ? ir.types : [];
	for (const [t, definition] of definitions.entries()) {
		if (!isObject(definition)) continue;
		const list = [];
		for (const [i, relationship] of (Array.isArray(definition.relationships)
			? definition.relationships
			: []
		).entries()) {
			if (isObject(relationship) && relationship.composite === true) {
				list.push({
					target: String(
						isObject(relationship.targetEnd)
							? relationship.targetEnd.type
							: undefined,
					),
					pointer: pointer("ir", "types", t, "relationships", i),
				});
			}
		}
		edges.set(String(definition.identity), list);
	}
	const state = new Map();
	const visit = (node, depth) => {
		if (depth > DEPTH_LIMIT) {
			out.push(
				diagnostic(
					"DEPTH_LIMIT_EXCEEDED",
					pointer("ir", "types"),
					`composite relationship expansion exceeded the declared depth limit of ${DEPTH_LIMIT}`,
				),
			);
			return;
		}
		state.set(node, "open");
		for (const edge of edges.get(node) ?? []) {
			const status = state.get(edge.target);
			if (status === "open") {
				out.push(
					diagnostic(
						"COMPOSITE_CYCLE",
						`${edge.pointer}/targetEnd/type`,
						`composite relationship closes a cycle at ${edge.target}`,
					),
				);
			} else if (status === undefined && edges.has(edge.target)) {
				visit(edge.target, depth + 1);
			}
		}
		state.set(node, "done");
	};
	for (const node of edges.keys()) if (!state.has(node)) visit(node, 0);
}

/* ---------------------------------------------------- package and lock ---- */

function checkPackageContext(bundle, ir, types, out) {
	const manifest = bundle.manifest;
	const lock = bundle.lock;
	const profile = bundle.profile;
	const mappings = Array.isArray(bundle.mappings) ? bundle.mappings : [];
	const policy = bundle.consumerPolicy;

	if (isObject(lock)) {
		const resolved = new Set(
			(Array.isArray(lock.packages) ? lock.packages : [])
				.filter(isObject)
				.map((entry) => entry.identity),
		);
		if (isObject(manifest)) {
			for (const [i, entry] of (Array.isArray(manifest.imports)
				? manifest.imports
				: []
			).entries()) {
				if (isObject(entry) && !resolved.has(entry.packageIdentity)) {
					out.push(
						diagnostic(
							"UNRESOLVED_IMPORT",
							pointer("manifest", "imports", i, "packageIdentity"),
							`import ${String(entry.packageIdentity)} is not resolved by the lock`,
						),
					);
				}
			}
		}
		const graph = new Map();
		for (const entry of (Array.isArray(lock.packages)
			? lock.packages
			: []
		).filter(isObject)) {
			graph.set(
				entry.identity,
				Array.isArray(entry.dependencies) ? entry.dependencies : [],
			);
		}
		const state = new Map();
		const indexOf = new Map(
			(Array.isArray(lock.packages) ? lock.packages : [])
				.filter(isObject)
				.map((entry, index) => [entry.identity, index]),
		);
		const visit = (node, depth) => {
			if (depth > DEPTH_LIMIT) {
				out.push(
					diagnostic(
						"DEPTH_LIMIT_EXCEEDED",
						pointer("lock", "packages", indexOf.get(node) ?? 0, "dependencies"),
						`package graph expansion exceeded the declared depth limit of ${DEPTH_LIMIT}`,
					),
				);
				return;
			}
			state.set(node, "open");
			for (const dependency of graph.get(node) ?? []) {
				const status = state.get(dependency);
				if (status === "open") {
					out.push(
						diagnostic(
							"PACKAGE_CYCLE",
							pointer(
								"lock",
								"packages",
								indexOf.get(node) ?? 0,
								"dependencies",
							),
							`the package graph closes a cycle at ${dependency}`,
						),
					);
				} else if (status === undefined && graph.has(dependency)) {
					visit(dependency, depth + 1);
				}
			}
			state.set(node, "done");
		};
		for (const node of graph.keys()) if (!state.has(node)) visit(node, 0);
	}

	if (typeof bundle.manifestDigest === "string" && isObject(ir.package)) {
		if (ir.package.manifestDigest !== bundle.manifestDigest) {
			out.push(
				diagnostic(
					"STALE_LOCK",
					pointer("ir", "package", "manifestDigest"),
					`the IR names manifest digest ${String(ir.package.manifestDigest)} but the manifest hashes to ${bundle.manifestDigest}`,
				),
			);
		}
	}

	const declaredIdentities = mappings.length > 0 ? identitySet(ir) : undefined;
	for (const [m, mapping] of mappings.entries()) {
		if (!isObject(mapping)) continue;
		for (const key of ["sourceType", "targetType"]) {
			if (mapping[key] !== undefined && !types.has(mapping[key])) {
				out.push(
					diagnostic(
						"UNKNOWN_MAPPING_TARGET",
						pointer("mappings", m, key),
						`mapping ${key} names ${String(mapping[key])}, which no type declares`,
					),
				);
			}
		}
		for (const [c, correspondence] of (Array.isArray(mapping.correspondences)
			? mapping.correspondences
			: []
		).entries()) {
			if (
				isObject(correspondence) &&
				!declaredIdentities.has(correspondence.sourceIdentity)
			) {
				out.push(
					diagnostic(
						"UNKNOWN_MAPPING_TARGET",
						pointer("mappings", m, "correspondences", c, "sourceIdentity"),
						`correspondence names ${String(correspondence.sourceIdentity)}, which no declaration owns`,
					),
				);
			}
		}
	}

	if (isObject(profile) && isObject(manifest)) {
		const exported = new Set(
			(Array.isArray(manifest.exports) ? manifest.exports : [])
				.filter(isObject)
				.map((entry) => entry.typeIdentity),
		);
		const allowed = new Set(
			Array.isArray(profile.allowedOmissions) ? profile.allowedOmissions : [],
		);
		const definitions = Array.isArray(ir.types) ? ir.types : [];
		for (const [t, definition] of definitions.entries()) {
			if (!isObject(definition)) continue;
			const roles = Array.isArray(definition.roles) ? definition.roles : [];
			if (!roles.includes("agent-ix:entity")) continue;
			if (
				!exported.has(definition.identity) &&
				!allowed.has(definition.identity)
			) {
				out.push(
					diagnostic(
						"UNDECLARED_LOSS",
						pointer("ir", "types", t, "identity"),
						`${String(definition.identity)} is neither exported nor declared as an allowed omission`,
					),
				);
			}
		}
	}

	if (isObject(policy) && policy.unknownExtensions === "reject") {
		const listed = new Set(Array.isArray(policy.exports) ? policy.exports : []);
		const extensions = Array.isArray(ir.extensions) ? ir.extensions : [];
		for (const [i, extension] of extensions.entries()) {
			if (!isObject(extension) || extension.required !== true) continue;
			if (!listed.has(extension.identity)) {
				out.push(
					diagnostic(
						"UNKNOWN_REQUIRED_EXTENSION",
						pointer("ir", "extensions", i, "identity"),
						`required extension ${String(extension.identity)} is not listed by the consumer policy, which rejects unknown extensions`,
					),
				);
			}
		}
	}
}

function identitySet(ir) {
	const set = new Set();
	for (const [identity] of identityNodes(ir)) set.add(identity);
	return set;
}

/* ---------------------------------------------------------- normalize ----- */

/**
 * Materializes `nullable` as a literal boolean on every field and operation
 * parameter of one type definition, mutating it in place.
 *
 * `nullable` is `true` only where the authored member is the JSON literal
 * `true` (fcd#187): absent, `null`, `false`, a non-zero number, a non-empty
 * string, an array, or an object all materialize `false`. This is the same
 * `=== true` rule the Rust reader (`crates/semantic-ir/src/normalize.rs`),
 * the compiler frontend's `normalizeIr`, the TypeScript backend's
 * `normalizeIrForTarget`, and the Python reader
 * (`tests/semantic_ir_reader.py`) apply. A schema-valid `2.0.0`
 * document already requires `nullable` to be a JSON boolean, so this only has
 * visible effect on a document the schema layer has already rejected; `verdict`
 * still calls `normalize` on such a document because the harness compares
 * `normalized` unconditionally. `multiplicity` and `presence` are untouched
 * here: both are schema-required and independently authored (FR-106), and a
 * field missing either is a reader-level refusal in every adapter, not
 * something this function defaults.
 */
function materializeNullable(definition) {
	for (const field of Array.isArray(definition.fields)
		? definition.fields
		: []) {
		if (isObject(field)) field.nullable = field.nullable === true;
	}
	for (const operation of Array.isArray(definition.operations)
		? definition.operations
		: []) {
		if (!isObject(operation)) continue;
		for (const param of Array.isArray(operation.params)
			? operation.params
			: []) {
			if (isObject(param)) param.nullable = param.nullable === true;
		}
	}
}

/**
 * The FR-027 normalized serialization of one IR document.
 *
 * fcd#179: contract 2.0.0 requires `multiplicity`, `presence`, and `nullable`
 * on every field, so a schema-valid document that reaches here already
 * carries all three explicitly, and canonicalization alone reproduces it
 * unchanged. `normalize` still calls `materializeNullable` (fcd#187) because
 * `verdict` computes `normalized` for a schema-invalid document too, where
 * `nullable` may be present but not a boolean, or absent outright; deriving
 * `presence` from `multiplicity` would contradict FR-106 (presence is
 * authored and independent), so neither is touched here.
 */
export function normalize(ir) {
	if (!isObject(ir)) return canonical(ir);
	const cloned = structuredClone(ir);
	for (const definition of Array.isArray(cloned.types) ? cloned.types : []) {
		if (isObject(definition)) materializeNullable(definition);
	}
	return canonical(cloned);
}

/* ------------------------------------------------------------- verdict ---- */

/**
 * Decides one input bundle.
 *
 * `schemaDiagnostics` is supplied by the caller (the schema layer lives in
 * `schema-layer.mjs` so that this module stays dependency-free); when it is
 * non-empty the schema layer decided the case and the cross-field rules are
 * not consulted.
 */
export function verdict(bundle, schemaRows = []) {
	if (!isObject(bundle) || !isObject(bundle.ir)) {
		return {
			contractVersion: null,
			resultState: "invalid",
			diagnostics: render(isObject(bundle) ? bundle : {}, [
				diagnostic(
					"INVALID_DOCUMENT",
					"",
					"the input bundle carries no IR document",
				),
			]),
			normalized: canonical(null),
		};
	}
	const ir = bundle.ir;
	if (schemaRows.length > 0) {
		const rows = schemaRows
			.map((row) => diagnostic("SCHEMA_VIOLATION", row.pointer, row.message))
			.sort(compareDiagnostics);
		return {
			contractVersion: ir.contractVersion ?? null,
			resultState: "invalid",
			diagnostics: render(bundle, rows),
			normalized: normalize(ir),
		};
	}

	const out = [];
	const { byIdentity } = indexTypes(ir);
	const lockExports = new Set(
		isObject(bundle.manifest) && Array.isArray(bundle.manifest.exports)
			? bundle.manifest.exports
					.filter(isObject)
					.map((entry) => entry.typeIdentity)
			: [],
	);

	const seen = new Map();
	for (const [identity, at] of identityNodes(ir)) {
		if (typeof identity !== "string") continue;
		if (seen.has(identity)) {
			out.push(
				diagnostic(
					"DUPLICATE_IDENTITY",
					at,
					`identity ${identity} is already declared at ${seen.get(identity)}`,
				),
			);
		} else {
			seen.set(identity, at);
		}
	}

	for (const [t, definition] of (Array.isArray(ir.types)
		? ir.types
		: []
	).entries()) {
		if (isObject(definition)) {
			checkTypeDefinition(
				definition,
				pointer("ir", "types", t),
				byIdentity,
				lockExports,
				out,
			);
		}
	}
	checkCompositeCycles(ir, out);

	for (const [i, occurrence] of (Array.isArray(ir.occurrences)
		? ir.occurrences
		: []
	).entries()) {
		if (isObject(occurrence) && !byIdentity.has(occurrence.definition)) {
			out.push(
				diagnostic(
					"UNRESOLVED_OCCURRENCE_DEFINITION",
					pointer("ir", "occurrences", i, "definition"),
					`occurrence definition does not resolve: ${String(occurrence.definition)}`,
				),
			);
		}
	}

	checkPackageContext(bundle, ir, byIdentity, out);

	const sorted = out.sort(compareDiagnostics);
	const errors = sorted.filter((entry) => entry.severity === "error");
	const resultState =
		sorted.length === 0 ? "success" : errors.length > 0 ? "invalid" : "lossy";
	return {
		contractVersion: ir.contractVersion ?? null,
		resultState,
		diagnostics: render(bundle, sorted),
		normalized: normalize(ir),
	};
}

/* ------------------------------------------------------ compatibility ----- */

function fieldIndex(ir) {
	const index = new Map();
	for (const definition of Array.isArray(ir.types) ? ir.types : []) {
		if (!isObject(definition)) continue;
		for (const field of Array.isArray(definition.fields)
			? definition.fields
			: []) {
			if (isObject(field)) index.set(field.identity, { definition, field });
		}
	}
	return index;
}

/** Members of a type definition the classifier models change-by-change. */
const MODELLED_TYPE_MEMBERS = [
	"constraints",
	"displayName",
	"fields",
	"identity",
	"items",
	"kind",
	"operations",
	"origin",
	"relationships",
	"scalar",
	"target",
	"unknownPolicy",
	"values",
	"variants",
];

/** Members of a field the classifier models change-by-change. */
const MODELLED_FIELD_MEMBERS = [
	"defaultKind",
	"defaultValue",
	"identity",
	"multiplicity",
	"name",
	"nullable",
	"origin",
	"presence",
	"typeRef",
	"unit",
];

/**
 * The part of a node no classification rule reads.
 *
 * A difference here is a real change the classifier cannot name, so it is
 * `unknown` rather than silence: the contract keeps an unclassifiable change
 * visible because it prevents a compatible promotion.
 */
function residue(node, modelled) {
	if (!isObject(node)) return canonical(node);
	const copy = { ...node };
	for (const member of modelled) delete copy[member];
	return canonical(copy);
}

function moreRestrictive(left, right) {
	return CLASSIFICATION_ORDER.indexOf(left) <=
		CLASSIFICATION_ORDER.indexOf(right)
		? left
		: right;
}

/**
 * Classifies the IR-visible change between two documents (FR-036).
 *
 * The IR surface only: `compatibility-report.schema.json` and FR-025 remain the
 * authority for profile, mapping, representation, target, and consumer
 * evidence, and this classification never overrides one.
 */
export function classify(beforeBundle, afterBundle) {
	const before = isObject(beforeBundle?.ir) ? beforeBundle.ir : {};
	const after = isObject(afterBundle?.ir) ? afterBundle.ir : {};
	const policy = isObject(afterBundle?.consumerPolicy)
		? afterBundle.consumerPolicy
		: undefined;
	const preservesUnknown =
		isObject(policy) &&
		(policy.unknownExtensions === "preserve" ||
			policy.unknownExtensions === "surface");
	const changes = [];
	const record = (classification, at, message) =>
		changes.push({ classification, pointer: at, message });

	const beforeTypes = indexTypes(before).byIdentity;
	const afterIndexed = indexTypes(after);
	const afterTypes = afterIndexed.byIdentity;
	const afterIndex = afterIndexed.indexOf;

	for (const identity of beforeTypes.keys()) {
		if (!afterTypes.has(identity)) {
			record(
				"breaking",
				pointer("ir", "types"),
				`type ${identity} was removed`,
			);
		}
	}
	for (const [identity, definition] of afterTypes) {
		const at = pointer("ir", "types", afterIndex.get(identity) ?? 0);
		const prior = beforeTypes.get(identity);
		if (!prior) {
			record("additive", at, `type ${identity} was added`);
			continue;
		}
		if (prior.kind !== definition.kind) {
			record("breaking", `${at}/kind`, `type ${identity} changed kind`);
		}
		if (prior.scalar !== definition.scalar) {
			record(
				"breaking",
				`${at}/scalar`,
				`type ${identity} changed scalar from ${String(prior.scalar)} to ${String(definition.scalar)}`,
			);
		}
		for (const member of ["target", "items", "values"]) {
			if (prior[member] !== definition[member]) {
				record(
					"breaking",
					`${at}/${member}`,
					`type ${identity} changed ${member} from ${String(prior[member])} to ${String(definition[member])}`,
				);
			}
		}
		const priorRelationships = new Map(
			(Array.isArray(prior.relationships) ? prior.relationships : [])
				.filter(isObject)
				.map((entry) => [entry.identity, entry]),
		);
		for (const [r, relationship] of (Array.isArray(definition.relationships)
			? definition.relationships
			: []
		).entries()) {
			if (!isObject(relationship)) continue;
			if (!priorRelationships.has(relationship.identity)) {
				record(
					"conditional",
					`${at}/relationships/${r}`,
					`relationship ${relationship.identity} was added`,
				);
			}
			priorRelationships.delete(relationship.identity);
		}
		for (const gone of priorRelationships.keys()) {
			record(
				"breaking",
				`${at}/relationships`,
				`relationship ${gone} was removed`,
			);
		}
		const priorOperations = new Map(
			(Array.isArray(prior.operations) ? prior.operations : [])
				.filter(isObject)
				.map((entry) => [entry.identity, entry]),
		);
		for (const [o, operation] of (Array.isArray(definition.operations)
			? definition.operations
			: []
		).entries()) {
			if (!isObject(operation)) continue;
			const priorOperation = priorOperations.get(operation.identity);
			if (!priorOperation) {
				record(
					"additive",
					`${at}/operations/${o}`,
					`operation ${operation.identity} was added`,
				);
			} else if (
				canonical(
					(Array.isArray(priorOperation.params)
						? priorOperation.params
						: []
					).map((param) => [param.name, param.typeRef]),
				) !==
				canonical(
					(Array.isArray(operation.params) ? operation.params : []).map(
						(param) => [param.name, param.typeRef],
					),
				)
			) {
				record(
					"breaking",
					`${at}/operations/${o}/params`,
					`operation ${operation.identity} changed its parameter list`,
				);
			}
			priorOperations.delete(operation.identity);
		}
		for (const gone of priorOperations.keys()) {
			record("breaking", `${at}/operations`, `operation ${gone} was removed`);
		}
		if (prior.unknownPolicy !== definition.unknownPolicy) {
			const tightened =
				definition.unknownPolicy === "reject" &&
				prior.unknownPolicy !== "reject";
			record(
				tightened ? "breaking" : "conditional",
				`${at}/unknownPolicy`,
				`type ${identity} changed unknown policy from ${prior.unknownPolicy} to ${definition.unknownPolicy}`,
			);
		}
		if (prior.displayName !== definition.displayName) {
			record(
				"patch",
				`${at}/displayName`,
				`type ${identity} was renamed for display`,
			);
		}
		const priorVariants = new Set(
			(Array.isArray(prior.variants) ? prior.variants : [])
				.filter(isObject)
				.map((variant) => variant.identity),
		);
		for (const [v, variant] of (Array.isArray(definition.variants)
			? definition.variants
			: []
		).entries()) {
			if (isObject(variant) && !priorVariants.has(variant.identity)) {
				record(
					"conditional",
					`${at}/variants/${v}`,
					`variant ${variant.identity} was added`,
				);
			}
		}
		const priorConstraints = new Map(
			(Array.isArray(prior.constraints) ? prior.constraints : [])
				.filter(isObject)
				.map((entry) => [entry.identity, entry]),
		);
		for (const [c, constraint] of (Array.isArray(definition.constraints)
			? definition.constraints
			: []
		).entries()) {
			if (!isObject(constraint)) continue;
			const priorConstraint = priorConstraints.get(constraint.identity);
			if (!priorConstraint) {
				record(
					"conditional",
					`${at}/constraints/${c}`,
					`constraint ${constraint.identity} was added`,
				);
			} else if (
				canonical(priorConstraint.operands) !== canonical(constraint.operands)
			) {
				record(
					"conditional",
					`${at}/constraints/${c}/operands`,
					`constraint ${constraint.identity} changed its operands`,
				);
			}
		}
		if (
			residue(prior, MODELLED_TYPE_MEMBERS) !==
			residue(definition, MODELLED_TYPE_MEMBERS)
		) {
			record(
				"unknown",
				at,
				`type ${identity} changed a member no compatibility rule classifies`,
			);
		}
		for (const identityOfConstraint of priorConstraints.keys()) {
			const still = (
				Array.isArray(definition.constraints) ? definition.constraints : []
			)
				.filter(isObject)
				.some((entry) => entry.identity === identityOfConstraint);
			if (!still) {
				record(
					"additive",
					`${at}/constraints`,
					`constraint ${identityOfConstraint} was relaxed away`,
				);
			}
		}
	}

	const beforeFields = fieldIndex(before);
	const afterFields = fieldIndex(after);
	for (const [identity, { definition }] of beforeFields) {
		if (!afterFields.has(identity)) {
			record(
				"breaking",
				pointer(
					"ir",
					"types",
					afterIndex.get(definition.identity) ?? 0,
					"fields",
				),
				`field ${identity} was removed`,
			);
		}
	}
	for (const [identity, { definition, field }] of afterFields) {
		const typeAt = pointer(
			"ir",
			"types",
			afterIndex.get(definition.identity) ?? 0,
		);
		const at = `${typeAt}/fields`;
		const prior = beforeFields.get(identity);
		if (!prior) {
			const required =
				isObject(field.multiplicity) && Number(field.multiplicity.lower) >= 1;
			record(
				required ? "breaking" : preservesUnknown ? "additive" : "conditional",
				at,
				required
					? `required field ${identity} was added`
					: preservesUnknown
						? `optional field ${identity} was added and the consumer policy preserves unknown members`
						: `optional field ${identity} was added with no consumer policy that preserves unknown members`,
			);
			continue;
		}
		if (prior.field.typeRef !== field.typeRef) {
			const was = resolve(beforeTypes, prior.field.typeRef);
			const now = resolve(afterTypes, field.typeRef);
			const equivalent =
				was.status === "resolved" &&
				now.status === "resolved" &&
				was.kind === now.kind &&
				was.scalar === now.scalar;
			record(
				equivalent ? "patch" : "breaking",
				at,
				equivalent
					? `field ${identity} moved to an alias resolving to the same ${String(now.kind)}`
					: `field ${identity} changed type`,
			);
		}
		if (prior.field.unit !== field.unit) {
			record(
				"breaking",
				at,
				`field ${identity} changed unit from ${String(prior.field.unit)} to ${String(field.unit)}`,
			);
		}
		if (
			prior.field.defaultKind !== field.defaultKind ||
			canonical(prior.field.defaultValue) !== canonical(field.defaultValue)
		) {
			record("conditional", at, `field ${identity} changed its default`);
		}
		if (prior.field.nullable !== field.nullable) {
			record("breaking", at, `field ${identity} changed nullability`);
		}
		const priorLower = isObject(prior.field.multiplicity)
			? Number(prior.field.multiplicity.lower)
			: prior.field.presence === "optional"
				? 0
				: 1;
		const nowLower = isObject(field.multiplicity)
			? Number(field.multiplicity.lower)
			: field.presence === "optional"
				? 0
				: 1;
		if (nowLower > priorLower) {
			record("breaking", at, `field ${identity} became required`);
		} else if (nowLower < priorLower) {
			record("additive", at, `field ${identity} became optional`);
		}
		if (
			residue(prior.field, MODELLED_FIELD_MEMBERS) !==
			residue(field, MODELLED_FIELD_MEMBERS)
		) {
			record(
				"unknown",
				at,
				`field ${identity} changed a member no compatibility rule classifies`,
			);
		}
	}

	const priorExtensions = new Map(
		(Array.isArray(before.extensions) ? before.extensions : [])
			.filter(isObject)
			.map((entry) => [entry.identity, entry]),
	);
	for (const [e, extension] of (Array.isArray(after.extensions)
		? after.extensions
		: []
	).entries()) {
		if (!isObject(extension)) continue;
		if (!priorExtensions.has(extension.identity)) {
			record(
				extension.required === true ? "breaking" : "additive",
				pointer("ir", "extensions", e),
				`${extension.required === true ? "required" : "optional"} extension ${extension.identity} was added`,
			);
		}
		priorExtensions.delete(extension.identity);
	}
	for (const gone of priorExtensions.keys()) {
		record(
			"breaking",
			pointer("ir", "extensions"),
			`extension ${gone} was removed`,
		);
	}

	if (before.package?.identity !== after.package?.identity) {
		record(
			"breaking",
			pointer("ir", "package", "identity"),
			"package identity changed",
		);
	}
	if (before.contractVersion !== after.contractVersion) {
		record(
			"conditional",
			pointer("ir", "contractVersion"),
			`contract version moved from ${before.contractVersion} to ${after.contractVersion}`,
		);
	}

	changes.sort(
		(left, right) =>
			compareCodePoint(left.pointer, right.pointer) ||
			compareCodePoint(left.message, right.message),
	);
	const classification = changes.reduce(
		(worst, change) => moreRestrictive(worst, change.classification),
		"patch",
	);
	return { classification, changes };
}
