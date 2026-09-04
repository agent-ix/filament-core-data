#!/usr/bin/env node
/**
 * Builds one constructed input pair per case of
 * `fixtures/semantic/v1/compatibility/cases.json` (FR-051-AC-1).
 *
 * The published case file is a *description*: it names a kind of change and the
 * disposition it must receive, and carries no documents. This script turns each
 * description into a real pair of IR documents plus whatever declared inputs
 * that family needs, and writes them under `test/fixtures/compiler/compatibility/cases/`.
 * Both the script and its output are committed, so the pairs are reviewable data
 * rather than something a test invents at run time and then agrees with.
 *
 * Usage: node scripts/build-compatibility-cases.mjs [--check]
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = resolve(root, "test/fixtures/compiler/compatibility/cases");
const PKG = "agent-ix/assurance";
const SOURCE = `ix://${PKG}/source/typespec`;
const DIGEST = `sha256:${"0".repeat(64)}`;

function origin(path = "types/main.tsp", line = 1) {
	return {
		source: { sourceIdentity: SOURCE, path, startLine: line, startColumn: 1 },
	};
}

function field(name, overrides = {}) {
	return {
		identity: `ix://${PKG}/field/Artifact-${name}`,
		name,
		typeRef: `ix://${PKG}/type/Text`,
		multiplicity: { lower: 1, upper: 1 },
		presence: "required",
		nullable: false,
		defaultKind: "none",
		origin: origin(),
		extensions: [],
		...overrides,
	};
}

function base() {
	return {
		contractVersion: "1.1.0",
		source: {
			identity: SOURCE,
			version: "1.0.0",
			dialect: "typespec",
			digest: DIGEST,
		},
		package: {
			identity: PKG,
			version: "1.0.0",
			manifestDigest: DIGEST,
			mappingVersions: [],
			profileVersions: ["1.0.0"],
			lockDigest: DIGEST,
		},
		types: [
			{
				identity: `ix://${PKG}/type/Text`,
				displayName: "Text",
				kind: "scalar",
				roles: [],
				origin: origin("types/text.tsp"),
				constraints: [
					{
						identity: `ix://${PKG}/constraint/Text-minLength`,
						keyword: "minLength",
						operands: { value: 1 },
						appliesTo: `ix://${PKG}/type/Text`,
						diagnosticCode: "agent-ix.assurance.TEXT_MIN_LENGTH",
						origin: origin("types/text.tsp", 2),
					},
				],
				extensions: [],
				unknownPolicy: "reject",
				scalar: "string",
			},
			{
				identity: `ix://${PKG}/type/Seconds`,
				displayName: "Seconds",
				kind: "scalar",
				roles: [],
				origin: origin("types/seconds.tsp"),
				constraints: [],
				extensions: [],
				unknownPolicy: "reject",
				scalar: "integer",
			},
			{
				identity: `ix://${PKG}/type/Status`,
				displayName: "Status",
				kind: "enum",
				roles: [],
				origin: origin("types/status.tsp"),
				constraints: [],
				extensions: [],
				unknownPolicy: "reject",
				variants: [
					{
						identity: `ix://${PKG}/variant/Status-draft`,
						name: "draft",
						origin: origin("types/status.tsp", 2),
					},
				],
			},
			{
				identity: `ix://${PKG}/type/Payload`,
				displayName: "Payload",
				kind: "union",
				roles: [],
				origin: origin("types/payload.tsp"),
				constraints: [],
				extensions: [],
				unknownPolicy: "reject",
				variants: [
					{
						identity: `ix://${PKG}/variant/Payload-text`,
						name: "text",
						payloadType: `ix://${PKG}/type/Text`,
						origin: origin("types/payload.tsp", 2),
					},
					{
						identity: `ix://${PKG}/variant/Payload-id`,
						name: "id",
						payloadType: `ix://${PKG}/type/Text`,
						origin: origin("types/payload.tsp", 3),
					},
				],
			},
			{
				identity: `ix://${PKG}/type/Artifact`,
				displayName: "Artifact",
				kind: "record",
				roles: ["agent-ix:entity"],
				origin: origin(),
				constraints: [],
				extensions: [],
				unknownPolicy: "preserve",
				fields: [
					field("id"),
					field("duration", {
						typeRef: `ix://${PKG}/type/Seconds`,
						unit: "s",
					}),
					field("tags", {
						multiplicity: { lower: 1, ordered: false, unique: false },
					}),
				],
				relationships: [
					{
						identity: `ix://${PKG}/relationship/Artifact-belongs_to-Project`,
						verb: "belongs_to",
						category: "structural",
						composite: false,
						target: `ix://${PKG}/type/Text`,
						multiplicity: { lower: 0, upper: 1 },
						origin: origin("types/main.tsp", 5),
					},
				],
				operations: [
					{
						identity: `ix://${PKG}/operation/Artifact-archive`,
						name: "archive",
						params: [],
						pre: ["not_archived"],
						post: [],
						returns: {
							typeRef: `ix://${PKG}/type/Status`,
							multiplicity: { lower: 1, upper: 1 },
							nullable: false,
						},
						origin: origin("types/main.tsp", 20),
					},
				],
				clauses: [
					{
						identity: `ix://${PKG}/clause/Artifact-not_archived`,
						language: "ocl",
						clauseId: "not_archived",
						text: "context Artifact inv: true",
						sourceSpan: {
							sourceIdentity: SOURCE,
							path: "types/main.tsp",
							startLine: 30,
							startColumn: 1,
							endLine: 30,
							endColumn: 2,
						},
						origin: origin("types/main.tsp", 30),
					},
				],
			},
		],
		occurrences: [],
		extensions: [],
	};
}

function clone(document) {
	return structuredClone(document);
}

function typeOf(document, name) {
	return document.types.find((type) => type.displayName === name);
}

const OPEN_CONSUMER = {
	contractVersion: "1.0.0",
	consumer: "ix://agent-ix/quire/consumer/dynamic",
	mode: "dynamic",
	exports: [],
	unknownModules: "preserve",
	unknownExtensions: "preserve",
	identityPlanes: [
		"package",
		"type",
		"field",
		"profile",
		"mapping",
		"fingerprint",
	],
};

const CLOSED_CONSUMER = {
	...OPEN_CONSUMER,
	consumer: "ix://agent-ix/filament/consumer/generated",
	mode: "generated",
	unknownModules: "reject",
	unknownExtensions: "reject",
};

/** A profile document, valid against `profile.schema.json`. */
function profile(overrides) {
	return {
		contractVersion: "1.0.0",
		identity: `ix://${PKG}/profile/default`,
		version: "1.0.0",
		authority: "semantic-source",
		editDirection: "read-only",
		roundTrip: "semantic-lossless",
		unknownPolicy: "preserve",
		allowedOmissions: [],
		enrichment: false,
		materializationLifetime: "run",
		...overrides,
	};
}

