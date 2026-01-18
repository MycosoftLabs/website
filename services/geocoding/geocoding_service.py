"""
MINDEX Geocoding Pipeline Service
Enriches observations lacking GPS coordinates with location data from various sources.

This service:
1. Monitors MINDEX for observations without GPS coordinates
2. Uses multiple geocoding providers (Nominatim, Photon) for redundancy
3. Caches results in Redis for fast lookups
4. Stores enriched data back to MINDEX

Author: Mycosoft
Version: 1.0.0
"""

import asyncio
import hashlib
import json
import logging
import os
import sqlite3
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
from typing import Optional, Dict, List, Any
from pathlib import Path

import aiohttp
from tenacity import retry, stop_after_attempt, wait_exponential

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@dataclass
class GeoLocation:
    """Represents a geocoded location."""
    latitude: float
    longitude: float
    formatted_address: str
    country: Optional[str] = None
    country_code: Optional[str] = None
    state: Optional[str] = None
    city: Optional[str] = None
    postal_code: Optional[str] = None
    confidence: float = 0.0
    source: str = "unknown"
    timestamp: Optional[str] = None


class GeocodingCache:
    """SQLite-based local cache for geocoding results."""
    
    def __init__(self, db_path: str = "./data/geocoding_cache.db"):
        self.db_path = db_path
        Path(db_path).parent.mkdir(parents=True, exist_ok=True)
        self._init_db()
    
    def _init_db(self):
        """Initialize the SQLite database."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS geocoding_cache (
                query_hash TEXT PRIMARY KEY,
                query_text TEXT NOT NULL,
                latitude REAL,
                longitude REAL,
                formatted_address TEXT,
                country TEXT,
                country_code TEXT,
                state TEXT,
                city TEXT,
                postal_code TEXT,
                confidence REAL,
                source TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP
            )
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_expires_at ON geocoding_cache(expires_at)
        """)
        conn.commit()
        conn.close()
        logger.info(f"Geocoding cache initialized at {self.db_path}")
    
    def _hash_query(self, query: str) -> str:
        """Generate a hash for a query string."""
        return hashlib.sha256(query.lower().strip().encode()).hexdigest()
    
    def get(self, query: str) -> Optional[GeoLocation]:
        """Retrieve a cached geocoding result."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        query_hash = self._hash_query(query)
        
        cursor.execute("""
            SELECT latitude, longitude, formatted_address, country, country_code,
                   state, city, postal_code, confidence, source, created_at
            FROM geocoding_cache
            WHERE query_hash = ? AND (expires_at IS NULL OR expires_at > datetime('now'))
        """, (query_hash,))
        
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return GeoLocation(
                latitude=row[0],
                longitude=row[1],
                formatted_address=row[2],
                country=row[3],
                country_code=row[4],
                state=row[5],
                city=row[6],
                postal_code=row[7],
                confidence=row[8],
                source=row[9],
                timestamp=row[10]
            )
        return None
    
    def set(self, query: str, location: GeoLocation, ttl_days: int = 30):
        """Store a geocoding result in the cache."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        query_hash = self._hash_query(query)
        expires_at = datetime.now() + timedelta(days=ttl_days)
        
        cursor.execute("""
            INSERT OR REPLACE INTO geocoding_cache
            (query_hash, query_text, latitude, longitude, formatted_address,
             country, country_code, state, city, postal_code, confidence, source, expires_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            query_hash, query, location.latitude, location.longitude,
            location.formatted_address, location.country, location.country_code,
            location.state, location.city, location.postal_code,
            location.confidence, location.source, expires_at
        ))
        conn.commit()
        conn.close()
    
    def cleanup_expired(self):
        """Remove expired cache entries."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("DELETE FROM geocoding_cache WHERE expires_at < datetime('now')")
        deleted = cursor.rowcount
        conn.commit()
        conn.close()
        logger.info(f"Cleaned up {deleted} expired geocoding cache entries")
        return deleted


class GeocodingProvider:
    """Base class for geocoding providers."""
    
    def __init__(self, session: aiohttp.ClientSession):
        self.session = session
        self.name = "base"
    
    async def geocode(self, query: str) -> Optional[GeoLocation]:
        raise NotImplementedError


class NominatimProvider(GeocodingProvider):
    """OpenStreetMap Nominatim geocoding provider (free, no API key required)."""
    
    def __init__(self, session: aiohttp.ClientSession):
        super().__init__(session)
        self.name = "nominatim"
        self.base_url = "https://nominatim.openstreetmap.org/search"
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=10))
    async def geocode(self, query: str) -> Optional[GeoLocation]:
        """Geocode an address using Nominatim."""
        params = {
            "q": query,
            "format": "json",
            "addressdetails": 1,
            "limit": 1
        }
        headers = {
            "User-Agent": "Mycosoft-MINDEX-Geocoder/1.0 (contact@mycosoft.io)"
        }
        
        try:
            async with self.session.get(self.base_url, params=params, headers=headers) as resp:
                if resp.status != 200:
                    logger.warning(f"Nominatim returned status {resp.status}")
                    return None
                
                data = await resp.json()
                if not data:
                    return None
                
                result = data[0]
                address = result.get("address", {})
                
                return GeoLocation(
                    latitude=float(result["lat"]),
                    longitude=float(result["lon"]),
                    formatted_address=result.get("display_name", ""),
                    country=address.get("country"),
                    country_code=address.get("country_code", "").upper(),
                    state=address.get("state"),
                    city=address.get("city") or address.get("town") or address.get("village"),
                    postal_code=address.get("postcode"),
                    confidence=float(result.get("importance", 0)),
                    source=self.name
                )
        except Exception as e:
            logger.error(f"Nominatim geocoding error: {e}")
            return None


