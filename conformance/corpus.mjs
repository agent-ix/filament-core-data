/**
 * The conformance corpus: loading, building, digesting, and gating (FR-035).
 *
 * Paths resolve relative to this module, never to the working directory, so a
 * consumer needs no particular cwd (FR-039). Nothing here reads a clock, the
 * network, or an environment variable.
 */

import { execFileSync } from "node:child_process";
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
import { classify, verdict } from "./oracle/oracle.mjs";
import {
	schemaDiagnostics,
	validateAgainst,
	validateConformance,
	validatePublished,
} from "./oracle/schema-layer.mjs";

const PUBLISHED_BASE = "https://schemas.agent-ix.org/filament-core-data/v1/";

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

/* --------------------------------------------------------- versioning ---- */

/**
 * Reads the manifest as `origin/main` carries it, or `undefined` when the
 * corpus has no predecessor there.
 *
 * This is the one place in this corpus that resolves anything from a moving
 * ref, and it is deliberate. Every other range and baseline here is a history
 * fact, because a live computation against a moving ref either empties out
 * after a merge or annexes a later ticket's work — the defect issues #27, #19
 * and this corpus each carried.
 *
 * A versioning gate is the exception, because its baseline has to be something
 * the branch under test cannot edit. Transcribing the previous corpus into this
 * branch as a constant would satisfy the letter of that rule and break its
 * point: the same commit that changes an expected result would update the
 * baseline beside it and the gate would never fire. That is the blessing this
 * whole corpus exists to prevent, one level up. Resolving it from history does
 * not work either — the parent of the commit that introduced the corpus never
 * carries a predecessor, so the comparison would be permanently vacuous.
 *
 * The moving-ref risk that remains is that the ref is unreadable and the gate
 * quietly stops asserting. `versioningFailures` closes that: the manifest
 * declares whether a predecessor is expected, so an unreadable one is a failure
 * rather than a skip. It reads one committed blob, never the working tree and
 * never a clock.
 */
export function previousManifest() {
	try {
		return JSON.parse(
			execFileSync("git", ["show", "origin/main:conformance/corpus.json"], {
				cwd: REPO_ROOT,
				encoding: "utf8",
				stdio: ["ignore", "pipe", "ignore"],
			}),
		);
	} catch {
		return undefined;
	}
}

function semverParts(value) {
	const match = /^(\d+)\.(\d+)\.(\d+)/.exec(String(value));
	return match
		? [Number(match[1]), Number(match[2]), Number(match[3])]
		: undefined;
}

/**
 * Classifies the change between two corpus manifests and names the reasons.
 *
 * `major` when an existing case's `expected` changed, or a case or base was
 * removed or rewritten; `minor` when a case, a base, or a register row was
 * added; `patch` when only titles, citations, or prose moved; `none` when
 * nothing did (FR-035).
 */
export function classifyVersionChange(previous, current) {
	const reasons = [];
	const priorCases = new Map(
		(previous.cases ?? []).map((row) => [row.id, row]),
	);
	const priorBases = new Map(
		(previous.bases ?? []).map((row) => [row.id, row]),
	);
	for (const row of current.cases ?? []) {
		const prior = priorCases.get(row.id);
		if (!prior) {
			reasons.push({ level: "minor", reason: `case ${row.id} was added` });
			continue;
		}
		if (prior.expectedDigest !== row.expectedDigest) {
			reasons.push({
				level: "major",
				reason: `case ${row.id} changed its expected result`,
			});
		} else if (prior.digest !== row.digest) {
			reasons.push({
				level: "patch",
				reason: `case ${row.id} changed outside its expected result`,
			});
		}
		priorCases.delete(row.id);
	}
	for (const id of priorCases.keys()) {
		reasons.push({ level: "major", reason: `case ${id} was removed` });
	}
	for (const row of current.bases ?? []) {
		const prior = priorBases.get(row.id);
		if (!prior)
			reasons.push({ level: "minor", reason: `base ${row.id} was added` });
		else if (prior.digest !== row.digest) {
			reasons.push({ level: "major", reason: `base ${row.id} changed` });
		}
		priorBases.delete(row.id);
	}
	for (const id of priorBases.keys()) {
		reasons.push({ level: "major", reason: `base ${id} was removed` });
	}
	const priorRows = new Set(
		(previous.constructRegister ?? []).map((row) => row.id),
	);
	for (const row of current.constructRegister ?? []) {
		if (!priorRows.has(row.id)) {
			reasons.push({
				level: "minor",
				reason: `register row ${row.id} was added`,
			});
		}
	}
	const order = ["none", "patch", "minor", "major"];
	const required = reasons.reduce(
		(worst, entry) =>
			order.indexOf(entry.level) > order.indexOf(worst) ? entry.level : worst,
		"none",
	);
	return { required, reasons };
}

/** The bump actually taken between two SemVer strings. */
export function observedBump(previousVersion, currentVersion) {
	const before = semverParts(previousVersion);
	const after = semverParts(currentVersion);
	if (!before || !after) return undefined;
	if (after[0] > before[0]) return "major";
	if (after[0] < before[0]) return undefined;
	if (after[1] > before[1]) return "minor";
	if (after[1] < before[1]) return undefined;
	if (after[2] > before[2]) return "patch";
	if (after[2] < before[2]) return undefined;
	return "none";
}

/**
 * The FR-035 versioning gate: an existing expected result may not change, and a
 * case or base may not be removed, without a major `corpusVersion` bump.
 *
 * The manifest declares whether a predecessor is expected, so the absence of one
 * is an assertion rather than a silent skip. A gate that quietly disables itself
 * when a git ref is unreadable is the same defect as a gate that baselines on a
 * range its own merge empties: it stops asserting and nothing says so.
 */
