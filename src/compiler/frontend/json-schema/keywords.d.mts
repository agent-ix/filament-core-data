/** The closed recognised-keyword set (FR-082). No permissive mode exists. */

/** Exactly the eighteen keywords FR-082 declares. Frozen. */
export declare const RECOGNISED_KEYWORDS: ReadonlySet<string>;

/** Every unrecognised member name, with the pointer at which it occurred. */
export declare function unrecognisedKeywords(
	node: unknown,
	pointer?: string,
): readonly { keyword: string; pointer: string }[];
