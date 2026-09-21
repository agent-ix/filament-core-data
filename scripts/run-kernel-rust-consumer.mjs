#!/usr/bin/env node
/** Build and execute the FR-089 Rust consumer against an unpacked crate. */

import {
	cpSync,
	existsSync,
	mkdtempSync,
	mkdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const KERNEL = join(ROOT, "packages/semantic-kernel/rust");
const CONSUMER = join(ROOT, "crates/kernel-consumer");
const CRATE = "agent-ix-semantic-kernel-0.2.0";
const GOLDEN = join(
	ROOT,
	"packages/semantic-kernel/parity/golden/PAR-0001.json",
);
const CONSTRAINT_GOLDEN = join(
	ROOT,
	"packages/semantic-kernel/parity/golden/PAR-0027.json",
);
const CLOSURES = join(ROOT, "packages/semantic-kernel/examples/closures.json");

function run(command, args, options) {
	try {
		return execFileSync(command, args, { encoding: "utf8", ...options });
	} catch (error) {
		const output = `${error.stdout ?? ""}${error.stderr ?? ""}`;
		throw new Error(`${command} ${args.join(" ")} failed:\n${output}`);
	}
}

function recordClosure(metadata) {
	const current = existsSync(CLOSURES)
		? JSON.parse(readFileSync(CLOSURES, "utf8"))
		: { $comment: "FR-089. Written by the consumer execution harnesses." };
	current.rust = {
		packages: metadata.packages
			.map(({ name, version }) => ({ name, version }))
			.sort((left, right) =>
				left.name < right.name ? -1 : left.name > right.name ? 1 : 0,
			),
	};
	writeFileSync(CLOSURES, `${JSON.stringify(current, null, "\t")}\n`);
}

const scratch = mkdtempSync(join(tmpdir(), "fcd-kernel-rust-consumer-"));
try {
	if (
		readFileSync(join(CONSUMER, "fixtures/PAR-0001.json"), "utf8") !==
		readFileSync(GOLDEN, "utf8")
	) {
		throw new Error("the Rust consumer fixture diverged from golden PAR-0001");
	}
	if (
		readFileSync(join(CONSUMER, "fixtures/PAR-0027.json"), "utf8") !==
		readFileSync(CONSTRAINT_GOLDEN, "utf8")
	) {
		throw new Error("the Rust consumer fixture diverged from golden PAR-0027");
	}
	const target = join(scratch, "target");
	run(
		"cargo",
		["package", "--offline", "--no-verify", "--target-dir", target],
		{
			cwd: KERNEL,
		},
	);
	const build = join(scratch, "build");
	mkdirSync(build, { recursive: true });
	run("tar", ["-xzf", join(target, "package", `${CRATE}.crate`), "-C", build]);
	cpSync(CONSUMER, join(build, "kernel-consumer"), { recursive: true });
	const output = run("cargo", ["test", "--offline"], {
		cwd: join(build, "kernel-consumer"),
		env: { ...process.env, CARGO_TARGET_DIR: join(scratch, "consumer-target") },
	});
	process.stdout.write(output);
	recordClosure(
		JSON.parse(
			run("cargo", ["metadata", "--offline", "--format-version", "1"], {
				cwd: join(build, "kernel-consumer"),
			}),
		),
	);
} finally {
	rmSync(scratch, { recursive: true, force: true });
}
