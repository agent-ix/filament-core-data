import { fileURLToPath } from "node:url";
import { readdirSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";

const SCRIPT_ROOT = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_ROOT, "..");

function directoriesUnder(root) {
	const found = [];
	const visit = (directory) => {
		for (const entry of readdirSync(directory, { withFileTypes: true })) {
			if (!entry.isDirectory()) continue;
			const child = resolve(directory, entry.name);
			found.push(relative(REPO_ROOT, child).replaceAll("\\", "/"));
			visit(child);
		}
	};
	visit(root);
	return found.sort();
}

export const MATRIX_COLUMNS = Object.freeze([
	...directoriesUnder(resolve(REPO_ROOT, "src/compiler/backends")),
	...readdirSync(resolve(REPO_ROOT, "conformance/oracle"))
		.filter((name) => name.endsWith(".mjs"))
		.sort()
		.map((name) => `conformance/oracle/${name}`),
	"src/compiler/ir/reader.mjs",
]);

const ROOT = "ix://agent-ix/age-2229-numeric-matrix";
const SOURCE = {
	identity: `${ROOT}/source`,
	version: "1.0.0",
	dialect: "spec-bundle",
	digest: `sha256:${"1".repeat(64)}`,
};
const PACKAGE = {
	identity: "agent-ix/age-2229-numeric-matrix",
	version: "1.0.0",
	manifestDigest: `sha256:${"2".repeat(64)}`,
	mappingVersions: ["1.0.0"],
	profileVersions: ["1.0.0"],
	lockDigest: `sha256:${"3".repeat(64)}`,
};

const NESTINGS = ["field", "collection", "nested", "option"];
const DEPTHS = [0, 1, 2];
const matrixFamilies = [
	[
		"integer-safe",
		"integer",
		["safe", "positive", "negative", "narrowed"],
		["number"],
	],
	["integer-wide-i64", "integer", ["wide-i64"], ["string-safe"]],
	["integer-wide-u64", "integer", ["wide-u64"], ["string-safe"]],
	["integer-wide-i128", "integer", ["wide-i128"], ["string-safe"]],
	["integer-width-int8", "integer", ["int8"], ["number"]],
	["integer-width-u64", "integer", ["uint64"], ["string-safe"]],
	["boolean-enum", "boolean", ["enum"], ["boolean"]],
	["float32", "float32", ["none", "positive"], ["number"]],
	["float64", "float64", ["none", "positive"], ["number"]],
	["decimal", "decimal", ["none"], ["string-safe"]],
	["string", "string", ["none"], ["string-safe"]],
	["string-alias", "string", ["none"], ["string-safe"]],
];

const baseMatrixCells = matrixFamilies.flatMap(
	([family, kind, ranges, wires]) =>
		ranges.flatMap((range) =>
			DEPTHS.flatMap((depth) =>
				NESTINGS.flatMap((nesting) =>
					wires.map((wire) =>
						Object.freeze({
							name: `${family}-${range}-${depth}-${nesting}-${wire}`,
							kind,
							range,
							depth,
							nesting,
							wire,
							aliasMode:
								depth === 0
									? "none"
									: ["safe", "positive", "negative", "narrowed"].includes(range)
										? "child-narrowed"
										: "inherited",
							nullable: (depth + (nesting === "nested" ? 1 : 0)) % 2 === 1,
							lexeme:
								kind === "integer" && depth === 2
									? range === "safe"
										? "zero-huge-exponent"
										: "huge-exponent"
									: "ordinary",
							rawLexeme:
								kind === "integer" && depth === 2
									? range === "safe"
										? "0e9223372036854775807"
										: "1e9223372036854775807"
									: "ordinary",
							oracleWidth:
								kind === "integer"
									? range === "wide-i128"
										? "i128"
										: range === "wide-i64" || range === "wide-u64"
											? "numeric7"
											: "safe"
									: "safe",
							columns: MATRIX_COLUMNS,
						}),
					),
				),
			),
		),
);

const BOUND_SHAPES = [
	"min",
	"max",
	"exclusiveMin",
	"exclusiveMax",
	"min+max",
	"min+exclusiveMin",
	"min+exclusiveMax",
	"max+exclusiveMin",
	"max+exclusiveMax",
	"exclusiveMin+exclusiveMax",
];
const BOUND_VALUES = ["0", "1", "edge", "edge+1"];
const UINT64_EDGE = 18446744073709551615n;

