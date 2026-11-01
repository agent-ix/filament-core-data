// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Agent IX

import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { describe, expect, it } from "vitest";
import { rustBackend } from "../src/compiler/backends/rust-serde/backend.mjs";
import { generateTarget } from "../src/compiler/backends/seam.mjs";
import { schemaValidators } from "../src/compiler/schema-validate.mjs";
import { repositoryHost } from "../src/compiler/host.mjs";
import { createHost } from "../src/compiler/host.mjs";
import { readContractIr } from "../src/compiler/ir/reader.mjs";
import { readSemanticIr } from "./semantic-ir-v1-1-reader";
import { validateIrDocument } from "../src/compiler/ir/schema.mjs";

// FR-148 over the QSpec vectors
// `proposals/checked-package-v2/model-option-type-vectors.json` (OP-01 to
// OP-41), read from the QSpec repository at a git ref and never copied:
// QSPEC_REPO (default the sibling quire-specification checkout) and
// QSPEC_OPTION_VECTORS_REF (default the merging commit fa6be9cd).

type Json = Record<string, any>;

const FILE = "proposals/checked-package-v2/model-option-type-vectors.json";
// The sibling checkout of the main FCD clone, found through the git common
// directory so a linked worktree resolves the same repository.
const common = execFileSync("git", ["rev-parse", "--git-common-dir"], {
	encoding: "utf8",
}).trim();
const repo = resolve(
	process.env.QSPEC_REPO ?? resolve(common, "..", "..", "quire-specification"),
);
const ref = process.env.QSPEC_OPTION_VECTORS_REF ?? "fa6be9cd";
const vectors = JSON.parse(
	execFileSync("git", ["-C", repo, "show", `${ref}:${FILE}`], {
		encoding: "utf8",
	}),
) as Json;

const SOURCE = "ix://acme/optionals/source";
const MODEL = "agent-ix/quire-model";
const origin = () => ({
	generated: {
		generatorIdentity: "ix://acme/optionals/vector-author",
		generatorVersion: "1.0.0",
		inputIdentities: [SOURCE],
	},
});
const leaf = (identity: string) => identity.split("/").pop() as string;
const once = { lower: 1, upper: 1, ordered: false, unique: true };

function patch(document: Json, operations: Json[]): void {
	for (const operation of operations) {
		const path = (operation.path as string)
			.split("/")
			.slice(1)
			.map((token) => token.replace(/~1/g, "/").replace(/~0/g, "~"));
		const last = path.pop() as string;
		let node = document;
		for (const token of path) node = node[token];
		if (Array.isArray(node)) {
			if (operation.op === "add")
				last === "-"
					? node.push(operation.value)
					: node.splice(Number(last), 0, operation.value);
			else node[Number(last)] = operation.value;
		} else if (operation.op === "remove") delete node[last];
		else node[last] = operation.value;
	}
}

const field = (owner: string, source: Json) => ({
	identity: `${owner}/${source.name}`,
	name: source.name,
	typeRef: source.typeRef,
	presence: source.presence,
	nullable: false,
	defaultKind: "none",
	multiplicity: {
		lower: Number(source.multiplicity.lower),
		upper: Number(source.multiplicity.upper),
		ordered: source.multiplicity.ordered,
		unique: source.multiplicity.unique,
	},
	origin: origin(),
});

const operation = (owner: string, source: Json) => ({
	identity: `${owner}/${source.name}`,
	name: source.name,
	params: (source.params ?? []).map((param: Json) => ({
		identity: `${owner}/${source.name}/${param.name}`,
		name: param.name,
		typeRef: param.typeRef,
		presence: "required",
		nullable: false,
		defaultKind: "none",
		multiplicity: once,
		origin: origin(),
	})),
	pre: [],
	post: [],
	origin: origin(),
	...(source.returns
		? {
				returns: {
					typeRef: source.returns.typeRef,
					multiplicity: once,
					nullable: false,
				},
			}
		: {}),
});

const constraint = (source: Json) => ({
	identity: source.identity,
	keyword: source.keyword,
	operands: source.operands,
	appliesTo: source.appliesTo,
	diagnosticCode: "agent-ix.semantic-ir.INVALID_OPERAND",
	origin: origin(),
});

const definition = (node: string, kind: unknown, extra: Json): Json => ({
	identity: node,
	displayName: leaf(node),
	kind,
	roles: [],
	origin: origin(),
	constraints: [],
	extensions: [],
	unknownPolicy: "reject",
	...extra,
});

