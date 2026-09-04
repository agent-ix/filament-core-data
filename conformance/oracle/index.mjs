/**
 * The conformance corpus import surface (issue #20, FR-039).
 *
 * A downstream repository consumes cases, bases, and oracle verdicts through
 * this module rather than by copying them. Paths resolve relative to this
 * module, so no particular working directory is needed, and every loader
 * returns a deep copy, so a consumer cannot mutate the corpus for a later load.
 *
 * `corpusVersion` is the only version a consumer pins for corpus content; the
 * npm package version governs the published package alone. Publishing this
 * surface belongs to the issue #11 gate, not to issue #20.
 */

import {
	buildBefore as buildBeforeInput,
	buildInput as buildCaseInput,
	compare as compareResult,
	corpusVersion as readCorpusVersion,
	listCases as listCorpusCases,
	loadBase as readBase,
	loadCase as readCase,
	loadCorpus as readCorpus,
	loadManifest as readManifest,
	oracleVerdict as decide,
	substantive as substantiveOf,
} from "../corpus.mjs";

const copy = (value) => structuredClone(value);

/** The corpus version a consumer pins. */
export const corpusVersion = () => readCorpusVersion();

/** The corpus manifest: register, bases, cases, digests. */
export const loadManifest = () => copy(readManifest());

/** The manifest and every case, in manifest order. */
export const loadCorpus = () => copy(readCorpus());

/** One case by id; throws naming the id and the corpus version when unknown. */
export const loadCase = (id) => copy(readCase(id));

/** One base bundle by id. */
export const loadBase = (id) => copy(readBase(id));

/** Cases matching a `{ family, class, kind, id }` filter. */
export const listCases = (filter) => copy(listCorpusCases(filter));

/** A case's input bundle: its base plus its patch. */
export const buildInput = (corpusCase) => buildCaseInput(corpusCase);

/** A compatibility case's prior bundle. */
export const buildBefore = (corpusCase) => buildBeforeInput(corpusCase);

/** The oracle's verdict for one case. */
export const oracleVerdict = (corpusCase) => decide(corpusCase);

/** Compares one adapter result with the oracle verdict for the same case. */
export const compare = (corpusCase, adapterResult, options) =>
	compareResult(corpusCase, adapterResult, options);

/** The members of a verdict the corpus judges; `message` is prose beside them. */
export const substantive = (value, kind) => substantiveOf(value, kind);
