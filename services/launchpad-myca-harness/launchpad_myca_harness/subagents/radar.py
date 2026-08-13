"""Radar subagent — local ranking of ingested opportunities. Never invents federal mock data."""

from __future__ import annotations

from typing import Any

from .base import Proposal


def _norm_list(v: Any) -> list[str]:
    if not isinstance(v, list):
        return []
    return [str(x).strip() for x in v if isinstance(x, str) and str(x).strip()]


def rank_local(opportunities: list[dict[str, Any]], caps: dict[str, list[str]]) -> list[dict[str, Any]]:
    want_naics = {s.replace("-", "") for s in _norm_list(caps.get("naics"))}
    want_psc = {s.upper() for s in _norm_list(caps.get("psc"))}
    ranked: list[dict[str, Any]] = []
    for opp in opportunities:
        naics = [s.replace("-", "") for s in _norm_list(opp.get("naics"))]
        psc = [s.upper() for s in _norm_list(opp.get("psc"))]
        overlap_n = [n for n in naics if n in want_naics]
        overlap_p = [p for p in psc if p in want_psc]
        denom = max(1, len(want_naics) + len(want_psc))
        score = 0.0 if not (want_naics or want_psc) else round((len(overlap_n) + len(overlap_p)) / denom, 2)
        ranked.append(
            {
                "id": opp.get("id"),
                "title": str(opp.get("title") or "")[:120],
                "fit": score,
            }
        )
    ranked.sort(key=lambda r: r["fit"], reverse=True)
    return ranked


def run_radar(
    opportunities: list[dict[str, Any]],
    caps: dict[str, list[str]],
    sam_note: str | None,
) -> list[Proposal]:
    if not opportunities:
        return [
            Proposal(
                subagent="radar",
                check_id="myca.radar.rank",
                summary=(
                    sam_note
                    or "No ingested opportunities. Radar idle — no mock federal awards were generated."
                )[:280],
                result="not_applicable",
                mapped_controls=[],
                local_detail={"count": 0, "mock": False},
            )
        ]
    ranked = rank_local(opportunities, caps)
    top = ranked[0] if ranked else None
    top_bit = f" Top local fit title held on-device ({(top or {}).get('fit', 0)})."
    return [
        Proposal(
            subagent="radar",
            check_id="myca.radar.rank",
            summary=(
                f"Locally ranked {len(ranked)} ingested opportunit(y/ies).{top_bit} "
                "Not a bid recommendation; no mock data."
            )[:280],
            result="pass",
            mapped_controls=[],
            local_detail={"count": len(ranked), "top_id": (top or {}).get("id"), "mock": False},
        )
    ]
