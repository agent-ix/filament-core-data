/** Declarations for the generated runtime validators (FR-066). */
import type { ResolvedModel } from "./model.d.mts";

/**
 * The closed structural-code register the generated `errors.ts` carries.
 *
 * A constraint failure never draws from it: the generated validator reports the
 * constraint's own `diagnosticCode`, which the semantic document declares.
 */
export declare const STRUCTURAL_CODES: Readonly<Record<string, string>>;

/** The declared recursion bound generated into the package. */
export declare const MAX_VALIDATION_DEPTH: 256;

/** The member a record admitting unknown members carries them in. */
export declare const PRESERVED_MEMBER: "__unknown";

/** One failure the generated validators report. */
export interface ValidationError {
	readonly pointer: string;
	readonly code: string;
	readonly message: string;
}

/** The verdict a generated validator returns. */
export type ValidationResult<T> =
	| {
			readonly ok: true;
			readonly value: T;
			readonly surfaced: readonly ValidationError[];
	  }
	| { readonly ok: false; readonly errors: readonly ValidationError[] };

/** One structural code of the generated register. */
export type ValidatorCode = string;

/** The body of the generated `errors.ts`. Fixed for every document. */
export declare function renderErrors(): string;

/** The body of the generated `validators.ts`. Pure; writes no file. */
export declare function renderValidators(model: ResolvedModel): string;
