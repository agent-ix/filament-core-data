/**
 * NFR-038 — the Rust gates are runnable from one named target and one lane.
 * Test cases TC-1396..TC-1402 of `spec/tests.md`.
 *
 * These read the `Makefile` and the workflow rather than running them, because
 * the property is about *reachability*: whether a gate can be started, by a
 * reader who knows only what this repository documents. A suite that ran the
 * gates would measure whether they pass, which `make test-rust` already
 * measures and which is a different question.
 *
 * The one thing deliberately not asserted here is that the lane's gates are
 * green. That is measured by running them, and a static assertion that they are
 * green would be a claim this file cannot support.
 */

import { readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

const WORKFLOW_DIR = ".github/workflows";
const RUST_WORKFLOW = `${WORKFLOW_DIR}/rust.yml`;

/** The recipe lines of one `make` target, up to the next blank-separated block. */
function recipeOf(makefile: string, target: string): string[] {
	const lines = makefile.split("\n");
	const start = lines.findIndex((line) => line.startsWith(`${target}:`));
	if (start < 0) return [];
	const out: string[] = [lines[start]];
	for (const line of lines.slice(start + 1)) {
		if (!line.startsWith("\t") && line.trim() !== "") break;
		out.push(line);
	}
	return out;
}

/** Every prerequisite named on a target's own line. */
function prerequisitesOf(makefile: string, target: string): string[] {
	const head = recipeOf(makefile, target)[0] ?? "";
	return head
		.slice(head.indexOf(":") + 1)
		.split(/\s+/)
		.filter((name) => name.length > 0);
}

describe("TC-1396..1402 the Rust gates are reachable (NFR-038)", () => {
	/** Traces: TC-1396; NFR-038-AC-1, NFR-038-AC-5. */
	it("names one target that runs the Rust gates, and does not hide them in another toolchain's", () => {
		const makefile = read("Makefile");

		const testRust = prerequisitesOf(makefile, "test-rust");
		expect(testRust).toContain("rust");
		expect(testRust).toContain("extraction-frontend-test");

		const rust = prerequisitesOf(makefile, "rust");
		for (const gate of [
			"rust-check",
			"rust-build",
			"rust-clippy",
			"rust-test",
			"rust-conformance",
		]) {
			expect(rust, `${gate} is not reachable from make rust`).toContain(gate);
		}

		// The defect this criterion exists to prevent: `test-node` ran
		// `$(MAKE) rust`, so the Node lane invoked cargo through a target named
		// for another language, and the Rust gates were absent from the
		// Makefile's own vocabulary.
		const testNode = recipeOf(makefile, "test-node").join("\n");
		expect(testNode).not.toContain("rust");
		expect(testNode).not.toContain("cargo");

		console.log(
			`TC-1396 measured: make test-rust → ${testRust.join(" ")}; make rust → ${rust.join(" ")}`,
		);
	});

	/** Traces: TC-1397; NFR-038-AC-2. */
	it("triggers every workflow only by dispatch", () => {
		const workflows = readdirSync(resolve(root, WORKFLOW_DIR)).filter((name) =>
			name.endsWith(".yml"),
		);
		expect(workflows).toContain("rust.yml");

		for (const name of workflows) {
			const text = read(`${WORKFLOW_DIR}/${name}`);
			const triggers = text.slice(text.indexOf("\non:"));
			const head = triggers.split("\njobs:")[0];
			expect(head, `${name} declares a push trigger`).not.toMatch(/^\s+push:/m);
			expect(head, `${name} declares a pull_request trigger`).not.toMatch(
				/^\s+pull_request:/m,
			);
			expect(head, `${name} declares a schedule trigger`).not.toMatch(
				/^\s+schedule:/m,
			);
			expect(head, `${name} has no workflow_dispatch`).toMatch(
				/^\s+workflow_dispatch:/m,
			);
		}
		console.log(
			`TC-1397 measured: ${workflows.length} workflows, all workflow_dispatch only`,
		);
	});

	/** Traces: TC-1398; NFR-038-AC-3. */
	it("runs the Rust lane on two platforms and reports both", () => {
		const workflow = read(RUST_WORKFLOW);
		expect(workflow).toContain("ubuntu-latest");
		expect(workflow).toContain("macos-latest");

		// Cancelling the sibling on first failure hides the single-platform
		// defect the matrix exists to find, so the matrix is only as good as
		// this line.
		expect(workflow).toMatch(/fail-fast:\s*false/);
		console.log(
			"TC-1398 measured: matrix = ubuntu-latest (x86_64), macos-latest (arm64), fail-fast false",
		);
	});

	/** Traces: TC-1399; NFR-038-AC-4. */
	it("lints every workspace member rather than one crate", () => {
		const makefile = read("Makefile");
		const clippy = recipeOf(makefile, "rust-clippy").join("\n");
		expect(clippy).toContain("--workspace");
		expect(clippy).toContain("-D warnings");

		// `--no-deps` keeps the gate about this workspace's own code; without it
		// the gate would report a dependency's lints and stop being actionable.
		expect(clippy).toContain("--no-deps");

		const members = read("Cargo.toml");
		expect(members).toContain("crates/");
		console.log(
			"TC-1399 measured: rust-clippy runs --workspace --no-deps -D warnings",
		);
	});

	/** Traces: TC-1400; NFR-038-AC-6. */
	it("records each platform's generated crates for a later comparison", () => {
		const workflow = read(RUST_WORKFLOW);
		expect(workflow).toContain("upload-artifact");
		expect(workflow).toContain("test/fixtures/rust-serde/goldens/");

		// `if-no-files-found: error` is what stops the cross-platform evidence
		// being an empty artifact that uploads successfully and proves nothing.
		expect(workflow).toContain("if-no-files-found: error");
		console.log(
			"TC-1400 measured: both platforms upload generated crates, empty upload is an error",
		);
	});

	/** Traces: TC-1401; NFR-038-AC-7. */
	it("fails naming an absent toolchain rather than skipping", () => {
		const makefile = read("Makefile");
		const check = recipeOf(makefile, "rust-toolchain-check").join("\n");
		expect(check).toContain("cargo is not on PATH");
		expect(check).toContain("failure rather than a skip");
		expect(check).toContain("exit 1");

		const extraction = recipeOf(makefile, "extraction-frontend-toolchain").join(
			"\n",
		);
		expect(extraction).toContain("is not installed");
		expect(extraction).toContain("failure rather than a skip");

		// Every Rust gate depends on a toolchain check, so an absent toolchain
		// reds the gate that needed it instead of failing later with an opaque
		// command-not-found.
		for (const gate of ["rust-build", "rust-test", "rust-clippy"]) {
			expect(prerequisitesOf(makefile, gate)).toContain("rust-toolchain-check");
		}
		console.log(
			"TC-1401 measured: both toolchain checks exit non-zero naming the toolchain",
		);
	});

	/** Traces: TC-1402; NFR-038-AC-1. */
	it("installs the qualification toolchain from the one place that names it", () => {
		const workflow = read(RUST_WORKFLOW);
		const makefile = read("Makefile");

		// NFR-033 names the qualification toolchain once, in the Makefile. The
		// lane asks for it rather than restating it, so a version bump cannot
		// leave the workflow pinned to the old one.
		expect(workflow).toContain("print-extraction-toolchain");
		expect(workflow).not.toContain("1.98.1");
		expect(makefile).toContain("EXTRACTION_TOOLCHAIN ?= 1.98.1");
		console.log(
			"TC-1402 measured: the lane reads the toolchain from make, and names no version of its own",
		);
	});
});
