import type { Program } from "@typespec/compiler";

/** Schema version of the emitted semantic IR, frozen at the issue #4 value. */
export declare const SEMANTIC_IR_SCHEMA_VERSION: "1.0.0";

export interface SemanticIrOptions {
	/** Identity stamped into the emitted document. */
	generator?: string;
	/** Directory source loci are made relative to. Defaults to `process.cwd()`. */
	baseDir?: string;
}

export interface CompileSemanticIrOptions extends SemanticIrOptions {
	/** TypeSpec entrypoint to compile. */
	entrypoint: string;
}

export interface SemanticIrDocument {
	schemaVersion: string;
	generator?: string;
	types: SemanticIrType[];
}

export interface SemanticIrType {
	id: string;
	name: string;
	package: string;
	kind: string;
	role: string;
	source: string;
	base?: string | null;
	fields?: SemanticIrField[];
	members?: { name: string; value: string | number }[];
	[key: string]: unknown;
}

export interface SemanticIrField {
	name: string;
	type: string;
	optional: boolean;
	nullable: boolean;
	source: string;
	[key: string]: unknown;
}

export declare function buildSemanticIr(
	program: Program,
	options?: SemanticIrOptions,
): SemanticIrDocument;

export declare function compileSemanticIr(
	options: CompileSemanticIrOptions,
): Promise<SemanticIrDocument>;

export declare function emitTypeScript(ir: SemanticIrDocument): string;

export declare function emitRust(ir: SemanticIrDocument): string;

export declare function normalizeJsonSchemaForPython<T>(schema: T): T;
