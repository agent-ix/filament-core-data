/** Declarations for the injected host (NFR-019, NFR-020). */

export interface HostRecord {
	reads: string[];
	refusedReads: string[];
	moduleLoads: string[];
	refusedModules: string[];
	writes: string[];
	refusedWrites: string[];
	directRead: number;
}

export interface CompilerFileHost {
	readBytes(path: string): Buffer;
	readText(path: string): string;
	digestFile(path: string): string;
	exists(path: string): boolean;
	isDirectory(path: string): boolean;
	readDir(path: string): string[];
	walk(path: string, root?: string): string[];
	mayLoadModule(path: string): boolean;
	noteModuleLoad(path: string): void;
	writeFile(path: string, bytes: string | Uint8Array): void;
	toPosix(path: string): string;
	record: HostRecord;
	readRoots: string[];
	moduleRoots: string[];
}

export declare class PathEscapeError extends Error {
	path: string;
}

export declare class UntrustedModuleError extends Error {
	path: string;
}

export declare function createHost(options?: {
	readRoots?: string[];
	moduleRoots?: string[];
	writeTargets?: string[];
	enumerationOrder?: "ascending" | "descending";
}): CompilerFileHost;

export declare function repositoryHost(root: string): CompilerFileHost;
