/**
 * `generateRust(request, sink)` — the one module in this backend that writes.
 *
 * The split is deliberate and it is what the determinism and purity gates rest
 * on. `emitCrate` is a pure function from a request to bytes; everything that
 * touches a filesystem is here. A defect in the mapping is therefore reproduced
 * by calling one function with one object, and a defect in the writing cannot
 * hide inside the mapping.
 *
 * Two rules the writer keeps:
 *
 * - Nothing is written until every diagnostic has been collected and none is
 *   blocking, so a refused generation leaves no partial crate behind.
 * - No path outside the request's `outputRoot` is written, and `outputRoot`
 *   itself must satisfy the FR-057 intended-language predicate before a
 *   directory is created.
 */

import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { emitCrate } from "./crate.mjs";
import { hasBlocking } from "./diagnostics.mjs";

/** The repository root, located from this module rather than from the cwd. */
export const REPOSITORY_ROOT = fileURLToPath(
	new URL("../../../../", import.meta.url),
);

/** Reads the repository `LICENSE`, which the emitted crate carries verbatim. */
export function readLicense(root = REPOSITORY_ROOT) {
	return readFileSync(join(root, "LICENSE"), "utf8");
}

/**
 * A sink that writes to a directory.
 *
 * `base` is a host directory; `outputRoot` is the request's own relative path
 * inside it. Every write is resolved and checked against the join of the two,
 * so a path that escapes the output root is refused by the writer as well as by
 * the schema pattern the request was validated against.
 */
export function directorySink(base) {
	const root = resolve(base);
	return {
		root,
		clear(outputRoot) {
			rmSync(join(root, outputRoot), { recursive: true, force: true });
		},
		write(outputRoot, relativePath, text) {
			const target = resolve(root, outputRoot, relativePath);
			const bound = resolve(root, outputRoot);
			if (target !== bound && !target.startsWith(bound + sep)) {
				throw new Error(
					`refusing to write ${relativePath}, which resolves outside the output root`,
				);
			}
			mkdirSync(dirname(target), { recursive: true });
			writeFileSync(target, text, "utf8");
		},
	};
}

/**
 * Generates one crate.
 *
 * Returns the output manifest. Where the run is blocked the manifest carries
 * zero files, at least one blocking diagnostic, and the result state the FR-058
 * rule assigns; nothing is written in that case.
 */
export function generateRust(request, sink, options = {}) {
	const licenseText = options.licenseText ?? readLicense(options.root);
	const result = emitCrate(request, { licenseText });

	if (hasBlocking(result.diagnostics)) return result.manifest;

	sink.clear?.(request.outputRoot);
	for (const [path, text] of result.files) {
		sink.write(request.outputRoot, path, text);
	}
	return result.manifest;
}
