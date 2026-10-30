// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Agent IX

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { rustBackend } from "../src/compiler/backends/rust-serde/backend.mjs";
import { generateTarget } from "../src/compiler/backends/seam.mjs";
import { diffSemanticContract } from "../src/compiler/compat/diff.mjs";
import { createHost } from "../src/compiler/host.mjs";
import { IDENTITY_SETS, normalizeIr } from "../src/compiler/ir/normalize.mjs";
import { readContractIr } from "../src/compiler/ir/reader.mjs";
import { validateIrDocument } from "../src/compiler/ir/schema.mjs";
import { readSemanticIr } from "./semantic-ir-v1-1-reader.js";

type Json = Record<string, any>;
type Case = {
	id: string;
	tc: string;
	ac: string;
	set: [string, unknown][];
	remove: string[];
	node: "refused" | "admits";
};

const read = (path: string) =>
	JSON.parse(
		readFileSync(new URL(`../${path}`, import.meta.url), "utf8"),
	) as Json;
const base = () => read("fixtures/semantic/v1/tuple-union/tuple-union.json");
const vectors = read("fixtures/semantic/v1/tuple-union/cases.json") as {
	cases: Case[];
};

function locate(document: Json, pointer: string): [Json, string] {
	const keys = pointer.split("/").slice(1);
	let node: Json = document;
	for (const key of keys.slice(0, -1)) node = node[key];
	return [node, keys[keys.length - 1]];
}

function mutated(entry: Case): Json {
	const document = base();
	for (const [pointer, value] of entry.set) {
		const [node, key] = locate(document, pointer);
		node[key] = value;
	}
	for (const pointer of entry.remove) {
		const [node, key] = locate(document, pointer);
		delete node[key];
	}
	return document;
}

const nodeRefuses = (document: Json) =>
	validateIrDocument(document).length > 0 ||
	[...readContractIr(document)].length > 0;

const typeNamed = (document: Json, name: string) =>
	document.types.find((type: Json) => type.displayName === name) as Json;

