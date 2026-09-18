/**
 * The `typescript-backend` conformance adapter (issue #22, FR-070).
 *
 * The harness starts this file as a process with its working directory at
 * `conformance/` and passes nothing on standard input. It writes one JSON array
 * to standard output carrying one `conformance/schema/adapter-result.schema.json`
 * document per corpus case, and exits `0` whatever verdicts it computed — a
 * non-zero exit is read by the harness as an adapter failure rather than as a
 * case failure.
 *
 * Every answer is computed by the backend's own decision modules:
 *
 * - `resultState` and `diagnostics` by `admitIr`, the backend's own IR reader;
 * - `normalized` by `normalizeIrForTarget`, the backend's own canonical form;
 * - `classification`, for a compatibility case, by `classifySurface`.
 *
 * It never calls `oracleVerdict` or `compare`, and imports no module under
 * `conformance/oracle/` but the declared import surface `index.mjs`. Computing
 * an answer from the oracle is the one thing that would make the exercise
 * worthless: the corpus is an independent yardstick only for as long as the
 * thing it measures was written independently of it.
 *
 * That prohibition is checkable and is checked. Transcription of
 * `conformance/oracle/oracle.mjs` is not detectable by any check this
 * repository can run, so the backend discloses instead of asserting: the
 * FR-068 derivation ledger records, per code, whether its rule was read from a
 * published contract clause or from the corpus's own register, and the
 * first-run divergence count is recorded before any fix. Neither proves
 * independence. An undetectable property is better disclosed than asserted.
 */

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
	admitIr,
	SCHEMA_FILES,
} from "../../../src/compiler/backends/typescript-v1/admit.mjs";
import { normalizeIrForTarget } from "../../../src/compiler/backends/typescript-v1/canonical.mjs";
import { classifySurface } from "../../../src/compiler/backends/typescript-v1/classify.mjs";
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
	"src/compiler/backends/typescript-v1/admit.mjs",
	"src/compiler/backends/typescript-v1/canonical.mjs",
	"src/compiler/backends/typescript-v1/classify.mjs",
	"src/compiler/backends/typescript-v1/loss.mjs",
];

const ADAPTER_ID = "typescript-backend";
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

/** Reads a published schema by the repository-relative path `SCHEMA_FILES` names. */
function readSchema(fileName) {
	return JSON.parse(readFileSync(resolve(REPOSITORY_ROOT, fileName), "utf8"));
}

/** The IR member of an input bundle, or `null` where the bundle carries none. */
function irOf(bundle) {
	if (bundle === null || typeof bundle !== "object" || Array.isArray(bundle)) {
		return null;
	}
	return bundle.ir ?? null;
}

/**
 * One adapter result for one case.
 *
 * `caseDigest` is taken from the corpus manifest, never recomputed from bytes
 * this adapter chose: an adapter that digests its own reading of a case can
 * agree with itself about a case it misread.
 *
 * `suppressions` are deliberately dropped. A suppression records that a rule
 * did not run because its declared input was absent, and the result contract
 * admits no member for one; carrying it as a diagnostic would invent a
 * disagreement the reader did not make.
 */
function answer(entry, digest, version, schemas) {
	const bundle = buildInput(entry);
	const admission = admitIr(bundle, { schemas });
	const result = {
		adapter: ADAPTER_ID,
		adapterVersion: version,
		caseId: entry.id,
		caseDigest: digest,
		support: "supported",
		resultState: admission.resultState,
		diagnostics: admission.diagnostics.map((located) => ({
			pointer: located.pointer,
			diagnostic: located.diagnostic,
		})),
		normalized: normalizeIrForTarget(irOf(bundle)),
	};
	if (entry.kind === "compatibility") {
		const beforeBundle = buildBefore(entry);
		const beforeAdmission = admitIr(beforeBundle, { schemas });
		result.classification = classifySurface(irOf(beforeBundle), irOf(bundle), {
			consumerPolicy: bundle.consumerPolicy ?? null,
			beforeInvalid: beforeAdmission.resultState === "invalid",
			afterInvalid: admission.resultState === "invalid",
		}).classification;
	}
	return result;
}

function main() {
	const { manifest, cases } = loadCorpus();
	const digests = new Map(manifest.cases.map((row) => [row.id, row.digest]));
	const version = adapterVersion();
	// The schemas are read once and reused, so the answer for case 111 is
	// computed from the same bytes as the answer for case 1.
	const schemas = SCHEMA_FILES.map(readSchema);
	const results = cases.map((entry) =>
		answer(entry, digests.get(entry.id), version, schemas),
	);
	process.stdout.write(`${JSON.stringify(results)}\n`);
}

main();
