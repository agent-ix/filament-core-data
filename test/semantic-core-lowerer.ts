/**
 * Test-scoped reference lowerer: semantic-core declarations → IR v1.1 nodes
 * (issue #35, FR-034). Evidence for the issue #36 extraction frontend, not the
 * frontend itself. Imported by tests only.
 */

import { createHash } from "node:crypto";

export type JsonObject = Record<string, unknown>;

type Locus = JsonObject;

export type Instance = {
	name: string;
	kind: "record" | "enum";
	package: string;
	sourceLocus: Locus;
	fields?: JsonObject[];
	relations?: JsonObject[];
	operations?: JsonObject[];
	clauses?: JsonObject[];
	enumValues?: JsonObject[];
	clauseText?: Record<string, string>;
	fieldLoci?: Record<string, Locus>;
	relationLoci?: Record<string, Locus>;
};

const KERNEL: Record<string, { scalar?: string; open?: boolean }> = {
	UUID: { scalar: "uuid" },
	Boolean: { scalar: "boolean" },
	Integer: { scalar: "integer" },
	Decimal: { scalar: "number" },
	String: { scalar: "string" },
	Timestamp: { scalar: "datetime" },
	Duration: { scalar: "duration" },
	Bytes: { scalar: "bytes" },
	JsonObject: { open: true },
};

const EXT = "ix://agent-ix/semantic-core/ext";

function ext(name: string, required: boolean, payload: JsonObject): JsonObject {
	return {
		identity: `${EXT}/${name}`,
		version: "1.0.0",
		required,
		capability: `semantic-core-${name}`,
		payload,
	};
}

