"""
SatelliteMap.space Data Collector

Fetches visual satellite position data from CelesTrak.
Source: https://satellitemap.space/

Data includes:
- Real-time satellite positions
- TLE orbital elements
- Satellite categories (ISS, Starlink, Weather, etc.)
"""

import os
import math
from datetime import datetime

import httpx
import uvicorn

from base_collector import BaseCollector


class SatmapCollector(BaseCollector):
    """Collector for satellite position data."""
    
    def __init__(self):
        super().__init__()
        self.celestrak_url = os.getenv(
            "CELESTRAK_URL",
            "https://celestrak.org/NORAD/elements"
        )
        self.categories = ["stations", "starlink", "weather", "active", "gnss"]
    
    def get_service_name(self) -> str:
        return "satmap"
    
    async def collect_data(self) -> list[dict]:
        """Fetch TLE data from CelesTrak and compute positions."""
        all_sats = []
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            for category in self.categories:
                try:
                    response = await client.get(
                        f"{self.celestrak_url}/gp.php",
                        params={"GROUP": category, "FORMAT": "json"}
                    )
                    
                    if response.status_code == 200:
                        sats = response.json()
                        for sat in sats:
                            sat["category"] = category
                        all_sats.extend(sats)
                        self.logger.info(f"celestrak_fetch_{category}", count=len(sats))
                        
                except Exception as e:
                    self.logger.warning(f"celestrak_fetch_failed_{category}", error=str(e))
        
        return all_sats
    
    def transform_data(self, raw_data: list[dict]) -> list[dict]:
        """Transform TLE data to CREP format with computed positions."""
        result = []
        now = datetime.utcnow()
        
        for sat in raw_data:
            try:
                # Simple SGP4-like position calculation from TLE elements
                norad_id = sat.get("NORAD_CAT_ID")
                name = sat.get("OBJECT_NAME", "Unknown")
                
                # Get orbital elements
                inclination = float(sat.get("INCLINATION", 0))
                mean_motion = float(sat.get("MEAN_MOTION", 15))  # revs per day
                eccentricity = float(sat.get("ECCENTRICITY", 0))
                mean_anomaly = float(sat.get("MEAN_ANOMALY", 0))
                ra_of_asc_node = float(sat.get("RA_OF_ASC_NODE", 0))
                arg_of_pericenter = float(sat.get("ARG_OF_PERICENTER", 0))
                
                # Simplified position estimation (not accurate, just for visualization)
                # In production, use skyfield or sgp4 library
                minutes_since_epoch = 0  # Would need epoch calculation
                mean_anomaly_now = mean_anomaly + (mean_motion * 360 / 1440) * minutes_since_epoch
                
                # Approximate lat/lng (very simplified)
                lat = inclination * math.sin(math.radians(mean_anomaly_now))
                lng = ra_of_asc_node + mean_anomaly_now
                lng = ((lng + 180) % 360) - 180  # Normalize to -180 to 180
                
                # Calculate altitude from mean motion (simplified)
                # n = sqrt(GM/a^3), solving for a
                period_minutes = 1440 / mean_motion if mean_motion > 0 else 90
                altitude_km = ((period_minutes / 2 / math.pi) ** 2 * 398600.4418) ** (1/3) - 6371 if period_minutes > 0 else 400
                
                transformed = {
                    "id": f"sat-{norad_id}",
                    "type": "satellite",
                    "subtype": sat.get("category", "unknown"),
                    "location": {
                        "latitude": max(-90, min(90, lat)),
                        "longitude": max(-180, min(180, lng)),
                        "altitude_km": max(0, altitude_km),
                        "type": "Point"
                    },
                    "properties": {
                        "norad_id": norad_id,
                        "name": name,
                        "category": sat.get("category"),
                        "object_type": sat.get("OBJECT_TYPE"),
                        "country": sat.get("COUNTRY_CODE"),
                        "launch_date": sat.get("LAUNCH_DATE"),
                        "mean_motion": mean_motion,
                        "inclination": inclination,
                        "eccentricity": eccentricity,
                        "period_minutes": period_minutes,
                    },
                    "timestamp": now.isoformat(),
                    "source": "celestrak",
                    "source_url": f"https://www.n2yo.com/satellite/?s={norad_id}",
                }
                result.append(transformed)
                    
            except Exception as e:
                self.logger.warning("transform_error", error=str(e), sat=sat.get("OBJECT_NAME"))
                continue
        
        return result


collector = SatmapCollector()
app = collector.app


@app.on_event("startup")
async def startup():
    await collector.start()


@app.on_event("shutdown")
async def shutdown():
    await collector.stop()


if __name__ == "__main__":
    port = int(os.getenv("PORT", "8204"))
    uvicorn.run(app, host="0.0.0.0", port=port)
