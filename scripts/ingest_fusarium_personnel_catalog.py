"""Ingest UNCLASSIFIED Fusarium personnel package into the website catalog.

Does not invent measured outcomes. Does not copy official Army rosters.
"""
from __future__ import annotations

import csv
import json
from pathlib import Path

PKG = Path(r"C:\Users\Owner1\Downloads\FUSARIUM_PERSONNEL_CURSOR_PACKAGE_v1_1")
OUT = Path(__file__).resolve().parents[1] / "lib" / "fusarium" / "personnel" / "generated-catalog.json"

WORKFLOW_TO_PERSONA = {
    "analysis": "analyst",
    "review": "reviewer",
    "geo": "geo",
    "signals": "signals",
    "humint": "human_source",
    "ci": "human_source",
    "weather": "weather_env",
    "hazard": "weather_env",
    "health": "health_exposure",
    "civil": "liaison_partner",
    "ops": "ops_watch",
    "command": "command",
    "sensor": "sensor_droid",
    "integrator": "platform",
    "comms": "platform",
    "cyber": "cyber_defense",
    "logistics": "logistics",
    "evaluation": "evaluator",
    "steward": "steward_release",
    "release": "steward_release",
    "training": "instructor",
    "oversight": "oversight",
    "liaison": "liaison_partner",
    "viewer": "liaison_partner",
}


def read_csv(name: str) -> list[dict]:
    with (PKG / name).open(encoding="utf-8-sig", newline="") as fh:
        return list(csv.DictReader(fh))


def blank_to_none(value: str | None):
    if value is None:
        return None
    text = value.strip()
    return text if text else None


def main() -> None:
    raw = json.loads((PKG / "FUSARIUM_PERSONNEL_IMPORT.json").read_text(encoding="utf-8"))
    roles = []
    for row in raw["roles"]:
        workflow = row["workflow_id"]
        roles.append(
            {
                "role_id": row["role_id"],
                "persona_id": WORKFLOW_TO_PERSONA.get(workflow, "liaison_partner"),
                "service": row["service"],
                "component_scope": row.get("component_scope"),
                "personnel_type": row.get("personnel_type"),
                "specialty_code": row.get("specialty_code") or "",
                "role_title": row["role_title"],
                "workflow_id": workflow,
                "proposed_priority": row.get("proposed_priority"),
                "typical_grade_range": row.get("typical_grade_range"),
                "example_pay_grade": row.get("example_pay_grade"),
                "example_longevity_or_step": row.get("example_longevity_or_step"),
                "example_annual_base_usd": row.get("example_annual_base_usd"),
                "pay_basis": row.get("pay_basis"),
                "applications": row.get("applications"),
                "candidate_automation": row.get("candidate_automation"),
                "retained_human_responsibility": row.get("retained_human_responsibility"),
                "proposed_training_id": row.get("proposed_training_id"),
                "staffing_disposition": row.get("staffing_disposition"),
                "specialty_verification": row.get("specialty_verification"),
                "evidence_status": row.get("evidence_status"),
                "source_id": row.get("source_id"),
                "source_url": row.get("source_url"),
                "baseline_authorized_headcount": None,
                "baseline_assigned_headcount": None,
                "measured_headcount_change": None,
                "approved_billet_reduction": None,
            }
        )

    outcomes = []
    for row in raw["human_outcomes_by_role"]:
        outcomes.append(
            {
                "role_id": row["role_id"],
                "evidence_status": row.get("evidence_status") or "NOT_MEASURED",
                "data_origin": row.get("data_origin") or "NOT_COLLECTED",
                "labor_hours_released": row.get("labor_hours_released"),
                "labor_reduction_percent": row.get("labor_reduction_percent"),
                "actual_duty_hours_released_per_person_week": row.get(
                    "actual_duty_hours_released_per_person_week"
                ),
                "duty_reduction_percent": row.get("duty_reduction_percent"),
                "rest_hours_gained_per_person_week": row.get("rest_hours_gained_per_person_week"),
                "workload_reduction_points": row.get("workload_reduction_points"),
                "error_absolute_reduction_pp": row.get("error_absolute_reduction_pp"),
                "fatality_absolute_reduction_pp": row.get("fatality_absolute_reduction_pp"),
                "individual_death_risk_reduction": row.get("individual_death_risk_reduction"),
                "approved_personnel_reduction": row.get("approved_personnel_reduction"),
                "measured_cash_savings_usd": row.get("measured_cash_savings_usd"),
                "causal_attribution": row.get("causal_attribution") or "NOT_ESTABLISHED",
            }
        )

    catalog = {
        "schema_version": raw.get("schema_version", "1.1.0"),
        "as_of": raw.get("as_of", "2026-09-10"),
        "status": raw.get("status", "PROPOSED_PERSONA_CATALOG"),
        "actual_unit_roster": False,
        "permissions_granted_by_import": False,
        "package_calc_checks_passed": 22,
        "package_calc_checks_note": "12 workbook + 10 Python arithmetic fixtures. Not product effectiveness.",
        "roles": roles,
        "ranks": raw.get("ranks", []),
        "pay_benchmarks": raw.get("pay_benchmarks", []),
        "training": raw.get("training", []),
        "pilot_coverage": raw.get("pilot_coverage", []),
        "workflows": raw.get("workflows", []),
        "sources": raw.get("sources", []),
        "permission_proposals": [
            {**p, "grant_on_import": False} for p in raw.get("permission_proposals", [])
        ],
        "human_outcome_definitions": raw.get("human_outcome_definitions", []),
        "human_outcomes_by_role": outcomes,
        "human_outcome_claim_policy": raw.get("human_outcome_claim_policy", {}),
        "services": raw.get("services", []),
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {OUT} roles={len(roles)}")


if __name__ == "__main__":
    main()
