<!-- reviewer-dispositions repo=agent-ix/filament-core-data visibility=public quoin=0.28.3 module=spec-artifacts-process@b82e42e893612b4b4ee94127714b4577ee893502 id=SR-265 round=1 reviewed=e3bd0f7210ec076e1497900c4f7ba987c304bf15 model=gpt-6 run=de2f38e2-f6ef-48ca-a9f3-7dab94e30f4b -->

| FND | outcome | sha/reason |
| --- | --- | --- |
| FND-001 | fixed | 3e459b5baf75f8998a0da0651a217b778d268aca |

All findings in this artifact are fixed. Canonical aggregate gate remains separately owned by the lead.

+++ [reviewer data]

```yaml
dispositions:
- fnd: FND-001
  outcome: fixed
  fix_sha: 3e459b5baf75f8998a0da0651a217b778d268aca
  after_excerpt: "- The normalizer SHALL materialize the exact two-member descriptor\n\
    \  `{\"algorithm\":\"rfc8785-v1\",\"digest\":\"sha256-jcs\"}` before schema\n\
    \  validation and publication.\n- The published `semantic-ir.schema.json` SHALL\
    \ require and validate that\n  descriptor; a pre-normalization authoring value\
    \ that omits it is not admitted\n  as a normalized document."
```

+++
