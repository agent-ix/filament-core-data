/** Declarations for IR schema validation (FR-050). */
import type { CompilerDiagnostic, SourceLocus } from "../index.d.mts";
import type { CompilerFileHost } from "../host.d.mts";

export declare function validateIrDocument(
	document: unknown,
	options?: { host?: CompilerFileHost },
): CompilerDiagnostic[];

export declare function originLocusFor(
	document: unknown,
	pointer: string,
): SourceLocus | undefined;
