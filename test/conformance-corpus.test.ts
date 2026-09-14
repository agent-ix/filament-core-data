/**
 * Issue #20 — the semantic conformance corpus and its independent differential
 * oracle. Test cases TC-280..TC-643 of `spec/tests.md`.
 *
 * The corpus itself is JavaScript under `conformance/`; this file is the vitest
 * gate over it. It imports the corpus, never the other way round.
 */

import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";

import { changeRange } from "./changed-paths.js";

/* The corpus is untyped ESM JavaScript by design (NFR-016): it stays consumable
   from any runtime and adds no build step, so the suite reads it through a
   loader that types it loosely rather than through generated declarations. */
type Loose = { [name: string]: (...args: unknown[]) => unknown };
const load = async (path: string): Promise<Loose> =>
	(await import(/* @vite-ignore */ path)) as unknown as Loose;

const HERE = dirname(new URL(import.meta.url).pathname);
const corpus = await load(join(HERE, "..", "conformance", "corpus.mjs"));
const api = await load(join(HERE, "..", "conformance", "oracle", "index.mjs"));
const oracle = await load(
	join(HERE, "..", "conformance", "oracle", "oracle.mjs"),
);
const { applyPatch, canonical, countNodes } = await load(
	join(HERE, "..", "conformance", "oracle", "json.mjs"),
);
const { schemaDiagnostics, validateAgainst, validateConformance } = await load(
	join(HERE, "..", "conformance", "oracle", "schema-layer.mjs"),
);
const { buildCoverage, mutationScore, renderCoverage, run } = await load(
	join(HERE, "..", "conformance", "runner", "differential.mjs"),
);

type Json = Record<string, unknown>;

const REPO = join(HERE, "..");
const CONF = join(REPO, "conformance");
const read = (path: string): Json => JSON.parse(readFileSync(path, "utf8"));

const manifest = corpus.loadManifest() as Json & {
	cases: {
		id: string;
		path: string;
		digest: string;
		expectedDigest: string;
		family: string;
		class: string;
	}[];
	bases: { id: string; path: string; digest: string }[];
	constructRegister: {
		id: string;
		family: string;
		sources: string[];
		decidedBy: string;
		criterionQuote?: string;
		notApplicable?: { class: string }[];
	}[];
	unmetAreas: { id: string; owningIssues: string[] }[];
	corpusVersion: string;
	corpusDigest: string;
	predecessor: { state: string; ref: string; rationale: string };
	minimizationBudget: number;
	caseIdPattern: string;
	familyPrefixes: Record<string, string>;
};
const cases = manifest.cases.map((row) => read(join(REPO, row.path)));
const registry = read(join(CONF, "adapters", "registry.json"));
const thresholds = read(join(CONF, "thresholds.json"));
const codes = read(join(CONF, "diagnostic-codes.json"));
const defects = read(join(CONF, "defects.json"));
const mutations = read(join(CONF, "mutations.json"));

const gateFailures = corpus.corpusGates() as {
	gate: string;
	subject: string;
	message: string;
}[];

const digestOf = (id: string) =>
	manifest.cases.find((row) => row.id === id)?.digest as string;

function conforming(entry: Json) {
	const verdict = corpus.oracleVerdict(entry) as Json;
	return {
		adapter: "stub-conforming",
		adapterVersion: "1.0.0",
		caseId: entry.id as string,
		caseDigest: digestOf(entry.id as string),
		support: "supported",
		resultState: verdict.resultState,
		diagnostics: verdict.diagnostics,
		classification: verdict.classification,
		normalized: verdict.normalized,
	};
}

const conformingResults = (adapter: string) =>
	cases.map((entry) => ({ ...conforming(entry), adapter }));

/**
 * Runs the real FR-035 gate set with one case swapped for a mutated copy, so a
 * negative test exercises the gate rather than restating its own input.
 */
const gatesWithCase = (id: string, mutate: (entry: Json) => void) => {
	const seeded = corpus.loadCase(id) as Json;
	mutate(seeded);
	return corpus.corpusGates({
		readCase: (row: { id: string; path: string }) =>
			row.id === id ? seeded : read(join(REPO, row.path)),
	}) as { gate: string; subject: string; message: string }[];
};

/**
 * Files this change created, in its first and last file-adding commits. Both
 * ends of the range come from these, so neither moves when the trunk does.
 */
const CHANGE_SENTINELS = [
	"spec/functional/FR-035-define-the-conformance-corpus.md",
	"conformance/corpus.json",
];

/**
 * Every path this issue changed, with both ends resolved from history.
 *
 * `origin/main...HEAD` is the wrong range for an isolation gate: after a squash
 * merge it is empty, so a positive claim about it fails forever and a negative
 * one silently stops asserting. Issue #27 met that in PR #44, issue #19 in
 * PR #50, and this file carried it too until it was repaired here.
 *
 * The base is `changeRange`'s, the encoding 3ddc04b settled on: the parent of
 * the earliest commit that added a sentinel this change created. The far end is
 * where this gate differs from `changedPathsOf`, deliberately. That helper takes
 * a tree diff `base..tip`, which is exact for a branch whose history is linear
 * over the trunk; this branch merged `origin/main` three times, so a tree diff
 * annexes the trunk — measured here at 456 paths, 74 of them the trunk's, against
 * a true change set of 182. The union of this branch's own first-parent,
 * non-merge commits is 202 paths, every one inside the NFR-016 permitted set;
 * the 20 beyond the final diff are files this ticket created and later renamed,
 * which it did touch. Nothing here reads a moving ref.
 *
 * The far end is `tip`, not `HEAD`. Bounding it at `HEAD` was this file's own
 * instance of the open-ended-range defect, and the third rehearsal state caught
 * it: with an unrelated sibling change squashed on top, `src/sibling/marker.mjs`
 * and a `docs/` edit were attributed to this ticket and TC-640 and TC-643 failed
 * for another ticket's work — the same shape that took issue #19's gate red for
 * this one's.
 */
const corpusChangedPaths = (): string[] => {
	const { base, tip } = changeRange(REPO, CHANGE_SENTINELS);
	const committed = execFileSync(
		"git",
		[
			"log",
			"--first-parent",
			"--no-merges",
			"--format=",
			"--name-only",
			`${base}..${tip}`,
		],
		{ cwd: REPO, encoding: "utf8" },
	)
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line.length > 0);
	return [...new Set(committed)].sort();
};

/** The predecessor declaration a merged corpus carries (FR-035). */
const predecessorRequired = {
	state: "required",
	ref: "origin/main:conformance/corpus.json",
	rationale: "seeded by the versioning assertions",
};

/** Runs the gate set against a mutated manifest. */
const gatesWithManifest = (mutate: (value: Json) => void) => {
	const seeded = corpus.loadManifest() as Json;
	mutate(seeded);
	return corpus.corpusGates({ manifest: seeded }) as {
		gate: string;
		subject: string;
		message: string;
	}[];
};

