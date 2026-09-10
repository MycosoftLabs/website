#!/usr/bin/env python3
"""Offline regression checks for the canonical scheduled Arraylake workflow."""

from __future__ import annotations

from pathlib import Path

from ruamel.yaml import YAML


ROOT = Path(__file__).resolve().parents[2]
WORKFLOW = ROOT / ".github" / "workflows" / "arraylake-field-bake.yml"
REQUIREMENTS = ROOT / "scripts" / "arraylake" / "requirements-ci.txt"


def main() -> int:
    payload = YAML(typ="safe").load(WORKFLOW.read_text(encoding="utf-8"))
    assert payload["name"] == "Arraylake field bake"
    assert set(payload["on"]) == {"schedule", "workflow_dispatch"}
    assert payload["permissions"] == {"contents": "read"}
    assert payload["concurrency"]["cancel-in-progress"] is False

    job = payload["jobs"]["bake"]
    assert job["env"]["ARRAYLAKE_TOKEN"] == "${{ secrets.ARRAYLAKE_TOKEN }}"
    steps = job["steps"]
    names = [step.get("name", "") for step in steps]
    assert names.index("Validate bake configuration") < names.index("Install bake dependencies")
    assert names.index("Introspect cubes (schema audit)") < names.index("Bake live field cubes")
    assert names.index("Validate baked artifact contract") < names.index("Setup SSH via Cloudflare Tunnel")
    assert names.index("Validate baked artifact contract") < names.index("Publish baked fields to production asset mount")

    actions = [step.get("uses", "") for step in steps if "uses" in step]
    assert "actions/checkout@v7" in actions
    assert "actions/setup-python@v7" in actions
    assert "actions/upload-artifact@v7" in actions

    scripts = "\n".join(step.get("run", "") for step in steps)
    assert "|| true" not in scripts
    assert "validate_bake_output.py" in scripts
    assert "No validated baked output exists" in scripts

    pins = [
        line.strip()
        for line in REQUIREMENTS.read_text(encoding="utf-8").splitlines()
        if line.strip() and not line.lstrip().startswith("#")
    ]
    assert pins and all("==" in requirement for requirement in pins)
    assert len({requirement.split("==", 1)[0] for requirement in pins}) == len(pins)
    print(f"OK: workflow contract and {len(pins)} dependency pins")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
