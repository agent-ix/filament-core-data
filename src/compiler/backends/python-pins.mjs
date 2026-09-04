/**
 * Pinned Python generation toolchain, recorded by the issue #4 evidence.
 *
 * Only the pins are promoted. The `datamodel-code-generator` invocation and its
 * virtual environment stay with the caller, so issue #23 still owns a supported
 * Python generation route (FR-043).
 */
export const DATAMODEL_CODEGEN_VERSION = "0.76.0";
export const PYDANTIC_VERSION = "2.12.5";
