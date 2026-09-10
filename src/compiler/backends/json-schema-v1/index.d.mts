export declare const identity: string;
export declare const jsonSchemaBackend: Readonly<{
	identity: string;
	version: string;
	target: "json-schema";
	owningIssue: string;
	supportedIrVersions: readonly string[];
	supportedFeatures: readonly string[];
	generate(request: unknown, options?: unknown): unknown;
}>;
