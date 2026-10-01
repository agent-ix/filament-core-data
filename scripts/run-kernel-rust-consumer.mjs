#!/usr/bin/env node
/** Build and execute the FR-089 Rust consumer against an unpacked crate. */

import {
	cpSync,
	existsSync,
	mkdtempSync,
	mkdirSync,
	readFileSync,
	renameSync,
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
// `cargo package` names the artifact after the crate's own version, read here
// from its manifest rather than restated.
const KERNEL_VERSION = /^version\s*=\s*"([^"]+)"/m.exec(
	readFileSync(join(KERNEL, "Cargo.toml"), "utf8"),
)?.[1];
if (!KERNEL_VERSION) throw new Error("the kernel crate declares no version");
const CRATE = `agent-ix-semantic-kernel-${KERNEL_VERSION}`;
const GOLDEN = join(
	ROOT,
	"packages/semantic-kernel/parity/golden/PAR-0001.json",
);
const CONSTRAINT_GOLDEN = join(
	ROOT,
	"packages/semantic-kernel/parity/golden/PAR-0027.json",
);

function run(command, args, options) {
	try {
		return execFileSync(command, args, { encoding: "utf8", ...options });
	} catch (error) {
		const output = `${error.stdout ?? ""}${error.stderr ?? ""}`;
		throw new Error(`${command} ${args.join(" ")} failed:\n${output}`);
	}
}

/** The resolved closure holds no persistence, Tauri, UI, ORM or framework package. */
const FORBIDDEN =
	/^(sqlx|diesel|rusqlite|sea-orm|tokio-postgres|tauri|gtk|egui|iced|actix-web|axum|rocket)(-|$)/;

function assertClosure(metadata) {
	const found = metadata.packages
		.map(({ name }) => name)
		.filter((name) => FORBIDDEN.test(name));
	if (found.length > 0) {
		throw new Error(`the Rust example's closure holds ${found.join(", ")}`);
	}
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
	// The consumer names the unpacked crate without its version.
	renameSync(join(build, CRATE), join(build, "agent-ix-semantic-kernel"));
	cpSync(CONSUMER, join(build, "kernel-consumer"), { recursive: true });
	const output = run("cargo", ["test", "--offline"], {
		cwd: join(build, "kernel-consumer"),
		env: { ...process.env, CARGO_TARGET_DIR: join(scratch, "consumer-target") },
	});
	process.stdout.write(output);
	assertClosure(
		JSON.parse(
			run("cargo", ["metadata", "--offline", "--format-version", "1"], {
				cwd: join(build, "kernel-consumer"),
			}),
		),
	);
} finally {
	rmSync(scratch, { recursive: true, force: true });
}
