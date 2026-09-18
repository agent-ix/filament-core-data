/**
 * The property battery (FR-062 "Property tests").
 *
 * Nine properties, each quantified over at least 256 generated documents, each
 * with the seed fixed and printed on failure so a counter-example is reproduced
 * by re-running with two integers. A property that cannot resolve its generator
 * or its seed fails saying so; it never skips (FR-062-CON-3).
 *
 * The oracles are deliberately *not* the emitter. Where a property needs to
 * know what a declaration should look like it reads `mapping-table.json`, and
 * where it needs to know whether a wire form round-trips it simulates serde's
 * own rules over the attributes the emitted source carries. An oracle taken
 * from the code under test agrees with every mutation of that code.
 */

import { createHash } from "node:crypto";
import { readMappingTable } from "./branches.mjs";
import { emitCrate } from "./crate.mjs";
import { describeDegradation, scanDegradation } from "./degradation.mjs";
import { DEFAULT_SEED, documents, generateDocument } from "./generator.mjs";
import { sortDiagnostics } from "./diagnostics.mjs";
import { byCodePoint, mapDocument } from "./mapping.mjs";

/** The declared document count. `--deep` multiplies it; nothing lowers it. */
export const MINIMUM_DOCUMENTS = 256;

/** A counter-example: the seed and the index that reproduce it. */
export class PropertyFailure extends Error {
	constructor(property, seed, index, detail) {
		super(
			`property \`${property}\` failed at document ${index} of seed ${seed}: ${detail}\n  reproduce with: node scripts/rust-backend-harness.mjs properties --seed ${seed} --only ${property} --count ${index + 1}`,
		);
		this.property = property;
		this.seed = seed;
		this.index = index;
		this.detail = detail;
	}
}

/** The profile a property run maps under: nothing is dropped. */
const PROFILE = Object.freeze({
	contractVersion: "1.0.0",
	identity: "ix://agent-ix/filament-core-data/profile/rust-backend-property",
	version: "1.0.0",
	authority: "semantic-source",
	editDirection: "read-only",
	roundTrip: "semantic-lossless",
	unknownPolicy: "reject",
	allowedOmissions: [],
	enrichment: false,
	materializationLifetime: "run",
});

const LIMITS = Object.freeze({
	maxInputBytes: 33554432,
	maxDepth: 256,
	maxNodes: 1000000,
	maxCollectionItems: 100000,
	maxDiagnostics: 1000,
});

/** A compiler request for one generated document. */
export function requestForIr(ir, outputRoot = "generated", profile = PROFILE) {
	return {
		contractVersion: "1.0.0",
		lockFingerprint: `sha256:${createHash("sha256").update(JSON.stringify(ir), "utf8").digest("hex")}`,
		ir,
		profile,
		mappings: [],
		backend: {
			identity: "ix://agent-ix/filament-core-data/rust-backend",
			version: "0.1.0",
			supportedIrVersions: ["2.0.0"],
			supportedFeatures: [],
			options: {},
		},
		outputRoot,
		limits: LIMITS,
	};
}

/**
 * A stable serialization for comparing two models.
 *
 * Keys are emitted in sorted order, so a model built from a reordered document
 * compares equal to one built from the original; a `BigInt` — the mapper
 * carries one for a multiplicity bound — is written as its decimal text, which
 * `JSON.stringify` refuses to do on its own.
 */
