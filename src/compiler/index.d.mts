import type { Program } from "@typespec/compiler";

/** Schema version of the emitted semantic IR, frozen at the issue #4 value. */
export declare const SEMANTIC_IR_SCHEMA_VERSION: "1.0.0";

export interface SemanticIrOptions {
	/**
	 * Identity stamped into the emitted document. Defaults to the promoted
	 * emitter's own `name@version`.
	 */
	generator?: string;
	/** Directory source loci are made relative to. Defaults to `process.cwd()`. */
	baseDir?: string;
}

export interface CompileSemanticIrOptions extends SemanticIrOptions {
	/** TypeSpec entrypoint to compile. */
	entrypoint: string;
}

export interface SemanticIrVersionRecord {
	name: string;
	value: string;
	index: number;
}

export interface SemanticIrMetadata {
	constraints: { pattern?: string };
	discriminator: string | null;
	versioning: {
		packageVersions: SemanticIrVersionRecord[];
		added: SemanticIrVersionRecord[];
		removed: SemanticIrVersionRecord[];
	};
	deprecated: string | null;
}

export interface SemanticIrField extends SemanticIrMetadata {
	name: string;
	type: string;
	optional: boolean;
	nullable: boolean;
	recursive: boolean;
	extensionPoint: boolean;
	source: string;
}

export interface SemanticIrEnumMember {
	name: string;
	value: string | number;
}

export interface SemanticIrType extends SemanticIrMetadata {
	id: string;
	name: string;
	package: string;
	kind: "model" | "enum" | "scalar";
	role: "definition" | "occurrence" | "observation" | "projection";
	source: string;
	/** Models and scalars carry a base; enums do not. */
	base?: string | null;
	/** Models only. */
	fields?: SemanticIrField[];
	/** Enums only. */
	members?: SemanticIrEnumMember[];
}

export interface SemanticIrDocument {
	schemaVersion: string;
	/** Always stamped: the caller's identity, or the emitter's own. */
	generator: string;
	types: SemanticIrType[];
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

/**
 * Normalizes the official JSON Schema bundle for `datamodel-code-generator`.
 * The result is a new document; the input is not mutated. The shape changes
 * (definition `$id`/`$schema` are removed, `$ref`s are localised), so the
 * return type is deliberately not the input type.
 */
export declare function normalizeJsonSchemaForPython(
	schema: unknown,
): Record<string, unknown>;
