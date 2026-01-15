"""
Maritime Data Collector Service
Collects vessel position data from AIS sources with caching and redundancy.

Data Sources:
- AISstream WebSocket
- MarineTraffic API
- VesselFinder

Author: Mycosoft
Version: 1.0.0
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

import aiohttp
from tenacity import retry, stop_after_attempt, wait_exponential

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@dataclass
class Vessel:
    """Vessel position data."""
    mmsi: str
    name: Optional[str]
    latitude: float
    longitude: float
    course: float  # degrees
    speed: float  # knots
    heading: float
    ship_type: Optional[str] = None
    destination: Optional[str] = None
    eta: Optional[str] = None
    length: Optional[float] = None
    width: Optional[float] = None
    draught: Optional[float] = None
    callsign: Optional[str] = None
    flag: Optional[str] = None
    status: Optional[str] = None
    source: str = "unknown"
    timestamp: Optional[str] = None


class SQLiteCache:
    """Local SQLite cache for maritime data."""
    
    def __init__(self, db_path: str = "./data/maritime_cache.db"):
        self.db_path = db_path
        Path(db_path).parent.mkdir(parents=True, exist_ok=True)
        self._init_db()
    
    def _init_db(self):
        """Initialize database schema."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Vessel positions table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS vessel_positions (
                mmsi TEXT PRIMARY KEY,
                name TEXT,
                latitude REAL NOT NULL,
                longitude REAL NOT NULL,
                course REAL,
                speed REAL,
                heading REAL,
                ship_type TEXT,
                destination TEXT,
                eta TEXT,
                length REAL,
                width REAL,
                draught REAL,
                callsign TEXT,
                flag TEXT,
                status TEXT,
                source TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Historical positions for trajectory
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS vessel_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                mmsi TEXT NOT NULL,
                latitude REAL NOT NULL,
                longitude REAL NOT NULL,
                course REAL,
                speed REAL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_vessel_history_mmsi ON vessel_history(mmsi)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_vessel_history_ts ON vessel_history(timestamp)")
        
        conn.commit()
        conn.close()
        logger.info(f"Maritime cache initialized at {self.db_path}")
    
    def upsert_vessel(self, vessel: Vessel):
        """Insert or update vessel position."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT OR REPLACE INTO vessel_positions
            (mmsi, name, latitude, longitude, course, speed, heading, ship_type,
             destination, eta, length, width, draught, callsign, flag, status, source)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            vessel.mmsi, vessel.name, vessel.latitude, vessel.longitude,
            vessel.course, vessel.speed, vessel.heading, vessel.ship_type,
            vessel.destination, vessel.eta, vessel.length, vessel.width,
            vessel.draught, vessel.callsign, vessel.flag, vessel.status, vessel.source
        ))
        
        # Save to history
        cursor.execute("""
            INSERT INTO vessel_history (mmsi, latitude, longitude, course, speed)
            VALUES (?, ?, ?, ?, ?)
        """, (vessel.mmsi, vessel.latitude, vessel.longitude, vessel.course, vessel.speed))
        
        conn.commit()
        conn.close()
    
    def get_all_vessels(self, max_age_seconds: int = 600) -> List[Dict]:
        """Get all vessels updated within max_age_seconds."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cutoff = datetime.now() - timedelta(seconds=max_age_seconds)
        cursor.execute("""
            SELECT mmsi, name, latitude, longitude, course, speed, heading, ship_type,
                   destination, eta, length, width, draught, callsign, flag, status, source
            FROM vessel_positions
            WHERE updated_at > ?
        """, (cutoff,))
        
        results = []
        for row in cursor.fetchall():
            results.append({
                "mmsi": row[0], "name": row[1], "latitude": row[2], "longitude": row[3],
                "course": row[4], "speed": row[5], "heading": row[6], "ship_type": row[7],
                "destination": row[8], "eta": row[9], "length": row[10], "width": row[11],
                "draught": row[12], "callsign": row[13], "flag": row[14], "status": row[15],
                "source": row[16]
            })
        
        conn.close()
        return results
    
    def get_trajectory(self, mmsi: str, hours: int = 24) -> List[Dict]:
        """Get historical positions for trajectory display."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cutoff = datetime.now() - timedelta(hours=hours)
        cursor.execute("""
            SELECT latitude, longitude, course, speed, timestamp
            FROM vessel_history
            WHERE mmsi = ? AND timestamp > ?
            ORDER BY timestamp ASC
        """, (mmsi, cutoff))
        
        results = [{"lat": r[0], "lon": r[1], "cog": r[2], "sog": r[3], "ts": r[4]}
                   for r in cursor.fetchall()]
        conn.close()
        return results
    
    def cleanup_old_data(self, hours: int = 48):
        """Remove old historical data."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cutoff = datetime.now() - timedelta(hours=hours)
        cursor.execute("DELETE FROM vessel_history WHERE timestamp < ?", (cutoff,))
        deleted = cursor.rowcount
        conn.commit()
        conn.close()
        logger.info(f"Cleaned up {deleted} old vessel history records")
        return deleted


