/** Declarations for the diagnostic registry (FR-049). */
import type { CompilerDiagnostic, SourceLocus } from "./index.d.mts";

/** One registry entry: the code and how the compiler treats it. */
export interface DiagnosticEntry {
	code: string;
	severity: "info" | "warning" | "error";
	blocking: boolean;
	owner: string;
}

export declare const DIAGNOSTIC_CODES: Readonly<
	Record<string, DiagnosticEntry>
>;

export declare const DEFAULT_LIMITS: Readonly<{
	maxInputBytes: number;
	maxDepth: number;
	maxNodes: number;
	maxCollectionItems: number;
	maxDiagnostics: number;
}>;

export declare const LIMIT_CODES: Readonly<Record<string, DiagnosticEntry>>;

/** Truncates an input-derived string to 120 characters. */
export declare function fragment(value: unknown): string;

export declare function diagnostic(
	entry: DiagnosticEntry,
	options?: {
		message?: string;
		locus?: SourceLocus;
		causes?: CompilerDiagnostic[];
		related?: SourceLocus[];
	},
): CompilerDiagnostic;

export declare function sortDiagnostics(
	list: readonly CompilerDiagnostic[],
): CompilerDiagnostic[];

export declare function applyDiagnosticLimit(
	list: readonly CompilerDiagnostic[],
	max: number,
): CompilerDiagnostic[];

export declare function hasBlocking(
	list: readonly { blocking?: boolean }[],
): boolean;
