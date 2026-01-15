"""
Aviation Data Collector Service
Collects aircraft position data from OpenSky Network with caching and redundancy.

Author: Mycosoft
Version: 1.0.0
Last Updated: 2026-01-15T14:30:00Z
"""

import asyncio
import json
import logging
import os
import sqlite3
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, Dict, List, Any
from dataclasses import dataclass, asdict
from contextlib import asynccontextmanager

import aiohttp
from tenacity import retry, stop_after_attempt, wait_exponential

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@dataclass
class Aircraft:
    """Aircraft position data."""
    icao24: str
    callsign: Optional[str]
    latitude: float
    longitude: float
    altitude: float
    heading: float
    velocity: float
    vertical_rate: float
    on_ground: bool
    origin: Optional[str] = None
    destination: Optional[str] = None
    aircraft_type: Optional[str] = None
    registration: Optional[str] = None
    source: str = "opensky"
    timestamp: Optional[str] = None


class SQLiteCache:
    """Local SQLite cache for aviation data with trajectory history."""
    
    def __init__(self, db_path: str = "./data/aviation_cache.db"):
        self.db_path = db_path
        Path(db_path).parent.mkdir(parents=True, exist_ok=True)
        self._init_db()
    
    def _init_db(self):
        """Initialize database schema."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS aircraft_positions (
                icao24 TEXT PRIMARY KEY,
                callsign TEXT,
                latitude REAL NOT NULL,
                longitude REAL NOT NULL,
                altitude REAL,
                heading REAL,
                velocity REAL,
                vertical_rate REAL,
                on_ground INTEGER,
                origin TEXT,
                destination TEXT,
                aircraft_type TEXT,
                registration TEXT,
                source TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS aircraft_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                icao24 TEXT NOT NULL,
                latitude REAL NOT NULL,
                longitude REAL NOT NULL,
                altitude REAL,
                heading REAL,
                velocity REAL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_history_icao24 ON aircraft_history(icao24)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_history_timestamp ON aircraft_history(timestamp)")
        
        conn.commit()
        conn.close()
        logger.info(f"Aviation cache initialized at {self.db_path}")
    
    def upsert_aircraft(self, aircraft: Aircraft):
        """Insert or update aircraft position."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT OR REPLACE INTO aircraft_positions
            (icao24, callsign, latitude, longitude, altitude, heading, velocity,
             vertical_rate, on_ground, origin, destination, aircraft_type, registration, source)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            aircraft.icao24, aircraft.callsign, aircraft.latitude, aircraft.longitude,
            aircraft.altitude, aircraft.heading, aircraft.velocity, aircraft.vertical_rate,
            1 if aircraft.on_ground else 0, aircraft.origin, aircraft.destination,
            aircraft.aircraft_type, aircraft.registration, aircraft.source
        ))
        
        cursor.execute("""
            INSERT INTO aircraft_history (icao24, latitude, longitude, altitude, heading, velocity)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (aircraft.icao24, aircraft.latitude, aircraft.longitude, 
              aircraft.altitude, aircraft.heading, aircraft.velocity))
        
        conn.commit()
        conn.close()
    
    def get_all_aircraft(self, max_age_seconds: int = 300) -> List[Dict]:
        """Get all aircraft updated within max_age_seconds."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cutoff = datetime.now() - timedelta(seconds=max_age_seconds)
        cursor.execute("""
            SELECT icao24, callsign, latitude, longitude, altitude, heading, velocity,
                   vertical_rate, on_ground, origin, destination, aircraft_type, registration, source
            FROM aircraft_positions WHERE updated_at > ?
        """, (cutoff,))
        
        results = [
            {"icao24": r[0], "callsign": r[1], "latitude": r[2], "longitude": r[3],
             "altitude": r[4], "heading": r[5], "velocity": r[6], "vertical_rate": r[7],
             "on_ground": bool(r[8]), "origin": r[9], "destination": r[10],
             "aircraft_type": r[11], "registration": r[12], "source": r[13]}
            for r in cursor.fetchall()
        ]
        conn.close()
        return results
    
    def get_trajectory(self, icao24: str, hours: int = 1) -> List[Dict]:
        """Get historical positions for trajectory display."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cutoff = datetime.now() - timedelta(hours=hours)
        cursor.execute("""
            SELECT latitude, longitude, altitude, heading, velocity, timestamp
            FROM aircraft_history WHERE icao24 = ? AND timestamp > ?
            ORDER BY timestamp ASC
        """, (icao24, cutoff))
        
        results = [{"lat": r[0], "lon": r[1], "alt": r[2], "hdg": r[3], "vel": r[4], "ts": r[5]}
                   for r in cursor.fetchall()]
        conn.close()
        return results
    
    def cleanup_old_data(self, hours: int = 24):
        """Remove old historical data."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cutoff = datetime.now() - timedelta(hours=hours)
        cursor.execute("DELETE FROM aircraft_history WHERE timestamp < ?", (cutoff,))
        deleted = cursor.rowcount
        conn.commit()
        conn.close()
        if deleted > 0:
            logger.info(f"Cleaned up {deleted} old aircraft history records")
        return deleted


class RedisClient:
    """Redis client wrapper for aviation data."""
    
    def __init__(self, redis_url: str):
        self.redis_url = redis_url
        self.client = None
    
    async def connect(self):
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
        if self.client:
            await self.client.close()
    
    async def set_aircraft(self, aircraft: Aircraft):
        if not self.client:
            return
        try:
            key = f"aircraft:{aircraft.icao24}"
            await self.client.setex(key, 60, json.dumps(asdict(aircraft)))
        except Exception as e:
            logger.debug(f"Redis set error: {e}")
    
    async def publish_event(self, event_type: str, data: dict):
        if not self.client:
            return
        try:
            event = {
                "type": event_type,
                "timestamp": datetime.utcnow().isoformat(),
                "data": data
            }
            await self.client.publish("mindex:events", json.dumps(event))
        except Exception as e:
            logger.debug(f"Redis publish error: {e}")


class AviationCollector:
    """Main aviation data collector with caching and MINDEX logging."""
    
    def __init__(
        self,
        redis_url: str = "redis://localhost:6379",
        cache_path: str = "./data/aviation_cache.db",
        mindex_url: str = "http://localhost:8001"
    ):
        self.redis_url = redis_url
        self.mindex_url = mindex_url
        self.cache = SQLiteCache(cache_path)
        self.redis = RedisClient(redis_url)
        self.session: Optional[aiohttp.ClientSession] = None
        self.stats = {"collected": 0, "errors": 0, "cached": 0}
    
    async def start(self):
        self.session = aiohttp.ClientSession()
        await self.redis.connect()
        logger.info("Aviation collector started")
    
    async def stop(self):
        if self.session:
            await self.session.close()
        await self.redis.close()
        logger.info(f"Aviation collector stopped. Stats: {self.stats}")
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def fetch_opensky(self) -> List[Aircraft]:
        """Fetch data from OpenSky Network."""
        url = "https://opensky-network.org/api/states/all"
        
        try:
            async with self.session.get(url, timeout=aiohttp.ClientTimeout(total=30)) as resp:
                if resp.status != 200:
                    logger.warning(f"OpenSky returned {resp.status}")
                    return []
                
                data = await resp.json()
                states = data.get("states", [])
                
                aircraft = []
                for state in states[:2000]:
                    if state[5] and state[6]:
                        aircraft.append(Aircraft(
                            icao24=state[0],
                            callsign=state[1].strip() if state[1] else None,
                            latitude=state[6],
                            longitude=state[5],
                            altitude=state[7] or 0,
                            heading=state[10] or 0,
                            velocity=state[9] or 0,
                            vertical_rate=state[11] or 0,
                            on_ground=state[8],
                            source="opensky",
                            timestamp=datetime.utcnow().isoformat()
                        ))
                
                return aircraft
        except Exception as e:
            logger.error(f"OpenSky fetch error: {e}")
            self.stats["errors"] += 1
            return []
    
    async def log_to_mindex(self, aircraft_count: int):
        """Log collection event to MINDEX for audit trail."""
        try:
            async with self.session.post(
                f"{self.mindex_url}/api/v1/events",
                json={
                    "event_type": "aviation_collection",
                    "collector": "aviation",
                    "count": aircraft_count,
                    "timestamp": datetime.utcnow().isoformat(),
                    "source": "opensky"
                },
                timeout=aiohttp.ClientTimeout(total=5)
            ) as resp:
                if resp.status not in (200, 201):
                    logger.debug(f"MINDEX log failed: {resp.status}")
        except Exception as e:
            logger.debug(f"MINDEX log error: {e}")
    
    async def collect(self) -> int:
        """Collect data from all sources."""
        aircraft_list = await self.fetch_opensky()
        
        for aircraft in aircraft_list:
            self.cache.upsert_aircraft(aircraft)
            await self.redis.set_aircraft(aircraft)
            self.stats["cached"] += 1
        
        if aircraft_list:
            await self.redis.publish_event("aviation_update", {"count": len(aircraft_list)})
            await self.log_to_mindex(len(aircraft_list))
        
        self.stats["collected"] += len(aircraft_list)
        logger.info(f"Collected {len(aircraft_list)} aircraft positions")
        return len(aircraft_list)
    
    def get_cached_aircraft(self) -> List[Dict]:
        """Get all cached aircraft for API access."""
        return self.cache.get_all_aircraft()
    
    async def run_continuous(self, interval_seconds: int = 30):
        """Run collector continuously."""
        await self.start()
        
        try:
            while True:
                await self.collect()
                self.cache.cleanup_old_data()
                await asyncio.sleep(interval_seconds)
        except asyncio.CancelledError:
            pass
        finally:
            await self.stop()


async def main():
    collector = AviationCollector(
        redis_url=os.getenv("REDIS_URL", "redis://localhost:6379"),
        cache_path=os.getenv("AVIATION_CACHE_PATH", "./data/aviation_cache.db"),
        mindex_url=os.getenv("MINDEX_API_URL", "http://localhost:8001")
    )
    await collector.run_continuous(
        interval_seconds=int(os.getenv("COLLECT_INTERVAL", "30"))
    )


if __name__ == "__main__":
    asyncio.run(main())
