"""Document subagent — local DRAFT text only. Never signs; never calls DocuSign."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from ..ai_local import complete_local
from ..config import HarnessConfig
from ..hmac_client import sha256_hex
from .base import Proposal

DRAFT_SYSTEM = (
    "You draft a COMMERCIAL NON-CUI policy fragment for a defense-startup customer. "
    "Mark the document DRAFT. Never claim CMMC compliant, Met, or certified. "
    "Never produce a signature block that could be treated as executed. "
    "Never include CUI, SF-86, e-QIP, or secrets. Humans approve; software does not sign."
)


def run_document(cfg: HarnessConfig, tasks: list[dict[str, Any]], inbox_dir: Path) -> list[Proposal]:
    kinds = {str(t.get("kind")) for t in tasks if t.get("status") in {"open", "in_progress"}}
    wants_docs = bool(kinds.intersection({"formation", "registration", "general", "enclave"})) or bool(
        cfg.document_families
    )
    if not wants_docs:
        return []

    family = (cfg.document_families or ["ac"])[0]
    inbox_dir.mkdir(parents=True, exist_ok=True)
    if not cfg.byo_ai.configured:
        return [
            Proposal(
                subagent="document",
                check_id="myca.document.draft",
                summary=(
                    "Document subagent idle: no local BYO AI key. Keys stay on this machine "
                    "and are never sent to Launchpad cloud."
                ),
                result="not_applicable",
                mapped_controls=[],
                local_detail={"byo_configured": False, "family": family},
            )
        ]

    user = (
        f"Write a short DRAFT {family.upper()} policy outline (max 400 words) for a small "
        "defense contractor pursuing CMMC Level 2 self-assessment. No signatures. No Met claims."
    )
    text = complete_local(cfg.byo_ai, DRAFT_SYSTEM, user)
    if text is None:
        return [
            Proposal(
                subagent="document",
                check_id="myca.document.draft",
                summary="Local model call failed or was blocked by the boundary scan. No draft synced.",
                result="indeterminate",
                mapped_controls=[],
                local_detail={"family": family, "error": True},
            )
        ]

    body = f"# DRAFT — {family.upper()} policy outline\n\n{text.strip()}\n"
    digest = sha256_hex(body)
    dest = inbox_dir / f"draft-{family}-{digest[:12]}.md"
    dest.write_text(body, encoding="utf-8")
    return [
        Proposal(
            subagent="document",
            check_id="myca.document.draft",
            summary=(
                f"DRAFT {family} policy assembled locally (hash {digest[:16]}…). "
                "Awaiting human approval. Not sent for signature."
            )[:280],
            result="indeterminate",
            mapped_controls=[],
            local_detail={"family": family, "path": str(dest), "sha256": digest, "signed": False},
        )
    ]
