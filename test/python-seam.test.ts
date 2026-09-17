/**
 * FR-136 — the Python backends' registration in the generation seam.
 * Test cases TC-1530..TC-1536 of `spec/tests.md`.
 *
 * The generator itself is not under test here; `tests/` covers what it emits
 * and the conformance corpus covers what its types accept. What is under test
 * is that the documented entry point reaches it, that reaching it changes
 * nothing, and that every way of not reaching it is a refusal rather than an
 * empty package.
 *
 * Two cases carry the weight. TC-1535 asserts that the documents handed to the
 * generator are the `json-schema` target's own, under its own names — the
 * emitted documents `$ref` one another by relative file name, so a rename in
 * transit breaks every reference that resolved before it, and would do so
 * silently. TC-1534 drives the failure arm through a substituted command rather
 * than a stub, so the refusal under test is the one a broken environment
 * actually produces.
 *
 * TC-1531 and TC-1532 run the real generator, which is a child process and
 * costs seconds rather than milliseconds. That is the price of testing the
 * registration rather than a description of it.
 */

import { execFileSync } from "node:child_process";
import {
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { jsonSchemaBackend } from "../src/compiler/backends/json-schema-v1/index.mjs";
import {
	pythonDataclassBackend,
	identity as pythonIdentity,
	pythonPydanticBackend,
} from "../src/compiler/backends/python-v1/index.mjs";
import { poetryProducer } from "../src/compiler/backends/python-v1/produce.mjs";
import {
	generateTarget,
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

/** A generation request over an accepted document, `2.0.0` unless one is named. */
function pythonRequest(
	backend: { identity: string; version: string },
	document = "fixtures/semantic/v1/positive/config-version-v2.json",
) {
	return {
		contractVersion: "1.0.0",
		lockFingerprint: `sha256:${"a".repeat(64)}`,
		ir: readJson(document),
		profile: readJson("fixtures/semantic/v1/positive/profile.json"),
		mappings: [],
		backend: {
			identity: backend.identity,
			version: backend.version,
			supportedIrVersions: [...pythonPydanticBackend.supportedIrVersions],
			supportedFeatures: [...pythonPydanticBackend.supportedFeatures],
			options: {},
		},
		outputRoot: "generated/python",
		limits: {
			maxInputBytes: 33554432,
			maxDepth: 256,
			maxNodes: 1000000,
			maxCollectionItems: 100000,
			maxDiagnostics: 1000,
		},
	};
}

const host = () => createHost({ readRoots: [root] });

describe("TC-1530..1536 the Python backends reached through the seam (FR-136)", () => {
	/** Traces: TC-1530; FR-136-AC-1. */
	it("registers both Python targets as implemented under one identity", () => {
		for (const target of ["python-pydantic-v2", "python-dataclass"]) {
			const entry = selectBackend(target);
			expect(entry.implemented, `${target} is not implemented`).toBe(true);
			expect(entry.backend.identity).toBe(pythonIdentity);
			expect(entry.backend.target).toBe(target);
		}
		expect(pythonPydanticBackend.profileId).toBe("pydantic_v2_basemodel");
		expect(pythonDataclassBackend.profileId).toBe("pydantic_v2_dataclass");
		console.log(
			`TC-1530 measured: both Python targets implemented under ${pythonIdentity}`,
		);
	});

	/** Traces: TC-1531; FR-136-AC-2. */
	it("generates a package for the python-pydantic-v2 target", () => {
		const manifest = generateTarget(pythonRequest(pythonPydanticBackend), {
			target: "python-pydantic-v2",
			host: host(),
			produce: poetryProducer(),
		}) as never as Manifest;

		expect(manifest.state).toBe("success");
		expect(manifest.backend).toBe(pythonIdentity);
		expect(
			manifest.diagnostics.filter((d) => d.blocking === true),
		).toStrictEqual([]);
		const paths = manifest.files.map((f) => f.path);
		expect(paths).toContain("__init__.py");
		expect(paths.filter((p) => p.endsWith(".py")).length).toBeGreaterThan(1);
		console.log(
			`TC-1531 measured: python-pydantic-v2 state=${manifest.state} files=${manifest.files.length} blocking=0`,
		);
	}, 300000);

	it("generates a package from a 1.1.0 document", () => {
		const manifest = generateTarget(
			pythonRequest(
				pythonPydanticBackend,
				"fixtures/semantic/v1/positive/config-version-v1-1.json",
			),
			{ target: "python-pydantic-v2", host: host(), produce: poetryProducer() },
		) as never as Manifest;

		expect(manifest.state).toBe("success");
		expect(manifest.files.map((f) => f.path)).toContain("__init__.py");
	}, 300000);

	/** Traces: TC-1765; FR-136-AC-8. */
	it("generates an entity as the record's model class in both Python targets, with its identity fields in the construct module", () => {
		const request = pythonRequest(pythonPydanticBackend);
		const document = request.ir as {
			constructs: unknown[];
			types: {
				kind: unknown;
				displayName: string;
				identityFields?: string[];
				fields?: { name: string; identity: string }[];
			}[];
		};
		const entity = (
			document as {
				types: {
					kind: unknown;
					displayName: string;
					identityFields?: string[];
					fields?: { name: string; identity: string }[];
				}[];
			}
		).types.find((type) => type.displayName === "ConfigVersion");
		const id = entity?.fields?.find((field) => field.name === "id");
		if (!entity || !id) throw new Error("ConfigVersion declares no id field");
		const declared = identifiedRecordConstruct();
		document.constructs = [declared];
		entity.kind = declared.kind;
		entity.identityFields = [id.identity];

		for (const backend of [pythonPydanticBackend, pythonDataclassBackend]) {
			const result = backend.generate(request, {
				produce: poetryProducer(),
			}) as {
				state: string;
				files: { path: string; text: string }[];
			};
			expect(result.state, backend.target).toBe("success");
			const module = result.files.find(
				(file) => file.path === "ConfigVersion.py",
			);
			if (!module) throw new Error(`${backend.target}: no ConfigVersion.py`);
			expect(module.text).toMatch(/^class ConfigVersion\b/m);
			expect(module.text).toMatch(/\bid: /);
			const constructs = result.files.find(
				(file) => file.path === "constructs.py",
			);
			if (!constructs) throw new Error(`${backend.target}: no constructs.py`);
			expect(constructs.text).toContain("'ConfigVersion': ('id',),");
			expect(constructs.text).toContain(
				`'ConfigVersion': '${declared.kind.name}',`,
			);
		}
	}, 300000);

	/** Traces: TC-1775, TC-1776; FR-136-AC-10, FR-142-AC-8. */
	it("renders every construct kind and model member in both Python targets, each class named by its display name", () => {
		const document =
			"fixtures/semantic/v1/positive/semantic-ir-v2-constructs.json";
		const ir = readJson(document) as {
			constructs: { kind: { name: string }; construct: { shape: string } }[];
			types: { kind: string | { name: string }; displayName: string }[];
		};
		for (const backend of [pythonPydanticBackend, pythonDataclassBackend]) {
			const result = backend.generate(pythonRequest(backend, document), {
				produce: poetryProducer(),
			}) as {
				state: string;
				diagnostics: { message: string }[];
				files: { path: string; text: string }[];
			};
			expect(
				result.state,
				`${backend.target}: ${result.diagnostics.map((d) => d.message).join("; ")}`,
			).toBe("success");
			expect(
				(result.diagnostics as { code?: string; blocking?: boolean }[]).map(
					(d) => [d.code, d.blocking],
				),
				backend.target,
			).toEqual(
				Array(6).fill(["agent-ix.compiler.CONSTRUCT_MEMBER_UNENFORCED", false]),
			);
			const text = (path: string) => {
				const file = result.files.find((one) => one.path === path);
				if (!file) throw new Error(`${backend.target}: no ${path}`);
				return file.text;
			};

			// Every class is named by its type's display name, never `Model`.
			for (const file of result.files.filter((one) => one.path.endsWith(".py")))
				expect(file.text, `${backend.target} ${file.path}`).not.toMatch(
					/^class Model\b/m,
				);
			// A construct of the interface or namespace shape has no instance.
			const shapes = new Map(
				ir.constructs.map((entry) => [entry.kind.name, entry.construct.shape]),
			);
			for (const type of ir.types.filter(
				(one) =>
					typeof one.kind === "object" &&
					shapes.get(one.kind.name) !== "interface" &&
					shapes.get(one.kind.name) !== "namespace",
			))
				expect(text(`${type.displayName}.py`)).toMatch(
					new RegExp(`^class ${type.displayName}\\b`, "m"),
				);

			// A repository and a domain have no instance: no module of their own.
			const paths = result.files.map((file) => file.path);
			expect(paths).not.toContain("OrderRepository.py");
			expect(paths).not.toContain("Ordering.py");

			// state_machine: the state enum beside the machine's class.
			expect(text("OrderLifecycle.py")).toMatch(
				/^class OrderLifecycleState\(StrEnum\):\n {4}placed = 'placed'\n {4}shipped = 'shipped'/m,
			);
			// enumeration: a native enum.
			expect(text("OrderStatus.py")).toMatch(/^class OrderStatus\(StrEnum\):/m);

			const constructs = text("constructs.py");
			for (const type of ir.types) {
				const kind = type.kind;
				// A module-declared construct kind is an object; a contract 1.1
				// kind is its name as a string, and states no construct.
				if (typeof kind !== "object") continue;
				expect(constructs).toContain(`'${type.displayName}': '${kind.name}',`);
			}
			for (const line of [
				"'Order': ('Party',),",
				"'Party': True,",
				"'Shipment': 'Order',",
				"'OrderAggregate': ('Order', 'OrderLine'),",
				"'OrderPlaced': 'placedAt',",
				"'OrderLine': True,",
				"'OrderLifecycle': (('placed', 'shipped', 'advance', 'can_ship', ('OrderPlaced',)),),",
				"'Fulfilment': (('fulfil', 'event', ('OrderPlaced',), ()),),",
				"'OrderRepository': ('Order',),",
				"'Ordering': (('Order', \"A customer's request for goods.\"),),",
				"'Order': {'badges': ('labels',)},",
				"'Order': {'id': 'id', 'labels': 'labels'},",
				"'OrderLifecycle.advance': {'modifies': ('current',), 'creates': (), 'deletes': ()},",
				// Traces: TC-1796; FR-141-AC-9. Only the inline items of a mixed list.
				"'OrderLifecycle.advance': {'pre': (('quire', 'to <> current'),), 'post': (('quire', 'current = to'),)},",
				"'OpenOrders': (('Order', 0, None),),",
				"class OrderRepository(Protocol):",
				"    def find_by_id(self, id: UUIDModel) -> Order | None: ...",
				"    def save(self, order: Order) -> Order: ...",
			])
				expect(constructs, `${backend.target}: ${line}`).toContain(line);
		}
	}, 300000);

	/** Traces: TC-1783; FR-136-AC-11. */
	it("compares identified constructs by identity, freezes events and makes abstract types abc classes in both Python targets", () => {
		const document =
			"fixtures/semantic/v1/positive/semantic-ir-v2-constructs.json";
		const scratch = mkdtempSync(resolve(tmpdir(), "fcd-python-constructs-"));
		try {
			const packages: string[] = [];
			for (const backend of [pythonPydanticBackend, pythonDataclassBackend]) {
				const result = backend.generate(pythonRequest(backend, document), {
					produce: poetryProducer(),
				}) as { state: string; files: { path: string; text: string }[] };
				expect(result.state, backend.target).toBe("success");
				const name = backend.target.replaceAll("-", "_");
				packages.push(name);
				for (const file of result.files) {
					const path = resolve(scratch, name, file.path);
					mkdirSync(dirname(path), { recursive: true });
					writeFileSync(path, file.text);
				}
				const party = result.files.find((file) => file.path === "Party.py");
				expect(party?.text, backend.target).toMatch(/^class Party\(ABC\):/m);
			}
			const check = [
				"import importlib, json, sys",
				`sys.path.insert(0, ${JSON.stringify(scratch)})`,
				"out = {}",
				`for pkg in ${JSON.stringify(packages)}:`,
				"    m = lambda name: importlib.import_module(f'{pkg}.{name}')",
				"    line = m('OrderLine').OrderLine(kind='goods', quantity=1, sku='A')",
				"    order = lambda id, status: m('Order').Order(id=id, lines=[line], status=status, total='1')",
				"    a = order('7c1e0f8a-0000-4000-8000-000000000001', 'draft')",
				"    b = order('7c1e0f8a-0000-4000-8000-000000000001', 'placed')",
				"    c = order('7c1e0f8a-0000-4000-8000-000000000002', 'draft')",
				"    row = [a == b, hash(a) == hash(b), a == c, isinstance(a, m('Party').Party)]",
				"    a.status = 'placed'",
				"    try:",
				"        a.id = '7c1e0f8a-0000-4000-8000-000000000003'",
				"        row.append('identity-writable')",
				"    except AttributeError:",
				"        row.append('identity-read-only')",
				"    try:",
				"        m('Party').Party()",
				"        row.append('constructed')",
				"    except TypeError:",
				"        row.append('abstract')",
				"    event = m('OrderPlaced').OrderPlaced(orderId='7c1e0f8a-0000-4000-8000-000000000001', placedAt='2026-01-01T00:00:00Z')",
				"    try:",
				"        event.orderId = '7c1e0f8a-0000-4000-8000-000000000002'",
				"        row.append('mutable')",
				"    except Exception:",
				"        row.append('frozen')",
				"    try:",
				"        hash(event)",
				"        row.append('hashable')",
				"    except TypeError:",
				"        row.append('unhashable')",
				"    out[pkg] = row",
				"print(json.dumps(out))",
			].join("\n");
			const stdout = execFileSync("poetry", ["run", "python", "-c", check], {
				cwd: root,
				encoding: "utf8",
				stdio: ["ignore", "pipe", "pipe"],
			});
			const expected = [
				true,
				true,
				false,
				true,
				"identity-read-only",
				"abstract",
				"frozen",
				"unhashable",
			];
			expect(JSON.parse(stdout.trim().split("\n").at(-1) ?? "")).toStrictEqual(
				Object.fromEntries(packages.map((name) => [name, expected])),
			);
		} finally {
			rmSync(scratch, { recursive: true, force: true });
		}
	}, 300000);

	/** Traces: TC-1769, TC-1770; FR-136-AC-9, FR-078-AC-12. */
	it("generates both Python targets from the lifted golden, naming each module by its display name", () => {
		const golden =
			"crates/extraction-frontend/fixtures/config-version-table/expected/semantic-ir.json";
		const schemas = jsonSchemaBackend.generate({ ir: readJson(golden) }) as {
			files: { path: string; text: string }[];
		};
		const versionSchema = schemas.files.find(
			(file) => file.path === "ConfigVersion.json",
		);
		if (!versionSchema) throw new Error("no ConfigVersion.json");
		expect(JSON.parse(versionSchema.text)["x-agent-ix-semantic-id"]).toBe(
			"ix://agent-ix/config-service/type/FR-006",
		);
		for (const backend of [pythonPydanticBackend, pythonDataclassBackend]) {
			const result = backend.generate(pythonRequest(backend, golden), {
				produce: poetryProducer(),
			}) as {
				state: string;
				diagnostics: { message: string }[];
				files: { path: string; text: string }[];
			};
			expect(
				result.state,
				`${backend.target}: ${result.diagnostics.map((d) => d.message).join("; ")}`,
			).toBe("success");
			const paths = result.files.map((file) => file.path);
			expect(paths).toContain("ConfigVersion.py");
			expect(paths).toContain("JsonObject.py");
			expect(paths.some((path) => /^FR[-_]?0/.test(path))).toBe(false);
		}
	}, 300000);

	/** Traces: TC-1532; FR-136-AC-3. */
	it("generates a package for the python-dataclass target under its own profile", () => {
		const manifest = generateTarget(pythonRequest(pythonDataclassBackend), {
			target: "python-dataclass",
			host: host(),
			produce: poetryProducer(),
		}) as never as Manifest;

		expect(manifest.state).toBe("success");
		expect(manifest.files.length).toBeGreaterThan(0);
		expect(pythonDataclassBackend.profileId).not.toBe(
			pythonPydanticBackend.profileId,
		);
		console.log(
			`TC-1532 measured: python-dataclass state=${manifest.state} files=${manifest.files.length} profile=${pythonDataclassBackend.profileId}`,
		);
	}, 300000);

	/**
	 * Traces: TC-1533; FR-136-AC-4.
	 *
	 * An empty file set would be a package: a consumer would import it and find
	 * nothing, with no diagnostic to say why. So the missing producer is a
	 * refusal with zero files, not a generation that produced none.
	 */
	it("refuses rather than emitting an empty package when no producer is injected", () => {
		const manifest = generateTarget(pythonRequest(pythonPydanticBackend), {
			target: "python-pydantic-v2",
			host: host(),
		}) as never as Manifest;

		expect(manifest.state).toBe("unavailable");
		expect(manifest.files).toStrictEqual([]);
		const refusal = manifest.diagnostics.find((d) =>
			d.code.endsWith("BACKEND_CONTRACT_VIOLATION"),
		);
		expect(refusal?.message).toContain("producer");
		console.log(
			`TC-1533 measured: producerless request state=${manifest.state} code=${refusal?.code}`,
		);
	});

	/** Traces: TC-1534; FR-136-AC-5. */
	it("reports a producer that exits non-zero as a failed generation", () => {
		const manifest = generateTarget(pythonRequest(pythonPydanticBackend), {
			target: "python-pydantic-v2",
			host: host(),
			produce: poetryProducer({ command: ["false"] }),
		}) as never as Manifest;

		expect(manifest.state).toBe("invalid");
		expect(manifest.files).toStrictEqual([]);
		const refusal = manifest.diagnostics.find((d) =>
			d.code.endsWith("BACKEND_CONTRACT_VIOLATION"),
		);
		expect(refusal?.message).toContain("pydantic_v2_basemodel");
		console.log(
			`TC-1534 measured: failing producer state=${manifest.state} code=${refusal?.code}`,
		);
	});

	/**
	 * Traces: TC-1535; FR-136-CON-3, FR-136-AC-6.
	 *
	 * The comparison runs the `json-schema` backend's own entry point rather
	 * than a fixture this file wrote: a fixture the test authors cannot be
	 * evidence that the two agree.
	 */
	it("hands the generator the json-schema target's own documents and names", () => {
		const seen: Record<string, unknown>[] = [];
		const manifest = generateTarget(pythonRequest(pythonPydanticBackend), {
			target: "python-pydantic-v2",
			host: host(),
			produce: (documents: Record<string, unknown>) => {
				seen.push(documents);
				return { "__init__.py": "" };
			},
		}) as never as Manifest;
		expect(manifest.state).toBe("success");
		expect(seen.length).toBe(1);

		const lowered = jsonSchemaBackend.generate(
			pythonRequest(pythonPydanticBackend),
			{ host: host() },
		) as { state: string; files: { path: string; text: string }[] };
		expect(lowered.state).toBe("success");

		const expected = lowered.files.filter((f) => f.path !== "index.json");
		expect(expected.length).toBeGreaterThan(0);
		expect(Object.keys(seen[0]).sort()).toStrictEqual(
			expected.map((f) => f.path).sort(),
		);
		expect(Object.keys(seen[0])).not.toContain("index.json");
		for (const file of expected)
			expect(
				seen[0][file.path],
				`document differs at ${file.path}`,
			).toStrictEqual(JSON.parse(file.text));
		console.log(
			`TC-1535 measured: ${expected.length} documents handed to the producer under the lowering's own names`,
		);
	});

	/**
	 * Traces: TC-1536; FR-136-AC-7, FR-136-CON-2.
	 *
	 * The seam is imported by every generation path, so a process spawn in the
	 * module it imports for one backend would make the seam impure for all of
	 * them. This is why `produce.mjs` is its own module and is imported by the
	 * command line rather than by the backend.
	 */
	it("registers a backend module that names no file-system or process module", () => {
		const source = readFileSync(
			resolve(root, "src/compiler/backends/python-v1/index.mjs"),
			"utf8",
		);
		// Over the module's imports, not over its prose: the header explains why
		// the child process is absent, and a substring search would read that
		// explanation as the violation it documents.
		const imported = [
			...source.matchAll(/^import[^;]*?from\s+"([^"]+)";/gm),
		].map((match) => match[1]);
		expect(imported.length).toBeGreaterThan(0);
		expect(imported).not.toContain("node:fs");
		expect(imported).not.toContain("node:child_process");
		expect(
			imported.filter((name) => name.includes("fs") || name.includes("child")),
		).toStrictEqual([]);
		console.log(
			"TC-1536 measured: python-v1/index.mjs names no file-system and no child-process module",
		);
	});
});
