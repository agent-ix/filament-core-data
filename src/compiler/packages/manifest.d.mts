/** Declarations for reading and locating the JSON inputs of a compile. */
import type { CompilerDiagnostic, SourceLocus } from "../index.d.mts";
import type { DiagnosticEntry } from "../diagnostics.d.mts";
import type { CompilerFileHost } from "../host.d.mts";

export declare function relativePosix(root: string, path: string): string;

export interface ReadDocumentResult {
	value?: Record<string, unknown>;
	text?: string;
	path?: string;
	digest?: string;
	locate?: (pointer: string, prefer?: "value" | "key") => SourceLocus;
	diagnostics: CompilerDiagnostic[];
}

export declare function readDocument(
	host: CompilerFileHost,
	options: {
		absolutePath: string;
		packageRoot: string;
		schemaName: string;
		entry: DiagnosticEntry;
		sourceIdentity: string;
		limits?: Record<string, number>;
	},
): ReadDocumentResult;
