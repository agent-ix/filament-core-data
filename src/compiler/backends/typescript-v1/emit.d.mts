/** Declarations for the generation orchestration (FR-071). */
import type { CompilerFileHost } from "../../host.d.mts";
import type { FormatFunction, OutputManifest } from "../seam.d.mts";

/** One emitted file, with the formatted bytes the manifest's digest names. */
export interface EmittedFile {
	readonly path: string;
	readonly text: string;
}

/** The manifest and the bytes it describes. */
export interface EmittedPackage {
	readonly manifest: OutputManifest;
	readonly files: readonly EmittedFile[];
}

export declare function emitTypeScriptPackage(
	request: unknown,
	options: {
		format: FormatFunction;
		target?: string;
		host?: CompilerFileHost;
		registry?: unknown;
	},
): EmittedPackage;
