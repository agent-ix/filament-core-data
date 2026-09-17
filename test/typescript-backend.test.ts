import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
	cpSync,
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
import { gunzipSync } from "node:zlib";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { describe, expect, it } from "vitest";
import { reachableSymbols } from "../src/compiler/backends/typescript-v1/package-layout.mjs";
import { auditRenderedNodes } from "../src/compiler/backends/typescript-v1/metadata.mjs";
import { buildModel } from "../src/compiler/backends/typescript-v1/model.mjs";
import {
	SCHEMA_FILES,
	admitIr,
} from "../src/compiler/backends/typescript-v1/admit.mjs";
import {
	VARIANT_ADDITION_POLICIES,
	VARIANT_ADDITION_POLICY,
	classifySurface,
} from "../src/compiler/backends/typescript-v1/classify.mjs";
import { changeRange, changedPathsOf } from "./changed-paths";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fixture = resolve(root, "test/fixtures/backends/typescript");
const expected = resolve(fixture, "expected");
const tsc = resolve(root, "node_modules/.bin/tsc");
const generator = resolve(root, "src/compiler/cli.mjs");
const fixtureIr = resolve(fixture, "input/semantic-ir.json");
const instances = resolve(fixture, "instances");
const admissionSchemas = SCHEMA_FILES.map((path) =>
	JSON.parse(readFileSync(resolve(root, path), "utf8")),
);
const SLASH = "/";
// Built rather than written as a literal: a regex literal carrying a double
// quote defeats the trace binder's TypeScript brace scanner, and an unreadable
// file binds no row at all.
const RELATIVE_IMPORT = new RegExp('from "([^"]+)"', "g");
const IDENTITY_PREFIX = ["ix:", SLASH, SLASH].join("");
const NFR025_SENTINELS = [
	"plan/Plan-011-typescript-backend/plan.md",
	"test/fixtures/backends/typescript/nfr-025-tip-sentinel.txt",
] as const;

const NFR025_PERMITTED = [
	"^spec/",
	"^plan/",
	"^reviews/",
	"^test/",
	"^tests/",
	"^Makefile$",
	"^src/compiler/backends/seam\\.(?:mjs|d\\.mts)$",
	"^src/compiler/backends/targets\\.(?:mjs|d\\.mts)$",
	"^src/compiler/backends/typescript-v1/",
	"^src/compiler/backends/format\\.(?:mjs|d\\.mts)$",
	"^src/compiler/cli\\.mjs$",
	"^src/compiler/diagnostics\\.mjs$",
	"^src/compiler/inventory\\.json$",
	"^docs/semantic-data-system/compiler-diagnostics\\.md$",
	"^tsconfig\\.json$",
	"^conformance/adapters/registry\\.json$",
	"^conformance/adapters/typescript-backend/",
	"^conformance/coverage\\.json$",
] as const;

function nfr025Permitted(path: string): boolean {
	return NFR025_PERMITTED.some((pattern) => new RegExp(pattern).test(path));
}

function exportedCompilerSymbols(source: string): string[] {
	const names: string[] = [];
	for (const line of source.split("\n")) {
		if (!line.startsWith("export {")) continue;
		const body = line.slice("export {".length, line.indexOf("}"));
		for (const entry of body.split(",")) {
			const name = entry
				.trim()
				.split(/\s+as\s+/)
				.at(-1);
			if (name) names.push(name);
		}
	}
	return names.sort();
}