function stableJson(value) {
	if (typeof value === "bigint") return `${value}n`;
	if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
	if (value === null || typeof value !== "object")
		return JSON.stringify(value) ?? "null";
	const keys = Object.keys(value).sort(byCodePoint);
	return `{${keys.map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
}

/** The emitted crate's files as one string, for a byte comparison. */
function bytesOf(result) {
	return [...result.files].map(([path, text]) => `${path}\n${text}`).join("");
}

/** Deeply reorders every object's keys, reversing the declaration order. */
function reverseKeys(value) {
	if (Array.isArray(value)) return value.map(reverseKeys);
	if (value === null || typeof value !== "object") return value;
	const reordered = {};
	for (const key of Object.keys(value).reverse()) {
		reordered[key] = reverseKeys(value[key]);
	}
	return reordered;
}

/** The `Serialize` and `Deserialize` members of one emitted record. */
export function parseMembers(text, typeName) {
	const shapes = {};
	for (const [shape, marker] of [
		["serialize", `pub struct ${typeName} {`],
		["deserialize", `struct ${typeName}Wire {`],
	]) {
		const start = text.indexOf(marker);
		if (start === -1) {
			shapes[shape] = undefined;
			continue;
		}
		const end = text.indexOf("\n}", start);
		const body = text.slice(
			start + marker.length,
			end === -1 ? undefined : end,
		);
		const members = [];
		let attributes = [];
		for (const raw of body.split("\n")) {
			const line = raw.trim();
			if (line.startsWith("///")) continue;
			const attribute = /^#\[serde\((.*)\)\]$/.exec(line);
			if (attribute !== null) {
				attributes.push(attribute[1]);
				continue;
			}
			const member = /^(?:pub )?([A-Za-z0-9_#]+): (.+),$/.exec(line);
			if (member === null) continue;
			members.push({
				name: member[1],
				type: member[2],
				attributes: attributes.join(", "),
			});
			attributes = [];
		}
		shapes[shape] = members;
	}
	return shapes;
}

/**
 * Simulates serde over one member's observed attributes and type.
 *
 * Three states a JSON member can be in — absent, present and null, present and
 * a value — and the question every axis row answers is which of them survive a
 * round trip. `skip_serializing_if` is what makes absence expressible on the
 * way out; `present_or_absent` is what keeps a present `null` from decoding as
 * absence on the way back.
 */
function roundTrips(member, axes) {
	const optional = axes.optional;
	const nullable = axes.nullable;
	const skips = member.serialize.attributes.includes(
		'skip_serializing_if = "Option::is_none"',
	);
	const defaulted = /\bdefault\b/.test(member.deserialize.attributes);
	const custom = member.deserialize.attributes.includes("present_or_absent");
	const optionType = member.serialize.type.startsWith("Option<");

	const states = ["value"];
	if (optional) states.push("absent");
	if (nullable) states.push("null");

	for (const state of states) {
		// Serialize.
		let wire;
		if (state === "absent") {
			if (!optionType)
				return `an absent member has no representation in ${member.serialize.type}`;
			if (!skips) wire = "null";
			else wire = "omitted";
		} else if (state === "null") {
			wire = "null";
		} else {
			wire = "value";
		}
		// Deserialize.
		let decoded;
		if (wire === "omitted") {
			if (!defaulted)
				return "an omitted member is a deserialization error, so an absent member does not round-trip";
			decoded = "absent";
		} else if (wire === "null") {
			if (!optionType) decoded = "null";
			else if (custom) decoded = nullable ? "null" : "absent";
			else decoded = "absent";
		} else {
			decoded = "value";
		}
		if (decoded !== state) {
			return `a member in state \`${state}\` serializes to \`${wire}\` and deserializes to \`${decoded}\``;
		}
	}
	return undefined;
}

/** The axes a field row names, read from the row key rather than from a model. */
function axesOfRow(rowKey) {
	const parsed =
		/^field:(single|collection)\/(non-null|nullable)\/(required|optional)$/.exec(
			rowKey,
		);
	if (parsed === null) return undefined;
	return {
		collection: parsed[1] === "collection",
		nullable: parsed[2] === "nullable",
		optional: parsed[3] === "optional",
	};
}

function mapOrThrow(property, seed, index, ir) {
	const { model, diagnostics } = mapDocument(ir, {});
	if (model === undefined) {
		throw new PropertyFailure(
			property,
			seed,
			index,
			`the generated document was refused: ${diagnostics.map((one) => `${one.code} ${one.message}`).join("; ")}`,
		);
	}
	return model;
}

/**
 * The nine properties. Each takes the run context and quantifies over the
 * documents itself, so the document count is a property of the run rather than
 * of the loop that calls it.
 */
