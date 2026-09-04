/** Declarations for the package lock and the v1 fingerprint (FR-048). */
import type { CompilerDiagnostic } from "../index.d.mts";
import type { CompilerFileHost } from "../host.d.mts";

export declare const REPO_ROOT: string;
export declare const CONTRACT_IR_VERSION: "1.1.0";

export declare const CANONICALIZATION: Readonly<{
	algorithm: string;
	digest: string;
	included: string[];
	excluded: string[];
}>;

export declare function schemaBytes(
	host: CompilerFileHost,
	root?: string,
): [string, string][];

export declare function sourceFiles(
	host: CompilerFileHost,
	packageRoot: string,
	manifest: Record<string, unknown>,
): string[];

export declare function contentDigest(
	host: CompilerFileHost,
	packageRoot: string,
	manifest: Record<string, unknown>,
): string;

export declare function fingerprint(
	resolution: Record<string, unknown>,
): string;

export declare function buildLock(
	resolution: Record<string, unknown>,
): Record<string, unknown>;

export declare function serializeLock(lock: Record<string, unknown>): string;

export declare function verifyLock(
	lock: Record<string, unknown>,
	lockText: string,
	lockPath: string,
	resolution: Record<string, unknown>,
): CompilerDiagnostic[];
