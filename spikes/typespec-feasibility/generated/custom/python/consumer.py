import json
from pathlib import Path
from pydantic import ValidationError
from models import Artifact, DomainEvent, Evidence, FailedResult, VerificationRun
fixtures = Path(__file__).parents[2] / "fixtures"
golden = json.loads((fixtures / "representative.json").read_text())
invalid = json.loads((fixtures / "invalid.json").read_text())
keys = ["artifact", "domainEvent", "verificationRun", "evidence", "result"]
classes = [Artifact, DomainEvent, VerificationRun, Evidence, FailedResult]
values = [model.model_validate(golden[key]) for model, key in zip(classes, keys, strict=True)]
rendered = [value.model_dump(mode="json", by_alias=True, exclude_unset=True) for value in values]
assert rendered == [golden[key] for key in keys]
try:
    Artifact.model_validate(invalid["artifact"])
except ValidationError:
    pass
else:
    raise AssertionError("invalid golden was accepted")
print("python-consumer:passed")
