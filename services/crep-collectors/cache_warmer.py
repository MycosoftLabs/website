"""
CREP Cache Warmer Service

Pre-loads data from all CREP collector services to ensure
instant dashboard access. Runs periodic health checks and
triggers data refresh on all services.
"""

import os
import asyncio
from datetime import datetime

import httpx
import redis.asyncio as redis
import structlog
import uvicorn
from fastapi import FastAPI

structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer()
    ],
)

logger = structlog.get_logger("cache-warmer")

app = FastAPI(title="CREP Cache Warmer", version="1.0.0")

# Configuration
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
CREP_SERVICES = os.getenv("CREP_SERVICES", "carbon-mapper:8201,railway:8202,astria:8203,satmap:8204,marine:8205,flights:8206")
WARM_INTERVAL = int(os.getenv("WARM_INTERVAL", "60"))

# Parse services
services = []
for svc in CREP_SERVICES.split(","):
    parts = svc.strip().split(":")
    if len(parts) == 2:
        services.append({"name": parts[0], "port": int(parts[1])})

# State
service_status: dict[str, dict] = {}


async def check_service(client: httpx.AsyncClient, service: dict) -> dict:
    """Check health and warm cache for a single service."""
    name = service["name"]
    port = service["port"]
    
    try:
        # Health check
        health_resp = await client.get(f"http://crep-{name}:{port}/health", timeout=10.0)
        health = health_resp.json() if health_resp.status_code == 200 else None
        
        # Trigger data fetch
        data_resp = await client.get(f"http://crep-{name}:{port}/data?limit=1", timeout=10.0)
        data_ok = data_resp.status_code == 200
        
        status = {
            "name": name,
            "healthy": health is not None,
            "api_available": health.get("api_available") if health else False,
            "cached_items": health.get("cached_items", 0) if health else 0,
            "data_accessible": data_ok,
            "last_check": datetime.utcnow().isoformat(),
        }
        
        logger.info("service_check", **status)
        return status
        
    except Exception as e:
        logger.warning("service_check_failed", service=name, error=str(e))
        return {
            "name": name,
            "healthy": False,
            "error": str(e),
            "last_check": datetime.utcnow().isoformat(),
        }


async def warm_all_caches():
    """Warm caches for all CREP services."""
    async with httpx.AsyncClient() as client:
        tasks = [check_service(client, svc) for svc in services]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        for result in results:
            if isinstance(result, dict):
                service_status[result["name"]] = result


async def warming_loop():
    """Main cache warming loop."""
    while True:
        await warm_all_caches()
        await asyncio.sleep(WARM_INTERVAL)


@app.on_event("startup")
async def startup():
    asyncio.create_task(warming_loop())
    logger.info("cache_warmer_started", services=[s["name"] for s in services])


@app.get("/health")
async def health():
    healthy_count = sum(1 for s in service_status.values() if s.get("healthy"))
    return {
        "status": "healthy" if healthy_count == len(services) else "degraded",
        "services_healthy": healthy_count,
        "services_total": len(services),
        "timestamp": datetime.utcnow().isoformat(),
    }


@app.get("/status")
async def status():
    return {
        "services": service_status,
        "timestamp": datetime.utcnow().isoformat(),
    }


@app.get("/refresh")
async def refresh():
    await warm_all_caches()
    return {"status": "refreshed", "services": len(services)}


if __name__ == "__main__":
    port = int(os.getenv("PORT", "8200"))
    uvicorn.run(app, host="0.0.0.0", port=port)
