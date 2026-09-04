/**
 * The narrow build interface for the promoted issue #4 compiler (FR-041).
 *
 * Exactly six symbols. Callers reach the compiler through this module, the
 * `cli.mjs` command, or `tsp --emit` against `emitters/semantic-ir`; nothing
 * reaches into the modules behind it, and nothing here imports from `spikes/`.
 */
export { buildSemanticIr, SEMANTIC_IR_SCHEMA_VERSION } from "./ir.mjs";
export { compileSemanticIr } from "./compile.mjs";
export { emitTypeScript } from "./backends/typescript.mjs";
export { emitRust } from "./backends/rust.mjs";
export { normalizeJsonSchemaForPython } from "./backends/python-schema.mjs";