class PhotonProvider(GeocodingProvider):
    """Photon geocoding provider (free, powered by OpenStreetMap)."""
    
    def __init__(self, session: aiohttp.ClientSession):
        super().__init__(session)
        self.name = "photon"
        self.base_url = "https://photon.komoot.io/api"
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=10))
    async def geocode(self, query: str) -> Optional[GeoLocation]:
        """Geocode an address using Photon."""
        params = {"q": query, "limit": 1}
        
        try:
            async with self.session.get(self.base_url, params=params) as resp:
                if resp.status != 200:
                    return None
                
                data = await resp.json()
                features = data.get("features", [])
                if not features:
                    return None
                
                feature = features[0]
                props = feature.get("properties", {})
                coords = feature.get("geometry", {}).get("coordinates", [0, 0])
                
                return GeoLocation(
                    latitude=coords[1],
                    longitude=coords[0],
                    formatted_address=props.get("name", ""),
                    country=props.get("country"),
                    country_code=props.get("countrycode", "").upper(),
                    state=props.get("state"),
                    city=props.get("city"),
                    postal_code=props.get("postcode"),
                    confidence=0.8,
                    source=self.name
                )
        except Exception as e:
            logger.error(f"Photon geocoding error: {e}")
            return None


class RedisCache:
    """Redis-based cache for fast entity position access."""
    
    def __init__(self, redis_url: str = "redis://localhost:6379"):
        self.redis_url = redis_url
        self.client = None
    
    async def connect(self):
        """Connect to Redis."""
        try:
            import redis.asyncio as redis
            self.client = redis.from_url(self.redis_url)
            await self.client.ping()
            logger.info("Connected to Redis")
            return True
        except Exception as e:
            logger.warning(f"Redis not available: {e}")
            return False
    
    async def close(self):
        """Close Redis connection."""
        if self.client:
            await self.client.close()
    
    async def get(self, key: str) -> Optional[dict]:
        """Get value from Redis."""
        if not self.client:
            return None
        try:
            data = await self.client.get(key)
            if data:
                return json.loads(data)
        except Exception as e:
            logger.debug(f"Redis get error: {e}")
        return None
    
    async def set(self, key: str, value: dict, ttl: int = 86400):
        """Set value in Redis with TTL."""
        if not self.client:
            return False
        try:
            await self.client.setex(key, ttl, json.dumps(value))
            return True
        except Exception as e:
            logger.debug(f"Redis set error: {e}")
            return False
    
    async def set_entity_position(self, entity_type: str, entity_id: str, lat: float, lon: float, metadata: dict = None):
        """Store entity position for fast access."""
        key = f"pos:{entity_type}:{entity_id}"
        value = {
            "lat": lat,
            "lon": lon,
            "updated": datetime.now().isoformat(),
            **(metadata or {})
        }
        await self.set(key, value, ttl=300)  # 5 min TTL for positions
    
    async def get_entity_position(self, entity_type: str, entity_id: str) -> Optional[dict]:
        """Get entity position."""
        key = f"pos:{entity_type}:{entity_id}"
        return await self.get(key)
    
    async def get_entities_in_bounds(self, entity_type: str, bounds: dict) -> List[dict]:
        """Get all entities within geographic bounds (requires Redis GEO)."""
        # This would use Redis GEO commands for production
        # For now, return empty list as placeholder
        return []


