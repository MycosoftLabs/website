"""Local approval inbox — proposals live here until a human acts in Launchpad."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from .config import default_config_dir
from .subagents.base import Proposal, utc_now


def inbox_path() -> Path:
    p = default_config_dir() / "inbox.jsonl"
    p.parent.mkdir(parents=True, exist_ok=True)
    return p


def drafts_dir() -> Path:
    d = default_config_dir() / "drafts"
    d.mkdir(parents=True, exist_ok=True)
    return d


def append_proposals(proposals: list[Proposal]) -> None:
    path = inbox_path()
    with path.open("a", encoding="utf-8") as f:
        for p in proposals:
            row = {
                "at": utc_now(),
                "subagent": p.subagent,
                "check_id": p.check_id,
                "summary": p.summary,
                "result": p.result,
                "mapped_controls": p.mapped_controls,
                "requires_human_approval": True,
                "control_flip": False,
                "detail_keys": sorted(p.local_detail.keys()),
            }
            f.write(json.dumps(row, ensure_ascii=False) + "\n")


def read_inbox(limit: int = 50) -> list[dict[str, Any]]:
    path = inbox_path()
    if not path.is_file():
        return []
    lines = path.read_text(encoding="utf-8").splitlines()
    rows: list[dict[str, Any]] = []
    for line in lines[-limit:]:
        try:
            rows.append(json.loads(line))
        except json.JSONDecodeError:
            continue
    return rows
