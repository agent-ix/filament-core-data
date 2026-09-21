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

export declare function selectBackend(
	target: unknown,
	registry?: Map<string, BackendSelection>,
): BackendSelection;

/**
 * A registration for a declared target this repository has not built.
 *
 * Kept as a test seam: the unimplemented arm has to stay exercisable once every
 * declared target is built, or it becomes unreachable (`seam.mjs`). Declared
 * here because it is a real export the suite calls (#226).
 */
export declare function declaredUnimplemented(
	target: string,
	owner: string,
): BackendSelection;

export declare function isBackendImplemented(
	target: unknown,
	registry?: Map<string, BackendSelection>,
): boolean;

export declare function backendRegistrations(
	registry?: Map<string, BackendSelection>,
): {
	target: string;
	owner: string;
	implemented: boolean;
}[];

/**
 * Builds a registry for a test: the committed one, with the named entries
 * replaced (FR-063-AC-3, FR-063-AC-7). A test seam, not a production API.
 */
export declare function registryWith(
	overrides: Record<
		string,
		{ owner: string; backend: GenerationBackend | null; implemented: boolean }
	>,
): Map<string, BackendSelection>;

export declare function assertBackendContract(
	backend: unknown,
	generation?: BackendGeneration,
	outputRoot?: string,
): GenerationBackend;

/**
 * The injected out-of-process producer of ADR-0006.
 *
 * It travels the same route `format` does and for the same reason: an
 * out-of-process effect is an argument the seam carries, so no module under
 * `backends/python-v1/` learns that a process exists (`seam.mjs`).
 */
export type ProduceFunction = (
	documents: Record<string, unknown>,
	profileId: string,
	index?: Record<string, unknown>,
) => Record<string, string>;

export declare function generateTarget(
	request: unknown,
	options?: {
		target?: unknown;
		host?: CompilerFileHost;
		format?: FormatFunction;
		registry?: Map<string, BackendSelection>;
		/** Passed straight through to `backend.generate` (`seam.mjs`). */
		produce?: ProduceFunction;
	},
): OutputManifest;
