/**
 * The Rust/Serde generation backend's contract with the seam (FR-063, FR-130).
 *
 * This backend was built before the seam existed and reached callers only
 * through `rust-serde/cli.mjs`, so `src/compiler/backends/seam.mjs` registered
 * `rust` as `declaredUnimplemented` and every `generate --target rust` request
 * received `state: "unavailable"` from a repository that could in fact generate
 * the crate. The capability was written and unplugged.
 *
 * Nothing about the generation changes here. `emitCrate` was already pure — a
 * function from a request to a file map — and `rust-serde/index.mjs` already
 * held every write. This module adds only the shape the seam requires: the five
 * members `assertBackendContract` checks, and a `generate` that returns
 * `outputRoot`-relative files rather than a manifest of its own.
 *
 * Purity: this module imports no `node:fs`, which is why it is a separate file
 * from `index.mjs` rather than an export of it. The seam imports it, so any
 * filesystem reach here would make the seam impure for every target, not just
 * this one. The repository `LICENSE` the crate carries verbatim is read through
 * the caller's injected host, as the TypeScript backend reads its own.
 */
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { unrenderedNodes } from "../../constructs.mjs";
import { DIAGNOSTIC_CODES, diagnostic, fragment } from "../../diagnostics.mjs";
import { emitCrate, mediaTypeOf } from "./crate.mjs";
import {
	RUST_BACKEND_CODES,
	diagnostic as rustDiagnostic,
} from "./diagnostics.mjs";

/** This repository's root, from this module's own location. */
const REPO_ROOT = fileURLToPath(new URL("../../../../", import.meta.url));

/**
 * Reads a published repository artifact through the bounded host the caller
 * supplies. There is no `node:fs` fallback: a backend that read ambient
 * repository state when a caller forgot its host would be impure in exactly the
 * case nobody tests.
 */
function readRepositoryText(host, relativePath) {
	if (typeof host?.readText !== "function") {
		throw new TypeError(
			"the Rust backend requires options.host.readText for repository artifacts",
		);
	}
	return host.readText(join(REPO_ROOT, relativePath));
}

/** The backend's own semantic identity, stamped into every output manifest. */
export const identity = "ix://agent-ix/filament-core-data/rust-backend";

/**
 * The Rust/Serde generated target.
 *
 * `supportedIrVersions` is `["1.1.0", "1.2.0"]` through the seam, while
 * `rust-serde/cli.mjs` keeps `["1.0.0", "1.1.0", "1.2.0"]` for its own
 * development path. A contract 1.2.0 `entity` renders by the `kind:entity`
 * row; every other construct kind, and every model member, is refused with
 * `UNSUPPORTED_CONSTRUCT` at its pointer (filament-core-data#147).
 * The narrowing is FR-063-CON-5 applied consistently rather than a capability
 * this backend lacks: the frozen FR-041 prototype document also calls itself
 * `1.0.0` and is a different shape entirely, so a seam that accepted `1.0.0`
 * would make a prototype-shaped document reachable through the contract path.
 * The TypeScript backend declares `["1.1.0"]` for the same reason.
 *
 * `supportedFeatures` is the vocabulary this backend already publishes in its
 * own manifests (`kind:`-prefixed), not the TypeScript backend's unprefixed
 * spelling. The two vocabularies naming the same concepts differently is a real
 * defect, and it is the emitted-set naming repair's to settle — restating one
 * backend's list in the other's spelling here would hide it rather than fix it.
 */
export const rustBackend = Object.freeze({
	identity,
	version: "0.1.0",
	target: "rust",
	owningIssue: "agent-ix/filament-core-data#21",
	supportedIrVersions: Object.freeze(["1.1.0", "1.2.0"]),
	supportedFeatures: Object.freeze([
		"kind:scalar",
		"kind:record",
		"kind:entity",
		"kind:enum",
		"kind:union",
		"kind:alias",
		"kind:sequence",
		"kind:map",
		"kind:reference",
	]),
	generate(request, options = {}) {
		let licenseText;
		try {
			licenseText = readRepositoryText(options.host, "LICENSE");
		} catch (error) {
			return {
				state: "invalid",
				files: [],
				diagnostics: [
					diagnostic(DIAGNOSTIC_CODES.BACKEND_CONTRACT_VIOLATION, {
						message: `the Rust backend could not read the repository LICENSE the crate carries: ${fragment(error.message)}`,
					}),
				],
			};
		}

		const unrendered = unrenderedNodes(request.ir);
		if (unrendered.length > 0)
			return {
				state: "unsupported",
				files: [],
				diagnostics: unrendered.map((node) =>
					rustDiagnostic(RUST_BACKEND_CODES.UNSUPPORTED_CONSTRUCT, {
						message: `/ir${node.pointer}: the Rust backend renders no contract 1.2.0 ${node.member}`,
					}),
				),
			};

		const result = emitCrate(request, { licenseText });

		// `emitCrate` builds a manifest of its own, whose `semanticIdentities` are
		// the only place the per-type identity assignment is exposed. The seam
		// builds the manifest that reaches the caller, so the entries are read for
		// their identities alone and the seam recomputes every digest from the
		// bytes it will hand over — including any the caller's formatter changes.
		const identitiesByPath = new Map(
			(result.manifest?.files ?? []).map((file) => [
				file.path,
				file.semanticIdentities,
			]),
		);

		return {
			state: result.state,
			files: [...result.files].map(([path, text]) => ({
				path,
				text,
				identities: identitiesByPath.get(path),
				mediaType: mediaTypeOf(path),
			})),
			diagnostics: result.diagnostics,
		};
	},
});