const boundProbeCells = BOUND_SHAPES.flatMap((shape) =>
	BOUND_VALUES.map((boundValue) =>
		Object.freeze({
			name: `native-integer-inline-${shape}-${boundValue}`,
			kind: "integer",
			range: "inline-bounds",
			depth: 0,
			nesting: "field",
			wire: "native-inline",
			aliasMode: "none",
			nullable: false,
			lexeme: "ordinary",
			rawLexeme: "ordinary",
			oracleWidth: "numeric7",
			native: true,
			boundShape: shape,
			boundValue,
			columns: MATRIX_COLUMNS,
		}),
	),
);

const nativeFloat32Cells = ["in-range", "above-binary32-max"].map((range) =>
	Object.freeze({
		name: `native-float32-${range}`,
		kind: "float32",
		range,
		depth: 0,
		nesting: "field",
		wire: "native",
		aliasMode: "none",
		nullable: false,
		lexeme: "ordinary",
		rawLexeme: "ordinary",
		oracleWidth: "safe",
		native: true,
		columns: MATRIX_COLUMNS,
	}),
);

const decimalRegexCell = Object.freeze({
	name: "decimal-regex-escaped-dot",
	kind: "decimal",
	range: "regex-escaped-dot",
	depth: 0,
	nesting: "field",
	wire: "string-safe",
	aliasMode: "none",
	nullable: false,
	lexeme: "ordinary",
	rawLexeme: "ordinary",
	oracleWidth: "safe",
	decimalRegex: true,
	columns: MATRIX_COLUMNS,
});

export const MATRIX_CELLS = Object.freeze([
	...baseMatrixCells,
	...boundProbeCells,
	...nativeFloat32Cells,
	decimalRegexCell,
]);

const origin = {
	source: {
		sourceIdentity: SOURCE.identity,
		path: "generated/age-2229-numeric-matrix.json",
		startLine: 1,
		startColumn: 1,
	},
};

function identity(name) {
	return `${ROOT}/type/${name}`;
}

function safeStem(name) {
	return name.replaceAll(/[^A-Za-z0-9_]/g, "_");
}

function constraint(owner, keyword, value, scalar) {
	return {
		identity: `${ROOT}/constraint/${owner}-${keyword}`,
		keyword,
		operands: { value },
		appliesTo: identity(owner),
		diagnosticCode: `${ROOT}/${owner.toUpperCase()}_${keyword.toUpperCase()}`,
		origin,
	};
}

function rangeConstraints(name, range, kind) {
	if (kind === "boolean")
		return range === "enum"
			? [
					{
						identity: `${ROOT}/constraint/${name}-enumValues`,
						keyword: "enumValues",
						operands: { values: [true, false] },
						appliesTo: identity(name),
						diagnosticCode: `${ROOT}/${name.toUpperCase()}_ENUM_VALUES`,
						origin,
					},
				]
			: [];
	if (kind === "string")
		return range === "none" ? [] : [constraint(name, "minLength", 1, kind)];
	if (kind === "decimal") return [];
	if (kind === "float32" || kind === "float64")
		return range === "positive"
			? [
					constraint(
						name,
						"min",
						kind === "float32" ? Math.fround(0.1) : 0.1,
						kind,
					),
					constraint(
						name,
						"max",
						kind === "float32" ? Math.fround(0.9) : 0.9,
						kind,
					),
				]
			: [];
	const ranges = {
		int8: [
			["min", "-128"],
			["max", "127"],
		],
		uint64: [
			["min", "0"],
			["max", "18446744073709551615"],
		],
		safe: [
			["min", "-10"],
			["max", "100"],
		],
		positive: [
			["min", "10"],
			["max", "100"],
		],
		negative: [
			["min", "-100"],
			["max", "-1"],
		],
		narrowed: [
			["min", "0"],
			["max", "99"],
		],
		"wide-i64": [
			["min", "0"],
			["max", "9007199254740993"],
		],
		"wide-u64": [
			["min", "0"],
			["max", "18446744073709551615"],
		],
		"wide-i128": [
			["min", "-9223372036854775809"],
			["max", "0"],
		],
	};
	return (ranges[range] ?? []).map(([keyword, value]) =>
		constraint(name, keyword, value, kind),
	);
}

