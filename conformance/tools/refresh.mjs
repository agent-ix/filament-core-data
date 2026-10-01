/**
 * Recomputes the corpus manifest's base and case index rows from disk.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { computeIndex, ROOT } from "../corpus.mjs";
import { formatJson } from "./format-json.mjs";

const path = join(ROOT, "corpus.json");
const manifest = JSON.parse(readFileSync(path, "utf8"));
const { bases, cases } = computeIndex();
manifest.bases = bases;
manifest.cases = cases;
writeFileSync(path, formatJson(manifest, "corpus.json"));
console.log(`refreshed ${bases.length} bases and ${cases.length} cases`);
