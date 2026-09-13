/**
 * The `spec-bundle` frontend (FR-045, FR-131).
 *
 * The extraction itself is a Rust workspace member. This module is the wire
 * between that producer and the frontend seam, and nothing more: it maps a
 * `FrontendRequest` onto one producer call and the result back into a
 * `FrontendResult`.
 *
 * It imports nothing effectful. No module under `frontend/` may — NFR-020-AC-5
 * forbids the code-executing and network built-ins here, and `dialects.mjs`
 * states that no module under this directory may touch `node:fs` either,
 * because the one convenience read is what makes the rule unenforceable. So the
 * producer arrives as an argument, exactly as a backend receives its formatter:
 * this module does not know a process is involved, and could not start one
 * ([ADR-0006](../../../../docs/semantic-data-system/adr/0006-frontend-host-boundary.md)).
 *
 * The producer can fail in ways no input can cause — exiting non-zero without
 * writing a diagnostic, or exiting zero without writing a readable document.
 * Neither is a defect in the bundle, so neither is reported as one: a reader who
 * saw a bundle-shaped code would go looking in the bundle.
 */
import {
	DIAGNOSTIC_CODES,
	diagnostic,
	fragment,
	hasBlocking,
	sortDiagnostics,
} from "../../diagnostics.mjs";

export const dialect = "spec-bundle";

/** Parses the producer's diagnostics sidecar, tolerating either shape. */
function parseDiagnostics(text) {
	if (typeof text !== "string") return undefined;
	try {
		const parsed = JSON.parse(text);
		return Array.isArray(parsed) ? parsed : parsed?.diagnostics;
	} catch {
		return undefined;
	}
}

/** The producer failed in a way the bundle cannot have caused. */
function contractViolation(message) {
	return diagnostic(DIAGNOSTIC_CODES.FRONTEND_CONTRACT_VIOLATION, {
		message,
	});
}

/**
 * Runs the frontend over a `FrontendRequest`.
 *
 * Never throws for a defect in the request or in the bundle it names: an input
 * defect is a diagnostic, as the seam requires. A caller that supplied no
 * producer is a defect in the *calling program* and throws, which is the seam's
 * own rule and the reason the two are distinguished at all.
 */
export async function run(request) {
	const lift = request.lift;
	if (typeof lift !== "function") {
		throw new TypeError(
			"the spec-bundle frontend requires request.lift, the injected extraction producer; see ADR-0006",
		);
	}

	const bundleRoot =
		request.resolution?.root?.packageRoot ?? request.bundleRoot;
	if (typeof bundleRoot !== "string" || bundleRoot.length === 0) {
		return {
			ir: null,
			diagnostics: [
				diagnostic(DIAGNOSTIC_CODES.INVALID_REQUEST, {
					message:
						"the spec-bundle frontend needs a bundle root, and the request names none",
				}),
			],
		};
	}

	const produced = lift({
		bundleRoot,
		moduleRoots: request.moduleRoots ?? [],
	});
	const reported = parseDiagnostics(produced.diagnostics);
	const diagnostics = sortDiagnostics(reported ?? []);

	if (produced.status !== 0) {
		// The producer refused. Its own diagnostics are the reason; an exit code
		// with nothing behind it is a contract violation rather than a refusal
		// that can be forwarded, because a refusal naming nothing cannot be acted
		// on.
		if (diagnostics.length === 0) {
			return {
				ir: null,
				diagnostics: [
					contractViolation(
						`the extraction producer exited ${fragment(String(produced.status))} without writing a diagnostic: ${fragment((produced.stderr ?? "").trim().slice(0, 240))}`,
					),
				],
			};
		}
		return { ir: null, diagnostics };
	}

	if (typeof produced.document !== "string") {
		return {
			ir: null,
			diagnostics: [
				...diagnostics,
				contractViolation(
					"the extraction producer exited zero and wrote no document",
				),
			],
		};
	}

	let ir;
	try {
		ir = JSON.parse(produced.document);
	} catch (error) {
		return {
			ir: null,
			diagnostics: [
				...diagnostics,
				contractViolation(
					`the extraction producer exited zero and its document could not be parsed: ${fragment(error.message)}`,
				),
			],
		};
	}

	// The seam asserts this too. It is asserted here as well because the two
	// failures are different: the seam catches a frontend that broke the
	// contract, and this catches a producer that did.
	if (hasBlocking(diagnostics)) {
		return { ir: null, diagnostics };
	}
	return { ir, diagnostics };
}
