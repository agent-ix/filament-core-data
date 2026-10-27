// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Agent IX

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { readContractIr } from "../src/compiler/ir/reader.mjs";
import { validateIrDocument } from "../src/compiler/ir/schema.mjs";
import { readSemanticIr } from "./semantic-ir-v1-1-reader.js";

const configTime = () =>
	JSON.parse(
		readFileSync(
			new URL(
				"../fixtures/semantic/v1/clock-units/config-time.json",
				import.meta.url,
			),
			"utf8",
		),
	);

describe("FR-146 dimensions and units", () => {
	it("TC-1844 admits Config Time with s and ms at both schema and reader layers", () => {
		// FR-146-AC-3: exact reader assertions below.
		const document = configTime();
		expect(validateIrDocument(document)).toEqual([]);
		expect([...readContractIr(document)]).toEqual([]);
	});
	it("keeps documents without dimensions and units admissible", () => {
		const document = configTime();
		delete document.dimensions;
		delete document.units;
		expect(validateIrDocument(document)).toEqual([]);
		expect([...readContractIr(document)]).toEqual([]);
	});
});

describe("FR-146 located graph diagnostics", () => {
	const refuse = (
		document: ReturnType<typeof configTime>,
		code: string,
		pointer: string,
	) => {
		expect(validateIrDocument(document)).toEqual([]);
		const actual = [...readContractIr(document)];
		expect(actual).toHaveLength(1);
		expect(actual[0].code).toBe(`agent-ix.semantic-ir.${code}`);
		expect(actual[0].message).toContain(pointer);
	};
	it("TC-1845 refuses unresolved dimensions and targets at their exact members", () => {
		// FR-146-AC-4: exact reader assertions below.
		const dimension = configTime();
		dimension.units[1].dimension = "ix://acme/config/dimension/Unknown";
		refuse(dimension, "UNRESOLVED_DIMENSION_REF", "/ir/units/1/dimension");
		const target = configTime();
		target.units[1].target = "ix://acme/config/unit/Unknown";
		refuse(target, "UNRESOLVED_UNIT_REF", "/ir/units/1/target");
	});
	it("TC-1846 distinguishes noncanonical rationals from exact i128 overflow", () => {
		// FR-146-AC-5: exact reader assertions below.
		for (const scale of [
			"2/4",
			"1/1",
			"-0",
			"0/5",
			"01/3",
			"1.5",
			"1\n",
			"1\r",
		]) {
			const document = configTime();
			document.units[1].scale = scale;
			refuse(document, "INVALID_OPERAND", "/ir/units/1/scale");
		}
		const overflow = configTime();
		overflow.units[1].scale = "170141183460469231731687303715884105728";
		refuse(overflow, "INTEGER_OUTSIDE_I128", "/ir/units/1/scale");
	});
	it("TC-1845 refuses zero scales and root policy violations", () => {
		// FR-146-AC-4: exact reader assertions below.
		for (const [index, member, value] of [
			[1, "scale", "0"],
			[0, "scale", "2"],
			[0, "offset", "273"],
		] as const) {
			const document = configTime();
			document.units[index][member] = value;
			refuse(document, "INVALID_UNIT_GRAPH", `/ir/units/${index}/${member}`);
		}
	});
	it("TC-1845 emits one ordered diagnostic for a unit cycle", () => {
		// FR-146-AC-4: exact reader assertions below.
		const document = configTime();
		document.units[0].target = document.units[1].identity;
		refuse(document, "INVALID_UNIT_GRAPH", "/ir/units/0/target");
	});
	it("TC-1845 detects duplicate unit identities", () => {
		// FR-146-AC-4: exact reader assertions below.
		const document = configTime();
		document.units.push(structuredClone(document.units[1]));
		refuse(document, "DUPLICATE_IDENTITY", "/ir/units/2/identity");
	});
});

