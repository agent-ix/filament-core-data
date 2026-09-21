/**
 * Type declarations for the differential conformance runner.
 *
 * The sidecar of `differential.mjs`, not an independent artifact. Only `run`
 * is declared: it is the one export a test imports dynamically, to exercise
 * the harness directly against a registry it has edited in place, rather than
 * through the command line, which always reads the committed registry.
 */

export declare function run(options?: unknown): unknown;
