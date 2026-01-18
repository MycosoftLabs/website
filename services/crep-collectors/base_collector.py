"""
Base Collector Class for CREP Services

Provides common functionality:
- FastAPI health endpoints
- Redis event bus integration
- SQLite cache management
- Prometheus metrics
- MINDEX logging
- Graceful failover handling
"""

import asyncio
import os
import json
import logging
from abc import ABC, abstractmethod
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

import aiosqlite
import redis.asyncio as redis
import structlog
from fastapi import FastAPI, HTTPException
from prometheus_client import Counter, Gauge, Histogram, generate_latest, CONTENT_TYPE_LATEST
from starlette.responses import Response

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)

# Prometheus metrics
REQUESTS_TOTAL = Counter(
    'crep_collector_requests_total',
    'Total number of data collection requests',
    ['service', 'status']
)
DATA_POINTS_GAUGE = Gauge(
    'crep_collector_data_points',
    'Current number of cached data points',
    ['service']
)
COLLECTION_DURATION = Histogram(
    'crep_collector_duration_seconds',
    'Time spent collecting data',
    ['service']
)
API_ERRORS = Counter(
    'crep_collector_api_errors_total',
    'Total number of API errors',
    ['service', 'error_type']
)
CACHE_HITS = Counter(
    'crep_collector_cache_hits_total',
    'Total cache hits',
    ['service']
)
CACHE_MISSES = Counter(
    'crep_collector_cache_misses_total',
    'Total cache misses',
    ['service']
)


