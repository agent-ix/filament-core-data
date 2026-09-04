import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
	mkdtempSync,
	readFileSync,
	readdirSync,
	rmSync,
	statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { reachableSymbols } from "../src/compiler/backends/typescript-v1/package-layout.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fixture = resolve(root, "test/fixtures/backends/typescript");
const expected = resolve(fixture, "expected");
const tsc = resolve(root, "node_modules/.bin/tsc");
const generator = resolve(root, "src/compiler/cli.mjs");
const fixtureIr = resolve(fixture, "input/semantic-ir.json");

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

function generatedFiles(directory: string): { path: string; text: string }[] {
	const files: { path: string; text: string }[] = [];
	for (const entry of readdirSync(directory)) {
		const path = resolve(directory, entry);
		if (statSync(path).isDirectory()) {
			files.push(...generatedFiles(path));
			continue;
		}
		files.push({
			path: relative(directory, path),
			text: readFileSync(path, "utf8"),
		});
	}
	return files.sort((left, right) => left.path.localeCompare(right.path));
}

function generateSnapshot(cwd: string, output: string, locale: string) {
	execFileSync(
		process.execPath,
		[
			generator,
			"generate",
			"--ir",
			fixtureIr,
			"--target",
			"typescript",
			"--out-root",
			output,
			"--manifest",
			resolve(output, "output-manifest.json"),
		],
		{ cwd, env: { ...process.env, LC_ALL: locale }, stdio: "pipe" },
	);
	return generatedFiles(output);
}

describe("TypeScript backend fixture (FR-071)", () => {
	it("generates byte-identically across directories and C/Turkish locales", () => {
		const scratch = mkdtempSync(
			resolve(tmpdir(), "fcd-typescript-determinism-"),
		);
		try {
			const rootRun = generateSnapshot(root, resolve(scratch, "root"), "C");
			const cwdRun = generateSnapshot(scratch, resolve(scratch, "cwd"), "C");
			const turkishRun = generateSnapshot(
				scratch,
				resolve(scratch, "turkish"),
				"tr_TR.UTF-8",
			);
			expect(cwdRun).toEqual(rootRun);
			expect(turkishRun).toEqual(rootRun);
		} finally {
			rmSync(scratch, { recursive: true, force: true });
		}
	});

	it("keeps generated source self-contained, licensed, and dependency-free", () => {
		const files = fixtureFiles(expected);
		const manifest = JSON.parse(
			readFileSync(resolve(expected, "package.json"), "utf8"),
		) as Record<string, unknown>;
		for (const key of [
			"dependencies",
			"peerDependencies",
			"optionalDependencies",
		]) {
			expect(manifest[key], key).toBeUndefined();
		}
		for (const { path, text } of files.filter(({ path }) =>
			path.endsWith(".ts"),
		)) {
			expect(text, path).toContain("SPDX-License-Identifier: AGPL-3.0-only");
			for (const match of text.matchAll(/from "([^"]+)"/g)) {
				expect(match[1], `${path} imports ${match[1]}`).toMatch(/^\./);
			}
			expect(text, path).not.toContain("@ts-expect-error");
		}
	});

	it("keeps the TypeScript backend's repository reads behind an injected host", () => {
		const backend = readFileSync(
			resolve(root, "src/compiler/backends/typescript-v1/index.mjs"),
			"utf8",
		);
		expect(backend).not.toContain('from "node:fs"');
		expect(backend).toContain("requires options.host.readText");
	});
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
