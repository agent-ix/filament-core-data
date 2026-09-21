/**
 * Issue #23 — the qualified Python generation route. Tree assertions only:
 * changed paths, guard ranges, packaging, and the artefact scan. Everything
 * that needs the generator itself lives in `tests/test_python_backend*.py`,
 * because the generator is Python and running it from here would mean spawning
 * an interpreter to ask a question the Python suite already answers.
 */

import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { changedPathsOfCommits, changeRange } from "./changed-paths.js";

const root = resolve(dirname(new URL(import.meta.url).pathname), "..");

/**
 * Both ends of this change's range come from history — a range computed against
 * a moving ref either empties on merge (and asserts nothing) or accretes the
 * next ticket's work (and blames it).
 *
 * The base is the parent of the commit that added the user story. The tip is
 * the latest commit that touched `python_backend/`, the tree this change owns,
 * rather than a file the change happened to add: a file-pinned tip goes stale
 * the moment the change adds another commit, and every gate reading the range
 * then judges a prefix of the change while reporting on all of it. `TIP_OWNED`
 * is the same rule `tests/change_range.py` applies on the Python side.
 */
const SENTINELS = [
	// PR #70, the generation route itself.
	"spec/usecase/US-013-generate-governed-python-types.md",
	// PR #113, the conformance adapter. Issue #23 reached the trunk as two
	// squash commits ten tickets apart, so its path set is the union of those
	// two commits and not the range between them — which spans issue #21's and
	// issue #60's work and failed this ticket for it.
	"conformance/adapters/python-backend/adapter.py",
];

/**
 * The base of the change's first commit, for the restorability check below.
 *
 * It is a single history fact and not a range: nothing here diffs across it.
 */
function ownBase(): string {
	return changeRange(root, SENTINELS[0]).base;
}

function ownChangedPaths(): string[] {
	return changedPathsOfCommits(root, SENTINELS);
}

/** NFR-026 and NFR-027 declare one list; the two gates read the same one. */
const PERMITTED = [
	"python_backend/",
	"spec/",
	"plan/Plan-012-python-pydantic-backend/",
	"reviews/",
	"tests/",
	"test/",
	"pyproject.toml",
	"poetry.lock",
	"Makefile",
	// Issue #65, FR-132: the Python conformance adapter. Its home is the
	// harness, because that is where an adapter lives — the differential runner
	// launches every adapter as a process from `conformance/adapters/`, and a
	// Python adapter kept outside it would be a second harness. The entries are
	// the four the adapter needs, enumerated rather than the directory widened,
	// so the corpus and the oracle below stay prohibited.
	"conformance/adapters/python-backend/",
	"conformance/adapters/registry.json",
	"conformance/coverage.json",
	"conformance/tools/materialize-cases.mjs",
	"conformance/runner/differential.mjs",
	// The scratch tree the materialisation verb writes, excluded from the
	// formatter and from git. Both entries name it and nothing else.
	".gitignore",
	"biome.json",
];

const PROHIBITED = [
	"schema/",
	"fixtures/",
	// Narrowed from `conformance/` when issue #65 landed the Python adapter
	// there. What must not move is the evidence — the corpus the adapters are
	// measured against and the oracle they are measured by — not the directory
	// that happens to contain them.
	"conformance/corpus.json",
	"conformance/corpus.mjs",
	"conformance/cases/",
	"conformance/bases/",
	"conformance/oracle/",
	"conformance/schema/",
	"conformance/thresholds.json",
	"spikes/",
	"packages/",
	"src/",
	"docs/",
	"agent_ix_core_data/",
	"audit/",
	"scripts/",
	"package.json",
	"pnpm-lock.yaml",
	".github/",
];

const read = (path: string): string =>
	readFileSync(resolve(root, path), "utf8");

/**
 * Source with its comment lines removed. These gates explain the defects they
 * forbid, and a text search over the explanation would find itself.
 */
const code = (source: string): string =>
	source
		.split("\n")
		.filter(
			(line) => !line.trim().startsWith("//") && !line.trim().startsWith("*"),
		)
		.join("\n");

function walk(directory: string): string[] {
	const out: string[] = [];
	for (const entry of readdirSync(resolve(root, directory))) {
		const relativePath = `${directory}/${entry}`;
		if (statSync(resolve(root, relativePath)).isDirectory())
			out.push(...walk(relativePath));
		else out.push(relativePath);
	}
	return out;
}

