import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	readdirSync,
	rmSync,
	statSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { describe, expect, it } from "vitest";
import { reachableSymbols } from "../src/compiler/backends/typescript-v1/package-layout.mjs";
import { auditRenderedNodes } from "../src/compiler/backends/typescript-v1/metadata.mjs";
import { buildModel } from "../src/compiler/backends/typescript-v1/model.mjs";
import { changeRange, changedPathsOf } from "./changed-paths";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fixture = resolve(root, "test/fixtures/backends/typescript");
const expected = resolve(fixture, "expected");
const tsc = resolve(root, "node_modules/.bin/tsc");
const generator = resolve(root, "src/compiler/cli.mjs");
const fixtureIr = resolve(fixture, "input/semantic-ir.json");
const instances = resolve(fixture, "instances");
const NFR025_SENTINELS = [
	"plan/Plan-011-typescript-backend/plan.md",
	"test/fixtures/backends/typescript/nfr-025-sentinel.txt",
] as const;

const NFR025_PERMITTED = [
	"^spec/", "^plan/", "^reviews/", "^test/", "^tests/", "^Makefile$",
	"^src/compiler/backends/seam\\.(?:mjs|d\\.mts)$",
	"^src/compiler/backends/targets\\.(?:mjs|d\\.mts)$",
	"^src/compiler/backends/typescript-v1/", "^src/compiler/backends/format\\.(?:mjs|d\\.mts)$",
	"^src/compiler/cli\\.mjs$", "^src/compiler/diagnostics\\.mjs$", "^src/compiler/inventory\\.json$",
	"^docs/semantic-data-system/compiler-diagnostics\\.md$", "^tsconfig\\.json$",
	"^conformance/adapters/registry\\.json$", "^conformance/adapters/typescript-backend/", "^conformance/coverage\\.json$",
] as const;

function nfr025Permitted(path: string): boolean {
	return NFR025_PERMITTED.some((pattern) => new RegExp(pattern).test(path));
}

function exportedCompilerSymbols(source: string): string[] {
	const names: string[] = [];
	for (const match of source.matchAll(/^export\s*\{([^}]+)\}/gm)) {
		for (const entry of match[1].split(",")) {
			const name = entry.trim().split(/\s+as\s+/).at(-1);
			if (name) names.push(name);
		}
	}
	return names.sort();
}

function runTsc(...args: string[]): string {
	try {
		return execFileSync(tsc, args, {
			cwd: root,
			encoding: "utf8",
			stdio: "pipe",
		});
	} catch (error) {
		const failed = error as { stdout?: Buffer; stderr?: Buffer };
		return `${failed.stdout?.toString() ?? ""}${failed.stderr?.toString() ?? ""}`;
	}
}

function fixtureFiles(directory: string): { path: string; text: string }[] {
	const files: { path: string; text: string }[] = [];
	for (const entry of readdirSync(directory)) {
		const path = resolve(directory, entry);
		if (statSync(path).isDirectory()) {
			files.push(...fixtureFiles(path));
			continue;
		}
		files.push({
			path: relative(expected, path),
			text: readFileSync(path, "utf8"),
		});
	}
	return files;
}

function generatedFiles(directory: string): { path: string; text: string }[] {
	const files: { path: string; text: string }[] = [];
	for (const entry of readdirSync(directory)) {
		const path = resolve(directory, entry);
		if (statSync(path).isDirectory()) {
			files.push(...generatedFiles(path));
			continue;
		}
		files.push({
			path: relative(directory, path),
			text: readFileSync(path, "utf8"),
		});
	}
	return files.sort((left, right) => left.path.localeCompare(right.path));
}

function generateSnapshot(cwd: string, output: string, locale: string) {
	execFileSync(
		process.execPath,
		[
			generator,
			"generate",
			"--ir",
			fixtureIr,
			"--target",
			"typescript",
			"--out-root",
			output,
			"--manifest",
			resolve(output, "output-manifest.json"),
		],
		{ cwd, env: { ...process.env, LC_ALL: locale }, stdio: "pipe" },
	);
	return generatedFiles(output);
}

