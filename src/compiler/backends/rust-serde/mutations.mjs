/**
 * The mutation catalogue and its harness (FR-062 "Mutations").
 *
 * The catalogue is the declared operator set crossed with the declared target
 * set, admitting each pair the operator finds a site in. Neither factor is
 * hand-picked, and that is the whole point: a detection score can be raised
 * only by adding a case, never by dropping an entry, because dropping an entry
 * means dropping an operator or a target and both are declared here and
 * compared by `--check` (FR-062-CON-5, FR-062-AC-9).
 *
 * The target set is the *generator*: the transitive import closure of
 * `index.mjs`, which is the one module that writes, plus the pinned tables
 * committed beside it. The modules of this gate — the register, the catalogue,
 * the generator of documents, the property battery, the detectors and the
 * command line — are not in that closure and are not targets. The rule is
 * computed rather than listed, and it is the honest one: mutating the oracle
 * measures the oracle's own text, and a detector that reports its own edit has
 * detected nothing about the mapping. `--check` recomputes the closure, so a
 * module dropped from the emitter is a smaller catalogue and a failing check.
 *
 * The harness copies the backend into a scratch directory, mutates the copy and
 * imports the copy. The working tree is never written (FR-062-CON-2), which the
 * suite asserts rather than assumes.
 */

