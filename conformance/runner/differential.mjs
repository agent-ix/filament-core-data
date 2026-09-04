/**
 * The differential conformance harness (issue #20, FR-037).
 *
 * It compares every declared implementation's result for every corpus case with
 * the oracle's verdict, and never with another implementation's result. It
 * reads no clock, so its report is a function of the corpus and the adapter
 * results alone; `reviewBy` expiry is the audit target's job.
 */

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import {
	ROOT,
	compare,
	corpusGates,
	loadCorpus,
	oracleVerdict,
} from "../corpus.mjs";
import { canonical, compareCodePoint } from "../oracle/json.mjs";
import { formatJson } from "../tools/format-json.mjs";
import { validateConformance } from "../oracle/schema-layer.mjs";

const REGISTRY_PATH = join(ROOT, "adapters", "registry.json");
const DIVERGENCES_PATH = join(ROOT, "divergences.json");
const THRESHOLDS_PATH = join(ROOT, "thresholds.json");
const COVERAGE_PATH = join(ROOT, "coverage.json");
const MUTATIONS_PATH = join(ROOT, "mutations.json");

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));

/**
 * Runs one adapter over the corpus.
 *
 * An adapter with no `command` and a registry `status` of `unavailable` answers
 * `unavailable` for every case; that is a recorded unmet row, not a pass. An
 * adapter with a command is started as a process and never imported.
 */
function runAdapter(adapter, cases, manifest) {
	if (!adapter.command) {
		if (adapter.status !== "unavailable") {
			return {
				failed: true,
				reason: `adapter ${adapter.id} is registered ${adapter.status} but supplies no command`,
				results: [],
			};
		}
		return {
			failed: false,
			results: cases.map((entry) => ({
				adapter: adapter.id,
				adapterVersion: "0.0.0",
				caseId: entry.id,
				caseDigest: manifest.cases.find((row) => row.id === entry.id).digest,
				support: "unavailable",
			})),
		};
	}
	let stdout;
	try {
		stdout = execFileSync(adapter.command[0], adapter.command.slice(1), {
			cwd: ROOT,
			encoding: "utf8",
			maxBuffer: 64 * 1024 * 1024,
		});
	} catch (error) {
		return {
			failed: true,
			reason: `adapter ${adapter.id} exited non-zero: ${error.message}`,
			results: [],
		};
	}
	let parsed;
	try {
		parsed = JSON.parse(stdout);
	} catch (error) {
		return {
			failed: true,
			reason: `adapter ${adapter.id} did not emit JSON: ${error.message}`,
			results: [],
		};
	}
	if (!Array.isArray(parsed)) {
		return {
			failed: true,
			reason: `adapter ${adapter.id} emitted ${typeof parsed}, not an array of results`,
			results: [],
		};
	}
	return { failed: false, results: parsed };
}

function divergenceKey(caseId, adapterId, code) {
	return canonical([caseId, adapterId, code]);
}

