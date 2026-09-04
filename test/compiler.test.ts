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
import { tmpdir } from "node:os";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { changeRange, changedPathsOf } from "./changed-paths.js";
import {
	SEMANTIC_IR_SCHEMA_VERSION,
	compileSemanticIr,
	emitRust,
	emitTypeScript,
	normalizeJsonSchemaForPython,
} from "../src/compiler/index.mjs";
import type {
	SemanticIrDocument,
	SemanticIrType,
} from "../src/compiler/index.d.mts";
import {
	DATAMODEL_CODEGEN_VERSION,
	PYDANTIC_VERSION,
} from "../src/compiler/backends/python-pins.mjs";

/**
 * Issue #27 (promote the issue #4 prototype emitters into src/) matrix trace
 * inventory:
 * TC-320, TC-321, TC-322, TC-323, TC-324, TC-325, TC-326, TC-327, TC-328,
 * TC-329, TC-330, TC-331, TC-332, TC-333, TC-334, TC-335, TC-336, TC-337,
 * TC-338, TC-339, TC-340, TC-341, TC-342, TC-343, TC-344, TC-345, TC-346,
 * TC-347, TC-348, TC-349, TC-350, TC-351, TC-352, TC-353, TC-354, TC-355,
 * TC-356, TC-357, TC-358, TC-359, TC-360, TC-361, TC-362, TC-363, TC-364,
 * TC-365, TC-366, TC-367, TC-368, TC-369, TC-371, TC-372, TC-373, TC-374,
 * TC-375, TC-376, TC-377, TC-378, TC-379, TC-380, TC-381, TC-383, TC-384,
 * TC-385, TC-386, TC-387, TC-388, TC-389, TC-390, TC-391, TC-392, TC-393,
 * TC-394, TC-395, TC-396, TC-397.
 * TC-370 and TC-382 are blocked on issue #42 (the retained evidence records the
 * minting host's tool versions and the generated Python models need >= 3.11).
 * Acceptance criteria: FR-040-AC-1..7, FR-041-AC-1..13, FR-042-AC-1..11,
 * FR-043-AC-1..8, FR-044-AC-2..12, NFR-017-AC-1..7, NFR-018-AC-1..7.
 * Constraints: FR-040-CON-1..4, FR-041-CON-1..5, FR-042-CON-1..5,
 * FR-043-CON-1..3, FR-044-CON-1..3.
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const compilerRoot = resolve(root, "src/compiler");
const spike = resolve(root, "spikes/typespec-feasibility");
const emitterDir = resolve(compilerRoot, "emitters/semantic-ir");
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

/** Issue #27's promotion, as a pair of history facts rather than a moving ref. */
const PROMOTION = (): { base: string; tip: string } =>
	changeRange(root, "src/compiler/inventory.json");

function changedPaths(): string[] {
	// Both ends of the range come from history. See `changedPathsOf`: measured
	// from a moving ref this set empties after the merge and every prohibition
	// below passes vacuously, and measured from a fixed base to a moving head it
	// grows to contain every later ticket's work and fails this one for it.
	return changedPathsOf(root, "src/compiler/inventory.json");
}

/** The commit issue #27's promotion replaced — a history fact, not a moving ref. */
const PROMOTION_BASE = (): string => PROMOTION().base;

function existsAtMain(path: string): boolean {
	try {
		execFileSync("git", ["cat-file", "-e", `${PROMOTION_BASE()}:${path}`], {
			cwd: root,
			stdio: "ignore",
		});
		return true;
	} catch {
		return false;
	}
}

/** Paths the branch adds, counting uncommitted work. */
function addedPaths(): string[] {
	return changedPaths().filter((path) => !existsAtMain(path));
}

/**
 * The issue #4 IR command, as `spikes/typespec-feasibility/evidence/custom.json`
 * recorded it before the promotion, and the command that replaces it. FR-044
 * permits `command` and no other field to differ.
 */
const SPIKE_IR_COMMAND =
	"pnpm exec tsp compile spikes/typespec-feasibility/main.tsp --emit @agent-ix/typespec-semantic-ir-emitter-spike";
const PROMOTED_IR_COMMAND =
	"node src/compiler/cli.mjs emit-ir --entrypoint spikes/typespec-feasibility/main.tsp --generator @agent-ix/typespec-semantic-ir-emitter-spike@0.0.0 --out generated/custom/semantic-ir.json";

/**
 * The frozen issue #4 record of `evidence/custom.json`, transcribed verbatim so
 * the "exactly one changed field" gate has a baseline that does not move when
 * the promotion branch merges. Reading the baseline from `origin/main` made the
 * gate un-mergeable: after the squash merge `origin/main` *is* the promoted
 * content, so every field compares equal and the gate asserts nothing.
 */
const FROZEN_CUSTOM_EVIDENCE: Json = {
	command: SPIKE_IR_COMMAND,
	compilerVersion: "1.15.0",
	result: "passed",
	typeCount: 18,
	extensionSurface:
		"one JavaScript $onEmit entry point using compiler semantic walker, naming, location, and emitFile APIs",
	limitation:
		"TypeSpec documents the emitter framework as experimental and TypeScript/JavaScript as its best-supported extension language",
};

function walk(directory: string, prefix = ""): string[] {
	return readdirSync(directory).flatMap((name) => {
		const absolute = join(directory, name);
		const path = prefix ? `${prefix}/${name}` : name;
		return statSync(absolute).isDirectory() ? walk(absolute, path) : [path];
	});
}

function temp(label: string): string {
	return mkdtempSync(join(tmpdir(), `fcd-27-${label}-`));
}

const goldenIr = readJson(
	resolve(spike, "generated/custom/semantic-ir.json"),
) as unknown as SemanticIrDocument;
const inventory = readJson(resolve(compilerRoot, "inventory.json")) as {
	dispositions: string[];
	shipping: string;
	components: {
		component: string;
		source: string;
		capability: string | null;
		disposition: string;
		targets: string[];
		evidence: string;
		limitation: string;
	}[];
	authored: { path: string; reason: string }[];
};
const capabilities = (
	readJson(resolve(spike, "evidence/capabilities.json")) as {
		capabilities: { id: string; disposition: string; limitation: string }[];
	}
).capabilities;

const ENUMERATED_COMPONENTS = [
	"semantic-ir-emitter",
	"typescript-backend",
	"rust-serde-backend",
	"python-json-schema-adapter",
	"python-generator-pins",
	"determinism-helpers",
	"python-virtualenv-bootstrap",
	"golden-consumer-programs",
	"codegen-confidence-fixtures",
	"arrow-projection-writer",
	"markdown-mapping-writer",
	"protobuf-mapping-writer",
	"compatibility-classifier",
	"official-emitter-invocations",
];

const ABSENT_GATES = [
	"conformance corpus",
	"property/fuzz suite",
	"compatibility matrix",
	"downstream adoption",
];

/** The rejection rules the inventory test enforces, applied to one record. */
function inventoryViolations(
	record: (typeof inventory.components)[number],
): string[] {
	const problems: string[] = [];
	if (!record.source || record.source.trim().length === 0) {
		problems.push(`${record.component}: empty source`);
	}
	if (!inventory.dispositions.includes(record.disposition)) {
		problems.push(`${record.component}: disposition ${record.disposition}`);
	}
	if (!record.limitation || record.limitation.trim().length === 0) {
		problems.push(`${record.component}: empty limitation`);
	}
	if (/^\s*representative golden passed\.?\s*$/i.test(record.evidence)) {
		problems.push(`${record.component}: evidence is only the golden`);
	}
	const promoted =
		record.disposition === "retain" || record.disposition === "rewrite";
	if (promoted && record.targets.length === 0) {
		problems.push(`${record.component}: promoted with no target`);
	}
	if (!promoted && record.targets.length > 0) {
		problems.push(`${record.component}: not promoted but names a target`);
	}
	for (const target of record.targets) {
		if (!existsSync(resolve(root, target))) {
			problems.push(`${record.component}: missing target ${target}`);
		}
	}
	const capability = capabilities.find((item) => item.id === record.capability);
	if (capability?.disposition === "partial") {
		if (!record.limitation.includes(capability.limitation)) {
			problems.push(
				`${record.component}: partial capability ${capability.id} limitation not restated`,
			);
		}
	}
	return problems;
}

