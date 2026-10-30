import { describe, expect, it } from "vitest";
import { validateConformance } from "../conformance/oracle/schema-layer.mjs";
import { resolvedPackageGraph } from "../src/compiler/packages/lock.mjs";

/** Trace: FR-048-AC-3, FR-048-AC-4, FR-048-AC-6, FR-035-AC-1. */
describe("direct resolved package graph", () => {
	const resolution = {
		root: { identity: "acme/root" },
		profile: { name: "default" },
		packages: [
			{
				identity: "acme/z",
				version: "1.2.0",
				manifest: {
					imports: [],
					exports: [{ typeIdentity: "ix://acme/z/Type" }],
				},
			},
			{
				identity: "acme/root",
				version: "1.0.0",
				manifest: {
					imports: [{ packageIdentity: "acme/z" }],
					exports: [],
				},
			},
		],
	};

	it("emits identity-ordered declarations and refuses retired lock fields", () => {
		const graph = resolvedPackageGraph(resolution);
		expect(graph.packages.map((entry) => entry.identity)).toEqual([
			"acme/root",
			"acme/z",
		]);
		expect(graph.packages[0].imports).toEqual(["acme/z"]);
		expect(graph.packages[1].exports).toEqual(["ix://acme/z/Type"]);
		expect(validateConformance("package-graph.schema.json", graph)).toEqual([]);
		expect(
			validateConformance("package-graph.schema.json", {
				...graph,
				fingerprint: `sha256:${"0".repeat(64)}`,
			}),
		).not.toEqual([]);
	});

	it("shows a version, import, export, or profile change directly", () => {
		const original = resolvedPackageGraph(resolution);
		const changed = structuredClone(resolution);
		changed.packages[1].version = "2.0.0";
		expect(resolvedPackageGraph(changed).packages[1].version).toBe("2.0.0");
		changed.packages[1].manifest.exports = [
			{ typeIdentity: "ix://acme/z/Other" },
		];
		expect(resolvedPackageGraph(changed).packages[1].exports).toEqual([
			"ix://acme/z/Other",
		]);
		changed.profile.name = "other";
		expect(resolvedPackageGraph(changed).profile).toBe("other");
		expect(original.profile).toBe("default");
	});
});
