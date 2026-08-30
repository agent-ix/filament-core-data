import "@typespec/json-schema";
import "@typespec/versioning";

using TypeSpec.JsonSchema;
using TypeSpec.Versioning;

@jsonSchema("https://schemas.agent-ix.org/semantic-core/0.1.0/")
@versioned(Versions)
namespace AgentIx.Semantic.Core {
  enum Versions {
    v1,
    v2,
  }

  @pattern("^[a-z][a-z0-9-]*:[^\\s]+$")
  scalar SemanticId extends string;

  enum StructuralKind {
    artifact,
    object,
    relation,
    event,
    run,
    evidence,
    result,
  }

  enum SemanticRole {
    definition,
    occurrence,
    observation,
    projectedView,
  }

  model SourceLocus {
    repository: string;
    revision: string;
    path: string;
    line?: int32;
  }

  model Provenance {
    source: SourceLocus;
    producer: string;
    producerVersion: string;
    generatedAt?: utcDateTime | null;
  }

  model Relation {
    id: SemanticId;
    relationType: string;
    targetId: SemanticId;
    related?: Relation[];
    metadata?: Record<string> | null;
  }

  @id("semantic-object")
  model SemanticObject {
    id: SemanticId;
    kind: StructuralKind.object;
    role: SemanticRole;
    typeId: SemanticId;
    name: string;
    relations?: Relation[];
    extensions?: Record<string>;
    provenance: Provenance;
  }

  @id("artifact")
  model Artifact {
    id: SemanticId;
    kind: StructuralKind.artifact;
    role: SemanticRole.definition;
    artifactType: SemanticId;
    title: string;
    summary?: string;
    explicitNullNote: string | null;
    objects?: SemanticObject[];
    relations?: Relation[];
    extensions?: Record<string>;
    provenance: Provenance;

    @added(Versions.v2)
    #deprecated "Use extensions with a versioned vocabulary."
    legacyLabel?: string;
  }
}
