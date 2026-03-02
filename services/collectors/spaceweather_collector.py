"""
Space Weather Data Collector Service
Collects solar and geomagnetic activity data from NOAA SWPC.

Data Sources:
- NOAA Space Weather Prediction Center (SWPC)
- DSCOVR real-time solar wind
- Planetary K-index (Kp)

Author: Mycosoft
Version: 1.0.0
"""

import asyncio
import json
import logging
import os
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, List, Any
from dataclasses import dataclass, asdict

import aiohttp
from tenacity import retry, stop_after_attempt, wait_exponential

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

SWPC_BASE = "https://services.swpc.noaa.gov"


@dataclass
class SpaceWeatherEvent:
    """Space weather data point."""
    event_type: str  # solar_wind, kp_index, xray_flux, cme, geomagnetic_storm
    value: float
    unit: str
    timestamp: str
    source: str = "noaa_swpc"
    severity: str = "normal"  # normal, moderate, strong, severe, extreme
    details: Optional[str] = None


class SQLiteCache:
    """Local SQLite cache for space weather data."""

    def __init__(self, db_path: str = "./data/spaceweather_cache.db"):
        self.db_path = db_path
        Path(db_path).parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def _init_db(self):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS space_weather (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    event_type TEXT NOT NULL,
                    value REAL,
                    unit TEXT,
                    severity TEXT DEFAULT 'normal',
                    details TEXT,
                    source TEXT DEFAULT 'noaa_swpc',
                    timestamp TEXT NOT NULL,
                    collected_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
            """)
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_sw_type_time
                ON space_weather(event_type, timestamp)
            """)

    def store(self, event: SpaceWeatherEvent):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                "INSERT INTO space_weather (event_type, value, unit, severity, details, source, timestamp) "
                "VALUES (?, ?, ?, ?, ?, ?, ?)",
                (event.event_type, event.value, event.unit, event.severity,
                 event.details, event.source, event.timestamp)
            )

    def get_latest(self, event_type: str, limit: int = 100) -> List[Dict]:
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            rows = conn.execute(
                "SELECT * FROM space_weather WHERE event_type = ? ORDER BY timestamp DESC LIMIT ?",
                (event_type, limit)
            ).fetchall()
            return [dict(r) for r in rows]

    def get_all_recent(self, hours: int = 24) -> List[Dict]:
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            rows = conn.execute(
                "SELECT * FROM space_weather WHERE collected_at >= datetime('now', ?) ORDER BY timestamp DESC",
                (f'-{hours} hours',)
            ).fetchall()
            return [dict(r) for r in rows]


class SpaceWeatherCollector:
    """Collects space weather data from NOAA SWPC."""

    def __init__(self, redis_url: str = "redis://localhost:6379",
                 cache_path: str = "./data/spaceweather_cache.db"):
        self.redis_url = redis_url
        self.cache = SQLiteCache(cache_path)
        self.session: Optional[aiohttp.ClientSession] = None

    async def start(self):
        self.session = aiohttp.ClientSession()
        logger.info("Space weather collector started")

    async def stop(self):
        if self.session:
            await self.session.close()
        logger.info("Space weather collector stopped")

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=2, max=30))
    async def _fetch_json(self, url: str) -> Any:
        async with self.session.get(url, timeout=aiohttp.ClientTimeout(total=30)) as resp:
            resp.raise_for_status()
            return await resp.json()

    async def collect_kp_index(self) -> int:
        """Collect planetary K-index data."""
        count = 0
        try:
            data = await self._fetch_json(f"{SWPC_BASE}/products/noaa-planetary-k-index.json")
            for entry in data[1:]:  # skip header row
                kp = float(entry[1])
                severity = "normal"
                if kp >= 8:
                    severity = "extreme"
                elif kp >= 7:
                    severity = "severe"
                elif kp >= 5:
                    severity = "strong"
                elif kp >= 4:
                    severity = "moderate"

                event = SpaceWeatherEvent(
                    event_type="kp_index",
                    value=kp,
                    unit="Kp",
                    timestamp=entry[0],
                    severity=severity,
                )
                self.cache.store(event)
                count += 1
            logger.info(f"Collected {count} Kp index readings")
        except Exception as e:
            logger.error(f"Failed to collect Kp index: {e}")
        return count

    async def collect_solar_wind(self) -> int:
        """Collect DSCOVR solar wind data."""
        count = 0
        try:
            data = await self._fetch_json(f"{SWPC_BASE}/products/solar-wind/plasma-5-minute.json")
            for entry in data[1:]:
                speed = float(entry[1]) if entry[1] else None
                if speed is None:
                    continue
                event = SpaceWeatherEvent(
                    event_type="solar_wind",
                    value=speed,
                    unit="km/s",
                    timestamp=entry[0],
                    severity="strong" if speed > 700 else "moderate" if speed > 500 else "normal",
                    details=json.dumps({"density": entry[2], "temperature": entry[3]}),
                )
                self.cache.store(event)
                count += 1
            logger.info(f"Collected {count} solar wind readings")
        except Exception as e:
            logger.error(f"Failed to collect solar wind: {e}")
        return count

    async def collect_xray_flux(self) -> int:
        """Collect X-ray flux data (solar flare indicator)."""
        count = 0
        try:
            data = await self._fetch_json(f"{SWPC_BASE}/products/goes-primary-xray-flux-6hr.json")
            for entry in data[1:]:
                flux = float(entry[1]) if entry[1] else None
                if flux is None:
                    continue
                event = SpaceWeatherEvent(
                    event_type="xray_flux",
                    value=flux,
                    unit="W/m²",
                    timestamp=entry[0],
                )
                self.cache.store(event)
                count += 1
            logger.info(f"Collected {count} X-ray flux readings")
        except Exception as e:
            logger.error(f"Failed to collect X-ray flux: {e}")
        return count

    async def collect(self) -> int:
        """Run all collectors."""
        total = 0
        total += await self.collect_kp_index()
        total += await self.collect_solar_wind()
        total += await self.collect_xray_flux()
        logger.info(f"Total space weather events collected: {total}")
        return total

    async def run_continuous(self, interval_seconds: int = 300):
        """Run collector continuously."""
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
    collector = SpaceWeatherCollector(
        redis_url=os.getenv("REDIS_URL", "redis://localhost:6379"),
        cache_path=os.getenv("SPACEWEATHER_CACHE_PATH", "./data/spaceweather_cache.db")
    )
    await collector.run_continuous(
        interval_seconds=int(os.getenv("COLLECT_INTERVAL", "300"))
    )


if __name__ == "__main__":
    asyncio.run(main())
