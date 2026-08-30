// Generated experimental output. Do not publish.

export type SemanticId = string;

export type SemanticRole = "definition" | "occurrence" | "observation" | "projectedView";

export type StructuralKind = "artifact" | "object" | "relation" | "event" | "run" | "evidence" | "result";

export type Versions = "v1" | "v2";

export interface DomainEvent {
	id: SemanticId;
	eventType: SemanticId;
	subjectId: SemanticId;
	occurredAt: string;
	causationId?: SemanticId | null;
	correlationId?: SemanticId;
	payload: Record<string, unknown>;
	provenance: Provenance;
}

export interface Evidence {
	id: SemanticId;
	runId: SemanticId;
	evidenceType: SemanticId;
	uri?: string;
	digest?: string;
	observedAt: string;
	attributes?: Record<string, unknown>;
	provenance: Provenance;
}

export interface FailedResult extends VerificationResult {
	status: "failed";
	findingIds: SemanticId[];
	reason: string;
}

export interface NotComputedResult extends VerificationResult {
	status: "not-computed";
	reason: string;
	missingInput?: string | null;
}

export interface PassedResult extends VerificationResult {
	status: "passed";
	evidenceIds: SemanticId[];
}

export interface VerificationResult {
	status: string;
	runId: SemanticId;
}

export interface VerificationRun {
	id: SemanticId;
	targetId: SemanticId;
	profileId: SemanticId;
	startedAt: string;
	completedAt?: string | null;
	evidenceIds?: SemanticId[];
	provenance: Provenance;
}

export interface Artifact {
	id: SemanticId;
	kind: "artifact";
	role: "definition";
	artifactType: SemanticId;
	title: string;
	summary?: string;
	explicitNullNote: string | null;
	objects?: SemanticObject[];
	relations?: Relation[];
	extensions?: Record<string, unknown>;
	provenance: Provenance;
	legacyLabel?: string;
}

export interface Provenance {
	source: SourceLocus;
	producer: string;
	producerVersion: string;
	generatedAt?: string | null;
}

export interface Relation {
	id: SemanticId;
	relationType: string;
	targetId: SemanticId;
	related?: Relation[];
	metadata?: Record<string, unknown> | null;
}

export interface SemanticObject {
	id: SemanticId;
	kind: "object";
	role: SemanticRole;
	typeId: SemanticId;
	name: string;
	relations?: Relation[];
	extensions?: Record<string, unknown>;
	provenance: Provenance;
}

export interface SourceLocus {
	repository: string;
	revision: string;
	path: string;
	line?: number;
}

export interface ArtifactMessage {
	id: string;
	artifact_type: string;
	title: string;
	summary?: string;
	provenance_json: string;
}

export interface EventMessage {
	id: string;
	event_type: string;
	subject_id: string;
	occurred_at: string;
	payload_json: string;
	correlation_id?: string;
}