class BaseCollector(ABC):
    """
    Abstract base class for CREP data collectors.
    
    Subclasses must implement:
    - collect_data(): Fetch data from external API
    - transform_data(): Transform raw data to CREP format
    - get_service_name(): Return unique service name
    """
    
    def __init__(self):
        self.logger = structlog.get_logger(self.get_service_name())
        self.app = FastAPI(
            title=f"CREP {self.get_service_name()} Collector",
            version="1.0.0"
        )
        self._setup_routes()
        
        # Configuration from environment
        self.redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
        self.mindex_url = os.getenv("MINDEX_API_URL", "http://localhost:8000")
        self.cache_path = os.getenv("CACHE_PATH", f"/app/data/{self.get_service_name()}_cache.db")
        self.collect_interval = int(os.getenv("COLLECT_INTERVAL", "60"))
        
        # State
        self._redis: redis.Redis | None = None
        self._db: aiosqlite.Connection | None = None
        self._last_collection: datetime | None = None
        self._cached_data: list[dict] = []
        self._is_healthy = True
        self._api_available = True
        
    @abstractmethod
    def get_service_name(self) -> str:
        """Return unique service name for metrics and logging."""
        pass
    
    @abstractmethod
    async def collect_data(self) -> list[dict]:
        """Fetch data from external API. Returns raw data list."""
        pass
    
    @abstractmethod
    def transform_data(self, raw_data: list[dict]) -> list[dict]:
        """Transform raw data to CREP-compatible format."""
        pass
    
    def _setup_routes(self):
        """Setup FastAPI routes."""
        
        @self.app.get("/health")
        async def health():
            return {
                "status": "healthy" if self._is_healthy else "degraded",
                "service": self.get_service_name(),
                "api_available": self._api_available,
                "last_collection": self._last_collection.isoformat() if self._last_collection else None,
                "cached_items": len(self._cached_data),
                "timestamp": datetime.utcnow().isoformat()
            }
        
        @self.app.get("/data")
        async def get_data(limit: int = 1000, offset: int = 0):
            """Return cached data."""
            CACHE_HITS.labels(service=self.get_service_name()).inc()
            return {
                "service": self.get_service_name(),
                "total": len(self._cached_data),
                "items": self._cached_data[offset:offset + limit],
                "from_cache": True,
                "cache_age_seconds": (datetime.utcnow() - self._last_collection).total_seconds() if self._last_collection else None,
                "timestamp": datetime.utcnow().isoformat()
            }
        
        @self.app.get("/refresh")
        async def refresh():
            """Force data refresh."""
            try:
                await self._collect_and_cache()
                return {"status": "refreshed", "items": len(self._cached_data)}
            except Exception as e:
                raise HTTPException(status_code=500, detail=str(e))
        
        @self.app.get("/metrics")
        async def metrics():
            """Prometheus metrics endpoint."""
            return Response(
                generate_latest(),
                media_type=CONTENT_TYPE_LATEST
            )
    
    async def _init_db(self):
        """Initialize SQLite cache database."""
        Path(self.cache_path).parent.mkdir(parents=True, exist_ok=True)
        self._db = await aiosqlite.connect(self.cache_path)
        await self._db.execute("""
            CREATE TABLE IF NOT EXISTS cache (
                id TEXT PRIMARY KEY,
                data TEXT NOT NULL,
                timestamp TEXT NOT NULL
            )
        """)
        await self._db.execute("""
            CREATE TABLE IF NOT EXISTS snapshots (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                data TEXT NOT NULL,
                timestamp TEXT NOT NULL
            )
        """)
        await self._db.commit()
        self.logger.info("database_initialized", path=self.cache_path)
    
    async def _init_redis(self):
        """Initialize Redis connection."""
        try:
            self._redis = redis.from_url(self.redis_url)
            await self._redis.ping()
            self.logger.info("redis_connected", url=self.redis_url)
        except Exception as e:
            self.logger.warning("redis_connection_failed", error=str(e))
            self._redis = None
    
    async def _collect_and_cache(self):
        """Collect data and cache it."""
        service = self.get_service_name()
        
        with COLLECTION_DURATION.labels(service=service).time():
            try:
                # Try to collect from API
                raw_data = await self.collect_data()
                self._api_available = True
                REQUESTS_TOTAL.labels(service=service, status="success").inc()
                
                # Transform data
                transformed = self.transform_data(raw_data)
                
                # Update cache
                self._cached_data = transformed
                self._last_collection = datetime.utcnow()
                DATA_POINTS_GAUGE.labels(service=service).set(len(transformed))
                
                # Persist to SQLite
                await self._persist_cache(transformed)
                
                # Publish to Redis event bus
                await self._publish_to_redis(transformed)
                
                # Log to MINDEX
                await self._log_to_mindex(len(transformed))
                
                self.logger.info(
                    "collection_complete",
                    items=len(transformed),
                    duration_ms=COLLECTION_DURATION.labels(service=service)._sum.get()
                )
                
            except Exception as e:
                self._api_available = False
                API_ERRORS.labels(service=service, error_type=type(e).__name__).inc()
                REQUESTS_TOTAL.labels(service=service, status="error").inc()
                
                self.logger.error("collection_failed", error=str(e))
                
                # Fallback to cached data
                await self._load_from_cache()
    
    async def _persist_cache(self, data: list[dict]):
        """Persist data to SQLite cache."""
        if not self._db:
            return
            
        try:
            # Store individual items
            for item in data:
                item_id = item.get("id", str(hash(json.dumps(item, sort_keys=True))))
                await self._db.execute(
                    "INSERT OR REPLACE INTO cache (id, data, timestamp) VALUES (?, ?, ?)",
                    (item_id, json.dumps(item), datetime.utcnow().isoformat())
                )
            
            # Store snapshot for timeline replay
            await self._db.execute(
                "INSERT INTO snapshots (data, timestamp) VALUES (?, ?)",
                (json.dumps(data), datetime.utcnow().isoformat())
            )
            
            # Keep only last 24 hours of snapshots
            cutoff = (datetime.utcnow() - timedelta(hours=24)).isoformat()
            await self._db.execute(
                "DELETE FROM snapshots WHERE timestamp < ?",
                (cutoff,)
            )
            
            await self._db.commit()
        except Exception as e:
            self.logger.error("persist_cache_failed", error=str(e))
    
    async def _load_from_cache(self):
        """Load data from SQLite cache as fallback."""
        if not self._db:
            return
            
        try:
            cursor = await self._db.execute("SELECT data FROM cache")
            rows = await cursor.fetchall()
            self._cached_data = [json.loads(row[0]) for row in rows]
            CACHE_MISSES.labels(service=self.get_service_name()).inc()
            self.logger.info("loaded_from_cache", items=len(self._cached_data))
        except Exception as e:
            self.logger.error("load_cache_failed", error=str(e))
    
    async def _publish_to_redis(self, data: list[dict]):
        """Publish data to Redis event bus."""
        if not self._redis:
            return
            
        try:
            channel = f"crep:{self.get_service_name()}"
            await self._redis.xadd(
                channel,
                {"data": json.dumps(data), "timestamp": datetime.utcnow().isoformat()},
                maxlen=1000
            )
        except Exception as e:
            self.logger.warning("redis_publish_failed", error=str(e))
    
    async def _log_to_mindex(self, item_count: int):
        """Log collection event to MINDEX."""
        try:
            import httpx
            async with httpx.AsyncClient() as client:
                await client.post(
                    f"{self.mindex_url}/api/logs",
                    json={
                        "service": self.get_service_name(),
                        "event": "data_collection",
                        "items": item_count,
                        "timestamp": datetime.utcnow().isoformat(),
                        "api_available": self._api_available
                    },
                    timeout=5.0
                )
        except Exception:
            pass  # Non-critical, ignore errors
    
    async def _collection_loop(self):
        """Main collection loop."""
        while True:
            await self._collect_and_cache()
            await asyncio.sleep(self.collect_interval)
    
    async def start(self):
        """Start the collector service."""
        await self._init_db()
        await self._init_redis()
        
        # Load initial data from cache
        await self._load_from_cache()
        
        # Start collection loop
        asyncio.create_task(self._collection_loop())
        
        self.logger.info(
            "collector_started",
            service=self.get_service_name(),
            interval=self.collect_interval
        )
    
    async def stop(self):
        """Stop the collector service."""
        if self._db:
            await self._db.close()
        if self._redis:
            await self._redis.close()
        self.logger.info("collector_stopped")
