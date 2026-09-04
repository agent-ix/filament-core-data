/**
 * The divergence audit (issue #20, FR-037).
 *
 * This is the only conformance entry point that reads a clock: it reports every
 * divergence-register entry whose `reviewBy` date has passed. The harness stays
 * clock-free so that its report is a function of the corpus and the adapter
 * results alone.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { ROOT } from "../corpus.mjs";

const register = JSON.parse(
	readFileSync(join(ROOT, "divergences.json"), "utf8"),
);
const today = new Date().toISOString().slice(0, 10);
const expired = register.divergences.filter((entry) => entry.reviewBy < today);

for (const entry of expired) {
	process.stdout.write(
		`expired ${entry.id}: ${entry.case} on ${entry.adapter}, review due ${entry.reviewBy}, owner ${entry.owner} (${entry.owningIssue})\n`,
	);
}
process.stdout.write(
	`${register.divergences.length} divergence(s) registered, ${expired.length} past review\n`,
);
process.exit(expired.length > 0 ? 1 : 0);
