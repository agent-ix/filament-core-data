// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Agent IX

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { readSemanticIr } from "./semantic-ir-v1-1-reader";

const fixture = () =>
	JSON.parse(
		readFileSync(
			new URL(
				"../fixtures/semantic/v1/clock-units/config-time.json",
				import.meta.url,
			),
			"utf8",
		),
	);
const observed = (document: unknown) =>
	readSemanticIr(document)
		.map(({ code, path }) => [code.replace("agent-ix.semantic-ir.", ""), path])
		.sort((a, b) => a[1].localeCompare(b[1]) || a[0].localeCompare(b[0]));
const origin = () => fixture().dimensions[0].origin;
const dimension = (
	name: string,
	base: boolean,
	terms: { dimension: string; exponent: string }[] = [],
) => ({
	identity: `ix://acme/config/dimension/${name}`,
	name,
	base,
	terms,
	origin: origin(),
});
const unit = (
	name: string,
	dimensionName: string,
	target?: string,
	scale = "1",
	offset = "0",
) => ({
	identity: `ix://acme/config/unit/${name}`,
	name,
	dimension: `ix://acme/config/dimension/${dimensionName}`,
	...(target ? { target: `ix://acme/config/unit/${target}` } : {}),
	scale,
	offset,
	origin: origin(),
});
const clock = () => {
	const document = fixture();
	delete document.dimensions;
	delete document.units;
	document.types = [
		{
			identity: "ix://acme/config/Config",
			displayName: "Config",
			kind: "record",
			roles: [],
			origin: origin(),
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
					origin: origin(),
				},
			],
		},
	];
	return document;
};

describe("FR-146 independent reader dimensions and units", () => {
	it("TC-1844 accepts base, derived, dimensionless and scaled declarations", () => {
		// FR-146-AC-3: exact reader assertions below.
		const document = fixture();
		document.dimensions.push(
			dimension("Rate", false, [
				{ dimension: document.dimensions[0].identity, exponent: "-1" },
			]),
			dimension("Ratio", false),
		);
		expect(observed(document)).toEqual([]);
		delete document.units;
		expect(observed(document)).toEqual([]);
	});
	it("TC-1845 diagnoses every unresolved graph edge at its own member", () => {
		// FR-146-AC-4: exact reader assertions below.
		const document = fixture();
		document.dimensions.push(
			dimension("Rate", false, [
				{ dimension: "ix://acme/config/dimension/Missing", exponent: "-1" },
			]),
		);
		document.units[0].dimension = "ix://acme/config/dimension/Missing";
		document.units[1].target = "ix://acme/config/unit/Missing";
		expect(observed(document)).toEqual([
			["UNRESOLVED_DIMENSION_REF", "dimensions.1.terms.0.dimension"],
			["UNRESOLVED_DIMENSION_REF", "units.0.dimension"],
			["UNRESOLVED_UNIT_REF", "units.1.target"],
		]);
	});
	it("TC-1845 refuses root and zero-scale defects once per pointer", () => {
		// FR-146-AC-4: exact reader assertions below.
		const zero = fixture();
		zero.units = [unit("s", "Time", undefined, "0")];
		expect(observed(zero)).toEqual([["INVALID_UNIT_GRAPH", "units.0.scale"]]);
		const roots = fixture();
		roots.units = [unit("s", "Time"), unit("seconds", "Time")];
		expect(observed(roots)).toEqual([["INVALID_UNIT_GRAPH", "units.1"]]);
	});
	it("TC-1845 reports one dimension SCC even when it contains two cycles", () => {
		// FR-146-AC-4: exact reader assertions below.
		const document = fixture();
		document.dimensions = [
			dimension("Time", false, [
				{ dimension: "ix://acme/config/dimension/Rate", exponent: "1" },
				{ dimension: "ix://acme/config/dimension/Ratio", exponent: "1" },
			]),
			dimension("Rate", false, [
				{ dimension: "ix://acme/config/dimension/Time", exponent: "1" },
			]),
			dimension("Ratio", false, [
				{ dimension: "ix://acme/config/dimension/Time", exponent: "1" },
			]),
		];
		expect(observed(document)).toEqual([
			["INVALID_UNIT_GRAPH", "dimensions.0.terms.0"],
		]);
		expect(readSemanticIr(document)[0].message).toContain("Time, Rate, Ratio");
	});
	it("TC-1845 reports unit-cycle names in target order from the least array index", () => {
		// FR-146-AC-4: exact reader assertions below.
		const document = fixture();
		document.units = [
			unit("a", "Time", "c"),
			unit("b", "Time", "a"),
			unit("c", "Time", "b"),
		];
		expect(observed(document)).toEqual([
			["INVALID_UNIT_GRAPH", "units.0.target"],
		]);
		expect(readSemanticIr(document)[0].message).toContain("a, c, b");
	});
	it("TC-1845 retains duplicate declaration diagnostics and separate namespaces", () => {
		// FR-146-AC-4: exact reader assertions below.
		const document = fixture();
		document.dimensions.push(structuredClone(document.dimensions[0]));
		document.units.push(structuredClone(document.units[1]));
		expect(observed(document)).toEqual([
			["DUPLICATE_IDENTITY", "dimensions.1.identity"],
			["DUPLICATE_IDENTITY", "units.2.identity"],
		]);
		const shared = fixture();
		shared.units = [unit("Time", "Time")];
		expect(observed(shared)).toEqual([]);
	});
	it("TC-1846 distinguishes canonicality and exact component overflow", () => {
		// FR-146-AC-5: exact reader assertions below.
		for (const value of [
			"2/4",
			"1/1",
			"-0",
			"0/5",
			"01/3",
			"1.5",
			"1\n",
			"1\r",
		]) {
			const document = fixture();
			document.units[1].scale = value;
			expect(observed(document), value).toEqual([
				["INVALID_OPERAND", "units.1.scale"],
			]);
		}
		for (const value of [
			"170141183460469231731687303715884105728",
			"1/170141183460469231731687303715884105728",
			"-170141183460469231731687303715884105729",
		]) {
			const document = fixture();
			document.units[1].scale = value;
			expect(observed(document), value).toEqual([
				["INTEGER_OUTSIDE_I128", "units.1.scale"],
			]);
		}
		for (const value of [
			"1/1000",
			"-3/2",
			"273",
			"-170141183460469231731687303715884105728/3",
		]) {
			const document = fixture();
			document.units[1].scale = value;
			expect(observed(document), value).toEqual([]);
		}
	});
});

