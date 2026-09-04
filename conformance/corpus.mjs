/**
 * The conformance corpus: loading, building, digesting, and gating (FR-035).
 *
 * Paths resolve relative to this module, never to the working directory, so a
 * consumer needs no particular cwd (FR-039). Nothing here reads a clock, the
 * network, or an environment variable.
 */

import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, posix, relative } from "node:path";
import { fileURLToPath } from "node:url";

import {
	applyPatch,
	canonical,
	compareCodePoint,
	countNodes,
	isObject,
	resolvePointer,
} from "./oracle/json.mjs";
import {
	validateConformance,
	validatePublished,
} from "./oracle/schema-layer.mjs";
import { classify, verdict } from "./oracle/oracle.mjs";
import { schemaDiagnostics } from "./oracle/schema-layer.mjs";

export const ROOT = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = join(ROOT, "..");
const MANIFEST_PATH = join(ROOT, "corpus.json");

/** SHA-256 over raw file bytes, in the contract's `sha256:<hex>` form. */
export function fileDigest(path) {
	return `sha256:${createHash("sha256").update(readFileSync(path)).digest("hex")}`;
}

/** SHA-256 over a UTF-8 string. */
export function textDigest(text) {
	return `sha256:${createHash("sha256").update(text, "utf8").digest("hex")}`;
}

function readJson(path) {
	return JSON.parse(readFileSync(path, "utf8"));
}

/** Lists every file under `dir` whose name ends in `.json`, sorted. */
export function listJson(dir) {
	const out = [];
	const walk = (current) => {
		for (const entry of readdirSync(current).sort(compareCodePoint)) {
			const full = join(current, entry);
			if (statSync(full).isDirectory()) walk(full);
			else if (entry.endsWith(".json")) out.push(full);
		}
	};
	walk(dir);
	return out.sort(compareCodePoint);
}

/** Repository-relative POSIX path, so the manifest is platform-independent. */
export function relPath(path) {
	return relative(REPO_ROOT, path).split(/[\\/]/).join(posix.sep);
}

/* ---------------------------------------------------------------- load ---- */

/** Loads the corpus manifest. */
export function loadManifest() {
	return readJson(MANIFEST_PATH);
}

/** The corpus version a consumer pins (FR-039). */
export const corpusVersion = () => loadManifest().corpusVersion;

/** Loads one base bundle by id. */
export function loadBase(id) {
	return readJson(join(ROOT, "bases", `${id}.json`));
}

/** Loads every case file, in manifest order. */
export function loadCorpus() {
	const manifest = loadManifest();
	return {
		manifest,
		cases: manifest.cases.map((row) => readJson(join(REPO_ROOT, row.path))),
	};
}

/** Loads one case by id, throwing an error that names the id and version. */
export function loadCase(id) {
	const manifest = loadManifest();
	const row = manifest.cases.find((entry) => entry.id === id);
	if (!row) {
		throw new Error(
			`conformance corpus ${manifest.corpusVersion} declares no case ${id}`,
		);
	}
	return readJson(join(REPO_ROOT, row.path));
}

/** Lists cases matching a `{ family, class, kind, id }` filter. */
export function listCases(filter = {}) {
	const { cases } = loadCorpus();
	return cases.filter((entry) =>
		Object.entries(filter).every(([key, value]) => entry[key] === value),
	);
}

/** Builds a case's input bundle: the named base plus its patch. */
export function buildInput(corpusCase) {
	return applyPatch(loadBase(corpusCase.base), corpusCase.ops);
}

/** Builds a compatibility case's prior bundle. */
export function buildBefore(corpusCase) {
	return applyPatch(loadBase(corpusCase.beforeBase), corpusCase.beforeOps);
}

/** The oracle's verdict for one case, schema layer first. */
export function oracleVerdict(corpusCase) {
	const bundle = buildInput(corpusCase);
	if (corpusCase.kind === "compatibility") {
		const before = buildBefore(corpusCase);
		const beforeRows = schemaDiagnostics(before);
		const afterRows = schemaDiagnostics(bundle);
		if (beforeRows.length > 0 || afterRows.length > 0) {
			return {
				...verdict(bundle, afterRows.length > 0 ? afterRows : beforeRows),
				classification: "invalid",
			};
		}
		const decided = verdict(bundle, []);
		const classified = classify(before, bundle);
		return {
			...decided,
			classification:
				decided.resultState === "invalid"
					? "invalid"
					: classified.classification,
			changes: classified.changes,
		};
	}
	return verdict(bundle, schemaDiagnostics(bundle));
}

/* ---------------------------------------------------------- comparison ---- */

function diagnosticKey(entry, withPointer) {
	const { code, severity, locus } = entry.diagnostic;
	return canonical(
		withPointer
			? [entry.pointer, code, severity, locus ?? null]
			: [code, severity, locus ?? null],
	);
}

/**
 * Compares one adapter result with the oracle verdict for the same case.
 *
 * The oracle verdict is the only thing on the other side of this comparison; no
 * caller may pass a second adapter result (FR-037).
 */
