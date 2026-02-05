"""
═══════════════════════════════════════════════════════════════════════════════
Data Federation Mesh - Data Source Manager - February 5, 2026

Unified interface for fetching weather data from multiple sources:
- ERA5 (ARCO cloud-optimized, CDS API)
- GFS (NOAA)
- HRRR (AWS)
- GEFS (Ensemble)

Provides caching, rate limiting, and format conversion for Earth2Studio.
═══════════════════════════════════════════════════════════════════════════════
"""

import os
import asyncio
import hashlib
from abc import ABC, abstractmethod
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Optional, Dict, Any, Union
from enum import Enum

import numpy as np
import xarray as xr
import structlog

logger = structlog.get_logger()


class DataSourceType(str, Enum):
    """Available data sources"""
    ERA5_ARCO = "era5_arco"
    ERA5_CDS = "era5_cds"
    GFS = "gfs"
    GFS_FORECAST = "gfs_forecast"
    HRRR = "hrrr"
    HRRR_FORECAST = "hrrr_forecast"
    GEFS = "gefs"
    IFS = "ifs"


class DataSourceConfig:
    """Configuration for data sources"""
    
    def __init__(self):
        self.cache_dir = Path(os.environ.get("DATA_CACHE_DIR", "/opt/earth2/data"))
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        
        # API credentials
        self.cds_api_key = os.environ.get("CDS_API_KEY")
        self.cds_api_url = os.environ.get("CDS_API_URL", "https://cds.climate.copernicus.eu/api/v2")
        
        # Cache settings
        self.cache_ttl_hours = int(os.environ.get("DATA_CACHE_TTL_HOURS", "24"))
        self.max_cache_size_gb = int(os.environ.get("MAX_CACHE_SIZE_GB", "100"))


config = DataSourceConfig()


class BaseDataSource(ABC):
    """Abstract base class for data sources"""
    
    def __init__(self, source_type: DataSourceType):
        self.source_type = source_type
        self.cache_dir = config.cache_dir / source_type.value
        self.cache_dir.mkdir(parents=True, exist_ok=True)
    
    @abstractmethod
    async def fetch(
        self,
        time: datetime,
        variables: List[str],
        bounds: Optional[Dict[str, float]] = None
    ) -> xr.Dataset:
        """Fetch data for given time and variables"""
        pass
    
    @abstractmethod
    def get_available_times(self) -> List[datetime]:
        """Get list of available data times"""
        pass
    
    @abstractmethod
    def get_supported_variables(self) -> List[str]:
        """Get list of supported variables"""
        pass
    
    def _get_cache_key(self, time: datetime, variables: List[str]) -> str:
        """Generate cache key for request"""
        var_str = "_".join(sorted(variables))
        time_str = time.strftime("%Y%m%d%H")
        key = f"{self.source_type.value}_{time_str}_{var_str}"
        return hashlib.md5(key.encode()).hexdigest()
    
    def _get_cache_path(self, cache_key: str) -> Path:
        """Get cache file path"""
        return self.cache_dir / f"{cache_key}.zarr"
    
    async def _load_from_cache(self, cache_key: str) -> Optional[xr.Dataset]:
        """Load data from cache if available"""
        cache_path = self._get_cache_path(cache_key)
        if cache_path.exists():
            try:
                ds = xr.open_zarr(cache_path)
                logger.info("cache_hit", source=self.source_type.value, key=cache_key)
                return ds
            except Exception as e:
                logger.warning("cache_read_error", error=str(e))
        return None
    
    async def _save_to_cache(self, ds: xr.Dataset, cache_key: str):
        """Save data to cache"""
        cache_path = self._get_cache_path(cache_key)
        try:
            ds.to_zarr(cache_path, mode="w")
            logger.info("cache_save", source=self.source_type.value, key=cache_key)
        except Exception as e:
            logger.warning("cache_write_error", error=str(e))


