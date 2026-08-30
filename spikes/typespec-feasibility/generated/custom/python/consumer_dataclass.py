from dataclasses import asdict, is_dataclass
from models_dataclass import SourceLocus
value = SourceLocus(repository="agent-ix/example", revision="abc123", path="spec/example.md", line=7)
assert is_dataclass(value) and asdict(value)["path"] == "spec/example.md"
print("python-dataclass-consumer:passed")
