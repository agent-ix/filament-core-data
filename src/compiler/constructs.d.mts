export declare const CONSTRUCT_KINDS: readonly string[];
export declare const EDGE_KINDS: readonly string[];
export declare const RENDERED_CONSTRUCT_KINDS: readonly string[];
export declare function isRecordShaped(kind: unknown): boolean;
export declare function identityFieldNames(type: unknown): string[] | undefined;
export declare function unrenderedNodes(
	ir: unknown,
): { pointer: string; member: string }[];
