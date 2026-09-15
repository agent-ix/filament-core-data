/** Issue #6 / FR-134 — the retired Avro boundary cannot be accidentally revived. */

import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

describe("legacy Avro boundary retirement", () => {
	/** Traces: FR-134-AC-1, FR-134-AC-3, FR-134-AC-7; issue #6. */
	it("removes every shipped Avro contract boundary and disables its releases", () => {
		for (const path of [
			"schema/avro/core-data.avpr",
			"src/generated.ts",
			"agent_ix_core_data",
			"scripts/generate-core-data-schema.mjs",
			"fixtures/representative-core-payloads.json",
			"fixtures/semantic/v1/legacy/avro-bridge.json",
			".github/workflows/release.yml",
			".github/workflows/python-release.yml",
		]) {
			expect(existsSync(resolve(root, path)), path).toBe(false);
		}

		const packageJson = JSON.parse(
			readFileSync(resolve(root, "package.json"), "utf8"),
		) as Record<string, unknown>;
		expect(packageJson.private).toBe(true);
		for (const key of ["main", "module", "types", "exports", "files"])
			expect(packageJson[key], key).toBeUndefined();
		const scripts = packageJson.scripts as Record<string, string>;
		expect(scripts.generate).toBeUndefined();
		expect(scripts.prepublishOnly).toBeUndefined();

		const pyproject = readFileSync(resolve(root, "pyproject.toml"), "utf8");
		expect(pyproject).toContain("package-mode = false");
		expect(pyproject).not.toContain("agent_ix_core_data");
		expect(pyproject).not.toContain("core-data.avpr");
	});
});
