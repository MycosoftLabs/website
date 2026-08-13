"""Cloud-bound payload guardrail — mirror of lib/launchpad/boundary/dlp.ts (not a CUI classifier)."""

from __future__ import annotations

import hashlib
import json
import re
from typing import Any

from .subagents.base import CloudResult, Proposal

FORBIDDEN_RESULT_KEYS = {"raw", "logs", "config", "capture", "pcap", "siem_dump", "prompt", "completion"}

CUI_RE = re.compile(r"\bCUI\s*//", re.I)
CLASSIFIED_RE = re.compile(r"\b(TOP SECRET|SECRET//|CONFIDENTIAL//)\b", re.I)
SF86_RE = re.compile(r"\bSF[-\s]?86\b|\b(e-QIP|eQIP|NBIS)\b", re.I)
PEM_RE = re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----")
KEY_RE = re.compile(r"\b(sk|pk|rk|xai|pplx|ghp)[-_][A-Za-z0-9_-]{16,}\b", re.I)
AKIA_RE = re.compile(r"\bAKIA[0-9A-Z]{16}\b")
SSN_RE = re.compile(r"\b\d{3}-\d{2}-\d{4}\b")
LP_KEY_RE = re.compile(r"\blp_[A-Za-z0-9_-]{16,}\b")


def filename_looks_dangerous(name: str) -> bool:
    n = name.lower()
    return (
        "sf-86" in n
        or "sf86" in n
        or n.endswith(".pcap")
        or n.endswith(".pcapng")
        or n.endswith(".evtx")
    )


def scan_text_blocked(text: str) -> list[str]:
    hits: list[str] = []
    for label, cre in (
        ("cui_marker", CUI_RE),
        ("classified_marker", CLASSIFIED_RE),
        ("sf86", SF86_RE),
        ("private_key_pem", PEM_RE),
        ("api_key_shape", KEY_RE),
        ("api_key_shape", AKIA_RE),
        ("ssn_like", SSN_RE),
        ("lp_workspace_key", LP_KEY_RE),
    ):
        if cre.search(text or ""):
            hits.append(label)
    return hits


def detail_hash(detail: Any) -> str:
    blob = json.dumps(detail, sort_keys=True, default=str, separators=(",", ":"))
    return hashlib.sha256(blob.encode("utf-8")).hexdigest()


def one_sentence(summary: str, fallback: str = "Sanitized local finding; human approval required.") -> str:
    text = " ".join((summary or "").split())
    if scan_text_blocked(text):
        return fallback[:280]
    return text[:280] if text else fallback[:280]


def proposal_to_cloud_result(proposal: Proposal) -> CloudResult | None:
    if proposal.control_flip:
        return None
    if proposal.result not in {"pass", "fail", "indeterminate", "not_applicable"}:
        return None
    summary = one_sentence(proposal.summary)
    if scan_text_blocked(summary):
        summary = "Local proposal redacted by boundary scan; human review required on-device."
    return CloudResult(
        check_id=proposal.check_id.strip()[:120],
        check_version=proposal.check_version,
        observed_at=proposal.observed_at,
        result=proposal.result,
        summary=summary,
        detail_hash=detail_hash(proposal.local_detail),
        mapped_controls=list(proposal.mapped_controls)[:32],
    )


def assert_cloud_safe(payload: dict[str, Any]) -> dict[str, Any]:
    results = payload.get("results")
    if not isinstance(results, list):
        raise ValueError("results array required")
    clean: list[dict[str, Any]] = []
    for row in results:
        if not isinstance(row, dict):
            continue
        if FORBIDDEN_RESULT_KEYS.intersection(row.keys()):
            raise ValueError("raw logs/configs/captures/prompts are prohibited")
        summary = str(row.get("summary") or "")
        if scan_text_blocked(summary):
            raise ValueError("summary failed boundary scan")
        if len(summary) > 280:
            raise ValueError("summary must be ≤280 chars")
        clean.append(
            {
                "check_id": str(row["check_id"]),
                "check_version": str(row.get("check_version") or "1.0.0"),
                "observed_at": str(row["observed_at"]),
                "result": str(row["result"]),
                "summary": summary,
                "detail_hash": str(row.get("detail_hash") or ""),
                "mapped_controls": [str(x) for x in (row.get("mapped_controls") or [])],
            }
        )
    return {"results": clean}
