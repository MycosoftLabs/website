from datetime import datetime, timedelta
from typing import Any

import httpx

from config import Settings


def _extract_vessel_id(entry: dict[str, Any]) -> str | None:
    self_reported = entry.get("selfReportedInfo")
    if isinstance(self_reported, list) and self_reported:
        vessel_id = self_reported[0].get("id")
        if vessel_id:
            return vessel_id
    vessel_id = entry.get("id")
    if vessel_id:
        return vessel_id
    return None


async def _search_fishing_vessels(
    client: httpx.AsyncClient,
    settings: Settings,
    limit: int,
) -> list[str]:
    response = await client.get(
        f"{settings.gfw_base}/vessels/search",
        headers={"Authorization": f"Bearer {settings.gfw_api_token}"},
        params={
            "query": "fishing",
            "datasets[0]": "public-global-vessel-identity:latest",
            "limit": limit,
        },
    )
    response.raise_for_status()
    payload = response.json()
    entries = payload.get("entries", []) if isinstance(payload, dict) else []
    vessel_ids: list[str] = []
    for entry in entries:
        vessel_id = _extract_vessel_id(entry)
        if vessel_id:
            vessel_ids.append(vessel_id)
    return vessel_ids


async def fetch_fishing_events(
    client: httpx.AsyncClient,
    settings: Settings,
    limit: int = 200,
    days: int = 7,
    vessel_limit: int = 10,
) -> list[dict[str, Any]]:
    if not settings.gfw_api_token:
        raise ValueError("GFW_API_TOKEN is required")
    vessel_ids = await _search_fishing_vessels(client, settings, vessel_limit)
    if not vessel_ids:
        return []
    end_date = datetime.utcnow().date()
    start_date = end_date - timedelta(days=days)
    params: list[tuple[str, str]] = [
        ("datasets[0]", "public-global-fishing-events:latest"),
        ("start-date", start_date.isoformat()),
        ("end-date", end_date.isoformat()),
        ("limit", str(limit)),
        ("offset", "0"),
    ]
    for index, vessel_id in enumerate(vessel_ids):
        params.append((f"vessels[{index}]", vessel_id))
    response = await client.get(
        f"{settings.gfw_base}/events",
        headers={"Authorization": f"Bearer {settings.gfw_api_token}"},
        params=params,
    )
    response.raise_for_status()
    payload = response.json()
    return payload.get("entries", []) if isinstance(payload, dict) else []
