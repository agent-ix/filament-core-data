# Generated from schema/avro/core-data.avpr. Do not edit by hand.
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Literal

CORE_DATA_SCHEMA_VERSION = "agent_ix.core_data.CoreData:1"

CoreArtifactKind = Literal["spec", "plan", "review"]

@dataclass(frozen=True)
class CoreArtifactEntry:
    kind: CoreArtifactKind
    type: str
    code: str
    title: str
    relPath: str
    name: str

@dataclass(frozen=True)
class CoreArtifactGroup:
    kind: CoreArtifactKind
    entries: list[CoreArtifactEntry]

@dataclass(frozen=True)
class CoreIndexStatus:
    projectRoot: str | None
    ready: bool
    indexedFiles: int
    errorFiles: int
    lastRunAt: str | None
    lastRunReason: str | None
    lastError: str | None

@dataclass(frozen=True)
class CoreSearchFilters:
    artifactRef: str | None
    artifactId: str | None
    documentId: str | None
    objectType: str | None

@dataclass(frozen=True)
class CoreSearchRequest:
    query: str
    topK: int | None
    filters: CoreSearchFilters | None

@dataclass(frozen=True)
class CoreSearchSignal:
    contributing: bool
    rank: int | None
    contribution: float

@dataclass(frozen=True)
class CoreSearchSignals:
    lexical: CoreSearchSignal
    vector: CoreSearchSignal
    recency: CoreSearchSignal

@dataclass(frozen=True)
class CoreSearchHit:
    key: str
    score: float
    documentId: str | None
    artifactId: str | None
    graphNodeId: str | None
    artifactRef: str | None
    title: str
    snippet: str
    signals: CoreSearchSignals

@dataclass(frozen=True)
class CoreSearchResult:
    hits: list[CoreSearchHit]
    egressNote: str | None

@dataclass(frozen=True)
class CoreDocumentRecord:
    id: str
    projectId: str
    relPath: str
    body: str
    frontmatterJson: str
    parsedAstJson: str | None
    contentHash: str
    docKind: CoreArtifactKind
    updatedAt: str | None

@dataclass(frozen=True)
class CoreArtifactRecord:
    id: str
    projectId: str
    documentId: str
    relPath: str
    name: str
    kind: CoreArtifactKind
    type: str
    code: str
    title: str
    specMetadataJson: str
    updatedAt: str | None

@dataclass(frozen=True)
class CoreObjectTypeRecord:
    id: str
    projectId: str
    name: str
    schemaJson: str
    allowedLinksJson: str
    bodyExtractionJson: str | None
    hasPlugin: bool
    moduleId: str | None
    updatedAt: str | None

@dataclass(frozen=True)
class CoreGraphNodeRef:
    id: str
    projectId: str
    documentId: str | None
    artifactId: str | None
    objectType: str
    name: str | None
    ref: str
    dataJson: str
    updatedAt: str | None

@dataclass(frozen=True)
class CoreGraphEdgeRef:
    id: str
    projectId: str
    sourceRef: str
    targetRef: str
    edgeType: str
    dataJson: str
    updatedAt: str | None

@dataclass(frozen=True)
class CoreExtractionDiagnostic:
    code: str
    message: str
    severity: str
    objectType: str | None

@dataclass(frozen=True)
class CoreExtractionResult:
    documentId: str
    artifactId: str | None
    objectTypes: list[CoreObjectTypeRecord]
    nodes: list[CoreGraphNodeRef]
    edges: list[CoreGraphEdgeRef]
    diagnostics: list[CoreExtractionDiagnostic]
    errors: list[str]

@dataclass(frozen=True)
class CoreSyncDiagnostic:
    source: str
    phase: str
    message: str
    retryable: bool
    backoffMs: int | None