export function compare(corpusCase, adapterResult, options = {}) {
	const withPointer = options.pointerCompatible !== false;
	const expected = oracleVerdict(corpusCase);
	const problems = [];
	if (adapterResult.resultState !== expected.resultState) {
		problems.push({
			kind: "result-state",
			expected: expected.resultState,
			observed: adapterResult.resultState,
			pointer: "",
		});
	}
	const wanted = expected.diagnostics.map((entry) =>
		diagnosticKey(entry, withPointer),
	);
	const got = (adapterResult.diagnostics ?? []).map((entry) =>
		diagnosticKey(entry, withPointer),
	);
	for (let index = 0; index < Math.max(wanted.length, got.length); index += 1) {
		if (wanted[index] !== got[index]) {
			problems.push({
				kind: "diagnostic",
				index,
				expected: wanted[index] ?? null,
				observed: got[index] ?? null,
				pointer:
					expected.diagnostics[index]?.pointer ??
					adapterResult.diagnostics?.[index]?.pointer ??
					"",
				locus:
					expected.diagnostics[index]?.diagnostic?.locus ??
					adapterResult.diagnostics?.[index]?.diagnostic?.locus ??
					null,
			});
		}
	}
	if (corpusCase.kind === "compatibility") {
		if (adapterResult.classification !== expected.classification) {
			problems.push({
				kind: "classification",
				expected: expected.classification,
				observed: adapterResult.classification ?? null,
				pointer: "",
			});
		}
	}
	if (adapterResult.normalized !== expected.normalized) {
		problems.push({
			kind: "normalized",
			expected: textDigest(expected.normalized),
			observed: textDigest(String(adapterResult.normalized)),
			pointer: "/ir",
		});
	}
	return { matches: problems.length === 0, problems, expected };
}

/**
 * The substantive part of a verdict: the members the corpus judges.
 *
 * `message` is authored prose beside the judgement, not part of it, so a
 * reworded diagnostic is not a corpus failure while a changed code, severity,
 * owner, pointer, or locus is (FR-036-AC-1).
 */
export function substantive(value, kind) {
	return {
		resultState: value.resultState,
		diagnostics: (value.diagnostics ?? []).map((entry) => ({
			pointer: entry.pointer,
			code: entry.diagnostic.code,
			severity: entry.diagnostic.severity,
			owner: entry.diagnostic.owner,
			blocking: entry.diagnostic.blocking,
			locus: entry.diagnostic.locus ?? null,
		})),
		...(kind === "compatibility"
			? { classification: value.classification }
			: {}),
	};
}

/* -------------------------------------------------------------- gates ----- */

const INDEXED = /\/\d+(\/|$)/;

/**
 * Runs every FR-035 corpus gate and returns the failures it found.
 *
 * A failure is `{ gate, case | base, message }`; an empty list is a pass.
 */
