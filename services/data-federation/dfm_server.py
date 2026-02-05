"""
═══════════════════════════════════════════════════════════════════════════════
Data Federation Mesh API Server - February 5, 2026

FastAPI service for weather data access from multiple sources.
Provides unified API for Earth2Studio and frontend applications.
═══════════════════════════════════════════════════════════════════════════════
"""

import os
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel, Field
import structlog

from data_sources import DataSourceType, DataFederationMesh, data_mesh

logger = structlog.get_logger()


# ═══════════════════════════════════════════════════════════════════════════════
# Data Models
# ═══════════════════════════════════════════════════════════════════════════════

class FetchRequest(BaseModel):
    """Data fetch request"""
    source: str = Field(default="gfs")
    time: str = Field(description="ISO timestamp")
    variables: List[str] = Field(default=["t2m", "u10", "v10"])
    bounds: Optional[Dict[str, float]] = Field(default=None)

class DataSourceInfo(BaseModel):
    """Data source information"""
    source: str
    variables: List[str]
    available_times: int
    resolution: str
    update_frequency: str

class FetchResult(BaseModel):
    """Data fetch result"""
    source: str
    time: str
    variables: List[str]
    shape: List[int]
    min_lat: float
    max_lat: float
    min_lon: float
    max_lon: float
    data_summary: Dict[str, Dict[str, float]]