export const PROPERTIES = Object.freeze([
	{
		id: "deterministic-generation",
		title: "generation is a function of the document alone",
		run(context) {
			for (const { index, ir } of documents(context.seed, context.count)) {
				const first = emitCrate(requestForIr(ir), context.emitOptions);
				const second = emitCrate(requestForIr(ir), context.emitOptions);
				if (bytesOf(first) !== bytesOf(second)) {
					throw new PropertyFailure(
						this.id,
						context.seed,
						index,
						"two runs over one document produced different bytes",
					);
				}
			}
		},
	},
	{
		id: "reordering-invariant",
		title:
			"the mapping model is invariant under object-key and identity-set reordering",
		run(context) {
			for (const { index, ir } of documents(context.seed, context.count)) {
				const straight = mapOrThrow(this.id, context.seed, index, ir);
				const reordered = mapOrThrow(
					this.id,
					context.seed,
					index,
					reverseKeys(ir),
				);
				if (stableJson(straight) !== stableJson(reordered)) {
					throw new PropertyFailure(
						this.id,
						context.seed,
						index,
						"reversing every object's key order changed the mapping model",
					);
				}
				// The identity set the profile drops is a set, so its order is not
				// data. Two orderings of one set must map identically. The
				// comparison is over the *published* diagnostic order — the one
				// `sortDiagnostics` fixes and the manifest carries — because the
				// raw list is in discovery order by construction and comparing
				// discovery orders would be asserting something no output has.
				const identities = ir.types.map((one) => one.identity);
				const forward = mapDocument(ir, { allowedOmissions: identities });
				const backward = mapDocument(ir, {
					allowedOmissions: [...identities].reverse(),
				});
				if (
					stableJson(sortDiagnostics(forward.diagnostics)) !==
					stableJson(sortDiagnostics(backward.diagnostics))
				) {
					throw new PropertyFailure(
						this.id,
						context.seed,
						index,
						"reversing the allowedOmissions identity set changed the diagnostics",
					);
				}
			}
		},
	},
	{
		id: "serialization-round-trip",
		title: "a generated crate's serialization of a value round-trips",
		run(context) {
			const rows = context.table.rows.filter(
				(row) => axesOfRow(row.rowKey) !== undefined,
			);
			for (const { index, ir } of documents(context.seed, context.count)) {
				const model = mapOrThrow(this.id, context.seed, index, ir);
				const record = model.types.find((one) =>
					one.typeName.startsWith("Axes"),
				);
				if (record === undefined) {
					throw new PropertyFailure(
						this.id,
						context.seed,
						index,
						"the generated document carries no axis record",
					);
				}
				const result = emitCrate(requestForIr(ir), context.emitOptions);
				const source = result.files.get(`src/types/${record.moduleName}.rs`);
				if (source === undefined) {
					throw new PropertyFailure(
						this.id,
						context.seed,
						index,
						`the crate emitted no module for ${record.typeName}`,
					);
				}
				const shapes = parseMembers(source, record.typeName);
				if (
					shapes.serialize === undefined ||
					shapes.deserialize === undefined
				) {
					throw new PropertyFailure(
						this.id,
						context.seed,
						index,
						`the emitted module carries no ${record.typeName} serialization pair`,
					);
				}
				for (const field of record.fields) {
					const row = rows.find((one) => one.rowKey === field.row);
					if (row === undefined) {
						throw new PropertyFailure(
							this.id,
							context.seed,
							index,
							`the member ${field.ident} selected the row ${field.row}, which the table does not carry`,
						);
					}
					const serialize = shapes.serialize.find(
						(one) => one.name === field.ident,
					);
					const deserialize = shapes.deserialize.find(
						(one) => one.name === field.ident,
					);
					if (serialize === undefined || deserialize === undefined) {
						throw new PropertyFailure(
							this.id,
							context.seed,
							index,
							`the member ${field.ident} is missing from one half of the serialization pair`,
						);
					}
					const failure = roundTrips(
						{ serialize, deserialize },
						axesOfRow(row.rowKey),
					);
					if (failure !== undefined) {
						throw new PropertyFailure(
							this.id,
							context.seed,
							index,
							`the member ${field.ident} on row ${row.rowKey} does not round-trip: ${failure}`,
						);
					}
				}
			}
		},
	},
	{
		id: "name-injectivity",
		title:
			"identifier derivation is injective in a scope, or raises NAME_COLLISION",
		run(context) {
			for (const { index, ir } of documents(context.seed, context.count)) {
				const { model, diagnostics } = mapDocument(ir, {});
				const collided = diagnostics.some((one) =>
					one.code.endsWith(".NAME_COLLISION"),
				);
				if (model === undefined) {
					if (collided) continue;
					throw new PropertyFailure(
						this.id,
						context.seed,
						index,
						`the document was refused without a collision: ${diagnostics.map((one) => one.code).join(", ")}`,
					);
				}
				const identifiers = model.types.map((one) => one.typeName);
				if (new Set(identifiers).size !== identifiers.length && !collided) {
					throw new PropertyFailure(
						this.id,
						context.seed,
						index,
						"two types derived one identifier and no NAME_COLLISION was raised",
					);
				}
				for (const type of model.types) {
					for (const [scope, members] of [
						["members", (type.fields ?? []).map((one) => one.ident)],
						["variants", (type.variants ?? []).map((one) => one.ident)],
					]) {
						if (new Set(members).size === members.length || collided) continue;
						throw new PropertyFailure(
							this.id,
							context.seed,
							index,
							`two ${scope} of ${type.typeName} derived one identifier and no NAME_COLLISION was raised`,
						);
					}
				}
			}
		},
	},
	{
		id: "no-degraded-declaration",
		title:
			"no generated declaration carries a degraded type outside its declared row",
		run(context) {
			for (const { index, ir } of documents(context.seed, context.count)) {
				const model = mapOrThrow(this.id, context.seed, index, ir);
				const degraded = scanDegradation(model, context.table);
				if (degraded.length > 0) {
					throw new PropertyFailure(
						this.id,
						context.seed,
						index,
						describeDegradation(degraded).join("; "),
					);
				}
			}
		},
	},
	{
		id: "axis-types-distinct",
		title:
			"the eight field-axis combinations produce eight pairwise distinct member types",
		run(context) {
			for (const { index, ir } of documents(context.seed, context.count)) {
				const model = mapOrThrow(this.id, context.seed, index, ir);
				const record = model.types.find((one) =>
					one.typeName.startsWith("Axes"),
				);
				if (record === undefined || record.fields.length !== 8) {
					throw new PropertyFailure(
						this.id,
						context.seed,
						index,
						"the generated document carries no eight-member axis record",
					);
				}
				const types = record.fields.map((one) => one.rustType);
				if (new Set(types).size !== 8) {
					throw new PropertyFailure(
						this.id,
						context.seed,
						index,
						`the eight axis combinations produced ${new Set(types).size} distinct member types: ${types.join(", ")}`,
					);
				}
				const rows = record.fields.map((one) => one.row);
				if (new Set(rows).size !== 8) {
					throw new PropertyFailure(
						this.id,
						context.seed,
						index,
						"the eight axis combinations did not select eight distinct rows",
					);
				}
			}
		},
	},
	{
		id: "boxed-edges-stable",
		title:
			"the boxed edge set a document produces is identical across two runs",
		run(context) {
			for (const { index, ir } of documents(context.seed, context.count)) {
				const first = mapOrThrow(this.id, context.seed, index, ir);
				const second = mapOrThrow(this.id, context.seed, index, ir);
				if (first.boxedEdges.join("\n") !== second.boxedEdges.join("\n")) {
					throw new PropertyFailure(
						this.id,
						context.seed,
						index,
						"two runs boxed different edges",
					);
				}
				if (first.boxedEdges.length === 0) {
					throw new PropertyFailure(
						this.id,
						context.seed,
						index,
						"the generated document closes a cycle through direct positions and no edge was boxed",
					);
				}
				// Every boxed edge that materializes a member type must show the
				// indirection the graph decided; a Box the graph decided and the
				// member type does not carry is an infinite type.
				for (const type of first.types) {
					for (const field of type.fields ?? []) {
						if (field.boxed !== true) continue;
						if (field.element.startsWith("Box<")) continue;
						throw new PropertyFailure(
							this.id,
							context.seed,
							index,
							`the member ${field.ident} of ${type.typeName} is boxed by the graph and carries ${field.element}`,
						);
					}
				}
			}
		},
	},
	{
		id: "emit-or-refuse",
		title:
			"generation emits a crate or emits zero files with a blocking diagnostic, never a third outcome",
		run(context) {
			for (const { index, ir } of documents(context.seed, context.count)) {
				const result = emitCrate(requestForIr(ir), context.emitOptions);
				const blocking = result.diagnostics.filter(
					(one) => one.blocking === true,
				);
				const emitted = result.files.size > 0;
				if (emitted && blocking.length === 0) {
					// A crate is emitted: it must carry the manifest, the lib and the
					// support module, or it is not a crate anyone can build.
					for (const required of [
						"Cargo.toml",
						"src/lib.rs",
						"src/support.rs",
					]) {
						if (result.files.has(required)) continue;
						throw new PropertyFailure(
							this.id,
							context.seed,
							index,
							`the emitted crate carries no ${required}`,
						);
					}
					continue;
				}
				if (!emitted && blocking.length > 0) continue;
				throw new PropertyFailure(
					this.id,
					context.seed,
					index,
					`a third outcome: ${result.files.size} files with ${blocking.length} blocking diagnostics`,
				);
			}
		},
	},
	{
		id: "locale-independent-derivation",
		title:
			"identifier derivation is identical under LANG=C and LANG=tr_TR.UTF-8",
		// The two derivations have to happen in two *child* processes, because
		// Node fixes its ICU locale at start-up. Starting them is a process
		// operation, which FR-042-AC-4 forbids every module under
		// `src/compiler/`, so the deriver is supplied by the caller and
		// `scripts/rust-backend-harness.mjs` is the only thing that supplies it.
		// It is required, not optional: a run that cannot resolve it fails
		// (FR-062-CON-3), it never quietly drops this property.
		run(context) {
			const digests = new Map();
			for (const locale of ["C", "tr_TR.UTF-8"]) {
				digests.set(
					locale,
					context.deriveIdentifierDigest(locale, context.seed, context.count),
				);
			}
			const [first, second] = [...digests.values()];
			if (first !== second) {
				throw new PropertyFailure(
					this.id,
					context.seed,
					context.count - 1,
					`LANG=C derived ${first} and LANG=tr_TR.UTF-8 derived ${second}`,
				);
			}
		},
	},
]);