/** A mapping document, valid against `mapping.schema.json`. */
function mapping(overrides) {
	const { omittedIdentities = [], ...rest } = overrides;
	return {
		contractVersion: "1.0.0",
		identity: `ix://${PKG}/mapping/markdown`,
		version: "1.0.0",
		sourceType: `ix://${PKG}/type/Artifact`,
		targetType: `ix://${PKG}/type/Text`,
		representation: "markdown",
		correspondences: [
			{ sourceIdentity: `ix://${PKG}/type/Artifact`, targetLocus: "body" },
		],
		transformation: {
			kind: "rendering",
			purity: "pure",
			deterministic: true,
			externalReads: [],
			externalWrites: [],
			failureStates: ["invalid"],
			retryIdempotent: true,
			preservation: "declared-lossy",
			omittedIdentities:
				omittedIdentities.length > 0
					? omittedIdentities
					: [`ix://${PKG}/type/Artifact`],
			presentationMediaType: "text/markdown",
		},
		...rest,
	};
}

const VOCABULARY = {
	constraintKeywords: [
		"min",
		"max",
		"exclusiveMin",
		"exclusiveMax",
		"pattern",
		"minLength",
		"maxLength",
		"enumValues",
		"nonEmpty",
		"unique",
		"format",
	],
	operands: { minLength: { value: "integer" } },
	kernelScalars: {
		String: { irScalar: "string" },
		Integer: { irScalar: "integer" },
	},
};