/** Runs the whole corpus against every registered adapter. */
export function run(options = {}) {
	const { adapterResults } = options;
	const gateFailures = options.skipCorpusGates === true ? [] : corpusGates();
	const { manifest, cases } = loadCorpus();
	const registry = options.registry ?? readJson(REGISTRY_PATH);
	const register = options.divergences ?? readJson(DIVERGENCES_PATH);
	const thresholds = options.thresholds ?? readJson(THRESHOLDS_PATH);
	const byId = new Map(manifest.cases.map((row) => [row.id, row]));

	const problems = [];
	const unmet = [];
	const divergences = [];
	const usedRegisterKeys = new Set();
	const adapterRows = [];

	const registryIds = registry.adapters
		.map((entry) => entry.id)
		.sort(compareCodePoint);
	const thresholdIds = thresholds.thresholds
		.map((entry) => entry.adapter)
		.sort(compareCodePoint);
	for (const id of registryIds) {
		if (!thresholdIds.includes(id)) {
			problems.push({
				kind: "threshold",
				adapter: id,
				message: "registry adapter has no threshold row",
			});
		}
	}
	for (const id of thresholdIds) {
		if (!registryIds.includes(id)) {
			problems.push({
				kind: "threshold",
				adapter: id,
				message: "threshold row has no registry adapter",
			});
		}
	}

	for (const adapter of [...registry.adapters].sort((left, right) =>
		compareCodePoint(left.id, right.id),
	)) {
		const supplied = adapterResults?.[adapter.id];
		const outcome = supplied
			? { failed: false, results: supplied }
			: runAdapter(adapter, cases, manifest);
		if (outcome.failed) {
			problems.push({
				kind: "adapter",
				adapter: adapter.id,
				message: outcome.reason,
			});
			adapterRows.push({
				adapter: adapter.id,
				status: adapter.status,
				matched: 0,
				unmet: 0,
				failed: cases.length,
			});
			continue;
		}
		const answered = new Map();
		let matched = 0;
		let unmetCount = 0;
		let failedCount = 0;
		for (const result of outcome.results) {
			const errors = validateConformance("adapter-result.schema.json", result);
			if (errors.length > 0) {
				problems.push({
					kind: "adapter-result",
					adapter: adapter.id,
					case: result?.caseId ?? null,
					message: errors
						.map((error) => `${error.instancePath} ${error.message}`)
						.join("; "),
				});
				failedCount += 1;
				continue;
			}
			if (!byId.has(result.caseId)) {
				problems.push({
					kind: "unknown-case",
					adapter: adapter.id,
					case: result.caseId,
					message: "the corpus declares no such case",
				});
				failedCount += 1;
				continue;
			}
			if (answered.has(result.caseId)) {
				problems.push({
					kind: "duplicate-answer",
					adapter: adapter.id,
					case: result.caseId,
					message: "the adapter answered this case twice",
				});
				failedCount += 1;
				continue;
			}
			answered.set(result.caseId, result);
			if (result.caseDigest !== byId.get(result.caseId).digest) {
				problems.push({
					kind: "case-digest",
					adapter: adapter.id,
					case: result.caseId,
					message: "the answer names a case digest the manifest does not carry",
				});
				failedCount += 1;
				continue;
			}
			const entry = cases.find((one) => one.id === result.caseId);
			if (result.support === "unavailable") {
				if (adapter.status !== "unavailable") {
					problems.push({
						kind: "unavailable",
						adapter: adapter.id,
						case: result.caseId,
						message: "an available adapter answered unavailable",
					});
					failedCount += 1;
					continue;
				}
				unmet.push({
					adapter: adapter.id,
					case: result.caseId,
					owningIssue: adapter.owningIssue,
				});
				unmetCount += 1;
				continue;
			}
			if (result.support === "unsupported") {
				const declared = (entry.unsupportedBy ?? []).find(
					(one) => one.adapter === adapter.id,
				);
				if (!declared) {
					problems.push({
						kind: "unsupported",
						adapter: adapter.id,
						case: result.caseId,
						message: "the case does not declare this adapter in unsupportedBy",
					});
					failedCount += 1;
					continue;
				}
				unmet.push({
					adapter: adapter.id,
					case: result.caseId,
					owningIssue: declared.owningIssue,
				});
				unmetCount += 1;
				continue;
			}
			const outcomeOfCase = compare(entry, result, {
				pointerCompatible: adapter.pointerCompatible !== false,
			});
			if (outcomeOfCase.matches) {
				matched += 1;
				continue;
			}
			let suppressed = true;
			for (const problem of outcomeOfCase.problems) {
				const code =
					problem.kind === "diagnostic"
						? (outcomeOfCase.expected.diagnostics[problem.index]?.diagnostic
								?.code ??
							result.diagnostics?.[problem.index]?.diagnostic?.code ??
							problem.kind)
						: problem.kind;
				const key = divergenceKey(result.caseId, adapter.id, code);
				const suppression = register.divergences.find(
					(one) => divergenceKey(one.case, one.adapter, one.code) === key,
				);
				divergences.push({
					case: result.caseId,
					adapter: adapter.id,
					code,
					pointer: problem.pointer,
					locus: problem.locus ?? null,
					expected: problem.expected,
					observed: problem.observed,
					suppressedBy: suppression ? suppression.id : null,
				});
				if (suppression) usedRegisterKeys.add(key);
				else suppressed = false;
			}
			if (suppressed) matched += 1;
			else failedCount += 1;
		}
		for (const row of manifest.cases) {
			if (!answered.has(row.id)) {
				problems.push({
					kind: "missing-answer",
					adapter: adapter.id,
					case: row.id,
					message: "the adapter returned no result for this case",
				});
				failedCount += 1;
			}
		}
		adapterRows.push({
			adapter: adapter.id,
			status: adapter.status,
			matched,
			unmet: unmetCount,
			failed: failedCount,
		});
	}

	for (const entry of register.divergences) {
		const key = divergenceKey(entry.case, entry.adapter, entry.code);
		if (!usedRegisterKeys.has(key)) {
			problems.push({
				kind: "unreproduced-divergence",
				adapter: entry.adapter,
				case: entry.case,
				message: `divergence ${entry.id} is registered but no run reproduces it`,
			});
		}
	}

	for (const failure of gateFailures) {
		problems.push({
			kind: `corpus-${failure.gate}`,
			case: failure.subject,
			message: failure.message,
		});
	}

	const coverage = buildCoverage(manifest, cases, adapterRows, unmet);
	const failedAdapters = adapterRows.filter((row) => row.failed > 0);
	return {
		corpusVersion: manifest.corpusVersion,
		corpusDigest: manifest.corpusDigest,
		cases: manifest.cases.length,
		adapters: adapterRows,
		unmet,
		divergences,
		problems,
		coverage,
		exitCode: problems.length > 0 || failedAdapters.length > 0 ? 1 : 0,
	};
}