/** Tar bytes with the five intentionally nondeterministic header members zeroed. */
function normalizeTarMetadata(tarball: Buffer): Buffer {
	const tar = Buffer.from(gunzipSync(tarball));
	for (let offset = 0; offset + 512 <= tar.length; offset += 512) {
		if (tar.subarray(offset, offset + 512).every((byte) => byte === 0)) break;
		for (const [start, end] of [
			[108, 116],
			[116, 124],
			[136, 148],
			[265, 297],
			[297, 329],
		])
			tar.fill(0, offset + start, offset + end);
		const size =
			Number.parseInt(
				tar
					.subarray(offset + 124, offset + 136)
					.toString("ascii")
					.replace(/\0.*$/, "")
					.trim(),
				8,
			) || 0;
		offset += Math.ceil(size / 512) * 512;
	}
	return tar;
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
			path: relative(directory, path),
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

describe("TC-1355 extension identity admission (FR-068)", () => {
	/** Traces: TC-1355; FR-068-AC-25. */
	it("admits repeated kernel-scalar extensions across nodes and rejects a duplicate on one field", () => {
		const ir = JSON.parse(readFileSync(fixtureIr, "utf8"));
		const kernelScalar = {
			identity: "ix://agent-ix/semantic-core/ext/kernel-scalar",
			version: "1.0.0",
			required: false,
			capability: "semantic-core-kernel-scalar",
			payload: { name: "UUID" },
		};
		for (const type of ir.types) type.extensions = [kernelScalar];
		const admitted = admitIr({ ir }, { schemas: admissionSchemas });
		expect(admitted.diagnostics).toEqual([]);

		const field = ir.types
			.flatMap((type: { fields?: unknown[] }) => type.fields ?? [])
			.at(0) as { extensions?: unknown[] } | undefined;
		expect(field).toBeDefined();
		field!.extensions = [
			{ ...kernelScalar, identity: "ix://agent-ix/semantic-core/ext/doc" },
			{ ...kernelScalar, identity: "ix://agent-ix/semantic-core/ext/doc" },
		];
		const refused = admitIr({ ir }, { schemas: admissionSchemas });
		expect(refused.diagnostics).toHaveLength(1);
		expect(refused.diagnostics[0]).toMatchObject({
			pointer: expect.stringMatching(/\/fields\/0\/extensions\/1\/identity$/),
			diagnostic: { code: "agent-ix.semantic-ir.DUPLICATE_IDENTITY" },
		});
	});
});

describe("TypeScript backend fixture (FR-071)", () => {
	it("TC-834 generates byte-identically across directories and C/Turkish locales", () => {
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

	// TC-770
	it("TC-836 keeps generated source self-contained, licensed, and dependency-free", () => {
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
			expect(text, path).toContain(
				"SPDX-License-Identifier: AGPL-3.0-or-later",
			);
			for (const match of text.matchAll(RELATIVE_IMPORT)) {
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

	/**
	 * The two modules this reads were named `identity.ts` and `metadata.ts`
	 * until FR-137. The rename is not cosmetic and the assertions move with it:
	 * a document's extensions and occurrences are contract data and are now
	 * declared beside the semantic identity they qualify, while `provenance.ts`
	 * carries what the package was generated from and by, and nothing else. So
	 * this case reads each concept from the module that now owns it, rather
	 * than reading one file and finding both.
	 */
	it("TC-787 preserves the fixture's identity and provenance surface without retaining validators", () => {
		const identity = readFileSync(resolve(expected, "identity.ts"), "utf8");
		const provenance = readFileSync(resolve(expected, "provenance.ts"), "utf8");
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
			expect(identity).toContain(JSON.stringify(extension.identity));
		for (const occurrence of ir.occurrences)
			expect(identity).toContain(JSON.stringify(occurrence.identity));
		expect(provenance).toContain("sourceIdentity:");
		expect(provenance).toContain("packageLockDigest:");
		expect(provenance).toContain("fingerprint:");
		// Provenance is one concept in one module: it names no descriptor type,
		// so it imports nothing at all (FR-137).
		expect(provenance).not.toMatch(/^import\s/m);
		expect(identity).not.toMatch(/from "\.\/validators\.js"/);
		expect(provenance).not.toMatch(/from "\.\/validators\.js"/);
	});

	it("TC-787 audits every identity-bearing model node and rejects a seeded dropped node", () => {
		const scratch = mkdtempSync(resolve(tmpdir(), "fcd-typescript-audit-"));
		const model = buildModel(JSON.parse(readFileSync(fixtureIr, "utf8")), {
			backendIdentity: "test",
			backendVersion: "test",
		});
		try {
			const rendered = generateSnapshot(
				root,
				resolve(scratch, "generated"),
				"C",
			);
			expect(auditRenderedNodes(model, rendered)).toEqual([]);
			const absent = `${IDENTITY_PREFIX}agent-ix/instances/type/seeded-unrendered`;
			const template = model.types[0];
			if (!template) {
				throw new Error("fixture model must contain a type");
			}
			expect(
				auditRenderedNodes(
					{
						...model,
						types: [...model.types, { ...template, identity: absent }],
					},
					rendered,
				),
			).toEqual([absent]);
		} finally {
			rmSync(scratch, { recursive: true, force: true });
		}
	});

	it("TC-777 executes every authored runtime-validator case without blessing output", async () => {
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
				const schemaName = corpus.ir
					.replace(new RegExp(`^ir${SLASH}`), "")
					.replace(/\.ir\.json$/, ".schema.json");
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
							expect(
								validate,
								`${row.id}: authored schema definition`,
							).toBeDefined();
							if (!validate) {
								throw new Error(
									`${row.id}: missing authored schema definition`,
								);
							}
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

type IrDocument = Record<string, unknown>;

/** A `1.1.0` document carrying one enum, one record, and one relationship. */
function classifierBase(): IrDocument {
	return {
		contractVersion: "1.1.0",
		package: {
			identity: "ix://agent-ix/tc811/package/p",
			version: "1.0.0",
		},
		types: [
			{
				identity: "ix://agent-ix/tc811/type/Status",
				kind: "enum",
				variants: [
					{ identity: "ix://agent-ix/tc811/variant/open", name: "open" },
				],
			},
			{
				identity: "ix://agent-ix/tc811/type/Record",
				kind: "record",
				fields: [
					{
						identity: "ix://agent-ix/tc811/field/name",
						name: "name",
						presence: "required",
						nullable: false,
						scalar: "string",
					},
				],
				relationships: [
					{
						identity: "ix://agent-ix/tc811/rel/status",
						name: "status",
						target: "ix://agent-ix/tc811/type/Status",
					},
				],
			},
		],
	};
}

/** The policy shape `consumer-policy.schema.json` gives an open consumer. */
const OPEN_CONSUMER = { unknownExtensions: "preserve" } as const;

/**
 * `classify.mjs` and its one import, copied outside the tree with
 * `VARIANT_ADDITION_POLICY` set to `setting`.
 *
 * The copy is made outside the working tree deliberately: writing a variant of a
 * compiler module *into* `src/compiler/` is the defect issue #49 records, where
 * three unrelated changed-path gates failed against a file another suite was
 * part way through writing.
 */
async function classifierUnder(setting: string): Promise<{
	classifySurface: typeof classifySurface;
	dispose: () => void;
}> {
	const scratch = mkdtempSync(resolve(tmpdir(), "fcd-tc811-"));
	const backend = resolve(root, "src/compiler/backends/typescript-v1");
	cpSync(resolve(backend, "canonical.mjs"), resolve(scratch, "canonical.mjs"));
	const source = readFileSync(resolve(backend, "classify.mjs"), "utf8");
	const patched = source.replace(
		'export const VARIANT_ADDITION_POLICY = "corpus";',
		`export const VARIANT_ADDITION_POLICY = ${JSON.stringify(setting)};`,
	);
	expect(patched, "the constant is declared in one literal place").not.toBe(
		source === patched && setting === "corpus" ? "" : source,
	);
	writeFileSync(resolve(scratch, "classify.mjs"), patched);
	const module = await import(
		pathToFileURL(resolve(scratch, "classify.mjs")).href
	);
	return {
		classifySurface: module.classifySurface,
		dispose: () => rmSync(scratch, { recursive: true, force: true }),
	};
}

/**
 * A `1.2.0` ConfigVersion document whose `ConfigVersion` and `ConfigOverlay`
 * are `entity` constructs identified by their `id` field.
 */
function entityDocument(): string {
	const document = JSON.parse(
		readFileSync(
			resolve(root, "fixtures/semantic/v1/positive/config-version-v1-2.json"),
			"utf8",
		),
	) as {
		types: {
			kind: string;
			displayName: string;
			identityFields?: string[];
			fields?: { name: string; identity: string }[];
		}[];
	};
	for (const type of document.types) {
		if (
			type.displayName !== "ConfigVersion" &&
			type.displayName !== "ConfigOverlay"
		)
			continue;
		const id = type.fields?.find((field) => field.name === "id");
		if (!id) throw new Error(`${type.displayName} declares no id field`);
		type.kind = "entity";
		type.identityFields = [id.identity];
	}
	return JSON.stringify(document);
}

describe("TC-1763 an entity construct rendered by the TypeScript backend (FR-064, FR-067)", () => {
	/** Traces: TC-1763; FR-064-AC-23, FR-067-AC-19. */
	it("renders an entity as a compiling interface and validator and names its identity fields", async () => {
		const scratch = mkdtempSync(resolve(tmpdir(), "fcd-typescript-entity-"));
		try {
			const ir = resolve(scratch, "entity.json");
			writeFileSync(ir, entityDocument());
			const module = await generatedValidators(ir, resolve(scratch, "entity"));
			expect(module.TYPE_IDENTITY_FIELDS).toStrictEqual({
				ConfigOverlay: ["id"],
				ConfigVersion: ["id"],
			});
			const kinds = module.TYPE_KIND as Record<string, string>;
			expect(kinds.ConfigVersion).toBe("entity");
			expect(kinds.JsonObject).toBe("record");
			const validate = module.validateConfigOverlay as (input: unknown) => {
				ok: boolean;
			};
			expect(typeof validate).toBe("function");
			expect(validate({}).ok).toBe(false);

			const records = await generatedValidators(
				resolve(root, "fixtures/semantic/v1/positive/config-version-v1-2.json"),
				resolve(scratch, "records"),
			);
			expect(records.TYPE_IDENTITY_FIELDS).toStrictEqual({});
		} finally {
			rmSync(scratch, { recursive: true, force: true });
		}
	}, 120000);
});

describe("TC-1773 every construct kind and model member rendered by the TypeScript backend (FR-064, FR-067)", () => {
	/** Traces: TC-1773; FR-064-AC-25, FR-067-AC-20. */
	it("renders each construct by its own rendering and carries every model member", async () => {
		const scratch = mkdtempSync(
			resolve(tmpdir(), "fcd-typescript-constructs-"),
		);
		try {
			const module = await generatedValidators(
				resolve(
					root,
					"fixtures/semantic/v1/positive/semantic-ir-v1-2-constructs.json",
				),
				resolve(scratch, "constructs"),
			);
			const types = readFileSync(
				resolve(scratch, "constructs/generated/types.ts"),
				"utf8",
			);
			for (const name of [
				"OrderPlaced",
				"Shipment",
				"OrderAggregate",
				"Fulfilment",
				"OrderLifecycle",
				"OrderLine",
				"OrderStatus",
			])
				expect(typeof module[`validate${name}`], name).toBe("function");
			expect(types).toContain(
				'export type OrderLifecycleState = "placed" | "shipped";',
			);
			expect(types).toContain(
				'export type OrderStatus = "cancelled" | "draft" | "placed" | "shipped";',
			);
			expect(types).toContain(
				"export interface OrderRepository {\n\tfindById(id: UUID): Order | undefined;\n\tsave(order: Order): Order;\n}",
			);
			expect(types).not.toMatch(/\bOrdering\b/);
			expect(module.validateOrdering).toBeUndefined();
			expect(module.validateOrderRepository).toBeUndefined();
			const order = /export interface Order \{([^}]*)\}/.exec(types)?.[1] ?? "";
			for (const field of ["id", "labels", "badges", "lines", "status"])
				expect(
					order.split(`readonly ${field}`).length - 1,
					`Order.${field}`,
				).toBe(1);

			const equals = module.OrderLineEquals as (
				left: unknown,
				right: unknown,
			) => boolean;
			const line = { sku: "A-1", quantity: 1, kind: "goods" };
			expect(equals(line, { ...line })).toBe(true);
			expect(equals(line, { ...line, quantity: 2 })).toBe(false);

			expect(module.TYPE_IDENTITY_FIELDS).toMatchObject({
				Order: ["id"],
				Shipment: ["id"],
				OrderAggregate: ["id"],
				Fulfilment: ["id"],
			});
			expect(module.TYPE_SUPERTYPES).toStrictEqual({
				Order: ["ix://agent-ix/orders/type/FR-000"],
			});
			expect(module.TYPE_ABSTRACT).toStrictEqual({ Party: true });
			expect(module.TYPE_OWNER).toStrictEqual({
				Shipment: "ix://agent-ix/orders/type/FR-001",
			});
			expect(module.TYPE_EQUALITY).toStrictEqual({ OrderLine: "value" });
			expect(module.TYPE_IMMUTABLE).toStrictEqual({ OrderPlaced: true });
			expect(module.TYPE_STATES).toStrictEqual({
				OrderLifecycle: ["placed", "shipped"],
			});
			expect(module.TYPE_PERSISTS).toStrictEqual({
				OrderRepository: ["ix://agent-ix/orders/type/FR-001"],
			});
			expect(
				(
					module.TYPE_STEPS as Record<string, { name: string }[]>
				).Fulfilment.map((step) => step.name),
			).toStrictEqual(["fulfil"]);
			expect(
				(
					module.TYPE_VOCABULARY as Record<string, { term: string }[]>
				).Ordering.map((term) => term.term),
			).toStrictEqual(["Order"]);
			expect(
				(module.TYPE_TRANSITIONS as Record<string, { trigger: string }[]>)
					.OrderLifecycle[0].trigger,
			).toBe("advance");
			expect(module.FIELD_SUBSETS).toStrictEqual({
				"Order.badges": ["labels"],
			});
			expect(
				(module.OPERATION_CONTRACTS as Record<string, unknown>)[
					"OrderLifecycle.advance"
				],
			).toStrictEqual({
				ensures: [{ language: "quire", text: "current = to" }],
				frame: { creates: [], deletes: [], modifies: ["current"] },
				requires: [{ language: "quire", text: "to <> current" }],
			});
			expect(
				(module.POPULATIONS as { displayName: string }[]).map(
					(one) => one.displayName,
				),
			).toStrictEqual(["OpenOrders"]);

			const golden = await generatedValidators(
				resolve(
					root,
					"crates/extraction-frontend/fixtures/config-version-table/expected/semantic-ir.json",
				),
				resolve(scratch, "golden"),
			);
			for (const name of [
				"TYPE_SUPERTYPES",
				"OPERATION_CONTRACTS",
				"POPULATIONS",
			])
				expect(golden[name], name).toBeUndefined();
		} finally {
			rmSync(scratch, { recursive: true, force: true });
		}
	}, 120000);
});

describe("TC-1767 generated TypeScript names come from display names (FR-064)", () => {
	/** Traces: TC-1767; FR-064-AC-24. */
	it("names each exported type by its display name while TYPE_IDENTITY keeps the artifact id", async () => {
		const scratch = mkdtempSync(resolve(tmpdir(), "fcd-typescript-names-"));
		try {
			const module = await generatedValidators(
				resolve(
					root,
					"crates/extraction-frontend/fixtures/config-version-table/expected/semantic-ir.json",
				),
				resolve(scratch, "names"),
			);
			const identities = module.TYPE_IDENTITY as Record<string, string>;
			expect(identities.ConfigVersion).toBe(
				"ix://agent-ix/config-service/type/FR-006",
			);
			expect(
				Object.keys(identities).some((name) => /^Fr?-?00/i.test(name)),
			).toBe(false);
			expect(typeof module.validateConfigVersion).toBe("function");
		} finally {
			rmSync(scratch, { recursive: true, force: true });
		}
	}, 120000);
});

describe("TC-811 IR-surface classification rules (FR-069)", () => {
	/** Traces: TC-811; FR-069-AC-17. */
	it("TC-811 classifies every removal and required addition breaking", () => {
		const removedField = classifierBase();
		(removedField.types as Record<string, unknown>[])[1].fields = [];
		expect(classifySurface(classifierBase(), removedField).classification).toBe(
			"breaking",
		);

		const addedRequired = classifierBase();
		(
			(addedRequired.types as Record<string, unknown>[])[1].fields as Record<
				string,
				unknown
			>[]
		).push({
			identity: "ix://agent-ix/tc811/field/added",
			name: "added",
			presence: "required",
			nullable: false,
			scalar: "string",
		});
		expect(
			classifySurface(classifierBase(), addedRequired).classification,
		).toBe("breaking");

		const removedVariant = classifierBase();
		(removedVariant.types as Record<string, unknown>[])[0].variants = [];
		expect(
			classifySurface(classifierBase(), removedVariant).classification,
		).toBe("breaking");

		const removedRelationship = classifierBase();
		(removedRelationship.types as Record<string, unknown>[])[1].relationships =
			[];
		expect(
			classifySurface(classifierBase(), removedRelationship).classification,
		).toBe("breaking");
	});

	/** Traces: TC-811; FR-069-AC-17, FR-069-AC-12. */
	it("classifies an added optional field conditional with no consumer policy", () => {
		const after = classifierBase();
		(
			(after.types as Record<string, unknown>[])[1].fields as Record<
				string,
				unknown
			>[]
		).push({
			identity: "ix://agent-ix/tc811/field/optional",
			name: "optional",
			presence: "optional",
			nullable: false,
			scalar: "string",
		});
		expect(classifySurface(classifierBase(), after).classification).toBe(
			"conditional",
		);
		expect(
			classifySurface(classifierBase(), after, {
				consumerPolicy: { ...OPEN_CONSUMER },
			}).classification,
		).toBe("additive");
	});

	/** Traces: TC-811; FR-069-AC-17, FR-069-AC-25. */
	it("classifies an added variant by the one named policy constant", async () => {
		const before = classifierBase();
		const after = classifierBase();
		(
			(after.types as Record<string, unknown>[])[0].variants as Record<
				string,
				unknown
			>[]
		).push({ identity: "ix://agent-ix/tc811/variant/void", name: "void" });

		// `compatibility.md` makes the addition additive for an open consumer
		// under either setting, because that is the one answer it states.
		expect(VARIANT_ADDITION_POLICIES).toEqual(["corpus", "contract"]);
		for (const setting of VARIANT_ADDITION_POLICIES) {
			const { classifySurface: classify, dispose } =
				await classifierUnder(setting);
			try {
				expect(
					classify(before, after, { consumerPolicy: { ...OPEN_CONSUMER } })
						.classification,
					`${setting} with an open consumer`,
				).toBe("additive");
				expect(
					classify(before, after).classification,
					`${setting} with no consumer policy`,
				).toBe(setting === "contract" ? "breaking" : "conditional");
			} finally {
				dispose();
			}
		}

		// And the committed default is the corpus's reading, which is what the
		// conformance agreement of FR-070 is measured against.
		expect(VARIANT_ADDITION_POLICY).toBe("corpus");
		expect(classifySurface(before, after).classification).toBe("conditional");
	}, 30_000);

	/** Traces: TC-811; FR-069-AC-25. */
	it("decides the variant addition in exactly one place", () => {
		const backend = resolve(root, "src/compiler/backends/typescript-v1");
		const readers: string[] = [];
		for (const name of readdirSync(backend)) {
			if (!name.endsWith(".mjs")) continue;
			const uses = readFileSync(resolve(backend, name), "utf8")
				.split("\n")
				.filter((line) => {
					const text = line.trimStart();
					return !text.startsWith("*") && !text.startsWith("//");
				})
				.filter((line) => line.includes("VARIANT_ADDITION_POLICY")).length;
			if (uses > 0) readers.push(`${name}:${uses}`);
		}
		// Outside its own documentation the constant appears twice: the
		// declaration, and the single read that decides the classification.
		expect(readers).toEqual(["classify.mjs:2"]);
	});
});

describe("TC-834..844 TypeScript backend non-disruption", () => {
	/** TC-835: NFR-024-AC-4. Bound by the leading id of the test name. */
	it("TC-835 produces identical packed artifacts after normalizing tar ownership and time", () => {
		const scratch = mkdtempSync(resolve(tmpdir(), "fcd-typescript-pack-"));
		try {
			const pack = (directory: string): Buffer => {
				mkdirSync(directory);
				const output = JSON.parse(
					execFileSync(
						"npm",
						["pack", "--pack-destination", directory, "--json"],
						{
							cwd: root,
							encoding: "utf8",
						},
					),
				) as { filename: string }[];
				expect(output).toHaveLength(1);
				return readFileSync(resolve(directory, output[0].filename));
			};
			const first = pack(resolve(scratch, "first"));
			const second = pack(resolve(scratch, "second"));
			expect(normalizeTarMetadata(first)).toEqual(normalizeTarMetadata(second));
		} finally {
			rmSync(scratch, { recursive: true, force: true });
		}
	});

	/** TC-837: NFR-024-AC-7..NFR-024-AC-9, and the formatter no-op of NFR-024-AC-12. */
	it("TC-837 keeps generated source hermetic, licensed, and formatter-stable", () => {
		for (const { path, text } of fixtureFiles(expected).filter((file) =>
			file.path.endsWith(".ts"),
		)) {
			expect(text, path).toContain(
				"SPDX-License-Identifier: AGPL-3.0-or-later",
			);
			expect(text, path).not.toMatch(
				/@ts-expect-error|:\s*any\b|<any>|\bas\s+any\b/,
			);
			for (const match of text.matchAll(
				/(?:import|export)\s[^"']*from\s["']([^"']+)["']/g,
			))
				expect(match[1], `${path}: non-relative import`).toMatch(/^\./);
		}
		for (const name of readdirSync(
			resolve(root, "src/compiler/backends/typescript-v1"),
		)) {
			if (!name.endsWith(".mjs")) continue;
			const text = readFileSync(
				resolve(root, "src/compiler/backends/typescript-v1", name),
				"utf8",
			);
			const code = text.replace(
				new RegExp(
					`${SLASH}\\*[\\s\\S]*?\\*${SLASH}|${SLASH}${SLASH}.*$`,
					"gm",
				),
				"",
			);
			expect(code, name).not.toMatch(
				/\.localeCompare\s*\(|process\.cwd\s*\(|process\.env\b|from\s+["']node:(?:fs|net|http)["']|\bDate\s*\(/,
			);
		}
		const scratch = mkdtempSync(resolve(tmpdir(), "fcd-typescript-format-"));
		try {
			const copied = resolve(scratch, "expected");
			cpSync(expected, copied, { recursive: true });
			const sourcePaths = fixtureFiles(copied)
				.filter((file) => file.path.endsWith(".ts"))
				.map((file) => resolve(copied, file.path));
			execFileSync(
				resolve(root, "node_modules/.bin/biome"),
				["format", "--write", ...sourcePaths],
				{ cwd: root, stdio: "pipe" },
			);
			expect(
				generatedFiles(copied).filter((file) => file.path.endsWith(".ts")),
			).toEqual(
				generatedFiles(expected).filter((file) => file.path.endsWith(".ts")),
			);
		} finally {
			rmSync(scratch, { recursive: true, force: true });
		}
	});

	/** Part of TC-843 (NFR-025-AC-8, NFR-025-AC-14); the corpus half of that row has no test, so the row is not bound. */
	it("ships compiler source but neither fixtures nor a generated package", () => {
		const packed = JSON.parse(
			execFileSync("npm", ["pack", "--dry-run", "--json"], {
				cwd: root,
				encoding: "utf8",
			}),
		) as { files: { path: string }[] }[];
		const files = packed[0]?.files.map((file) => file.path) ?? [];
		expect(files).toContain("src/compiler/backends/typescript-v1/index.mjs");
		expect(files.some((path) => path.startsWith("test/fixtures/"))).toBe(false);
		expect(files.some((path) => path.startsWith("generated/"))).toBe(false);
		const manifest = JSON.parse(
			readFileSync(resolve(root, "package.json"), "utf8"),
		) as Record<string, unknown>;
		expect(JSON.stringify(manifest.exports)).not.toContain("src/compiler");
	});

	/** TC-839: NFR-025-AC-1. Bound by the leading id of the test name. */
	it("TC-839 pins #22's changed set to history and permits every one of its paths", () => {
		const { base, tip } = changeRange(root, NFR025_SENTINELS);
		expect(base).toMatch(/^[0-9a-f]{40}$/);
		expect(tip).toMatch(/^[0-9a-f]{40}$/);
		const paths = changedPathsOf(root, NFR025_SENTINELS);
		expect(paths.length).toBeGreaterThan(0);
		for (const path of paths)
			expect(nfr025Permitted(path), `not permitted: ${path}`).toBe(true);
		for (const path of [
			"package.json",
			"pnpm-lock.yaml",
			"poetry.lock",
			"schema/semantic/v1/common.schema.json",
			"fixtures/semantic/v1/positive/target-contracts.json",
			"spikes/README.md",
			"packages/semantic-core/main.tsp",
			"src/compiler/backends/typescript.mjs",
			"src/compiler/backends/rust.mjs",
			"src/compiler/backends/type-names.mjs",
		])
			expect(paths).not.toContain(path);
	});

	/** TC-841: NFR-025-AC-3, NFR-025-AC-4, NFR-025-AC-13. Bound by the leading id of the test name. */
	it("TC-841 keeps package metadata, divergences, and the narrow tsconfig edit unchanged", () => {
		const { base, tip } = changeRange(root, NFR025_SENTINELS);
		const at = (commit: string, path: string): string =>
			execFileSync("git", ["show", `${commit}:${path}`], {
				cwd: root,
				encoding: "utf8",
			});
		const before = JSON.parse(at(base, "package.json")) as Record<
			string,
			unknown
		>;
		const after = JSON.parse(at(tip, "package.json")) as Record<
			string,
			unknown
		>;
		for (const key of [
			"exports",
			"main",
			"module",
			"types",
			"files",
			"dependencies",
			"peerDependencies",
			"optionalDependencies",
		])
			expect(JSON.stringify(after[key]), key).toBe(JSON.stringify(before[key]));
		for (const path of [
			"pnpm-lock.yaml",
			"poetry.lock",
			"conformance/divergences.json",
		])
			expect(at(tip, path), path).toBe(at(base, path));
		const prior = JSON.parse(at(base, "tsconfig.json")) as Record<
			string,
			unknown
		>;
		const current = JSON.parse(at(tip, "tsconfig.json")) as Record<
			string,
			unknown
		>;
		expect(current.exclude).toEqual([
			...(Array.isArray(prior.exclude) ? prior.exclude : []),
			"test/fixtures/backends/typescript",
		]);
		const stripped = (value: Record<string, unknown>) => {
			const copy = { ...value };
			delete copy.exclude;
			return copy;
		};
		expect(stripped(current)).toEqual(stripped(prior));
	});

	/** Part of TC-842 (NFR-025-AC-5); the frozen-golden half of that row has no test, so the row is not bound. */
	it("keeps the narrow compiler surface at fifteen exports", () => {
		const names = exportedCompilerSymbols(
			readFileSync(resolve(root, "src/compiler/index.mjs"), "utf8"),
		);
		expect(names).toHaveLength(15);
		expect(
			exportedCompilerSymbols('export { one, two } from "./x.mjs";'),
		).toHaveLength(2);
		expect(
			exportedCompilerSymbols('export { one, two, three } from "./x.mjs";'),
		).toHaveLength(3);
	});

	/** Part of TC-840 (NFR-025-AC-2); the other two clauses of that row have no test, so the row is not bound. */
	it("does not accrete later sibling paths in a squash-merge history", () => {
		const scratch = mkdtempSync(resolve(tmpdir(), "fcd-typescript-accretion-"));
		try {
			const git = (...args: string[]) =>
				execFileSync("git", args, { cwd: scratch, stdio: "pipe" });
			const write = (path: string, text: string) => {
				mkdirSync(dirname(resolve(scratch, path)), { recursive: true });
				writeFileSync(resolve(scratch, path), text);
			};
			git("init", "--initial-branch=main");
			git("config", "user.email", "gate@example.invalid");
			git("config", "user.name", "gate");
			write("README.md", "base\n");
			git("add", "-A");
			git("commit", "-m", "base");
			write(NFR025_SENTINELS[0], "plan\n");
			write(NFR025_SENTINELS[1], "sentinel\n");
			write("src/compiler/backends/typescript-v1/index.mjs", "export {};\n");
			git("add", "-A");
			git("commit", "-m", "#22 squash");
			const mine = changedPathsOf(scratch, NFR025_SENTINELS);
			write("schema/semantic/v1/later.json", "{}\n");
			write("conformance/cases/later.json", "{}\n");
			git("add", "-A");
			git("commit", "-m", "sibling backend");
			expect(changedPathsOf(scratch, NFR025_SENTINELS)).toEqual(mine);
		} finally {
			rmSync(scratch, { recursive: true, force: true });
		}
	});
});