const clockDocument = () => {
	const document = configTime();
	delete document.dimensions;
	delete document.units;
	const origin = structuredClone(document.types[0].origin);
	document.types = [
		{
			identity: "ix://acme/config/Config",
			displayName: "Config",
			kind: "record",
			roles: [],
			origin,
			constraints: [],
			extensions: [],
			unknownPolicy: "reject",
			fields: [
				{
					identity: "ix://acme/config/Config/x",
					name: "x",
					typeRef: "ix://quire/native/Clock",
					multiplicity: { lower: 1, upper: 1, ordered: false, unique: false },
					presence: "required",
					nullable: false,
					defaultKind: "none",
					origin,
				},
			],
		},
	];
	return document;
};
describe("FR-146 Clock and quantity positions", () => {
	it("TC-1842 admits a Clock field without a synthetic scalar", () => {
		const document = clockDocument();
		expect(validateIrDocument(document)).toEqual([]);
		expect([...readContractIr(document)]).toEqual([]);
	});
	it("TC-1843 emits exact shape diagnostics and suppresses generic field rules", () => {
		// FR-146-AC-2: exact reader assertions below.
		const document = clockDocument();
		const field = document.types[0].fields[0];
		field.multiplicity = { lower: 3, upper: 1, ordered: false, unique: false };
		field.presence = "optional";
		field.nullable = true;
		field.defaultKind = "semantic";
		field.defaultValue = 0;
		field.unit = "ms";
		field.textProfile = "unicode";
		field.decimal = { precision: 4, scale: 2 };
		field.constraints = [
			{
				identity: "ix://acme/config/Config/x/min",
				keyword: "min",
				operands: { value: "0" },
				appliesTo: field.identity,
				diagnosticCode: "ix://acme/config/MIN",
				origin: field.origin,
			},
		];
		expect(validateIrDocument(document)).toEqual([]);
		const diagnostics = [...readContractIr(document)];
		expect(diagnostics).toHaveLength(8);
		const members = diagnostics.filter(
			(d) => d.code === "agent-ix.semantic-ir.INVALID_CLOCK_MEMBER",
		);
		expect(members).toHaveLength(7);
		expect(
			diagnostics.filter((d) => !members.includes(d)).map((d) => d.code),
		).toEqual(["agent-ix.semantic-ir.INVALID_MULTIPLICITY"]);
		for (const member of [
			"nullable",
			"defaultKind",
			"defaultValue",
			"unit",
			"textProfile",
			"decimal",
			"constraints",
		])
			expect(
				members.filter((d) =>
					d.message.startsWith(`/ir/types/0/fields/0/${member}:`),
				),
			).toHaveLength(1);
	});
	it("TC-1843 gives a clock member the multiplicity and presence of any member", () => {
		// FR-146-AC-2, FR-146-AC-16: exact reader assertions below.
		for (const [multiplicity, presence] of [
			[{ lower: 0, upper: 1, ordered: false, unique: false }, "optional"],
			[{ lower: 0, upper: 3, ordered: true, unique: false }, "required"],
			[{ lower: 0, upper: 3, ordered: false, unique: true }, "required"],
			[{ lower: 0, ordered: true, unique: false }, "required"],
		] as const) {
			const document = clockDocument();
			const field = document.types[0].fields[0];
			field.multiplicity = { ...multiplicity };
			field.presence = presence;
			expect(validateIrDocument(document)).toEqual([]);
			expect([...readContractIr(document)]).toEqual([]);
			expect(readSemanticIr(document)).toEqual([]);
		}
		const reversed = clockDocument();
		reversed.types[0].fields[0].multiplicity = {
			lower: 3,
			upper: 1,
			ordered: false,
			unique: false,
		};
		expect([...readContractIr(reversed)].map((d) => d.code)).toEqual([
			"agent-ix.semantic-ir.INVALID_MULTIPLICITY",
		]);
		expect(readSemanticIr(reversed).map((d) => d.code)).toEqual([
			"agent-ix.semantic-ir.INVALID_MULTIPLICITY",
		]);
	});
	it("TC-1847 admits well-formed quantities without locally declared units", () => {
		// FR-146-AC-6: exact reader assertions below.
		for (const name of ["ms", "agent-ix/time-units/ms", "acme/rpc.v2/ms"]) {
			const document = clockDocument();
			document.types[0].fields[0].typeRef = `ix://quire/unit/${name}`;
			expect(validateIrDocument(document)).toEqual([]);
			expect([...readContractIr(document)]).toEqual([]);
		}
	});
	it("TC-1852 refuses malformed quantity URI segments instead of suppressing a foreign reference", () => {
		// FR-146-AC-9: exact reader assertions below.
		for (const name of [
			"",
			"3ms",
			"-acme/rpc/ms",
			"agent-ix//ms",
			"agent-ix/time-units/m-s",
		]) {
			const document = clockDocument();
			document.types[0].fields[0].typeRef = `ix://quire/unit/${name}`;
			expect([...readContractIr(document)].map((d) => d.code)).toEqual([
				"agent-ix.semantic-ir.UNRESOLVED_TYPE_REF",
			]);
		}
	});
});

