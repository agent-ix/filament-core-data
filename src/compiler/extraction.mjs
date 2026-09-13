/**
 * The injected extraction producer (FR-131, ADR-0006).
 *
 * This module is the one module in the extraction path that starts a child
 * process, in the way `src/compiler/backends/format.mjs` is the one module under
 * `backends/` that starts one and `src/compiler/identity.mjs` is the one module
 * under `src/compiler/` outside `cli.mjs` that reads a file. Every module under
 * `frontend/` stays pure and receives the producer as an argument rather than
 * reaching for it.
 *
 * It lives here rather than beside the frontend it serves because `frontend/` is
 * inside NFR-020-AC-5's scope: no module there may import a network-capable or
 * code-executing built-in, and that criterion is not weakened to accommodate
 * this. The effect goes outside the pure set and the capability is handed in,
 * which is the answer FR-071 already made normative for the generation half.
 *
 * The extraction itself is a Rust workspace member. `crates/extraction-frontend`
 * loads a repository `spec/` tree through the Quire extraction contract and
 * writes the semantic IR document beside a fingerprint, a diagnostics sidecar
 * and a provenance record, atomically. None of that is reimplemented here; this
 * is the wire, and a wire that did any of the work would be a second producer of
 * one artifact.
 *
 * A producer that is absent or exits without saying why is a *failure*, never a
 * silent pass-through. That is the rule `format.mjs` states for its own binary
 * and it holds for the same reason: a silent pass-through yields an artifact
 * nobody chose, and here it would be an empty document that validates.
 */

import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** This repository's root, from this module's own location. */
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** The sidecar suffixes the producer writes beside the document (FR-097). */
export const DIAGNOSTICS_SUFFIX = ".diagnostics.json";

/** Raised when the producer cannot run at all. */
export class ProducerError extends Error {
	constructor(cause) {
		super(`the extraction producer could not run: ${cause}`);
		this.name = "ProducerError";
	}
}

/**
 * The producer's own identity, for the record a caller keeps.
 *
 * A digest over the executable answers "which binary produced this document"
 * from evidence rather than from the reader's memory of what was on the path.
 * An executable that cannot be digested is reported as such rather than as a
 * digest of nothing.
 */
function digestOf(executable) {
	try {
		return `sha256:${createHash("sha256").update(readFileSync(executable)).digest("hex")}`;
	} catch {
		return undefined;
	}
}

/**
 * A producer backed by a built `extraction-frontend` binary.
 *
 * Returns the function the frontend seam passes as `request.lift`. The frontend
 * calls it and reads what it names; it neither knows nor can discover that a
 * process was involved.
 *
 * `binary` exists so a test can drive the failure arms — a producer that exits
 * non-zero with no diagnostic, and one that exits zero writing nothing — with a
 * command that needs no toolchain and no network.
 */
export function builtProducer({ binary, root = REPO_ROOT } = {}) {
	if (typeof binary !== "string" || binary.length === 0) {
		throw new TypeError(
			"builtProducer requires the path of an extraction-frontend binary",
		);
	}
	return function lift({ bundleRoot, moduleRoots = [] }) {
		const scratch = mkdtempSync(join(tmpdir(), "fcd-lift-"));
		const out = join(scratch, "semantic-ir.json");
		const args = ["lift", "--bundle", bundleRoot];
		for (const module of moduleRoots) args.push("--module", module);
		args.push("--out", out);

		const run = spawnSync(binary, args, {
			cwd: root,
			encoding: "utf8",
			// The environment is not inherited. A document that varied with an
			// ambient variable would be the determinism leak every other gate in
			// this repository forbids, and inheriting is the easiest way to get one.
			env: { PATH: process.env.PATH ?? "" },
			maxBuffer: 256 * 1024 * 1024,
		});
		if (run.error) {
			rmSync(scratch, { recursive: true, force: true });
			throw new ProducerError(run.error.message);
		}

		const read = (path) => {
			try {
				return readFileSync(path, "utf8");
			} catch {
				return undefined;
			}
		};
		const result = {
			status: run.status,
			stderr: run.stderr ?? "",
			document: read(out),
			diagnostics: read(`${out}${DIAGNOSTICS_SUFFIX}`),
			producer: { executable: binary, digest: digestOf(binary), args },
		};
		rmSync(scratch, { recursive: true, force: true });
		return result;
	};
}

/**
 * A producer that builds the binary through `cargo` before running it.
 *
 * Kept separate from `builtProducer` rather than folded into it as a fallback:
 * a caller that meant to use a built artifact and silently got a compile
 * instead would be told nothing, and the two have entirely different costs.
 */
export function cargoProducer({
	root = REPO_ROOT,
	toolchain = "1.98.1",
	profile = "debug",
} = {}) {
	let binary;
	return function lift(request) {
		if (binary === undefined) {
			try {
				execFileSync(
					"cargo",
					[
						`+${toolchain}`,
						"build",
						"--locked",
						"-p",
						"agent-ix-extraction-frontend",
						"--bin",
						"extraction-frontend",
					],
					{ cwd: root, encoding: "utf8", stdio: "pipe" },
				);
			} catch (error) {
				throw new ProducerError(error.message);
			}
			binary = join(
				process.env.CARGO_TARGET_DIR ?? join(root, "target"),
				profile,
				"extraction-frontend",
			);
		}
		return builtProducer({ binary, root })(request);
	};
}
