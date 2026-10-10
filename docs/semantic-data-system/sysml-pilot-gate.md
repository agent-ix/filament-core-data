# SysML v2 pilot gate (FR-138-AC-3)

`make sysml-pilot-check` emits two complete packages: a kernel scalar projection
from `packages/semantic-core/kernel-scalars.json` (Integer, Decimal, Float32),
and the committed config-service domain bundle at
`fixtures/semantic/v1/positive/sysml-config-domain-bundle.json`. The latter is
a small, accepted domain IR document with String and Integer fields on a
ConfigRevision record. The gate submits both emitted `.sysml` files to the
official pilot kernel and fails on any rejected package or missing capability.

The validator is a test tool; it is not a shipped package dependency. It uses
`jupyter-client==8.6.3` from the Poetry development group and Java 17. The
gate uses `poetry run python` by default; `SYSML_PILOT_PYTHON` can name another
Python executable for a separately provisioned gate environment.

Place these pinned upstream archives in `SYSML_PILOT_CACHE`, a cache outside
the repository, and extract them to the listed paths:

| Archive | Upstream | Bytes | SHA-256 | Extracted directory |
| --- | --- | ---: | --- | --- |
| `jupyter-sysml-kernel-0.49.0.zip` | [SysML v2 Pilot Implementation, 2025-04](https://github.com/Systems-Modeling/SysML-v2-Pilot-Implementation/releases/download/2025-04/jupyter-sysml-kernel-0.49.0.zip) | 73,498,663 | `ae4a6c5348a50394df86ce55523e3cd5434d50113c6c13ec4f071a6cb8bd5c27` | `$SYSML_PILOT_CACHE/distribution` |
| `OpenJDK17U-jre_x64_linux_hotspot_17.0.20.1_1.tar.gz` | [Eclipse Temurin 17.0.20.1+1](https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17.0.20.1%2B1/OpenJDK17U-jre_x64_linux_hotspot_17.0.20.1_1.tar.gz) | 46,640,574 | `0b2b640e3046b64c8ec504de0ab9d91bb5610182bda21fad454681ce54d45a62` | `$SYSML_PILOT_CACHE/jdk-17.0.20.1+1-jre` |

The check verifies both archive digests before launch. It reports the missing
path and upstream URL when provisioning is incomplete. It creates a temporary
Jupyter kernelspec in the cache and sends each package to a fresh pilot kernel.
