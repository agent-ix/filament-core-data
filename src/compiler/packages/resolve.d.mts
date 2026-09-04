/** Declarations for package graph resolution (FR-047). */
import type { CompilerDiagnostic } from "../index.d.mts";
import type { CompilerFileHost } from "../host.d.mts";

export interface ParsedVersion {
	major: number;
	minor: number;
	patch: number;
	prerelease: string;
}

export interface ParsedConstraint {
	kind: "exact" | "caret";
	version: ParsedVersion;
}

export declare function parseVersion(value: unknown): ParsedVersion | undefined;

export declare function compareVersions(
	left: ParsedVersion,
	right: ParsedVersion,
): number;

export declare function parseConstraint(
	value: unknown,
): ParsedConstraint | undefined;

export declare function satisfies(
	version: ParsedVersion,
	constraint: ParsedConstraint,
): boolean;

export declare function resolvePackageGraph(request: {
	host: CompilerFileHost;
	packageRoot: string;
	searchPath?: string[];
	profileName?: string;
	limits?: Record<string, number>;
}): Record<string, unknown> & { diagnostics: CompilerDiagnostic[] };
