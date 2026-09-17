/**
 * FR-130 — the Rust backend's registration in the generation seam.
 * Test cases TC-1388..TC-1395 of `spec/tests.md`.
 *
 * The backend itself is not under test here; `test/rust-backend.test.ts` and the
 * golden crates cover what it emits. What is under test is that the documented
 * entry point reaches it, and that reaching it changes nothing.
 *
 * The load-bearing case is TC-1390. A registration that produced *plausible*
 * output would pass every other case in this file while being a second
 * implementation of the backend — so the seam's bytes are compared to the
 * backend's own, path by path, and any difference fails. That is also why the
 * comparison runs the real emitting path rather than asserting against a
 * fixture this file wrote: a fixture the test authors cannot be evidence that
 * two producers agree.
 */

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { rustBackend } from "../src/compiler/backends/rust-serde/backend.mjs";
import { generateRust } from "../src/compiler/backends/rust-serde/index.mjs";
import {
	declaredUnimplemented,
	generateTarget,
	registryWith,
	selectBackend,
} from "../src/compiler/backends/seam.mjs";
import {
	CONSTRUCT_KINDS,
	RENDERED_CONSTRUCT_KINDS,
} from "../src/compiler/constructs.mjs";
import { createHost } from "../src/compiler/host.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (path: string) =>
	JSON.parse(readFileSync(resolve(root, path), "utf8"));

type Manifest = {
	state: string;
	backend: string;
	files: { path: string; digest: string; mediaType: string }[];
	diagnostics: { code: string; message: string; blocking?: boolean }[];
};

/** A generation request for the `rust` target over an accepted `1.2.0` document. */
function rustRequest(overrides: Record<string, unknown> = {}) {
	return {
		contractVersion: "1.0.0",
		lockFingerprint: `sha256:${"a".repeat(64)}`,
		ir: readJson("fixtures/semantic/v1/positive/config-version-v1-2.json"),
		profile: readJson("fixtures/semantic/v1/positive/profile.json"),
		mappings: [],
		backend: {
			identity: rustBackend.identity,
			version: rustBackend.version,
			supportedIrVersions: [...rustBackend.supportedIrVersions],
			supportedFeatures: [...rustBackend.supportedFeatures],
			options: {},
		},
		outputRoot: "generated/rust",
		limits: {
			maxInputBytes: 33554432,
			maxDepth: 256,
			maxNodes: 1000000,
			maxCollectionItems: 100000,
			maxDiagnostics: 1000,
		},
		...overrides,
	};
}

const host = () => createHost({ readRoots: [root] });