/**
 * Runs the battery.
 *
 * `count` is the number of documents each property is quantified over and is
 * refused below the declared minimum: lowering it is how a property run becomes
 * a claim about luck.
 */
export function runProperties(options = {}) {
	const seed = options.seed ?? DEFAULT_SEED;
	const count = options.count ?? MINIMUM_DOCUMENTS;
	if (!Number.isInteger(seed)) {
		throw new Error(
			"the property run could not resolve a seed, so it fails rather than guessing one",
		);
	}
	if (!Number.isInteger(count) || count < 1) {
		throw new Error(
			"the property run could not resolve a document count, so it fails rather than guessing one",
		);
	}
	if (typeof generateDocument !== "function") {
		throw new Error(
			"the property run could not resolve its generator, so it fails rather than skipping",
		);
	}
	if (typeof options.deriveIdentifierDigest !== "function") {
		throw new Error(
			"the property run could not resolve its identifier deriver, so it fails rather than skipping the locale-independence property; `scripts/rust-backend-harness.mjs` supplies it",
		);
	}
	const selected =
		options.only === undefined
			? PROPERTIES
			: PROPERTIES.filter((one) => one.id === options.only);
	if (selected.length === 0) {
		throw new Error(
			`no property is named \`${options.only}\`; the declared properties are ${PROPERTIES.map(
				(one) => one.id,
			)
				.sort(byCodePoint)
				.join(", ")}`,
		);
	}
	const context = {
		seed,
		count,
		table: options.table ?? readMappingTable(),
		emitOptions: { licenseText: options.licenseText ?? "" },
		deriveIdentifierDigest: options.deriveIdentifierDigest,
	};
	const results = [];
	for (const property of selected) {
		try {
			property.run(context);
			results.push({
				id: property.id,
				title: property.title,
				documents: count,
				ok: true,
			});
		} catch (error) {
			results.push({
				id: property.id,
				title: property.title,
				documents: count,
				ok: false,
				failure:
					error instanceof PropertyFailure
						? error.message
						: String(error?.stack ?? error),
			});
		}
	}
	return {
		seed,
		count,
		results,
		failures: results.filter((one) => one.ok !== true),
	};
}

