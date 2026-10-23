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
