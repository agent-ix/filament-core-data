// Generated experimental output. Do not publish.
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

pub type SemanticId = String;

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub enum SemanticRole {
    #[serde(rename = "definition")]
    Definition,
    #[serde(rename = "occurrence")]
    Occurrence,
    #[serde(rename = "observation")]
    Observation,
    #[serde(rename = "projectedView")]
    ProjectedView,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub enum StructuralKind {
    #[serde(rename = "artifact")]
    Artifact,
    #[serde(rename = "object")]
    Object,
    #[serde(rename = "relation")]
    Relation,
    #[serde(rename = "event")]
    Event,
    #[serde(rename = "run")]
    Run,
    #[serde(rename = "evidence")]
    Evidence,
    #[serde(rename = "result")]
    Result,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub enum Versions {
    #[serde(rename = "v1")]
    V1,
    #[serde(rename = "v2")]
    V2,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct DomainEvent {
    pub id: SemanticId,
    #[serde(rename = "eventType")]
    pub event_type: SemanticId,
    #[serde(rename = "subjectId")]
    pub subject_id: SemanticId,
    #[serde(rename = "occurredAt")]
    pub occurred_at: String,
    #[serde(rename = "causationId")]
    pub causation_id: Option<SemanticId>,
    #[serde(rename = "correlationId")]
    pub correlation_id: Option<SemanticId>,
    pub payload: BTreeMap<String, serde_json::Value>,
    pub provenance: Provenance,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct Evidence {
    pub id: SemanticId,
    #[serde(rename = "runId")]
    pub run_id: SemanticId,
    #[serde(rename = "evidenceType")]
    pub evidence_type: SemanticId,
    pub uri: Option<String>,
    pub digest: Option<String>,
    #[serde(rename = "observedAt")]
    pub observed_at: String,
    pub attributes: Option<BTreeMap<String, serde_json::Value>>,
    pub provenance: Provenance,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct FailedResult {
    pub status: String,
    #[serde(rename = "runId")]
    pub run_id: SemanticId,
    #[serde(rename = "findingIds")]
    pub finding_ids: Vec<SemanticId>,
    pub reason: String,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct NotComputedResult {
    pub status: String,
    #[serde(rename = "runId")]
    pub run_id: SemanticId,
    pub reason: String,
    #[serde(rename = "missingInput")]
    pub missing_input: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct PassedResult {
    pub status: String,
    #[serde(rename = "runId")]
    pub run_id: SemanticId,
    #[serde(rename = "evidenceIds")]
    pub evidence_ids: Vec<SemanticId>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct VerificationResult {
    pub status: String,
    #[serde(rename = "runId")]
    pub run_id: SemanticId,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct VerificationRun {
    pub id: SemanticId,
    #[serde(rename = "targetId")]
    pub target_id: SemanticId,
    #[serde(rename = "profileId")]
    pub profile_id: SemanticId,
    #[serde(rename = "startedAt")]
    pub started_at: String,
    #[serde(rename = "completedAt")]
    pub completed_at: Option<String>,
    #[serde(rename = "evidenceIds")]
    pub evidence_ids: Option<Vec<SemanticId>>,
    pub provenance: Provenance,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct Artifact {
    pub id: SemanticId,
    pub kind: String,
    pub role: String,
    #[serde(rename = "artifactType")]
    pub artifact_type: SemanticId,
    pub title: String,
    pub summary: Option<String>,
    #[serde(rename = "explicitNullNote")]
    pub explicit_null_note: Option<String>,
    pub objects: Option<Vec<SemanticObject>>,
    pub relations: Option<Vec<Relation>>,
    pub extensions: Option<BTreeMap<String, serde_json::Value>>,
    pub provenance: Provenance,
    #[serde(rename = "legacyLabel")]
    pub legacy_label: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct Provenance {
    pub source: SourceLocus,
    pub producer: String,
    #[serde(rename = "producerVersion")]
    pub producer_version: String,
    #[serde(rename = "generatedAt")]
    pub generated_at: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct Relation {
    pub id: SemanticId,
    #[serde(rename = "relationType")]
    pub relation_type: String,
    #[serde(rename = "targetId")]
    pub target_id: SemanticId,
    pub related: Option<Vec<Relation>>,
    pub metadata: Option<BTreeMap<String, serde_json::Value>>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct SemanticObject {
    pub id: SemanticId,
    pub kind: String,
    pub role: SemanticRole,
    #[serde(rename = "typeId")]
    pub type_id: SemanticId,
    pub name: String,
    pub relations: Option<Vec<Relation>>,
    pub extensions: Option<BTreeMap<String, serde_json::Value>>,
    pub provenance: Provenance,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct SourceLocus {
    pub repository: String,
    pub revision: String,
    pub path: String,
    pub line: Option<i32>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct ArtifactMessage {
    pub id: String,
    pub artifact_type: String,
    pub title: String,
    pub summary: Option<String>,
    pub provenance_json: String,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct EventMessage {
    pub id: String,
    pub event_type: String,
    pub subject_id: String,
    pub occurred_at: String,
    pub payload_json: String,
    pub correlation_id: Option<String>,
}