/** Builds the coverage account: register rows by class, adapters, unmet areas. */
export function buildCoverage(manifest, cases, adapterRows, unmet) {
	const rows = manifest.constructRegister.map((row) => {
		const family = row.family;
		const byClass = {};
		for (const klass of ["positive", "negative", "boundary", "evolution"]) {
			byClass[klass] = cases
				.filter((entry) => entry.family === family && entry.class === klass)
				.map((entry) => entry.id)
				.sort(compareCodePoint);
		}
		const notApplicable = (row.notApplicable ?? []).map((one) => one.class);
		const missing = Object.entries(byClass)
			.filter(
				([klass, ids]) => ids.length === 0 && !notApplicable.includes(klass),
			)
			.map(([klass]) => klass);
		return {
			id: row.id,
			family,
			decidedBy: row.decidedBy,
			cases: byClass,
			notApplicable,
			missing,
			met: missing.length === 0,
		};
	});
	return {
		corpusVersion: manifest.corpusVersion,
		corpusDigest: manifest.corpusDigest,
		totalCases: manifest.cases.length,
		registerRows: rows,
		unmetRegisterRows: rows.filter((row) => !row.met).map((row) => row.id),
		adapters: adapterRows.map((row) => ({
			adapter: row.adapter,
			status: row.status,
			matched: row.matched,
			unmet: row.unmet,
			failed: row.failed,
		})),
		unmetCases: unmet.length,
		unmetAreas: manifest.unmetAreas ?? [],
	};
}

/** Renders the coverage account exactly as the committed file carries it. */
export function renderCoverage(coverage) {
	return formatJson(coverage, "coverage.json");
}

/** Writes `conformance/coverage.json` from a run report. */
export function writeCoverage(report) {
	writeFileSync(COVERAGE_PATH, renderCoverage(report.coverage));
}

/** The mutation catalogue's detection score. */
export function mutationScore(options = {}) {
	const catalogue = options.catalogue ?? readJson(MUTATIONS_PATH);
	const cases = options.cases ?? loadCorpus().cases;
	const detected = [];
	const undetected = [];
	for (const mutation of catalogue.mutations) {
		const entry = cases.find((one) => one.id === mutation.detectedBy);
		const decided = entry ? oracleVerdict(entry) : undefined;
		const hit =
			decided !== undefined &&
			decided.diagnostics.some((one) => one.diagnostic.code === mutation.code);
		(hit ? detected : undetected).push(mutation.id);
	}
	return {
		total: catalogue.mutations.length,
		detected: detected.length,
		undetected,
		score:
			catalogue.mutations.length === 0
				? 0
				: detected.length / catalogue.mutations.length,
	};
}

if (import.meta.url === `file://${process.argv[1]}`) {
	const report = run();
	writeCoverage(report);
	process.stdout.write(`${JSON.stringify(report, null, "\t")}\n`);
	process.exit(report.exitCode);
}