/** One builder per published case id. Each returns `{ old, new, request }`. */
const BUILDERS = {
	"documentation-only": () => {
		const next = clone(base());
		typeOf(next, "Artifact").fields[0].extensions.push({
			identity: "ix://agent-ix/semantic-core/ext/doc",
			version: "1.0.0",
			required: false,
			payload: { text: "the artifact's stable identity" },
		});
		return { old: base(), new: next };
	},
	"optional-field-all-open": () => {
		const next = clone(base());
		typeOf(next, "Artifact").fields.push(
			field("summary", {
				multiplicity: { lower: 0, upper: 1 },
				presence: "optional",
			}),
		);
		return {
			old: base(),
			new: next,
			request: { consumerPolicies: [OPEN_CONSUMER] },
		};
	},
	"optional-field-stale-consumer": () => {
		const next = clone(base());
		typeOf(next, "Artifact").fields.push(
			field("summary", {
				multiplicity: { lower: 0, upper: 1 },
				presence: "optional",
			}),
		);
		return {
			old: base(),
			new: next,
			request: {
				consumerPolicies: [OPEN_CONSUMER],
				consumerEvidenceStatus: "stale",
			},
		};
	},
	"required-field": () => {
		const next = clone(base());
		typeOf(next, "Artifact").fields.push(field("owner"));
		return { old: base(), new: next };
	},
	"stable-identity-change": () => {
		const next = clone(base());
		const artifact = typeOf(next, "Artifact");
		artifact.identity = `ix://${PKG}/type/ArtifactV2`;
		return { old: base(), new: next };
	},
	"type-domain-widening": () => {
		const next = clone(base());
		typeOf(next, "Seconds").scalar = "number";
		return { old: base(), new: next };
	},
	"union-variant-removal": () => {
		const next = clone(base());
		typeOf(next, "Payload").variants = typeOf(next, "Payload").variants.slice(
			0,
			1,
		);
		return { old: base(), new: next };
	},
	"constraint-documentation-correction": () => {
		const next = clone(base());
		typeOf(next, "Text").constraints[0].diagnosticCode =
			"agent-ix.assurance.TEXT_MINIMUM_LENGTH";
		return { old: base(), new: next };
	},
	"generated-name-only": () => ({
		old: base(),
		new: base(),
		request: {
			generatedNames: {
				old: { [`ix://${PKG}/type/Artifact`]: "Artifact" },
				new: { [`ix://${PKG}/type/Artifact`]: "ArtifactModel" },
			},
		},
	}),
	"closed-enum-addition": () => {
		const next = clone(base());
		typeOf(next, "Status").variants.push({
			identity: `ix://${PKG}/variant/Status-final`,
			name: "final",
			origin: origin("types/status.tsp", 3),
		});
		return {
			old: base(),
			new: next,
			request: { consumerPolicies: [CLOSED_CONSUMER] },
		};
	},
	"open-enum-addition": () => {
		const next = clone(base());
		typeOf(next, "Status").variants.push({
			identity: `ix://${PKG}/variant/Status-final`,
			name: "final",
			origin: origin("types/status.tsp", 3),
		});
		return {
			old: base(),
			new: next,
			request: { consumerPolicies: [OPEN_CONSUMER] },
		};
	},
	"unknown-policy-tightening": () => {
		const next = clone(base());
		typeOf(next, "Artifact").unknownPolicy = "reject";
		return { old: base(), new: next };
	},
	"mapping-edit-direction-change": () => ({
		old: base(),
		new: base(),
		request: {
			// Edit direction is a *profile* member (`profile.schema.json`), so the
			// case supplies profile documents rather than an invented mapping shape.
			profiles: {
				old: profile({ editDirection: "read-only" }),
				new: profile({ editDirection: "bidirectional" }),
			},
		},
	}),
	"profile-omission-added": () => ({
		old: base(),
		new: base(),
		request: {
			profiles: {
				old: profile({}),
				new: profile({
					allowedOmissions: [`ix://${PKG}/field/Artifact-duration`],
				}),
			},
		},
	}),
	"authority-change-same-shape": () => ({
		old: base(),
		new: base(),
		request: {
			profiles: {
				old: profile({}),
				new: profile({ authority: "runtime-store" }),
			},
		},
	}),
	"undeclared-loss-same-shape": () => ({
		old: base(),
		new: base(),
		request: {
			mappings: {
				old: [mapping({ omittedIdentities: [`ix://${PKG}/type/Artifact`] })],
				new: [mapping({ omittedIdentities: [`ix://${PKG}/type/Artifact`] })],
			},
			// What the transformation actually drops is an observation, not a
			// member of the mapping document.
			observedLoss: {
				[`ix://${PKG}/mapping/markdown`]: [`ix://${PKG}/field/Artifact-tags`],
			},
		},
	}),
	"reserved-protobuf-number-reuse": () => ({
		old: base(),
		new: base(),
		request: {
			reservations: {
				old: {
					identity: `ix://${PKG}/target/protobuf`,
					reserved: ["7"],
					used: [],
				},
				new: {
					identity: `ix://${PKG}/target/protobuf`,
					reserved: ["7"],
					used: ["7"],
				},
			},
		},
	}),
	"unknown-consumer": () => {
		const next = clone(base());
		typeOf(next, "Artifact").fields.push(
			field("summary", {
				multiplicity: { lower: 0, upper: 1 },
				presence: "optional",
			}),
		);
		return {
			old: base(),
			new: next,
			request: { consumerEvidenceStatus: "unknown" },
		};
	},
	"target-disagreement": () => {
		const next = clone(base());
		typeOf(next, "Artifact").fields.push(
			field("summary", {
				multiplicity: { lower: 0, upper: 1 },
				presence: "optional",
			}),
		);
		return {
			old: base(),
			new: next,
			request: {
				targetResults: {
					"*": [
						{ target: "rust", disposition: "additive" },
						{ target: "typescript", disposition: "breaking" },
						{ target: "python-pydantic-v2", disposition: "patch" },
					],
				},
			},
		};
	},
	"multiplicity-widening": () => {
		const next = clone(base());
		typeOf(next, "Artifact").fields[0].multiplicity = { lower: 0 };
		typeOf(next, "Artifact").fields[0].presence = "optional";
		return { old: base(), new: next };
	},
	"multiplicity-narrowing": () => {
		const previous = clone(base());
		typeOf(previous, "Artifact").fields[0].multiplicity = { lower: 0 };
		typeOf(previous, "Artifact").fields[0].presence = "optional";
		return { old: previous, new: base() };
	},
	"unit-change": () => {
		const next = clone(base());
		typeOf(next, "Artifact").fields[1].unit = "ms";
		return { old: base(), new: next };
	},
	"ordered-flag-change": () => {
		const next = clone(base());
		typeOf(next, "Artifact").fields[2].multiplicity = {
			lower: 1,
			ordered: true,
			unique: false,
		};
		return { old: base(), new: next };
	},
	"unique-flag-change": () => {
		const next = clone(base());
		typeOf(next, "Artifact").fields[2].multiplicity = {
			lower: 1,
			ordered: false,
			unique: true,
		};
		return { old: base(), new: next };
	},
	"constraint-keyword-added-to-vocabulary": () => ({
		old: base(),
		new: base(),
		request: {
			vocabulary: {
				old: VOCABULARY,
				new: {
					...VOCABULARY,
					constraintKeywords: [...VOCABULARY.constraintKeywords, "multipleOf"],
				},
			},
		},
	}),
	"constraint-keyword-removed-from-vocabulary": () => ({
		old: base(),
		new: base(),
		request: {
			vocabulary: {
				old: VOCABULARY,
				new: {
					...VOCABULARY,
					constraintKeywords: VOCABULARY.constraintKeywords.slice(0, -1),
				},
			},
		},
	}),
	"constraint-keyword-operands-retyped": () => ({
		old: base(),
		new: base(),
		request: {
			vocabulary: {
				old: VOCABULARY,
				new: { ...VOCABULARY, operands: { minLength: { value: "string" } } },
			},
		},
	}),
	"v1-to-v1-1-additive-revision": () => {
		const previous = clone(base());
		previous.contractVersion = "1.0.0";
		previous.source.dialect = "https://json-schema.org/draft/2020-12/schema";
		for (const type of previous.types) {
			for (const item of type.fields ?? []) {
				delete item.multiplicity;
				delete item.unit;
			}
			delete type.relationships;
			delete type.operations;
			delete type.clauses;
		}
		return { old: previous, new: base() };
	},
	"relationship-added": () => {
		const next = clone(base());
		typeOf(next, "Artifact").relationships.push({
			identity: `ix://${PKG}/relationship/Artifact-derives_from-Artifact`,
			verb: "derives_from",
			category: "traceability",
			composite: false,
			target: `ix://${PKG}/type/Artifact`,
			multiplicity: { lower: 0, upper: 1 },
			origin: origin("types/main.tsp", 6),
		});
		return { old: base(), new: next };
	},
	"relationship-removed": () => {
		const next = clone(base());
		typeOf(next, "Artifact").relationships = [];
		return { old: base(), new: next };
	},
	"relationship-retargeted": () => {
		const next = clone(base());
		typeOf(next, "Artifact").relationships[0].target =
			`ix://${PKG}/type/Status`;
		return { old: base(), new: next };
	},
	"relationship-composite-flipped": () => {
		const next = clone(base());
		typeOf(next, "Artifact").relationships[0].composite = true;
		return { old: base(), new: next };
	},
	"operation-added": () => {
		const next = clone(base());
		typeOf(next, "Artifact").operations.push({
			identity: `ix://${PKG}/operation/Artifact-restore`,
			name: "restore",
			params: [],
			pre: [],
			post: [],
			origin: origin("types/main.tsp", 21),
		});
		return { old: base(), new: next };
	},
	"operation-returns-changed": () => {
		const next = clone(base());
		typeOf(next, "Artifact").operations[0].returns.typeRef =
			`ix://${PKG}/type/Text`;
		return { old: base(), new: next };
	},
	"clause-added": () => {
		const next = clone(base());
		typeOf(next, "Artifact").clauses.push({
			identity: `ix://${PKG}/clause/Artifact-bounded`,
			language: "sysml",
			clauseId: "bounded",
			text: "constraint { true }",
			sourceSpan: {
				sourceIdentity: SOURCE,
				path: "types/main.tsp",
				startLine: 31,
				startColumn: 1,
				endLine: 31,
				endColumn: 2,
			},
			origin: origin("types/main.tsp", 31),
		});
		return { old: base(), new: next };
	},
	"clause-language-changed": () => {
		const next = clone(base());
		typeOf(next, "Artifact").clauses[0].language = "sysml";
		return { old: base(), new: next };
	},
	"clause-removed": () => {
		const next = clone(base());
		typeOf(next, "Artifact").clauses = [];
		typeOf(next, "Artifact").operations[0].pre = [];
		return { old: base(), new: next };
	},
	"kernel-scalar-member-added": () => ({
		old: base(),
		new: base(),
		request: {
			vocabulary: {
				old: VOCABULARY,
				new: {
					...VOCABULARY,
					kernelScalars: {
						...VOCABULARY.kernelScalars,
						UUID: { irScalar: "uuid" },
					},
				},
			},
		},
	}),
	"kernel-scalar-member-removed": () => ({
		old: base(),
		new: base(),
		request: {
			vocabulary: {
				old: VOCABULARY,
				new: {
					...VOCABULARY,
					kernelScalars: { String: { irScalar: "string" } },
				},
			},
		},
	}),
	"kernel-scalar-re-represented": () => ({
		old: base(),
		new: base(),
		request: {
			vocabulary: {
				old: VOCABULARY,
				new: {
					...VOCABULARY,
					kernelScalars: {
						...VOCABULARY.kernelScalars,
						Integer: { irScalar: "number" },
					},
				},
			},
		},
	}),
};

