import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

let cached;

/**
 * The promoted emitter's own `name@version`, stamped into the IR when the
 * caller supplies no `generator` identity (FR-041-AC-8).
 *
 * This module is the one place under `src/compiler/` outside `cli.mjs` that
 * reads a file; the backends and the adapter stay pure.
 */
export function defaultGeneratorId() {
	if (cached === undefined) {
		const manifest = JSON.parse(
			readFileSync(resolve(here, "emitters/semantic-ir/package.json"), "utf8"),
		);
		cached = `${manifest.name}@${manifest.version}`;
	}
	return cached;
}
