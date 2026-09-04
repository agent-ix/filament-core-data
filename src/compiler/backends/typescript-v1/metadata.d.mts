/** Declarations for the generated identity and provenance metadata (FR-067). */
import type { ResolvedModel } from "./model.d.mts";

/** One extension the document declares, at any of its three levels. */
export interface ExtensionDescriptor {
	readonly identity: string;
	readonly version: string;
	readonly required: boolean;
	readonly capability?: string;
	readonly payload: unknown;
}

/** One relationship a record declares. Rendered by this module alone. */
export interface RelationshipDescriptor {
	readonly identity: string;
	readonly verb: string;
	readonly category: string;
	readonly composite: boolean;
	readonly target: string;
	readonly lower: number;
	readonly upper: number | null;
}

/** One observed value the document carries. */
export interface OccurrenceDescriptor {
	readonly identity: string;
	readonly definition: string;
	readonly observedAt: string;
	readonly value: unknown;
}

/** The provenance the generated `metadata.ts` exports. */
export interface SemanticMetadata {
	readonly contractVersion: string;
	readonly sourceIdentity: string;
	readonly sourceVersion: string;
	readonly sourceDialect: string;
	readonly sourceDigest: string;
	readonly packageIdentity: string;
	readonly packageVersion: string;
	readonly packageManifestDigest: string;
	readonly packageMappingVersions: readonly string[];
	readonly packageProfileVersions: readonly string[];
	readonly packageLockDigest: string;
	readonly fingerprint: string;
	readonly backendIdentity: string;
	readonly backendVersion: string;
}

/** The banner every emitted file carries; the caller prepends it. */
export declare function bannerFor(
	model: ResolvedModel,
	fingerprint: string,
): string;

/** The body of the generated `identity.ts`. Pure; writes no file. */
export declare function renderIdentity(model: ResolvedModel): string;

/**
 * The body of the generated `metadata.ts`.
 *
 * The fingerprint is taken over the *normalized* document, which the resolved
 * model does not carry, so the caller supplies either the fingerprint or the
 * document it is taken over. Supplying neither is a caller defect and throws.
 */
export declare function renderMetadata(
	model: ResolvedModel,
	options?: { fingerprint?: string; ir?: unknown },
): string;