describe("qualified Python generation route (issue #23)", () => {
	/** NFR-026-AC-9, NFR-027-AC-4. */
	it("TC-939 changes no prohibited path, measured over its own historical range", () => {
		const changed = ownChangedPaths();
		expect(changed.length).toBeGreaterThan(0);
		for (const path of changed) {
			expect(
				PROHIBITED.some((prefix) => path === prefix || path.startsWith(prefix)),
				`prohibited: ${path}`,
			).toBe(false);
			expect(
				PERMITTED.some((prefix) => path === prefix || path.startsWith(prefix)),
				`not permitted: ${path}`,
			).toBe(true);
		}
	});

	/** NFR-027-AC-5, NFR-027-AC-11. */
	it("TC-942 leaves every distribution manifest and workflow byte-identical to the trunk", () => {
		// Over this change's own commits, not over a range spanning them: the
		// range from PR #70 to PR #113 contains issue #21's `.github/workflows/`
		// and issue #60's, and this assertion was reporting them as a change
		// issue #23 made.
		//
		// `biome.json` is not in the frozen set. NFR-027-AC-5 names the npm
		// `files`/`exports`, `pyproject.toml`'s `packages`/`include`, and
		// `.github/**` — what ships and what runs. `biome.json` names lint
		// scope, and PR #113 added one exclusion to it for a generated,
		// gitignored tree the formatter would otherwise lint. Freezing it here
		// asserted something the requirement does not.
		const FROZEN = [
			"package.json",
			"pnpm-lock.yaml",
			".github/",
			"tsconfig.json",
			"tsconfig.build.json",
		];
		const frozen = ownChangedPaths().filter((path) =>
			FROZEN.some((prefix) => path === prefix || path.startsWith(prefix)),
		);
		expect(frozen).toStrictEqual([]);

		const manifest = JSON.parse(read("package.json")) as Record<
			string,
			unknown
		>;
		expect(JSON.stringify(manifest)).not.toContain("python_backend");

		// The `pyproject.toml` half is deleted with its subject. It asserted
		// `packages = [{ include = "agent_ix_core_data" }]` — the Avro package
		// `737824e` retired — and read an `include = [` list this manifest no
		// longer has, so it crashed on `undefined.split`. The root project is
		// `package-mode = false` and packages nothing (#226).
	});

	/** NFR-027-AC-6. */
	it("TC-943 leaves no changed-path gate resolving its range from a moving ref", () => {
		const offenders: string[] = [];
		for (const entry of readdirSync(resolve(root, "test"))) {
			if (!entry.endsWith(".test.ts")) continue;
			const source = code(read(join("test", entry)));
			if (/changedPathsFrom\(\s*root,\s*"(?:origin\/)?main"/.test(source))
				offenders.push(entry);
			if (/["'`]origin\/main[.]{2,3}/.test(source)) offenders.push(entry);
		}
		for (const entry of readdirSync(resolve(root, "tests"))) {
			if (!entry.endsWith(".py")) continue;
			// The helper itself explains the defect in a module docstring, which
			// the comment stripper cannot see. It resolves ranges from history and
			// is not a gate.
			if (entry === "change_range.py") continue;
			const source = code(read(join("tests", entry)));
			// The Python half is the same defect class in another language. The
			// third verification state found three gates here measuring
			// `origin/main...HEAD` and attributing a sibling commit's
			// `conformance/README.md` to issue #23.
			if (/["'`]origin\/main/.test(source)) offenders.push(entry);
		}
		expect(offenders).toEqual([]);

		// The helper still exports the moving-baseline form, and that is fine: it
		// is what `changedPathsOf` folds the working tree in with. What must not
		// exist is a *gate* that resolves its own range that way.
		expect(read("test/changed-paths.ts")).toContain(
			"export function changedPathsOf(",
		);
	});

	/** NFR-027-AC-6. */
	it("TC-943 passes --no-renames in every git diff a gate runs", () => {
		for (const entry of readdirSync(resolve(root, "test"))) {
			if (!entry.endsWith(".ts")) continue;
			const source = read(join("test", entry));
			for (const match of source.matchAll(/"git",\s*\[([^\]]*)\]/g)) {
				const argv = match[1];
				if (!argv.includes('"diff"')) continue;
				expect(argv, `${entry}: git diff without --no-renames`).toContain(
					'"--no-renames"',
				);
			}
		}
		for (const entry of readdirSync(resolve(root, "tests"))) {
			if (!entry.startsWith("test_python_backend")) continue;
			const source = code(read(join("tests", entry)));
			for (const match of source.matchAll(/"git",\s*"diff"([\s\S]{0,200})/g)) {
				expect(match[1], `${entry}: git diff without --no-renames`).toContain(
					'"--no-renames"',
				);
			}
		}
	});

	/** NFR-027-AC-7. */
	it("TC-943 fails loudly when a range cannot be located, rather than asserting over nothing", () => {
		expect(() => changeRange(root, "a/file/no/commit/ever/added")).toThrow(
			/cannot be located/,
		);
		for (const sentinel of SENTINELS) {
			const range = changeRange(root, sentinel);
			expect(range.base).toMatch(/^[0-9a-f]{40}$/);
			expect(range.tip).toMatch(/^[0-9a-f]{40}$/);
		}
	});

	/** NFR-027-AC-8. */
	it("TC-943 keeps each converted suite pinned to the change it guards", () => {
		const converted: Record<string, string> = {
			"typespec-feasibility": "spikes/typespec-feasibility/main.tsp",
			"semantic-contract": "schema/semantic/v1/semantic-ir.schema.json",
			"semantic-core": "packages/semantic-core/main.tsp",
			"semantic-ir-v1-1": "fixtures/semantic/v1/positive/semantic-ir-v1-1.json",
			"semantic-architecture": "docs/semantic-data-system/metamodel.md",
		};
		for (const [suite, sentinel] of Object.entries(converted)) {
			// Whitespace-insensitive on purpose: the formatter wraps a call that
			// does not fit, and a literal match then stops matching without
			// anything being wrong. That is the same shape as the black-wrapped
			// trace marker (quire-rs#395), and this gate met it on the way in.
			const source = read(`test/${suite}.test.ts`);
			const call = new RegExp(
				`changedPathsOf\\(\\s*root,\\s*"${sentinel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}",?\\s*\\)`,
			);
			expect(call.test(source), suite).toBe(true);
			// The sentinel must be a file the guarded change actually created, or
			// the range baselines on a tree the gate was never meant to judge.
			const adding = execFileSync(
				"git",
				["log", "--diff-filter=A", "--format=%H", "-1", "--", sentinel],
				{ cwd: root, encoding: "utf8" },
			).trim();
			expect(adding, `${suite}: ${sentinel} was never added`).not.toBe("");
			// And the range it yields must be non-empty, so the gate has something
			// to assert over rather than passing vacuously.
			const range = changeRange(root, sentinel);
			const paths = execFileSync(
				"git",
				["diff", "--no-renames", "--name-only", `${range.base}..${range.tip}`],
				{ cwd: root, encoding: "utf8" },
			)
				.split("\n")
				.filter(Boolean);
			expect(paths.length, `${suite}: empty range`).toBeGreaterThan(0);
		}
	});

	/** NFR-027-AC-9. */
	it("TC-942 adds no entry to any merged suite's permitted-path list", () => {
		// `semantic-kernel.test.ts` is exempt, and only it. FR-087 (`d0332b8`)
		// generates the kernel's Python packages through the qualified route, so
		// that suite names `python_backend/kernel/`, `/adapter/`, `/runner/`,
		// `/qualification/` and `/generated/` as its own subject. Issue #23's
		// isolation freeze simply predates it. Named rather than pattern-matched,
		// so every other suite is still held to it (#226).
		const LATER_TICKET_OWNS = new Set(["semantic-kernel.test.ts"]);
		for (const entry of readdirSync(resolve(root, "test"))) {
			if (!entry.endsWith(".test.ts") || entry === "python-backend.test.ts")
				continue;
			if (LATER_TICKET_OWNS.has(entry)) continue;
			const source = read(join("test", entry));
			expect(source, entry).not.toContain("python_backend");
			expect(source, entry).not.toContain("Plan-012");
		}
	});

	/** NFR-027-AC-2. */
	it("TC-940 encodes no host reading in any committed artefact this change adds", () => {
		const host = execFileSync("hostname", { encoding: "utf8" }).trim();
		const user = execFileSync("whoami", { encoding: "utf8" }).trim();
		const patchVersion = /"\d+\.\d+\.\d+"/;
		for (const path of walk("python_backend")) {
			if (path.includes("__pycache__") || path.endsWith(".pyc")) continue;
			const source = read(path);
			expect(source, path).not.toContain(root);
			if (host.length > 3) expect(source, path).not.toContain(host);
			// The user name is matched where a host reading actually leaks it: in
			// the home directory, or as `user@host`. Not as a bare substring or a
			// path segment — GitHub's runner user is `runner`, which is an ordinary
			// word ("the differential runner") and also a directory of this repo
			// (`python_backend/runner/emit.py`), and both shapes reported those as
			// leaks.
			expect(source, path).not.toContain(homedir());
			if (user.length > 3) {
				const escaped = user.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
				expect(source, path).not.toMatch(new RegExp(`\\b${escaped}@`));
			}
		}
		const toolchain = read("python_backend/toolchain.json");
		expect(toolchain).toContain('"minor": "3.13"');
		expect(toolchain).toContain('"formatter": null');
		expect(JSON.parse(toolchain).python.minor).not.toMatch(patchVersion);
	});

	/** NFR-026-AC-1, NFR-026-AC-10. */
	it("TC-936 carries a malicious-schema corpus that covers every refusal code", () => {
		const corpus = readdirSync(
			resolve(root, "python_backend/qualification/malicious"),
		);
		expect(corpus.length).toBeGreaterThanOrEqual(32);
		const register = JSON.parse(read("python_backend/refusals.json")) as {
			schemaKeys: { key: string; code: string }[];
		};
		const keys = new Set(register.schemaKeys.map((row) => row.key));
		for (const key of ["x-python-import", "customTypePath", "default_factory"])
			expect(keys, `FR-043 forbids ${key}`).toContain(key);
	});

	/** NFR-026-AC-11. */
	it("TC-937 writes nothing under the generated tree before the enforcing inspection", () => {
		const emitter = read("python_backend/runner/emit.py");
		const inspectAt = emitter.indexOf(
			'inspect_generated(files, documents, "enforce")',
		);
		const writeAt = emitter.indexOf("destination.write_text");
		expect(inspectAt).toBeGreaterThan(-1);
		expect(writeAt).toBeGreaterThan(inspectAt);
		const runner = read("python_backend/runner/generate.py");
		expect(runner.indexOf("if inspect is not None:")).toBeLessThan(
			runner.indexOf("if out_dir is not None:"),
		);
	});

	/** NFR-027-AC-12. */
	it("TC-943 restores the tree exactly when the change is reverted", () => {
		// `base..tip`, not `base..HEAD`. The open-ended form is the fourth face
		// of the defect `changed-paths.ts` documents: it annexes every later
		// commit's paths and then fails this ticket for them. The third
		// verification state caught exactly that here — a sibling commit's
		// `conformance/README.md` was attributed to issue #23 — which is why the
		// three-number standard exists and why a branch-green number cannot see
		// this class at all.
		const base = ownBase();
		const introduced = ownChangedPaths();
		expect(introduced.length).toBeGreaterThan(0);
		for (const path of introduced) {
			expect(
				PERMITTED.some((prefix) => path === prefix || path.startsWith(prefix)),
				`outside the permitted set: ${path}`,
			).toBe(true);
			const atBase = execFileSync(
				"git",
				["ls-tree", "--name-only", base, "--", path],
				{ cwd: root, encoding: "utf8" },
			).trim();
			if (atBase === "") continue;
			// A path this change edited rather than created must be restorable to
			// exactly what `base` carries — so `base` must still hold readable
			// content for it. A path it created is removed by a revert and needs
			// no baseline.
			const restored = execFileSync("git", ["show", `${base}:${path}`], {
				cwd: root,
				maxBuffer: 64 * 1024 * 1024,
			});
			expect(
				restored.length,
				`${path} has no restorable baseline`,
			).toBeGreaterThan(0);
		}
	});

	// TC-925 ("keeps every generated path out of the packed distribution") is
	// deleted with its subject. It ran `npm pack --dry-run` over the root
	// package to prove no `python_backend` path reached the tarball. `737824e`
	// retired the Avro publish path: the manifest is `private: true` with no
	// `files` allowlist, so it publishes nothing and `npm pack` sweeps the whole
	// tree. The case could only fail (#226).
});