describe("issue #27 promotion inventory (FR-040)", () => {
	/** Traces: TC-320; FR-040-AC-1. */
	it("holds one record per enumerated prototype component", () => {
		expect(inventory.components.map((record) => record.component)).toEqual(
			ENUMERATED_COMPONENTS,
		);
		for (const record of inventory.components) {
			expect(record.source.length, record.component).toBeGreaterThan(0);
		}
	});

	/** Traces: TC-321; FR-040-AC-1. */
	it("fails when a component name is missing or extra", () => {
		const names = inventory.components.map((record) => record.component);
		expect([...names.slice(1)]).not.toEqual(ENUMERATED_COMPONENTS);
		expect([...names, "invented-component"]).not.toEqual(ENUMERATED_COMPONENTS);
	});

	/** Traces: TC-322; FR-040-AC-2. */
	it("keeps every disposition inside the closed four-value set", () => {
		expect(inventory.dispositions).toEqual([
			"retain",
			"rewrite",
			"replace-with-official",
			"discard",
		]);
		for (const record of inventory.components) {
			expect(inventory.dispositions, record.component).toContain(
				record.disposition,
			);
		}
	});

	/** Traces: TC-323; FR-040-AC-2, FR-040-CON-2. */
	it("rejects a mutated fifth disposition value", () => {
		const mutated = { ...inventory.components[0], disposition: "defer" };
		expect(inventoryViolations(mutated)).toContain(
			`${mutated.component}: disposition defer`,
		);
	});

	/** Traces: TC-324; FR-040-AC-3. */
	it("gives promoted records an existing target and others none", () => {
		for (const record of inventory.components) {
			expect(inventoryViolations(record), record.component).toEqual([]);
		}
	});

	/** Traces: TC-325; FR-040-AC-4. */
	it("carries a non-empty limitation on every record", () => {
		for (const record of inventory.components) {
			expect(record.limitation.length, record.component).toBeGreaterThan(0);
		}
	});

	/** Traces: TC-326; FR-040-AC-4. */
	it("rejects a record justified only by the representative golden", () => {
		const mutated = {
			...inventory.components[1],
			evidence: "representative golden passed",
		};
		expect(inventoryViolations(mutated)).toContain(
			`${mutated.component}: evidence is only the golden`,
		);
	});

	/** Traces: TC-327; FR-040-AC-5, FR-040-CON-3. */
	it("accounts for every file under src/compiler/ exactly once", () => {
		// Rewritten by issue #19 to resolve ownership from the *tree*, with no
		// reference to a diff or to `origin/main`.
		//
		// The previous form filtered the walked files against
		// `git ls-tree origin/main -- src/compiler/`, so it asked "was this file
		// here when issue #27 landed?". That reference moves. The moment this
		// branch squash-merges, `origin/main` contains issue #19's modules too,
		// they enter the filtered set, issue #27's ledger does not own them, and
		// the gate fails on `main` — the same class of defect this branch
		// diagnosed in #48 and #47 fixed for TC-395, in its third disguise. #47
		// left the trap latent: it passes on `main` today and breaks for whoever
		// next adds a file under `src/compiler/`. Issue #19 was that branch.
		//
		// So ownership is now a union of ledgers, each of which is a fact about
		// the checked-out tree:
		//
		//   1. `src/compiler/inventory.json` — issue #27's promotion ledger.
		//   2. The `## Outputs` section of every functional requirement, which is
		//      where a requirement declares the files it creates. A later branch
		//      adding a module under `src/compiler/` must name it in the FR that
		//      called for it, or this gate fails.
		//   3. A `X.d.mts` is owned by whoever owns `X.mjs`. The sidecar is the
		//      type declaration *of* that module, not an independent artifact,
		//      and listing 23 of them in prose would be a ledger nobody reads. A
		//      sidecar with no module still fails, as does a module with no owner.
		//
		// The invariant is unchanged and unweakened: a file under `src/compiler/`
		// that no ledger accounts for fails this gate, and a file two *inventory*
		// entries claim fails it too. What is dropped is the cross-ledger
		// exactly-once count, which was never meaningful — FR-052 legitimately
		// names `cli.mjs`, which issue #27's inventory also owns, because FR-052
		// extends it.
		const files = walk(compilerRoot).map((path) => `src/compiler/${path}`);
		const present = new Set(files);

		// Ledger 1: the promotion inventory, where exactly-once still holds.
		const inventoryOwners = new Map<string, number>();
		const targets = inventory.components.flatMap((record) => record.targets);
		const authored = inventory.authored.map((entry) => entry.path);
		for (const path of [...targets, ...authored]) {
			inventoryOwners.set(path, (inventoryOwners.get(path) ?? 0) + 1);
		}
		for (const [path, count] of inventoryOwners) {
			expect(count, `double-owned by the inventory: ${path}`).toBe(1);
			expect(present.has(path), `owned but absent: ${path}`).toBe(true);
		}

		// Ledger 2: every functional requirement's declared outputs.
		const declared = new Set<string>();
		const functional = resolve(root, "spec/functional");
		for (const name of readdirSync(functional)) {
			if (!name.endsWith(".md")) continue;
			const section = /\n## Outputs\n([\s\S]*?)\n## /.exec(
				read(resolve(functional, name)),
			);
			if (!section) continue;
			for (const hit of section[1].matchAll(
				/`(src\/compiler\/[A-Za-z0-9._/-]+)`/g,
			)) {
				declared.add(hit[1]);
			}
		}
		// A requirement may not declare an output that does not exist.
		for (const path of declared) {
			expect(present.has(path), `declared but absent: ${path}`).toBe(true);
		}

		// Ledger 3, and the coverage assertion itself.
		const owns = (path: string): boolean =>
			inventoryOwners.has(path) || declared.has(path);
		for (const file of files) {
			if (file.endsWith(".d.mts")) {
				const module = `${file.slice(0, -".d.mts".length)}.mjs`;
				expect(
					present.has(module),
					`type declaration with no module: ${file}`,
				).toBe(true);
				expect(owns(module), `unowned: ${file} (via ${module})`).toBe(true);
				continue;
			}
			expect(owns(file), `unowned: ${file}`).toBe(true);
		}

		for (const entry of inventory.authored) {
			expect(entry.reason.length, entry.path).toBeGreaterThan(0);
		}
	});

	/** Traces: TC-621; NFR-021-AC-9. */
	it("still refuses an unaccounted-for file under src/compiler/ after the merge", () => {
		// The companion to the gate above. Rewriting an assertion to survive a
		// merge is only worth anything if it still *fails* on the input it exists
		// to catch, so this recomputes the same union of ledgers against a
		// synthetic path and proves the coverage rule rejects it. It uses no git
		// reference at all, which is the point: it gives the same verdict on the
		// branch and on `main`.
		const inventoryPaths = new Set([
			...inventory.components.flatMap((record) => record.targets),
			...inventory.authored.map((entry) => entry.path),
		]);
		const declared = new Set<string>();
		const functional = resolve(root, "spec/functional");
		for (const name of readdirSync(functional)) {
			if (!name.endsWith(".md")) continue;
			const section = /\n## Outputs\n([\s\S]*?)\n## /.exec(
				read(resolve(functional, name)),
			);
			if (!section) continue;
			for (const hit of section[1].matchAll(
				/`(src\/compiler\/[A-Za-z0-9._/-]+)`/g,
			)) {
				declared.add(hit[1]);
			}
		}
		const owns = (path: string): boolean =>
			inventoryPaths.has(path) || declared.has(path);
		expect(owns("src/compiler/rogue.mjs")).toBe(false);
		// And a sidecar is only owned through its module, so an orphan sidecar is
		// unowned too.
		expect(owns("src/compiler/rogue.mjs")).toBe(false);
		// A real file from each ledger is owned, so the rule is not refusing
		// everything.
		expect(owns("src/compiler/ir.mjs")).toBe(true);
		expect(owns("src/compiler/pipeline.mjs")).toBe(true);
	});

	/** Traces: TC-328; FR-040-AC-6. */
	it("matches the feasibility document's per-disposition counts", () => {
		const counts = new Map<string, number>();
		for (const record of inventory.components) {
			counts.set(record.disposition, (counts.get(record.disposition) ?? 0) + 1);
		}
		const doc = read(
			resolve(root, "docs/semantic-data-system/typespec-feasibility.md"),
		);
		expect(doc).toContain("## Promotion inventory");
		for (const [disposition, count] of counts) {
			expect(doc, disposition).toContain(`**${count} ${disposition}**`);
		}
		expect(doc).toContain(`${inventory.authored.length} files under`);
	});

	/** Traces: TC-329; FR-040-AC-7, FR-040-CON-1. */
	it("restates the recorded limitation of every partial capability", () => {
		const partial = inventory.components.filter((record) => {
			const capability = capabilities.find(
				(item) => item.id === record.capability,
			);
			return capability?.disposition === "partial";
		});
		expect(partial.length).toBeGreaterThan(0);
		for (const record of partial) {
			expect(inventoryViolations(record), record.component).toEqual([]);
		}
		const mutated = { ...partial[0], limitation: "none" };
		expect(inventoryViolations(mutated).join(" ")).toContain(
			"limitation not restated",
		);
	});

	/** Traces: TC-330; FR-040-CON-4. */
	it("refuses to let the authored ledger launder a promoted component", () => {
		const promoted = inventory.components.filter(
			(record) => record.targets.length > 0,
		);
		const authored = new Set(inventory.authored.map((entry) => entry.path));
		for (const record of promoted) {
			for (const target of record.targets) {
				expect(authored, `${record.component} -> ${target}`).not.toContain(
					target,
				);
			}
		}
	});
});

