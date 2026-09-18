/** Declarations for the compiler's IR reader (FR-050). */
import type { ContractIrDiagnostics } from "../index.d.mts";

export declare function resolveKind(
	types: Map<string, Record<string, unknown>>,
	typeRef: unknown,
	seen?: Set<string>,
): { kind: string; scalar?: string } | undefined;

export declare function readContractIr(
	document: unknown,
	options?: {
		importedExports?: Iterable<string> | "unknown";
		limits?: Record<string, number>;
	},
): ContractIrDiagnostics;
