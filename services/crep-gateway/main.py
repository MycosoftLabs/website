from datetime import datetime
from typing import Any

import httpx
from fastapi import FastAPI, Query

from cache import TTLCache
from config import Settings
from connectors.aisstream import fetch_aisstream_vessels
from connectors.global_fishing_watch import fetch_fishing_events
from connectors.opensky import fetch_opensky_aircraft

settings = Settings()
cache = TTLCache(settings.cache_ttl_seconds)

app = FastAPI(title="CREP Gateway", version="1.0.0")


def _response(payload: dict[str, Any]) -> dict[str, Any]:
    return {
        "timestamp": datetime.utcnow().isoformat(),
        **payload,
    }


@app.get("/health")
async def health() -> dict[str, Any]:
    return _response(
        {
            "status": "ok",
            "services": {
                "opensky": bool(settings.opensky_base),
                "aisstream": bool(settings.aisstream_api_key),
                "global_fishing_watch": bool(settings.gfw_api_token),
            },
        }
    )


@app.get("/api/intel/status")
async def intel_status() -> dict[str, Any]:
    return _response(
        {
            "air": {"available": True, "source": "opensky"},
            "maritime": {"available": bool(settings.aisstream_api_key), "source": "aisstream"},
            "fishing": {"available": bool(settings.gfw_api_token), "source": "global_fishing_watch"},
        }
    )


@app.get("/api/intel/air")
async def intel_air(
    lamin: float | None = Query(default=None),
    lamax: float | None = Query(default=None),
    lomin: float | None = Query(default=None),
    lomax: float | None = Query(default=None),
) -> dict[str, Any]:
    cache_key = f"air:{lamin}:{lamax}:{lomin}:{lomax}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached
    bounds = None
    if None not in (lamin, lamax, lomin, lomax):
        bounds = {"lamin": lamin, "lamax": lamax, "lomin": lomin, "lomax": lomax}
    try:
        async with httpx.AsyncClient(timeout=settings.request_timeout_seconds) as client:
            aircraft = await fetch_opensky_aircraft(client, settings, bounds)
        payload = _response(
            {
                "available": True,
                "source": "opensky",
                "total": len(aircraft),
                "aircraft": aircraft,
            }
        )
        cache.set(cache_key, payload)
        return payload
    except Exception as exc:
        return _response(
            {
                "available": False,
                "source": "opensky",
                "total": 0,
                "aircraft": [],
                "error": str(exc),
            }
        )


@app.get("/api/intel/maritime")
async def intel_maritime(limit: int = Query(default=5000, ge=1, le=10000)) -> dict[str, Any]:
    cache_key = f"maritime:{limit}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached
    try:
        async with httpx.AsyncClient(timeout=settings.request_timeout_seconds) as client:
            vessels = await fetch_aisstream_vessels(client, settings, limit)
        payload = _response(
            {
                "available": True,
                "source": "aisstream",
                "total": len(vessels),
                "vessels": vessels,
            }
        )
        cache.set(cache_key, payload)
        return payload
    except Exception as exc:
        return _response(
            {
                "available": False,
                "source": "aisstream",
                "total": 0,
                "vessels": [],
                "error": str(exc),
            }
        )


@app.get("/api/intel/fishing")
async def intel_fishing(
    limit: int = Query(default=200, ge=1, le=1000),
    days: int = Query(default=7, ge=1, le=30),
) -> dict[str, Any]:
    cache_key = f"fishing:{limit}:{days}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached
    try:
        async with httpx.AsyncClient(timeout=settings.request_timeout_seconds) as client:
            events = await fetch_fishing_events(client, settings, limit=limit, days=days)
        payload = _response(
            {
                "available": True,
                "source": "global_fishing_watch",
                "total": len(events),
                "events": events,
            }
        )
        cache.set(cache_key, payload)
        return payload
    except Exception as exc:
        return _response(
            {
                "available": False,
                "source": "global_fishing_watch",
                "total": 0,
                "events": [],
                "error": str(exc),
            }
        )