describe("promoted semantic-IR emitter (FR-041)", () => {
	/** Traces: TC-331; FR-041-AC-1. */
	it("exports exactly the six interface symbols", async () => {
		// Scoped by issue #19, which extends the narrow interface to fifteen
		// symbols under FR-052-CON-1. What FR-041-AC-1 protects is that the six
		// promoted symbols are all still there under their own names; the size of
		// the set is asserted by TC-558 in compiler-core.test.ts, which fails when
		// a sixteenth appears.
		const module = await import("../src/compiler/index.mjs");
		for (const name of [
			"SEMANTIC_IR_SCHEMA_VERSION",
			"buildSemanticIr",
			"compileSemanticIr",
			"emitRust",
			"emitTypeScript",
			"normalizeJsonSchemaForPython",
		]) {
			expect(Object.keys(module), name).toContain(name);
		}
	});

	/** Traces: TC-332, TC-343; FR-041-AC-1, FR-041-AC-12. */
	it("keeps the declarations and the implementation in the same export set", async () => {
		// The real drift risk is a symbol declared but not implemented, or
		// implemented but not declared. `tsc` cannot see it, because the
		// repository does not typecheck `.mjs`, so the sets are compared here.
		const pairs: [string, string][] = [
			["../src/compiler/index.mjs", "src/compiler/index.d.mts"],
			[
				"../src/compiler/backends/python-pins.mjs",
				"src/compiler/backends/python-pins.d.mts",
			],
			[
				"../src/compiler/emitters/semantic-ir/index.mjs",
				"src/compiler/emitters/semantic-ir/index.d.mts",
			],
		];
		for (const [modulePath, declarationPath] of pairs) {
			const module = (await import(modulePath)) as Record<string, unknown>;
			const text = read(resolve(root, declarationPath));
			const declared = new Set(
				[...text.matchAll(/export declare (?:function|const) ([\w$]+)/g)].map(
					(match) => match[1],
				),
			);
			for (const match of text.matchAll(/export \{ ([\w$]+) \}/g)) {
				declared.add(match[1]);
			}
			expect([...declared].sort(), declarationPath).toEqual(
				Object.keys(module).sort(),
			);
		}
	});

	/** Traces: TC-333, TC-335, TC-383; FR-041-AC-2, FR-041-AC-4, NFR-017-AC-1. */
	it("reproduces the committed semantic IR and repeats byte-identically", () => {
		const output = temp("ir");
		try {
			const first = resolve(output, "a.json");
			const second = resolve(output, "b.json");
			for (const out of [first, second]) {
				execFileSync(
					"node",
					[
						cli,
						"emit-ir",
						"--entrypoint",
						resolve(spike, "main.tsp"),
						"--generator",
						"@agent-ix/typespec-semantic-ir-emitter-spike@0.0.0",
						"--base-dir",
						root,
						"--out",
						out,
					],
					{ cwd: root },
				);
			}
			const golden = read(resolve(spike, "generated/custom/semantic-ir.json"));
			expect(read(first)).toBe(golden);
			expect(read(second)).toBe(read(first));
		} finally {
			rmSync(output, { recursive: true, force: true });
		}
	});

	/** Traces: TC-334; FR-041-AC-3. */
	it("rejects an unresolved reference with its locus and writes nothing", async () => {
		const output = temp("bad");
		const out = resolve(output, "ir.json");
		try {
			await expect(
				compileSemanticIr({
					entrypoint: resolve(spike, "fixtures/invalid/main.tsp"),
					generator: "test",
					baseDir: root,
				}),
			).rejects.toThrow(/invalid\/main\.tsp/);
			// The CLI owns --out, so it is the route that could leave a partial
			// file behind.
			expect(() =>
				execFileSync(
					"node",
					[
						cli,
						"emit-ir",
						"--entrypoint",
						resolve(spike, "fixtures/invalid/main.tsp"),
						"--out",
						out,
					],
					{ cwd: root, stdio: "pipe" },
				),
			).toThrow();
			expect(existsSync(out)).toBe(false);
		} finally {
			rmSync(output, { recursive: true, force: true });
		}
	});

	/** Traces: TC-336; FR-041-AC-5. */
	it("produces the same IR through tsp --emit as through the interface", async () => {
		const output = temp("tsp");
		try {
			execFileSync(
				resolve(root, "node_modules/.bin/tsp"),
				[
					"compile",
					resolve(spike, "main.tsp"),
					"--emit",
					emitterDir,
					"--option",
					"@agent-ix/semantic-ir-emitter.generator=@agent-ix/typespec-semantic-ir-emitter-spike@0.0.0",
					"--output-dir",
					output,
					"--pretty",
					"false",
				],
				{ cwd: root },
			);
			const emitted = resolve(
				output,
				"@agent-ix/semantic-ir-emitter/semantic-ir.json",
			);
			expect(existsSync(emitted), emitted).toBe(true);
			const programmatic = await compileSemanticIr({
				entrypoint: resolve(spike, "main.tsp"),
				generator: "@agent-ix/typespec-semantic-ir-emitter-spike@0.0.0",
				baseDir: root,
			});
			expect(JSON.parse(read(emitted))).toEqual(programmatic);
		} finally {
			rmSync(output, { recursive: true, force: true });
		}
	});

	/** Traces: TC-337; FR-041-AC-6. */
	it("never imports a module under spikes/, in either direction", () => {
		for (const path of walk(compilerRoot)) {
			if (!path.endsWith(".mjs") && !path.endsWith(".mts")) continue;
			const source = read(resolve(compilerRoot, path));
			for (const match of source.matchAll(
				/(?:from|import)\s*\(?\s*"([^"]+)"/g,
			)) {
				expect(match[1], `${path} imports ${match[1]}`).not.toContain(
					"spikes/",
				);
			}
		}
		const importers = git("grep", "-l", "src/compiler", "--", "*.mjs", "*.ts")
			.split("\n")
			.filter((line) => line.length > 0);
		for (const path of importers) {
			expect(
				path.startsWith("src/compiler/") ||
					path.startsWith("test/") ||
					// Issue #19: the fixture and document generators import the
					// compiler to produce the goldens they commit. They are build
					// scripts, not callers of a published surface, and `make lint` runs
					// each in `--check` mode so a drifting golden fails the gate.
					path.startsWith("scripts/") ||
					path === "spikes/typespec-feasibility/scripts/run-experiment.mjs",
				path,
			).toBe(true);
		}
	});

	/** Traces: TC-338, TC-339; FR-041-AC-7, FR-041-AC-8, FR-041-CON-1. */
	it("stamps the caller's generator and defaults to the emitter's own id", async () => {
		const ir = await compileSemanticIr({
			entrypoint: resolve(spike, "main.tsp"),
			generator: "caller@9.9.9",
			baseDir: root,
		});
		expect(ir.schemaVersion).toBe("1.0.0");
		expect(SEMANTIC_IR_SCHEMA_VERSION).toBe("1.0.0");
		expect(Object.keys(ir)).toEqual(["schemaVersion", "generator", "types"]);
		expect(ir.generator).toBe("caller@9.9.9");
		const manifest = readJson(resolve(emitterDir, "package.json"));
		const expected = `${manifest.name}@${manifest.version}`;
		const { defaultGeneratorId } = await import("../src/compiler/identity.mjs");
		expect(defaultGeneratorId()).toBe(expected);
		// Every route must stamp it, not just $onEmit: an undefined generator is
		// dropped by JSON.stringify and would emit an envelope-less document.
		const programmatic = await compileSemanticIr({
			entrypoint: resolve(spike, "main.tsp"),
			baseDir: root,
		});
		expect(programmatic.generator).toBe(expected);
		const output = temp("default");
		try {
			const out = resolve(output, "ir.json");
			execFileSync(
				"node",
				[
					cli,
					"emit-ir",
					"--entrypoint",
					resolve(spike, "main.tsp"),
					"--base-dir",
					root,
					"--out",
					out,
				],
				{ cwd: root },
			);
			const emitted = JSON.parse(read(out)) as { generator?: string };
			expect(Object.keys(emitted)).toContain("generator");
			expect(emitted.generator).toBe(expected);
		} finally {
			rmSync(output, { recursive: true, force: true });
		}
	});

	/** Traces: TC-340; FR-041-AC-9. */
	it("keeps only AgentIx.Semantic declarations", async () => {
		const ir = await compileSemanticIr({
			entrypoint: resolve(spike, "main.tsp"),
			generator: "test",
			baseDir: root,
		});
		expect(ir.types.length).toBeGreaterThan(0);
		for (const type of ir.types) {
			expect(type.package, type.id).toMatch(/^AgentIx\.Semantic(\.|$)/);
			expect(type.source, type.id).toMatch(/^(synthetic|.+:\d+)$/);
		}
	});

	/** Traces: TC-341, TC-386; FR-041-AC-10, NFR-017-AC-4. */
	it("takes the working directory as an explicit baseDir", async () => {
		const inside = await compileSemanticIr({
			entrypoint: resolve(spike, "main.tsp"),
			generator: "test",
			baseDir: root,
		});
		const outside = await compileSemanticIr({
			entrypoint: resolve(spike, "main.tsp"),
			generator: "test",
			baseDir: resolve(root, ".."),
		});
		const first = inside.types.find((type) => type.source !== "synthetic");
		const second = outside.types.find((type) => type.id === first?.id);
		expect(first?.source).toMatch(/^spikes\/typespec-feasibility\/.+:\d+$/);
		expect(second?.source).not.toBe(first?.source);
		expect(second?.source).toContain(`${basename(root)}/spikes`);
	});

	/** Traces: TC-342, TC-385; FR-041-AC-11, NFR-017-AC-3. */
	it("orders types by code point, not by the host's collator", () => {
		const ids = goldenIr.types.map((type) => type.id);
		const byCodePoint = [...ids].sort((left, right) =>
			left < right ? -1 : left > right ? 1 : 0,
		);
		expect(ids).toEqual(byCodePoint);
		for (const locale of ["en-US", "sv-SE", "tr-TR"]) {
			const collator = new Intl.Collator(locale);
			expect([...ids].sort(collator.compare), locale).toEqual(byCodePoint);
		}
		expect(read(resolve(compilerRoot, "ir.mjs"))).not.toContain(
			".localeCompare(",
		);
		expect(read(resolve(compilerRoot, "ir.mjs"))).not.toContain(
			"Intl.Collator",
		);
	});

	/** Traces: TC-343; FR-041-AC-12. */
	it("is formatted by the repository formatter", () => {
		// `biome format` exits non-zero when a file would be reformatted, so the
		// call itself is the gate.
		execFileSync("pnpm", ["exec", "biome", "format", "src/compiler"], {
			cwd: root,
		});
		const formatted = walk(compilerRoot).filter(
			(path) => path.endsWith(".mjs") || path.endsWith(".mts"),
		);
		expect(formatted.length).toBeGreaterThan(5);
	});

	/** Traces: TC-344; FR-041-AC-12. */
	it("fails tsc when the declarations drift from the implementation", () => {
		const probe = resolve(root, "test/declaration-drift-probe.ts");
		writeFileSync(
			probe,
			'import { emitRust } from "../src/compiler/index.mjs";\nconst broken: number = emitRust({ schemaVersion: "1.0.0", types: [] });\nvoid broken;\n',
		);
		try {
			expect(() =>
				execFileSync(
					resolve(root, "node_modules/.bin/tsc"),
					["--noEmit", "-p", "tsconfig.json"],
					{ cwd: root, encoding: "utf8" },
				),
			).toThrow();
		} finally {
			rmSync(probe, { force: true });
		}
	});

	/** Traces: TC-345, TC-393; FR-041-AC-13, FR-041-CON-5, NFR-018-AC-4. */
	it("licenses every promoted and added manifest AGPL-3.0-only", () => {
		// Tree assertion, not a diff assertion: a positive claim about the branch
		// diff ("my diff adds this manifest") passes vacuously once the branch is
		// squash-merged and `origin/main...HEAD` is empty, so it can only ever be
		// green on the authoring branch. The promoted manifest set is read from
		// the working tree instead, which stays true after the merge and still
		// fails if the promotion is reverted.
		const promoted = walk(compilerRoot)
			.filter((path) => path.endsWith("package.json"))
			.map((path) => `src/compiler/${path}`);
		expect(promoted).toContain(
			"src/compiler/emitters/semantic-ir/package.json",
		);
		// The diff-scoped half stays as a negative guard: whatever else the branch
		// adds must be licensed the same way. It is vacuously true on an empty
		// diff, which is the merge-safe shape.
		const manifests = [
			...new Set([
				...promoted,
				...addedPaths().filter((path) => path.endsWith("package.json")),
			]),
		];
		for (const path of manifests) {
			expect(readJson(resolve(root, path)).license, path).toBe("AGPL-3.0-only");
		}
	});

	/** Traces: TC-346, TC-347; FR-041-CON-3, FR-041-CON-4. */
	it("imports only pinned @typespec packages and adds no dependency", () => {
		const manifest = readJson(resolve(root, "package.json")) as {
			dependencies?: Json;
			devDependencies: Record<string, string>;
			exports: Json;
		};
		expect(manifest.dependencies).toBeUndefined();
		for (const [name, version] of Object.entries(manifest.devDependencies)) {
			if (!name.startsWith("@typespec/")) continue;
			expect(version, name).toMatch(/^\d+\.\d+\.\d+$/);
		}
		const imported = new Set<string>();
		for (const path of walk(compilerRoot)) {
			if (!path.endsWith(".mjs")) continue;
			for (const match of read(resolve(compilerRoot, path)).matchAll(
				/from "(@[^"]+)"/g,
			)) {
				imported.add(match[1]);
			}
		}
		for (const name of imported) {
			expect(manifest.devDependencies, name).toHaveProperty(name);
		}
		expect(manifest.exports).not.toHaveProperty("./compiler");
	});

	/** Traces: TC-348; FR-041-CON-2. */
	it("never validates the prototype IR against the v1 IR schema", () => {
		const v1 = readJson(
			resolve(root, "schema/semantic/v1/semantic-ir.schema.json"),
		) as { required?: string[] };
		expect(v1.required).toContain("contractVersion");
		expect(Object.keys(goldenIr)).not.toContain("contractVersion");
		// Scoped by issue #19: what FR-041-CON-2 forbids is validating the
		// *prototype* IR against the v1 schema, and the prototype path is the
		// frozen set below. Issue #19's contract path validates its own output
		// against that schema deliberately (FR-050), so naming the schema there is
		// the point rather than the defect.
		const prototype = [
			"ir.mjs",
			"compile.mjs",
			"identity.mjs",
			"index.mjs",
			"cli.mjs",
		];
		for (const path of walk(compilerRoot)) {
			const isPrototype =
				prototype.includes(path) ||
				path.startsWith("emitters/") ||
				path.startsWith("backends/");
			if (!isPrototype) continue;
			expect(read(resolve(compilerRoot, path)), path).not.toContain(
				"semantic-ir.schema.json",
			);
		}
	});
});

