/**
 * The closed generated-target vocabulary (FR-063).
 *
 * Read from the published `common.schema.json` rather than restated, so the
 * backend registry and the contract cannot drift apart silently. It lives
 * outside `backends/typescript-v1/` for the same reason `src/compiler/dialects.mjs`
 * lives outside `frontend/`: no module under a backend directory may touch
 * `node:fs`, because those modules are pure by contract and a convenience read
 * there would be the one exception that makes the rule unenforceable.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { REPO_ROOT } from "../packages/lock.mjs";

export const BACKEND_TARGETS = Object.freeze(
	JSON.parse(
		readFileSync(
			resolve(REPO_ROOT, "schema/semantic/v1/common.schema.json"),
			"utf8",
		),
	).$defs.target.enum,
);