describe("FR-146 Clock placement and quantity member adverse cases", () => {
	it("TC-1843 admits Clock at each non-field type position", () => {
		// FR-146-AC-2, FR-146-AC-21: exact reader assertions below.
		for (const [kind, member] of [
			["alias", "target"],
			["reference", "target"],
			["sequence", "items"],
			["map", "values"],
		] as const) {
			const document = clockDocument();
			const node = document.types[0];
			node.kind = kind;
			delete node.fields;
			node[member] = "ix://quire/native/Clock";
			expect(validateIrDocument(document)).toEqual([]);
			expect([...readContractIr(document)], kind).toEqual([]);
			expect(readSemanticIr(document), kind).toEqual([]);
		}
		const document = clockDocument();
		const node = document.types[0];
		const origin = node.origin;
		const operation = (params: object[], returns: object) => ({
			identity: `${node.identity}/op`,
			name: "op",
			params,
			returns,
			pre: [],
			post: [],
			origin,
		});
		const arg = {
			...node.fields[0],
			identity: `${node.identity}/op/arg`,
			name: "arg",
		};
		const result = (multiplicity: object, nullable = false) => ({
			typeRef: "ix://quire/native/Clock",
			multiplicity,
			nullable,
		});
		const once = { lower: 1, upper: 1, ordered: false, unique: false };
		for (const [params, returns] of [
			[[arg], result(once)],
			[
				[{ ...arg, presence: "optional", multiplicity: { ...once, lower: 0 } }],
				result({ lower: 0, upper: 1, ordered: false, unique: false }),
			],
			[
				[
					{
						...arg,
						multiplicity: { lower: 0, upper: 2, ordered: true, unique: false },
					},
				],
				result(once),
			],
		] as const) {
			node.operations = [operation([...params], returns)];
			expect(validateIrDocument(document)).toEqual([]);
			expect([...readContractIr(document)]).toEqual([]);
			expect(readSemanticIr(document)).toEqual([]);
		}
		node.operations = [
			operation([{ ...arg, nullable: true }], result(once, true)),
		];
		const refused = [...readContractIr(document)];
		expect(refused.map((d) => d.code)).toEqual([
			"agent-ix.semantic-ir.INVALID_CLOCK_MEMBER",
			"agent-ix.semantic-ir.INVALID_CLOCK_MEMBER",
		]);
		expect(refused.map((d) => d.message.split(": ")[0])).toEqual([
			"/ir/types/0/operations/0/params/0/nullable",
			"/ir/types/0/operations/0/returns/nullable",
		]);
	});
	it("TC-1847 retains ordinary multiplicity validation for a quantity field", () => {
		// FR-146-AC-6: exact reader assertions below.
		const document = clockDocument();
		const field = document.types[0].fields[0];
		field.typeRef = "ix://quire/unit/ms";
		field.multiplicity.lower = 3;
		expect([...readContractIr(document)].map((d) => d.code)).toEqual([
			"agent-ix.semantic-ir.INVALID_MULTIPLICITY",
		]);
	});
	it("TC-1847 emits one quantity shape refusal for each forbidden member", () => {
		// FR-146-AC-6: exact reader assertions below.
		const document = clockDocument();
		const field = document.types[0].fields[0];
		field.typeRef = "ix://quire/unit/ms";
		field.unit = "ms";
		field.decimal = { precision: 4, scale: 2 };
		field.textProfile = "unicode";
		field.defaultKind = "semantic";
		field.defaultValue = 0;
		field.constraints = [
			{
				identity: `${field.identity}/min`,
				keyword: "min",
				operands: { value: "0" },
				appliesTo: field.identity,
				diagnosticCode: "ix://acme/config/MIN",
				origin: field.origin,
			},
		];
		expect(validateIrDocument(document)).toEqual([]);
		const actual = [...readContractIr(document)];
		expect(actual).toHaveLength(6);
		expect(
			actual.every(
				(d) => d.code === "agent-ix.semantic-ir.INVALID_QUANTITY_MEMBER",
			),
		).toBe(true);
	});
});

