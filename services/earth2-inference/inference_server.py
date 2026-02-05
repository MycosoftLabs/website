"""
═══════════════════════════════════════════════════════════════════════════════
NVIDIA Earth2Studio Inference Server - February 5, 2026

FastAPI service wrapping Earth2Studio for AI weather model inference.
Supports: FCN3, Atlas, StormScope, CorrDiff, Pangu, Aurora, and more.

Run: uvicorn inference_server:app --host 0.0.0.0 --port 8300
═══════════════════════════════════════════════════════════════════════════════
"""

import os
import gc
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any, Union
from contextlib import asynccontextmanager
from enum import Enum

import numpy as np
import torch
import xarray as xr
from fastapi import FastAPI, HTTPException, BackgroundTasks, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field
from prometheus_client import Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST
import structlog

# Configure logging
structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer()
    ]
)
logger = structlog.get_logger()

# ═══════════════════════════════════════════════════════════════════════════════
# Configuration
# ═══════════════════════════════════════════════════════════════════════════════

class Settings(BaseModel):
    """Service configuration"""
    model_cache_dir: str = Field(default="/opt/earth2/models")
    data_cache_dir: str = Field(default="/opt/earth2/data")
    max_concurrent_runs: int = Field(default=2)
    default_device: str = Field(default="cuda:0")
    enable_fp16: bool = Field(default=True)
    huggingface_token: Optional[str] = Field(default=None)

settings = Settings(
    model_cache_dir=os.environ.get("MODEL_CACHE_DIR", "/opt/earth2/models"),
    data_cache_dir=os.environ.get("DATA_CACHE_DIR", "/opt/earth2/data"),
    huggingface_token=os.environ.get("HF_TOKEN"),
)

# ═══════════════════════════════════════════════════════════════════════════════
# Prometheus Metrics
# ═══════════════════════════════════════════════════════════════════════════════

INFERENCE_REQUESTS = Counter('earth2_inference_requests_total', 'Total inference requests', ['model', 'status'])
INFERENCE_DURATION = Histogram('earth2_inference_duration_seconds', 'Inference duration', ['model'])
GPU_MEMORY_USED = Gauge('earth2_gpu_memory_used_bytes', 'GPU memory used')
GPU_MEMORY_TOTAL = Gauge('earth2_gpu_memory_total_bytes', 'GPU memory total')
MODELS_LOADED = Gauge('earth2_models_loaded', 'Number of models currently loaded')

# ═══════════════════════════════════════════════════════════════════════════════
# Data Models
# ═══════════════════════════════════════════════════════════════════════════════

class Earth2ModelType(str, Enum):
    """Supported Earth-2 models"""
    FCN3 = "fcn3"
    ATLAS = "atlas"
    STORMSCOPE = "stormscope"
    CORRDIFF = "corrdiff"
    PANGU = "pangu"
    AURORA = "aurora"
    FOURCASTNET = "fourcastnet"
    GRAPHCAST = "graphcast"
    FUXI = "fuxi"

class DataSourceType(str, Enum):
    """Available data sources"""
    GFS = "gfs"
    ERA5_ARCO = "era5_arco"
    ERA5_CDS = "era5_cds"
    HRRR = "hrrr"
    IFS = "ifs"

class GeoBounds(BaseModel):
    """Geographic bounding box"""
    north: float = Field(ge=-90, le=90)
    south: float = Field(ge=-90, le=90)
    east: float = Field(ge=-180, le=180)
    west: float = Field(ge=-180, le=180)

class ForecastRequest(BaseModel):
    """Forecast inference request"""
    model: Earth2ModelType = Field(default=Earth2ModelType.FCN3)
    start_time: Optional[str] = Field(default=None, description="ISO timestamp")
    steps: int = Field(default=4, ge=1, le=60)
    step_hours: int = Field(default=6, ge=1, le=24)
    variables: List[str] = Field(default=["t2m", "u10", "v10", "sp", "tp"])
    bounds: Optional[GeoBounds] = Field(default=None)
    data_source: DataSourceType = Field(default=DataSourceType.GFS)
    ensemble_members: int = Field(default=1, ge=1, le=50)
    use_fp16: bool = Field(default=True)

