import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
	checkKernelBundle,
	checkKernelFreshness,
	kernelDigest,
	kernelDigestInputs,
} from "../src/compiler/frontend/json-schema/bundle.mjs";
import { DIAGNOSTIC_CODES } from "../src/compiler/diagnostics.mjs";

const root = resolve(import.meta.dirname, "..");
const read = (p: string) =>
	JSON.parse(readFileSync(resolve(root, p), "utf8")) as Record<string, unknown>;

const bundle = read("packages/semantic-kernel/bundle.json");
const inventory = read("packages/semantic-core/inventory.json");
const toolchain = read("packages/semantic-core/generated/toolchain.json");
const manifest = read("packages/semantic-core/package.json");

describe("TC-1000..1008 the kernel bundle declaration (FR-081)", () => {
	// TC-1000
	it("accepts the committed declaration against the committed grammar", () => {
		expect(checkKernelBundle(bundle, inventory, toolchain, manifest)).toEqual(
			[],
		);
	});

	// TC-1001 — the falsification. A predicate that cannot reject accepts
	// everything, and would have reported this bundle clean whatever it said.
	it("rejects a document set that has drifted from the emitter's", () => {
		const drifted = {
			...bundle,
			documents: (bundle.documents as string[]).slice(0, 29).concat(["Bogus.json"]),
		};
		const found = checkKernelBundle(drifted, inventory, toolchain, manifest);
		expect(found).toHaveLength(1);
		expect(found[0]?.code).toBe(DIAGNOSTIC_CODES.KERNEL_INVENTORY_MISMATCH.code);
		// The message names both directions, because a substitution is the case a
		// count comparison passes.
		expect(found[0]?.message).toContain("emitted but undeclared");
		expect(found[0]?.message).toContain("declared but unemitted");
	});

	// TC-1002
	it("rejects a bundle packaging a different semantic-core version than it declares", () => {
		const found = checkKernelBundle(
			{ ...bundle, semanticCore: "9.9.9" },
			inventory,
			toolchain,
			manifest,
		);
		expect(found).toHaveLength(1);
		expect(found[0]?.code).toBe(DIAGNOSTIC_CODES.KERNEL_INVENTORY_MISMATCH.code);
	});

	// TC-1003
	it("reports a stale bundle when the emission digest no longer matches", () => {
		const found = checkKernelBundle(
			{ ...bundle, emissionDigest: `sha256:${"0".repeat(64)}` },
			inventory,
			toolchain,
			manifest,
		);
		expect(found).toHaveLength(1);
		expect(found[0]?.code).toBe(DIAGNOSTIC_CODES.KERNEL_BUNDLE_STALE.code);
	});

	// TC-1004
	it("rejects a declared inventory count the inventory contradicts", () => {
		const counts = bundle.inventoryCounts as Record<string, number>;
		const found = checkKernelBundle(
			{ ...bundle, inventoryCounts: { ...counts, models: 99 } },
			inventory,
			toolchain,
			manifest,
		);
		expect(found).toHaveLength(1);
		expect(found[0]?.message).toContain("99 models");
	});

	// TC-1005
	it("reports every disagreement in one run, not the first", () => {
		const counts = bundle.inventoryCounts as Record<string, number>;
		const found = checkKernelBundle(
			{
				...bundle,
				semanticCore: "9.9.9",
				emissionDigest: `sha256:${"0".repeat(64)}`,
				inventoryCounts: { ...counts, models: 99, enums: 42 },
			},
			inventory,
			toolchain,
			manifest,
		);
		// A caller fixing these one exception at a time learns the count only by
		// iterating; returning diagnostics means one run states it.
		expect(found.length).toBe(4);
	});

	// TC-1006
	it("hashes the path beside the bytes, so two names are two bundles", () => {
		expect(kernelDigest([["a.json", "{}"]])).not.toBe(
			kernelDigest([["b.json", "{}"]]),
		);
		// And is order-independent, because the declaration's order is not the
		// bundle's identity.
		expect(
			kernelDigest([
				["a.json", "{}"],
				["b.json", "[]"],
			]),
		).toBe(
			kernelDigest([
				["b.json", "[]"],
				["a.json", "{}"],
			]),
		);
	});

	// TC-1007
	it("detects a generated tree whose inputs have moved", () => {
		const entries: (readonly [string, string])[] = [
			["a.json", "{}"],
			["b.json", "[]"],
		];
		expect(checkKernelFreshness(kernelDigest(entries), entries)).toEqual([]);

		const moved: (readonly [string, string])[] = [
			["a.json", '{"changed":true}'],
			["b.json", "[]"],
		];
		const stale = checkKernelFreshness(kernelDigest(entries), moved);
		expect(stale).toHaveLength(1);
		expect(stale[0]?.code).toBe(DIAGNOSTIC_CODES.KERNEL_BUNDLE_STALE.code);
		expect(stale[0]?.message).toContain("make semantic-kernel");
	});

	// TC-1008
	it("declares the publication gate rather than leaving it to be inferred", () => {
		const gate = bundle.publicationGate as Record<string, string>;
		expect(gate.issue).toBe("agent-ix/quoin#290");
		expect(gate.state).toBe("not-taken");
		expect(kernelDigestInputs(bundle as { documents: string[] })).toHaveLength(
			30,
		);
	});
});
