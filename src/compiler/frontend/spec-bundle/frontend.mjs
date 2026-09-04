/**
 * The `spec-bundle` frontend: registered, and deliberately not implemented
 * (FR-045-CON-1).
 *
 * The dialect exists in the published `frontendDialect` vocabulary, so a caller
 * can name it. Registering it here — rather than leaving `selectFrontend` to
 * fail with "unknown dialect" — is the difference between the compiler saying
 * "that is not a dialect" and saying "that is a dialect this repository has not
 * built yet, and here is the ticket that owns it". The shared fixture harness
 * and the diagnostic exist before the frontend does, so issue #36 plugs into a
 * seam that is already under test.
 */
import { DIAGNOSTIC_CODES, diagnostic } from "../../diagnostics.mjs";

export const dialect = "spec-bundle";

export async function run() {
	return {
		ir: null,
		diagnostics: [
			diagnostic(DIAGNOSTIC_CODES.FRONTEND_NOT_IMPLEMENTED, {
				message:
					"the spec-bundle extraction frontend is not implemented in this repository; it is agent-ix/filament-core-data#36",
			}),
		],
	};
}
