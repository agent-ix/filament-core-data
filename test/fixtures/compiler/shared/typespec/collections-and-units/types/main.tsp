using AgentIx.Semantic.Decorators;

namespace AgentIx.Semantic;

scalar Text extends string;
scalar Seconds extends float64;

model Sample {
  @unit("s") elapsed: Seconds;
  @collection(true, false) labels: Text[];
}
