/** Every mutation operator keeps finding a site, so the catalogue cannot shrink unseen. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BACKEND_DIRECTORY } from "../src/compiler/backends/rust-serde/branches.mjs";
import {
	OPERATORS,
	targetSet,
} from "../src/compiler/backends/rust-serde/mutations.mjs";

describe("Rust/Serde mutation operators (FR-062)", () => {
	/** Trace: FR-062-AC-9 */
	it("every pattern of every operator matches a site in the target set", () => {
		const texts = (targetSet(BACKEND_DIRECTORY) as string[]).map((target) =>
			readFileSync(join(BACKEND_DIRECTORY, target), "utf8"),
		);
		for (const operator of OPERATORS as unknown as {
			id: string;
			patterns: [RegExp, string][];
		}[])
			for (const [pattern] of operator.patterns)
				expect(
					texts.some((text) => pattern.test(text)),
					`${operator.id}: ${pattern}`,
				).toBe(true);
	});
});