/** The QSpec `domain_package` projection as a `2.0.0` Semantic IR. */
function irOf(projection: Json): Json {
	const list = (name: string): Json[] => projection[name] ?? [];
	const types: Json[] = [];
	const constructs: Json[] = [];
	for (const e of list("record_types"))
		types.push(
			definition(e.node, "record", {
				fields: e.fields.map((f: Json) => field(e.node, f)),
			}),
		);
	for (const e of list("option_types")) {
		const extra: Json = {};
		for (const [name, value] of Object.entries(e)) {
			if (name === "node") continue;
			extra[name] =
				name === "fields"
					? (value as Json[]).map((f) => field(e.node, f))
					: name === "operations"
						? (value as Json[]).map((o) => operation(e.node, o))
						: name === "constraints"
							? (value as Json[]).map(constraint)
							: value;
		}
		types.push(definition(e.node, "option", extra));
	}
	for (const e of list("aliases"))
		types.push(definition(e.node, "alias", { target: e.target }));
	for (const e of list("sequence_types"))
		types.push(definition(e.node, "sequence", { items: e.items }));
	for (const e of list("map_types"))
		types.push(definition(e.node, "map", { values: e.values }));
	const tuple = { module: MODEL, name: "tuple_value_type" };
	for (const e of list("tuple_types"))
		types.push(
			definition(e.node, tuple, {
				positions: e.positions.map((p: Json) => ({
					identity: `${e.node}/p${p.ordinal}`,
					typeRef: p.typeRef,
					origin: origin(),
				})),
			}),
		);
	if (list("tuple_types").length)
		constructs.push({
			kind: tuple,
			moduleVersion: "1.0.0",
			construct: {
				identity: "none",
				shape: "tuple",
				members: {
					positions: "required",
					fields: "forbidden",
					operations: "forbidden",
				},
				references: {},
				rules: [],
				meaning: "quire.meaning.model.tuple-value-type/v1",
			},
		});
	for (const e of list("variant_types"))
		types.push(
			definition(e.node, "union", {
				variants: e.cases.map((c: Json) => ({
					identity: `${e.node}/${c.name}`,
					name: c.name,
					...(c.payloadType ? { payloadType: c.payloadType } : {}),
					origin: origin(),
				})),
			}),
		);
	for (const e of list("reference_types"))
		types.push(definition(e.node, "reference", { target: e.target }));
	const namespace = { module: MODEL, name: "namespace" };
	for (const e of list("namespaces"))
		types.push(definition(e.node, namespace, {}));
	if (list("namespaces").length)
		constructs.push({
			kind: namespace,
			moduleVersion: "1.0.0",
			construct: {
				identity: "none",
				shape: "namespace",
				members: { members: "optional" },
				references: {},
				rules: [],
				meaning: "quire.meaning.model.namespace/v1",
			},
		});
	for (const e of list("object_types"))
		types.push(
			definition(e.node, "record", {
				fields: e.fields.map((f: Json) => field(e.node, f)),
				operations: (e.operations ?? []).map((o: Json) => operation(e.node, o)),
			}),
		);
	const top = list("constraints").map(constraint);
	if (top.length) types[0].constraints = top;
	return {
		contractVersion: "2.0.0",
		canonicalization: { algorithm: "rfc8785-v1" },
		source: { identity: SOURCE, version: "1", dialect: "spec-bundle" },
		package: {
			identity: projection.identity,
			version: "1",
			mappingVersions: ["1.0.0"],
			profileVersions: [],
		},
		constructs,
		types,
		occurrences: [],
		extensions: [],
	};
}

const codes = (document: Json): string[] => [
	...validateIrDocument(document).map(() => "schema"),
	...[...readContractIr(document)].map(
		(d) => d.code.split(".").pop() as string,
	),
];

const cases = vectors.intake_cases as Json[];
const patched = (entry: Json): Json => {
	const projection = structuredClone(vectors.domain_package);
	patch(projection, entry.patch);
	return projection;
};

/**
 * The vectors whose refusal is a shape defect the published schema decides:
 * the Node layer refuses these. The rest (nesting, Clock, unresolved or
 * non-value `inner`, presence, reference, native-name and constraint rows)
 * are decided by the Rust reader (FR-148-AC-3 to AC-5), as FR-147 leaves its
 * tuple construct rules to the Rust reader.
 */
