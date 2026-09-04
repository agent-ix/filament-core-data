import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { reachableSymbols } from "../src/compiler/backends/typescript-v1/package-layout.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fixture = resolve(root, "test/fixtures/backends/typescript");
const expected = resolve(fixture, "expected");
const tsc = resolve(root, "node_modules/.bin/tsc");

function runTsc(...args: string[]): string {
	try {
		return execFileSync(tsc, args, {
			cwd: root,
			encoding: "utf8",
			stdio: "pipe",
		});
	} catch (error) {
		const failed = error as { stdout?: Buffer; stderr?: Buffer };
		return `${failed.stdout?.toString() ?? ""}${failed.stderr?.toString() ?? ""}`;
	}
}

function fixtureFiles(directory: string): { path: string; text: string }[] {
	const files: { path: string; text: string }[] = [];
	for (const entry of readdirSync(directory)) {
		const path = resolve(directory, entry);
		if (statSync(path).isDirectory()) {
			files.push(...fixtureFiles(path));
			continue;
		}
		files.push({
			path: relative(expected, path),
			text: readFileSync(path, "utf8"),
		});
	}
	return files;
}

describe("TypeScript backend fixture (FR-071)", () => {
	it("typechecks the generated package and the positive type-level program", () => {
		expect(
			runTsc("--project", resolve(fixture, "tsconfig.json"), "--noEmit"),
		).toBe("");
	});

	it("rejects each negative type fixture for its declared reason", () => {
		const expectedCodes: Record<string, string> = {
			"invalid-enum.ts": "TS2322",
			"missing-required.ts": "TS2741",
			"removed-export.ts": "TS2305",
			"undefined-optional.ts": "TS2375",
		};
		for (const [name, code] of Object.entries(expectedCodes)) {
			const output = runTsc(
				"--noEmit",
				"--target",
				"ES2022",
				"--module",
				"ESNext",
				"--moduleResolution",
				"bundler",
				"--strict",
				"--exactOptionalPropertyTypes",
				resolve(fixture, "negative", name),
			);
			expect(output, name).toContain(code);
		}
	});

	it("keeps the generated package's reachable entry surface bounded", () => {
		const reachable = reachableSymbols(fixtureFiles(expected), "Node");
		expect(reachable).toEqual([
			"types.ts:Count",
			"types.ts:Millis",
			"types.ts:Node",
			"types.ts:NodeRef",
			"types.ts:NodeRefOf",
			"types.ts:Payload",
			"types.ts:Status",
			"types.ts:Text",
			"types.ts:TextList",
			"types.ts:TextMap",
		]);
	});

	it("records a content-addressed artifact listing without ambient npm", () => {
		const listing = fixtureFiles(expected)
			.map(({ path, text }) => ({
				path,
				size: Buffer.byteLength(text),
				sha256: createHash("sha256").update(text).digest("hex"),
			}))
			.sort((left, right) => left.path.localeCompare(right.path));
		expect(listing).toEqual(
			JSON.parse(
				readFileSync(
					resolve(fixture, "bundle-surface/archive-listing.json"),
					"utf8",
				),
			),
		);
	});
});
