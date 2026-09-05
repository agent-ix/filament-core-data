/** The JSON Schema frontend (FR-082). Matches the TypeSpec frontend's shape. */

export declare const dialect: "spec-bundle";
export declare const sourceForm: "json-schema-bundle";

export declare function run(request: {
	documents?: readonly (readonly [string, Record<string, unknown>])[];
}):
	| {
			state: "success";
			document: Record<string, unknown>;
			diagnostics: readonly never[];
	  }
	| {
			state: "invalid";
			diagnostics: readonly { code: string; message: string; locus: string }[];
	  };
