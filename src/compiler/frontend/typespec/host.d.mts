/** Declarations for the confined TypeSpec compiler host (FR-046, NFR-020). */

export declare const MODULE_REFUSAL: string;
export declare const READ_REFUSAL: string;

import type { CompilerHost } from "@typespec/compiler";

export declare function restrictedHost(options: {
	readRoots: string[];
	moduleRoots: string[];
}): CompilerHost & {
	record: {
		reads: string[];
		refusedReads: string[];
		moduleLoads: string[];
		refusedModules: string[];
	};
};
