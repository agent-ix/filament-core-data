/**
 * The `compiler-frontend` conformance adapter (issue #52, FR-070).
 *
 * The harness starts this file as a process with its working directory at
 * `conformance/` and passes nothing on standard input. It writes one JSON array
 * to standard output carrying one `conformance/schema/adapter-result.schema.json`
 * document per corpus case, and exits `0` whatever verdicts it computed — a
 * non-zero exit is read by the harness as an adapter failure rather than as a
 * case failure.
 *
 * Every answer is computed by the issue #19 compiler's own decision modules:
 *
 * - `diagnostics` by `readContractIr`, the compiler's cross-field IR reader —
 *   the same function `inspect` calls, so the adapter answers with the reading
 *   the shipped command gives;
 * - `resultState` from whether any of those diagnostics blocks, decided by the
 *   compiler's own `hasBlocking`;
 * - `normalized` by `normalizeIr`, the compiler's own canonical form, asked for
 *   the corpus comparison serialization;
 * - `classification`, for a compatibility case, by `diffSemanticContract`'s
 *   `aggregateDisposition`.
 *
 * It imports no module under `conformance/oracle/` but the declared import
 * surface `index.mjs`, and never calls `oracleVerdict` or `compare`. Computing
 * an answer from the oracle is the one thing that would make the exercise
 * worthless: the corpus is an independent yardstick only for as long as the
 * thing it measures was written independently of it. The compiler predates this
 * adapter and is not edited by it, which is the strongest form of that
 * independence available here — the reader being measured was written against
 * the published contract, by a different ticket, before the corpus judged it.
 */

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { diffSemanticContract } from "../../../src/compiler/compat/diff.mjs";

import { hasBlocking } from "../../../src/compiler/diagnostics.mjs";
import { normalizeIr } from "../../../src/compiler/ir/normalize.mjs";
import { readContractIr } from "../../../src/compiler/ir/reader.mjs";
import { buildBefore, buildInput, loadCorpus } from "../../oracle/index.mjs";

/**
 * The repository root, resolved from this module rather than from
 * `process.cwd()`: the harness runs the adapter from `conformance/`, and a
 * working directory is exactly the kind of ambient input that makes an answer
 * depend on where it was asked.
 */
const REPOSITORY_ROOT = resolve(
	dirname(fileURLToPath(import.meta.url)),
	"../../..",
);

/** The decision modules whose content the adapter's version tracks. */
const DECISION_MODULES = [
	"src/compiler/ir/reader.mjs",
	"src/compiler/ir/normalize.mjs",
	"src/compiler/compat/diff.mjs",
	"src/compiler/diagnostics.mjs",
];

const ADAPTER_ID = "compiler-frontend";
const ADAPTER_BASE_VERSION = "1.0.0";

/**
 * `<base>+<digest>`, where the digest covers every decision module's bytes.
 *
 * FR-070 requires a version that moves whenever a decision module changes a
 * verdict this adapter produces. A hand-maintained constant does not: it moves
 * when someone remembers. Deriving it from the modules' own content moves it
 * whenever they change at all, which is stronger than the obligation and needs
 * nobody to remember. It reads committed bytes and no clock, so two runs of an
 * unchanged tree produce one version.
 */
function adapterVersion() {
	const hash = createHash("sha256");
	for (const path of DECISION_MODULES) {
		hash.update(path, "utf8");
		hash.update(readFileSync(resolve(REPOSITORY_ROOT, path)));
	}
	return `${ADAPTER_BASE_VERSION}+${hash.digest("hex").slice(0, 12)}`;
}

/** The IR member of an input bundle, or `null` where the bundle carries none. */
function irOf(bundle) {
	if (bundle === null || typeof bundle !== "object" || Array.isArray(bundle)) {
		return null;
	}
	return bundle.ir ?? null;
}

/**
 * The reader's diagnostics for one bundle, in the result contract's shape.
 *
 * The compiler locates a defect by `locus` — a position in the source the IR
 * was compiled from — and carries no RFC 6901 pointer, because the document it
 * reads is not the artifact its user is editing. The registry therefore
 * declares this adapter `pointerCompatible: false`, exactly as the Rust backend
 * does for GAP-002, and the comparison drops the pointer from the key rather
 * than this adapter inventing one. An invented pointer would agree or disagree
 * for reasons that have nothing to do with what the compiler decided.
 *
 * `suppressions` are deliberately dropped. A suppression records that a rule
 * did not run because its declared input was absent, and the result contract
 * admits no member for one; carrying it as a diagnostic would invent a
 * disagreement the reader did not make.
 */
function read(bundle) {
	return readContractIr(irOf(bundle), {
		// The corpus supplies one document and no package resolution, so the
		// reader cannot tell a valid cross-package edge from a dangling one. It is
		// told that explicitly rather than handed an empty set, which would read
		// as "this package imports nothing" and turn every cross-package edge into
		// a defect the compiler never decided.
		importedExports: "unknown",
	});
}

/**
 * One adapter result for one case.
 *
 * `caseDigest` is taken from the corpus manifest, never recomputed from bytes
 * this adapter chose: an adapter that digests its own reading of a case can
 * agree with itself about a case it misread.
 */
function answer(entry, digest, version) {
	const bundle = buildInput(entry);
	const diagnostics = read(bundle);
	const result = {
		adapter: ADAPTER_ID,
		adapterVersion: version,
		caseId: entry.id,
		caseDigest: digest,
		support: "supported",
		resultState: hasBlocking(diagnostics) ? "invalid" : "success",
		diagnostics: diagnostics.map((entry_) => ({
			pointer: "",
			diagnostic: entry_,
		})),
		// `{ sets: [] }` selects the corpus comparison form
		// `agent-ix-conformance-jcs-v1`, which preserves array order, over the
		// contract's `RFC8785-JCS-with-identity-sorted-sets-v1` fingerprint form,
		// which identity-sorts thirteen set paths. `conformance/README.md` states
		// they are different forms and GAP-004 records that the fingerprint form is
		// named but undefined. The materialization above it — the 1.1.0 field
		// multiplicity, presence and nullable — is still the compiler's own, so what
		// is borrowed here is the serialization the comparison speaks, not a verdict.
		// The TypeScript backend's `normalizeIrForTarget` passes the same override
		// for the same reason; it spells it `false` because its own canonicalizer
		// takes a boolean where this one takes the set of paths to sort.
		normalized: normalizeIr(irOf(bundle), { sets: [] }),
	};
	if (entry.kind === "compatibility") {
		const beforeBundle = buildBefore(entry);
		const beforeBlocking = hasBlocking(read(beforeBundle));
		result.classification =
			beforeBlocking || result.resultState === "invalid"
				? "invalid"
				: diffSemanticContract({
						old: irOf(beforeBundle),
						new: irOf(bundle),
						consumerPolicies: bundle.consumerPolicy
							? [bundle.consumerPolicy]
							: undefined,
					}).aggregateDisposition;
	}
	return result;
}

function main() {
	const { manifest, cases } = loadCorpus();
	const digests = new Map(manifest.cases.map((row) => [row.id, row.digest]));
	const version = adapterVersion();
	const results = cases.map((entry) =>
		answer(entry, digests.get(entry.id), version),
	);
	process.stdout.write(`${JSON.stringify(results)}\n`);
}

main();
