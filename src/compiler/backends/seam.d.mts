/** Declarations for the generation backend seam (FR-063). */
import type { CompilerFileHost } from "../host.d.mts";
import type { CompilerDiagnostic, ContractIrDocument } from "../index.d.mts";

export declare const BACKEND_TARGETS: readonly string[];

/** One file a backend emits, before the seam digests and reconciles it. */
export interface GeneratedFile {
	/** `outputRoot`-relative, POSIX, never absolute and never `..`-bearing. */
	path: string;
	text: string;
	mediaType?: string;
	/** The type definitions this file renders; empty for `package.json` and `LICENSE`. */
	identities?: readonly string[];
}

/** What a backend's `generate` returns. */
export interface BackendGeneration {
	state: string;
	files: readonly GeneratedFile[];
	diagnostics: readonly CompilerDiagnostic[];
}

/** The contract every registered backend satisfies. */
export interface GenerationBackend {
	identity: string;
	version: string;
	target?: string;
	owningIssue?: string;
	supportedIrVersions: readonly string[];
	supportedFeatures: readonly string[];
	generate(
		request: GenerationRequest,
		options: { host?: CompilerFileHost; format: FormatFunction },
	): BackendGeneration;
}

/** A `compiler-request.schema.json` document. */
export interface GenerationRequest {
	contractVersion: string;
	lockFingerprint: string;
	ir: ContractIrDocument;
	profile: Record<string, unknown>;
	mappings: Record<string, unknown>[];
	backend: {
		identity: string;
		version: string;
		supportedIrVersions: string[];
		supportedFeatures: string[];
		options: Record<string, unknown>;
	};
	outputRoot: string;
	limits: Record<string, number>;
}

/** The injected formatter of FR-071; the identity function when none is given. */
export type FormatFunction = (text: string, path: string) => string;

/** One `files[]` entry of an `output-manifest.schema.json` document. */
export interface OutputManifestFile {
	path: string;
	digest: string;
	mediaType: string;
	semanticIdentities: string[];
}

/** An `output-manifest.schema.json` document. */
export interface OutputManifest {
	contractVersion: "1.0.0";
	requestFingerprint: string;
	backend: string;
	state: string;
	files: OutputManifestFile[];
	diagnostics: CompilerDiagnostic[];
	normalizedFingerprint: string;
}

export interface BackendSelection {
	target: string;
	owner: string;
	backend: GenerationBackend | null;
	implemented: boolean;
}

export declare function selectBackend(target: unknown): BackendSelection;

export declare function isBackendImplemented(target: unknown): boolean;

export declare function backendRegistrations(): {
	target: string;
	owner: string;
	implemented: boolean;
}[];

export declare function assertBackendContract(
	backend: unknown,
	generation?: BackendGeneration,
	outputRoot?: string,
): GenerationBackend;

export declare function generateTarget(
	request: unknown,
	options?: {
		target?: unknown;
		host?: CompilerFileHost;
		format?: FormatFunction;
	},
): OutputManifest;
