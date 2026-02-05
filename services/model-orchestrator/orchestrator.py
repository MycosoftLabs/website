"""
Earth-2 Model Orchestrator - February 5, 2026

Manages on-demand scaling of Earth-2 AI weather models.
Ensures only one GPU-intensive model runs at a time (RTX 5090 32GB limit).
"""

import asyncio
from datetime import datetime, timedelta
from enum import Enum
from typing import Dict, List, Optional
import httpx
from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
import os

app = FastAPI(title="Earth-2 Model Orchestrator", version="1.0.0")

# Kubernetes API
K8S_API = os.environ.get("K8S_API", "https://kubernetes.default.svc")
K8S_TOKEN_PATH = "/var/run/secrets/kubernetes.io/serviceaccount/token"
NAMESPACE = "earth2-models"

# Model configurations
class ModelTier(str, Enum):
    ALWAYS_ON = "always-on"
    ON_DEMAND = "on-demand"

class ModelConfig:
    def __init__(
        self,
        name: str,
        port: int,
        tier: ModelTier,
        vram_gb: float,
        startup_time_s: int = 60,
    ):
        self.name = name
        self.port = port
        self.tier = tier
        self.vram_gb = vram_gb
        self.startup_time_s = startup_time_s

MODELS = {
    "fcn3": ModelConfig("earth2-fcn3", 8300, ModelTier.ALWAYS_ON, 8),
    "stormscope": ModelConfig("earth2-stormscope", 8301, ModelTier.ALWAYS_ON, 6),
    "atlas": ModelConfig("earth2-atlas", 8302, ModelTier.ON_DEMAND, 12),
    "corrdiff": ModelConfig("earth2-corrdiff", 8303, ModelTier.ON_DEMAND, 14),
    "pangu": ModelConfig("earth2-pangu", 8304, ModelTier.ON_DEMAND, 16),
    "aurora": ModelConfig("earth2-aurora", 8305, ModelTier.ON_DEMAND, 20),
    "fuxi": ModelConfig("earth2-fuxi", 8306, ModelTier.ON_DEMAND, 14),
    "graphcast": ModelConfig("earth2-graphcast", 8307, ModelTier.ON_DEMAND, 20),
    "stormcast": ModelConfig("earth2-stormcast", 8308, ModelTier.ON_DEMAND, 16),
    "precipitation_afno": ModelConfig("earth2-precipitation-afno", 8309, ModelTier.ON_DEMAND, 10),
    "sfno": ModelConfig("earth2-sfno", 8311, ModelTier.ON_DEMAND, 12),
    "tc_tracker": ModelConfig("earth2-tc-tracker", 8312, ModelTier.ON_DEMAND, 8),
}

# RTX 5090 VRAM limit
MAX_VRAM_GB = 32

# State tracking
class ModelState:
    def __init__(self):
        self.active_models: Dict[str, datetime] = {}
        self.pending_models: List[str] = []
        self.last_activity: Dict[str, datetime] = {}

state = ModelState()


class ScaleRequest(BaseModel):
    model: str
    replicas: int = 1
    timeout_minutes: int = 30

class ModelStatus(BaseModel):
    name: str
    tier: str
    replicas: int
    ready: bool
    vram_gb: float
    last_activity: Optional[str] = None


async def get_k8s_token() -> str:
    """Read Kubernetes service account token"""
    try:
        with open(K8S_TOKEN_PATH, "r") as f:
            return f.read().strip()
    except FileNotFoundError:
        return os.environ.get("K8S_TOKEN", "")


async def get_deployment_replicas(model_name: str) -> int:
    """Get current replica count for a deployment"""
    token = await get_k8s_token()
    async with httpx.AsyncClient(verify=False) as client:
        resp = await client.get(
            f"{K8S_API}/apis/apps/v1/namespaces/{NAMESPACE}/deployments/{model_name}",
            headers={"Authorization": f"Bearer {token}"}
        )
        if resp.status_code == 200:
            data = resp.json()
            return data.get("spec", {}).get("replicas", 0)
    return 0


async def scale_deployment(model_name: str, replicas: int) -> bool:
    """Scale a Kubernetes deployment"""
    token = await get_k8s_token()
    async with httpx.AsyncClient(verify=False) as client:
        resp = await client.patch(
            f"{K8S_API}/apis/apps/v1/namespaces/{NAMESPACE}/deployments/{model_name}",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/merge-patch+json"
            },
            json={"spec": {"replicas": replicas}}
        )
        return resp.status_code == 200


