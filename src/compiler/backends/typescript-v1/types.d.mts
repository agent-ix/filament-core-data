/** Declarations for the TypeScript type projection (FR-064). */
import type { ResolvedModel } from "./model.d.mts";

/** The eight IR kinds this renderer handles, as data, so a test counts them. */
export declare const RENDERED_KINDS: readonly string[];

/** The body of the generated `types.ts` module. Pure; writes no file. */
export declare function renderTypes(model: ResolvedModel): string;
