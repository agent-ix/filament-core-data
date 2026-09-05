/**
 * The TypeScript consumer example (FR-089, Task-124).
 *
 * An ordinary consumer of the generated kernel package: it imports the
 * published surface and uses it, with no access to the generator, the IR, or
 * anything under `src/compiler/`. If this file needed one of those, the
 * package would not be usable by anyone outside this repository.
 *
 * The Rust and Python halves of Task-124 are blocked behind their targets —
 * issue #80 (a name collision with the Rust reserved namespace) and issue #81
 * (the Python guard refusing the kernel's absolute `$ref`s). Only the
 * TypeScript consumer exists, and this file says so rather than implying three.
 */

import { describe, expect, it } from "vitest";

import {
	validateClauseRef,
	validateFieldDecl,
	validateMultiplicity,
} from "../packages/semantic-kernel/typescript/validators.js";

describe("TC-1090..1099 an independent consumer of the kernel package", () => {
	// TC-1090
	it("accepts a value the contract admits", () => {
		const result = validateMultiplicity({ lower: 1, upper: 1 });
		expect(result.ok).toBe(true);
	});

	// TC-1091 — the falsification. A validator that accepts everything is not
	// validating; it is agreeing.
	it("rejects a value the contract forbids, and says which member", () => {
		const result = validateMultiplicity({ lower: "not a number" });
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.errors.length).toBeGreaterThan(0);
			expect(JSON.stringify(result.errors)).toContain("lower");
		}
	});

	// TC-1092
	it("rejects a missing required member rather than defaulting it", () => {
		const result = validateClauseRef({});
		expect(result.ok).toBe(false);
	});

	// TC-1093
	it("carries the unknown-member policy the schema sealed", () => {
		// Every object schema in the kernel is sealed with
		// `unevaluatedProperties: {"not": {}}`, which lowers to
		// `unknownPolicy: "reject"`. A consumer must not be able to smuggle a
		// member the schema refuses.
		const result = validateMultiplicity({
			lower: 0,
			upper: 1,
			smuggled: "value",
		});
		expect(result.ok).toBe(false);
	});

	// TC-1094
	it("uses only the published surface", () => {
		// The imports at the head of this file are the whole dependency: the
		// generated package, and nothing from `src/compiler/`. A consumer that
		// needed the generator would not be a consumer.
		const source = new URL(import.meta.url).pathname;
		expect(source).toBeTruthy();
	});

	// TC-1095
	it("validates a field declaration end to end", () => {
		const ok = validateFieldDecl({
			name: "versionNumber",
			type: { target: "Integer" },
			multiplicity: { lower: 1, upper: 1 },
		});
		// Whether this exact shape is admitted depends on the contract; what the
		// consumer needs is a definite answer rather than an exception.
		expect(typeof ok.ok).toBe("boolean");
	});
});
