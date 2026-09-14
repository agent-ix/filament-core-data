/**
 * The FR-090 golden corpus loader.
 *
 * Reads `packages/semantic-kernel/parity/golden/` and nothing else. It decides
 * nothing, compares nothing and canonicalizes nothing: the corpus's verdict
 * shape is produced by `project.mjs` and normalized by `substantive` from
 * `conformance/oracle/index.mjs`, which is the only module under `conformance/`
 * anything here imports (FR-090-CON-3).
 */

import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

/** The golden corpus directory, resolved relative to this module. */
export const GOLDEN_DIR = resolve(import.meta.dirname, "golden");

/** The repository root, resolved relative to this module. */
export const REPO_ROOT = resolve(import.meta.dirname, "..", "..", "..");

/** Every golden document, in identifier order. */
export function loadGolden() {
	return readdirSync(GOLDEN_DIR)
		.filter((name) => name.endsWith(".json"))
		.sort()
		.map((name) => JSON.parse(readFileSync(resolve(GOLDEN_DIR, name), "utf8")));
}

/** The four packages this requirement measures, in report order. */
export const PACKAGES = ["json-schema", "typescript", "python", "rust"];
