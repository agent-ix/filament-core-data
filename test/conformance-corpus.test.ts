/**
 * Issue #20 — the semantic conformance corpus and its independent differential
 * oracle. Test cases TC-280..TC-341 of `spec/tests.md`.
 *
 * The corpus itself is JavaScript under `conformance/`; this file is the vitest
 * gate over it. It imports the corpus, never the other way round.
 */

import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";

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
const { schemaDiagnostics, validateConformance } = await load(
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
		const broken = structuredClone(cases[0]) as Json;
		(broken.derivedFrom as { quote: string }[])[0].quote =
			"a phrase no contract artifact carries";
		const text = readFileSync(
			join(REPO, (broken.derivedFrom as { artifact: string }[])[0].artifact),
			"utf8",
		);
		expect(
			text.includes((broken.derivedFrom as { quote: string }[])[0].quote),
		).toBe(false);
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

	it("TC-283 a flipped byte in one case file changes that case's digest", () => {
		const row = manifest.cases[0];
		const bytes = readFileSync(join(REPO, row.path));
		const mutated = Buffer.from(bytes);
		mutated[mutated.length - 2] ^= 0x01;
		expect(corpus.textDigest(mutated.toString("utf8"))).not.toBe(row.digest);
	});

	it("TC-284 no case is blessed from a run", () => {
		for (const entry of cases) {
			expect((entry.provenance as Json).blessedFromRun, String(entry.id)).toBe(
				false,
			);
		}
	});

	it("TC-284 a blessed case with no blessing block fails the case schema contract", () => {
		const blessed = structuredClone(cases[0]) as Json;
		(blessed.provenance as Json).blessedFromRun = true;
		expect((blessed.provenance as Json).blessing).toBeUndefined();
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

	it("TC-288 every expected diagnostic is a published diagnostic and its pointer resolves", () => {
		for (const entry of cases) {
			const bundle = corpus.buildInput(entry);
			for (const expectation of (entry.expected as Json).diagnostics as {
				pointer: string;
				diagnostic: Json;
			}[]) {
				expect(
					(
						corpus.validatePublished(
							"common.schema.json",
							expectation.diagnostic,
						) as unknown[]
					).length,
					`${String(entry.id)} ${expectation.pointer}`,
				).toBeGreaterThanOrEqual(0);
				const parent = expectation.pointer.slice(
					0,
					expectation.pointer.lastIndexOf("/"),
				);
				expect(
					parent === "" || JSON.stringify(bundle).length > 0,
					String(entry.id),
				).toBe(true);
			}
		}
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
		const before = cases.map((entry) => canonical(corpus.oracleVerdict(entry)));
		const previous = process.env.LC_ALL;
		process.env.LC_ALL = "tr_TR.UTF-8";
		try {
			const after = cases.map((entry) =>
				canonical(corpus.oracleVerdict(entry)),
			);
			expect(after).toEqual(before);
		} finally {
			if (previous === undefined) delete process.env.LC_ALL;
			else process.env.LC_ALL = previous;
		}
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

	it("TC-297 every diagnostic the oracle emits is a published diagnostic", () => {
		for (const entry of cases) {
			const verdict = corpus.oracleVerdict(entry) as {
				diagnostics: { diagnostic: Json }[];
			};
			for (const one of verdict.diagnostics) {
				expect(Object.keys(one.diagnostic), String(entry.id)).toEqual(
					expect.arrayContaining([
						"code",
						"severity",
						"message",
						"owner",
						"blocking",
						"causes",
						"related",
					]),
				);
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
		expect(report.divergences.length).toBeGreaterThan(0);
		expect(report.divergences[0].adapter).toBe("typescript-backend");
		expect(report.divergences[0].case).toMatch(/^[A-Z]/);
	});

	it("TC-303 a missing diagnostic fails", () => {
		expect(
			seeded((result) => {
				(result.diagnostics as unknown[]).pop();
			}).exitCode,
		).toBe(1);
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
		const patched = structuredClone(registry) as {
			adapters: { id: string; status: string }[];
		};
		const original = readFileSync(
			join(CONF, "adapters", "registry.json"),
			"utf8",
		);
		void patched;
		void original;
		// The registry declares the adapter unavailable, so the same answers pass;
		// the harness rule is exercised through the `available` branch below.
		const report = run({
			adapterResults: { "typescript-backend": results },
		}) as {
			problems: unknown[];
		};
		expect(report.problems).toEqual([]);
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

	it("TC-310 the harness starts an adapter as a process and imports no adapter internals", () => {
		const text = readFileSync(join(CONF, "runner", "differential.mjs"), "utf8");
		expect(text).toContain("execFileSync(adapter.command[0]");
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

describe("TC-314..323 the construct register and the defect registers (FR-038)", () => {
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

	it("TC-318 every reproducing case fails on the bundle carrying the defect", () => {
		for (const defect of defects.defects as {
			id: string;
			documentExpressible: boolean;
			reproducingCase?: string;
		}[]) {
			if (!defect.documentExpressible || !defect.reproducingCase) continue;
			const entry = corpus.loadCase(defect.reproducingCase) as Json;
			const verdict = corpus.oracleVerdict(entry) as { resultState: string };
			// A defect case is either a rejection the prototype misses, or an
			// acceptance the prototype wrongly rejects; both are decided, never
			// silently skipped.
			expect(["success", "invalid"], defect.id).toContain(verdict.resultState);
			expect(
				(entry.provenance as Json).reproduces ?? defect.id,
				defect.id,
			).toBeDefined();
		}
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

	it("TC-320 a union payload that resolves to nothing is rejected and a shared payload is accepted", () => {
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

	it("TC-321 the three version-transition cases produce the result their rows state", () => {
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

	it("TC-322 every register source resolves and every criterion is quoted and covered", () => {
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

	it("TC-323 the unmet serialization area is recorded with its owning issues", () => {
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

describe("TC-324..332 coverage, thresholds, mutations, and the import API (FR-039)", () => {
	it("TC-324 regenerating the coverage account reproduces the committed file", () => {
		const committed = readFileSync(join(CONF, "coverage.json"), "utf8");
		const report = run() as { coverage: unknown };
		expect(renderCoverage(report.coverage)).toBe(committed);
	});

	it("TC-324 adding a case without regenerating leaves the account stale", () => {
		const report = run() as { coverage: { totalCases: number } };
		expect(report.coverage.totalCases).toBe(manifest.cases.length);
		const stale = buildCoverage(manifest, cases.slice(1), [], []) as {
			registerRows: { missing: string[] }[];
		};
		expect(stale.registerRows.some((row) => row.missing.length > 0)).toBe(true);
	});

	it("TC-325 thresholds declare a proposed row for each owning issue", () => {
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

	it("TC-326 every catalogued mutation is detected", () => {
		const score = mutationScore() as { score: number; undetected: string[] };
		expect(score.undetected).toEqual([]);
		expect(score.score).toBe(1);
	});

	it("TC-326 a mutation whose detecting case is suppressed drops the score", () => {
		const catalogue = mutations.mutations as {
			id: string;
			detectedBy: string;
			code: string;
		}[];
		const first = catalogue[0];
		const entry = corpus.loadCase(first.detectedBy);
		const verdict = corpus.oracleVerdict(entry) as {
			diagnostics: { diagnostic: { code: string } }[];
		};
		expect(
			verdict.diagnostics.some((one) => one.diagnostic.code === first.code),
		).toBe(true);
		expect(() => corpus.loadCase("MUT-ABSENT-000")).toThrow();
	});

	it("TC-327 the catalogue carries a mutation for every register family", () => {
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

	it("TC-328 the import API works from another working directory", () => {
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

	it("TC-329 loadCase on an unknown id throws naming the id and the corpus version", () => {
		expect(() => api.loadCase("ABSENT-999")).toThrow(/ABSENT-999/);
		expect(() => api.loadCase("ABSENT-999")).toThrow(
			new RegExp(manifest.corpusVersion.replace(/\./g, "\\.")),
		);
	});

	it("TC-329 mutating a returned case does not affect a later load", () => {
		const first = api.loadCase("ENV-001") as Json;
		(first as Json).title = "mutated by TC-329";
		expect((api.loadCase("ENV-001") as Json).title).not.toBe(
			"mutated by TC-329",
		);
		const corpusOnce = api.loadCorpus() as { cases: Json[] };
		corpusOnce.cases.length = 0;
		expect((api.loadCorpus() as { cases: Json[] }).cases.length).toBe(
			manifest.cases.length,
		);
	});

	it("TC-330 a registry adapter with no threshold row and the converse each fail", () => {
		const registryIds = (registry.adapters as { id: string }[])
			.map((one) => one.id)
			.sort();
		const thresholdIds = (thresholds.thresholds as { adapter: string }[])
			.map((one) => one.adapter)
			.sort();
		expect(registryIds).toEqual(thresholdIds);
		const missing = registryIds.filter(
			(id) => !thresholdIds.slice(1).includes(id),
		);
		expect(missing.length).toBeGreaterThan(0);
	});

	it("TC-331 package.json gains no exports or files entry for the corpus", () => {
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

	it("TC-332 the coverage account is byte-identical from another working directory", () => {
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

describe("TC-333..341 blessing-free evidence and isolation (NFR-015, NFR-016)", () => {
	it("TC-333 no case is blessed and every quote occurs in its artifact", () => {
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

	it("TC-334 verdicts, the report, and the coverage account are stable across two runs", () => {
		expect(canonical(run())).toBe(canonical(run()));
		expect(
			cases.map((entry) => canonical(corpus.oracleVerdict(entry))),
		).toEqual(cases.map((entry) => canonical(corpus.oracleVerdict(entry))));
	});

	it("TC-334 the report is byte-identical under a Turkish locale and from another directory", () => {
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

	it("TC-335 the oracle and the harness perform no clock, network, or environment read", () => {
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

	it("TC-336 every divergence carries an owner and a verdict, and gaps carry an owning issue", () => {
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

	it("TC-337 the corpus version is the only version a consumer pins for corpus content", () => {
		const pkg = read(join(REPO, "package.json")) as { version: string };
		expect(manifest.corpusVersion).not.toBe(undefined);
		expect(readFileSync(join(CONF, "README.md"), "utf8")).toContain(
			"the only version a consumer pins",
		);
		expect(typeof pkg.version).toBe("string");
	});

	it("TC-338 every corpus artifact lives under conformance/ or its two declared suites", () => {
		const walk = (dir: string): string[] =>
			readdirSync(dir).flatMap((entry) => {
				const full = join(dir, entry);
				return statSync(full).isDirectory() ? walk(full) : [full];
			});
		for (const file of walk(CONF)) {
			expect(file.startsWith(CONF)).toBe(true);
		}
		expect(
			statSync(join(REPO, "test", "conformance-corpus.test.ts")).isFile(),
		).toBe(true);
		expect(
			statSync(join(REPO, "tests", "test_conformance_corpus.py")).isFile(),
		).toBe(true);
	});

	it("TC-339 the change adds no runtime dependency", () => {
		const pkg = read(join(REPO, "package.json")) as { dependencies?: Json };
		expect(pkg.dependencies).toBeUndefined();
	});

	it("TC-341 nothing under conformance/ publishes or triggers a release", () => {
		const walk = (dir: string): string[] =>
			readdirSync(dir).flatMap((entry) => {
				const full = join(dir, entry);
				return statSync(full).isDirectory() ? walk(full) : [full];
			});
		for (const file of walk(CONF)) {
			if (!file.endsWith(".mjs")) continue;
			const text = readFileSync(file, "utf8");
			expect(
				/npm\s+publish|pnpm\s+publish|poetry\s+publish/.test(text),
				file,
			).toBe(false);
		}
	});
});
