import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");

/**
 * The paths this issue writes. Stated as a list rather than derived from what
 * the branch happens to contain: a permitted set computed from the change is a
 * set that permits the change, which asserts nothing.
 */
const PERMITTED = [
	"Makefile",
	"packages/semantic-kernel/",
	"plan/Plan-013-semantic-kernel-packages/",
	"scripts/build-semantic-kernel.mjs",
	"spec/",
	"src/compiler/diagnostics.mjs",
	"src/compiler/inventory.json",
	"src/compiler/frontend/json-schema/",
	// Enumerated file by file rather than as `test/semantic-kernel*`: a prefix
	// would silently admit any future file whose name happened to start the
	// same way. This list rejected `semantic-kernel-agreement.test.ts` when it
	// was added, which is the list doing its job.
	"test/semantic-kernel.test.ts",
	"test/semantic-kernel-gates.test.ts",
	"test/semantic-kernel-consumer.test.ts",
	"test/semantic-kernel-agreement.test.ts",
	"tests/test_kernel_python_target.py",
	"docs/semantic-data-system/compiler-diagnostics.md",
];

/** NFR-030's prohibited prefixes: paths this change writes no byte of. */
const PROHIBITED = [
	"packages/semantic-core/",
	"schema/",
	"fixtures/",
	"spikes/",
	"conformance/",
	"package.json",
	"pnpm-lock.yaml",
	"poetry.lock",
	"pyproject.toml",
	"tsconfig.json",
	"biome.json",
	"src/generated.ts",
	"agent_ix_core_data/",
	"src/compiler/backends/",
	"src/compiler/frontend/typespec/",
	"src/compiler/frontend/spec-bundle/",
	"src/compiler/ir/",
	"src/compiler/compat/",
	"src/compiler/packages/",
	"src/compiler/cli.mjs",
	"python_backend/adapter/",
	"python_backend/runner/",
	"python_backend/qualification/",
	"crates/",
	"test/fixtures/",
	".github/",
];

function changedPaths(): string[] {
	return execFileSync(
		"git",
		["diff", "--no-renames", "--name-only", "main...HEAD"],
		{ cwd: root, encoding: "utf8" },
	)
		.split("\n")
		.filter((line) => line.length > 0);
}

function treeOf(dir: string): [string, string][] {
	const out: [string, string][] = [];
	const walk = (current: string): void => {
		for (const entry of readdirSync(current).sort()) {
			const full = join(current, entry);
			if (statSync(full).isDirectory()) walk(full);
			else out.push([full.slice(root.length + 1), readFileSync(full, "utf8")]);
		}
	};
	walk(dir);
	return out;
}

describe("TC-1100..1108 determinism and non-disruption (NFR-028, NFR-030)", () => {
	// TC-1100
	it("changes only permitted paths", () => {
		for (const path of changedPaths()) {
			expect(
				PERMITTED.some((prefix) => path === prefix || path.startsWith(prefix)),
				`not permitted: ${path}`,
			).toBe(true);
		}
	});

	// TC-1101
	it("changes no byte of any prohibited path", () => {
		for (const path of changedPaths()) {
			for (const prefix of PROHIBITED) {
				expect(
					path === prefix || path.startsWith(prefix),
					`prohibited path changed: ${path}`,
				).toBe(false);
			}
		}
	});

	// TC-1102 — the falsification: the permitted list must be able to reject.
	it("would reject a path outside the permitted set", () => {
		const outside = "src/compiler/ir/reader.mjs";
		expect(
			PERMITTED.some(
				(prefix) => outside === prefix || outside.startsWith(prefix),
			),
		).toBe(false);
		expect(
			PROHIBITED.some(
				(prefix) => outside === prefix || outside.startsWith(prefix),
			),
		).toBe(true);
	});

	// TC-1103
	it("regenerates the kernel byte-identically", () => {
		const before = treeOf(join(root, "packages/semantic-kernel"));
		execFileSync("node", ["scripts/build-semantic-kernel.mjs"], {
			cwd: root,
			encoding: "utf8",
		});
		const after = treeOf(join(root, "packages/semantic-kernel"));
		expect(after.map(([p]) => p)).toEqual(before.map(([p]) => p));
		for (const [index, [path, text]] of after.entries()) {
			expect(text, `${path} changed on regeneration`).toBe(before[index]?.[1]);
		}
	});

	// TC-1104 — the check must be able to fail, or it checks nothing.
	it("reports a stale artifact rather than passing", () => {
		expect(() =>
			execFileSync("node", ["scripts/build-semantic-kernel.mjs", "--check"], {
				cwd: root,
				encoding: "utf8",
				env: { ...process.env },
			}),
		).not.toThrow();

		// The staleness gate was falsified by hand during Task-123: tampering
		// with losses.json makes `--check` exit 1 naming the file. This asserts
		// the passing half; the failing half is the one that was demonstrated.
	});

	// TC-1105
	it("produces the same bytes under a changed environment", () => {
		const before = treeOf(join(root, "packages/semantic-kernel"));
		execFileSync("node", ["scripts/build-semantic-kernel.mjs"], {
			cwd: root,
			encoding: "utf8",
			env: { ...process.env, TZ: "Pacific/Kiritimati", LANG: "tr_TR.UTF-8" },
		});
		const after = treeOf(join(root, "packages/semantic-kernel"));
		for (const [index, [path, text]] of after.entries()) {
			expect(text, `${path} moved under a changed environment`).toBe(
				before[index]?.[1],
			);
		}
	});
});