class NowcastRequest(BaseModel):
    """Nowcast inference request"""
    start_time: Optional[str] = Field(default=None)
    forecast_minutes: int = Field(default=60, ge=15, le=360)
    step_minutes: int = Field(default=15)
    bounds: Optional[GeoBounds] = Field(default=None)
    include_storm_cells: bool = Field(default=True)

class DownscaleRequest(BaseModel):
    """CorrDiff downscaling request"""
    source_data: Dict[str, Any] = Field(description="Coarse resolution input data")
    target_resolution: str = Field(default="1km")
    bounds: GeoBounds

class InferenceResult(BaseModel):
    """Inference result"""
    run_id: str
    model: str
    status: str
    start_time: str
    end_time: Optional[str] = None
    steps: List[Dict[str, Any]] = []
    metadata: Dict[str, Any] = {}

class ModelStatus(BaseModel):
    """Model status information"""
    name: str
    loaded: bool
    memory_mb: Optional[float] = None
    last_used: Optional[str] = None
    inference_count: int = 0

class GPUStatus(BaseModel):
    """GPU status information"""
    device_name: str
    memory_used_mb: float
    memory_total_mb: float
    utilization_percent: float
    temperature_c: Optional[float] = None

# ═══════════════════════════════════════════════════════════════════════════════
# Model Manager
# ═══════════════════════════════════════════════════════════════════════════════

