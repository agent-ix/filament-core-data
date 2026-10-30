import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { validateConformance } from "../conformance/oracle/schema-layer.mjs";
import { createHost } from "../src/compiler/host.mjs";
import { resolvedPackageGraph } from "../src/compiler/packages/graph.mjs";
import { compilePackage } from "../src/compiler/pipeline.mjs";

const repository = resolve(import.meta.dirname, "..");

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
		const conformanceGraph = {
			rootPackage: graph.rootPackage,
			packages: graph.packages,
		};
		expect(validateConformance("package-graph.schema.json", conformanceGraph)).toEqual([]);
		expect(validateConformance("package-graph.schema.json", graph)).not.toEqual([]);
		expect(
			validateConformance("package-graph.schema.json", {
				...conformanceGraph,
				fingerprint: `sha256:${"0".repeat(64)}`,
			}),
		).not.toEqual([]);
	});

	it("shows a version, import, export, or profile change directly", () => {
		const original = resolvedPackageGraph(resolution);
		const changed = structuredClone(resolution);
		changed.packages[1].version = "2.0.0";
		expect(resolvedPackageGraph(changed).packages[0].version).toBe("2.0.0");
		changed.packages[0].manifest.exports = [
			{ typeIdentity: "ix://acme/z/Other" },
		];
		expect(resolvedPackageGraph(changed).packages[1].exports).toEqual([
			"ix://acme/z/Other",
		]);
		changed.profile.name = "other";
		expect(resolvedPackageGraph(changed).profile).toBe("other");
		expect(original.profile).toBe("default");
	});

	/** Trace: FR-048-AC-6, FR-048-AC-9, FR-048-AC-10. */
	it("compiles without a package lock or digest-bearing IR members", async () => {
		const packageRoot = resolve(
			repository,
			"test/fixtures/compiler/packages/assurance",
		);
		const host = createHost({ readRoots: [repository] });
		const result = await compilePackage({
			host,
			packageRoot,
			profileName: "default",
			entrypoint: "types/main.tsp",
		});
		expect(result.diagnostics).toEqual([]);
		expect(result.ir).not.toBeNull();
		expect(result).not.toHaveProperty("lock");
		expect(result).not.toHaveProperty("lockBytes");
		expect(result.packageGraph).toBeDefined();
		const ir = result.ir as Record<string, Record<string, unknown>>;
		expect(ir.source).not.toHaveProperty("digest");
		expect(ir.package).not.toHaveProperty("manifestDigest");
		expect(ir.package).not.toHaveProperty("lockDigest");
		expect(result.packageGraph?.packages).toBeDefined();
		expect(JSON.stringify(result.packageGraph)).not.toContain("contentDigest");
		const retired = spawnSync(
			process.execPath,
			[
				resolve(repository, "src/compiler/cli.mjs"),
				"compile",
				"--package",
				packageRoot,
				"--lock",
				resolve(packageRoot, "package-lock.json"),
				"--out",
				resolve(packageRoot, "not-written.json"),
			],
			{ encoding: "utf8" },
		);
		expect(retired.status).toBe(2);
		expect(retired.stderr).toContain("--lock");
	});
});
