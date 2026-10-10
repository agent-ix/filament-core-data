import { fileURLToPath } from "node:url";
import { writeFileSync } from "node:fs";

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
	["float32", "float32", ["none", "positive"], ["number"]],
	["float64", "float64", ["none", "positive"], ["number"]],
	["decimal", "decimal", ["none"], ["string-safe"]],
	["string", "string", ["none"], ["string-safe"]],
	["string-alias", "string", ["none"], ["string-safe"]],
];

export const MATRIX_CELLS = Object.freeze(
	matrixFamilies.flatMap(([family, kind, ranges, wires]) =>
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
								oracleWidth:
									kind === "integer"
										? range === "wide-i128"
											? "i128"
											: range === "wide-i64" || range === "wide-u64"
												? "numeric7"
												: "safe"
										: "safe",
						}),
					),
				),
			),
		),
	),
);

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
	if (kind === "string")
		return range === "none" ? [] : [constraint(name, "minLength", 1, kind)];
	if (kind === "decimal") return [];
	if (kind === "float32" || kind === "float64")
		return range === "positive" ? [constraint(name, "min", 1.5, kind)] : [];
	const ranges = {
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
		constraints: [],
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
		const baseName = `${cell.name.replaceAll("-", "_")}Base`;
		const baseIdentity = identity(baseName);
		const baseConstraints = rangeConstraints(baseName, cell.range, cell.kind);
		types.push(scalar(baseName, cell.kind, baseConstraints));
		let valueRef = baseIdentity;
		for (let depth = 1; depth <= cell.depth; depth += 1) {
			const name = `${cell.name.replaceAll("-", "_")}Alias${depth}`;
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
		const recordName = `NumericMatrix_${cell.name.replaceAll("-", "_")}`;
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
	return `NumericMatrix_${cell.name.replaceAll("-", "_")}`;
}

export function cellValue(cell, valid = true) {
	let value;
	if (cell.kind === "string") value = valid ? "ok" : 7;
	else if (cell.kind === "decimal") value = valid ? "1.10" : "1.001";
	else if (cell.kind === "float32")
		value = valid ? (cell.range === "positive" ? 2.5 : 0.5) : 3.5e38;
	else if (cell.kind === "float64")
		value = valid ? (cell.range === "positive" ? 2.5 : 0.1) : "not-a-number";
	else if (cell.range === "wide-i64")
		value = valid ? "9007199254740993" : "9007199254740994";
	else if (cell.range === "wide-u64")
		value = valid ? "18446744073709551615" : "18446744073709551616";
	else if (cell.range === "wide-i128")
		value = valid ? "-9223372036854775809" : "-9223372036854775810";
	else if (cell.range === "positive") value = valid ? 10 : 9;
	else if (cell.range === "negative") value = valid ? -1 : 0;
	else if (cell.range === "narrowed") value = valid ? 1 : 100;
	else value = valid ? 1 : -11;
	if (cell.wire === "number" && cell.lexeme === "zero-huge-exponent")
		value = valid ? 0 : 1e10000;
	if (cell.wire === "number" && cell.lexeme === "huge-exponent")
		value = valid
			? cell.range === "positive"
				? 10
				: cell.range === "negative"
					? -1
					: 1
			: 1e10000;
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
					oracleWidth: [...new Set(MATRIX_CELLS.map((cell) => cell.oracleWidth))],
					backends: [
						"typescript",
						"json-schema",
						"rust-serde",
						"semantic-reader",
					],
				},
				cells: MATRIX_CELLS,
			},
			null,
			2,
		)}\n`,
	);
	console.log(`AGE-2229 numeric matrix cells: ${MATRIX_CELLS.length}`);
}
