/** Kernel bundle predicates (FR-081). Pure: nothing here reads a file. */

export interface KernelDiagnostic {
	readonly code: string;
	readonly message: string;
	readonly locus?: string;
}

/** Checks a declaration against the grammar it claims to package. */
export declare function checkKernelBundle(
	declaration: Record<string, unknown>,
	inventory: Record<string, unknown>,
): readonly KernelDiagnostic[];
