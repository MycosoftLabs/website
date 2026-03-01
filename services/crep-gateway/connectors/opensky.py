from typing import Any

import httpx

from config import Settings


def _parse_state(state: list[Any]) -> dict[str, Any] | None:
    if len(state) < 7:
        return None
    latitude = state[6]
    longitude = state[5]
    if latitude is None or longitude is None:
        return None
    return {
        "icao24": state[0],
        "callsign": (state[1] or "").strip(),
        "origin_country": state[2],
        "longitude": longitude,
        "latitude": latitude,
        "altitude": state[7] if len(state) > 7 else None,
        "on_ground": state[8] if len(state) > 8 else False,
        "velocity": state[9] if len(state) > 9 else None,
        "heading": state[10] if len(state) > 10 else None,
        "vertical_rate": state[11] if len(state) > 11 else None,
        "squawk": state[14] if len(state) > 14 else None,
    }


async def fetch_opensky_aircraft(
    client: httpx.AsyncClient,
    settings: Settings,
    bounds: dict[str, float] | None = None,
) -> list[dict[str, Any]]:
    params = {}
    if bounds:
        params = {
            "lamin": bounds.get("lamin"),
            "lamax": bounds.get("lamax"),
            "lomin": bounds.get("lomin"),
            "lomax": bounds.get("lomax"),
        }
    auth = (settings.opensky_username, settings.opensky_password) if settings.opensky_username else None
    response = await client.get(
        f"{settings.opensky_base}/states/all",
        params=params,
        auth=auth,
    )
    response.raise_for_status()
    data = response.json()
    states = data.get("states", [])
    aircraft: list[dict[str, Any]] = []
    for state in states:
        parsed = _parse_state(state)
        if parsed:
            aircraft.append(parsed)
    return aircraft
