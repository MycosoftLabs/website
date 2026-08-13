"""Evidence subagent — hashes and references only. File bytes never leave the host."""

from __future__ import annotations

import hashlib
from pathlib import Path

from ..sanitizer import filename_looks_dangerous
from .base import Proposal

SKIP_SUFFIXES = {".pcap", ".pcapng", ".evtx", ".log", ".cap"}
MAX_FILES = 200
MAX_BYTES = 32 * 1024 * 1024


def _hash_file(path: Path) -> str | None:
    if path.stat().st_size > MAX_BYTES:
        return None
    h = hashlib.sha256()
    with path.open("rb") as f:
        while True:
            chunk = f.read(1024 * 1024)
            if not chunk:
                break
            h.update(chunk)
    return h.hexdigest()


def run_evidence(evidence_dir: str) -> list[Proposal]:
    if not evidence_dir.strip():
        return [
            Proposal(
                subagent="evidence",
                check_id="myca.evidence.hash_index",
                summary="No local evidence_dir configured. Nothing hashed; nothing synced.",
                result="not_applicable",
                mapped_controls=["3.3.5"],
                local_detail={"configured": False},
            )
        ]
    root = Path(evidence_dir).expanduser()
    if not root.is_dir():
        return [
            Proposal(
                subagent="evidence",
                check_id="myca.evidence.hash_index",
                summary="evidence_dir is not a directory on this host. Configure a local folder of artifacts.",
                result="fail",
                mapped_controls=["3.3.5"],
                local_detail={"missing": True},
            )
        ]

    hashed = 0
    skipped_dangerous = 0
    skipped_suffix = 0
    refs: list[dict[str, str]] = []
    for path in sorted(root.rglob("*")):
        if not path.is_file():
            continue
        if filename_looks_dangerous(path.name):
            skipped_dangerous += 1
            continue
        if path.suffix.lower() in SKIP_SUFFIXES:
            skipped_suffix += 1
            continue
        digest = _hash_file(path)
        if not digest:
            continue
        hashed += 1
        refs.append({"name": path.name, "sha256": digest})
        if hashed >= MAX_FILES:
            break

    return [
        Proposal(
            subagent="evidence",
            check_id="myca.evidence.hash_index",
            summary=(
                f"Hashed {hashed} local artifact(s); skipped {skipped_dangerous} restricted names "
                f"and {skipped_suffix} log/pcap-like files. Content stays on-device."
            )[:280],
            result="pass" if hashed else "indeterminate",
            mapped_controls=["3.3.5"],
            local_detail={"count": hashed, "refs": refs, "skipped_dangerous": skipped_dangerous},
        )
    ]
