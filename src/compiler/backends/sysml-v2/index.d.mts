import type { BackendGeneration } from "../seam.d.mts";

export declare const sysmlBackend: Readonly<{
	identity: string;
	version: string;
	target: "sysml-v2-textual";
	owningIssue: string;
	supportedIrVersions: readonly string[];
	supportedFeatures: readonly string[];
	generate(request: unknown): BackendGeneration;
}>;