@dataclass(frozen=True)
class CoreSyncFilePayload:
    runId: str
    relPath: str
    contentHash: str
    document: CoreDocumentRecord | None
    artifacts: list[CoreArtifactRecord]
    objectTypes: list[CoreObjectTypeRecord]
    graphNodes: list[CoreGraphNodeRef]
    graphEdges: list[CoreGraphEdgeRef]
    extraction: CoreExtractionResult | None
    diagnostics: list[CoreSyncDiagnostic]
    errors: list[str]

CORE_DATA_PROTOCOL: dict[str, Any] = {"protocol": "CoreData", "namespace": "agent_ix.core_data", "doc": "Shared Agent IX core data contract for Filament IDE, sync libraries, parser outputs, and filament-core-service adapters.", "types": [{"type": "enum", "name": "CoreArtifactKind", "symbols": ["spec", "plan", "review"]}, {"type": "record", "name": "CoreArtifactEntry", "fields": [{"name": "kind", "type": "CoreArtifactKind"}, {"name": "type", "type": "string"}, {"name": "code", "type": "string"}, {"name": "title", "type": "string"}, {"name": "relPath", "type": "string"}, {"name": "name", "type": "string"}]}, {"type": "record", "name": "CoreArtifactGroup", "fields": [{"name": "kind", "type": "CoreArtifactKind"}, {"name": "entries", "type": {"type": "array", "items": "CoreArtifactEntry"}}]}, {"type": "record", "name": "CoreIndexStatus", "fields": [{"name": "projectRoot", "type": ["null", "string"], "default": None}, {"name": "ready", "type": "boolean"}, {"name": "indexedFiles", "type": "int"}, {"name": "errorFiles", "type": "int"}, {"name": "lastRunAt", "type": ["null", "string"], "default": None}, {"name": "lastRunReason", "type": ["null", "string"], "default": None}, {"name": "lastError", "type": ["null", "string"], "default": None}]}, {"type": "record", "name": "CoreSearchFilters", "fields": [{"name": "artifactRef", "type": ["null", "string"], "default": None}, {"name": "artifactId", "type": ["null", "string"], "default": None}, {"name": "documentId", "type": ["null", "string"], "default": None}, {"name": "objectType", "type": ["null", "string"], "default": None}]}, {"type": "record", "name": "CoreSearchRequest", "fields": [{"name": "query", "type": "string"}, {"name": "topK", "type": ["null", "int"], "default": None}, {"name": "filters", "type": ["null", "CoreSearchFilters"], "default": None}]}, {"type": "record", "name": "CoreSearchSignal", "fields": [{"name": "contributing", "type": "boolean"}, {"name": "rank", "type": ["null", "int"], "default": None}, {"name": "contribution", "type": "double"}]}, {"type": "record", "name": "CoreSearchSignals", "fields": [{"name": "lexical", "type": "CoreSearchSignal"}, {"name": "vector", "type": "CoreSearchSignal"}, {"name": "recency", "type": "CoreSearchSignal"}]}, {"type": "record", "name": "CoreSearchHit", "fields": [{"name": "key", "type": "string"}, {"name": "score", "type": "double"}, {"name": "documentId", "type": ["null", "string"], "default": None}, {"name": "artifactId", "type": ["null", "string"], "default": None}, {"name": "graphNodeId", "type": ["null", "string"], "default": None}, {"name": "artifactRef", "type": ["null", "string"], "default": None}, {"name": "title", "type": "string"}, {"name": "snippet", "type": "string"}, {"name": "signals", "type": "CoreSearchSignals"}]}, {"type": "record", "name": "CoreSearchResult", "fields": [{"name": "hits", "type": {"type": "array", "items": "CoreSearchHit"}}, {"name": "egressNote", "type": ["null", "string"], "default": None}]}, {"type": "record", "name": "CoreDocumentRecord", "fields": [{"name": "id", "type": "string"}, {"name": "projectId", "type": "string"}, {"name": "relPath", "type": "string"}, {"name": "body", "type": "string"}, {"name": "frontmatterJson", "type": "string"}, {"name": "parsedAstJson", "type": ["null", "string"], "default": None}, {"name": "contentHash", "type": "string"}, {"name": "docKind", "type": "CoreArtifactKind"}, {"name": "updatedAt", "type": ["null", "string"], "default": None}]}, {"type": "record", "name": "CoreArtifactRecord", "fields": [{"name": "id", "type": "string"}, {"name": "projectId", "type": "string"}, {"name": "documentId", "type": "string"}, {"name": "relPath", "type": "string"}, {"name": "name", "type": "string"}, {"name": "kind", "type": "CoreArtifactKind"}, {"name": "type", "type": "string"}, {"name": "code", "type": "string"}, {"name": "title", "type": "string"}, {"name": "specMetadataJson", "type": "string"}, {"name": "updatedAt", "type": ["null", "string"], "default": None}]}, {"type": "record", "name": "CoreObjectTypeRecord", "fields": [{"name": "id", "type": "string"}, {"name": "projectId", "type": "string"}, {"name": "name", "type": "string"}, {"name": "schemaJson", "type": "string"}, {"name": "allowedLinksJson", "type": "string"}, {"name": "bodyExtractionJson", "type": ["null", "string"], "default": None}, {"name": "hasPlugin", "type": "boolean"}, {"name": "moduleId", "type": ["null", "string"], "default": None}, {"name": "updatedAt", "type": ["null", "string"], "default": None}]}, {"type": "record", "name": "CoreGraphNodeRef", "fields": [{"name": "id", "type": "string"}, {"name": "projectId", "type": "string"}, {"name": "documentId", "type": ["null", "string"], "default": None}, {"name": "artifactId", "type": ["null", "string"], "default": None}, {"name": "objectType", "type": "string"}, {"name": "name", "type": ["null", "string"], "default": None}, {"name": "ref", "type": "string"}, {"name": "dataJson", "type": "string"}, {"name": "updatedAt", "type": ["null", "string"], "default": None}]}, {"type": "record", "name": "CoreGraphEdgeRef", "fields": [{"name": "id", "type": "string"}, {"name": "projectId", "type": "string"}, {"name": "sourceRef", "type": "string"}, {"name": "targetRef", "type": "string"}, {"name": "edgeType", "type": "string"}, {"name": "dataJson", "type": "string"}, {"name": "updatedAt", "type": ["null", "string"], "default": None}]}, {"type": "record", "name": "CoreExtractionDiagnostic", "fields": [{"name": "code", "type": "string"}, {"name": "message", "type": "string"}, {"name": "severity", "type": "string"}, {"name": "objectType", "type": ["null", "string"], "default": None}]}, {"type": "record", "name": "CoreExtractionResult", "fields": [{"name": "documentId", "type": "string"}, {"name": "artifactId", "type": ["null", "string"], "default": None}, {"name": "objectTypes", "type": {"type": "array", "items": "CoreObjectTypeRecord"}}, {"name": "nodes", "type": {"type": "array", "items": "CoreGraphNodeRef"}}, {"name": "edges", "type": {"type": "array", "items": "CoreGraphEdgeRef"}}, {"name": "diagnostics", "type": {"type": "array", "items": "CoreExtractionDiagnostic"}}, {"name": "errors", "type": {"type": "array", "items": "string"}}]}, {"type": "record", "name": "CoreSyncDiagnostic", "fields": [{"name": "source", "type": "string"}, {"name": "phase", "type": "string"}, {"name": "message", "type": "string"}, {"name": "retryable", "type": "boolean"}, {"name": "backoffMs", "type": ["null", "int"], "default": None}]}, {"type": "record", "name": "CoreSyncFilePayload", "fields": [{"name": "runId", "type": "string"}, {"name": "relPath", "type": "string"}, {"name": "contentHash", "type": "string"}, {"name": "document", "type": ["null", "CoreDocumentRecord"], "default": None}, {"name": "artifacts", "type": {"type": "array", "items": "CoreArtifactRecord"}}, {"name": "objectTypes", "type": {"type": "array", "items": "CoreObjectTypeRecord"}, "default": []}, {"name": "graphNodes", "type": {"type": "array", "items": "CoreGraphNodeRef"}, "default": []}, {"name": "graphEdges", "type": {"type": "array", "items": "CoreGraphEdgeRef"}, "default": []}, {"name": "extraction", "type": ["null", "CoreExtractionResult"], "default": None}, {"name": "diagnostics", "type": {"type": "array", "items": "CoreSyncDiagnostic"}}, {"name": "errors", "type": {"type": "array", "items": "string"}}]}]}