import {
	cpSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	readdirSync,
	rmSync,
	statSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { BACKEND_DIRECTORY } from "./branches.mjs";
import { byCodePoint } from "./mapping.mjs";

/** The catalogue's own file name, inside the backend directory. */
export const CATALOGUE_FILE = "mutations.json";

/** The module whose import closure is the emitter. */
export const EMITTER_ENTRY = "index.mjs";

/** Generated artefacts of this gate; they are outputs, not modules. */
export const GENERATED_ARTEFACTS = Object.freeze([
	"branch-register.json",
	CATALOGUE_FILE,
]);

/**
 * The eleven declared operators.
 *
 * Each is one semantics-changing edit, applied at the first site it matches, so
 * a mutant differs from the pristine copy in one place. `branches` names what
 * the edit perturbs, which is what binds a mutation to the register.
 */
export const OPERATORS = Object.freeze([
	{
		id: "drop-option-wrapper",
		description: "drop the `Option` wrapper an optional member's row states",
		branches: [
			"field:single/non-null/optional",
			"field:collection/non-null/optional",
		],
		patterns: [[/`Option<\$\{(\w+)\}>`/, "`${$1}`"]],
	},
	{
		id: "drop-skip-serializing-if",
		description:
			"drop the `skip_serializing_if` an optional member's row states",
		branches: ["field:single/non-null/optional"],
		patterns: [
			[
				/push\(\s*'skip_serializing_if = "Option::is_none"',?\s*\)/,
				'push("default")',
			],
		],
	},
	{
		id: "drop-deserialize-with",
		description:
			"drop the `deserialize_with` that keeps an absent member and a present null apart",
		branches: [
			"field:single/nullable/optional",
			"field:collection/nullable/optional",
		],
		patterns: [
			[
				/push\(\s*'deserialize_with = "crate::support::present_or_absent"',?\s*\)/,
				'push("default")',
			],
		],
	},
	{
		id: "invert-bound-comparison",
		description: "invert the comparison a bound keyword renders",
		branches: ["constraint:min/integer", "constraint:max/integer"],
		patterns: [
			[/(\bmin:\s*)"<"/, '$1">"'],
			[/(check\.keyword === "minLength" \? )"<"/, '$1">"'],
		],
	},
	{
		id: "flip-deny-unknown-fields",
		description:
			"flip the condition under which a record denies unknown members",
		branches: ["unknownPolicy:record/reject", "unknownPolicy:record/preserve"],
		patterns: [[/if \(!retains\) lines\.push\(/, "if (retains) lines.push("]],
	},
	{
		id: "drop-serde-rename",
		description:
			"drop the `serde(rename)` a derived identifier needs to keep its wire name",
		branches: ["name:memberName", "name:variantName"],
		patterns: [
			[
				/return bare === wireName \? undefined : wireName;/,
				"return undefined;",
			],
			[
				/(if \()((?:field|variant)\.rename) !== undefined/,
				"$1false && $2 !== undefined",
			],
		],
	},
	{
		id: "relax-pattern-classification",
		description:
			"relax a pattern classification from `unsupported` to `expressible`",
		branches: ["diagnostic:agent-ix.rust-backend.UNSUPPORTED_PATTERN"],
		patterns: [
			[/return "unsupported";/, 'return "expressible";'],
			// The consumer site. The edit that relaxes it is the one that makes
			// the guard name a *different* classification: `unsupported` then
			// reaches the matcher and `expressible` is refused. Replacing the
			// comparison with one no classification satisfies is an equivalent
			// mutant here, because the matcher path refuses an inexpressible
			// pattern a second time — a redundancy this operator found.
			[/classification === "unsupported"/, 'classification === "expressible"'],
		],
	},
	{
		id: "substitute-string-for-newtype",
		description: "substitute `String` for a mapped, constrained newtype",
		branches: [
			"scalar:date",
			"scalar:datetime",
			"scalar:duration",
			"scalar:uuid",
		],
		patterns: [
			[/(date|datetime|duration|uuid): "crate::support::\w+"/, '$1: "String"'],
		],
	},
	{
		id: "drop-box-at-cycle-edge",
		description: "drop the `Box` the graph introduces at a cycle edge",
		branches: [
			"indirection:field-single",
			"indirection:alias-target",
			"indirection:variant-payload",
		],
		patterns: [
			[/graph\.boxed\.has\(edgeKey\) \? `Box<\$\{base\}>` : base/, "base"],
			[/boxed\.add\(edge\.edgeKey\);/, ";"],
		],
	},
	{
		id: "widen-applicability-row",
		description:
			"widen an applicability row so a subject it excludes is admitted",
		branches: ["constraint:pattern/string", "unknownPolicy:inert"],
		patterns: [
			[/!Object\.hasOwn\(KERNEL_SCALARS, scalar\)/, "false"],
			[/!applies\(keyword, resolved\.kind, resolved\.scalar\)/, "false"],
			[
				/"kind": "scalar\|alias\|sequence\|map\|reference"/,
				'"kind": "scalar|alias|sequence|map|record|reference"',
			],
		],
	},
	{
		id: "drop-blocking-flag",
		description: "drop the blocking flag a refusing diagnostic carries",
		branches: ["diagnostic:agent-ix.rust-backend.UNSUPPORTED_CONSTRUCT"],
		patterns: [[/blocking: true/, "blocking: false"]],
	},
]);

/** Every file under a directory, as paths relative to it, in code-point order. */
export function filesUnder(directory) {
	const found = [];
	const walk = (current) => {
		for (const name of readdirSync(current).sort(byCodePoint)) {
			const path = join(current, name);
			if (statSync(path).isDirectory()) {
				walk(path);
				continue;
			}
			found.push(relative(directory, path));
		}
	};
	walk(directory);
	return found.sort(byCodePoint);
}

/** The relative module specifiers one module imports from its own directory. */
function localImports(text) {
	return [...text.matchAll(/from "\.\/([^"]+)"/g)].map((match) => match[1]);
}

/**
 * The emitter: the transitive import closure of `index.mjs` inside the backend
 * directory. Computed, so a module the emitter stops importing leaves the
 * target set and the catalogue shrinks, which `--check` reports.
 */
export function emitterClosure(directory, entry = EMITTER_ENTRY) {
	const seen = new Set();
	const queue = [entry];
	while (queue.length > 0) {
		const name = queue.pop();
		if (seen.has(name)) continue;
		seen.add(name);
		for (const next of localImports(
			readFileSync(join(directory, name), "utf8"),
		)) {
			if (!next.endsWith(".mjs")) continue;
			queue.push(next);
		}
	}
	return [...seen].sort(byCodePoint);
}

/**
 * The target set: the emitter's modules and the tables pinned beside them.
 *
 * A `.json` or `.rs` file in the directory is a table the emitter reads or
 * embeds — the mapping table, the reserved words, the published patterns, the
 * proved validators, the support template — and each is as much a part of the
 * mapping as a module is. The two artefacts this gate generates are excluded:
 * they are its output, and mutating an output measures nothing.
 */
export function targetSet(directory) {
	const closure = new Set(emitterClosure(directory));
	return filesUnder(directory)
		.filter((path) => {
			if (GENERATED_ARTEFACTS.includes(path)) return false;
			if (path.endsWith(".mjs")) return closure.has(path);
			return path.endsWith(".json") || path.endsWith(".rs");
		})
		.sort(byCodePoint);
}

/** Applies one operator to a text, at its first site. Returns `undefined` when it does not apply. */
export function applyOperator(operator, text) {
	for (const [pattern, replacement] of operator.patterns) {
		const match = pattern.exec(text);
		if (match === null) continue;
		const before = text.slice(0, match.index);
		return {
			mutated: text.replace(pattern, replacement),
			// The line is reported to a caller that wants it and is *not* stored
			// in the catalogue: a committed line number goes stale on every
			// unrelated edit above it, and a gate that fails on someone else's
			// formatting is a gate people learn to regenerate without reading.
			line: before.split("\n").length,
			site: match[0].split("\n")[0].trim(),
			sites: text.split(pattern).length - 1,
		};
	}
	return undefined;
}

/** One mutation's stable id. */
export function mutationId(operator, target) {
	return `${operator.id}@${target}`;
}

/**
 * Builds the catalogue: every applicable (operator, target) pair.
 *
 * `expected` maps a mutation id to the cases a previous run recorded as
 * detecting it; it is carried into the entry so the catalogue records, for each
 * mutation, the case that detects it.
 */
export function buildCatalogue(options = {}) {
	const directory = options.directory ?? BACKEND_DIRECTORY;
	const expected = options.expected ?? {};
	// The two factors are arguments so that a *case* can shrink one and observe
	// the catalogue shrink with it, which is what FR-062-AC-9 asks to be shown.
	// Nothing but a case passes them: every caller in this bundle takes the
	// declared sets.
	const operators = options.operators ?? OPERATORS;
	const targets = options.targets ?? targetSet(directory);
	const entries = [];
	for (const operator of operators) {
		for (const target of targets) {
			const applied = applyOperator(
				operator,
				readFileSync(join(directory, target), "utf8"),
			);
			if (applied === undefined) continue;
			const id = mutationId(operator, target);
			entries.push({
				mutationId: id,
				operator: operator.id,
				description: operator.description,
				target,
				branches: [...operator.branches],
				site: applied.site,
				detectedBy: expected[id] ?? [],
			});
		}
	}
	entries.sort((left, right) => byCodePoint(left.mutationId, right.mutationId));
	return {
		contractVersion: "1.0.0",
		requirement: "ix://agent-ix/filament-core-data/FR-062",
		note: "The declared operator set crossed with the declared target set, admitting each pair the operator finds a site in. The target set is the transitive import closure of index.mjs plus the tables pinned beside it, computed rather than listed. Removing an operator, or a module from the emitter, shrinks this catalogue and fails `cli.mjs mutations --check`.",
		operators: operators.map((one) => ({
			id: one.id,
			description: one.description,
			branches: [...one.branches],
		})),
		targets,
		mutationCount: entries.length,
		mutations: entries,
	};
}

/** The catalogue's serialized form: the one spelling `--check` compares against. */
export function serializeCatalogue(catalogue) {
	return `${JSON.stringify(catalogue, null, "\t")}\n`;
}

/** The catalogue with every recorded detection stripped, for a structural comparison. */
export function structureOf(catalogue) {
	return {
		...catalogue,
		mutations: catalogue.mutations.map((one) => ({ ...one, detectedBy: [] })),
	};
}

/**
 * Copies the backend, and the one module it imports from outside its own
 * directory, into a scratch tree. Nothing in the working tree is written.
 */
export function scratchCopy(root, label) {
	const base = mkdtempSync(join(tmpdir(), `rust-backend-${label}-`));
	const backend = join(base, "src", "compiler", "backends", "rust-serde");
	mkdirSync(dirname(backend), { recursive: true });
	cpSync(join(root, "src", "compiler", "backends", "rust-serde"), backend, {
		recursive: true,
	});
	const applicability = join(
		base,
		"src",
		"compiler",
		"ir",
		"applicability.mjs",
	);
	mkdirSync(dirname(applicability), { recursive: true });
	cpSync(
		join(root, "src", "compiler", "ir", "applicability.mjs"),
		applicability,
	);
	// The contract-gap register too: the branch register cites a gap id and
	// resolves it, so a copy without it reports that it could not run — which
	// is the right answer to the wrong question.
	const gaps = join(base, "conformance", "contract-gaps.json");
	mkdirSync(dirname(gaps), { recursive: true });
	cpSync(join(root, "conformance", "contract-gaps.json"), gaps);
	return { base, backend };
}

/**
 * Runs the catalogue.
 *
 * Every mutant is a fresh scratch copy, so the module graph the detectors
 * import is the mutant's own — an ESM cache keyed on a path cannot serve a
 * stale module. `suppress` names cases the run pretends do not exist, which is
 * how FR-062-AC-4's "suppress the detecting case" is measured.
 */
export async function runCatalogue(options) {
	const { root, catalogue, detectors, backendOptions, suppress = [] } = options;

	// The battery must pass on an unmutated copy first. A detector that fails in
	// the working tree fails against every mutant too, and would report a
	// perfect score built entirely out of one broken assertion.
	const pristine = scratchCopy(root, "pristine");
	try {
		const loaded = await detectors.loadBackend(
			pristine.backend,
			backendOptions,
		);
		const observed = detectors.runDetectors(loaded, { suppress });
		const broken = observed.filter((one) => one.ok !== true);
		if (broken.length > 0) {
			throw new Error(
				`the detector battery does not pass on an unmutated copy, so no score it produces means anything: ${broken.map((one) => `${one.caseId} — ${one.failure}`).join("; ")}`,
			);
		}
	} finally {
		rmSync(pristine.base, { recursive: true, force: true });
	}

	const results = [];
	for (const mutation of catalogue.mutations) {
		const operator = OPERATORS.find((one) => one.id === mutation.operator);
		const { base, backend } = scratchCopy(root, "mutant");
		try {
			const path = join(backend, mutation.target);
			const applied = applyOperator(operator, readFileSync(path, "utf8"));
			if (applied === undefined) {
				results.push({
					mutationId: mutation.mutationId,
					applied: false,
					detectedBy: [],
					note: "the operator found no site in the scratch copy, so the mutant was never built",
				});
				continue;
			}
			writeFileSync(path, applied.mutated, "utf8");
			const loaded = await detectors.loadBackend(backend, backendOptions);
			const observed = detectors.runDetectors(loaded, { suppress });
			results.push({
				mutationId: mutation.mutationId,
				applied: true,
				detectedBy: observed
					.filter((one) => one.ok !== true)
					.map((one) => one.caseId),
			});
		} catch (error) {
			// A mutant whose modules do not even import is detected: the failure
			// is the detector battery failing to run, which is a failure and not
			// a skip.
			results.push({
				mutationId: mutation.mutationId,
				applied: true,
				detectedBy: [
					`the detector battery could not run against the mutant: ${String(error?.message ?? error)}`,
				],
			});
		} finally {
			rmSync(base, { recursive: true, force: true });
		}
	}
	// Three outcomes, not two. A mutation that could not be *applied* is not an
	// undetected mutation and it is not a detected one either: it is an entry
	// that was never tried, and scoring it either way moves the number while
	// telling nobody the mutant was never built.
	const inapplicable = results.filter((one) => one.applied !== true);
	const applied = results.filter((one) => one.applied === true);
	const detected = applied.filter((one) => one.detectedBy.length > 0);
	return {
		results,
		detected: detected.length,
		applied: applied.length,
		total: results.length,
		score: applied.length === 0 ? 0 : detected.length / applied.length,
		undetected: applied
			.filter((one) => one.detectedBy.length === 0)
			.map((one) => one.mutationId),
		inapplicable: inapplicable.map((one) => one.mutationId),
	};
}

/** The repository root, located from this module. */
export const REPOSITORY_ROOT = fileURLToPath(
	new URL("../../../../", import.meta.url),
);
