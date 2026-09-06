import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { GenerationRequest } from "../src/compiler/backends/seam.d.mts";
import { typescriptBackend } from "../src/compiler/backends/typescript-v1/index.mjs";
import { createHost } from "../src/compiler/host.mjs";

const root = resolve(import.meta.dirname, "..");
const strictFlags = [
	"--noEmit",
	"--strict",
	"--exactOptionalPropertyTypes",
	"--noUnusedLocals",
	"--noUnusedParameters",
	"--target",
	"ES2022",
	"--module",
	"ESNext",
	"--moduleResolution",
	"bundler",
	"--skipLibCheck",
];
const read = (path: string): unknown =>
	JSON.parse(readFileSync(join(root, path), "utf8"));
const compile = (entry: string) =>
	spawnSync(
		process.execPath,
		[join(root, "node_modules/typescript/bin/tsc"), ...strictFlags, entry],
		{ cwd: root, encoding: "utf8" },
	);

describe("backend-owned zero-field record typecheck recovery", () => {
	for (const policy of ["reject", "preserve", "surface"]) {
		/** Traces: TC-1109; FR-066-AC-30. */
		it(`strictly compiles a zero-field ${policy} record and detects the old emitter defect`, () => {
			const scratch = mkdtempSync(join(tmpdir(), "compiler-empty-record-"));
			try {
				const request = read(
					"fixtures/semantic/v1/positive/compiler-request.json",
				) as GenerationRequest;
				request.ir = read(
					"packages/semantic-kernel/semantic-ir.json",
				) as GenerationRequest["ir"];
				const types = request.ir.types as {
					kind: string;
					fields?: unknown[];
					unknownPolicy?: string;
				}[];
				const emptyRecords = types.filter(
					(type) => type.kind === "record" && type.fields?.length === 0,
				);
				expect(emptyRecords.length).toBeGreaterThan(0);
				for (const record of emptyRecords) record.unknownPolicy = policy;
				request.profile = read(
					"fixtures/semantic/v1/positive/profile.json",
				) as GenerationRequest["profile"];
				request.mappings = [];
				request.outputRoot = "generated/typescript";
				request.backend = {
					identity: typescriptBackend.identity,
					version: typescriptBackend.version,
					supportedIrVersions: [...typescriptBackend.supportedIrVersions],
					supportedFeatures: [...typescriptBackend.supportedFeatures],
					options: {},
				};
				const result = typescriptBackend.generate(request, {
					host: createHost({ readRoots: [root] }),
					format: (text) => text,
				});
				expect(result.state).toBe("success");
				for (const file of result.files)
					writeFileSync(join(scratch, file.path), file.text);
				const clean = compile(join(scratch, "index.ts"));
				expect(clean.error).toBeUndefined();
				expect(clean.status, clean.stdout + clean.stderr).toBe(0);
				const validators = join(scratch, "validators.ts");
				const current = readFileSync(validators, "utf8");
				expect(current).toContain("const declared: string[] = [];");
				writeFileSync(
					validators,
					current.replaceAll(
						"const declared: string[] = [];",
						"const declared = [];",
					),
				);
				const old = compile(join(scratch, "index.ts"));
				expect(old.error).toBeUndefined();
				expect(old.status, old.stdout + old.stderr).toBe(2);
				expect(old.stdout).toMatch(/validators\.ts\(\d+,\d+\): error TS7034/);
				expect(old.stdout).toMatch(/validators\.ts\(\d+,\d+\): error TS7005/);
			} finally {
				rmSync(scratch, { recursive: true, force: true });
			}
		}, 30_000);
	}

	/** Traces: TC-1110; FR-085-AC-9. */
	it("strictly compiles the regenerated committed kernel without exclusions", () => {
		const result = compile(
			join(root, "packages/semantic-kernel/typescript/index.ts"),
		);
		expect(result.error).toBeUndefined();
		expect(result.status, result.stdout + result.stderr).toBe(0);
	}, 30_000);
});
