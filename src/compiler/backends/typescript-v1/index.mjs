/**
 * The TypeScript generation backend (FR-063).
 *
 * This module is the backend's *contract* with the seam — its identity, the
 * contract versions it accepts, the features it claims — and the four steps
 * behind its one `generate` entry point: admit the document (FR-068), decide
 * what the target can represent (FR-068), resolve the model (FR-064), and
 * assemble the package (FR-065).
 *
 * Purity: nothing here reads a clock, an environment variable, `process.cwd()`,
 * or a socket, and nothing reaches the file system directly. Every read goes
 * through the host the caller injects, so a refusal is a refusal in fact and
 * the set of files a generation touched is observable rather than asserted.
 *
 * A refusal returns zero files and at least one diagnostic, never an empty
 * success: a `state: "success"` with no files would satisfy
 * `output-manifest.schema.json` and assert nothing, which is the vacuous pass
 * this repository's gates exist to refuse.
 */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { inheritedNameCollisions, renderingView } from "../../constructs.mjs";
import { DIAGNOSTIC_CODES, diagnostic, fragment } from "../../diagnostics.mjs";
import { SCHEMA_FILES, admitIr } from "./admit.mjs";
import { fingerprintIrForTarget } from "./canonical.mjs";
import { LOSS_CODES, refusesGeneration, representability } from "./loss.mjs";
import {
	auditRenderedNodes,
	renderIdentity,
	renderProvenance,
} from "./metadata.mjs";
import { buildModel } from "./model.mjs";
import { renderPackage } from "./package-layout.mjs";
import { renderTypes } from "./types.mjs";
import { renderErrors, renderValidators } from "./validators.mjs";

/** This repository's root, from this module's own location. */
const REPO_ROOT = resolve(
	dirname(fileURLToPath(import.meta.url)),
	"..",
	"..",
	"..",
	"..",
);

/**
 * Reads a published repository artifact through the bounded host supplied by the
 * caller. The backend never falls back to `node:fs`: doing that would make an
 * ostensibly pure IR-to-package function read ambient repository state when a
 * caller forgot its host. The CLI supplies the sole filesystem boundary.
 */
function repositoryReader(host) {
	if (typeof host?.readText !== "function") {
		throw new TypeError(
			"the TypeScript backend requires options.host.readText for repository artifacts",
		);
	}
	return (relativePath) => {
		const absolute = join(REPO_ROOT, relativePath);
		return host.readText(absolute);
	};
}

/**
 * An admissibility diagnostic, carried into the output manifest.
 *
 * `common.schema.json#/$defs/diagnostic` is `additionalProperties: false` and
 * has no member for an in-document location — that is GAP-003 — so the RFC 6901
 * pointer, which the reader carries beside the diagnostic, is folded into the
 * message rather than dropped. A pointer that reached the manifest as a
 * silently discarded member would be worse than one a reader can see.
 */
function manifestDiagnostic(located) {
	return {
		...located.diagnostic,
		message:
			located.pointer.length > 0
				? `${located.pointer}: ${located.diagnostic.message}`
				: located.diagnostic.message,
	};
}

/** A representability loss, in the shape the manifest carries. */
function lossDiagnostic(loss) {
	return {
		code: loss.code,
		severity: "error",
		message: `${loss.pointer}: the TypeScript target cannot represent ${fragment(loss.construct)} on ${fragment(loss.owner)}${loss.detail ? ` (${fragment(loss.detail)})` : ""}`,
		owner: loss.owner,
		blocking: true,
		causes: [],
		related: [],
	};
}

/** The backend's own semantic identity, stamped into every output manifest. */
export const identity = "ix://agent-ix/filament-core-data/backend/typescript";

/**
 * The one implemented generated target.
 *
 * `supportedIrVersions` admits the compatible 1.1.0 and 1.2.0 contracts: the frozen FR-041 prototype
 * document also calls itself `1.0.0` and is a different shape entirely, so
 * accepting `1.0.0` here would make a prototype-shaped document reachable
 * through the contract seam (FR-063-CON-5).
 */