type InstanceCase = {
	readonly id: string;
	readonly type: string;
	readonly payload?: unknown;
	readonly expect: "accept" | "reject";
	readonly pointer?: string;
	readonly code?: string;
	readonly construct?: string;
	readonly constructArgs?: Record<string, unknown>;
	readonly differential?: "exempt";
	readonly differentialReason?: string;
};

type InstanceCorpus = {
	readonly ir: string;
	readonly provenance: { readonly blessedFromRun: boolean };
	readonly cases: readonly InstanceCase[];
};

function instancePayload(row: InstanceCase): unknown {
	const payload = structuredClone(row.payload === undefined ? {} : row.payload);
	if (row.construct === undefined) return payload;
	if (payload === null || Array.isArray(payload) || typeof payload !== "object")
		throw new Error(`${row.id}: constructed payload must be an object`);
	const value = payload as Record<string, unknown>;
	const args = row.constructArgs ?? {};
	const member = typeof args.member === "string" ? args.member : undefined;
	const requireMember = (): string => {
		if (member === undefined)
			throw new Error(`${row.id}: construct ${row.construct} needs a member`);
		return member;
	};
	if (row.construct === "unsafeInteger") {
		value[requireMember()] = Number.MAX_SAFE_INTEGER + 1;
	} else if (row.construct === "negativeZero") {
		value[requireMember()] = -0;
	} else if (row.construct === "notANumber") {
		value[requireMember()] = Number.NaN;
	} else if (row.construct === "infinite") {
		value[requireMember()] =
			args.sign === -1 ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY;
	} else if (row.construct === "coercible") {
		const primitive = args.primitive;
		value[requireMember()] =
			args.via === "valueOf"
				? { valueOf: () => primitive }
				: { [Symbol.toPrimitive]: () => primitive };
	} else if (row.construct === "explicitUndefined") {
		value[requireMember()] = undefined;
	} else if (row.construct === "inherited") {
		return Object.assign(Object.create(args.inherited ?? null), args.own ?? {});
	} else if (row.construct === "throwingGetter") {
		Object.defineProperty(value, requireMember(), {
			enumerable: true,
			get: () => {
				throw new Error("hostile getter");
			},
		});
	} else if (row.construct === "nullPrototype") {
		return Object.assign(Object.create(null), args.base ?? {});
	} else if (row.construct === "ownProto") {
		Object.defineProperty(value, "__proto__", {
			enumerable: true,
			value: args.value,
		});
	} else if (row.construct === "prototypePolluter") {
		Object.assign(value, args.declared ?? {});
		Object.defineProperty(value, "__proto__", {
			enumerable: true,
			value: { polluted: true },
		});
	} else {
		throw new Error(`${row.id}: unknown construct ${row.construct}`);
	}
	return value;
}

async function generatedValidators(ir: string, directory: string) {
	const generated = resolve(directory, "generated");
	const compiled = resolve(directory, "compiled");
	execFileSync(
		process.execPath,
		[
			generator,
			"generate",
			"--ir",
			ir,
			"--target",
			"typescript",
			"--out-root",
			generated,
		],
		{ cwd: root, stdio: "pipe" },
	);
	execFileSync(
		tsc,
		[
			"--target",
			"ES2022",
			"--module",
			"NodeNext",
			"--moduleResolution",
			"NodeNext",
			"--outDir",
			compiled,
			...fixtureFiles(generated)
				.filter(({ path }) => path.endsWith(".ts"))
				.map(({ path }) => resolve(generated, path)),
		],
		{ cwd: root, stdio: "pipe" },
	);
	return import(
		`${pathToFileURL(resolve(compiled, "index.js")).href}?${Date.now()}`
	) as Promise<Record<string, unknown>>;
}

