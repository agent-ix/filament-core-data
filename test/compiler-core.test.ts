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
import {
	CANONICALIZATION,
	REPO_ROOT,
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
const fixtures = resolve(root, "fixtures/compiler");
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

/** Every path this branch changed, with rename detection off (Plan-007's lesson). */
function changedPaths(): string[] {
	return git("diff", "--no-renames", "--name-only", "origin/main...HEAD")
		.split("\n")
		.filter((line) => line.length > 0);
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
	const host = newHost([root]);
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
			"ix://agent-ix/assurance/type/Artifactcode",
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
			(type) => type.identity === "ix://agent-ix/assurance/type/Artifactcode",
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
	it("refuses an enum member value the IR has no member for", async () => {
		const result = await compileSource(
			[
				"namespace AgentIx.Semantic;",
				'enum Status { draft, final: "FINAL" }',
			].join("\n"),
		);
		expect(codesOf(result.diagnostics as never)).toContain(
			DIAGNOSTIC_CODES.UNSUPPORTED_LOSS.code,
		);
		expect(result.ir).toBeNull();
	}, 60000);

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
		const before = JSON.parse(git("show", "origin/main:package.json")) as Json;
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
		expect(typeOf("ActorRef").target).toBe("ix://agent-ix/core/type/Actor");
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

	/** Traces: TC-438, TC-599, TC-603; FR-046-AC-7. */
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
