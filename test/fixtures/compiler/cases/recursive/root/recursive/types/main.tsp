namespace AgentIx.Semantic;

scalar Text extends string;

model Node {
  id: Text;
  parent?: Node;
}
