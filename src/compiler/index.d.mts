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

/** The contract version the compiler emits (FR-046). */
export declare const CONTRACT_IR_VERSION: "1.1.0";

/** One position in a package's own source tree; never absolute, never `..`-bearing. */
export interface SourceLocus {
	sourceIdentity: string;
	path: string;
	startLine: number;
	startColumn: number;
	endLine?: number;
	endColumn?: number;
}

/** A diagnostic, valid against `common.schema.json#/$defs/diagnostic`. */
export interface CompilerDiagnostic {
	code: string;
	severity: "info" | "warning" | "error";
	message: string;
	owner: string;
	blocking: boolean;
	causes: CompilerDiagnostic[];
	related: SourceLocus[];
	locus?: SourceLocus;
}

/** A contract IR document. Its shape is `schema/semantic/v1/semantic-ir.schema.json`. */
export type ContractIrDocument = Record<string, unknown>;

/** What a frontend returns. `ir` is null whenever any diagnostic blocks. */
export interface FrontendResult {
	ir: ContractIrDocument | null;
	diagnostics: CompilerDiagnostic[];
}

export interface FrontendRequest {
	dialect: "typespec" | "spec-bundle";
	resolution: Record<string, unknown>;
	entrypoint?: string;
	limits?: Record<string, number>;
	host?: unknown;
}

export declare function runFrontend(
	request: FrontendRequest,
): Promise<FrontendResult>;

export interface CompilePackageRequest {
	host: unknown;
	packageRoot: string;
	searchPath?: string[];
	profileName?: string;
	dialect?: "typespec" | "spec-bundle";
	entrypoint?: string;
	lockPath?: string;
	limits?: Record<string, number>;
	onPhase?: (phase: string) => void;
}

export interface CompilePackageResult {
	ir: ContractIrDocument | null;
	lock?: Record<string, unknown>;
	lockBytes?: string;
	resolution?: Record<string, unknown>;
	diagnostics: CompilerDiagnostic[];
	state: string;
	phases: string[];
}

export declare function compilePackage(
	request: CompilePackageRequest,
): Promise<CompilePackageResult>;

/** Cross-field diagnostics, plus the rules it could not check. */
export type ContractIrDiagnostics = CompilerDiagnostic[] & {
	suppressions: { rule: string; identity: string }[];
};

export declare function readContractIr(
	document: unknown,
	options?: {
		importedExports?: Iterable<string> | "unknown";
		limits?: Record<string, number>;
	},
): ContractIrDiagnostics;

export declare function normalizeIr(document: unknown): string;

export declare function fingerprintIr(document: unknown): string;

export interface IrInspection {
	contractVersion: string | null;
	package: Record<string, string | null>;
	source: Record<string, string | null>;
	fingerprint: string;
	typeCount: number;
	kinds: Record<string, number>;
	types: {
		identity: string;
		kind: string;
		fields: number;
		constraints: number;
		relationships: number;
		operations: number;
		clauses: number;
	}[];
	diagnostics: { code: string; message: string }[];
	suppressed: { rule: string; identity: string }[];
}

export declare function inspectIr(
	document: unknown,
	options?: { importedExports?: Iterable<string> | "unknown" },
): IrInspection;

export declare function diffSemanticContract(
	request: Record<string, unknown>,
): Record<string, unknown>;
