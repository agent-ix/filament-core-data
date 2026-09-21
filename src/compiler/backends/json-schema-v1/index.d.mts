import type { BackendGeneration } from "../seam.d.mts";

export declare const identity: string;
export declare const jsonSchemaBackend: Readonly<{
	identity: string;
	version: string;
	target: "json-schema";
	owningIssue: string;
	supportedIrVersions: readonly string[];
	supportedFeatures: readonly string[];
	/**
	 * The request and options stay `unknown`: this backend is called with
	 * partial requests across the suite and the seam reconciles them. The
	 * return type is not open in the same way — `index.mjs` always returns the
	 * seam's `BackendGeneration`, so declaring it `unknown` only pushed a cast
	 * onto every caller (#226).
	 */
	generate(request: unknown, options?: unknown): BackendGeneration;
}>;
