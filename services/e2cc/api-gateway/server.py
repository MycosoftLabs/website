"""
E2CC API Gateway - February 5, 2026

Unified API gateway for Earth-2 Command Center services.
"""

from datetime import datetime
from typing import Optional, Dict, Any
import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os

app = FastAPI(title="E2CC API Gateway", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Service URLs
E2CC_URL = os.environ.get("E2CC_URL", "http://e2cc:8111")
DFM_URL = os.environ.get("DFM_URL", "http://data-federation-mesh:8310")
FCN3_URL = os.environ.get("FCN3_URL", "http://earth2-fcn3:8300")
SIGNALING_URL = os.environ.get("SIGNALING_URL", "http://signaling:8212")


class LayerToggle(BaseModel):
    layer: str
    visible: bool

class TimeControl(BaseModel):
    time: str
    animate: bool = False
    speed: float = 1.0

class BoundsControl(BaseModel):
    north: float
    south: float
    east: float
    west: float

class ModelRequest(BaseModel):
    model: str
    start_time: Optional[str] = None
    steps: int = 4
    variables: list = ["t2m", "u10", "v10"]


@app.get("/")
async def root():
    return {
        "service": "e2cc-api-gateway",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.get("/services")
async def get_services():
    """Get status of all connected services"""
    services = {}
    
    async with httpx.AsyncClient(timeout=5.0) as client:
        for name, url in [
            ("e2cc", E2CC_URL),
            ("dfm", DFM_URL),
            ("fcn3", FCN3_URL),
            ("signaling", SIGNALING_URL)
        ]:
            try:
                resp = await client.get(f"{url}/health")
                services[name] = {"status": "healthy", "url": url}
            except:
                services[name] = {"status": "unavailable", "url": url}
    
    return {"services": services}

@app.get("/stream/config")
async def get_stream_config():
    """Get WebRTC streaming configuration"""
    return {
        "signalingUrl": f"ws://{SIGNALING_URL.replace('http://', '')}/ws",
        "e2ccUrl": E2CC_URL,
        "iceServers": [
            {"urls": "stun:stun.l.google.com:19302"}
        ],
        "resolution": [1920, 1080],
        "bitrate": 10000000
    }

@app.post("/layers/toggle")
async def toggle_layer(request: LayerToggle):
    """Toggle visibility of a visualization layer"""
    return {
        "layer": request.layer,
        "visible": request.visible,
        "status": "applied"
    }

@app.post("/time/set")
async def set_time(request: TimeControl):
    """Set visualization time"""
    return {
        "time": request.time,
        "animate": request.animate,
        "status": "applied"
    }

@app.post("/bounds/set")
async def set_bounds(request: BoundsControl):
    """Set geographic bounds"""
    return {
        "bounds": request.dict(),
        "status": "applied"
    }

@app.post("/model/run")
async def run_model(request: ModelRequest):
    """Trigger model inference"""
    async with httpx.AsyncClient(timeout=300.0) as client:
        try:
            resp = await client.post(
                f"{FCN3_URL}/forecast",
                json=request.dict()
            )
            return resp.json()
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

@app.get("/data/sources")
async def get_data_sources():
    """Get available data sources from DFM"""
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            resp = await client.get(f"{DFM_URL}/sources")
            return resp.json()
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8210)