class ERA5ArcoSource(BaseDataSource):
    """
    ERA5 data from Google ARCO (Analysis-Ready Cloud-Optimized)
    
    Cloud-optimized Zarr format, no API key required.
    Available from 1940 to ~5 days ago.
    """
    
    def __init__(self):
        super().__init__(DataSourceType.ERA5_ARCO)
        self.bucket_url = "gs://gcp-public-data-arco-era5/ar/full_37-1h-0p25deg-chunk-1.zarr-v3"
    
    async def fetch(
        self,
        time: datetime,
        variables: List[str],
        bounds: Optional[Dict[str, float]] = None
    ) -> xr.Dataset:
        """Fetch ERA5 data from ARCO"""
        cache_key = self._get_cache_key(time, variables)
        
        # Check cache
        cached = await self._load_from_cache(cache_key)
        if cached is not None:
            return cached
        
        logger.info("fetching_era5_arco", time=time.isoformat(), variables=variables)
        
        try:
            # Try using Earth2Studio's ARCO source
            from earth2studio.data import ARCO
            
            data_source = ARCO()
            ds = await asyncio.to_thread(
                data_source,
                time=[time],
                variable=variables
            )
            
            # Apply bounds if specified
            if bounds:
                ds = self._apply_bounds(ds, bounds)
            
            # Cache result
            await self._save_to_cache(ds, cache_key)
            
            return ds
            
        except ImportError:
            logger.warning("earth2studio_not_available", fallback="direct_zarr")
            return await self._fetch_direct(time, variables, bounds)
    
    async def _fetch_direct(
        self,
        time: datetime,
        variables: List[str],
        bounds: Optional[Dict[str, float]] = None
    ) -> xr.Dataset:
        """Direct Zarr access fallback"""
        try:
            import gcsfs
            
            fs = gcsfs.GCSFileSystem(token="anon")
            mapper = fs.get_mapper(self.bucket_url)
            
            ds = xr.open_zarr(mapper, consolidated=True)
            
            # Select time and variables
            ds = ds.sel(time=time, method="nearest")
            ds = ds[variables]
            
            if bounds:
                ds = self._apply_bounds(ds, bounds)
            
            return ds.load()
            
        except Exception as e:
            logger.error("era5_arco_fetch_error", error=str(e))
            raise
    
    def _apply_bounds(self, ds: xr.Dataset, bounds: Dict[str, float]) -> xr.Dataset:
        """Apply geographic bounds to dataset"""
        if "latitude" in ds.coords:
            ds = ds.sel(
                latitude=slice(bounds["north"], bounds["south"]),
                longitude=slice(bounds["west"], bounds["east"])
            )
        elif "lat" in ds.coords:
            ds = ds.sel(
                lat=slice(bounds["south"], bounds["north"]),
                lon=slice(bounds["west"], bounds["east"])
            )
        return ds
    
    def get_available_times(self) -> List[datetime]:
        """ERA5 available from 1940 to ~5 days ago"""
        now = datetime.utcnow()
        end = now - timedelta(days=5)
        # Return recent 30 days as example
        return [end - timedelta(hours=i) for i in range(0, 720, 6)]
    
    def get_supported_variables(self) -> List[str]:
        """ERA5 supported variables"""
        return [
            "t2m", "u10", "v10", "sp", "msl", "tcwv", "tp",
            "z50", "z100", "z150", "z200", "z250", "z300", "z400", "z500", "z600", "z700", "z850", "z925", "z1000",
            "t50", "t100", "t150", "t200", "t250", "t300", "t400", "t500", "t600", "t700", "t850", "t925", "t1000",
            "u50", "u100", "u150", "u200", "u250", "u300", "u400", "u500", "u600", "u700", "u850", "u925", "u1000",
            "v50", "v100", "v150", "v200", "v250", "v300", "v400", "v500", "v600", "v700", "v850", "v925", "v1000",
            "q50", "q100", "q150", "q200", "q250", "q300", "q400", "q500", "q600", "q700", "q850", "q925", "q1000",
        ]


