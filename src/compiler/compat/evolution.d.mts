/** Declarations for the contract-version projections (FR-051). */
import type { CompilerDiagnostic, ContractIrDocument } from "../index.d.mts";

export declare const V1_DIALECT: string;
export declare const V1_1_ADDED_NODES: readonly string[];
export declare const CONTRACT_VERSIONS: readonly string[];

export declare function readIrAsContract(
	document: unknown,
	targetVersion: string,
	options?: { dialect?: string },
): {
	document: ContractIrDocument | null;
	loss: string[];
	diagnostics: CompilerDiagnostic[];
};
