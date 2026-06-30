// Generated from schema/avro/core-data.avpr. Do not edit by hand.

export const CORE_DATA_SCHEMA_VERSION =
	"agent_ix.core_data.CoreData:1" as const;

export type CoreArtifactKind = "spec" | "plan" | "review";

export interface CoreArtifactEntry {
	kind: CoreArtifactKind;
	type: string;
	code: string;
	title: string;
	relPath: string;
	name: string;
}

export interface CoreArtifactGroup {
	kind: CoreArtifactKind;
	entries: CoreArtifactEntry[];
}

export interface CoreIndexStatus {
	projectRoot?: string | null;
	ready: boolean;
	indexedFiles: number;
	errorFiles: number;
	lastRunAt?: string | null;
	lastRunReason?: string | null;
	lastError?: string | null;
}

export interface CoreSearchFilters {
	artifactRef?: string | null;
	artifactId?: string | null;
	documentId?: string | null;
	objectType?: string | null;
}

export interface CoreSearchRequest {
	query: string;
	topK?: number | null;
	filters?: CoreSearchFilters | null;
}

export interface CoreSearchSignal {
	contributing: boolean;
	rank?: number | null;
	contribution: number;
}

export interface CoreSearchSignals {
	lexical: CoreSearchSignal;
	vector: CoreSearchSignal;
	recency: CoreSearchSignal;
}

export interface CoreSearchHit {
	key: string;
	score: number;
	documentId?: string | null;
	artifactId?: string | null;
	graphNodeId?: string | null;
	artifactRef?: string | null;
	title: string;
	snippet: string;
	signals: CoreSearchSignals;
}

export interface CoreSearchResult {
	hits: CoreSearchHit[];
	egressNote?: string | null;
}

export interface CoreDocumentRecord {
	id: string;
	projectId: string;
	relPath: string;
	body: string;
	frontmatterJson: string;
	parsedAstJson?: string | null;
	contentHash: string;
	docKind: CoreArtifactKind;
	updatedAt?: string | null;
}

export interface CoreArtifactRecord {
	id: string;
	projectId: string;
	documentId: string;
	relPath: string;
	name: string;
	kind: CoreArtifactKind;
	type: string;
	code: string;
	title: string;
	specMetadataJson: string;
	updatedAt?: string | null;
}

export interface CoreObjectTypeRecord {
	id: string;
	projectId: string;
	name: string;
	schemaJson: string;
	allowedLinksJson: string;
	bodyExtractionJson?: string | null;
	hasPlugin: boolean;
	moduleId?: string | null;
	updatedAt?: string | null;
}

export interface CoreGraphNodeRef {
	id: string;
	projectId: string;
	documentId?: string | null;
	artifactId?: string | null;
	objectType: string;
	name?: string | null;
	ref: string;
	dataJson: string;
	updatedAt?: string | null;
}

export interface CoreGraphEdgeRef {
	id: string;
	projectId: string;
	sourceRef: string;
	targetRef: string;
	edgeType: string;
	dataJson: string;
	updatedAt?: string | null;
}

export interface CoreExtractionDiagnostic {
	code: string;
	message: string;
	severity: string;
	objectType?: string | null;
}

export interface CoreExtractionResult {
	documentId: string;
	artifactId?: string | null;
	objectTypes: CoreObjectTypeRecord[];
	nodes: CoreGraphNodeRef[];
	edges: CoreGraphEdgeRef[];
	diagnostics: CoreExtractionDiagnostic[];
	errors: string[];
}

export interface CoreSyncDiagnostic {
	source: string;
	phase: string;
	message: string;
	retryable: boolean;
	backoffMs?: number | null;
}

export interface CoreSyncFilePayload {
	runId: string;
	relPath: string;
	contentHash: string;
	document?: CoreDocumentRecord | null;
	artifacts: CoreArtifactRecord[];
	objectTypes?: CoreObjectTypeRecord[];
	graphNodes?: CoreGraphNodeRef[];
	graphEdges?: CoreGraphEdgeRef[];
	extraction?: CoreExtractionResult | null;
	diagnostics: CoreSyncDiagnostic[];
	errors: string[];
}

export type CoreDataRecordName =
	| "CoreArtifactEntry"
	| "CoreArtifactGroup"
	| "CoreIndexStatus"
	| "CoreSearchFilters"
	| "CoreSearchRequest"
	| "CoreSearchSignal"
	| "CoreSearchSignals"
	| "CoreSearchHit"
	| "CoreSearchResult"
	| "CoreDocumentRecord"
	| "CoreArtifactRecord"
	| "CoreObjectTypeRecord"
	| "CoreGraphNodeRef"
	| "CoreGraphEdgeRef"
	| "CoreExtractionDiagnostic"
	| "CoreExtractionResult"
	| "CoreSyncDiagnostic"
	| "CoreSyncFilePayload";