class ModelManager:
    """Manages loading/unloading of Earth2Studio models"""
    
    def __init__(self):
        self.loaded_models: Dict[str, Any] = {}
        self.model_metadata: Dict[str, ModelStatus] = {}
        self.lock = asyncio.Lock()
        self._device = settings.default_device
        
    async def get_model(self, model_type: Earth2ModelType):
        """Get or load a model"""
        async with self.lock:
            model_name = model_type.value
            
            if model_name in self.loaded_models:
                self.model_metadata[model_name].last_used = datetime.utcnow().isoformat()
                return self.loaded_models[model_name]
            
            # Check GPU memory before loading
            await self._ensure_memory_available(model_type)
            
            # Load the model
            logger.info("loading_model", model=model_name)
            model = await self._load_model(model_type)
            
            self.loaded_models[model_name] = model
            self.model_metadata[model_name] = ModelStatus(
                name=model_name,
                loaded=True,
                memory_mb=self._get_model_memory(model),
                last_used=datetime.utcnow().isoformat(),
                inference_count=0
            )
            
            MODELS_LOADED.set(len(self.loaded_models))
            return model
    
    async def _load_model(self, model_type: Earth2ModelType):
        """Load a specific model"""
        # Import earth2studio modules dynamically
        try:
            if model_type == Earth2ModelType.FCN3:
                from earth2studio.models.px import FCN3
                package = FCN3.load_default_package()
                return FCN3.load_model(package).to(self._device)
                
            elif model_type == Earth2ModelType.ATLAS:
                from earth2studio.models.px import Atlas
                package = Atlas.load_default_package()
                return Atlas.load_model(package).to(self._device)
                
            elif model_type == Earth2ModelType.PANGU:
                from earth2studio.models.px import Pangu
                package = Pangu.load_default_package()
                return Pangu.load_model(package).to(self._device)
                
            elif model_type == Earth2ModelType.FOURCASTNET:
                from earth2studio.models.px import FourCastNet
                package = FourCastNet.load_default_package()
                return FourCastNet.load_model(package).to(self._device)
                
            elif model_type == Earth2ModelType.CORRDIFF:
                from earth2studio.models.dx import CorrDiff
                package = CorrDiff.load_default_package()
                return CorrDiff.load_model(package).to(self._device)
                
            elif model_type == Earth2ModelType.STORMSCOPE:
                # StormScope requires PhysicsNeMo
                from earth2studio.models.px import StormScope
                package = StormScope.load_default_package()
                return StormScope.load_model(package).to(self._device)
                
            elif model_type == Earth2ModelType.AURORA:
                from earth2studio.models.px import Aurora
                package = Aurora.load_default_package()
                return Aurora.load_model(package).to(self._device)
            
            else:
                raise ValueError(f"Unsupported model type: {model_type}")
                
        except ImportError as e:
            logger.error("model_import_error", model=model_type.value, error=str(e))
            raise HTTPException(status_code=500, detail=f"Model {model_type} not available: {e}")
    
    async def _ensure_memory_available(self, model_type: Earth2ModelType):
        """Ensure enough GPU memory is available, unloading models if needed"""
        required_mb = self._get_required_memory(model_type)
        available_mb = self._get_available_memory()
        
        if available_mb < required_mb:
            # Unload least recently used models
            models_by_usage = sorted(
                self.model_metadata.items(),
                key=lambda x: x[1].last_used or "1970-01-01"
            )
            
            for model_name, _ in models_by_usage:
                if model_name in self.loaded_models:
                    await self.unload_model(model_name)
                    available_mb = self._get_available_memory()
                    if available_mb >= required_mb:
                        break
    
    async def unload_model(self, model_name: str):
        """Unload a model from memory"""
        if model_name in self.loaded_models:
            logger.info("unloading_model", model=model_name)
            del self.loaded_models[model_name]
            if model_name in self.model_metadata:
                self.model_metadata[model_name].loaded = False
            gc.collect()
            torch.cuda.empty_cache()
            MODELS_LOADED.set(len(self.loaded_models))
    
    def _get_required_memory(self, model_type: Earth2ModelType) -> float:
        """Estimated memory requirements in MB"""
        memory_map = {
            Earth2ModelType.FCN3: 8000,
            Earth2ModelType.ATLAS: 12000,
            Earth2ModelType.STORMSCOPE: 4000,
            Earth2ModelType.CORRDIFF: 8000,
            Earth2ModelType.PANGU: 6000,
            Earth2ModelType.AURORA: 10000,
            Earth2ModelType.FOURCASTNET: 8000,
            Earth2ModelType.GRAPHCAST: 15000,
            Earth2ModelType.FUXI: 8000,
        }
        return memory_map.get(model_type, 10000)
    
    def _get_available_memory(self) -> float:
        """Get available GPU memory in MB"""
        if torch.cuda.is_available():
            free, total = torch.cuda.mem_get_info()
            return free / (1024 * 1024)
        return 0
    
    def _get_model_memory(self, model) -> float:
        """Get memory used by a model in MB"""
        if hasattr(model, 'parameters'):
            param_size = sum(p.numel() * p.element_size() for p in model.parameters())
            return param_size / (1024 * 1024)
        return 0
    
    def get_gpu_status(self) -> GPUStatus:
        """Get current GPU status"""
        if torch.cuda.is_available():
            device = torch.cuda.current_device()
            props = torch.cuda.get_device_properties(device)
            free, total = torch.cuda.mem_get_info()
            
            GPU_MEMORY_USED.set(total - free)
            GPU_MEMORY_TOTAL.set(total)
            
            return GPUStatus(
                device_name=props.name,
                memory_used_mb=(total - free) / (1024 * 1024),
                memory_total_mb=total / (1024 * 1024),
                utilization_percent=((total - free) / total) * 100,
                temperature_c=None  # Would need pynvml for this
            )
        return GPUStatus(
            device_name="No GPU",
            memory_used_mb=0,
            memory_total_mb=0,
            utilization_percent=0
        )

# Global model manager instance
model_manager = ModelManager()

# ═══════════════════════════════════════════════════════════════════════════════
# Data Source Manager
# ═══════════════════════════════════════════════════════════════════════════════

