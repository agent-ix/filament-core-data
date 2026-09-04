/**
 * The closed frontend dialect vocabulary (FR-045).
 *
 * Read from the published `common.schema.json` rather than restated, so the
 * registry and the contract cannot drift apart silently. It lives outside
 * `frontend/` because no module under that directory may touch `node:fs`: the
 * frontends reach the file system only through the injected host, and a
 * convenience read here would be the one exception that makes the rule
 * unenforceable.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { REPO_ROOT } from "./packages/lock.mjs";

export const FRONTEND_DIALECTS = Object.freeze(
	JSON.parse(
		readFileSync(
			resolve(REPO_ROOT, "schema/semantic/v1/common.schema.json"),
			"utf8",
		),
	).$defs.frontendDialect.enum,
);
