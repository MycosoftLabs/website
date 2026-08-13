"""Proposal objects — every subagent output requires a human; never a control flip."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Literal

ResultValue = Literal["pass", "fail", "indeterminate", "not_applicable"]


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


@dataclass
class Proposal:
    subagent: str
    check_id: str
    summary: str
    result: ResultValue = "indeterminate"
    mapped_controls: list[str] = field(default_factory=list)
    local_detail: dict[str, Any] = field(default_factory=dict)
    requires_human_approval: bool = True
    control_flip: bool = False
    check_version: str = "1.0.0"
    observed_at: str = field(default_factory=utc_now)

    def __post_init__(self) -> None:
        self.control_flip = False
        self.requires_human_approval = True
        if self.result not in {"pass", "fail", "indeterminate", "not_applicable"}:
            self.result = "indeterminate"


@dataclass
class CloudResult:
    check_id: str
    check_version: str
    observed_at: str
    result: ResultValue
    summary: str
    detail_hash: str
    mapped_controls: list[str]

    def as_dict(self) -> dict[str, Any]:
        return {
            "check_id": self.check_id,
            "check_version": self.check_version,
            "observed_at": self.observed_at,
            "result": self.result,
            "summary": self.summary,
            "detail_hash": self.detail_hash,
            "mapped_controls": self.mapped_controls,
        }