describe("TC-1388..1395 the Rust backend reached through the seam (FR-130)", () => {
	/** Traces: TC-1388; FR-130-AC-1. */
	it("generates a crate for the rust target rather than refusing it", () => {
		const manifest = generateTarget(rustRequest(), {
			target: "rust",
			host: host(),
		}) as never as Manifest;

		expect(manifest.state).toBe("success");
		expect(manifest.files.length).toBeGreaterThan(0);
		expect(
			manifest.diagnostics.filter((d) => d.blocking === true),
		).toStrictEqual([]);
		expect(manifest.files.map((f) => f.path)).toContain("src/lib.rs");
		console.log(
			`TC-1388 measured: rust target state=${manifest.state} files=${manifest.files.length} blocking=0`,
		);
	});

	/** Traces: TC-1389; FR-130-AC-2. */
	it("names the Rust backend's own identity, not the TypeScript backend's", () => {
		const manifest = generateTarget(rustRequest(), {
			target: "rust",
			host: host(),
		}) as never as Manifest;

		expect(manifest.backend).toBe(rustBackend.identity);
		expect(manifest.backend).not.toContain("typescript");
		console.log(`TC-1389 measured: manifest backend=${manifest.backend}`);
	});

	/**
	 * Traces: TC-1390; FR-130-AC-3, FR-130-CON-1.
	 *
	 * The seam is a route, not a reimplementation. Both sides run here: the
	 * seam's manifest carries a digest per path, and the backend's own writing
	 * entry point is run against an in-memory sink so its bytes are captured
	 * without touching a disk. A digest computed from those bytes must equal the
	 * one the seam recorded, at every path, with no path on either side missing.
	 */
	it("emits bytes identical to the backend's own entry point at every path", async () => {
		const { createHash } = await import("node:crypto");
		const manifest = generateTarget(rustRequest(), {
			target: "rust",
			host: host(),
		}) as never as Manifest;

		const written = new Map<string, string>();
		generateRust(rustRequest(), {
			clear() {},
			write(_outputRoot: string, path: string, text: string) {
				written.set(path, text);
			},
		});

		expect(written.size).toBeGreaterThan(0);
		expect([...written.keys()].sort()).toStrictEqual(
			manifest.files.map((f) => f.path).sort(),
		);
		for (const entry of manifest.files) {
			const text = written.get(entry.path) as string;
			const digest = `sha256:${createHash("sha256").update(text, "utf8").digest("hex")}`;
			expect(digest, `bytes differ at ${entry.path}`).toBe(entry.digest);
		}
		console.log(
			`TC-1390 measured: ${manifest.files.length} paths byte-identical between the seam and generateRust`,
		);
	});

	/**
	 * Traces: TC-1391; FR-130-AC-4.
	 *
	 * `src/identity.rs` renders `GENERATOR_IDENTITY` from the request's backend
	 * descriptor, so a caller that selected one target while sending another
	 * backend's descriptor produces a crate that misattributes its own origin.
	 * The command line built that descriptor from the TypeScript backend
	 * unconditionally; while TypeScript was the only implemented target the
	 * error could not be observed.
	 */
	it("renders the Rust backend as the generated crate's generator identity", async () => {
		const { createHost: makeHost } = await import("../src/compiler/host.mjs");
		const manifest = generateTarget(rustRequest(), {
			target: "rust",
			host: makeHost({ readRoots: [root] }),
		}) as never as Manifest;
		expect(manifest.state).toBe("success");

		const written = new Map<string, string>();
		generateRust(rustRequest(), {
			clear() {},
			write(_outputRoot: string, path: string, text: string) {
				written.set(path, text);
			},
		});
		// FR-137 moved the generator identity out of `src/identity.rs`, which
		// carries semantic identity, and into `src/provenance.rs`, which is
		// where ADR-0007 puts what a package was generated by. The concept this
		// case is about did not move; only its spelling did.
		const provenanceSource = written.get("src/provenance.rs") as string;

		expect(provenanceSource).toContain(
			`pub const GENERATOR_IDENTITY: &str = "${rustBackend.identity}"`,
		);
		expect(provenanceSource).not.toContain("backend/typescript");
		console.log(
			`TC-1391 measured: src/provenance.rs names ${rustBackend.identity}`,
		);
	});

	/**
	 * Traces: TC-1392; FR-130-AC-5.
	 *
	 * Exercised over a synthetic registration rather than a real target, which
	 * is the reason `selectBackend` carries a registry seam at all: this
	 * assertion used to name `python-pydantic-v2`, and so was an assertion
	 * about issue #23's *absence*. It went red the moment #23 registered its
	 * backend, on a branch that did nothing wrong. Every declared target is
	 * implemented now, so the refusal arm has no real target left to stand on
	 * — and the mechanism it guards outlives all of them.
	 */
	it("still refuses a target this repository has not implemented", () => {
		const registry = registryWith({
			"python-pydantic-v2": declaredUnimplemented(
				"python-pydantic-v2",
				"agent-ix/filament-core-data#23",
			),
		});
		const manifest = generateTarget(rustRequest(), {
			target: "python-pydantic-v2",
			host: host(),
			registry,
		}) as never as Manifest;

		expect(manifest.state).toBe("unavailable");
		expect(manifest.files).toStrictEqual([]);
		const refusal = manifest.diagnostics.find((d) =>
			d.code.endsWith("BACKEND_NOT_IMPLEMENTED"),
		);
		expect(refusal?.message).toContain("agent-ix/filament-core-data#23");
		console.log(
			`TC-1392 measured: an unimplemented registration state=${manifest.state} code=${refusal?.code}`,
		);
	});

	/**
	 * Traces: TC-1393; FR-130-AC-6, FR-130-CON-3.
	 *
	 * The backend's own command accepts `1.0.0`; the seam does not. The frozen
	 * FR-041 prototype document also calls itself `1.0.0` and is a different
	 * shape entirely, so a seam that accepted the version would make a
	 * prototype-shaped document reachable by the contract path. The TypeScript
	 * backend narrows for the same reason.
	 */
	it("refuses a 1.0.0 document with the versions it declares", () => {
		const request = rustRequest({
			ir: readJson("fixtures/semantic/v1/positive/config-version-v1-1.json"),
		});
		const ir = request.ir as Record<string, unknown>;
		ir.contractVersion = "1.0.0";
		// A 1.0.0 document declares the JSON Schema dialect; without it the
		// request is refused as `invalid` before the seam reaches its version
		// check, and the case would assert the wrong refusal.
		ir.source = {
			...(ir.source as Record<string, unknown>),
			dialect: "https://json-schema.org/draft/2020-12/schema",
		};
		const manifest = generateTarget(request, {
			target: "rust",
			host: host(),
		}) as never as Manifest;

		expect(manifest.state).toBe("unsupported");
		expect(manifest.files).toStrictEqual([]);
		const refusal = manifest.diagnostics.find((d) =>
			d.code.endsWith("UNSUPPORTED_IR_VERSION"),
		);
		expect(refusal?.message).toContain("1.1.0, 1.2.0");
		expect(rustBackend.supportedIrVersions).toStrictEqual(["1.1.0", "1.2.0"]);
		console.log(
			`TC-1393 measured: 1.0.0 document state=${manifest.state} declared=${rustBackend.supportedIrVersions.join(",")}`,
		);
	});

	it("generates a crate from a 1.1.0 document", () => {
		const manifest = generateTarget(
			rustRequest({
				ir: readJson("fixtures/semantic/v1/positive/config-version-v1-1.json"),
			}),
			{ target: "rust", host: host() },
		) as never as Manifest;

		expect(manifest.state).toBe("success");
		expect(manifest.files.map((f) => f.path)).toContain("src/lib.rs");
	});

	/** Traces: TC-1749; FR-142-AC-5, FR-142-CON-2. */
	it("refuses every construct kind it does not render and every model member at its pointer and writes no file", () => {
		const constructs = readJson(
			"fixtures/semantic/v1/positive/semantic-ir-v1-2-constructs.json",
		) as { types: { kind: string }[] };
		const manifest = generateTarget(rustRequest({ ir: constructs }), {
			target: "rust",
			host: host(),
		}) as never as Manifest;

		expect(manifest.state).toBe("unsupported");
		expect(manifest.files).toStrictEqual([]);
		const refused = manifest.diagnostics
			.filter((d) => d.code === "agent-ix.rust-backend.UNSUPPORTED_CONSTRUCT")
			.map((d) => d.message);
		for (const kind of CONSTRUCT_KINDS.filter(
			(one) => !RENDERED_CONSTRUCT_KINDS.includes(one),
		))
			expect(
				refused.some((message) =>
					message.endsWith(`contract 1.2.0 kind ${kind}`),
				),
				`no refusal names kind ${kind}`,
			).toBe(true);
		for (const member of [
			"supertypes",
			"abstract",
			"subsets",
			"redefines",
			"frame",
			"requires",
			"ensures",
			"populations",
		])
			expect(
				refused.some((message) => message.endsWith(` ${member}`)),
				`no refusal names ${member}`,
			).toBe(true);
	});

	/** Traces: TC-1762; FR-054-AC-16, FR-058-AC-13. */
	it("renders an entity by the kind:entity row with IDENTITY_FIELDS beside the record struct", () => {
		const ir = readJson(
			"fixtures/semantic/v1/positive/config-version-v1-2.json",
		) as {
			types: {
				kind: string;
				displayName: string;
				identityFields?: string[];
				fields?: { name: string; identity: string }[];
			}[];
		};
		const entity = ir.types.find(
			(type) => type.displayName === "ConfigVersion",
		);
		const id = entity?.fields?.find((field) => field.name === "id");
		if (!entity || !id) throw new Error("ConfigVersion declares no id field");
		entity.kind = "entity";
		entity.identityFields = [id.identity];

		const manifest = generateTarget(rustRequest({ ir }), {
			target: "rust",
			host: host(),
		}) as never as Manifest;
		expect(manifest.state).toBe("success");
		expect(manifest.diagnostics).toStrictEqual([]);

		const written = new Map<string, string>();
		generateRust(rustRequest({ ir }), {
			clear() {},
			write(_outputRoot: string, path: string, text: string) {
				written.set(path, text);
			},
		});
		const entitySource = written.get("src/types/config_version.rs") as string;
		expect(entitySource).toContain("pub struct ConfigVersion {");
		expect(entitySource).toContain(
			'pub const IDENTITY_FIELDS: &[&str] = &["id"];',
		);
		const recordSource = written.get("src/types/config_overlay.rs") as string;
		expect(recordSource).toContain("pub struct ConfigOverlay {");
		expect(recordSource).not.toContain("IDENTITY_FIELDS");
	});

	/** Traces: TC-1766; FR-055-AC-17. */
	it("names each generated type by its display name while its identity stays the artifact id", () => {
		const ir = readJson(
			"crates/extraction-frontend/fixtures/config-version-table/expected/semantic-ir.json",
		);
		const written = new Map<string, string>();
		generateRust(rustRequest({ ir }), {
			clear() {},
			write(_outputRoot: string, path: string, text: string) {
				written.set(path, text);
			},
		});
		const version = written.get("src/types/config_version.rs");
		expect(version).toBeDefined();
		expect(version).toContain("pub struct ConfigVersion {");
		expect([...written.keys()].some((path) => /fr_00/.test(path))).toBe(false);
		const lib = written.get("src/lib.rs") as string;
		expect(lib).toContain(
			'SemanticType::ConfigVersion => "ix://agent-ix/config-service/type/FR-006"',
		);
		expect(lib).not.toMatch(/\bFr00\d/);
	});

	/** Traces: TC-1394; FR-130-AC-7. */
	it("reports a diagnostic rather than reading the repository without a host", () => {
		const manifest = generateTarget(rustRequest(), {
			target: "rust",
		}) as never as Manifest;

		expect(manifest.state).toBe("invalid");
		expect(manifest.files).toStrictEqual([]);
		expect(manifest.diagnostics.length).toBeGreaterThan(0);
		console.log(
			`TC-1394 measured: hostless rust request state=${manifest.state} diagnostics=${manifest.diagnostics.length}`,
		);
	});

	/**
	 * Traces: TC-1395; FR-130-AC-8, FR-130-CON-2.
	 *
	 * The seam is imported by every generation path, so a file-system reach in
	 * the module it imports for one backend would make the seam impure for all
	 * of them. This is why the adapter is its own module rather than an export
	 * of `rust-serde/index.mjs`, which holds every write the backend performs.
	 */
	it("registers a backend module that names no file-system module", () => {
		const source = readFileSync(
			resolve(root, "src/compiler/backends/rust-serde/backend.mjs"),
			"utf8",
		);
		// Over the module's imports, not over its prose: the header names
		// `node:fs` to say why it is absent, and a substring search would read
		// that explanation as the violation it documents.
		const imported = [
			...source.matchAll(/^import[^;]*?from\s+"([^"]+)";/gm),
		].map((match) => match[1]);
		expect(imported.length).toBeGreaterThan(0);
		expect(imported).not.toContain("node:fs");
		expect(imported).not.toContain("fs");
		expect(imported.filter((name) => name.includes("fs"))).toStrictEqual([]);
		expect(selectBackend("rust").implemented).toBe(true);
		expect(selectBackend("rust").backend).toBe(rustBackend);
		console.log(
			"TC-1395 measured: rust-serde/backend.mjs names no file-system module and is the registered rust backend",
		);
	});
});
