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

const root = resolve(dirname(new URL(import.meta.url).pathname), "..");

const read = (path: string): string =>
	readFileSync(resolve(root, path), "utf8");

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
	/** NFR-027-AC-11. */
	it("TC-942 names no python_backend path in the distribution manifest", () => {
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

	// TC-925 ("keeps every generated path out of the packed distribution") is
	// deleted with its subject. It ran `npm pack --dry-run` over the root
	// package to prove no `python_backend` path reached the tarball. `737824e`
	// retired the Avro publish path: the manifest is `private: true` with no
	// `files` allowlist, so it publishes nothing and `npm pack` sweeps the whole
	// tree. The case could only fail (#226).
});
