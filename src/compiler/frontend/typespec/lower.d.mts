/** Declarations for the TypeSpec lowering (FR-046). */
import type { CompilerDiagnostic, ContractIrDocument } from "../../index.d.mts";

export declare const TARGET_NAMESPACE: string;
export declare const BUILTIN_SCALARS: Map<string, string>;
export declare const KERNEL_NAMES: Map<string, string>;
export declare const EXTENSION_BASE: string;

export declare function lowerProgram(options: Record<string, unknown>): {
	ir: ContractIrDocument | null;
	diagnostics: CompilerDiagnostic[];
};
