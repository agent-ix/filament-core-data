/**
 * Type declarations for the command line the `make rust-*` targets call.
 *
 * The sidecar of `cli.mjs`, not an independent artifact: the
 * `src/compiler/` ownership ledger treats an `X.d.mts` as owned by whoever owns
 * `X.mjs`, so this needs no Outputs entry of its own.
 *
 * Only the constants a test drives a request through are declared here
 * (`generate`, `check`, `register` and `mutations` are the CLI's own verbs and
 * are exercised through `execFileSync`, never imported).
 */

/** The backend's own identity and version, as the request carries them. */
export declare const BACKEND: Readonly<{
	identity: string;
	version: string;
	supportedIrVersions: readonly string[];
	supportedFeatures: readonly string[];
	options: Record<string, unknown>;
}>;

/** The limits a `make` invocation runs under, in the absence of a request file. */
export declare const DEFAULT_LIMITS: Readonly<Record<string, number>>;

/** The profile a `make` invocation runs under: nothing is dropped. */
export declare const DEFAULT_PROFILE: Readonly<Record<string, unknown>>;
