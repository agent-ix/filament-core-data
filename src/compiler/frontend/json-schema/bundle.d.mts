/** Kernel bundle predicates (FR-081). Pure: nothing here reads a file. */

export interface KernelDiagnostic {
	readonly code: string;
	readonly message: string;
	readonly locus?: string;
}

/** The declared document set, sorted, as the digest is taken over it. */
export declare function kernelDigestInputs(declaration: {
	documents?: readonly string[];
}): readonly string[];

/** The bundle digest over `[path, bytes]` entries; the path is hashed too. */
export declare function kernelDigest(
	entries: readonly (readonly [string, string])[],
): string;

/** Checks a declaration against the grammar it claims to package. */
export declare function checkKernelBundle(
	declaration: Record<string, unknown>,
	inventory: Record<string, unknown>,
	toolchain: Record<string, unknown>,
	manifest: Record<string, unknown>,
): readonly KernelDiagnostic[];

/** Whether a generated tree is current for its recorded digest. */
export declare function checkKernelFreshness(
	recordedDigest: string,
	entries: readonly (readonly [string, string])[],
): readonly KernelDiagnostic[];
