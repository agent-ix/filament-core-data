/**
 * The narrow build interface (FR-041, FR-052).
 *
 * Exactly fifteen symbols: the six issue #27 promoted, and the nine the contract
 * path adds. Callers reach the compiler through this module, through
 * `cli.mjs`, or through `tsp --emit` against `emitters/semantic-ir`; nothing
 * reaches into the modules behind it, and nothing here imports from `spikes/`.
 *
 * `buildSemanticIr` and `SEMANTIC_IR_SCHEMA_VERSION` are the *prototype* path,
 * frozen at the issue #4 shape by FR-041-CON-1 and deliberately untouched. The
 * contract path — `compilePackage` and everything below it — is a second
 * lowering beside it, not a rewrite of it, which is why no issue #4 golden moved
 * when issue #19 landed.
 */
export { buildSemanticIr, SEMANTIC_IR_SCHEMA_VERSION } from "./ir.mjs";
export { compileSemanticIr } from "./compile.mjs";
export { emitTypeScript } from "./backends/typescript.mjs";
export { emitRust } from "./backends/rust.mjs";
export { normalizeJsonSchemaForPython } from "./backends/python-schema.mjs";
export { runFrontend } from "./frontend/seam.mjs";
export { compilePackage } from "./pipeline.mjs";
export { readContractIr } from "./ir/reader.mjs";
export { fingerprintIr, normalizeIr } from "./ir/normalize.mjs";
export { inspectIr } from "./inspect.mjs";
export { diffSemanticContract } from "./compat/diff.mjs";
export { readIrAsContract } from "./compat/evolution.mjs";
export { CONTRACT_IR_VERSION } from "./packages/lock.mjs";