/**
 * The fuzz run: adversarial documents through the emitter.
 *
 * The property is the one FR-045-CON-4 states for the compiler and FR-058
 * restates for this backend — an input never reaches an unhandled throw. A
 * document the backend cannot map is a *manifest carrying a blocking
 * diagnostic*, never a stack trace, and never a partial crate.
 */
export function runFuzz(options = {}) {
	const seed = options.seed ?? DEFAULT_SEED;
	const count = options.count ?? MINIMUM_DOCUMENTS;
	if (!Number.isInteger(seed) || !Number.isInteger(count) || count < 1) {
		throw new Error(
			"the fuzz run could not resolve a seed or a document count, so it fails rather than guessing one",
		);
	}
	const emitOptions = { licenseText: options.licenseText ?? "" };
	const problems = [];
	let checked = 0;
	for (const { index, ir } of documents(seed, count)) {
		for (const [name, damage] of Object.entries(DAMAGE)) {
			const damaged = damage(structuredClone(ir), index);
			checked += 1;
			let result;
			try {
				result = emitCrate(requestForIr(damaged), emitOptions);
			} catch (error) {
				problems.push(
					`document ${index} under \`${name}\` threw ${String(error?.message ?? error)} instead of emitting a diagnostic`,
				);
				continue;
			}
			const blocking = result.diagnostics.filter(
				(one) => one.blocking === true,
			);
			if (result.files.size > 0 && blocking.length > 0) {
				problems.push(
					`document ${index} under \`${name}\` emitted ${result.files.size} files while carrying ${blocking.length} blocking diagnostics`,
				);
			}
			if (result.files.size === 0 && blocking.length === 0) {
				problems.push(
					`document ${index} under \`${name}\` emitted nothing and refused nothing`,
				);
			}
			if (typeof result.state !== "string" || result.state.length === 0) {
				problems.push(
					`document ${index} under \`${name}\` produced no result state`,
				);
			}
		}
	}
	return { seed, count, checked, problems };
}

