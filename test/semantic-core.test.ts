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
	writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { NodeHost, compile, navigateProgram } from "@typespec/compiler";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { createHash } from "node:crypto";
import { readDeclarations } from "./semantic-core-reader";
import { type Instance, lower } from "./semantic-core-lowerer";
import { normalize, readSemanticIr } from "./semantic-ir-v1-1-reader";
import type { Program } from "@typespec/compiler";
import { changedPathsFrom } from "./changed-paths.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packageRoot = resolve(root, "packages/semantic-core");
/**
 * Issue #35 (semantic-core L3 declaration grammar) matrix trace inventory:
 * TC-248, TC-249, TC-250, TC-251, TC-252, TC-253, TC-254, TC-255, TC-256,
 * TC-257, TC-258, TC-259, TC-260, TC-261, TC-262, TC-263, TC-264, TC-265,
 * TC-266, TC-267, TC-268, TC-269, TC-270, TC-271, TC-272, TC-273, TC-275,
 * TC-276, TC-277, TC-278, TC-279.
 * TC-274 is a manual inspection of the two doc amendments.
 * Acceptance criteria: FR-031-AC-1..7, FR-032-AC-1..5, FR-033-AC-1..5,
 * FR-034-AC-1..5, NFR-014-AC-1, NFR-014-AC-3..5.
 * Constraints: FR-031-CON-1..2, FR-032-CON-1, FR-033-CON-1..2, FR-034-CON-1.
 */

type JsonObject = Record<string, unknown>;

function object(value: unknown, label: string): JsonObject {
	expect(
		value !== null && typeof value === "object" && !Array.isArray(value),
		label,
	).toBe(true);
	return value as JsonObject;
}

function array(value: unknown, label: string): unknown[] {
	expect(Array.isArray(value), label).toBe(true);
	return value as unknown[];
}

function readPackageJson(path: string): unknown {
	return JSON.parse(readFileSync(resolve(packageRoot, path), "utf8"));
}

function changedPaths(): string[] {
	// Issue #19 note: this baseline moves. Once the change this suite guards
	// is merged, `origin/main` carries it, the set empties, and every prohibition
	// below passes vacuously — the gate goes quiet rather than red. The fix
	// is `changedPathsOf` with a sentinel this suite's own change created;
	// picking that sentinel wrongly baselines against an unrelated tree and
	// makes the prohibition fail on history it was never meant to judge, so
	// it belongs to whoever owns these requirements. Tracked as issue #51.
	return changedPathsFrom(root, "origin/main");
}

describe("semantic-core non-disruption (Task-041)", () => {
	/** Traces: TC-275; NFR-014-AC-3. */
	it("keeps issue #35 inside its permitted paths", () => {
		const allowed = [
			"conformance/",
			"plan/Plan-009-conformance-corpus-and-oracle/",
			"test/conformance-corpus.test.ts",
			"docs/semantic-data-system/metamodel.md",
			"docs/semantic-data-system/adr/0002-generated-package-ownership.md",
			"fixtures/semantic-core/",
			"fixtures/semantic/v1/compatibility/cases.json",
			"packages/semantic-core/",
			"plan/Plan-006-semantic-core-grammar/",
			"src/compiler/",
			"tsconfig.json",
			"tsconfig.build.json",
			"plan/Plan-007-promote-prototype-emitters/",
			"package.json",
			"pnpm-lock.yaml",
			"docs/semantic-data-system/typespec-feasibility.md",
			"test/compiler.test.ts",
			"spikes/typespec-feasibility/scripts/",
			"spikes/typespec-feasibility/package.json",
			"spikes/typespec-feasibility/evidence/custom.json",
			"spikes/typespec-feasibility/emitter/",
			"reviews/",
			"spec/",
			"test/",
			"tests/",
			"Makefile",
			// Issue #19 (the compiler core) adds the compiler fixture corpus, the
			// matrix-summary script, its plan bundle, and its test file. Each entry
			// is a path this branch writes, enumerated rather than widened.
			"test/fixtures/compiler/",
			"scripts/test-matrix-summary.mjs",
			"scripts/build-compatibility-cases.mjs",
			"scripts/build-evolution-goldens.mjs",
			"scripts/build-compiler-docs.mjs",
			"plan/Plan-008-typespec-frontend-and-ir-compiler-core/",
			// Issue #19 also publishes two generated documents and excludes its
			// generated fixtures from the formatter.
			"docs/semantic-data-system/compiler-diagnostics.md",
			"docs/semantic-data-system/ir-compatibility-policy.md",
			"biome.json",
			// Issue #21 (the Rust/Serde backend) adds a Rust workspace, its
			// toolchain and formatter pins, the generated-crate goldens, the
			// third-party attribution register and two rendered documents. Each
			// entry is a path that branch writes, enumerated rather than widened,
			// which is the extension NFR-016 states every ticket makes to these
			// cumulative lists. The gate itself still reads a moving `origin/main`,
			// which is issue #51 and not this ticket's to fix.
			".cargo/config.toml",
			"Cargo.toml",
			"Cargo.lock",
			"rust-toolchain.toml",
			"rustfmt.toml",
			"THIRD-PARTY-NOTICES.md",
			".gitignore",
			"crates/",
			"scripts/build-rust-backend-docs.mjs",
			"scripts/build-rust-backend-goldens.mjs",
			"scripts/rust-backend-",
			"docs/semantic-data-system/rust-backend",
			"test/rust-backend.test.ts",
			"test/fixtures/rust-serde/",
			"test/changed-paths.ts",
			"plan/",
		];
		for (const path of changedPaths()) {
			expect(
				allowed.some((prefix) => path === prefix || path.startsWith(prefix)),
				path,
			).toBe(true);
			if (existsSync(resolve(root, path)))
				expect(statSync(resolve(root, path)).isFile(), path).toBe(true);
		}
		// Issue #27 removes the spike emitter's `file:` devDependency, so
		// `package.json` and `pnpm-lock.yaml` necessarily move. What these
		// criteria protect — the published surface and the runtime dependency
		// set — is pinned exactly by TC-391 in test/compiler.test.ts.
		for (const prohibited of [
			"pnpm-workspace.yaml",
			"schema/avro/core-data.avpr",
			"src/generated.ts",
		])
			expect(changedPaths(), prohibited).not.toContain(prohibited);
		// Issue #27 promoted the prototype emitters into src/compiler/ and rewired
		// the spike runner to them, so those paths are no longer prohibited for
		// every later branch. The frozen retained evidence is still protected —
		// by TC-371 in test/compiler.test.ts, which allows exactly one field of
		// spikes/typespec-feasibility/evidence/custom.json to differ.
		const promotionPaths = [
			"src/compiler/",
			"spikes/typespec-feasibility/scripts/",
			"spikes/typespec-feasibility/package.json",
			"spikes/typespec-feasibility/evidence/custom.json",
			"spikes/typespec-feasibility/emitter/",
		];
		for (const path of changedPaths()) {
			if (promotionPaths.some((prefix) => path.startsWith(prefix))) continue;
			expect(path.startsWith("spikes/") || path.startsWith("src/"), path).toBe(
				false,
			);
		}
	});

	/** Traces: TC-278; NFR-014-AC-5. */
	it("leaves the frozen TypeSpec spike byte-identical", () => {
		// Scoped by issue #27 (FR-044): the promotion rewires the spike runner to
		// the promoted compiler and deletes the spike emitter package. The
		// retained evidence this criterion protects is unchanged apart from the
		// one declared field, which TC-371 pins exactly.
		const promotionPaths = [
			"spikes/typespec-feasibility/scripts/run-experiment.mjs",
			"spikes/typespec-feasibility/package.json",
			"spikes/typespec-feasibility/evidence/custom.json",
		];
		const spikeDiff = execFileSync(
			"git",
			["diff", "--no-renames", "origin/main", "--name-only", "--", "spikes/"],
			{ cwd: root, encoding: "utf8" },
		)
			.split("\n")
			.filter((line) => line.length > 0)
			.filter(
				(path) =>
					!promotionPaths.includes(path) &&
					!path.startsWith("spikes/typespec-feasibility/emitter/"),
			);
		expect(spikeDiff).toEqual([]);
	});
});

