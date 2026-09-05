/** JSON Schema to semantic IR lowering (FR-082). Pure: reads nothing. */

export interface LowerDiagnostic {
	readonly code: string;
	readonly message: string;
	readonly locus: string;
}

export declare function identityOf(name: string): string;
export declare function nameFromUrl(url: string): string;

/** `multiplicity`, and the `presence` derived from it by `lower >= 1`. */
export declare function multiplicityOf(
	schema: Record<string, unknown> | undefined,
	isRequired: boolean,
): {
	multiplicity: { lower: number; upper?: number };
	presence: "required" | "optional";
};

/** Lowers the document set, or returns diagnostics and no document. */
export declare function lowerBundle(
	documents: readonly (readonly [string, Record<string, unknown>])[],
):
	| { document: Record<string, unknown>; diagnostics?: undefined }
	| { diagnostics: readonly LowerDiagnostic[]; document?: undefined };
