/**
 * Type declarations for the Python generation backends (issue #23).
 *
 * The sidecar of `index.mjs`, not an independent artifact: the
 * `src/compiler/` ownership ledger treats an `X.d.mts` as owned by whoever owns
 * `X.mjs`, so this needs no Outputs entry of its own.
 *
 * `generate`'s options is declared `unknown` rather than restated from
 * `seam.d.mts`'s `GenerationBackend`, matching `json-schema-v1/index.d.mts`'s
 * own backend declaration: this backend additionally reads `options.produce`
 * (ADR-0006's injected producer, see `produce.mjs`), which the seam-level
 * `GenerationBackend` contract does not name, so a caller narrows the result
 * itself rather than this declaration asserting a shape it cannot check.
 */

/** The backend's own semantic identity, shared by both Python targets. */
export declare const identity: string;

export interface PythonBackend {
	identity: string;
	version: string;
	target: string;
	owningIssue: string;
	supportedIrVersions: readonly string[];
	supportedFeatures: readonly string[];
	/** The `python_backend/profiles.json` id this target's generation runs under. */
	profileId: string;
	generate(request: unknown, options?: unknown): unknown;
}

export declare const pythonPydanticBackend: Readonly<PythonBackend>;
export declare const pythonDataclassBackend: Readonly<PythonBackend>;
