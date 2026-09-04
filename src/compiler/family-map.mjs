/**
 * The observed-change to report-family map (FR-051), read as data.
 *
 * It lives outside `compat/` for the same reason `dialects.mjs` lives outside
 * `frontend/`: no module under those directories may touch `node:fs`, and one
 * convenience read is what makes such a rule unenforceable. It reads from
 * `src/compiler/` rather than from a fixture, because `package.json` `files`
 * does not ship `test/` — a map the published package cannot open is not a map.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

let cached;

/** `{ <observed family>: { family, surface } }`. */
export function familyMap() {
	if (!cached) {
		cached = Object.freeze(
			JSON.parse(readFileSync(resolve(here, "compat/family-map.json"), "utf8"))
				.families,
		);
	}
	return cached;
}