class GeocodingPipeline:
    """
    Main geocoding pipeline that processes MINDEX observations.
    Uses multiple providers with fallback and caching.
    """
    
    def __init__(
        self,
        redis_url: str = "redis://localhost:6379",
        mindex_api_url: str = "http://localhost:8001",
        cache_path: str = "./data/geocoding_cache.db"
    ):
        self.redis_url = redis_url
        self.mindex_api_url = mindex_api_url
        self.local_cache = GeocodingCache(cache_path)
        self.redis_cache = RedisCache(redis_url)
        self.session: Optional[aiohttp.ClientSession] = None
        self.providers: List[GeocodingProvider] = []
        self.stats = {
            "processed": 0,
            "geocoded": 0,
            "cached_hits": 0,
            "errors": 0
        }
    
    async def start(self):
        """Initialize the pipeline."""
        self.session = aiohttp.ClientSession()
        await self.redis_cache.connect()
        
        # Initialize geocoding providers
        self.providers = [
            NominatimProvider(self.session),
            PhotonProvider(self.session),
        ]
        
        logger.info(f"Geocoding pipeline started with {len(self.providers)} providers")
    
    async def stop(self):
        """Cleanup resources."""
        if self.session:
            await self.session.close()
        await self.redis_cache.close()
        logger.info(f"Geocoding pipeline stopped. Stats: {self.stats}")
    
    async def geocode(self, query: str) -> Optional[GeoLocation]:
        """
        Geocode a query string using caching and multiple providers.
        """
        if not query or len(query.strip()) < 3:
            return None
        
        query = query.strip()
        cache_key = f"geocode:{hashlib.sha256(query.encode()).hexdigest()}"
        
        # Check Redis cache
        cached = await self.redis_cache.get(cache_key)
        if cached:
            self.stats["cached_hits"] += 1
            return GeoLocation(**cached)
        
        # Check local cache
        cached = self.local_cache.get(query)
        if cached:
            self.stats["cached_hits"] += 1
            await self.redis_cache.set(cache_key, asdict(cached))
            return cached
        
        # Try each provider
        for provider in self.providers:
            try:
                result = await provider.geocode(query)
                if result:
                    # Cache the result
                    self.local_cache.set(query, result)
                    await self.redis_cache.set(cache_key, asdict(result))
                    self.stats["geocoded"] += 1
                    logger.info(f"Geocoded '{query}' via {provider.name}: {result.latitude}, {result.longitude}")
                    return result
            except Exception as e:
                logger.warning(f"Provider {provider.name} failed for '{query}': {e}")
                continue
            
            await asyncio.sleep(1)  # Rate limiting
        
        self.stats["errors"] += 1
        return None
    
    async def fetch_observations_without_gps(self) -> List[Dict[str, Any]]:
        """Fetch MINDEX observations that lack GPS coordinates."""
        try:
            async with self.session.get(
                f"{self.mindex_api_url}/api/v1/observations",
                params={"has_gps": "false", "limit": 100}
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    return data.get("observations", [])
        except Exception as e:
            logger.error(f"Failed to fetch observations: {e}")
        return []
    
    async def update_observation_gps(self, observation_id: str, location: GeoLocation) -> bool:
        """Update an observation with geocoded GPS coordinates."""
        try:
            async with self.session.patch(
                f"{self.mindex_api_url}/api/v1/observations/{observation_id}",
                json={
                    "latitude": location.latitude,
                    "longitude": location.longitude,
                    "location_source": f"geocoded:{location.source}",
                    "formatted_address": location.formatted_address,
                    "country": location.country,
                    "country_code": location.country_code,
                    "state": location.state,
                    "city": location.city
                }
            ) as resp:
                if resp.status in (200, 204):
                    # Publish to Redis for real-time CREP updates
                    await self.publish_geocoded_observation(observation_id, location)
                    return True
                return False
        except Exception as e:
            logger.error(f"Failed to update observation {observation_id}: {e}")
        return False
    
    async def publish_geocoded_observation(self, observation_id: str, location: GeoLocation):
        """Publish newly geocoded observation to Redis for real-time CREP updates."""
        if not self.redis_cache.client:
            return
        
        try:
            message = {
                "type": "observation_geocoded",
                "observation_id": observation_id,
                "latitude": location.latitude,
                "longitude": location.longitude,
                "formatted_address": location.formatted_address,
                "source": location.source,
                "timestamp": datetime.now().isoformat()
            }
            await self.redis_cache.client.publish("crep:fungal:updates", json.dumps(message))
            logger.debug(f"Published geocoded observation {observation_id} to CREP")
        except Exception as e:
            logger.warning(f"Failed to publish to Redis: {e}")
    
    async def process_batch(self) -> int:
        """Process a batch of observations without GPS."""
        observations = await self.fetch_observations_without_gps()
        processed = 0
        
        for obs in observations:
            self.stats["processed"] += 1
            
            # Build query from available location fields
            location_parts = []
            if obs.get("location_name"):
                location_parts.append(obs["location_name"])
            if obs.get("region"):
                location_parts.append(obs["region"])
            if obs.get("country"):
                location_parts.append(obs["country"])
            
            if not location_parts:
                continue
            
            query = ", ".join(location_parts)
            location = await self.geocode(query)
            
            if location:
                success = await self.update_observation_gps(obs["id"], location)
                if success:
                    processed += 1
            
            await asyncio.sleep(1.5)  # Rate limiting
        
        return processed
    
    async def run_continuous(self, interval_seconds: int = 300):
        """Run the pipeline continuously."""
        logger.info(f"Starting continuous geocoding pipeline (interval: {interval_seconds}s)")
        
        await self.start()
        
        try:
            while True:
                processed = await self.process_batch()
                logger.info(f"Batch complete: {processed} observations geocoded. Stats: {self.stats}")
                self.local_cache.cleanup_expired()
                await asyncio.sleep(interval_seconds)
        except asyncio.CancelledError:
            logger.info("Geocoding pipeline cancelled")
        finally:
            await self.stop()


async def main():
    """Main entry point."""
    pipeline = GeocodingPipeline(
        redis_url=os.getenv("REDIS_URL", "redis://localhost:6379"),
        mindex_api_url=os.getenv("MINDEX_API_URL", "http://localhost:8001"),
        cache_path=os.getenv("GEOCODING_CACHE_PATH", "./data/geocoding_cache.db")
    )
    
    await pipeline.run_continuous(
        interval_seconds=int(os.getenv("GEOCODING_INTERVAL", "300"))
    )


if __name__ == "__main__":
    asyncio.run(main())
