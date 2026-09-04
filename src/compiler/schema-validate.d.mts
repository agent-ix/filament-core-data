/** Declarations for validation against the published v1 schemas. */
import type { CompilerFileHost } from "./host.d.mts";

export interface SchemaError {
	instancePath: string;
	keyword: string;
	message?: string;
	params?: Record<string, unknown>;
}

export interface SchemaValidators {
	errors(schemaName: string, document: unknown): SchemaError[];
	names: string[];
}

export declare function schemaValidators(
	host: CompilerFileHost,
	root?: string,
): SchemaValidators;

export declare function resetSchemaValidators(): void;

export declare function errorPointer(error: SchemaError): string;

export declare function errorMessage(error: SchemaError): string;
