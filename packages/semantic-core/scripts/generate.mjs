#!/usr/bin/env node
/**
 * Semantic-core JSON Schema projection (FR-033).
 *
 * Runs the official `@typespec/json-schema` emitter through `tsp compile`,
 * applies the issue #31 `$id` normalization (absolute `$id` for any
 * schema the emitter left relative).
 *
 *   node packages/semantic-core/scripts/generate.mjs          # regenerate
 *   node packages/semantic-core/scripts/generate.mjs --check  # fail on any byte difference
 */

import { execFileSync } from "node:child_process";
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
function packageBase() {
	const source = readFileSync(resolve(packageRoot, "main.tsp"), "utf8");
	const declared = source.match(/@jsonSchema\("([^"]+)"\)/)?.[1];
	if (!declared) throw new Error("main.tsp declares no @jsonSchema base");
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

/**
 * JSON Schema treats unknown extension keywords as annotations.  The TypeSpec
 * emitter owns the validation vocabulary; this deterministic post-processing
 * records the semantic identity that the emitted schema realizes without
 * changing how any conforming validator evaluates it.
 */
function annotateSemanticIdentity(files) {
	for (const [name, schema] of files) {
		const typeName = name.replace(/\.json$/, "");
		schema["x-agent-ix-semantic-id"] =
			`ix://agent-ix/semantic-core/${typeName}`;
	}
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
		normalize(files, base);
		annotateSemanticIdentity(files);
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
		return rendered;
	} finally {
		rmSync(scratch, { recursive: true, force: true });
	}
}

function main() {
	const check = process.argv.includes("--check");
	const rendered = emit();
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
		let committed = [];
		try {
			committed = readdirSync(outputDir).filter((name) =>
				name.endsWith(".json"),
			);
		} catch {
			problems.push(
				`${relative(repoRoot, outputDir)} (missing; run make semantic-core-generate)`,
			);
		}
		for (const name of committed)
			if (!rendered.has(name))
				problems.push(`${relative(repoRoot, join(outputDir, name))} (stale)`);
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
	console.log(`semantic-core projection written (${rendered.size} files)`);
}

main();
