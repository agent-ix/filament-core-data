#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { compileSemanticIr } from "./compile.mjs";
import { serializeSemanticIr } from "./ir.mjs";

const USAGE = `Usage: node src/compiler/cli.mjs emit-ir --entrypoint <path> [--generator <id>] [--base-dir <path>] --out <path>`;

function parse(argv) {
	const options = {};
	for (let index = 0; index < argv.length; index += 1) {
		const argument = argv[index];
		if (!argument.startsWith("--")) continue;
		const key = argument.slice(2);
		const value = argv[index + 1];
		if (value === undefined || value.startsWith("--")) {
			throw new Error(`Missing value for --${key}\n${USAGE}`);
		}
		options[key] = value;
		index += 1;
	}
	return options;
}

async function main(argv) {
	const [command, ...rest] = argv;
	if (command !== "emit-ir") {
		throw new Error(`Unknown command: ${command ?? "(none)"}\n${USAGE}`);
	}
	const options = parse(rest);
	if (!options.entrypoint)
		throw new Error(`--entrypoint is required\n${USAGE}`);
	if (!options.out) throw new Error(`--out is required\n${USAGE}`);
	const baseDir = options["base-dir"]
		? resolve(options["base-dir"])
		: process.cwd();
	const ir = await compileSemanticIr({
		entrypoint: resolve(options.entrypoint),
		generator: options.generator,
		baseDir,
	});
	const out = resolve(options.out);
	mkdirSync(dirname(out), { recursive: true });
	writeFileSync(out, serializeSemanticIr(ir));
}

main(process.argv.slice(2)).catch((error) => {
	process.stderr.write(`${error.message}\n`);
	process.exitCode = 1;
});
