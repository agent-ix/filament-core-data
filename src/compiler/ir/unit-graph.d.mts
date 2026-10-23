/** FR-146 dimension and unit diagnostics. */
import type { SourceLocus } from "../index.d.mts";
import type { DiagnosticEntry } from "../diagnostics.mjs";
export declare function checkUnitGraph(
	document: unknown,
	raise: (
		entry: DiagnosticEntry,
		message: string,
		locus?: SourceLocus,
	) => unknown,
): void;
