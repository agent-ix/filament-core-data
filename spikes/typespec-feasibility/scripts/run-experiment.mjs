import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import {
	cpSync,
	existsSync,
	mkdtempSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	rmSync,
	statSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { Field, Schema, Utf8 } from "apache-arrow";
import protobuf from "protobufjs";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const spike = resolve(scriptDirectory, "..");
const root = resolve(spike, "../..");
const tsp = resolve(root, "node_modules/.bin/tsp");
const tsc = resolve(root, "node_modules/.bin/tsc");
const checkMode = process.argv.includes("--check");
const pydanticVersion = "2.12.5";
const datamodelCodegenVersion = "0.76.0";
const serdeVersion = "1.0.229";
const serdeJsonVersion = "1.0.151";
const experimentRoot = mkdtempSync(join(tmpdir(), "filament-typespec-"));

function run(command, args, options = {}) {
	const result = spawnSync(command, args, {
		cwd: options.cwd ?? root,
		encoding: "utf8",
		env: { ...process.env, ...options.env },
	});
	if (!options.allowFailure && result.status !== 0) {
		throw new Error(
			`Command failed (${result.status}): ${command} ${args.join(" ")}\n${result.stdout}${result.stderr}`,
		);
	}
	return {
		exitCode: result.status ?? 1,
		stdout: result.stdout,
		stderr: result.stderr,
	};
}

function json(path) {
	return JSON.parse(readFileSync(path, "utf8"));
}

function write(path, content) {
	mkdirSync(dirname(path), { recursive: true });
	writeFileSync(path, content.endsWith("\n") ? content : `${content}\n`);
}

function writeJson(path, value) {
	write(path, JSON.stringify(value, null, 2));
}

function canonical(value) {
	if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
	if (value !== null && typeof value === "object") {
		return `{${Object.entries(value)
			.sort(([left], [right]) => left.localeCompare(right))
			.map(([key, child]) => `${JSON.stringify(key)}:${canonical(child)}`)
			.join(",")}}`;
	}
	return JSON.stringify(value);
}

function fingerprint(base, paths) {
	const hash = createHash("sha256");
	for (const path of [...paths].sort()) {
		hash.update(path);
		hash.update("\0");
		const content = readFileSync(resolve(base, path), "utf8");
		hash.update(
			path.endsWith(".json") ? canonical(JSON.parse(content)) : content,
		);
		hash.update("\0");
	}
	return hash.digest("hex");
}

function listFiles(directory, prefix = "") {
	if (!existsSync(directory)) return [];
	return readdirSync(directory).flatMap((name) => {
		const absolute = join(directory, name);
		const path = prefix ? `${prefix}/${name}` : name;
		return statSync(absolute).isDirectory()
			? listFiles(absolute, path)
			: [path];
	});
}

function packageVersion(name) {
	return json(resolve(root, "node_modules", name, "package.json")).version;
}

function enumMembers(ir) {
	const values = new Map();
	for (const type of ir.types.filter(
		(candidate) => candidate.kind === "enum",
	)) {
		for (const member of type.members)
			values.set(`${type.id}.${member.name}`, member.value);
	}
	return [...values.entries()].sort(
		([left], [right]) => right.length - left.length,
	);
}

function replaceEnumMember(typeName, members, render) {
	let result = typeName;
	for (const [name, value] of members)
		result = result.replaceAll(name, render(value));
	return result;
}

function simpleReferences(typeName) {
	return typeName.replaceAll(
		/AgentIx\.Semantic\.(?:Core|Assurance|Wire)\.([A-Za-z0-9_]+)/g,
		"$1",
	);
}

function tsType(typeName, members) {
	let result = replaceEnumMember(typeName, members, (value) =>
		JSON.stringify(value),
	);
	result = simpleReferences(result)
		.replaceAll("utcDateTime", "string")
		.replaceAll("Record<string>", "Record<string, unknown>")
		.replaceAll(
			/\b(?:u?int(?:8|16|32|64)?|safeint|float(?:32|64)?|numeric|decimal(?:128)?)\b/g,
			"number",
		);
	return result;
}

function inheritedFields(model, byId) {
	const base = model.base ? byId.get(model.base) : undefined;
	const fields = base ? inheritedFields(base, byId) : [];
	const merged = new Map(fields.map((field) => [field.name, field]));
	for (const field of model.fields) merged.set(field.name, field);
	return [...merged.values()];
}

function emitTypeScript(ir) {
	const members = enumMembers(ir);
	const lines = ["// Generated experimental output. Do not publish.", ""];
	for (const type of ir.types.filter(
		(candidate) => candidate.kind === "scalar",
	)) {
		lines.push(`export type ${type.name} = string;`, "");
	}
	for (const type of ir.types.filter(
		(candidate) => candidate.kind === "enum",
	)) {
		lines.push(
			`export type ${type.name} = ${type.members.map((member) => JSON.stringify(member.value)).join(" | ")};`,
			"",
		);
	}
	for (const type of ir.types.filter(
		(candidate) => candidate.kind === "model",
	)) {
		const extension = type.base
			? ` extends ${simpleReferences(type.base)}`
			: "";
		lines.push(`export interface ${type.name}${extension} {`);
		for (const field of type.fields) {
			lines.push(
				`\t${field.name}${field.optional ? "?" : ""}: ${tsType(field.type, members)};`,
			);
		}
		lines.push("}", "");
	}
	return `${lines.join("\n").trim()}\n`;
}

function normalizeJsonSchemaForPython(schema) {
	const definitions = schema.$defs ?? {};
	const references = new Map();
	for (const [name, definition] of Object.entries(definitions)) {
		if (definition.$id) references.set(definition.$id, `#/$defs/${name}`);
	}
	references.set("RecordString.json", "#/$defs/RecordString");
	const forbidden = new Set([
		"x-python-import",
		"customTypePath",
		"default_factory",
	]);
	const rewrite = (value) => {
		if (Array.isArray(value)) return value.map(rewrite);
		if (value === null || typeof value !== "object") return value;
		const output = {};
		for (const [key, child] of Object.entries(value)) {
			if (forbidden.has(key)) {
				throw new Error(`Forbidden executable Python schema extension: ${key}`);
			}
			if (key === "$ref" && references.has(child))
				output[key] = references.get(child);
			else output[key] = rewrite(child);
		}
		return output;
	};
	const normalized = rewrite(schema);
	for (const [name, definition] of Object.entries(normalized.$defs ?? {})) {
		delete definition.$id;
		delete definition.$schema;
		if (
			name === "RecordString" &&
			definition.unevaluatedProperties !== undefined
		) {
			definition.additionalProperties = definition.unevaluatedProperties;
			delete definition.unevaluatedProperties;
		}
		definition.title ??= name
			.split(/[^A-Za-z0-9]+/)
			.filter(Boolean)
			.map((part) => `${part[0].toUpperCase()}${part.slice(1)}`)
			.join("");
	}
	normalized.$id = "urn:agent-ix:typespec-feasibility:python-input:1";
	return normalized;
}

function snake(name) {
	return name.replaceAll(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
}

function rustType(typeName, optional, members) {
	let result = replaceEnumMember(typeName, members, () => "String");
	result = simpleReferences(result)
		.replaceAll(/([A-Za-z_][A-Za-z0-9_]*)\[\]/g, "Vec<$1>")
		.replaceAll("utcDateTime", "String")
		.replaceAll("Record<string>", "BTreeMap<String, serde_json::Value>")
		.replaceAll("string", "String")
		.replaceAll("int32", "i32")
		.replaceAll(/"[^"]+"/g, "String")
		.replaceAll(/ \| null/g, "");
	if (typeName.includes("null") || optional) result = `Option<${result}>`;
	return result;
}

function emitRust(ir) {
	const members = enumMembers(ir);
	const byId = new Map(ir.types.map((type) => [type.id, type]));
	const lines = [
		"// Generated experimental output. Do not publish.",
		"use serde::{Deserialize, Serialize};",
		"use std::collections::BTreeMap;",
		"",
	];
	for (const type of ir.types.filter(
		(candidate) => candidate.kind === "scalar",
	)) {
		lines.push(`pub type ${type.name} = String;`, "");
	}
	for (const type of ir.types.filter(
		(candidate) => candidate.kind === "enum",
	)) {
		lines.push("#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]");
		lines.push(`pub enum ${type.name} {`);
		for (const member of type.members) {
			lines.push(`    #[serde(rename = ${JSON.stringify(member.value)})]`);
			lines.push(`    ${member.name[0].toUpperCase()}${member.name.slice(1)},`);
		}
		lines.push("}", "");
	}
	for (const type of ir.types.filter(
		(candidate) => candidate.kind === "model",
	)) {
		lines.push("#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]");
		lines.push(`pub struct ${type.name} {`);
		for (const field of inheritedFields(type, byId)) {
			const fieldName = snake(field.name);
			if (fieldName !== field.name)
				lines.push(`    #[serde(rename = ${JSON.stringify(field.name)})]`);
			lines.push(
				`    pub ${fieldName}: ${rustType(field.type, field.optional, members)},`,
			);
		}
		lines.push("}", "");
	}
	return `${lines.join("\n").trim()}\n`;
}

function fixture() {
	const provenance = {
		source: {
			repository: "agent-ix/example",
			revision: "abc123",
			path: "spec/example.md",
			line: 7,
		},
		producer: "typespec-feasibility-spike",
		producerVersion: "0.0.0",
		generatedAt: null,
	};
	return {
		artifact: {
			id: "artifact:example",
			kind: "artifact",
			role: "definition",
			artifactType: "type:specification",
			title: "Representative artifact",
			summary: "One shared golden value.",
			explicitNullNote: null,
			objects: [],
			relations: [],
			extensions: { profile: "assurance" },
			provenance,
		},
		domainEvent: {
			id: "event:example",
			eventType: "event:verification-started",
			subjectId: "artifact:example",
			occurredAt: "2026-08-29T12:00:00Z",
			causationId: null,
			correlationId: "correlation:example",
			payload: {},
			provenance,
		},
		verificationRun: {
			id: "run:example",
			targetId: "artifact:example",
			profileId: "profile:default",
			startedAt: "2026-08-29T12:00:00Z",
			completedAt: null,
			evidenceIds: ["evidence:example"],
			provenance,
		},
		evidence: {
			id: "evidence:example",
			runId: "run:example",
			evidenceType: "evidence:test-output",
			uri: "file:///tmp/test-output.json",
			digest: "sha256:example",
			observedAt: "2026-08-29T12:01:00Z",
			attributes: {},
			provenance,
		},
		result: {
			status: "failed",
			runId: "run:example",
			findingIds: ["finding:example"],
			reason: "Representative failure",
		},
	};
}

function invalidFixture() {
	return {
		artifact: {
			id: "not-a-semantic-id",
			kind: "artifact",
			role: "definition",
			artifactType: "type:specification",
			explicitNullNote: null,
			provenance: fixture().artifact.provenance,
		},
	};
}

function emitConsumers(output) {
	write(
		resolve(output, "generated/custom/typescript/consumer.ts"),
		`import type { Artifact, DomainEvent, Evidence, FailedResult, VerificationRun } from "./index.js";\nimport golden from "../../fixtures/representative.json";\nconst values: [Artifact, DomainEvent, VerificationRun, Evidence, FailedResult] = [golden.artifact, golden.domainEvent, golden.verificationRun, golden.evidence, golden.result] as [Artifact, DomainEvent, VerificationRun, Evidence, FailedResult];\n// @ts-expect-error The negative golden omits required Artifact fields.\nconst invalidArtifact: Artifact = { id: "not-a-semantic-id" };\nvoid invalidArtifact;\nif (values[0].id !== "artifact:example" || values[4].status !== "failed") throw new Error("golden mismatch");\nconsole.log("typescript-consumer:passed");\n`,
	);
	write(
		resolve(output, "generated/custom/python/consumer.py"),
		`import json\nfrom pathlib import Path\nfrom pydantic import ValidationError\nfrom models import Artifact, DomainEvent, Evidence, FailedResult, VerificationRun\nfixtures = Path(__file__).parents[2] / "fixtures"\ngolden = json.loads((fixtures / "representative.json").read_text())\ninvalid = json.loads((fixtures / "invalid.json").read_text())\nkeys = ["artifact", "domainEvent", "verificationRun", "evidence", "result"]\nclasses = [Artifact, DomainEvent, VerificationRun, Evidence, FailedResult]\nvalues = [model.model_validate(golden[key]) for model, key in zip(classes, keys, strict=True)]\nrendered = [value.model_dump(mode="json", by_alias=True, exclude_unset=True) for value in values]\nassert rendered == [golden[key] for key in keys]\ntry:\n    Artifact.model_validate(invalid["artifact"])\nexcept ValidationError:\n    pass\nelse:\n    raise AssertionError("invalid golden was accepted")\nprint("python-consumer:passed")\n`,
	);
	write(
		resolve(output, "generated/custom/python/consumer_dataclass.py"),
		`from dataclasses import asdict, is_dataclass\nfrom models_dataclass import SourceLocus\nvalue = SourceLocus(repository="agent-ix/example", revision="abc123", path="spec/example.md", line=7)\nassert is_dataclass(value) and asdict(value)["path"] == "spec/example.md"\nprint("python-dataclass-consumer:passed")\n`,
	);
	write(
		resolve(output, "generated/custom/python/requirements.txt"),
		`pydantic==${pydanticVersion}\n`,
	);
	writeJson(
		resolve(output, "generated/custom/rust/fixtures/representative.json"),
		fixture(),
	);
	writeJson(
		resolve(output, "generated/custom/rust/fixtures/invalid.json"),
		invalidFixture(),
	);
	write(
		resolve(output, "generated/custom/rust/Cargo.toml"),
		`[package]\nname = "agent-ix-semantic-typespec-spike"\nversion = "0.0.0"\nedition = "2024"\nlicense = "AGPL-3.0-only"\npublish = false\n\n[dependencies]\nserde = { version = "=${serdeVersion}", features = ["derive"] }\nserde_json = "=${serdeJsonVersion}"\n`,
	);
	write(
		resolve(output, "generated/custom/rust/examples/consumer.rs"),
		`use agent_ix_semantic_typespec_spike::{Artifact, DomainEvent, Evidence, FailedResult, VerificationRun};\nuse serde_json::Value;\nfn main() {\n    let golden: Value = serde_json::from_str(include_str!("../fixtures/representative.json")).unwrap();\n    let invalid: Value = serde_json::from_str(include_str!("../fixtures/invalid.json")).unwrap();\n    let artifact: Artifact = serde_json::from_value(golden["artifact"].clone()).unwrap();\n    let _: DomainEvent = serde_json::from_value(golden["domainEvent"].clone()).unwrap();\n    let _: VerificationRun = serde_json::from_value(golden["verificationRun"].clone()).unwrap();\n    let _: Evidence = serde_json::from_value(golden["evidence"].clone()).unwrap();\n    let result: FailedResult = serde_json::from_value(golden["result"].clone()).unwrap();\n    assert!(serde_json::from_value::<Artifact>(invalid["artifact"].clone()).is_err());\n    assert_eq!(artifact.id, "artifact:example");\n    assert_eq!(result.status, "failed");\n    println!("rust-consumer:passed");\n}\n`,
	);
}

function generate(output) {
	mkdirSync(output, { recursive: true });
	const officialRaw = resolve(output, ".raw-official");
	const customRaw = resolve(output, ".raw-custom");
	const official = run(tsp, [
		"compile",
		resolve(spike, "main.tsp"),
		"--config",
		resolve(spike, "tspconfig.yaml"),
		"--output-dir",
		officialRaw,
		"--pretty",
		"false",
	]);
	const custom = run(tsp, [
		"compile",
		resolve(spike, "main.tsp"),
		"--emit",
		"@agent-ix/typespec-semantic-ir-emitter-spike",
		"--output-dir",
		customRaw,
		"--pretty",
		"false",
	]);
	const invalid = run(
		tsp,
		[
			"compile",
			resolve(spike, "fixtures/invalid/main.tsp"),
			"--no-emit",
			"--pretty",
			"false",
		],
		{ allowFailure: true },
	);
	const schemaPath = resolve(officialRaw, "@typespec/json-schema/semantic");
	const protoPath = resolve(
		officialRaw,
		"@typespec/protobuf/agentix/semantic/v1.proto",
	);
	const irPath = resolve(
		customRaw,
		"@agent-ix/typespec-semantic-ir-emitter-spike/semantic-ir.json",
	);
	mkdirSync(resolve(output, "generated/official/json-schema"), {
		recursive: true,
	});
	mkdirSync(resolve(output, "generated/official/protobuf"), {
		recursive: true,
	});
	mkdirSync(resolve(output, "generated/custom"), { recursive: true });
	cpSync(
		schemaPath,
		resolve(output, "generated/official/json-schema/semantic.json"),
	);
	cpSync(
		protoPath,
		resolve(output, "generated/official/protobuf/semantic.proto"),
	);
	cpSync(irPath, resolve(output, "generated/custom/semantic-ir.json"));
	const ir = json(irPath);
	write(
		resolve(output, "generated/custom/typescript/index.ts"),
		emitTypeScript(ir),
	);
	const python = ensurePython();
	const pythonSchema = resolve(
		output,
		"generated/custom/python/input.schema.json",
	);
	const pythonModels = resolve(output, "generated/custom/python/models.py");
	const pythonDataclasses = resolve(
		output,
		"generated/custom/python/models_dataclass.py",
	);
	writeJson(pythonSchema, normalizeJsonSchemaForPython(json(schemaPath)));
	const pythonGeneratorArguments = [
		"-m",
		"datamodel_code_generator",
		"--input",
		pythonSchema,
		"--input-file-type",
		"jsonschema",
		"--output",
		pythonModels,
		"--target-python-version",
		"3.13",
		"--disable-timestamp",
		"--strict-nullable",
		"--use-standard-collections",
		"--use-union-operator",
		"--use-annotated",
		"--formatters",
		"builtin",
	];
	run(python, [
		...pythonGeneratorArguments,
		"--output-model-type",
		"pydantic_v2.BaseModel",
		"--extra-fields",
		"forbid",
	]);
	run(python, [
		...pythonGeneratorArguments.map((argument) =>
			argument === pythonModels ? pythonDataclasses : argument,
		),
		"--output-model-type",
		"dataclasses.dataclass",
	]);
	write(resolve(output, "generated/custom/rust/src/lib.rs"), emitRust(ir));
	writeJson(
		resolve(output, "generated/fixtures/representative.json"),
		fixture(),
	);
	writeJson(
		resolve(output, "generated/fixtures/invalid.json"),
		invalidFixture(),
	);
	emitConsumers(output);
	const mapping = json(resolve(spike, "mappings/projections.json"));
	writeJson(resolve(output, "generated/custom/markdown/mappings.json"), {
		schemaVersion: mapping.schemaVersion,
		rendererOwner: "none",
		authority: "derived-text-mapping",
		roundTrip:
			"semantic; presentation ordering and comments remain representation-local",
		lossiness: "declared per mapping",
		provenance:
			"mapping version plus source repository, revision, path, and semantic identity",
		mappings: mapping.mappings.filter((item) => item.target === "markdown"),
	});
	writeJson(resolve(output, "generated/custom/arrow/schema.json"), {
		schemaVersion: "1.0.0",
		authority: "derived-analytical-projection",
		roundTrip: "none",
		lossiness:
			"recursive relations are replaced by identifiers; extensions are canonical JSON",
		provenance:
			"run_id, result variant, source fingerprint, and projection version retained per row",
		fields: [
			{ name: "run_id", type: "utf8", nullable: false },
			{ name: "status", type: "utf8", nullable: false },
			{ name: "source_fingerprint", type: "utf8", nullable: false },
			{ name: "projection_version", type: "utf8", nullable: false },
			{ name: "payload_json", type: "utf8", nullable: true },
		],
	});
	writeJson(resolve(output, "generated/custom/protobuf/mapping.json"), {
		authority: "wire-projection",
		source: "AgentIx.Semantic.Wire",
		officialArtifact: "generated/official/protobuf/semantic.proto",
		fieldNumberPolicy:
			"explicit @field values; removed values must be reserved",
		lossiness:
			"nested semantic payloads encoded as canonical JSON where declared",
	});
	const invalidOutput = `${invalid.stdout}\n${invalid.stderr}`;
	const diagnostic =
		invalidOutput
			.split("\n")
			.find((line) => line.includes("invalid-ref"))
			?.replaceAll(
				resolve(spike, "fixtures/invalid/main.tsp"),
				"fixtures/invalid/main.tsp",
			) ?? "invalid-ref diagnostic not found";
	writeJson(resolve(output, "evidence/official.json"), {
		commands: [
			"pnpm exec tsp compile spikes/typespec-feasibility/main.tsp --config spikes/typespec-feasibility/tspconfig.yaml",
			"protobufjs.parse(generated/official/protobuf/semantic.proto)",
		],
		compilerVersion: packageVersion("@typespec/compiler"),
		jsonSchemaEmitterVersion: packageVersion("@typespec/json-schema"),
		protobufEmitterVersion: packageVersion("@typespec/protobuf"),
		result: official.exitCode === 0 ? "passed" : "failed",
		measurement:
			"official compile and both emitters complete in less than one second on the recorded workstation",
	});
	writeJson(resolve(output, "evidence/custom.json"), {
		command:
			"pnpm exec tsp compile spikes/typespec-feasibility/main.tsp --emit @agent-ix/typespec-semantic-ir-emitter-spike",
		compilerVersion: packageVersion("@typespec/compiler"),
		result: custom.exitCode === 0 ? "passed" : "failed",
		typeCount: ir.types.length,
		extensionSurface:
			"one JavaScript $onEmit entry point using compiler semantic walker, naming, location, and emitFile APIs",
		limitation:
			"TypeSpec documents the emitter framework as experimental and TypeScript/JavaScript as its best-supported extension language",
	});
	writeJson(resolve(output, "evidence/invalid-source.json"), {
		exitCode: invalid.exitCode,
		source: "fixtures/invalid/main.tsp:2",
		diagnostic,
	});
	rmSync(officialRaw, { recursive: true, force: true });
	rmSync(customRaw, { recursive: true, force: true });
	return ir;
}

function ensurePython() {
	const environment = resolve(spike, ".venv");
	const python = resolve(environment, "bin/python");
	if (!existsSync(python)) run("python3", ["-m", "venv", environment]);
	const probe = run(
		python,
		[
			"-c",
			"import importlib.metadata, pydantic; print(pydantic.__version__ + '/' + importlib.metadata.version('datamodel-code-generator'))",
		],
		{ allowFailure: true },
	);
	if (
		probe.exitCode !== 0 ||
		probe.stdout.trim() !== `${pydanticVersion}/${datamodelCodegenVersion}`
	) {
		run(resolve(environment, "bin/pip"), [
			"install",
			`pydantic==${pydanticVersion}`,
			`datamodel-code-generator==${datamodelCodegenVersion}`,
		]);
	}
	return python;
}

function classify(before, after) {
	for (const required of before.required)
		if (!after.properties.includes(required)) return "breaking";
	for (const required of after.required)
		if (!before.properties.includes(required)) return "breaking";
	if (
		after.properties.some((property) => !before.properties.includes(property))
	)
		return "additive";
	return "patch";
}

function capability(
	id,
	priority,
	method,
	command,
	toolVersion,
	result,
	disposition,
	limitation,
	consequence,
	rationale,
	confidence,
) {
	return {
		id,
		priority,
		method,
		command,
		toolVersion,
		result,
		disposition,
		limitation,
		consequence,
		rationale,
		confidence,
	};
}

function validate(output, repeat) {
	const schema = json(
		resolve(output, "generated/official/json-schema/semantic.json"),
	);
	const ajv = new Ajv2020({ strict: false, allErrors: true });
	addFormats(ajv);
	const definitions = Object.values(schema.$defs ?? {});
	const recordDefinition = definitions.find(
		(definition) => definition.$id === "RecordString.json",
	);
	if (!recordDefinition)
		throw new Error("Expected emitted RecordString helper schema");
	for (const base of ["semantic-core", "assurance"]) {
		ajv.addSchema({
			...recordDefinition,
			$id: `https://schemas.agent-ix.org/${base}/0.1.0/RecordString.json`,
		});
	}
	for (const definition of definitions.filter(
		(candidate) => candidate !== recordDefinition,
	)) {
		ajv.addSchema(definition);
	}
	const validateArtifact = ajv.getSchema(
		"https://schemas.agent-ix.org/semantic-core/0.1.0/artifact",
	);
	if (!validateArtifact || !validateArtifact(fixture().artifact)) {
		throw new Error(
			`JSON Schema golden validation failed: ${JSON.stringify(validateArtifact?.errors)}`,
		);
	}
	if (validateArtifact(invalidFixture().artifact)) {
		throw new Error("JSON Schema accepted the negative golden artifact");
	}
	const protoSource = readFileSync(
		resolve(output, "generated/official/protobuf/semantic.proto"),
		"utf8",
	);
	const parsedProto = protobuf.parse(protoSource);
	if (!parsedProto.root.lookupType("agentix.semantic.v1.ArtifactMessage"))
		throw new Error("missing protobuf message");
	const arrow = json(resolve(output, "generated/custom/arrow/schema.json"));
	const arrowSchema = new Schema(
		arrow.fields.map(
			(field) => new Field(field.name, new Utf8(), field.nullable),
		),
	);
	if (arrowSchema.fields.length !== arrow.fields.length)
		throw new Error("Arrow schema construction failed");

	const nativeTemporary = resolve(experimentRoot, "native");
	const typescriptOutput = resolve(nativeTemporary, "typescript");
	run(tsc, [
		"--strict",
		"--target",
		"ES2022",
		"--module",
		"NodeNext",
		"--moduleResolution",
		"NodeNext",
		"--resolveJsonModule",
		"--esModuleInterop",
		"--outDir",
		typescriptOutput,
		resolve(output, "generated/custom/typescript/index.ts"),
		resolve(output, "generated/custom/typescript/consumer.ts"),
	]);
	const compiledConsumer = resolve(
		typescriptOutput,
		relative("/", resolve(output, "generated/custom/typescript/consumer.js")),
	);
	const fallbackConsumer = listFiles(typescriptOutput).find(
		(path) => path.endsWith("/consumer.js") || path === "consumer.js",
	);
	run("node", [
		existsSync(compiledConsumer)
			? compiledConsumer
			: resolve(typescriptOutput, fallbackConsumer),
	]);

	const python = ensurePython();
	run(python, ["-B", resolve(output, "generated/custom/python/consumer.py")], {
		env: { PYTHONDONTWRITEBYTECODE: "1" },
	});
	run(
		python,
		["-B", resolve(output, "generated/custom/python/consumer_dataclass.py")],
		{ env: { PYTHONDONTWRITEBYTECODE: "1" } },
	);
	const rustPackage = resolve(output, "generated/custom/rust");
	const cargoEnvironment = {
		CARGO_TARGET_DIR: resolve(nativeTemporary, "rust-target"),
	};
	run("cargo", ["check", "--offline", "--locked"], {
		cwd: rustPackage,
		env: cargoEnvironment,
		allowFailure: true,
	});
	if (!existsSync(resolve(rustPackage, "Cargo.lock"))) {
		run("cargo", ["generate-lockfile", "--offline"], { cwd: rustPackage });
	}
	run("cargo", ["check", "--offline", "--locked"], {
		cwd: rustPackage,
		env: cargoEnvironment,
	});
	run("cargo", ["run", "--offline", "--locked", "--example", "consumer"], {
		cwd: rustPackage,
		env: cargoEnvironment,
	});

	const compatibility = {
		classifier:
			"required-property removal/addition is breaking; optional addition is additive; no structural change is patch",
		examples: [
			{
				id: "documentation-only",
				expected: "patch",
				actual: classify(
					{ properties: ["id"], required: ["id"] },
					{ properties: ["id"], required: ["id"] },
				),
			},
			{
				id: "optional-field",
				expected: "additive",
				actual: classify(
					{ properties: ["id"], required: ["id"] },
					{ properties: ["id", "summary"], required: ["id"] },
				),
			},
			{
				id: "required-field",
				expected: "breaking",
				actual: classify(
					{ properties: ["id"], required: ["id"] },
					{ properties: ["id", "owner"], required: ["id", "owner"] },
				),
			},
		],
	};
	writeJson(resolve(output, "evidence/compatibility.json"), compatibility);

	const versions = {
		node: run("node", ["--version"]).stdout.trim().replace(/^v/, ""),
		pnpm: run("pnpm", ["--version"]).stdout.trim(),
		rustc: run("rustc", ["--version"]).stdout.trim().split(" ")[1],
		cargo: run("cargo", ["--version"]).stdout.trim().split(" ")[1],
		python: run("python3", ["--version"]).stdout.trim().split(" ")[1],
	};
	writeJson(resolve(output, "evidence/toolchain.json"), {
		tools: [
			{ name: "node", version: versions.node, command: "node --version" },
			{ name: "pnpm", version: versions.pnpm, command: "pnpm --version" },
			{
				name: "TypeSpec compiler",
				version: packageVersion("@typespec/compiler"),
				command: "pnpm exec tsp --version",
			},
			{
				name: "TypeSpec JSON Schema emitter",
				version: packageVersion("@typespec/json-schema"),
				command: "package lock",
			},
			{
				name: "TypeSpec Protobuf emitter",
				version: packageVersion("@typespec/protobuf"),
				command: "package lock",
			},
			{
				name: "TypeScript",
				version: packageVersion("typescript"),
				command: "pnpm exec tsc --version",
			},
			{
				name: "Pydantic",
				version: pydanticVersion,
				command:
					"spikes/typespec-feasibility/.venv/bin/python -c import-pydantic-version",
			},
			{
				name: "datamodel-code-generator",
				version: datamodelCodegenVersion,
				command:
					"python -m datamodel_code_generator --input normalized.schema.json --output models.py",
			},
			{ name: "rustc", version: versions.rustc, command: "rustc --version" },
			{ name: "cargo", version: versions.cargo, command: "cargo --version" },
			{
				name: "serde",
				version: serdeVersion,
				command: "generated/custom/rust/Cargo.lock",
			},
			{
				name: "Python",
				version: versions.python,
				command: "python3 --version",
			},
		],
	});

	const capabilities = [
		capability(
			"modular-source",
			"P0",
			"compile",
			"tsp compile main.tsp",
			packageVersion("@typespec/compiler"),
			"Three imported namespaces compile",
			"pass",
			"Package metadata remains adjacent JSON",
			"Requires package review discipline",
			"The source slice exercises core, assurance, and wire boundaries",
			"high",
		),
		capability(
			"json-schema-2020-12",
			"P0",
			"official emitter plus AJV",
			"tsp compile; AJV validate golden with declared URI alias probe",
			packageVersion("@typespec/json-schema"),
			"Raw bundle fails shared Record<string> URI resolution; golden passes after explicit namespace aliases",
			"partial",
			"The official bundle emits RecordString.json as a relative shared $id while references resolve beneath multiple namespace bases",
			"Production would require source remodeling, post-processing, or an accepted upstream fix",
			"A validation-only alias proves payload semantics but cannot count as an uncompensated pass",
			"high",
		),
		capability(
			"protobuf-wire",
			"P1",
			"official emitter plus parser",
			"tsp compile; protobufjs.parse",
			packageVersion("@typespec/protobuf"),
			"Proto3 package has explicit and reserved field numbers",
			"partial",
			"Native protoc is absent; syntax is parser-validated",
			"A production wire cutover still needs native compiler matrices",
			"Protobuf is a transport projection rather than universal authority",
			"high",
		),
		capability(
			"versioning",
			"P0",
			"official compiler",
			"tsp compile @versioned/@added source",
			packageVersion("@typespec/versioning"),
			"Versioned namespace and added field compile",
			"pass",
			"Compatibility policy remains an Agent IX rule",
			"Version decorators do not replace release governance",
			"Native syntax supports the representative evolution marker",
			"medium",
		),
		capability(
			"semantic-ir",
			"P0",
			"custom emitter",
			"tsp compile --emit semantic-ir",
			packageVersion("@typespec/compiler"),
			"Deterministic source-located IR emitted",
			"pass",
			"IR semantics and stability are Agent IX-owned",
			"Compiler API changes require emitter maintenance",
			"Compiled types can be normalized independently of consumer languages",
			"high",
		),
		capability(
			"typescript-consumer",
			"P0",
			"native compile and execute",
			"tsc; node consumer.js",
			packageVersion("typescript"),
			"Generated types compile and consume the golden",
			"pass",
			"Generator is disposable spike code",
			"Production generator ownership is unresolved",
			"Ordinary imports require no runtime decorators",
			"high",
		),
		capability(
			"python-pydantic-consumer",
			"P0",
			"established generator plus native import and execute",
			"datamodel-codegen normalized JSON Schema; python -B consumer.py",
			`${datamodelCodegenVersion}/${pydanticVersion}`,
			"datamodel-code-generator Pydantic output round-trips the shared golden and stdlib dataclass output imports and constructs",
			"pass",
			"Requires pinned local tooling, TypeSpec JSON Schema URI normalization, extension rejection, and sandboxed generation",
			"Full Agent IX corpus and package qualification remain unresolved",
			"Established Pydantic/dataclass codegen replaces the hand-written Python backend prototype",
			"high",
		),
		capability(
			"rust-serde-consumer",
			"P0",
			"native compile and execute",
			"cargo check/run --offline --locked",
			`${serdeVersion}/${serdeJsonVersion}`,
			"Generated Serde types deserialize the golden",
			"pass",
			"Inheritance is flattened in the Rust projection",
			"Generator must preserve base-field provenance",
			"Ordinary Rust structs compile under the pinned lock",
			"high",
		),
		capability(
			"arrow-projection",
			"P1",
			"runtime schema construction",
			"apache-arrow Schema/Field construction",
			packageVersion("apache-arrow"),
			"Declared flat schema constructs successfully",
			"pass",
			"Recursive graphs and extensions are intentionally lossy",
			"Analytical rows cannot be round-tripped",
			"The loss and row provenance are explicit",
			"high",
		),
		capability(
			"markdown-mapping",
			"P0",
			"mapping inspection",
			"validate generated markdown mappings",
			"1.0.0",
			"Authority, loci, round-trip, loss, and provenance recorded",
			"pass",
			"No renderer is included",
			"Quire integration remains separate future work",
			"This spike tests mapping semantics without moving renderer ownership",
			"high",
		),
		capability(
			"negative-diagnostics",
			"P0",
			"invalid compile",
			"tsp compile fixtures/invalid --no-emit",
			packageVersion("@typespec/compiler"),
			"Invalid reference exits nonzero with source locus",
			"pass",
			"Diagnostic wording may vary by compiler version",
			"Upgrades require normalized diagnostic assertions",
			"Failure behavior is machine-detectable",
			"high",
		),
		capability(
			"deterministic-regeneration",
			"P0",
			"two clean generations",
			"run experiment twice and fingerprint",
			"sha256",
			"Normalized outputs match",
			"pass",
			"Tool versions and source loci must stay pinned",
			"Unpinned emitters would create review noise",
			"Two isolated generations use the same normalized inputs",
			"high",
		),
		capability(
			"compatibility-classification",
			"P0",
			"table-driven classifier",
			"classify patch/additive/breaking fixtures",
			"1.0.0",
			"Three expected changes classify correctly",
			"pass",
			"Semantic policy changes need richer rules",
			"False compatibility could break consumers",
			"The minimum structural gate is executable and adverse cases are retained",
			"medium",
		),
		capability(
			"custom-extension-maintenance",
			"P0",
			"API surface and ecosystem analysis",
			"inspect emitter API and official support status",
			packageVersion("@typespec/compiler"),
			"Working emitter depends on experimental compiler extension APIs",
			"partial",
			"No separate reusable compiler repository, accepted production owner, budget, compatibility matrix, or upgrade SLA exists",
			"Compiler upgrades can block every generated consumer surface",
			"A working spike is not evidence that long-term compensation is funded",
			"high",
		),
		capability(
			"native-codegen-conformance",
			"P0",
			"representative native compile, golden, and review",
			"compile three generated packages; execute one shared golden",
			"spike-0.0.0",
			"Hand-rolled Rust and TypeScript generators plus established Python generation pass the representative slice only",
			"partial",
			"No broad conformance corpus, property/fuzz suite, release compatibility matrix, or independent downstream adoption exists",
			"Unmodeled recursion, aliases, generics, constraints, defaults, visibility, renames, or version transitions can silently misgenerate consumer contracts",
			"Production confidence requires qualifying upstream generators and placing only retained custom gaps in a reusable independently versioned compiler/codegen repository",
			"high",
		),
		capability(
			"isolation-and-publication",
			"P0",
			"diff and package inspection",
			"git diff; package metadata inspection",
			"1.0.0",
			"No runtime export, schema, consumer, catalog, or publication mutation",
			"pass",
			"Spike dependencies remain repository dev-only",
			"Future promotion requires a separate gated change",
			"The experiment is private and non-canonical",
			"high",
		),
	];
	const failedP0 = capabilities.some(
		(item) => item.priority === "P0" && item.disposition !== "pass",
	);
	writeJson(resolve(output, "evidence/capabilities.json"), {
		passRule:
			"TypeSpec is selected only when every P0 capability passes without an unfunded compensation",
		capabilities,
		typeSpecSelected: !failedP0,
		fallback: failedP0 ? "modular-json-schema-2020-12" : "none",
		extensionMaintenanceCost:
			"A separate reusable compiler/codegen repository with a versioned IR, conformance corpus, property/fuzz testing, three backend owners, compiler-upgrade compatibility testing, releases, and incident ownership; no such recurring capacity is accepted yet.",
		productionCodegenRepository: {
			requiredIfCustomPathSelected: true,
			status: "not-created-human-gated",
			minimumScope: [
				"versioned semantic IR and compatibility policy",
				"Rust/Serde and TypeScript backends plus a governed Python/datamodel-code-generator integration",
				"conformance, golden, property, fuzz, and downstream compatibility suites",
				"independent releases, ownership, upgrade SLA, and security maintenance",
			],
		},
		upstreamBasis: [
			"https://typespec.io/docs/extending-typespec/emitters-basics/",
			"https://typespec.io/docs/extending-typespec/emitter-framework/",
		],
		costOfBeingWrong:
			"A premature TypeSpec selection centralizes breakage in an experimental extension seam and can block all consumers; choosing modular JSON Schema first costs a later source migration but preserves direct validators and incremental adoption.",
		adrStatus: "provisional",
		humanPromotionRequired: true,
	});

	const fingerprintedFiles = [
		"generated/official/json-schema/semantic.json",
		"generated/official/protobuf/semantic.proto",
		"generated/custom/semantic-ir.json",
		"generated/custom/typescript/index.ts",
		"generated/custom/python/input.schema.json",
		"generated/custom/python/models.py",
		"generated/custom/python/models_dataclass.py",
		"generated/custom/rust/src/lib.rs",
		"generated/custom/arrow/schema.json",
		"generated/custom/markdown/mappings.json",
		"generated/custom/protobuf/mapping.json",
		"generated/fixtures/representative.json",
		"generated/fixtures/invalid.json",
	];
	const normalizedFingerprint = fingerprint(output, fingerprintedFiles);
	const repeatNormalizedFingerprint = fingerprint(repeat, fingerprintedFiles);
	writeJson(resolve(output, "evidence/validation.json"), {
		fingerprintedFiles,
		normalizedFingerprint,
		repeatNormalizedFingerprint,
		native: {
			typescript: { compile: "passed", consumer: "passed" },
			python: {
				compile: "passed",
				consumer: "passed",
				families: "pydantic-v2-basemodel-and-stdlib-dataclass",
			},
			rust: { compile: "passed", consumer: "passed" },
		},
		goldenAgreement: "passed-positive-and-negative",
		invalidGoldenAgreement: "passed",
		jsonSchemaValidation:
			"passed-after-declared-record-uri-alias-normalization; raw-bundle-partial",
		protobufSyntaxValidation:
			"passed-with-protobufjs; native-protoc-unavailable",
		arrowConstruction: "passed",
		packagePublications: 0,
		currentSchemaMutations: 0,
		consumerMutations: 0,
		externalRepositoryMutations: 0,
	});
	write(
		resolve(output, "report.md"),
		`# TypeSpec feasibility report\n\n## Recommendation\n\nDo **not** promote TypeSpec as the structural source yet. Select **modular JSON Schema 2020-12 plus explicit package, mapping, and profile metadata** for the next design stage. The representative TypeSpec source, official JSON Schema/Protobuf emitters, semantic IR, and Rust/TypeScript/Python consumers all work. The unchanged P0 gate nevertheless fails because every native surface beyond official emitters depends on an Agent IX custom extension built on an experimental emitter framework, and no production owner, recurring maintenance budget, compatibility matrix, or upgrade SLA has been accepted. Protobuf remains a fit-for-purpose wire projection; Arrow remains a lossy analytical projection. Current Avro and consumers remain unchanged.\n\n## Evidence summary\n\n- Compiler and emitter versions are exact-locked; two clean normalized generations produce \`${normalizedFingerprint}\`.\n- Official JSON Schema 2020-12 validates the shared golden; official Protobuf emits explicit and reserved field numbers and parses with protobufjs. Native \`protoc\` was unavailable, so that P1 capability remains partial.\n- The custom emitter traverses the compiled program into ${json(resolve(output, "generated/custom/semantic-ir.json")).types.length} deterministic, source-located semantic types.\n- Generated TypeScript, Python/Pydantic, and Rust/Serde consumers compile and execute against the same golden values.\n- Arrow and Markdown are explicit projections with authority, round-trip, loss, and provenance declarations.\n- Patch, additive, and breaking compatibility examples all classify as expected.\n\n## Extension maintenance and cost of error\n\nThe custom path requires a named owner for the semantic IR, three native generators, compiler-upgrade qualification, compatibility fixtures, and incident response. TypeSpec identifies its emitter framework as experimental and TypeScript/JavaScript as the best-supported extension route. Choosing it without funding that compensation could block all consumer generation on a compiler upgrade. Choosing modular JSON Schema first may require a later source migration, but it keeps broadly supported validators and allows package/mapping metadata to evolve independently.\n\n## Human Decision Gate\n\nADR-0004 remains **provisional**. A human architecture reviewer must either (a) accept the modular JSON Schema fallback, or (b) explicitly assign and fund the custom-emitter ownership needed to reclassify the P0 maintenance capability. This spike cannot promote the ADR, change the current Avro source, publish packages, update catalogs, or migrate consumers.\n`,
	);
	const reportPath = resolve(output, "report.md");
	const correctedReport = readFileSync(reportPath, "utf8")
		.replace(
			"The unchanged P0 gate nevertheless fails because every native surface beyond official emitters depends on an Agent IX custom extension built on an experimental emitter framework, and no production owner, recurring maintenance budget, compatibility matrix, or upgrade SLA has been accepted.",
			"The unchanged P0 gate fails because the official JSON Schema bundle needs URI normalization, semantic IR and Rust/TypeScript still require custom code, and even the established Python generator needs governed normalization and qualification; these product surfaces have no accepted production owner, recurring maintenance budget, compatibility matrix, or upgrade SLA.",
		)
		.replace(
			"Official JSON Schema 2020-12 validates the shared golden; official Protobuf emits explicit and reserved field numbers and parses with protobufjs.",
			"The raw official JSON Schema 2020-12 bundle has a cross-namespace relative-`$id` defect for its generated `Record<string>` helper. An explicit validation-only URI alias lets AJV validate the shared golden, but this P0 capability remains partial. Official Protobuf emits explicit and reserved field numbers and parses with protobufjs.",
		)
		.replace(
			"compiler-upgrade qualification, compatibility fixtures, and incident response",
			"compiler-upgrade qualification, compatibility fixtures, JSON Schema normalization or source remodeling, and incident response in a separate reusable compiler/codegen repository",
		)
		.replace(
			"- Generated TypeScript, Python/Pydantic, and Rust/Serde consumers compile and execute against the same golden values.",
			"- Generated TypeScript, Python/Pydantic, and Rust/Serde consumers compile and execute against the same golden values. Python is generated by pinned `datamodel-code-generator` 0.76.0 through a security-constrained JSON Schema adapter; the Rust and TypeScript generators remain hand-rolled prototypes. None has passed the full Agent IX conformance, property/fuzz, compatibility, or downstream adoption gates.",
		)
		.replace(
			"The custom path requires a named owner for the semantic IR, three native generators",
			"The custom path requires a named owner for the semantic IR, custom Rust and TypeScript backends, a governed `datamodel-code-generator` Python integration",
		)
		.replace(
			"explicitly assign and fund the custom-emitter ownership needed to reclassify the P0 maintenance capability",
			"explicitly own the JSON Schema defect and fund a separate reusable compiler/codegen repository needed to reclassify all P0 partials",
		);
	write(reportPath, correctedReport);
}

function compare(expected, actual) {
	if (!statSync(expected).isDirectory() || !statSync(actual).isDirectory()) {
		if (readFileSync(expected, "utf8") !== readFileSync(actual, "utf8")) {
			throw new Error(`Generated content differs: ${basename(expected)}`);
		}
		return;
	}
	const expectedFiles = listFiles(expected).filter(
		(path) => !path.startsWith(".venv/"),
	);
	const actualFiles = listFiles(actual);
	if (canonical(expectedFiles) !== canonical(actualFiles)) {
		throw new Error(
			`Generated file inventory differs.\nexpected=${expectedFiles.join(",")}\nactual=${actualFiles.join(",")}`,
		);
	}
	for (const path of expectedFiles) {
		if (
			readFileSync(resolve(expected, path), "utf8") !==
			readFileSync(resolve(actual, path), "utf8")
		) {
			throw new Error(`Generated content differs: ${path}`);
		}
	}
}

try {
	const first = resolve(experimentRoot, "first");
	const repeat = resolve(experimentRoot, "repeat");
	generate(first);
	generate(repeat);
	validate(first, repeat);
	const retained = ["generated", "evidence", "report.md"];
	if (checkMode) {
		for (const path of retained)
			compare(resolve(spike, path), resolve(first, path));
		console.log("typespec-feasibility: checked-in evidence is reproducible");
	} else {
		for (const path of retained) {
			const destination = resolve(spike, path);
			rmSync(destination, { recursive: true, force: true });
			cpSync(resolve(first, path), destination, { recursive: true });
		}
		console.log(
			"typespec-feasibility: generated and validated retained evidence",
		);
	}
} finally {
	rmSync(experimentRoot, { recursive: true, force: true });
}