describe("semantic-core package inventory (Task-042)", () => {
	/** Traces: TC-254; FR-031-CON-1. */
	it("lives under packages/semantic-core, compiled by the root toolchain", () => {
		expect(existsSync(resolve(packageRoot, "main.tsp"))).toBe(true);
		const manifest = object(readPackageJson("package.json"), "package.json");
		expect(manifest.name).toBe("@agent-ix/semantic-core");
		expect(manifest.tspMain).toBe("main.tsp");
		expect(String(manifest.version)).toMatch(/^\d+\.\d+\.\d+$/);
		// FR-031-CON-1 is about where the grammar lives, not about whether it
		// ships: issue #40 published @agent-ix/semantic-core to npm.ix so the
		// Wave-4 object modules can consume it, so `private` is deliberately
		// absent from the manifest and asserting it would un-publish them.
		expect(manifest.private).toBeUndefined();
		// "Lives under packages/semantic-core/": the entry point and every path
		// the package ships resolve inside the package directory and exist, so
		// moving the grammar (or an emitted artefact) out of it fails here.
		const exportsMap = object(manifest.exports, "exports");
		const rootExport = object(exportsMap["."], 'exports["."]');
		for (const entry of [
			String(manifest.tspMain),
			String(rootExport.typespec),
			...array(manifest.files, "files").map(String),
		]) {
			const target = resolve(packageRoot, entry);
			expect(
				target === packageRoot || target.startsWith(`${packageRoot}/`),
				entry,
			).toBe(true);
			expect(existsSync(target), entry).toBe(true);
		}
		// "Compiled with the root-installed TypeSpec toolchain": the package
		// declares the pinned compiler as a peer of the root devDependency
		// instead of vendoring a second copy of its own.
		const rootManifest = object(
			JSON.parse(readFileSync(resolve(root, "package.json"), "utf8")),
			"root package.json",
		);
		const rootDev = object(
			rootManifest.devDependencies,
			"root devDependencies",
		);
		const peers = object(manifest.peerDependencies, "peerDependencies");
		for (const name of ["@typespec/compiler", "@typespec/json-schema"])
			expect(peers[name], name).toBe(rootDev[name]);
		// The spike has its own packages/semantic-core; it must never import ours.
		let spikeSources = "";
		try {
			spikeSources = execFileSync(
				"git",
				[
					"grep",
					"-l",
					"-e",
					'@agent-ix/semantic-core"',
					"-e",
					"../../packages/semantic-core",
					"--",
					"spikes/",
				],
				{ cwd: root, encoding: "utf8" },
			).trim();
		} catch {
			spikeSources = "";
		}
		expect(spikeSources, "spike imports the production grammar").toBe("");
	});

	/** Traces: TC-276; NFR-014-AC-4. */
	it("configures only the official JSON Schema emitter", () => {
		const config = readFileSync(resolve(packageRoot, "tspconfig.yaml"), "utf8");
		const emitters = [...config.matchAll(/^\s*-\s*"?(@[^"\s]+)"?\s*$/gm)].map(
			(match) => match[1],
		);
		expect(emitters).toEqual(["@typespec/json-schema"]);
		expect(config).toContain("seal-object-schemas: true");
		const manifest = object(readPackageJson("package.json"), "package.json");
		expect(manifest.dependencies ?? {}).toEqual({});
	});

	/** Traces: TC-249; FR-031-AC-2 (inventory file half; the compiled half is TC-249/TC-273 in the grammar suite). */
	it("publishes an inventory file with every declaration kind", () => {
		const inventory = object(
			readPackageJson("inventory.json"),
			"inventory.json",
		);
		const models = array(inventory.models, "models").map(String);
		for (const name of [
			"Multiplicity",
			"TypeRef",
			"DecimalPolicy",
			"DefaultDecl",
			"FieldDecl",
			"RelationDecl",
			"OperationDecl",
			"ClauseRef",
			"EnumValue",
			"SourceLocus",
		])
			expect(models, name).toContain(name);
		expect(array(inventory.enums, "enums").map(String).sort()).toEqual([
			"ConstraintKeyword",
			"DefaultKind",
			"EdgeCategory",
			"KernelScalar",
		]);
		expect(array(inventory.scalars, "scalars").map(String).sort()).toEqual([
			"ClauseLanguage",
			"Identifier",
			"SemanticId",
			"UnitSymbol",
		]);
		expect(array(inventory.unions, "unions").map(String)).toEqual([
			"ConstraintDecl",
		]);
	});
});