function boundProbeConstraints(cell) {
	const edge = UINT64_EDGE;
	const center =
		cell.boundValue === "edge"
			? edge
			: cell.boundValue === "edge+1"
				? edge + 1n
				: BigInt(cell.boundValue);
	const values = {
		min: ["min", center],
		max: ["max", center],
		exclusiveMin: ["exclusiveMin", center],
		exclusiveMax: ["exclusiveMax", center],
	};
	const pairs = {
		"min+max": [
			["min", center],
			["max", center],
		],
		"min+exclusiveMin": [
			["min", center],
			["exclusiveMin", center - 1n],
		],
		"min+exclusiveMax": [
			["min", center],
			["exclusiveMax", center + 1n],
		],
		"max+exclusiveMin": [
			["max", center],
			["exclusiveMin", center - 1n],
		],
		"max+exclusiveMax": [
			["max", center],
			["exclusiveMax", center + 1n],
		],
		"exclusiveMin+exclusiveMax": [
			["exclusiveMin", center - 1n],
			["exclusiveMax", center + 1n],
		],
	};
	const entries = pairs[cell.boundShape] ?? [values[cell.boundShape]];
	const fieldIdentity = `${identity(cell.name)}#value`;
	return entries.map(([keyword, value], index) => ({
		...constraint(`${cell.name}-${index}`, keyword, String(value), "integer"),
		appliesTo: fieldIdentity,
	}));
}

function fieldConstraints(cell) {
	return cell.boundShape ? boundProbeConstraints(cell) : [];
}

export function inlineWideInteger(cell) {
	return (
		cell.range === "inline-bounds" &&
		(cell.boundValue === "edge" || cell.boundValue === "edge+1")
	);
}

function scalar(name, kind, constraints) {
	return {
		identity: identity(name),
		displayName: name,
		kind: "scalar",
		scalar: kind,
		constraints,
		extensions: [],
		roles: [],
		unknownPolicy: "reject",
		origin,
		...(kind === "decimal" ? { decimal: { precision: 8, scale: 2 } } : {}),
	};
}

function alias(name, target, constraints = []) {
	return {
		identity: identity(name),
		displayName: name,
		kind: "alias",
		target,
		constraints,
		extensions: [],
		roles: [],
		unknownPolicy: "reject",
		origin,
	};
}

function field(cell, typeRef, nested = false) {
	const multiplicity =
		cell.nesting === "collection"
			? { lower: 1, upper: 2, ordered: true, unique: false }
			: cell.nesting === "option"
				? { lower: 0, upper: 1, ordered: false, unique: false }
				: { lower: 1, upper: 1, ordered: false, unique: false };
	return {
		identity: `${identity(cell.name)}#${nested ? "nested" : "value"}`,
		name: nested ? "nested" : "value",
		typeRef,
		constraints: fieldConstraints(cell),
		presence: multiplicity.lower === 0 ? "optional" : "required",
		nullable: cell.nullable,
		multiplicity,
		defaultKind: "none",
		extensions: [],
		origin,
	};
}

export function buildMatrixIr() {
	const types = [];
	for (const cell of MATRIX_CELLS) {
		const baseName = `${safeStem(cell.name)}Base`;
		const baseIdentity = identity(baseName);
		const baseConstraints = cell.native
			? []
			: rangeConstraints(baseName, cell.range, cell.kind);
		types.push(scalar(baseName, cell.kind, baseConstraints));
		let valueRef = cell.native
			? `ix://quire/native/${cell.kind === "float32" ? "Float32" : "Integer"}`
			: baseIdentity;
		for (let depth = 1; depth <= cell.depth; depth += 1) {
			const name = `${safeStem(cell.name)}Alias${depth}`;
			valueRef = identity(name);
			types.push(
				alias(
					name,
					depth === 1
						? baseIdentity
						: identity(`${cell.name.replaceAll("-", "_")}Alias${depth - 1}`),
					depth === 1 && cell.aliasMode === "child-narrowed"
						? rangeConstraints(
								name,
								cell.range === "negative" ? "negative" : "narrowed",
								cell.kind,
							)
						: [],
				),
			);
		}
		const recordName = `NumericMatrix_${safeStem(cell.name)}`;
		if (cell.nesting === "nested") {
			const nestedName = `${recordName}_Nested`;
			types.push({
				identity: identity(nestedName),
				displayName: nestedName,
				kind: "record",
				fields: [field(cell, valueRef)],
				constraints: [],
				extensions: [],
				roles: [],
				unknownPolicy: "reject",
				origin,
			});
			types.push({
				identity: identity(recordName),
				displayName: recordName,
				kind: "record",
				fields: [field(cell, identity(nestedName), true)],
				constraints: [],
				extensions: [],
				roles: [],
				unknownPolicy: "reject",
				origin,
			});
		} else {
			types.push({
				identity: identity(recordName),
				displayName: recordName,
				kind: "record",
				fields: [field(cell, valueRef)],
				constraints: [],
				extensions: [],
				roles: [],
				unknownPolicy: "reject",
				origin,
			});
		}
	}
	return {
		contractVersion: "2.0.0",
		source: SOURCE,
		package: PACKAGE,
		types,
		occurrences: [],
		extensions: [],
		constructs: [],
	};
}

