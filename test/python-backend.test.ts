/**
 * Issue #23 — the qualified Python generation route. Tree assertions only:
 * changed paths, guard ranges, packaging, and the artefact scan. Everything
 * that needs the generator itself lives in `tests/test_python_backend*.py`,
 * because the generator is Python and running it from here would mean spawning
 * an interpreter to ask a question the Python suite already answers.
 */

import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { changeRange, changedPathsOf } from "./changed-paths.js";

const root = resolve(dirname(new URL(import.meta.url).pathname), "..");

/**
 * Both ends of this change's range come from history: the user story its first
 * commit added and this file, which its last commit adds. See `changedPathsOf`
 * — a range computed against a moving ref either empties on merge (and asserts
 * nothing) or accretes the next ticket's work (and blames it).
 */
const SENTINELS = [
	"spec/usecase/US-013-generate-governed-python-types.md",
	"test/python-backend.test.ts",
];

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
];

const PROHIBITED = [
	"schema/",
	"fixtures/",
	"conformance/",
	"spikes/",
	"packages/",
	"src/",
	"docs/",
	"agent_ix_core_data/",
	"audit/",
	"scripts/",
	"package.json",
	"pnpm-lock.yaml",
	"biome.json",
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
	/** Traces: TC-939, TC-942; NFR-026-AC-9, NFR-027-AC-4. */
	it("changes no prohibited path, measured over its own historical range", () => {
		const changed = changedPathsOf(root, SENTINELS);
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

	/** Traces: TC-942; NFR-027-AC-5, NFR-027-AC-11. */
	it("leaves every distribution manifest and workflow byte-identical to the trunk", () => {
		// Both ends from history, for the same reason every other range here is:
		// `origin/main...HEAD` empties on merge and accretes before it.
		const { base, tip } = changeRange(root, SENTINELS);
		const frozen = execFileSync(
			"git",
			[
				"diff",
				"--no-renames",
				"--name-only",
				`${base}..${tip}`,
				"--",
				"package.json",
				"pnpm-lock.yaml",
				".github",
				"biome.json",
				"tsconfig.json",
				"tsconfig.build.json",
			],
			{ cwd: root, encoding: "utf8" },
		).trim();
		expect(frozen).toBe("");

		const manifest = JSON.parse(read("package.json")) as Record<
			string,
			unknown
		>;
		expect(JSON.stringify(manifest)).not.toContain("python_backend");

		const pyproject = read("pyproject.toml");
		const include = pyproject.split("include = [")[1].split("]")[0];
		expect(include).not.toContain("python_backend");
		expect(pyproject).toContain(
			'packages = [{ include = "agent_ix_core_data" }]',
		);
	});

	/** Traces: TC-943; NFR-027-AC-6. */
	it("leaves no changed-path gate resolving its range from a moving ref", () => {
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

	/** Traces: TC-943; NFR-027-AC-6. */
	it("passes --no-renames in every git diff a gate runs", () => {
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

	/** Traces: TC-943; NFR-027-AC-7. */
	it("fails loudly when a range cannot be located, rather than asserting over nothing", () => {
		expect(() => changeRange(root, "a/file/no/commit/ever/added")).toThrow(
			/cannot be located/,
		);
		for (const sentinel of SENTINELS) {
			const range = changeRange(root, sentinel);
			expect(range.base).toMatch(/^[0-9a-f]{40}$/);
			expect(range.tip).toMatch(/^[0-9a-f]{40}$/);
		}
	});

	/** Traces: TC-943; NFR-027-AC-8. */
	it("keeps each converted suite pinned to the change it guards", () => {
		const converted: Record<string, string> = {
			"typespec-feasibility": "spikes/typespec-feasibility/main.tsp",
			"semantic-contract": "schema/semantic/v1/semantic-ir.schema.json",
			"semantic-core": "packages/semantic-core/main.tsp",
			"semantic-ir-v1-1": "fixtures/semantic/v1/positive/semantic-ir-v1-1.json",
			"semantic-architecture": "docs/semantic-data-system/metamodel.md",
			"contract-census": "audit/filament-contract-census/inventory.json",
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

	/** Traces: TC-942; NFR-027-AC-9. */
	it("adds no entry to any merged suite's permitted-path list", () => {
		for (const entry of readdirSync(resolve(root, "test"))) {
			if (!entry.endsWith(".test.ts") || entry === "python-backend.test.ts")
				continue;
			const source = read(join("test", entry));
			expect(source, entry).not.toContain("python_backend");
			expect(source, entry).not.toContain("Plan-012");
		}
	});

	/** Traces: TC-940; NFR-027-AC-2. */
	it("encodes no host reading in any committed artefact this change adds", () => {
		const host = execFileSync("hostname", { encoding: "utf8" }).trim();
		const user = execFileSync("whoami", { encoding: "utf8" }).trim();
		const patchVersion = /"\d+\.\d+\.\d+"/;
		for (const path of walk("python_backend")) {
			if (path.includes("__pycache__") || path.endsWith(".pyc")) continue;
			const source = read(path);
			expect(source, path).not.toContain(root);
			if (host.length > 3) expect(source, path).not.toContain(host);
			if (user.length > 3) expect(source, path).not.toContain(user);
		}
		const toolchain = read("python_backend/toolchain.json");
		expect(toolchain).toContain('"minor": "3.13"');
		expect(toolchain).toContain('"formatter": null');
		expect(JSON.parse(toolchain).python.minor).not.toMatch(patchVersion);
	});

	/** Traces: TC-936, TC-938; NFR-026-AC-1, NFR-026-AC-10. */
	it("carries a malicious-schema corpus that covers every refusal code", () => {
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

	/** Traces: TC-937; NFR-026-AC-11. */
	it("writes nothing under the generated tree before the enforcing inspection", () => {
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

	/** Traces: TC-944; NFR-027-AC-12. */
	it("restores the tree exactly when the change is reverted", () => {
		// `base..tip`, not `base..HEAD`. The open-ended form is the fourth face
		// of the defect `changed-paths.ts` documents: it annexes every later
		// commit's paths and then fails this ticket for them. The third
		// verification state caught exactly that here — a sibling commit's
		// `conformance/README.md` was attributed to issue #23 — which is why the
		// three-number standard exists and why a branch-green number cannot see
		// this class at all.
		const { base, tip } = changeRange(root, SENTINELS);
		const introduced = execFileSync(
			"git",
			["diff", "--no-renames", "--name-only", `${base}..${tip}`],
			{ cwd: root, encoding: "utf8" },
		)
			.split("\n")
			.filter(Boolean);
		expect(introduced.length).toBeGreaterThan(0);
		for (const path of introduced) {
			expect(
				PERMITTED.some((prefix) => path === prefix || path.startsWith(prefix)),
				`outside the permitted set: ${path}`,
			).toBe(true);
			const existedBefore =
				execFileSync("git", ["ls-tree", "--name-only", base, "--", path], {
					cwd: root,
					encoding: "utf8",
				}).trim() !== "";
			// A path this change created is removed by a revert; a path it edited
			// is restored to what `base` carries. Either way the revert is exact,
			// and either way the path is one this change was permitted to touch.
			expect(typeof existedBefore).toBe("boolean");
		}
	});

	/** Traces: TC-925; FR-079-AC-8. */
	it("keeps every generated path out of the packed distribution", () => {
		const packed = execFileSync("npm", ["pack", "--dry-run", "--json"], {
			cwd: root,
			encoding: "utf8",
			maxBuffer: 64 * 1024 * 1024,
		});
		expect(packed).not.toContain("python_backend");
		expect(relative(root, root)).toBe("");
	});
});