type Declared = {
	models: string[];
	unions: string[];
	enums: string[];
	scalars: string[];
};

const NAMESPACE = "AgentIx.Semantic.Core";

function fullName(type: unknown): string {
	const parts: string[] = [];
	let cursor = (type as { namespace?: unknown }).namespace as
		| { name?: unknown; namespace?: unknown }
		| undefined;
	while (cursor && typeof cursor.name === "string" && cursor.name.length > 0) {
		parts.unshift(cursor.name);
		cursor = cursor.namespace as typeof cursor;
	}
	return parts.join(".");
}

function declarations(program: Program): Declared {
	const out: Declared = { models: [], unions: [], enums: [], scalars: [] };
	navigateProgram(program, {
		model(model) {
			if (fullName(model as never) === NAMESPACE && model.name)
				out.models.push(model.name);
		},
		union(union) {
			if (fullName(union as never) === NAMESPACE && union.name)
				out.unions.push(union.name);
		},
		enum(enumeration) {
			if (fullName(enumeration as never) === NAMESPACE)
				out.enums.push(enumeration.name);
		},
		scalar(scalar) {
			if (fullName(scalar as never) === NAMESPACE)
				out.scalars.push(scalar.name);
		},
	});
	for (const key of Object.keys(out) as (keyof Declared)[])
		out[key] = [...new Set(out[key])].sort();
	return out;
}

async function compileGrammar(
	main = resolve(packageRoot, "main.tsp"),
): Promise<Program> {
	const program = await compile(NodeHost, main, { noEmit: true });
	return program;
}

function inventory(): Declared {
	const raw = object(readPackageJson("inventory.json"), "inventory");
	return {
		models: array(raw.models, "models").map(String).sort(),
		unions: array(raw.unions, "unions").map(String).sort(),
		enums: array(raw.enums, "enums").map(String).sort(),
		scalars: array(raw.scalars, "scalars").map(String).sort(),
	};
}