describe("TC-280..289 the corpus format, provenance, and digests (FR-035)", () => {
	it("TC-280 every case, base, and the manifest validate against the conformance schemas", () => {
		expect(
			validateConformance("corpus-manifest.schema.json", manifest),
		).toEqual([]);
		for (const entry of cases) {
			expect(
				validateConformance("corpus-case.schema.json", entry),
				`case ${String(entry.id)}`,
			).toEqual([]);
		}
		for (const base of manifest.bases) {
			expect(
				validateConformance(
					"input-bundle.schema.json",
					read(join(REPO, base.path)),
				),
				`base ${base.id}`,
			).toEqual([]);
		}
	});

	it("TC-281 every base validates against the published schemas and yields no oracle diagnostic", () => {
		for (const base of manifest.bases) {
			const bundle = read(join(REPO, base.path));
			expect(schemaDiagnostics(bundle), `base ${base.id}`).toEqual([]);
			expect(
				(oracle.verdict(bundle, []) as { diagnostics: unknown[] }).diagnostics,
				`base ${base.id}`,
			).toEqual([]);
		}
	});

	it("TC-282 every derivedFrom artifact exists and its quote occurs verbatim", () => {
		for (const entry of cases) {
			for (const source of entry.derivedFrom as {
				artifact: string;
				quote: string;
			}[]) {
				const text = readFileSync(join(REPO, source.artifact), "utf8");
				expect(
					text.includes(source.quote),
					`${String(entry.id)} → ${source.artifact}`,
				).toBe(true);
			}
		}
	});

	it("TC-282 a quote that no longer occurs fails the provenance gate", () => {
		const failures = gatesWithCase("ENV-001", (entry) => {
			(entry.derivedFrom as { quote: string }[])[0].quote =
				"a phrase no contract artifact carries";
		});
		expect(failures.some((one) => one.gate === "provenance")).toBe(true);
		expect(failures.find((one) => one.gate === "provenance")?.subject).toBe(
			"ENV-001",
		);
	});

	it("TC-282 a quote taken from outside the declared contract artifacts fails", () => {
		const failures = gatesWithCase("ENV-001", (entry) => {
			(entry.derivedFrom as Json[])[0] = {
				artifact: "package.json",
				locator: "name",
				quote: "@agent-ix/filament-core-data",
			};
		});
		expect(
			failures.some(
				(one) =>
					one.gate === "provenance" &&
					one.message.includes("not a declared contract artifact"),
			),
		).toBe(true);
	});

	it("TC-283 every digest and the corpus digest recompute from disk", () => {
		const computed = corpus.computeDigests() as {
			bases: { id: string; digest: string }[];
			cases: { id: string; digest: string }[];
			corpusVersion: string;
			corpusDigest: string;
		};
		expect(computed.corpusDigest).toBe(manifest.corpusDigest);
		expect(computed.cases.map((row) => [row.id, row.digest])).toEqual(
			manifest.cases.map((row) => [row.id, row.digest]),
		);
		expect(computed.bases.map((row) => [row.id, row.digest])).toEqual(
			manifest.bases.map((row) => [row.id, row.digest]),
		);
	});

	it("TC-283 a case digest that no longer matches the file fails the gate and names it", () => {
		const failures = gatesWithManifest((seeded) => {
			(seeded.cases as { digest: string }[])[0].digest =
				`sha256:${"0".repeat(64)}`;
		});
		const digestFailure = failures.find((one) => one.gate === "digest");
		expect(digestFailure).toBeDefined();
		expect(digestFailure?.subject).toBe(manifest.cases[0].id);
		expect(
			failures.some((one) => one.gate === "corpus-digest"),
			"a changed case digest also changes the corpus digest",
		).toBe(true);
	});

	it("TC-283 a base file absent from the manifest fails the base-index gate", () => {
		const failures = gatesWithManifest((seeded) => {
			(seeded.bases as unknown[]).shift();
		});
		expect(failures.some((one) => one.gate === "base-index")).toBe(true);
	});

	it("TC-284 no case is blessed from a run", () => {
		for (const entry of cases) {
			expect((entry.provenance as Json).blessedFromRun, String(entry.id)).toBe(
				false,
			);
		}
	});

	it("TC-284 a blessed case with no blessing block fails the gate", () => {
		const failures = gatesWithCase("ENV-001", (entry) => {
			(entry.provenance as Json).blessedFromRun = true;
		});
		expect(failures.some((one) => one.gate === "blessing")).toBe(true);
		expect(failures.find((one) => one.gate === "blessing")?.subject).toBe(
			"ENV-001",
		);
	});

	it("TC-285 no case exceeds the minimization budget", () => {
		for (const entry of cases) {
			expect(countNodes(entry.ops), String(entry.id)).toBeLessThanOrEqual(
				manifest.minimizationBudget,
			);
		}
	});

	it("TC-285 the depth boundary case stays inside the budget using x-repeat", () => {
		const deep = cases.find((entry) => entry.id === "REC-005") as Json;
		expect(
			(deep.ops as { op: string }[]).some((op) => op.op === "x-repeat"),
		).toBe(true);
		expect(countNodes(deep.ops)).toBeLessThanOrEqual(
			manifest.minimizationBudget,
		);
	});

	it("TC-286 every indexed replace or remove carries a preceding test op", () => {
		const indexed = /\/\d+(\/|$)/;
		for (const entry of cases) {
			const ops = entry.ops as { op: string; path: string }[];
			for (const [index, op] of ops.entries()) {
				if (
					(op.op === "replace" || op.op === "remove") &&
					indexed.test(op.path)
				) {
					const before = ops[index - 1];
					expect(before?.op, `${String(entry.id)} ops[${index}]`).toBe("test");
					expect(
						before.path === op.path || before.path.startsWith(`${op.path}/`),
						`${String(entry.id)} ops[${index}]`,
					).toBe(true);
				}
			}
		}
	});

	it("TC-286 a test op that no longer matches its base fails the build", () => {
		const entry = cases.find((one) =>
			(one.ops as { op: string }[]).some((op) => op.op === "test"),
		) as Json;
		const ops = structuredClone(entry.ops) as { op: string; value: unknown }[];
		const test = ops.find((op) => op.op === "test") as { value: unknown };
		test.value = "a value the base does not carry";
		expect(() =>
			applyPatch(corpus.loadBase(entry.base as string), ops),
		).toThrow(/test failed/);
	});

	it("TC-287 every defect register row that names a case finds it", () => {
		for (const defect of defects.defects as {
			id: string;
			reproducingCase?: string;
		}[]) {
			if (!defect.reproducingCase) continue;
			expect(
				manifest.cases.some((row) => row.id === defect.reproducingCase),
				defect.id,
			).toBe(true);
		}
	});

	it("TC-288 a malformed expected diagnostic fails the diagnostic-shape gate", () => {
		const negative = cases.find(
			(entry) => ((entry.expected as Json).diagnostics as unknown[]).length > 0,
		) as Json;
		const failures = gatesWithCase(negative.id as string, (entry) => {
			delete (
				((entry.expected as Json).diagnostics as { diagnostic: Json }[])[0]
					.diagnostic as Json
			).owner;
		});
		expect(failures.some((one) => one.gate === "diagnostic-shape")).toBe(true);
	});

	it("TC-288 an expected pointer that addresses no node fails the pointer gate", () => {
		const negative = cases.find(
			(entry) => ((entry.expected as Json).diagnostics as unknown[]).length > 0,
		) as Json;
		const failures = gatesWithCase(negative.id as string, (entry) => {
			(
				(entry.expected as Json).diagnostics as { pointer: string }[]
			)[0].pointer = "/ir/types/9999/absent";
		});
		expect(failures.some((one) => one.gate === "pointer")).toBe(true);
	});

	it("TC-289 case ids are unique, patterned, prefixed, and in their family directory", () => {
		const pattern = new RegExp(manifest.caseIdPattern);
		const seen = new Set<string>();
		for (const row of manifest.cases) {
			const entry = read(join(REPO, row.path));
			expect(pattern.test(entry.id as string), String(entry.id)).toBe(true);
			expect(seen.has(entry.id as string), String(entry.id)).toBe(false);
			seen.add(entry.id as string);
			expect(entry.id as string).toMatch(
				new RegExp(`^${manifest.familyPrefixes[entry.family as string]}-`),
			);
			expect(row.path).toContain(`/cases/${String(entry.family)}/`);
		}
	});

	it("the whole FR-035 gate set passes on the committed corpus", () => {
		expect(gateFailures).toEqual([]);
	});
});