export function versioningFailures(previous, current) {
	const declared = current.predecessor ?? {
		state: "required",
		ref: "origin/main",
	};
	if (declared.state === "none") {
		// Nothing to compare against: the honest state before this corpus first
		// merges. Once a predecessor becomes readable the declaration is out of
		// date, but it is only *wrong* when the corpus has moved since — the first
		// moment the comparison would have said anything. Failing on the identical
		// post-merge tree instead would leave `main` red for a stale sentence.
		if (!previous) return [];
		const { reasons } = classifyVersionChange(previous, current);
		if (reasons.length === 0) return [];
		return [
			{
				gate: "versioning",
				subject: "corpus.json",
				message: `the manifest declares no predecessor, but ${declared.ref} carries one at corpusVersion ${previous.corpusVersion} and the corpus has moved since (${reasons
					.map((entry) => entry.reason)
					.join("; ")}); set predecessor.state to "required"`,
			},
		];
	}
	if (!previous) {
		return [
			{
				gate: "versioning",
				subject: "corpus.json",
				message: `the manifest requires a predecessor at ${declared.ref}, which could not be read, so the versioning comparison did not run`,
			},
		];
	}
	const { required, reasons } = classifyVersionChange(previous, current);
	const observed = observedBump(previous.corpusVersion, current.corpusVersion);
	const order = ["none", "patch", "minor", "major"];
	if (observed === undefined) {
		return [
			{
				gate: "versioning",
				subject: "corpus.json",
				message: `corpusVersion moved from ${previous.corpusVersion} to ${current.corpusVersion}, which is not a forward SemVer bump`,
			},
		];
	}
	if (order.indexOf(observed) < order.indexOf(required)) {
		return [
			{
				gate: "versioning",
				subject: "corpus.json",
				message: `the change requires a ${required} bump but corpusVersion took a ${observed} one: ${reasons
					.filter((entry) => entry.level === required)
					.map((entry) => entry.reason)
					.join("; ")}`,
			},
		];
	}
	return [];
}

/* -------------------------------------------------------------- gates ----- */

const INDEXED = /\/\d+(\/|$)/;

/**
 * Operations that re-aim when a base gains or loses an array member, and so
 * must be pinned by a preceding `test` op (FR-035).
 */
const PINNED_OPS = new Set(["add", "copy", "move", "remove", "replace"]);

/** The `x-repeat` expansion ceiling the manifest declares. */
export const REPEAT_LIMIT = 512;

/**
 * The array member an indexed path sits inside: the path up to and including
 * its last numeric segment. A `test` op anywhere under that member pins the op
 * against a base whose element order changed.
 */
export function indexedContainer(path) {
	const tokens = path.split("/");
	for (let index = tokens.length - 1; index >= 0; index -= 1) {
		if (/^\d+$/.test(tokens[index]))
			return tokens.slice(0, index + 1).join("/");
	}
	return path;
}

/**
 * Runs every FR-035 corpus gate and returns the failures it found.
 *
 * A failure is `{ gate, case | base, message }`; an empty list is a pass.
 */
export function corpusGates(overrides = {}) {
	const manifest = overrides.manifest ?? loadManifest();
	const readCase =
		overrides.readCase ?? ((row) => readJson(join(REPO_ROOT, row.path)));
	const previous =
		overrides.previous === undefined ? previousManifest() : overrides.previous;
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
		const entry = readCase(row);
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

		for (const [index, op] of entry.ops.entries()) {
			if (
				op.op === "x-repeat" &&
				op.count > (manifest.repeatLimit ?? REPEAT_LIMIT)
			) {
				fail(
					"repeat-limit",
					row.id,
					`ops[${index}] repeats ${op.count} times, ceiling is ${manifest.repeatLimit ?? REPEAT_LIMIT}`,
				);
			}
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
			if (PINNED_OPS.has(op.op) && INDEXED.test(op.path)) {
				const before = entry.ops[index - 1];
				const pins =
					before !== undefined &&
					before.op === "test" &&
					before.path.startsWith(indexedContainer(op.path));
				if (!pins) {
					fail(
						"test-op",
						row.id,
						`ops[${index}] ${op.op} ${op.path} addresses an array member by index and carries no preceding test op pinning ${indexedContainer(op.path)}`,
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
			const allowed = (manifest.contractArtifacts ?? []).some(
				(prefix) =>
					source.artifact === prefix || source.artifact.startsWith(prefix),
			);
			if (!allowed) {
				fail(
					"provenance",
					row.id,
					`derivedFrom names ${source.artifact}, which is not a declared contract artifact`,
				);
				continue;
			}
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
			for (const error of validateAgainst(
				`${PUBLISHED_BASE}common.schema.json#/$defs/diagnostic`,
				expectation.diagnostic,
			)) {
				fail(
					"diagnostic-shape",
					row.id,
					`expected diagnostic at ${expectation.pointer}: ${error.instancePath} ${error.message}`,
				);
			}
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

	for (const path of listJson(join(ROOT, "cases")).map(relPath)) {
		if (!manifest.cases.some((row) => row.path === path)) {
			fail("case-index", path, "case file is not in the manifest");
		}
	}
	for (const path of listJson(join(ROOT, "bases")).map(relPath)) {
		if (!manifest.bases.some((row) => row.path === path)) {
			fail("base-index", path, "base file is not in the manifest");
		}
	}

	for (const failure of versioningFailures(previous, manifest))
		failures.push(failure);
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
			expectedDigest: textDigest(canonical(entry.expected)),
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
