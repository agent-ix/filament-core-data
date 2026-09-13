/** Declarations for the generated ESM package layout (FR-065). */
import type { ResolvedModel } from "./model.d.mts";
import type { RepresentabilityLoss } from "./names.d.mts";

/** The closed eight-file set an emitted package carries. */
export declare const PACKAGE_FILES: readonly string[];

/** The public names that belong to the package rather than to a type. */
export declare const FIXED_API_SURFACE: readonly string[];

/** One emitted file, before the seam formats and digests it. */
export interface GeneratedFile {
	readonly path: string;
	readonly text: string;
	readonly identities: readonly string[];
}

/** The rendered module bodies, the licence text, and the IR fingerprint. */
export interface PackageParts {
	readonly fingerprint: string;
	readonly license: string;
	readonly types: string;
	readonly validators: string;
	readonly errors: string;
	readonly identity: string;
	readonly provenance: string;
}

/** What `renderPackage` returns: a file map, never a write. */
export interface RenderedPackage {
	readonly files: readonly GeneratedFile[];
	readonly losses: readonly RepresentabilityLoss[];
}

/** `@agent-ix/semantic-<owner>__<name>`, from the IR's `owner/name`. */
export declare function packageNameFor(identity: string): string;

/** The exact inverse of `packageNameFor`. */
export declare function identityFromPackageName(name: string): string;

/** Every name a generated module exports, declared or re-exported. */
export declare function exportedNames(source: string): string[];

/** The export set a package is permitted: identity-derived plus fixed. */
export declare function permittedExports(model: ResolvedModel): string[];

/** The four conditions under which a reachable-symbol walk means anything. */
export declare function enablingConditions(
	files: readonly { path: string; text: string }[],
): string[];

/**
 * The symbols one named export reaches. Throws rather than reporting a set when
 * an enabling condition fails.
 */
export declare function reachableSymbols(
	files: readonly { path: string; text: string }[],
	entryExport: string,
	entryModule?: string,
): string[];

/** Assembles the package. Writes nothing. */
export declare function renderPackage(
	model: ResolvedModel,
	parts: PackageParts,
): RenderedPackage;