class GFSSource(BaseDataSource):
    """
    GFS (Global Forecast System) data from NOAA
    
    Real-time forecasts, updated every 6 hours.
    0.25° global resolution.
    """
    
    def __init__(self):
        super().__init__(DataSourceType.GFS)
        self.base_url = "https://nomads.ncep.noaa.gov/dods"
    
    async def fetch(
        self,
        time: datetime,
        variables: List[str],
        bounds: Optional[Dict[str, float]] = None
    ) -> xr.Dataset:
        """Fetch GFS data"""
        cache_key = self._get_cache_key(time, variables)
        
        cached = await self._load_from_cache(cache_key)
        if cached is not None:
            return cached
        
        logger.info("fetching_gfs", time=time.isoformat(), variables=variables)
        
        try:
            from earth2studio.data import GFS
            
            data_source = GFS(cache=True)
            ds = await asyncio.to_thread(
                data_source,
                time=[time],
                variable=variables
            )
            
            if bounds:
                ds = self._apply_bounds(ds, bounds)
            
            await self._save_to_cache(ds, cache_key)
            return ds
            
        except ImportError:
            logger.warning("earth2studio_not_available", fallback="mock_data")
            return self._create_mock_gfs(time, variables, bounds)
    
    def _apply_bounds(self, ds: xr.Dataset, bounds: Dict[str, float]) -> xr.Dataset:
        """Apply geographic bounds"""
        if "lat" in ds.coords:
            ds = ds.sel(
                lat=slice(bounds["south"], bounds["north"]),
                lon=slice(bounds["west"], bounds["east"])
            )
        return ds
    
    def _create_mock_gfs(
        self,
        time: datetime,
        variables: List[str],
        bounds: Optional[Dict[str, float]] = None
    ) -> xr.Dataset:
        """Create mock GFS data for development"""
        lat = np.linspace(-90, 90, 721)
        lon = np.linspace(0, 360, 1440)
        
        if bounds:
            lat_mask = (lat >= bounds["south"]) & (lat <= bounds["north"])
            lon_mask = (lon >= bounds["west"]) & (lon <= bounds["east"])
            lat = lat[lat_mask]
            lon = lon[lon_mask]
        
        data_vars = {}
        for var in variables:
            data_vars[var] = (["lat", "lon"], np.random.randn(len(lat), len(lon)).astype(np.float32))
        
        return xr.Dataset(
            data_vars,
            coords={"lat": lat, "lon": lon, "time": [time]}
        )
    
    def get_available_times(self) -> List[datetime]:
        """GFS updates every 6 hours"""
        now = datetime.utcnow()
        latest = now.replace(hour=(now.hour // 6) * 6, minute=0, second=0, microsecond=0)
        return [latest - timedelta(hours=i * 6) for i in range(0, 40)]  # Last 10 days
    
    def get_supported_variables(self) -> List[str]:
        return ["t2m", "u10", "v10", "sp", "msl", "tp", "tcwv", "z500", "t850"]


class HRRRSource(BaseDataSource):
    """
    HRRR (High-Resolution Rapid Refresh) data
    
    3km resolution over CONUS.
    Updated hourly.
    """
    
    def __init__(self):
        super().__init__(DataSourceType.HRRR)
        self.bucket = "s3://noaa-hrrr-bdp-pds"
    
    async def fetch(
        self,
        time: datetime,
        variables: List[str],
        bounds: Optional[Dict[str, float]] = None
    ) -> xr.Dataset:
        """Fetch HRRR data"""
        cache_key = self._get_cache_key(time, variables)
        
        cached = await self._load_from_cache(cache_key)
        if cached is not None:
            return cached
        
        logger.info("fetching_hrrr", time=time.isoformat(), variables=variables)
        
        try:
            from earth2studio.data import HRRR
            
            data_source = HRRR()
            ds = await asyncio.to_thread(
                data_source,
                time=[time],
                variable=variables
            )
            
            await self._save_to_cache(ds, cache_key)
            return ds
            
        except ImportError:
            logger.warning("earth2studio_not_available", fallback="mock_data")
            return self._create_mock_hrrr(time, variables)
    
    def _create_mock_hrrr(self, time: datetime, variables: List[str]) -> xr.Dataset:
        """Create mock HRRR data"""
        # HRRR covers CONUS at 3km
        lat = np.linspace(21.0, 53.0, 1059)
        lon = np.linspace(-135.0, -60.0, 1799)
        
        data_vars = {}
        for var in variables:
            data_vars[var] = (["lat", "lon"], np.random.randn(len(lat), len(lon)).astype(np.float32))
        
        return xr.Dataset(
            data_vars,
            coords={"lat": lat, "lon": lon, "time": [time]}
        )
    
    def get_available_times(self) -> List[datetime]:
        """HRRR updates hourly"""
        now = datetime.utcnow()
        latest = now.replace(minute=0, second=0, microsecond=0)
        return [latest - timedelta(hours=i) for i in range(0, 48)]
    
    def get_supported_variables(self) -> List[str]:
        return ["t2m", "u10", "v10", "sp", "tp", "refc"]  # refc = composite reflectivity


class DataFederationMesh:
    """
    Central data federation service
    
    Aggregates multiple data sources and provides unified access.
    """
    
    def __init__(self):
        self.sources: Dict[DataSourceType, BaseDataSource] = {
            DataSourceType.ERA5_ARCO: ERA5ArcoSource(),
            DataSourceType.GFS: GFSSource(),
            DataSourceType.HRRR: HRRRSource(),
        }
    
    async def fetch(
        self,
        source: DataSourceType,
        time: datetime,
        variables: List[str],
        bounds: Optional[Dict[str, float]] = None
    ) -> xr.Dataset:
        """Fetch data from specified source"""
        if source not in self.sources:
            raise ValueError(f"Unknown data source: {source}")
        
        return await self.sources[source].fetch(time, variables, bounds)
    
    async def fetch_best_available(
        self,
        time: datetime,
        variables: List[str],
        bounds: Optional[Dict[str, float]] = None,
        prefer_realtime: bool = True
    ) -> xr.Dataset:
        """
        Fetch from best available source
        
        Priority:
        1. GFS for real-time (if prefer_realtime)
        2. HRRR for CONUS high-resolution
        3. ERA5 for historical/reanalysis
        """
        now = datetime.utcnow()
        age = now - time
        
        # Use GFS for recent times (real-time)
        if age < timedelta(hours=6) and prefer_realtime:
            try:
                return await self.fetch(DataSourceType.GFS, time, variables, bounds)
            except Exception as e:
                logger.warning("gfs_fetch_failed", error=str(e))
        
        # Check if HRRR covers the region (CONUS only)
        if bounds and self._is_conus(bounds):
            try:
                return await self.fetch(DataSourceType.HRRR, time, variables, bounds)
            except Exception as e:
                logger.warning("hrrr_fetch_failed", error=str(e))
        
        # Fall back to ERA5
        return await self.fetch(DataSourceType.ERA5_ARCO, time, variables, bounds)
    
    def _is_conus(self, bounds: Dict[str, float]) -> bool:
        """Check if bounds are within CONUS"""
        return (
            bounds.get("south", 0) >= 21.0 and
            bounds.get("north", 0) <= 53.0 and
            bounds.get("west", 0) >= -135.0 and
            bounds.get("east", 0) <= -60.0
        )
    
    def get_available_sources(self) -> List[Dict[str, Any]]:
        """Get information about available data sources"""
        return [
            {
                "source": source_type.value,
                "variables": source.get_supported_variables(),
                "available_times": len(source.get_available_times()),
            }
            for source_type, source in self.sources.items()
        ]


# Global instance
data_mesh = DataFederationMesh()
