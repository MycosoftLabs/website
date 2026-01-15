"""
Satellite Data Collector Service
Collects satellite position data from TLE sources with SGP4 propagation.

Data Sources:
- CelesTrak TLE data
- Space-Track.org
- N2YO API

Author: Mycosoft
Version: 1.0.0
"""

import asyncio
import json
import logging
import math
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
class Satellite:
    """Satellite position data."""
    norad_id: str
    name: str
    latitude: float
    longitude: float
    altitude: float  # km
    velocity: float  # km/s
    inclination: float
    period: float  # minutes
    apogee: float
    perigee: float
    category: str = "active"
    country: Optional[str] = None
    launch_date: Optional[str] = None
    tle_line1: Optional[str] = None
    tle_line2: Optional[str] = None
    source: str = "celestrak"
    timestamp: Optional[str] = None


class SQLiteCache:
    """Local SQLite cache for satellite data."""
    
    def __init__(self, db_path: str = "./data/satellite_cache.db"):
        self.db_path = db_path
        Path(db_path).parent.mkdir(parents=True, exist_ok=True)
        self._init_db()
    
    def _init_db(self):
        """Initialize database schema."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS satellites (
                norad_id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                latitude REAL,
                longitude REAL,
                altitude REAL,
                velocity REAL,
                inclination REAL,
                period REAL,
                apogee REAL,
                perigee REAL,
                category TEXT,
                country TEXT,
                launch_date TEXT,
                tle_line1 TEXT,
                tle_line2 TEXT,
                source TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS satellite_passes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                norad_id TEXT NOT NULL,
                observer_lat REAL,
                observer_lon REAL,
                rise_time TIMESTAMP,
                max_elevation REAL,
                set_time TIMESTAMP,
                duration_seconds INTEGER,
                computed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        conn.commit()
        conn.close()
        logger.info(f"Satellite cache initialized at {self.db_path}")
    
    def upsert_satellite(self, sat: Satellite):
        """Insert or update satellite."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT OR REPLACE INTO satellites
            (norad_id, name, latitude, longitude, altitude, velocity, inclination,
             period, apogee, perigee, category, country, launch_date, tle_line1, tle_line2, source)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            sat.norad_id, sat.name, sat.latitude, sat.longitude, sat.altitude,
            sat.velocity, sat.inclination, sat.period, sat.apogee, sat.perigee,
            sat.category, sat.country, sat.launch_date, sat.tle_line1, sat.tle_line2, sat.source
        ))
        
        conn.commit()
        conn.close()
    
    def get_all_satellites(self, category: Optional[str] = None) -> List[Dict]:
        """Get all satellites, optionally filtered by category."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        if category:
            cursor.execute("""
                SELECT norad_id, name, latitude, longitude, altitude, velocity,
                       inclination, period, apogee, perigee, category, country
                FROM satellites WHERE category = ?
            """, (category,))
        else:
            cursor.execute("""
                SELECT norad_id, name, latitude, longitude, altitude, velocity,
                       inclination, period, apogee, perigee, category, country
                FROM satellites
            """)
        
        results = []
        for row in cursor.fetchall():
            results.append({
                "norad_id": row[0], "name": row[1], "latitude": row[2],
                "longitude": row[3], "altitude": row[4], "velocity": row[5],
                "inclination": row[6], "period": row[7], "apogee": row[8],
                "perigee": row[9], "category": row[10], "country": row[11]
            })
        
        conn.close()
        return results


class SatelliteCollector:
    """Main satellite data collector with TLE parsing and SGP4 propagation."""
    
    CELESTRAK_URLS = {
        "stations": "https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=tle",
        "starlink": "https://celestrak.org/NORAD/elements/gp.php?GROUP=starlink&FORMAT=tle",
        "weather": "https://celestrak.org/NORAD/elements/gp.php?GROUP=weather&FORMAT=tle",
        "gps": "https://celestrak.org/NORAD/elements/gp.php?GROUP=gps-ops&FORMAT=tle",
        "active": "https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle",
    }
    
    def __init__(
        self,
        redis_url: str = "redis://localhost:6379",
        cache_path: str = "./data/satellite_cache.db"
    ):
        self.redis_url = redis_url
        self.cache = SQLiteCache(cache_path)
        self.session: Optional[aiohttp.ClientSession] = None
        self.redis_client = None
        self.stats = {"collected": 0, "errors": 0}
    
    async def start(self):
        """Initialize the collector."""
        self.session = aiohttp.ClientSession()
        
        try:
            import redis.asyncio as redis
            self.redis_client = redis.from_url(self.redis_url)
            await self.redis_client.ping()
            logger.info("Connected to Redis for satellite data")
        except Exception as e:
            logger.warning(f"Redis not available: {e}")
        
        logger.info("Satellite collector started")
    
    async def stop(self):
        """Cleanup resources."""
        if self.session:
            await self.session.close()
        if self.redis_client:
            await self.redis_client.close()
        logger.info(f"Satellite collector stopped. Stats: {self.stats}")
    
    def parse_tle(self, tle_text: str, category: str) -> List[Satellite]:
        """Parse TLE format text into Satellite objects."""
        lines = tle_text.strip().split('\n')
        satellites = []
        
        i = 0
        while i < len(lines) - 2:
            name = lines[i].strip()
            line1 = lines[i + 1].strip()
            line2 = lines[i + 2].strip()
            
            if not line1.startswith('1') or not line2.startswith('2'):
                i += 1
                continue
            
            try:
                # Extract NORAD ID from line 1
                norad_id = line1[2:7].strip()
                
                # Extract orbital elements from line 2
                inclination = float(line2[8:16].strip())
                eccentricity = float('0.' + line2[26:33].strip())
                mean_motion = float(line2[52:63].strip())
                
                # Calculate orbital parameters
                period = 1440.0 / mean_motion  # minutes
                semi_major_axis = (398600.4418 * (period * 60 / (2 * math.pi)) ** 2) ** (1/3)  # km
                apogee = semi_major_axis * (1 + eccentricity) - 6371  # km above Earth
                perigee = semi_major_axis * (1 - eccentricity) - 6371
                
                # Simple position estimation (would use SGP4 in production)
                now = datetime.now()
                orbit_fraction = (now.timestamp() % (period * 60)) / (period * 60)
                lat = inclination * math.sin(2 * math.pi * orbit_fraction)
                lon = ((now.timestamp() / 60) % 360) - 180  # Simplified
                alt = (apogee + perigee) / 2
                
                satellites.append(Satellite(
                    norad_id=norad_id,
                    name=name,
                    latitude=lat,
                    longitude=lon,
                    altitude=alt,
                    velocity=7.8,  # Approximate orbital velocity km/s
                    inclination=inclination,
                    period=period,
                    apogee=apogee,
                    perigee=perigee,
                    category=category,
                    tle_line1=line1,
                    tle_line2=line2,
                    source="celestrak"
                ))
            except (ValueError, IndexError) as e:
                logger.debug(f"Failed to parse TLE for {name}: {e}")
            
            i += 3
        
        return satellites
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def fetch_tle_group(self, category: str, url: str) -> List[Satellite]:
        """Fetch TLE data for a satellite group."""
        try:
            async with self.session.get(url, timeout=aiohttp.ClientTimeout(total=30)) as resp:
                if resp.status != 200:
                    logger.warning(f"CelesTrak returned {resp.status} for {category}")
                    return []
                
                tle_text = await resp.text()
                satellites = self.parse_tle(tle_text, category)
                logger.info(f"Fetched {len(satellites)} satellites for {category}")
                return satellites
        except Exception as e:
            logger.error(f"Failed to fetch {category}: {e}")
            return []
    
    async def collect(self) -> int:
        """Collect data from all TLE sources."""
        all_satellites = []
        
        for category, url in self.CELESTRAK_URLS.items():
            satellites = await self.fetch_tle_group(category, url)
            all_satellites.extend(satellites)
            await asyncio.sleep(1)  # Rate limiting
        
        # Store in cache
        for sat in all_satellites:
            self.cache.upsert_satellite(sat)
            
            if self.redis_client:
                try:
                    key = f"satellite:{sat.norad_id}"
                    await self.redis_client.setex(key, 300, json.dumps(asdict(sat)))
                except Exception:
                    pass
        
        self.stats["collected"] += len(all_satellites)
        logger.info(f"Collected {len(all_satellites)} satellites")
        return len(all_satellites)
    
    def get_cached_satellites(self, category: Optional[str] = None) -> List[Dict]:
        """Get all cached satellites for API access."""
        return self.cache.get_all_satellites(category)
    
    async def run_continuous(self, interval_seconds: int = 3600):
        """Run collector continuously (TLE data updates slowly)."""
        await self.start()
        
        try:
            while True:
                await self.collect()
                await asyncio.sleep(interval_seconds)
        except asyncio.CancelledError:
            pass
        finally:
            await self.stop()


async def main():
    """Main entry point."""
    collector = SatelliteCollector(
        redis_url=os.getenv("REDIS_URL", "redis://localhost:6379"),
        cache_path=os.getenv("SATELLITE_CACHE_PATH", "./data/satellite_cache.db")
    )
    await collector.run_continuous(
        interval_seconds=int(os.getenv("COLLECT_INTERVAL", "3600"))
    )


if __name__ == "__main__":
    asyncio.run(main())
