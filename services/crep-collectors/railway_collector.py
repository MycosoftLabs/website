"""
OpenRailwayMap Data Collector

Fetches railway infrastructure data from OpenStreetMap via Overpass API.
Source: https://www.openrailwaymap.org/

Data includes:
- Railway tracks and stations
- Signals and crossings
- Track types (main, siding, industrial)
- Electrification status
"""

import os
import asyncio
from datetime import datetime

import httpx
import uvicorn

from base_collector import BaseCollector


class RailwayCollector(BaseCollector):
    """Collector for OpenRailwayMap data via Overpass API."""
    
    def __init__(self):
        super().__init__()
        self.overpass_url = os.getenv(
            "OSM_OVERPASS_URL",
            "https://overpass-api.de/api/interpreter"
        )
    
    def get_service_name(self) -> str:
        return "railway"
    
    async def collect_data(self) -> list[dict]:
        """Fetch railway data from Overpass API."""
        # Overpass query for railway stations globally (limited for performance)
        query = """
        [out:json][timeout:60];
        (
          node["railway"="station"](if: t["name"]);
          node["railway"="halt"](if: t["name"]);
        );
        out body 10000;
        """
        
        async with httpx.AsyncClient(timeout=90.0) as client:
            response = await client.post(
                self.overpass_url,
                data={"data": query}
            )
            
            if response.status_code == 200:
                data = response.json()
                elements = data.get("elements", [])
                self.logger.info("overpass_fetch_success", stations=len(elements))
                return elements
            else:
                self.logger.error("overpass_fetch_failed", status=response.status_code)
                raise Exception(f"Overpass API returned {response.status_code}")
    
    def transform_data(self, raw_data: list[dict]) -> list[dict]:
        """Transform Overpass data to CREP format."""
        result = []
        
        for element in raw_data:
            try:
                tags = element.get("tags", {})
                
                transformed = {
                    "id": f"rw-{element.get('id')}",
                    "type": "infrastructure",
                    "subtype": element.get("tags", {}).get("railway", "station"),
                    "location": {
                        "latitude": element.get("lat", 0),
                        "longitude": element.get("lon", 0),
                        "type": "Point"
                    },
                    "properties": {
                        "name": tags.get("name", "Unknown"),
                        "operator": tags.get("operator"),
                        "railway_type": tags.get("railway"),
                        "electrified": tags.get("electrified"),
                        "gauge": tags.get("gauge"),
                        "usage": tags.get("usage"),
                        "country": tags.get("addr:country"),
                    },
                    "timestamp": datetime.utcnow().isoformat(),
                    "source": "openrailwaymap",
                    "source_url": f"https://www.openstreetmap.org/node/{element.get('id')}",
                }
                
                if element.get("lat") and element.get("lon"):
                    result.append(transformed)
                    
            except Exception as e:
                self.logger.warning("transform_error", error=str(e))
                continue
        
        return result


collector = RailwayCollector()
app = collector.app


@app.on_event("startup")
async def startup():
    await collector.start()


@app.on_event("shutdown")
async def shutdown():
    await collector.stop()


if __name__ == "__main__":
    port = int(os.getenv("PORT", "8202"))
    uvicorn.run(app, host="0.0.0.0", port=port)
