/** Declarations for the frontend seam (FR-045). */
import type { FrontendRequest, FrontendResult } from "../index.d.mts";

export declare const FRONTEND_DIALECTS: readonly string[];

export declare function selectFrontend(dialect: string): {
	frontend: { run(request: FrontendRequest): Promise<FrontendResult> };
	implemented: boolean;
};

export declare function isImplemented(dialect: string): boolean;

export declare function assertFrontendContract(
	dialect: string,
	result: { ir?: unknown; diagnostics?: unknown[] },
): FrontendResult;

export declare function runFrontend(
	request: FrontendRequest,
): Promise<FrontendResult>;