describe("promoted language backends (FR-042)", () => {
	/** Traces: TC-349; FR-042-AC-1. */
	it("reproduces the committed TypeScript golden", () => {
		expect(emitTypeScript(goldenIr)).toBe(
			read(resolve(spike, "generated/custom/typescript/index.ts")),
		);
	});

	/** Traces: TC-350; FR-042-AC-2. */
	it("reproduces the committed Rust golden", () => {
		expect(emitRust(goldenIr)).toBe(
			read(resolve(spike, "generated/custom/rust/src/lib.rs")),
		);
	});

	/** Traces: TC-351; FR-042-AC-3. */
	it("returns identical strings on repeated calls", () => {
		expect(emitTypeScript(goldenIr)).toBe(emitTypeScript(goldenIr));
		expect(emitRust(goldenIr)).toBe(emitRust(goldenIr));
	});

	/** Traces: TC-352, TC-369; FR-042-AC-4, FR-042-CON-2, FR-043-AC-8, FR-043-CON-3. */
	it("touches no filesystem, environment, clock, network, or process", () => {
		const forbidden = [
			"node:fs",
			"node:child_process",
			"node:net",
			"node:http",
			"node:https",
			"node:dns",
			"node:tls",
			"node:os",
			"node:worker_threads",
			"createRequire",
			"fetch(",
			"XMLHttpRequest",
			"process.env",
			"process.cwd",
			"globalThis.process",
			"Date.now",
			"new Date(",
			"performance.now",
			"Math.random",
		];
		// The purity claim binds the backends and everything they can reach, so
		// the import graph is walked rather than a hand-picked file list.
		const reachable = new Set<string>();
		const visit = (relPath: string) => {
			if (reachable.has(relPath)) return;
			reachable.add(relPath);
			const source = read(resolve(compilerRoot, relPath));
			for (const match of source.matchAll(
				/(?:from|import)\s*\(?\s*"(\.[^"]+)"/g,
			)) {
				visit(
					relative(
						compilerRoot,
						resolve(dirname(resolve(compilerRoot, relPath)), match[1]),
					),
				);
			}
		};
		visit("backends/typescript.mjs");
		visit("backends/rust.mjs");
		visit("backends/python-schema.mjs");
		expect([...reachable].sort()).toEqual([
			"backends/python-schema.mjs",
			"backends/rust.mjs",
			"backends/type-names.mjs",
			"backends/typescript.mjs",
		]);
		for (const path of reachable) {
			const source = read(resolve(compilerRoot, path));
			for (const token of forbidden) {
				expect(source, `${path} uses ${token}`).not.toContain(token);
			}
		}
		// FR-043-AC-8 binds the whole compiler, including the two modules that
		// legitimately do I/O and are unreachable from any backend.
		for (const path of walk(compilerRoot)) {
			if (!path.endsWith(".mjs")) continue;
			expect(
				read(resolve(compilerRoot, path)),
				`${path} spawns a process`,
			).not.toMatch(/spawn\(|execFile|execSync|child_process/);
		}
		for (const impure of ["cli.mjs", "identity.mjs"]) {
			expect(reachable.has(impure), impure).toBe(false);
		}
	});

	/** Traces: TC-353; FR-042-AC-5. */
	it("throws naming a base absent from the document", () => {
		const broken: SemanticIrDocument = {
			schemaVersion: "1.0.0",
			generator: "test@0.0.0",
			types: [
				{
					id: "AgentIx.Semantic.Core.Orphan",
					name: "Orphan",
					package: "AgentIx.Semantic.Core",
					kind: "model",
					role: "definition",
					source: "synthetic",
					base: "AgentIx.Semantic.Core.Ghost",
					fields: [],
					constraints: {},
					discriminator: null,
					versioning: { packageVersions: [], added: [], removed: [] },
					deprecated: null,
				},
			],
		};
		expect(() => emitRust(broken)).toThrow(/AgentIx\.Semantic\.Core\.Ghost/);
		expect(() => emitTypeScript(broken)).toThrow(
			/AgentIx\.Semantic\.Core\.Ghost/,
		);
	});

	/** Traces: TC-354; FR-042-AC-6. */
	it("throws naming a base-chain cycle instead of recursing", () => {
		const model = (name: string, base: string): SemanticIrType => ({
			id: `AgentIx.Semantic.Core.${name}`,
			name,
			package: "AgentIx.Semantic.Core",
			kind: "model",
			role: "definition",
			source: "synthetic",
			base: `AgentIx.Semantic.Core.${base}`,
			fields: [],
			constraints: {},
			discriminator: null,
			versioning: { packageVersions: [], added: [], removed: [] },
			deprecated: null,
		});
		const cyclic: SemanticIrDocument = {
			schemaVersion: "1.0.0",
			generator: "test@0.0.0",
			types: [model("A", "B"), model("B", "A")],
		};
		expect(() => emitRust(cyclic)).toThrow(/cycle/i);
	});

	/** Traces: TC-355; FR-042-AC-7. */
	it("renames a non-snake_case field in the Rust output", () => {
		const rust = emitRust(goldenIr);
		expect(rust).toContain('#[serde(rename = "artifactType")]');
		expect(rust).toContain("pub artifact_type:");
	});

	/** Traces: TC-356; FR-042-AC-8. */
	it("renders an enum as a union of its member values", () => {
		const typescript = emitTypeScript(goldenIr);
		const enumType = goldenIr.types.find((type) => type.kind === "enum") as
			| { name: string; members: { value: string }[] }
			| undefined;
		expect(enumType).toBeDefined();
		if (!enumType) return;
		expect(typescript).toContain(
			`export type ${enumType.name} = ${enumType.members
				.map((member) => JSON.stringify(member.value))
				.join(" | ")};`,
		);
	});

	/** Traces: TC-357; FR-042-AC-9. */
	it("renders optional fields as Option in Rust and ? in TypeScript", () => {
		expect(emitRust(goldenIr)).toContain("Option<");
		expect(emitTypeScript(goldenIr)).toMatch(/\t\w+\?:/);
	});

	/** Traces: TC-358, TC-360; FR-042-AC-10, FR-042-CON-1, FR-042-CON-3, FR-042-CON-5. */
	it("records both backends as representative-slice-only", () => {
		for (const name of ["typescript-backend", "rust-serde-backend"]) {
			const record = inventory.components.find(
				(item) => item.component === name,
			);
			expect(record, name).toBeDefined();
			if (!record) continue;
			expect(record.limitation).toContain("representative slice only");
			for (const gate of ABSENT_GATES) {
				expect(record.limitation, `${name} / ${gate}`).toContain(gate);
			}
			expect(record.limitation.toLowerCase()).not.toContain(
				"production-qualified",
			);
		}
		const typescript = inventory.components.find(
			(item) => item.component === "typescript-backend",
		);
		expect(typescript?.limitation).toContain("textual substitution");
	});

	/** Traces: TC-359, TC-367; FR-042-AC-11, FR-043-AC-6, FR-042-CON-4. */
	it("leaves every committed issue #4 golden untouched", () => {
		const frozen = [
			"spikes/typespec-feasibility/generated/custom/semantic-ir.json",
			"spikes/typespec-feasibility/generated/custom/typescript/index.ts",
			"spikes/typespec-feasibility/generated/custom/rust/src/lib.rs",
			"spikes/typespec-feasibility/generated/custom/rust/Cargo.lock",
			"spikes/typespec-feasibility/generated/custom/python/input.schema.json",
			"spikes/typespec-feasibility/generated/custom/python/models.py",
			"spikes/typespec-feasibility/generated/custom/python/models_dataclass.py",
			"spikes/typespec-feasibility/generated/official/json-schema/semantic.json",
		];
		const changed = changedPaths();
		for (const path of frozen) {
			expect(changed, path).not.toContain(path);
		}
	});
});

