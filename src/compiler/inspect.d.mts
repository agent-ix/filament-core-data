/** Declarations for the inspection summary (FR-052). */
import type { IrInspection } from "./index.d.mts";

export declare function inspectIr(
	document: unknown,
	options?: { importedExports?: Iterable<string> | "unknown" },
): IrInspection;

export declare function formatInspection(summary: IrInspection): string;
export declare function inspectionJson(summary: IrInspection): string;
