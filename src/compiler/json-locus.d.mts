/** Declarations for exact JSON source loci (FR-047). */

export interface Position {
	line: number;
	column: number;
}

export declare function jsonPointer(segments: readonly unknown[]): string;

export declare function offsetToPosition(
	text: string,
	offset: number,
): Position;

export declare function indexJsonPointers(
	text: string,
): Map<string, { value: Position; key: Position }>;

export declare function locateJsonPointer(
	text: string | Map<string, { value: Position; key: Position }>,
	pointer: string,
	prefer?: "value" | "key",
): Position;
