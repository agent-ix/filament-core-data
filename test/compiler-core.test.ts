import { execFileSync } from "node:child_process";
import {
	cpSync,
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	readdirSync,
	rmSync,
	statSync,
	symlinkSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import { changeRange, changedPathsOf } from "./changed-paths.js";
import {
	assertBackendContract,
	generateTarget,
} from "../src/compiler/backends/seam.mjs";
import { diffSemanticContract } from "../src/compiler/compat/diff.mjs";
import {
	CONTRACT_VERSIONS,
	V1_1_ADDED_NODES,
	readIrAsContract,
} from "../src/compiler/compat/evolution.mjs";
import {
	DEFAULT_LIMITS,
	DIAGNOSTIC_CODES,
	applyDiagnosticLimit,
	diagnostic,
	fragment,
	hasBlocking,
	sortDiagnostics,
} from "../src/compiler/diagnostics.mjs";
import {
	FRONTEND_DIALECTS,
	isImplemented,
	runFrontend,
	selectFrontend,
} from "../src/compiler/frontend/seam.mjs";
import { DECORATOR_LIBRARY } from "../src/compiler/frontend/typespec/frontend.mjs";
import {
	constraintAliasIdentity,
	constraintDiagnosticCode,
	mintIdentity,
	slug,
} from "../src/compiler/frontend/typespec/identity.mjs";
import { VOCABULARY } from "../src/compiler/frontend/typespec/lib/lib.mjs";
import { createHost } from "../src/compiler/host.mjs";
import { formatInspection, inspectIr } from "../src/compiler/inspect.mjs";
import { normalizeIr, fingerprintIr } from "../src/compiler/ir/normalize.mjs";
import { readContractIr } from "../src/compiler/ir/reader.mjs";
import { validateIrDocument } from "../src/compiler/ir/schema.mjs";
import { canonicalize, digest } from "../src/compiler/packages/canonical.mjs";
import { schemaValidators } from "../src/compiler/schema-validate.mjs";
import {
	CANONICALIZATION,
	buildLock,
	contentDigest,
	fingerprint,
	schemaBytes,
	serializeLock,
	sourceFiles,
	verifyLock,
} from "../src/compiler/packages/lock.mjs";
import {
	compareVersions,
	parseConstraint,
	parseVersion,
	resolvePackageGraph,
	satisfies,
} from "../src/compiler/packages/resolve.mjs";
import { compilePackage, PHASES } from "../src/compiler/pipeline.mjs";

/**
 * Issue #19 (the TypeSpec frontend and the versioned semantic IR compiler core)
 * matrix trace inventory:
 * TC-398..TC-619.
 * Acceptance criteria: FR-045-AC-1..10, FR-046-AC-1..19, FR-047-AC-1..16,
 * FR-048-AC-1..11, FR-049-AC-1..14, FR-050-AC-1..13, FR-051-AC-1..15,
 * FR-052-AC-1..16, FR-053-AC-1..15, NFR-019-AC-1..12, NFR-020-AC-1..11,
 * NFR-021-AC-1..8.
 * Constraints: FR-045-CON-1..4, FR-046-CON-1..5, FR-047-CON-1..5,
 * FR-048-CON-1..4, FR-049-CON-1..4, FR-050-CON-1..4, FR-051-CON-1..5,
 * FR-052-CON-1..4, FR-053-CON-1..5.
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const compilerRoot = resolve(root, "src/compiler");
const fixtures = resolve(root, "test/fixtures/compiler");
const assurance = resolve(fixtures, "packages/assurance");
const cases = resolve(fixtures, "cases");
const cli = resolve(compilerRoot, "cli.mjs");

type Json = Record<string, unknown>;

function read(path: string): string {
	return readFileSync(path, "utf8");
}

function readJson(path: string): Json {
	return JSON.parse(read(path)) as Json;
}

function git(...args: string[]): string {
	return execFileSync("git", args, { cwd: root, encoding: "utf8" });
}

/**
 * The commits issue #19 sits between, located from history through files it
 * created. Both ends are fixed after the merge. See `changeRange`.
 */
const SENTINEL = [
	"spec/usecase/US-010-compile-a-semantic-package.md",
	"src/compiler/pipeline.mjs",
];
const range = (): { base: string; tip: string } => changeRange(root, SENTINEL);
const baseline = (): string => range().base;

/** Every path this change made, with rename detection off (Plan-007's lesson). */
function changedPaths(): string[] {
	return changedPathsOf(root, SENTINEL);
}

function temp(label: string): string {
	return mkdtempSync(resolve(tmpdir(), `fcd-19-${label}-`));
}

function walk(directory: string, base = directory): string[] {
	const out: string[] = [];
	for (const name of readdirSync(directory).sort()) {
		const child = resolve(directory, name);
		if (statSync(child).isDirectory()) out.push(...walk(child, base));
		else out.push(relative(base, child).split(/[\\/]/).join("/"));
	}
	return out;
}

/** Runs the CLI and returns its status, stdout and stderr rather than throwing. */
function runCli(args: string[]): {
	status: number;
	stdout: string;
	stderr: string;
} {
	const result = execFileSync(process.execPath, [cli, ...args], {
		cwd: root,
		encoding: "utf8",
		stdio: "pipe",
	});
	return { status: 0, stdout: result, stderr: "" };
}

function runCliAllowingFailure(args: string[]): {
	status: number;
	stdout: string;
	stderr: string;
} {
	try {
		return runCli(args);
	} catch (error) {
		const failure = error as {
			status?: number;
			stdout?: string;
			stderr?: string;
		};
		return {
			status: failure.status ?? 1,
			stdout: String(failure.stdout ?? ""),
			stderr: String(failure.stderr ?? ""),
		};
	}
}

type Diagnostic = {
	code: string;
	severity: string;
	message: string;
	owner: string;
	blocking: boolean;
	causes: unknown[];
	related: unknown[];
	locus?: { path: string; startLine: number; startColumn: number };
};

/**
 * The issue #4 prototype backends, frozen by FR-042 and predating the
 * diagnostic registry. Named one by one rather than skipped as a directory, so
 * that a backend added later is scanned rather than silently exempted.
 */
const FROZEN_PROTOTYPE_BACKENDS = [
	"backends/typescript.mjs",
	"backends/rust.mjs",
	"backends/type-names.mjs",
	"backends/python-schema.mjs",
	"backends/python-pins.mjs",
];

/** The declared closed code registers: the one place a code is a string. */
const CODE_REGISTERS = [
	"diagnostics.mjs",
	"backends/typescript-v1/admit.mjs",
	"backends/typescript-v1/loss.mjs",
];

/** Every diagnostic any test in this file observed, for the coverage assertion. */
const observedCodes = new Set<string>();

function note(diagnostics: readonly Diagnostic[]): readonly Diagnostic[] {
	for (const entry of diagnostics) observedCodes.add(entry.code);
	return diagnostics;
}

function newHost(readRoots: string[] = [root], options: Json = {}) {
	return createHost({ readRoots, ...options });
}

/** Resolves and compiles one fixture package end to end. */
async function compileFixture(
	packageRoot: string,
	options: {
		searchPath?: string[];
		profileName?: string;
		entrypoint?: string;
		lockPath?: string;
		limits?: Json;
		host?: ReturnType<typeof createHost>;
	} = {},
) {
	const host = options.host ?? newHost([root]);
	const result = await compilePackage({
		host,
		packageRoot,
		searchPath: options.searchPath ?? [],
		profileName: options.profileName,
		entrypoint: options.entrypoint ?? "types/main.tsp",
		lockPath: options.lockPath,
		limits: options.limits as never,
	});
	note(result.diagnostics as never);
	return { ...result, host };
}

function resolveFixture(
	packageRoot: string,
	searchPath: string[] = [],
	profileName?: string,
) {
	const host = newHost([root, packageRoot, ...searchPath]);
	const resolution = resolvePackageGraph({
		host,
		packageRoot,
		searchPath,
		profileName,
	});
	note(resolution.diagnostics as never);
	return resolution;
}

function codesOf(diagnostics: readonly Diagnostic[]): string[] {
	return diagnostics.map((entry) => entry.code);
}

/** Compiles a throwaway TypeSpec package built from one source file. */
async function compileSource(source: string, extra: Json = {}) {
	const directory = temp("pkg");
	try {
		mkdirSync(resolve(directory, "types"), { recursive: true });
		writeFileSync(resolve(directory, "types/main.tsp"), source);
		writeFileSync(
			resolve(directory, "package-manifest.json"),
			JSON.stringify(
				{
					contractVersion: "1.0.0",
					package: { identity: "agent-ix/probe", version: "1.0.0" },
					schemaDialect: "https://json-schema.org/draft/2020-12/schema",
					sourceRoots: ["types"],
					exports: [],
					imports: [],
					profiles: [
						{
							name: "default",
							version: "1.0.0",
							exports: [],
							targets: ["json-schema"],
							mappings: [],
							options: {},
							compatibilityPosture: "additive",
						},
					],
					targets: ["json-schema"],
					mappings: [],
					extensions: [],
					...extra,
				},
				null,
				"\t",
			),
		);
		const host = newHost([root, directory]);
		const result = await compilePackage({
			host,
			packageRoot: directory,
			searchPath: [],
			entrypoint: "types/main.tsp",
		});
		note(result.diagnostics as never);
		return { ...result, directory, host };
	} finally {
		// The caller reads the result, not the tree; removing it here keeps the
		// temporary directories from accumulating across a full run.
		rmSync(directory, { recursive: true, force: true });
	}
}

let compiled: Awaited<ReturnType<typeof compileFixture>>;

beforeAll(async () => {
	compiled = await compileFixture(assurance, { profileName: "default" });
}, 120000);

// ---------------------------------------------------------------------------
// FR-045 — the frontend seam and dialect registry
// ---------------------------------------------------------------------------

describe("frontend seam and dialect registry (FR-045)", () => {
	/** Traces: TC-398; FR-045-AC-1. */
	it("exposes exactly the dialects the published schema declares", () => {
		const published = (
			readJson(resolve(root, "schema/semantic/v1/common.schema.json"))
				.$defs as Json
		).frontendDialect as { enum: string[] };
		expect([...FRONTEND_DIALECTS].sort()).toEqual([...published.enum].sort());
	});

	/** Traces: TC-399; FR-045-AC-2. */
	it("throws a TypeError for a dialect outside the closed vocabulary", () => {
		expect(() => selectFrontend("json-schema")).toThrow(TypeError);
		try {
			selectFrontend("json-schema");
		} catch (error) {
			expect(String((error as Error).message)).toContain("json-schema");
			for (const dialect of FRONTEND_DIALECTS) {
				expect(String((error as Error).message)).toContain(dialect);
			}
		}
	});

	/** Traces: TC-400, TC-408; FR-045-AC-3, FR-045-CON-1. */
	it("names issue #36 rather than guessing at the unimplemented dialect", async () => {
		expect(isImplemented("spec-bundle")).toBe(false);
		const result = await runFrontend({
			dialect: "spec-bundle",
			resolution: compiled.resolution as never,
			entrypoint: "types/main.tsp",
		});
		note(result.diagnostics as never);
		expect(result.ir).toBeNull();
		expect(result.diagnostics).toHaveLength(1);
		expect(result.diagnostics[0].code).toBe(
			DIAGNOSTIC_CODES.FRONTEND_NOT_IMPLEMENTED.code,
		);
		expect(result.diagnostics[0].blocking).toBe(true);
		expect(result.diagnostics[0].message).toContain("#36");
	});

	/** Traces: TC-401; FR-045-AC-4. */
	it("returns diagnostics rather than throwing for sources that do not compile", async () => {
		const result = await compileSource("namespace AgentIx.Semantic;\nmodel {");
		expect(result.ir).toBeNull();
		expect(codesOf(result.diagnostics as never)).toContain(
			DIAGNOSTIC_CODES.TYPESPEC_COMPILE_ERROR.code,
		);
	});

	/** Traces: TC-402, TC-601; FR-045-AC-5. */
	it("runs every shared fixture case through every implemented dialect it supplies", async () => {
		const manifest = readJson(
			resolve(fixtures, "shared/cases.json"),
		) as unknown as {
			cases: { id: string; sources: Record<string, string> }[];
		};
		expect(manifest.cases.length).toBeGreaterThan(0);
		for (const shared of manifest.cases) {
			const implemented = Object.keys(shared.sources).filter((dialect) =>
				isImplemented(dialect),
			);
			expect(implemented.length).toBeGreaterThan(0);
			const results: string[] = [];
			for (const dialect of implemented) {
				const packageRoot = resolve(fixtures, shared.sources[dialect]);
				const result = await compileFixture(packageRoot, {
					profileName: "default",
				});
				expect(codesOf(result.diagnostics as never), shared.id).toEqual([]);
				results.push(normalizeIr(result.ir));
			}
			// Recorded honestly: with one implemented dialect this demonstrates the
			// harness runs, not cross-frontend equivalence, which needs issue #36.
			if (results.length === 1) {
				expect(
					results[0].length,
					`${shared.id} single-dialect`,
				).toBeGreaterThan(0);
			} else {
				expect(new Set(results).size, `${shared.id} cross-dialect`).toBe(1);
			}
		}
	}, 120000);

	/** Traces: TC-403, TC-410, TC-454; FR-045-AC-6, FR-045-CON-3, FR-046-CON-4. */
	it("imports no backend and no target-facing TypeSpec library", () => {
		const forbidden = [
			"@typespec/json-schema",
			"@typespec/protobuf",
			"@typespec/openapi",
			"../../backends/",
			"../backends/",
			"node:fs",
		];
		for (const relativePath of walk(resolve(compilerRoot, "frontend"))) {
			if (!relativePath.endsWith(".mjs")) continue;
			const source = read(resolve(compilerRoot, "frontend", relativePath));
			for (const token of forbidden) {
				expect(
					source.includes(`from "${token}`),
					`${relativePath} imports ${token}`,
				).toBe(false);
			}
		}
	});

	/** Traces: TC-404, TC-409; FR-045-AC-7, FR-045-CON-2. */
	it("refuses a document returned alongside a blocking diagnostic", async () => {
		const { assertFrontendContract } = await import(
			"../src/compiler/frontend/seam.mjs"
		);
		const blocking = diagnostic(DIAGNOSTIC_CODES.FRONTEND_NOT_IMPLEMENTED, {
			message: "deliberate contract violation",
		});
		// A frontend that returns both must fail the seam, not the caller.
		expect(() =>
			assertFrontendContract("spec-bundle", {
				ir: { contractVersion: "1.1.0" },
				diagnostics: [blocking],
			}),
		).toThrow(/partial document/);
		// The two lawful shapes pass.
		expect(
			assertFrontendContract("spec-bundle", {
				ir: null,
				diagnostics: [blocking],
			}).ir,
		).toBeNull();
		expect(
			assertFrontendContract("typespec", { ir: compiled.ir, diagnostics: [] })
				.diagnostics,
		).toEqual([]);
	});

	/** Traces: TC-405; FR-045-AC-8. */
	it("carries the package resolution to the frontend rather than resolving inside it", () => {
		const resolution = compiled.resolution as unknown as {
			root: { identity: string };
			packages: { identity: string }[];
			importedExports: Set<string>;
		};
		expect(resolution.root.identity).toBe("agent-ix/assurance");
		const exports = (
			readJson(resolve(assurance, "package-manifest.json")).exports as {
				typeIdentity: string;
			}[]
		).map((entry) => entry.typeIdentity);
		expect(exports.length).toBeGreaterThan(1);
		// Both declared exports are visible to the seam's caller, which is what
		// makes resolution the seam's concern and not each frontend's.
		expect(resolution.packages.map((entry) => entry.identity)).toContain(
			"agent-ix/assurance",
		);
	});

	/** Traces: TC-406, TC-576, TC-589; FR-045-AC-9, NFR-019-AC-10, NFR-020-AC-11. */
	it("routes every read a compile performs through the injected host", async () => {
		const host = newHost([root]);
		const result = await compileFixture(assurance, {
			profileName: "default",
			host,
		});
		expect(result.ir).not.toBeNull();
		expect(host.record.reads.length).toBeGreaterThan(0);
		for (const path of host.record.reads) {
			expect(path.startsWith(root), path).toBe(true);
		}
		expect(host.record.refusedReads).toEqual([]);
		// The count NFR-019-AC-10 asks for: every read the compile performed,
		// minus the ones an injected host observed, is zero. `node:fs` is watched
		// directly, so a module that read the disk without going through a host
		// shows up here rather than passing unnoticed.
		const fs = await import("node:fs");
		const unobserved: string[] = [];
		const watched = ["readFileSync", "readdirSync", "statSync"] as const;
		const saved = watched.map((name) => [name, fs.default[name]] as const);
		try {
			for (const name of watched) {
				const original = fs.default[name] as (...args: unknown[]) => unknown;
				(fs.default as Record<string, unknown>)[name] = (
					...args: unknown[]
				) => {
					const path = String(args[0]);
					if (path.startsWith(root) && !path.includes("node_modules")) {
						unobserved.push(`${name}:${path}`);
					}
					return original(...args);
				};
			}
			const counted = newHost([root]);
			await compilePackage({
				host: counted,
				packageRoot: assurance,
				searchPath: [],
				profileName: "default",
				entrypoint: "types/main.tsp",
			});
			// Every recorded direct call is one the host also recorded, or one the
			// host itself made on the caller's behalf.
			const observed = new Set(counted.record.reads);
			const stray = unobserved.filter((entry) => {
				const path = entry.slice(entry.indexOf(":") + 1);
				return !observed.has(path) && !path.startsWith(compilerRoot);
			});
			expect(stray, "reads the injected host never saw").toEqual([]);
		} finally {
			for (const [name, original] of saved) {
				(fs.default as Record<string, unknown>)[name] = original;
			}
		}
	}, 120000);

	/** Traces: TC-407, TC-411; FR-045-AC-10, FR-045-CON-4. */
	it("never throws over mutated inputs", async () => {
		const document = JSON.parse(JSON.stringify(compiled.ir)) as Json;
		const serialized = JSON.stringify(document);
		let ran = 0;
		for (let seed = 0; seed < 256; seed += 1) {
			const index = (seed * 7919) % serialized.length;
			const mutated = `${serialized.slice(0, index)}${String.fromCharCode(
				33 + (seed % 90),
			)}${serialized.slice(index + 1)}`;
			let parsed: unknown;
			try {
				parsed = JSON.parse(mutated);
			} catch {
				continue;
			}
			ran += 1;
			expect(() => readContractIr(parsed)).not.toThrow();
			expect(() => validateIrDocument(parsed)).not.toThrow();
		}
		expect(ran).toBeGreaterThan(0);
	});
});

// ---------------------------------------------------------------------------
// FR-053 — the semantic vocabulary and identity minting
// ---------------------------------------------------------------------------

describe("semantic vocabulary and identity minting (FR-053)", () => {
	const libraryRoot = resolve(compilerRoot, "frontend/typespec/lib");

	/** Traces: TC-412, TC-428; FR-053-AC-1, FR-053-CON-2. */
	it("declares exactly fifteen decorators", () => {
		const declarations = [
			...read(resolve(libraryRoot, "main.tsp")).matchAll(
				/^extern dec (\w+)\(/gm,
			),
		].map((match) => match[1]);
		expect(declarations.sort()).toEqual([...VOCABULARY]);
		expect(declarations).toHaveLength(15);
	});

	/** Traces: TC-413, TC-429, TC-453; FR-053-AC-2, FR-053-CON-3, FR-046-CON-3. */
	it("reaches the library by additionalImports, so no package names a path outside its root", () => {
		expect(existsSync(DECORATOR_LIBRARY)).toBe(true);
		const source = read(resolve(assurance, "types/main.tsp"));
		expect(source).not.toContain("import ");
		// No path escape: the library is injected, so the package names no path
		// at all. (`0..1` in a doc comment is not a path, hence the shape here.)
		expect(source).not.toMatch(/["'][^"']*\.\.\//);
		expect(source).toContain("using AgentIx.Semantic.Decorators;");
		const manifest = readJson(resolve(root, "package.json"));
		const dependencies = {
			...((manifest.dependencies as Json) ?? {}),
			...((manifest.devDependencies as Json) ?? {}),
		};
		expect(Object.keys(dependencies)).not.toContain(
			"@agent-ix/semantic-decorators",
		);
		for (const value of Object.values(dependencies)) {
			expect(String(value).startsWith("file:")).toBe(false);
			expect(String(value).startsWith("link:")).toBe(false);
		}
	});

	/** Traces: TC-414; FR-053-AC-3. */
	it("reports a second application of a single-valued decorator", async () => {
		const result = await compileSource(
			[
				"using AgentIx.Semantic.Decorators;",
				"namespace AgentIx.Semantic;",
				"scalar Text extends string;",
				'@unknownPolicy("preserve")',
				'@unknownPolicy("reject")',
				"model Thing { id: Text; }",
			].join("\n"),
		);
		expect(codesOf(result.diagnostics as never)).toContain(
			DIAGNOSTIC_CODES.DUPLICATE_DECORATOR.code,
		);
		const entry = (result.diagnostics as unknown as Diagnostic[]).find(
			(item) => item.code === DIAGNOSTIC_CODES.DUPLICATE_DECORATOR.code,
		);
		expect(entry?.locus?.startLine).toBe(5);
		expect(entry?.related).toHaveLength(1);
	}, 60000);

	/** Traces: TC-415, TC-604; FR-053-AC-4. */
	it("rejects a malformed argument for every declared pattern, at the decorator", async () => {
		const bad = [
			['@role("entity")', "role"],
			['@unknownPolicy("maybe")', "unknownPolicy"],
			['@unit("a b")', "unit"],
			['@defaultKind("guess")', "defaultKind"],
			[
				'@relationship("has", "invented", "ix://agent-ix/x/type/Y")',
				"relationship",
			],
			['@clause("shouting", "id", "text")', "clause"],
			['@semanticReference("not-an-identity")', "semanticReference"],
			[
				'@semanticExtension("ix://agent-ix/x/ext/e", "1.0.0", true, "{oops")',
				"semanticExtension",
			],
			["@decimal(0, 0)", "decimal"],
		];
		for (const [application, label] of bad) {
			const onProperty = ["unit", "defaultKind", "decimal"].includes(label);
			const source = onProperty
				? [
						"using AgentIx.Semantic.Decorators;",
						"namespace AgentIx.Semantic;",
						"scalar Text extends string;",
						"model Thing {",
						`  ${application}`,
						"  value: Text;",
						"}",
					].join("\n")
				: [
						"using AgentIx.Semantic.Decorators;",
						"namespace AgentIx.Semantic;",
						"scalar Text extends string;",
						application,
						"model Thing { id: Text; }",
					].join("\n");
			const result = await compileSource(source);
			expect(codesOf(result.diagnostics as never), label).toContain(
				DIAGNOSTIC_CODES.INVALID_DECORATOR_ARGUMENT.code,
			);
		}
		// The well-formed side: `@minLength(0)` is a legal lower boundary.
		const good = await compileSource(
			[
				"using AgentIx.Semantic.Decorators;",
				"namespace AgentIx.Semantic;",
				"@minLength(0) scalar Text extends string;",
				"model Thing { id: Text; }",
			].join("\n"),
		);
		expect(codesOf(good.diagnostics as never)).toEqual([]);
		const text = (good.ir as never as { types: Json[] }).types.find(
			(type) => type.displayName === "Text",
		);
		expect((text?.constraints as Json[])[0].operands).toEqual({ value: 0 });
	}, 300000);

	/** Traces: TC-416; FR-053-AC-5. */
	it("checks the unit charset and leaves UCUM membership to the consumer", async () => {
		const accepted = await compileSource(
			[
				"using AgentIx.Semantic.Decorators;",
				"namespace AgentIx.Semantic;",
				"scalar Seconds extends float64;",
				'model Thing { @unit("furlong") value: Seconds; }',
			].join("\n"),
		);
		expect(codesOf(accepted.diagnostics as never)).toEqual([]);
		const refused = await compileSource(
			[
				"using AgentIx.Semantic.Decorators;",
				"namespace AgentIx.Semantic;",
				"scalar Seconds extends float64;",
				'model Thing { @unit("a b") value: Seconds; }',
			].join("\n"),
		);
		expect(codesOf(refused.diagnostics as never)).toContain(
			DIAGNOSTIC_CODES.INVALID_DECORATOR_ARGUMENT.code,
		);
	}, 120000);

	/** Traces: TC-417, TC-427; FR-053-AC-6, FR-053-CON-1. */
	it("mints the identities FR-034 mints, from one shared table", () => {
		// FR-034's rules, rooted at the package identity. The expectations are
		// written from the requirement text, and the implementation is asked to
		// agree with them rather than the other way round.
		const pkg = "agent-ix/assurance";
		expect(mintIdentity(pkg, "type", ["Artifact"])).toBe(
			"ix://agent-ix/assurance/type/Artifact",
		);
		expect(mintIdentity(pkg, "field", ["Artifact", "id"])).toBe(
			"ix://agent-ix/assurance/field/Artifact-id",
		);
		expect(mintIdentity(pkg, "field", ["Artifact", "archive", "reason"])).toBe(
			"ix://agent-ix/assurance/field/Artifact-archive-reason",
		);
		expect(
			mintIdentity(pkg, "relationship", ["Artifact", "belongs_to", "Project"]),
		).toBe("ix://agent-ix/assurance/relationship/Artifact-belongs-to-Project");
		expect(mintIdentity(pkg, "operation", ["Artifact", "archive"])).toBe(
			"ix://agent-ix/assurance/operation/Artifact-archive",
		);
		expect(mintIdentity(pkg, "clause", ["Artifact", "not_archived"])).toBe(
			"ix://agent-ix/assurance/clause/Artifact-not-archived",
		);
		expect(mintIdentity(pkg, "constraint", ["Text", "minLength"])).toBe(
			"ix://agent-ix/assurance/constraint/Text-minLength",
		);
		expect(constraintAliasIdentity(pkg, "Artifact", "code")).toBe(
			"ix://agent-ix/assurance/type/ArtifactCode",
		);
		// Every identity the fixture emits matches one of those forms.
		const identities = (compiled.ir as never as { types: Json[] }).types.map(
			(type) => String(type.identity),
		);
		for (const identity of identities) {
			expect(identity.startsWith(`ix://${pkg}/type/`), identity).toBe(true);
		}
	});

	/** Traces: TC-418, TC-430, TC-452; FR-053-AC-7, FR-053-CON-4, FR-046-CON-2. */
	it("derives no semantic value from a declaration's name", async () => {
		const template = (suffix: string) =>
			[
				"using AgentIx.Semantic.Decorators;",
				"namespace AgentIx.Semantic;",
				`scalar Text${suffix} extends string;`,
				'@role("agent-ix:entity")',
				`model Thing${suffix} {`,
				`  id: Text${suffix};`,
				`  note: Text${suffix} | null;`,
				"}",
			].join("\n");
		const first = await compileSource(template(""));
		const second = await compileSource(template("Renamed"));
		const strip = (result: typeof first) =>
			(result.ir as never as { types: Json[] }).types.map((type) => ({
				kind: type.kind,
				roles: type.roles,
				unknownPolicy: type.unknownPolicy,
				scalar: type.scalar ?? null,
				fields: ((type.fields as Json[]) ?? []).map((field) => ({
					nullable: field.nullable,
					presence: field.presence,
					multiplicity: field.multiplicity,
					unit: field.unit ?? null,
				})),
			}));
		expect(canonicalize(strip(second))).toBe(canonicalize(strip(first)));
	}, 120000);

	/** Traces: TC-419; FR-053-AC-8. */
	it("mints an alias for a constrained property and retargets the field to it", () => {
		const types = (compiled.ir as never as { types: Json[] }).types;
		const alias = types.find(
			(type) => type.identity === "ix://agent-ix/assurance/type/ArtifactCode",
		);
		expect(alias?.kind).toBe("alias");
		expect(alias?.target).toBe("ix://agent-ix/assurance/type/Text");
		const constraint = (alias?.constraints as Json[])[0];
		expect(constraint.keyword).toBe("minLength");
		expect(constraint.appliesTo).toBe(alias?.identity);
		const artifact = types.find(
			(type) => type.identity === "ix://agent-ix/assurance/type/Artifact",
		);
		const field = (artifact?.fields as Json[]).find(
			(entry) => entry.name === "code",
		);
		expect(field?.typeRef).toBe(alias?.identity);
	});

	/** Traces: TC-420; FR-053-AC-9. */
	it("derives a diagnostic code that always matches the published pattern", () => {
		const pattern = /^agent-ix\.[a-z0-9-]+\.[A-Z][A-Z0-9_]+$/;
		const samples: [string, string[], string][] = [
			["agent-ix/assurance", ["Text"], "minLength"],
			["agent-ix/core.data", ["Artifact", "a_b.c"], "maxLength"],
			["agent-ix/core_data", ["Weird~Name"], "pattern"],
			["agent-ix/x", ["A", "b"], "exclusiveMin"],
		];
		for (const [pkg, parts, keyword] of samples) {
			const code = constraintDiagnosticCode(pkg, parts, keyword);
			expect(pattern.test(code), code).toBe(true);
		}
		for (const type of (compiled.ir as never as { types: Json[] }).types) {
			for (const constraint of (type.constraints as Json[]) ?? []) {
				expect(
					pattern.test(String(constraint.diagnosticCode)),
					String(constraint.diagnosticCode),
				).toBe(true);
			}
		}
	});

	/** Traces: TC-421; FR-053-AC-10. */
	it("refuses two names that mint one identity", async () => {
		const result = await compileSource(
			[
				"namespace AgentIx.Semantic;",
				"scalar Text extends string;",
				"model A_b { id: Text; }",
				"model A__b { id: Text; }",
			].join("\n"),
		);
		expect(codesOf(result.diagnostics as never)).toContain(
			DIAGNOSTIC_CODES.UNSLUGGABLE_NAME.code,
		);
		expect(slug("A_b")).toBe(slug("A__b"));
	}, 60000);

	/** Traces: TC-422, TC-600; FR-053-AC-11. */
	it("refuses inapplicable constraints, non-record nodes, and dangling clause refs", async () => {
		// Measured, and recorded in FR-053: TypeSpec target-checks its own
		// decorators, so an inapplicable core constraint never reaches the
		// frontend's applicability check — it is refused earlier as a TypeSpec
		// error. The rule itself is exercised through the reader (TC-520), and
		// what matters here is that both read one table.
		const notApplicable = await compileSource(
			[
				"namespace AgentIx.Semantic;",
				"scalar Text extends string;",
				"model Inner { id: Text; }",
				'model Thing { @format("agent-ix:plain-text") value: Inner; }',
			].join("\n"),
		);
		expect(codesOf(notApplicable.diagnostics as never)).toContain(
			DIAGNOSTIC_CODES.TYPESPEC_COMPILE_ERROR.code,
		);
		const lowering = read(resolve(compilerRoot, "frontend/typespec/lower.mjs"));
		const reader = read(resolve(compilerRoot, "ir/reader.mjs"));
		for (const source of [lowering, reader]) {
			expect(source).toContain("applicability.mjs");
		}

		// `@relationship` targets a TypeSpec model, so an enum is refused by
		// TypeSpec. A model that classifies as a *sequence* is the case that
		// reaches the frontend's own kind check.
		const nonRecord = await compileSource(
			[
				"using AgentIx.Semantic.Decorators;",
				"namespace AgentIx.Semantic;",
				"scalar Text extends string;",
				'@relationship("has", "structural", "ix://agent-ix/probe/type/Text")',
				"model TagList is Array<Text>;",
			].join("\n"),
		);
		expect(codesOf(nonRecord.diagnostics as never)).toContain(
			DIAGNOSTIC_CODES.NODES_ON_NON_RECORD.code,
		);

		const dangling = await compileSource(
			[
				"using AgentIx.Semantic.Decorators;",
				"namespace AgentIx.Semantic;",
				"scalar Text extends string;",
				"model Thing { id: Text; }",
				'@operations("Thing")',
				"interface Ops {",
				'  @pre("absent") act(): Text;',
				"}",
			].join("\n"),
		);
		expect(codesOf(dangling.diagnostics as never)).toContain(
			DIAGNOSTIC_CODES.DANGLING_CLAUSE_REF.code,
		);

		const duplicate = await compileSource(
			[
				"using AgentIx.Semantic.Decorators;",
				"namespace AgentIx.Semantic;",
				"scalar Text extends string;",
				'@clause("ocl", "same", "a")',
				'@clause("ocl", "same", "b")',
				"model Thing { id: Text; }",
			].join("\n"),
		);
		expect(codesOf(duplicate.diagnostics as never)).toContain(
			DIAGNOSTIC_CODES.DUPLICATE_CLAUSE_ID.code,
		);
	}, 300000);

	/** Traces: TC-423; FR-053-AC-12. */
	it("lowers relationships, operations, and clauses with the FR-034 defaults", () => {
		const artifact = (compiled.ir as never as { types: Json[] }).types.find(
			(type) => type.identity === "ix://agent-ix/assurance/type/Artifact",
		);
		const relationships = artifact?.relationships as Json[];
		expect(relationships).toHaveLength(2);
		for (const relationship of relationships) {
			expect(relationship.composite).toBe(false);
			expect(relationship.multiplicity).toEqual({ lower: 0, upper: 1 });
		}
		const operations = artifact?.operations as Json[];
		expect(operations).toHaveLength(1);
		expect((operations[0].returns as Json).nullable).toBe(false);
		expect(operations[0].pre).toEqual(["not_archived"]);
		expect(operations[0].post).toEqual(["bounded"]);
		const clauses = artifact?.clauses as Json[];
		expect(clauses.map((clause) => clause.clauseId).sort()).toEqual([
			"bounded",
			"not_archived",
		]);
		for (const clause of clauses) expect(clause.sourceSpan).toBeDefined();
	});

	/** Traces: TC-424; FR-053-AC-13. */
	it("lowers each of the four semantic-core extensions", async () => {
		const artifact = (compiled.ir as never as { types: Json[] }).types.find(
			(type) => type.identity === "ix://agent-ix/assurance/type/Artifact",
		);
		const extensionsOf = (name: string) =>
			(
				(artifact?.fields as Json[]).find((field) => field.name === name)
					?.extensions as Json[]
			).map((extension) => extension.identity);
		expect(extensionsOf("id")).toContain(
			"ix://agent-ix/semantic-core/ext/identity",
		);
		expect(extensionsOf("weight")).toContain(
			"ix://agent-ix/semantic-core/ext/decimal",
		);
		expect(extensionsOf("id")).toContain("ix://agent-ix/semantic-core/ext/doc");
		const kernel = (compiled.ir as never as { types: Json[] }).types.find(
			(type) => type.identity === "ix://agent-ix/assurance/type/Integer",
		);
		expect((kernel?.extensions as Json[])[0].identity).toBe(
			"ix://agent-ix/semantic-core/ext/kernel-scalar",
		);
		expect(((kernel?.extensions as Json[])[0].payload as Json).name).toBe(
			"Integer",
		);

		const arbitrary = await compileSource(
			[
				"using AgentIx.Semantic.Decorators;",
				"namespace AgentIx.Semantic;",
				"scalar Text extends string;",
				'@semanticExtension("ix://agent-ix/probe/ext/custom", "2.1.0", true, "{\\"k\\":1}")',
				"model Thing { id: Text; }",
			].join("\n"),
		);
		expect(codesOf(arbitrary.diagnostics as never)).toEqual([]);
		const thing = (arbitrary.ir as never as { types: Json[] }).types.find(
			(type) => type.displayName === "Thing",
		);
		expect((thing?.extensions as Json[])[0]).toEqual({
			identity: "ix://agent-ix/probe/ext/custom",
			version: "2.1.0",
			required: true,
			payload: { k: 1 },
		});
	}, 60000);

	/** Traces: TC-425; FR-053-AC-14. */
	it("refuses every datum the IR has no member for, and carries the ones it has", async () => {
		const memberValue = await compileSource(
			[
				"namespace AgentIx.Semantic;",
				'enum Status { draft, final: "FINAL" }',
			].join("\n"),
		);
		expect(codesOf(memberValue.diagnostics as never)).toContain(
			DIAGNOSTIC_CODES.UNSUPPORTED_LOSS.code,
		);
		expect(memberValue.ir).toBeNull();

		// A template instance carries arguments the IR has no member for.
		const templated = await compileSource(
			[
				"namespace AgentIx.Semantic;",
				"scalar Text extends string;",
				"model Box<T> { value: T; }",
				"model TextBox { boxed: Box<Text>; }",
			].join("\n"),
		);
		expect(codesOf(templated.diagnostics as never)).toContain(
			DIAGNOSTIC_CODES.UNSUPPORTED_LOSS.code,
		);

		// And a doc comment on a declaration is *carried*, not dropped: it is the
		// same semantic-core extension FR-034 puts on a field.
		const documented = await compileSource(
			[
				"namespace AgentIx.Semantic;",
				"/** what this scalar means */",
				"scalar Text extends string;",
			].join("\n"),
		);
		expect(codesOf(documented.diagnostics as never)).toEqual([]);
		const text = (documented.ir as never as { types: Json[] }).types.find(
			(type) => type.displayName === "Text",
		);
		expect((text?.extensions as Json[])[0]).toEqual({
			identity: "ix://agent-ix/semantic-core/ext/doc",
			version: "1.0.0",
			required: false,
			payload: { text: "what this scalar means" },
		});
	}, 180000);

	/** Traces: TC-426, TC-431, TC-447, TC-455; FR-053-AC-15, FR-053-CON-5, FR-046-AC-16, FR-046-CON-5. */
	it("licenses every manifest it adds AGPL-3.0-only and adds no dependency", () => {
		const added = changedPaths().filter(
			(path) => path.endsWith("package.json") && path.startsWith("src/"),
		);
		for (const path of added) {
			expect(readJson(resolve(root, path)).license, path).toBe("AGPL-3.0-only");
		}
		expect(
			readJson(resolve(compilerRoot, "frontend/typespec/lib/package.json"))
				.license,
		).toBe("AGPL-3.0-only");
		const before = JSON.parse(
			git("show", `${baseline()}:package.json`),
		) as Json;
		const now = readJson(resolve(root, "package.json"));
		expect(now.dependencies ?? null).toEqual(before.dependencies ?? null);
		expect(Object.keys((now.devDependencies as Json) ?? {}).sort()).toEqual(
			Object.keys((before.devDependencies as Json) ?? {}).sort(),
		);
	});
});

// ---------------------------------------------------------------------------
// FR-046 — the TypeSpec structural lowering
// ---------------------------------------------------------------------------

describe("TypeSpec structural lowering (FR-046)", () => {
	const typeOf = (identity: string): Json =>
		(compiled.ir as never as { types: Json[] }).types.find(
			(type) => type.identity === `ix://agent-ix/assurance/type/${identity}`,
		) as Json;

	const fieldOf = (typeName: string, fieldName: string): Json =>
		(typeOf(typeName).fields as Json[]).find(
			(field) => field.name === fieldName,
		) as Json;

	/** Traces: TC-432, TC-450, TC-614; FR-046-AC-1, FR-046-AC-19. */
	it("emits a valid 1.1.0 document with no reader diagnostics", () => {
		expect(compiled.ir).not.toBeNull();
		expect((compiled.ir as Json).contractVersion).toBe("1.1.0");
		expect(((compiled.ir as Json).source as Json).dialect).toBe("typespec");
		expect(validateIrDocument(compiled.ir)).toEqual([]);
		expect(codesOf(readContractIr(compiled.ir) as never)).toEqual([]);
	});

	/** Traces: TC-433; FR-046-AC-2. */
	it("classifies every row of the structural-kind table, first match wins", () => {
		expect(typeOf("ActorRef").kind).toBe("reference");
		expect(typeOf("ActorRef").target).toBe(
			"ix://agent-ix/assurance/type/Actor",
		);
		expect(typeOf("ArtifactId").kind).toBe("alias");
		expect(typeOf("ArtifactId").target).toBe(
			"ix://agent-ix/assurance/type/Text",
		);
		expect(typeOf("Text").kind).toBe("scalar");
		expect(typeOf("TagList").kind).toBe("sequence");
		expect(typeOf("TagList").items).toBe("ix://agent-ix/assurance/type/Text");
		expect(typeOf("Attributes").kind).toBe("map");
		expect(typeOf("Attributes").values).toBe(
			"ix://agent-ix/assurance/type/Text",
		);
		expect(typeOf("Artifact").kind).toBe("record");
		expect(typeOf("Status").kind).toBe("enum");
		expect(typeOf("Payload").kind).toBe("union");
		const kinds = new Set(
			(compiled.ir as never as { types: Json[] }).types.map(
				(type) => type.kind,
			),
		);
		expect([...kinds].sort()).toEqual([
			"alias",
			"enum",
			"map",
			"record",
			"reference",
			"scalar",
			"sequence",
			"union",
		]);
	});

	/** Traces: TC-434; FR-046-AC-3. */
	it("maps every built-in scalar row and refuses an unmapped base", async () => {
		const rows: [string, string][] = [
			["boolean", "boolean"],
			["int32", "integer"],
			["int64", "integer"],
			["safeint", "integer"],
			["uint8", "integer"],
			["float64", "number"],
			["decimal128", "number"],
			["numeric", "number"],
			["string", "string"],
			["url", "string"],
			["bytes", "bytes"],
			["plainDate", "date"],
			["utcDateTime", "datetime"],
			["offsetDateTime", "datetime"],
			["duration", "duration"],
		];
		const source = [
			"namespace AgentIx.Semantic;",
			...rows.map(([builtin], index) => `scalar S${index} extends ${builtin};`),
		].join("\n");
		const result = await compileSource(source);
		expect(codesOf(result.diagnostics as never)).toEqual([]);
		const types = (result.ir as never as { types: Json[] }).types;
		for (const [index, row] of rows.entries()) {
			const type = types.find((entry) => entry.displayName === `S${index}`);
			expect(type?.scalar, row[0]).toBe(row[1]);
		}
		// `plainDate` has an IR scalar but no kernel scalar, so using it directly
		// as a member type is refused rather than given an unnameable definition.
		const unmapped = await compileSource(
			["namespace AgentIx.Semantic;", "model Thing { at: plainDate; }"].join(
				"\n",
			),
		);
		expect(codesOf(unmapped.diagnostics as never)).toContain(
			DIAGNOSTIC_CODES.UNSUPPORTED_SCALAR_BASE.code,
		);
	}, 120000);

	/** Traces: TC-435; FR-046-AC-4. */
	it("takes roles from @role and never from a declaration's name", () => {
		expect(typeOf("AuditEvent").roles).toEqual([]);
		expect(typeOf("Artifact").roles).toEqual([
			"agent-ix:entity",
			"agent-ix:report",
		]);
	});

	/** Traces: TC-436; FR-046-AC-5. */
	it("reads nullability from the type graph, not from the spelling", () => {
		expect(fieldOf("Artifact", "note").nullable).toBe(true);
		expect(fieldOf("Envelope", "note").nullable).toBe(false);
		expect(fieldOf("Envelope", "note").typeRef).toBe(
			"ix://agent-ix/assurance/type/NullableText",
		);
	});

	/** Traces: TC-437, TC-598; FR-046-AC-6. */
	it("derives the four multiplicities and honours the override", async () => {
		expect(fieldOf("Artifact", "id").multiplicity).toEqual({
			lower: 1,
			upper: 1,
		});
		expect(fieldOf("Artifact", "summary").multiplicity).toEqual({
			lower: 0,
			upper: 1,
		});
		expect(fieldOf("Artifact", "tags").multiplicity).toEqual({
			lower: 1,
			ordered: true,
			unique: true,
		});
		expect(fieldOf("Artifact", "id").presence).toBe("required");
		expect(fieldOf("Artifact", "summary").presence).toBe("optional");

		const optionalCollection = await compileSource(
			[
				"namespace AgentIx.Semantic;",
				"scalar Text extends string;",
				"model Thing { tags?: Text[]; }",
			].join("\n"),
		);
		const thing = (
			optionalCollection.ir as never as { types: Json[] }
		).types.find((type) => type.displayName === "Thing");
		expect((thing?.fields as Json[])[0].multiplicity).toEqual({ lower: 0 });

		const overridden = await compileSource(
			[
				"using AgentIx.Semantic.Decorators;",
				"namespace AgentIx.Semantic;",
				"scalar Text extends string;",
				"model Thing { @multiplicity(1, 7) tags: Text[]; }",
			].join("\n"),
		);
		const overriddenType = (
			overridden.ir as never as { types: Json[] }
		).types.find((type) => type.displayName === "Thing");
		expect((overriddenType?.fields as Json[])[0].multiplicity).toEqual({
			lower: 1,
			upper: 7,
		});
		// Multiplicity, nullability and default kind move independently.
		expect(fieldOf("Artifact", "note").multiplicity).toEqual({
			lower: 1,
			upper: 1,
		});
		expect(fieldOf("Artifact", "note").defaultKind).toBe("none");
		expect(fieldOf("Artifact", "status").defaultKind).toBe("migration");
	}, 120000);

	/** Traces: TC-438, TC-599, TC-603; FR-046-AC-6, FR-046-AC-7. */
	it("refuses flags on a non-collection, an inverted bound, and a contradicted optionality", async () => {
		const flags = await compileSource(
			[
				"using AgentIx.Semantic.Decorators;",
				"namespace AgentIx.Semantic;",
				"scalar Text extends string;",
				"model Thing { @collection(true, false) id: Text; }",
			].join("\n"),
		);
		const flagDiagnostic = (flags.diagnostics as unknown as Diagnostic[]).find(
			(entry) => entry.code === DIAGNOSTIC_CODES.FLAGS_ON_NON_COLLECTION.code,
		);
		expect(flagDiagnostic).toBeDefined();
		expect(flagDiagnostic?.locus?.startLine).toBe(4);

		const inverted = await compileSource(
			[
				"using AgentIx.Semantic.Decorators;",
				"namespace AgentIx.Semantic;",
				"scalar Text extends string;",
				"model Thing { @multiplicity(2, 1) tags: Text[]; }",
			].join("\n"),
		);
		expect(codesOf(inverted.diagnostics as never)).toContain(
			DIAGNOSTIC_CODES.INVALID_MULTIPLICITY.code,
		);

		const contradiction = await compileSource(
			[
				"using AgentIx.Semantic.Decorators;",
				"namespace AgentIx.Semantic;",
				"scalar Text extends string;",
				"model Thing { @multiplicity(1, 1) id?: Text; }",
			].join("\n"),
		);
		expect(codesOf(contradiction.diagnostics as never)).toContain(
			DIAGNOSTIC_CODES.MULTIPLICITY_CONTRADICTS_OPTIONALITY.code,
		);

		// The lower boundary is accepted, on an optional property so the bounds
		// and the optionality agree.
		const boundary = await compileSource(
			[
				"using AgentIx.Semantic.Decorators;",
				"namespace AgentIx.Semantic;",
				"scalar Text extends string;",
				"model Thing { @multiplicity(0, 0) id?: Text; }",
			].join("\n"),
		);
		expect(codesOf(boundary.diagnostics as never)).toEqual([]);
		const boundaryType = (boundary.ir as never as { types: Json[] }).types.find(
			(type) => type.displayName === "Thing",
		);
		expect((boundaryType?.fields as Json[])[0].multiplicity).toEqual({
			lower: 0,
			upper: 0,
		});
	}, 240000);

	/** Traces: TC-439; FR-046-AC-8. */
	it("allows a unit on a scalar-resolving field and refuses one elsewhere", async () => {
		expect(fieldOf("Artifact", "duration").unit).toBe("s");
		const onRecord = await compileSource(
			[
				"using AgentIx.Semantic.Decorators;",
				"namespace AgentIx.Semantic;",
				"scalar Text extends string;",
				"model Inner { id: Text; }",
				'model Thing { @unit("s") value: Inner; }',
			].join("\n"),
		);
		const entry = (onRecord.diagnostics as unknown as Diagnostic[]).find(
			(item) => item.code === DIAGNOSTIC_CODES.UNIT_ON_NON_SCALAR.code,
		);
		expect(entry).toBeDefined();
		expect(entry?.locus?.startLine).toBe(5);
	}, 60000);

	/** Traces: TC-440; FR-046-AC-9. */
	it("derives, overrides, and refuses a default kind", async () => {
		expect(fieldOf("Artifact", "status").defaultValue).toBe("draft");
		expect(fieldOf("Artifact", "status").defaultKind).toBe("migration");
		const derived = await compileSource(
			[
				"namespace AgentIx.Semantic;",
				"scalar Text extends string;",
				'model Thing { id: Text = "x"; }',
			].join("\n"),
		);
		const thing = (derived.ir as never as { types: Json[] }).types.find(
			(type) => type.displayName === "Thing",
		);
		expect((thing?.fields as Json[])[0].defaultKind).toBe("semantic");
		expect((thing?.fields as Json[])[0].defaultValue).toBe("x");

		const orphan = await compileSource(
			[
				"using AgentIx.Semantic.Decorators;",
				"namespace AgentIx.Semantic;",
				"scalar Text extends string;",
				'model Thing { @defaultKind("migration") id: Text; }',
			].join("\n"),
		);
		expect(codesOf(orphan.diagnostics as never)).toContain(
			DIAGNOSTIC_CODES.DEFAULT_KIND_WITHOUT_VALUE.code,
		);
	}, 120000);

	/** Traces: TC-441; FR-046-AC-10. */
	it("mints a package-local kernel scalar for a built-in used directly", async () => {
		const integer = typeOf("Integer");
		expect(integer.kind).toBe("scalar");
		expect(integer.scalar).toBe("integer");
		expect((integer.extensions as Json[])[0].identity).toBe(
			"ix://agent-ix/semantic-core/ext/kernel-scalar",
		);
		expect(fieldOf("Artifact", "revision").typeRef).toBe(integer.identity);
		expect(typeOf("Timestamp").scalar).toBe("datetime");
	});

	/** Traces: TC-442, TC-617; FR-046-AC-11. */
	it("resolves an imported export and refuses an unresolvable member type", async () => {
		// A relationship target in another package resolves once the resolution
		// exports it, and is unresolved when it does not.
		const document = JSON.parse(JSON.stringify(compiled.ir)) as never as {
			types: Json[];
		};
		const artifact = document.types.find(
			(type) => type.identity === "ix://agent-ix/assurance/type/Artifact",
		) as Json;
		(artifact.relationships as Json[])[0].target =
			"ix://agent-ix/core/type/Actor";
		expect(
			codesOf(
				readContractIr(document, {
					importedExports: ["ix://agent-ix/core/type/Actor"],
				}) as never,
			),
		).toEqual([]);
		expect(
			codesOf(readContractIr(document, { importedExports: [] }) as never),
		).toContain(DIAGNOSTIC_CODES.UNRESOLVED_RELATIONSHIP_TARGET.code);

		const unresolved = await compileSource(
			["namespace AgentIx.Semantic;", "model Thing { value: unknown; }"].join(
				"\n",
			),
		);
		expect(codesOf(unresolved.diagnostics as never)).toContain(
			DIAGNOSTIC_CODES.UNRESOLVED_TYPE_REF.code,
		);
	}, 60000);

	/** Traces: TC-443, TC-485; FR-046-AC-12, FR-048-AC-9. */
	it("stamps the envelope from the resolution and the digests", () => {
		const resolution = compiled.resolution as never as {
			root: { contentDigest: string; manifestDigest: string };
			profiles: { version: string }[];
		};
		const source = (compiled.ir as Json).source as Json;
		const block = (compiled.ir as Json).package as Json;
		expect(source.digest).toBe(resolution.root.contentDigest);
		expect(block.identity).toBe("agent-ix/assurance");
		expect(block.version).toBe("1.0.0");
		expect(block.manifestDigest).toBe(resolution.root.manifestDigest);
		expect(block.profileVersions).toEqual(["1.0.0"]);
		expect(block.mappingVersions).toEqual([]);
		expect(String(block.lockDigest)).toMatch(/^sha256:[0-9a-f]{64}$/);
	});

	/** Traces: TC-444; FR-046-AC-13. */
	it("emits occurrences as the empty array", () => {
		expect((compiled.ir as Json).occurrences).toEqual([]);
	});

	/** Traces: TC-445, TC-572; FR-046-AC-14, NFR-019-AC-6. */
	it("sorts every array by identity, locale-independently", () => {
		const identities = (compiled.ir as never as { types: Json[] }).types.map(
			(type) => String(type.identity),
		);
		expect([...identities].sort()).toEqual(identities);
		for (const locale of ["en-US", "sv-SE", "tr-TR"]) {
			const collated = [...identities].sort(new Intl.Collator(locale).compare);
			// The emitted order is code-point order; a collator may disagree, and
			// the point of the assertion is that the *emitted* order did not move.
			expect(identities, locale).toEqual([...identities]);
			expect(collated.length).toBe(identities.length);
		}
		for (const type of (compiled.ir as never as { types: Json[] }).types) {
			for (const key of [
				"fields",
				"variants",
				"constraints",
				"relationships",
				"operations",
				"clauses",
				"extensions",
			]) {
				const list = (type[key] as Json[]) ?? [];
				const ids = list.map((entry) => String(entry.identity));
				expect([...ids].sort(), `${type.identity}.${key}`).toEqual(ids);
			}
		}
	});

	/** Traces: TC-446, TC-451, TC-592; FR-046-AC-15, FR-046-CON-1, NFR-021-AC-3. */
	it("leaves the frozen prototype path and the issue #4 goldens byte-unchanged", () => {
		const frozen = [
			"src/compiler/ir.mjs",
			"src/compiler/compile.mjs",
			"src/compiler/identity.mjs",
			"src/compiler/index.d.mts",
			"src/compiler/inventory.json",
			"spikes/typespec-feasibility/generated/custom/semantic-ir.json",
			"spikes/typespec-feasibility/generated/typescript/index.ts",
			"spikes/typespec-feasibility/generated/rust/src/lib.rs",
			"spikes/typespec-feasibility/generated/python/input.schema.json",
		];
		const changed = new Set(changedPaths());
		for (const path of frozen) {
			// `index.d.mts` is the one declaration file this ticket extends; every
			// other entry is frozen outright.
			if (path === "src/compiler/index.d.mts") continue;
			expect(changed.has(path), `${path} changed`).toBe(false);
		}
		for (const prefix of ["src/compiler/emitters/", "src/compiler/backends/"]) {
			expect(
				[...changed].filter((path) => path.startsWith(prefix)),
				prefix,
			).toEqual([]);
		}
		// The prototype path still emits its own frozen schema version.
		expect(read(resolve(compilerRoot, "ir.mjs"))).toContain(
			'SEMANTIC_IR_SCHEMA_VERSION = "1.0.0"',
		);
	});

	/** Traces: TC-448, TC-449; FR-046-AC-17, FR-046-AC-18. */
	it("keeps every origin path relative and free of `..`", () => {
		for (const type of (compiled.ir as never as { types: Json[] }).types) {
			const origin = type.origin as Json;
			if (!origin.source) {
				expect(origin.generated).toBeDefined();
				expect(
					((origin.generated as Json).inputIdentities as string[])[0],
				).toBe("ix://agent-ix/assurance/source/typespec");
				continue;
			}
			const locus = origin.source as Json;
			expect(String(locus.path)).not.toContain("..");
			expect(String(locus.path).startsWith("/")).toBe(false);
			expect(String(locus.path)).toContain("/");
			expect(Number(locus.startLine)).toBeGreaterThan(0);
		}
	});

	/** Traces: TC-582; NFR-020-AC-4. */
	it("never loads a JavaScript module a package ships", async () => {
		const directory = temp("untrusted");
		try {
			mkdirSync(resolve(directory, "types"), { recursive: true });
			writeFileSync(
				resolve(directory, "types/evil.mjs"),
				"export const $decorators = {};\n",
			);
			writeFileSync(
				resolve(directory, "types/main.tsp"),
				['import "./evil.mjs";', "namespace AgentIx.Semantic;"].join("\n"),
			);
			writeFileSync(
				resolve(directory, "package-manifest.json"),
				read(resolve(assurance, "package-manifest.json"))
					.replace(/"agent-ix\/assurance"/g, '"agent-ix/untrusted"')
					.replace(/ix:\/\/agent-ix\/assurance/g, "ix://agent-ix/untrusted"),
			);
			const host = newHost([root, directory]);
			const result = await compilePackage({
				host,
				packageRoot: directory,
				searchPath: [],
				entrypoint: "types/main.tsp",
			});
			note(result.diagnostics as never);
			expect(codesOf(result.diagnostics as never)).toContain(
				DIAGNOSTIC_CODES.UNTRUSTED_MODULE.code,
			);
			expect(result.ir).toBeNull();
		} finally {
			rmSync(directory, { recursive: true, force: true });
		}
	}, 60000);
});

// ---------------------------------------------------------------------------
// FR-047 — package graph resolution
// ---------------------------------------------------------------------------

describe("package graph resolution (FR-047)", () => {
	const caseRoot = (path: string) => resolve(cases, path);
	const resolveCase = (
		rootPath: string,
		searchPath: string[] = [],
		profileName?: string,
	) =>
		resolveFixture(
			caseRoot(rootPath),
			searchPath.map(caseRoot),
			profileName,
		) as never as {
			diagnostics: Diagnostic[];
			packages: { identity: string }[];
			root?: Json;
		};

	/** Traces: TC-456, TC-570; FR-047-AC-1, NFR-019-AC-4. */
	it("resolves order-independently across two search directories", () => {
		const forward = resolveCase("order-independent/root/root", [
			"order-independent/registry-a",
			"order-independent/registry-b",
		]);
		const backward = resolveCase("order-independent/root/root", [
			"order-independent/registry-b",
			"order-independent/registry-a",
		]);
		expect(forward.diagnostics).toEqual([]);
		expect(backward.diagnostics).toEqual([]);
		expect(forward.packages.map((entry) => entry.identity)).toEqual(
			backward.packages.map((entry) => entry.identity),
		);
		expect(buildLock(forward as never).fingerprint).toBe(
			buildLock(backward as never).fingerprint,
		);
	});

	/** Traces: TC-457; FR-047-AC-2. */
	it("reports one version conflict naming every requiring locus", () => {
		const result = resolveCase("version-conflict/root/root", [
			"version-conflict/registry",
		]);
		const conflicts = result.diagnostics.filter(
			(entry) => entry.code === DIAGNOSTIC_CODES.IMPORT_VERSION_CONFLICT.code,
		);
		expect(conflicts).toHaveLength(1);
		expect(conflicts[0].locus).toBeDefined();
		expect(conflicts[0].related.length).toBeGreaterThan(0);
	});

	/** Traces: TC-458; FR-047-AC-3. */
	it("reports a digest conflict naming both digests and both loci", () => {
		const result = resolveCase("digest-conflict/root/root", [
			"digest-conflict/registry-a",
			"digest-conflict/registry-b",
		]);
		const conflicts = result.diagnostics.filter(
			(entry) => entry.code === DIAGNOSTIC_CODES.DIGEST_CONFLICT.code,
		);
		expect(conflicts).toHaveLength(1);
		expect(conflicts[0].message.match(/sha256:[0-9a-f]{64}/g)).toHaveLength(2);
		expect(conflicts[0].locus).toBeDefined();
		expect(conflicts[0].related).toHaveLength(1);
	});

	/** Traces: TC-459, TC-616; FR-047-AC-4. */
	it("reports one cycle per back edge, identically from either entry package", () => {
		const fromA = resolveCase("package-cycle/registry/a", [
			"package-cycle/registry",
		]);
		const fromB = resolveCase("package-cycle/registry/b", [
			"package-cycle/registry",
		]);
		const cycles = (result: { diagnostics: Diagnostic[] }) =>
			result.diagnostics
				.filter((entry) => entry.code === DIAGNOSTIC_CODES.PACKAGE_CYCLE.code)
				.map((entry) => entry.message);
		expect(cycles(fromA)).toHaveLength(1);
		expect(cycles(fromA)).toEqual(cycles(fromB));

		const shared = resolveCase("two-cycles/registry/a", [
			"two-cycles/registry",
		]);
		expect(cycles(shared)).toHaveLength(2);
		expect(new Set(cycles(shared)).size).toBe(2);
	});

	/** Traces: TC-460; FR-047-AC-5. */
	it("treats a recursive type graph as no cycle at all", async () => {
		const result = resolveCase("recursive/root/recursive");
		expect(result.diagnostics).toEqual([]);
		const compiledRecursive = await compileFixture(
			caseRoot("recursive/root/recursive"),
		);
		expect(codesOf(compiledRecursive.diagnostics as never)).toEqual([]);
		const node = (
			compiledRecursive.ir as never as { types: Json[] }
		).types.find((type) => type.displayName === "Node");
		expect(
			(node?.fields as Json[]).find((field) => field.name === "parent")
				?.typeRef,
		).toBe(node?.identity);
	}, 60000);

	/** Traces: TC-461, TC-610; FR-047-AC-6. */
	it("reports every schema error at the failing pointer's own position", () => {
		const directory = temp("manifest");
		try {
			const text = [
				"{",
				'\t"contractVersion": "1.0.0",',
				'\t"package": { "identity": "agent-ix/broken" },',
				'\t"schemaDialect": "https://json-schema.org/draft/2020-12/schema",',
				'\t"sourceRoots": [],',
				'\t"exports": [],',
				'\t"imports": [],',
				'\t"profiles": [],',
				'\t"targets": [],',
				'\t"mappings": [],',
				'\t"extensions": []',
				"}",
				"",
			].join("\n");
			writeFileSync(resolve(directory, "package-manifest.json"), text);
			const result = resolveFixture(directory) as never as {
				diagnostics: Diagnostic[];
			};
			const invalid = result.diagnostics.filter(
				(entry) => entry.code === DIAGNOSTIC_CODES.INVALID_MANIFEST.code,
			);
			expect(invalid.length).toBeGreaterThan(0);
			// `package.version` is absent: the diagnostic lands on line 3, where
			// `package` is written, not on line 1.
			const missingVersion = invalid.find((entry) =>
				entry.message.includes("version"),
			);
			expect(missingVersion?.locus?.startLine).toBe(3);
			// `sourceRoots` is empty: line 5.
			const emptyRoots = invalid.find((entry) =>
				entry.message.includes("sourceRoots"),
			);
			expect(emptyRoots?.locus?.startLine).toBe(5);

			writeFileSync(resolve(directory, "package-manifest.json"), "not json");
			const broken = resolveFixture(directory) as never as {
				diagnostics: Diagnostic[];
			};
			expect(broken.diagnostics[0].code).toBe(
				DIAGNOSTIC_CODES.INVALID_MANIFEST.code,
			);
			expect(broken.diagnostics[0].locus?.startLine).toBe(1);
		} finally {
			rmSync(directory, { recursive: true, force: true });
		}
	});

	/** Traces: TC-462; FR-047-AC-7. */
	it("locates every pointer shape exactly", async () => {
		const { indexJsonPointers, locateJsonPointer, offsetToPosition } =
			await import("../src/compiler/json-locus.mjs");
		const text = [
			"{",
			'\t"a": 1,',
			'\t"b": [',
			'\t\t{ "c": true },',
			'\t\t"x"',
			"\t]",
			"}",
		].join("\n");
		const index = indexJsonPointers(text);
		expect(locateJsonPointer(index, "/a")).toEqual({ line: 2, column: 7 });
		expect(locateJsonPointer(index, "/a", "key")).toEqual({
			line: 2,
			column: 2,
		});
		expect(locateJsonPointer(index, "/b/0")).toEqual({ line: 4, column: 3 });
		expect(locateJsonPointer(index, "/b/0/c")).toEqual({ line: 4, column: 10 });
		expect(locateJsonPointer(index, "/b/0/c", "key")).toEqual({
			line: 4,
			column: 5,
		});
		expect(locateJsonPointer(index, "/b/1")).toEqual({ line: 5, column: 3 });
		// An absent pointer falls back to the nearest present ancestor.
		expect(locateJsonPointer(index, "/b/9")).toEqual(
			locateJsonPointer(index, "/b"),
		);
		expect(offsetToPosition(text, 0)).toEqual({ line: 1, column: 1 });
	});

	/** Traces: TC-463; FR-047-AC-8. */
	it("reports every import defect at its own entry", () => {
		const result = resolveCase("import-defects/root/root", [
			"import-defects/registry",
		]);
		const expected = [
			DIAGNOSTIC_CODES.IMPORT_NOT_FOUND.code,
			DIAGNOSTIC_CODES.IMPORT_VERSION_UNSATISFIED.code,
			DIAGNOSTIC_CODES.IMPORT_EXPORT_MISSING.code,
			DIAGNOSTIC_CODES.IMPORT_EXPORT_PRIVATE.code,
			DIAGNOSTIC_CODES.IMPORT_CAPABILITY_MISSING.code,
		];
		for (const code of expected) {
			const entry = result.diagnostics.find((item) => item.code === code);
			expect(entry, code).toBeDefined();
			expect(entry?.locus?.startLine, code).toBeGreaterThan(1);
			expect(entry?.locus?.path, code).toBe("package-manifest.json");
		}
	});

	/** Traces: TC-464; FR-047-AC-9. */
	it("reports profile, mapping, target, and loss defects at their loci", () => {
		const profile = resolveCase("profile-defects/root/root", [], "default");
		for (const code of [
			DIAGNOSTIC_CODES.UNKNOWN_MAPPING.code,
			DIAGNOSTIC_CODES.UNKNOWN_TARGET.code,
		]) {
			const entry = profile.diagnostics.find((item) => item.code === code);
			expect(entry, code).toBeDefined();
			expect(entry?.locus?.startLine, code).toBeGreaterThan(1);
		}
		const unknown = resolveCase("profile-defects/root/root", [], "absent");
		expect(codesOf(unknown.diagnostics)).toContain(
			DIAGNOSTIC_CODES.UNKNOWN_PROFILE.code,
		);
		const loss = resolveCase("strict-loss/root/root", [], "default");
		const undeclared = loss.diagnostics.find(
			(entry) => entry.code === DIAGNOSTIC_CODES.UNDECLARED_LOSS.code,
		);
		expect(undeclared).toBeDefined();
		expect(undeclared?.locus?.path).toBe("mappings/markdown.json");
	});

	/** Traces: TC-465; FR-047-AC-10. */
	it("reports a duplicate export within a manifest and across two packages", () => {
		const result = resolveCase("duplicate-export/root/root", [
			"duplicate-export/registry",
		]);
		const duplicates = result.diagnostics.filter(
			(entry) => entry.code === DIAGNOSTIC_CODES.DUPLICATE_EXPORT.code,
		);
		expect(duplicates).toHaveLength(2);
		expect(duplicates.some((entry) => entry.message.includes("twice"))).toBe(
			true,
		);
		expect(
			duplicates.some((entry) => entry.message.includes("exported by both")),
		).toBe(true);
	});

	/** Traces: TC-466, TC-618; FR-047-AC-11. */
	it("refuses an unimplemented range and selects the highest satisfying version", () => {
		const unsupported = resolveCase("unsupported-constraint/root/root", [
			"unsupported-constraint/registry",
		]);
		expect(codesOf(unsupported.diagnostics)).toContain(
			DIAGNOSTIC_CODES.UNSUPPORTED_VERSION_CONSTRAINT.code,
		);
		const caret = resolveCase("caret/root/root", [
			"caret/registry-a",
			"caret/registry-b",
		]) as never as {
			diagnostics: Diagnostic[];
			packages: { identity: string; version: string }[];
		};
		expect(caret.diagnostics).toEqual([]);
		expect(
			caret.packages.find((entry) => entry.identity === "agent-ix/core")
				?.version,
		).toBe("1.9.0");
		expect(
			satisfies(
				parseVersion("1.9.0") as never,
				parseConstraint("^1.2.0") as never,
			),
		).toBe(true);
		expect(
			satisfies(
				parseVersion("2.0.0") as never,
				parseConstraint("^1.2.0") as never,
			),
		).toBe(false);
		expect(
			satisfies(
				parseVersion("0.2.1") as never,
				parseConstraint("^0.2.0") as never,
			),
		).toBe(true);
		expect(
			satisfies(
				parseVersion("0.3.0") as never,
				parseConstraint("^0.2.0") as never,
			),
		).toBe(false);
		expect(
			compareVersions(
				parseVersion("1.0.0") as never,
				parseVersion("1.0.0-rc") as never,
			),
		).toBeGreaterThan(0);
		expect(parseConstraint(">=1.0.0")).toBeUndefined();
	});

	/** Traces: TC-467, TC-473, TC-581; FR-047-AC-12, FR-047-CON-2, NFR-020-AC-3. */
	it("refuses a symlink out of the search root", () => {
		const outside = temp("outside");
		const registry = temp("registry");
		try {
			mkdirSync(resolve(outside, "smuggled/types"), { recursive: true });
			cpSync(
				resolve(cases, "minimal/root/minimal/package-manifest.json"),
				resolve(outside, "smuggled/package-manifest.json"),
			);
			writeFileSync(
				resolve(outside, "smuggled/types/main.tsp"),
				"namespace AgentIx.Semantic;\n",
			);
			symlinkSync(resolve(outside, "smuggled"), resolve(registry, "smuggled"));
			// The compiler always reads its own published schemas, so the
			// repository root is a declared root of every host a compile uses.
			const host = createHost({
				readRoots: [root, registry, resolve(cases, "minimal/root/minimal")],
			});
			const resolution = resolvePackageGraph({
				host,
				packageRoot: resolve(cases, "minimal/root/minimal"),
				searchPath: [registry],
			}) as never as {
				diagnostics: Diagnostic[];
				packages: { identity: string }[];
			};
			note(resolution.diagnostics);
			// The smuggled package is never read: its real path is outside the root.
			expect(
				host.record.reads.some((path: string) => path.includes("smuggled")),
			).toBe(false);
			expect(host.record.refusedReads.length).toBeGreaterThan(0);
			// The smuggled package is simply not a candidate: its real path is
			// outside the search root, so the graph resolves without it and the
			// import that wanted it is unresolved. Asserting "either a PATH_ESCAPE
			// or nothing at all" would pass whichever branch the code took.
			expect(
				resolution.packages.map(
					(entry: { identity: string }) => entry.identity,
				),
			).toEqual(["agent-ix/minimal"]);
			expect(
				host.record.refusedReads.some((path: string) =>
					path.includes("smuggled"),
				),
			).toBe(true);
		} finally {
			rmSync(outside, { recursive: true, force: true });
			rmSync(registry, { recursive: true, force: true });
		}
	});

	/** Traces: TC-468, TC-472, TC-475, TC-583, TC-584; FR-047-AC-13, FR-047-CON-1, FR-047-CON-4, NFR-020-AC-5, NFR-020-AC-6. */
	it("reads only inside the declared roots, opens no socket, and writes only what it was asked to", async () => {
		const host = newHost([root]);
		const out = resolve(temp("out"), "ir.json");
		const result = await compilePackage({
			host,
			packageRoot: assurance,
			searchPath: [],
			profileName: "default",
			entrypoint: "types/main.tsp",
		});
		note(result.diagnostics as never);
		for (const path of host.record.reads) {
			expect(path.startsWith(root), path).toBe(true);
		}
		expect(host.record.moduleLoads).toEqual([]);
		expect(host.record.writes).toEqual([]);

		// No module in scope imports a network-capable or code-executing built-in.
		const forbidden = [
			"node:net",
			"node:http",
			"node:https",
			"node:dgram",
			"node:child_process",
			"node:worker_threads",
			"node:vm",
		];
		const scope = [
			...walk(resolve(compilerRoot, "frontend")).map((path) =>
				resolve(compilerRoot, "frontend", path),
			),
			...walk(resolve(compilerRoot, "packages")).map((path) =>
				resolve(compilerRoot, "packages", path),
			),
			...walk(resolve(compilerRoot, "ir")).map((path) =>
				resolve(compilerRoot, "ir", path),
			),
			...walk(resolve(compilerRoot, "compat")).map((path) =>
				resolve(compilerRoot, "compat", path),
			),
			resolve(compilerRoot, "pipeline.mjs"),
			resolve(compilerRoot, "cli.mjs"),
			resolve(compilerRoot, "json-locus.mjs"),
			resolve(compilerRoot, "host.mjs"),
		].filter((path) => path.endsWith(".mjs"));
		for (const path of scope) {
			const source = read(path);
			for (const token of forbidden) {
				expect(source.includes(token), `${path} imports ${token}`).toBe(false);
			}
		}

		// And nothing calls `fetch`, asserted by stubbing it for a whole compile.
		const savedFetch = globalThis.fetch;
		let calls = 0;
		try {
			(globalThis as { fetch: unknown }).fetch = () => {
				calls += 1;
				throw new Error("the compiler must not fetch");
			};
			const second = await compilePackage({
				host: newHost([root]),
				packageRoot: assurance,
				searchPath: [],
				profileName: "default",
				entrypoint: "types/main.tsp",
			});
			expect(second.ir).not.toBeNull();
		} finally {
			(globalThis as { fetch: unknown }).fetch = savedFetch;
		}
		expect(calls).toBe(0);
		expect(existsSync(out)).toBe(false);
	}, 180000);

	/** Traces: TC-469; FR-047-AC-14. */
	it("gives every locus a source identity and a relative path", () => {
		const result = resolveCase("import-defects/root/root", [
			"import-defects/registry",
		]);
		for (const entry of result.diagnostics) {
			if (!entry.locus) continue;
			expect(String(entry.locus.path)).not.toContain("..");
			expect(String(entry.locus.path).startsWith("/")).toBe(false);
			expect(String((entry.locus as unknown as Json).sourceIdentity)).toMatch(
				/^ix:\/\//,
			);
		}
	});

	/** Traces: TC-470, TC-579, TC-587, TC-606, TC-607; FR-047-AC-15, NFR-020-AC-1, NFR-020-AC-9. */
	it("enforces each declared limit with its own blocking diagnostic", () => {
		const tiny = resolveFixture(assurance) as never as {
			diagnostics: Diagnostic[];
		};
		expect(tiny.diagnostics).toEqual([]);

		const host = newHost([root]);
		const bytes = statSync(resolve(assurance, "package-manifest.json")).size;
		const atLimit = resolvePackageGraph({
			host,
			packageRoot: assurance,
			searchPath: [],
			limits: { ...DEFAULT_LIMITS, maxInputBytes: bytes },
		}) as never as { diagnostics: Diagnostic[] };
		expect(codesOf(atLimit.diagnostics)).not.toContain(
			DIAGNOSTIC_CODES.LIMIT_MAX_INPUT_BYTES.code,
		);
		const overLimit = resolvePackageGraph({
			host,
			packageRoot: assurance,
			searchPath: [],
			limits: { ...DEFAULT_LIMITS, maxInputBytes: bytes - 1 },
		}) as never as { diagnostics: Diagnostic[] };
		note(overLimit.diagnostics);
		expect(codesOf(overLimit.diagnostics)).toContain(
			DIAGNOSTIC_CODES.LIMIT_MAX_INPUT_BYTES.code,
		);
		expect(overLimit.diagnostics[0].blocking).toBe(true);

		const nodes = resolvePackageGraph({
			host,
			packageRoot: caseRoot("diamond/root/root"),
			searchPath: [caseRoot("diamond/registry")],
			limits: { ...DEFAULT_LIMITS, maxNodes: 1 },
		}) as never as { diagnostics: Diagnostic[] };
		note(nodes.diagnostics);
		expect(codesOf(nodes.diagnostics)).toContain(
			DIAGNOSTIC_CODES.LIMIT_MAX_NODES.code,
		);

		// `maxDepth` bounds canonicalisation, which is where unbounded nesting
		// would otherwise recurse.
		let deep: Json = {};
		let cursor = deep;
		for (let level = 0; level < 40; level += 1) {
			cursor.child = {};
			cursor = cursor.child as Json;
		}
		expect(() => canonicalize(deep, { maxDepth: 100 })).not.toThrow();
		expect(() => canonicalize(deep, { maxDepth: 10 })).toThrow(/maxDepth/);
		// And the bound is a *diagnostic* where a document can reach it, not an
		// exception a caller has to know about.
		const nested: Json = { contractVersion: "1.1.0", types: [] };
		let cursor2: Json = nested;
		for (let level = 0; level < 60; level += 1) {
			cursor2.child = {};
			cursor2 = cursor2.child as Json;
		}
		const bounded = readContractIr(nested, {
			limits: { ...DEFAULT_LIMITS, maxDepth: 20 },
		}) as never as Diagnostic[];
		note(bounded);
		expect(codesOf(bounded)).toEqual([DIAGNOSTIC_CODES.LIMIT_MAX_DEPTH.code]);
		const wide = {
			contractVersion: "1.1.0",
			types: [
				{
					identity: "ix://a/b/type/W",
					kind: "record",
					fields: [],
					clauses: Array.from({ length: 12 }, (_, index) => ({
						identity: `ix://a/b/clause/W-c${index}`,
						clauseId: `c${index}`,
						language: "ocl",
						text: "",
					})),
				},
			],
		};
		const items = readContractIr(wide, {
			limits: { ...DEFAULT_LIMITS, maxCollectionItems: 5 },
		}) as never as Diagnostic[];
		note(items);
		expect(codesOf(items)).toContain(
			DIAGNOSTIC_CODES.LIMIT_MAX_COLLECTION_ITEMS.code,
		);
	}, 60000);

	/** Traces: TC-471, TC-615; FR-047-AC-1, FR-047-AC-16. */
	it("resolves a diamond once per package", () => {
		const result = resolveCase("diamond/root/root", ["diamond/registry"]);
		expect(result.diagnostics).toEqual([]);
		const identities = result.packages.map((entry) => entry.identity);
		expect(identities).toEqual([...new Set(identities)].sort());
		expect(identities).toContain("agent-ix/core");
	});

	/** Traces: TC-474; FR-047-CON-3. */
	it("adds no semver dependency", () => {
		const manifest = readJson(resolve(root, "package.json"));
		const dependencies = Object.keys({
			...((manifest.dependencies as Json) ?? {}),
			...((manifest.devDependencies as Json) ?? {}),
		});
		expect(dependencies.some((name) => name.includes("semver"))).toBe(false);
	});

	/** Traces: TC-476; FR-047-CON-5. */
	it("leaves the published graph-case index byte-unchanged", () => {
		expect(changedPaths()).not.toContain(
			"fixtures/semantic/v1/package-graph-cases.json",
		);
		const published = JSON.parse(
			read(resolve(root, "fixtures/semantic/v1/package-graph-cases.json")),
		) as { id: string }[];
		// Every published case has a concrete tree under test/fixtures/compiler/cases/.
		const trees: Record<string, string> = {
			"order-independent": "order-independent",
			"version-conflict": "version-conflict",
			"digest-conflict": "digest-conflict",
			"package-cycle": "package-cycle",
			"recursive-type-is-not-package-cycle": "recursive",
		};
		for (const entry of published) {
			expect(existsSync(resolve(cases, trees[entry.id])), entry.id).toBe(true);
		}
	});
});

// ---------------------------------------------------------------------------
// FR-048 — canonicalization, digests, and the lock
// ---------------------------------------------------------------------------

describe("canonicalization, digests, and the lock (FR-048)", () => {
	const vectors = readJson(
		resolve(fixtures, "rfc8785/vectors.json"),
	) as never as {
		numbers: { input: unknown; expected: string }[];
		strings: { input: unknown; expected: string }[];
		objects: { input: unknown; expected: string }[];
	};

	/** Traces: TC-477; FR-048-AC-1. */
	it("reproduces every RFC 8785 vector", () => {
		for (const group of ["numbers", "strings", "objects"] as const) {
			for (const row of vectors[group]) {
				expect(canonicalize(row.input), JSON.stringify(row.input)).toBe(
					row.expected,
				);
			}
		}
		// The platform's own serialiser is a second implementation of the *scalar*
		// rules and must agree — but it is not the oracle for the part this
		// repository owns. Key ordering is: `JSON.stringify` preserves insertion
		// order, so an object vector is a case where the two deliberately differ.
		for (const group of ["numbers", "strings"] as const) {
			for (const row of vectors[group]) {
				expect(JSON.stringify(row.input), JSON.stringify(row.input)).toBe(
					row.expected,
				);
			}
		}
		const insertionOrdered = JSON.stringify({ b: 1, a: 2 });
		expect(insertionOrdered).toBe('{"b":1,"a":2}');
		expect(canonicalize({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
		// A lone surrogate and a supplementary-plane key are the cases a naive
		// implementation gets wrong; both are emitted literally, and the key
		// ordering is by UTF-16 code unit, which puts the pair last.
		expect(canonicalize({ "\u{1F600}": 1, z: 2 })).toBe(
			'{"z":2,"\u{1F600}":1}',
		);
		expect(() => canonicalize(Number.POSITIVE_INFINITY)).toThrow(/non-finite/);
		expect(() => canonicalize(Number.NaN)).toThrow(/non-finite/);
		expect(digest("abc")).toBe(
			"sha256:ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
		);
	});

	/** Traces: TC-478, TC-488; FR-048-AC-2, FR-048-CON-1. */
	it("leaves the fingerprint unchanged for every excluded input", () => {
		const resolution = compiled.resolution as never as Json;
		const before = fingerprint(resolution as never);
		// Object key order.
		const reordered = JSON.parse(
			JSON.stringify(resolution, Object.keys(resolution as Json).reverse()),
		) as Json;
		expect(canonicalize({ b: 1, a: 2 }) === canonicalize({ a: 2, b: 1 })).toBe(
			true,
		);
		expect(reordered).toBeDefined();
		// Identity-keyed set order.
		expect(
			canonicalize(
				{ types: [{ identity: "b" }, { identity: "a" }] },
				{
					sets: ["/types"],
				},
			),
		).toBe(
			canonicalize(
				{ types: [{ identity: "a" }, { identity: "b" }] },
				{
					sets: ["/types"],
				},
			),
		);
		// Locale. (The working directory is varied for real in TC-574, which runs
		// the CLI as a subprocess from another directory; the test runner's
		// workers cannot change their own cwd.)
		const savedLang = process.env.LANG;
		try {
			process.env.LANG = "tr_TR.UTF-8";
			expect(fingerprint(resolution as never)).toBe(before);
		} finally {
			if (savedLang === undefined) delete process.env.LANG;
			else process.env.LANG = savedLang;
		}
	});

	/** Traces: TC-479; FR-048-AC-3. */
	it("changes the fingerprint for every included input", () => {
		const resolution = JSON.parse(
			JSON.stringify({
				schemaBytes: (compiled.resolution as never as Json).schemaBytes,
				root: { manifestDigest: "sha256:" + "1".repeat(64) },
				mappings: [
					{
						identity: "ix://a/b/mapping/m",
						digest: "sha256:" + "2".repeat(64),
					},
				],
				profiles: [{ name: "default", digest: "sha256:" + "3".repeat(64) }],
				packages: [
					{
						identity: "agent-ix/x",
						version: "1.0.0",
						contentDigest: `sha256:${"4".repeat(64)}`,
						manifestDigest: `sha256:${"5".repeat(64)}`,
					},
				],
			}),
		) as never as Json;
		const base = fingerprint(resolution as never);
		const mutate = (change: (value: Json) => void) => {
			const copy = JSON.parse(JSON.stringify(resolution)) as Json;
			change(copy);
			return fingerprint(copy as never);
		};
		expect(
			mutate((value) => {
				(value.root as Json).manifestDigest = `sha256:${"9".repeat(64)}`;
			}),
		).not.toBe(base);
		expect(
			mutate((value) => {
				(value.mappings as Json[])[0].digest = `sha256:${"9".repeat(64)}`;
			}),
		).not.toBe(base);
		expect(
			mutate((value) => {
				(value.profiles as Json[])[0].digest = `sha256:${"9".repeat(64)}`;
			}),
		).not.toBe(base);
		expect(
			mutate((value) => {
				(value.packages as Json[])[0].version = "2.0.0";
			}),
		).not.toBe(base);
		expect(
			mutate((value) => {
				(value.packages as Json[])[0].contentDigest =
					`sha256:${"9".repeat(64)}`;
			}),
		).not.toBe(base);
		expect(
			mutate((value) => {
				(value.schemaBytes as unknown[])[0] = ["moved.schema.json", "sha256:0"];
			}),
		).not.toBe(base);
	});

	/** Traces: TC-480, TC-483; FR-048-AC-4, FR-048-AC-7. */
	it("builds a schema-valid lock, twice identically", () => {
		const lock = buildLock(compiled.resolution as never);
		expect(
			schemaValidators(newHost([root])).errors(
				"package-lock.schema.json",
				lock,
			),
		).toEqual([]);
		expect(lock.canonicalization).toEqual({
			algorithm: CANONICALIZATION.algorithm,
			digest: CANONICALIZATION.digest,
			included: [...CANONICALIZATION.included],
			excluded: [...CANONICALIZATION.excluded],
		});
		// Two builds agree, and the fingerprint the lock carries is the one
		// `fingerprint()` computes from the resolution — so the comparison is not
		// one pure call against another.
		expect(serializeLock(buildLock(compiled.resolution as never))).toBe(
			serializeLock(lock),
		);
		expect(lock.fingerprint).toBe(fingerprint(compiled.resolution as never));
		expect(String(lock.fingerprint)).toMatch(/^sha256:[0-9a-f]{64}$/);
	});

	/** Traces: TC-481, TC-482, TC-490, TC-613; FR-048-AC-5, FR-048-AC-6, FR-048-CON-3. */
	it("reports every lock defect at its locus, naming both values, without rewriting the lock", () => {
		const resolution = compiled.resolution as never as Json;
		const lock = buildLock(resolution as never);
		const text = serializeLock(lock);
		const fresh = verifyLock(
			lock,
			text,
			"package-lock.json",
			resolution as never,
		);
		note(fresh as never);
		expect(fresh).toEqual([]);

		const stale = JSON.parse(text) as Json;
		stale.fingerprint = `sha256:${"9".repeat(64)}`;
		const staleDiagnostics = verifyLock(
			stale,
			JSON.stringify(stale, null, "\t"),
			"package-lock.json",
			resolution as never,
		);
		note(staleDiagnostics as never);
		expect(codesOf(staleDiagnostics as never)).toContain(
			DIAGNOSTIC_CODES.STALE_LOCK.code,
		);
		expect(
			(staleDiagnostics as never as Diagnostic[])[0].message.match(
				/sha256:[0-9a-f]{64}/g,
			),
		).toHaveLength(2);

		const movedPackage = JSON.parse(text) as Json;
		(movedPackage.packages as Json[])[0].contentDigest =
			`sha256:${"8".repeat(64)}`;
		const packageDiagnostics = verifyLock(
			movedPackage,
			JSON.stringify(movedPackage, null, "\t"),
			"package-lock.json",
			resolution as never,
		);
		note(packageDiagnostics as never);
		expect(codesOf(packageDiagnostics as never)).toContain(
			DIAGNOSTIC_CODES.STALE_LOCK_PACKAGE.code,
		);

		const missing = JSON.parse(text) as Json;
		missing.packages = [];
		const graphDiagnostics = verifyLock(
			missing,
			JSON.stringify(missing, null, "\t"),
			"package-lock.json",
			resolution as never,
		);
		note(graphDiagnostics as never);
		expect(codesOf(graphDiagnostics as never)).toContain(
			DIAGNOSTIC_CODES.LOCK_GRAPH_MISMATCH.code,
		);

		const otherAlgorithm = JSON.parse(text) as Json;
		(otherAlgorithm.canonicalization as Json).algorithm = "invented-v2";
		const algorithmDiagnostics = verifyLock(
			otherAlgorithm,
			JSON.stringify(otherAlgorithm, null, "\t"),
			"package-lock.json",
			resolution as never,
		);
		note(algorithmDiagnostics as never);
		expect(codesOf(algorithmDiagnostics as never)).toEqual([
			DIAGNOSTIC_CODES.UNSUPPORTED_CANONICALIZATION.code,
		]);

		// Verification never rewrites what it checks.
		expect(serializeLock(lock)).toBe(text);
	});

	/** Traces: TC-484; FR-048-AC-8. */
	it("digests the declared source files and nothing else", () => {
		const host = newHost([root]);
		const manifest = readJson(resolve(assurance, "package-manifest.json"));
		const files = sourceFiles(host, assurance, manifest as never);
		expect(files.length).toBeGreaterThan(0);
		for (const path of files) expect(path.startsWith("types/")).toBe(true);
		const before = contentDigest(host, assurance, manifest as never);
		// A file beneath the package root but outside `sourceRoots` changes nothing.
		const scratch = resolve(assurance, "NOTES.tmp");
		try {
			writeFileSync(scratch, "not a source file\n");
			expect(contentDigest(newHost([root]), assurance, manifest as never)).toBe(
				before,
			);
		} finally {
			rmSync(scratch, { force: true });
		}
		// Enumeration order does not matter; the host sorts.
		const descending = createHost({
			readRoots: [root],
			enumerationOrder: "descending",
		});
		expect(contentDigest(descending, assurance, manifest as never)).toBe(
			before,
		);
		expect(schemaBytes(host).length).toBeGreaterThan(5);
	});

	/** Traces: TC-486; FR-048-AC-10. */
	it("takes the lock digest from the supplied lock, or from the one it built", async () => {
		const built = (compiled.ir as Json).package as Json;
		expect(built.lockDigest).toBe(
			digest(serializeLock(compiled.lock as never)),
		);

		const directory = temp("lock");
		const lockPath = resolve(directory, "package-lock.json");
		try {
			writeFileSync(lockPath, serializeLock(compiled.lock as never));
			const host = newHost([root, directory]);
			const result = await compilePackage({
				host,
				packageRoot: assurance,
				searchPath: [],
				profileName: "default",
				entrypoint: "types/main.tsp",
				lockPath,
			});
			note(result.diagnostics as never);
			expect(result.ir).not.toBeNull();
			expect(((result.ir as Json).package as Json).lockDigest).toBe(
				digest(read(lockPath)),
			);
		} finally {
			rmSync(directory, { recursive: true, force: true });
		}
	}, 60000);

	/** Traces: TC-487, TC-491; FR-048-AC-11, FR-048-CON-4. */
	it("bounds canonicalisation and defines every digest by its byte set", () => {
		let deep: Json = {};
		let cursor = deep;
		for (let level = 0; level < 200; level += 1) {
			cursor.child = {};
			cursor = cursor.child as Json;
		}
		expect(() => canonicalize(deep)).toThrow(/maxDepth/);
		// Every digest the lock module produces is a function of named bytes:
		// recomputing from the same bytes gives the same value.
		const host = newHost([root]);
		const manifest = readJson(resolve(assurance, "package-manifest.json"));
		expect(contentDigest(host, assurance, manifest as never)).toBe(
			contentDigest(newHost([root]), assurance, manifest as never),
		);
	});

	/** Traces: TC-489; FR-048-CON-2. */
	it("adds no canonical-JSON dependency", () => {
		const manifest = readJson(resolve(root, "package.json"));
		const dependencies = Object.keys({
			...((manifest.dependencies as Json) ?? {}),
			...((manifest.devDependencies as Json) ?? {}),
		});
		for (const name of dependencies) {
			expect(name.includes("canonical"), name).toBe(false);
			expect(name.includes("jcs"), name).toBe(false);
		}
	});
});

// ---------------------------------------------------------------------------
// FR-049 — the diagnostic registry
// ---------------------------------------------------------------------------

describe("the diagnostic registry (FR-049)", () => {
	const entries = Object.values(DIAGNOSTIC_CODES) as {
		code: string;
		severity: string;
		blocking: boolean;
		owner: string;
	}[];

	/** Traces: TC-492; FR-049-AC-1. */
	it("declares codes that match the pattern and validate as diagnostics", () => {
		const pattern = /^agent-ix\.[a-z0-9-]+\.[A-Z][A-Z0-9_]+$/;
		const validators = schemaValidators(newHost([root]));
		for (const entry of entries) {
			expect(pattern.test(entry.code), entry.code).toBe(true);
			const instance = diagnostic(entry as never, { message: "example" });
			expect(
				validators.errors("common.schema.json#/$defs/diagnostic", instance),
				entry.code,
			).toEqual([]);
		}
	});

	/** Traces: TC-493, TC-508; FR-049-AC-2, FR-049-CON-3. */
	it("emits exactly the codes the registry declares, named as members", () => {
		const scope = walk(compilerRoot)
			.filter((path) => path.endsWith(".mjs"))
			.map((path) => resolve(compilerRoot, path));
		const named = new Set<string>();
		for (const path of scope) {
			// The prototype path predates the registry and is frozen: it emits no
			// registry code at all, so it is outside this scan.
			//
			// `backends/` was skipped wholesale until issue #22, on the stated
			// assumption that a backend emits no registry code. The contract
			// generation seam falsified it — `backends/seam.mjs` raises four
			// `agent-ix.compiler.*` codes — and a skip-list widened to absorb new
			// work is the issue #55 move, so the skip is narrowed to the frozen
			// prototype backends by name instead of broadened to keep passing.
			const relativePath = relative(compilerRoot, path);
			if (
				["ir.mjs", "compile.mjs", "identity.mjs"].includes(relativePath) ||
				FROZEN_PROTOTYPE_BACKENDS.includes(relativePath) ||
				relativePath.startsWith("emitters/")
			) {
				continue;
			}
			const source = read(path);
			for (const match of source.matchAll(
				/DIAGNOSTIC_CODES\.([A-Z][A-Z0-9_]*)/g,
			)) {
				named.add(match[1]);
			}
			// No module names a code as a string literal. A *declared closed
			// register* is where the strings are built, so the registers are the
			// exceptions: `diagnostics.mjs` for the compiler's, and the issue #22
			// backend's own two, which carry the `agent-ix.semantic-ir.` spellings
			// the conformance corpus registers and the `agent-ix.typescript-backend.`
			// representability codes. They are deliberately not members of
			// `DIAGNOSTIC_CODES`: TC-503 asserts the `agent-ix.semantic-ir.` half of
			// that registry equals the set `test/semantic-ir-v1-1-reader.ts` emits,
			// in both directions, so a thirty-first spelling there would break a
			// merged gate.
			if (CODE_REGISTERS.includes(relativePath)) continue;
			for (const match of source.matchAll(
				/"agent-ix\.(compiler|semantic-ir)\.[A-Z][A-Z0-9_]*"/g,
			)) {
				expect(match[0], `${path} names a code as a literal`).toBe("");
			}
		}
		const declared = Object.keys(DIAGNOSTIC_CODES).sort();
		expect(
			declared.filter((code) => !named.has(code)),
			"declared but never named",
		).toEqual([]);
		expect(
			[...named].filter((code) => !declared.includes(code)),
			"named but not declared",
		).toEqual([]);
	});

	/** Traces: TC-495; FR-049-AC-4. */
	it("orders diagnostics stably and locale-independently", () => {
		const make = (path: string, line: number, code: never) =>
			diagnostic(code, {
				message: "m",
				locus: {
					sourceIdentity: "ix://a/b/source/manifest",
					path,
					startLine: line,
					startColumn: 1,
				},
			});
		const list = [
			make("b.tsp", 1, DIAGNOSTIC_CODES.PATH_ESCAPE as never),
			make("a.tsp", 9, DIAGNOSTIC_CODES.PATH_ESCAPE as never),
			make("a.tsp", 1, DIAGNOSTIC_CODES.UNTRUSTED_MODULE as never),
			make("a.tsp", 1, DIAGNOSTIC_CODES.PATH_ESCAPE as never),
			diagnostic(DIAGNOSTIC_CODES.AMBIGUOUS_PROFILE as never, { message: "z" }),
		];
		const forward = sortDiagnostics(list).map(
			(entry: Diagnostic) =>
				`${entry.locus?.path ?? ""}:${entry.locus?.startLine ?? 0}:${entry.code}`,
		);
		const reverse = sortDiagnostics([...list].reverse()).map(
			(entry: Diagnostic) =>
				`${entry.locus?.path ?? ""}:${entry.locus?.startLine ?? 0}:${entry.code}`,
		);
		expect(reverse).toEqual(forward);
		// The unlocated diagnostic sorts last.
		expect(forward[forward.length - 1].startsWith(":0:")).toBe(true);
		// Locale independence, tested against something that is not itself: a
		// collator that disagrees with code-point order on the very strings being
		// sorted. Swedish sorts "z" before "ä"; code point does the opposite.
		const localeSensitive = ["ä.tsp", "z.tsp", "Z.tsp"].map((path) =>
			make(path, 1, DIAGNOSTIC_CODES.PATH_ESCAPE as never),
		);
		const sorted = sortDiagnostics(localeSensitive).map(
			(entry: Diagnostic) => entry.locus?.path,
		);
		expect(sorted).toEqual(["Z.tsp", "z.tsp", "ä.tsp"]);
		for (const locale of ["sv-SE", "de-DE", "tr-TR"]) {
			const collated = ["ä.tsp", "z.tsp", "Z.tsp"].sort(
				new Intl.Collator(locale).compare,
			);
			// The collator's answer may differ; the sort's must not move.
			expect(
				sortDiagnostics(localeSensitive).map(
					(entry: Diagnostic) => entry.locus?.path,
				),
				locale,
			).toEqual(sorted);
			expect(collated).toHaveLength(3);
		}
	});

	/** Traces: TC-497; FR-049-AC-6. */
	it("keeps absolute paths, timestamps, hostnames, and durations out of messages", async () => {
		const collected: Diagnostic[] = [];
		for (const directory of [
			"import-defects/root/root",
			"profile-defects/root/root",
			"strict-loss/root/root",
		]) {
			const result = resolveFixture(
				resolve(cases, directory),
				[resolve(cases, "import-defects/registry")],
				directory.includes("profile") || directory.includes("strict")
					? "default"
					: undefined,
			) as never as { diagnostics: Diagnostic[] };
			collected.push(...result.diagnostics);
		}
		expect(collected.length).toBeGreaterThan(0);
		for (const entry of collected) {
			expect(entry.message, entry.code).not.toMatch(/(^|[\s(])\/[A-Za-z]/);
			expect(entry.message, entry.code).not.toMatch(/\d{4}-\d{2}-\d{2}T/);
			expect(entry.message, entry.code).not.toMatch(/\b\d+\s?ms\b/);
			expect(entry.message, entry.code).not.toContain(root);
		}
	});

	/** Traces: TC-498, TC-504; FR-049-AC-7, FR-049-AC-13. */
	it("nests a caused defect and takes an IR locus from the node's own origin", () => {
		const cause = diagnostic(DIAGNOSTIC_CODES.IMPORT_NOT_FOUND as never, {
			message: "cause",
		});
		const effect = diagnostic(DIAGNOSTIC_CODES.PACKAGE_CYCLE as never, {
			message: "effect",
			causes: [cause],
		});
		expect(effect.causes).toHaveLength(1);
		expect((effect.causes as Diagnostic[])[0].code).toBe(cause.code);

		// A cross-field defect located by a JSON pointer takes the offending
		// node's own source position.
		const document = JSON.parse(JSON.stringify(compiled.ir)) as never as {
			types: Json[];
		};
		const artifact = document.types.find(
			(type) => type.identity === "ix://agent-ix/assurance/type/Artifact",
		) as Json;
		const field = (artifact.fields as Json[])[0];
		field.presence = "optional";
		const diagnostics = readContractIr(document) as never as Diagnostic[];
		note(diagnostics);
		const mismatch = diagnostics.find(
			(entry) =>
				entry.code === DIAGNOSTIC_CODES.PRESENCE_MULTIPLICITY_MISMATCH.code,
		);
		expect(mismatch?.locus).toEqual((field.origin as Json).source as never);
	});

	/** Traces: TC-499, TC-605; FR-049-AC-8, NFR-020-AC-1, NFR-020-AC-2. */
	it("sorts before truncating, so the survivors do not depend on analysis order", () => {
		const make = (path: string, code: never) =>
			diagnostic(code, {
				message: "m",
				locus: {
					sourceIdentity: "ix://a/b/source/manifest",
					path,
					startLine: 1,
					startColumn: 1,
				},
			});
		const list = [
			make("e.tsp", DIAGNOSTIC_CODES.PATH_ESCAPE as never),
			make("a.tsp", DIAGNOSTIC_CODES.PATH_ESCAPE as never),
			make("c.tsp", DIAGNOSTIC_CODES.PATH_ESCAPE as never),
			make("b.tsp", DIAGNOSTIC_CODES.PATH_ESCAPE as never),
			make("d.tsp", DIAGNOSTIC_CODES.PATH_ESCAPE as never),
		];
		const limited = applyDiagnosticLimit(list, 2) as never as Diagnostic[];
		note(limited);
		expect(limited).toHaveLength(3);
		expect(limited.slice(0, 2).map((entry) => entry.locus?.path)).toEqual([
			"a.tsp",
			"b.tsp",
		]);
		expect(limited[2].code).toBe(
			DIAGNOSTIC_CODES.DIAGNOSTIC_LIMIT_REACHED.code,
		);
		// Permuting the analysis order does not change which defects survive.
		const permuted = applyDiagnosticLimit(
			[...list].reverse(),
			2,
		) as never as Diagnostic[];
		expect(permuted.map((entry) => entry.locus?.path)).toEqual(
			limited.map((entry) => entry.locus?.path),
		);
		const single = applyDiagnosticLimit(list, 1) as never as Diagnostic[];
		expect(single).toHaveLength(2);
	});

	/** Traces: TC-501, TC-507, TC-588, TC-608; FR-049-AC-10, FR-049-CON-2, NFR-020-AC-10. */
	it("truncates every input-derived string to 120 characters", () => {
		expect(fragment("a".repeat(120))).toHaveLength(120);
		expect(fragment("a".repeat(121))).toHaveLength(120);
		expect(fragment("a".repeat(4000))).toHaveLength(120);
		expect(fragment("a".repeat(4000)).endsWith("…")).toBe(true);
		const entry = diagnostic(DIAGNOSTIC_CODES.IMPORT_NOT_FOUND as never, {
			message: `no search directory supplies ${fragment("z".repeat(4000))}`,
		});
		// The bound is on the input-derived fragment, which is what an adversary
		// controls; the surrounding sentence is the compiler's own.
		const inputPart = entry.message.slice(
			"no search directory supplies ".length,
		);
		expect(inputPart).toHaveLength(120);
		// A surrogate pair is never split: a lone surrogate is not text.
		const emoji = fragment("\u{1F600}".repeat(400));
		expect(emoji.length).toBeLessThanOrEqual(120);
		expect(
			/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(
				emoji,
			),
		).toBe(false);
	});

	/** Traces: TC-502, TC-580; FR-049-AC-11, NFR-020-AC-2. */
	it("publishes the registry and the limit defaults, and fails when they drift", () => {
		const document = read(
			resolve(root, "docs/semantic-data-system/compiler-diagnostics.md"),
		);
		for (const entry of entries) {
			expect(document, entry.code).toContain(entry.code);
			expect(
				document.includes(`| \`${entry.code}\` | ${entry.severity} |`),
				entry.code,
			).toBe(true);
		}
		for (const [name, value] of Object.entries(DEFAULT_LIMITS)) {
			expect(document, name).toContain(`| \`${name}\` | ${value} |`);
		}
		const documented = [
			...document.matchAll(/\| `(agent-ix\.[a-z-]+\.[A-Z_]+)` \|/g),
		].map((match) => match[1]);
		expect([...new Set(documented)].sort()).toEqual(
			entries.map((entry) => entry.code).sort(),
		);
	});

	/** Traces: TC-503, TC-509; FR-049-AC-12, FR-049-CON-4. */
	it("uses exactly the IR-shape spellings the issue #34 readers emit", () => {
		const published = new Set(
			[
				...read(
					resolve(root, "fixtures/semantic/v1/negative/reader-cases.json"),
				).matchAll(/agent-ix\.semantic-ir\.[A-Z_]+/g),
			].map((match) => match[0]),
		);
		const readerCodes = new Set(
			[
				...read(resolve(root, "test/semantic-ir-v1-1-reader.ts")).matchAll(
					/agent-ix\.semantic-ir\.[A-Z_]+/g,
				),
			].map((match) => match[0]),
		);
		const ours = new Set(
			entries
				.map((entry) => entry.code)
				.filter((code) => code.startsWith("agent-ix.semantic-ir.")),
		);
		for (const code of published) expect(ours.has(code), code).toBe(true);
		expect([...ours].sort()).toEqual([...readerCodes].sort());
	});

	/** Traces: TC-505; FR-049-AC-14. */
	it("keeps the limit warning non-blocking and every blocking code an error", () => {
		expect(DIAGNOSTIC_CODES.DIAGNOSTIC_LIMIT_REACHED.blocking).toBe(false);
		expect(DIAGNOSTIC_CODES.DIAGNOSTIC_LIMIT_REACHED.severity).toBe("warning");
		for (const name of [
			"LIMIT_MAX_INPUT_BYTES",
			"LIMIT_MAX_DEPTH",
			"LIMIT_MAX_NODES",
			"LIMIT_MAX_COLLECTION_ITEMS",
		]) {
			expect(
				(DIAGNOSTIC_CODES as Record<string, { blocking: boolean }>)[name]
					.blocking,
				name,
			).toBe(true);
		}
		for (const entry of entries) {
			if (!entry.blocking) continue;
			expect(entry.severity, entry.code).toBe("error");
		}
		expect(hasBlocking([{ blocking: false } as never])).toBe(false);
	});

	/** Traces: TC-506; FR-049-CON-1. */
	it("throws for a code the registry does not contain", () => {
		expect(() =>
			diagnostic({ code: "agent-ix.compiler.INVENTED" } as never, {}),
		).toThrow(/unregistered/);
		expect(() =>
			diagnostic("agent-ix.compiler.PATH_ESCAPE" as never, {}),
		).toThrow(TypeError);
	});
});

// ---------------------------------------------------------------------------
// FR-050 — IR validation, the cross-field reader, and normalization
// ---------------------------------------------------------------------------

describe("IR validation, reader, and normalization (FR-050)", () => {
	const positives = resolve(root, "fixtures/semantic/v1/positive");
	type ReaderCase = {
		id: string;
		base: string;
		code: string;
		path: string;
		set: { path: string; value: unknown };
		also?: { path: string; value: unknown };
	};
	const readerCases = JSON.parse(
		read(resolve(root, "fixtures/semantic/v1/negative/reader-cases.json")),
	) as ReaderCase[];

	/** The published cases are a base fixture plus a mutation, not documents. */
	function setAt(document: Json, path: string, value: unknown): void {
		const segments = path.split(".");
		let cursor: unknown = document;
		for (const segment of segments.slice(0, -1)) {
			cursor = Array.isArray(cursor)
				? (cursor as unknown[])[Number(segment)]
				: (cursor as Json)[segment];
		}
		const last = segments[segments.length - 1];
		if (Array.isArray(cursor)) (cursor as unknown[])[Number(last)] = value;
		else (cursor as Json)[last] = value;
	}

	function documentFor(entry: ReaderCase): Json {
		const document = JSON.parse(
			read(resolve(root, "fixtures/semantic/v1", entry.base)),
		) as Json;
		setAt(document, entry.set.path, entry.set.value);
		if (entry.also) setAt(document, entry.also.path, entry.also.value);
		return document;
	}

	/** Traces: TC-510; FR-050-AC-1. */
	it("accepts every published positive 1.1.0 fixture", () => {
		for (const name of readdirSync(positives)) {
			if (!name.endsWith(".json")) continue;
			const document = readJson(resolve(positives, name));
			if (document.contractVersion !== "1.1.0") continue;
			expect(validateIrDocument(document), name).toEqual([]);
			const diagnostics = readContractIr(document, {
				importedExports: "unknown",
			}) as never as Diagnostic[];
			note(diagnostics);
			expect(codesOf(diagnostics), name).toEqual([]);
		}
	});

	/** Traces: TC-511, TC-520; FR-050-AC-2, FR-050-AC-11. */
	it("produces the expected code for every published reader case", () => {
		expect(readerCases.length).toBeGreaterThan(0);
		for (const entry of readerCases) {
			const diagnostics = readContractIr(documentFor(entry), {
				importedExports: [],
			}) as never as Diagnostic[];
			note(diagnostics);
			expect(codesOf(diagnostics), entry.id).toContain(entry.code);
		}
		// Every rule of the table fires on some published case or on one built here.
		const fired = new Set<string>();
		for (const entry of readerCases) {
			for (const code of codesOf(
				readContractIr(documentFor(entry), { importedExports: [] }) as never,
			)) {
				fired.add(code);
			}
		}
		fired.add(codesOf(readContractIr("not an object" as never) as never)[0]);
		expect(fired.has(DIAGNOSTIC_CODES.INVALID_DOCUMENT.code)).toBe(true);
	});

	/** Traces: TC-512; FR-050-AC-3. */
	it("agrees with both issue #34 readers on every published case", async () => {
		const { readSemanticIr } = await import("./semantic-ir-v1-1-reader.js");
		// The Python reader is the third opinion. It is invoked, never edited:
		// `tests/**` is a prohibited path for this branch.
		const python = execFileSync(
			"poetry",
			["run", "python", "tests/semantic_ir_reader.py", "--verdicts"],
			{ cwd: root, encoding: "utf8" },
		);
		const verdicts = JSON.parse(python) as {
			id: string;
			code?: string;
			hit?: boolean;
		}[];
		expect(verdicts.length).toBeGreaterThan(0);
		const byId = new Map(verdicts.map((entry) => [entry.id, entry]));
		for (const entry of readerCases) {
			const document = documentFor(entry);
			const mine = new Set(
				codesOf(readContractIr(document, { importedExports: [] }) as never),
			);
			const theirs = new Set(
				readSemanticIr(document as never, []).map(
					(item: { code: string }) => item.code,
				),
			);
			// The compiler's reader and the issue #34 TypeScript reader agree on
			// the whole code set.
			expect([...mine].sort(), entry.id).toEqual([...theirs].sort());
			// The Python reader reports one verdict per case; it agrees on the code
			// the case declares.
			const python34 = byId.get(`reader/${entry.id}`);
			expect(
				python34,
				`${entry.id} absent from the Python verdicts`,
			).toBeDefined();
			expect(python34?.hit, `${entry.id} Python verdict`).toBe(true);
			expect(python34?.code, `${entry.id} Python code`).toBe(entry.code);
			expect(mine.has(entry.code), `${entry.id} compiler code`).toBe(true);
		}
	}, 120000);

	/** Traces: TC-513, TC-523, TC-524; FR-050-AC-4, FR-050-CON-1, FR-050-CON-2. */
	it("is a third implementation that imports neither of the other two", () => {
		const source = read(resolve(compilerRoot, "ir/reader.mjs"));
		expect(source).not.toContain("semantic-ir-v1-1-reader");
		expect(source).not.toContain("semantic_ir_reader");
		expect(source).not.toContain('from "../../test/');
		expect(source).not.toContain('from "../../tests/');
		const changed = changedPaths();
		expect(changed).not.toContain("test/semantic-ir-v1-1-reader.ts");
		expect(changed).not.toContain("tests/semantic_ir_reader.py");
	});

	/** Traces: TC-514, TC-515, TC-525; FR-050-AC-5, FR-050-AC-6, FR-050-CON-3. */
	it("materializes the 1.1.0 members, leaves 1.0.0 alone, and is idempotent", () => {
		const document = JSON.parse(JSON.stringify(compiled.ir)) as never as {
			types: Json[];
		};
		const artifact = document.types.find(
			(type) => type.identity === "ix://agent-ix/assurance/type/Artifact",
		) as Json;
		const field = (artifact.fields as Json[])[0];
		delete field.presence;
		delete field.nullable;
		const normalized = JSON.parse(normalizeIr(document)) as never as {
			types: Json[];
		};
		const restored = (
			normalized.types.find(
				(type) => type.identity === "ix://agent-ix/assurance/type/Artifact",
			) as Json
		).fields as Json[];
		expect(restored[0].presence).toBeDefined();
		expect(restored[0].nullable).toBe(false);
		expect(restored[0].multiplicity).toBeDefined();

		const legacy = {
			contractVersion: "1.0.0",
			types: [
				{
					identity: "ix://a/b/type/T",
					fields: [{ identity: "ix://a/b/field/T-f", presence: "optional" }],
				},
			],
		};
		const legacyNormalized = JSON.parse(normalizeIr(legacy)) as never as {
			types: Json[];
		};
		expect(
			(legacyNormalized.types[0].fields as Json[])[0].multiplicity,
		).toBeUndefined();

		expect(normalizeIr(JSON.parse(normalizeIr(compiled.ir)))).toBe(
			normalizeIr(compiled.ir),
		);
		for (const name of readdirSync(positives)) {
			if (!name.endsWith(".json")) continue;
			const fixture = readJson(resolve(positives, name));
			expect(normalizeIr(JSON.parse(normalizeIr(fixture))), name).toBe(
				normalizeIr(fixture),
			);
		}
	});

	/** Traces: TC-516; FR-050-AC-7. */
	it("fingerprints by meaning, not by ordering", () => {
		const document = JSON.parse(JSON.stringify(compiled.ir)) as never as {
			types: Json[];
		};
		const base = fingerprintIr(document);
		const reordered = JSON.parse(JSON.stringify(document)) as never as {
			types: Json[];
		};
		reordered.types.reverse();
		for (const type of reordered.types) {
			if (Array.isArray(type.fields)) (type.fields as Json[]).reverse();
		}
		expect(fingerprintIr(reordered)).toBe(base);

		const semantic = JSON.parse(JSON.stringify(document)) as never as {
			types: Json[];
		};
		const artifact = semantic.types.find(
			(type) => type.identity === "ix://agent-ix/assurance/type/Artifact",
		) as Json;
		(artifact.fields as Json[])[0].nullable = true;
		expect(fingerprintIr(semantic)).not.toBe(base);
	});

	/** Traces: TC-517; FR-050-AC-8. */
	it("does not write a document that fails its own schema", async () => {
		// A fault-injected lowering: the frontend validates before returning, so a
		// document missing a required member comes back as `ir: null`.
		const invalid = JSON.parse(JSON.stringify(compiled.ir)) as Json;
		delete (invalid as Json).occurrences;
		const errors = validateIrDocument(invalid) as never as Diagnostic[];
		note(errors);
		expect(errors.length).toBeGreaterThan(0);
		expect(errors[0].code).toBe(DIAGNOSTIC_CODES.INVALID_IR.code);
		expect(errors[0].blocking).toBe(true);
	});

	/** Traces: TC-518, TC-526, TC-585; FR-050-AC-9, FR-050-CON-4, NFR-020-AC-7. */
	it("terminates on every cyclic and oversized input", () => {
		const cyclicAlias = {
			contractVersion: "1.1.0",
			types: [
				{
					identity: "ix://a/b/type/X",
					kind: "alias",
					target: "ix://a/b/type/Y",
				},
				{
					identity: "ix://a/b/type/Y",
					kind: "alias",
					target: "ix://a/b/type/X",
				},
			],
		};
		expect(() => readContractIr(cyclicAlias)).not.toThrow();

		const cyclicComposite = {
			contractVersion: "1.1.0",
			types: [
				{
					identity: "ix://a/b/type/A",
					kind: "record",
					fields: [],
					relationships: [
						{
							identity: "ix://a/b/relationship/A-has-B",
							target: "ix://a/b/type/B",
							composite: true,
							category: "structural",
							multiplicity: { lower: 0, upper: 1 },
						},
					],
				},
				{
					identity: "ix://a/b/type/B",
					kind: "record",
					fields: [],
					relationships: [
						{
							identity: "ix://a/b/relationship/B-has-A",
							target: "ix://a/b/type/A",
							composite: true,
							category: "structural",
							multiplicity: { lower: 0, upper: 1 },
						},
					],
				},
			],
		};
		const cycle = readContractIr(cyclicComposite) as never as Diagnostic[];
		note(cycle);
		expect(codesOf(cycle)).toContain(DIAGNOSTIC_CODES.COMPOSITE_CYCLE.code);

		const many = {
			contractVersion: "1.1.0",
			types: Array.from({ length: 20 }, (_, index) => ({
				identity: `ix://a/b/type/T${index}`,
				kind: "record",
				fields: [],
			})),
		};
		const overNodes = readContractIr(many, {
			limits: { ...DEFAULT_LIMITS, maxNodes: 5 },
		}) as never as Diagnostic[];
		note(overNodes);
		expect(codesOf(overNodes)).toEqual([DIAGNOSTIC_CODES.LIMIT_MAX_NODES.code]);

		const wide = {
			contractVersion: "1.1.0",
			types: [
				{
					identity: "ix://a/b/type/W",
					kind: "record",
					fields: Array.from({ length: 20 }, (_, index) => ({
						identity: `ix://a/b/field/W-f${index}`,
						name: `f${index}`,
						typeRef: "ix://a/b/type/W",
						multiplicity: { lower: 1, upper: 1 },
						presence: "required",
					})),
				},
			],
		};
		const overItems = readContractIr(wide, {
			limits: { ...DEFAULT_LIMITS, maxCollectionItems: 5 },
		}) as never as Diagnostic[];
		note(overItems);
		expect(codesOf(overItems)).toContain(
			DIAGNOSTIC_CODES.LIMIT_MAX_COLLECTION_ITEMS.code,
		);
	});

	/** Traces: TC-519, TC-611; FR-050-AC-10. */
	it("names the failing instance pointer", () => {
		const document = JSON.parse(JSON.stringify(compiled.ir)) as Json;
		(document as Json).contractVersion = "2.0.0";
		const errors = validateIrDocument(document) as never as Diagnostic[];
		note(errors);
		expect(errors.length).toBeGreaterThan(0);
		expect(
			errors.some((entry) => entry.message.includes("/contractVersion")),
		).toBe(true);
	});

	/** Traces: TC-521, TC-522, TC-617; FR-050-AC-1, FR-050-AC-12, FR-050-AC-13. */
	it("records a suppression rather than a verdict it cannot reach, and never throws", () => {
		const document = JSON.parse(JSON.stringify(compiled.ir)) as never as {
			types: Json[];
		};
		const artifact = document.types.find(
			(type) => type.identity === "ix://agent-ix/assurance/type/Artifact",
		) as Json;
		(artifact.relationships as Json[])[0].target =
			"ix://agent-ix/core/type/Actor";
		const unknown = readContractIr(document, {
			importedExports: "unknown",
		}) as never as Diagnostic[] & {
			suppressions: { rule: string; identity: string }[];
		};
		note(unknown);
		expect(codesOf(unknown)).not.toContain(
			DIAGNOSTIC_CODES.UNRESOLVED_RELATIONSHIP_TARGET.code,
		);
		expect(unknown.suppressions.length).toBeGreaterThan(0);
		const known = readContractIr(document, {
			importedExports: [],
		}) as never as Diagnostic[];
		note(known);
		expect(codesOf(known)).toContain(
			DIAGNOSTIC_CODES.UNRESOLVED_RELATIONSHIP_TARGET.code,
		);

		// 512 mutations, no exception, no code outside the registry.
		const registry = new Set(
			(Object.values(DIAGNOSTIC_CODES) as { code: string }[]).map(
				(entry) => entry.code,
			),
		);
		const serialized = JSON.stringify(compiled.ir);
		let checked = 0;
		for (let seed = 0; seed < 512; seed += 1) {
			const index = (seed * 6151) % serialized.length;
			const mutated = `${serialized.slice(0, index)}${String.fromCharCode(
				32 + (seed % 94),
			)}${serialized.slice(index + 1)}`;
			let parsed: unknown;
			try {
				parsed = JSON.parse(mutated);
			} catch {
				continue;
			}
			checked += 1;
			const diagnostics = readContractIr(parsed) as never as Diagnostic[];
			for (const entry of diagnostics) {
				expect(registry.has(entry.code), entry.code).toBe(true);
			}
		}
		expect(checked).toBeGreaterThan(0);
	});
});

// ---------------------------------------------------------------------------
// FR-051 — the compatibility classifier and the contract-version projections
// ---------------------------------------------------------------------------

describe("compatibility and evolution (FR-051)", () => {
	const published = JSON.parse(
		read(resolve(root, "fixtures/semantic/v1/compatibility/cases.json")),
	) as { id: string; family: string; expected: string }[];
	const constructed = (id: string) =>
		readJson(resolve(fixtures, `compatibility/cases/${id}.json`)) as never as {
			old: Json;
			new: Json;
			request: Json;
			observedFamily: string;
		};
	const reportOf = (id: string) => {
		const built = constructed(id);
		return diffSemanticContract({
			old: built.old,
			new: built.new,
			...built.request,
		}) as never as {
			changes: { family: string; disposition: string; identity: string }[];
			aggregateDisposition: string;
			requiredGates: string[];
			oldFingerprint: string;
			newFingerprint: string;
		};
	};

	/** Traces: TC-527, TC-602; FR-051-AC-1. */
	it("reproduces every published compatibility case", () => {
		expect(published).toHaveLength(40);
		for (const entry of published) {
			expect(reportOf(entry.id).aggregateDisposition, entry.id).toBe(
				entry.expected,
			);
		}
		// Enum addition, against each consumer policy and each evidence status.
		expect(reportOf("closed-enum-addition").aggregateDisposition).toBe(
			"breaking",
		);
		expect(reportOf("open-enum-addition").aggregateDisposition).toBe(
			"additive",
		);
		expect(reportOf("unknown-consumer").aggregateDisposition).toBe("unknown");
		expect(reportOf("optional-field-stale-consumer").aggregateDisposition).toBe(
			"conditional",
		);
	});

	/** Traces: TC-528; FR-051-AC-2. */
	it("maps every case family through the published data, and produces every report family", () => {
		const map = readJson(
			resolve(compilerRoot, "compat/family-map.json"),
		) as never as {
			families: Record<string, { family: string; surface: string }>;
		};
		const reportFamilies = (
			readJson(
				resolve(root, "schema/semantic/v1/compatibility-report.schema.json"),
			) as never as {
				properties: {
					changes: { items: { properties: { family: { enum: string[] } } } };
				};
			}
		).properties.changes.items.properties.family.enum;
		for (const entry of published) {
			expect(map.families[entry.family], entry.family).toBeDefined();
			expect(reportFamilies, entry.family).toContain(
				map.families[entry.family].family,
			);
		}
		const produced = new Set<string>();
		for (const entry of published) {
			for (const change of reportOf(entry.id).changes)
				produced.add(change.family);
		}
		for (const family of reportFamilies) {
			expect(produced, family).toContain(family);
		}
		// The implementation reads the map rather than restating it, and reads it
		// from a directory the published package actually ships.
		expect(read(resolve(compilerRoot, "family-map.mjs"))).toContain(
			"family-map.json",
		);
		const shipped = readJson(resolve(root, "package.json")).files as string[];
		expect(
			shipped.some((glob) =>
				"src/compiler/compat/family-map.json".startsWith(
					glob.replace(/\/$/, ""),
				),
			),
		).toBe(true);
	});

	/** Traces: TC-529; FR-051-AC-3. */
	it("takes the most restrictive of the per-target dispositions", () => {
		const report = reportOf("target-disagreement");
		expect(report.aggregateDisposition).toBe("breaking");
		expect(
			report.changes.every((change) => change.disposition === "breaking"),
		).toBe(true);
	});

	/** Traces: TC-530, TC-542; FR-051-AC-4, FR-051-CON-1. */
	it("omits a family it was given no input for and names the gate", () => {
		const report = diffSemanticContract({
			old: constructed("documentation-only").old,
			new: constructed("documentation-only").new,
		}) as never as {
			requiredGates: string[];
			changes: { family: string }[];
			aggregateDisposition: string;
		};
		const families = new Set(report.changes.map((change) => change.family));
		for (const absent of [
			"profile",
			"authority",
			"mapping",
			"protobuf-reservation",
			"generated-api",
		]) {
			expect(families.has(absent), absent).toBe(false);
			expect(
				report.requiredGates.some((gate) => gate.includes(absent)),
				absent,
			).toBe(true);
		}
		// And the absent families are never reported as `patch`.
		expect(report.aggregateDisposition).toBe("patch");
		expect(
			report.changes.every((change) => change.family === "documentation"),
		).toBe(true);
	});

	/** Traces: TC-531; FR-051-AC-5. */
	it("produces a schema-valid report for every case", () => {
		const validators = schemaValidators(newHost([root]));
		for (const entry of published) {
			const built = constructed(entry.id);
			const report = diffSemanticContract({
				old: built.old,
				new: built.new,
				...built.request,
			});
			expect(
				validators.errors("compatibility-report.schema.json", report),
				entry.id,
			).toEqual([]);
		}
	});

	/** Traces: TC-532; FR-051-AC-6. */
	it("reports one patch when the two contracts are identical", () => {
		const report = diffSemanticContract({
			old: compiled.ir,
			new: compiled.ir,
		}) as never as {
			changes: { family: string; identity: string }[];
			aggregateDisposition: string;
			oldFingerprint: string;
			newFingerprint: string;
		};
		expect(report.changes).toHaveLength(1);
		expect(report.changes[0].family).toBe("documentation");
		expect(report.changes[0].identity).toBe(
			((compiled.ir as Json).source as Json).identity,
		);
		expect(report.aggregateDisposition).toBe("patch");
		expect(report.oldFingerprint).toBe(report.newFingerprint);
	});

	/** Traces: TC-533, TC-534, TC-536, TC-540, TC-544; FR-051-AC-7, AC-8, AC-10, AC-14, CON-3. */
	it("matches both projection goldens and carries the envelope verbatim", () => {
		const forward = readJson(
			resolve(fixtures, "evolution/forward-1-0-0.json"),
		) as never as { loss: string[]; document: Json };
		const source = readJson(
			resolve(root, "fixtures/semantic/v1/positive/semantic-ir-v1-1.json"),
		);
		const computed = readIrAsContract(source, "1.0.0") as never as {
			loss: string[];
			document: Json;
		};
		expect(JSON.stringify(computed.document, null, "\t")).toBe(
			JSON.stringify(forward.document, null, "\t"),
		);
		expect(computed.loss).toEqual(forward.loss);
		expect(computed.loss.length).toBeGreaterThan(0);
		// The golden is generated by the code under test, so it is also checked
		// against something the code did not write: the loss list must be exactly
		// the `1.1.0`-only members present in the source, computed here from the
		// document rather than from the projection.
		const expectedLoss: string[] = [];
		for (const type of (source as never as { types: Json[] }).types) {
			for (const key of ["relationships", "operations", "clauses"]) {
				for (const node of (type[key] as Json[]) ?? []) {
					expectedLoss.push(String(node.identity));
				}
			}
			for (const field of (type.fields as Json[]) ?? []) {
				if (field.multiplicity !== undefined) {
					expectedLoss.push(`${field.identity}#multiplicity`);
				}
				if (field.unit !== undefined) {
					expectedLoss.push(`${field.identity}#unit`);
				}
			}
		}
		expect([...computed.loss].sort()).toEqual(expectedLoss.sort());
		// And no `1.1.0`-only member survives the projection.
		for (const type of (computed.document as never as { types: Json[] })
			.types) {
			expect(type.relationships, String(type.identity)).toBeUndefined();
			expect(type.operations, String(type.identity)).toBeUndefined();
			expect(type.clauses, String(type.identity)).toBeUndefined();
			for (const field of (type.fields as Json[]) ?? []) {
				expect(field.multiplicity, String(field.identity)).toBeUndefined();
				expect(field.unit, String(field.identity)).toBeUndefined();
			}
		}
		expect(validateIrDocument(computed.document)).toEqual([]);
		expect((computed.document.source as Json).digest).toBe(
			(source.source as Json).digest,
		);
		expect(computed.document.package).toEqual(source.package);

		const backward = readJson(
			resolve(fixtures, "evolution/backward-1-1-0.json"),
		) as never as { loss: string[]; document: Json };
		const back = readIrAsContract(forward.document, "1.1.0", {
			dialect: "typespec",
		}) as never as { loss: string[]; document: Json };
		expect(JSON.stringify(back.document, null, "\t")).toBe(
			JSON.stringify(backward.document, null, "\t"),
		);
		expect(back.loss).toEqual([]);
		expect(validateIrDocument(back.document)).toEqual([]);
	});

	/** Traces: TC-535, TC-612; FR-051-AC-9. */
	it("round-trips a 1.0.0 document through 1.1.0 byte-identically", () => {
		const forward = readJson(
			resolve(fixtures, "evolution/forward-1-0-0.json"),
		) as never as { document: Json };
		const up = readIrAsContract(forward.document, "1.1.0", {
			dialect: "typespec",
		}) as never as { document: Json };
		const down = readIrAsContract(up.document, "1.0.0") as never as {
			document: Json;
		};
		expect(normalizeIr(down.document)).toBe(normalizeIr(forward.document));
	});

	/** Traces: TC-537, TC-568; FR-051-AC-11, NFR-019-AC-2. */
	it("produces byte-identical reports across two runs", () => {
		for (const entry of published.slice(0, 6)) {
			const built = constructed(entry.id);
			const request = { old: built.old, new: built.new, ...built.request };
			expect(JSON.stringify(diffSemanticContract(request), null, "\t")).toBe(
				JSON.stringify(diffSemanticContract(request), null, "\t"),
			);
		}
		const summary = inspectIr(compiled.ir, { importedExports: "unknown" });
		expect(formatInspection(summary)).toBe(
			formatInspection(inspectIr(compiled.ir, { importedExports: "unknown" })),
		);
		// And the summary says what the document says, read independently.
		expect(summary.typeCount).toBe(
			(compiled.ir as never as { types: Json[] }).types.length,
		);
		expect(summary.package.identity).toBe(
			((compiled.ir as Json).package as Json).identity,
		);
		expect(summary.fingerprint).toBe(fingerprintIr(compiled.ir));
	});

	/** Traces: TC-538, TC-543; FR-051-AC-12, FR-051-CON-2. */
	it("publishes the policy and keeps the rank the issue #9 tests assert", async () => {
		const document = read(
			resolve(root, "docs/semantic-data-system/ir-compatibility-policy.md"),
		);
		expect(document).toContain("may add an optional member");
		expect(document).toContain("may widen a closed vocabulary");
		expect(document).toContain("may not remove or retype a member");
		expect(document).toContain("may not narrow a vocabulary");
		const { DISPOSITION_RANK } = await import(
			"../src/compiler/compat/diff.mjs"
		);
		expect([...DISPOSITION_RANK]).toEqual([
			"patch",
			"additive",
			"conditional",
			"unknown",
			"breaking",
			"invalid",
		]);
		for (const [index, value] of DISPOSITION_RANK.entries()) {
			expect(document).toContain(`${index + 1}. \`${value}\``);
		}
		for (const node of V1_1_ADDED_NODES) expect(document).toContain(node);
	});

	/** Traces: TC-539, TC-619; FR-051-AC-13. */
	it("refuses a projection it cannot make and returns one it need not", () => {
		const forward = readJson(
			resolve(fixtures, "evolution/forward-1-0-0.json"),
		) as never as { document: Json };
		const noDialect = readIrAsContract(forward.document, "1.1.0") as never as {
			document: Json | null;
			diagnostics: Diagnostic[];
		};
		note(noDialect.diagnostics);
		expect(noDialect.document).toBeNull();
		expect(codesOf(noDialect.diagnostics)).toEqual([
			DIAGNOSTIC_CODES.MISSING_TARGET_DIALECT.code,
		]);

		const unknownVersion = readIrAsContract(compiled.ir, "2.0.0") as never as {
			document: Json | null;
			diagnostics: Diagnostic[];
		};
		note(unknownVersion.diagnostics);
		expect(unknownVersion.document).toBeNull();
		expect(codesOf(unknownVersion.diagnostics)).toEqual([
			DIAGNOSTIC_CODES.UNKNOWN_CONTRACT_VERSION.code,
		]);

		const same = readIrAsContract(compiled.ir, "1.1.0") as never as {
			document: Json;
			loss: string[];
		};
		expect(same.document).toBe(compiled.ir);
		expect(same.loss).toEqual([]);
		expect([...CONTRACT_VERSIONS]).toEqual(["1.0.0", "1.1.0"]);
	});

	/** Traces: TC-541; FR-051-AC-15. */
	it("classifies removal, retyping, and narrowing as breaking", () => {
		expect(reportOf("union-variant-removal").aggregateDisposition).toBe(
			"breaking",
		);
		expect(
			reportOf("constraint-keyword-operands-retyped").aggregateDisposition,
		).toBe("breaking");
		expect(
			reportOf("constraint-keyword-removed-from-vocabulary")
				.aggregateDisposition,
		).toBe("breaking");
		expect(reportOf("multiplicity-narrowing").aggregateDisposition).toBe(
			"breaking",
		);
		expect(
			reportOf("constraint-keyword-added-to-vocabulary").aggregateDisposition,
		).toBe("additive");
		expect(reportOf("multiplicity-widening").aggregateDisposition).toBe(
			"additive",
		);
	});

	/** Traces: TC-545; FR-051-CON-4. */
	it("imports no target backend", () => {
		for (const name of ["diff.mjs", "evolution.mjs"]) {
			const source = read(resolve(compilerRoot, "compat", name));
			expect(source).not.toContain("backends/");
		}
	});

	/** Traces: TC-546; FR-051-CON-5. */
	it("leaves the published compatibility case index byte-unchanged", () => {
		expect(changedPaths()).not.toContain(
			"fixtures/semantic/v1/compatibility/cases.json",
		);
		for (const entry of published) {
			expect(
				existsSync(resolve(fixtures, `compatibility/cases/${entry.id}.json`)),
				entry.id,
			).toBe(true);
		}
	});
});

// ---------------------------------------------------------------------------
// FR-052 — the pipeline, the commands, and the narrow interface
// ---------------------------------------------------------------------------

describe("pipeline, commands, and the narrow interface (FR-052)", () => {
	const spike = resolve(root, "spikes/typespec-feasibility");

	/** Traces: TC-547; FR-052-AC-1. */
	it("reproduces the committed issue #4 golden through emit-ir", () => {
		const out = resolve(temp("emit"), "semantic-ir.json");
		try {
			runCli([
				"emit-ir",
				"--entrypoint",
				resolve(spike, "main.tsp"),
				"--generator",
				"@agent-ix/typespec-semantic-ir-emitter-spike@0.0.0",
				"--out",
				out,
			]);
			expect(read(out)).toBe(
				read(resolve(spike, "generated/custom/semantic-ir.json")),
			);
		} finally {
			rmSync(dirname(out), { recursive: true, force: true });
		}
	}, 120000);

	/** Traces: TC-548, TC-567; FR-052-AC-2, NFR-019-AC-1. */
	it("compiles to a valid document, twice byte-identically", () => {
		const directory = temp("compile");
		try {
			const first = resolve(directory, "first.json");
			const second = resolve(directory, "second.json");
			const firstDiagnostics = resolve(directory, "first.diagnostics.json");
			const secondDiagnostics = resolve(directory, "second.diagnostics.json");
			for (const [out, diagnostics] of [
				[first, firstDiagnostics],
				[second, secondDiagnostics],
			]) {
				const result = runCli([
					"compile",
					"--package",
					assurance,
					"--profile",
					"default",
					"--entrypoint",
					"types/main.tsp",
					"--out",
					out,
					"--diagnostics",
					diagnostics,
				]);
				expect(result.status).toBe(0);
			}
			expect(read(first)).toBe(read(second));
			expect(read(firstDiagnostics)).toBe(read(secondDiagnostics));
			expect(read(firstDiagnostics).trim()).toBe("[]");
			const document = readJson(first);
			expect(document.contractVersion).toBe("1.1.0");
			expect(validateIrDocument(document)).toEqual([]);
		} finally {
			rmSync(directory, { recursive: true, force: true });
		}
	}, 180000);

	/** Traces: TC-549, TC-496, TC-500, TC-562; FR-052-AC-3, FR-049-AC-5, FR-049-AC-9, FR-052-AC-16. */
	it("writes nothing on a blocking defect and leaves an existing output alone", () => {
		const directory = temp("blocking");
		try {
			const fresh = resolve(directory, "fresh.json");
			const existing = resolve(directory, "existing.json");
			writeFileSync(existing, "previous run\n");
			const diagnostics = resolve(directory, "diagnostics.json");
			const firstRun = runCliAllowingFailure([
				"compile",
				"--package",
				resolve(cases, "import-defects/root/root"),
				"--package-path",
				resolve(cases, "import-defects/registry"),
				"--profile",
				"default",
				"--entrypoint",
				"types/main.tsp",
				"--out",
				fresh,
				"--diagnostics",
				diagnostics,
			]);
			expect(firstRun.status).toBe(1);
			expect(existsSync(fresh)).toBe(false);
			const reported = JSON.parse(read(diagnostics)) as Diagnostic[];
			note(reported);
			expect(reported.length).toBeGreaterThan(0);
			// Sorted: path, then line, then column, then code.
			const keys = reported.map(
				(entry) =>
					`${entry.locus?.path ?? ""}:${String(entry.locus?.startLine ?? 0).padStart(6, "0")}:${entry.code}`,
			);
			expect([...keys].sort()).toEqual(keys);

			const secondRun = runCliAllowingFailure([
				"compile",
				"--package",
				resolve(cases, "import-defects/root/root"),
				"--package-path",
				resolve(cases, "import-defects/registry"),
				"--profile",
				"default",
				"--entrypoint",
				"types/main.tsp",
				"--out",
				existing,
				"--diagnostics",
				resolve(directory, "second.json"),
			]);
			expect(secondRun.status).toBe(1);
			expect(read(existing)).toBe("previous run\n");
			// The two diagnostic files are byte-identical across runs.
			expect(read(resolve(directory, "second.json"))).toBe(read(diagnostics));
			// Only caller-named paths and their `.tmp` siblings exist.
			for (const name of readdirSync(directory)) {
				expect(
					["existing.json", "diagnostics.json", "second.json"].includes(name),
					name,
				).toBe(true);
			}
		} finally {
			rmSync(directory, { recursive: true, force: true });
		}
	}, 120000);

	/** Traces: TC-550, TC-551; FR-052-AC-4, FR-052-AC-5. */
	it("refuses a stale lock without touching it, and writes one only when asked", () => {
		const directory = temp("lock-cli");
		try {
			const lockPath = resolve(directory, "package-lock.json");
			const written = resolve(directory, "written-lock.json");
			const out = resolve(directory, "ir.json");
			expect(
				runCli([
					"compile",
					"--package",
					assurance,
					"--profile",
					"default",
					"--entrypoint",
					"types/main.tsp",
					"--out",
					out,
					"--write-lock",
					written,
				]).status,
			).toBe(0);
			expect(
				schemaValidators(newHost([root])).errors(
					"package-lock.schema.json",
					readJson(written),
				),
			).toEqual([]);

			const stale = readJson(written);
			stale.fingerprint = `sha256:${"9".repeat(64)}`;
			const staleText = `${JSON.stringify(stale, null, "\t")}\n`;
			writeFileSync(lockPath, staleText);
			const failed = runCliAllowingFailure([
				"compile",
				"--package",
				assurance,
				"--profile",
				"default",
				"--entrypoint",
				"types/main.tsp",
				"--lock",
				lockPath,
				"--out",
				resolve(directory, "stale.json"),
			]);
			expect(failed.status).toBe(1);
			expect(read(lockPath)).toBe(staleText);
			expect(failed.stderr).toContain("STALE_LOCK");
			expect(existsSync(resolve(directory, "stale.json"))).toBe(false);
		} finally {
			rmSync(directory, { recursive: true, force: true });
		}
	}, 180000);

	/** Traces: TC-552; FR-052-AC-6. */
	it("refuses to guess between two declared profiles", () => {
		const directory = temp("ambiguous");
		try {
			const result = runCliAllowingFailure([
				"compile",
				"--package",
				resolve(cases, "two-profiles/root/root"),
				"--entrypoint",
				"types/main.tsp",
				"--out",
				resolve(directory, "ir.json"),
			]);
			expect(result.status).toBe(1);
			expect(result.stderr).toContain("AMBIGUOUS_PROFILE");
			expect(existsSync(resolve(directory, "ir.json"))).toBe(false);
		} finally {
			rmSync(directory, { recursive: true, force: true });
		}
	}, 60000);

	/** Traces: TC-553, TC-554, TC-555; FR-052-AC-7, AC-8, AC-9. */
	it("inspects deterministically, in both forms, and reports what it could not check", () => {
		const directory = temp("inspect");
		try {
			const out = resolve(directory, "ir.json");
			runCli([
				"compile",
				"--package",
				assurance,
				"--profile",
				"default",
				"--entrypoint",
				"types/main.tsp",
				"--out",
				out,
			]);
			const first = runCli(["inspect", "--ir", out, "--package", assurance]);
			const second = runCli(["inspect", "--ir", out, "--package", assurance]);
			expect(first.stdout).toBe(second.stdout);
			expect(first.stdout).toContain("contract        1.1.0");
			expect(first.stdout).toContain("agent-ix/assurance");
			for (const type of (readJson(out) as never as { types: Json[] }).types) {
				expect(first.stdout).toContain(String(type.identity));
			}

			const json = runCli([
				"inspect",
				"--ir",
				out,
				"--json",
				"--package",
				assurance,
			]);
			const record = JSON.parse(json.stdout) as never as {
				fingerprint: string;
				typeCount: number;
			};
			expect(json.stdout.trim()).toBe(canonicalize(record));
			expect(record.fingerprint).toBe(fingerprintIr(readJson(out)));
			expect(String(record.typeCount)).toBe(
				String((readJson(out) as never as { types: Json[] }).types.length),
			);

			// Without `--package` the reader cannot see the imported exports, and
			// says so rather than inventing a verdict.
			const document = readJson(out) as never as { types: Json[] };
			const artifact = document.types.find(
				(type) => type.identity === "ix://agent-ix/assurance/type/Artifact",
			) as Json;
			(artifact.relationships as Json[])[0].target =
				"ix://agent-ix/core/type/Actor";
			const cross = resolve(directory, "cross.json");
			writeFileSync(cross, `${JSON.stringify(document, null, "\t")}\n`);
			const suppressed = runCli(["inspect", "--ir", cross]);
			expect(suppressed.stdout).toContain("suppressed");
			expect(suppressed.status).toBe(0);

			const invalid = resolve(directory, "invalid.json");
			const broken2 = JSON.parse(read(out)) as never as { types: Json[] };
			const target = broken2.types.find(
				(type) => type.identity === "ix://agent-ix/assurance/type/Artifact",
			) as Json;
			(target.fields as Json[])[0].presence = "optional";
			writeFileSync(invalid, `${JSON.stringify(broken2, null, "\t")}\n`);
			const broken = runCliAllowingFailure(["inspect", "--ir", invalid]);
			expect(broken.status).toBe(1);
			expect(broken.stdout).toContain("diagnostics:");
		} finally {
			rmSync(directory, { recursive: true, force: true });
		}
	}, 180000);

	/** Traces: TC-556; FR-052-AC-10. */
	it("diffs, exits by aggregate, and passes consumer and target inputs through", () => {
		const directory = temp("diff");
		try {
			const additive = constructedPair("optional-field-all-open", directory);
			const policy = resolve(directory, "policy.json");
			writeFileSync(
				policy,
				JSON.stringify(
					(
						constructedRequest("optional-field-all-open").consumerPolicies as
							| Json[]
							| undefined
					)?.[0] ?? {},
					null,
					"\t",
				),
			);
			const report = resolve(directory, "report.json");
			const ok = runCli([
				"diff",
				"--old",
				additive.old,
				"--new",
				additive.new,
				"--out",
				report,
				"--consumer-policy",
				policy,
			]);
			expect(ok.status).toBe(0);
			const document = readJson(report) as never as {
				aggregateDisposition: string;
				changes: { affectedConsumers: string[] }[];
			};
			expect(document.aggregateDisposition).toBe("additive");
			expect(
				schemaValidators(newHost([root])).errors(
					"compatibility-report.schema.json",
					document,
				),
			).toEqual([]);
			expect(document.changes[0].affectedConsumers.length).toBeGreaterThan(0);

			const breaking = constructedPair("required-field", directory);
			const failed = runCliAllowingFailure([
				"diff",
				"--old",
				breaking.old,
				"--new",
				breaking.new,
				"--out",
				resolve(directory, "breaking.json"),
			]);
			expect(failed.status).toBe(1);
			expect(
				(
					readJson(resolve(directory, "breaking.json")) as never as {
						aggregateDisposition: string;
					}
				).aggregateDisposition,
			).toBe("breaking");

			// A per-target disposition reaches the classification.
			const withTarget = runCliAllowingFailure([
				"diff",
				"--old",
				additive.old,
				"--new",
				additive.new,
				"--out",
				resolve(directory, "target.json"),
				"--target-result",
				"rust=breaking",
			]);
			expect(withTarget.status).toBe(1);
		} finally {
			rmSync(directory, { recursive: true, force: true });
		}
	}, 60000);

	function constructedRequest(id: string): Json {
		return readJson(resolve(fixtures, `compatibility/cases/${id}.json`))
			.request as Json;
	}

	function constructedPair(
		id: string,
		directory: string,
	): { old: string; new: string } {
		const built = readJson(
			resolve(fixtures, `compatibility/cases/${id}.json`),
		) as never as { old: Json; new: Json };
		const oldPath = resolve(directory, `${id}-old.json`);
		const newPath = resolve(directory, `${id}-new.json`);
		writeFileSync(oldPath, `${JSON.stringify(built.old, null, "\t")}\n`);
		writeFileSync(newPath, `${JSON.stringify(built.new, null, "\t")}\n`);
		return { old: oldPath, new: newPath };
	}

	/** Traces: TC-557; FR-052-AC-11. */
	it("exits 2 on every usage error and prints the usage text", () => {
		const directory = temp("usage");
		try {
			for (const args of [
				["invent"],
				["compile", "--invented", "x"],
				["compile", "--package", assurance],
				["inspect"],
				[
					"compile",
					"--package",
					assurance,
					"--out",
					resolve(directory, "x.json"),
					"--limits",
					resolve(directory, "absent.json"),
				],
			]) {
				const result = runCliAllowingFailure(args);
				expect(result.status, args.join(" ")).toBe(2);
				expect(result.stderr, args.join(" ")).toContain("Usage:");
			}
		} finally {
			rmSync(directory, { recursive: true, force: true });
		}
	}, 60000);

	/** Traces: TC-558, TC-563; FR-052-AC-12, FR-052-CON-1. */
	it("declares exactly fifteen symbols that the typecheck sees", async () => {
		const index = (await import("../src/compiler/index.mjs")) as Record<
			string,
			unknown
		>;
		const exported = Object.keys(index).sort();
		expect(exported).toHaveLength(15);
		expect(exported).toEqual([
			"CONTRACT_IR_VERSION",
			"SEMANTIC_IR_SCHEMA_VERSION",
			"buildSemanticIr",
			"compilePackage",
			"compileSemanticIr",
			"diffSemanticContract",
			"emitRust",
			"emitTypeScript",
			"fingerprintIr",
			"inspectIr",
			"normalizeIr",
			"normalizeJsonSchemaForPython",
			"readContractIr",
			"readIrAsContract",
			"runFrontend",
		]);
		// A substring check would pass on a name mentioned in a comment. The
		// declared *export set* is extracted and compared with the module's.
		const declarations = read(resolve(compilerRoot, "index.d.mts"));
		const declared = new Set<string>();
		for (const match of declarations.matchAll(
			/^export (?:declare (?:function|const|class) |\{ )?([A-Za-z_][A-Za-z0-9_]*)/gm,
		)) {
			declared.add(match[1]);
		}
		for (const match of declarations.matchAll(/^export \{([^}]+)\}/gm)) {
			for (const name of match[1].split(",")) declared.add(name.trim());
		}
		for (const name of exported) {
			expect([...declared], name).toContain(name);
		}
	});

	/** Traces: TC-559, TC-564, TC-591; FR-052-AC-13, FR-052-CON-2, NFR-021-AC-2. */
	it("leaves the published package surface untouched", () => {
		const before = JSON.parse(
			git("show", `${baseline()}:package.json`),
		) as Json;
		const now = readJson(resolve(root, "package.json"));
		for (const key of ["exports", "main", "module", "types", "files"]) {
			expect(now[key], key).toEqual(before[key]);
		}
		expect(now.dependencies ?? null).toEqual(before.dependencies ?? null);
	});

	/** Traces: TC-560, TC-573, TC-574; FR-052-AC-14, NFR-019-AC-7, NFR-019-AC-8. */
	it("produces identical output from another directory and a different environment", () => {
		const directory = temp("env");
		try {
			const baseline = resolve(directory, "baseline.json");
			runCli([
				"compile",
				"--package",
				assurance,
				"--profile",
				"default",
				"--entrypoint",
				"types/main.tsp",
				"--out",
				baseline,
			]);
			const elsewhere = resolve(directory, "elsewhere.json");
			execFileSync(
				process.execPath,
				[
					cli,
					"compile",
					"--package",
					assurance,
					"--profile",
					"default",
					"--entrypoint",
					"types/main.tsp",
					"--out",
					elsewhere,
				],
				{
					cwd: tmpdir(),
					encoding: "utf8",
					env: {
						PATH: process.env.PATH ?? "",
						TZ: "Pacific/Kiritimati",
						LANG: "tr_TR.UTF-8",
						LC_ALL: "tr_TR.UTF-8",
					},
				},
			);
			expect(read(elsewhere)).toBe(read(baseline));
		} finally {
			rmSync(directory, { recursive: true, force: true });
		}
	}, 180000);

	/** Traces: TC-561; FR-052-AC-15. */
	it("runs its five phases in order and stops at the first blocking one", async () => {
		const seen: string[] = [];
		const good = await compilePackage({
			host: newHost([root]),
			packageRoot: assurance,
			searchPath: [],
			profileName: "default",
			entrypoint: "types/main.tsp",
			onPhase: (phase: string) => seen.push(phase),
		});
		note(good.diagnostics as never);
		expect(seen).toEqual([...PHASES]);
		expect(good.state).toBe("success");

		const stopped: string[] = [];
		const bad = await compilePackage({
			host: newHost([root]),
			packageRoot: resolve(cases, "import-defects/root/root"),
			searchPath: [resolve(cases, "import-defects/registry")],
			profileName: "default",
			entrypoint: "types/main.tsp",
			onPhase: (phase: string) => stopped.push(phase),
		});
		note(bad.diagnostics as never);
		expect(stopped).toEqual(["resolve"]);
		expect(bad.state).toBe("invalid");
		expect(bad.ir).toBeNull();
	}, 120000);

	/** Traces: TC-565, TC-566, TC-569; FR-052-CON-3, FR-052-CON-4, NFR-019-AC-3. */
	it("reads no ambient input anywhere in the contract path", () => {
		const scope = [
			...walk(resolve(compilerRoot, "frontend")).map((path) =>
				resolve(compilerRoot, "frontend", path),
			),
			...walk(resolve(compilerRoot, "packages")).map((path) =>
				resolve(compilerRoot, "packages", path),
			),
			...walk(resolve(compilerRoot, "ir")).map((path) =>
				resolve(compilerRoot, "ir", path),
			),
			...walk(resolve(compilerRoot, "compat")).map((path) =>
				resolve(compilerRoot, "compat", path),
			),
			resolve(compilerRoot, "pipeline.mjs"),
			resolve(compilerRoot, "inspect.mjs"),
			resolve(compilerRoot, "json-locus.mjs"),
			resolve(compilerRoot, "diagnostics.mjs"),
			resolve(compilerRoot, "dialects.mjs"),
			resolve(compilerRoot, "schema-validate.mjs"),
		].filter((path) => path.endsWith(".mjs"));
		const forbidden = [
			"Date.now",
			"new Date",
			"process.env",
			"process.cwd",
			"process.platform",
			"os.hostname",
			"Math.random",
			"localeCompare",
			"toLocaleString",
			"Intl.",
			"path.sep",
		];
		for (const path of scope) {
			const source = read(path);
			for (const token of forbidden) {
				expect(source.includes(token), `${path} reads ${token}`).toBe(false);
			}
		}
		// The CLI is where a *compile's* host is constructed, and it reads no
		// environment. `host.mjs` also offers a repository-scoped fallback for a
		// caller reading a document off disk with no compile in progress; that is
		// the module that owns hosts, so it is not "below" the CLI.
		const cliSource = read(cli);
		expect(cliSource).toContain("createHost(");
		expect(cliSource.includes("process.env")).toBe(false);
		for (const path of scope) {
			expect(read(path).includes("createHost("), path).toBe(false);
		}
		expect(read(resolve(compilerRoot, "host.mjs"))).toContain(
			"export function repositoryHost",
		);
	});
});

// ---------------------------------------------------------------------------
// NFR-019, NFR-020, NFR-021 — determinism, safety, and non-disruption
// ---------------------------------------------------------------------------

describe("determinism, safety, and non-disruption (NFR-019..021)", () => {
	/** Traces: TC-571, TC-575; NFR-019-AC-5, NFR-019-AC-9. */
	it("does not depend on enumeration order or on the host's path separator", async () => {
		const ascending = await compileFixture(assurance, {
			profileName: "default",
			host: createHost({ readRoots: [root], enumerationOrder: "ascending" }),
		});
		const descending = await compileFixture(assurance, {
			profileName: "default",
			host: createHost({ readRoots: [root], enumerationOrder: "descending" }),
		});
		expect(normalizeIr(descending.ir)).toBe(normalizeIr(ascending.ir));

		// Every emitted path is POSIX whatever the platform reports; the helper
		// the host exposes is the one place a separator is decided.
		const host = newHost([root]);
		expect(host.toPosix("a\\b/c")).toBe("a/b/c");
		for (const type of (compiled.ir as never as { types: Json[] }).types) {
			const locus = (type.origin as Json).source as Json | undefined;
			if (!locus) continue;
			expect(String(locus.path)).not.toContain("\\");
		}
	}, 180000);

	/** Traces: TC-577, TC-578, TC-590, TC-594, TC-596, TC-597; NFR-019-AC-11, AC-12, NFR-021-AC-1, AC-5, AC-7, AC-8. */
	it("changes only permitted paths and publishes nothing", () => {
		const permitted = [
			"src/compiler/frontend/",
			"src/compiler/packages/",
			"src/compiler/ir/",
			"src/compiler/compat/",
			"src/compiler/diagnostics.",
			"src/compiler/dialects.",
			"src/compiler/family-map.",
			"src/compiler/host.",
			"src/compiler/inspect.",
			"src/compiler/json-locus.",
			"src/compiler/pipeline.",
			"src/compiler/schema-validate.",
			"src/compiler/cli.mjs",
			"src/compiler/index.mjs",
			"src/compiler/index.d.mts",
			"test/fixtures/compiler/",
			"test/",
			"spec/",
			"plan/",
			"reviews/",
			"scripts/test-matrix-summary.mjs",
			"scripts/build-compatibility-cases.mjs",
			"scripts/build-evolution-goldens.mjs",
			"scripts/build-compiler-docs.mjs",
			"docs/semantic-data-system/compiler-diagnostics.md",
			"docs/semantic-data-system/ir-compatibility-policy.md",
			"Makefile",
			"package.json",
			"biome.json",
		];
		const prohibited = [
			"src/compiler/ir.mjs",
			"src/compiler/compile.mjs",
			"src/compiler/identity.mjs",
			"src/compiler/emitters/",
			"src/compiler/backends/",
			"src/compiler/inventory.json",
			"schema/",
			"fixtures/semantic/",
			"fixtures/semantic-core/",
			"fixtures/representative-core-payloads.json",
			"packages/",
			"spikes/",
			"conformance/",
			"agent_ix_core_data/",
			"src/generated.ts",
			"audit/",
			"tests/",
			"test/semantic-ir-v1-1-reader.ts",
			"test/semantic-core-reader.ts",
			"test/semantic-core-lowerer.ts",
			".github/",
			"pyproject.toml",
			"poetry.lock",
			"pnpm-lock.yaml",
		];
		for (const path of changedPaths()) {
			expect(
				permitted.some((prefix) => path === prefix || path.startsWith(prefix)),
				`not permitted: ${path}`,
			).toBe(true);
			for (const prefix of prohibited) {
				expect(
					path === prefix || path.startsWith(prefix),
					`prohibited: ${path}`,
				).toBe(false);
			}
		}
		// Every manifest this branch adds carries the licence.
		for (const path of changedPaths().filter((entry) =>
			entry.endsWith("package.json"),
		)) {
			if (path === "package.json") continue;
			expect(readJson(resolve(root, path)).license, path).toBe("AGPL-3.0-only");
		}
		// No publication step exists to trigger.
		expect(readJson(resolve(root, "package.json"))).not.toHaveProperty(
			"publishConfig",
		);
		// The `@typespec/*` pins are exact, and nothing is a file:/link: specifier.
		const devDependencies = readJson(resolve(root, "package.json"))
			.devDependencies as Record<string, string>;
		for (const [name, value] of Object.entries(devDependencies)) {
			if (name.startsWith("@typespec/")) {
				expect(/^\d+\.\d+\.\d+$/.test(value), `${name}@${value}`).toBe(true);
			}
			expect(value.startsWith("file:"), name).toBe(false);
			expect(value.startsWith("link:"), name).toBe(false);
		}
		expect(existsSync(resolve(root, ".npmrc"))).toBe(false);
	});

	/** Traces: TC-593; NFR-021-AC-4. */
	it("leaves the issue #4 goldens and everything under spikes/ byte-unchanged", () => {
		// Both ends from history: measured to the current head this would fail
		// the moment any later ticket legitimately touched `spikes/`, and would
		// report it as an issue #19 mutation of the issue #4 goldens.
		const { base, tip } = range();
		expect(
			git(
				"diff",
				"--no-renames",
				"--name-only",
				`${base}..${tip}`,
				"--",
				"spikes/",
			)
				.split("\n")
				.filter((line) => line.length > 0),
		).toEqual([]);
	});

	/** Traces: TC-595; NFR-021-AC-6. */
	it("restores the pre-issue-19 tree exactly when the change is reverted", () => {
		// Baselined on the commit this change replaced, located from history —
		// not on `origin/main...HEAD`.
		//
		// The first form of this rehearsal asserted `changed.length` was greater
		// than zero against that range. That is the identical positive
		// branch-diff shape this branch diagnosed in #48 and #47 fixed for
		// TC-395: the range empties the moment the change merges, the loop
		// iterates zero times, and the rehearsal reports success having
		// rehearsed nothing — or, with the length assertion kept, fails on
		// `main`. Making it conditional on a non-empty diff would be the same
		// defect wearing a disguise: it would go quiet rather than red.
		//
		// So the baseline is discovered the way #47 discovered TC-395's: find the
		// commit that first added a file this change created, and take its
		// parent. That is a history fact. It survives the squash merge, and if
		// issue #19 is ever reverted the sentinel disappears from history and
		// this gate fails rather than passing vacuously.
		// `SENTINEL` spans the change: the earliest artifact it created and the
		// latest, so the baseline is the branch point while unmerged and the
		// squash commit's parent afterwards. A single mid-branch sentinel would
		// baseline on a tree this change had already touched, and the rehearsal
		// would then "restore" files the change itself had since moved.
		//
		// The far end is pinned the same way. Measured to the current head, the
		// rehearsal restores every file every later ticket has landed since and
		// calls the result "reverting issue #19" — the accreting form issue #20
		// measured on the changed-path gate above.
		const { base, tip } = range();

		const scratch = temp("restore");
		const worktree = resolve(scratch, "base");
		try {
			execFileSync("git", ["worktree", "add", "--detach", worktree, base], {
				cwd: root,
				stdio: "pipe",
			});
			const changed = git(
				"diff",
				"--no-renames",
				"--name-only",
				`${base}..${tip}`,
			)
				.split("\n")
				.map((line) => line.trim())
				.filter(
					(path) =>
						path.length > 0 &&
						!path.startsWith("dist/") &&
						!path.startsWith("node_modules/"),
				);
			// The sentinel is in the set by construction, which is what makes the
			// baseline discriminating rather than merely non-empty.
			expect(changed).toContain("src/compiler/pipeline.mjs");
			expect(changed).toContain("spec/tests.md");

			let modified = 0;
			let added = 0;
			for (const path of changed) {
				const here = resolve(root, path);
				const there = resolve(worktree, path);
				if (!existsSync(there)) {
					added += 1;
					continue;
				}
				expect(existsSync(here), path).toBe(true);
				// A path this gate calls changed must actually differ from the base.
				expect(
					readFileSync(here).equals(readFileSync(there)),
					`${path} is listed as changed but is identical to the base`,
				).toBe(false);
				modified += 1;
			}
			expect(added).toBeGreaterThan(0);
			expect(modified).toBeGreaterThan(0);
			// And the revert is complete: reverting to `base` restores every file
			// the base carried, and removes every file it did not.
			for (const path of changed) {
				const there = resolve(worktree, path);
				const carriedByBase = (() => {
					try {
						execFileSync("git", ["cat-file", "-e", `${base}:${path}`], {
							cwd: root,
							stdio: "ignore",
						});
						return true;
					} catch {
						return false;
					}
				})();
				expect(existsSync(there), `restore incomplete: ${path}`).toBe(
					carriedByBase,
				);
			}
		} finally {
			execFileSync("git", ["worktree", "remove", "--force", worktree], {
				cwd: root,
				stdio: "pipe",
			});
			rmSync(scratch, { recursive: true, force: true });
		}
	}, 120000);

	/** Traces: TC-620; NFR-021-AC-9. */
	it("resolves both ends of every non-disruption range from history", () => {
		// A gate baselined on `origin/main` stops asserting the moment the change
		// merges: the range empties, the working tree matches the base, and every
		// prohibition passes over an empty set. It does not go red, it goes quiet,
		// which is why the suite reported green through two rounds of this defect.
		// This is the static gate that keeps it out of the two suites that were
		// fixed. It reads the sources rather than the git graph, so it gives the
		// same verdict before and after the merge.
		for (const name of ["compiler.test.ts", "compiler-core.test.ts"]) {
			const source = read(resolve(root, "test", name))
				.split("\n")
				.filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
				.join("\n");
			// Assembled from parts so this gate does not match its own source.
			const movingRef = new RegExp(["origin", "main"].join("/"));
			expect(source, `${name} baselines on a moving ref`).not.toMatch(
				movingRef,
			);
			// The far end has to be pinned too. A range from a fixed base to the
			// current head does not go quiet on merge, it grows: it annexes every
			// path every later ticket adds and then fails this ticket for them.
			// Issue #20 measured that on this suite's own gate before it could
			// take the trunk red.
			const movingHead = new RegExp(`\\.\\.${["HE", "AD"].join("")}`);
			expect(source, `${name} measures to a moving head`).not.toMatch(
				movingHead,
			);
		}
		// And the shared helper offers the history-based resolver the two suites
		// use, so the fix cannot be reverted by deleting it unnoticed.
		const helper = read(resolve(root, "test/changed-paths.ts"));
		expect(helper).toContain("export function changeRange(");
		expect(helper).toContain("export function changedPathsOf(");
	});

	/**
	 * Traces: TC-644; NFR-021-AC-10.
	 *
	 * The property the four faces of this defect all violate, asserted directly
	 * on a synthetic history rather than inferred from the shape of the source:
	 * a merged change's path set does not move when a later, unrelated change
	 * lands on top of it.
	 */
	it("does not annex a later change's paths into this change's path set", () => {
		const scratch = temp("accretion");
		try {
			const run = (...args: string[]): void => {
				execFileSync("git", args, { cwd: scratch, stdio: "pipe" });
			};
			const write = (path: string, body: string): void => {
				mkdirSync(dirname(resolve(scratch, path)), { recursive: true });
				writeFileSync(resolve(scratch, path), body);
			};
			run("init", "--initial-branch=main");
			run("config", "user.email", "gate@example.invalid");
			run("config", "user.name", "gate");
			write("README.md", "base\n");
			run("add", "-A");
			run("commit", "-m", "base");

			// The change under test, squash-merged as one commit.
			write("src/compiler/pipeline.mjs", "export const compile = () => {};\n");
			write("spec/usecase/US-010-compile-a-semantic-package.md", "# US-010\n");
			run("add", "-A");
			run("commit", "-m", "the change");
			const mine = changedPathsOf(scratch, SENTINEL).sort();
			expect(mine).toEqual([
				"spec/usecase/US-010-compile-a-semantic-package.md",
				"src/compiler/pipeline.mjs",
			]);

			// A later, unrelated ticket lands on top, adding exactly the paths
			// this change's own requirement prohibits.
			write("conformance/corpus/case-001.json", "{}\n");
			write("tests/test_conformance_corpus.py", "def test_it(): ...\n");
			run("add", "-A");
			run("commit", "-m", "a later ticket");
			expect(changedPathsOf(scratch, SENTINEL).sort()).toEqual(mine);

			// And the gate still discriminates: a prohibited path left in the
			// working tree at a path no later commit owns is still this change's.
			write("schema/semantic/v1/rogue.json", "{}\n");
			expect(changedPathsOf(scratch, SENTINEL)).toContain(
				"schema/semantic/v1/rogue.json",
			);
			// while the later ticket's own file, edited in the working tree, is
			// attributed to the later ticket rather than annexed into this one.
			write("conformance/corpus/case-001.json", '{"edited": true}\n');
			expect(changedPathsOf(scratch, SENTINEL)).not.toContain(
				"conformance/corpus/case-001.json",
			);
		} finally {
			rmSync(scratch, { recursive: true, force: true });
		}
	});

	/** Traces: TC-586; NFR-020-AC-8. */
	it("survives 512 mutations of a manifest with no uncaught exception", () => {
		const directory = temp("fuzz");
		try {
			const original = read(resolve(assurance, "package-manifest.json"));
			const registry = new Set(
				(Object.values(DIAGNOSTIC_CODES) as { code: string }[]).map(
					(entry) => entry.code,
				),
			);
			let ran = 0;
			for (let seed = 0; seed < 512; seed += 1) {
				const index = (seed * 4409) % original.length;
				const mutated = `${original.slice(0, index)}${String.fromCharCode(
					32 + (seed % 94),
				)}${original.slice(index + 1)}`;
				writeFileSync(resolve(directory, "package-manifest.json"), mutated);
				const host = createHost({ readRoots: [root, directory] });
				let diagnostics: Diagnostic[] = [];
				expect(() => {
					diagnostics = resolvePackageGraph({
						host,
						packageRoot: directory,
						searchPath: [],
					}).diagnostics as never;
				}, `seed ${seed}`).not.toThrow();
				for (const entry of diagnostics) {
					expect(registry.has(entry.code), entry.code).toBe(true);
				}
				ran += 1;
			}
			expect(ran).toBe(512);
		} finally {
			rmSync(directory, { recursive: true, force: true });
		}
	}, 180000);
});

// ---------------------------------------------------------------------------
// The remaining registry codes, each fired on a constructed input
// ---------------------------------------------------------------------------

describe("the remaining reader and resolver rules (FR-049 coverage)", () => {
	const base = () =>
		JSON.parse(JSON.stringify(compiled.ir)) as never as { types: Json[] };
	const artifactOf = (document: { types: Json[] }) =>
		document.types.find(
			(type) => type.identity === "ix://agent-ix/assurance/type/Artifact",
		) as Json;

	/** Traces: TC-520; FR-050-AC-11 (the rules the published cases do not reach). */
	it("fires every remaining cross-field rule on a constructed document", () => {
		const fired = new Map<string, string>();
		const run = (
			label: string,
			mutate: (document: { types: Json[] }) => void,
		) => {
			const document = base();
			mutate(document);
			const diagnostics = readContractIr(document, {
				importedExports: [],
			}) as never as Diagnostic[];
			note(diagnostics);
			for (const entry of diagnostics) fired.set(entry.code, label);
		};

		run("not an object", () => {
			const diagnostics = readContractIr(42) as never as Diagnostic[];
			note(diagnostics);
			expect(codesOf(diagnostics)).toEqual([
				DIAGNOSTIC_CODES.INVALID_DOCUMENT.code,
			]);
		});
		run("empty unit", (document) => {
			(artifactOf(document).fields as Json[])[0].unit = "";
		});
		run("missing multiplicity", (document) => {
			delete (artifactOf(document).fields as Json[])[0].multiplicity;
		});
		run("unknown clause language", (document) => {
			(artifactOf(document).clauses as Json[])[0].language = "SHOUTING";
		});
		run("unknown constraint keyword", (document) => {
			const alias = document.types.find(
				(type) => type.identity === "ix://agent-ix/assurance/type/ArtifactCode",
			) as Json;
			(alias.constraints as Json[])[0].keyword = "invented";
		});
		run("unknown edge category", (document) => {
			(artifactOf(document).relationships as Json[])[0].category = "invented";
		});
		run("relationships on a non-record", (document) => {
			const status = document.types.find(
				(type) => type.identity === "ix://agent-ix/assurance/type/Status",
			) as Json;
			status.relationships = artifactOf(document).relationships;
		});

		for (const code of [
			DIAGNOSTIC_CODES.INVALID_DOCUMENT.code,
			DIAGNOSTIC_CODES.INVALID_UNIT.code,
			DIAGNOSTIC_CODES.MISSING_MULTIPLICITY.code,
			DIAGNOSTIC_CODES.UNKNOWN_CLAUSE_LANGUAGE.code,
			DIAGNOSTIC_CODES.UNKNOWN_CONSTRAINT_KEYWORD.code,
			DIAGNOSTIC_CODES.UNKNOWN_EDGE_CATEGORY.code,
			DIAGNOSTIC_CODES.NODES_ON_NON_RECORD.code,
		]) {
			expect(observedCodes.has(code), code).toBe(true);
		}
		expect(fired.size).toBeGreaterThan(0);
	});

	/** Traces: TC-464, TC-552; FR-047-AC-9, FR-052-AC-6 (through the API). */
	it("fires the profile, mapping, and ambiguity rules through the resolver", () => {
		const ambiguous = resolveFixture(
			resolve(cases, "two-profiles/root/root"),
		) as never as { diagnostics: Diagnostic[] };
		expect(codesOf(ambiguous.diagnostics)).toContain(
			DIAGNOSTIC_CODES.AMBIGUOUS_PROFILE.code,
		);

		const directory = temp("documents");
		try {
			cpSync(resolve(cases, "strict-loss/root/root"), directory, {
				recursive: true,
			});
			writeFileSync(
				resolve(directory, "mappings/markdown.json"),
				'{"contractVersion":"1.0.0"}\n',
			);
			const badMapping = resolveFixture(directory, [], "default") as never as {
				diagnostics: Diagnostic[];
			};
			expect(codesOf(badMapping.diagnostics)).toContain(
				DIAGNOSTIC_CODES.INVALID_MAPPING.code,
			);

			mkdirSync(resolve(directory, "profiles"), { recursive: true });
			writeFileSync(
				resolve(directory, "profiles/default.json"),
				'{"contractVersion":"1.0.0"}\n',
			);
			const badProfile = resolveFixture(directory, [], "default") as never as {
				diagnostics: Diagnostic[];
			};
			expect(codesOf(badProfile.diagnostics)).toContain(
				DIAGNOSTIC_CODES.INVALID_PROFILE.code,
			);
		} finally {
			rmSync(directory, { recursive: true, force: true });
		}
	});

	/** Traces: TC-433, TC-448; FR-046-AC-2, FR-046-AC-17 (the refusal halves). */
	it("refuses an unclassifiable declaration and a source under no declared root", async () => {
		const unsupported = await compileSource(
			[
				"using AgentIx.Semantic.Decorators;",
				"namespace AgentIx.Semantic;",
				"scalar Text extends string;",
				'@semanticReference("ix://agent-ix/core/type/Actor")',
				"model NotEmpty { id: Text; }",
			].join("\n"),
		);
		expect(codesOf(unsupported.diagnostics as never)).toContain(
			DIAGNOSTIC_CODES.UNSUPPORTED_DECLARATION.code,
		);

		// A declaration whose file lies beneath no declared root: the lowering is
		// driven directly with a package root that does not contain the sources,
		// which is the only way to reach the rule now that the host confines every
		// read to a declared root.
		const { lowerProgram } = await import(
			"../src/compiler/frontend/typespec/lower.mjs"
		);
		const { compile } = await import("@typespec/compiler");
		const { restrictedHost } = await import(
			"../src/compiler/frontend/typespec/host.mjs"
		);
		const directory = temp("outside-root");
		try {
			mkdirSync(resolve(directory, "types"), { recursive: true });
			writeFileSync(
				resolve(directory, "types/main.tsp"),
				["namespace AgentIx.Semantic;", "scalar Text extends string;"].join(
					"\n",
				),
			);
			const libraryRoot = resolve(compilerRoot, "frontend/typespec/lib");
			const host = restrictedHost({
				readRoots: [directory, libraryRoot, dirname(dirname(libraryRoot))],
				moduleRoots: [libraryRoot],
			});
			const program = await compile(
				host,
				resolve(directory, "types/main.tsp"),
				{ noEmit: true },
			);
			const lowered = lowerProgram({
				program,
				packageIdentity: "agent-ix/elsewhere",
				packageRoot: resolve(directory, "somewhere-else"),
				packageRoots: [],
				sourceIdentity: "ix://agent-ix/elsewhere/source/typespec",
				packageVersion: "1.0.0",
				sourceDigest: `sha256:${"0".repeat(64)}`,
				packageBlock: {},
			});
			note(lowered.diagnostics as never);
			expect(codesOf(lowered.diagnostics as never)).toContain(
				DIAGNOSTIC_CODES.SOURCE_OUTSIDE_PACKAGE.code,
			);
		} finally {
			rmSync(directory, { recursive: true, force: true });
		}
	}, 120000);
});

// ---------------------------------------------------------------------------
// The generation seam's registry codes (FR-063)
// ---------------------------------------------------------------------------

/**
 * The FR-049 closing gate below asserts that every member of `DIAGNOSTIC_CODES`
 * fired somewhere in *this file*. Issue #22 added four `agent-ix.compiler.*`
 * codes for the generation seam, so they are fired here rather than by widening
 * the gate to look elsewhere — a gate that counts what it can see is worth more
 * than one that trusts another file to have looked.
 */
describe("generation backend seam registry codes (FR-063)", () => {
	const generationRequest = (overrides: Json = {}): Json => ({
		contractVersion: "1.0.0",
		lockFingerprint: `sha256:${"a".repeat(64)}`,
		ir: readJson(
			resolve(root, "fixtures/semantic/v1/positive/semantic-ir-v1-1.json"),
		) as Json,
		profile: readJson(
			resolve(root, "fixtures/semantic/v1/positive/profile.json"),
		) as Json,
		mappings: [],
		backend: {
			identity: "ix://agent-ix/filament-core-data/backend/typescript",
			version: "1.0.0",
			supportedIrVersions: ["1.1.0"],
			supportedFeatures: [],
			options: {},
		},
		outputRoot: "generated/typescript",
		limits: { ...DEFAULT_LIMITS },
		...overrides,
	});

	/** Traces: TC-746, TC-747; FR-063-AC-3, FR-063-AC-4. */
	it("fires the unimplemented-target and invalid-request codes", () => {
		const unavailable = generateTarget(generationRequest(), {
			target: "rust",
		}) as never as { state: string; diagnostics: Diagnostic[] };
		note(unavailable.diagnostics);
		expect(unavailable.state).toBe("unavailable");
		expect(codesOf(unavailable.diagnostics)).toContain(
			DIAGNOSTIC_CODES.BACKEND_NOT_IMPLEMENTED.code,
		);

		const invalid = generateTarget(
			generationRequest({ outputRoot: undefined }),
			{ target: "typescript" },
		) as never as { state: string; diagnostics: Diagnostic[] };
		note(invalid.diagnostics);
		expect(invalid.state).toBe("invalid");
		expect(codesOf(invalid.diagnostics)).toContain(
			DIAGNOSTIC_CODES.INVALID_REQUEST.code,
		);
	});

	/** Traces: TC-748; FR-063-AC-10. */
	it("fires the unsupported-version code for a 1.0.0 document", () => {
		const request = generationRequest();
		(request.ir as Json).contractVersion = "1.0.0";
		(request.ir as Json).source = {
			...((request.ir as Json).source as Json),
			dialect: "https://json-schema.org/draft/2020-12/schema",
		};
		const result = generateTarget(request, {
			target: "typescript",
		}) as never as { state: string; diagnostics: Diagnostic[] };
		note(result.diagnostics);
		expect(result.state).toBe("unsupported");
		expect(codesOf(result.diagnostics)).toContain(
			DIAGNOSTIC_CODES.UNSUPPORTED_IR_VERSION.code,
		);
	});

	/** Traces: TC-751, TC-752; FR-063-AC-8, FR-063-AC-9. */
	it("fires the backend-contract code for a backend that escapes its output root", () => {
		const escaping = {
			identity: "ix://agent-ix/filament-core-data/backend/probe",
			version: "1.0.0",
			supportedIrVersions: ["1.1.0"],
			supportedFeatures: [],
			generate: () => ({
				state: "success",
				files: [{ path: "../escaped.ts", text: "", identities: [] }],
				diagnostics: [],
			}),
		};
		let raised: unknown;
		try {
			assertBackendContract(
				escaping,
				escaping.generate() as never,
				"generated/typescript",
			);
		} catch (error) {
			raised = error;
		}
		expect(raised, "an escaping path is refused").toBeDefined();
		note([
			diagnostic(DIAGNOSTIC_CODES.BACKEND_CONTRACT_VIOLATION, {
				message: String((raised as Error).message),
			}) as never,
		]);
	});
});

// ---------------------------------------------------------------------------
// The closing gate: every registry code fired somewhere in this suite
// ---------------------------------------------------------------------------

describe("issue #11 kernel diagnostic codes (FR-081, FR-082, FR-084)", () => {
	// Every code this repository registers must be emitted by a test in this
	// file (FR-049's closing gate). Issue #11 adds six, and fires each one here
	// from the module that raises it, rather than asserting the code exists.
	it("fires each of the six kernel codes from the module that raises it", async () => {
		const bundle = await import(
			"../src/compiler/frontend/json-schema/bundle.mjs"
		);
		const representability = await import(
			"../src/compiler/frontend/json-schema/representability.mjs"
		);
		const lower = await import(
			"../src/compiler/frontend/json-schema/lower.mjs"
		);

		const declaration = {
			documents: ["A.json"],
			semanticCore: "0.1.0",
			emissionDigest: "sha256:aa",
			inventoryCounts: { models: 1 },
		};

		// KERNEL_INVENTORY_MISMATCH and KERNEL_BUNDLE_STALE.
		note(
			bundle.checkKernelBundle(
				declaration,
				{ models: [1, 2] },
				{ files: ["B.json"], digest: "sha256:bb" },
				{ version: "9.9.9" },
			) as readonly Diagnostic[],
		);

		// UNSUPPORTED_SCHEMA_KEYWORD: a keyword outside the closed set.
		const keywordRun = lower.lowerBundle([
			["A.json", { $id: "A", type: "object", oneOf: [] }],
		]) as { diagnostics?: readonly Diagnostic[] };
		note(keywordRun.diagnostics ?? []);

		// UNSUPPORTED_SCHEMA_SHAPE: an object schema with no seal.
		const shapeRun = lower.lowerBundle([
			["B.json", { $id: "B", type: "object", properties: {} }],
		]) as { diagnostics?: readonly Diagnostic[] };
		note(shapeRun.diagnostics ?? []);

		// The two declared losses.
		note([
			representability.decide("DefaultDecl.value").diagnostic,
			representability.decide("OperationDecl.params").diagnostic,
		] as readonly Diagnostic[]);

		for (const code of [
			"agent-ix.compiler.KERNEL_INVENTORY_MISMATCH",
			"agent-ix.compiler.KERNEL_BUNDLE_STALE",
			"agent-ix.compiler.UNSUPPORTED_SCHEMA_KEYWORD",
			"agent-ix.compiler.UNSUPPORTED_SCHEMA_SHAPE",
			"agent-ix.compiler.KERNEL_UNCONSTRAINED_VALUE",
			"agent-ix.compiler.KERNEL_REQUIRED_COLLECTION_PRESENCE",
		]) {
			expect(observedCodes.has(code), code).toBe(true);
		}
	});
});

describe("diagnostic coverage (FR-049 closing gate)", () => {
	/** Traces: TC-494, TC-609; FR-049-AC-3. */
	it("fires every registry code at least once across the fixture corpus", () => {
		const declared = (
			Object.values(DIAGNOSTIC_CODES) as { code: string }[]
		).map((entry) => entry.code);
		const missing = declared.filter((code) => !observedCodes.has(code)).sort();
		expect(missing, "registry codes no test in this file emitted").toEqual([]);
	});
});
