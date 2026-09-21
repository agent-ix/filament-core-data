/** Declarations for the frontend seam (FR-045). */
import type { FrontendRequest, FrontendResult } from "../index.d.mts";

export declare const FRONTEND_DIALECTS: readonly string[];

/** One registration: a dialect's frontend and whether it is built here. */
export interface FrontendRegistration {
	/**
	 * `null` for a dialect registered as unimplemented: the seam mints the
	 * refusal from `owner` and never calls it (`entry.frontend?.run`), so such a
	 * registration needs no placeholder module.
	 */
	frontend: { run(request: SeamRequest): Promise<FrontendResult> } | null;
	implemented: boolean;
	owner?: string;
}

/**
 * A request as the seam sees it.
 *
 * `FrontendRequest.dialect` is the closed set the *contract* declares. The seam
 * resolves the dialect against a registry keyed by string, and its own
 * documentation requires the unimplemented arm to stay exercisable over a
 * synthetic registration — an assertion about an issue's absence goes red the
 * moment that issue lands. So the dialect is a string here and the union stays
 * on the contract type (#226).
 */
export type SeamRequest = Omit<FrontendRequest, "dialect"> & {
	dialect: string;
};

/** The dialect-to-frontend map the seam selects from. */
export type FrontendRegistry = Map<string, FrontendRegistration>;

export declare function selectFrontend(
	dialect: string,
	registry?: FrontendRegistry,
): FrontendRegistration;

export declare function isImplemented(
	dialect: string,
	registry?: FrontendRegistry,
): boolean;

/**
 * Builds a registry for a test: the committed one, with the named entries
 * replaced.
 *
 * Load-bearing rather than a convenience. Asserting "this dialect is
 * unimplemented" is an assertion about an issue's *absence* and goes red the
 * moment that issue lands, so the unimplemented arm has to be exercisable over
 * a synthetic registration — the arm outlives the dialects (`seam.mjs`).
 */
export declare function registryWith(
	overrides: Record<string, FrontendRegistration>,
): FrontendRegistry;

export declare function assertFrontendContract(
	dialect: string,
	result: { ir?: unknown; diagnostics?: unknown[] },
): FrontendResult;

export declare function runFrontend(
	request: SeamRequest,
	registry?: FrontendRegistry,
): Promise<FrontendResult>;