# ═══════════════════════════════════════════════════════════════════════════════
# FastAPI Application
# ═══════════════════════════════════════════════════════════════════════════════

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler"""
    logger.info("starting_data_federation_mesh")
    yield
    logger.info("shutting_down")

app = FastAPI(
    title="Data Federation Mesh",
    description="Weather data access from ERA5, GFS, HRRR, and more",
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
    """Health check"""
    return {
        "service": "data-federation-mesh",
        "version": "1.0.0",
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "healthy"}

@app.get("/sources")
async def list_sources():
    """List available data sources"""
    sources = []
    
    source_info = {
        "era5_arco": {
            "name": "ERA5 ARCO",
            "description": "ECMWF ERA5 reanalysis via Google ARCO",
            "resolution": "0.25° global",
            "update_frequency": "~5 day lag",
            "coverage": "Global, 1940-present"
        },
        "gfs": {
            "name": "GFS",
            "description": "NOAA Global Forecast System",
            "resolution": "0.25° global",
            "update_frequency": "6 hours",
            "coverage": "Global, real-time"
        },
        "hrrr": {
            "name": "HRRR",
            "description": "High-Resolution Rapid Refresh",
            "resolution": "3km CONUS",
            "update_frequency": "1 hour",
            "coverage": "Continental US"
        }
    }
    
    for src in data_mesh.get_available_sources():
        info = source_info.get(src["source"], {})
        sources.append({
            **src,
            **info
        })
    
    return {"sources": sources}

@app.get("/sources/{source}/variables")
async def get_source_variables(source: str):
    """Get supported variables for a data source"""
    try:
        source_type = DataSourceType(source)
        data_source = data_mesh.sources.get(source_type)
        if not data_source:
            raise HTTPException(status_code=404, detail=f"Source not found: {source}")
        
        variables = data_source.get_supported_variables()
        
        # Add variable descriptions
        var_info = {
            "t2m": "2-meter temperature (K)",
            "u10": "10-meter U wind component (m/s)",
            "v10": "10-meter V wind component (m/s)",
            "sp": "Surface pressure (Pa)",
            "msl": "Mean sea level pressure (Pa)",
            "tp": "Total precipitation (m)",
            "tcwv": "Total column water vapor (kg/m²)",
            "z500": "500 hPa geopotential height (m²/s²)",
            "t850": "850 hPa temperature (K)",
            "refc": "Composite reflectivity (dBZ)"
        }
        
        return {
            "source": source,
            "variables": [
                {"name": v, "description": var_info.get(v, "Unknown")}
                for v in variables
            ]
        }
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid source: {source}")

@app.get("/sources/{source}/times")
async def get_available_times(
    source: str,
    limit: int = Query(default=24, le=100)
):
    """Get available data times for a source"""
    try:
        source_type = DataSourceType(source)
        data_source = data_mesh.sources.get(source_type)
        if not data_source:
            raise HTTPException(status_code=404, detail=f"Source not found: {source}")
        
        times = data_source.get_available_times()[:limit]
        
        return {
            "source": source,
            "times": [t.isoformat() for t in times],
            "total_available": len(data_source.get_available_times())
        }
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid source: {source}")

@app.post("/fetch")
async def fetch_data(request: FetchRequest):
    """
    Fetch weather data from specified source
    
    Returns data summary (not raw data, which would be too large for JSON).
    Use /fetch/zarr for raw data access.
    """
    try:
        source_type = DataSourceType(request.source)
        time = datetime.fromisoformat(request.time.replace('Z', '+00:00'))
        
        ds = await data_mesh.fetch(
            source_type,
            time,
            request.variables,
            request.bounds
        )
        
        # Create summary
        data_summary = {}
        for var in request.variables:
            if var in ds:
                data_summary[var] = {
                    "min": float(ds[var].min().values),
                    "max": float(ds[var].max().values),
                    "mean": float(ds[var].mean().values),
                    "std": float(ds[var].std().values)
                }
        
        # Get coordinate info
        lat_coord = "lat" if "lat" in ds.coords else "latitude"
        lon_coord = "lon" if "lon" in ds.coords else "longitude"
        
        result = FetchResult(
            source=request.source,
            time=time.isoformat(),
            variables=request.variables,
            shape=list(ds[request.variables[0]].shape) if request.variables else [],
            min_lat=float(ds[lat_coord].min().values),
            max_lat=float(ds[lat_coord].max().values),
            min_lon=float(ds[lon_coord].min().values),
            max_lon=float(ds[lon_coord].max().values),
            data_summary=data_summary
        )
        
        return result
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("fetch_error", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/fetch/latest")
async def fetch_latest(
    source: str = Query(default="gfs"),
    variables: str = Query(default="t2m,u10,v10"),
    north: float = Query(default=90),
    south: float = Query(default=-90),
    east: float = Query(default=180),
    west: float = Query(default=-180)
):
    """Fetch latest available data from source"""
    try:
        source_type = DataSourceType(source)
        data_source = data_mesh.sources.get(source_type)
        if not data_source:
            raise HTTPException(status_code=404, detail=f"Source not found: {source}")
        
        # Get latest time
        available = data_source.get_available_times()
        if not available:
            raise HTTPException(status_code=404, detail="No data available")
        
        latest_time = available[0]
        var_list = variables.split(",")
        bounds = {"north": north, "south": south, "east": east, "west": west}
        
        ds = await data_mesh.fetch(source_type, latest_time, var_list, bounds)
        
        # Return summary
        data_summary = {}
        for var in var_list:
            if var in ds:
                data_summary[var] = {
                    "min": float(ds[var].min().values),
                    "max": float(ds[var].max().values),
                    "mean": float(ds[var].mean().values),
                }
        
        return {
            "source": source,
            "time": latest_time.isoformat(),
            "variables": var_list,
            "data_summary": data_summary
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("fetch_latest_error", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/fetch/grid")
async def fetch_grid(
    source: str = Query(default="gfs"),
    variable: str = Query(default="t2m"),
    time: str = Query(default=None),
    north: float = Query(default=90),
    south: float = Query(default=-90),
    east: float = Query(default=180),
    west: float = Query(default=-180),
    resolution: float = Query(default=1.0, description="Output resolution in degrees")
):
    """
    Fetch gridded data for visualization
    
    Returns downsampled grid suitable for web visualization.
    """
    try:
        source_type = DataSourceType(source)
        data_source = data_mesh.sources.get(source_type)
        if not data_source:
            raise HTTPException(status_code=404, detail=f"Source not found: {source}")
        
        # Parse time or use latest
        if time:
            fetch_time = datetime.fromisoformat(time.replace('Z', '+00:00'))
        else:
            available = data_source.get_available_times()
            fetch_time = available[0] if available else datetime.utcnow()
        
        bounds = {"north": north, "south": south, "east": east, "west": west}
        
        ds = await data_mesh.fetch(source_type, fetch_time, [variable], bounds)
        
        # Resample to requested resolution
        if variable in ds:
            data = ds[variable].values
            lat_coord = "lat" if "lat" in ds.coords else "latitude"
            lon_coord = "lon" if "lon" in ds.coords else "longitude"
            
            lats = ds[lat_coord].values
            lons = ds[lon_coord].values
            
            # Downsample if resolution is lower than native
            step_lat = max(1, int(resolution / abs(lats[1] - lats[0]))) if len(lats) > 1 else 1
            step_lon = max(1, int(resolution / abs(lons[1] - lons[0]))) if len(lons) > 1 else 1
            
            grid = data[::step_lat, ::step_lon].tolist()
            grid_lats = lats[::step_lat].tolist()
            grid_lons = lons[::step_lon].tolist()
            
            return {
                "variable": variable,
                "time": fetch_time.isoformat(),
                "source": source,
                "grid": grid,
                "lats": grid_lats,
                "lons": grid_lons,
                "min": float(data.min()),
                "max": float(data.max()),
                "mean": float(data.mean())
            }
        else:
            raise HTTPException(status_code=404, detail=f"Variable not found: {variable}")
            
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("fetch_grid_error", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


# ═══════════════════════════════════════════════════════════════════════════════
# Main Entry Point
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "dfm_server:app",
        host="0.0.0.0",
        port=8310,
        reload=False,
        log_level="info"
    )