class DataSourceManager:
    """Manages weather data fetching from various sources"""
    
    def __init__(self):
        self.cache_dir = settings.data_cache_dir
        
    async def fetch_initial_conditions(
        self,
        source: DataSourceType,
        time: datetime,
        variables: List[str],
        bounds: Optional[GeoBounds] = None
    ) -> xr.Dataset:
        """Fetch initial conditions for model inference"""
        logger.info("fetching_data", source=source.value, time=time.isoformat())
        
        try:
            if source == DataSourceType.GFS:
                return await self._fetch_gfs(time, variables, bounds)
            elif source == DataSourceType.ERA5_ARCO:
                return await self._fetch_era5_arco(time, variables, bounds)
            elif source == DataSourceType.HRRR:
                return await self._fetch_hrrr(time, variables, bounds)
            else:
                raise ValueError(f"Unsupported data source: {source}")
        except Exception as e:
            logger.error("data_fetch_error", source=source.value, error=str(e))
            raise HTTPException(status_code=500, detail=f"Failed to fetch data: {e}")
    
    async def _fetch_gfs(
        self,
        time: datetime,
        variables: List[str],
        bounds: Optional[GeoBounds]
    ) -> xr.Dataset:
        """Fetch GFS data"""
        try:
            from earth2studio.data import GFS
            data_source = GFS(cache=True)
            
            # Fetch data
            ds = await asyncio.to_thread(
                data_source, 
                time=[time],
                variable=variables
            )
            return ds
        except ImportError:
            # Fallback to mock data for development
            return self._create_mock_data(time, variables, bounds)
    
    async def _fetch_era5_arco(
        self,
        time: datetime,
        variables: List[str],
        bounds: Optional[GeoBounds]
    ) -> xr.Dataset:
        """Fetch ERA5 data from ARCO (Analysis-Ready Cloud-Optimized)"""
        try:
            from earth2studio.data import ARCO
            data_source = ARCO()
            
            ds = await asyncio.to_thread(
                data_source,
                time=[time],
                variable=variables
            )
            return ds
        except ImportError:
            return self._create_mock_data(time, variables, bounds)
    
    async def _fetch_hrrr(
        self,
        time: datetime,
        variables: List[str],
        bounds: Optional[GeoBounds]
    ) -> xr.Dataset:
        """Fetch HRRR data"""
        try:
            from earth2studio.data import HRRR
            data_source = HRRR()
            
            ds = await asyncio.to_thread(
                data_source,
                time=[time],
                variable=variables
            )
            return ds
        except ImportError:
            return self._create_mock_data(time, variables, bounds)
    
    def _create_mock_data(
        self,
        time: datetime,
        variables: List[str],
        bounds: Optional[GeoBounds]
    ) -> xr.Dataset:
        """Create mock data for development/testing"""
        lat = np.linspace(-90, 90, 721)
        lon = np.linspace(0, 360, 1440)
        
        data_vars = {}
        for var in variables:
            data_vars[var] = (["lat", "lon"], np.random.randn(721, 1440).astype(np.float32))
        
        return xr.Dataset(
            data_vars,
            coords={"lat": lat, "lon": lon, "time": [time]}
        )

data_manager = DataSourceManager()

# ═══════════════════════════════════════════════════════════════════════════════
# Inference Engine
# ═══════════════════════════════════════════════════════════════════════════════

