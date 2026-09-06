import { spawnSync } from "node:child_process";
import {
	cpSync,
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { DIAGNOSTIC_CODES } from "../src/compiler/diagnostics.mjs";
import { createHost } from "../src/compiler/host.mjs";
import { readContractIr } from "../src/compiler/ir/reader.mjs";
import { compilePackage } from "../src/compiler/pipeline.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const unresolved = DIAGNOSTIC_CODES.UNRESOLVED_TYPE_REF.code;
const local = "ix://agent-ix/probe/type/Actor";
const foreign = "ix://agent-ix/core/type/Actor";
const locus = {
	sourceIdentity: "ix://agent-ix/probe/source/typespec",
	path: "types/main.tsp",
	startLine: 3,
	startColumn: 1,
};

function definition(identity: string, kind: string) {
	return {
		identity,
		displayName: identity.split("/").pop(),
		kind,
		roles: [],
		origin: { source: locus },
		constraints: [],
		extensions: [],
		unknownPolicy: "reject",
	};
}

function document(version: string, kind: string, target: string) {
	return {
		contractVersion: version,
		package: { identity: "agent-ix/probe" },
		types: [
			{
				...definition("ix://agent-ix/probe/type/ActorRef", kind),
				target,
			},
			{ ...definition(local, "record"), fields: [] },
		],
	};
}

describe("reference-target resolution under the accepted GAP-011 rule", () => {
	/** Traces: TC-520; FR-050-AC-11. */
	it.each([
		["1.0.0", "reference"],
		["1.0.0", "alias"],
		["1.1.0", "reference"],
		["1.1.0", "alias"],
	])("checks %s %s targets against declarations and resolved exports", (version, kind) => {
		for (const importedExports of [[], "unknown"] as const) {
			const input = document(version, kind, local);
			const accepted = readContractIr(input, { importedExports });
			expect([...accepted]).toEqual([]);
			expect(accepted.suppressions).toEqual([]);
			input.types.reverse();
			expect(readContractIr(input, { importedExports })).toEqual(accepted);
		}

		const imported = document(version, kind, foreign);
		const accepted = readContractIr(imported, { importedExports: [foreign] });
		expect([...accepted]).toEqual([]);
		expect(accepted.suppressions).toEqual([]);
		const rejected = readContractIr(imported, { importedExports: [] });
		expect(rejected.map((diagnostic) => diagnostic.code)).toEqual([unresolved]);
		expect(rejected[0]?.locus).toEqual(locus);
		expect(rejected[0]?.blocking).toBe(true);
		expect(rejected.suppressions).toEqual([]);

		for (const importedExports of [undefined, "unknown"] as const) {
			const unknown = readContractIr(imported, { importedExports });
			expect([...unknown]).toEqual([]);
			expect(unknown.suppressions).toEqual([
				{ rule: unresolved, identity: "ix://agent-ix/probe/type/ActorRef" },
			]);
			const missingLocal = readContractIr(
				document(version, kind, "ix://agent-ix/probe/type/Missing"),
				{ importedExports },
			);
			expect(missingLocal.map((diagnostic) => diagnostic.code)).toEqual([
				unresolved,
			]);
			expect(missingLocal[0]?.locus).toEqual(locus);
			expect(missingLocal.suppressions).toEqual([]);
		}
	});

	/** Traces: TC-442; FR-046-AC-11. */
	it("compiles declared imported references and refuses the original undeclared Actor without output", async () => {
		const scratch = mkdtempSync(resolve(tmpdir(), "fcd-reference-resolution-"));
		try {
			const packageRoot = resolve(scratch, "probe");
			cpSync(
				resolve(root, "test/fixtures/compiler/packages/assurance"),
				packageRoot,
				{
					recursive: true,
				},
			);
			const sourcePath = resolve(packageRoot, "types/main.tsp");
			const referenceLine =
				readFileSync(sourcePath, "utf8")
					.split("\n")
					.findIndex((line) => line.startsWith("model ActorRef")) + 1;
			writeFileSync(
				sourcePath,
				readFileSync(sourcePath, "utf8").replace(
					'@semanticReference("ix://agent-ix/assurance/type/Actor")',
					`@semanticReference("${foreign}")`,
				),
			);
			const host = createHost({ readRoots: [root, scratch] });
			const request = {
				host,
				packageRoot,
				entrypoint: "types/main.tsp",
				searchPath: [resolve(scratch, "dependencies")],
			};
			const refused = await compilePackage(request);
			expect(refused.ir).toBeNull();
			expect(refused.state).toBe("invalid");
			expect(refused.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
				unresolved,
			]);
			expect(refused.diagnostics[0]?.locus?.path).toBe("types/main.tsp");
			expect(refused.diagnostics[0]?.locus?.startLine).toBe(referenceLine);
			const output = resolve(scratch, "refused.json");
			const cli = spawnSync(
				process.execPath,
				[
					resolve(root, "src/compiler/cli.mjs"),
					"compile",
					"--package",
					packageRoot,
					"--entrypoint",
					"types/main.tsp",
					"--out",
					output,
				],
				{ cwd: root, encoding: "utf8" },
			);
			expect(cli.error).toBeUndefined();
			expect(cli.status).toBe(1);
			expect(`${cli.stdout}${cli.stderr}`).toContain(unresolved);
			expect(existsSync(output)).toBe(false);

			const manifestPath = resolve(packageRoot, "package-manifest.json");
			const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
			manifest.imports = [
				{
					packageIdentity: "agent-ix/core",
					versionConstraint: "1.0.0",
					exports: ["Actor"],
					capabilities: [],
				},
			];
			writeFileSync(manifestPath, JSON.stringify(manifest));
			const dependency = resolve(scratch, "dependencies/core");
			mkdirSync(resolve(dependency, "types"), { recursive: true });
			writeFileSync(
				resolve(dependency, "types/main.tsp"),
				"namespace AgentIx.Core;\nmodel Actor {}\n",
			);
			writeFileSync(
				resolve(dependency, "package-manifest.json"),
				JSON.stringify({
					...manifest,
					package: { identity: "agent-ix/core", version: "1.0.0" },
					imports: [],
					exports: [
						{ name: "Actor", typeIdentity: foreign, visibility: "public" },
					],
					profiles: [],
				}),
			);
			const compiled = await compilePackage(request);
			expect(compiled.diagnostics).toEqual([]);
			expect(compiled.ir).not.toBeNull();
			expect(compiled.state).toBe("success");
		} finally {
			rmSync(scratch, { recursive: true, force: true });
		}
	}, 60000);
});