describe("TypeScript backend fixture (FR-071)", () => {
	it("generates byte-identically across directories and C/Turkish locales", () => {
		const scratch = mkdtempSync(
			resolve(tmpdir(), "fcd-typescript-determinism-"),
		);
		try {
			const rootRun = generateSnapshot(root, resolve(scratch, "root"), "C");
			const cwdRun = generateSnapshot(scratch, resolve(scratch, "cwd"), "C");
			const turkishRun = generateSnapshot(
				scratch,
				resolve(scratch, "turkish"),
				"tr_TR.UTF-8",
			);
			expect(cwdRun).toEqual(rootRun);
			expect(turkishRun).toEqual(rootRun);
		} finally {
			rmSync(scratch, { recursive: true, force: true });
		}
	});

	it("keeps generated source self-contained, licensed, and dependency-free", () => {
		const files = fixtureFiles(expected);
		const manifest = JSON.parse(
			readFileSync(resolve(expected, "package.json"), "utf8"),
		) as Record<string, unknown>;
		for (const key of [
			"dependencies",
			"peerDependencies",
			"optionalDependencies",
		]) {
			expect(manifest[key], key).toBeUndefined();
		}
		for (const { path, text } of files.filter(({ path }) =>
			path.endsWith(".ts"),
		)) {
			expect(text, path).toContain("SPDX-License-Identifier: AGPL-3.0-only");
			for (const match of text.matchAll(/from "([^"]+)"/g)) {
				expect(match[1], `${path} imports ${match[1]}`).toMatch(/^\./);
			}
			expect(text, path).not.toContain("@ts-expect-error");
		}
	});

	it("keeps the TypeScript backend's repository reads behind an injected host", () => {
		const backend = readFileSync(
			resolve(root, "src/compiler/backends/typescript-v1/index.mjs"),
			"utf8",
		);
		expect(backend).not.toContain('from "node:fs"');
		expect(backend).toContain("requires options.host.readText");
	});
	it("typechecks the generated package and the positive type-level program", () => {
		expect(
			runTsc("--project", resolve(fixture, "tsconfig.json"), "--noEmit"),
		).toBe("");
	});

	it("rejects each negative type fixture for its declared reason", () => {
		const expectedCodes: Record<string, string> = {
			"invalid-enum.ts": "TS2322",
			"missing-required.ts": "TS2741",
			"removed-export.ts": "TS2305",
			"undefined-optional.ts": "TS2375",
		};
		for (const [name, code] of Object.entries(expectedCodes)) {
			const output = runTsc(
				"--noEmit",
				"--target",
				"ES2022",
				"--module",
				"ESNext",
				"--moduleResolution",
				"bundler",
				"--strict",
				"--exactOptionalPropertyTypes",
				resolve(fixture, "negative", name),
			);
			expect(output, name).toContain(code);
		}
	});

	it("keeps the generated package's reachable entry surface bounded", () => {
		const reachable = reachableSymbols(fixtureFiles(expected), "Node");
		expect(reachable).toEqual([
			"types.ts:Count",
			"types.ts:Millis",
			"types.ts:Node",
			"types.ts:NodeRef",
			"types.ts:NodeRefOf",
			"types.ts:Payload",
			"types.ts:Status",
			"types.ts:Text",
			"types.ts:TextList",
			"types.ts:TextMap",
		]);
	});

	it("records a content-addressed artifact listing without ambient npm", () => {
		const listing = fixtureFiles(expected)
			.map(({ path, text }) => ({
				path,
				size: Buffer.byteLength(text),
				sha256: createHash("sha256").update(text).digest("hex"),
			}))
			.sort((left, right) => left.path.localeCompare(right.path));
		expect(listing).toEqual(
			JSON.parse(
				readFileSync(
					resolve(fixture, "bundle-surface/archive-listing.json"),
					"utf8",
				),
			),
		);
	});

	it("preserves the fixture's identity and metadata surface without retaining validators", () => {
		const identity = readFileSync(resolve(expected, "identity.ts"), "utf8");
		const metadata = readFileSync(resolve(expected, "metadata.ts"), "utf8");
		const ir = JSON.parse(readFileSync(fixtureIr, "utf8")) as {
			types: {
				identity: string;
				fields?: { identity: string; name: string }[];
			}[];
			extensions: { identity: string }[];
			occurrences: { identity: string }[];
		};
		for (const type of ir.types) {
			expect(identity).toContain(JSON.stringify(type.identity));
			for (const field of type.fields ?? [])
				expect(identity).toContain(JSON.stringify(field.identity));
		}
		for (const extension of ir.extensions)
			expect(metadata).toContain(JSON.stringify(extension.identity));
		for (const occurrence of ir.occurrences)
			expect(metadata).toContain(JSON.stringify(occurrence.identity));
		expect(metadata).toContain("sourceIdentity:");
		expect(metadata).toContain("packageLockDigest:");
		expect(metadata).toContain("fingerprint:");
		expect(identity).not.toMatch(/from "\.\/validators\.js"/);
		expect(metadata).not.toMatch(/from "\.\/validators\.js"/);
	});

	it("audits every identity-bearing model node and rejects a seeded dropped node", () => {
		const scratch = mkdtempSync(resolve(tmpdir(), "fcd-typescript-audit-"));
		const model = buildModel(
			JSON.parse(readFileSync(fixtureIr, "utf8")),
			{ backendIdentity: "test", backendVersion: "test" },
		);
		try {
			const rendered = generateSnapshot(root, resolve(scratch, "generated"), "C");
			expect(auditRenderedNodes(model, rendered)).toEqual([]);
			const absent = "ix://agent-ix/instances/type/seeded-unrendered";
			expect(
				auditRenderedNodes(
					{ ...model, types: [...model.types, { identity: absent }] },
					rendered,
				),
			).toEqual([absent]);
		} finally {
			rmSync(scratch, { recursive: true, force: true });
		}
	});

	it("executes every authored runtime-validator case without blessing output", async () => {
		const scratch = mkdtempSync(resolve(tmpdir(), "fcd-typescript-instances-"));
		try {
			const corpora = readdirSync(instances)
				.filter((name) => name.endsWith(".cases.json"))
				.sort()
				.map(
					(name) =>
						JSON.parse(
							readFileSync(resolve(instances, name), "utf8"),
						) as InstanceCorpus,
				);
			let exercised = 0;
			let differentialCandidates = 0;
			for (const corpus of corpora) {
				expect(corpus.provenance.blessedFromRun).toBe(false);
				const schemaName = corpus.ir.replace(/^ir\//, "").replace(/\.ir\.json$/, ".schema.json");
				const schema = JSON.parse(
					readFileSync(resolve(instances, schemaName), "utf8"),
				) as { $id: string };
				expect(schema.$id, `${schemaName}: schema identity`).toMatch(/^https:/);
				const ajv = new Ajv2020({ allErrors: true, strict: true });
				addFormats(ajv);
				ajv.addSchema(schema);
				const schemas = new Map<string, (value: unknown) => boolean>();
				const module = await generatedValidators(
					resolve(instances, corpus.ir),
					resolve(scratch, corpus.ir.replace(/[^a-z0-9]+/gi, "-")),
				);
				for (const row of corpus.cases) {
					if (row.differential === "exempt") {
						expect(
							row.differentialReason,
							`${row.id}: exemption reason`,
						).toMatch(/\S/);
					} else {
						differentialCandidates += 1;
						let validate = schemas.get(row.type);
						if (!validate) {
							const typeName = row.type.split("/").at(-1);
							validate = ajv.getSchema(`${schema.$id}#/$defs/${typeName}`);
							expect(validate, `${row.id}: authored schema definition`).toBeDefined();
							schemas.set(row.type, validate);
						}
						expect(
							validate(instancePayload(row)),
							`${row.id}: Ajv verdict`,
						).toBe(row.expect === "accept");
					}
					const name = row.type.split("/").at(-1);
					const validate = module[`validate${name}`];
					expect(typeof validate, `${row.id}: validator export`).toBe(
						"function",
					);
					const result = (
						validate as (input: unknown) => {
							ok: boolean;
							errors?: readonly { pointer: string; code: string }[];
						}
					)(instancePayload(row));
					expect(result.ok, row.id).toBe(row.expect === "accept");
					if (row.expect === "reject") {
						expect(result.errors?.[0], row.id).toMatchObject({
							pointer: row.pointer,
							code: row.code,
						});
					}
					exercised += 1;
				}
			}
			expect(exercised).toBe(94);
			expect(differentialCandidates).toBeGreaterThan(0);
		} finally {
			rmSync(scratch, { recursive: true, force: true });
		}
	}, 30_000);
});