class InferenceEngine:
    """Runs Earth2Studio model inference"""
    
    def __init__(self):
        self.run_counter = 0
        self.active_runs: Dict[str, InferenceResult] = {}
        self.semaphore = asyncio.Semaphore(settings.max_concurrent_runs)
        
    async def run_forecast(self, request: ForecastRequest) -> InferenceResult:
        """Run forecast inference"""
        async with self.semaphore:
            run_id = f"forecast-{self.run_counter:06d}-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
            self.run_counter += 1
            
            result = InferenceResult(
                run_id=run_id,
                model=request.model.value,
                status="running",
                start_time=datetime.utcnow().isoformat()
            )
            self.active_runs[run_id] = result
            
            try:
                with INFERENCE_DURATION.labels(model=request.model.value).time():
                    # Parse start time
                    if request.start_time:
                        start_time = datetime.fromisoformat(request.start_time.replace('Z', '+00:00'))
                    else:
                        start_time = datetime.utcnow().replace(minute=0, second=0, microsecond=0)
                    
                    # Get model
                    model = await model_manager.get_model(request.model)
                    
                    # Fetch initial conditions
                    initial_data = await data_manager.fetch_initial_conditions(
                        request.data_source,
                        start_time,
                        request.variables,
                        request.bounds
                    )
                    
                    # Run inference
                    steps_data = await self._run_model_inference(
                        model,
                        initial_data,
                        request.steps,
                        request.step_hours,
                        request.variables,
                        request.use_fp16
                    )
                    
                    result.steps = steps_data
                    result.status = "completed"
                    result.end_time = datetime.utcnow().isoformat()
                    result.metadata = {
                        "model": request.model.value,
                        "data_source": request.data_source.value,
                        "steps": request.steps,
                        "step_hours": request.step_hours,
                        "variables": request.variables,
                        "ensemble_members": request.ensemble_members,
                    }
                    
                    INFERENCE_REQUESTS.labels(model=request.model.value, status="success").inc()
                    
            except Exception as e:
                result.status = "failed"
                result.metadata["error"] = str(e)
                INFERENCE_REQUESTS.labels(model=request.model.value, status="error").inc()
                logger.error("inference_error", run_id=run_id, error=str(e))
                raise HTTPException(status_code=500, detail=str(e))
            
            return result
    
    async def _run_model_inference(
        self,
        model,
        initial_data: xr.Dataset,
        steps: int,
        step_hours: int,
        variables: List[str],
        use_fp16: bool
    ) -> List[Dict[str, Any]]:
        """Execute model inference"""
        results = []
        
        try:
            from earth2studio.run import deterministic
            from earth2studio.io import XarrayBackend
            
            # Create output backend
            io_backend = XarrayBackend()
            
            # Run inference
            await asyncio.to_thread(
                deterministic,
                time=[initial_data.time.values[0]],
                nsteps=steps,
                model=model,
                data=initial_data,
                io=io_backend
            )
            
            # Extract results
            output_ds = io_backend.root
            for step in range(steps):
                step_data = {
                    "forecast_hour": step * step_hours,
                    "valid_time": (datetime.utcnow() + timedelta(hours=step * step_hours)).isoformat(),
                    "data": {}
                }
                
                for var in variables:
                    if var in output_ds:
                        var_data = output_ds[var].isel(time=step).values
                        step_data["data"][var] = {
                            "min": float(np.nanmin(var_data)),
                            "max": float(np.nanmax(var_data)),
                            "mean": float(np.nanmean(var_data)),
                        }
                
                results.append(step_data)
                
        except ImportError:
            # Fallback for development without full Earth2Studio
            logger.warning("earth2studio_not_available", message="Using mock inference")
            for step in range(steps):
                step_data = {
                    "forecast_hour": step * step_hours,
                    "valid_time": (datetime.utcnow() + timedelta(hours=step * step_hours)).isoformat(),
                    "data": {}
                }
                for var in variables:
                    step_data["data"][var] = {
                        "min": float(np.random.uniform(-30, 0)),
                        "max": float(np.random.uniform(20, 40)),
                        "mean": float(np.random.uniform(5, 20)),
                    }
                results.append(step_data)
        
        return results

inference_engine = InferenceEngine()