async def get_available_vram() -> float:
    """Calculate available VRAM based on active models"""
    used_vram = 0.0
    for model_id in state.active_models:
        if model_id in MODELS:
            used_vram += MODELS[model_id].vram_gb
    return MAX_VRAM_GB - used_vram


async def can_schedule_model(model_id: str) -> bool:
    """Check if model can be scheduled given VRAM constraints"""
    if model_id not in MODELS:
        return False
    
    config = MODELS[model_id]
    available = await get_available_vram()
    return config.vram_gb <= available


async def scale_up_model(model_id: str, timeout_minutes: int):
    """Scale up an on-demand model"""
    if model_id not in MODELS:
        raise HTTPException(status_code=404, detail=f"Unknown model: {model_id}")
    
    config = MODELS[model_id]
    
    # Check VRAM availability
    if not await can_schedule_model(model_id):
        # Need to scale down something first
        await evict_idle_models(config.vram_gb)
        
        if not await can_schedule_model(model_id):
            raise HTTPException(
                status_code=503,
                detail=f"Insufficient VRAM for {model_id}. Need {config.vram_gb}GB, have {await get_available_vram()}GB"
            )
    
    # Scale up
    success = await scale_deployment(config.name, 1)
    if success:
        state.active_models[model_id] = datetime.utcnow()
        state.last_activity[model_id] = datetime.utcnow()
        
        # Schedule auto-scale-down
        asyncio.create_task(auto_scale_down(model_id, timeout_minutes))
        
        return True
    return False


async def scale_down_model(model_id: str):
    """Scale down an on-demand model"""
    if model_id not in MODELS:
        return False
    
    config = MODELS[model_id]
    
    # Don't scale down always-on models
    if config.tier == ModelTier.ALWAYS_ON:
        return False
    
    success = await scale_deployment(config.name, 0)
    if success:
        state.active_models.pop(model_id, None)
        return True
    return False


async def evict_idle_models(required_vram: float):
    """Evict idle models to free up VRAM"""
    now = datetime.utcnow()
    idle_threshold = timedelta(minutes=10)
    
    # Sort by last activity (oldest first)
    idle_models = [
        (model_id, last_active)
        for model_id, last_active in state.last_activity.items()
        if model_id in state.active_models
        and MODELS.get(model_id, ModelConfig("", 0, ModelTier.ALWAYS_ON, 0)).tier == ModelTier.ON_DEMAND
        and now - last_active > idle_threshold
    ]
    idle_models.sort(key=lambda x: x[1])
    
    freed_vram = 0.0
    for model_id, _ in idle_models:
        if freed_vram >= required_vram:
            break
        if await scale_down_model(model_id):
            freed_vram += MODELS[model_id].vram_gb


async def auto_scale_down(model_id: str, timeout_minutes: int):
    """Automatically scale down after timeout"""
    await asyncio.sleep(timeout_minutes * 60)
    
    # Check if there was recent activity
    last_activity = state.last_activity.get(model_id)
    if last_activity:
        elapsed = (datetime.utcnow() - last_activity).total_seconds() / 60
        if elapsed < timeout_minutes:
            # Reschedule
            remaining = timeout_minutes - elapsed
            asyncio.create_task(auto_scale_down(model_id, int(remaining)))
            return
    
    # Scale down
    await scale_down_model(model_id)


@app.get("/")
async def root():
    return {
        "service": "earth2-model-orchestrator",
        "version": "1.0.0",
        "max_vram_gb": MAX_VRAM_GB,
        "available_vram_gb": await get_available_vram()
    }


@app.get("/models")
async def list_models() -> List[ModelStatus]:
    """List all models and their status"""
    result = []
    for model_id, config in MODELS.items():
        replicas = await get_deployment_replicas(config.name)
        last_act = state.last_activity.get(model_id)
        result.append(ModelStatus(
            name=model_id,
            tier=config.tier.value,
            replicas=replicas,
            ready=replicas > 0,
            vram_gb=config.vram_gb,
            last_activity=last_act.isoformat() if last_act else None
        ))
    return result


@app.post("/scale")
async def scale_model(request: ScaleRequest, background_tasks: BackgroundTasks):
    """Scale a model up or down"""
    if request.replicas > 0:
        success = await scale_up_model(request.model, request.timeout_minutes)
    else:
        success = await scale_down_model(request.model)
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to scale model")
    
    return {"model": request.model, "replicas": request.replicas, "status": "scaling"}


@app.post("/heartbeat/{model_id}")
async def model_heartbeat(model_id: str):
    """Update last activity for a model"""
    state.last_activity[model_id] = datetime.utcnow()
    return {"model": model_id, "timestamp": datetime.utcnow().isoformat()}


@app.get("/health")
async def health():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8320)
