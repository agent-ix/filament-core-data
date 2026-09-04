/**
 * Recomputes the corpus manifest's digest rows and `corpusDigest` from disk.
 *
 * Maintenance only: the gate in `conformance/corpus.mjs` recomputes the same
 * values and fails when the committed manifest disagrees, so running this is
 * never a substitute for the gate.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { ROOT, computeDigests } from "../corpus.mjs";
import { formatJson } from "./format-json.mjs";

const path = join(ROOT, "corpus.json");
const manifest = JSON.parse(readFileSync(path, "utf8"));
const { bases, cases, corpusDigest } = computeDigests();
manifest.bases = bases;
manifest.cases = cases;
manifest.corpusDigest = corpusDigest;
writeFileSync(path, formatJson(manifest, "corpus.json"));
console.log(`refreshed ${bases.length} bases and ${cases.length} cases`);