export const typescriptBackend = Object.freeze({
	identity,
	version: "0.1.0",
	target: "typescript",
	owningIssue: "agent-ix/filament-core-data#22",
	supportedIrVersions: Object.freeze(["1.1.0", "1.2.0"]),
	supportedFeatures: Object.freeze([
		"scalar",
		"record",
		"entity",
		"value_object",
		"nested_entity",
		"aggregate_root",
		"enumeration",
		"event",
		"state_machine",
		"process",
		"repository",
		"domain",
		"supertypes",
		"feature-redefinition",
		"operation-contract",
		"populations",
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
	generate(request, options = {}) {
		const read = repositoryReader(options.host);

		// Layer 1: is this document admissible at all? The backend decides for
		// itself rather than asking the compiler, because a backend that asks the
		// compiler whether the compiler's output is valid produces agreement and
		// no evidence (FR-068-CON-1).
		let admission;
		try {
			admission = admitIr(
				{ ir: request.ir },
				{ schemas: SCHEMA_FILES.map((file) => JSON.parse(read(file))) },
			);
		} catch (error) {
			return {
				state: "invalid",
				files: [],
				diagnostics: [
					diagnostic(DIAGNOSTIC_CODES.BACKEND_CONTRACT_VIOLATION, {
						message: `the admissibility reader could not run: ${fragment(error.message)}`,
					}),
				],
			};
		}
		if (admission.resultState === "invalid") {
			return {
				state: "invalid",
				files: [],
				diagnostics: admission.diagnostics.map(manifestDiagnostic),
			};
		}

		// Layer 2: can the target represent everything the document declares? The
		// committed target contract sets `unsupportedFeaturePolicy: "fail"`, so a
		// declared loss refuses rather than degrades. An admissibility result of
		// `lossy` is a different thing and still generates (FR-065-AC-13).
		const losses = representability(request.ir);
		if (refusesGeneration(losses)) {
			return {
				state: "unsupported",
				files: [],
				diagnostics: losses.map(lossDiagnostic),
			};
		}

		// Two effective fields sharing a name, one inherited and neither
		// redefining the other, would leave one dropped from the interface
		// (FR-141). Each is refused by name.
		const inherited = inheritedNameCollisions(request.ir);
		if (inherited.length > 0) {
			return {
				state: "unsupported",
				files: [],
				diagnostics: inherited.map((collision) =>
					lossDiagnostic({
						code: LOSS_CODES.IDENTIFIER_COLLISION.code,
						construct: "inherited-field-collision",
						owner:
							request.ir.types[Number(collision.pointer.split("/")[2])]
								?.identity,
						pointer: `/ir${collision.pointer}`,
						detail: `two effective fields are named ${collision.name}; neither redefines the other`,
					}),
				),
			};
		}

		// A subtype's interface carries its inherited fields (FR-141).
		const model = buildModel(renderingView(request.ir), {
			backendIdentity: identity,
			backendVersion: typescriptBackend.version,
		});
		if (model.losses.length > 0) {
			return {
				state: "unsupported",
				files: [],
				diagnostics: model.losses.map(lossDiagnostic),
			};
		}

		const fingerprint = fingerprintIrForTarget(request.ir);
		const rendered = renderPackage(model, {
			fingerprint,
			license: read("LICENSE"),
			types: renderTypes(model),
			validators: renderValidators(model),
			errors: renderErrors(),
			identity: renderIdentity(model),
			provenance: renderProvenance(model, { fingerprint }),
		});
		const unrendered = auditRenderedNodes(model, rendered.files);
		if (unrendered.length > 0) {
			throw new Error(
				`TypeScript backend dropped identity-bearing model nodes: ${unrendered.join(", ")}`,
			);
		}
		return {
			state: admission.resultState === "lossy" ? "lossy" : "success",
			// `outputRoot`-relative, as FR-063 requires: the seam checks the paths
			// against the root the caller named, and the caller joins the two when
			// it writes. A path that already carried the root would be checked
			// against it twice and written under it twice.
			files: rendered.files,
			diagnostics: admission.diagnostics.map(manifestDiagnostic),
		};
	},
});
