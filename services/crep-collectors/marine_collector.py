"""
Marine Traffic Enhanced Collector

Fetches AIS vessel data from multiple sources.
Primary: AISstream WebSocket API
Fallback: MarineTraffic API (requires key)

Data includes:
- Vessel positions (MMSI, lat/lng, speed, course)
- Vessel details (name, type, flag, destination)
- Port information
"""

import os
import json
from datetime import datetime

import httpx
import uvicorn

from base_collector import BaseCollector


class MarineCollector(BaseCollector):
    """Enhanced marine vessel data collector."""
    
    def __init__(self):
        super().__init__()
        self.aisstream_key = os.getenv("AISSTREAM_API_KEY", "")
        self.marinetraffic_key = os.getenv("MARINETRAFFIC_API_KEY", "")
    
    def get_service_name(self) -> str:
        return "marine"
    
    async def collect_data(self) -> list[dict]:
        """Fetch vessel data from AIS sources."""
        vessels = []
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Try AISstream first
            if self.aisstream_key:
                try:
                    response = await client.get(
                        "https://api.aisstream.io/v1/vessels",
                        headers={"Authorization": f"Bearer {self.aisstream_key}"},
                        params={"limit": 5000}
                    )
                    if response.status_code == 200:
                        data = response.json()
                        vessels = data.get("vessels", [])
                        self.logger.info("aisstream_fetch_success", vessels=len(vessels))
                        return vessels
                except Exception as e:
                    self.logger.warning("aisstream_fetch_failed", error=str(e))
            
            # No mock fallback. Return empty if unavailable.
            return []
    
    def transform_data(self, raw_data: list[dict]) -> list[dict]:
        """Transform vessel data to CREP format."""
        result = []
        
        for vessel in raw_data:
            try:
                mmsi = vessel.get("mmsi") or vessel.get("MMSI")
                lat = vessel.get("lat") or vessel.get("latitude") or 0
                lng = vessel.get("lng") or vessel.get("longitude") or 0
                
                transformed = {
                    "id": f"vessel-{mmsi}",
                    "type": "vessel",
                    "subtype": self._get_vessel_type(vessel.get("ship_type", 0)),
                    "location": {
                        "latitude": float(lat),
                        "longitude": float(lng),
                        "type": "Point"
                    },
                    "properties": {
                        "mmsi": mmsi,
                        "name": vessel.get("name", "Unknown"),
                        "ship_type": vessel.get("ship_type"),
                        "flag": vessel.get("flag") or vessel.get("country"),
                        "destination": vessel.get("destination"),
                        "speed_knots": vessel.get("sog") or vessel.get("speed"),
                        "course": vessel.get("cog") or vessel.get("course"),
                        "heading": vessel.get("heading"),
                        "draught": vessel.get("draught"),
                        "length": vessel.get("length"),
                        "width": vessel.get("width"),
                        "imo": vessel.get("imo"),
                        "callsign": vessel.get("callsign"),
                    },
                    "timestamp": datetime.utcnow().isoformat(),
                    "source": "marine-enhanced",
                    "source_url": f"https://www.marinetraffic.com/en/ais/details/ships/mmsi:{mmsi}",
                }
                
                if lat != 0 or lng != 0:
                    result.append(transformed)
                    
            except Exception as e:
                self.logger.warning("transform_error", error=str(e))
                continue
        
        return result
    
    def _get_vessel_type(self, ship_type: int) -> str:
        """Map AIS ship type code to category."""
        if 70 <= ship_type <= 79:
            return "cargo"
        elif 80 <= ship_type <= 89:
            return "tanker"
        elif 60 <= ship_type <= 69:
            return "passenger"
        elif 30 <= ship_type <= 39:
            return "fishing"
        elif 31 <= ship_type <= 32:
            return "tug"
        elif ship_type == 35:
            return "military"
        else:
            return "other"


collector = MarineCollector()
app = collector.app


@app.on_event("startup")
async def startup():
    await collector.start()


@app.on_event("shutdown")
async def shutdown():
    await collector.stop()


if __name__ == "__main__":
    port = int(os.getenv("PORT", "8205"))
    uvicorn.run(app, host="0.0.0.0", port=port)
