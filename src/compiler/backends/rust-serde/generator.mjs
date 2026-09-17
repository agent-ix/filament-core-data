/**
 * The seeded IR document generator the property tests run over (FR-062).
 *
 * The generator is a pure function of `(seed, index)`: the same pair produces
 * the same document on every host, so a counter-example is reproduced by
 * printing two integers rather than by shipping a corpus. Nothing here reads a
 * clock, an environment variable or a filesystem.
 *
 * Every document carries, by construction rather than by chance:
 *
 * - one scalar type per kernel scalar the backend maps, so a run touches every
 *   `scalar:` row;
 * - one record whose eight members are the eight combinations of the three
 *   field axes over one element type, which is what FR-062-AC-11's pairwise
 *   distinctness is quantified over;
 * - a two-type cycle through direct positions, so the boxed edge set is never
 *   empty and FR-062-AC-12 has something to be stable about;
 * - an alias chain, a sequence, a map, a reference, an enum and a union, so
 *   every `kind:` and `indirection:` row is reached.
 *
 * What varies with the seed is the *names*, the constraint operands, the
 * unknown policies, the default kinds, and the order the types are declared in
 * — the axes a property is quantified over. What does not vary is the presence
 * of each branch, because a generator that reached a branch only sometimes
 * would make the number of documents a property ran a claim about luck.
 */

/** The declared seed. A run that cannot resolve a seed fails; it never guesses. */
export const DEFAULT_SEED = 0x5eed0062;

/** The kernel scalars a document may declare — `bytes` is the refusal row. */
export const GENERATED_KERNEL_SCALARS = Object.freeze([
	"any",
	"boolean",
	"integer",
	"number",
	"string",
	"date",
	"datetime",
	"duration",
	"uuid",
]);

/** The eight combinations of the three field axes, in a fixed order. */
export const AXIS_COMBINATIONS = Object.freeze(
	[false, true].flatMap((collection) =>
		[false, true].flatMap((nullable) =>
			[false, true].map((optional) => ({ collection, nullable, optional })),
		),
	),
);

