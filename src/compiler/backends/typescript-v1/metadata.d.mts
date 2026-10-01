/** Declarations for the generated `identity.ts` (FR-067, FR-137). */
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

/** One enum or union member, including its semantic identity. */
export interface VariantDescriptor {
	readonly identity: string;
	readonly name: string;
	readonly payloadType: string;
}

/** One constraint's semantic identity and operands. */
export interface ConstraintDescriptor {
	readonly identity: string;
	readonly keyword: string;
	readonly appliesTo: string;
	readonly diagnosticCode: string;
	readonly operands: unknown;
}

/** The banner every emitted file carries; the caller prepends it. */
export declare function bannerFor(
	model: ResolvedModel,
	fingerprint: string,
): string;

/** The body of the generated `identity.ts`. Pure; writes no file. */
export declare function renderIdentity(model: ResolvedModel): string;

/** Return identity-bearing model nodes absent from emitted files and losses. */
export declare function auditRenderedNodes(
	model: ResolvedModel,
	files: readonly { readonly path: string; readonly text: string }[],
	losses?: readonly string[],
): readonly string[];