describe("FR-146 shared raw graph verdicts", () => {
	it("TC-1844 through TC-1846 matches the complete located set for every authored raw document", () => {
		// FR-146-AC-3, FR-146-AC-4, FR-146-AC-5: exact reader assertions below.
		const cases = JSON.parse(
			readFileSync(
				new URL(
					"../fixtures/semantic/v1/clock-units/graph-cases.json",
					import.meta.url,
				),
				"utf8",
			),
		) as {
			name: string;
			document: ReturnType<typeof configTime>;
			expected: { code: string; pointer: string }[];
		}[];
		for (const testCase of cases) {
			expect(validateIrDocument(testCase.document), testCase.name).toEqual([]);
			const actual = [...readContractIr(testCase.document)].map((d) => ({
				code: d.code,
				pointer: d.message.split(": ")[0],
			}));
			const order = (
				a: { code: string; pointer: string },
				b: { code: string; pointer: string },
			) => `${a.code}${a.pointer}`.localeCompare(`${b.code}${b.pointer}`);
			expect(actual.sort(order), testCase.name).toEqual(
				testCase.expected.sort(order),
			);
			const independent = readSemanticIr(testCase.document).map((d) => ({
				code: d.code,
				pointer: `/ir/${d.path.split(".").join("/")}`,
			}));
			expect(independent.sort(order), testCase.name).toEqual(
				testCase.expected.sort(order),
			);
		}
	});
});

describe("FR-146 Clock in other identity members", () => {
	it("TC-1843 keeps a relationship end's own resolution rule for Clock and raises no FR-146 code", () => {
		// FR-146-AC-2: exact reader assertions below.
		const document = clockDocument();
		const node = document.types[0];
		const end = (type: string, role?: string) => ({
			multiplicity: { lower: 0, ordered: false, unique: false },
			...(role ? { role } : {}),
			type,
		});
		node.relationships = [
			{
				category: "structural",
				composite: false,
				direction: "source-to-target",
				identity: `${node.identity}/link`,
				origin: node.origin,
				sourceEnd: end(node.identity, "owner"),
				targetEnd: end("ix://quire/native/Clock"),
			},
		];
		expect(validateIrDocument(document)).toEqual([]);
		expect([...readContractIr(document)].map((d) => d.code)).toEqual([
			"agent-ix.semantic-ir.UNRESOLVED_RELATIONSHIP_TARGET",
		]);
		expect(readSemanticIr(document).map((d) => d.code)).toEqual([
			"agent-ix.semantic-ir.UNRESOLVED_RELATIONSHIP_TARGET",
		]);
	});
});

describe("FR-146 direct constraint type positions", () => {
	it("TC-1866 and TC-1868 admit a bound on a clock or a quantity and refuse a malformed quantity", () => {
		// FR-146-AC-21, FR-146-AC-23: exact reader assertions below.
		for (const [typeRef, code] of [
			["ix://quire/native/Clock", undefined],
			["ix://quire/unit/ms", undefined],
			["ix://quire/unit/3ms", "UNRESOLVED_TYPE_REF"],
		] as const) {
			const document = clockDocument();
			const node = document.types[0];
			node.constraints = [
				{
					identity: `${node.identity}/constraint`,
					keyword: "min",
					operands: { value: "0" },
					appliesTo: typeRef,
					diagnosticCode: "ix://acme/config/MIN",
					origin: node.origin,
				},
			];
			const actual = [...readContractIr(document)];
			expect(actual.map((d) => d.code)).toEqual(
				code === undefined ? [] : [`agent-ix.semantic-ir.${code}`],
			);
			if (code !== undefined)
				expect(actual[0].message).toContain(
					"/ir/types/0/constraints/0/appliesTo:",
				);
		}
	});
	it("retains JSON member type failures for forbidden textProfile values", () => {
		const document = clockDocument();
		document.types[0].fields[0].textProfile = 1;
		const actual = validateIrDocument(document);
		expect(actual).toHaveLength(1);
		expect(actual[0].message).toContain("/types/0/fields/0/textProfile");
	});
	it("refuses graph size limits before graph traversal and tolerates schema-invalid direct shapes", () => {
		const document = configTime();
		expect(
			[...readContractIr(document, { limits: { maxNodes: 1 } })].map(
				(d) => d.code,
			),
		).toEqual(["agent-ix.compiler.LIMIT_MAX_NODES"]);
		document.dimensions = [null];
		document.units = [null];
		expect(() => readContractIr(document)).not.toThrow();
		expect(validateIrDocument(document).length).toBeGreaterThan(0);
	});
});

