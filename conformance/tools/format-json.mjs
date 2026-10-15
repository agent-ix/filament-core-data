/**
 * Renders a JSON value the way the repository's pinned formatter does.
 *
 * The corpus commits one generated JSON file, `corpus.json`, and the
 * repository's `make lint` runs `biome format` over every file. Rendering
 * through the same pinned formatter keeps the file byte-identical whether the
 * maintenance tool writes it or a gate regenerates it.
 *
 * This is a maintenance and gate helper: the maintenance tool writes
 * `corpus.json` through it, and the harness renders the coverage account
 * through it. Nothing on the verdict path calls it.
 */

import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** Formats `value` as the pinned formatter would write it at `name`. */
export function formatJson(value, name) {
	return execFileSync(
		join(REPO, "node_modules", ".bin", "biome"),
		["format", `--stdin-file-path=${name}`],
		{
			cwd: REPO,
			encoding: "utf8",
			input: `${JSON.stringify(value, null, "\t")}\n`,
		},
	);
}
