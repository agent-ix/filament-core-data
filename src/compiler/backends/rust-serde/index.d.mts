/** Existing Rust writer boundary; generation semantics belong to FR-056. */
import type { GenerationRequest, OutputManifest } from "../seam.d.mts";

export declare const REPOSITORY_ROOT: string;
export declare function readLicense(root?: string): string;

export interface RustOutputSink {
	clear?(outputRoot: string): void;
	write(outputRoot: string, relativePath: string, text: string): void;
}

export declare function directorySink(
	base: string,
): RustOutputSink & { root: string };
export declare function generateRust(
	request: GenerationRequest,
	sink: RustOutputSink,
	options?: { root?: string; licenseText?: string },
): OutputManifest;
