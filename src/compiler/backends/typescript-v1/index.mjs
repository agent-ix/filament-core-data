/**
 * The TypeScript generation backend (FR-063).
 *
 * This module is the backend's *contract* with the seam: its identity, the
 * contract versions it accepts, the features it claims, and one `generate`
 * entry point. The contract is complete as written; what is not complete is the
 * generation itself, which Task-105 through Task-110 of
 * `plan/Plan-011-typescript-backend/` land — the resolved model, the type
 * projection, the validators, the metadata, and the package layout.
 *
 * Until those land `generate` returns `state: "unsupported"` with one
 * diagnostic naming the tasks that own it, which is what the seam's own
 * contract requires of a backend that cannot produce a file: zero files and at
 * least one diagnostic, never an empty success. A stub that returned
 * `state: "success"` with no files would satisfy `output-manifest.schema.json`
 * and assert nothing, and is exactly the vacuous pass this repository's gates
 * exist to refuse.
 *
 * Purity: nothing here reads a clock, an environment variable, `process.cwd()`,
 * the file system, or a socket. The declared target contract is loaded by the
 * caller through the injected host, not imported here, for the same reason.
 */
import { DIAGNOSTIC_CODES, diagnostic } from "../../diagnostics.mjs";

/** The backend's own semantic identity, stamped into every output manifest. */
export const identity = "ix://agent-ix/filament-core-data/backend/typescript";

/**
 * The one implemented generated target.
 *
 * `supportedIrVersions` is exactly `["1.1.0"]`: the frozen FR-041 prototype
 * document also calls itself `1.0.0` and is a different shape entirely, so
 * accepting `1.0.0` here would make a prototype-shaped document reachable
 * through the contract seam (FR-063-CON-5).
 */
export const typescriptBackend = Object.freeze({
	identity,
	version: "0.1.0",
	target: "typescript",
	owningIssue: "agent-ix/filament-core-data#22",
	supportedIrVersions: Object.freeze(["1.1.0"]),
	supportedFeatures: Object.freeze([
		"scalar",
		"record",
		"enum",
		"union",
		"alias",
		"sequence",
		"map",
		"reference",
		"recursion",
		"multiplicity",
		"nullability",
		"unknown-policy",
		"constraint",
		"relationship",
		"extension",
		"occurrence",
		"runtime-validation",
		"identity-metadata",
	]),
	generate() {
		return {
			state: "unsupported",
			files: [],
			diagnostics: [
				diagnostic(DIAGNOSTIC_CODES.BACKEND_NOT_IMPLEMENTED, {
					message:
						"the TypeScript renderers are not landed yet; they are Task-105 through Task-110 of plan/Plan-011-typescript-backend",
				}),
			],
		};
	},
});
