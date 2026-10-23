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
		const zero = fixture();
		zero.units = [unit("s", "Time", undefined, "0")];
		expect(observed(zero)).toEqual([["INVALID_UNIT_GRAPH", "units.0.scale"]]);
		const roots = fixture();
		roots.units = [unit("s", "Time"), unit("seconds", "Time")];
		expect(observed(roots)).toEqual([["INVALID_UNIT_GRAPH", "units.1"]]);
	});
	it("TC-1845 reports one dimension SCC even when it contains two cycles", () => {
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
	it("TC-1843 emits only the nine exact Clock shape diagnostics", () => {
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
				"constraints",
				"decimal",
				"defaultKind",
				"defaultValue",
				"multiplicity",
				"nullable",
				"presence",
				"textProfile",
				"unit",
			]
				.map((member) => ["INVALID_CLOCK_FIELD", `types.0.fields.0.${member}`])
				.sort((a, b) => a[1].localeCompare(b[1])),
		);
	});
	it("TC-1843 applies Clock's own outside-field code to every type position", () => {
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
			expect(observed(document)).toEqual([
				["CLOCK_OUTSIDE_FIELD", `types.0.${member}`],
			]);
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
			{ keyword: "min", appliesTo: "ix://quire/native/Clock" },
		];
		definition.operations = [
			{
				identity: `${definition.identity}/op`,
				name: "op",
				params: [
					{ ...definition.fields[0], identity: `${definition.identity}/op/p` },
				],
				returns: { typeRef: "ix://quire/native/Clock" },
				pre: [],
				post: [],
				origin: origin(),
			},
		];
		expect(observed(document)).toEqual([
			["CLOCK_OUTSIDE_FIELD", "types.0.constraints.0.appliesTo"],
			["CLOCK_OUTSIDE_FIELD", "types.0.operations.0.params.0.typeRef"],
			["CLOCK_OUTSIDE_FIELD", "types.0.operations.0.returns.typeRef"],
			["CLOCK_OUTSIDE_FIELD", "types.0.variants.0.payloadType"],
		]);
	});
	it("TC-1847 retains missing multiplicity and other reference roles", () => {
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
});