describe("TC-290..301 the oracle (FR-036)", () => {
	it("TC-290 the oracle's verdict equals every case's authored expectation", () => {
		for (const entry of cases) {
			const verdict = corpus.oracleVerdict(entry);
			expect(corpus.substantive(verdict, entry.kind), String(entry.id)).toEqual(
				corpus.substantive(entry.expected, entry.kind),
			);
		}
	});

	it("TC-291 two oracle runs over the corpus are byte-identical", () => {
		const once = cases.map((entry) => canonical(corpus.oracleVerdict(entry)));
		const twice = cases.map((entry) => canonical(corpus.oracleVerdict(entry)));
		expect(twice).toEqual(once);
	});

	it("TC-291 the diagnostic order is unchanged under a Turkish locale", () => {
		// Node resolves its ICU locale at startup, so this has to run out of
		// process: an in-process assignment could not change any comparison.
		const script = `
			import { loadCorpus, oracleVerdict, textDigest } from ${JSON.stringify(join(CONF, "corpus.mjs"))};
			import { canonical } from ${JSON.stringify(join(CONF, "oracle", "json.mjs"))};
			const { cases } = loadCorpus();
			process.stdout.write(textDigest(canonical(cases.map(oracleVerdict))));
		`;
		const under = (locale: string) =>
			execFileSync("node", ["--input-type=module", "-e", script], {
				cwd: REPO,
				encoding: "utf8",
				env: { ...process.env, LC_ALL: locale, LANG: locale },
			});
		expect(under("tr_TR.UTF-8")).toBe(under("C"));
	});

	it("TC-292 a self-referential and a mutual alias each yield ALIAS_CYCLE, not a depth error", () => {
		for (const id of ["REC-002", "REC-003"]) {
			const verdict = corpus.oracleVerdict(corpus.loadCase(id)) as {
				diagnostics: { diagnostic: { code: string } }[];
			};
			expect(verdict.diagnostics.length, id).toBeGreaterThan(0);
			for (const entry of verdict.diagnostics) {
				expect(entry.diagnostic.code, id).toBe(
					"agent-ix.semantic-ir.ALIAS_CYCLE",
				);
			}
		}
	});

	it("TC-292 an acyclic chain past the declared depth yields DEPTH_LIMIT_EXCEEDED", () => {
		const verdict = corpus.oracleVerdict(corpus.loadCase("REC-005")) as {
			diagnostics: { diagnostic: { code: string } }[];
		};
		expect(verdict.diagnostics.length).toBeGreaterThan(0);
		for (const entry of verdict.diagnostics) {
			expect(entry.diagnostic.code).toBe(
				"agent-ix.semantic-ir.DEPTH_LIMIT_EXCEEDED",
			);
		}
	});

	it("TC-292 an acyclic chain at the declared depth still resolves", () => {
		const verdict = corpus.oracleVerdict(corpus.loadCase("ALIAS-003")) as {
			resultState: string;
		};
		expect(verdict.resultState).toBe("success");
	});

	it("TC-293 five resolution failures carry five distinct codes", () => {
		const observed = new Map<string, string>();
		for (const id of [
			"IDENT-002",
			"REC-002",
			"IDENT-005",
			"UNION-002",
			"SEQMAP-002",
		]) {
			const verdict = corpus.oracleVerdict(corpus.loadCase(id)) as {
				diagnostics: { diagnostic: { code: string } }[];
			};
			observed.set(id, verdict.diagnostics[0].diagnostic.code);
		}
		expect(new Set(observed.values()).size).toBe(5);
	});

	it("TC-294 the oracle imports no judged implementation and reads no clock", () => {
		const forbidden =
			/from\s+"(\.\.\/)*(\.\.\/)*(spikes|src|test|tests|conformance\/adapters)\//;
		const effects =
			/\bDate\.now\b|\bnew Date\b|\bprocess\.env\b|\bfetch\(|node:https?\b/;
		for (const file of readdirSync(join(CONF, "oracle"))) {
			if (!file.endsWith(".mjs")) continue;
			const text = readFileSync(join(CONF, "oracle", file), "utf8");
			expect(forbidden.test(text), file).toBe(false);
			expect(effects.test(text), file).toBe(false);
		}
		const runner = readFileSync(
			join(CONF, "runner", "differential.mjs"),
			"utf8",
		);
		expect(effects.test(runner)).toBe(false);
	});

	it("TC-294 the oracle adds no dependency beyond the pinned validator", () => {
		const pkg = read(join(REPO, "package.json")) as {
			dependencies?: Json;
			devDependencies: Json;
		};
		expect(pkg.dependencies).toBeUndefined();
		const imports = new Set<string>();
		for (const file of readdirSync(join(CONF, "oracle"))) {
			if (!file.endsWith(".mjs")) continue;
			for (const match of readFileSync(
				join(CONF, "oracle", file),
				"utf8",
			).matchAll(/from\s+"([^".][^"]*)"/g)) {
				if (!match[1].startsWith("."))
					imports.add(match[1].split("/")[0].replace(/^node:.*/, "node"));
			}
		}
		for (const name of imports) {
			if (name === "node") continue;
			expect(Object.keys(pkg.devDependencies), name).toContain(name);
		}
	});

	it("TC-295 a 1.0.0 document's normalized form adds no member", () => {
		for (const entry of cases) {
			if (entry.contractVersion !== "1.0.0") continue;
			const bundle = corpus.buildInput(entry) as { ir: Json };
			expect(oracle.normalize(bundle.ir), String(entry.id)).toBe(
				canonical(bundle.ir),
			);
		}
	});

	it("TC-296 an optional plus a required addition classifies breaking and names both", () => {
		const verdict = corpus.oracleVerdict(corpus.loadCase("COMP-003")) as {
			classification: string;
			changes: { message: string }[];
		};
		expect(verdict.classification).toBe("breaking");
		expect(
			verdict.changes.some((change) =>
				change.message.includes("optional field"),
			),
		).toBe(true);
		expect(
			verdict.changes.some((change) =>
				change.message.includes("required field"),
			),
		).toBe(true);
	});

	it("TC-296 the same optional addition is additive under a preserving policy and conditional without one", () => {
		expect(
			(
				corpus.oracleVerdict(corpus.loadCase("COMP-004")) as {
					classification: string;
				}
			).classification,
		).toBe("additive");
		expect(
			(
				corpus.oracleVerdict(corpus.loadCase("COMP-005")) as {
					classification: string;
				}
			).classification,
		).toBe("conditional");
	});

	it("TC-297 every diagnostic the oracle emits validates against the published definition", () => {
		const DIAGNOSTIC =
			"https://schemas.agent-ix.org/filament-core-data/v1/common.schema.json#/$defs/diagnostic";
		const errors = (value: unknown) =>
			(validateAgainst(DIAGNOSTIC, value) as unknown[]).length;
		// The validator really does reject a malformed diagnostic.
		expect(errors({ code: "nope" })).toBeGreaterThan(0);
		for (const entry of cases) {
			for (const one of (
				corpus.oracleVerdict(entry) as { diagnostics: { diagnostic: Json }[] }
			).diagnostics) {
				expect(errors(one.diagnostic), String(entry.id)).toBe(0);
			}
		}
		// Including a diagnostic for an input no corpus case carries.
		for (const value of [null, 42, [], {}]) {
			for (const one of (
				oracle.verdict(value, []) as { diagnostics: { diagnostic: Json }[] }
			).diagnostics) {
				expect(errors(one.diagnostic)).toBe(0);
			}
		}
	});

	it("TC-298 each package-context rule fires with its bundle member and is silent without it", () => {
		const expected: Record<string, string> = {
			"PKG-002": "agent-ix.semantic-ir.UNRESOLVED_IMPORT",
			"PKG-005": "agent-ix.semantic-ir.PACKAGE_CYCLE",
			"PKG-006": "agent-ix.semantic-ir.STALE_LOCK",
			"PKG-007": "agent-ix.semantic-ir.UNKNOWN_MAPPING_TARGET",
			"PKG-008": "agent-ix.semantic-ir.UNDECLARED_LOSS",
			"EXT-002": "agent-ix.semantic-ir.UNKNOWN_REQUIRED_EXTENSION",
		};
		for (const [id, code] of Object.entries(expected)) {
			const verdict = corpus.oracleVerdict(corpus.loadCase(id)) as {
				diagnostics: { diagnostic: { code: string } }[];
			};
			expect(
				verdict.diagnostics.map((one) => one.diagnostic.code),
				id,
			).toEqual([code]);
		}
		// The same rules stay silent on a document-only bundle.
		const documentOnly = corpus.loadBase("core-1-1");
		expect(
			(oracle.verdict(documentOnly, []) as { diagnostics: unknown[] })
				.diagnostics,
		).toEqual([]);
	});

	it("TC-299 a schema-decided case yields one diagnostic at the deepest failing location", () => {
		for (const entry of cases) {
			if (entry.decidedBy !== "schema" || entry.class !== "negative") continue;
			const rows = schemaDiagnostics(corpus.buildInput(entry)) as {
				pointer: string;
			}[];
			expect(rows.length, String(entry.id)).toBe(1);
			expect(rows[0].pointer, String(entry.id)).toBe(
				((entry.expected as Json).diagnostics as { pointer: string }[])[0]
					.pointer,
			);
		}
	});

	it("TC-300 every emitted code is registered and the frozen codes are reused verbatim", () => {
		const registered = new Set(
			(codes.codes as { code: string }[]).map((row) => row.code),
		);
		const exercised = new Set<string>();
		for (const entry of cases) {
			for (const one of (
				corpus.oracleVerdict(entry) as {
					diagnostics: { diagnostic: { code: string } }[];
				}
			).diagnostics) {
				expect(registered.has(one.diagnostic.code), one.diagnostic.code).toBe(
					true,
				);
				exercised.add(one.diagnostic.code);
			}
		}
		for (const row of codes.codes as { code: string; exercisedBy: string }[]) {
			if (row.exercisedBy === "case") {
				expect(exercised.has(row.code), row.code).toBe(true);
			}
		}
		const frozen = new Set(
			(
				read(
					join(REPO, "fixtures/semantic/v1/negative/reader-cases.json"),
				) as unknown as {
					code: string;
				}[]
			).map((row) => row.code),
		);
		for (const code of frozen) {
			expect(registered.has(code), code).toBe(true);
		}
		expect(
			(codes.codes as { provenance: string }[]).filter(
				(row) => row.provenance === "frozen",
			).length,
		).toBe(frozen.size);
	});

	it("TC-300 every registered code cites a clause that occurs in its artifact", () => {
		for (const row of codes.codes as {
			code: string;
			sources: string[];
			citation: string;
		}[]) {
			const found = row.sources.some((artifact) =>
				readFileSync(join(REPO, artifact), "utf8").includes(row.citation),
			);
			expect(found, row.code).toBe(true);
		}
	});

	it("TC-301 a value that is not an input bundle yields one INVALID_DOCUMENT at the root", () => {
		for (const value of [null, 42, "text", [], {}]) {
			const verdict = oracle.verdict(value, []) as {
				resultState: string;
				diagnostics: { pointer: string; diagnostic: { code: string } }[];
			};
			expect(verdict.resultState).toBe("invalid");
			expect(verdict.diagnostics.length).toBe(1);
			expect(verdict.diagnostics[0].diagnostic.code).toBe(
				"agent-ix.semantic-ir.INVALID_DOCUMENT",
			);
			expect(verdict.diagnostics[0].pointer).toBe("");
		}
	});
});

describe("TC-302..313 the differential harness (FR-037)", () => {
	it("TC-302 the harness exits zero on the committed corpus, registry, and register", () => {
		const report = run() as { exitCode: number; problems: unknown[] };
		expect(report.problems).toEqual([]);
		expect(report.exitCode).toBe(0);
	});

	it("TC-302 a conforming stub adapter matches every case", () => {
		const report = run({
			adapterResults: {
				"typescript-backend": conformingResults("typescript-backend"),
			},
		}) as {
			problems: unknown[];
			adapters: { adapter: string; matched: number }[];
		};
		expect(report.problems).toEqual([]);
		expect(
			report.adapters.find((row) => row.adapter === "typescript-backend")
				?.matched,
		).toBe(cases.length);
	});

	const seeded = (mutate: (result: Json) => void) => {
		const results = conformingResults("typescript-backend");
		const target = results.find(
			(one) => (one.diagnostics as unknown[]).length > 0,
		) as Json;
		mutate(target);
		return run({ adapterResults: { "typescript-backend": results } }) as {
			exitCode: number;
			divergences: { case: string; adapter: string; pointer: string }[];
		};
	};

	it("TC-303 an extra diagnostic fails and names the case, the adapter, and a locus", () => {
		const report = seeded((result) => {
			(result.diagnostics as unknown[]).push(
				structuredClone((result.diagnostics as unknown[])[0]),
			);
		});
		expect(report.exitCode).toBe(1);
		// The seeded diagnostic is on typescript-backend, but the report carries
		// every adapter's divergences and orders them by adapter; the assertion
		// names the seeded one rather than whichever sorts first.
		const seededRow = report.divergences.find(
			(row) => row.adapter === "typescript-backend",
		);
		expect(seededRow, "the report names the seeded adapter").toBeDefined();
		expect(seededRow?.case).toMatch(/^[A-Z]/);
	});

	it("TC-303 a missing diagnostic fails", () => {
		expect(
			seeded((result) => {
				(result.diagnostics as unknown[]).pop();
			}).exitCode,
		).toBe(1);
	});

	it("TC-303 a reordered diagnostic list fails", () => {
		// The single-violation gate holds every negative case to one diagnostic,
		// so the reorder is seeded on a boundary case that carries several.
		const multi = cases.find(
			(entry) => ((entry.expected as Json).diagnostics as unknown[]).length > 1,
		) as Json;
		expect(
			multi,
			"the corpus carries a case with more than one diagnostic",
		).toBeDefined();
		const results = conformingResults("typescript-backend");
		const target = results.find((one) => one.caseId === multi.id) as Json;
		target.diagnostics = [...(target.diagnostics as unknown[])].reverse();
		const report = run({
			adapterResults: { "typescript-backend": results },
		}) as { exitCode: number; divergences: { case: string }[] };
		expect(report.exitCode).toBe(1);
		expect(report.divergences.some((one) => one.case === multi.id)).toBe(true);
	});

	it("TC-303 a repointed diagnostic fails", () => {
		expect(
			seeded((result) => {
				((result.diagnostics as Json[])[0] as Json).pointer = "/ir";
			}).exitCode,
		).toBe(1);
	});

	it("TC-303 a relocated diagnostic fails", () => {
		expect(
			seeded((result) => {
				const first = (result.diagnostics as Json[])[0];
				(first.diagnostic as Json).locus = {
					sourceIdentity: "ix://agent-ix/filament-core-data/source/typespec",
					path: "model/elsewhere.tsp",
					startLine: 99,
					startColumn: 1,
				};
			}).exitCode,
		).toBe(1);
	});

	it("TC-303 a reclassified compatibility answer fails", () => {
		const results = conformingResults("typescript-backend");
		const target = results.find(
			(one) =>
				(cases.find((entry) => entry.id === one.caseId) as Json).kind ===
					"compatibility" && one.classification !== "patch",
		) as Json;
		expect(target).toBeDefined();
		target.classification = "patch";
		const report = run({
			adapterResults: { "typescript-backend": results },
		}) as {
			exitCode: number;
		};
		expect(report.exitCode).toBe(1);
	});

	it("TC-303 a changed normalized document fails", () => {
		const results = conformingResults("typescript-backend");
		(results[0] as Json).normalized = "{}";
		expect(
			(
				run({ adapterResults: { "typescript-backend": results } }) as {
					exitCode: number;
				}
			).exitCode,
		).toBe(1);
	});

	it("TC-304 two stubs that agree with each other but not the oracle both fail", () => {
		const wrong = (adapter: string) => {
			const results = conformingResults(adapter);
			for (const result of results) {
				if ((result.diagnostics as unknown[]).length > 0) {
					((result.diagnostics as Json[])[0].diagnostic as Json).code =
						"agent-ix.semantic-ir.UNRESOLVED_TYPE_REF";
				}
			}
			return results;
		};
		const report = run({
			adapterResults: {
				"typescript-backend": wrong("typescript-backend"),
				"python-backend": wrong("python-backend"),
			},
		}) as { adapters: { adapter: string; failed: number }[]; exitCode: number };
		expect(report.exitCode).toBe(1);
		for (const adapter of ["typescript-backend", "python-backend"]) {
			expect(
				report.adapters.find((row) => row.adapter === adapter)?.failed,
				adapter,
			).toBeGreaterThan(0);
		}
	});

	it("TC-304 the harness source contains no adapter-to-adapter comparison", () => {
		const text = readFileSync(join(CONF, "runner", "differential.mjs"), "utf8");
		expect(text).toContain("compare(entry, result");
		expect(text).not.toMatch(/adapterResults\[[^\]]*\]\s*(===|!==)/);
		expect((text.match(/\bcompare\(/g) ?? []).length).toBe(1);
	});

	it("TC-305 every unavailable adapter is an unmet row with its owning issue and no pass", () => {
		const report = run() as {
			adapters: { adapter: string; matched: number; unmet: number }[];
			unmet: { adapter: string; owningIssue: string }[];
		};
		for (const adapter of registry.adapters as {
			id: string;
			status: string;
			owningIssue: string;
		}[]) {
			if (adapter.status !== "unavailable") continue;
			const row = report.adapters.find((one) => one.adapter === adapter.id);
			expect(row?.matched, adapter.id).toBe(0);
			expect(row?.unmet, adapter.id).toBe(cases.length);
			expect(
				report.unmet.some(
					(one) =>
						one.adapter === adapter.id &&
						one.owningIssue === adapter.owningIssue,
				),
				adapter.id,
			).toBe(true);
		}
	});

	it("TC-305 an available adapter answering unavailable fails", () => {
		const results = conformingResults("typescript-backend").map((result) => ({
			adapter: result.adapter,
			adapterVersion: result.adapterVersion,
			caseId: result.caseId,
			caseDigest: result.caseDigest,
			support: "unavailable",
		}));
		// The synthetic unavailable slot accepts this response; the checked
		// available configuration below must reject it regardless of the live
		// registry state as backend tickets land.
		const unavailable = structuredClone(registry) as {
			adapters: { id: string; status: string }[];
		};
		for (const adapter of unavailable.adapters) {
			if (adapter.id === "typescript-backend") adapter.status = "unavailable";
		}
		expect(
			(
				run({
					registry: unavailable,
					adapterResults: { "typescript-backend": results },
				}) as {
					problems: unknown[];
				}
			).problems,
		).toEqual([]);
		// The corresponding available slot makes every one of them a failure.
		const available = structuredClone(registry) as {
			adapters: { id: string; status: string }[];
		};
		for (const adapter of available.adapters) {
			if (adapter.id === "typescript-backend") adapter.status = "available";
		}
		const report = run({
			registry: available,
			adapterResults: { "typescript-backend": results },
		}) as { exitCode: number; problems: { kind: string; message: string }[] };
		expect(report.exitCode).toBe(1);
		expect(
			report.problems.some(
				(one) =>
					one.kind === "unavailable" &&
					one.message.includes("an available adapter answered unavailable"),
			),
		).toBe(true);
	});

	it("TC-306 a registered divergence that no run reproduces fails", () => {
		const registerPath = join(CONF, "divergences.json");
		const original = readFileSync(registerPath, "utf8");
		try {
			execFileSync("node", [
				"-e",
				`const fs=require('fs');const p=${JSON.stringify(registerPath)};const d=JSON.parse(fs.readFileSync(p,'utf8'));d.divergences.push({id:'DIV-TEST',case:'ENV-001',adapter:'typescript-backend',code:'agent-ix.semantic-ir.SCHEMA_VIOLATION',owner:'test',owningIssue:'agent-ix/filament-core-data#20',severity:'low',verdict:'corpus-defect',rationale:'seeded by TC-306',reviewBy:'2099-01-01'});fs.writeFileSync(p, JSON.stringify(d,null,'\\t')+'\\n');`,
			]);
			const report = run() as { problems: { kind: string }[] };
			expect(
				report.problems.some((one) => one.kind === "unreproduced-divergence"),
			).toBe(true);
		} finally {
			execFileSync("node", [
				"-e",
				`require('fs').writeFileSync(${JSON.stringify(registerPath)}, ${JSON.stringify(original)});`,
			]);
		}
	});

	it("TC-306 the audit target reports an entry whose review date has passed", () => {
		const registerPath = join(CONF, "divergences.json");
		const original = readFileSync(registerPath, "utf8");
		try {
			execFileSync("node", [
				"-e",
				`const fs=require('fs');const p=${JSON.stringify(registerPath)};const d=JSON.parse(fs.readFileSync(p,'utf8'));d.divergences.push({id:'DIV-OLD',case:'ENV-001',adapter:'typescript-backend',code:'x',owner:'test',owningIssue:'agent-ix/filament-core-data#20',severity:'low',verdict:'contract-gap',rationale:'seeded by TC-306',reviewBy:'2000-01-01'});fs.writeFileSync(p, JSON.stringify(d,null,'\\t')+'\\n');`,
			]);
			let failed = false;
			let output = "";
			try {
				output = execFileSync("node", [join(CONF, "tools", "audit.mjs")], {
					encoding: "utf8",
				});
			} catch (error) {
				failed = true;
				output = String((error as { stdout?: string }).stdout ?? "");
			}
			expect(failed).toBe(true);
			expect(output).toContain("DIV-OLD");
		} finally {
			execFileSync("node", [
				"-e",
				`require('fs').writeFileSync(${JSON.stringify(registerPath)}, ${JSON.stringify(original)});`,
			]);
		}
	});

	it("TC-307 two harness runs produce byte-identical reports", () => {
		const once = canonical(run());
		const twice = canonical(run());
		expect(twice).toBe(once);
	});

	it("TC-307 the harness reads no clock", () => {
		const text = readFileSync(join(CONF, "runner", "differential.mjs"), "utf8");
		expect(/Date\.now|new Date|hrtime|performance\.now/.test(text)).toBe(false);
	});

	it("TC-308 an adapter emitting a result that fails its schema fails per case", () => {
		const results = conformingResults("typescript-backend") as Json[];
		delete (results[0] as Json).normalized;
		const report = run({
			adapterResults: { "typescript-backend": results },
		}) as {
			exitCode: number;
			problems: { kind: string }[];
		};
		expect(report.exitCode).toBe(1);
		expect(report.problems.some((one) => one.kind === "adapter-result")).toBe(
			true,
		);
	});

	it("TC-308 an adapter omitting a case fails rather than skipping it", () => {
		const results = conformingResults("typescript-backend").slice(1);
		const report = run({
			adapterResults: { "typescript-backend": results },
		}) as {
			exitCode: number;
			problems: { kind: string }[];
		};
		expect(report.exitCode).toBe(1);
		expect(report.problems.some((one) => one.kind === "missing-answer")).toBe(
			true,
		);
	});

	it("TC-309 an undeclared unsupported answer fails", () => {
		const results = conformingResults("typescript-backend").map(
			(result, index) =>
				index === 0
					? {
							adapter: result.adapter,
							adapterVersion: result.adapterVersion,
							caseId: result.caseId,
							caseDigest: result.caseDigest,
							support: "unsupported",
						}
					: result,
		);
		const report = run({
			adapterResults: { "typescript-backend": results },
		}) as {
			exitCode: number;
			problems: { kind: string }[];
		};
		expect(report.exitCode).toBe(1);
		expect(report.problems.some((one) => one.kind === "unsupported")).toBe(
			true,
		);
	});

	it("TC-309 a declared unsupported answer is an unmet row, not a pass", () => {
		const declared = cases.find(
			(entry) => (entry.unsupportedBy as unknown[] | undefined)?.length,
		) as Json;
		expect(
			declared,
			"a case declares an adapter in unsupportedBy",
		).toBeDefined();
		const adapter = (declared.unsupportedBy as { adapter: string }[])[0]
			.adapter;
		const results = conformingResults(adapter).map((result) =>
			result.caseId === declared.id
				? {
						adapter: result.adapter,
						adapterVersion: result.adapterVersion,
						caseId: result.caseId,
						caseDigest: result.caseDigest,
						support: "unsupported",
					}
				: result,
		);
		const report = run({ adapterResults: { [adapter]: results } }) as {
			problems: unknown[];
			unmet: { adapter: string; case: string }[];
			adapters: { adapter: string; matched: number; unmet: number }[];
		};
		expect(report.problems).toEqual([]);
		expect(
			report.unmet.some(
				(one) => one.adapter === adapter && one.case === declared.id,
			),
		).toBe(true);
		const row = report.adapters.find((one) => one.adapter === adapter);
		expect(row?.unmet).toBe(1);
		expect(row?.matched).toBe(cases.length - 1);
	});

	it("TC-308 an adapter command that exits non-zero fails every case it did not answer", () => {
		const failing = structuredClone(registry) as {
			adapters: { id: string; status: string; command?: string[] }[];
		};
		for (const adapter of failing.adapters) {
			if (adapter.id === "typescript-backend") {
				adapter.status = "available";
				adapter.command = ["node", "-e", "process.exit(3)"];
			}
		}
		const report = run({ registry: failing, skipCorpusGates: true }) as {
			exitCode: number;
			problems: { kind: string; adapter?: string; message: string }[];
		};
		expect(report.exitCode).toBe(1);
		expect(
			report.problems.some(
				(one) =>
					one.kind === "adapter" &&
					one.adapter === "typescript-backend" &&
					one.message.includes("exited non-zero"),
			),
		).toBe(true);
	});

	it("TC-308 an adapter that emits non-JSON, or JSON that is not an array, fails", () => {
		const withCommand = (command: string[]) => {
			const patched = structuredClone(registry) as {
				adapters: { id: string; status: string; command?: string[] }[];
			};
			for (const adapter of patched.adapters) {
				if (adapter.id === "typescript-backend") {
					adapter.status = "available";
					adapter.command = command;
				}
			}
			return run({ registry: patched, skipCorpusGates: true }) as {
				exitCode: number;
				problems: { kind: string; message: string }[];
			};
		};
		const notJson = withCommand([
			"node",
			"-e",
			"process.stdout.write('not json')",
		]);
		expect(notJson.exitCode).toBe(1);
		expect(
			notJson.problems.some((one) => one.message.includes("did not emit JSON")),
		).toBe(true);
		const notArray = withCommand(["node", "-e", "process.stdout.write('{}')"]);
		expect(notArray.exitCode).toBe(1);
		expect(
			notArray.problems.some((one) =>
				one.message.includes("not an array of results"),
			),
		).toBe(true);
	});

	it("TC-310 the harness starts an adapter as a process and imports no adapter internals", () => {
		const text = readFileSync(join(CONF, "runner", "differential.mjs"), "utf8");
		// Matched across whatever line breaks the formatter chooses: the claim is
		// that the command is started as a process, not that it fits on one line.
		expect(text).toMatch(/execFileSync\(\s*adapter\.command\[0\]/);
		expect(text).not.toMatch(/import\([^)]*adapters/);
		expect(text).not.toMatch(/from\s+"\.\.\/adapters\//);
	});

	it("TC-311 an answer whose case digest does not match the manifest is rejected", () => {
		const results = conformingResults("typescript-backend") as Json[];
		results[0].caseDigest = `sha256:${"0".repeat(64)}`;
		const report = run({
			adapterResults: { "typescript-backend": results },
		}) as {
			exitCode: number;
			problems: { kind: string }[];
		};
		expect(report.exitCode).toBe(1);
		expect(report.problems.some((one) => one.kind === "case-digest")).toBe(
			true,
		);
	});

	it("TC-311 an answer for a case the corpus does not declare is rejected", () => {
		const results = conformingResults("typescript-backend") as Json[];
		results.push({ ...structuredClone(results[0]), caseId: "ZZZ-999" });
		const report = run({
			adapterResults: { "typescript-backend": results },
		}) as {
			problems: { kind: string }[];
		};
		expect(report.problems.some((one) => one.kind === "unknown-case")).toBe(
			true,
		);
	});

	it("TC-312 a pointer-incompatible adapter passes on a different pointer and fails on a wrong locus", () => {
		const repointed = conformingResults("rust-backend").map((result) => {
			const copy = structuredClone(result) as Json;
			for (const one of copy.diagnostics as Json[])
				one.pointer = "#/rust/scheme";
			return copy;
		});
		expect(
			(
				run({ adapterResults: { "rust-backend": repointed } }) as {
					problems: unknown[];
				}
			).problems,
		).toEqual([]);
		const relocated = repointed.map((result) => {
			const copy = structuredClone(result) as Json;
			for (const one of copy.diagnostics as Json[]) {
				(one.diagnostic as Json).locus = {
					sourceIdentity: "ix://agent-ix/filament-core-data/source/typespec",
					path: "model/elsewhere.tsp",
					startLine: 99,
					startColumn: 1,
				};
			}
			return copy;
		});
		expect(
			(
				run({ adapterResults: { "rust-backend": relocated } }) as {
					exitCode: number;
				}
			).exitCode,
		).toBe(1);
	});

	it("TC-313 the registry declares the four slots with owning issues and the ownership note", () => {
		const ids = (
			registry.adapters as { id: string; owningIssue: string; status: string }[]
		).map((one) => one.id);
		expect(ids.sort()).toEqual([
			"compiler-frontend",
			"python-backend",
			"rust-backend",
			"typescript-backend",
		]);
		for (const adapter of registry.adapters as {
			owningIssue: string;
			status: string;
			rationale: string;
		}[]) {
			expect(adapter.owningIssue).toMatch(/^agent-ix\/filament-core-data#\d+$/);
			expect(["available", "unavailable"]).toContain(adapter.status);
			expect(adapter.rationale.length).toBeGreaterThan(0);
		}
		expect(String(registry.ownership)).toContain("owning issue");
	});
});

describe("TC-314..319 and TC-622..401 the construct register and the defect registers (FR-038)", () => {
	const coverage = buildCoverage(manifest, cases, [], []) as {
		registerRows: {
			id: string;
			family: string;
			missing: string[];
			met: boolean;
		}[];
	};

	it("TC-314 every register row carries four classes or a justified notApplicable", () => {
		for (const row of coverage.registerRows) {
			expect(row.missing, row.id).toEqual([]);
		}
	});

	it("TC-314 removing a case leaves its row missing that class and named", () => {
		const without = cases.filter(
			(entry) =>
				!(entry.family === "relationship" && entry.class === "negative"),
		);
		const recomputed = buildCoverage(manifest, without, [], []) as {
			registerRows: { family: string; missing: string[] }[];
		};
		const row = recomputed.registerRows.find(
			(one) => one.family === "relationship",
		);
		expect(row?.missing).toContain("negative");
	});

	it("TC-314 a justified notApplicable class is accepted", () => {
		const patched = structuredClone(manifest);
		patched.constructRegister = patched.constructRegister.map((row) =>
			row.family === "relationship"
				? {
						...row,
						notApplicable: [
							{
								class: "negative",
								justification: "seeded by TC-314",
								citation: "spec/tests.md",
							},
						],
					}
				: row,
		);
		const without = cases.filter(
			(entry) =>
				!(entry.family === "relationship" && entry.class === "negative"),
		);
		const recomputed = buildCoverage(patched, without, [], []) as {
			registerRows: { family: string; missing: string[] }[];
		};
		expect(
			recomputed.registerRows.find((one) => one.family === "relationship")
				?.missing,
		).toEqual([]);
	});

	it("TC-315 the six package negatives fail at an exact source or bundle locus", () => {
		for (const id of [
			"PKG-002",
			"PKG-005",
			"PKG-006",
			"PKG-007",
			"PKG-008",
			"IDENT-002",
		]) {
			const verdict = corpus.oracleVerdict(corpus.loadCase(id)) as {
				resultState: string;
				diagnostics: { pointer: string }[];
			};
			expect(verdict.resultState, id).toBe("invalid");
			expect(verdict.diagnostics.length, id).toBe(1);
			expect(verdict.diagnostics[0].pointer, id).toMatch(
				/^\/(ir|lock|manifest|mappings)\//,
			);
		}
	});

	it("TC-316 the four presence and nullability combinations are four distinct normalized forms", () => {
		const forms = new Set<string>();
		for (const id of ["PRES-001", "PRES-005", "PRES-006", "PRES-003"]) {
			forms.add(
				(corpus.oracleVerdict(corpus.loadCase(id)) as { normalized: string })
					.normalized,
			);
		}
		expect(forms.size).toBe(4);
	});

	it("TC-317 recursion is preserved while alias and composite cycles are rejected", () => {
		expect(
			(
				corpus.oracleVerdict(corpus.loadCase("REC-001")) as {
					resultState: string;
				}
			).resultState,
		).toBe("success");
		const alias = corpus.oracleVerdict(corpus.loadCase("REC-002")) as {
			diagnostics: { diagnostic: { code: string } }[];
		};
		const composite = corpus.oracleVerdict(corpus.loadCase("REL-002")) as {
			diagnostics: { diagnostic: { code: string } }[];
		};
		const pkg = corpus.oracleVerdict(corpus.loadCase("PKG-005")) as {
			diagnostics: { diagnostic: { code: string } }[];
		};
		expect(alias.diagnostics[0].diagnostic.code).toBe(
			"agent-ix.semantic-ir.ALIAS_CYCLE",
		);
		expect(composite.diagnostics[0].diagnostic.code).toBe(
			"agent-ix.semantic-ir.COMPOSITE_CYCLE",
		);
		expect(pkg.diagnostics[0].diagnostic.code).toBe(
			"agent-ix.semantic-ir.PACKAGE_CYCLE",
		);
		expect(
			new Set([
				alias.diagnostics[0].diagnostic.code,
				composite.diagnostics[0].diagnostic.code,
				pkg.diagnostics[0].diagnostic.code,
			]).size,
		).toBe(3);
	});

	it("TC-318 every document-expressible defect has a reproducing case and the rest name a static check", () => {
		const ids = new Set(manifest.cases.map((row) => row.id));
		for (const defect of defects.defects as {
			id: string;
			documentExpressible: boolean;
			reproducingCase?: string;
			staticCheck?: string;
		}[]) {
			if (defect.documentExpressible) {
				expect(defect.reproducingCase, defect.id).toBeDefined();
				expect(ids.has(defect.reproducingCase as string), defect.id).toBe(true);
			} else {
				expect(defect.staticCheck, defect.id).toBeDefined();
				expect(
					(defect.staticCheck as string).length,
					defect.id,
				).toBeGreaterThan(0);
			}
		}
		expect((defects.defects as unknown[]).length).toBeGreaterThan(0);
	});

	it("TC-318 every reproducing case names the defect it reproduces", () => {
		for (const defect of defects.defects as {
			id: string;
			documentExpressible: boolean;
			reproducingCase?: string;
		}[]) {
			if (!defect.documentExpressible || !defect.reproducingCase) continue;
			const entry = corpus.loadCase(defect.reproducingCase) as Json;
			expect((entry.provenance as Json).reproduces, defect.id).toBe(defect.id);
		}
	});

	it("TC-318 a reader carrying the substring defect answers differently from the oracle", () => {
		// DEF-PROTO-004: the prototype decides nullability from a substring of a
		// rendered type name. PRES-010 carries a type whose name contains the
		// substring while the field is not nullable, so a reader with the defect
		// materializes `nullable: true` and its normalized bytes diverge.
		const entry = corpus.loadCase("PRES-010") as Json;
		const bundle = corpus.buildInput(entry) as Json;
		const field = (
			((bundle.ir as Json).types as Json[])[8].fields as Json[]
		)[1];
		expect(String(field.typeRef).includes("null")).toBe(true);
		expect(field.nullable).toBe(false);
		const verdict = corpus.oracleVerdict(entry) as {
			resultState: string;
			normalized: string;
		};
		expect(verdict.resultState).toBe("success");
		const substringAnswer = {
			...conforming(entry),
			adapter: "typescript-backend",
			normalized: verdict.normalized.replace(
				'"name":"label","nullable":false',
				'"name":"label","nullable":true',
			),
		};
		expect(substringAnswer.normalized).not.toBe(verdict.normalized);
		const report = run({
			adapterResults: { "typescript-backend": [substringAnswer] },
		}) as { exitCode: number };
		expect(report.exitCode).toBe(1);
	});

	it("TC-319 every register row declares a deciding layer and its cases are decided there", () => {
		for (const row of manifest.constructRegister) {
			expect(["schema", "cross-field", "compatibility"], row.id).toContain(
				row.decidedBy,
			);
		}
		for (const entry of cases) {
			if (entry.class !== "negative") continue;
			const schemaRows = schemaDiagnostics(
				corpus.buildInput(entry),
			) as unknown[];
			if (entry.decidedBy === "schema")
				expect(schemaRows.length, String(entry.id)).toBe(1);
			else expect(schemaRows.length, String(entry.id)).toBe(0);
		}
	});

	it("TC-622 a union payload that resolves to nothing is rejected and a shared payload is accepted", () => {
		expect(
			(
				corpus.oracleVerdict(corpus.loadCase("UNION-001")) as {
					resultState: string;
				}
			).resultState,
		).toBe("success");
		const bad = corpus.oracleVerdict(corpus.loadCase("UNION-002")) as {
			diagnostics: { diagnostic: { code: string }; pointer: string }[];
		};
		expect(bad.diagnostics[0].diagnostic.code).toBe(
			"agent-ix.semantic-ir.UNRESOLVED_VARIANT_PAYLOAD",
		);
		expect(bad.diagnostics[0].pointer).toContain("/variants/");
	});

	it("TC-623 the three version-transition cases produce the result their rows state", () => {
		expect(
			(
				corpus.oracleVerdict(corpus.loadCase("VER-001")) as {
					resultState: string;
				}
			).resultState,
		).toBe("success");
		const carried = corpus.oracleVerdict(corpus.loadCase("VER-002")) as {
			diagnostics: { diagnostic: { code: string } }[];
		};
		expect(carried.diagnostics[0].diagnostic.code).toBe(
			"agent-ix.semantic-ir.V1_1_NODE_IN_V1_0",
		);
		expect(
			(
				corpus.oracleVerdict(corpus.loadCase("PKG-004")) as {
					classification: string;
				}
			).classification,
		).toBe("breaking");
	});

	it("TC-624 every register source resolves and every criterion is quoted and covered", () => {
		const covered = new Set(cases.flatMap((entry) => entry.covers as string[]));
		for (const row of manifest.constructRegister) {
			for (const source of row.sources) {
				expect(
					statSync(join(REPO, source)).isFile(),
					`${row.id} → ${source}`,
				).toBe(true);
			}
			expect(row.criterionQuote, row.id).toBeDefined();
			expect(covered.has(row.id), row.id).toBe(true);
		}
	});

	it("TC-625 the unmet serialization area is recorded with its owning issues", () => {
		const area = manifest.unmetAreas.find(
			(one) => one.id === "UA-serialization-parity",
		);
		expect(area).toBeDefined();
		expect(area?.owningIssues).toEqual(
			expect.arrayContaining([
				"agent-ix/filament-core-data#21",
				"agent-ix/filament-core-data#22",
				"agent-ix/filament-core-data#23",
				"agent-ix/filament-core-data#11",
			]),
		);
	});
});

describe("TC-626..410 coverage, thresholds, mutations, and the import API (FR-039)", () => {
	it("TC-626 regenerating the coverage account reproduces the committed file", () => {
		const committed = readFileSync(join(CONF, "coverage.json"), "utf8");
		const report = run() as { coverage: unknown };
		expect(renderCoverage(report.coverage)).toBe(committed);
	});

	it("TC-626 adding a case without regenerating leaves the committed account stale", () => {
		const committed = readFileSync(join(CONF, "coverage.json"), "utf8");
		const added = structuredClone(manifest) as { cases: { id: string }[] };
		added.cases.push({
			...structuredClone(manifest.cases[0]),
			id: "ENV-999",
		} as never);
		const regenerated = renderCoverage(
			buildCoverage(added, [...cases, { ...cases[0], id: "ENV-999" }], [], []),
		) as string;
		expect(regenerated).not.toBe(committed);
		expect((JSON.parse(regenerated) as { totalCases: number }).totalCases).toBe(
			manifest.cases.length + 1,
		);
	});

	it("TC-627 thresholds declare a proposed row for each owning issue", () => {
		const rows = thresholds.thresholds as {
			adapter: string;
			owningIssue: string;
			status: string;
			constructRegisterCoverage: number;
			corpusPassRate: number;
			permittedDivergences: number;
			mutationDetectionScore: number;
		}[];
		expect(rows.map((row) => row.owningIssue).sort()).toEqual([
			"agent-ix/filament-core-data#19",
			"agent-ix/filament-core-data#21",
			"agent-ix/filament-core-data#22",
			"agent-ix/filament-core-data#23",
		]);
		for (const row of rows) {
			expect(row.status, row.adapter).toBe("proposed");
			for (const key of [
				"constructRegisterCoverage",
				"corpusPassRate",
				"permittedDivergences",
				"mutationDetectionScore",
			] as const) {
				expect(typeof row[key], `${row.adapter}.${key}`).toBe("number");
			}
		}
	});

	it("TC-628 every catalogued mutation is detected", () => {
		const score = mutationScore() as { score: number; undetected: string[] };
		expect(score.undetected).toEqual([]);
		expect(score.score).toBe(1);
	});

	it("TC-628 a mutation whose detecting case is suppressed drops the score", () => {
		const catalogue = mutations.mutations as {
			id: string;
			detectedBy: string;
			code: string;
		}[];
		const first = catalogue[0];
		const suppressed = cases.filter((entry) => entry.id !== first.detectedBy);
		const score = mutationScore({ cases: suppressed }) as {
			score: number;
			undetected: string[];
		};
		expect(score.undetected).toContain(first.id);
		expect(score.score).toBeLessThan(1);
	});

	it("TC-629 the catalogue carries a mutation for every register family", () => {
		const families = new Set(
			manifest.constructRegister.map((row) => row.family),
		);
		const covered = new Set(
			(mutations.mutations as { family: string }[]).map((row) => row.family),
		);
		for (const family of families) {
			expect(covered.has(family), family).toBe(true);
		}
	});

	it("TC-630 the import API works from another working directory", () => {
		const script = `
			import { loadCorpus, buildInput, oracleVerdict, corpusVersion } from ${JSON.stringify(join(CONF, "oracle", "index.mjs"))};
			const { cases } = loadCorpus();
			const bundle = buildInput(cases[0]);
			const verdict = oracleVerdict(cases[0]);
			process.stdout.write(JSON.stringify({ version: corpusVersion(), cases: cases.length, ir: typeof bundle.ir, state: verdict.resultState }));
		`;
		const output = execFileSync("node", ["--input-type=module", "-e", script], {
			cwd: "/",
			encoding: "utf8",
		});
		const parsed = JSON.parse(output) as {
			version: string;
			cases: number;
			ir: string;
		};
		expect(parsed.version).toBe(manifest.corpusVersion);
		expect(parsed.cases).toBe(manifest.cases.length);
		expect(parsed.ir).toBe("object");
	});

	it("TC-631 loadCase on an unknown id throws naming the id and the corpus version", () => {
		expect(() => api.loadCase("ABSENT-999")).toThrow(/ABSENT-999/);
		expect(() => api.loadCase("ABSENT-999")).toThrow(
			new RegExp(manifest.corpusVersion.replace(/\./g, "\\.")),
		);
	});

	it("TC-631 mutating a returned case does not affect a later load", () => {
		const first = api.loadCase("ENV-001") as Json;
		(first as Json).title = "mutated by TC-631";
		expect((api.loadCase("ENV-001") as Json).title).not.toBe(
			"mutated by TC-631",
		);
		const corpusOnce = api.loadCorpus() as { cases: Json[] };
		corpusOnce.cases.length = 0;
		expect((api.loadCorpus() as { cases: Json[] }).cases.length).toBe(
			manifest.cases.length,
		);
	});

	it("TC-632 a registry adapter with no threshold row and the converse each fail", () => {
		expect((run() as { problems: { kind: string }[] }).problems).toEqual([]);

		const withoutThreshold = structuredClone(thresholds) as {
			thresholds: { adapter: string }[];
		};
		const dropped = withoutThreshold.thresholds.shift() as { adapter: string };
		const one = run({ thresholds: withoutThreshold }) as {
			exitCode: number;
			problems: { kind: string; adapter?: string; message: string }[];
		};
		expect(one.exitCode).toBe(1);
		expect(
			one.problems.some(
				(problem) =>
					problem.kind === "threshold" &&
					problem.adapter === dropped.adapter &&
					problem.message === "registry adapter has no threshold row",
			),
		).toBe(true);

		const withoutAdapter = structuredClone(registry) as {
			adapters: { id: string }[];
		};
		const removed = withoutAdapter.adapters.shift() as { id: string };
		const other = run({ registry: withoutAdapter }) as {
			exitCode: number;
			problems: { kind: string; adapter?: string; message: string }[];
		};
		expect(other.exitCode).toBe(1);
		expect(
			other.problems.some(
				(problem) =>
					problem.kind === "threshold" &&
					problem.adapter === removed.id &&
					problem.message === "threshold row has no registry adapter",
			),
		).toBe(true);
	});

	it("TC-633 package.json gains no exports or files entry for the corpus", () => {
		const pkg = read(join(REPO, "package.json")) as {
			exports: Record<string, unknown>;
			files: string[];
		};
		expect(
			Object.keys(pkg.exports).some((key) => key.includes("conformance")),
		).toBe(false);
		expect(pkg.files.some((entry) => entry.includes("conformance"))).toBe(
			false,
		);
	});

	it("TC-634 the coverage account is byte-identical from another working directory", () => {
		const script = `
			import { run, renderCoverage } from ${JSON.stringify(join(CONF, "runner", "differential.mjs"))};
			process.stdout.write(renderCoverage(run().coverage));
		`;
		const elsewhere = execFileSync(
			"node",
			["--input-type=module", "-e", script],
			{
				cwd: "/",
				encoding: "utf8",
			},
		);
		expect(elsewhere).toBe(readFileSync(join(CONF, "coverage.json"), "utf8"));
	});
});

describe("TC-635..419 blessing-free evidence and isolation (NFR-015, NFR-016)", () => {
	it("TC-635 no case is blessed and every quote occurs in its artifact", () => {
		for (const entry of cases) {
			expect((entry.provenance as Json).blessedFromRun, String(entry.id)).toBe(
				false,
			);
			for (const source of entry.derivedFrom as {
				artifact: string;
				quote: string;
			}[]) {
				expect(
					readFileSync(join(REPO, source.artifact), "utf8").includes(
						source.quote,
					),
					String(entry.id),
				).toBe(true);
			}
		}
	});

	it("TC-636 verdicts, the report, and the coverage account are stable across two runs", () => {
		expect(canonical(run())).toBe(canonical(run()));
		expect(
			cases.map((entry) => canonical(corpus.oracleVerdict(entry))),
		).toEqual(cases.map((entry) => canonical(corpus.oracleVerdict(entry))));
	});

	it("TC-636 the report is byte-identical under a Turkish locale and from another directory", () => {
		const script = `
			import { run } from ${JSON.stringify(join(CONF, "runner", "differential.mjs"))};
			process.stdout.write(JSON.stringify(run()));
		`;
		const here = execFileSync("node", ["--input-type=module", "-e", script], {
			cwd: REPO,
			encoding: "utf8",
			env: { ...process.env, LC_ALL: "C" },
		});
		const elsewhere = execFileSync(
			"node",
			["--input-type=module", "-e", script],
			{
				cwd: "/",
				encoding: "utf8",
				env: { ...process.env, LC_ALL: "tr_TR.UTF-8" },
			},
		);
		expect(elsewhere).toBe(here);
	});

	it("TC-637 the oracle and the harness perform no clock, network, or environment read", () => {
		const effects =
			/Date\.now|new Date|process\.env|fetch\(|node:https?|node:dns|node:net/;
		for (const dir of ["oracle", "runner"]) {
			for (const file of readdirSync(join(CONF, dir))) {
				if (!file.endsWith(".mjs")) continue;
				expect(
					effects.test(readFileSync(join(CONF, dir, file), "utf8")),
					`${dir}/${file}`,
				).toBe(false);
			}
		}
		expect(readFileSync(join(CONF, "corpus.mjs"), "utf8")).not.toMatch(effects);
	});

	it("TC-638 every divergence carries an owner and a verdict, and gaps carry an owning issue", () => {
		const register = read(join(CONF, "divergences.json")) as {
			divergences: { owner: string; verdict: string; owningIssue: string }[];
		};
		for (const entry of register.divergences) {
			expect(entry.owner).toBeDefined();
			expect([
				"implementation-defect",
				"corpus-defect",
				"contract-gap",
			]).toContain(entry.verdict);
			expect(entry.owningIssue).toMatch(/#\d+$/);
		}
		const gaps = read(join(CONF, "contract-gaps.json")) as {
			gaps: {
				id: string;
				owningIssue: string;
				status: string;
				corpusDisposition: string;
			}[];
		};
		expect(gaps.gaps.length).toBeGreaterThan(0);
		for (const gap of gaps.gaps) {
			expect(gap.owningIssue, gap.id).toMatch(/#\d+$/);
			expect(gap.status, gap.id).toBe("open");
			expect(gap.corpusDisposition.length, gap.id).toBeGreaterThan(0);
		}
	});

	it("TC-639 changing an expected result without a major bump fails the versioning gate", () => {
		const before = structuredClone(manifest) as Json;
		const after = structuredClone(manifest) as {
			corpusVersion: string;
			predecessor: Json;
			cases: { expectedDigest: string }[];
		};
		after.cases[0].expectedDigest = `sha256:${"0".repeat(64)}`;
		after.corpusVersion = "1.1.0";
		after.predecessor = { ...predecessorRequired };
		const classified = corpus.classifyVersionChange(before, after) as {
			required: string;
			reasons: { reason: string }[];
		};
		expect(classified.required).toBe("major");
		expect(
			classified.reasons.some((one) =>
				one.reason.includes("changed its expected result"),
			),
		).toBe(true);
		const failures = corpus.versioningFailures(before, after) as {
			gate: string;
			message: string;
		}[];
		expect(failures.length).toBe(1);
		expect(failures[0].gate).toBe("versioning");
		expect(failures[0].message).toContain("requires a major bump");
		after.corpusVersion = "2.0.0";
		expect(corpus.versioningFailures(before, after)).toEqual([]);
	});

	it("TC-639 a removed case and a changed base each require a major bump", () => {
		const before = structuredClone(manifest) as Json;
		const removed = structuredClone(manifest) as {
			corpusVersion: string;
			predecessor: Json;
			cases: unknown[];
		};
		removed.cases.pop();
		removed.corpusVersion = "1.1.0";
		removed.predecessor = { ...predecessorRequired };
		expect(
			(corpus.versioningFailures(before, removed) as unknown[]).length,
		).toBe(1);
		const rebased = structuredClone(manifest) as {
			corpusVersion: string;
			predecessor: Json;
			bases: { digest: string }[];
		};
		rebased.bases[0].digest = `sha256:${"1".repeat(64)}`;
		rebased.corpusVersion = "1.0.1";
		rebased.predecessor = { ...predecessorRequired };
		expect(
			(corpus.versioningFailures(before, rebased) as unknown[]).length,
		).toBe(1);
	});

	it("TC-639 adding a case needs only a minor bump and a backward move fails", () => {
		const before = structuredClone(manifest) as Json;
		const added = structuredClone(manifest) as {
			corpusVersion: string;
			predecessor: Json;
			cases: unknown[];
		};
		added.cases.push({ ...structuredClone(manifest.cases[0]), id: "ENV-999" });
		added.corpusVersion = "1.1.0";
		added.predecessor = { ...predecessorRequired };
		expect(corpus.versioningFailures(before, added)).toEqual([]);
		added.corpusVersion = "1.0.0";
		expect((corpus.versioningFailures(before, added) as unknown[]).length).toBe(
			1,
		);
		added.corpusVersion = "0.9.0";
		expect(
			(corpus.versioningFailures(before, added) as { message: string }[])[0]
				.message,
		).toContain("not a forward SemVer bump");
	});

	it("TC-639 the versioning gate cannot silently disable itself", () => {
		// The manifest declares whether a predecessor is expected, so a gate that
		// did not run says so instead of passing. This is the same defect class as
		// baselining on a range the branch's own merge empties.
		const declared = manifest.predecessor as {
			state: string;
			ref: string;
			rationale: string;
		};
		expect(["none", "required"]).toContain(declared.state);
		expect(declared.rationale.length).toBeGreaterThan(0);

		// Declared `none` with no predecessor readable: the comparison is
		// legitimately not applicable.
		expect(corpus.versioningFailures(undefined, manifest)).toEqual([]);

		// Declared `none` once a predecessor exists and is identical: the state on
		// `main` the instant this corpus merges. Nothing has moved, so nothing is
		// asserted and nothing is wrong.
		expect(corpus.versioningFailures(manifest, manifest)).toEqual([]);

		// Declared `none` once a predecessor exists and the corpus has moved:
		// stale, and it fails rather than quietly comparing nothing.
		const moved = structuredClone(manifest) as { cases: unknown[] };
		moved.cases.pop();
		const appeared = corpus.versioningFailures(moved, manifest) as {
			gate: string;
			message: string;
		}[];
		expect(appeared.length).toBe(1);
		expect(appeared[0].gate).toBe("versioning");
		expect(appeared[0].message).toContain(
			'set predecessor.state to "required"',
		);

		// Declared `required` but unreadable: the gate fails instead of skipping.
		const required = {
			...structuredClone(manifest),
			predecessor: { ...declared, state: "required" },
		};
		const unreadable = corpus.versioningFailures(undefined, required) as {
			message: string;
		}[];
		expect(unreadable.length).toBe(1);
		expect(unreadable[0].message).toContain("did not run");
	});

	it("TC-639 the change range is bounded at both ends and covers everything this ticket owns", () => {
		const git = (...args: string[]) =>
			execFileSync("git", args, { cwd: REPO, encoding: "utf8" }).trim();

		// Every sentinel must resolve. `changeRange` ignores one that does not,
		// and a renamed sentinel is exactly how this range would silently narrow
		// until it stopped covering the work it exists to cover.
		for (const sentinel of CHANGE_SENTINELS) {
			expect(
				git("log", "--diff-filter=A", "--format=%H", "-1", "--", sentinel),
				`sentinel does not resolve: ${sentinel}`,
			).not.toBe("");
		}

		// The range ends at this ticket's latest sentinel, not at `HEAD`. A later
		// backend legitimately adds its own adapter under `conformance/`; treating
		// every later addition as issue #20 work made this gate fail even after
		// that backend was reverted. The positive assertion below keeps the two
		// sentinels honest without annexing a sibling's history.
		const changed = corpusChangedPaths();
		expect(changed).toContain("conformance/corpus.json");
		expect(changed).toContain(
			"spec/functional/FR-035-define-the-conformance-corpus.md",
		);
	});

	it("TC-639 no corpus gate baselines on a range this branch's own merge empties", () => {
		// The defect issue #27 carried into main: a positive claim about
		// `origin/main...HEAD` fails forever after the squash merge, and a negative
		// one stops asserting. Nothing under conformance/ may read that range, and
		// the suite's own baseline carries the merge-empty fallback.
		const walk = (dir: string): string[] =>
			readdirSync(dir).flatMap((entry) => {
				const full = join(dir, entry);
				return statSync(full).isDirectory() ? walk(full) : [full];
			});
		for (const file of walk(CONF)) {
			if (!file.endsWith(".mjs")) continue;
			expect(
				/origin\/main\.\.\.|origin\/main\.\./.test(readFileSync(file, "utf8")),
				file,
			).toBe(false);
		}
		// The suite itself resolves its range from history, never from a ref.
		const suite = readFileSync(
			join(REPO, "test", "conformance-corpus.test.ts"),
			"utf8",
		);
		expect(suite).toContain("changeRange(REPO");
		const ref = `origin/main`;
		for (const call of suite.matchAll(
			/execFileSync\(\s*"git",\s*\[([^\]]*)\]/g,
		)) {
			expect(
				call[1].includes(ref),
				`a git call in this suite resolves against ${ref}: ${call[1].slice(0, 60)}`,
			).toBe(false);
		}

		// One deliberate exception, declared and guarded: the versioning gate's
		// predecessor. Every other file under conformance/ is ref-free.
		const readers = walk(CONF)
			.filter((file) => file.endsWith(".mjs"))
			.filter((file) => readFileSync(file, "utf8").includes(ref));
		expect(readers.map((file) => file.slice(CONF.length + 1))).toEqual([
			"corpus.mjs",
		]);
		const corpusSource = readFileSync(join(CONF, "corpus.mjs"), "utf8");
		expect(
			(corpusSource.match(/execFileSync\("git"/g) ?? []).length,
			"more than one git invocation under conformance/",
		).toBe(1);
		expect(corpusSource).toContain("predecessor");
	});

	it("TC-639 corpusVersion is the version a consumer pins, and the README says so", () => {
		expect(readFileSync(join(CONF, "README.md"), "utf8")).toContain(
			"the only version a consumer pins",
		);
		expect(api.corpusVersion()).toBe(manifest.corpusVersion);
	});

	it("TC-640 every path this issue changed is permitted and none is prohibited", () => {
		const changed = corpusChangedPaths();
		// Measured from the corpus's own introduction, so the range is this
		// issue's change set whether or not the branch has merged.
		expect(changed.length).toBeGreaterThan(0);
		expect(changed).toContain("conformance/corpus.json");
		const prohibited = [
			"spikes/",
			"src/",
			"packages/",
			"schema/",
			"fixtures/",
			"docs/",
			".github/",
			"agent_ix_core_data/",
			"pnpm-lock.yaml",
			"poetry.lock",
			"pyproject.toml",
			"package.json",
			"biome.json",
			"tsconfig.json",
			"tsconfig.build.json",
		];
		const permitted = [
			"conformance/",
			"spec/",
			"plan/",
			"reviews/",
			"test/",
			"tests/",
			"Makefile",
		];
		for (const path of changed) {
			for (const prefix of prohibited) {
				expect(
					path === prefix || path.startsWith(prefix),
					`${path} is prohibited by NFR-016`,
				).toBe(false);
			}
			expect(
				permitted.some((prefix) => path === prefix || path.startsWith(prefix)),
				`${path} is outside the NFR-016 permitted list`,
			).toBe(true);
		}
	});

	it("TC-640 every file the corpus owns lives under conformance/ or its two suites", () => {
		// The tree half, which holds no matter what any diff says.
		const walk = (dir: string): string[] =>
			readdirSync(dir).flatMap((entry) => {
				const full = join(dir, entry);
				return statSync(full).isDirectory() ? walk(full) : [full];
			});
		expect(walk(CONF).length).toBeGreaterThan(100);
		expect(
			statSync(join(REPO, "test", "conformance-corpus.test.ts")).isFile(),
		).toBe(true);
		expect(
			statSync(join(REPO, "tests", "test_conformance_corpus.py")).isFile(),
		).toBe(true);
	});

	it("TC-641 this issue changes no manifest and no lockfile", () => {
		const changed = corpusChangedPaths();
		for (const path of [
			"package.json",
			"pyproject.toml",
			"pnpm-lock.yaml",
			"poetry.lock",
		]) {
			expect(changed, `${path} is in this issue's change set`).not.toContain(
				path,
			);
		}
		// The tree half: whatever any diff says, the manifest names no corpus
		// surface and no dependency.
		const pkg = read(join(REPO, "package.json")) as {
			dependencies?: Json;
			exports: Record<string, unknown>;
			files: string[];
		};
		expect(pkg.dependencies).toBeUndefined();
		expect(
			Object.keys(pkg.exports).some((key) => key.includes("conformance")),
		).toBe(false);
		expect(pkg.files.some((entry) => entry.includes("conformance"))).toBe(
			false,
		);
	});

	it("TC-643 this issue alters no consumer, catalog pin, Avro contract, or release path", () => {
		const changed = corpusChangedPaths();
		for (const surface of [
			"schema/avro/",
			"src/",
			"agent_ix_core_data/",
			".github/workflows/",
			"packages/",
			"pyproject.toml",
			"package.json",
		]) {
			for (const path of changed) {
				expect(path.startsWith(surface), `${path} touches ${surface}`).toBe(
					false,
				);
			}
		}
		const walk = (dir: string): string[] =>
			readdirSync(dir).flatMap((entry) => {
				const full = join(dir, entry);
				return statSync(full).isDirectory() ? walk(full) : [full];
			});
		for (const file of walk(CONF)) {
			if (!file.endsWith(".mjs")) continue;
			expect(
				/npm\s+publish|pnpm\s+publish|poetry\s+publish/.test(
					readFileSync(file, "utf8"),
				),
				file,
			).toBe(false);
		}
	});
});
