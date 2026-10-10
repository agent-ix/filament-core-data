// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Agent IX

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { normalizeIr } from "../src/compiler/ir/normalize.mjs";
import { readContractIr, resolveKind } from "../src/compiler/ir/reader.mjs";
import { validateIrDocument } from "../src/compiler/ir/schema.mjs";

const fixtureBytes = readFileSync(
	new URL(
		"../fixtures/semantic/v1/reader-contract/k2-boundary.json",
		import.meta.url,
	),
	"utf8",
);
const fixture = () => JSON.parse(fixtureBytes);

describe("package revision and unused construct reader contract", () => {
	/** Trace: FR-142-AC-15 */
	it("admits an unused population meaning independently of revision or kind name", () => {
		const document = fixture();
		document.source.version = document.package.version = "1.0.0";
		expect(validateIrDocument(document)).toEqual([]);
		expect([...readContractIr(document)]).toEqual([]);
		document.constructs[1].kind.name = "unused_kind";
		expect([...readContractIr(document)]).toEqual([]);
	});

	/** Trace: FR-050-AC-16, FR-142-AC-15 */
	it("admits authored revision one and an unused population while preserving Instant to Timestamp", () => {
		const document = fixture();
		expect(validateIrDocument(document)).toEqual([]);
		expect([...readContractIr(document)]).toEqual([]);
		const normalized = JSON.parse(normalizeIr(document));
		expect(normalized.package.version).toBe("1");
		expect(normalized.source.version).toBe("1");
		expect(normalized.constructs).toEqual(document.constructs);
		expect(normalized.types[0].target).toBe("ix://quire/native/Timestamp");
		const types = new Map<string, Record<string, unknown>>(
			document.types.map((type: { identity: string }) => [type.identity, type]),
		);
		expect(resolveKind(types, new Map(), "ix://test/orders/Instant")).toEqual({
			kind: "scalar",
			scalar: "datetime",
		});
	});

	/** Trace: FR-050-AC-16 */
	it("admits only canonical integer strings or SemVer in source and package revisions", () => {
		for (const version of [
			"0",
			"1",
			"9007199254740993",
			"1.2.3",
			"1.2.3-rc.1+build",
		]) {
			const document = fixture();
			document.source.version = version;
			document.package.version = version;
			expect(validateIrDocument(document), version).toEqual([]);
			expect([...readContractIr(document)], version).toEqual([]);
			const normalized = JSON.parse(normalizeIr(document));
			expect(normalized.source.version).toBe(version);
			expect(normalized.package.version).toBe(version);
		}
		for (const version of [
			"",
			"01",
			"-1",
			"1.0",
			"1 ",
			"1\n",
			"1e0",
			"v1",
			1,
		]) {
			for (const envelope of ["source", "package"]) {
				const document = fixture();
				document[envelope].version = version;
				const diagnostics = validateIrDocument(document);
				expect(diagnostics.length, `${envelope}: ${version}`).toBeGreaterThan(
					0,
				);
				expect(
					diagnostics.every(
						(diagnostic) => diagnostic.code === "agent-ix.compiler.INVALID_IR",
					),
				).toBe(true);
				expect(
					diagnostics.some((diagnostic) =>
						diagnostic.message.includes(`/${envelope}/version`),
					),
				).toBe(true);
			}
		}
		const document = fixture();
		document.constructs[0].moduleVersion = "1";
		expect(
			validateIrDocument(document).map((diagnostic) => diagnostic.message),
		).toEqual([expect.stringContaining("/constructs/0/moduleVersion")]);
	});

	/** Trace: FR-142-AC-15 */
	it("keeps refusals for malformed unused declarations, duplicate entries and unresolved kinds", () => {
		for (const [mutate, pointers] of [
			[
				(document: ReturnType<typeof fixture>) => {
					document.constructs[1].construct.shape = "unsupported";
				},
				["/ir/constructs/1/construct/shape"],
			],
			[
				(document: ReturnType<typeof fixture>) => {
					document.constructs[1].kind.name = "happened";
				},
				["/ir/constructs/1/kind"],
			],
			[
				(document: ReturnType<typeof fixture>) => {
					document.types[1].kind.name = "missing";
				},
				["/ir/types/1/kind", "/ir/constructs/0/kind"],
			],
		] as const) {
			const document = fixture();
			mutate(document);
			expect([...readContractIr(document)]).toMatchObject(
				pointers.map((pointer) => ({
					code: "agent-ix.compiler.INVALID_IR",
					blocking: true,
					message: expect.stringContaining(pointer),
				})),
			);
		}
	});

	/** Trace: FR-142-AC-9, FR-142-AC-15 */
	it("refuses unused kinds outside the recognized population meaning", () => {
		for (const meaning of [
			"quire.meaning.model.event-type/v1",
			"quire.meaning.model.unrecognized/v1",
			"quire.meaning.model.population/v2",
		]) {
			const document = fixture();
			document.constructs[1].kind.name = "ledger";
			document.constructs[1].construct.meaning = meaning;
			expect(validateIrDocument(document)).toEqual([]);
			expect([...readContractIr(document)]).toMatchObject([
				{
					code: "agent-ix.compiler.INVALID_IR",
					blocking: true,
					message:
						"/ir/constructs/1/kind: constructs declares test/business/ledger, and no type definition or population is of that kind",
				},
			]);
		}
	});
});