const SCHEMA_ROWS = [
	"OP-23",
	"OP-25",
	"OP-26",
	"OP-27",
	"OP-28",
	"OP-29",
	"OP-30",
	"OP-31",
	"OP-32",
	"OP-34",
	"OP-35",
	"OP-36",
	"OP-37",
	"OP-38",
	"OP-39",
];

describe("FR-148 option value types", () => {
	/** Traces: TC-1896; FR-148-AC-9. */
	it("TC-1896 admits OP-09, OP-10 and OP-20 and refuses every schema-shape vector in the Node layer", () => {
		let seen = 0;
		for (const entry of cases) {
			const ir = irOf(patched(entry));
			seen += 1;
			if (entry.expected.admitted) {
				expect(codes(ir), entry.name).toEqual([]);
			} else if (SCHEMA_ROWS.includes(entry.name)) {
				expect(validateIrDocument(ir).length, entry.name).toBeGreaterThan(0);
			}
		}
		expect(seen).toBe(33);
	});

	/** Traces: TC-1896; FR-148-AC-9, FR-148-AC-3, FR-148-AC-4, FR-148-AC-5. */
	it("TC-1896 cross-reader OP-01..OP-41 verdicts agree by reference", () => {
		// OP-01..08 describe eight types of the same admitted document. The
		// Rust accessor gate checks their meanings; verdict-only readers read
		// that document once rather than claim eight accessor executions.
		const rows = [
			{ name: "OP-01..OP-08", expected: { admitted: true }, patch: [] },
			...cases,
		];
		const ajv = new Ajv2020({
			allErrors: true,
			strict: true,
			strictRequired: false,
		});
		addFormats(ajv);
		const schemaRoot = resolve("schema/semantic/v1");
		for (const name of readdirSync(schemaRoot).filter((name) =>
			name.endsWith(".schema.json"),
		))
			ajv.addSchema(
				JSON.parse(readFileSync(resolve(schemaRoot, name), "utf8")),
			);
		const validate = ajv.getSchema(
			"https://schemas.agent-ix.org/filament-core-data/v1/semantic-ir.schema.json",
		);
		if (!validate) throw new Error("missing published IR schema");
		const nodeSchema = schemaValidators(repositoryHost(process.cwd()));
		const distinct = (paths: string[]): string[] => [...new Set(paths)].sort();
		const nativePointer = (error: any): string =>
			["required", "additionalProperties"].includes(error.keyword)
				? `${error.instancePath}/${error.params.missingProperty ?? error.params.additionalProperty}`
				: error.instancePath;
		// A false property forbids its entire subtree. Descendant shape
		// errors describe that same foreign member, not additional violations.
		// Distinct siblings and false properties remain separate results.
		const forbiddenOwners = (paths: string[], forbidden: string[]): string[] =>
			distinct(
				paths.map(
					(path) =>
						forbidden
							.filter((owner) => path === owner || path.startsWith(`${owner}/`))
							.sort((a, b) => a.length - b.length)[0] ?? path,
				),
			);
		const ajvPaths = (errors: any[], document: Json): string[] =>
			forbiddenOwners(
				errors
					// Only AJV's conditional wrapper repeats its child violation. Other
					// ancestor defects are independent and must survive normalization.
					.filter(
						(error) =>
							!(
								error.keyword === "if" &&
								error.params.failingKeyword === "then" &&
								errors.some(
									(child) =>
										child !== error &&
										nativePointer(child).startsWith(`${error.instancePath}/`),
								)
							),
					)
					.map((error) => {
						let owner: any = document;
						for (const part of error.instancePath.slice(1).split("/"))
							owner = owner?.[part];
						return error.keyword === "required" &&
							error.params.missingProperty === "inner" &&
							owner?.kind === "option"
							? error.instancePath
							: nativePointer(error);
					}),
				errors
					.filter((error) => error.keyword === "false schema")
					.map(nativePointer),
			);
		const documents = rows.map((entry: Json) => irOf(patched(entry)));
		// A normalization control, not an additional QSpec row: two equally
		// valued forbidden properties must remain two distinct violations.
		const siblingControl = irOf(vectors.domain_package);
		const siblingOwner = siblingControl.types.findIndex(
			(type: Json) => type.kind === "option",
		);
		siblingControl.types[siblingOwner].fields = [];
		siblingControl.types[siblingOwner].operations = [];
		documents.push(siblingControl);
		// A unique source locus per authored node lets the production compiler
		// envelope retain its native source location while evidence readers
		// report document paths. No diagnostics ABI is invented by this gate.
		const locate = (node: any, path: string): void => {
			if (!node || typeof node !== "object") return;
			if (node.origin)
				node.origin = {
					source: {
						sourceIdentity: SOURCE,
						path: path.slice(1),
						startLine: 1,
						startColumn: 1,
					},
				};
			for (const [key, child] of Object.entries(node))
				if (key !== "origin") locate(child, `${path}/${key}`);
		};
		documents.forEach((document: Json) => locate(document, ""));
		const python = JSON.parse(
			execFileSync(
				process.env.PYTHON ?? ".venv/bin/python",
				["tests/option_vector_reader.py"],
				{
					input: JSON.stringify(documents),
					encoding: "utf8",
					maxBuffer: 16 * 1024 * 1024,
				},
			),
		) as Json[];
		const failures: string[] = [];
		rows.forEach((entry: Json, index: number) => {
			const document = documents[index];
			const schema = validateIrDocument(document);
			const tsSchema = validate(document) ? [] : [...(validate.errors ?? [])];
			const refused = entry.expected.refused;
			let pointer: string | undefined;
			if (refused) {
				const [collection, row, ...rest] = refused.at.slice(1).split("/");
				if (collection === "constraints")
					pointer = `/types/0/constraints/${row}`;
				else {
					const identity = patched(entry)[collection][Number(row)].node;
					pointer = `/types/${document.types.findIndex((type: Json) => type.identity === identity)}/${rest.join("/")}`;
				}
			}
			if (SCHEMA_ROWS.includes(entry.name)) {
				let value: any = document;
				for (const part of (pointer as string).slice(1).split("/"))
					value = value?.[part];
				const at =
					value === undefined
						? pointer?.slice(0, pointer.lastIndexOf("/"))
						: pointer;
				for (const [reader, paths] of [
					[
						"Node",
						ajvPaths(
							nodeSchema.errors("semantic-ir.schema.json", document),
							document,
						),
					],
					["TypeScript", ajvPaths(tsSchema, document)],
					[
						"Python",
						forbiddenOwners(
							python[index].schemaPaths,
							python[index].forbiddenPaths,
						),
					],
				] as const)
					if (JSON.stringify(paths) !== JSON.stringify([at]))
						failures.push(
							`${entry.name} ${reader}: schema locations ${JSON.stringify(paths)}, expected ${at}`,
						);
				if (
					!schema.length ||
					schema.some(
						(d: Json) =>
							d.code !== "agent-ix.compiler.INVALID_IR" ||
							d.severity !== "error" ||
							!d.blocking,
					)
				)
					failures.push(`${entry.name}: schema envelope`);
				const originalErrors = nodeSchema.errors(
					"semantic-ir.schema.json",
					document,
				);
				if (
					schema.length !== originalErrors.length ||
					schema.some(
						(diagnostic: Json, n: number) =>
							!diagnostic.message.startsWith(
								`${nativePointer(originalErrors[n])} `,
							),
					)
				)
					failures.push(`${entry.name}: native schema pointer lost`);
				// Each reader's published pipeline stops at a schema refusal;
				// applying semantic rules to an invalid shape invents diagnostics.
				return;
			}
			const code = !refused
				? undefined
				: entry.name === "OP-17"
					? "UNRESOLVED_OPTION_INNER"
					: ["OP-18", "OP-19", "OP-41"].includes(entry.name)
						? "INVALID_OPTION_PRESENCE"
						: ["OP-21", "OP-22", "OP-24"].includes(entry.name)
							? "UNRESOLVED_TYPE_REF"
							: entry.name === "OP-40"
								? "CONSTRAINT_NOT_APPLICABLE"
								: "INVALID_OPTION_INNER";
			const expected = code ? [`agent-ix.semantic-ir.${code}`] : [];
			const node = [...readContractIr(document, { importedExports: [] })];
			const ts = readSemanticIr(document);
			for (const [reader, found] of [
				["Node", node],
				["TypeScript", ts],
				["Python", python[index].diagnostics],
			] as const) {
				if (
					JSON.stringify(found.map((d: Json) => d.code)) !==
					JSON.stringify(expected)
				)
					failures.push(`${entry.name} ${reader}: ${JSON.stringify(found)}`);
			}
			if (pointer) {
				const path = pointer.slice(1).replaceAll("/", ".");
				for (const [reader, found] of [
					["TypeScript", ts],
					["Python", python[index].diagnostics],
				] as const)
					if (
						JSON.stringify(found.map((d: Json) => d.path)) !==
						JSON.stringify([path])
					)
						failures.push(`${entry.name} ${reader}: expected path ${path}`);
				let owner: Json = document;
				let locus: Json | undefined;
				for (const part of pointer.slice(1).split("/")) {
					owner = owner?.[part];
					if (owner?.origin?.source) locus = owner.origin.source;
				}
				if (
					node.length !== 1 ||
					JSON.stringify(node[0].locus) !== JSON.stringify(locus) ||
					node[0].severity !== "error" ||
					!node[0].blocking
				)
					failures.push(
						`${entry.name} Node: expected located blocking error at ${pointer}`,
					);
			}
			if (schema.length || tsSchema.length || python[index].schemaPaths.length)
				failures.push(`${entry.name}: unexpected schema refusal`);
		});
		validate(siblingControl);
		const siblingPaths = [
			`/types/${siblingOwner}/fields`,
			`/types/${siblingOwner}/operations`,
		];
		for (const [reader, paths] of [
			[
				"Node",
				ajvPaths(
					nodeSchema.errors("semantic-ir.schema.json", siblingControl),
					siblingControl,
				),
			],
			["TypeScript", ajvPaths([...(validate.errors ?? [])], siblingControl)],
			[
				"Python",
				forbiddenOwners(
					python[rows.length].schemaPaths,
					python[rows.length].forbiddenPaths,
				),
			],
		] as const)
			expect(
				paths,
				`${reader}: distinct equal-valued forbidden properties survive`,
			).toEqual(siblingPaths);

		expect(
			[...vectors.field_type_cases, ...cases]
				.map((entry: Json) => entry.name)
				.sort(),
		).toEqual(
			Array.from(
				{ length: 41 },
				(_, i) => `OP-${String(i + 1).padStart(2, "0")}`,
			).sort(),
		);
		expect(failures).toEqual([]);
	});

	/** Traces: TC-1893; FR-148-AC-1. */
	it("TC-1893 names option in the schema kind enumeration and refuses a kind outside it", () => {
		const schema = JSON.parse(
			readFileSync(
				new URL(
					"../schema/semantic/v1/semantic-ir.schema.json",
					import.meta.url,
				),
				"utf8",
			),
		) as Json;
		expect(schema.$defs.typeDefinition.properties.kind.anyOf[0].enum).toEqual([
			"scalar",
			"record",
			"enum",
			"union",
			"alias",
			"sequence",
			"map",
			"reference",
			"option",
		]);
		const ir = irOf(vectors.domain_package);
		expect(codes(ir)).toEqual([]);
		const option = ir.types.find((type: Json) => type.kind === "option");
		option.kind = "optional";
		expect(validateIrDocument(ir).length).toBeGreaterThan(0);
	});

	/** Traces: TC-1895; FR-148-AC-8. */
	it("TC-1895 refuses an option value type at the generation seam for every target", () => {
		const request = (ir: Json) => ({
			contractVersion: "1.0.0",
			ir,
			profile: JSON.parse(
				readFileSync(
					new URL(
						"../fixtures/semantic/v1/positive/profile.json",
						import.meta.url,
					),
					"utf8",
				),
			),
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
		});
		for (const target of [
			"typescript",
			"rust",
			"python-pydantic-v2",
			"python-dataclass",
			"json-schema",
			"sysml-v2-textual",
		] as const) {
			const manifest = generateTarget(request(irOf(vectors.domain_package)), {
				target,
				host: createHost({ readRoots: [process.cwd()] }),
			}) as never as {
				state: string;
				files: unknown[];
				diagnostics: { code: string; blocking: boolean }[];
			};
			expect(manifest.state, target).toBe("unsupported");
			expect(manifest.files, target).toEqual([]);
			expect(
				manifest.diagnostics.filter((d) => d.blocking).map((d) => d.code),
				target,
			).toEqual(["agent-ix.compiler.UNSUPPORTED_CONSTRUCT_SHAPE"]);
		}
	});
});