export function corpusGates() {
	const manifest = loadManifest();
	const failures = [];
	const fail = (gate, subject, message) =>
		failures.push({ gate, subject, message });

	const manifestErrors = validateConformance(
		"corpus-manifest.schema.json",
		manifest,
	);
	for (const error of manifestErrors) {
		fail(
			"manifest-schema",
			"corpus.json",
			`${error.instancePath} ${error.message}`,
		);
	}

	const pattern = new RegExp(manifest.caseIdPattern);
	const seenIds = new Set();

	for (const row of manifest.bases) {
		const path = join(REPO_ROOT, row.path);
		const actual = fileDigest(path);
		if (actual !== row.digest) {
			fail(
				"digest",
				row.path,
				`base digest is ${actual}, manifest says ${row.digest}`,
			);
		}
		const bundle = readJson(path);
		for (const error of validateConformance(
			"input-bundle.schema.json",
			bundle,
		)) {
			fail("base-schema", row.path, `${error.instancePath} ${error.message}`);
		}
		const rows = schemaDiagnostics(bundle);
		const decided = verdict(bundle, rows);
		if (decided.diagnostics.length > 0) {
			fail(
				"base-clean",
				row.path,
				`base yields ${decided.diagnostics.length} oracle diagnostic(s): ${decided.diagnostics
					.map((entry) => `${entry.diagnostic.code}@${entry.pointer}`)
					.join(", ")}`,
			);
		}
	}

	const knownBases = new Set(manifest.bases.map((row) => row.id));

	for (const row of manifest.cases) {
		const path = join(REPO_ROOT, row.path);
		const actual = fileDigest(path);
		if (actual !== row.digest) {
			fail(
				"digest",
				row.id,
				`case digest is ${actual}, manifest says ${row.digest}`,
			);
		}
		const entry = readJson(path);
		for (const error of validateConformance("corpus-case.schema.json", entry)) {
			fail("case-schema", row.id, `${error.instancePath} ${error.message}`);
		}
		if (!pattern.test(entry.id)) {
			fail("case-id", row.id, `id does not match ${manifest.caseIdPattern}`);
		}
		if (seenIds.has(entry.id)) fail("case-id", row.id, "duplicate case id");
		seenIds.add(entry.id);
		const prefix = manifest.familyPrefixes[entry.family];
		if (!prefix || !entry.id.startsWith(`${prefix}-`)) {
			fail(
				"case-id",
				row.id,
				`id does not start with the ${entry.family} prefix ${prefix}`,
			);
		}
		if (!row.path.includes(`/cases/${entry.family}/`)) {
			fail(
				"case-directory",
				row.id,
				`file is not under cases/${entry.family}/`,
			);
		}
		if (!knownBases.has(entry.base)) {
			fail("case-base", row.id, `base ${entry.base} is not in the manifest`);
		}

		const nodes = countNodes(entry.ops);
		if (nodes > manifest.minimizationBudget) {
			fail(
				"minimization",
				row.id,
				`ops uses ${nodes} nodes, budget is ${manifest.minimizationBudget}`,
			);
		}

		for (const [index, op] of entry.ops.entries()) {
			if (
				(op.op === "replace" || op.op === "remove") &&
				INDEXED.test(op.path)
			) {
				const before = entry.ops[index - 1];
				const pins =
					before &&
					before.op === "test" &&
					(before.path === op.path || before.path.startsWith(`${op.path}/`));
				if (!pins) {
					fail(
						"test-op",
						row.id,
						`ops[${index}] ${op.op} ${op.path} is indexed and carries no preceding test op`,
					);
				}
			}
		}

		if (
			entry.provenance.blessedFromRun === true &&
			!entry.provenance.blessing
		) {
			fail(
				"blessing",
				row.id,
				"blessedFromRun is true with no reviewed blessing block",
			);
		}
		for (const source of entry.derivedFrom) {
			let text;
			try {
				text = readFileSync(join(REPO_ROOT, source.artifact), "utf8");
			} catch {
				fail(
					"provenance",
					row.id,
					`derivedFrom artifact does not exist: ${source.artifact}`,
				);
				continue;
			}
			if (!text.includes(source.quote)) {
				fail(
					"provenance",
					row.id,
					`quote does not occur in ${source.artifact}: ${source.quote}`,
				);
			}
		}

		let bundle;
		try {
			bundle = buildInput(entry);
		} catch (error) {
			fail("patch", row.id, error.message);
			continue;
		}
		const decided = oracleVerdict(entry);
		if (entry.class === "negative" && decided.diagnostics.length !== 1) {
			fail(
				"single-violation",
				row.id,
				`a negative case yields ${decided.diagnostics.length} diagnostics: ${decided.diagnostics
					.map((one) => `${one.diagnostic.code}@${one.pointer}`)
					.join(", ")}`,
			);
		}
		const authored = canonical(substantive(entry.expected, entry.kind));
		const observed = canonical(substantive(decided, entry.kind));
		if (authored !== observed) {
			fail(
				"oracle-agreement",
				row.id,
				`authored expectation:\n${authored}\noracle verdict:\n${observed}`,
			);
		}
		for (const expectation of entry.expected.diagnostics) {
			if (expectation.pointer === "") continue;
			// A diagnostic may address an absent member (a missing sourceSpan, a
			// missing required property), so the parent is what must resolve.
			const parentPointer = expectation.pointer.slice(
				0,
				expectation.pointer.lastIndexOf("/"),
			);
			if (resolvePointer(bundle, parentPointer) === undefined) {
				fail(
					"pointer",
					row.id,
					`expected pointer does not resolve: ${expectation.pointer}`,
				);
			}
		}
	}

	const digestInput = [
		...manifest.bases.map((row) => `${row.id}\n${row.digest}\n`),
		...manifest.cases.map((row) => `${row.id}\n${row.digest}\n`),
	].join("");
	const expectedCorpusDigest = textDigest(digestInput);
	if (manifest.corpusDigest !== expectedCorpusDigest) {
		fail(
			"corpus-digest",
			"corpus.json",
			`corpusDigest is ${manifest.corpusDigest}, recomputes to ${expectedCorpusDigest}`,
		);
	}

	const onDisk = new Set(listJson(join(ROOT, "cases")).map(relPath));
	for (const path of onDisk) {
		if (!manifest.cases.some((row) => row.path === path)) {
			fail("case-index", path, "case file is not in the manifest");
		}
	}
	return failures;
}

/** Recomputes the manifest's digest rows and `corpusDigest` from disk. */
export function computeDigests() {
	const bases = listJson(join(ROOT, "bases")).map((path) => ({
		id: path
			.split(/[\\/]/)
			.pop()
			.replace(/\.json$/, ""),
		path: relPath(path),
		digest: fileDigest(path),
	}));
	const cases = listJson(join(ROOT, "cases")).map((path) => {
		const entry = readJson(path);
		return {
			id: entry.id,
			path: relPath(path),
			family: entry.family,
			class: entry.class,
			digest: fileDigest(path),
		};
	});
	cases.sort((left, right) => compareCodePoint(left.id, right.id));
	bases.sort((left, right) => compareCodePoint(left.id, right.id));
	const corpusDigest = textDigest(
		[
			...bases.map((row) => `${row.id}\n${row.digest}\n`),
			...cases.map((row) => `${row.id}\n${row.digest}\n`),
		].join(""),
	);
	return { bases, cases, corpusDigest };
}

export { validatePublished, isObject };