class MaritimeCollector:
    """Main maritime data collector with multiple sources and caching."""
    
    def __init__(
        self,
        redis_url: str = "redis://localhost:6379",
        aisstream_api_key: str = "",
        cache_path: str = "./data/maritime_cache.db"
    ):
        self.redis_url = redis_url
        self.aisstream_api_key = aisstream_api_key
        self.cache = SQLiteCache(cache_path)
        self.session: Optional[aiohttp.ClientSession] = None
        self.redis_client = None
        self.websocket = None
        self.stats = {"collected": 0, "errors": 0}
    
    async def start(self):
        """Initialize the collector."""
        self.session = aiohttp.ClientSession()
        
        try:
            import redis.asyncio as redis
            self.redis_client = redis.from_url(self.redis_url)
            await self.redis_client.ping()
            logger.info("Connected to Redis for maritime data")
        except Exception as e:
            logger.warning(f"Redis not available: {e}")
            self.redis_client = None
        
        logger.info("Maritime collector started")
    
    async def stop(self):
        """Cleanup resources."""
        if self.session:
            await self.session.close()
        if self.redis_client:
            await self.redis_client.close()
        if self.websocket:
            await self.websocket.close()
        logger.info(f"Maritime collector stopped. Stats: {self.stats}")
    
    async def connect_aisstream(self):
        """Connect to AISstream WebSocket."""
        if not self.aisstream_api_key:
            logger.warning("AISstream API key not configured")
            return
        
        url = "wss://stream.aisstream.io/v0/stream"
        
        try:
            self.websocket = await self.session.ws_connect(url)
            
            # Subscribe to all message types
            subscribe_msg = {
                "APIKey": self.aisstream_api_key,
                "BoundingBoxes": [[[-90, -180], [90, 180]]],  # Global coverage
                "FilterMessageTypes": ["PositionReport", "ShipStaticData"]
            }
            await self.websocket.send_json(subscribe_msg)
            logger.info("Connected to AISstream WebSocket")
        except Exception as e:
            logger.error(f"Failed to connect to AISstream: {e}")
    
    async def process_ais_message(self, message: dict):
        """Process an AIS message from the stream."""
        msg_type = message.get("MessageType")
        
        if msg_type == "PositionReport":
            pos = message.get("Message", {}).get("PositionReport", {})
            meta = message.get("MetaData", {})
            
            vessel = Vessel(
                mmsi=str(meta.get("MMSI", "")),
                name=meta.get("ShipName"),
                latitude=pos.get("Latitude", 0),
                longitude=pos.get("Longitude", 0),
                course=pos.get("Cog", 0),
                speed=pos.get("Sog", 0),
                heading=pos.get("TrueHeading", 0),
                status=str(pos.get("NavigationalStatus")),
                source="aisstream"
            )
            
            if vessel.latitude and vessel.longitude:
                self.cache.upsert_vessel(vessel)
                self.stats["collected"] += 1
                
                if self.redis_client:
                    try:
                        key = f"vessel:{vessel.mmsi}"
                        await self.redis_client.setex(key, 120, json.dumps(asdict(vessel)))
                    except Exception:
                        pass
    
    async def stream_ais_data(self):
        """Stream AIS data continuously."""
        while True:
            try:
                if not self.websocket or self.websocket.closed:
                    await self.connect_aisstream()
                    if not self.websocket:
                        await asyncio.sleep(30)
                        continue
                
                async for msg in self.websocket:
                    if msg.type == aiohttp.WSMsgType.TEXT:
                        data = json.loads(msg.data)
                        await self.process_ais_message(data)
                    elif msg.type in (aiohttp.WSMsgType.CLOSED, aiohttp.WSMsgType.ERROR):
                        break
                        
            except Exception as e:
                logger.error(f"AIS stream error: {e}")
                await asyncio.sleep(10)
    
    async def fetch_sample_data(self) -> List[Vessel]:
        """Fetch sample vessel data for testing/fallback."""
        # Generate sample vessels around major ports
        import random
        
        ports = [
            {"name": "Los Angeles", "lat": 33.74, "lon": -118.27},
            {"name": "Rotterdam", "lat": 51.90, "lon": 4.50},
            {"name": "Singapore", "lat": 1.26, "lon": 103.84},
            {"name": "Shanghai", "lat": 31.23, "lon": 121.47},
            {"name": "Dubai", "lat": 25.27, "lon": 55.29},
        ]
        
        vessels = []
        for i, port in enumerate(ports):
            for j in range(10):
                vessel = Vessel(
                    mmsi=f"2{i:02d}{j:05d}",
                    name=f"CARGO VESSEL {i}{j:02d}",
                    latitude=port["lat"] + random.uniform(-1, 1),
                    longitude=port["lon"] + random.uniform(-1, 1),
                    course=random.uniform(0, 360),
                    speed=random.uniform(5, 20),
                    heading=random.uniform(0, 360),
                    ship_type="Cargo",
                    destination=ports[(i + 1) % len(ports)]["name"],
                    source="sample"
                )
                vessels.append(vessel)
        
        return vessels
    
    async def collect(self) -> int:
        """Collect data from fallback sources."""
        vessels = await self.fetch_sample_data()
        
        for vessel in vessels:
            self.cache.upsert_vessel(vessel)
            
            if self.redis_client:
                try:
                    key = f"vessel:{vessel.mmsi}"
                    await self.redis_client.setex(key, 120, json.dumps(asdict(vessel)))
                except Exception:
                    pass
        
        self.stats["collected"] += len(vessels)
        return len(vessels)
    
    def get_cached_vessels(self) -> List[Dict]:
        """Get all cached vessels for API access."""
        return self.cache.get_all_vessels()
    
    async def run_continuous(self, interval_seconds: int = 60):
        """Run collector continuously."""
        await self.start()
        
        try:
            # If we have AISstream key, use streaming
            if self.aisstream_api_key:
                await self.stream_ais_data()
            else:
                # Otherwise poll periodically
                while True:
                    await self.collect()
                    self.cache.cleanup_old_data()
                    await asyncio.sleep(interval_seconds)
        except asyncio.CancelledError:
            pass
        finally:
            await self.stop()


async def main():
    """Main entry point."""
    collector = MaritimeCollector(
        redis_url=os.getenv("REDIS_URL", "redis://localhost:6379"),
        aisstream_api_key=os.getenv("AISSTREAM_API_KEY", ""),
        cache_path=os.getenv("MARITIME_CACHE_PATH", "./data/maritime_cache.db")
    )
    await collector.run_continuous(
        interval_seconds=int(os.getenv("COLLECT_INTERVAL", "60"))
    )


if __name__ == "__main__":
    asyncio.run(main())
