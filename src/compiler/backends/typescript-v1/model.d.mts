/** Declarations for the resolved type model (FR-064). */
import type { RepresentabilityLoss } from "./names.d.mts";

/**
 * The acyclic summary of a resolved element. A summary rather than a reference
 * to the entry, because the IR's type graph carries cycles and a cyclic model
 * could be neither canonicalized nor deeply compared.
 */
export interface ResolvedElement {
	readonly identity: string;
	readonly identifier: string | undefined;
	readonly kind: string | undefined;
	readonly scalar: string | undefined;
	readonly declared: boolean;
}

/** A field or an operation parameter, with the three axes already decided. */
export interface ModelField {
	readonly identity: string;
	readonly name: string;
	readonly typeRef: string;
	readonly element: ResolvedElement | undefined;
	readonly optional: boolean;
	readonly nullable: boolean;
	readonly collection: boolean;
	readonly multiplicity: {
		readonly lower: number | undefined;
		readonly upper: number | undefined;
		readonly ordered: boolean;
		readonly unique: boolean;
	};
	readonly defaultKind: string;
	readonly defaultValue?: unknown;
	readonly unit?: string;
	readonly extensions: readonly Record<string, unknown>[];
	readonly origin: unknown;
}

/** One variant of an `enum` or a `union`. */
export interface ModelVariant {
	readonly identity: string;
	readonly name: string;
	readonly payloadType?: string;
	readonly payload?: ResolvedElement;
	readonly origin: unknown;
}

/** One type definition, resolved. */
export interface ModelType {
	readonly identity: string;
	readonly displayName: string;
	readonly identifier: string;
	readonly kind: string;
	readonly roles: readonly string[];
	readonly unknownPolicy: string;
	readonly constraints: readonly Record<string, unknown>[];
	readonly extensions: readonly Record<string, unknown>[];
	readonly clauses: readonly Record<string, unknown>[];
	readonly origin: unknown;
	readonly scalar?: string;
	readonly fields?: readonly ModelField[];
	/** An `entity`'s identity field names, in the order the document declares them. */
	readonly identityFields?: readonly string[];
	readonly variants?: readonly ModelVariant[];
	readonly relationships?: readonly Record<string, unknown>[];
	readonly operations?: readonly Record<string, unknown>[];
	readonly target?: string;
	readonly targetEntry?: ResolvedElement;
	readonly items?: string;
	readonly itemsEntry?: ResolvedElement;
	readonly values?: string;
	readonly valuesEntry?: ResolvedElement;
}

/** The one artifact every renderer of this backend consumes. */
export interface ResolvedModel {
	readonly contractVersion: string;
	readonly source: Record<string, unknown>;
	readonly package: Record<string, unknown>;
	readonly types: readonly ModelType[];
	readonly typesByIdentity: Readonly<Record<string, ModelType>>;
	readonly occurrences: readonly Record<string, unknown>[];
	readonly extensions: readonly Record<string, unknown>[];
	readonly losses: readonly RepresentabilityLoss[];
	readonly backend: { readonly identity: string; readonly version: string };
}

export declare function buildModel(
	ir: unknown,
	options?: { backendIdentity?: string; backendVersion?: string },
): ResolvedModel;