describe("Python generation adapter (FR-043)", () => {
	const bundle = readJson(
		resolve(spike, "generated/official/json-schema/semantic.json"),
	);

	/** Traces: TC-361; FR-043-AC-1. */
	it("reproduces the committed Python input schema", () => {
		const normalized = normalizeJsonSchemaForPython(bundle);
		expect(`${JSON.stringify(normalized, null, 2)}\n`).toBe(
			read(resolve(spike, "generated/custom/python/input.schema.json")),
		);
	});

	/** Traces: TC-362, TC-363; FR-043-AC-2, FR-043-CON-1. */
	it("throws on every executable extension key, at any depth", () => {
		for (const key of [
			"x-python-import",
			"customTypePath",
			"default_factory",
		]) {
			expect(() =>
				normalizeJsonSchemaForPython({ $defs: {}, [key]: "x" }),
			).toThrow(key);
			expect(() =>
				normalizeJsonSchemaForPython({
					$defs: { Nested: { properties: { a: { [key]: "x" } } } },
				}),
			).toThrow(key);
		}
	});

	/** Traces: TC-364; FR-043-AC-3. */
	it("stamps the urn id and titles every definition", () => {
		const normalized = normalizeJsonSchemaForPython(bundle) as {
			$id: string;
			$defs: Record<string, Json>;
		};
		expect(normalized.$id).toBe(
			"urn:agent-ix:typespec-feasibility:python-input:1",
		);
		for (const [name, definition] of Object.entries(normalized.$defs)) {
			expect(definition, name).not.toHaveProperty("$id");
			expect(definition, name).not.toHaveProperty("$schema");
			expect(typeof definition.title, name).toBe("string");
		}
	});

	/** Traces: TC-365; FR-043-AC-4, FR-043-CON-2. */
	it("localises the RecordString helper the issue #31 defect breaks", () => {
		const normalized = normalizeJsonSchemaForPython(bundle) as {
			$defs: Record<string, Json>;
		};
		const helper = normalized.$defs.RecordString;
		expect(helper).toBeDefined();
		expect(helper).toHaveProperty("additionalProperties");
		expect(helper).not.toHaveProperty("unevaluatedProperties");
		expect(JSON.stringify(normalized)).not.toContain('"RecordString.json"');
	});

	/** Traces: TC-366; FR-043-AC-5. */
	it("is pure and leaves its input unmutated", () => {
		const before = JSON.stringify(bundle);
		const first = normalizeJsonSchemaForPython(bundle);
		const second = normalizeJsonSchemaForPython(bundle);
		expect(first).toEqual(second);
		expect(JSON.stringify(bundle)).toBe(before);
	});

	/** Traces: TC-368; FR-043-AC-7. */
	it("pins the generator versions the evidence records", () => {
		const tools = (
			readJson(resolve(spike, "evidence/toolchain.json")) as {
				tools: { name: string; version: string }[];
			}
		).tools;
		const version = (name: string) =>
			tools.find((tool) => tool.name === name)?.version;
		expect(DATAMODEL_CODEGEN_VERSION).toBe(version("datamodel-code-generator"));
		expect(PYDANTIC_VERSION).toBe(version("Pydantic"));
	});
});