it("TC-1846 refuses an arbitrarily long canonical integer without widening the i128 domain", () => {
	// FR-146-AC-5: exact reader assertions below.
	const document = configTime();
	document.units[1].scale = "9".repeat(10_000);
	expect([...readContractIr(document)].map((d) => d.code)).toEqual([
		"agent-ix.semantic-ir.INTEGER_OUTSIDE_I128",
	]);
	expect(readSemanticIr(document).map((d) => d.code)).toEqual([
		"agent-ix.semantic-ir.INTEGER_OUTSIDE_I128",
	]);
});

it("TC-1843 keeps the schema layer from pre-rejecting a non-enumerated text profile on a clock or unit member, and still refuses a non-string one", () => {
	// FR-146-AC-2: the verdict is INVALID_CLOCK_MEMBER, never SCHEMA_VIOLATION.
	const cases = JSON.parse(
		readFileSync(
			new URL(
				"../fixtures/semantic/v1/clock-units/clock-cases.json",
				import.meta.url,
			),
			"utf8",
		),
	) as { name: string; document: ReturnType<typeof configTime> }[];
	for (const name of [
		"clock-alias-field-invalid-shape",
		"clock-construct-alias-field-invalid-shape",
		"quantity-alias-field-invalid-shape",
		"quantity-construct-alias-field-invalid-shape",
	]) {
		const found = cases.find((c) => c.name === name);
		expect(found, name).toBeDefined();
		const document = structuredClone(found?.document) as ReturnType<
			typeof configTime
		>;
		expect(document.types[0].fields[0].textProfile, name).toBe("unicode");
		expect(validateIrDocument(document), name).toEqual([]);
		document.types[0].fields[0].textProfile = 3;
		const errors = validateIrDocument(document);
		expect(errors.length, name).toBeGreaterThan(0);
		expect(JSON.stringify(errors), name).toContain("textProfile");
	}
});

it("TC-1842/1843/1847/1852 keeps both TS readers on exact Clock and quantity located verdicts", () => {
	// FR-146-AC-2, FR-146-AC-6, FR-146-AC-9: exact reader assertions below.
	const cases = JSON.parse(
		readFileSync(
			new URL(
				"../fixtures/semantic/v1/clock-units/clock-cases.json",
				import.meta.url,
			),
			"utf8",
		),
	) as {
		name: string;
		document: ReturnType<typeof configTime>;
		expected: { code: string; pointer: string }[];
	}[];
	const order = (
		a: { code: string; pointer: string },
		b: { code: string; pointer: string },
	) => `${a.code}${a.pointer}`.localeCompare(`${b.code}${b.pointer}`);
	for (const c of cases) {
		expect(validateIrDocument(c.document), c.name).toEqual([]);
		const actual = [...readContractIr(c.document)].map((d) => ({
			code: d.code,
			pointer: d.message.split(": ")[0],
		}));
		expect(actual.sort(order), c.name).toEqual(c.expected.sort(order));
		const independent = readSemanticIr(c.document).map((d) => ({
			code: d.code,
			pointer: `/ir/${d.path.split(".").join("/")}`,
		}));
		expect(independent.sort(order), c.name).toEqual(c.expected.sort(order));
	}
});
