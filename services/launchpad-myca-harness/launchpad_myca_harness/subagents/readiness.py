"""Readiness subagent — control-state *suggestions* only. Never PATCH /readiness/controls."""

from __future__ import annotations

from typing import Any

from .base import Proposal

# Map systems check_id → likely NIST 800-171 control. Suggestion, not a flip.
_SUGGESTIONS: dict[str, tuple[str, str]] = {
    "myca.systems.disk_encryption": ("3.13.16", "Disk encryption observation may support SC at-rest protections."),
    "myca.systems.firewall": ("3.13.1", "Host firewall observation may support boundary protection."),
    "myca.systems.endpoint_protection": ("3.14.2", "Endpoint protection observation may support malicious-code defenses."),
    "myca.systems.logging": ("3.3.1", "Audit-log availability observation may support AU generation."),
    "myca.systems.mfa": ("3.5.3", "MFA indicators are incomplete without directory policy."),
    "myca.systems.backup": ("3.8.9", "Backup service observation may support media/recovery planning."),
}


def run_readiness(
    tasks: list[dict[str, Any]],
    controls: list[dict[str, Any]],
    system_proposals: list[Proposal],
) -> list[Proposal]:
    out: list[Proposal] = []
    open_readiness = [
        t
        for t in tasks
        if t.get("kind") == "readiness" and t.get("status") in {"open", "in_progress"}
    ]
    implemented = {
        str(c.get("controlId") or c.get("control_id"))
        for c in controls
        if str(c.get("state") or "").lower() == "implemented"
    }

    for sp in system_proposals:
        mapped = _SUGGESTIONS.get(sp.check_id)
        if not mapped:
            continue
        control_id, why = mapped
        if control_id in implemented:
            continue
        if sp.result not in {"pass", "fail"}:
            continue
        out.append(
            Proposal(
                subagent="readiness",
                check_id="myca.readiness.suggestion",
                summary=(
                    f"Suggestion for {control_id}: {why} Local check {sp.check_id} was {sp.result}. "
                    "Human must confirm; agent cannot set implemented."
                )[:280],
                result="indeterminate",
                mapped_controls=[control_id],
                local_detail={
                    "from_check": sp.check_id,
                    "from_result": sp.result,
                    "control_id": control_id,
                    "control_flip": False,
                },
            )
        )

    if open_readiness:
        out.append(
            Proposal(
                subagent="readiness",
                check_id="myca.readiness.queue",
                summary=(
                    f"{len(open_readiness)} open readiness task(s) on the tenant queue. "
                    "Worked locally as suggestions only."
                )[:280],
                result="indeterminate",
                mapped_controls=[str(t.get("control_id")) for t in open_readiness if t.get("control_id")],
                local_detail={"task_ids": [t.get("id") for t in open_readiness]},
            )
        )
    return out
