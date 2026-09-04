/** Declarations for the normalized serialization (FR-050). */

export declare const IDENTITY_SETS: readonly string[];

export declare function canonicalIr(document: unknown): string;
export declare function normalizeIr(document: unknown): string;
export declare function fingerprintIr(document: unknown): string;
export declare function serializeIr(document: unknown): string;
