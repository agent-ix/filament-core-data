/** Declarations for the decorator state readers (FR-053). */

export declare const SINGLE_VALUED: readonly string[];
export declare const REPEATABLE: readonly string[];
export declare const VOCABULARY: readonly string[];

export declare function read(
	program: unknown,
	name: string,
	target: unknown,
): unknown;

export declare function defects(program: unknown): unknown[];