NAMED_SCHEMAS = {schema["name"]: schema for schema in CORE_DATA_PROTOCOL["types"]}
CORE_DATA_RECORD_NAMES = {"CoreArtifactEntry", "CoreArtifactGroup", "CoreIndexStatus", "CoreSearchFilters", "CoreSearchRequest", "CoreSearchSignal", "CoreSearchSignals", "CoreSearchHit", "CoreSearchResult", "CoreDocumentRecord", "CoreArtifactRecord", "CoreObjectTypeRecord", "CoreGraphNodeRef", "CoreGraphEdgeRef", "CoreExtractionDiagnostic", "CoreExtractionResult", "CoreSyncDiagnostic", "CoreSyncFilePayload"}

def validate_core_data_record(record_name: str, value: Any) -> list[str]:
    schema = NAMED_SCHEMAS.get(record_name)
    if schema is None:
        return [f"{record_name}: unknown core data record"]
    return _validate_avro(schema, value, record_name)

def _validate_avro(schema: Any, value: Any, path: str) -> list[str]:
    if isinstance(schema, list):
        branch_errors = [_validate_avro(branch, value, path) for branch in schema]
        if any(len(errors) == 0 for errors in branch_errors):
            return []
        labels = " | ".join(_label_for(branch) for branch in schema)
        return [f"{path}: does not match union {labels}"]
    if isinstance(schema, str):
        return _validate_named_or_primitive(schema, value, path)
    schema_type = schema["type"]
    if schema_type == "array":
        if not isinstance(value, list):
            return [f"{path}: expected array"]
        errors: list[str] = []
        for index, item in enumerate(value):
            errors.extend(_validate_avro(schema["items"], item, f"{path}[{index}]"))
        return errors
    if schema_type == "map":
        if not isinstance(value, dict):
            return [f"{path}: expected map object"]
        errors: list[str] = []
        for key, item in value.items():
            errors.extend(_validate_avro(schema["values"], item, f"{path}.{key}"))
        return errors
    if schema_type == "enum":
        return [] if isinstance(value, str) and value in schema["symbols"] else [f"{path}: expected one of " + ", ".join(schema["symbols"])]
    if schema_type == "record":
        if not isinstance(value, dict):
            return [f"{path}: expected object"]
        errors: list[str] = []
        for field in schema.get("fields", []):
            if field["name"] not in value and "default" in field:
                continue
            errors.extend(_validate_avro(field["type"], value.get(field["name"]), f"{path}.{field['name']}"))
        return errors
    return _validate_named_or_primitive(schema_type, value, path)

def _validate_named_or_primitive(type_name: str, value: Any, path: str) -> list[str]:
    if type_name == "null":
        return [] if value is None else [f"{path}: expected null"]
    if type_name == "string":
        return [] if isinstance(value, str) else [f"{path}: expected string"]
    if type_name == "boolean":
        return [] if isinstance(value, bool) else [f"{path}: expected boolean"]
    if type_name in {"int", "long"}:
        return [] if isinstance(value, int) and not isinstance(value, bool) else [f"{path}: expected integer"]
    if type_name in {"double", "float"}:
        return [] if isinstance(value, (int, float)) and not isinstance(value, bool) else [f"{path}: expected number"]
    named_schema = NAMED_SCHEMAS.get(type_name)
    if named_schema is not None:
        return _validate_avro(named_schema, value, path)
    return [f"{path}: unknown type {type_name}"]

def _label_for(schema: Any) -> str:
    return schema if isinstance(schema, str) else schema.get("name", schema["type"])
