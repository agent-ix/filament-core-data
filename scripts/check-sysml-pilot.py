"""Validate emitted SysML packages with the pinned official 2025-04 pilot.

FR-138-AC-3. The pilot and JRE live in SYSML_PILOT_CACHE outside the repository.
Missing capability is a failure, never a skip.
"""

import hashlib
import json
import os
import subprocess
import sys
import tarfile
import tempfile
import zipfile
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


def extract_pinned_archives(cache: Path) -> tuple[Path, Path, Path, Path]:
    """Extract both verified archives into one fresh execution directory."""
    scratch = Path(tempfile.mkdtemp(prefix="sysml-pilot-execution-"))
    try:
        with zipfile.ZipFile(cache / "jupyter-sysml-kernel-0.49.0.zip") as archive:
            archive.extractall(scratch / "pilot")
        with tarfile.open(
            cache / "OpenJDK17U-jre_x64_linux_hotspot_17.0.20.1_1.tar.gz"
        ) as archive:
            try:
                archive.extractall(scratch / "jre", filter="data")
            except TypeError:  # pragma: no cover - Python 3.10 compatibility
                archive.extractall(scratch / "jre")
        jar = next(
            (
                path
                for path in (scratch / "pilot").rglob("*.jar")
                if path.name.endswith("-all.jar")
            ),
            None,
        )
        library = next(
            (
                path
                for path in (scratch / "pilot").rglob("sysml.library")
                if path.is_dir()
            ),
            None,
        )
        java = next(
            (path for path in (scratch / "jre").rglob("java") if path.is_file()), None
        )
        if jar is None or library is None or java is None:
            fail(
                "verified archives did not contain the pilot jar, library, and Java executable"
            )
        return scratch, jar, library, java
    except Exception:
        import shutil

        shutil.rmtree(scratch, ignore_errors=True)
        raise


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
    execution, jar, library, java = extract_pinned_archives(cache)
    try:
        distribution = jar.parent
        spec_dir = execution / "kernels" / "sysml"
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
        manager = KernelSpecManager(kernel_dirs=[str(execution / "kernels")])
        for file_name in sys.argv[1:]:
            path = Path(file_name)
            if path.suffix != ".sysml" or not path.is_file():
                fail(f"emitted package missing: {path}")
            kernel = KernelManager(kernel_name="sysml", kernel_spec_manager=manager)
            kernel.start_kernel(
                cwd=str(distribution),
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
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
                package_results = []
                while True:
                    message = client.get_iopub_msg(timeout=120)
                    if message.get("parent_header", {}).get("msg_id") == message_id:
                        if message.get("msg_type") == "error":
                            errors.append(message.get("content", {}))
                        if (
                            message.get("msg_type") == "stream"
                            and message.get("content", {}).get("name") == "stderr"
                        ):
                            errors.append(message.get("content", {}).get("text", ""))
                        if message.get("msg_type") == "execute_result":
                            package_results.append(
                                message.get("content", {})
                                .get("data", {})
                                .get("text/plain", "")
                            )
                        if (
                            message.get("msg_type") == "status"
                            and message.get("content", {}).get("execution_state")
                            == "idle"
                        ):
                            break
                if errors:
                    fail(f"pilot reported errors for {path}: {errors}")
                if not any(
                    result.strip().startswith("Package ") for result in package_results
                ):
                    fail(
                        f"pilot returned no accepted package for {path}: {package_results}"
                    )
                print(f"FR-138-AC-3 pilot accepted {path.name}")
            finally:
                client.stop_channels()
                kernel.shutdown_kernel(now=True)
    finally:
        import shutil

        shutil.rmtree(execution, ignore_errors=True)


if __name__ == "__main__":
    main()