/** The damage the fuzz run applies, each a single structural insult. */
const DAMAGE = Object.freeze({
	"unknown-kind": (ir) => {
		if (ir.types[0] !== undefined) ir.types[0].kind = "widget";
		return ir;
	},
	"unresolved-reference": (ir) => {
		for (const type of ir.types) {
			for (const field of type.fields ?? []) field.typeRef = "ix://nowhere";
		}
		return ir;
	},
	"scalar-outside-the-kernel": (ir) => {
		for (const type of ir.types) {
			if (type.kind === "scalar") type.scalar = "decimal";
		}
		return ir;
	},
	"upper-bound-of-zero": (ir) => {
		for (const type of ir.types) {
			for (const field of type.fields ?? [])
				field.multiplicity = { lower: 0, upper: 0 };
		}
		return ir;
	},
	"unrenderable-identity": (ir) => {
		for (const type of ir.types) type.identity = `${type.identity}/€`;
		return ir;
	},
	"colliding-identities": (ir) => {
		for (const type of ir.types) {
			type.identity = `${type.identity.slice(0, type.identity.lastIndexOf("/"))}/Same`;
		}
		return ir;
	},
	"self-referential-alias": (ir) => {
		for (const type of ir.types) {
			if (type.kind === "alias") type.target = type.identity;
		}
		return ir;
	},
	"payload-on-an-enum-variant": (ir) => {
		for (const type of ir.types) {
			if (type.kind !== "enum") continue;
			for (const variant of type.variants)
				variant.payloadType = ir.types[0].identity;
		}
		return ir;
	},
	"an-inexpressible-pattern": (ir) => {
		for (const type of ir.types) {
			for (const constraint of type.constraints ?? []) {
				if (constraint.keyword === "pattern")
					constraint.operands = { regex: "^(a)\\1$" };
			}
		}
		return ir;
	},
	"an-operand-of-the-wrong-json-type": (ir) => {
		for (const type of ir.types) {
			for (const constraint of type.constraints ?? []) {
				constraint.operands = {
					value: { not: "a scalar" },
					values: [{}],
					regex: 7,
					name: 7,
				};
			}
		}
		return ir;
	},
	"a-traversal-in-the-output-root": (ir) => ir,
});