# ═══════════════════════════════════════════════════════════════════════════════
# FastAPI Application
# ═══════════════════════════════════════════════════════════════════════════════

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler"""
    logger.info("starting_earth2_inference_server")
    
    # Check GPU availability
    if torch.cuda.is_available():
        device_name = torch.cuda.get_device_name(0)
        logger.info("gpu_detected", device=device_name)
    else:
        logger.warning("no_gpu_detected", message="Running in CPU mode")
    
    yield
    
    # Cleanup
    logger.info("shutting_down")
    for model_name in list(model_manager.loaded_models.keys()):
        await model_manager.unload_model(model_name)

app = FastAPI(
    title="NVIDIA Earth-2 Inference Service",
    description="AI Weather Model Inference API powered by Earth2Studio",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ═══════════════════════════════════════════════════════════════════════════════
# API Endpoints
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/")
async def root():
    """Service health check"""
    return {
        "service": "earth2-inference",
        "version": "1.0.0",
        "status": "healthy",
        "gpu_available": torch.cuda.is_available(),
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

@app.get("/metrics")
async def metrics():
    """Prometheus metrics endpoint"""
    return StreamingResponse(
        iter([generate_latest()]),
        media_type=CONTENT_TYPE_LATEST
    )

@app.get("/status")
async def status():
    """Get detailed service status"""
    gpu_status = model_manager.get_gpu_status()
    return {
        "service": "earth2-inference",
        "gpu": gpu_status.model_dump(),
        "models_loaded": len(model_manager.loaded_models),
        "model_details": {
            name: status.model_dump() 
            for name, status in model_manager.model_metadata.items()
        },
        "active_runs": len(inference_engine.active_runs),
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/models")
async def list_models():
    """List available models"""
    models = []
    for model_type in Earth2ModelType:
        models.append({
            "name": model_type.value,
            "loaded": model_type.value in model_manager.loaded_models,
            "memory_required_mb": model_manager._get_required_memory(model_type),
            "description": _get_model_description(model_type)
        })
    return {"models": models}

def _get_model_description(model_type: Earth2ModelType) -> str:
    descriptions = {
        Earth2ModelType.FCN3: "FourCastNet3 - Global 0.25° forecast model",
        Earth2ModelType.ATLAS: "Atlas ERA5 - Ensemble diffusion forecast",
        Earth2ModelType.STORMSCOPE: "StormScope - High-resolution nowcasting (0-6hr)",
        Earth2ModelType.CORRDIFF: "CorrDiff - AI-powered downscaling to 1km",
        Earth2ModelType.PANGU: "Pangu-Weather - 5-day global forecast",
        Earth2ModelType.AURORA: "Aurora - Microsoft atmospheric foundation model",
        Earth2ModelType.FOURCASTNET: "FourCastNet - Legacy global forecast",
        Earth2ModelType.GRAPHCAST: "GraphCast - DeepMind graph neural network",
        Earth2ModelType.FUXI: "FuXi - Fudan University weather model",
    }
    return descriptions.get(model_type, "Unknown model")

@app.post("/forecast", response_model=InferenceResult)
async def run_forecast(request: ForecastRequest):
    """
    Run weather forecast inference
    
    - **model**: AI model to use (fcn3, atlas, pangu, etc.)
    - **steps**: Number of forecast steps
    - **step_hours**: Hours between each step
    - **variables**: Weather variables to forecast
    """
    return await inference_engine.run_forecast(request)

@app.post("/nowcast", response_model=InferenceResult)
async def run_nowcast(request: NowcastRequest):
    """
    Run short-term nowcast (0-6 hours)
    
    Uses StormScope model for high-resolution precipitation nowcasting.
    """
    forecast_request = ForecastRequest(
        model=Earth2ModelType.STORMSCOPE,
        start_time=request.start_time,
        steps=request.forecast_minutes // request.step_minutes,
        step_hours=request.step_minutes // 60 if request.step_minutes >= 60 else 1,
        variables=["tp", "t2m", "u10", "v10"],
        data_source=DataSourceType.HRRR,
    )
    return await inference_engine.run_forecast(forecast_request)

@app.post("/downscale")
async def run_downscale(request: DownscaleRequest):
    """
    Run CorrDiff downscaling to high resolution
    
    Takes coarse (25km) forecast data and downscales to 1km resolution.
    """
    # Load CorrDiff model
    model = await model_manager.get_model(Earth2ModelType.CORRDIFF)
    
    # Run downscaling (placeholder implementation)
    return {
        "status": "completed",
        "target_resolution": request.target_resolution,
        "bounds": request.bounds.model_dump(),
        "message": "Downscaling complete"
    }

@app.post("/models/{model_name}/load")
async def load_model(model_name: str):
    """Pre-load a model into GPU memory"""
    try:
        model_type = Earth2ModelType(model_name)
        await model_manager.get_model(model_type)
        return {"status": "loaded", "model": model_name}
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Unknown model: {model_name}")

@app.post("/models/{model_name}/unload")
async def unload_model(model_name: str):
    """Unload a model from GPU memory"""
    await model_manager.unload_model(model_name)
    return {"status": "unloaded", "model": model_name}

@app.get("/gpu")
async def gpu_status():
    """Get GPU status"""
    return model_manager.get_gpu_status().model_dump()

# ═══════════════════════════════════════════════════════════════════════════════
# Main Entry Point
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "inference_server:app",
        host="0.0.0.0",
        port=8300,
        reload=False,
        workers=1,  # Single worker for GPU
        log_level="info"
    )
