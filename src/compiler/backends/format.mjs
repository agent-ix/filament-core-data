/**
 * The injected formatter (FR-071).
 *
 * This module is the one module under `src/compiler/backends/` that starts a
 * child process, in the way `src/compiler/identity.mjs` is the one module under
 * `src/compiler/` outside `cli.mjs` that reads a file. Every module under
 * `backends/typescript-v1/` stays pure and receives the formatter as an
 * argument rather than reaching for it.
 *
 * The issue's third deliverable names deterministic *formatted* output, and
 * determinism alone does not supply it: two runs of a consistently ugly
 * generator agree with each other. So the generated text is rendered through
 * this repository's own exactly-pinned `@biomejs/biome` binary, exactly as
 * `conformance/tools/format-json.mjs` already renders generated JSON. Two
 * consequences follow by construction rather than by care: `biome format .`
 * over a committed generated fixture reports no change, and `biome.json` — a
 * prohibited path under NFR-025 — is never edited.
 *
 * A formatter that is unavailable or exits non-zero is a *failure*, never a
 * silent pass-through. Writing unformatted output would leave a committed
 * fixture that `make lint` rejects and a digest over bytes nobody chose.
 */

import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** This repository's root, from this module's own location. */
const REPO_ROOT = resolve(
	dirname(fileURLToPath(import.meta.url)),
	"..",
	"..",
	"..",
);

/** The pinned binary `pnpm install` links; the version comes from the lockfile. */
export const BIOME_BINARY = join(REPO_ROOT, "node_modules", ".bin", "biome");

/**
 * The extensions the pinned formatter has a formatter for.
 *
 * A file it cannot format — the generated `LICENSE`, which carries no extension
 * at all — passes through unchanged. Handing it to the binary anyway is not
 * merely noisy: it warns on stderr on every run, which would make a clean
 * generation look like a failing one to anything reading that stream.
 */
const FORMATTED_EXTENSIONS = Object.freeze([
	".ts",
	".mts",
	".js",
	".mjs",
	".json",
]);

/** True when the pinned formatter has an opinion about this path. */
function formattable(path) {
	const dot = String(path).lastIndexOf(".");
	return dot >= 0 && FORMATTED_EXTENSIONS.includes(String(path).slice(dot));
}

/** Raised when the formatter cannot run or refuses the text it was given. */
export class FormatterError extends Error {
	constructor(path, cause) {
		super(`the pinned formatter failed on ${path}: ${cause}`);
		this.name = "FormatterError";
		this.path = path;
	}
}

/**
 * A formatter for the seam's `options.format(text, path)`.
 *
 * `root` defaults to this repository, so the formatter reads this repository's
 * `biome.json` and the generated style and the repository's style are the same
 * style by construction. `binary` exists so a test can drive the failure arm
 * with a command that exits non-zero, without a network or a real install.
 */
export function biomeFormatter({
	root = REPO_ROOT,
	binary = BIOME_BINARY,
} = {}) {
	return function format(text, path) {
		if (!formattable(path)) return text;
		try {
			return execFileSync(binary, ["format", `--stdin-file-path=${path}`], {
				cwd: root,
				encoding: "utf8",
				input: text,
				maxBuffer: 64 * 1024 * 1024,
			});
		} catch (error) {
			throw new FormatterError(path, error.message);
		}
	};
}

/**
 * The identity formatter, for a caller that has decided not to format.
 *
 * Named rather than written inline at each call site, so that "this generation
 * was not formatted" is a visible choice in the caller's source rather than an
 * absent argument.
 */
export function unformatted() {
	return (text) => text;
}