export function cellRecordName(cell) {
	return `NumericMatrix_${safeStem(cell.name)}`;
}

export function cellValue(cell, valid = true) {
	let value;
	if (cell.kind === "string") value = valid ? "ok" : 7;
	else if (cell.kind === "decimal") value = valid ? "1.10" : "1.001";
	else if (cell.kind === "float32")
		value = valid ? 0.5 : cell.range === "positive" ? 1 : 3.5e38;
	else if (cell.kind === "float64")
		value = valid
			? cell.range === "positive"
				? 0.5
				: 0.1
			: cell.range === "positive"
				? 1
				: "not-a-number";
	else if (cell.kind === "boolean") value = valid ? true : "true";
	else if (cell.range === "int8") value = valid ? 1 : 128;
	else if (cell.range === "uint64")
		value = valid ? "1" : "18446744073709551616";
	else if (cell.range === "wide-i64")
		value = valid ? "9007199254740993" : "9007199254740994";
	else if (cell.range === "wide-u64")
		value = valid ? "18446744073709551615" : "18446744073709551616";
	else if (cell.range === "wide-i128")
		value = valid ? "-9223372036854775809" : "-9223372036854775810";
	else if (cell.range === "positive") value = valid ? 10 : 9;
	else if (cell.range === "negative") value = valid ? -1 : 0;
	else if (cell.range === "narrowed") value = valid ? 1 : 100;
	else if (cell.range === "inline-bounds") {
		const edge = UINT64_EDGE;
		const center =
			cell.boundValue === "edge"
				? edge
				: cell.boundValue === "edge+1"
					? edge + 1n
					: BigInt(cell.boundValue);
		const invalid =
			cell.boundShape.toLowerCase().includes("min") ||
			cell.boundShape === "exclusiveMin+exclusiveMax"
				? center - 1n
				: center + 1n;
		const validCenter =
			cell.boundShape === "exclusiveMin"
				? center + 1n
				: cell.boundShape === "exclusiveMax"
					? center - 1n
					: center;
		value = inlineWideInteger(cell)
			? String(valid ? validCenter : invalid)
			: Number(valid ? validCenter : invalid);
	} else value = valid ? 1 : -11;
	// Raw exponent spellings belong to the reader/oracle lexeme probes. Keep
	// backend instance probes finite JSON values; JavaScript would turn an
	// overflowing number into Infinity and JSON.stringify would silently turn
	// that into null, which is a different fixture.
	if (cell.nesting === "collection") return { value: [value] };
	if (cell.nesting === "nested") return { nested: { value } };
	if (cell.nesting === "option" && !valid) return { value };
	return { value };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const output =
		process.argv[2] ?? "reviews/age-2229-round4-generated-matrix.json";
	writeFileSync(
		output,
		`${JSON.stringify(
			{
				generatedBy: "scripts/age-2229-numeric-matrix.mjs",
				cellCount: MATRIX_CELLS.length,
				dimensions: {
					kind: [...new Set(MATRIX_CELLS.map((cell) => cell.kind))],
					range: [...new Set(MATRIX_CELLS.map((cell) => cell.range))],
					aliasDepth: [...new Set(MATRIX_CELLS.map((cell) => cell.depth))],
					nesting: [...new Set(MATRIX_CELLS.map((cell) => cell.nesting))],
					wire: [...new Set(MATRIX_CELLS.map((cell) => cell.wire))],
					aliasMode: [...new Set(MATRIX_CELLS.map((cell) => cell.aliasMode))],
					nullable: [...new Set(MATRIX_CELLS.map((cell) => cell.nullable))],
					lexeme: [...new Set(MATRIX_CELLS.map((cell) => cell.lexeme))],
					rawLexeme: [...new Set(MATRIX_CELLS.map((cell) => cell.rawLexeme))],
					oracleWidth: [
						...new Set(MATRIX_CELLS.map((cell) => cell.oracleWidth)),
					],
					columns: MATRIX_COLUMNS,
				},
				cells: MATRIX_CELLS,
			},
			null,
			2,
		)}\n`,
	);
	console.log(`AGE-2229 numeric matrix cells: ${MATRIX_CELLS.length}`);
}
