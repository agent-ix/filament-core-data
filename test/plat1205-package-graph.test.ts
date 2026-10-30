import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { validateConformance } from "../conformance/oracle/schema-layer.mjs";
import { createHost } from "../src/compiler/host.mjs";
import { canonicalize } from "../src/compiler/packages/canonical.mjs";
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

	/** Trace: FR-035-AC-1, FR-048-AC-4. */
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
		expect(
			validateConformance("package-graph.schema.json", conformanceGraph),
		).toEqual([]);
		expect(validateConformance("package-graph.schema.json", graph)).not.toEqual(
			[],
		);
		expect(
			validateConformance("package-graph.schema.json", {
				...conformanceGraph,
				fingerprint: `sha256:${"0".repeat(64)}`,
			}),
		).not.toEqual([]);
	});

	/** Trace: FR-048-AC-3. */
	it("changes canonical graph bytes for each declared graph input", () => {
		const original = resolvedPackageGraph(resolution);
		const bytes = canonicalize(original);
		expect(
			canonicalize(resolvedPackageGraph(structuredClone(resolution))),
		).toBe(bytes);
		const changes = [
			(input: typeof resolution) => {
				input.packages[1].manifest.imports = [];
			},
			(input: typeof resolution) => {
				input.packages[0].manifest.exports = [
					{ typeIdentity: "ix://acme/z/Other" },
				];
			},
			(input: typeof resolution) => {
				input.packages[1].version = "2.0.0";
			},
			(input: typeof resolution) => {
				input.profile.name = "other";
			},
		];
		const variants = [];
		for (const change of changes) {
			const input = structuredClone(resolution);
			change(input);
			const graph = resolvedPackageGraph(input);
			expect(canonicalize(graph)).not.toBe(bytes);
			variants.push(graph);
		}
		expect(variants[0].packages[0].imports).toEqual([]);
		expect(variants[1].packages[1].exports).toEqual(["ix://acme/z/Other"]);
		expect(variants[2].packages[0].version).toBe("2.0.0");
		expect(variants[3].profile).toBe("other");
		expect(canonicalize(resolvedPackageGraph(resolution, "2.1.0"))).not.toBe(
			bytes,
		);
		expect(resolvedPackageGraph(resolution, "2.1.0").contractVersion).toBe(
			"2.1.0",
		);
	});

	/** Trace: FR-048-AC-2. */
	it("canonical graph bytes ignore key, set, cwd, and locale permutations", () => {
		const expected = canonicalize(resolvedPackageGraph(resolution));
		const permuted = structuredClone(resolution);
		permuted.packages.reverse();
		const graph = resolvedPackageGraph(permuted);
		const reorderedKeys = Object.fromEntries(Object.entries(graph).reverse());
		expect(canonicalize(reorderedKeys)).toBe(expected);
		const locale = spawnSync(
			process.execPath,
			[
				"--input-type=module",
				"-e",
				`import { canonicalize } from ${JSON.stringify(resolve(repository, "src/compiler/packages/canonical.mjs"))}; process.stdout.write(canonicalize(${JSON.stringify(graph)}));`,
			],
			{
				cwd: resolve(repository, "conformance"),
				encoding: "utf8",
				env: { ...process.env, LANG: "tr_TR.UTF-8", LC_ALL: "tr_TR.UTF-8" },
			},
		);
		expect(locale.status).toBe(0);
		expect(locale.stdout).toBe(expected);
		// The canonical serializer preserves arrays whose order is semantically significant.
		expect(canonicalize({ graph, ordered: ["a", "b"] })).not.toBe(
			canonicalize({ graph, ordered: ["b", "a"] }),
		);
	});

	/** Trace: FR-035-AC-1. */
	it("rejects unordered or repeated selected graph identities", () => {
		const graph = resolvedPackageGraph(resolution);
		const base = { rootPackage: graph.rootPackage, packages: graph.packages };
		const defects = [
			{ ...base, packages: [...base.packages].reverse() },
			{ ...base, packages: [...base.packages, base.packages[1]] },
			{ ...base, rootPackage: "acme/missing" },
			{
				...base,
				packages: base.packages.map((entry, index) =>
					index === 0 ? { ...entry, imports: ["acme/z", "acme/a"] } : entry,
				),
			},
			{
				...base,
				packages: base.packages.map((entry, index) =>
					index === 1
						? { ...entry, exports: ["ix://acme/z/Z", "ix://acme/z/A"] }
						: entry,
				),
			},
		];
		for (const defect of defects) {
			expect(
				validateConformance("package-graph.schema.json", defect).length,
			).toBeGreaterThan(0);
		}
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
