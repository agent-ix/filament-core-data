/** Declarations for the compile pipeline (FR-052). */
import type {
	CompilePackageRequest,
	CompilePackageResult,
} from "./index.d.mts";

export declare const PHASES: readonly string[];

export declare function compilePackage(
	request: CompilePackageRequest,
): Promise<CompilePackageResult>;
