/**
 * The injected Python producer (issue #23, ADR-0006).
 *
 * This module is to the Python backend what `src/compiler/backends/format.mjs`
 * is to generation: the one module in its path that starts a child process.
 * Every module under `backends/python-v1/` stays pure and receives the producer
 * as an argument rather than reaching for it, so the backend does not know a
 * process is involved — the property ADR-0006 makes normative and the reason
 * NFR-020-AC-5 still holds after this target became reachable.
 *
 * The generator is a Python program. That is not an accident of packaging:
 * `datamodel-code-generator` emits Python from JSON Schema, and issue #23's
 * acceptance criteria forbid introducing a hand-written Python generator to
 * avoid the subprocess. So the boundary is the honest one — a process — and it
 * is confined here rather than spread across the backend.
 *
 * It runs through `poetry run` for the same reason the conformance adapter
 * does: the generator, its formatter and its pinned Pydantic are the project's
 * locked versions, and a bare interpreter resolves whichever ones the machine
 * happens to carry. A producer that cannot run, exits non-zero, or returns
 * something other than a file map is a *failure*, never a silent pass-through:
 * an empty package is one a consumer would import and find nothing in.
 */

import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** This repository's root, from this module's own location. */
const REPO_ROOT = resolve(
	dirname(fileURLToPath(import.meta.url)),
	"..",
	"..",
	"..",
	"..",
);

/** The entry point on the Python side; see `python_backend/runner/seam.py`. */
export const PRODUCER_COMMAND = Object.freeze([
	"poetry",
	"run",
	"python",
	"-m",
	"python_backend.runner.seam",
]);

/** Raised when the producer cannot run or refuses the input it was given. */
export class ProducerError extends Error {
	constructor(profileId, cause) {
		super(`the Python producer failed for profile ${profileId}: ${cause}`);
		this.name = "ProducerError";
		this.profileId = profileId;
	}
}

/**
 * A producer for the seam's `options.produce(documents, profileId)`.
 *
 * `command` exists so a test can drive the failure arm with something that
 * exits non-zero, without a Python environment — the seam it gives the failure
 * path is the same seam `biomeFormatter`'s `binary` gives the formatter's.
 */
export function poetryProducer({
	root = REPO_ROOT,
	command = PRODUCER_COMMAND,
} = {}) {
	return function produce(documents, profileId) {
		let raw;
		try {
			raw = execFileSync(command[0], command.slice(1), {
				cwd: root,
				encoding: "utf8",
				input: JSON.stringify({ profileId, documents }),
				maxBuffer: 256 * 1024 * 1024,
				stdio: ["pipe", "pipe", "pipe"],
			});
		} catch (error) {
			const detail = String(error.stderr ?? "").trim() || error.message;
			throw new ProducerError(profileId, detail);
		}
		let answer;
		try {
			answer = JSON.parse(raw);
		} catch (error) {
			throw new ProducerError(
				profileId,
				`the producer's answer is not JSON: ${error.message}`,
			);
		}
		const files = answer?.files;
		if (files === null || typeof files !== "object" || Array.isArray(files))
			throw new ProducerError(profileId, "the producer returned no file map");
		if (Object.keys(files).length === 0)
			throw new ProducerError(profileId, "the producer returned no files");
		for (const [path, text] of Object.entries(files))
			if (typeof text !== "string")
				throw new ProducerError(profileId, `${path} is not text`);
		return files;
	};
}

/**
 * A producer that refuses, for a caller that has decided not to run Python.
 *
 * Named rather than left absent, so that "this generation did not reach the
 * generator" is a visible choice in the caller's source. It refuses rather than
 * returning an empty map, because an empty map is a package.
 */
export function unavailableProducer() {
	return (_documents, profileId) => {
		throw new ProducerError(profileId, "no producer was supplied");
	};
}