describe("TC-834..844 TypeScript backend non-disruption", () => {
	/** Traces: TC-838; NFR-025-AC-1, NFR-025-AC-4, NFR-025-AC-7. */
	it("pins #22's changed set to history and permits every one of its paths", () => {
		const { base, tip } = changeRange(root, NFR025_SENTINELS);
		expect(base).toMatch(/^[0-9a-f]{40}$/);
		expect(tip).toMatch(/^[0-9a-f]{40}$/);
		const paths = changedPathsOf(root, NFR025_SENTINELS);
		expect(paths.length).toBeGreaterThan(0);
		for (const path of paths)
			expect(nfr025Permitted(path), `not permitted: ${path}`).toBe(true);
		for (const path of [
			"package.json", "pnpm-lock.yaml", "poetry.lock", "schema/semantic/v1/common.schema.json",
			"fixtures/semantic/v1/positive/target-contracts.json", "spikes/README.md",
			"packages/semantic-core/main.tsp", "src/compiler/backends/typescript.mjs",
			"src/compiler/backends/rust.mjs", "src/compiler/backends/type-names.mjs",
		]) expect(paths).not.toContain(path);
	});

	/** Traces: TC-839; NFR-025-AC-3, NFR-025-AC-12, NFR-025-AC-13. */
	it("keeps package metadata, divergences, and the narrow tsconfig edit unchanged", () => {
		const { base, tip } = changeRange(root, NFR025_SENTINELS);
		const at = (commit: string, path: string): string =>
			execFileSync("git", ["show", `${commit}:${path}`], { cwd: root, encoding: "utf8" });
		const before = JSON.parse(at(base, "package.json")) as Record<string, unknown>;
		const after = JSON.parse(at(tip, "package.json")) as Record<string, unknown>;
		for (const key of ["exports", "main", "module", "types", "files", "dependencies", "peerDependencies", "optionalDependencies"])
			expect(JSON.stringify(after[key]), key).toBe(JSON.stringify(before[key]));
		for (const path of ["pnpm-lock.yaml", "poetry.lock", "conformance/divergences.json"])
			expect(at(tip, path), path).toBe(at(base, path));
		const prior = JSON.parse(at(base, "tsconfig.json")) as Record<string, unknown>;
		const current = JSON.parse(at(tip, "tsconfig.json")) as Record<string, unknown>;
		expect(current.exclude).toEqual([...(Array.isArray(prior.exclude) ? prior.exclude : []), "test/fixtures/backends/typescript"]);
		const stripped = (value: Record<string, unknown>) => {
			const copy = { ...value }; delete copy.exclude; return copy;
		};
		expect(stripped(current)).toEqual(stripped(prior));
	});

	/** Traces: TC-840; NFR-025-AC-5. */
	it("keeps the narrow compiler surface at fifteen exports", () => {
		const names = exportedCompilerSymbols(readFileSync(resolve(root, "src/compiler/index.mjs"), "utf8"));
		expect(names).toHaveLength(15);
		expect(exportedCompilerSymbols('export { one, two } from "./x.mjs";')).toHaveLength(2);
		expect(exportedCompilerSymbols('export { one, two, three } from "./x.mjs";')).toHaveLength(3);
	});

	/** Traces: TC-843; NFR-025-AC-2, NFR-025-AC-11, NFR-025-AC-15. */
	it("does not accrete later sibling paths in a squash-merge history", () => {
		const scratch = mkdtempSync(resolve(tmpdir(), "fcd-typescript-accretion-"));
		try {
			const git = (...args: string[]) => execFileSync("git", args, { cwd: scratch, stdio: "pipe" });
			const write = (path: string, text: string) => {
				mkdirSync(dirname(resolve(scratch, path)), { recursive: true });
				writeFileSync(resolve(scratch, path), text);
			};
			git("init", "--initial-branch=main"); git("config", "user.email", "gate@example.invalid"); git("config", "user.name", "gate");
			write("README.md", "base\n"); git("add", "-A"); git("commit", "-m", "base");
			write(NFR025_SENTINELS[0], "plan\n"); write(NFR025_SENTINELS[1], "sentinel\n"); write("src/compiler/backends/typescript-v1/index.mjs", "export {};\n");
			git("add", "-A"); git("commit", "-m", "#22 squash");
			const mine = changedPathsOf(scratch, NFR025_SENTINELS);
			write("schema/semantic/v1/later.json", "{}\n"); write("conformance/cases/later.json", "{}\n");
			git("add", "-A"); git("commit", "-m", "sibling backend");
			expect(changedPathsOf(scratch, NFR025_SENTINELS)).toEqual(mine);
		} finally { rmSync(scratch, { recursive: true, force: true }); }
	});
});