/** mulberry32: a small, fully specified PRNG, so the stream is portable. */
export function rng(seed) {
	let state = seed >>> 0;
	return function next() {
		state = (state + 0x6d2b79f5) >>> 0;
		let t = state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

const WORDS = Object.freeze([
	"alpha",
	"bravo",
	"charlie",
	"delta",
	"echo",
	"foxtrot",
	"golf",
	"hotel",
	"india",
	"juliet",
	"kilo",
	"lima",
]);

const POLICIES = Object.freeze(["reject", "preserve", "surface"]);

function locus(path, line) {
	return {
		source: {
			sourceIdentity: "ix://agent-ix/filament-core-data/source/typespec",
			path,
			startLine: line,
			startColumn: 1,
		},
	};
}

function pascal(text) {
	return text
		.split("-")
		.map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
		.join("");
}

/**
 * One generated document.
 *
 * `index` distinguishes documents within one seed; `seed` distinguishes runs.
 * The pair is mixed once so that consecutive indices do not produce correlated
 * streams.
 */
export function generateDocument(seed, index) {
	const next = rng(
		(Math.imul(seed >>> 0, 0x9e3779b1) + index * 0x85ebca6b) >>> 0,
	);
	const pick = (list) => list[Math.floor(next() * list.length) % list.length];
	const ns = "ix://agent-ix/generated";
	const suffix = `${pick(WORDS)}${index}`;
	const type = (name) => `${ns}/type/${name}`;
	const types = [];
	let line = 0;
	const at = (path) => {
		line += 2;
		return locus(path, line);
	};

	for (const scalar of GENERATED_KERNEL_SCALARS) {
		const name = `${pascal(scalar)}${pascal(suffix)}`;
		types.push({
			identity: type(name),
			displayName: name,
			kind: "scalar",
			roles: [],
			origin: at("model/scalars.tsp"),
			constraints: constraintsFor(scalar, type(name), next),
			extensions: [],
			unknownPolicy: pick(POLICIES),
			scalar,
		});
	}

	const element = type(`String${pascal(suffix)}`);
	const aliasName = `Alias${pascal(suffix)}`;
	types.push({
		identity: type(aliasName),
		displayName: aliasName,
		kind: "alias",
		roles: [],
		origin: at("model/alias.tsp"),
		constraints: [],
		extensions: [],
		unknownPolicy: pick(POLICIES),
		target: element,
	});

	const enumName = `Enum${pascal(suffix)}`;
	types.push({
		identity: type(enumName),
		displayName: enumName,
		kind: "enum",
		roles: [],
		origin: at("model/enum.tsp"),
		constraints: [],
		extensions: [],
		unknownPolicy: pick(POLICIES),
		variants: [pick(WORDS), "final", `${pick(WORDS)}-two`].map(
			(name, position) => ({
				identity: `${ns}/variant/${enumName}-${position}`,
				name: `${name}${position}`,
				origin: at("model/enum.tsp"),
			}),
		),
	});

	const unionName = `Union${pascal(suffix)}`;
	types.push({
		identity: type(unionName),
		displayName: unionName,
		kind: "union",
		roles: [],
		origin: at("model/union.tsp"),
		constraints: [],
		extensions: [],
		unknownPolicy: pick(POLICIES),
		variants: [
			{
				identity: `${ns}/variant/${unionName}-text`,
				name: "text",
				payloadType: element,
				origin: at("model/union.tsp"),
			},
			{
				identity: `${ns}/variant/${unionName}-flag`,
				name: "flag",
				payloadType: type(`Boolean${pascal(suffix)}`),
				origin: at("model/union.tsp"),
			},
		],
	});

	const sequenceName = `Seq${pascal(suffix)}`;
	types.push({
		identity: type(sequenceName),
		displayName: sequenceName,
		kind: "sequence",
		roles: [],
		origin: at("model/collections.tsp"),
		constraints: [],
		extensions: [],
		unknownPolicy: pick(POLICIES),
		items: element,
	});

	const mapName = `Map${pascal(suffix)}`;
	types.push({
		identity: type(mapName),
		displayName: mapName,
		kind: "map",
		roles: [],
		origin: at("model/collections.tsp"),
		constraints: [],
		extensions: [],
		unknownPolicy: pick(POLICIES),
		values: element,
	});

	const referenceName = `Ref${pascal(suffix)}`;
	const cycleLeft = `Left${pascal(suffix)}`;
	const cycleRight = `Right${pascal(suffix)}`;
	types.push({
		identity: type(referenceName),
		displayName: referenceName,
		kind: "reference",
		roles: [],
		origin: at("model/reference.tsp"),
		constraints: [],
		extensions: [],
		unknownPolicy: pick(POLICIES),
		target: type(cycleLeft),
	});

	// The axis record: eight members, one per combination, over one element
	// type, so the eight mapped member types differ only by the axes.
	const axisName = `Axes${pascal(suffix)}`;
	types.push({
		identity: type(axisName),
		displayName: axisName,
		kind: "record",
		roles: [],
		origin: at("model/axes.tsp"),
		constraints: [],
		extensions: [],
		unknownPolicy: pick(POLICIES),
		fields: AXIS_COMBINATIONS.map((axes, position) => ({
			identity: `${ns}/field/${axisName}-${position}`,
			name: `member${position}`,
			typeRef: element,
			presence: axes.optional ? "optional" : "required",
			nullable: axes.nullable,
			defaultKind: "none",
			origin: at("model/axes.tsp"),
			multiplicity: {
				lower: axes.optional ? 0 : 1,
				upper: axes.collection ? 8 : 1,
			},
		})),
	});

	// The cycle: two records that reach each other at direct positions, so the
	// component is non-trivial and at least one edge is boxed.
	types.push({
		identity: type(cycleLeft),
		displayName: cycleLeft,
		kind: "record",
		roles: ["agent-ix:entity"],
		origin: at("model/cycle.tsp"),
		constraints: [],
		extensions: [],
		unknownPolicy: "reject",
		relationships: [
			{
				identity: `${ns}/relationship/${cycleLeft}-owns`,
				verb: "owns",
				category: "structural",
				composite: true,
				target: type(cycleRight),
				multiplicity: { lower: 1, upper: 1 },
				origin: at("model/cycle.tsp"),
			},
		],
		clauses: [
			{
				identity: `${ns}/clause/${cycleLeft}-invariant`,
				language: "ocl",
				clauseId: "left-invariant",
				text: "self.right <> null",
				origin: at("model/cycle.tsp"),
			},
		],
		operations: [
			{
				identity: `${ns}/operation/${cycleLeft}-resize`,
				name: "resize",
				params: [
					{
						identity: `${ns}/param/${cycleLeft}-resize-size`,
						name: "size",
						typeRef: type(`Integer${pascal(suffix)}`),
						presence: "required",
						nullable: false,
						defaultKind: "none",
						origin: at("model/cycle.tsp"),
						multiplicity: { lower: 1, upper: 1 },
					},
					{
						// Optional and collection-valued and nullable: the one
						// parameter whose metadata type exercises all three axes.
						identity: `${ns}/param/${cycleLeft}-resize-hints`,
						name: "hints",
						typeRef: element,
						presence: "optional",
						nullable: true,
						defaultKind: "none",
						origin: at("model/cycle.tsp"),
						multiplicity: { lower: 0, upper: 4 },
					},
				],
				returns: {
					typeRef: type(cycleRight),
					multiplicity: { lower: 0, upper: 1 },
					nullable: false,
				},
				pre: [],
				post: [],
				origin: at("model/cycle.tsp"),
			},
		],
		fields: [
			{
				identity: `${ns}/field/${cycleLeft}-right`,
				name: "right",
				typeRef: type(cycleRight),
				presence: "required",
				nullable: false,
				defaultKind: "none",
				origin: at("model/cycle.tsp"),
				multiplicity: { lower: 1, upper: 1 },
			},
		],
	});
	types.push({
		identity: type(cycleRight),
		displayName: cycleRight,
		kind: "record",
		roles: [],
		origin: at("model/cycle.tsp"),
		constraints: [],
		extensions: [],
		unknownPolicy: "reject",
		fields: [
			{
				identity: `${ns}/field/${cycleRight}-left`,
				name: "left",
				typeRef: type(cycleLeft),
				presence: "optional",
				nullable: false,
				defaultKind: "none",
				origin: at("model/cycle.tsp"),
				multiplicity: { lower: 0, upper: 1 },
			},
			{
				identity: `${ns}/field/${cycleRight}-tags`,
				name: "tags",
				typeRef: type(sequenceName),
				presence: "required",
				nullable: false,
				defaultKind: "representation",
				defaultValue: [],
				origin: at("model/cycle.tsp"),
				multiplicity: { lower: 1, upper: 1 },
			},
			{
				identity: `${ns}/field/${cycleRight}-kind`,
				name: "kind",
				typeRef: type(enumName),
				presence: "required",
				nullable: false,
				defaultKind: "semantic",
				defaultValue: "final1",
				origin: at("model/cycle.tsp"),
				multiplicity: { lower: 1, upper: 1 },
			},
			{
				identity: `${ns}/field/${cycleRight}-note`,
				name: "note",
				typeRef: element,
				presence: "required",
				nullable: false,
				defaultKind: "migration",
				defaultValue: "seed",
				origin: at("model/cycle.tsp"),
				multiplicity: { lower: 1, upper: 1 },
			},
			{
				identity: `${ns}/field/${cycleRight}-link`,
				name: "link",
				typeRef: type(referenceName),
				presence: "required",
				nullable: false,
				defaultKind: "none",
				origin: at("model/cycle.tsp"),
				multiplicity: { lower: 1, upper: 1 },
			},
			{
				identity: `${ns}/field/${cycleRight}-alias`,
				name: "aliased",
				typeRef: type(aliasName),
				presence: "required",
				nullable: false,
				defaultKind: "none",
				origin: at("model/cycle.tsp"),
				multiplicity: { lower: 1, upper: 1 },
			},
			{
				identity: `${ns}/field/${cycleRight}-payload`,
				name: "payload",
				typeRef: type(unionName),
				presence: "required",
				nullable: false,
				defaultKind: "none",
				origin: at("model/cycle.tsp"),
				multiplicity: { lower: 1, upper: 1 },
			},
			{
				identity: `${ns}/field/${cycleRight}-lookup`,
				name: "lookup",
				typeRef: type(mapName),
				presence: "required",
				nullable: false,
				defaultKind: "none",
				origin: at("model/cycle.tsp"),
				multiplicity: { lower: 1, upper: 1 },
			},
		],
	});

	return {
		contractVersion: "1.1.0",
		source: {
			identity: "ix://agent-ix/filament-core-data/source/typespec",
			version: "1.0.0",
			dialect: "typespec",
			digest: `sha256:${"0".repeat(64)}`,
		},
		package: {
			identity: `agent-ix/generated-${index}`,
			version: "1.0.0",
			manifestDigest: `sha256:${"1".repeat(64)}`,
			mappingVersions: ["1.0.0"],
			profileVersions: ["1.0.0"],
			lockDigest: `sha256:${"2".repeat(64)}`,
		},
		types,
		occurrences: [
			{
				identity: `${ns}/occurrence/${cycleLeft}-1`,
				definition: type(cycleLeft),
				observedAt: "2026-01-01T00:00:00Z",
				value: { right: { left: null } },
			},
		],
		extensions: [
			{
				identity: `${ns}/ext/doc`,
				version: "1.0.0",
				required: false,
				capability: "documentation",
				payload: { text: `generated document ${index}` },
			},
		],
	};
}

/** The constraints a generated scalar carries, chosen so each keyword applies. */
function constraintsFor(scalar, identity, next) {
	const constraints = [];
	const add = (keyword, operands) =>
		constraints.push({
			identity: `${identity}/constraint/${keyword}`,
			keyword,
			operands,
			appliesTo: identity,
			origin: locus("model/scalars.tsp", constraints.length + 1),
		});
	if (scalar === "string") {
		add("minLength", { value: Math.floor(next() * 3) });
		add("maxLength", { value: 64 + Math.floor(next() * 64) });
		add("pattern", { regex: "^[a-z][a-z0-9-]*$" });
	}
	if (scalar === "integer") {
		add("min", { value: Math.floor(next() * 4) });
		add("max", { value: 1000 + Math.floor(next() * 1000) });
	}
	if (scalar === "number") {
		add("exclusiveMin", { value: -1 });
		add("exclusiveMax", { value: 1e6 });
	}
	if (scalar === "date") add("min", { value: "2020-01-01" });
	if (scalar === "datetime") add("max", { value: "2030-01-01T00:00:00Z" });
	if (scalar === "boolean") add("enumValues", { values: [true, false] });
	if (scalar === "uuid")
		add("enumValues", { values: ["00000000-0000-0000-0000-000000000000"] });
	return constraints;
}

/** A stream of `count` documents, in index order. */
export function* documents(seed, count) {
	for (let index = 0; index < count; index += 1) {
		yield { index, ir: generateDocument(seed, index) };
	}
}
