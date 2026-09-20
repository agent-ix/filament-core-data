/** Declarations for semantic identity minting (FR-053). */

export declare const SLOTS: Readonly<Record<string, readonly string[]>>;

export declare function slug(value: unknown): string;

export declare function mintIdentity(
	packageIdentity: string,
	slot: string,
	parts: readonly unknown[],
): string;

export declare function nativeTypeRef(kernelName: string): string;

export declare function constraintDiagnosticCode(
	packageIdentity: string,
	parts: readonly string[],
	keyword: string,
): string;