export const CORE_DATA_PROTOCOL = {
	protocol: "CoreData",
	namespace: "agent_ix.core_data",
	doc: "Shared Agent IX core data contract for Filament IDE, sync libraries, parser outputs, and filament-core-service adapters.",
	types: [
		{
			type: "enum",
			name: "CoreArtifactKind",
			symbols: ["spec", "plan", "review"],
		},
		{
			type: "record",
			name: "CoreArtifactEntry",
			fields: [
				{
					name: "kind",
					type: "CoreArtifactKind",
				},
				{
					name: "type",
					type: "string",
				},
				{
					name: "code",
					type: "string",
				},
				{
					name: "title",
					type: "string",
				},
				{
					name: "relPath",
					type: "string",
				},
				{
					name: "name",
					type: "string",
				},
			],
		},
		{
			type: "record",
			name: "CoreArtifactGroup",
			fields: [
				{
					name: "kind",
					type: "CoreArtifactKind",
				},
				{
					name: "entries",
					type: {
						type: "array",
						items: "CoreArtifactEntry",
					},
				},
			],
		},
		{
			type: "record",
			name: "CoreIndexStatus",
			fields: [
				{
					name: "projectRoot",
					type: ["null", "string"],
					default: null,
				},
				{
					name: "ready",
					type: "boolean",
				},
				{
					name: "indexedFiles",
					type: "int",
				},
				{
					name: "errorFiles",
					type: "int",
				},
				{
					name: "lastRunAt",
					type: ["null", "string"],
					default: null,
				},
				{
					name: "lastRunReason",
					type: ["null", "string"],
					default: null,
				},
				{
					name: "lastError",
					type: ["null", "string"],
					default: null,
				},
			],
		},
		{
			type: "record",
			name: "CoreSearchFilters",
			fields: [
				{
					name: "artifactRef",
					type: ["null", "string"],
					default: null,
				},
				{
					name: "artifactId",
					type: ["null", "string"],
					default: null,
				},
				{
					name: "documentId",
					type: ["null", "string"],
					default: null,
				},
				{
					name: "objectType",
					type: ["null", "string"],
					default: null,
				},
			],
		},
		{
			type: "record",
			name: "CoreSearchRequest",
			fields: [
				{
					name: "query",
					type: "string",
				},
				{
					name: "topK",
					type: ["null", "int"],
					default: null,
				},
				{
					name: "filters",
					type: ["null", "CoreSearchFilters"],
					default: null,
				},
			],
		},
		{
			type: "record",
			name: "CoreSearchSignal",
			fields: [
				{
					name: "contributing",
					type: "boolean",
				},
				{
					name: "rank",
					type: ["null", "int"],
					default: null,
				},
				{
					name: "contribution",
					type: "double",
				},
			],
		},
		{
			type: "record",
			name: "CoreSearchSignals",
			fields: [
				{
					name: "lexical",
					type: "CoreSearchSignal",
				},
				{
					name: "vector",
					type: "CoreSearchSignal",
				},
				{
					name: "recency",
					type: "CoreSearchSignal",
				},
			],
		},
		{
			type: "record",
			name: "CoreSearchHit",
			fields: [
				{
					name: "key",
					type: "string",
				},
				{
					name: "score",
					type: "double",
				},
				{
					name: "documentId",
					type: ["null", "string"],
					default: null,
				},
				{
					name: "artifactId",
					type: ["null", "string"],
					default: null,
				},
				{
					name: "graphNodeId",
					type: ["null", "string"],
					default: null,
				},
				{
					name: "artifactRef",
					type: ["null", "string"],
					default: null,
				},
				{
					name: "title",
					type: "string",
				},
				{
					name: "snippet",
					type: "string",
				},
				{
					name: "signals",
					type: "CoreSearchSignals",
				},
			],
		},
		{
			type: "record",
			name: "CoreSearchResult",
			fields: [
				{
					name: "hits",
					type: {
						type: "array",
						items: "CoreSearchHit",
					},
				},
				{
					name: "egressNote",
					type: ["null", "string"],
					default: null,
				},
			],
		},
		{
			type: "record",
			name: "CoreDocumentRecord",
			fields: [
				{
					name: "id",
					type: "string",
				},
				{
					name: "projectId",
					type: "string",
				},
				{
					name: "relPath",
					type: "string",
				},
				{
					name: "body",
					type: "string",
				},
				{
					name: "frontmatterJson",
					type: "string",
				},
				{
					name: "parsedAstJson",
					type: ["null", "string"],
					default: null,
				},
				{
					name: "contentHash",
					type: "string",
				},
				{
					name: "docKind",
					type: "CoreArtifactKind",
				},
				{
					name: "updatedAt",
					type: ["null", "string"],
					default: null,
				},
			],
		},
		{
			type: "record",
			name: "CoreArtifactRecord",
			fields: [
				{
					name: "id",
					type: "string",
				},
				{
					name: "projectId",
					type: "string",
				},
				{
					name: "documentId",
					type: "string",
				},
				{
					name: "relPath",
					type: "string",
				},
				{
					name: "name",
					type: "string",
				},
				{
					name: "kind",
					type: "CoreArtifactKind",
				},
				{
					name: "type",
					type: "string",
				},
				{
					name: "code",
					type: "string",
				},
				{
					name: "title",
					type: "string",
				},
				{
					name: "specMetadataJson",
					type: "string",
				},
				{
					name: "updatedAt",
					type: ["null", "string"],
					default: null,
				},
			],
		},
		{
			type: "record",
			name: "CoreObjectTypeRecord",
			fields: [
				{
					name: "id",
					type: "string",
				},
				{
					name: "projectId",
					type: "string",
				},
				{
					name: "name",
					type: "string",
				},
				{
					name: "schemaJson",
					type: "string",
				},
				{
					name: "allowedLinksJson",
					type: "string",
				},
				{
					name: "bodyExtractionJson",
					type: ["null", "string"],
					default: null,
				},
				{
					name: "hasPlugin",
					type: "boolean",
				},
				{
					name: "moduleId",
					type: ["null", "string"],
					default: null,
				},
				{
					name: "updatedAt",
					type: ["null", "string"],
					default: null,
				},
			],
		},
		{
			type: "record",
			name: "CoreGraphNodeRef",
			fields: [
				{
					name: "id",
					type: "string",
				},
				{
					name: "projectId",
					type: "string",
				},
				{
					name: "documentId",
					type: ["null", "string"],
					default: null,
				},
				{
					name: "artifactId",
					type: ["null", "string"],
					default: null,
				},
				{
					name: "objectType",
					type: "string",
				},
				{
					name: "name",
					type: ["null", "string"],
					default: null,
				},
				{
					name: "ref",
					type: "string",
				},
				{
					name: "dataJson",
					type: "string",
				},
				{
					name: "updatedAt",
					type: ["null", "string"],
					default: null,
				},
			],
		},
		{
			type: "record",
			name: "CoreGraphEdgeRef",
			fields: [
				{
					name: "id",
					type: "string",
				},
				{
					name: "projectId",
					type: "string",
				},
				{
					name: "sourceRef",
					type: "string",
				},
				{
					name: "targetRef",
					type: "string",
				},
				{
					name: "edgeType",
					type: "string",
				},
				{
					name: "dataJson",
					type: "string",
				},
				{
					name: "updatedAt",
					type: ["null", "string"],
					default: null,
				},
			],
		},
		{
			type: "record",
			name: "CoreExtractionDiagnostic",
			fields: [
				{
					name: "code",
					type: "string",
				},
				{
					name: "message",
					type: "string",
				},
				{
					name: "severity",
					type: "string",
				},
				{
					name: "objectType",
					type: ["null", "string"],
					default: null,
				},
			],
		},
		{
			type: "record",
			name: "CoreExtractionResult",
			fields: [
				{
					name: "documentId",
					type: "string",
				},
				{
					name: "artifactId",
					type: ["null", "string"],
					default: null,
				},
				{
					name: "objectTypes",
					type: {
						type: "array",
						items: "CoreObjectTypeRecord",
					},
				},
				{
					name: "nodes",
					type: {
						type: "array",
						items: "CoreGraphNodeRef",
					},
				},
				{
					name: "edges",
					type: {
						type: "array",
						items: "CoreGraphEdgeRef",
					},
				},
				{
					name: "diagnostics",
					type: {
						type: "array",
						items: "CoreExtractionDiagnostic",
					},
				},
				{
					name: "errors",
					type: {
						type: "array",
						items: "string",
					},
				},
			],
		},
		{
			type: "record",
			name: "CoreSyncDiagnostic",
			fields: [
				{
					name: "source",
					type: "string",
				},
				{
					name: "phase",
					type: "string",
				},
				{
					name: "message",
					type: "string",
				},
				{
					name: "retryable",
					type: "boolean",
				},
				{
					name: "backoffMs",
					type: ["null", "int"],
					default: null,
				},
			],
		},
		{
			type: "record",
			name: "CoreSyncFilePayload",
			fields: [
				{
					name: "runId",
					type: "string",
				},
				{
					name: "relPath",
					type: "string",
				},
				{
					name: "contentHash",
					type: "string",
				},
				{
					name: "document",
					type: ["null", "CoreDocumentRecord"],
					default: null,
				},
				{
					name: "artifacts",
					type: {
						type: "array",
						items: "CoreArtifactRecord",
					},
				},
				{
					name: "objectTypes",
					type: {
						type: "array",
						items: "CoreObjectTypeRecord",
					},
					default: [],
				},
				{
					name: "graphNodes",
					type: {
						type: "array",
						items: "CoreGraphNodeRef",
					},
					default: [],
				},
				{
					name: "graphEdges",
					type: {
						type: "array",
						items: "CoreGraphEdgeRef",
					},
					default: [],
				},
				{
					name: "extraction",
					type: ["null", "CoreExtractionResult"],
					default: null,
				},
				{
					name: "diagnostics",
					type: {
						type: "array",
						items: "CoreSyncDiagnostic",
					},
				},
				{
					name: "errors",
					type: {
						type: "array",
						items: "string",
					},
				},
			],
		},
	],
} as const;

