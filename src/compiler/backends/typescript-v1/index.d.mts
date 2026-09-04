/** Declarations for the TypeScript generation backend (FR-063). */
import type { CompilerDiagnostic } from "../../index.d.mts";
import type { GenerationBackend } from "../seam.d.mts";

/** The backend's own semantic identity. */
export declare const identity: string;

export declare const typescriptBackend: GenerationBackend;

/** What a backend's `generate` returns before the seam reconciles it. */
export interface BackendGeneration {
	state: string;
	files: {
		path: string;
		text: string;
		mediaType?: string;
		identities?: readonly string[];
	}[];
	diagnostics: CompilerDiagnostic[];
}
