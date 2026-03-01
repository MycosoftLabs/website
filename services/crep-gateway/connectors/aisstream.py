from typing import Any

import httpx

from config import Settings


async def fetch_aisstream_vessels(
    client: httpx.AsyncClient,
    settings: Settings,
    limit: int = 5000,
) -> list[dict[str, Any]]:
    if not settings.aisstream_api_key:
        raise ValueError("AISSTREAM_API_KEY is required")
    response = await client.get(
        "https://api.aisstream.io/v1/vessels",
        headers={"Authorization": f"Bearer {settings.aisstream_api_key}"},
        params={"limit": limit},
    )
    response.raise_for_status()
    payload = response.json()
    if isinstance(payload, dict):
        return payload.get("vessels", [])
    return payload if isinstance(payload, list) else []