type AvroType = string | readonly AvroType[] | AvroSchemaObject;

interface AvroSchemaObject {
	readonly type: string;
	readonly name?: string;
	readonly fields?: readonly {
		readonly name: string;
		readonly type: AvroType;
		readonly default?: unknown;
	}[];
	readonly items?: AvroType;
	readonly values?: AvroType;
	readonly symbols?: readonly string[];
}

const namedSchemas = new Map<string, AvroType>(
	CORE_DATA_PROTOCOL.types.map((schema) => [
		schema.name,
		schema as AvroSchemaObject,
	]),
);

export function validateCoreDataRecord(
	recordName: CoreDataRecordName,
	value: unknown,
): string[] {
	const schema = namedSchemas.get(recordName);
	if (!schema) return [`${recordName}: unknown core data record`];
	return validateAvro(schema, value, recordName);
}

function validateAvro(
	schema: AvroType,
	value: unknown,
	path: string,
): string[] {
	if (isAvroUnion(schema)) {
		const branchErrors = schema.map((branch) =>
			validateAvro(branch, value, path),
		);
		return branchErrors.some((errors) => errors.length === 0)
			? []
			: [`${path}: does not match union ${schema.map(labelFor).join(" | ")}`];
	}
	if (typeof schema === "string")
		return validateNamedOrPrimitive(schema, value, path);
	if (schema.type === "array") {
		if (!Array.isArray(value)) return [`${path}: expected array`];
		return value.flatMap((item, index) =>
			validateAvro(schema.items!, item, `${path}[${index}]`),
		);
	}
	if (schema.type === "map") {
		if (!isPlainRecord(value)) return [`${path}: expected map object`];
		return Object.entries(value).flatMap(([key, item]) =>
			validateAvro(schema.values!, item, `${path}.${key}`),
		);
	}
	if (schema.type === "enum") {
		return typeof value === "string" && schema.symbols?.includes(value)
			? []
			: [`${path}: expected one of ${schema.symbols?.join(", ")}`];
	}
	if (schema.type === "record") {
		if (!isPlainRecord(value)) return [`${path}: expected object`];
		return (schema.fields ?? []).flatMap((field) =>
			!(field.name in value) && "default" in field
				? []
				: validateAvro(field.type, value[field.name], `${path}.${field.name}`),
		);
	}
	return validateNamedOrPrimitive(schema.type, value, path);
}

function validateNamedOrPrimitive(
	typeName: string,
	value: unknown,
	path: string,
): string[] {
	if (typeName === "null")
		return value === null ? [] : [`${path}: expected null`];
	if (typeName === "string")
		return typeof value === "string" ? [] : [`${path}: expected string`];
	if (typeName === "boolean")
		return typeof value === "boolean" ? [] : [`${path}: expected boolean`];
	if (typeName === "int" || typeName === "long") {
		return Number.isInteger(value) ? [] : [`${path}: expected integer`];
	}
	if (typeName === "double" || typeName === "float") {
		return typeof value === "number" && Number.isFinite(value)
			? []
			: [`${path}: expected number`];
	}
	const namedSchema = namedSchemas.get(typeName);
	return namedSchema
		? validateAvro(namedSchema, value, path)
		: [`${path}: unknown type ${typeName}`];
}

function labelFor(schema: AvroType): string {
	if (typeof schema === "string") return schema;
	if (isAvroUnion(schema)) return schema.map(labelFor).join(" | ");
	return schema.name ?? schema.type;
}

function isAvroUnion(schema: AvroType): schema is readonly AvroType[] {
	return Array.isArray(schema);
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
