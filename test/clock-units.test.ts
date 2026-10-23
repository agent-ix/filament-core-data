// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Agent IX

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { readContractIr } from "../src/compiler/ir/reader.mjs";
import { validateIrDocument } from "../src/compiler/ir/schema.mjs";

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
		const dimension = configTime();
		dimension.units[1].dimension = "ix://acme/config/dimension/Unknown";
		refuse(dimension, "UNRESOLVED_DIMENSION_REF", "/ir/units/1/dimension");
		const target = configTime();
		target.units[1].target = "ix://acme/config/unit/Unknown";
		refuse(target, "UNRESOLVED_UNIT_REF", "/ir/units/1/target");
	});
	it("TC-1846 distinguishes noncanonical rationals from exact i128 overflow", () => {
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
		const document = configTime();
		document.units[0].target = document.units[1].identity;
		refuse(document, "INVALID_UNIT_GRAPH", "/ir/units/0/target");
	});
	it("TC-1845 detects duplicate unit identities", () => {
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
		expect(diagnostics).toHaveLength(9);
		expect(
			diagnostics.every(
				(d) => d.code === "agent-ix.semantic-ir.INVALID_CLOCK_FIELD",
			),
		).toBe(true);
		for (const member of [
			"multiplicity",
			"presence",
			"nullable",
			"defaultKind",
			"defaultValue",
			"unit",
			"textProfile",
			"decimal",
			"constraints",
		])
			expect(
				diagnostics.filter((d) =>
					d.message.startsWith(`/ir/types/0/fields/0/${member}:`),
				),
			).toHaveLength(1);
	});
	it("TC-1847 admits well-formed quantities without locally declared units", () => {
		for (const name of ["ms", "agent-ix/time-units/ms", "acme/rpc.v2/ms"]) {
			const document = clockDocument();
			document.types[0].fields[0].typeRef = `ix://quire/unit/${name}`;
			expect(validateIrDocument(document)).toEqual([]);
			expect([...readContractIr(document)]).toEqual([]);
		}
	});
	it("TC-1852 refuses malformed quantity URI segments instead of suppressing a foreign reference", () => {
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
	it("TC-1843 refuses Clock at each non-field type position", () => {
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
			expect(
				[...readContractIr(document)]
					.filter((d) => d.code === "agent-ix.semantic-ir.CLOCK_OUTSIDE_FIELD")
					.map((d) => d.message),
			).toEqual([`/ir/types/0/${member}: Clock is field-only`]);
		}
		const document = clockDocument();
		const node = document.types[0];
		const origin = node.origin;
		node.operations = [
			{
				identity: `${node.identity}/op`,
				name: "op",
				params: [
					{
						...node.fields[0],
						identity: `${node.identity}/op/arg`,
						name: "arg",
					},
				],
				returns: {
					typeRef: "ix://quire/native/Clock",
					multiplicity: { lower: 1, upper: 1, ordered: false, unique: false },
					nullable: false,
				},
				pre: [],
				post: [],
				origin,
			},
		];
		const diagnostics = [...readContractIr(document)];
		expect(diagnostics.map((d) => d.code)).toEqual([
			"agent-ix.semantic-ir.CLOCK_OUTSIDE_FIELD",
			"agent-ix.semantic-ir.CLOCK_OUTSIDE_FIELD",
		]);
		expect(diagnostics.map((d) => d.message)).toEqual([
			"/ir/types/0/operations/0/params/0/typeRef: invalid Clock member",
			"/ir/types/0/operations/0/returns/typeRef: invalid Clock member",
		]);
	});
	it("TC-1847 retains ordinary multiplicity validation for a quantity field", () => {
		const document = clockDocument();
		const field = document.types[0].fields[0];
		field.typeRef = "ix://quire/unit/ms";
		field.multiplicity.lower = 3;
		expect([...readContractIr(document)].map((d) => d.code)).toEqual([
			"agent-ix.semantic-ir.INVALID_MULTIPLICITY",
		]);
	});
	it("TC-1847 emits one quantity shape refusal for each forbidden member", () => {
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
