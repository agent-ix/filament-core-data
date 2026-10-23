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
		for (const scale of ["2/4", "1/1", "-0", "0/5", "01/3", "1.5"]) {
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