function isObject(value: unknown): value is JsonObject {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

function pascal(name: string): string {
	return name.charAt(0).toUpperCase() + name.slice(1);
}

/** Lower one archetype instance to a `contractVersion: "2.0.0"` IR document. */
export function lower(instance: Instance, sourceBytes: string): JsonObject {
	const [org, repo] = instance.package.split("/");
	const base = `ix://${org}/${repo}`;
	const sourceIdentity = String(instance.sourceLocus.sourceIdentity);
	const origin = (locus: Locus | undefined): JsonObject =>
		locus
			? {
					source: {
						sourceIdentity: String(locus.sourceIdentity),
						path: String(locus.path),
						startLine: Number(locus.startLine),
						startColumn: Number(locus.startColumn),
					},
				}
			: {
					generated: {
						generatorIdentity:
							"ix://agent-ix/filament-core-data/generator/semantic-core-lowerer",
						generatorVersion: "1.0.0",
						inputIdentities: [`${base}/type/${instance.name}`],
					},
				};

	const types: JsonObject[] = [];
	const kernelUsed = new Set<string>();
	const kernelIdentity = (name: string): string => {
		kernelUsed.add(name);
		return `${base}/type/${name}`;
	};

	const lowerTypeRef = (
		ref: JsonObject,
	): {
		typeRef: string;
		multiplicity: JsonObject;
		unit?: string;
		decimal?: JsonObject;
	} => {
		const target = String(ref.target);
		const typeRef = target in KERNEL ? kernelIdentity(target) : target;
		const multiplicity = isObject(ref.multiplicity)
			? { ...ref.multiplicity }
			: { lower: 1, upper: 1 };
		return {
			typeRef,
			multiplicity,
			unit: typeof ref.unit === "string" ? ref.unit : undefined,
			decimal: isObject(ref.decimal) ? ref.decimal : undefined,
		};
	};

	const lowerField = (
		field: JsonObject,
		owner: string,
		locus: Locus | undefined,
	): JsonObject => {
		const name = String(field.name);
		const type = isObject(field.type) ? field.type : { target: "String" };
		const lowered = lowerTypeRef(type);
		const extensions: JsonObject[] = [];
		let typeRef = lowered.typeRef;
		const constraints = Array.isArray(field.constraints)
			? (field.constraints as JsonObject[])
			: [];
		if (constraints.length > 0) {
			const aliasName = `${owner}${pascal(name)}`;
			const aliasIdentity = `${base}/type/${aliasName}`;
			types.push({
				identity: aliasIdentity,
				displayName: aliasName,
				kind: "alias",
				roles: [],
				origin: origin(locus),
				constraints: constraints.map((constraint) => {
					const keyword = String(constraint.keyword);
					const { keyword: _keyword, ...operands } = constraint;
					return {
						identity: `${base}/constraint/${owner}-${name}-${keyword}`,
						keyword,
						operands,
						appliesTo: aliasIdentity,
						diagnosticCode: `agent-ix.${repo}.${owner.toUpperCase()}_${name.toUpperCase()}_${keyword.toUpperCase()}`,
						origin: origin(locus),
					};
				}),
				extensions: [],
				unknownPolicy: "reject",
				target: lowered.typeRef,
			});
			typeRef = aliasIdentity;
		}
		if (field.identity === true)
			extensions.push(ext("identity", false, { identity: true }));
		if (typeof field.doc === "string")
			extensions.push(ext("doc", false, { text: field.doc }));
		if (lowered.decimal) extensions.push(ext("decimal", true, lowered.decimal));
		const defaultDecl = isObject(field.default) ? field.default : undefined;
		const node: JsonObject = {
			identity: `${base}/field/${owner}-${name}`,
			name,
			typeRef,
			multiplicity: lowered.multiplicity,
			presence:
				Number(lowered.multiplicity.lower) >= 1 ? "required" : "optional",
			nullable: field.nullable === true,
			defaultKind: defaultDecl ? String(defaultDecl.kind) : "none",
			origin: origin(locus),
			extensions,
		};
		if (defaultDecl) node.defaultValue = defaultDecl.value ?? null;
		if (lowered.unit) node.unit = lowered.unit;
		return node;
	};

	const owner = instance.name;
	const clauseText = instance.clauseText ?? {};
	const clauses = (instance.clauses ?? []).map((clause) => {
		const clauseId = String(clause.clauseId);
		const span = isObject(clause.sourceSpan) ? clause.sourceSpan : undefined;
		const node: JsonObject = {
			identity: `${base}/clause/${owner}-${clauseId}`,
			language: String(clause.language),
			clauseId,
			text: clauseText[clauseId] ?? "",
			origin: span
				? {
						source: {
							sourceIdentity: String(span.sourceIdentity),
							path: String(span.path),
							startLine: Number(span.startLine),
							startColumn: Number(span.startColumn),
						},
					}
				: origin(undefined),
		};
		if (span) node.sourceSpan = span;
		return node;
	});

	const definition: JsonObject = {
		identity: `${base}/type/${owner}`,
		displayName: owner,
		kind: instance.kind,
		roles: [],
		origin: origin(instance.sourceLocus),
		constraints: [],
		extensions: [],
		unknownPolicy: "reject",
	};
	if (instance.kind === "record") {
		definition.fields = (instance.fields ?? []).map((field) =>
			lowerField(field, owner, instance.fieldLoci?.[String(field.name)]),
		);
		definition.relationships = (instance.relations ?? []).map((relation) => {
			const verb = String(relation.verb);
			const target = String(relation.target);
			const targetName = target.split("/").pop() ?? target;
			return {
				identity: `${base}/relationship/${owner}-${verb}-${targetName}`,
				verb,
				category: String(relation.category),
				composite: relation.composite === true,
				target,
				multiplicity: isObject(relation.multiplicity)
					? relation.multiplicity
					: { lower: 0, upper: 1 },
				origin: origin(instance.relationLoci?.[verb]),
			};
		});
		definition.operations = (instance.operations ?? []).map((operation) => {
			const name = String(operation.name);
			const node: JsonObject = {
				identity: `${base}/operation/${owner}-${name}`,
				name,
				params: (Array.isArray(operation.params)
					? (operation.params as JsonObject[])
					: []
				).map((param) =>
					lowerField(param, `${owner}${pascal(name)}`, undefined),
				),
				pre: (Array.isArray(operation.pre)
					? (operation.pre as JsonObject[])
					: []
				).map((ref) => String(ref.clauseId)),
				post: (Array.isArray(operation.post)
					? (operation.post as JsonObject[])
					: []
				).map((ref) => String(ref.clauseId)),
				origin: origin(undefined),
			};
			if (isObject(operation.returns)) {
				const lowered = lowerTypeRef(operation.returns);
				node.returns = {
					typeRef: lowered.typeRef,
					multiplicity: lowered.multiplicity,
					nullable: false,
				};
			}
			return node;
		});
		definition.clauses = clauses;
	} else {
		definition.variants = (instance.enumValues ?? []).map((entry) => ({
			identity: `${base}/variant/${owner}-${String(entry.value)}`,
			name: String(entry.value),
			origin: origin(undefined),
		}));
		// An IR variant carries no extensions (FR-034): documented values are
		// recorded on the enum definition itself.
		definition.extensions = (instance.enumValues ?? [])
			.filter((entry) => typeof entry.doc === "string")
			.map((entry) =>
				ext("doc", false, {
					value: String(entry.value),
					text: String(entry.doc),
				}),
			);
		definition.clauses = clauses;
	}

	for (const name of [...kernelUsed].sort()) {
		const spec = KERNEL[name];
		const node: JsonObject = {
			identity: `${base}/type/${name}`,
			displayName: name,
			kind: spec.open ? "record" : "scalar",
			roles: [],
			origin: origin(undefined),
			constraints: [],
			extensions: [ext("kernel-scalar", false, { name })],
			unknownPolicy: spec.open ? "preserve" : "reject",
		};
		if (spec.open) node.fields = [];
		else node.scalar = spec.scalar;
		types.unshift(node);
	}
	types.push(definition);

	return {
		contractVersion: "2.0.0",
		constructs: [],
		source: {
			identity: sourceIdentity,
			version: "1.0.0",
			dialect: "spec-bundle",
			digest: `sha256:${createHash("sha256").update(sourceBytes).digest("hex")}`,
		},
		package: {
			identity: instance.package,
			version: "1.0.0",
			manifestDigest: `sha256:${"0".repeat(64)}`,
			mappingVersions: [],
			profileVersions: [],
			lockDigest: `sha256:${"0".repeat(64)}`,
		},
		types,
		occurrences: [],
		extensions: [],
	};
}
