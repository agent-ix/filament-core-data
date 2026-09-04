#!/usr/bin/env node
/**
 * Semantic-core JSON Schema projection (FR-033).
 *
 * Runs the official `@typespec/json-schema` emitter through `tsp compile`,
 * applies the pinned issue #31 `$id` normalization (absolute `$id` for any
 * schema the emitter left relative; a recorded no-op when none is relative),
 * and writes `generated/toolchain.json` with the exact compiler, emitter, and
 * normalization versions plus a digest over the emitted files.
 *
 *   node packages/semantic-core/scripts/generate.mjs          # regenerate
 *   node packages/semantic-core/scripts/generate.mjs --check  # fail on any byte difference
 */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
	mkdtempSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(packageRoot, "../..");
const outputDir = resolve(packageRoot, "generated/json-schema");
const toolchainPath = resolve(packageRoot, "generated/toolchain.json");
const NORMALIZATION = {
	name: "issue-31-absolute-id",
	version: "1.0.0",
	issue: "https://github.com/agent-ix/filament-core-data/issues/31",
};

function version(name) {
	return JSON.parse(
		readFileSync(
			resolve(repoRoot, "node_modules", name, "package.json"),
			"utf8",
		),
	).version;
}

function packageBase() {
	const manifest = JSON.parse(
		readFileSync(resolve(packageRoot, "package.json"), "utf8"),
	);
	const source = readFileSync(resolve(packageRoot, "main.tsp"), "utf8");
	const declared = source.match(/@jsonSchema\("([^"]+)"\)/)?.[1];
	if (!declared) throw new Error("main.tsp declares no @jsonSchema base");
	const expected = `https://schemas.agent-ix.org/semantic-core/${manifest.version}/`;
	if (declared !== expected)
		throw new Error(
			`@jsonSchema base ${declared} does not match package version ${manifest.version}`,
		);
	return declared;
}

/** Issue #31: rewrite any relative `$id` to an absolute one under the package base. */
function normalize(files, base) {
	const rewritten = [];
	for (const [name, schema] of files) {
		if (typeof schema.$id === "string" && !/^https?:\/\//.test(schema.$id)) {
			schema.$id = `${base}${schema.$id}`;
			rewritten.push(name);
		}
	}
	return rewritten;
}

function formatJson(name, text) {
	return execFileSync(
		"pnpm",
		["exec", "biome", "format", `--stdin-file-path=${name}`],
		{
			cwd: repoRoot,
			input: text,
			encoding: "utf8",
			stdio: ["pipe", "pipe", "pipe"],
		},
	);
}

function emit() {
	const base = packageBase();
	const scratch = mkdtempSync(join(tmpdir(), "semantic-core-emit-"));
	try {
		execFileSync(
			"pnpm",
			[
				"exec",
				"tsp",
				"compile",
				packageRoot,
				"--option",
				`@typespec/json-schema.emitter-output-dir=${scratch}`,
			],
			{ cwd: repoRoot, stdio: "pipe" },
		);
		const files = new Map(
			readdirSync(scratch)
				.filter((name) => name.endsWith(".json"))
				.sort()
				.map((name) => [
					name,
					JSON.parse(readFileSync(join(scratch, name), "utf8")),
				]),
		);
		const rewritten = normalize(files, base);
		const rendered = new Map(
			[...files].map(([name, schema]) => [
				name,
				formatJson(
					name,
					`${JSON.stringify(schema, null, "	")}
`,
				),
			]),
		);
		const digest = createHash("sha256");
		for (const [name, text] of rendered) digest.update(`${name}\n${text}`);
		const toolchain = {
			compiler: {
				name: "@typespec/compiler",
				version: version("@typespec/compiler"),
			},
			emitter: {
				name: "@typespec/json-schema",
				version: version("@typespec/json-schema"),
			},
			normalization: {
				...NORMALIZATION,
				applied: rewritten.length > 0,
				rewrittenFiles: rewritten,
				note:
					rewritten.length === 0
						? "no-op: the emitter produced no relative $id"
						: undefined,
			},
			base,
			files: [...rendered.keys()],
			digest: `sha256:${digest.digest("hex")}`,
		};
		return {
			rendered,
			toolchain: formatJson(
				"toolchain.json",
				`${JSON.stringify(toolchain, null, "	")}
`,
			),
		};
	} finally {
		rmSync(scratch, { recursive: true, force: true });
	}
}

function main() {
	const check = process.argv.includes("--check");
	const { rendered, toolchain } = emit();
	if (check) {
		const problems = [];
		for (const [name, text] of rendered) {
			const path = join(outputDir, name);
			let current;
			try {
				current = readFileSync(path, "utf8");
			} catch {
				current = undefined;
			}
			if (current !== text) problems.push(relative(repoRoot, path));
		}
		const committed = readdirSync(outputDir).filter((name) =>
			name.endsWith(".json"),
		);
		for (const name of committed)
			if (!rendered.has(name))
				problems.push(`${relative(repoRoot, join(outputDir, name))} (stale)`);
		let currentToolchain;
		try {
			currentToolchain = readFileSync(toolchainPath, "utf8");
		} catch {
			currentToolchain = undefined;
		}
		if (currentToolchain !== toolchain)
			problems.push(relative(repoRoot, toolchainPath));
		if (problems.length > 0) {
			console.error(
				`semantic-core projection differs from the committed output:\n  ${problems.join("\n  ")}`,
			);
			process.exit(1);
		}
		console.log(
			`semantic-core projection is up to date (${rendered.size} files)`,
		);
		return;
	}
	rmSync(outputDir, { recursive: true, force: true });
	mkdirSync(outputDir, { recursive: true });
	for (const [name, text] of rendered)
		writeFileSync(join(outputDir, name), text);
	writeFileSync(toolchainPath, toolchain);
	console.log(`semantic-core projection written (${rendered.size} files)`);
}

main();