describe("FR-146 independent reader special member policy", () => {
	it("TC-1842 admits Clock and Text without document scalar declarations", () => {
		expect(observed(clock())).toEqual([]);
		const document = clock();
		document.types[0].fields[0].typeRef = "ix://quire/native/Text";
		expect(observed(document)).toEqual([]);
	});
	it("TC-1843 emits only the seven exact Clock shape diagnostics and an ordinary multiplicity refusal", () => {
		// FR-146-AC-2: exact reader assertions below.
		const document = clock();
		const field = document.types[0].fields[0];
		field.multiplicity.lower = 3;
		field.presence = "optional";
		field.nullable = true;
		field.defaultKind = "semantic";
		field.defaultValue = 0;
		field.unit = "ms";
		field.decimal = { precision: 4, scale: 2 };
		field.textProfile = "anything";
		field.constraints = [{ keyword: "notAKeyword", appliesTo: field.identity }];
		expect(observed(document)).toEqual(
			[
				...[
					"constraints",
					"decimal",
					"defaultKind",
					"defaultValue",
					"nullable",
					"textProfile",
					"unit",
				].map((member) => [
					"INVALID_CLOCK_MEMBER",
					`types.0.fields.0.${member}`,
				]),
				["INVALID_MULTIPLICITY", "types.0.fields.0.multiplicity.upper"],
			].sort((a, b) => a[1].localeCompare(b[1])),
		);
	});
	it("TC-1843 admits Clock at every type position", () => {
		// FR-146-AC-2, FR-146-AC-21: exact reader assertions below.
		for (const [kind, member] of [
			["alias", "target"],
			["reference", "target"],
			["sequence", "items"],
			["map", "values"],
		]) {
			const document = clock();
			const definition = document.types[0];
			definition.kind = kind;
			delete definition.fields;
			definition[member] = "ix://quire/native/Clock";
			expect(observed(document), kind).toEqual([]);
		}
		const document = clock();
		const definition = document.types[0];
		definition.variants = [
			{
				identity: `${definition.identity}/v`,
				name: "v",
				payloadType: "ix://quire/native/Clock",
				origin: origin(),
			},
		];
		definition.constraints = [
			{
				keyword: "max",
				operands: { value: "3/2" },
				appliesTo: "ix://quire/native/Clock",
			},
		];
		definition.operations = [
			{
				identity: `${definition.identity}/op`,
				name: "op",
				params: [
					{ ...definition.fields[0], identity: `${definition.identity}/op/p` },
				],
				returns: {
					typeRef: "ix://quire/native/Clock",
					multiplicity: { lower: 0, upper: 1, ordered: false, unique: false },
					nullable: false,
				},
				pre: [],
				post: [],
				origin: origin(),
			},
		];
		expect(observed(document)).toEqual([]);
	});
	it("TC-1843 makes a member typed by an alias of Clock a clock member", () => {
		// FR-146-AC-2: exact reader assertions below.
		const document = clock();
		const definition = document.types[0];
		definition.fields[0].typeRef = "ix://acme/config/Stopwatch";
		definition.fields[0].unit = "ms";
		definition.fields[0].textProfile = "anything";
		document.types.push({
			...structuredClone(definition),
			identity: "ix://acme/config/Stopwatch",
			kind: "alias",
			target: "ix://quire/native/Clock",
		});
		delete document.types[1].fields;
		expect(observed(document)).toEqual([
			["INVALID_CLOCK_MEMBER", "types.0.fields.0.textProfile"],
			["INVALID_CLOCK_MEMBER", "types.0.fields.0.unit"],
		]);
	});
	it("TC-1866 and TC-1868 hold a clock or quantity bound to min and max with an exact rational", () => {
		// FR-146-AC-21, FR-146-AC-23: exact reader assertions below.
		const constrained = (
			appliesTo: string,
			keyword: string,
			operands: unknown,
		) => {
			const document = clock();
			document.types[0].constraints = [{ keyword, operands, appliesTo }];
			return document;
		};
		const clockRef = "ix://quire/native/Clock";
		const ms = "ix://quire/unit/ms";
		for (const [appliesTo, keyword, value] of [
			[clockRef, "max", "3"],
			[clockRef, "min", "3/2"],
			[ms, "max", "500"],
			[ms, "min", "-3/2"],
		]) {
			expect(
				observed(constrained(appliesTo, keyword, { value })),
				`${appliesTo} ${keyword} ${value}`,
			).toEqual([]);
		}
		const refused: [string, string, string | number, string][] = [
			[clockRef, "max", "-1", "INVALID_OPERAND"],
			[clockRef, "max", "2/4", "INVALID_OPERAND"],
			[clockRef, "max", 3, "INVALID_OPERAND"],
			[ms, "max", "2/4", "INVALID_OPERAND"],
			[ms, "max", "1/1", "INVALID_OPERAND"],
			[ms, "max", "1.5", "INVALID_OPERAND"],
			[ms, "max", 3, "INVALID_OPERAND"],
			[
				clockRef,
				"max",
				"170141183460469231731687303715884105728",
				"INTEGER_OUTSIDE_I128",
			],
		];
		for (const [appliesTo, keyword, value, code] of refused) {
			expect(
				observed(constrained(appliesTo, keyword, { value })),
				`${appliesTo} ${keyword} ${value}`,
			).toEqual([[code, "types.0.constraints.0.operands.value"]]);
		}
		for (const appliesTo of [clockRef, ms]) {
			expect(
				observed(constrained(appliesTo, "minLength", { value: 3 })),
				appliesTo,
			).toEqual([
				["CONSTRAINT_NOT_APPLICABLE", "types.0.constraints.0.keyword"],
			]);
		}
	});
	it("TC-1847 retains missing multiplicity and other reference roles", () => {
		// FR-146-AC-6: exact reader assertions below.
		const document = clock();
		delete document.types[0].fields[0].multiplicity;
		expect(observed(document)).toEqual([
			["MISSING_MULTIPLICITY", "types.0.fields.0.multiplicity"],
		]);
		const other = clock();
		other.types[0].relationships = [
			{
				identity: "ix://acme/config/Config/link",
				category: "structural",
				sourceEnd: { type: other.types[0].identity },
				targetEnd: { type: "ix://quire/native/Clock" },
			},
		];
		expect(observed(other)).toEqual([
			[
				"UNRESOLVED_RELATIONSHIP_TARGET",
				"types.0.relationships.0.targetEnd.type",
			],
		]);
	});
	it("TC-1847 and TC-1852 admit quantity URIs without resolving local units", () => {
		// FR-146-AC-6, FR-146-AC-9: exact reader assertions below.
		for (const name of [
			"ms",
			"agent-ix/time-units/ms",
			"acme/rpc.v2/ms",
			"a-b/c.d/e-f/ms",
			"Acme/Ms",
		]) {
			const document = clock();
			document.types[0].fields[0].typeRef = `ix://quire/unit/${name}`;
			expect(observed(document), name).toEqual([]);
		}
		for (const name of [
			"",
			"3ms",
			"-acme/rpc/ms",
			".acme/rpc/ms",
			"agent-ix//ms",
			"agent-ix/time-units/m-s",
			"ms\n",
		]) {
			const document = clock();
			document.types[0].fields[0].typeRef = `ix://quire/unit/${name}`;
			expect(observed(document), name).toEqual([
				["UNRESOLVED_TYPE_REF", "types.0.fields.0.typeRef"],
			]);
		}
	});
	it("TC-1847 emits quantity shape diagnostics without suppressing multiplicity", () => {
		// FR-146-AC-6: exact reader assertions below.
		const document = clock();
		const field = document.types[0].fields[0];
		field.typeRef = "ix://quire/unit/ms";
		field.multiplicity.lower = 3;
		field.unit = "ms";
		field.constraints = [
			{
				keyword: "pattern",
				operands: { regex: "[" },
				appliesTo: field.identity,
			},
		];
		expect(observed(document)).toEqual([
			["INVALID_QUANTITY_MEMBER", "types.0.fields.0.constraints"],
			["INVALID_MULTIPLICITY", "types.0.fields.0.multiplicity.upper"],
			["INVALID_QUANTITY_MEMBER", "types.0.fields.0.unit"],
		]);
	});
	it("TC-1847 refuses a malformed quantity constraint subject before interpreting its keyword", () => {
		// FR-146-AC-6: exact reader assertions below.
		const document = clock();
		document.types[0].constraints = [
			{ keyword: "notAKeyword", appliesTo: "ix://quire/unit/3ms" },
		];
		expect(observed(document)).toEqual([
			["UNRESOLVED_TYPE_REF", "types.0.constraints.0.appliesTo"],
		]);
	});
	it("TC-1847 and TC-1868 admit a quantity alias at every position and refuse a quantity reference", () => {
		// FR-146-AC-6, FR-146-AC-23: exact reader assertions below.
		const withAlias = (name: string, target: string) => {
			const document = clock();
			document.types[0].fields[0].typeRef = `ix://acme/config/${name}`;
			document.types.push({
				...structuredClone(document.types[0]),
				identity: `ix://acme/config/${name}`,
				kind: "alias",
				target,
			});
			delete document.types[1].fields;
			return document;
		};
		const ms = "ix://quire/unit/ms";
		expect(observed(withAlias("Delay", ms))).toEqual([]);
		const chained = withAlias("Outer", "ix://acme/config/Inner");
		chained.types.push({
			...structuredClone(chained.types[1]),
			identity: "ix://acme/config/Inner",
			target: ms,
		});
		expect(observed(chained)).toEqual([]);
		const union = withAlias("Delay", ms);
		union.types[0] = {
			...union.types[0],
			kind: "union",
			variants: [
				{
					identity: "ix://acme/config/Config/v",
					name: "v",
					payloadType: "ix://acme/config/Delay",
					origin: origin(),
				},
			],
		};
		delete union.types[0].fields;
		expect(observed(union)).toEqual([]);
		const reference = withAlias("Delay", ms);
		reference.types[0] = {
			...reference.types[0],
			kind: "reference",
			target: ms,
		};
		delete reference.types[0].fields;
		expect(observed(reference)).toEqual([
			["UNRESOLVED_TYPE_REF", "types.0.target"],
		]);
		reference.types[0].target = "ix://acme/config/Delay";
		expect(observed(reference)).toEqual([
			["UNRESOLVED_TYPE_REF", "types.0.target"],
		]);
		const malformed = withAlias("Delay", "ix://quire/unit/3ms");
		expect(observed(malformed)).toEqual([
			["UNRESOLVED_TYPE_REF", "types.1.target"],
		]);
		const bound = withAlias("Delay", ms);
		bound.types[0].constraints = [
			{
				keyword: "max",
				operands: { value: "5/2" },
				appliesTo: "ix://acme/config/Delay",
			},
		];
		expect(observed(bound)).toEqual([]);
	});
	it("TC-1866 and TC-1868 refuse an unknown keyword on a clock or quantity subject as on any subject", () => {
		// FR-146-AC-21: exact reader assertions below.
		for (const appliesTo of ["ix://quire/native/Clock", "ix://quire/unit/ms"]) {
			const document = clock();
			document.types[0].constraints = [{ keyword: "notAKeyword", appliesTo }];
			expect(observed(document)).toEqual([
				["UNKNOWN_CONSTRAINT_KEYWORD", "types.0.constraints.0.keyword"],
			]);
		}
	});
});
