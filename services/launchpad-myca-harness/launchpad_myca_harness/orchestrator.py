"""Local MYCA orchestrator — tenant queue in, sanitized proposals out. Never flips a control."""

from __future__ import annotations

from typing import Any

from . import HARNESS_NEVER_FLIPS_CONTROL
from .client import LaunchpadClient
from .config import HarnessConfig
from .inbox import append_proposals, drafts_dir
from .sanitizer import assert_cloud_safe, proposal_to_cloud_result
from .subagents.base import Proposal, utc_now
from .subagents.document import run_document
from .subagents.evidence import run_evidence
from .subagents.radar import run_radar
from .subagents.readiness import run_readiness
from .subagents.systems_check import run_systems_checks


def _list(payload: dict[str, Any], key: str) -> list[dict[str, Any]]:
    raw = payload.get(key)
    if not isinstance(raw, list):
        return []
    return [x for x in raw if isinstance(x, dict)]


def run_cycle(cfg: HarnessConfig, client: LaunchpadClient | None = None, *, dry_run: bool = False) -> dict[str, Any]:
    assert HARNESS_NEVER_FLIPS_CONTROL is True
    cfg.assert_runnable()
    api = client or LaunchpadClient(cfg)

    tasks_payload: dict[str, Any] = {}
    controls_payload: dict[str, Any] = {}
    radar_payload: dict[str, Any] = {}
    fetch_errors: list[str] = []
    for label, fn, bucket in (
        ("tasks", api.fetch_tasks, "tasks"),
        ("controls", api.fetch_controls, "controls"),
        ("radar", api.fetch_radar, "radar"),
    ):
        try:
            data = fn()
            if label == "tasks":
                tasks_payload = data
            elif label == "controls":
                controls_payload = data
            else:
                radar_payload = data
        except RuntimeError as e:
            fetch_errors.append(f"{label}: {e}")

    tasks = _list(tasks_payload, "tasks")
    controls = _list(controls_payload, "controls")
    opportunities = _list(radar_payload, "opportunities")
    sam_note = radar_payload.get("note") if isinstance(radar_payload.get("note"), str) else None

    systems = run_systems_checks()
    readiness = run_readiness(tasks, controls, systems)
    evidence = run_evidence(cfg.evidence_dir)
    documents = run_document(cfg, tasks, drafts_dir())
    radar = run_radar(opportunities, cfg.capability_notes, sam_note)

    heartbeat = Proposal(
        subagent="orchestrator",
        check_id="myca.orchestrator.heartbeat",
        summary=(
            f"Local MYCA cycle: {len(tasks)} task(s), {len(systems)} system checks, "
            f"{len(readiness)} readiness suggestion(s). Human gate remains on. Agent cannot flip implemented."
        )[:280],
        result="pass",
        mapped_controls=[],
        local_detail={"task_count": len(tasks), "fetch_errors": fetch_errors, "dry_run": dry_run},
    )

    proposals = [heartbeat, *systems, *readiness, *evidence, *documents, *radar]
    for p in proposals:
        p.control_flip = False
        p.requires_human_approval = True

    append_proposals(proposals)

    cloud_rows = []
    for p in proposals:
        row = proposal_to_cloud_result(p)
        if row is None:
            continue
        cloud_rows.append(row.as_dict())

    payload = assert_cloud_safe({"results": cloud_rows})
    sync: dict[str, Any] = {"skipped": True}
    if cfg.sync_results and not dry_run:
        sync = api.post_results(payload)
    return {
        "ok": True,
        "observed_at": utc_now(),
        "proposals": len(proposals),
        "synced": 0 if dry_run or not cfg.sync_results else len(payload["results"]),
        "fetch_errors": fetch_errors,
        "sync": sync,
        "note": "Every result is a proposal. Humans approve in Launchpad. Agents never flip a control.",
    }
