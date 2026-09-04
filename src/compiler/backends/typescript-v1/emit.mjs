/**
 * The orchestration behind the `generate` verb (FR-071).
 *
 * `generateTarget` returns a manifest, not the bytes: the seam digests each
 * file's *formatted* text and then keeps only the digest, because placing bytes
 * on disk is the caller's job and the seam writes nothing. The caller still
 * needs those bytes, and it must have exactly the ones that were digested —
 * formatting them a second time here would be a second computation that only
 * happens to agree.
 *
 * So the formatter the seam is given records what it returns. The seam calls
 * `format(text, path)` exactly once per emitted file, immediately before
 * `digestOf`, so the recording is the digested bytes by construction rather
 * than by coincidence. `emitTypeScriptPackage` then checks that every path the
 * manifest names was recorded, and fails loudly if the two ever drift.
 */

import { generateTarget } from "../seam.mjs";

/**
 * Generates a package and returns both halves: the
 * `output-manifest.schema.json` document and the formatted bytes it describes.
 *
 * `options.format` is the injected formatter of `src/compiler/backends/format.mjs`.
 * It is required rather than defaulted: an unformatted generation is a
 * legitimate choice, and `unformatted()` names it, but it is not one a caller
 * should be able to make by omission.
 */
export function emitTypeScriptPackage(request, options = {}) {
	if (typeof options.format !== "function") {
		throw new TypeError(
			"emitTypeScriptPackage requires options.format; pass biomeFormatter() or unformatted()",
		);
	}
	const recorded = new Map();
	const format = (text, path) => {
		const formatted = options.format(text, path);
		recorded.set(path, formatted);
		return formatted;
	};

	const manifest = generateTarget(request, {
		target: options.target ?? "typescript",
		host: options.host,
		registry: options.registry,
		format,
	});

	const files = [];
	for (const entry of manifest.files) {
		if (!recorded.has(entry.path)) {
			throw new Error(
				`the manifest names ${entry.path} but no formatted text was recorded for it; the seam and this module disagree about what was emitted`,
			);
		}
		files.push({ path: entry.path, text: recorded.get(entry.path) });
	}
	return { manifest, files };
}