const cases = JSON.parse(
	readFileSync(
		resolve(root, "fixtures/semantic/v1/compatibility/cases.json"),
		"utf8",
	),
);

const missing = cases
	.filter((entry) => !BUILDERS[entry.id])
	.map((entry) => entry.id);
if (missing.length > 0) {
	process.stderr.write(`no constructed pair for: ${missing.join(", ")}\n`);
	process.exitCode = 1;
}

mkdirSync(outputDir, { recursive: true });
const check = process.argv.includes("--check");
let stale = 0;
const written = new Set();
for (const entry of cases) {
	const build = BUILDERS[entry.id];
	if (!build) continue;
	const built = build();
	const document = {
		$comment: `Constructed input pair for the published compatibility case ${entry.id} (FR-051-AC-1). Built by scripts/build-compatibility-cases.mjs; the expected disposition is the published case's, never restated here.`,
		id: entry.id,
		observedFamily: entry.family,
		old: built.old,
		new: built.new,
		request: built.request ?? {},
	};
	const path = resolve(outputDir, `${entry.id}.json`);
	const bytes = `${JSON.stringify(document, null, "\t")}\n`;
	written.add(`${entry.id}.json`);
	if (check) {
		let current = "";
		try {
			current = readFileSync(path, "utf8");
		} catch {
			current = "";
		}
		if (current !== bytes) {
			process.stderr.write(`stale: ${entry.id}\n`);
			stale += 1;
		}
		continue;
	}
	writeFileSync(path, bytes);
}
for (const name of readdirSync(outputDir)) {
	if (written.has(name)) continue;
	process.stderr.write(`orphan case fixture: ${name}\n`);
	stale += 1;
}
if (check && stale > 0) process.exitCode = 1;
process.stdout.write(
	`${written.size} constructed pairs${check ? " checked" : " written"}\n`,
);
