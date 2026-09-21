/**
 * Type declarations for the Rust/Serde generation backend's contract with the
 * seam (FR-063, FR-130).
 *
 * The sidecar of `backend.mjs`, not an independent artifact: the
 * `src/compiler/` ownership ledger treats an `X.d.mts` as owned by whoever owns
 * `X.mjs`, so this needs no Outputs entry of its own.
 *
 * Declared against `GenerationBackend` directly, matching
 * `typescript-v1/index.d.mts`'s own backend declaration: `backend.mjs`'s doc
 * comment states this module exists solely to carry the five members
 * `assertBackendContract` checks, so its declared shape is the seam's own
 * contract rather than a restatement of it.
 */
import type { GenerationBackend } from "../seam.d.mts";

/** The backend's own semantic identity, stamped into every output manifest. */
export declare const identity: string;

export declare const rustBackend: GenerationBackend;
