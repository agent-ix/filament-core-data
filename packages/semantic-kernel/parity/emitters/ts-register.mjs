/**
 * Registers the generated TypeScript package's specifier hook. See
 * `ts-specifiers.mjs`; this module exists because `register` must run before
 * the package is imported.
 */

import { register } from "node:module";

register("./ts-specifiers.mjs", import.meta.url);