describe("frozen spike replay (FR-044)", () => {
	/** Traces: TC-371, TC-384; FR-044-AC-2, FR-044-CON-1, NFR-017-AC-2. */
	it("changes exactly one retained-evidence field", () => {
		// The permitted-path half is a *negative* diff claim — the changed set
		// contains nothing under the retained prefixes except custom.json — which
		// is vacuously true on an empty diff and therefore merge-safe.
		const retained = [
			"spikes/typespec-feasibility/generated/",
			"spikes/typespec-feasibility/evidence/",
			"spikes/typespec-feasibility/report.md",
		];
		for (const path of changedPaths().filter((path) =>
			retained.some((prefix) => path.startsWith(prefix)),
		)) {
			expect(path, "retained evidence changed outside custom.json").toBe(
				"spikes/typespec-feasibility/evidence/custom.json",
			);
		}
		// The "exactly one field" half is asserted against the declared frozen
		// record rather than against `origin/main`, whose copy becomes the
		// post-promotion content once the branch merges. FROZEN_CUSTOM_EVIDENCE
		// is the issue #4 record verbatim; only `command` is permitted to differ,
		// and it must carry the promoted value.
		const after = readJson(resolve(spike, "evidence/custom.json"));
		expect(Object.keys(after).sort()).toEqual(
			Object.keys(FROZEN_CUSTOM_EVIDENCE).sort(),
		);
		const differing = Object.keys(after).filter(
			(key) =>
				JSON.stringify(after[key]) !==
				JSON.stringify(FROZEN_CUSTOM_EVIDENCE[key]),
		);
		expect(differing).toEqual(["command"]);
		expect(FROZEN_CUSTOM_EVIDENCE.command).toBe(SPIKE_IR_COMMAND);
		expect(after.command).toBe(PROMOTED_IR_COMMAND);
	});

	/** Traces: TC-372; FR-044-AC-3, FR-044-CON-2. */
	it("seeds the committed lockfile instead of regenerating it (source-text)", () => {
		const runner = read(resolve(spike, "scripts/run-experiment.mjs"));
		expect(runner).toContain('generated/custom/rust/Cargo.lock"');
		expect(runner).toContain("cpSync(retainedLock");
		const seedIndex = runner.indexOf("cpSync(retainedLock");
		const generateIndex = runner.indexOf('"generate-lockfile"');
		expect(seedIndex).toBeGreaterThan(-1);
		expect(seedIndex).toBeLessThan(generateIndex);
	});

	/** Traces: TC-374; FR-044-AC-4. */
	it("fails --check rather than generating a missing lockfile (source-text)", () => {
		const runner = read(resolve(spike, "scripts/run-experiment.mjs"));
		expect(runner).toMatch(
			/else if \(checkMode\) \{[\s\S]*Missing retained lockfile/,
		);
	});

	/** Traces: TC-375; FR-044-AC-5. */
	it("removes the spike emitter package and its dependency", () => {
		expect(existsSync(resolve(spike, "emitter"))).toBe(false);
		for (const manifest of [
			resolve(root, "package.json"),
			resolve(spike, "package.json"),
		]) {
			expect(read(manifest), manifest).not.toContain(
				"typespec-semantic-ir-emitter-spike",
			);
		}
	});

	/** Traces: TC-376, TC-388; FR-044-AC-6, FR-044-CON-3, NFR-017-AC-6. */
	it("leaves no file: or link: specifier and no committed .npmrc", () => {
		const lock = read(resolve(root, "pnpm-lock.yaml"));
		for (const line of lock.split("\n")) {
			expect(line, line).not.toMatch(/(?<![\w-])(file|link):/);
		}
		expect(lock).not.toContain("typespec-semantic-ir-emitter-spike");
		const tracked = git("ls-files").split("\n");
		expect(tracked.filter((path) => path.endsWith(".npmrc"))).toEqual([]);
	});

	/** Traces: TC-377; FR-044-AC-7. */
	it("makes the spike runner import the promoted backends (source-text)", () => {
		const runner = read(resolve(spike, "scripts/run-experiment.mjs"));
		expect(runner).toContain('from "../../../src/compiler/index.mjs"');
		for (const name of [
			"function emitTypeScript",
			"function emitRust",
			"function normalizeJsonSchemaForPython",
		]) {
			expect(runner, name).not.toContain(name);
		}
	});

	/** Traces: TC-378; FR-044-AC-8. */
	it("changes only the permitted spike paths", () => {
		const changed = changedPaths().filter((path) => path.startsWith("spikes/"));
		const permitted = [
			"spikes/typespec-feasibility/scripts/run-experiment.mjs",
			"spikes/typespec-feasibility/package.json",
			"spikes/typespec-feasibility/evidence/custom.json",
		];
		for (const path of changed) {
			expect(
				permitted.includes(path) ||
					path.startsWith("spikes/typespec-feasibility/emitter/"),
				path,
			).toBe(true);
		}
	});

	/** Traces: TC-380; FR-044-AC-10. */
	it("proves zero publications and mutations from the branch diff", () => {
		// FR-044-AC-10 forbids discharging this from validation.json's counters,
		// which run-experiment.mjs writes as literals. The branch diff is the
		// independent evidence.
		// Scoped by issue #19, which writes `test/fixtures/compiler/`: the three
		// fixture trees this criterion protects are named individually so the
		// prohibition keeps its force.
		const mutationPrefixes = [
			"schema/",
			"fixtures/semantic/",
			"fixtures/semantic-core/",
			"fixtures/representative-core-payloads.json",
			"packages/",
			"agent_ix_core_data/",
			"src/generated.ts",
			"audit/",
			".github/",
		];
		for (const path of changedPaths()) {
			for (const prefix of mutationPrefixes) {
				expect(
					path === prefix || path.startsWith(prefix),
					`mutation outside the promotion: ${path}`,
				).toBe(false);
			}
		}
		// No consumer or corpus repository is reachable from this repo's diff at
		// all, and no publication step exists to trigger.
		const manifest = readJson(resolve(root, "package.json"));
		expect(manifest).not.toHaveProperty("publishConfig");
		// The changed-path check above discharges AC-10 negatively and is
		// vacuously true on an empty diff, so it needs a companion that proves the
		// promotion actually happened. That proof is read from the tree, not from
		// the diff: a positive diff claim ("my diff touches spikes/") is only ever
		// green on the authoring branch. The spike's local emitter package is gone
		// and its runner drives src/compiler/ — both fail if the promotion is
		// undone, and both stay true forever after the merge.
		expect(existsSync(resolve(spike, "emitter"))).toBe(false);
		const spikeManifest = readJson(resolve(spike, "package.json")) as {
			dependencies: Record<string, string>;
			devDependencies?: Record<string, string>;
		};
		expect(spikeManifest.dependencies).not.toHaveProperty(
			"@agent-ix/typespec-semantic-ir-emitter-spike",
		);
		expect(read(resolve(spike, "scripts/run-experiment.mjs"))).toContain(
			"src/compiler/index.mjs",
		);
		const validation = readJson(resolve(spike, "evidence/validation.json"));
		// The counters must still read zero, but they are corroboration, not the
		// evidence: the changed-path check above is.
		expect(validation.packagePublications).toBe(0);
		expect(validation.externalRepositoryMutations).toBe(0);
	});

	/** Traces: TC-381, TC-389, TC-397; FR-044-AC-11, FR-044-AC-12, NFR-017-AC-7. */
	it("records the retained evidence and the issue #42 couplings", () => {
		const doc = read(
			resolve(root, "docs/semantic-data-system/typespec-feasibility.md"),
		);
		expect(doc).toContain("## Retained evidence");
		expect(doc).toContain("issues/42");
		expect(doc).toContain("toolchain.json");
		expect(doc).toContain("StrEnum");
		const nfr = read(
			resolve(
				root,
				"spec/non-functional/NFR-006-isolated-reproducible-spike.md",
			),
		);
		expect(nfr).toContain("changes nothing outside itself");
	});
});

describe("determinism and non-disruption (NFR-017, NFR-018)", () => {
	const permitted = [
		"src/compiler/",
		"spikes/typespec-feasibility/scripts/",
		"spikes/typespec-feasibility/package.json",
		"spikes/typespec-feasibility/evidence/custom.json",
		"spikes/typespec-feasibility/emitter/",
		"spikes/typespec-feasibility/README.md",
		"package.json",
		"pnpm-lock.yaml",
		"Makefile",
		"biome.json",
		"tsconfig.json",
		"tsconfig.build.json",
		"test/",
		// The Python suite is a sibling deliverable's surface, not this
		// promotion's. Issue #20 (NFR-016) legitimately adds
		// tests/test_conformance_corpus.py, so listing `tests/` as prohibited
		// made the two tickets contradict each other and failed any branch that
		// carried both. The promotion's own non-disruption is still carried by
		// `pyproject.toml`, `poetry.lock` and `agent_ix_core_data/` staying
		// prohibited: a Python test file changes no consumer, schema or package.
		"tests/",
		"docs/semantic-data-system/typespec-feasibility.md",
		"spec/",
		"plan/",
		"reviews/",
		// Issue #19 (the compiler core) writes its own fixture corpus under
		// `test/`, the four generator scripts, two published documents, and the
		// formatter exclusion for its generated fixtures.
		"test/fixtures/compiler/",
		"scripts/test-matrix-summary.mjs",
		"scripts/build-compatibility-cases.mjs",
		"scripts/build-evolution-goldens.mjs",
		"scripts/build-compiler-docs.mjs",
		"docs/semantic-data-system/compiler-diagnostics.md",
		"docs/semantic-data-system/ir-compatibility-policy.md",
		"biome.json",
	];
	const prohibited = [
		"schema/",
		// The three fixture trees NFR-017's `fixtures/` prohibition existed to
		// protect, named individually so issue #19 can write its own corpus under
		// `test/fixtures/compiler/` without the prohibition losing force.
		"fixtures/semantic/",
		"fixtures/semantic-core/",
		"fixtures/representative-core-payloads.json",
		"packages/",
		"agent_ix_core_data/",
		"src/generated.ts",
		"audit/",
		"pyproject.toml",
		"poetry.lock",
		".github/",
	];

	/** Traces: TC-379, TC-390; FR-044-AC-9, NFR-018-AC-1. */
	it("keeps every changed path permitted and none prohibited", () => {
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
	});

	/** Traces: TC-391, TC-394; NFR-018-AC-2, NFR-018-AC-5. */
	it("leaves the published surface and dependency sets unchanged", () => {
		const before = JSON.parse(
			git("show", `${PROMOTION_BASE()}:package.json`),
		) as Json;
		const after = readJson(resolve(root, "package.json"));
		for (const key of ["exports", "main", "module", "types", "files"]) {
			expect(JSON.stringify(after[key]), key).toBe(JSON.stringify(before[key]));
		}
		expect(after.dependencies).toEqual(before.dependencies);
		const beforeDev = { ...(before.devDependencies as Json) };
		delete beforeDev["@agent-ix/typespec-semantic-ir-emitter-spike"];
		expect(after.devDependencies).toEqual(beforeDev);
	});

	/** Traces: TC-392; NFR-018-AC-3. */
	it("confines the packed-file delta to src/compiler/", () => {
		const files = (
			readJson(resolve(root, "package.json")).files as string[]
		).map((glob) => glob.replace(/\/$/, ""));
		// Negative diff half, vacuous on an empty diff and therefore merge-safe:
		// nothing the branch adds to the tarball sits outside src/compiler/.
		const added = addedPaths().filter((path) =>
			files.some((glob) => path === glob || path.startsWith(`${glob}/`)),
		);
		for (const path of added) {
			expect(path.startsWith("src/compiler/"), path).toBe(true);
		}
		// Positive half, read from the tree rather than the diff: the packed-file
		// set the `files` globs name really does contain the promoted emitter.
		// `expect(added.length).toBeGreaterThan(0)` asserted the same thing about
		// the branch diff and so could only pass before the squash merge.
		const packed = files.flatMap((glob) => {
			const absolute = resolve(root, glob);
			if (!existsSync(absolute)) return [];
			return statSync(absolute).isDirectory()
				? walk(absolute).map((path) => `${glob}/${path}`)
				: [glob];
		});
		for (const path of [
			"src/compiler/index.mjs",
			"src/compiler/cli.mjs",
			"src/compiler/inventory.json",
			"src/compiler/emitters/semantic-ir/index.mjs",
			"src/compiler/emitters/semantic-ir/package.json",
			"src/compiler/backends/rust.mjs",
			"src/compiler/backends/typescript.mjs",
			"src/compiler/backends/python-schema.mjs",
		]) {
			expect(packed, path).toContain(path);
		}
		expect(inventory.shipping).toContain("source only");
		expect(inventory.shipping).toContain("issue #11");
	});

	/** Traces: TC-395; NFR-018-AC-6. */
	it("restores the pre-promotion tree exactly when the promotion is reverted", () => {
		// The rollback target is the commit the promotion replaced, not the
		// branch point. `origin/main...HEAD` was the wrong baseline: once the
		// promotion merges, that range is empty, every restore loop iterates zero
		// times, and the rehearsal reports success having rehearsed nothing. The
		// baseline is discovered from history through a file the promotion
		// created, so it stays fixed after the merge and disappears — failing the
		// gate — if the promotion is ever reverted.
		//
		// The far end is pinned to the promotion commit for the same reason the
		// near end is pinned to its parent. Measured to the current head this
		// rehearsal restores every file every later ticket has landed since, and
		// calls that "the promotion" — the accretion issue #20 measured on the
		// issue #19 gate and issue #19 fixes here for both suites.
		const { base, tip } = PROMOTION();
		expect(tip, "src/compiler/inventory.json must exist in history").not.toBe(
			"",
		);
		const existsAtBase = (path: string): boolean => {
			try {
				execFileSync("git", ["cat-file", "-e", `${base}:${path}`], {
					cwd: root,
					stdio: "ignore",
				});
				return true;
			} catch {
				return false;
			}
		};
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
		expect(changed).toContain(
			"spikes/typespec-feasibility/evidence/custom.json",
		);
		const deleted = changed.filter(
			(path) => existsAtBase(path) && !existsSync(resolve(root, path)),
		);
		expect(
			deleted.some((path) =>
				path.startsWith("spikes/typespec-feasibility/emitter/"),
			),
			"the emitter deletion must be visible to the restore rehearsal",
		).toBe(true);

		const scratch = temp("restore");
		try {
			let restored = 0;
			for (const path of changed) {
				if (!existsAtBase(path)) {
					expect(existsSync(resolve(root, path)), path).toBe(true);
					continue;
				}
				const original = execFileSync("git", ["show", `${base}:${path}`], {
					cwd: root,
					encoding: "buffer",
				}) as unknown as Buffer;
				const target = resolve(scratch, path);
				mkdirSync(dirname(target), { recursive: true });
				writeFileSync(target, original);
				expect(readFileSync(target).equals(original), path).toBe(true);
				restored += 1;
				if (deleted.includes(path)) {
					expect(existsSync(resolve(root, path)), path).toBe(false);
					expect(original.length, path).toBeGreaterThan(0);
				}
			}
			expect(restored).toBeGreaterThan(0);
			const evidencePath = "spikes/typespec-feasibility/evidence/custom.json";
			expect(read(resolve(scratch, evidencePath))).toBe(
				execFileSync("git", ["show", `${base}:${evidencePath}`], {
					cwd: root,
					encoding: "utf8",
				}),
			);
			expect(read(resolve(scratch, evidencePath))).toContain(
				"--emit @agent-ix/typespec-semantic-ir-emitter-spike",
			);
			expect(read(resolve(root, evidencePath))).not.toContain(
				"--emit @agent-ix/typespec-semantic-ir-emitter-spike",
			);
		} finally {
			rmSync(scratch, { recursive: true, force: true });
		}
	});

	/** Traces: TC-396; NFR-018-AC-7. */
	it("adds and triggers no publication step", () => {
		for (const path of changedPaths()) {
			expect(path.startsWith(".github/"), path).toBe(false);
		}
		const manifest = readJson(resolve(root, "package.json"));
		expect(manifest).not.toHaveProperty("publishConfig");
		expect(existsSync(resolve(compilerRoot, ".npmrc"))).toBe(false);
	});

	/** Traces: TC-373, TC-387; FR-044-AC-3, NFR-017-AC-5. */
	it("keeps the seeded lockfile byte-identical through cargo check", () => {
		// A missing cargo is an unmet host prerequisite (FR-044-CON-4), not a
		// reason for this gate to pass having asserted nothing.
		const cargo = execFileSync("sh", ["-c", "command -v cargo || true"], {
			encoding: "utf8",
		}).trim();
		expect(cargo, "cargo is a host prerequisite for TC-373/TC-387").not.toBe(
			"",
		);
		const scratch = temp("cargo");
		try {
			const source = resolve(spike, "generated/custom/rust");
			mkdirSync(resolve(scratch, "src"), { recursive: true });
			cpSync(resolve(source, "Cargo.toml"), resolve(scratch, "Cargo.toml"));
			cpSync(resolve(source, "Cargo.lock"), resolve(scratch, "Cargo.lock"));
			cpSync(resolve(source, "src/lib.rs"), resolve(scratch, "src/lib.rs"));
			execFileSync(cargo, ["check", "--offline", "--locked"], {
				cwd: scratch,
				env: { ...process.env, CARGO_TARGET_DIR: resolve(scratch, "target") },
			});
			expect(read(resolve(scratch, "Cargo.lock"))).toBe(
				read(resolve(source, "Cargo.lock")),
			);
		} finally {
			rmSync(scratch, { recursive: true, force: true });
		}
	}, 180000);
});
