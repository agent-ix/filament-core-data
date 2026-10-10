"""Validate emitted SysML packages with the pinned official 2025-04 pilot.

FR-138-AC-3. The pilot and JRE live in SYSML_PILOT_CACHE outside the repository.
Missing capability is a failure, never a skip.
"""

import hashlib
import json
import os
import subprocess
import sys
from pathlib import Path

PILOT_VERSION = "0.49.0"
PILOT_SHA256 = "ae4a6c5348a50394df86ce55523e3cd5434d50113c6c13ec4f071a6cb8bd5c27"
JRE_SHA256 = "0b2b640e3046b64c8ec504de0ab9d91bb5610182bda21fad454681ce54d45a62"
PILOT_URL = "https://github.com/Systems-Modeling/SysML-v2-Pilot-Implementation/releases/download/2025-04/jupyter-sysml-kernel-0.49.0.zip"
JRE_URL = "https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17.0.20.1%2B1/OpenJDK17U-jre_x64_linux_hotspot_17.0.20.1_1.tar.gz"


def fail(message: str) -> None:
    raise SystemExit(f"FR-138-AC-3 pilot capability unavailable: {message}")


def pinned(path: Path, digest: str, url: str) -> None:
    if not path.is_file():
        fail(f"missing {path}; obtain {url}")
    actual = hashlib.file_digest(path.open("rb"), "sha256").hexdigest()
    if actual != digest:
        fail(f"SHA-256 mismatch for {path}: {actual}; expected {digest}")


def main() -> None:
    try:
        from jupyter_client import KernelManager
        from jupyter_client.kernelspec import KernelSpecManager
    except ImportError as error:
        fail(f"jupyter-client==8.6.3 is required in the gate Python: {error}")

    if len(sys.argv) < 2:
        fail("no emitted .sysml package paths supplied")
    cache = Path(
        os.environ.get(
            "SYSML_PILOT_CACHE",
            Path.home() / ".cache" / "filament-core-data" / "sysml-pilot",
        )
    )
    pinned(cache / "jupyter-sysml-kernel-0.49.0.zip", PILOT_SHA256, PILOT_URL)
    pinned(
        cache / "OpenJDK17U-jre_x64_linux_hotspot_17.0.20.1_1.tar.gz",
        JRE_SHA256,
        JRE_URL,
    )
    distribution = cache / "distribution" / "sysml"
    jar = distribution / f"jupyter-sysml-kernel-{PILOT_VERSION}-all.jar"
    library = distribution / "sysml.library"
    java = cache / "jdk-17.0.20.1+1-jre" / "bin" / "java"
    for path in (jar, library, java):
        if not path.exists():
            fail(f"missing extracted pilot component {path}")

    spec_dir = cache / "kernels" / "sysml"
    spec_dir.mkdir(parents=True, exist_ok=True)
    (spec_dir / "kernel.json").write_text(
        json.dumps(
            {
                "argv": [
                    str(java),
                    "-cp",
                    str(jar),
                    "org.omg.sysml.jupyter.kernel.ISysML",
                    "{connection_file}",
                ],
                "display_name": "Pinned SysML 2.0 Pilot",
                "language": "sysml",
                "env": {"ISYSML_LIBRARY_PATH": str(library)},
            }
        )
    )
    manager = KernelSpecManager(kernel_dirs=[str(cache / "kernels")])
    for file_name in sys.argv[1:]:
        path = Path(file_name)
        if path.suffix != ".sysml" or not path.is_file():
            fail(f"emitted package missing: {path}")
        kernel = KernelManager(kernel_name="sysml", kernel_spec_manager=manager)
        kernel.start_kernel(
            cwd=str(distribution), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
        )
        client = kernel.client()
        try:
            client.start_channels()
            client.wait_for_ready(timeout=90)
            message_id = client.execute(path.read_text())
            while True:
                reply = client.get_shell_msg(timeout=120)
                if reply.get("parent_header", {}).get("msg_id") == message_id:
                    break
            content = reply.get("content", {})
            if content.get("status") != "ok":
                fail(f"pilot rejected {path}: {content}")
            errors = []
            while True:
                message = client.get_iopub_msg(timeout=120)
                if message.get("parent_header", {}).get("msg_id") == message_id:
                    if message.get("msg_type") == "error":
                        errors.append(message.get("content", {}))
                    if (
                        message.get("msg_type") == "status"
                        and message.get("content", {}).get("execution_state") == "idle"
                    ):
                        break
            if errors:
                fail(f"pilot reported errors for {path}: {errors}")
            print(f"FR-138-AC-3 pilot accepted {path.name}")
        finally:
            client.stop_channels()
            kernel.shutdown_kernel(now=True)


if __name__ == "__main__":
    main()
