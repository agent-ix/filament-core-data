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
import { createHost } from "../src/compiler/host.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * The constructs fixture's declaration of an identified record carrying no
 * member beyond its fields and identity fields, read from the fixture rather
 * than restated.
 */
function identifiedRecordConstruct(): {
	kind: { module: string; name: string };
	construct: { members: Record<string, string> };
} {
	const fixture = JSON.parse(
		readFileSync(
			resolve(
				root,
				"fixtures/semantic/v1/positive/semantic-ir-v2-constructs.json",
			),
			"utf8",
		),
	) as {
		constructs: {
			kind: { module: string; name: string };
			construct: {
				identity: string;
				shape: string;
				members: Record<string, string>;
			};
		}[];
	};
	const entry = fixture.constructs.find(
		(one) =>
			one.construct.identity === "identified" &&
			one.construct.shape === "record" &&
			Object.entries(one.construct.members)
				.filter(([, presence]) => presence !== "forbidden")
				.map(([member]) => member)
				.sort()
				.join() === "fields,identityFields",
	);
	if (!entry)
		throw new Error("the constructs fixture declares no identified record");
	return entry;
}
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
		ir: readJson("fixtures/semantic/v1/positive/config-version-v2.json"),
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
		expect(refusal?.message).toContain("1.1.0, 2.0.0");
		expect(rustBackend.supportedIrVersions).toStrictEqual(["1.1.0", "2.0.0"]);
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
	it("renders every construct kind by its shape and identity rows and refuses none", () => {
		const constructs = readJson(
			"fixtures/semantic/v1/positive/semantic-ir-v2-constructs.json",
		) as {
			constructs: { kind: { module: string; name: string } }[];
			types: { kind: unknown }[];
		};
		const manifest = generateTarget(rustRequest({ ir: constructs }), {
			target: "rust",
			host: host(),
		}) as never as Manifest;

		expect(manifest.diagnostics.map((d) => [d.code, d.blocking])).toStrictEqual(
			Array(6).fill(["agent-ix.compiler.CONSTRUCT_MEMBER_UNENFORCED", false]),
		);
		expect(manifest.state).toBe("success");
		const written = new Map<string, string>();
		generateRust(rustRequest({ ir: constructs }), {
			clear() {},
			write(_outputRoot: string, path: string, text: string) {
				written.set(path, text);
			},
		});
		const identity = written.get("src/identity.rs");
		if (!identity) throw new Error("no src/identity.rs");
		const declared = new Set(
			constructs.types
				.map((type) => type.kind)
				.filter((kind) => typeof kind === "object")
				.map((kind) => (kind as { name: string }).name),
		);
		for (const entry of constructs.constructs) {
			const kind = entry.kind.name;
			expect(declared.has(kind), `the fixture declares no ${kind}`).toBe(true);
			expect(identity, `no TYPES row of kind ${kind}`).toContain(
				`kind: "${kind}",`,
			);
		}
		expect(identity).toContain("pub const POPULATIONS: &[PopulationMeta]");
	});

	/** Traces: TC-1762; FR-054-AC-16, FR-058-AC-13. */
	it("renders an identified record construct by the shape:record row with IDENTITY_FIELDS beside the record struct", () => {
		const ir = readJson(
			"fixtures/semantic/v1/positive/config-version-v2.json",
		) as {
			constructs: unknown[];
			types: {
				kind: unknown;
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
		const declared = identifiedRecordConstruct();
		ir.constructs = [declared];
		entity.kind = declared.kind;
		entity.identityFields = [id.identity];

		const manifest = generateTarget(rustRequest({ ir }), {
			target: "rust",
			host: host(),
		}) as never as Manifest;
		expect(manifest.state).toBe("success");
		expect(manifest.diagnostics.map((d) => [d.code, d.blocking])).toStrictEqual(
			[["agent-ix.compiler.CONSTRUCT_MEMBER_UNENFORCED", false]],
		);

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
		expect(entitySource).toContain("impl PartialEq for ConfigVersion {");
		expect(entitySource).toContain(
			"impl ::std::hash::Hash for ConfigVersion {",
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

type Json = Record<string, any>;

/** The constructs fixture, a fresh copy per call so a test may edit it. */
const constructsIr = () =>
	readJson("fixtures/semantic/v1/positive/semantic-ir-v2-constructs.json") as {
		types: Json[];
	};

const typeNamed = (ir: { types: Json[] }, displayName: string) => {
	const found = ir.types.find((type) => type.displayName === displayName);
	if (!found) throw new Error(`the fixture declares no ${displayName}`);
	return found;
};

/** Generates `ir` through the seam and captures every module written. */
function generateConstructs(ir: unknown) {
	const manifest = generateTarget(rustRequest({ ir }), {
		target: "rust",
		host: host(),
	}) as never as Manifest;
	const written = new Map<string, string>();
	generateRust(rustRequest({ ir }), {
		clear() {},
		write(_outputRoot: string, path: string, text: string) {
			written.set(path, text);
		},
	});
	const module = (name: string) => {
		const text = written.get(`src/types/${name}.rs`);
		if (text === undefined) throw new Error(`no src/types/${name}.rs`);
		return text;
	};
	const blocking = manifest.diagnostics.filter((d) => d.blocking === true);
	return { manifest, module, blocking };
}

describe("identity, abstract types and member scopes in the Rust backend (FR-054, FR-055)", () => {
	/** Traces: TC-1796; FR-141-AC-9. */
	it("renders a mixed pre list as its clause ids and its inline clauses", () => {
		const written = new Map<string, string>();
		generateRust(rustRequest({ ir: constructsIr() }), {
			clear() {},
			write(_outputRoot: string, path: string, text: string) {
				written.set(path, text);
			},
		});
		const flat = [...written.values()].join("\n").replace(/\s+/g, " ");
		expect(flat).toContain('pre: &["can_ship"], post: &[], origin:');
		expect(flat).toContain(
			'operation: "advance", frame: Some(crate::identity::FrameMeta { modifies: &["current"], creates: &[], deletes: &[], }), pre: &[crate::identity::InlineClauseMeta { language: "quire", text: "to <> current", }], post: &[crate::identity::InlineClauseMeta { language: "quire", text: "current = to", }], }',
		);
	});

	/** Traces: TC-1777; FR-054-AC-18. */
	it("compares and hashes an identified construct by its identity fields and a value object by every member", () => {
		const { manifest, module } = generateConstructs(constructsIr());
		expect(manifest.state).toBe("success");
		for (const [name, typeName] of [
			["order", "Order"],
			["basket", "Basket"],
			["shipment", "Shipment"],
			["order_aggregate", "OrderAggregate"],
			["fulfilment", "Fulfilment"],
		]) {
			const text = module(name);
			expect(text, name).toContain(
				`#[derive(Clone, Debug, Serialize)]\npub struct ${typeName} {`,
			);
			expect(text, name).toContain(
				`impl PartialEq for ${typeName} {\n    fn eq(&self, other: &Self) -> bool {\n        self.id == other.id\n    }\n}`,
			);
			expect(text, name).toContain(`impl Eq for ${typeName} {}`);
			expect(text, name).toContain(
				`impl ::std::hash::Hash for ${typeName} {\n    fn hash<H: ::std::hash::Hasher>(&self, state: &mut H) {\n        ::std::hash::Hash::hash(&self.id, state);\n    }\n}`,
			);
		}
		expect(module("order_line")).toContain(
			"#[derive(Clone, Debug, PartialEq, Serialize)]\npub struct OrderLine {",
		);
		expect(module("order_line")).not.toContain("impl PartialEq");

		// A newtype an identity field reaches derives Eq and Hash.
		const reached = constructsIr();
		const basket = typeNamed(reached, "Basket");
		basket.fields[0].typeRef = typeNamed(reached, "ShipmentCarrier").identity;
		const newtype = generateConstructs(reached);
		expect(newtype.manifest.state).toBe("success");
		expect(newtype.module("shipment_carrier")).toContain(
			"#[derive(Clone, Debug, PartialEq, Eq, Hash, Serialize)]",
		);
		expect(newtype.module("order_note")).toContain(
			"#[derive(Clone, Debug, PartialEq, Serialize)]",
		);

		// An identity field with no Eq and Hash is refused, not compared by value.
		const unhashable = constructsIr();
		typeNamed(unhashable, "Basket").fields[0].typeRef = typeNamed(
			unhashable,
			"Decimal",
		).identity;
		const refused = generateConstructs(unhashable);
		expect(refused.manifest.state).not.toBe("success");
		expect(refused.manifest.files).toStrictEqual([]);
		expect(
			refused.blocking.map((d) => [
				d.code,
				d.message.includes("no Eq and Hash"),
			]),
		).toStrictEqual([["agent-ix.rust-backend.UNSUPPORTED_CONSTRUCT", true]]);
	});

	/** Traces: TC-1778; FR-054-AC-19. */
	it("renders an abstract type as a trait each concrete subtype implements, and refuses a value of it", () => {
		const { manifest, module } = generateConstructs(constructsIr());
		expect(manifest.state).toBe("success");
		const party = module("party");
		expect(party).toContain("pub trait Party {");
		expect(party).toContain("    fn id(&self) -> &crate::support::Uuid;");
		expect(party).not.toContain("pub struct Party");
		expect(party).not.toContain("fn try_new");
		expect(module("order")).toContain(
			"impl crate::types::party::Party for Order {\n    fn id(&self) -> &crate::support::Uuid {\n        &self.id\n    }",
		);

		const holder = constructsIr();
		typeNamed(holder, "Basket").fields[0].typeRef = typeNamed(
			holder,
			"Party",
		).identity;
		const held = generateConstructs(holder);
		expect(held.manifest.files).toStrictEqual([]);
		expect(
			held.blocking.map((d) => [d.code, d.message.includes("abstract type")]),
		).toContainEqual(["agent-ix.rust-backend.UNSUPPORTED_CONSTRUCT", true]);

		// A reference holds an identity, not a value, so it may name Party.
		const referring = constructsIr();
		const reference = JSON.parse(JSON.stringify(typeNamed(referring, "Party")));
		for (const member of [
			"fields",
			"clauses",
			"abstract",
			"identityFields",
			"operations",
			"relationships",
		])
			delete reference[member];
		Object.assign(reference, {
			identity: "ix://agent-ix/orders/type/PartyRef",
			displayName: "PartyRef",
			kind: "reference",
			target: typeNamed(referring, "Party").identity,
		});
		referring.types.push(reference);
		const referred = generateConstructs(referring);
		expect(referred.blocking.map((d) => d.message)).toStrictEqual([]);
		expect(referred.manifest.state).toBe("success");
		expect(referred.module("party_ref")).toContain(
			"crate::support::SemanticIdentity",
		);

		const narrowed = constructsIr();
		const order = typeNamed(narrowed, "Order");
		const labels = order.fields.find((field: Json) => field.name === "labels");
		labels.typeRef = typeNamed(narrowed, "Integer").identity;
		const mismatch = generateConstructs(narrowed);
		expect(mismatch.manifest.files).toStrictEqual([]);
		expect(
			mismatch.blocking.map((d) => [
				d.code,
				d.message.includes("the abstract supertype"),
			]),
		).toStrictEqual([["agent-ix.rust-backend.UNSUPPORTED_CONSTRUCT", true]]);
	});

	/** Traces: TC-1779; FR-055-AC-18. */
	it("refuses an event member named for a constructor or validator, and a type named for a state enum", () => {
		for (const method of ["validate", "try_new"]) {
			const ir = constructsIr();
			const event = typeNamed(ir, "OrderPlaced");
			event.fields[2].name = method;
			const { manifest, blocking } = generateConstructs(ir);
			expect(manifest.files, method).toStrictEqual([]);
			expect(
				blocking.map((d) => [
					d.code,
					d.message.includes(event.fields[2].identity),
				]),
				method,
			).toStrictEqual([["agent-ix.rust-backend.NAME_COLLISION", true]]);
		}

		const ir = constructsIr();
		const status = typeNamed(ir, "OrderStatus");
		status.displayName = "OrderLifecycleState";
		const { manifest, blocking } = generateConstructs(ir);
		expect(manifest.files).toStrictEqual([]);
		const collision = blocking.find((d) => d.code.endsWith("NAME_COLLISION"));
		expect(collision?.message).toContain(status.identity);
		expect(collision?.message).toContain("#states");
	});

	/** Traces: TC-1780; FR-054-AC-20. */
	it("takes &self for a repository operation whose frame is empty and &mut self otherwise", () => {
		const ir = constructsIr();
		const repository = typeNamed(ir, "OrderRepository");
		repository.operations[0].frame = { modifies: [], creates: [], deletes: [] };
		const { manifest, module } = generateConstructs(ir);
		expect(manifest.state).toBe("success");
		const text = module("order_repository");
		expect(text).toContain("fn find_by_id(&self, id: crate::support::Uuid)");
		expect(text).toContain(
			"fn save(&mut self, order: crate::Order) -> crate::Order;",
		);
	});
});