async function compileSource(source: string): Promise<Program> {
	const { mkdtempSync, writeFileSync, rmSync } = await import("node:fs");
	const { tmpdir } = await import("node:os");
	const dir = mkdtempSync(resolve(tmpdir(), "semantic-core-mutation-"));
	try {
		writeFileSync(resolve(dir, "main.tsp"), source);
		return await compile(NodeHost, resolve(dir, "main.tsp"), { noEmit: true });
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
}

function grammarSource(): string {
	return readFileSync(resolve(packageRoot, "main.tsp"), "utf8");
}

describe("FR-031 grammar package (Task-042)", () => {
	/** Traces: TC-248; FR-031-AC-1. */
	it("compiles under the pinned TypeSpec compiler with zero diagnostics", async () => {
		const output = execFileSync(
			"pnpm",
			["exec", "tsp", "compile", "packages/semantic-core", "--no-emit"],
			{ cwd: root, encoding: "utf8" },
		);
		expect(output).toContain("Compilation completed successfully");
		const program = await compileGrammar();
		expect(program.diagnostics.map((d) => d.message)).toEqual([]);
		expect(program.hasError()).toBe(false);
	});

	/** Traces: TC-249, TC-273; FR-031-AC-2, NFR-014-AC-1. */
	it("declares exactly the inventory and rejects Entity or Any", async () => {
		const program = await compileGrammar();
		expect(declarations(program)).toEqual(inventory());
		const withEntity = await compileSource(`${grammarSource()}
model Entity { id: SemanticId; }
`);
		const extra = declarations(withEntity).models.filter(
			(name) => !inventory().models.includes(name),
		);
		expect(
			extra,
			"kernel scope test must name the smuggled declaration",
		).toEqual(["Entity"]);
		const withAny = await compileSource(
			grammarSource().replace("  JsonObject,\n}", "  JsonObject,\n  Any,\n}"),
		);
		let anyMember = false;
		navigateProgram(withAny, {
			enum(enumeration) {
				if (enumeration.name === "KernelScalar")
					anyMember = enumeration.members.has("Any");
			},
		});
		expect(anyMember, "mutation applied").toBe(true);
		expect(declarations(withAny)).toEqual(inventory());
		expect(anyMember && !allowedKernelScalars(withAny)).toBe(true);
	});

	/** Traces: TC-251; FR-031-AC-4. */
	it("keeps EdgeCategory, ConstraintKeyword, and ClauseLanguage equal to the IR schema", async () => {
		const program = await compileGrammar();
		const ir = JSON.parse(
			readFileSync(
				resolve(root, "schema/semantic/v1/semantic-ir.schema.json"),
				"utf8",
			),
		) as JsonObject;
		const defs = object(ir.$defs, "$defs");
		const relationship = object(
			object(object(defs.relationship, "relationship").properties, "props")
				.category,
			"category",
		);
		const keywords = array(object(defs.constraint, "constraint").oneOf, "oneOf")
			.flatMap((variant) =>
				array(
					object(object(object(variant, "v").properties, "p").keyword, "k")
						.enum,
					"enum",
				),
			)
			.map(String)
			.sort();
		const clause = object(
			object(object(defs.clause, "clause").properties, "props").language,
			"language",
		);
		const enums = new Map<string, string[]>();
		let clauseLanguagePattern = "";
		navigateProgram(program, {
			enum(enumeration) {
				if (fullName(enumeration as never) === NAMESPACE)
					enums.set(enumeration.name, [...enumeration.members.keys()].sort());
			},
			scalar(scalar) {
				if (scalar.name === "ClauseLanguage") {
					const pattern = scalar.decorators.find(
						(d) => d.decorator.name === "$pattern",
					);
					clauseLanguagePattern = String(pattern?.args[0]?.jsValue ?? "");
				}
			},
		});
		expect(enums.get("EdgeCategory")).toEqual(
			array(relationship.enum, "categories").map(String).sort(),
		);
		expect(enums.get("ConstraintKeyword")).toEqual(keywords);
		expect(clauseLanguagePattern).toBe(String(clause.pattern));
	});

	/** Traces: TC-252; FR-031-AC-5, FR-031-CON-2. */
	it("types every property except DefaultDecl.value", async () => {
		const program = await compileGrammar();
		const untyped: string[] = [];
		navigateProgram(program, {
			model(model) {
				if (fullName(model as never) !== NAMESPACE) return;
				for (const [name, property] of model.properties) {
					const kind = property.type.kind;
					if (
						kind === "Intrinsic" &&
						(property.type as { name?: string }).name === "unknown"
					)
						untyped.push(`${model.name}.${name}`);
				}
			},
		});
		expect(untyped).toEqual(["DefaultDecl.value"]);
		expect(grammarSource()).not.toMatch(/Record<unknown>/);
	});
});

function allowedKernelScalars(program: Program): boolean {
	const allowed = [
		"UUID",
		"Boolean",
		"Integer",
		"Decimal",
		"String",
		"Timestamp",
		"Duration",
		"Bytes",
		"JsonObject",
		// Issue #21 (the Rust/Serde backend) adds a Rust workspace, its
		// toolchain and formatter pins, the generated-crate goldens, the
		// third-party attribution register and two rendered documents. Each
		// entry is a path that branch writes, enumerated rather than widened,
		// which is the extension NFR-016 states every ticket makes to these
		// cumulative lists. The gate itself still reads a moving `origin/main`,
		// which is issue #51 and not this ticket's to fix.
		".cargo/config.toml",
		"Cargo.toml",
		"Cargo.lock",
		"rust-toolchain.toml",
		"rustfmt.toml",
		"THIRD-PARTY-NOTICES.md",
		".gitignore",
		"crates/",
		"scripts/build-rust-backend-docs.mjs",
		"scripts/build-rust-backend-goldens.mjs",
		"scripts/rust-backend-",
		"docs/semantic-data-system/rust-backend",
		"test/rust-backend.test.ts",
		"test/fixtures/rust-serde/",
		"test/changed-paths.ts",
		"src/compiler/",
		"spec/",
		"plan/",
		"reviews/",
		"Makefile",
		"conformance/",
		"test/",
	];
	let ok = true;
	navigateProgram(program, {
		enum(enumeration) {
			if (enumeration.name === "KernelScalar")
				ok = [...enumeration.members.keys()].every((member) =>
					allowed.includes(member),
				);
		},
	});
	return ok;
}

const schemaDir = resolve(packageRoot, "generated/json-schema");
const fixtureDir = resolve(root, "fixtures/semantic-core");

function readFixture(path: string): unknown {
	return JSON.parse(readFileSync(resolve(fixtureDir, path), "utf8"));
}

function emittedSchemas(): Map<string, JsonObject> {
	return new Map(
		readdirSync(schemaDir)
			.filter((name) => name.endsWith(".json"))
			.sort()
			.map((name) => [
				name.replace(/\.json$/, ""),
				JSON.parse(
					readFileSync(resolve(schemaDir, name), "utf8"),
				) as JsonObject,
			]),
	);
}

function grammarAjv(): Ajv2020 {
	const ajv = new Ajv2020({
		allErrors: true,
		strict: true,
		strictRequired: false,
	});
	addFormats(ajv);
	for (const schema of emittedSchemas().values()) ajv.addSchema(schema);
	return ajv;
}

function validatesModel(ajv: Ajv2020, model: string, value: unknown): boolean {
	const validate = ajv.getSchema(
		`https://schemas.agent-ix.org/semantic-core/0.1.0/${model}.json`,
	);
	if (!validate) throw new Error(`no emitted schema for ${model}`);
	return validate(value) as boolean;
}

function fieldDecls(): JsonObject {
	return object(
		readFixture("positive/config-version-field-decls.json"),
		"FR-006 declarations",
	);
}

function toolchain(): JsonObject {
	return object(
		JSON.parse(
			readFileSync(resolve(packageRoot, "generated/toolchain.json"), "utf8"),
		),
		"toolchain",
	);
}

describe("FR-033 JSON Schema projection and fixtures (Task-043)", () => {
	/** Traces: TC-261; FR-033-AC-1. */
	it("emits one absolute-$id schema per inventory declaration", () => {
		const schemas = emittedSchemas();
		const expected = [
			...inventory().models,
			...inventory().unions,
			...inventory().enums,
			...inventory().scalars,
		].sort();
		expect([...schemas.keys()].sort()).toEqual(expected);
		for (const [name, schema] of schemas) {
			expect(schema.$id, name).toBe(
				`https://schemas.agent-ix.org/semantic-core/0.1.0/${name}.json`,
			);
			if (schema.type === "object") {
				const sealed =
					JSON.stringify(schema.unevaluatedProperties) === '{"not":{}}' ||
					schema.additionalProperties === false;
				expect(sealed, `${name} sealed`).toBe(true);
			}
		}
	});

	/** Traces: TC-262; FR-033-AC-2, US-007-EX-1. */
	it("validates every FR-006 FieldDecl against FieldDecl.json under Ajv strict mode", () => {
		const ajv = grammarAjv();
		const fields = array(fieldDecls().fields, "fields");
		expect(fields.length).toBe(6);
		for (const field of fields)
			expect(
				validatesModel(ajv, "FieldDecl", field),
				JSON.stringify(ajv.errors),
			).toBe(true);
		for (const relation of array(fieldDecls().relations, "relations"))
			expect(
				validatesModel(ajv, "RelationDecl", relation),
				JSON.stringify(ajv.errors),
			).toBe(true);
		for (const clause of array(fieldDecls().clauses, "clauses"))
			expect(
				validatesModel(ajv, "ClauseRef", clause),
				JSON.stringify(ajv.errors),
			).toBe(true);
	});

	/** Traces: TC-263, TC-250; FR-033-AC-3, FR-031-AC-3. */
	it("rejects every negative shape fixture at its model schema, at least one per grammar model", () => {
		const ajv = grammarAjv();
		const covered = new Set<string>();
		for (const name of readdirSync(resolve(fixtureDir, "negative"))
			.filter((n) => n.endsWith(".json"))
			.sort()) {
			const entry = object(readFixture(`negative/${name}`), name);
			const model = String(entry.model);
			expect(
				validatesModel(ajv, model, entry.value),
				`${name}: ${String(entry.reason)}`,
			).toBe(false);
			covered.add(model);
		}
		for (const model of [
			...inventory().models,
			...inventory().unions,
			...inventory().enums,
			...inventory().scalars,
		])
			expect(covered, `negative fixture for ${model}`).toContain(model);
		expect(
			validatesModel(ajv, "ConstraintDecl", { keyword: "mnimum", value: 1 }),
			"twelfth keyword",
		).toBe(false);
		expect(
			validatesModel(ajv, "ConstraintDecl", { keyword: "min", value: 1 }),
		).toBe(true);
	});

	/** Traces: TC-264; FR-033-AC-4, FR-033-CON-1. */
	it("regenerates byte-identically, matches the recorded digest, and fails the check on a mutated byte", () => {
		const first = execFileSync(
			"node",
			["packages/semantic-core/scripts/generate.mjs", "--check"],
			{ cwd: root, encoding: "utf8" },
		);
		expect(first).toContain("up to date");
		const digest = createHash("sha256");
		for (const name of readdirSync(schemaDir)
			.filter((n) => n.endsWith(".json"))
			.sort())
			digest.update(
				`${name}\n${readFileSync(resolve(schemaDir, name), "utf8")}`,
			);
		expect(`sha256:${digest.digest("hex")}`).toBe(toolchain().digest);
		const target = resolve(schemaDir, "EnumValue.json");
		const original = readFileSync(target, "utf8");
		try {
			writeFileSync(
				target,
				original.replace('"type": "object"', '"type": "object" '),
			);
			let failed = false;
			let message = "";
			try {
				execFileSync(
					"node",
					["packages/semantic-core/scripts/generate.mjs", "--check"],
					{ cwd: root, encoding: "utf8", stdio: "pipe" },
				);
			} catch (error) {
				failed = true;
				message = String((error as { stderr?: string }).stderr ?? "");
			}
			expect(failed).toBe(true);
			expect(message).toContain("EnumValue.json");
		} finally {
			writeFileSync(target, original);
		}
	});

	/** Traces: TC-265, TC-266; FR-033-AC-5, FR-033-CON-2. */
	it("pins the toolchain to the lockfile and isolates the #31 normalization", () => {
		const record = toolchain();
		const lock = readFileSync(resolve(root, "pnpm-lock.yaml"), "utf8");
		for (const key of ["compiler", "emitter"]) {
			const entry = object(record[key], key);
			expect(lock).toContain(`${String(entry.name)}@${String(entry.version)}`);
		}
		const normalization = object(record.normalization, "normalization");
		expect(normalization.name).toBe("issue-31-absolute-id");
		expect(normalization.issue).toContain("issues/31");
		expect(normalization.applied).toBe(false);
		expect(String(normalization.note)).toContain("no-op");
		const script = readFileSync(
			resolve(packageRoot, "scripts/generate.mjs"),
			"utf8",
		);
		expect(script.match(/function normalize\(/g)?.length).toBe(1);
		expect(
			script.match(/(?<!function )normalize\(files, base\)/g)?.length,
		).toBe(1);
	});

	/** Traces: TC-259; FR-032-AC-5. */
	it("uses only kernel scalars and semantic references in the FR-006 declaration set", () => {
		const allowed = new Set([
			"UUID",
			"Integer",
			"String",
			"Timestamp",
			"JsonObject",
		]);
		for (const field of array(fieldDecls().fields, "fields").map((value) =>
			object(value, "field"),
		)) {
			const target = String(object(field.type, "type").target);
			expect(allowed.has(target) || target.startsWith("ix://"), target).toBe(
				true,
			);
		}
	});

	/** Traces: TC-253; FR-031-AC-6. */
	it("keeps prior emitted files byte-identical when a model is added at a new minor version", () => {
		const cache = resolve(root, "node_modules/.cache");
		mkdirSync(cache, { recursive: true });
		const dir = mkdtempSync(resolve(cache, "semantic-core-additive-"));
		try {
			cpSync(packageRoot, dir, {
				recursive: true,
				filter: (source) => !source.includes("/generated"),
			});
			const manifest = object(
				JSON.parse(readFileSync(resolve(dir, "package.json"), "utf8")),
				"manifest",
			);
			manifest.version = "0.2.0";
			writeFileSync(
				resolve(dir, "package.json"),
				`${JSON.stringify(manifest, null, "\t")}\n`,
			);
			const source = readFileSync(resolve(dir, "main.tsp"), "utf8")
				.replace("semantic-core/0.1.0/", "semantic-core/0.2.0/")
				.concat(
					"\n/** Added at 0.2.0. */\nmodel AddedDecl {\n  name: Identifier;\n}\n",
				);
			writeFileSync(resolve(dir, "main.tsp"), source);
			const scratch = resolve(dir, "out");
			execFileSync(
				"pnpm",
				[
					"exec",
					"tsp",
					"compile",
					dir,
					"--option",
					`@typespec/json-schema.emitter-output-dir=${scratch}`,
				],
				{ cwd: root, stdio: "pipe" },
			);
			const before = emittedSchemas();
			const afterNames = readdirSync(scratch)
				.filter((n) => n.endsWith(".json"))
				.map((n) => n.replace(/\.json$/, ""))
				.sort();
			expect(afterNames).toEqual([...before.keys(), "AddedDecl"].sort());
			for (const [name, schema] of before) {
				const after = JSON.parse(
					readFileSync(resolve(scratch, `${name}.json`), "utf8").replaceAll(
						"semantic-core/0.2.0/",
						"semantic-core/0.1.0/",
					),
				);
				expect(after, name).toEqual(schema);
			}
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	});
});

describe("FR-032 kernel scalar table and FR-031 grammar reader (Task-044)", () => {
	function scalarTable(): JsonObject {
		return object(
			object(readPackageJson("kernel-scalars.json"), "table").scalars,
			"scalars",
		);
	}

	/** Traces: TC-255, TC-257; FR-032-AC-1, FR-032-AC-3. */
	it("records one non-any representation per KernelScalar member mapped into the IR scalar set", () => {
		const table = scalarTable();
		expect(Object.keys(table).sort()).toEqual([
			"Boolean",
			"Bytes",
			"Decimal",
			"Duration",
			"Integer",
			"JsonObject",
			"String",
			"Timestamp",
			"UUID",
		]);
		const irScalars = new Set([
			"boolean",
			"integer",
			"number",
			"string",
			"bytes",
			"date",
			"datetime",
			"duration",
			"uuid",
		]);
		for (const [name, raw] of Object.entries(table)) {
			const entry = object(raw, name);
			expect(JSON.stringify(entry).toLowerCase()).not.toContain('"any"');
			if (name === "JsonObject") expect(entry.irLowering).toBe("open-record");
			else expect(irScalars.has(String(entry.irScalar)), name).toBe(true);
			expect(typeof entry.unitAllowed).toBe("boolean");
		}
		expect(
			Object.entries(table)
				.filter(([, e]) => object(e, "e").unitAllowed === true)
				.map(([n]) => n)
				.sort(),
		).toEqual(["Decimal", "Duration", "Integer", "Timestamp"]);
	});

	/** Traces: TC-256; FR-032-AC-2. */
	it("rejects Decimal without a policy and a policy on a non-Decimal target", () => {
		for (const id of ["decimal-without-policy", "decimal-on-string"])
			expectRuleFailure(id);
	});

	/** Traces: TC-258; FR-032-AC-4, US-007-EX-3. */
	it("fails the inventory test when Any is added to KernelScalar", async () => {
		const mutated = await compileSource(
			grammarSource().replace("  JsonObject,\n}", "  JsonObject,\n  Any,\n}"),
		);
		expect(allowedKernelScalars(mutated)).toBe(false);
	});

	/** Traces: TC-260; FR-032-CON-1. */
	it("classifies kernel-scalar member changes in the compatibility corpus", () => {
		const cases = array(
			JSON.parse(
				readFileSync(
					resolve(root, "fixtures/semantic/v1/compatibility/cases.json"),
					"utf8",
				),
			),
			"cases",
		).map((v) => object(v, "case"));
		const byId = new Map(cases.map((entry) => [String(entry.id), entry]));
		expect(byId.get("kernel-scalar-member-added")?.expected).toBe("additive");
		expect(byId.get("kernel-scalar-member-removed")?.expected).toBe("breaking");
		expect(byId.get("kernel-scalar-re-represented")?.expected).toBe("breaking");
		for (const id of [
			"kernel-scalar-member-added",
			"kernel-scalar-member-removed",
			"kernel-scalar-re-represented",
		])
			expect(byId.get(id)?.key).toBe("member");
	});

	/** Traces: TC-277; FR-031-AC-7, US-007-EX-4. */
	it("rejects every reader-rule negative at its locus and reads the FR-006 set clean", () => {
		expect(readDeclarations(fieldDecls())).toEqual([]);
		const cases = array(
			readFixture("negative/rules/cases.json"),
			"rule cases",
		).map((v) => object(v, "case"));
		expect(cases.length).toBeGreaterThanOrEqual(14);
		for (const entry of cases) expectRuleFailure(String(entry.id));
	});
});

function expectRuleFailure(id: string): void {
	const entry = array(readFixture("negative/rules/cases.json"), "rule cases")
		.map((v) => object(v, "case"))
		.find((v) => v.id === id);
	if (!entry) throw new Error(`rule case is not recorded: ${id}`);
	const diagnostics = readDeclarations(entry.declarations);
	const hit = diagnostics.find((d) => d.code === entry.code);
	expect(hit, `${id}: ${JSON.stringify(diagnostics)}`).toBeDefined();
	expect(hit?.path, `${id} locus`).toBe(entry.path);
}

describe("FR-034 lowering table, reference lowerer, and lowered fixture (Task-045)", () => {
	const loweredPath = resolve(
		fixtureDir,
		"positive/config-version-lowered.json",
	);
	const irAjv = (() => {
		const ajv = new Ajv2020({
			allErrors: true,
			strict: true,
			strictRequired: false,
		});
		addFormats(ajv);
		const dir = resolve(root, "schema/semantic/v1");
		for (const name of readdirSync(dir).filter((n) =>
			n.endsWith(".schema.json"),
		))
			ajv.addSchema(JSON.parse(readFileSync(resolve(dir, name), "utf8")));
		return ajv;
	})();

	function loweredFromFixture(): JsonObject {
		const bytes = readFileSync(
			resolve(fixtureDir, "positive/config-version-field-decls.json"),
			"utf8",
		);
		return lower(JSON.parse(bytes) as Instance, bytes);
	}

	function committedLowered(): JsonObject {
		if (process.env.SEMANTIC_CORE_WRITE_LOWERED === "1")
			writeFileSync(
				loweredPath,
				`${JSON.stringify(loweredFromFixture(), null, "\t")}\n`,
			);
		return object(
			JSON.parse(readFileSync(loweredPath, "utf8")),
			"lowered fixture",
		);
	}

	function lowerRows(): JsonObject[] {
		return array(
			object(readPackageJson("lowering.json"), "lowering").rows,
			"rows",
		).map((v) => object(v, "row"));
	}

	/** Traces: TC-267, TC-272; FR-034-AC-1, FR-034-CON-1. */
	it("covers every grammar-model property with a loss-free row and fails the gate on a loss row", async () => {
		const rows = lowerRows();
		for (const row of rows)
			expect(row.loss, `${String(row.model)}.${String(row.property)}`).toBe(
				"none",
			);
		const program = await compileGrammar();
		const covered = new Set(
			rows.map((row) => `${String(row.model)}.${String(row.property)}`),
		);
		const missing: string[] = [];
		navigateProgram(program, {
			model(model) {
				if (fullName(model as never) !== NAMESPACE) return;
				for (const name of model.properties.keys())
					if (!covered.has(`${model.name}.${name}`))
						missing.push(`${model.name}.${name}`);
			},
		});
		expect(missing).toEqual([]);
		const gate = (table: JsonObject[]) =>
			table.every((row) => row.loss === "none");
		expect(
			gate([...rows, { model: "TypeRef", property: "unit", loss: "dropped" }]),
			"loss row fails the gate",
		).toBe(false);
	});

	/** Traces: TC-268; FR-034-AC-2. */
	it("mints identities, origins, kernel definitions, and the alias-per-constrained-field on the FR-006 set", () => {
		const document = loweredFromFixture();
		expect(normalize(document)).toBe(normalize(committedLowered()));
		const types = array(document.types, "types").map((v) => object(v, "type"));
		const byName = new Map(
			types.map((type) => [String(type.displayName), type]),
		);
		expect([...byName.keys()].sort()).toEqual([
			"ConfigVersion",
			"ConfigVersionVersionNumber",
			"Integer",
			"JsonObject",
			"String",
			"Timestamp",
			"UUID",
		]);
		expect(byName.get("ConfigVersion")?.identity).toBe(
			"ix://agent-ix/config-service/type/ConfigVersion",
		);
		const alias = object(byName.get("ConfigVersionVersionNumber"), "alias");
		expect(alias.kind).toBe("alias");
		expect(alias.target).toBe("ix://agent-ix/config-service/type/Integer");
		const constraint = object(
			array(alias.constraints, "constraints")[0],
			"constraint",
		);
		expect(constraint).toMatchObject({
			keyword: "min",
			operands: { value: 1 },
			appliesTo: alias.identity,
			diagnosticCode: "agent-ix.config-service.CONFIGVERSION_VERSIONNUMBER_MIN",
		});
		const kernel = object(byName.get("UUID"), "UUID");
		expect(array(kernel.extensions, "ext")[0]).toMatchObject({
			identity: "ix://agent-ix/semantic-core/ext/kernel-scalar",
			payload: { name: "UUID" },
		});
		expect(object(byName.get("JsonObject"), "JsonObject")).toMatchObject({
			kind: "record",
			fields: [],
			unknownPolicy: "preserve",
		});
		const entity = object(byName.get("ConfigVersion"), "entity");
		const id = object(array(entity.fields, "fields")[0], "id");
		expect(id.identity).toBe(
			"ix://agent-ix/config-service/field/ConfigVersion-id",
		);
		expect(
			array(id.extensions, "ext").map((e) => object(e, "e").identity),
		).toContain("ix://agent-ix/semantic-core/ext/identity");
		expect(object(id.origin, "origin")).toHaveProperty("source");
		const clause = object(array(entity.clauses, "clauses")[0], "clause");
		expect(String(clause.text)).toContain("@pre");
	});

	/** Traces: TC-268; FR-034-AC-2 (enum kind: EnumValue.doc lands on the enum definition). */
	it("lowers an enum-kind instance with documented values onto the enum definition", () => {
		const instance: Instance = {
			name: "Status",
			kind: "enum",
			package: "agent-ix/config-service",
			sourceLocus: {
				sourceIdentity: "ix://agent-ix/config-service/spec",
				path: "spec/functional/FR-009-status.md",
				startLine: 1,
				startColumn: 1,
			},
			enumValues: [
				{ value: "draft", doc: "Not yet published." },
				{ value: "final" },
			],
		};
		expect(readDeclarations(instance)).toEqual([]);
		const document = lower(instance, "enum");
		const validate = irAjv.getSchema(
			"https://schemas.agent-ix.org/filament-core-data/v1/semantic-ir.schema.json",
		);
		expect(validate?.(document), JSON.stringify(validate?.errors)).toBe(true);
		expect(readSemanticIr(document)).toEqual([]);
		const status = object(
			array(document.types, "types")
				.map((v) => object(v, "type"))
				.find((t) => t.displayName === "Status"),
			"Status",
		);
		expect(status.kind).toBe("enum");
		expect(
			array(status.variants, "variants").map((v) => object(v, "v").name),
		).toEqual(["draft", "final"]);
		expect(array(status.extensions, "ext")).toEqual([
			expect.objectContaining({
				identity: "ix://agent-ix/semantic-core/ext/doc",
				payload: { value: "draft", text: "Not yet published." },
			}),
		]);
		for (const variant of array(status.variants, "variants"))
			expect(object(variant, "v")).not.toHaveProperty("extensions");
	});

	/** Traces: TC-279; FR-034-AC-2. */
	it("validates the lowered document as 1.1.0 with both IR readers", () => {
		const document = committedLowered();
		const validate = irAjv.getSchema(
			"https://schemas.agent-ix.org/filament-core-data/v1/semantic-ir.schema.json",
		);
		expect(validate?.(document), JSON.stringify(validate?.errors)).toBe(true);
		const exportsFromLock = ["ix://agent-ix/config-service/type/ConfigOverlay"];
		expect(readSemanticIr(document, exportsFromLock)).toEqual([]);
		const python = execFileSync(
			"poetry",
			[
				"run",
				"python",
				"tests/semantic_ir_reader.py",
				"--read",
				loweredPath,
				"--export",
				exportsFromLock[0] as string,
			],
			{ cwd: root, encoding: "utf8" },
		);
		const verdict = object(JSON.parse(python), "python verdict");
		expect(verdict.schemaValid).toBe(true);
		expect(verdict.diagnostics).toEqual([]);
	});

	/** Traces: TC-269; FR-034-AC-3. */
	it("matches the issue #34 ConfigVersion fixture structurally, ignoring minted identities and semantic-core extensions", () => {
		const reference = object(
			JSON.parse(
				readFileSync(
					resolve(
						root,
						"fixtures/semantic/v1/positive/config-version-v1-1.json",
					),
					"utf8",
				),
			),
			"reference",
		);
		const shape = (document: JsonObject) => {
			const types = array(document.types, "types").map((v) =>
				object(v, "type"),
			);
			const entity = object(
				types.find((t) => t.displayName === "ConfigVersion"),
				"ConfigVersion",
			);
			const nameOf = (identity: unknown) => String(identity).split("/").pop();
			return {
				fields: array(entity.fields, "fields").map((f) => {
					const field = object(f, "field");
					return {
						name: field.name,
						multiplicity: field.multiplicity,
						unit: field.unit ?? null,
						nullable: field.nullable,
					};
				}),
				relationships: array(entity.relationships, "rels").map((r) => {
					const rel = object(r, "rel");
					return {
						verb: rel.verb,
						category: rel.category,
						target: nameOf(rel.target),
						multiplicity: rel.multiplicity,
					};
				}),
				constraints: types
					.flatMap((t) =>
						array(t.constraints, "c").map((c) => {
							const constraint = object(c, "c");
							return {
								keyword: constraint.keyword,
								operands: constraint.operands,
							};
						}),
					)
					.sort((a, b) => String(a.keyword).localeCompare(String(b.keyword))),
				clauses: array(entity.clauses, "clauses").map((c) => {
					const clause = object(c, "clause");
					return {
						language: clause.language,
						clauseId: clause.clauseId,
						text: clause.text,
					};
				}),
			};
		};
		expect(shape(committedLowered())).toEqual(shape(reference));
	});

	/** Traces: TC-270; FR-034-AC-4. */
	it("accepts UCUM-charset unit symbols and rejects whitespace, empty, and non-ASCII", () => {
		const ajv = grammarAjv();
		for (const unit of ["kg", "m/s", "ms", "10*3.m"])
			expect(validatesModel(ajv, "UnitSymbol", unit), unit).toBe(true);
		for (const unit of ["", "k g", "kg²"])
			expect(
				validatesModel(ajv, "UnitSymbol", unit),
				JSON.stringify(unit),
			).toBe(false);
	});

	/** Traces: TC-271; FR-034-AC-5, US-007-EX-2. */
	it("lowers a Decimal field with the decimal extension and no loss", () => {
		const instance = JSON.parse(
			readFileSync(
				resolve(fixtureDir, "positive/config-version-field-decls.json"),
				"utf8",
			),
		) as Instance;
		(instance.fields as JsonObject[]).push({
			name: "price",
			type: {
				target: "Decimal",
				multiplicity: { lower: 1, upper: 1 },
				decimal: { precision: 10, scale: 2 },
				unit: "USD",
			},
		});
		expect(readDeclarations(instance)).toEqual([]);
		const document = lower(instance, "decimal");
		const entity = object(
			array(document.types, "types")
				.map((v) => object(v, "type"))
				.find((t) => t.displayName === "ConfigVersion"),
			"entity",
		);
		const price = object(
			array(entity.fields, "fields").find(
				(f) => object(f, "f").name === "price",
			),
			"price",
		);
		expect(price.typeRef).toBe("ix://agent-ix/config-service/type/Decimal");
		expect(price.unit).toBe("USD");
		const decimal = array(price.extensions, "ext")
			.map((e) => object(e, "e"))
			.find((e) => e.identity === "ix://agent-ix/semantic-core/ext/decimal");
		expect(decimal).toMatchObject({
			required: true,
			payload: { precision: 10, scale: 2 },
		});
		expect(
			readSemanticIr(document, [
				"ix://agent-ix/config-service/type/ConfigOverlay",
			]),
		).toEqual([]);
		expect(
			lowerRows().find((r) => r.model === "TypeRef" && r.property === "decimal")
				?.loss,
		).toBe("none");
	});
});
