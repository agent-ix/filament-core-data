/** Minted names for anonymous constructs (FR-083). Owner and property only. */

/** `property` with its first code point upper-cased, nothing else changed. */
export declare function segment(property: string): string;

/** The minted name for `property` of `owner`. */
export declare function mintName(owner: string, property: string): string;

/** The minted name for a property path beneath `owner`, composed left to right. */
export declare function mintPath(
	owner: string,
	path: readonly string[],
): string;

/** Positions that would mint the same name. A collision overwrites a type. */
export declare function mintCollisions(
	positions: readonly { owner: string; path: readonly string[] }[],
): readonly { name: string; positions: readonly string[] }[];