describe("FR-147 tuple value types and union variant payloads", () => {
	/** Traces: TC-1872; FR-147-AC-1. */
	it("TC-1872 admits Pair, Swap, Nest, Cell, Shape, Color and List at every TypeScript layer", () => {
		const document = base();
		expect(validateIrDocument(document)).toEqual([]);
		expect([...readContractIr(document)]).toEqual([]);
		expect(readSemanticIr(document)).toEqual([]);
		const pair = typeNamed(document, "Pair");
		expect(pair.positions.map((p: Json) => p.identity)).toEqual([
			"ix://acme/shapes/Pair/p0",
			"ix://acme/shapes/Pair/p1",
		]);
	});

	/** Traces: TC-1873; FR-147-AC-2. */
	it("TC-1873 names the tuple shape and positions member and refuses a tuple without positions", () => {
		const vocabulary = read("schema/semantic/v1/construct-vocabulary.json");
		expect(JSON.stringify(vocabulary)).toContain('"tuple"');
		expect(JSON.stringify(vocabulary)).toContain('"positions"');
		const entry = vectors.cases.find((c) => c.id === "missing-positions");
		expect(entry).toBeDefined();
		expect(nodeRefuses(mutated(entry as Case))).toBe(true);
		const noRequirement = base();
		noRequirement.constructs[0].construct.members.positions = "forbidden";
		expect(validateIrDocument(noRequirement).length).toBeGreaterThan(0);
	});

	/** Traces: TC-1874, TC-1875, TC-1876, TC-1877, TC-1879; FR-147-AC-3, FR-147-AC-4, FR-147-AC-5, FR-147-AC-6, FR-147-AC-8, FR-147-AC-14. */
	it("TC-1885 gives every shared vector the recorded TypeScript verdict", () => {
		for (const entry of vectors.cases) {
			expect(nodeRefuses(mutated(entry)), entry.id).toBe(
				entry.node === "refused",
			);
		}
	});

	/** Traces: TC-1880; FR-147-AC-9. */
	it("TC-1880 keeps the authored order of positions", () => {
		const document = base();
		const refs = Array.from({ length: 11 }, (_, i) =>
			i % 2 === 0 ? "ix://acme/shapes/Boolean" : "ix://acme/shapes/Integer",
		);
		const wide = typeNamed(document, "Swap");
		wide.positions = refs.map((typeRef, i) => ({
			identity: `ix://acme/shapes/Swap/p${i}`,
			typeRef,
			origin: wide.origin,
		}));
		const normalized = JSON.parse(normalizeIr(document));
		expect(
			typeNamed(normalized, "Swap").positions.map((p: Json) => p.identity),
		).toEqual(wide.positions.map((p: Json) => p.identity));
		expect(normalizeIr(normalized)).toBe(normalizeIr(document));
		expect(IDENTITY_SETS.some((path) => path.includes("positions"))).toBe(
			false,
		);
		const swapped = base();
		const pair = typeNamed(swapped, "Pair");
		pair.positions[0].typeRef = "ix://acme/shapes/Integer";
		pair.positions[1].typeRef = "ix://acme/shapes/Boolean";
		expect(normalizeIr(swapped)).not.toBe(normalizeIr(base()));
		const reordered = base();
		typeNamed(reordered, "Shape").variants.reverse();
		expect(normalizeIr(reordered)).toBe(normalizeIr(base()));
		expect(normalizeIr(reordered)).toBe(normalizeIr(base()));
	});

	/** Traces: TC-1881; FR-147-AC-10. */
	it("TC-1881 classifies a changed tuple and a changed payload as breaking", () => {
		const report = (next: Json) =>
			diffSemanticContract({ old: base(), new: next } as never) as never as {
				aggregateDisposition: string;
				changes: { disposition: string }[];
			};
		expect(report(base()).aggregateDisposition).toBe("patch");
		const origin = base();
		typeNamed(origin, "Pair").positions[0].origin = {
			generated: {
				generatorIdentity: "ix://acme/shapes/other",
				generatorVersion: "1.0.0",
				inputIdentities: ["ix://acme/shapes/source"],
			},
		};
		expect(report(origin).aggregateDisposition).toBe("patch");
		const swapped = base();
		const pair = typeNamed(swapped, "Pair");
		pair.positions[0].typeRef = "ix://acme/shapes/Integer";
		pair.positions[1].typeRef = "ix://acme/shapes/Boolean";
		expect(report(swapped).aggregateDisposition).toBe("breaking");
		const retyped = base();
		typeNamed(retyped, "Pair").positions[1].typeRef =
			"ix://acme/shapes/Boolean";
		expect(report(retyped).aggregateDisposition).toBe("breaking");
		const longer = base();
		typeNamed(longer, "Pair").positions.push({
			identity: "ix://acme/shapes/Pair/p2",
			typeRef: "ix://acme/shapes/Integer",
			origin: typeNamed(longer, "Pair").origin,
		});
		expect(report(longer).aggregateDisposition).toBe("breaking");
		const shorter = base();
		typeNamed(shorter, "Pair").positions.pop();
		expect(report(shorter).aggregateDisposition).toBe("breaking");
		const payload = base();
		typeNamed(payload, "Shape").variants[0].payloadType =
			"ix://acme/shapes/Swap";
		expect(report(payload).aggregateDisposition).toBe("breaking");
		const dropped = base();
		delete typeNamed(dropped, "Shape").variants[0].payloadType;
		expect(report(dropped).aggregateDisposition).toBe("breaking");
	});

	/** Traces: TC-1882; FR-147-AC-11. */
	it("TC-1882 refuses a tuple construct at the generation seam for every target (the tuple-free control is in compiler-core.test.ts)", () => {
		const request = (ir: Json) => ({
			contractVersion: "1.0.0",
			ir,
			profile: read("fixtures/semantic/v1/positive/profile.json"),
			mappings: [],
			backend: {
				identity: rustBackend.identity,
				version: rustBackend.version,
				supportedIrVersions: [...rustBackend.supportedIrVersions],
				supportedFeatures: [...rustBackend.supportedFeatures],
				options: {},
			},
			outputRoot: "generated/rust",
			limits: {
				maxInputBytes: 33554432,
				maxDepth: 256,
				maxNodes: 1000000,
				maxCollectionItems: 100000,
				maxDiagnostics: 1000,
			},
		});
		for (const target of [
			"typescript",
			"rust",
			"python-pydantic-v2",
			"python-dataclass",
			"json-schema",
			"sysml-v2-textual",
		] as const) {
			const manifest = generateTarget(request(base()), {
				target,
				host: createHost({ readRoots: [process.cwd()] }),
			}) as never as {
				state: string;
				files: unknown[];
				diagnostics: { code: string; blocking: boolean }[];
			};
			expect(manifest.state, target).toBe("unsupported");
			expect(manifest.files, target).toEqual([]);
			const blocking = manifest.diagnostics.filter((d) => d.blocking);
			expect(
				blocking.map((d) => d.code),
				target,
			).toEqual(["agent-ix.compiler.UNSUPPORTED_CONSTRUCT_SHAPE"]);
		}
	});

	/** Traces: TC-1886; FR-147-AC-15. */
	it("TC-1886 refuses a Clock variant payload, directly or through an alias, in every TypeScript reader", () => {
		const clockPointer = "types.4.variants.0.payloadType";
		const located = (document: Json) => ({
			node: [...readContractIr(document)].map((d) => ({
				code: d.code,
				at: d.message.split(": ")[0],
			})),
			independent: readSemanticIr(document).map((d) => ({
				code: d.code,
				at: d.path,
			})),
		});
		const direct = base();
		typeNamed(direct, "Shape").variants[0].payloadType =
			"ix://quire/native/Clock";
		expect(validateIrDocument(direct)).toEqual([]);
		const code = "agent-ix.semantic-ir.INVALID_CLOCK_MEMBER";
		expect(located(direct)).toEqual({
			node: [{ code, at: "/ir/types/4/variants/0/payloadType" }],
			independent: [{ code, at: clockPointer }],
		});

		const aliased = base();
		const alias = structuredClone(typeNamed(aliased, "Boolean"));
		alias.identity = "ix://acme/shapes/Tick";
		alias.displayName = "Tick";
		alias.kind = "alias";
		delete alias.scalar;
		alias.target = "ix://quire/native/Clock";
		aliased.types.push(alias);
		typeNamed(aliased, "Shape").variants[0].payloadType =
			"ix://acme/shapes/Tick";
		const seen = located(aliased);
		expect(seen.node.map((d) => d.code)).toEqual([code]);
		expect(seen.independent.map((d) => d.code)).toEqual([code]);

		const quantity = base();
		typeNamed(quantity, "Shape").variants[0].payloadType = "ix://quire/unit/ms";
		expect(located(quantity)).toEqual({ node: [], independent: [] });
		expect(
			typeNamed(base(), "Shape").variants.some(
				(v: Json) => v.payloadType === undefined,
			),
		).toBe(true);
	});

	/** Traces: TC-1878; FR-147-AC-7. */
	it("TC-1878 accepts a tuple named at every type position in every TypeScript layer", () => {
		const document = base();
		const extra = read("fixtures/semantic/v1/tuple-union/pair-positions.json");
		document.types.push(...extra.types);
		expect(validateIrDocument(document)).toEqual([]);
		expect([...readContractIr(document)]).toEqual([]);
		expect(readSemanticIr(document)).toEqual([]);
		expect(
			extra.types.map((t: Json) => [
				t.kind,
				JSON.stringify(t).includes("/Pair"),
			]),
		).toEqual([
			["record", true],
			["alias", true],
			["sequence", true],
			["map", true],
			["reference", true],
			["union", true],
		]);
	});
});
